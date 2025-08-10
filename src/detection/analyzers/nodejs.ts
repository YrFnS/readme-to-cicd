import { BaseLanguageAnalyzer } from './base';
import { LanguageDetectionResult, ProjectInfo } from '../interfaces/language-analyzer';
import { FrameworkInfo, BuildToolInfo, FrameworkType } from '../interfaces/framework-info';
import { CIStep } from '../interfaces/ci-pipeline';
import { Evidence } from '../interfaces/evidence';
import { FileSystemScanner } from '../utils/file-scanner';
import { EvidenceCollectorImpl } from '../utils/evidence-collector';

/**
 * Node.js framework analyzer
 */
export class NodeJSAnalyzer extends BaseLanguageAnalyzer {
  readonly name = 'NodeJS Analyzer';
  readonly ecosystem = 'nodejs';

  private fileScanner = new FileSystemScanner();
  private evidenceCollector = new EvidenceCollectorImpl();

  canAnalyze(projectInfo: ProjectInfo): boolean {
    // Check for Node.js indicators
    return projectInfo.languages.includes('JavaScript') ||
           projectInfo.languages.includes('TypeScript') ||
           this.hasConfigFile(projectInfo, 'package.json') ||
           this.hasDependency(projectInfo, 'node') ||
           this.hasCommand(projectInfo, 'npm') ||
           this.hasCommand(projectInfo, 'yarn') ||
           this.hasCommand(projectInfo, 'pnpm');
  }

