import { FrameworkInfo, BuildToolInfo } from '../interfaces/framework-info';
import { Evidence } from '../interfaces/evidence';
import { OverallConfidence } from '../interfaces/confidence';
import { DetectionConflict } from './conflict-resolution';

/**
 * Warning severity levels
 */
export type WarningSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Warning categories
 */
export type WarningCategory = 
  | 'detection_quality'     // Issues with detection accuracy
  | 'configuration'         // Configuration problems
  | 'compatibility'         // Compatibility issues
  | 'security'             // Security concerns
  | 'performance'          // Performance implications
  | 'maintenance'          // Maintenance concerns
  | 'best_practices';      // Best practice violations

/**
 * Detection warning
 */
export interface DetectionWarning {
  id: string;
  category: WarningCategory;
  severity: WarningSeverity;
  title: string;
  message: string;
  affectedItems: string[];
  evidence?: Evidence[];
  recommendations: string[];
  autoFixable: boolean;
  learnMoreUrl?: string;
}

/**
 * Warning generation context
 */
export interface WarningContext {
  frameworks: FrameworkInfo[];
  buildTools: BuildToolInfo[];
  evidence: Evidence[];
  confidence: OverallConfidence;
  conflicts: DetectionConflict[];
  projectLanguages: string[];
  configFiles: string[];
}

/**
 * Warning system for detection issues
 */
export class WarningSystem {
  private warningRules: WarningRule[] = [];

  constructor() {
    this.initializeWarningRules();
  }

  /**
   * Generate warnings based on detection context
   */
  generateWarnings(context: WarningContext): DetectionWarning[] {
    const warnings: DetectionWarning[] = [];

    for (const rule of this.warningRules) {
      if (rule.condition(context)) {
        const warning = rule.generator(context);
        if (warning) {
          warnings.push(warning);
        }
      }
    }

    // Sort by severity and category
    return this.sortWarnings(warnings);
  }

  /**
   * Filter warnings by severity
   */
  filterBySeverity(warnings: DetectionWarning[], minSeverity: WarningSeverity): DetectionWarning[] {
    const severityOrder: WarningSeverity[] = ['info', 'warning', 'error', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);
    
    return warnings.filter(warning => 
      severityOrder.indexOf(warning.severity) >= minIndex);
  }

  /**
   * Filter warnings by category
   */
  filterByCategory(warnings: DetectionWarning[], categories: WarningCategory[]): DetectionWarning[] {
    return warnings.filter(warning => categories.includes(warning.category));
  }

