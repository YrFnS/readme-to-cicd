import { 
  OverallConfidence, 
  ConfidenceLevel, 
  ConfidenceFactor, 
  ComponentConfidence,
  EvidenceQuality 
} from '../interfaces/confidence';
import { Evidence } from '../interfaces/evidence';
import { FrameworkInfo } from '../interfaces/framework-info';

/**
 * Confidence calculation utilities
 */
export class ConfidenceCalculator {
  /**
   * Calculate overall confidence from evidence and detection results
   */
  calculateOverallConfidence(evidence: Evidence[], detectionResults: any): OverallConfidence {
    const evidenceQuality = this.assessEvidenceQuality(evidence);
    const factors = this.identifyConfidenceFactors(evidence, detectionResults);
    
    // Calculate component-specific confidence
    const frameworksConfidence = this.calculateComponentConfidence(
      evidence.filter(e => ['dependency', 'config_file', 'text_mention'].includes(e.type)),
      'frameworks',
      detectionResults.frameworks || []
    );
    
    const buildToolsConfidence = this.calculateComponentConfidence(
      evidence.filter(e => ['config_file', 'command_pattern', 'script_command'].includes(e.type)),
      'buildTools',
      detectionResults.buildTools || []
    );
    
    const containersConfidence = this.calculateComponentConfidence(
      evidence.filter(e => ['config_file', 'file_pattern'].includes(e.type)),
      'containers',
      []
    );
    
    const languagesConfidence = this.calculateComponentConfidence(
      evidence.filter(e => ['dependency', 'file_pattern', 'import_statement'].includes(e.type)),
      'languages',
      []
    );
    
    // Calculate overall score as weighted average
    const componentWeights = { frameworks: 0.4, buildTools: 0.3, containers: 0.2, languages: 0.1 };
    const score = (
      frameworksConfidence.score * componentWeights.frameworks +
      buildToolsConfidence.score * componentWeights.buildTools +
      containersConfidence.score * componentWeights.containers +
      languagesConfidence.score * componentWeights.languages
    );
    
    const level = this.getConfidenceLevel(score);
    
    return {
      score,
      level,
      breakdown: {
        frameworks: frameworksConfidence,
        buildTools: buildToolsConfidence,
        containers: containersConfidence,
        languages: languagesConfidence
      },
      factors,
      recommendations: this.generateRecommendations(score, factors)
    };
  }

  /**
   * Calculate confidence score from evidence
   */
  private calculateConfidenceScore(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;
    
    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    const maxPossibleWeight = evidence.length * 1.0; // Assuming max weight is 1.0
    
    return Math.min(totalWeight / maxPossibleWeight, 1.0);
  }

  /**
   * Get confidence level from score
   */
  private getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    if (score >= 0.2) return 'low';
    return 'none';
  }

  /**
   * Identify factors affecting confidence
   */
  identifyConfidenceFactors(evidence: Evidence[], detectionResults: any): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];
    
    // Check for strong evidence
    const strongEvidence = evidence.filter(e => e.weight >= 0.8);
    if (strongEvidence.length > 0) {
      factors.push({
        type: 'strong_evidence',
        description: `Found ${strongEvidence.length} strong evidence sources`,
        impact: 0.3,
        affectedComponents: ['frameworks', 'buildTools']
      });
    }
    
    // Check for multiple sources
    const uniqueSources = new Set(evidence.map(e => e.source));
    if (uniqueSources.size >= 3) {
      factors.push({
        type: 'multiple_sources',
        description: `Evidence from ${uniqueSources.size} different sources`,
        impact: 0.2,
        affectedComponents: ['frameworks']
      });
    }
    
    // Check for minimal evidence
    if (evidence.length < 2) {
      factors.push({
        type: 'minimal_evidence',
        description: 'Very little supporting evidence found',
        impact: -0.4,
        affectedComponents: ['frameworks', 'buildTools'],
        resolution: 'Add more configuration files or documentation'
      });
    }
    
    return factors;
  }

  /**
   * Calculate component-specific confidence
   */
  calculateComponentConfidence(
    evidence: Evidence[], 
    componentType: string, 
    detectedItems: any[] = []
  ): ComponentConfidence {
    const evidenceQuality = this.assessEvidenceQuality(evidence);
    const detectedCount = detectedItems.length;
    
    // Base score from evidence quality
    let score = 0;
    if (evidenceQuality.strongEvidence > 0) score += Math.min(evidenceQuality.strongEvidence * 0.3, 0.6);
    if (evidenceQuality.mediumEvidence > 0) score += Math.min(evidenceQuality.mediumEvidence * 0.2, 0.4);
    if (evidenceQuality.weakEvidence > 0) score += Math.min(evidenceQuality.weakEvidence * 0.1, 0.2);
    
    // Boost score based on detected items
    if (detectedCount > 0) {
      score += Math.min(detectedCount * 0.15, 0.3);
    }
    
    // Apply diversity bonus
    score += evidenceQuality.diversityScore * 0.15;
    
    // Cap at 1.0
    score = Math.min(score, 1.0);
    
    const factors = this.generateComponentFactors(evidence, detectedItems, componentType);
    
    return {
      score,
      detectedCount,
      evidenceQuality,
      factors
    };
  }

  /**
   * Assess evidence quality
   */
  assessEvidenceQuality(evidence: Evidence[]): EvidenceQuality {
    const strongEvidence = evidence.filter(e => e.weight >= 0.7).length;
    const mediumEvidence = evidence.filter(e => e.weight >= 0.4 && e.weight < 0.7).length;
    const weakEvidence = evidence.filter(e => e.weight < 0.4).length;
    
    // Calculate diversity score based on evidence types
    const uniqueTypes = new Set(evidence.map(e => e.type));
    const diversityScore = Math.min(uniqueTypes.size / 5, 1.0); // Normalize to 0-1
    
    return {
      strongEvidence,
      mediumEvidence,
      weakEvidence,
      diversityScore
    };
  }

  /**
   * Generate component-specific factors
   */
  private generateComponentFactors(
    evidence: Evidence[], 
    detectedItems: any[], 
    componentType: string
  ): string[] {
    const factors: string[] = [];
    
    if (evidence.length === 0) {
      factors.push(`No evidence found for ${componentType}`);
    }
    
    if (detectedItems.length === 0) {
      factors.push(`No ${componentType} detected`);
    }
    
    const strongEvidence = evidence.filter(e => e.weight >= 0.7);
    if (strongEvidence.length > 0) {
      factors.push(`${strongEvidence.length} strong evidence source(s)`);
    }
    
    return factors;
  }

  /**
   * Generate recommendations based on confidence assessment
   */
  private generateRecommendations(score: number, factors: ConfidenceFactor[]): string[] {
    const recommendations: string[] = [];
    
    if (score < 0.5) {
      recommendations.push('Consider adding more specific configuration files');
      recommendations.push('Include framework versions in documentation');
    }
    
    if (score < 0.3) {
      recommendations.push('Add build scripts to package.json or equivalent');
      recommendations.push('Include installation and usage instructions');
    }
    
    // Add factor-specific recommendations
    factors.forEach(factor => {
      if (factor.resolution) {
        recommendations.push(factor.resolution);
      }
    });
    
    return Array.from(new Set(recommendations)); // Remove duplicates
  }
}