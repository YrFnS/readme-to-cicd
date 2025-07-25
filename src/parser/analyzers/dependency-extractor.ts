/**
 * DependencyExtractor - Analyzes README content to extract dependency information
 */

import { BaseAnalyzer } from './base-analyzer';
import { AnalysisResult, DependencyInfo, PackageFile, Package, Command, PackageManagerType, MarkdownAST } from '../types';

/**
 * Package file detection patterns
 */
interface PackageFilePattern {
  name: string;
  type: PackageManagerType;
  patterns: RegExp[];
  confidence: number;
}

/**
 * Installation command patterns
 */
interface InstallCommandPattern {
  manager: PackageManagerType;
  patterns: RegExp[];
  confidence: number;
  extractPackages?: (match: string) => string[];
}

/**
 * Package mention patterns for extracting package names and versions
 */
interface PackageMentionPattern {
  manager: PackageManagerType;
  patterns: RegExp[];
  confidence: number;
}

/**
 * DependencyExtractor class implementing ContentAnalyzer interface
 * Extracts dependency information from README content including package files,
 * installation commands, and package mentions
 */
export class DependencyExtractor extends BaseAnalyzer {
  readonly name = 'DependencyExtractor';

  // Package file detection patterns
  private readonly packageFilePatterns: PackageFilePattern[] = [
    {
      name: 'package.json',
      type: 'npm',
      patterns: [
        /\bpackage\.json\b/gi,
        /\bpackage-lock\.json\b/gi
      ],
      confidence: 0.9
    },
    {
      name: 'yarn.lock',
      type: 'yarn',
      patterns: [
        /\byarn\.lock\b/gi,
        /\b\.yarnrc\b/gi
      ],
      confidence: 0.9
    },
    {
      name: 'requirements.txt',
      type: 'pip',
      patterns: [
        /\brequirements\.txt\b/gi,
        /\brequirements-dev\.txt\b/gi,
        /\brequirements\/.*\.txt\b/gi
      ],
      confidence: 0.9
    },
    {
      name: 'setup.py',
      type: 'pip',
      patterns: [
        /\bsetup\.py\b/gi,
        /\bsetup\.cfg\b/gi
      ],
      confidence: 0.8
    },
    {
      name: 'Pipfile',
      type: 'pip',
      patterns: [
        /\bPipfile\b/g,
        /\bPipfile\.lock\b/g
      ],
      confidence: 0.9
    },
    {
      name: 'pyproject.toml',
      type: 'pip',
      patterns: [
        /\bpyproject\.toml\b/gi
      ],
      confidence: 0.9
    },
    {
      name: 'Cargo.toml',
      type: 'cargo',
      patterns: [
        /\bCargo\.toml\b/g,
        /\bCargo\.lock\b/g
      ],
      confidence: 0.9
    },
    {
      name: 'go.mod',
      type: 'go',
      patterns: [
        /\bgo\.mod\b/gi,
        /\bgo\.sum\b/gi
      ],
      confidence: 0.9
    },
    {
      name: 'pom.xml',
      type: 'maven',
      patterns: [
        /\bpom\.xml\b/gi
      ],
      confidence: 0.9
    },
    {
      name: 'build.gradle',
      type: 'gradle',
      patterns: [
        /\bbuild\.gradle\b/gi,
        /\bbuild\.gradle\.kts\b/gi,
        /\bsettings\.gradle\b/gi
      ],
      confidence: 0.9
    },
    {
      name: 'composer.json',
      type: 'composer',
      patterns: [
        /\bcomposer\.json\b/gi,
        /\bcomposer\.lock\b/gi
      ],
      confidence: 0.9
    },
    {
      name: 'Gemfile',
      type: 'gem',
      patterns: [
        /\bGemfile\b/g,
        /\bGemfile\.lock\b/g
      ],
      confidence: 0.9
    }
  ];

