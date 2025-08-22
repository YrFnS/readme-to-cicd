import {
  RepositoryChanges,
  FileChange,
  ConfigChange,
  DependencyChange,
  FrameworkImpact
} from '../types';

export class ChangeDetector {
  /**
   * Analyze the significance of a file change
   */
  analyzeFileSignificance(filePath: string): 'low' | 'medium' | 'high' {
    const path = filePath.toLowerCase();

    // High significance files
    if (this.isHighSignificanceFile(path)) {
      return 'high';
    }

    // Medium significance files
    if (this.isMediumSignificanceFile(path)) {
      return 'medium';
    }

    // Default to low significance
    return 'low';
  }

  /**
   * Check if a file has high significance
   */
  private isHighSignificanceFile(path: string): boolean {
    const highSigFiles = [
      'readme.md',
      'package.json',
      'requirements.txt',
      'cargo.toml',
      'go.mod',
      'dockerfile',
      'docker-compose.yml',
      '.github/workflows/',
      'ci.yml',
      'cd.yml'
    ];

    return highSigFiles.some(sigFile => path.includes(sigFile));
  }

  /**
   * Check if a file has medium significance
   */
  private isMediumSignificanceFile(path: string): boolean {
    const mediumSigFiles = [
      '.gitignore',
      '.eslintrc',
      '.prettierrc',
      'tsconfig.json',
      '.env',
      'config/',
      'src/',
      'lib/',
      'test/',
      'spec/'
    ];

    return mediumSigFiles.some(sigFile => path.includes(sigFile));
  }

  /**
   * Detect dependency changes from file changes
   */
  async detectDependencyChanges(changes: RepositoryChanges): Promise<DependencyChange[]> {
    const dependencyChanges: DependencyChange[] = [];

    // Check package.json changes
    const packageJsonChanges = changes.modifiedFiles.filter(f =>
      f.path.toLowerCase() === 'package.json'
    );

    if (packageJsonChanges.length > 0) {
      const packageChange = packageJsonChanges[0];
      if (packageChange) {
        dependencyChanges.push({
          framework: 'nodejs',
          type: 'updated',
          breaking: await this.analyzePackageJsonBreakingChanges(packageChange)
        });
      }
    }

    // Check requirements.txt changes
    const requirementsChanges = changes.modifiedFiles.filter(f =>
      f.path.toLowerCase() === 'requirements.txt'
    );

    if (requirementsChanges.length > 0) {
      dependencyChanges.push({
        framework: 'python',
        type: 'updated',
        breaking: false // Python dependency analysis would need more sophisticated parsing
      });
    }

    // Check go.mod changes
    const goModChanges = changes.modifiedFiles.filter(f =>
      f.path.toLowerCase() === 'go.mod'
    );

    if (goModChanges.length > 0) {
      const goModChange = goModChanges[0];
      if (goModChange) {
        dependencyChanges.push({
          framework: 'golang',
          type: 'updated',
          breaking: await this.analyzeGoModBreakingChanges(goModChange)
        });
      }
    }

    return dependencyChanges;
  }

  /**
   * Detect configuration changes
   */
  detectConfigurationChanges(changes: RepositoryChanges): ConfigChange[] {
    const configChanges: ConfigChange[] = [];

    // Check for package.json changes
    const packageJsonChanges = changes.modifiedFiles.filter(f =>
      f.path.toLowerCase() === 'package.json'
    );

    if (packageJsonChanges.length > 0) {
      const packageChange = packageJsonChanges[0];
      if (packageChange) {
        configChanges.push({
          type: 'package.json',
          changes: ['dependencies', 'scripts', 'configuration'],
          impact: this.analyzePackageJsonImpact(packageChange)
        });
      }
    }

    return configChanges;
  }

  /**
   * Analyze potential breaking changes in package.json
   */
  private async analyzePackageJsonBreakingChanges(change: FileChange): Promise<boolean> {
    // This would require parsing the actual package.json content
    // For now, we'll use heuristics based on file change patterns
    return false; // Conservative approach
  }

  /**
   * Analyze potential breaking changes in go.mod
   */
  private async analyzeGoModBreakingChanges(change: FileChange): Promise<boolean> {
    // This would require parsing go.mod content
    // For now, we'll use heuristics
    return false; // Conservative approach
  }

  /**
   * Analyze impact of package.json changes
   */
  private analyzePackageJsonImpact(change: FileChange): FrameworkImpact[] {
    // This would analyze the actual content changes
    // For now, return a generic Node.js impact
    return [{
      framework: 'nodejs',
      confidence: 0.8,
      evidence: ['package.json modified']
    }];
  }

  /**
   * Get total change significance score
   */
  getTotalSignificanceScore(changes: RepositoryChanges): number {
    let score = 0;

    // Score file changes by significance
    const fileChanges = [...changes.modifiedFiles, ...changes.addedFiles, ...changes.deletedFiles];

    for (const change of fileChanges) {
      switch (change.significance) {
        case 'high':
          score += 3;
          break;
        case 'medium':
          score += 2;
          break;
        case 'low':
          score += 1;
          break;
      }
    }

    // Score dependency changes
    for (const depChange of changes.dependencyChanges) {
      score += depChange.breaking ? 5 : 3;
    }

    // Score configuration changes
    score += changes.configurationChanges.length * 4;

    return score;
  }

  /**
   * Check if changes warrant automation
   */
  shouldTriggerAutomation(changes: RepositoryChanges): boolean {
    const score = this.getTotalSignificanceScore(changes);

    // Trigger automation if score is above threshold
    return score >= 5;
  }

  /**
   * Get automation priority based on changes
   */
  getAutomationPriority(changes: RepositoryChanges): 'low' | 'medium' | 'high' | 'critical' {
    const score = this.getTotalSignificanceScore(changes);
    const hasBreakingChanges = changes.dependencyChanges.some(d => d.breaking);
    const hasHighSigFiles = [...changes.modifiedFiles, ...changes.addedFiles]
      .some(f => f.significance === 'high');

    if (hasBreakingChanges || score >= 15) {
      return 'critical';
    }

    if (hasHighSigFiles || score >= 10) {
      return 'high';
    }

    if (score >= 5) {
      return 'medium';
    }

    return 'low';
  }
}