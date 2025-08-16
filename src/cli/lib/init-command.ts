/**
 * InitCommand Implementation
 * 
 * Handles project initialization and setup with configuration file generation,
 * project structure analysis, and guided setup with interactive prompts.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIOptions, CLIResult, CLIConfig, TemplateConfig, DefaultSettings, OrganizationPolicies } from './types';
import { Logger } from './logger';
import { ErrorHandler } from './error-handler';

export interface InitCommandOptions {
  template: 'basic' | 'enterprise' | 'team';
  interactive: boolean;
  outputPath?: string;
  overwrite?: boolean;
}

export interface ProjectAnalysis {
  hasPackageJson: boolean;
  hasGitRepo: boolean;
  hasExistingWorkflows: boolean;
  detectedLanguages: string[];
  detectedFrameworks: string[];
  projectType: 'library' | 'application' | 'monorepo' | 'unknown';
  recommendations: string[];
}

export interface TemplateDefinition {
  name: string;
  description: string;
  config: Partial<CLIConfig>;
  requiredFiles?: string[];
  optionalFiles?: string[];
  setupInstructions?: string[];
}

/**
 * InitCommand class for project setup and configuration
 */
export class InitCommand {
  private readonly configFileName = '.readme-to-cicd.json';
  private readonly templatesDir = path.join(__dirname, '../../../templates');

  constructor(
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandler
  ) {}

  /**
   * Execute the init command with provided options
   */
  async execute(options: InitCommandOptions): Promise<CLIResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting project initialization', { options });

      // Analyze current project structure
      const projectAnalysis = await this.analyzeProjectStructure();
      this.logger.debug('Project analysis completed', { projectAnalysis });

      // Check for existing configuration
      const configPath = options.outputPath || this.configFileName;
      const hasExistingConfig = await this.checkExistingConfiguration(configPath);

      if (hasExistingConfig && !options.overwrite) {
        if (options.interactive) {
          const shouldOverwrite = await this.promptForOverwrite(configPath);
          if (!shouldOverwrite) {
            return this.createSuccessResult([], ['Initialization cancelled by user'], startTime);
          }
        } else {
          return this.createErrorResult(
            `Configuration file already exists at ${configPath}. Use --overwrite to replace it.`,
            startTime
          );
        }
      }

      // Get template definition
      const template = this.getTemplateDefinition(options.template);
      this.logger.debug('Using template', { template: template.name });

      // Generate configuration based on template and project analysis
      let config = this.generateConfiguration(template, projectAnalysis);

      // Run interactive setup if requested
      if (options.interactive) {
        config = await this.runInteractiveSetup(config, projectAnalysis);
      }

      // Create configuration file
      await this.createConfigurationFile(configPath, config);

      // Install template files if specified
      const installedFiles = await this.installTemplateFiles(template, path.dirname(configPath));

      // Generate setup recommendations
      const recommendations = this.generateSetupRecommendations(projectAnalysis, template);

      const generatedFiles = [configPath, ...installedFiles];
      const executionTime = Date.now() - startTime;

      this.logger.info('Project initialization completed successfully', {
        configPath,
        template: template.name,
        filesGenerated: generatedFiles.length,
        executionTime
      });

      // Display setup instructions
      this.displaySetupInstructions(template, recommendations, generatedFiles);

