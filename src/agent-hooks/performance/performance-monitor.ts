import { RepositoryInfo, WebhookEvent, AutomationDecision } from '../types';
import { logger } from '../../shared/logging/central-logger';

export interface AgentHooksPerformanceMetrics {
  id: string;
  timestamp: Date;
  repository: RepositoryInfo;
  webhookProcessing: WebhookProcessingMetrics;
  analysisProcessing: AnalysisProcessingMetrics;
  automationProcessing: AutomationProcessingMetrics;
  prCreation: PRCreationMetrics;
  resourceUsage: ResourceUsageMetrics;
  overall: OverallPerformanceMetrics;
}

export interface WebhookProcessingMetrics {
  processingTime: number;
  eventType: string;
  payloadSize: number;
  signatureValidationTime: number;
  success: boolean;
  error?: string;
}

export interface AnalysisProcessingMetrics {
  processingTime: number;
  jobType: string;
  queueWaitTime: number;
  retryCount: number;
  success: boolean;
  error?: string;
}

export interface AutomationProcessingMetrics {
  processingTime: number;
  decisionsGenerated: number;
  rulesEvaluated: number;
  highPriorityDecisions: number;
  success: boolean;
  error?: string;
}

export interface PRCreationMetrics {
  processingTime: number;
  prsCreated: number;
  branchesCreated: number;
  filesModified: number;
  success: boolean;
  error?: string;
}

export interface ResourceUsageMetrics {
  cpuUsage: number;
  memoryUsage: number;
  apiCalls: number;
  rateLimitRemaining: number;
}

export interface OverallPerformanceMetrics {
  totalProcessingTime: number;
  success: boolean;
  performanceScore: number;
  bottlenecks: string[];
  optimizationOpportunities: string[];
}

export interface PerformanceBaseline {
  repository: RepositoryInfo;
  metricType: string;
  baselineValue: number;
  standardDeviation: number;
  sampleSize: number;
  lastUpdated: Date;
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  repository?: RepositoryInfo;
}

interface SystemResourceMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  totalMemory: number;
  usedMemory: number;
  externalMemory: number;
  rss: number;
}

interface AverageMetrics {
  webhookProcessingTime: number;
  analysisProcessingTime: number;
  automationProcessingTime: number;
  prCreationTime: number;
  successRate: number;
  averagePerformanceScore: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
}

