/**
 * Confidence Calculator
 * 
 * Provides weighted confidence scoring algorithms for language detection
 * with boost factors for strong indicators and aggregation methods for
 * multiple evidence sources.
 */

import { Evidence, EvidenceType } from '../../shared/types/language-context';

/**
 * Strong indicators that boost confidence scores
 */
export interface StrongIndicator {
  type: 'file_extension' | 'framework_declaration' | 'syntax_pattern' | 'explicit_declaration';
  weight: number;
  boostFactor: number;
}

/**
 * Confidence score with metadata
 */
export interface ConfidenceScore {
  value: number;
  weight: number;
  source: string;
  evidenceCount: number;
}

/**
 * Configuration for confidence calculation
 */
export interface ConfidenceConfig {
  /** Base weights for different evidence types */
  evidenceWeights: Map<EvidenceType, number>;
  /** Strong indicators with boost factors */
  strongIndicators: StrongIndicator[];
  /** Minimum confidence threshold */
  minConfidence: number;
  /** Maximum confidence cap */
  maxConfidence: number;
  /** Aggregation method for multiple scores */
  aggregationMethod: 'weighted_average' | 'max_boost' | 'harmonic_mean';
}

/**
 * Default confidence configuration
 */
const DEFAULT_CONFIG: ConfidenceConfig = {
  evidenceWeights: new Map([
    ['extension', 0.9],      // File extensions are strong indicators
    ['syntax', 0.8],         // Syntax patterns are very reliable
    ['framework', 0.7],      // Framework mentions are reliable
    ['declaration', 0.9],    // Explicit declarations are strongest
    ['keyword', 0.5],        // Keywords are medium strength
    ['dependency', 0.6],     // Dependencies are fairly reliable
    ['tool', 0.4],          // Tool mentions are weaker
    ['pattern', 0.6]        // Code patterns are fairly reliable
  ]),
  strongIndicators: [
    { type: 'file_extension', weight: 1.0, boostFactor: 1.3 },
    { type: 'framework_declaration', weight: 0.9, boostFactor: 1.2 },
    { type: 'syntax_pattern', weight: 0.8, boostFactor: 1.15 },
    { type: 'explicit_declaration', weight: 1.0, boostFactor: 1.4 }
  ],
  minConfidence: 0.0,
  maxConfidence: 1.0,
  aggregationMethod: 'weighted_average'
};

/**
 * Calculator for confidence scores with weighted algorithms and boost factors
 */
export class ConfidenceCalculator {
  private config: ConfidenceConfig;