  // Installation command patterns
  private readonly installCommandPatterns: InstallCommandPattern[] = [
    {
      manager: 'npm',
      patterns: [
        /npm\s+install(?:\s+([^\s\n\r;]+(?:\s+[^\s\n\r;]+)*))?/gm,
        /npm\s+i(?:\s+([^\s\n\r;]+(?:\s+[^\s\n\r;]+)*))?/gm,
        /npm\s+ci/gm
      ],
      confidence: 0.9,
      extractPackages: (match: string) => {
        const packageMatch = match.match(/npm\s+(?:install|i)\s+([^\n\r;]+)/i);
        if (packageMatch && packageMatch[1]) {
          return packageMatch[1].trim().split(/\s+/).filter(pkg => 
            pkg && !pkg.startsWith('-') && pkg !== 'install' && pkg !== 'i' && this.isValidPackageName(pkg, 'npm')
          );
        }
        return [];
      }
    },
    {
      manager: 'yarn',
      patterns: [
        /yarn\s+install/gm,
        /yarn\s+add(?:\s+([^\n\r;]+))?/gm,
        /yarn(?:\s+([^\n\r;]+))?/gm
      ],
      confidence: 0.9,
      extractPackages: (match: string) => {
        const packageMatch = match.match(/yarn\s+add\s+([^\n\r;]+)/i);
        if (packageMatch && packageMatch[1]) {
          return packageMatch[1].trim().split(/\s+/).filter(pkg => 
            pkg && !pkg.startsWith('-') && pkg !== 'add' && this.isValidPackageName(pkg, 'yarn')
          );
        }
        return [];
      }
    },
    {
      manager: 'pip',
      patterns: [
        /pip\s+install(?:\s+([^\n\r;]+))?/gm,
        /pip3\s+install(?:\s+([^\n\r;]+))?/gm,
        /python\s+-m\s+pip\s+install(?:\s+([^\n\r;]+))?/gm
      ],
      confidence: 0.9,
      extractPackages: (match: string) => {
        const packageMatch = match.match(/pip3?\s+install\s+([^\n\r;]+)/i) || 
                           match.match(/python\s+-m\s+pip\s+install\s+([^\n\r;]+)/i);
        if (packageMatch && packageMatch[1]) {
          return packageMatch[1].trim().split(/\s+/).filter(pkg => 
            pkg && !pkg.startsWith('-') && pkg !== 'install' && this.isValidPackageName(pkg, 'pip')
          );
        }
        return [];
      }
    },
    {
      manager: 'cargo',
      patterns: [
        /cargo\s+install(?:\s+([^\n\r;]+))?/gm,
        /cargo\s+build/gm,
        /cargo\s+add(?:\s+([^\n\r;]+))?/gm
      ],
      confidence: 0.9,
      extractPackages: (match: string) => {
        const packageMatch = match.match(/cargo\s+(?:install|add)\s+([^\n\r;]+)/i);
        if (packageMatch && packageMatch[1]) {
          return packageMatch[1].trim().split(/\s+/).filter(pkg => 
            pkg && !pkg.startsWith('-') && pkg !== 'install' && pkg !== 'add' && this.isValidPackageName(pkg, 'cargo')
          );
        }
        return [];
      }
    },
    {
      manager: 'go',
      patterns: [
        /go\s+get(?:\s+([^\n\r;]+))?/gm,
        /go\s+mod\s+download/gm,
        /go\s+install(?:\s+([^\n\r;]+))?/gm
      ],
      confidence: 0.9,
      extractPackages: (match: string) => {
        const packageMatch = match.match(/go\s+(?:get|install)\s+([^\n\r;]+)/i);
        if (packageMatch && packageMatch[1]) {
          return packageMatch[1].trim().split(/\s+/).filter(pkg => 
            pkg && !pkg.startsWith('-') && pkg !== 'get' && pkg !== 'install' && this.isValidPackageName(pkg, 'go')
          );
        }
        return [];
      }
    },
    {
      manager: 'maven',
      patterns: [
        /mvn\s+install/gm,
        /mvn\s+compile/gm,
        /mvn\s+dependency:resolve/gm,
        /maven\s+install/gm
      ],
      confidence: 0.8
    },
    {
      manager: 'gradle',
      patterns: [
        /gradle\s+build/gm,
        /gradle\s+install/gm,
        /\.\/gradlew\s+build/gm,
        /gradlew\s+build/gm
      ],
      confidence: 0.8
    },
    {
      manager: 'composer',
      patterns: [
        /composer\s+install/gm,
        /composer\s+require(?:\s+([^\n\r;]+))?/gm,
        /composer\s+update/gm
      ],
      confidence: 0.9,
      extractPackages: (match: string) => {
        const packageMatch = match.match(/composer\s+require\s+([^\n\r;]+)/i);
        if (packageMatch && packageMatch[1]) {
          return packageMatch[1].trim().split(/\s+/).filter(pkg => 
            pkg && !pkg.startsWith('-') && pkg !== 'require' && this.isValidPackageName(pkg, 'composer')
          );
        }
        return [];
      }
    },
    {
      manager: 'gem',
      patterns: [
        /gem\s+install(?:\s+([^\n\r;]+))?/gm,
        /bundle\s+install/gm,
        /bundle\s+exec/gm
      ],
      confidence: 0.9,
      extractPackages: (match: string) => {
        const packageMatch = match.match(/gem\s+install\s+([^\n\r;]+)/i);
        if (packageMatch && packageMatch[1]) {
          return packageMatch[1].trim().split(/\s+/).filter(pkg => 
            pkg && !pkg.startsWith('-') && pkg !== 'install' && this.isValidPackageName(pkg, 'gem')
          );
        }
        return [];
      }
    }
  ];

