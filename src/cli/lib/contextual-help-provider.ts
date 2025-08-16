/**
 * Contextual Help Provider
 * 
 * Provides contextual help and tips based on current project state,
 * detected frameworks, and project structure analysis.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { FrameworkInfo } from './types';

export interface ProjectContext {
  hasReadme: boolean;
  hasPackageJson: boolean;
  hasGitRepo: boolean;
  hasExistingWorkflows: boolean;
  hasConfigFile: boolean;
  projectType: 'nodejs' | 'python' | 'java' | 'go' | 'rust' | 'php' | 'ruby' | 'unknown';
  frameworks: FrameworkInfo[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface ContextualTip {
  category: 'optimization' | 'best-practice' | 'framework-specific' | 'workflow' | 'configuration';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: string;
  learnMoreUrl?: string;
}

export class ContextualHelpProvider {
  /**
   * Get contextual tips based on project path and detected frameworks
   */
  async getContextualTips(
    projectPath: string,
    detectedFrameworks?: FrameworkInfo[]
  ): Promise<string[]> {
    try {
      const context = await this.analyzeProjectContext(projectPath, detectedFrameworks);
      const tips = this.generateContextualTips(context);
      
      return tips
        .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority))
        .slice(0, 5) // Limit to top 5 tips
        .map(tip => this.formatTip(tip));
    } catch (error) {
      // Return generic tips if analysis fails
      return this.getGenericTips();
    }
  }

  /**
   * Analyze project context to understand current state
   */
  private async analyzeProjectContext(
    projectPath: string,
    detectedFrameworks?: FrameworkInfo[]
  ): Promise<ProjectContext> {
    const context: ProjectContext = {
      hasReadme: false,
      hasPackageJson: false,
      hasGitRepo: false,
      hasExistingWorkflows: false,
      hasConfigFile: false,
      projectType: 'unknown',
      frameworks: detectedFrameworks || [],
      complexity: 'simple'
    };

    try {
      // Check for README file
      const readmePaths = ['README.md', 'readme.md', 'README.txt', 'README'];
      for (const readmePath of readmePaths) {
        try {
          await fs.access(join(projectPath, readmePath));
          context.hasReadme = true;
          break;
        } catch {
          // File doesn't exist, continue
        }
      }

      // Check for package.json (Node.js)
      try {
        await fs.access(join(projectPath, 'package.json'));
        context.hasPackageJson = true;
        context.projectType = 'nodejs';
      } catch {
        // Not a Node.js project
      }

      // Check for other project types
      if (context.projectType === 'unknown') {
        context.projectType = await this.detectProjectType(projectPath);
      }

      // Check for Git repository
      try {
        await fs.access(join(projectPath, '.git'));
        context.hasGitRepo = true;
      } catch {
        // Not a Git repository
      }

      // Check for existing workflows
      try {
        const workflowsPath = join(projectPath, '.github', 'workflows');
        const workflowFiles = await fs.readdir(workflowsPath);
        context.hasExistingWorkflows = workflowFiles.some(file => 
          file.endsWith('.yml') || file.endsWith('.yaml')
        );
      } catch {
        // No workflows directory
      }

      // Check for configuration file
      const configPaths = [
        '.readme-to-cicd.json',
        '.readme-to-cicd.yaml',
        '.readme-to-cicd.yml',
        'readme-to-cicd.config.js'
      ];
      for (const configPath of configPaths) {
        try {
          await fs.access(join(projectPath, configPath));
          context.hasConfigFile = true;
          break;
        } catch {
          // Config file doesn't exist
        }
      }

      // Determine project complexity
      context.complexity = this.assessProjectComplexity(context);

    } catch (error) {
      // Return basic context if analysis fails
    }

    return context;
  }

  /**
   * Detect project type based on files present
   */
  private async detectProjectType(projectPath: string): Promise<ProjectContext['projectType']> {
    const typeIndicators: Array<{ files: string[]; type: ProjectContext['projectType'] }> = [
      { files: ['package.json', 'yarn.lock', 'pnpm-lock.yaml'], type: 'nodejs' },
      { files: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'], type: 'python' },
      { files: ['pom.xml', 'build.gradle', 'build.gradle.kts'], type: 'java' },
      { files: ['go.mod', 'go.sum'], type: 'go' },
      { files: ['Cargo.toml', 'Cargo.lock'], type: 'rust' },
      { files: ['composer.json', 'composer.lock'], type: 'php' },
      { files: ['Gemfile', 'Gemfile.lock'], type: 'ruby' }
    ];

    for (const { files, type } of typeIndicators) {
      for (const file of files) {
        try {
          await fs.access(join(projectPath, file));
          return type;
        } catch {
          // File doesn't exist, continue
        }
      }
    }

    return 'unknown';
  }

  /**
   * Assess project complexity based on context
   */
  private assessProjectComplexity(context: ProjectContext): ProjectContext['complexity'] {
    let complexityScore = 0;

    // Base complexity factors
    if (context.frameworks.length > 2) complexityScore += 2;
    if (context.hasExistingWorkflows) complexityScore += 1;
    if (context.frameworks.some(f => f.name.includes('microservice'))) complexityScore += 3;
    if (context.frameworks.some(f => f.name.includes('docker'))) complexityScore += 1;
    if (context.frameworks.some(f => f.name.includes('kubernetes'))) complexityScore += 2;

    // Project type complexity
    if (['java', 'rust'].includes(context.projectType)) complexityScore += 1;

    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }

  /**
   * Generate contextual tips based on project context
   */
  private generateContextualTips(context: ProjectContext): ContextualTip[] {
    const tips: ContextualTip[] = [];

    // README-related tips
    if (!context.hasReadme) {
      tips.push({
        category: 'best-practice',
        priority: 'high',
        message: 'No README file found. Create a README.md with project description and setup instructions for better workflow generation.',
        action: 'Create README.md file',
        learnMoreUrl: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes'
      });
    }

    // Git repository tips
    if (!context.hasGitRepo) {
      tips.push({
        category: 'workflow',
        priority: 'medium',
        message: 'Project is not in a Git repository. Initialize Git to enable version control and GitHub Actions.',
        action: 'Run: git init'
      });
    }

    // Configuration tips
    if (!context.hasConfigFile && context.complexity !== 'simple') {
      tips.push({
        category: 'configuration',
        priority: 'medium',
        message: 'Consider creating a configuration file for consistent workflow generation across your team.',
        action: 'Run: readme-to-cicd init'
      });
    }

    // Existing workflows tips
    if (context.hasExistingWorkflows) {
      tips.push({
        category: 'workflow',
        priority: 'medium',
        message: 'Existing workflows detected. Use validate command to check for improvements before generating new ones.',
        action: 'Run: readme-to-cicd validate'
      });
    }

    // Framework-specific tips
    tips.push(...this.getFrameworkSpecificTips(context.frameworks));

    // Project type specific tips
    tips.push(...this.getProjectTypeSpecificTips(context.projectType));

    // Complexity-based tips
    tips.push(...this.getComplexityBasedTips(context.complexity));

    return tips;
  }

  /**
   * Get framework-specific tips
   */
  private getFrameworkSpecificTips(frameworks: FrameworkInfo[]): ContextualTip[] {
    const tips: ContextualTip[] = [];

    for (const framework of frameworks) {
      switch (framework.name.toLowerCase()) {
        case 'react':
        case 'vue':
        case 'angular':
          tips.push({
            category: 'framework-specific',
            priority: 'medium',
            message: `${framework.name} detected. Consider adding build caching and artifact storage for faster CI/CD.`,
            action: 'Use --workflow-type ci cd for complete pipeline'
          });
          break;

        case 'nodejs':
        case 'node':
          tips.push({
            category: 'framework-specific',
            priority: 'medium',
            message: 'Node.js project detected. Ensure package-lock.json is committed for reproducible builds.',
            action: 'Commit package-lock.json to repository'
          });
          break;

        case 'docker':
          tips.push({
            category: 'framework-specific',
            priority: 'high',
            message: 'Docker detected. Container workflows will be generated with security scanning and multi-stage builds.',
            action: 'Ensure Dockerfile follows best practices'
          });
          break;

        case 'typescript':
          tips.push({
            category: 'framework-specific',
            priority: 'low',
            message: 'TypeScript detected. Type checking will be included in CI workflows.',
            action: 'Ensure tsconfig.json is properly configured'
          });
          break;

        case 'jest':
        case 'mocha':
        case 'vitest':
          tips.push({
            category: 'framework-specific',
            priority: 'medium',
            message: `${framework.name} testing framework detected. Test coverage reporting will be included.`,
            action: 'Configure test coverage thresholds'
          });
          break;
      }
    }

    return tips;
  }

  /**
   * Get project type specific tips
   */
  private getProjectTypeSpecificTips(projectType: ProjectContext['projectType']): ContextualTip[] {
    const tips: ContextualTip[] = [];

    switch (projectType) {
      case 'nodejs':
        tips.push({
          category: 'optimization',
          priority: 'medium',
          message: 'Node.js project: Use npm ci instead of npm install in CI for faster, reliable builds.',
          learnMoreUrl: 'https://docs.npmjs.com/cli/v8/commands/npm-ci'
        });
        break;

      case 'python':
        tips.push({
          category: 'optimization',
          priority: 'medium',
          message: 'Python project: Consider using pip caching and virtual environments in workflows.',
          learnMoreUrl: 'https://docs.github.com/en/actions/guides/building-and-testing-python'
        });
        break;

      case 'java':
        tips.push({
          category: 'optimization',
          priority: 'medium',
          message: 'Java project: Gradle/Maven dependency caching will significantly speed up builds.',
          learnMoreUrl: 'https://docs.github.com/en/actions/guides/building-and-testing-java-with-maven'
        });
        break;

      case 'go':
        tips.push({
          category: 'optimization',
          priority: 'low',
          message: 'Go project: Module caching and cross-compilation support will be included.',
          learnMoreUrl: 'https://docs.github.com/en/actions/guides/building-and-testing-go'
        });
        break;
    }

    return tips;
  }

  /**
   * Get complexity-based tips
   */
  private getComplexityBasedTips(complexity: ProjectContext['complexity']): ContextualTip[] {
    const tips: ContextualTip[] = [];

    switch (complexity) {
      case 'simple':
        tips.push({
          category: 'workflow',
          priority: 'low',
          message: 'Simple project detected. Basic CI workflow will be sufficient for your needs.',
          action: 'Use default settings for quick setup'
        });
        break;

      case 'moderate':
        tips.push({
          category: 'workflow',
          priority: 'medium',
          message: 'Moderate complexity project. Consider using interactive mode to customize workflow generation.',
          action: 'Run: readme-to-cicd generate --interactive'
        });
        break;

      case 'complex':
        tips.push({
          category: 'configuration',
          priority: 'high',
          message: 'Complex project detected. Create a configuration file to manage advanced settings and team policies.',
          action: 'Run: readme-to-cicd init --template enterprise'
        });
        break;
    }

    return tips;
  }

  /**
   * Get generic tips when context analysis fails
   */
  private getGenericTips(): string[] {
    return [
      'Use --dry-run to preview generated workflows before creating files',
      'Run with --verbose for detailed information about the generation process',
      'Use --interactive mode to customize framework detection and workflow options',
      'Create a configuration file with "readme-to-cicd init" for consistent settings',
      'Validate existing workflows with "readme-to-cicd validate" before generating new ones'
    ];
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: ContextualTip['priority']): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 4;
    }
  }

  /**
   * Format tip for display
   */
  private formatTip(tip: ContextualTip): string {
    let formatted = tip.message;
    
    if (tip.action) {
      formatted += ` (${tip.action})`;
    }
    
    return formatted;
  }
}