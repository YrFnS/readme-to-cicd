/**
 * RiskManager - Comprehensive risk assessment and mitigation system
 * 
 * Provides threat assessment, risk scoring, mitigation strategies,
 * and continuous risk monitoring capabilities.
 */

import {
  RiskAssessment,
  RiskLevel,
  MitigationStrategy,
  AuditEvent
} from './types';
import { AuditTrailManager } from './audit-trail-manager';

export class RiskManager {
  private risks: Map<string, RiskAssessment> = new Map();
  private auditManager: AuditTrailManager;
  private riskMatrix: RiskMatrix;
  private mitigationStrategies: Map<string, MitigationStrategy[]> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(auditManager: AuditTrailManager) {
    this.auditManager = auditManager;
    this.riskMatrix = new RiskMatrix();
    this.initializeMitigationStrategies();
  }

  /**
   * Assess a new risk or update existing risk assessment
   */
  async assessRisk(risk: RiskAssessment): Promise<RiskAssessment> {
    try {
      // Calculate risk score
      const riskScore = this.calculateRiskScore(risk.likelihood, risk.impact);
      risk.riskScore = riskScore;

      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore);

      // Generate mitigation strategies if not provided
      if (!risk.mitigation || risk.mitigation.length === 0) {
        risk.mitigation = await this.generateMitigationStrategies(risk);
      }

      // Set review dates
      risk.lastReview = new Date();
      risk.nextReview = this.calculateNextReviewDate(risk);

      // Store risk assessment
      this.risks.set(risk.id, risk);

      // Log risk assessment
      await this.auditManager.logEvent({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        user: risk.owner || 'system',
        action: 'RISK_ASSESSED',
        resource: risk.id,
        outcome: 'SUCCESS',
        details: {
          title: risk.title,
          category: risk.category,
          riskScore: risk.riskScore,
          likelihood: risk.likelihood.level,
          impact: risk.impact.level,
          status: risk.status,
          mitigationCount: risk.mitigation.length
        },
        ipAddress: 'localhost',
        userAgent: 'RiskManager',
        sessionId: 'system'
      });

      // Start monitoring if risk is significant
      if (riskScore >= 15) { // High or Very High risk
        await this.startRiskMonitoring(risk);
      }

      return risk;
    } catch (error) {
      await this.auditManager.logEvent({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        user: risk.owner || 'system',
        action: 'RISK_ASSESSMENT_FAILED',
        resource: risk.id,
        outcome: 'ERROR',
        details: { error: error.message },
        ipAddress: 'localhost',
        userAgent: 'RiskManager',
        sessionId: 'system'
      });
      throw error;
    }
  }

  /**
   * Get risk assessment by ID
   */
  getRisk(riskId: string): RiskAssessment | undefined {
    return this.risks.get(riskId);
  }

  /**
   * List all risks with optional filtering
   */
  listRisks(filter?: RiskFilter): RiskAssessment[] {
    let risks = Array.from(this.risks.values());

    if (filter) {
      if (filter.category) {
        risks = risks.filter(r => r.category === filter.category);
      }
      if (filter.status) {
        risks = risks.filter(r => r.status === filter.status);
      }
      if (filter.minRiskScore !== undefined) {
        risks = risks.filter(r => r.riskScore >= filter.minRiskScore!);
      }
      if (filter.maxRiskScore !== undefined) {
        risks = risks.filter(r => r.riskScore <= filter.maxRiskScore!);
      }
      if (filter.owner) {
        risks = risks.filter(r => r.owner === filter.owner);
      }
    }

    return risks.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Update risk status
   */
  async updateRiskStatus(
    riskId: string,
    status: 'IDENTIFIED' | 'ASSESSED' | 'MITIGATED' | 'ACCEPTED' | 'TRANSFERRED',
    notes?: string
  ): Promise<void> {
    const risk = this.risks.get(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const oldStatus = risk.status;
    risk.status = status;
    risk.lastReview = new Date();

    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: risk.owner || 'system',
      action: 'RISK_STATUS_UPDATED',
      resource: riskId,
      outcome: 'SUCCESS',
      details: {
        oldStatus,
        newStatus: status,
        notes,
        riskScore: risk.riskScore
      },
      ipAddress: 'localhost',
      userAgent: 'RiskManager',
      sessionId: 'system'
    });

    // Stop monitoring if risk is mitigated or accepted
    if (status === 'MITIGATED' || status === 'ACCEPTED') {
      this.stopRiskMonitoring(riskId);
    }
  }

  /**
   * Add mitigation strategy to a risk
   */
  async addMitigationStrategy(riskId: string, strategy: MitigationStrategy): Promise<void> {
    const risk = this.risks.get(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    risk.mitigation.push(strategy);
    risk.lastReview = new Date();

    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: strategy.responsible || 'system',
      action: 'MITIGATION_STRATEGY_ADDED',
      resource: riskId,
      outcome: 'SUCCESS',
      details: {
        strategyType: strategy.type,
        description: strategy.description,
        cost: strategy.cost,
        effectiveness: strategy.effectiveness,
        timeline: strategy.timeline
      },
      ipAddress: 'localhost',
      userAgent: 'RiskManager',
      sessionId: 'system'
    });
  }

  /**
   * Generate risk report
   */
  async generateRiskReport(filter?: RiskFilter): Promise<RiskReport> {
    const risks = this.listRisks(filter);
    
    const report: RiskReport = {
      id: `risk-report-${Date.now()}`,
      timestamp: new Date(),
      totalRisks: risks.length,
      risksByCategory: this.groupRisksByCategory(risks),
      risksByStatus: this.groupRisksByStatus(risks),
      risksByLevel: this.groupRisksByLevel(risks),
      topRisks: risks.slice(0, 10),
      mitigationProgress: this.calculateMitigationProgress(risks),
      recommendations: this.generateRiskRecommendations(risks)
    };

    return report;
  }

  /**
   * Perform risk review for overdue assessments
   */
  async performRiskReview(): Promise<RiskReviewResult[]> {
    const results: RiskReviewResult[] = [];
    const now = new Date();

    for (const risk of this.risks.values()) {
      if (risk.nextReview <= now) {
        const result = await this.reviewRisk(risk);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Calculate overall risk exposure
   */
  calculateRiskExposure(filter?: RiskFilter): RiskExposure {
    const risks = this.listRisks(filter);
    
    const totalRiskScore = risks.reduce((sum, risk) => sum + risk.riskScore, 0);
    const averageRiskScore = risks.length > 0 ? totalRiskScore / risks.length : 0;
    
    const criticalRisks = risks.filter(r => r.riskScore >= 20).length;
    const highRisks = risks.filter(r => r.riskScore >= 15 && r.riskScore < 20).length;
    const mediumRisks = risks.filter(r => r.riskScore >= 10 && r.riskScore < 15).length;
    const lowRisks = risks.filter(r => r.riskScore < 10).length;

    return {
      totalRisks: risks.length,
      totalRiskScore,
      averageRiskScore,
      riskDistribution: {
        critical: criticalRisks,
        high: highRisks,
        medium: mediumRisks,
        low: lowRisks
      },
      mitigatedRisks: risks.filter(r => r.status === 'MITIGATED').length,
      acceptedRisks: risks.filter(r => r.status === 'ACCEPTED').length,
      activeRisks: risks.filter(r => 
        r.status === 'IDENTIFIED' || r.status === 'ASSESSED'
      ).length
    };
  }

  /**
   * Calculate risk score based on likelihood and impact
   */
  private calculateRiskScore(likelihood: RiskLevel, impact: RiskLevel): number {
    return this.riskMatrix.calculateScore(likelihood.score, impact.score);
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(score: number): 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
    if (score >= 20) return 'VERY_HIGH';
    if (score >= 15) return 'HIGH';
    if (score >= 10) return 'MEDIUM';
    if (score >= 5) return 'LOW';
    return 'VERY_LOW';
  }

  /**
   * Generate mitigation strategies for a risk
   */
  private async generateMitigationStrategies(risk: RiskAssessment): Promise<MitigationStrategy[]> {
    const strategies: MitigationStrategy[] = [];
    
    // Get category-specific strategies
    const categoryStrategies = this.mitigationStrategies.get(risk.category) || [];
    
    // Add generic strategies based on risk score
    if (risk.riskScore >= 15) {
      strategies.push({
        id: `strategy-${Date.now()}-1`,
        type: 'MITIGATE',
        description: 'Implement immediate controls to reduce risk exposure',
        controls: ['immediate-response', 'monitoring', 'alerting'],
        cost: 10000,
        effectiveness: 80,
        timeline: '30 days',
        responsible: risk.owner
      });
    }

    if (risk.riskScore >= 10) {
      strategies.push({
        id: `strategy-${Date.now()}-2`,
        type: 'MITIGATE',
        description: 'Develop comprehensive risk management plan',
        controls: ['risk-assessment', 'control-implementation', 'testing'],
        cost: 25000,
        effectiveness: 90,
        timeline: '90 days',
        responsible: risk.owner
      });
    }

    // Add category-specific strategies
    strategies.push(...categoryStrategies);

    return strategies;
  }

  /**
   * Calculate next review date based on risk level
   */
  private calculateNextReviewDate(risk: RiskAssessment): Date {
    const nextDate = new Date();
    
    // Review frequency based on risk score
    if (risk.riskScore >= 20) {
      nextDate.setMonth(nextDate.getMonth() + 1); // Monthly for critical risks
    } else if (risk.riskScore >= 15) {
      nextDate.setMonth(nextDate.getMonth() + 3); // Quarterly for high risks
    } else if (risk.riskScore >= 10) {
      nextDate.setMonth(nextDate.getMonth() + 6); // Semi-annually for medium risks
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1); // Annually for low risks
    }
    
    return nextDate;
  }

  /**
   * Start monitoring for a high-risk item
   */
  private async startRiskMonitoring(risk: RiskAssessment): Promise<void> {
    // Stop existing monitoring if any
    this.stopRiskMonitoring(risk.id);

    const monitoringInterval = setInterval(async () => {
      await this.monitorRisk(risk);
    }, 24 * 60 * 60 * 1000); // Daily monitoring

    this.monitoringIntervals.set(risk.id, monitoringInterval);
  }

  /**
   * Stop monitoring for a risk
   */
  private stopRiskMonitoring(riskId: string): void {
    const interval = this.monitoringIntervals.get(riskId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(riskId);
    }
  }

  /**
   * Monitor a specific risk
   */
  private async monitorRisk(risk: RiskAssessment): Promise<void> {
    // Check if risk needs review
    if (risk.nextReview <= new Date()) {
      await this.reviewRisk(risk);
    }

    // Check mitigation progress
    const mitigationProgress = this.calculateMitigationProgressForRisk(risk);
    
    if (mitigationProgress < 50 && risk.status === 'ASSESSED') {
      // Send alert for slow mitigation progress
      await this.auditManager.logEvent({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        user: 'system',
        action: 'RISK_MITIGATION_ALERT',
        resource: risk.id,
        outcome: 'SUCCESS',
        details: {
          riskTitle: risk.title,
          mitigationProgress,
          riskScore: risk.riskScore,
          owner: risk.owner
        },
        ipAddress: 'localhost',
        userAgent: 'RiskManager',
        sessionId: 'system'
      });
    }
  }

  /**
   * Review a specific risk
   */
  private async reviewRisk(risk: RiskAssessment): Promise<RiskReviewResult> {
    const oldScore = risk.riskScore;
    const oldStatus = risk.status;

    // Re-assess risk (in a real implementation, this might involve external data)
    // For now, we'll just update the review date
    risk.lastReview = new Date();
    risk.nextReview = this.calculateNextReviewDate(risk);

    const result: RiskReviewResult = {
      riskId: risk.id,
      reviewDate: new Date(),
      oldScore,
      newScore: risk.riskScore,
      oldStatus,
      newStatus: risk.status,
      changes: [],
      recommendations: []
    };

    if (oldScore !== risk.riskScore) {
      result.changes.push(`Risk score changed from ${oldScore} to ${risk.riskScore}`);
    }

    if (oldStatus !== risk.status) {
      result.changes.push(`Risk status changed from ${oldStatus} to ${risk.status}`);
    }

    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: risk.owner || 'system',
      action: 'RISK_REVIEWED',
      resource: risk.id,
      outcome: 'SUCCESS',
      details: {
        oldScore,
        newScore: risk.riskScore,
        changes: result.changes,
        recommendations: result.recommendations
      },
      ipAddress: 'localhost',
      userAgent: 'RiskManager',
      sessionId: 'system'
    });

    return result;
  }

  /**
   * Group risks by category
   */
  private groupRisksByCategory(risks: RiskAssessment[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const risk of risks) {
      groups[risk.category] = (groups[risk.category] || 0) + 1;
    }
    
    return groups;
  }

  /**
   * Group risks by status
   */
  private groupRisksByStatus(risks: RiskAssessment[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const risk of risks) {
      groups[risk.status] = (groups[risk.status] || 0) + 1;
    }
    
    return groups;
  }

  /**
   * Group risks by level
   */
  private groupRisksByLevel(risks: RiskAssessment[]): Record<string, number> {
    const groups: Record<string, number> = {
      'VERY_LOW': 0,
      'LOW': 0,
      'MEDIUM': 0,
      'HIGH': 0,
      'VERY_HIGH': 0
    };
    
    for (const risk of risks) {
      const level = this.determineRiskLevel(risk.riskScore);
      groups[level]++;
    }
    
    return groups;
  }

  /**
   * Calculate overall mitigation progress
   */
  private calculateMitigationProgress(risks: RiskAssessment[]): number {
    if (risks.length === 0) return 100;
    
    const totalProgress = risks.reduce((sum, risk) => {
      return sum + this.calculateMitigationProgressForRisk(risk);
    }, 0);
    
    return Math.round(totalProgress / risks.length);
  }

  /**
   * Calculate mitigation progress for a single risk
   */
  private calculateMitigationProgressForRisk(risk: RiskAssessment): number {
    if (risk.status === 'MITIGATED' || risk.status === 'ACCEPTED') {
      return 100;
    }
    
    if (risk.status === 'IDENTIFIED') {
      return 0;
    }
    
    // For assessed risks, calculate based on mitigation strategies
    if (risk.mitigation.length === 0) {
      return 10; // Some progress for having assessed the risk
    }
    
    // Simple progress calculation based on number of mitigation strategies
    return Math.min(50 + (risk.mitigation.length * 10), 90);
  }

  /**
   * Generate risk recommendations
   */
  private generateRiskRecommendations(risks: RiskAssessment[]): string[] {
    const recommendations: string[] = [];
    
    const criticalRisks = risks.filter(r => r.riskScore >= 20);
    const highRisks = risks.filter(r => r.riskScore >= 15 && r.riskScore < 20);
    const overdueRisks = risks.filter(r => r.nextReview <= new Date());
    
    if (criticalRisks.length > 0) {
      recommendations.push(`Address ${criticalRisks.length} critical risk(s) immediately`);
    }
    
    if (highRisks.length > 0) {
      recommendations.push(`Develop mitigation plans for ${highRisks.length} high risk(s)`);
    }
    
    if (overdueRisks.length > 0) {
      recommendations.push(`Review ${overdueRisks.length} overdue risk assessment(s)`);
    }
    
    const unmitigatedRisks = risks.filter(r => 
      r.status === 'IDENTIFIED' || r.status === 'ASSESSED'
    );
    
    if (unmitigatedRisks.length > risks.length * 0.5) {
      recommendations.push('Consider increasing risk management resources');
    }
    
    return recommendations;
  }

  /**
   * Initialize default mitigation strategies by category
   */
  private initializeMitigationStrategies(): void {
    // Security mitigation strategies
    this.mitigationStrategies.set('SECURITY', [
      {
        id: 'security-1',
        type: 'MITIGATE',
        description: 'Implement multi-factor authentication',
        controls: ['mfa', 'access-control'],
        cost: 5000,
        effectiveness: 85,
        timeline: '30 days',
        responsible: 'security-team'
      },
      {
        id: 'security-2',
        type: 'MITIGATE',
        description: 'Deploy security monitoring and alerting',
        controls: ['siem', 'monitoring', 'alerting'],
        cost: 15000,
        effectiveness: 90,
        timeline: '60 days',
        responsible: 'security-team'
      }
    ]);

    // Operational mitigation strategies
    this.mitigationStrategies.set('OPERATIONAL', [
      {
        id: 'operational-1',
        type: 'MITIGATE',
        description: 'Implement automated backup and recovery',
        controls: ['backup', 'recovery', 'testing'],
        cost: 8000,
        effectiveness: 80,
        timeline: '45 days',
        responsible: 'ops-team'
      }
    ]);

    // Compliance mitigation strategies
    this.mitigationStrategies.set('COMPLIANCE', [
      {
        id: 'compliance-1',
        type: 'MITIGATE',
        description: 'Establish compliance monitoring program',
        controls: ['monitoring', 'reporting', 'auditing'],
        cost: 12000,
        effectiveness: 85,
        timeline: '90 days',
        responsible: 'compliance-team'
      }
    ]);
  }
}

