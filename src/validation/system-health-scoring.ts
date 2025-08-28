/**
 * System Health Scoring
 * 
 * Advanced system health scoring algorithm that provides detailed
 * health assessment with component-level analysis and trend tracking.
 */

import { logger } from '../shared/logging/central-logger';
import { ComponentHealth, SystemHealthReport } from './system-health-monitor';
import { ValidationResult } from '../shared/types/validation';

/**
 * Health scoring configuration
 */
export interface HealthScoringConfig {
  weights: HealthWeights;
  thresholds: HealthThresholds;
  penalties: HealthPenalties;
  bonuses: HealthBonuses;
}

/**
 * Health scoring weights
 */
export interface HealthWeights {
  componentHealth: number;
  systemIntegration: number;
  performance: number;
  reliability: number;
  security: number;
  maintainability: number;
}

/**
 * Health thresholds for scoring
 */
export interface HealthThresholds {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

/**
 * Health penalties for issues
 */
export interface HealthPenalties {
  criticalIssue: number;
  highIssue: number;
  mediumIssue: number;
  lowIssue: number;
  componentDown: number;
  integrationFailure: number;
}

/**
 * Health bonuses for good performance
 */
export interface HealthBonuses {
  allComponentsHealthy: number;
  excellentPerformance: number;
  zeroIssues: number;
  highAvailability: number;
}

/**
 * Detailed health score breakdown
 */
export interface HealthScoreBreakdown {
  overallScore: number;
  componentScores: ComponentScore[];
  categoryScores: CategoryScore[];
  penalties: PenaltyScore[];
  bonuses: BonusScore[];
  trends: ScoreTrend[];
  recommendations: HealthRecommendation[];
}

/**
 * Component score details
 */
export interface ComponentScore {
  component: string;
  score: number;
  weight: number;
  weightedScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  issues: string[];
  improvements: string[];
}

/**
 * Category score details
 */
export interface CategoryScore {
  category: string;
  score: number;
  weight: number;
  weightedScore: number;
  components: string[];
  impact: string;
}

/**
 * Penalty score details
 */
export interface PenaltyScore {
  reason: string;
  penalty: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  component?: string;
  impact: string;
}

/**
 * Bonus score details
 */
export interface BonusScore {
  reason: string;
  bonus: number;
  category: string;
  impact: string;
}

/**
 * Score trend information
 */
export interface ScoreTrend {
  component: string;
  metric: string;
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number;
  timeframe: string;
}

/**
 * Health recommendation
 */
export interface HealthRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  components: string[];
}

/**
 * System Health Scoring Engine
 */
export class SystemHealthScoring {
  private config: HealthScoringConfig;
  private scoreHistory: HealthScoreBreakdown[] = [];

  constructor(config: HealthScoringConfig) {
    this.config = config;
  }

