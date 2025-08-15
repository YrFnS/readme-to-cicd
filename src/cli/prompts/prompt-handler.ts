/**
 * Interactive Prompt Handler Implementation
 * 
 * Provides user interaction capabilities using inquirer for framework confirmation,
 * conflict resolution, workflow type selection, and deployment configuration.
 * Implements requirements 4.1, 4.2, 4.3, 4.4, 4.5 from the CLI tool specification.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { 
  FrameworkInfo, 
  FrameworkConflict, 
  ConflictResolution, 
  WorkflowTypeInfo, 
  DeploymentConfig, 
  DeploymentOption,
  WorkflowType 
} from '../lib/types';

export class PromptHandler {
  private readonly maxChoices = 10;
  private readonly defaultTimeout = 30000; // 30 seconds

  /**
   * Confirm detected frameworks with multi-select capabilities
   * Implements requirement 4.1: Framework confirmation prompts with multi-select capabilities
   */
  async confirmFrameworks(detected: FrameworkInfo[]): Promise<FrameworkInfo[]> {
    if (detected.length === 0) {
      console.log(chalk.yellow('⚠️  No frameworks detected. Proceeding with generic configuration.'));
      return [];
    }

    console.log(chalk.blue('\n🔍 Framework Detection Results'));
    console.log(chalk.gray('─'.repeat(50)));

    // Display detected frameworks with confidence scores
    detected.forEach((framework, index) => {
      const confidenceColor = this.getConfidenceColor(framework.confidence);
      const confidenceBar = this.createConfidenceBar(framework.confidence);
      
      console.log(
        `${index + 1}. ${chalk.bold(framework.name)} ${framework.version ? `(${framework.version})` : ''}`
      );
      console.log(`   ${chalk.gray(framework.description)}`);
      console.log(`   Confidence: ${confidenceColor(confidenceBar)} ${framework.confidence}%`);
      console.log();
    });

    // Create choices for multi-select
    const choices = detected.map((framework, index) => ({
      name: `${framework.name} ${framework.version ? `(${framework.version})` : ''} - ${framework.confidence}% confidence`,
      value: framework,
      checked: framework.confidence >= 80 // Auto-select high confidence frameworks
    }));

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFrameworks',
        message: 'Select frameworks to include in workflow generation:',
        choices,
        validate: (input: FrameworkInfo[]) => {
          if (input.length === 0) {
            return 'Please select at least one framework or press Ctrl+C to exit.';
          }
          return true;
        },
        pageSize: Math.min(this.maxChoices, detected.length)
      }
    ]);

    const selected = answers.selectedFrameworks as FrameworkInfo[];
    
    // Mark selected frameworks
    selected.forEach(framework => {
      framework.selected = true;
    });

    console.log(chalk.green(`\n✅ Selected ${selected.length} framework(s) for workflow generation.`));
    return selected;
  }

  /**
   * Resolve conflicts in framework detection
   * Implements requirement 4.2: Conflict resolution prompts for framework detection issues
   */
  async resolveConflicts(conflicts: FrameworkConflict[]): Promise<ConflictResolution[]> {
    if (conflicts.length === 0) {
      return [];
    }

    console.log(chalk.yellow('\n⚠️  Framework Detection Conflicts'));
    console.log(chalk.gray('─'.repeat(50)));

    const resolutions: ConflictResolution[] = [];

    for (const [index, conflict] of conflicts.entries()) {
      console.log(chalk.yellow(`\nConflict ${index + 1}: ${conflict.message}`));
      
      // Display conflicting frameworks
      conflict.frameworks.forEach((framework, fIndex) => {
        console.log(`  ${fIndex + 1}. ${framework.name} ${framework.version ? `(${framework.version})` : ''} - ${framework.confidence}% confidence`);
      });

      // Display suggestions
      if (conflict.suggestions.length > 0) {
        console.log(chalk.blue('\nSuggestions:'));
        conflict.suggestions.forEach(suggestion => {
          console.log(`  • ${suggestion}`);
        });
      }

      const resolution = await this.promptForConflictResolution(conflict, index);
      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Select workflow types with descriptions and recommendations
   * Implements requirement 4.3: Workflow type selection with descriptions and recommendations
   */
  async selectWorkflowTypes(): Promise<WorkflowType[]> {
    const workflowTypes: WorkflowTypeInfo[] = [
      {
        type: 'ci',
        name: 'Continuous Integration (CI)',
        description: 'Automated testing, building, and validation on code changes',
        recommended: true,
        estimatedComplexity: 'medium'
      },
      {
        type: 'cd',
        name: 'Continuous Deployment (CD)',
        description: 'Automated deployment to staging/production environments',
        recommended: true,
        dependencies: ['ci'],
        estimatedComplexity: 'high'
      },
      {
        type: 'release',
        name: 'Release Management',
        description: 'Automated versioning, changelog generation, and release publishing',
        recommended: false,
        estimatedComplexity: 'medium'
      },
      {
        type: 'security',
        name: 'Security Scanning',
        description: 'Automated security vulnerability scanning and compliance checks',
        recommended: true,
        estimatedComplexity: 'low'
      },
      {
        type: 'performance',
        name: 'Performance Testing',
        description: 'Automated performance benchmarking and regression testing',
        recommended: false,
        estimatedComplexity: 'high'
      },
      {
        type: 'maintenance',
        name: 'Maintenance Tasks',
        description: 'Automated dependency updates, cleanup, and maintenance',
        recommended: false,
        estimatedComplexity: 'low'
      }
    ];

    console.log(chalk.blue('\n🚀 Workflow Type Selection'));
    console.log(chalk.gray('─'.repeat(50)));

    // Display workflow types with details
    workflowTypes.forEach((workflow, index) => {
      const recommendedBadge = workflow.recommended ? chalk.green('RECOMMENDED') : '';
      const complexityColor = this.getComplexityColor(workflow.estimatedComplexity);
      
      console.log(`${index + 1}. ${chalk.bold(workflow.name)} ${recommendedBadge}`);
      console.log(`   ${chalk.gray(workflow.description)}`);
      console.log(`   Complexity: ${complexityColor(workflow.estimatedComplexity.toUpperCase())}`);
      
      if (workflow.dependencies) {
        console.log(`   Dependencies: ${workflow.dependencies.join(', ')}`);
      }
      console.log();
    });

    const choices = workflowTypes.map(workflow => ({
      name: `${workflow.name} - ${workflow.description}`,
      value: workflow.type,
      checked: workflow.recommended
    }));

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedWorkflows',
        message: 'Select workflow types to generate:',
        choices,
        validate: (input: WorkflowType[]) => {
          if (input.length === 0) {
            return 'Please select at least one workflow type.';
          }
          
          // Check dependencies
          if (input.includes('cd') && !input.includes('ci')) {
            return 'CD workflow requires CI workflow. Please select CI or deselect CD.';
          }
          
          return true;
        },
        pageSize: Math.min(this.maxChoices, workflowTypes.length)
      }
    ]);

    const selected = answers.selectedWorkflows as WorkflowType[];
    
    console.log(chalk.green(`\n✅ Selected ${selected.length} workflow type(s).`));
    return selected;
  }

  /**
   * Configure deployment with platform-specific options
   * Implements requirement 4.4: Deployment configuration prompts with platform-specific options
   */
  async configureDeployment(options: DeploymentOption[]): Promise<DeploymentConfig> {
    if (options.length === 0) {
      console.log(chalk.yellow('⚠️  No deployment options available. Skipping deployment configuration.'));
      return {
        platform: 'none',
        environment: 'none',
        configuration: {},
        secrets: []
      };
    }

    console.log(chalk.blue('\n🚀 Deployment Configuration'));
    console.log(chalk.gray('─'.repeat(50)));

    // Filter supported platforms
    const supportedOptions = options.filter(option => option.supported);
    
    if (supportedOptions.length === 0) {
      console.log(chalk.yellow('⚠️  No supported deployment platforms detected.'));
      return {
        platform: 'manual',
        environment: 'production',
        configuration: {},
        secrets: []
      };
    }

    // Display deployment options
    supportedOptions.forEach((option, index) => {
      console.log(`${index + 1}. ${chalk.bold(option.name)}`);
      console.log(`   Platform: ${option.platform}`);
      console.log(`   ${chalk.gray(option.description)}`);
      
      if (option.requirements.length > 0) {
        console.log(`   Requirements: ${option.requirements.join(', ')}`);
      }
      console.log();
    });

    // Platform selection
    const platformChoices = supportedOptions.map(option => ({
      name: `${option.name} - ${option.description}`,
      value: option
    }));

    const platformAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedPlatform',
        message: 'Select deployment platform:',
        choices: [
          ...platformChoices,
          { name: 'Skip deployment configuration', value: null }
        ],
        pageSize: Math.min(this.maxChoices, platformChoices.length + 1)
      }
    ]);

    const selectedPlatform = platformAnswer.selectedPlatform as DeploymentOption | null;
    
    if (!selectedPlatform) {
      return {
        platform: 'none',
        environment: 'none',
        configuration: {},
        secrets: []
      };
    }

    // Environment selection
    const environmentAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: 'Select deployment environment:',
        choices: [
          { name: 'Production', value: 'production' },
          { name: 'Staging', value: 'staging' },
          { name: 'Development', value: 'development' },
          { name: 'Preview/PR', value: 'preview' }
        ],
        default: 'production'
      }
    ]);

    // Platform-specific configuration
    const platformConfig = await this.configurePlatformSpecific(selectedPlatform);

    const deploymentConfig: DeploymentConfig = {
      platform: selectedPlatform.platform,
      environment: environmentAnswer.environment,
      configuration: platformConfig.configuration,
      secrets: platformConfig.secrets
    };

    console.log(chalk.green(`\n✅ Deployment configured for ${selectedPlatform.name} (${environmentAnswer.environment}).`));
    return deploymentConfig;
  }

  /**
   * Prompt for conflict resolution strategy
   */
  private async promptForConflictResolution(conflict: FrameworkConflict, conflictIndex: number): Promise<ConflictResolution> {
    const resolutionChoices = this.getResolutionChoices(conflict);

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'resolution',
        message: `How would you like to resolve this conflict?`,
        choices: resolutionChoices,
        pageSize: Math.min(this.maxChoices, resolutionChoices.length)
      }
    ]);

    const resolution: ConflictResolution = {
      conflictId: `conflict_${conflictIndex}`,
      resolution: answer.resolution
    };

    // Handle specific resolution types
    if (answer.resolution === 'select-primary') {
      const primaryAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'primaryFramework',
          message: 'Select the primary framework:',
          choices: conflict.frameworks.map(framework => ({
            name: `${framework.name} ${framework.version ? `(${framework.version})` : ''} - ${framework.confidence}% confidence`,
            value: framework
          }))
        }
      ]);
      resolution.primaryFramework = primaryAnswer.primaryFramework;
    } else if (answer.resolution === 'keep-all') {
      resolution.selectedFrameworks = conflict.frameworks;
    }

    return resolution;
  }

  /**
   * Configure platform-specific deployment settings
   */
  private async configurePlatformSpecific(platform: DeploymentOption): Promise<{ configuration: Record<string, any>; secrets: string[] }> {
    const configuration: Record<string, any> = {};
    const secrets: string[] = [];

    switch (platform.platform.toLowerCase()) {
      case 'vercel':
        return this.configureVercel();
      case 'netlify':
        return this.configureNetlify();
      case 'aws':
        return this.configureAWS();
      case 'azure':
        return this.configureAzure();
      case 'gcp':
        return this.configureGCP();
      case 'heroku':
        return this.configureHeroku();
      default:
        return this.configureGeneric(platform);
    }
  }

  /**
   * Configure Vercel deployment
   */
  private async configureVercel(): Promise<{ configuration: Record<string, any>; secrets: string[] }> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Vercel project name:',
        validate: (input: string) => input.length > 0 || 'Project name is required'
      },
      {
        type: 'input',
        name: 'buildCommand',
        message: 'Build command:',
        default: 'npm run build'
      },
      {
        type: 'input',
        name: 'outputDirectory',
        message: 'Output directory:',
        default: 'dist'
      }
    ]);

    return {
      configuration: {
        projectName: answers.projectName,
        buildCommand: answers.buildCommand,
        outputDirectory: answers.outputDirectory
      },
      secrets: ['VERCEL_TOKEN']
    };
  }

  /**
   * Configure Netlify deployment
   */
  private async configureNetlify(): Promise<{ configuration: Record<string, any>; secrets: string[] }> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'siteId',
        message: 'Netlify site ID (optional):',
      },
      {
        type: 'input',
        name: 'buildCommand',
        message: 'Build command:',
        default: 'npm run build'
      },
      {
        type: 'input',
        name: 'publishDir',
        message: 'Publish directory:',
        default: 'dist'
      }
    ]);

    return {
      configuration: {
        siteId: answers.siteId || undefined,
        buildCommand: answers.buildCommand,
        publishDir: answers.publishDir
      },
      secrets: ['NETLIFY_AUTH_TOKEN']
    };
  }

  /**
   * Configure AWS deployment
   */
  private async configureAWS(): Promise<{ configuration: Record<string, any>; secrets: string[] }> {
    const serviceAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'service',
        message: 'Select AWS service:',
        choices: [
          { name: 'S3 + CloudFront (Static Site)', value: 's3-cloudfront' },
          { name: 'Elastic Beanstalk', value: 'elasticbeanstalk' },
          { name: 'ECS (Container)', value: 'ecs' },
          { name: 'Lambda (Serverless)', value: 'lambda' }
        ]
      }
    ]);

    const commonAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'region',
        message: 'AWS region:',
        default: 'us-east-1'
      }
    ]);

    return {
      configuration: {
        service: serviceAnswer.service,
        region: commonAnswers.region
      },
      secrets: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
    };
  }

  /**
   * Configure Azure deployment
   */
  private async configureAzure(): Promise<{ configuration: Record<string, any>; secrets: string[] }> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'subscriptionId',
        message: 'Azure subscription ID:',
        validate: (input: string) => input.length > 0 || 'Subscription ID is required'
      },
      {
        type: 'input',
        name: 'resourceGroup',
        message: 'Resource group name:',
        validate: (input: string) => input.length > 0 || 'Resource group is required'
      }
    ]);

    return {
      configuration: {
        subscriptionId: answers.subscriptionId,
        resourceGroup: answers.resourceGroup
      },
      secrets: ['AZURE_CREDENTIALS']
    };
  }

  /**
   * Configure Google Cloud Platform deployment
   */
  private async configureGCP(): Promise<{ configuration: Record<string, any>; secrets: string[] }> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectId',
        message: 'GCP project ID:',
        validate: (input: string) => input.length > 0 || 'Project ID is required'
      },
      {
        type: 'input',
        name: 'region',
        message: 'GCP region:',
        default: 'us-central1'
      }
    ]);

    return {
      configuration: {
        projectId: answers.projectId,
        region: answers.region
      },
      secrets: ['GCP_SA_KEY']
    };
  }

  /**
   * Configure Heroku deployment
   */
  private async configureHeroku(): Promise<{ configuration: Record<string, any>; secrets: string[] }> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'appName',
        message: 'Heroku app name:',
        validate: (input: string) => input.length > 0 || 'App name is required'
      }
    ]);

    return {
      configuration: {
        appName: answers.appName
      },
      secrets: ['HEROKU_API_KEY']
    };
  }

  /**
   * Configure generic deployment platform
   */
  private async configureGeneric(platform: DeploymentOption): Promise<{ configuration: Record<string, any>; secrets: string[] }> {
    console.log(chalk.blue(`\nConfiguring ${platform.name}...`));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'endpoint',
        message: 'Deployment endpoint/URL:',
      },
      {
        type: 'input',
        name: 'buildCommand',
        message: 'Build command:',
        default: 'npm run build'
      }
    ]);

    return {
      configuration: {
        endpoint: answers.endpoint,
        buildCommand: answers.buildCommand,
        platform: platform.platform
      },
      secrets: [`${platform.platform.toUpperCase()}_TOKEN`]
    };
  }

  /**
   * Get resolution choices based on conflict type
   */
  private getResolutionChoices(conflict: FrameworkConflict): Array<{ name: string; value: string }> {
    const baseChoices = [
      { name: 'Keep all frameworks (may cause conflicts)', value: 'keep-all' },
      { name: 'Select primary framework', value: 'select-primary' },
      { name: 'Skip conflicting frameworks', value: 'skip' }
    ];

    if (conflict.type === 'version-mismatch') {
      baseChoices.unshift({ name: 'Merge compatible versions', value: 'merge' });
    }

    return baseChoices;
  }

  /**
   * Get color for confidence level
   */
  private getConfidenceColor(confidence: number): (text: string) => string {
    if (confidence >= 90) return chalk.green;
    if (confidence >= 70) return chalk.yellow;
    return chalk.red;
  }

  /**
   * Create confidence bar visualization
   */
  private createConfidenceBar(confidence: number): string {
    const barLength = 20;
    const filledLength = Math.round((confidence / 100) * barLength);
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(barLength - filledLength);
    return `[${filled}${empty}]`;
  }

  /**
   * Get color for complexity level
   */
  private getComplexityColor(complexity: string): (text: string) => string {
    switch (complexity.toLowerCase()) {
      case 'low': return chalk.green;
      case 'medium': return chalk.yellow;
      case 'high': return chalk.red;
      default: return chalk.gray;
    }
  }
}