  // Package mention patterns for extracting specific packages
  private readonly packageMentionPatterns: PackageMentionPattern[] = [
    {
      manager: 'npm',
      patterns: [
        /"([^"]+)":\s*"([^"]+)"/g, // JSON-style dependencies
        /npm\s+install\s+([^\s\n\r;]+)(?:@([^\s\n\r;]+))?/gi,
        /require\(['"]([^'"]+)['"]\)/g
      ],
      confidence: 0.7
    },
    {
      manager: 'pip',
      patterns: [
        /pip\s+install\s+([^\s\n\r;=]+)(?:==([^\s\n\r;]+))?/gi,
        /import\s+([^\s\n\r;.]+)/g,
        /from\s+([^\s\n\r;.]+)\s+import/g
      ],
      confidence: 0.6
    },
    {
      manager: 'cargo',
      patterns: [
        /\[dependencies\][\s\S]*?([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*"([^"]+)"/g,
        /cargo\s+add\s+([^\s\n\r;]+)(?:@([^\s\n\r;]+))?/gi
      ],
      confidence: 0.7
    },
    {
      manager: 'go',
      patterns: [
        /go\s+get\s+([^\s\n\r;]+)(?:@([^\s\n\r;]+))?/gi,
        /import\s+"([^"]+)"/g,
        /require\s+([^\s\n\r;]+)\s+([^\s\n\r;]+)/g
      ],
      confidence: 0.7
    }
  ];

  /**
   * Analyze markdown content to extract dependency information
   */
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    try {
      const packageFiles: PackageFile[] = [];
      const installCommands: Command[] = [];
      const packages: Package[] = [];

      // 1. Detect package files
      this.detectPackageFiles(rawContent, packageFiles);

      // 2. Extract installation commands from code blocks
      this.extractInstallCommands(ast, rawContent, installCommands, packages);

      // 3. Extract package mentions
      this.extractPackageMentions(rawContent, packages);

      // 4. Create dependency info object
      const dependencyInfo: DependencyInfo = {
        packageFiles,
        installCommands,
        packages: this.deduplicatePackages(packages)
      };

      // 5. Calculate confidence
      const confidence = this.calculateConfidence(dependencyInfo);

      return this.createResult(
        dependencyInfo,
        confidence,
        this.extractSources(dependencyInfo)
      );

    } catch (error) {
      const parseError = this.createError(
        'DEPENDENCY_EXTRACTION_ERROR',
        `Failed to extract dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : error }
      );

      return this.createResult({
        packageFiles: [],
        installCommands: [],
        packages: []
      }, 0, [], [parseError]);
    }
  }

  /**
   * Detect package files mentioned in the README
   */
  private detectPackageFiles(content: string, packageFiles: PackageFile[]): void {
    for (const pattern of this.packageFilePatterns) {
      let mentioned = false;
      
      for (const regex of pattern.patterns) {
        if (regex.test(content)) {
          mentioned = true;
          break;
        }
      }

      if (mentioned) {
        packageFiles.push({
          name: pattern.name,
          type: pattern.type,
          mentioned: true,
          confidence: pattern.confidence
        });
      }
    }
  }

  /**
   * Extract installation commands from code blocks
   */
  private extractInstallCommands(
    ast: MarkdownAST, 
    content: string, 
    installCommands: Command[], 
    packages: Package[]
  ): void {
    // Extract from code blocks
    const codeBlocks = ast.filter(token => token.type === 'code');
    
    for (const block of codeBlocks) {
      const codeToken = block as any;
      const codeContent = codeToken.text || '';
      
      this.processCodeBlockForCommands(codeContent, installCommands, packages);
    }

    // Also check inline code and general content
    this.processContentForCommands(content, installCommands, packages);
  }

  /**
   * Process code block content for installation commands
   */
  private processCodeBlockForCommands(
    codeContent: string, 
    installCommands: Command[], 
    packages: Package[]
  ): void {
    // Split content into lines to process each command separately
    const lines = codeContent.split('\n').map(line => line.trim()).filter(line => line);
    
    for (const line of lines) {
      for (const pattern of this.installCommandPatterns) {
        for (const regex of pattern.patterns) {
          // Reset regex lastIndex for each line
          const lineRegex = new RegExp(regex.source, regex.flags);
          const match = lineRegex.exec(line);
          
          if (match) {
            const command = match[0].trim();
            
            installCommands.push({
              command,
              confidence: pattern.confidence,
              context: 'code-block'
            });

            // Extract packages if pattern supports it
            if (pattern.extractPackages) {
              const extractedPackages = pattern.extractPackages(command);
              for (const packageName of extractedPackages) {
                packages.push({
                  name: packageName,
                  manager: pattern.manager,
                  confidence: pattern.confidence * 0.8 // Slightly lower confidence for extracted packages
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Process general content for installation commands
   */
  private processContentForCommands(
    content: string, 
    installCommands: Command[], 
    packages: Package[]
  ): void {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    for (const line of lines) {
      for (const pattern of this.installCommandPatterns) {
        for (const regex of pattern.patterns) {
          const lineRegex = new RegExp(regex.source, regex.flags);
          const match = lineRegex.exec(line);
          
          if (match) {
            const command = match[0].trim();
            
            // Avoid duplicates from code blocks
            const exists = installCommands.some(cmd => cmd.command === command);
            if (!exists) {
              installCommands.push({
                command,
                confidence: pattern.confidence * 0.7, // Lower confidence for non-code-block commands
                context: 'text-mention'
              });

              // Extract packages if pattern supports it
              if (pattern.extractPackages) {
                const extractedPackages = pattern.extractPackages(command);
                for (const packageName of extractedPackages) {
                  packages.push({
                    name: packageName,
                    manager: pattern.manager,
                    confidence: pattern.confidence * 0.6
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Extract package mentions from content
   */
  private extractPackageMentions(content: string, packages: Package[]): void {
    for (const pattern of this.packageMentionPatterns) {
      for (const regex of pattern.patterns) {
        const matches = content.matchAll(new RegExp(regex.source, regex.flags));
        
        for (const match of matches) {
          if (match[1]) {
            const packageName = match[1].trim();
            const version = match[2]?.trim();
            
            // Skip common false positives
            if (this.isValidPackageName(packageName, pattern.manager)) {
              const packageInfo: Package = {
                name: packageName,
                manager: pattern.manager,
                confidence: pattern.confidence
              };
              
              // Only add version if it's defined
              if (version) {
                packageInfo.version = version;
              }
              
              packages.push(packageInfo);
            }
          }
        }
      }
    }
  }

  /**
   * Validate package names to avoid false positives
   */
  private isValidPackageName(name: string, manager: PackageManagerType): boolean {
    // Skip common false positives
    const commonFalsePositives = [
      'install', 'build', 'test', 'run', 'start', 'dev', 'prod',
      'main', 'index', 'app', 'src', 'lib', 'dist', 'node_modules',
      'package', 'json', 'lock', 'config', 'setup', 'requirements'
    ];

    if (commonFalsePositives.includes(name.toLowerCase())) {
      return false;
    }

    // Basic validation based on package manager
    switch (manager) {
      case 'npm':
      case 'yarn':
        return /^[@a-zA-Z0-9][@a-zA-Z0-9._-]*$/.test(name) && name.length > 1;
      case 'pip':
        return /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(name) && name.length > 1;
      case 'cargo':
        return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name) && name.length > 1;
      case 'go':
        return name.includes('/') || /^[a-zA-Z][a-zA-Z0-9._-]*$/.test(name);
      default:
        return name.length > 1 && !/^\d+$/.test(name);
    }
  }

  /**
   * Remove duplicate packages
   */
  private deduplicatePackages(packages: Package[]): Package[] {
    const packageMap = new Map<string, Package>();

    for (const pkg of packages) {
      const key = `${pkg.manager}:${pkg.name}`;
      const existing = packageMap.get(key);

      if (!existing || pkg.confidence > existing.confidence) {
        packageMap.set(key, pkg);
      } else if (existing && !existing.version && pkg.version) {
        // Keep version information if available
        packageMap.set(key, { ...existing, version: pkg.version });
      }
    }

    return Array.from(packageMap.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate overall confidence for dependency extraction
   */
  private calculateConfidence(dependencyInfo: DependencyInfo): number {
    const { packageFiles, installCommands, packages } = dependencyInfo;
    
    if (packageFiles.length === 0 && installCommands.length === 0 && packages.length === 0) {
      return 0;
    }

    let totalWeight = 0;
    let weightedSum = 0;

    // Weight package files highly
    if (packageFiles.length > 0) {
      const avgConfidence = packageFiles.reduce((sum, file) => sum + file.confidence, 0) / packageFiles.length;
      weightedSum += avgConfidence * 0.4;
      totalWeight += 0.4;
    }

    // Weight install commands
    if (installCommands.length > 0) {
      const avgConfidence = installCommands.reduce((sum, cmd) => sum + cmd.confidence, 0) / installCommands.length;
      weightedSum += avgConfidence * 0.4;
      totalWeight += 0.4;
    }

    // Weight packages
    if (packages.length > 0) {
      const avgConfidence = packages.reduce((sum, pkg) => sum + pkg.confidence, 0) / packages.length;
      weightedSum += avgConfidence * 0.2;
      totalWeight += 0.2;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Extract sources from dependency information
   */
  private extractSources(dependencyInfo: DependencyInfo): string[] {
    const sources = new Set<string>();

    if (dependencyInfo.packageFiles.length > 0) {
      sources.add('package-files');
    }

    if (dependencyInfo.installCommands.length > 0) {
      sources.add('install-commands');
    }

    if (dependencyInfo.packages.length > 0) {
      sources.add('package-mentions');
    }

    return Array.from(sources);
  }
}