  /**
   * Calculate comprehensive health score
   */
  public calculateHealthScore(
    healthReport: SystemHealthReport,
    validationResults: ValidationResult[],
    performanceMetrics?: any
  ): HealthScoreBreakdown {
    logger.info('Calculating comprehensive health score');

    try {
      // Calculate component scores
      const componentScores = this.calculateComponentScores(healthReport.components);
      
      // Calculate category scores
      const categoryScores = this.calculateCategoryScores(
        healthReport,
        validationResults,
        performanceMetrics
      );
      
      // Calculate penalties
      const penalties = this.calculatePenalties(healthReport, validationResults);
      
      // Calculate bonuses
      const bonuses = this.calculateBonuses(healthReport, validationResults);
      
      // Calculate overall score
      const baseScore = this.calculateBaseScore(componentScores, categoryScores);
      const penaltyTotal = penalties.reduce((sum, p) => sum + p.penalty, 0);
      const bonusTotal = bonuses.reduce((sum, b) => sum + b.bonus, 0);
      const overallScore = Math.max(0, Math.min(100, baseScore - penaltyTotal + bonusTotal));
      
      // Calculate trends
      const trends = this.calculateTrends(componentScores);
      
      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(
        componentScores,
        categoryScores,
        penalties,
        healthReport
      );

      const scoreBreakdown: HealthScoreBreakdown = {
        overallScore,
        componentScores,
        categoryScores,
        penalties,
        bonuses,
        trends,
        recommendations
      };

      // Store in history
      this.scoreHistory.push(scoreBreakdown);
      
      // Keep only last 50 scores
      if (this.scoreHistory.length > 50) {
        this.scoreHistory = this.scoreHistory.slice(-50);
      }

      logger.info('Health score calculation completed', {
        overallScore,
        componentCount: componentScores.length,
        penalties: penalties.length,
        bonuses: bonuses.length,
        recommendations: recommendations.length
      });

      return scoreBreakdown;

    } catch (error) {
      logger.error('Health score calculation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return minimal score breakdown
      return {
        overallScore: 0,
        componentScores: [],
        categoryScores: [],
        penalties: [{
          reason: 'Health scoring failed',
          penalty: 100,
          severity: 'critical',
          impact: 'Cannot assess system health'
        }],
        bonuses: [],
        trends: [],
        recommendations: [{
          priority: 'critical',
          category: 'system',
          title: 'Fix Health Scoring System',
          description: 'Health scoring system is not functioning properly',
          impact: 'Cannot assess system health accurately',
          effort: 'high',
          timeline: '1 week',
          components: ['health-monitor']
        }]
      };
    }
  }

  /**
   * Calculate component scores
   */
  private calculateComponentScores(components: ComponentHealth[]): ComponentScore[] {
    return components.map(component => {
      const baseScore = component.score;
      const weight = this.getComponentWeight(component.name);
      const weightedScore = baseScore * weight;
      const status = this.determineComponentStatus(baseScore);
      
      const issues = component.issues
        .filter(issue => !issue.resolved)
        .map(issue => issue.message);
      
      const improvements = this.generateComponentImprovements(component);

      return {
        component: component.name,
        score: baseScore,
        weight,
        weightedScore,
        status,
        issues,
        improvements
      };
    });
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(
    healthReport: SystemHealthReport,
    validationResults: ValidationResult[],
    performanceMetrics?: any
  ): CategoryScore[] {
    const categories: CategoryScore[] = [];

    // Component Health Category
    const componentHealthScore = this.calculateComponentHealthCategory(healthReport.components);
    categories.push({
      category: 'Component Health',
      score: componentHealthScore,
      weight: this.config.weights.componentHealth,
      weightedScore: componentHealthScore * this.config.weights.componentHealth,
      components: healthReport.components.map(c => c.name),
      impact: 'Overall system component reliability and functionality'
    });

    // System Integration Category
    const integrationScore = this.calculateIntegrationCategory(validationResults);
    categories.push({
      category: 'System Integration',
      score: integrationScore,
      weight: this.config.weights.systemIntegration,
      weightedScore: integrationScore * this.config.weights.systemIntegration,
      components: ['integration-pipeline', 'component-communication'],
      impact: 'Cross-component communication and data flow integrity'
    });

    // Performance Category
    const performanceScore = this.calculatePerformanceCategory(validationResults, performanceMetrics);
    categories.push({
      category: 'Performance',
      score: performanceScore,
      weight: this.config.weights.performance,
      weightedScore: performanceScore * this.config.weights.performance,
      components: ['parser', 'detection', 'generator'],
      impact: 'System response time, throughput, and resource efficiency'
    });

    // Reliability Category
    const reliabilityScore = this.calculateReliabilityCategory(healthReport, validationResults);
    categories.push({
      category: 'Reliability',
      score: reliabilityScore,
      weight: this.config.weights.reliability,
      weightedScore: reliabilityScore * this.config.weights.reliability,
      components: healthReport.components.map(c => c.name),
      impact: 'System availability, error handling, and recovery capabilities'
    });

    return categories;
  }

  /**
   * Calculate penalties
   */
  private calculatePenalties(
    healthReport: SystemHealthReport,
    validationResults: ValidationResult[]
  ): PenaltyScore[] {
    const penalties: PenaltyScore[] = [];

    // Critical issues penalty
    for (const issue of healthReport.criticalIssues) {
      penalties.push({
        reason: `Critical issue: ${issue.message}`,
        penalty: this.config.penalties.criticalIssue,
        severity: 'critical',
        impact: 'Severe impact on system functionality'
      });
    }

    // Component down penalties
    for (const component of healthReport.components) {
      if (component.status === 'unhealthy') {
        penalties.push({
          reason: `Component ${component.name} is unhealthy`,
          penalty: this.config.penalties.componentDown,
          severity: 'high',
          component: component.name,
          impact: 'Component functionality compromised'
        });
      }
    }

    // Validation failure penalties
    const failedValidations = validationResults.filter(r => !r.passed);
    for (const validation of failedValidations) {
      const severity = validation.errors.some(e => e.severity === 'critical') ? 'critical' :
                      validation.errors.some(e => e.severity === 'high') ? 'high' : 'medium';
      
      const penaltyAmount = severity === 'critical' ? this.config.penalties.criticalIssue :
                           severity === 'high' ? this.config.penalties.highIssue :
                           this.config.penalties.mediumIssue;

      penalties.push({
        reason: `Validation failed: ${validation.testId}`,
        penalty: penaltyAmount,
        severity: severity as 'critical' | 'high' | 'medium',
        impact: 'System validation requirements not met'
      });
    }

    return penalties;
  }

  /**
   * Calculate bonuses
   */
  private calculateBonuses(
    healthReport: SystemHealthReport,
    validationResults: ValidationResult[]
  ): BonusScore[] {
    const bonuses: BonusScore[] = [];

    // All components healthy bonus
    if (healthReport.components.every(c => c.status === 'healthy')) {
      bonuses.push({
        reason: 'All components are healthy',
        bonus: this.config.bonuses.allComponentsHealthy,
        category: 'reliability',
        impact: 'Excellent system reliability'
      });
    }

    // Zero issues bonus
    if (healthReport.criticalIssues.length === 0) {
      bonuses.push({
        reason: 'No critical issues detected',
        bonus: this.config.bonuses.zeroIssues,
        category: 'reliability',
        impact: 'Clean system with no critical problems'
      });
    }

    // High availability bonus
    const avgAvailability = healthReport.components.reduce((sum, c) => sum + c.metrics.availability, 0) / healthReport.components.length;
    if (avgAvailability >= 99.9) {
      bonuses.push({
        reason: 'Excellent system availability (>99.9%)',
        bonus: this.config.bonuses.highAvailability,
        category: 'reliability',
        impact: 'Outstanding system uptime'
      });
    }

    // Excellent performance bonus
    const avgScore = validationResults.reduce((sum, r) => sum + r.score, 0) / validationResults.length;
    if (avgScore >= 95) {
      bonuses.push({
        reason: 'Excellent validation performance (>95%)',
        bonus: this.config.bonuses.excellentPerformance,
        category: 'performance',
        impact: 'Superior system performance'
      });
    }

    return bonuses;
  }

  /**
   * Calculate base score from components and categories
   */
  private calculateBaseScore(componentScores: ComponentScore[], categoryScores: CategoryScore[]): number {
    const totalWeightedScore = categoryScores.reduce((sum, category) => sum + category.weightedScore, 0);
    const totalWeight = categoryScores.reduce((sum, category) => sum + category.weight, 0);
    
    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  }

  /**
   * Calculate trends
   */
  private calculateTrends(componentScores: ComponentScore[]): ScoreTrend[] {
    const trends: ScoreTrend[] = [];

    // Compare with previous scores if available
    if (this.scoreHistory.length > 0) {
      const previousScore = this.scoreHistory[this.scoreHistory.length - 1];
      
      for (const currentComponent of componentScores) {
        const previousComponent = previousScore.componentScores.find(
          c => c.component === currentComponent.component
        );
        
        if (previousComponent) {
          const scoreDiff = currentComponent.score - previousComponent.score;
          const changeRate = Math.abs(scoreDiff);
          
          let trend: 'improving' | 'stable' | 'degrading';
          if (scoreDiff > 2) trend = 'improving';
          else if (scoreDiff < -2) trend = 'degrading';
          else trend = 'stable';

          trends.push({
            component: currentComponent.component,
            metric: 'health-score',
            trend,
            changeRate,
            timeframe: 'since-last-check'
          });
        }
      }
    }

    return trends;
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(
    componentScores: ComponentScore[],
    categoryScores: CategoryScore[],
    penalties: PenaltyScore[],
    healthReport: SystemHealthReport
  ): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = [];

    // Component-specific recommendations
    for (const component of componentScores) {
      if (component.status === 'poor' || component.status === 'critical') {
        recommendations.push({
          priority: component.status === 'critical' ? 'critical' : 'high',
          category: 'component-health',
          title: `Improve ${component.component} Health`,
          description: `Component ${component.component} has a low health score (${component.score.toFixed(1)})`,
          impact: 'Component reliability and functionality at risk',
          effort: 'medium',
          timeline: component.status === 'critical' ? '1 week' : '2 weeks',
          components: [component.component]
        });
      }
    }

    // Category-specific recommendations
    for (const category of categoryScores) {
      if (category.score < 70) {
        recommendations.push({
          priority: category.score < 50 ? 'critical' : 'high',
          category: category.category.toLowerCase().replace(' ', '-'),
          title: `Improve ${category.category}`,
          description: `${category.category} score is below acceptable threshold (${category.score.toFixed(1)})`,
          impact: category.impact,
          effort: 'high',
          timeline: '2-4 weeks',
          components: category.components
        });
      }
    }

    // Critical penalty recommendations
    for (const penalty of penalties) {
      if (penalty.severity === 'critical') {
        recommendations.push({
          priority: 'critical',
          category: 'critical-issue',
          title: `Resolve Critical Issue`,
          description: penalty.reason,
          impact: penalty.impact,
          effort: 'high',
          timeline: '1 week',
          components: penalty.component ? [penalty.component] : []
        });
      }
    }

    // Sort by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return recommendations;
  }

  /**
   * Get component weight
   */
  private getComponentWeight(componentName: string): number {
    const weights: { [key: string]: number } = {
      'readme-parser': 0.3,
      'framework-detection': 0.25,
      'yaml-generator': 0.25,
      'integration-pipeline': 0.2
    };
    
    return weights[componentName] || 0.1;
  }

  /**
   * Determine component status
   */
  private determineComponentStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= this.config.thresholds.excellent) return 'excellent';
    if (score >= this.config.thresholds.good) return 'good';
    if (score >= this.config.thresholds.fair) return 'fair';
    if (score >= this.config.thresholds.poor) return 'poor';
    return 'critical';
  }

