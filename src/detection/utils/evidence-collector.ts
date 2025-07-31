import { Evidence, EvidenceType, EvidenceCollector, EvidenceFilter, EvidenceAggregation } from '../interfaces/evidence';
import { ProjectInfo } from '../interfaces/framework-detector';

/**
 * Evidence collection and analysis implementation
 */
export class EvidenceCollectorImpl implements EvidenceCollector {
  /**
   * Collect evidence from project information
   */
  async collectEvidence(projectInfo: ProjectInfo, projectPath?: string): Promise<Evidence[]> {
    const evidence: Evidence[] = [];
    
    // Collect dependency evidence
    evidence.push(...this.collectDependencyEvidence(projectInfo));
    
    // Collect config file evidence
    evidence.push(...this.collectConfigFileEvidence(projectInfo));
    
    // Collect command evidence
    evidence.push(...this.collectCommandEvidence(projectInfo));
    
    // Collect text mention evidence
    evidence.push(...this.collectTextEvidence(projectInfo));
    
    // TODO: Collect file system evidence if projectPath is provided
    if (projectPath) {
      // This will be implemented when file scanner is enhanced
    }
    
    return evidence;
  }

  /**
   * Weight evidence based on type and context
   */
  weightEvidence(evidence: Evidence): number {
    const baseWeights: Record<EvidenceType, number> = {
      'config_file': 0.8,
      'dependency': 0.7,
      'file_pattern': 0.6,
      'command_pattern': 0.5,
      'script_command': 0.5,
      'import_statement': 0.4,
      'version_info': 0.3,
      'text_mention': 0.2,
      'annotation': 0.3,
      'directory_structure': 0.4
    };
    
    return baseWeights[evidence.type] || 0.1;
  }

  /**
   * Filter evidence by criteria
   */
  filterEvidence(evidence: Evidence[], criteria: EvidenceFilter): Evidence[] {
    let filtered = evidence;
    
    if (criteria.types) {
      filtered = filtered.filter(e => criteria.types!.includes(e.type));
    }
    
    if (criteria.minimumWeight !== undefined) {
      filtered = filtered.filter(e => e.weight >= criteria.minimumWeight!);
    }
    
    if (criteria.sourcePatterns) {
      filtered = filtered.filter(e => 
        criteria.sourcePatterns!.some(pattern => 
          e.source.toLowerCase().includes(pattern.toLowerCase())
        )
      );
    }
    
    if (criteria.limit) {
      filtered = filtered.slice(0, criteria.limit);
    }
    
    return filtered;
  }

  /**
   * Aggregate evidence for analysis
   */
  aggregateEvidence(evidence: Evidence[]): EvidenceAggregation {
    const byType: Record<EvidenceType, Evidence[]> = {} as any;
    
    // Group by type
    evidence.forEach(e => {
      if (!byType[e.type]) {
        byType[e.type] = [];
      }
      byType[e.type].push(e);
    });
    
    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    const averageConfidence = evidence.length > 0 ? totalWeight / evidence.length : 0;
    
    // Find strongest evidence (top 3 by weight)
    const strongestEvidence = evidence
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
    
    return {
      totalCount: evidence.length,
      byType,
      totalWeight,
      averageConfidence,
      strongestEvidence
    };
  }

  /**
   * Collect dependency evidence from project info
   */
  private collectDependencyEvidence(projectInfo: ProjectInfo): Evidence[] {
    return projectInfo.dependencies.map(dep => ({
      type: 'dependency' as EvidenceType,
      source: 'project_dependencies',
      value: dep,
      weight: this.weightEvidence({ type: 'dependency' } as Evidence),
      context: { dependencyType: 'runtime' }
    }));
  }

  /**
   * Collect config file evidence
   */
  private collectConfigFileEvidence(projectInfo: ProjectInfo): Evidence[] {
    return projectInfo.configFiles.map(file => ({
      type: 'config_file' as EvidenceType,
      source: 'project_config',
      value: file,
      weight: this.weightEvidence({ type: 'config_file' } as Evidence),
      location: { filePath: file }
    }));
  }

  /**
   * Collect command evidence
   */
  private collectCommandEvidence(projectInfo: ProjectInfo): Evidence[] {
    const evidence: Evidence[] = [];
    
    projectInfo.buildCommands.forEach(cmd => {
      evidence.push({
        type: 'command_pattern' as EvidenceType,
        source: 'build_commands',
        value: cmd,
        weight: this.weightEvidence({ type: 'command_pattern' } as Evidence),
        context: { commandType: 'build' }
      });
    });
    
    projectInfo.testCommands.forEach(cmd => {
      evidence.push({
        type: 'command_pattern' as EvidenceType,
        source: 'test_commands',
        value: cmd,
        weight: this.weightEvidence({ type: 'command_pattern' } as Evidence),
        context: { commandType: 'test' }
      });
    });
    
    return evidence;
  }

  /**
   * Collect text mention evidence
   */
  private collectTextEvidence(projectInfo: ProjectInfo): Evidence[] {
    const evidence: Evidence[] = [];
    const content = projectInfo.rawContent.toLowerCase();
    
    // Common framework mentions to look for
    const frameworkPatterns = [
      'react', 'vue', 'angular', 'express', 'next.js', 'gatsby',
      'django', 'flask', 'fastapi', 'pyramid',
      'spring', 'spring boot', 'quarkus', 'micronaut',
      'gin', 'echo', 'fiber', 'gorilla',
      'actix', 'rocket', 'warp', 'axum',
      'webpack', 'vite', 'parcel', 'rollup',
      'docker', 'kubernetes', 'helm'
    ];
    
    frameworkPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        evidence.push({
          type: 'text_mention' as EvidenceType,
          source: 'readme_content',
          value: pattern,
          weight: this.weightEvidence({ type: 'text_mention' } as Evidence),
          context: { pattern, matchType: 'framework_mention' }
        });
      }
    });
    
    return evidence;
  }
}