/**
 * Risk matrix for calculating risk scores
 */
class RiskMatrix {
  private matrix: number[][] = [
    [1, 2, 3, 4, 5],    // Very Low likelihood
    [2, 4, 6, 8, 10],   // Low likelihood
    [3, 6, 9, 12, 15],  // Medium likelihood
    [4, 8, 12, 16, 20], // High likelihood
    [5, 10, 15, 20, 25] // Very High likelihood
  ];

  calculateScore(likelihood: number, impact: number): number {
    const likelihoodIndex = Math.max(0, Math.min(4, likelihood - 1));
    const impactIndex = Math.max(0, Math.min(4, impact - 1));
    return this.matrix[likelihoodIndex][impactIndex];
  }
}

/**
 * Risk filter interface
 */
interface RiskFilter {
  category?: string;
  status?: string;
  minRiskScore?: number;
  maxRiskScore?: number;
  owner?: string;
}

/**
 * Risk report interface
 */
interface RiskReport {
  id: string;
  timestamp: Date;
  totalRisks: number;
  risksByCategory: Record<string, number>;
  risksByStatus: Record<string, number>;
  risksByLevel: Record<string, number>;
  topRisks: RiskAssessment[];
  mitigationProgress: number;
  recommendations: string[];
}

/**
 * Risk review result interface
 */
interface RiskReviewResult {
  riskId: string;
  reviewDate: Date;
  oldScore: number;
  newScore: number;
  oldStatus: string;
  newStatus: string;
  changes: string[];
  recommendations: string[];
}

/**
 * Risk exposure interface
 */
interface RiskExposure {
  totalRisks: number;
  totalRiskScore: number;
  averageRiskScore: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  mitigatedRisks: number;
  acceptedRisks: number;
  activeRisks: number;
}