  /**
   * Generate component improvements
   */
  private generateComponentImprovements(component: ComponentHealth): string[] {
    const improvements: string[] = [];
    
    if (component.metrics.responseTime > 1000) {
      improvements.push('Optimize response time performance');
    }
    
    if (component.metrics.errorRate > 2) {
      improvements.push('Reduce error rate through better error handling');
    }
    
    if (component.metrics.availability < 99) {
      improvements.push('Improve component availability and uptime');
    }
    
    if (component.issues.length > 0) {
      improvements.push('Resolve outstanding component issues');
    }
    
    return improvements;
  }

  /**
   * Calculate component health category score
   */
  private calculateComponentHealthCategory(components: ComponentHealth[]): number {
    if (components.length === 0) return 0;
    
    const totalScore = components.reduce((sum, component) => sum + component.score, 0);
    return totalScore / components.length;
  }

  /**
   * Calculate integration category score
   */
  private calculateIntegrationCategory(validationResults: ValidationResult[]): number {
    const integrationTests = validationResults.filter(r => 
      r.testId.includes('integration') || r.testId.includes('e2e')
    );
    
    if (integrationTests.length === 0) return 50; // Default if no integration tests
    
    const totalScore = integrationTests.reduce((sum, test) => sum + test.score, 0);
    return totalScore / integrationTests.length;
  }

