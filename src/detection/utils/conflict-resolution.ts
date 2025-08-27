import { FrameworkInfo, BuildToolInfo } from '../interfaces/framework-info';
import { Evidence } from '../interfaces/evidence';

/**
 * Conflict types that can occur during detection
 */
export type ConflictType = 
  | 'duplicate_framework'     // Same framework detected multiple times
  | 'incompatible_frameworks' // Frameworks that shouldn't coexist
  | 'version_conflict'        // Different versions of same framework
  | 'build_tool_conflict'     // Multiple conflicting build tools
  | 'language_mismatch'       // Framework doesn't match detected language
  | 'evidence_contradiction'; // Contradictory evidence found

/**
 * Detected conflict information
 */
export interface DetectionConflict {
  type: ConflictType;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedItems: string[];
  evidence: Evidence[];
  suggestedResolution: string;
  autoResolvable: boolean;
}

/**
 * Resolution strategy for conflicts
 */
export interface ResolutionStrategy {
  type: ConflictType;
  resolver: (conflict: DetectionConflict, context: ResolutionContext) => ResolutionResult;
}

/**
 * Context for conflict resolution
 */
export interface ResolutionContext {
  frameworks: FrameworkInfo[];
  buildTools: BuildToolInfo[];
  evidence: Evidence[];
  projectLanguages: string[];
}

/**
 * Result of conflict resolution
 */
export interface ResolutionResult {
  resolved: boolean;
  action: 'keep_all' | 'keep_first' | 'keep_highest_confidence' | 'merge' | 'manual_review';
  modifiedFrameworks?: FrameworkInfo[];
  modifiedBuildTools?: BuildToolInfo[];
  warnings: string[];
  explanation: string;
}

/**
 * Conflict detection and resolution system
 */
export class ConflictResolver {
  private resolutionStrategies: Map<ConflictType, ResolutionStrategy> = new Map();
  private incompatibleFrameworks: Map<string, string[]> = new Map();

  constructor() {
    this.initializeResolutionStrategies();
    this.initializeIncompatibilityRules();
  }

