import { Evidence } from '../interfaces/evidence';
import { FrameworkInfo } from '../interfaces/framework-info';

/**
 * Confidence scoring utilities for framework detection
 */
export class ConfidenceScorer {
  // Confidence thresholds
  private static readonly HIGH_CONFIDENCE = 0.8;
  private static readonly MEDIUM_CONFIDENCE = 0.5;
  private static readonly LOW_CONFIDENCE = 0.2;

  // Evidence type weights
  private static readonly EVIDENCE_WEIGHTS = {
    config_file: 0.9,
    dependency: 0.8,
    file_pattern: 0.7,
    command_pattern: 0.6,
    script_command: 0.6,
    import_statement: 0.5,
    version_info: 0.4,
    text_mention: 0.3,
    annotation: 0.4,
    directory_structure: 0.5
  };

  /**
   * Calculate confidence score for framework detection
   */
  calculateFrameworkConfidence(evidence: Evidence[], frameworkName: string): number {
    if (evidence.length === 0) return 0;

    // Weight evidence by type and relevance
    const weightedScores = evidence.map(e => {
      const typeWeight = ConfidenceScorer.EVIDENCE_WEIGHTS[e.type as keyof typeof ConfidenceScorer.EVIDENCE_WEIGHTS] || 0.1;
      const relevanceWeight = this.calculateRelevanceWeight(e, frameworkName);
      return typeWeight * relevanceWeight * e.weight;
    });

    // Calculate base score
    const totalWeight = weightedScores.reduce((sum, score) => sum + score, 0);
    const maxPossibleWeight = evidence.length * 0.9; // Max weight per evidence
    let baseScore = Math.min(totalWeight / maxPossibleWeight, 1.0);

    // Apply diversity bonus
    const diversityBonus = this.calculateDiversityBonus(evidence);
    baseScore += diversityBonus;

    // Apply evidence count bonus/penalty
    const countModifier = this.calculateCountModifier(evidence.length);
    baseScore *= countModifier;

    return Math.min(Math.max(baseScore, 0), 1.0);
  }

  /**
   * Calculate relevance weight based on evidence content
   */
  private calculateRelevanceWeight(evidence: Evidence, frameworkName: string): number {
    const frameworkLower = frameworkName.toLowerCase();
    const valueLower = evidence.value.toLowerCase();

    // Exact match gets highest weight
    if (valueLower === frameworkLower) return 1.0;

    // Partial match gets medium weight
    if (valueLower.includes(frameworkLower) || frameworkLower.includes(valueLower)) return 0.8;

    // Related terms get lower weight
    if (this.isRelatedTerm(valueLower, frameworkLower)) return 0.6;

    // Default weight
    return 0.5;
  }

  /**
   * Check if terms are related (framework-specific logic)
   */
  private isRelatedTerm(value: string, framework: string): boolean {
    const relatedTerms: Record<string, string[]> = {
      'react': ['jsx', 'tsx', 'react-dom', 'react-scripts', 'create-react-app'],
      'vue': ['vue-cli', 'nuxt', 'vuex', 'vue-router'],
      'angular': ['ng', '@angular', 'angular-cli', 'typescript'],
      'express': ['node', 'nodejs', 'npm', 'middleware'],
      'django': ['python', 'pip', 'manage.py', 'wsgi'],
      'flask': ['python', 'pip', 'jinja2', 'werkzeug'],
      'spring': ['java', 'maven', 'gradle', 'boot'],
      'rails': ['ruby', 'gem', 'bundler', 'rake']
    };

    const related = relatedTerms[framework] || [];
    return related.some(term => value.includes(term) || term.includes(value));
  }

  /**
   * Calculate diversity bonus for having multiple evidence types
   */
  private calculateDiversityBonus(evidence: Evidence[]): number {
    const uniqueTypes = new Set(evidence.map(e => e.type));
    const typeCount = uniqueTypes.size;

    if (typeCount >= 4) return 0.15; // High diversity
    if (typeCount >= 3) return 0.10; // Medium diversity
    if (typeCount >= 2) return 0.05; // Low diversity
    return 0; // No diversity bonus
  }

  /**
   * Calculate modifier based on evidence count
   */
  private calculateCountModifier(evidenceCount: number): number {
    if (evidenceCount >= 5) return 1.1;  // Bonus for lots of evidence
    if (evidenceCount >= 3) return 1.0;  // Normal confidence
    if (evidenceCount >= 2) return 0.9;  // Slight penalty
    return 0.7; // Significant penalty for minimal evidence
  }

  /**
   * Get confidence level from score
   */
  getConfidenceLevel(score: number): 'high' | 'medium' | 'low' | 'none' {
    if (score >= ConfidenceScorer.HIGH_CONFIDENCE) return 'high';
    if (score >= ConfidenceScorer.MEDIUM_CONFIDENCE) return 'medium';
    if (score >= ConfidenceScorer.LOW_CONFIDENCE) return 'low';
    return 'none';
  }

  /**
   * Compare framework confidence scores for ranking
   */
  compareFrameworks(a: FrameworkInfo, b: FrameworkInfo): number {
    // Primary sort by confidence
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }

    // Secondary sort by evidence count
    const aEvidenceCount = a.evidence?.length || 0;
    const bEvidenceCount = b.evidence?.length || 0;
    if (aEvidenceCount !== bEvidenceCount) {
      return bEvidenceCount - aEvidenceCount;
    }

    // Tertiary sort by framework name (alphabetical)
    return a.name.localeCompare(b.name);
  }

  /**
   * Filter frameworks by minimum confidence threshold
   */
  filterByConfidence(frameworks: FrameworkInfo[], minConfidence: number = 0.3): FrameworkInfo[] {
    return frameworks.filter(framework => framework.confidence >= minConfidence);
  }

  /**
   * Get top N frameworks by confidence
   */
  getTopFrameworks(frameworks: FrameworkInfo[], count: number = 5): FrameworkInfo[] {
    return frameworks
      .sort((a, b) => this.compareFrameworks(a, b))
      .slice(0, count);
  }
}