  /**
   * Calculate performance category score
   */
  private calculatePerformanceCategory(validationResults: ValidationResult[], performanceMetrics?: any): number {
    const performanceTests = validationResults.filter(r => 
      r.testId.includes('performance') || r.testId.includes('benchmark')
    );
    
    if (performanceTests.length === 0) return performanceMetrics ? 75 : 50;
    
    const totalScore = performanceTests.reduce((sum, test) => sum + test.score, 0);
    return totalScore / performanceTests.length;
  }

  /**
   * Calculate reliability category score
   */
  private calculateReliabilityCategory(healthReport: SystemHealthReport, validationResults: ValidationResult[]): number {
    const reliabilityScore = healthReport.overallScore;
    const validationScore = validationResults.length > 0 
      ? validationResults.reduce((sum, r) => sum + (r.passed ? 100 : 0), 0) / validationResults.length
      : 50;
    
    return (reliabilityScore + validationScore) / 2;
  }

  /**
   * Get score history
   */
  public getScoreHistory(limit: number = 10): HealthScoreBreakdown[] {
    return this.scoreHistory.slice(-limit);
  }
}

/**
 * Default health scoring configuration
 */
export const defaultHealthScoringConfig: HealthScoringConfig = {
  weights: {
    componentHealth: 0.3,
    systemIntegration: 0.25,
    performance: 0.2,
    reliability: 0.15,
    security: 0.05,
    maintainability: 0.05
  },
  thresholds: {
    excellent: 90,
    good: 80,
    fair: 70,
    poor: 50
  },
  penalties: {
    criticalIssue: 20,
    highIssue: 10,
    mediumIssue: 5,
    lowIssue: 2,
    componentDown: 25,
    integrationFailure: 15
  },
  bonuses: {
    allComponentsHealthy: 5,
    excellentPerformance: 3,
    zeroIssues: 5,
    highAvailability: 3
  }
};