interface PerformanceSummary {
  totalOperations: number;
  averagePerformanceScore: number;
  successRate: number;
  alertsCount: number;
  recentAlerts: PerformanceAlert[];
  topBottlenecks: string[];
  systemHealth: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export class PerformanceMonitor {
  private metrics: Map<string, AgentHooksPerformanceMetrics> = new Map();
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private alerts: PerformanceAlert[] = [];
  private isCollecting: boolean = false;
  private systemMonitoringInterval?: NodeJS.Timeout;
  private currentSystemMetrics?: SystemResourceMetrics;

  constructor() {
    this.setupDefaultBaselines();
  }

  startMonitoring(): void {
    this.isCollecting = true;
    logger.info('Performance monitoring started', { component: 'performance' });
  }

  stopMonitoring(): void {
    this.isCollecting = false;
    logger.info('Performance monitoring stopped', { component: 'performance' });
  }

  recordWebhookProcessing(
    event: WebhookEvent,
    processingTime: number,
    signatureValidationTime: number,
    success: boolean,
    error?: string
  ): string {
    if (!this.isCollecting) return '';

    const metricId = this.generateMetricId();
    const metrics: AgentHooksPerformanceMetrics = {
      id: metricId,
      timestamp: new Date(),
      repository: event.repository,
      webhookProcessing: {
        processingTime,
        eventType: event.type,
        payloadSize: JSON.stringify(event.payload).length,
        signatureValidationTime,
        success,
        error: error || 'No error details'
      },
      analysisProcessing: this.createEmptyAnalysisMetrics(),
      automationProcessing: this.createEmptyAutomationMetrics(),
      prCreation: this.createEmptyPRMetrics(),
      resourceUsage: this.createEmptyResourceMetrics(),
      overall: this.createEmptyOverallMetrics()
    };

    this.metrics.set(metricId, metrics);
    this.checkWebhookPerformance(metrics);
    return metricId;
  }

  recordAnalysisProcessing(
    metricId: string,
    jobType: string,
    processingTime: number,
    queueWaitTime: number,
    retryCount: number,
    success: boolean,
    error?: string
  ): void {
    if (!this.isCollecting) return;

    const metrics = this.metrics.get(metricId);
    if (!metrics) return;

    metrics.analysisProcessing = {
      processingTime,
      jobType,
      queueWaitTime,
      retryCount,
      success,
      error: error || 'No error details'
    };

    metrics.overall.totalProcessingTime += processingTime;
    this.updateOverallMetrics(metrics);
  }

  recordAutomationProcessing(
    metricId: string,
    processingTime: number,
    decisions: AutomationDecision[],
    rulesEvaluated: number,
    success: boolean,
    error?: string
  ): void {
    if (!this.isCollecting) return;

    const metrics = this.metrics.get(metricId);
    if (!metrics) return;

    const highPriorityDecisions = decisions.filter(d => d.priority === 'high' || d.priority === 'critical').length;

    metrics.automationProcessing = {
      processingTime,
      decisionsGenerated: decisions.length,
      rulesEvaluated,
      highPriorityDecisions,
      success,
      error: error || 'No error details'
    };

    metrics.overall.totalProcessingTime += processingTime;
    this.updateOverallMetrics(metrics);
  }

  recordPRCreation(
    metricId: string,
    processingTime: number,
    prsCreated: number,
    branchesCreated: number,
    filesModified: number,
    success: boolean,
    error?: string
  ): void {
    if (!this.isCollecting) return;

    const metrics = this.metrics.get(metricId);
    if (!metrics) return;

    metrics.prCreation = {
      processingTime,
      prsCreated,
      branchesCreated,
      filesModified,
      success,
      error: error || 'No error details'
    };

    metrics.overall.totalProcessingTime += processingTime;
    this.updateOverallMetrics(metrics);
  }

  recordResourceUsage(
    metricId: string,
    cpuUsage: number,
    memoryUsage: number,
    apiCalls: number,
    rateLimitRemaining: number
  ): void {
    if (!this.isCollecting) return;

    const metrics = this.metrics.get(metricId);
    if (!metrics) return;

    metrics.resourceUsage = {
      cpuUsage,
      memoryUsage,
      apiCalls,
      rateLimitRemaining
    };
  }

  getMetrics(metricId: string): AgentHooksPerformanceMetrics | undefined {
    return this.metrics.get(metricId);
  }

  getAllMetrics(): AgentHooksPerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  getRepositoryMetrics(repository: RepositoryInfo): AgentHooksPerformanceMetrics[] {
    return this.getAllMetrics().filter(m =>
      m.repository.owner === repository.owner && m.repository.name === repository.name
    );
  }

  getAlerts(severity?: 'low' | 'medium' | 'high' | 'critical'): PerformanceAlert[] {
    if (!severity) return this.alerts;
    return this.alerts.filter(alert => alert.severity === severity);
  }

  getCurrentSystemMetrics(): SystemResourceMetrics | null {
    return this.currentSystemMetrics || null;
  }

  getPerformanceSummary(): PerformanceSummary {
    const allMetrics = this.getAllMetrics();
    const recentMetrics = allMetrics.slice(-100);

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        averagePerformanceScore: 0,
        successRate: 0,
        alertsCount: this.alerts.length,
        recentAlerts: [],
        topBottlenecks: [],
        systemHealth: 'unknown'
      };
    }

    const avgScore = recentMetrics.reduce((sum, m) => sum + m.overall.performanceScore, 0) / recentMetrics.length;
    const successCount = recentMetrics.filter(m => m.overall.success).length;
    const successRate = successCount / recentMetrics.length;

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (avgScore < 50 || successRate < 0.8) {
      systemHealth = 'critical';
    } else if (avgScore < 75 || successRate < 0.95) {
      systemHealth = 'warning';
    }