  async analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult> {
    const startTime = Date.now();
    const frameworks: FrameworkInfo[] = [];
    const buildTools: BuildToolInfo[] = [];
    const warnings: string[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    try {
      // Parse package.json if available
      let packageJson: any = null;
      let packageJsonParsingFailed = false;
      if (projectPath && await this.fileScanner.fileExists(projectPath, 'package.json')) {
        try {
          packageJson = await this.fileScanner.readConfigFile(`${projectPath}/package.json`);
          filesAnalyzed.push('package.json');
        } catch (error) {
          packageJsonParsingFailed = true;
          warnings.push(`Failed to parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Detect package manager
      const packageManager = await this.detectPackageManager(projectInfo, projectPath);
      if (packageManager) {
        buildTools.push(packageManager);
      }

      // Detect frameworks (skip if package.json parsing failed, but allow if no package.json exists)
      if (!packageJsonParsingFailed) {
        const detectedFrameworks = await this.detectFrameworks(projectInfo, packageJson, projectPath);
        frameworks.push(...detectedFrameworks);
        
        // Track patterns matched
        detectedFrameworks.forEach(framework => {
          patternsMatched.push(`${framework.name}_detection`);
        });
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(frameworks, packageJson);

      return {
        frameworks,
        buildTools,
        confidence: this.calculateConfidence(frameworks, buildTools),
        recommendations,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed,
          patternsMatched,
          warnings
        }
      };
    } catch (error) {
      warnings.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        frameworks,
        buildTools,
        confidence: 0.1,
        recommendations: ['Unable to complete Node.js analysis due to errors'],
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed,
          patternsMatched,
          warnings
        }
      };
    }
  }

  /**
   * Detect package manager used in the project
   */
  private async detectPackageManager(projectInfo: ProjectInfo, projectPath?: string): Promise<BuildToolInfo | null> {
    const evidence: Evidence[] = [];
    
    // Check for lock files and commands
    if (this.hasConfigFile(projectInfo, 'yarn.lock') || this.hasCommand(projectInfo, 'yarn')) {
      evidence.push({
        type: 'config_file',
        source: 'yarn.lock',
        value: 'yarn',
        weight: 0.8
      });
    }
    
    if (this.hasConfigFile(projectInfo, 'pnpm-lock.yaml') || this.hasCommand(projectInfo, 'pnpm')) {
      evidence.push({
        type: 'config_file',
        source: 'pnpm-lock.yaml',
        value: 'pnpm',
        weight: 0.8
      });
    }
    
    if (this.hasConfigFile(projectInfo, 'package-lock.json') || this.hasCommand(projectInfo, 'npm')) {
      evidence.push({
        type: 'config_file',
        source: 'package-lock.json',
        value: 'npm',
        weight: 0.7
      });
    }

    // Check file system if path provided
    if (projectPath) {
      const lockFiles = await this.fileScanner.findConfigFiles(projectPath, [
        'yarn.lock', 'pnpm-lock.yaml', 'package-lock.json'
      ]);
      
      lockFiles.forEach(file => {
        const manager = file.includes('yarn') ? 'yarn' : 
                      file.includes('pnpm') ? 'pnpm' : 'npm';
        evidence.push({
          type: 'config_file',
          source: file,
          value: manager,
          weight: 0.9
        });
      });
    }

    if (evidence.length === 0) {
      return null;
    }

    // Determine primary package manager
    const managerCounts = evidence.reduce((acc, e) => {
      acc[e.value] = (acc[e.value] || 0) + e.weight;
      return acc;
    }, {} as Record<string, number>);

    const entries = Object.entries(managerCounts);
    if (entries.length === 0) {
      return null;
    }
    const sortedEntries = entries.sort(([,a], [,b]) => b - a);
    const primaryManagerEntry = sortedEntries[0];
    if (!primaryManagerEntry) {
      return null;
    }
    const primaryManager = primaryManagerEntry[0];
    const primaryManagerScore = managerCounts[primaryManager];
    if (primaryManagerScore === undefined) {
      return null;
    }

    return {
      name: primaryManager,
      configFile: primaryManager === 'yarn' ? 'yarn.lock' : 
                 primaryManager === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json',
      commands: this.getPackageManagerCommands(primaryManager),
      confidence: Math.min(primaryManagerScore / evidence.length, 1.0)
    };
  }

  /**
   * Get commands for package manager
   */
  private getPackageManagerCommands(manager: string) {
    const commands = {
      npm: [
        { name: 'install', command: 'npm install', description: 'Install dependencies', isPrimary: true },
        { name: 'build', command: 'npm run build', description: 'Build project', isPrimary: true },
        { name: 'test', command: 'npm test', description: 'Run tests', isPrimary: true },
        { name: 'start', command: 'npm start', description: 'Start application', isPrimary: false }
      ],
      yarn: [
        { name: 'install', command: 'yarn install', description: 'Install dependencies', isPrimary: true },
        { name: 'build', command: 'yarn build', description: 'Build project', isPrimary: true },
        { name: 'test', command: 'yarn test', description: 'Run tests', isPrimary: true },
        { name: 'start', command: 'yarn start', description: 'Start application', isPrimary: false }
      ],
      pnpm: [
        { name: 'install', command: 'pnpm install', description: 'Install dependencies', isPrimary: true },
        { name: 'build', command: 'pnpm build', description: 'Build project', isPrimary: true },
        { name: 'test', command: 'pnpm test', description: 'Run tests', isPrimary: true },
        { name: 'start', command: 'pnpm start', description: 'Start application', isPrimary: false }
      ]
    };

    return commands[manager as keyof typeof commands] || commands.npm;
  }

  /**
   * Detect Node.js frameworks
   */
  private async detectFrameworks(
    projectInfo: ProjectInfo, 
    packageJson: any, 
    projectPath?: string
  ): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // React detection
    const reactFramework = await this.detectReact(projectInfo, packageJson, projectPath);
    if (reactFramework) frameworks.push(reactFramework);

    // Vue.js detection
    const vueFramework = await this.detectVue(projectInfo, packageJson, projectPath);
    if (vueFramework) frameworks.push(vueFramework);

    // Angular detection
    const angularFramework = await this.detectAngular(projectInfo, packageJson, projectPath);
    if (angularFramework) frameworks.push(angularFramework);

    // Next.js detection
    const nextFramework = await this.detectNextJS(projectInfo, packageJson, projectPath);
    if (nextFramework) frameworks.push(nextFramework);

    // Express detection
    const expressFramework = await this.detectExpress(projectInfo, packageJson, projectPath);
    if (expressFramework) frameworks.push(expressFramework);

    // NestJS detection
    const nestFramework = await this.detectNestJS(projectInfo, packageJson, projectPath);
    if (nestFramework) frameworks.push(nestFramework);

    return frameworks;
  }

  /**
   * Detect React framework
   */
  private async detectReact(
    projectInfo: ProjectInfo, 
    packageJson: any, 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.react) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `react@${deps.react}`,
          weight: 0.9
        });
      }
      if (deps['react-dom']) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `react-dom@${deps['react-dom']}`,
          weight: 0.8
        });
      }

      // Check scripts
      if (packageJson.scripts) {
        if (packageJson.scripts.start && packageJson.scripts.start.includes('react-scripts')) {
          evidence.push({
            type: 'script_command',
            source: 'package.json',
            value: packageJson.scripts.start,
            weight: 0.7
          });
        }
        if (packageJson.scripts.build && packageJson.scripts.build.includes('react-scripts')) {
          evidence.push({
            type: 'script_command',
            source: 'package.json',
            value: packageJson.scripts.build,
            weight: 0.7
          });
        }
      }
    }

    // Check project info (only if we don't have package.json evidence)
    if (!packageJson && this.hasDependency(projectInfo, 'react')) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'react',
        weight: 0.4 // Lower weight for project info
      });
    }

    // Check text mentions (both as supporting evidence and standalone)
    if (projectInfo.rawContent.toLowerCase().includes('react')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'react',
        weight: evidence.length > 0 ? 0.2 : 0.6 // Higher weight when standalone
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    // Lower threshold for text-only detection
    const threshold = packageJson ? 0.5 : 0.3;
    if (confidence < threshold) return null;

    return this.createFrameworkInfo(
      'React',
      'frontend_framework' as FrameworkType,
      confidence,
      evidence,
      packageJson?.dependencies?.react || packageJson?.devDependencies?.react
    );
  }

  /**
   * Detect Vue.js framework
   */
  private async detectVue(
    projectInfo: ProjectInfo, 
    packageJson: any, 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.vue) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `vue@${deps.vue}`,
          weight: 0.9
        });
      }
      if (deps['@vue/cli-service']) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `@vue/cli-service@${deps['@vue/cli-service']}`,
          weight: 0.8
        });
      }
    }

    // Check config files
    if (projectPath && await this.fileScanner.fileExists(projectPath, 'vue.config.js')) {
      evidence.push({
        type: 'config_file',
        source: 'vue.config.js',
        value: 'vue.config.js',
        weight: 0.8
      });
    }

    // Check project info (only if we don't have package.json evidence)
    if (!packageJson && this.hasDependency(projectInfo, 'vue')) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'vue',
        weight: 0.4
      });
    }

    // Check text mentions (both as supporting evidence and standalone)
    if (projectInfo.rawContent.toLowerCase().includes('vue')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'vue',
        weight: evidence.length > 0 ? 0.2 : 0.6 // Higher weight when standalone
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    // Lower threshold for text-only detection
    const threshold = packageJson ? 0.5 : 0.3;
    if (confidence < threshold) return null;

    return this.createFrameworkInfo(
      'Vue.js',
      'frontend_framework' as FrameworkType,
      confidence,
      evidence,
      packageJson?.dependencies?.vue || packageJson?.devDependencies?.vue
    );
  }

  /**
   * Detect Angular framework
   */
  private async detectAngular(
    projectInfo: ProjectInfo, 
    packageJson: any, 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps['@angular/core']) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `@angular/core@${deps['@angular/core']}`,
          weight: 0.9
        });
      }
      if (deps['@angular/cli']) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `@angular/cli@${deps['@angular/cli']}`,
          weight: 0.8
        });
      }

      // Check scripts for ng commands
      if (packageJson.scripts) {
        Object.entries(packageJson.scripts).forEach(([name, script]) => {
          if (typeof script === 'string' && script.includes('ng ')) {
            evidence.push({
              type: 'script_command',
              source: 'package.json',
              value: `${name}: ${script}`,
              weight: 0.7
            });
          }
        });
      }
    }

    // Check config files
    if (projectPath && await this.fileScanner.fileExists(projectPath, 'angular.json')) {
      evidence.push({
        type: 'config_file',
        source: 'angular.json',
        value: 'angular.json',
        weight: 0.9
      });
    }

    // Check project info (only if we don't have package.json evidence)
    if (!packageJson && (this.hasDependency(projectInfo, '@angular/core') || this.hasDependency(projectInfo, 'angular'))) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'angular',
        weight: 0.4
      });
    }

    // Check commands
    if (this.hasCommand(projectInfo, 'ng ')) {
      evidence.push({
        type: 'command_pattern',
        source: 'project_commands',
        value: 'ng',
        weight: 0.7
      });
    }

    // Check text mentions (both as supporting evidence and standalone)
    if (projectInfo.rawContent.toLowerCase().includes('angular')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'angular',
        weight: evidence.length > 0 ? 0.2 : 0.6 // Higher weight when standalone
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    // Lower threshold for text-only detection
    const threshold = packageJson ? 0.3 : 0.2;
    if (confidence < threshold) return null;

    return this.createFrameworkInfo(
      'Angular',
      'frontend_framework' as FrameworkType,
      confidence,
      evidence,
      packageJson?.dependencies?.['@angular/core'] || packageJson?.devDependencies?.['@angular/core']
    );
  }

  /**
   * Detect Next.js framework
   */
  private async detectNextJS(
    projectInfo: ProjectInfo, 
    packageJson: any, 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.next) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `next@${deps.next}`,
          weight: 0.9
        });
      }

      // Check scripts
      if (packageJson.scripts) {
        if (packageJson.scripts.dev && packageJson.scripts.dev.includes('next')) {
          evidence.push({
            type: 'script_command',
            source: 'package.json',
            value: packageJson.scripts.dev,
            weight: 0.8
          });
        }
        if (packageJson.scripts.build && packageJson.scripts.build.includes('next')) {
          evidence.push({
            type: 'script_command',
            source: 'package.json',
            value: packageJson.scripts.build,
            weight: 0.8
          });
        }
        if (packageJson.scripts.start && packageJson.scripts.start.includes('next')) {
          evidence.push({
            type: 'script_command',
            source: 'package.json',
            value: packageJson.scripts.start,
            weight: 0.7
          });
        }
      }
    }

    // Check config files
    if (projectPath) {
      const configFiles = await this.fileScanner.findConfigFiles(projectPath, [
        'next.config.js', 'next.config.ts', 'next.config.mjs'
      ]);
      configFiles.forEach(file => {
        evidence.push({
          type: 'config_file',
          source: file,
          value: file,
          weight: 0.8
        });
      });
    }

    // Check project info (only if we don't have package.json evidence)
    if (!packageJson && this.hasDependency(projectInfo, 'next')) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'next',
        weight: 0.4
      });
    }

    // Check text mentions (both as supporting evidence and standalone)
    if (projectInfo.rawContent.toLowerCase().includes('next.js') || 
        projectInfo.rawContent.toLowerCase().includes('nextjs')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'next.js',
        weight: evidence.length > 0 ? 0.2 : 0.6 // Higher weight when standalone
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    // Lower threshold for text-only detection
    const threshold = packageJson ? 0.5 : 0.3;
    if (confidence < threshold) return null;

    return this.createFrameworkInfo(
      'Next.js',
      'fullstack_framework' as FrameworkType,
      confidence,
      evidence,
      packageJson?.dependencies?.next || packageJson?.devDependencies?.next
    );
  }

  /**
   * Detect Express framework
   */
  private async detectExpress(
    projectInfo: ProjectInfo, 
    packageJson: any, 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.express) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `express@${deps.express}`,
          weight: 0.9
        });
      }
    }

    // Check project info (only if we don't have package.json evidence)
    if (!packageJson && this.hasDependency(projectInfo, 'express')) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'express',
        weight: 0.4
      });
    }

    // Check text mentions (both as supporting evidence and standalone)
    if (projectInfo.rawContent.toLowerCase().includes('express')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'express',
        weight: evidence.length > 0 ? 0.2 : 0.6 // Higher weight when standalone
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    // Lower threshold for text-only detection
    const threshold = packageJson ? 0.5 : 0.3;
    if (confidence < threshold) return null;

    return this.createFrameworkInfo(
      'Express',
      'backend_framework' as FrameworkType,
      confidence,
      evidence,
      packageJson?.dependencies?.express || packageJson?.devDependencies?.express
    );
  }

  /**
   * Detect NestJS framework
   */
  private async detectNestJS(
    projectInfo: ProjectInfo, 
    packageJson: any, 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps['@nestjs/core']) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `@nestjs/core@${deps['@nestjs/core']}`,
          weight: 0.9
        });
      }
      if (deps['@nestjs/common']) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `@nestjs/common@${deps['@nestjs/common']}`,
          weight: 0.8
        });
      }
      if (deps['@nestjs/cli']) {
        evidence.push({
          type: 'dependency',
          source: 'package.json',
          value: `@nestjs/cli@${deps['@nestjs/cli']}`,
          weight: 0.7
        });
      }
    }

    // Check project info (only if we don't have package.json evidence)
    if (!packageJson && (this.hasDependency(projectInfo, '@nestjs/core') || this.hasDependency(projectInfo, 'nestjs'))) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'nestjs',
        weight: 0.4
      });
    }

    // Check text mentions (both as supporting evidence and standalone)
    if (projectInfo.rawContent.toLowerCase().includes('nestjs') || 
        projectInfo.rawContent.toLowerCase().includes('nest.js')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'nestjs',
        weight: evidence.length > 0 ? 0.2 : 0.6 // Higher weight when standalone
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    // Lower threshold for text-only detection
    const threshold = packageJson ? 0.5 : 0.3;
    if (confidence < threshold) return null;

    return this.createFrameworkInfo(
      'NestJS',
      'backend_framework' as FrameworkType,
      confidence,
      evidence,
      packageJson?.dependencies?.['@nestjs/core'] || packageJson?.devDependencies?.['@nestjs/core']
    );
  }

  /**
   * Calculate framework confidence based on evidence
   */
  private calculateFrameworkConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    // Calculate weighted confidence - don't just average, but sum the weights
    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    
    // Normalize to 0-1 range, but be more conservative
    // Strong evidence (config files, dependencies) should have higher impact
    return Math.min(totalWeight / 2.0, 1.0); // Divide by 2 to be more conservative
  }

  /**
   * Calculate overall confidence for the analysis
   */
  private calculateConfidence(frameworks: FrameworkInfo[], buildTools: BuildToolInfo[]): number {
    if (frameworks.length === 0 && buildTools.length === 0) return 0.1;

    // Prioritize framework confidence over build tool confidence
    if (frameworks.length > 0) {
      const frameworkConfidence = frameworks.reduce((sum, f) => sum + f.confidence, 0) / frameworks.length;
      
      // If we have build tools too, slightly boost confidence but not too much
      if (buildTools.length > 0) {
        const buildToolConfidence = buildTools.reduce((sum, b) => sum + b.confidence, 0) / buildTools.length;
        return Math.min((frameworkConfidence * 0.8) + (buildToolConfidence * 0.2), 1.0);
      }
      
      return frameworkConfidence;
    }
    
    // If only build tools, be more conservative
    if (buildTools.length > 0) {
      const buildToolConfidence = buildTools.reduce((sum, b) => sum + b.confidence, 0) / buildTools.length;
      return Math.min(buildToolConfidence * 0.6, 0.7); // Cap at 0.7 for build tools only
    }
    
    return 0.1;
  }

  /**
   * Generate recommendations based on detected frameworks
   */
  private generateRecommendations(frameworks: FrameworkInfo[], packageJson: any): string[] {
    const recommendations: string[] = [];

    // Check for missing package.json first
    if (!packageJson) {
      recommendations.push('Add a package.json file to better define your Node.js project structure and dependencies.');
    }

    if (frameworks.length === 0) {
      if (packageJson) {
        recommendations.push('No specific Node.js frameworks detected. Consider adding framework dependencies to package.json.');
      }
      return recommendations;
    }

    // Framework-specific recommendations
    const frameworkNames = frameworks.map(f => f.name.toLowerCase());
    
    if (frameworkNames.includes('react') && !frameworkNames.includes('next.js')) {
      recommendations.push('Consider using Next.js for server-side rendering and better performance with React.');
    }

    if (frameworkNames.includes('express') && frameworks.length === 1) {
      recommendations.push('Consider adding a frontend framework like React or Vue.js for a full-stack application.');
    }

    // Build tool recommendations
    if (packageJson && !packageJson.scripts?.build) {
      recommendations.push('Add a build script to package.json for consistent build processes.');
    }

    if (packageJson && !packageJson.scripts?.test) {
      recommendations.push('Add test scripts to package.json to enable automated testing.');
    }

    return recommendations;
  }

  generateCISteps(/* frameworks: FrameworkInfo[] */): CIStep[] {
    // This method is now implemented via the CIStepGenerator class
    // which provides comprehensive CI step generation with templates
    return [];
  }
}