  /**
   * Initialize warning rules
   */
  private initializeWarningRules(): void {
    // Low confidence detection warning
    this.warningRules.push({
      id: 'low_confidence',
      condition: (context) => context.confidence.score < 0.5,
      generator: (context) => ({
        id: 'low_confidence',
        category: 'detection_quality',
        severity: 'warning',
        title: 'Low Detection Confidence',
        message: `Framework detection confidence is low (${Math.round(context.confidence.score * 100)}%). Results may be inaccurate.`,
        affectedItems: ['overall_detection'],
        recommendations: [
          'Add more configuration files to improve detection accuracy',
          'Include framework dependencies in package.json or equivalent',
          'Update project documentation to clearly specify frameworks used',
          'Verify that all framework-related files are present'
        ],
        autoFixable: false
      })
    });

    // Missing configuration files warning
    this.warningRules.push({
      id: 'missing_config',
      condition: (context) => context.configFiles.length < 2,
      generator: (context) => ({
        id: 'missing_config',
        category: 'configuration',
        severity: 'info',
        title: 'Limited Configuration Files',
        message: 'Few configuration files detected. This may limit detection accuracy.',
        affectedItems: ['configuration'],
        recommendations: [
          'Add package.json for Node.js projects',
          'Include framework-specific configuration files',
          'Add build tool configuration files',
          'Consider adding CI/CD configuration files'
        ],
        autoFixable: false
      })
    });

    // Framework conflicts warning
    this.warningRules.push({
      id: 'framework_conflicts',
      condition: (context) => context.conflicts.some(c => c.type === 'incompatible_frameworks'),
      generator: (context) => {
        const conflicts = context.conflicts.filter(c => c.type === 'incompatible_frameworks');
        return {
          id: 'framework_conflicts',
          category: 'compatibility',
          severity: 'error',
          title: 'Incompatible Frameworks Detected',
          message: `Detected frameworks that are typically incompatible: ${conflicts.map(c => c.affectedItems.join(' vs ')).join(', ')}`,
          affectedItems: conflicts.flatMap(c => c.affectedItems),
          recommendations: [
            'Review project architecture and choose one primary framework',
            'Consider if this is a monorepo with separate applications',
            'Verify detection accuracy - false positives may occur',
            'Update documentation to clarify framework usage'
          ],
          autoFixable: false
        };
      }
    });

    // Outdated framework versions warning
    this.warningRules.push({
      id: 'outdated_versions',
      condition: (context) => context.frameworks.some(f => this.isVersionOutdated(f)),
      generator: (context) => {
        const outdatedFrameworks = context.frameworks.filter(f => this.isVersionOutdated(f));
        return {
          id: 'outdated_versions',
          category: 'security',
          severity: 'warning',
          title: 'Outdated Framework Versions',
          message: `Some frameworks may be using outdated versions: ${outdatedFrameworks.map(f => `${f.name} ${f.version}`).join(', ')}`,
          affectedItems: outdatedFrameworks.map(f => f.name),
          recommendations: [
            'Update frameworks to latest stable versions',
            'Review security advisories for current versions',
            'Test application with updated versions',
            'Update dependencies and build configurations'
          ],
          autoFixable: false,
          learnMoreUrl: 'https://docs.npmjs.com/updating-packages-downloaded-from-the-registry'
        };
      }
    });

    // Missing test framework warning
    this.warningRules.push({
      id: 'missing_testing',
      condition: (context) => !this.hasTestingFramework(context),
      generator: (context) => ({
        id: 'missing_testing',
        category: 'best_practices',
        severity: 'info',
        title: 'No Testing Framework Detected',
        message: 'No testing framework was detected in the project.',
        affectedItems: ['testing'],
        recommendations: [
          'Add a testing framework like Jest, Mocha, or pytest',
          'Include test scripts in package.json',
          'Set up automated testing in CI/CD pipeline',
          'Consider test-driven development practices'
        ],
        autoFixable: false
      })
    });

    // Performance concerns warning
    this.warningRules.push({
      id: 'performance_concerns',
      condition: (context) => this.hasPerformanceConcerns(context),
      generator: (context) => {
        const concerns = this.getPerformanceConcerns(context);
        return {
          id: 'performance_concerns',
          category: 'performance',
          severity: 'info',
          title: 'Potential Performance Considerations',
          message: `Detected configurations that may impact performance: ${concerns.join(', ')}`,
          affectedItems: concerns,
          recommendations: [
            'Consider build optimization strategies',
            'Implement code splitting for large applications',
            'Use production builds for deployment',
            'Consider performance monitoring tools'
          ],
          autoFixable: false
        };
      }
    });

    // Security concerns warning
    this.warningRules.push({
      id: 'security_concerns',
      condition: (context) => this.hasSecurityConcerns(context),
      generator: (context) => {
        const concerns = this.getSecurityConcerns(context);
        return {
          id: 'security_concerns',
          category: 'security',
          severity: 'warning',
          title: 'Security Considerations',
          message: `Detected configurations that may have security implications: ${concerns.join(', ')}`,
          affectedItems: concerns,
          recommendations: [
            'Review security best practices for detected frameworks',
            'Implement security scanning in CI/CD pipeline',
            'Keep dependencies updated',
            'Follow framework-specific security guidelines'
          ],
          autoFixable: false
        };
      }
    });

    // Maintenance concerns warning
    this.warningRules.push({
      id: 'maintenance_concerns',
      condition: (context) => this.hasMaintenanceConcerns(context),
      generator: (context) => ({
        id: 'maintenance_concerns',
        category: 'maintenance',
        severity: 'info',
        title: 'Maintenance Considerations',
        message: 'Detected configurations that may require ongoing maintenance attention.',
        affectedItems: ['maintenance'],
        recommendations: [
          'Set up automated dependency updates',
          'Monitor framework lifecycle and support status',
          'Document framework choices and rationale',
          'Plan for framework migrations if needed'
        ],
        autoFixable: false
      })
    });

    // Evidence quality warning
    this.warningRules.push({
      id: 'poor_evidence_quality',
      condition: (context) => this.hasPoorEvidenceQuality(context),
      generator: (context) => ({
        id: 'poor_evidence_quality',
        category: 'detection_quality',
        severity: 'warning',
        title: 'Limited Evidence Quality',
        message: 'Detection is based primarily on weak evidence (text mentions, patterns).',
        affectedItems: ['evidence_quality'],
        recommendations: [
          'Add explicit framework dependencies',
          'Include framework configuration files',
          'Add build scripts that clearly indicate framework usage',
          'Update documentation with specific framework information'
        ],
        autoFixable: false
      })
    });

    // Multiple package managers warning
    this.warningRules.push({
      id: 'multiple_package_managers',
      condition: (context) => this.hasMultiplePackageManagers(context),
      generator: (context) => {
        const packageManagers = context.buildTools
          .filter(tool => ['npm', 'yarn', 'pnpm'].includes(tool.name.toLowerCase()))
          .map(tool => tool.name);
        
        return {
          id: 'multiple_package_managers',
          category: 'configuration',
          severity: 'warning',
          title: 'Multiple Package Managers Detected',
          message: `Multiple package managers found: ${packageManagers.join(', ')}. This can cause dependency conflicts.`,
          affectedItems: packageManagers,
          recommendations: [
            'Choose one primary package manager',
            'Remove lock files for unused package managers',
            'Update team documentation on package manager choice',
            'Configure CI/CD to use the chosen package manager'
          ],
          autoFixable: true
        };
      }
    });
  }