  constructor(config?: Partial<ConfidenceConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      evidenceWeights: config?.evidenceWeights || DEFAULT_CONFIG.evidenceWeights,
      strongIndicators: config?.strongIndicators || DEFAULT_CONFIG.strongIndicators
    };
  }

  /**
   * Calculate base confidence score from evidence array
   */
  public calculateBaseConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) {
      return this.config.minConfidence;
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const item of evidence) {
      const weight = this.config.evidenceWeights.get(item.type) || 0.3;
      const weightedScore = item.confidence * weight;
      
      totalWeightedScore += weightedScore;
      totalWeight += weight;
    }

    const baseConfidence = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    return this.clampConfidence(baseConfidence);
  }

  /**
   * Apply boost factors for strong language indicators
   */
  public applyBoostFactors(baseConfidence: number, indicators: StrongIndicator[]): number {
    if (indicators.length === 0) {
      return baseConfidence;
    }

    let boostedConfidence = baseConfidence;
    let totalBoost = 0;
    let totalWeight = 0;

    for (const indicator of indicators) {
      const boost = (indicator.boostFactor - 1.0) * indicator.weight;
      totalBoost += boost;
      totalWeight += indicator.weight;
    }

    if (totalWeight > 0) {
      const averageBoost = totalBoost / totalWeight;
      boostedConfidence = baseConfidence * (1 + averageBoost);
    }

    return this.clampConfidence(boostedConfidence);
  }

  /**
   * Aggregate multiple confidence scores using configured method
   */
  public aggregateMultipleScores(scores: ConfidenceScore[]): number {
    if (scores.length === 0) {
      return this.config.minConfidence;
    }

    if (scores.length === 1) {
      return this.clampConfidence(scores[0]?.value ?? 0);
    }

    switch (this.config.aggregationMethod) {
      case 'weighted_average':
        return this.calculateWeightedAverage(scores);
      case 'max_boost':
        return this.calculateMaxBoost(scores);
      case 'harmonic_mean':
        return this.calculateHarmonicMean(scores);
      default:
        return this.calculateWeightedAverage(scores);
    }
  }

  /**
   * Calculate confidence for evidence with strong indicator detection
   */
  public calculateWithBoosts(evidence: Evidence[]): number {
    const baseConfidence = this.calculateBaseConfidence(evidence);
    const strongIndicators = this.detectStrongIndicators(evidence);
    return this.applyBoostFactors(baseConfidence, strongIndicators);
  }

  /**
   * Detect strong indicators from evidence array
   */
  public detectStrongIndicators(evidence: Evidence[]): StrongIndicator[] {
    const indicators: StrongIndicator[] = [];

    for (const item of evidence) {
      const strongIndicator = this.mapEvidenceToStrongIndicator(item);
      if (strongIndicator) {
        indicators.push(strongIndicator);
      }
    }

    return indicators;
  }

  /**
   * Get confidence statistics for debugging and analysis
   */
  public getConfidenceStatistics(evidence: Evidence[]): ConfidenceStatistics {
    const baseConfidence = this.calculateBaseConfidence(evidence);
    const strongIndicators = this.detectStrongIndicators(evidence);
    const boostedConfidence = this.applyBoostFactors(baseConfidence, strongIndicators);

    const evidenceByType = new Map<EvidenceType, Evidence[]>();
    for (const item of evidence) {
      if (!evidenceByType.has(item.type)) {
        evidenceByType.set(item.type, []);
      }
      evidenceByType.get(item.type)!.push(item);
    }

    return {
      baseConfidence,
      boostedConfidence,
      boostFactor: boostedConfidence / (baseConfidence || 0.001),
      evidenceCount: evidence.length,
      strongIndicatorCount: strongIndicators.length,
      evidenceByType: Object.fromEntries(evidenceByType) as Record<EvidenceType, Evidence[]>,
      averageEvidenceConfidence: evidence.length > 0 
        ? evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length 
        : 0
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ConfidenceConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      evidenceWeights: config.evidenceWeights || this.config.evidenceWeights,
      strongIndicators: config.strongIndicators || this.config.strongIndicators
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ConfidenceConfig {
    return { ...this.config };
  }

  // Private helper methods

  private calculateWeightedAverage(scores: ConfidenceScore[]): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const score of scores) {
      totalWeightedScore += score.value * score.weight;
      totalWeight += score.weight;
    }

    const result = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    return this.clampConfidence(result);
  }

  private calculateMaxBoost(scores: ConfidenceScore[]): number {
    const maxScore = Math.max(...scores.map(s => s.value));
    const totalEvidence = scores.reduce((sum, s) => sum + s.evidenceCount, 0);
    
    // Boost based on evidence diversity
    const diversityBoost = Math.min(scores.length * 0.05, 0.2);
    const evidenceBoost = Math.min(totalEvidence * 0.02, 0.15);
    
    const result = maxScore + diversityBoost + evidenceBoost;
    return this.clampConfidence(result);
  }

  private calculateHarmonicMean(scores: ConfidenceScore[]): number {
    const validScores = scores.filter(s => s.value > 0);
    if (validScores.length === 0) {
      return this.config.minConfidence;
    }

    const harmonicSum = validScores.reduce((sum, score) => {
      return sum + (score.weight / score.value);
    }, 0);

    const totalWeight = validScores.reduce((sum, score) => sum + score.weight, 0);
    const result = totalWeight / harmonicSum;
    
    return this.clampConfidence(result);
  }

  private mapEvidenceToStrongIndicator(evidence: Evidence): StrongIndicator | null {
    // Map evidence types to strong indicator types
    const mapping: Record<string, 'file_extension' | 'framework_declaration' | 'syntax_pattern' | 'explicit_declaration'> = {
      'extension': 'file_extension',
      'framework': 'framework_declaration',
      'syntax': 'syntax_pattern',
      'declaration': 'explicit_declaration'
    };

    const indicatorType = mapping[evidence.type];
    if (!indicatorType) {
      return null;
    }

    // Find matching strong indicator configuration
    const config = this.config.strongIndicators.find(si => si.type === indicatorType);
    if (!config) {
      return null;
    }

    // Only consider as strong indicator if evidence confidence is high enough
    if (evidence.confidence < 0.6) {
      return null;
    }

    return {
      type: indicatorType,
      weight: config.weight * evidence.confidence,
      boostFactor: config.boostFactor
    };
  }

  private clampConfidence(value: number): number {
    return Math.max(
      this.config.minConfidence,
      Math.min(this.config.maxConfidence, value)
    );
  }
}

/**
 * Statistics about confidence calculation
 */
export interface ConfidenceStatistics {
  baseConfidence: number;
  boostedConfidence: number;
  boostFactor: number;
  evidenceCount: number;
  strongIndicatorCount: number;
  evidenceByType: Record<EvidenceType, Evidence[]>;
  averageEvidenceConfidence: number;
}

/**
 * Factory for creating confidence calculators with common configurations
 */
export class ConfidenceCalculatorFactory {
  /**
   * Create a conservative calculator (lower confidence scores)
   */
  public static createConservative(): ConfidenceCalculator {
    return new ConfidenceCalculator({
      maxConfidence: 0.85,
      aggregationMethod: 'harmonic_mean',
      strongIndicators: [
        { type: 'file_extension', weight: 0.8, boostFactor: 1.1 },
        { type: 'framework_declaration', weight: 0.7, boostFactor: 1.05 },
        { type: 'syntax_pattern', weight: 0.6, boostFactor: 1.03 },
        { type: 'explicit_declaration', weight: 0.9, boostFactor: 1.15 }
      ]
    });
  }

  /**
   * Create an aggressive calculator (higher confidence scores)
   */
  public static createAggressive(): ConfidenceCalculator {
    return new ConfidenceCalculator({
      maxConfidence: 1.0,
      aggregationMethod: 'max_boost',
      strongIndicators: [
        { type: 'file_extension', weight: 1.0, boostFactor: 1.5 },
        { type: 'framework_declaration', weight: 1.0, boostFactor: 1.4 },
        { type: 'syntax_pattern', weight: 0.9, boostFactor: 1.3 },
        { type: 'explicit_declaration', weight: 1.0, boostFactor: 1.6 }
      ]
    });
  }

  /**
   * Create a balanced calculator (default settings)
   */
  public static createBalanced(): ConfidenceCalculator {
    return new ConfidenceCalculator();
  }
}