  /**
   * Detect conflicts in detection results
   */
  detectConflicts(context: ResolutionContext): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];

    // Check for duplicate frameworks
    conflicts.push(...this.detectDuplicateFrameworks(context));

    // Check for incompatible frameworks
    conflicts.push(...this.detectIncompatibleFrameworks(context));

    // Check for version conflicts
    conflicts.push(...this.detectVersionConflicts(context));

    // Check for build tool conflicts
    conflicts.push(...this.detectBuildToolConflicts(context));

    // Check for language mismatches
    conflicts.push(...this.detectLanguageMismatches(context));

    // Check for evidence contradictions
    conflicts.push(...this.detectEvidenceContradictions(context));

    return conflicts;
  }

  /**
   * Resolve detected conflicts
   */
  resolveConflicts(
    conflicts: DetectionConflict[], 
    context: ResolutionContext
  ): { resolvedContext: ResolutionContext; warnings: string[] } {
    const resolvedContext = { ...context };
    const warnings: string[] = [];

    for (const conflict of conflicts) {
      const strategy = this.resolutionStrategies.get(conflict.type);
      if (strategy && conflict.autoResolvable) {
        const result = strategy.resolver(conflict, resolvedContext);
        
        if (result.resolved) {
          // Apply resolution changes
          if (result.modifiedFrameworks) {
            resolvedContext.frameworks = result.modifiedFrameworks;
          }
          if (result.modifiedBuildTools) {
            resolvedContext.buildTools = result.modifiedBuildTools;
          }
          
          warnings.push(`Resolved ${conflict.type}: ${result.explanation}`);
          warnings.push(...result.warnings);
        } else {
          warnings.push(`Could not resolve ${conflict.type}: ${conflict.description}`);
        }
      } else {
        warnings.push(`Manual review required for ${conflict.type}: ${conflict.suggestedResolution}`);
      }
    }

    return { resolvedContext, warnings };
  }

  /**
   * Detect duplicate framework detections
   */
  private detectDuplicateFrameworks(context: ResolutionContext): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];
    const frameworkNames = new Map<string, FrameworkInfo[]>();

    // Group frameworks by normalized name
    for (const framework of context.frameworks) {
      const normalizedName = this.normalizeFrameworkName(framework.name);
      if (!frameworkNames.has(normalizedName)) {
        frameworkNames.set(normalizedName, []);
      }
      frameworkNames.get(normalizedName)!.push(framework);
    }

    // Find duplicates
    for (const [name, frameworks] of frameworkNames) {
      if (frameworks.length > 1) {
        conflicts.push({
          type: 'duplicate_framework',
          description: `Multiple detections of ${name} framework`,
          severity: 'medium',
          affectedItems: frameworks.map(f => f.name),
          evidence: frameworks.flatMap(f => f.evidence || []),
          suggestedResolution: 'Keep detection with highest confidence',
          autoResolvable: true
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect incompatible framework combinations
   */
  private detectIncompatibleFrameworks(context: ResolutionContext): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];

    for (let i = 0; i < context.frameworks.length; i++) {
      for (let j = i + 1; j < context.frameworks.length; j++) {
        const framework1 = context.frameworks[i];
        const framework2 = context.frameworks[j];

        if (framework1 && framework2 && this.areFrameworksIncompatible(framework1.name, framework2.name)) {
          conflicts.push({
            type: 'incompatible_frameworks',
            description: `${framework1.name} and ${framework2.name} are typically incompatible`,
            severity: 'high',
            affectedItems: [framework1.name, framework2.name],
            evidence: [
              ...(framework1.evidence || []),
              ...(framework2.evidence || [])
            ],
            suggestedResolution: 'Review project structure and keep the primary framework',
            autoResolvable: false // Requires manual review
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect version conflicts
   */
  private detectVersionConflicts(context: ResolutionContext): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];
    const versionMap = new Map<string, Set<string>>();

    // Collect version information from frameworks
    for (const framework of context.frameworks) {
      if (framework.version) {
        const normalizedName = this.normalizeFrameworkName(framework.name);
        if (!versionMap.has(normalizedName)) {
          versionMap.set(normalizedName, new Set());
        }
        versionMap.get(normalizedName)!.add(framework.version);
      }
    }

    // Check for multiple versions
    for (const [name, versions] of versionMap) {
      if (versions.size > 1) {
        const versionArray = Array.from(versions);
        conflicts.push({
          type: 'version_conflict',
          description: `Multiple versions detected for ${name}: ${versionArray.join(', ')}`,
          severity: 'medium',
          affectedItems: [name],
          evidence: context.frameworks
            .filter(f => this.normalizeFrameworkName(f.name) === name)
            .flatMap(f => f.evidence || []),
          suggestedResolution: 'Use the most recent or most commonly referenced version',
          autoResolvable: true
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect build tool conflicts
   */
  private detectBuildToolConflicts(context: ResolutionContext): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];
    const packageManagers = context.buildTools.filter(tool => 
      ['npm', 'yarn', 'pnpm'].includes(tool.name.toLowerCase()));

    if (packageManagers.length > 1) {
      conflicts.push({
        type: 'build_tool_conflict',
        description: `Multiple package managers detected: ${packageManagers.map(pm => pm.name).join(', ')}`,
        severity: 'medium',
        affectedItems: packageManagers.map(pm => pm.name),
        evidence: [], // BuildToolInfo doesn't have evidence property
        suggestedResolution: 'Choose one primary package manager and remove others',
        autoResolvable: true
      });
    }

    return conflicts;
  }

  /**
   * Detect language mismatches
   */
  private detectLanguageMismatches(context: ResolutionContext): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];

    for (const framework of context.frameworks) {
      const expectedLanguages = this.getExpectedLanguagesForFramework(framework.name);
      const hasMatchingLanguage = expectedLanguages.some(lang => 
        context.projectLanguages.includes(lang));

      if (expectedLanguages.length > 0 && !hasMatchingLanguage) {
        conflicts.push({
          type: 'language_mismatch',
          description: `${framework.name} expects ${expectedLanguages.join(' or ')} but project languages are ${context.projectLanguages.join(', ')}`,
          severity: 'low',
          affectedItems: [framework.name],
          evidence: framework.evidence || [],
          suggestedResolution: 'Verify framework detection or update language detection',
          autoResolvable: false
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect evidence contradictions
   */
  private detectEvidenceContradictions(context: ResolutionContext): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];

    // Group evidence by source
    const evidenceBySource = new Map<string, Evidence[]>();
    for (const evidence of context.evidence) {
      if (!evidenceBySource.has(evidence.source)) {
        evidenceBySource.set(evidence.source, []);
      }
      evidenceBySource.get(evidence.source)!.push(evidence);
    }

    // Look for contradictory evidence in same source
    for (const [source, evidenceList] of evidenceBySource) {
      const contradictions = this.findContradictoryEvidence(evidenceList);
      
      if (contradictions.length > 0) {
        conflicts.push({
          type: 'evidence_contradiction',
          description: `Contradictory evidence found in ${source}`,
          severity: 'low',
          affectedItems: contradictions.map(c => c.value),
          evidence: contradictions,
          suggestedResolution: 'Review source file for accuracy',
          autoResolvable: false
        });
      }
    }

    return conflicts;
  }

  /**
   * Initialize resolution strategies
   */
  private initializeResolutionStrategies(): void {
    // Duplicate framework resolution
    this.resolutionStrategies.set('duplicate_framework', {
      type: 'duplicate_framework',
      resolver: (conflict, context) => {
        const affectedFrameworks = context.frameworks.filter(f => 
          conflict.affectedItems.includes(f.name));
        
        // Keep the one with highest confidence
        const bestFramework = affectedFrameworks.reduce((best, current) => 
          current.confidence > best.confidence ? current : best);
        
        const modifiedFrameworks = context.frameworks.filter(f => 
          !conflict.affectedItems.includes(f.name) || f === bestFramework);

        return {
          resolved: true,
          action: 'keep_highest_confidence',
          modifiedFrameworks,
          warnings: [`Removed duplicate detections, kept ${bestFramework.name} (confidence: ${bestFramework.confidence})`],
          explanation: `Kept framework detection with highest confidence score`
        };
      }
    });

    // Version conflict resolution
    this.resolutionStrategies.set('version_conflict', {
      type: 'version_conflict',
      resolver: (conflict, context) => {
        const affectedFrameworks = context.frameworks.filter(f => 
          conflict.affectedItems.includes(this.normalizeFrameworkName(f.name)));
        
        // Keep the one with highest confidence or most recent version
        const bestFramework = affectedFrameworks.reduce((best, current) => {
          if (current.confidence !== best.confidence) {
            return current.confidence > best.confidence ? current : best;
          }
          // If confidence is equal, prefer more recent version
          return this.compareVersions(current.version || '', best.version || '') > 0 ? current : best;
        });

        const modifiedFrameworks = context.frameworks.map(f => {
          if (conflict.affectedItems.includes(this.normalizeFrameworkName(f.name))) {
            if (f === bestFramework) {
              return f;
            } else {
              // Only assign version if it exists, otherwise keep original
              const updatedFramework = { ...f };
              if (bestFramework.version) {
                updatedFramework.version = bestFramework.version;
              }
              return updatedFramework;
            }
          }
          return f;
        });

        const resolvedVersion = bestFramework.version || 'unknown';
        return {
          resolved: true,
          action: 'merge',
          modifiedFrameworks,
          warnings: [`Resolved version conflict by using version ${resolvedVersion}`],
          explanation: `Unified version to ${resolvedVersion} based on confidence and recency`
        };
      }
    });

    // Build tool conflict resolution
    this.resolutionStrategies.set('build_tool_conflict', {
      type: 'build_tool_conflict',
      resolver: (conflict, context) => {
        const packageManagers = context.buildTools.filter(tool => 
          conflict.affectedItems.includes(tool.name));
        
        // Keep the one with highest confidence
        const bestPackageManager = packageManagers.reduce((best, current) => 
          current.confidence > best.confidence ? current : best);
        
        const modifiedBuildTools = context.buildTools.filter(tool => 
          !conflict.affectedItems.includes(tool.name) || tool === bestPackageManager);

        return {
          resolved: true,
          action: 'keep_highest_confidence',
          modifiedBuildTools,
          warnings: [`Selected ${bestPackageManager.name} as primary package manager`],
          explanation: `Chose package manager with highest confidence score`
        };
      }
    });
  }

  /**
   * Initialize framework incompatibility rules
   */
  private initializeIncompatibilityRules(): void {
    // Define incompatible framework pairs
    const incompatibilities = [
      ['React', 'Vue.js'],
      ['React', 'Angular'],
      ['Vue.js', 'Angular'],
      ['Django', 'Flask'],
      ['Express', 'NestJS'] // Not always incompatible, but worth flagging
    ];

    incompatibilities.forEach((pair) => {
      const [framework1, framework2] = pair;
      if (framework1 && framework2) {
        if (!this.incompatibleFrameworks.has(framework1)) {
          this.incompatibleFrameworks.set(framework1, []);
        }
        if (!this.incompatibleFrameworks.has(framework2)) {
          this.incompatibleFrameworks.set(framework2, []);
        }
        
        this.incompatibleFrameworks.get(framework1)!.push(framework2);
        this.incompatibleFrameworks.get(framework2)!.push(framework1);
      }
    });
  }

  /**
   * Normalize framework name for comparison
   */
  private normalizeFrameworkName(name: string): string {
    return name.toLowerCase()
      .replace(/\.js$/, '')
      .replace(/js$/, '')
      .replace(/\s+/g, '');
  }

  /**
   * Check if two frameworks are incompatible
   */
  private areFrameworksIncompatible(framework1: string, framework2: string): boolean {
    const normalized1 = this.normalizeFrameworkName(framework1);
    const normalized2 = this.normalizeFrameworkName(framework2);
    
    const incompatible1 = this.incompatibleFrameworks.get(framework1) || [];
    const incompatible2 = this.incompatibleFrameworks.get(framework2) || [];
    
    return incompatible1.includes(framework2) || 
           incompatible2.includes(framework1) ||
           incompatible1.some(f => this.normalizeFrameworkName(f) === normalized2) ||
           incompatible2.some(f => this.normalizeFrameworkName(f) === normalized1);
  }

  /**
   * Get expected languages for a framework
   */
  private getExpectedLanguagesForFramework(frameworkName: string): string[] {
    const frameworkLanguages: Record<string, string[]> = {
      'React': ['JavaScript', 'TypeScript'],
      'Vue.js': ['JavaScript', 'TypeScript'],
      'Angular': ['TypeScript'],
      'Next.js': ['JavaScript', 'TypeScript'],
      'Express': ['JavaScript', 'TypeScript'],
      'NestJS': ['TypeScript'],
      'Django': ['Python'],
      'Flask': ['Python'],
      'FastAPI': ['Python'],
      'Spring Boot': ['Java'],
      'Gin': ['Go'],
      'Echo': ['Go'],
      'Actix Web': ['Rust'],
      'Rocket': ['Rust']
    };

    return frameworkLanguages[frameworkName] || [];
  }

  /**
   * Find contradictory evidence in a list
   */
  private findContradictoryEvidence(evidenceList: Evidence[]): Evidence[] {
    // Simple contradiction detection - can be enhanced
    const contradictions: Evidence[] = [];
    
    // Look for evidence that suggests different frameworks for same type
    // This is a simplified implementation - real contradiction detection would be more sophisticated
    return contradictions;
  }

  /**
   * Compare two version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.replace(/[^\d.]/g, '').split('.').map(Number);
    const v2Parts = version2.replace(/[^\d.]/g, '').split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) {return 1;}
      if (v1Part < v2Part) {return -1;}
    }
    
    return 0;
  }
}