  /**
   * Sort warnings by severity and category
   */
  private sortWarnings(warnings: DetectionWarning[]): DetectionWarning[] {
    const severityOrder: WarningSeverity[] = ['critical', 'error', 'warning', 'info'];
    const categoryOrder: WarningCategory[] = [
      'security',
      'compatibility', 
      'configuration',
      'detection_quality',
      'performance',
      'best_practices',
      'maintenance'
    ];

    return warnings.sort((a, b) => {
      // First sort by severity
      const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      if (severityDiff !== 0) return severityDiff;

      // Then sort by category
      const categoryDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;

      // Finally sort by title
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Check if framework version is outdated
   */
  private isVersionOutdated(framework: FrameworkInfo): boolean {
    if (!framework.version) return false;

    // Simple heuristic - in real implementation, this would check against a version database
    const version = framework.version.replace(/[^\d.]/g, '');
    const majorVersion = parseInt(version.split('.')[0] || '0');

    // Framework-specific outdated version checks
    const outdatedVersions: Record<string, number> = {
      'React': 16,
      'Vue.js': 2,
      'Angular': 12,
      'Express': 3,
      'Django': 3,
      'Flask': 1
    };

    const minVersion = outdatedVersions[framework.name];
    return minVersion !== undefined && majorVersion < minVersion;
  }

  /**
   * Check if project has testing framework
   */
  private hasTestingFramework(context: WarningContext): boolean {
    const testingFrameworks = ['jest', 'mocha', 'jasmine', 'pytest', 'junit', 'go test'];
    
    return context.evidence.some(e => 
      testingFrameworks.some(tf => 
        e.value.toLowerCase().includes(tf) || 
        e.source.toLowerCase().includes(tf)
      )
    );
  }

  /**
   * Check if project has performance concerns
   */
  private hasPerformanceConcerns(context: WarningContext): boolean {
    // Look for indicators of potential performance issues
    return context.frameworks.length > 3 || // Too many frameworks
           context.frameworks.some(f => f.name === 'Angular' && f.version?.startsWith('1')); // AngularJS
  }

  /**
   * Get performance concerns
   */
  private getPerformanceConcerns(context: WarningContext): string[] {
    const concerns: string[] = [];
    
    if (context.frameworks.length > 3) {
      concerns.push('Multiple frameworks detected');
    }
    
    if (context.frameworks.some(f => f.name === 'Angular' && f.version?.startsWith('1'))) {
      concerns.push('Legacy AngularJS detected');
    }
    
    return concerns;
  }

  /**
   * Check if project has security concerns
   */
  private hasSecurityConcerns(context: WarningContext): boolean {
    // Look for security-related indicators
    return context.frameworks.some(f => this.isVersionOutdated(f)) ||
           context.evidence.some(e => e.source.includes('http://'));
  }

  /**
   * Get security concerns
   */
  private getSecurityConcerns(context: WarningContext): string[] {
    const concerns: string[] = [];
    
    if (context.frameworks.some(f => this.isVersionOutdated(f))) {
      concerns.push('Outdated framework versions');
    }
    
    if (context.evidence.some(e => e.source.includes('http://'))) {
      concerns.push('Insecure HTTP references');
    }
    
    return concerns;
  }

  /**
   * Check if project has maintenance concerns
   */
  private hasMaintenanceConcerns(context: WarningContext): boolean {
    return context.frameworks.length > 2 || // Multiple frameworks to maintain
           context.buildTools.length > 3;    // Complex build setup
  }

  /**
   * Check if evidence quality is poor
   */
  private hasPoorEvidenceQuality(context: WarningContext): boolean {
    const strongEvidence = context.evidence.filter(e => 
      e.type === 'dependency' || e.type === 'config_file').length;
    const weakEvidence = context.evidence.filter(e => 
      e.type === 'text_mention' || e.type === 'file_pattern').length;
    
    return weakEvidence > strongEvidence && strongEvidence < 2;
  }

  /**
   * Check if project has multiple package managers
   */
  private hasMultiplePackageManagers(context: WarningContext): boolean {
    const packageManagers = context.buildTools.filter(tool => 
      ['npm', 'yarn', 'pnpm'].includes(tool.name.toLowerCase()));
    
    return packageManagers.length > 1;
  }
}

/**
 * Warning rule interface
 */
interface WarningRule {
  id: string;
  condition: (context: WarningContext) => boolean;
  generator: (context: WarningContext) => DetectionWarning | null;
}