      return this.createSuccessResult(generatedFiles, recommendations, startTime);

    } catch (error) {
      this.logger.error('Project initialization failed', { error });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }

  /**
   * Analyze current project structure and provide recommendations
   */
  private async analyzeProjectStructure(): Promise<ProjectAnalysis> {
    const cwd = process.cwd();
    const analysis: ProjectAnalysis = {
      hasPackageJson: false,
      hasGitRepo: false,
      hasExistingWorkflows: false,
      detectedLanguages: [],
      detectedFrameworks: [],
      projectType: 'unknown',
      recommendations: []
    };

    try {
      // Check for package.json
      try {
        await fs.access(path.join(cwd, 'package.json'));
        analysis.hasPackageJson = true;
        analysis.detectedLanguages.push('javascript');
        
        // Read package.json to detect frameworks
        const packageJson = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf-8'));
        analysis.detectedFrameworks.push(...this.detectFrameworksFromPackageJson(packageJson));
        
        // Also detect languages from package.json dependencies
        const languagesFromDeps = this.detectLanguagesFromPackageJson(packageJson);
        analysis.detectedLanguages.push(...languagesFromDeps);
        
        // Determine project type
        if (packageJson.main || packageJson.bin) {
          analysis.projectType = packageJson.workspaces ? 'monorepo' : 'application';
        } else {
          analysis.projectType = 'library';
        }
      } catch {
        // No package.json found
      }

      // Check for Git repository
      try {
        await fs.access(path.join(cwd, '.git'));
        analysis.hasGitRepo = true;
      } catch {
        analysis.recommendations.push('Initialize Git repository with: git init');
      }

      // Check for existing workflows
      try {
        const workflowsDir = path.join(cwd, '.github', 'workflows');
        const workflowFiles = await fs.readdir(workflowsDir);
        analysis.hasExistingWorkflows = workflowFiles.length > 0;
        
        if (analysis.hasExistingWorkflows) {
          analysis.recommendations.push('Existing workflows detected - consider backing them up before generation');
        }
      } catch {
        // No workflows directory
      }

      // Detect other languages
      const languageFiles = await this.detectLanguageFiles(cwd);
      analysis.detectedLanguages.push(...languageFiles);

      // Generate recommendations based on analysis
      analysis.recommendations.push(...this.generateAnalysisRecommendations(analysis));

    } catch (error) {
      this.logger.warn('Project analysis partially failed', { error });
    }

    return analysis;
  }

  /**
   * Detect languages from package.json dependencies
   */
  private detectLanguagesFromPackageJson(packageJson: any): string[] {
    const languages: string[] = [];
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };

    // Language detection patterns
    if (allDeps['typescript'] || allDeps['@types/node']) {
      languages.push('typescript');
    }

    return languages;
  }

  /**
   * Detect frameworks from package.json dependencies
   */
  private detectFrameworksFromPackageJson(packageJson: any): string[] {
    const frameworks: string[] = [];
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };

    // Common framework detection patterns
    const frameworkPatterns = {
      'react': ['react', '@types/react'],
      'vue': ['vue', '@vue/cli'],
      'angular': ['@angular/core', '@angular/cli'],
      'express': ['express'],
      'fastify': ['fastify'],
      'next': ['next'],
      'nuxt': ['nuxt'],
      'svelte': ['svelte'],
      'nest': ['@nestjs/core'],
      'typescript': ['typescript', '@types/node']
    };

    for (const [framework, patterns] of Object.entries(frameworkPatterns)) {
      if (patterns.some(pattern => allDeps[pattern])) {
        frameworks.push(framework);
      }
    }

    return frameworks;
  }

  /**
   * Detect programming languages from file extensions
   */
  private async detectLanguageFiles(directory: string): Promise<string[]> {
    const languages = new Set<string>();
    
    try {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        switch (ext) {
          case '.ts':
          case '.tsx':
            languages.add('typescript');
            break;
          case '.py':
            languages.add('python');
            break;
          case '.go':
            languages.add('go');
            break;
          case '.rs':
            languages.add('rust');
            break;
          case '.java':
            languages.add('java');
            break;
          case '.cs':
            languages.add('csharp');
            break;
          case '.php':
            languages.add('php');
            break;
          case '.rb':
            languages.add('ruby');
            break;
        }
      }
    } catch (error) {
      this.logger.debug('Error reading directory for language detection', { error });
    }

    return Array.from(languages);
  }

  /**
   * Generate analysis-based recommendations
   */
  private generateAnalysisRecommendations(analysis: ProjectAnalysis): string[] {
    const recommendations: string[] = [];

    if (!analysis.hasPackageJson && analysis.detectedLanguages.includes('javascript')) {
      recommendations.push('Initialize npm project with: npm init');
    }

    if (analysis.detectedFrameworks.length === 0) {
      recommendations.push('No frameworks detected - consider adding framework detection to README');
    }

    if (analysis.projectType === 'monorepo') {
      recommendations.push('Monorepo detected - consider using workspace-aware CI/CD workflows');
    }

    if (analysis.detectedLanguages.length > 1) {
      recommendations.push('Multiple languages detected - ensure all are documented in README');
    }

    return recommendations;
  }

  /**
   * Check if configuration file already exists
   */
  private async checkExistingConfiguration(configPath: string): Promise<boolean> {
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get template definition by name
   */
  private getTemplateDefinition(templateName: string): TemplateDefinition {
    const templates: Record<string, TemplateDefinition> = {
      basic: {
        name: 'Basic',
        description: 'Simple configuration for individual projects',
        config: {
          defaults: {
            outputDirectory: '.github/workflows',
            workflowTypes: ['ci', 'cd'],
            includeComments: true,
            optimizationLevel: 'standard'
          },
          templates: {},
          organization: {},
          output: {
            format: 'yaml',
            indentation: 2,
            includeMetadata: true,
            backupExisting: true
          },
          git: {
            autoCommit: false,
            commitMessage: 'feat: add automated CI/CD workflows',
            createPR: false
          },
          ui: {
            colorOutput: true,
            progressIndicators: true,
            verboseLogging: false,
            interactivePrompts: true
          }
        },
        setupInstructions: [
          'Run "readme-to-cicd generate" to create your first workflow',
          'Customize the configuration file as needed',
          'Add framework information to your README.md file'
        ]
      },
      team: {
        name: 'Team',
        description: 'Configuration optimized for team collaboration',
        config: {
          defaults: {
            outputDirectory: '.github/workflows',
            workflowTypes: ['ci', 'cd', 'release'],
            includeComments: true,
            optimizationLevel: 'standard'
          },
          templates: {
            customTemplates: './ci-templates'
          },
          organization: {
            requiredSecurityScans: true,
            mandatorySteps: ['security-scan', 'dependency-check'],
            allowedActions: ['actions/*']
          },
          output: {
            format: 'yaml',
            indentation: 2,
            includeMetadata: true,
            backupExisting: true
          },
          git: {
            autoCommit: false,
            commitMessage: 'feat: add automated CI/CD workflows',
            createPR: false
          },
          ui: {
            colorOutput: true,
            progressIndicators: true,
            verboseLogging: true,
            interactivePrompts: true
          }
        },
        requiredFiles: ['ci-templates/'],
        setupInstructions: [
          'Create custom templates in ./ci-templates directory',
          'Configure team-specific security requirements',
          'Set up branch protection rules in GitHub',
          'Run "readme-to-cicd generate --interactive" for guided setup'
        ]
      },
      enterprise: {
        name: 'Enterprise',
        description: 'Enterprise-grade configuration with security and compliance',
        config: {
          defaults: {
            outputDirectory: '.github/workflows',
            workflowTypes: ['ci', 'cd', 'security', 'release'],
            includeComments: true,
            optimizationLevel: 'aggressive'
          },
          templates: {
            organizationTemplates: '@company/cicd-templates'
          },
          organization: {
            requiredSecurityScans: true,
            mandatorySteps: ['security-scan', 'dependency-check', 'compliance-check', 'vulnerability-scan'],
            allowedActions: ['actions/*', '@company/*'],
            enforceBranchProtection: true,
            requireCodeReview: true
          },
          output: {
            format: 'yaml',
            indentation: 2,
            includeMetadata: true,
            backupExisting: true
          },
          git: {
            autoCommit: false,
            commitMessage: 'feat: add automated CI/CD workflows',
            createPR: true,
            branchName: 'feature/add-cicd-workflows'
          },
          ui: {
            colorOutput: true,
            progressIndicators: true,
            verboseLogging: true,
            interactivePrompts: false
          }
        },
        requiredFiles: ['security-policies/', 'compliance-templates/'],
        setupInstructions: [
          'Install organization templates: npm install @company/cicd-templates',
          'Configure enterprise security policies',
          'Set up SAML/SSO integration for GitHub Actions',
          'Configure required status checks in branch protection',
          'Run "readme-to-cicd generate --config .readme-to-cicd.json"'
        ]
      }
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Unknown template: ${templateName}. Available templates: ${Object.keys(templates).join(', ')}`);
    }

    return template;
  }

  /**
   * Generate configuration based on template and project analysis
   */
  private generateConfiguration(template: TemplateDefinition, analysis: ProjectAnalysis): CLIConfig {
    const config = JSON.parse(JSON.stringify(template.config)) as CLIConfig;

    // Customize based on project analysis
    if (analysis.detectedLanguages.includes('typescript')) {
      if (!config.defaults.workflowTypes.includes('security')) {
        config.defaults.workflowTypes = [...config.defaults.workflowTypes, 'security'];
      }
    }

    if (analysis.projectType === 'library') {
      // Libraries typically don't need CD workflows
      config.defaults.workflowTypes = config.defaults.workflowTypes.filter(type => type !== 'cd');
    }

    if (analysis.hasExistingWorkflows) {
      config.output.backupExisting = true;
    }

    return config;
  }  /*
*
   * Run interactive setup to customize configuration
   */
  private async runInteractiveSetup(config: CLIConfig, analysis: ProjectAnalysis): Promise<CLIConfig> {
    this.logger.info('Starting interactive setup');

    // This is a placeholder for interactive prompts
    // In a real implementation, this would use inquirer.js to prompt the user
    // For now, we'll just log what would be prompted and return the config unchanged
    
    this.logger.info('Interactive setup would prompt for:', {
      workflowTypes: 'Which workflow types to generate?',
      outputDirectory: 'Where to output workflow files?',
      securityScans: 'Enable security scanning?',
      gitIntegration: 'Configure Git integration?',
      customTemplates: 'Use custom templates?'
    });

    // TODO: Implement actual interactive prompts using inquirer
    // const inquirer = require('inquirer');
    // const answers = await inquirer.prompt([...]);
    
    return config;
  }

  /**
   * Create configuration file with proper formatting
   */
  private async createConfigurationFile(configPath: string, config: CLIConfig): Promise<void> {
    try {
      const configJson = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, configJson, 'utf-8');
      this.logger.info('Configuration file created', { configPath });
    } catch (error) {
      throw new Error(`Failed to create configuration file: ${error}`);
    }
  }

  /**
   * Install template files if specified in template definition
   */
  private async installTemplateFiles(template: TemplateDefinition, targetDir: string): Promise<string[]> {
    const installedFiles: string[] = [];

    if (!template.requiredFiles && !template.optionalFiles) {
      return installedFiles;
    }

    try {
      // Create required directories/files
      if (template.requiredFiles) {
        for (const filePath of template.requiredFiles) {
          const targetPath = path.join(targetDir, filePath);
          
          if (filePath.endsWith('/')) {
            // It's a directory
            await fs.mkdir(targetPath, { recursive: true });
            
            // Create a README in the directory
            const readmePath = path.join(targetPath, 'README.md');
            const readmeContent = this.generateDirectoryReadme(filePath, template);
            await fs.writeFile(readmePath, readmeContent, 'utf-8');
            installedFiles.push(readmePath);
          } else {
            // It's a file - create from template if exists
            const templatePath = path.join(this.templatesDir, template.name.toLowerCase(), filePath);
            try {
              const templateContent = await fs.readFile(templatePath, 'utf-8');
              await fs.mkdir(path.dirname(targetPath), { recursive: true });
              await fs.writeFile(targetPath, templateContent, 'utf-8');
              installedFiles.push(targetPath);
            } catch {
              // Template file doesn't exist, create placeholder
              const placeholderContent = this.generatePlaceholderFile(filePath, template);
              await fs.mkdir(path.dirname(targetPath), { recursive: true });
              await fs.writeFile(targetPath, placeholderContent, 'utf-8');
              installedFiles.push(targetPath);
            }
          }
        }
      }

      this.logger.info('Template files installed', { 
        template: template.name,
        filesInstalled: installedFiles.length 
      });

    } catch (error) {
      this.logger.warn('Failed to install some template files', { error });
    }

    return installedFiles;
  }

  /**
   * Generate README content for created directories
   */
  private generateDirectoryReadme(dirPath: string, template: TemplateDefinition): string {
    const dirName = path.basename(dirPath.replace('/', ''));
    
    return `# ${dirName}

This directory was created as part of the ${template.name} template setup.

## Purpose

${this.getDirectoryPurpose(dirName)}

## Usage

${this.getDirectoryUsage(dirName)}

## Next Steps

- Add your custom files to this directory
- Update this README with specific instructions for your team
- Configure any necessary permissions or access controls

---
Generated by readme-to-cicd init command
`;
  }

  /**
   * Get directory purpose description
   */
  private getDirectoryPurpose(dirName: string): string {
    const purposes: Record<string, string> = {
      'ci-templates': 'Store custom CI/CD workflow templates for your team',
      'security-policies': 'Define security policies and compliance requirements',
      'compliance-templates': 'Store compliance and audit-related workflow templates'
    };

    return purposes[dirName] || `Store ${dirName} related files and configurations`;
  }

  /**
   * Get directory usage instructions
   */
  private getDirectoryUsage(dirName: string): string {
    const usages: Record<string, string> = {
      'ci-templates': 'Place .yml or .yaml template files here. They will be used as base templates for workflow generation.',
      'security-policies': 'Define security scanning configurations, vulnerability thresholds, and compliance rules.',
      'compliance-templates': 'Store templates for compliance workflows like SOX, GDPR, or industry-specific requirements.'
    };

    return usages[dirName] || `Add files related to ${dirName} functionality here.`;
  }

  /**
   * Generate placeholder file content
   */
  private generatePlaceholderFile(filePath: string, template: TemplateDefinition): string {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);

    if (ext === '.md') {
      return `# ${fileName.replace('.md', '')}

This file was created as part of the ${template.name} template setup.

Please update this file with your specific content.

---
Generated by readme-to-cicd init command
`;
    }

    if (ext === '.json') {
      return JSON.stringify({
        "_comment": `This file was created as part of the ${template.name} template setup`,
        "_instructions": "Please update this file with your specific configuration"
      }, null, 2);
    }

    return `# ${fileName}
# This file was created as part of the ${template.name} template setup
# Please update this file with your specific content
`;
  }

  /**
   * Generate setup recommendations based on analysis and template
   */
  private generateSetupRecommendations(analysis: ProjectAnalysis, template: TemplateDefinition): string[] {
    const recommendations: string[] = [...analysis.recommendations];

    // Add template-specific recommendations
    if (template.setupInstructions) {
      recommendations.push(...template.setupInstructions);
    }

    // Add analysis-based recommendations
    if (analysis.detectedFrameworks.length > 0) {
      recommendations.push(`Detected frameworks: ${analysis.detectedFrameworks.join(', ')} - ensure they are documented in README.md`);
    }

    if (!analysis.hasGitRepo) {
      recommendations.push('Initialize Git repository before generating workflows');
    }

    return recommendations;
  }

  /**
   * Display setup instructions to the user
   */
  private displaySetupInstructions(template: TemplateDefinition, recommendations: string[], generatedFiles: string[]): void {
    console.log('\n🎉 Project initialization completed successfully!\n');
    
    console.log(`📋 Template: ${template.name}`);
    console.log(`📝 Description: ${template.description}\n`);
    
    console.log('📁 Generated files:');
    generatedFiles.forEach(file => {
      console.log(`  ✓ ${file}`);
    });
    
    if (recommendations.length > 0) {
      console.log('\n💡 Next steps and recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n🚀 You can now run "readme-to-cicd generate" to create your workflows!');
  }

  /**
   * Prompt user for overwrite confirmation (placeholder)
   */
  private async promptForOverwrite(configPath: string): Promise<boolean> {
    // This is a placeholder for interactive prompt
    // In a real implementation, this would use inquirer.js
    this.logger.warn(`Configuration file already exists at ${configPath}`);
    
    // For now, return false to prevent overwrite
    // TODO: Implement actual prompt using inquirer
    return false;
  }

  /**
   * Create success result
   */
  private createSuccessResult(generatedFiles: string[], warnings: string[], startTime: number): CLIResult {
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      generatedFiles,
      errors: [],
      warnings,
      summary: {
        totalTime: executionTime,
        filesGenerated: generatedFiles.length,
        workflowsCreated: 0,
        frameworksDetected: [],
        optimizationsApplied: 0,
        executionTime,
        filesProcessed: 1,
        workflowsGenerated: 0
      }
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string, startTime: number): CLIResult {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      generatedFiles: [],
      errors: [{
        code: 'INIT_ERROR',
        message,
        category: 'configuration',
        severity: 'error',
        suggestions: [
          'Check file permissions',
          'Ensure target directory is writable',
          'Use --overwrite flag to replace existing files'
        ]
      }],
      warnings: [],
      summary: {
        totalTime: executionTime,
        filesGenerated: 0,
        workflowsCreated: 0,
        frameworksDetected: [],
        optimizationsApplied: 0,
        executionTime,
        filesProcessed: 0,
        workflowsGenerated: 0
      }
    };
  }
}