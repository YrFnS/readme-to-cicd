import { RepositoryInfo, WebhookEvent, AutomationDecision } from '../types';

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

export class PerformanceMonitor {
  private metrics: Map<string, AgentHooksPerformanceMetrics> = new Map();
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private alerts: PerformanceAlert[] = [];
  private isCollecting: boolean = false;

  constructor() {
    this.setupDefaultBaselines();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.isCollecting = true;
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isCollecting = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Record webhook processing metrics
   */
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

    // Check for performance issues
    this.checkWebhookPerformance(metrics);

    return metricId;
  }

  /**
   * Record analysis processing metrics
   */
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

    // Update overall metrics
    metrics.overall.totalProcessingTime += processingTime;
    this.updateOverallMetrics(metrics);
  }

  /**
   * Record automation processing metrics
   */
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

    // Update overall metrics
    metrics.overall.totalProcessingTime += processingTime;
    this.updateOverallMetrics(metrics);
  }

  /**
   * Record PR creation metrics
   */
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

    // Update overall metrics
    metrics.overall.totalProcessingTime += processingTime;
    this.updateOverallMetrics(metrics);
  }

  /**
   * Record resource usage metrics
   */
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

  /**
   * Get performance metrics by ID
   */
  getMetrics(metricId: string): AgentHooksPerformanceMetrics | undefined {
    return this.metrics.get(metricId);
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): AgentHooksPerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics for a specific repository
   */
  getRepositoryMetrics(repository: RepositoryInfo): AgentHooksPerformanceMetrics[] {
    return this.getAllMetrics().filter(m =>
      m.repository.owner === repository.owner && m.repository.name === repository.name
    );
  }

  /**
   * Get performance alerts
   */
  getAlerts(severity?: 'low' | 'medium' | 'high' | 'critical'): PerformanceAlert[] {
    if (!severity) return this.alerts;
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Calculate performance score for metrics
   */
  private calculatePerformanceScore(metrics: AgentHooksPerformanceMetrics): number {
    let score = 100;

    // Deduct points for slow processing
    const totalTime = metrics.overall.totalProcessingTime;
    if (totalTime > 30000) score -= 20; // Over 30 seconds
    else if (totalTime > 10000) score -= 10; // Over 10 seconds
    else if (totalTime > 5000) score -= 5; // Over 5 seconds

    // Deduct points for failures
    if (!metrics.webhookProcessing.success) score -= 15;
    if (!metrics.analysisProcessing.success) score -= 15;
    if (!metrics.automationProcessing.success) score -= 15;
    if (!metrics.prCreation.success) score -= 15;

    // Deduct points for high resource usage
    if (metrics.resourceUsage.cpuUsage > 80) score -= 10;
    if (metrics.resourceUsage.memoryUsage > 85) score -= 10;

    // Deduct points for low rate limit remaining
    if (metrics.resourceUsage.rateLimitRemaining < 100) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Update overall performance metrics
   */
  private updateOverallMetrics(metrics: AgentHooksPerformanceMetrics): void {
    metrics.overall.performanceScore = this.calculatePerformanceScore(metrics);
    metrics.overall.success = this.isOverallSuccess(metrics);
    metrics.overall.bottlenecks = this.identifyBottlenecks(metrics);
    metrics.overall.optimizationOpportunities = this.generateOptimizationSuggestions(metrics);
  }

  /**
   * Check if overall processing was successful
   */
  private isOverallSuccess(metrics: AgentHooksPerformanceMetrics): boolean {
    return metrics.webhookProcessing.success &&
           metrics.analysisProcessing.success &&
           metrics.automationProcessing.success &&
           metrics.prCreation.success;
  }

  /**
   * Identify performance bottlenecks
   */
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

  /**
   * Generate optimization suggestions
   */
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

  /**
   * Check webhook performance and generate alerts
   */
  private checkWebhookPerformance(metrics: AgentHooksPerformanceMetrics): void {
    const webhookTime = metrics.webhookProcessing.processingTime;

    // Check against baseline
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

  /**
   * Create a performance alert
   */
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
      repository: repository!
    };

    this.alerts.push(alert);
    console.warn(`Performance Alert [${severity.toUpperCase()}]: ${message}`);
  }

  /**
   * Setup default performance baselines
   */
  private setupDefaultBaselines(): void {
    // Default baselines for common metrics
    const defaultBaselines: Omit<PerformanceBaseline, 'lastUpdated'>[] = [
      { repository: { owner: '*', name: '*', fullName: '*', defaultBranch: 'main' }, metricType: 'webhook-processing-time', baselineValue: 1000, standardDeviation: 200, sampleSize: 100 },
      { repository: { owner: '*', name: '*', fullName: '*', defaultBranch: 'main' }, metricType: 'analysis-processing-time', baselineValue: 5000, standardDeviation: 1000, sampleSize: 100 },
      { repository: { owner: '*', name: '*', fullName: '*', defaultBranch: 'main' }, metricType: 'automation-processing-time', baselineValue: 2000, standardDeviation: 500, sampleSize: 100 },
      { repository: { owner: '*', name: '*', fullName: '*', defaultBranch: 'main' }, metricType: 'pr-creation-time', baselineValue: 3000, standardDeviation: 700, sampleSize: 100 }
    ];

    const now = new Date();
    defaultBaselines.forEach(baseline => {
      const key = `${baseline.repository.owner}/${baseline.repository.name}:${baseline.metricType}`;
      this.baselines.set(key, { ...baseline, lastUpdated: now });
    });
  }

  /**
   * Generate unique metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper methods to create empty metrics
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