    const recentAlerts = this.alerts.slice(-5);
    const bottlenecks = recentMetrics
      .flatMap(m => m.overall.bottlenecks)
      .reduce((acc, bottleneck) => {
        acc[bottleneck] = (acc[bottleneck] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topBottlenecks = Object.entries(bottlenecks)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([bottleneck, count]) => `${bottleneck} (${count})`);

    return {
      totalOperations: allMetrics.length,
      averagePerformanceScore: Math.round(avgScore),
      successRate: Math.round(successRate * 100),
      alertsCount: this.alerts.length,
      recentAlerts,
      topBottlenecks,
      systemHealth
    };
  }

  private calculatePerformanceScore(metrics: AgentHooksPerformanceMetrics): number {
    let score = 100;

    const totalTime = metrics.overall.totalProcessingTime;
    if (totalTime > 30000) score -= 20;
    else if (totalTime > 10000) score -= 10;
    else if (totalTime > 5000) score -= 5;

    if (!metrics.webhookProcessing.success) score -= 15;
    if (!metrics.analysisProcessing.success) score -= 15;
    if (!metrics.automationProcessing.success) score -= 15;
    if (!metrics.prCreation.success) score -= 15;

    if (metrics.resourceUsage.cpuUsage > 80) score -= 10;
    if (metrics.resourceUsage.memoryUsage > 85) score -= 10;
    if (metrics.resourceUsage.rateLimitRemaining < 100) score -= 10;

    return Math.max(0, score);
  }

  private updateOverallMetrics(metrics: AgentHooksPerformanceMetrics): void {
    metrics.overall.performanceScore = this.calculatePerformanceScore(metrics);
    metrics.overall.success = this.isOverallSuccess(metrics);
    metrics.overall.bottlenecks = this.identifyBottlenecks(metrics);
    metrics.overall.optimizationOpportunities = this.generateOptimizationSuggestions(metrics);
  }

  private isOverallSuccess(metrics: AgentHooksPerformanceMetrics): boolean {
    return metrics.webhookProcessing.success &&
           metrics.analysisProcessing.success &&
           metrics.automationProcessing.success &&
           metrics.prCreation.success;
  }

  private identifyBottlenecks(metrics: AgentHooksPerformanceMetrics): string[] {
    const bottlenecks: string[] = [];

    if (metrics.webhookProcessing.processingTime > 2000) {
      bottlenecks.push('Webhook processing is slow');
    }
    if (metrics.analysisProcessing.processingTime > 10000) {
      bottlenecks.push('Analysis processing is slow');
    }
    if (metrics.automationProcessing.processingTime > 5000) {
      bottlenecks.push('Automation processing is slow');
    }
    if (metrics.prCreation.processingTime > 8000) {
      bottlenecks.push('PR creation is slow');
    }
    if (metrics.resourceUsage.cpuUsage > 80) {
      bottlenecks.push('High CPU usage');
    }
    if (metrics.resourceUsage.memoryUsage > 85) {
      bottlenecks.push('High memory usage');
    }
    if (metrics.resourceUsage.rateLimitRemaining < 500) {
      bottlenecks.push('Low API rate limit remaining');
    }

    return bottlenecks;
  }

  private generateOptimizationSuggestions(metrics: AgentHooksPerformanceMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.analysisProcessing.retryCount > 0) {
      suggestions.push('Consider improving analysis job reliability to reduce retries');
    }
    if (metrics.overall.totalProcessingTime > 15000) {
      suggestions.push('Overall processing time is high - consider optimizing individual components');
    }
    if (metrics.automationProcessing.decisionsGenerated === 0) {
      suggestions.push('No automation decisions generated - review automation rules');
    }
    if (metrics.resourceUsage.apiCalls > 50) {
      suggestions.push('High number of API calls - consider caching or batching');
    }

    return suggestions;
  }

  private checkWebhookPerformance(metrics: AgentHooksPerformanceMetrics): void {
    const webhookTime = metrics.webhookProcessing.processingTime;
    const baselineKey = `${metrics.repository.owner}/${metrics.repository.name}:webhook-processing`;
    const baseline = this.baselines.get(baselineKey);

    if (baseline && webhookTime > baseline.baselineValue + (baseline.standardDeviation * 2)) {
      this.createAlert(
        'medium',
        `Webhook processing time (${webhookTime}ms) is significantly higher than baseline`,
        'webhook-processing-time',
        webhookTime,
        baseline.baselineValue,
        metrics.repository
      );
    }
  }

  private createAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    metric: string,
    currentValue: number,
    thresholdValue: number,
    repository?: RepositoryInfo
  ): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      severity,
      message,
      metric,
      currentValue,
      thresholdValue,
      repository
    };

    this.alerts.push(alert);
    logger.warn(`Performance Alert [${severity.toUpperCase()}]: ${message}`, { component: 'performance' });
  }

  private setupDefaultBaselines(): void {
    const defaultBaselines: Omit<PerformanceBaseline, 'lastUpdated'>[] = [
      {
        repository: { owner: '*', name: '*', fullName: '*', defaultBranch: 'main' },
        metricType: 'webhook-processing-time',
        baselineValue: 1000,
        standardDeviation: 200,
        sampleSize: 100
      },
      {
        repository: { owner: '*', name: '*', fullName: '*', defaultBranch: 'main' },
        metricType: 'analysis-processing-time',
        baselineValue: 5000,
        standardDeviation: 1000,
        sampleSize: 100
      }
    ];

    const now = new Date();
    defaultBaselines.forEach(baseline => {
      const key = `${baseline.repository.owner}/${baseline.repository.name}:${baseline.metricType}`;
      this.baselines.set(key, { ...baseline, lastUpdated: now });
    });
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createEmptyAnalysisMetrics(): AnalysisProcessingMetrics {
    return {
      processingTime: 0,
      jobType: '',
      queueWaitTime: 0,
      retryCount: 0,
      success: true
    };
  }

  private createEmptyAutomationMetrics(): AutomationProcessingMetrics {
    return {
      processingTime: 0,
      decisionsGenerated: 0,
      rulesEvaluated: 0,
      highPriorityDecisions: 0,
      success: true
    };
  }

  private createEmptyPRMetrics(): PRCreationMetrics {
    return {
      processingTime: 0,
      prsCreated: 0,
      branchesCreated: 0,
      filesModified: 0,
      success: true
    };
  }

  private createEmptyResourceMetrics(): ResourceUsageMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      apiCalls: 0,
      rateLimitRemaining: 1000
    };
  }

  private createEmptyOverallMetrics(): OverallPerformanceMetrics {
    return {
      totalProcessingTime: 0,
      success: true,
      performanceScore: 100,
      bottlenecks: [],
      optimizationOpportunities: []
    };
  }
}
