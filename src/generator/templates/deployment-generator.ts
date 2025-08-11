/**
 * Deployment Workflow Generator
 * Generates GitHub Actions workflows for deployment to various platforms
 */

import { DetectionResult, WorkflowOutput, GenerationOptions, EnvironmentConfig } from '../interfaces';
import { WorkflowTemplate, StepTemplate } from '../types';
import { TemplateManager } from './template-manager';
import * as yaml from 'yaml';

/**
 * Deployment platform types
 */
export type DeploymentPlatform = 'docker' | 'aws' | 'azure' | 'gcp' | 'github-pages' | 'netlify' | 'vercel' | 'static';

/**
 * Deployment configuration
 */
interface DeploymentInfo {
  platforms: DeploymentPlatform[];
  isContainerized: boolean;
  isStaticSite: boolean;
  hasMultiEnvironment: boolean;
  environments: EnvironmentConfig[];
  buildOutputPath?: string;
  dockerfilePath?: string;
  registryUrl?: string;
  cloudProvider?: 'aws' | 'azure' | 'gcp';
  staticSiteConfig?: StaticSiteConfig;
}

/**
 * Static site configuration
 */
interface StaticSiteConfig {
  buildCommand: string;
  outputDirectory: string;
  nodeVersion?: string;
  environmentVariables?: Record<string, string>;
}

/**
 * Container deployment configuration
 */
interface ContainerConfig {
  registry: string;
  imageName: string;
  tag: string;
  dockerfile: string;
  buildContext: string;
  platforms?: string[];
}

/**
 * Cloud deployment configuration
 */
interface CloudConfig {
  provider: 'aws' | 'azure' | 'gcp';
  service: string;
  region: string;
  credentials: string;
  additionalConfig?: Record<string, any>;
}

/**
 * Deployment Workflow Generator class
 */
export class DeploymentGenerator {
  private templateManager: TemplateManager;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
  }

  /**
   * Generate deployment workflow based on detected deployment targets
   */
  async generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput> {
    const deploymentInfo = this.extractDeploymentInfo(detectionResult, options);
    
    if (deploymentInfo.platforms.length === 0) {
      throw new Error('No deployment platforms detected in detection results');
    }

    // Determine the appropriate template based on deployment type
    const templateName = this.selectTemplate(deploymentInfo);
    
    // Prepare template data
    const templateData = this.prepareTemplateData(deploymentInfo, options);
    
    // Compile the template
    const compilationResult = await this.templateManager.compileTemplate(templateName, templateData);
    
    if (compilationResult.errors.length > 0) {
      throw new Error(`Template compilation failed: ${compilationResult.errors.join(', ')}`);
    }

    // Convert to YAML
    const yamlContent = this.templateToYAML(compilationResult.template, templateData);
    
    // Generate filename
    const filename = this.generateFilename(deploymentInfo, options?.workflowType || 'cd');

    return {
      filename,
      content: yamlContent,
      type: options?.workflowType || 'cd',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: `Deployment to ${deploymentInfo.platforms.join(', ')}`,
        optimizations: this.getOptimizations(deploymentInfo),
        warnings: compilationResult.warnings
      }
    };
  }

  /**
   * Extract deployment information from detection results
   */
  private extractDeploymentInfo(detectionResult: DetectionResult, options?: GenerationOptions): DeploymentInfo {
    const platforms: DeploymentPlatform[] = [];
    const environments = options?.environments || [];
    
    // Detect deployment targets from detection results
    const deploymentTargets = detectionResult.deploymentTargets || [];
    
    // Check for containerized deployment
    let isContainerized = deploymentTargets.some(target => target.type === 'container') ||
                         detectionResult.buildTools.some(tool => tool.name.toLowerCase() === 'docker');
    
    // Check for static site deployment
    let isStaticSite = deploymentTargets.some(target => target.type === 'static') ||
                      this.isStaticSiteFramework(detectionResult);
    
    // Determine platforms based on detection results and options
    if (isContainerized) {
      platforms.push('docker');
      
      // Check for cloud platforms
      if (deploymentTargets.some(target => target.platform.toLowerCase().includes('aws'))) {
        platforms.push('aws');
      }
      if (deploymentTargets.some(target => target.platform.toLowerCase().includes('azure'))) {
        platforms.push('azure');
      }
      if (deploymentTargets.some(target => target.platform.toLowerCase().includes('gcp'))) {
        platforms.push('gcp');
      }
    }
    
    if (isStaticSite) {
      // Check for specific static site platforms
      if (deploymentTargets.some(target => target.platform.toLowerCase().includes('github'))) {
        platforms.push('github-pages');
      }
      if (deploymentTargets.some(target => target.platform.toLowerCase().includes('netlify'))) {
        platforms.push('netlify');
      }
      if (deploymentTargets.some(target => target.platform.toLowerCase().includes('vercel'))) {
        platforms.push('vercel');
      }
      
      // Default to static if no specific platform detected
      if (!platforms.some(p => ['github-pages', 'netlify', 'vercel'].includes(p))) {
        platforms.push('static');
      }
    }
    
    // If no platforms detected, infer from frameworks
    if (platforms.length === 0) {
      const inferredPlatforms = this.inferPlatformsFromFrameworks(detectionResult);
      platforms.push(...inferredPlatforms);
      
      // Update deployment type flags based on inferred platforms
      if (inferredPlatforms.includes('docker')) {
        isContainerized = true;
      }
      if (inferredPlatforms.includes('static')) {
        isStaticSite = true;
      }
    }

    const cloudProvider = this.getCloudProvider(deploymentTargets);
    const staticSiteConfig = isStaticSite ? this.getStaticSiteConfig(detectionResult) : undefined;
    
    const result: DeploymentInfo = {
      platforms,
      isContainerized,
      isStaticSite,
      hasMultiEnvironment: environments.length > 1,
      environments,
      buildOutputPath: this.getBuildOutputPath(detectionResult),
      dockerfilePath: this.getDockerfilePath(detectionResult),
      registryUrl: this.getRegistryUrl(detectionResult)
    };
    
    // Only add optional properties if they have values (exactOptionalPropertyTypes compliance)
    if (cloudProvider) {
      result.cloudProvider = cloudProvider;
    }
    if (staticSiteConfig) {
      result.staticSiteConfig = staticSiteConfig;
    }
    
    return result;
  }

  /**
   * Check if the detected frameworks indicate a static site
   */
  private isStaticSiteFramework(detectionResult: DetectionResult): boolean {
    const staticFrameworks = ['react', 'vue', 'angular', 'nextjs', 'gatsby', 'nuxt', 'svelte', 'hugo', 'jekyll'];
    return detectionResult.frameworks.some(fw => 
      staticFrameworks.includes(fw.name.toLowerCase())
    );
  }

  /**
   * Infer deployment platforms from detected frameworks
   */
  private inferPlatformsFromFrameworks(detectionResult: DetectionResult): DeploymentPlatform[] {
    const platforms: DeploymentPlatform[] = [];
    
    // Check for static site frameworks
    if (this.isStaticSiteFramework(detectionResult)) {
      platforms.push('static');
    }
    
    // Check for backend frameworks that typically use containers
    const backendFrameworks = ['express', 'nestjs', 'fastapi', 'django', 'flask', 'spring', 'gin', 'echo'];
    if (detectionResult.frameworks.some(fw => backendFrameworks.includes(fw.name.toLowerCase()))) {
      platforms.push('docker');
    }
    
    return platforms;
  }

  /**
   * Get build output path based on detected frameworks
   */
  private getBuildOutputPath(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks;
    
    for (const framework of frameworks) {
      switch (framework.name.toLowerCase()) {
        case 'react':
          return 'build/';
        case 'vue':
        case 'angular':
          return 'dist/';
        case 'nextjs':
        case 'next':
          return '.next/';
        case 'gatsby':
          return 'public/';
        case 'hugo':
          return 'public/';
        case 'jekyll':
          return '_site/';
      }
    }
    
    return 'dist/';
  }

  /**
   * Get Dockerfile path
   */
  private getDockerfilePath(detectionResult: DetectionResult): string {
    // Check if Dockerfile is mentioned in build tools
    const dockerTool = detectionResult.buildTools.find(tool => 
      tool.name.toLowerCase() === 'docker' && tool.configFile
    );
    
    return dockerTool?.configFile || 'Dockerfile';
  }

  /**
   * Get container registry URL
   */
  private getRegistryUrl(detectionResult: DetectionResult): string {
    // Default to GitHub Container Registry
    return 'ghcr.io';
  }

  /**
   * Get cloud provider from deployment targets
   */
  private getCloudProvider(deploymentTargets: any[]): 'aws' | 'azure' | 'gcp' | undefined {
    for (const target of deploymentTargets) {
      const platform = target.platform.toLowerCase();
      if (platform.includes('aws')) return 'aws';
      if (platform.includes('azure')) return 'azure';
      if (platform.includes('gcp') || platform.includes('google')) return 'gcp';
    }
    return undefined;
  }

  /**
   * Get static site configuration
   */
  private getStaticSiteConfig(detectionResult: DetectionResult): StaticSiteConfig {
    const frameworks = detectionResult.frameworks;
    const packageManagers = detectionResult.packageManagers || [];
    
    // Determine package manager
    const packageManager = packageManagers.find(pm => 
      ['npm', 'yarn', 'pnpm'].includes(pm.name.toLowerCase())
    )?.name.toLowerCase() || 'npm';
    
    // Determine build command and output directory
    let buildCommand = 'npm run build';
    let outputDirectory = 'dist';
    
    if (packageManager === 'yarn') {
      buildCommand = 'yarn build';
    } else if (packageManager === 'pnpm') {
      buildCommand = 'pnpm build';
    }
    
    // Framework-specific configurations
    for (const framework of frameworks) {
      switch (framework.name.toLowerCase()) {
        case 'react':
          outputDirectory = 'build';
          break;
        case 'nextjs':
        case 'next':
          buildCommand = `${packageManager === 'npm' ? 'npm run' : packageManager} build && ${packageManager === 'npm' ? 'npm run' : packageManager} export`;
          outputDirectory = 'out';
          break;
        case 'gatsby':
          buildCommand = `${packageManager === 'npm' ? 'npm run' : packageManager} build`;
          outputDirectory = 'public';
          break;
        case 'hugo':
          buildCommand = 'hugo --minify';
          outputDirectory = 'public';
          break;
        case 'jekyll':
          buildCommand = 'bundle exec jekyll build';
          outputDirectory = '_site';
          break;
      }
    }
    
    // Determine Node.js version
    const nodeLanguage = detectionResult.languages.find(lang => 
      lang.name.toLowerCase() === 'javascript' || lang.name.toLowerCase() === 'typescript'
    );
    
    return {
      buildCommand,
      outputDirectory,
      nodeVersion: nodeLanguage?.version || '20',
      environmentVariables: this.getStaticSiteEnvironmentVariables(frameworks)
    };
  }

  /**
   * Get environment variables for static site deployment
   */
  private getStaticSiteEnvironmentVariables(frameworks: any[]): Record<string, string> {
    const env: Record<string, string> = {};
    
    // Common static site environment variables
    env.NODE_ENV = 'production';
    env.CI = 'true';
    
    // Framework-specific environment variables
    for (const framework of frameworks) {
      switch (framework.name.toLowerCase()) {
        case 'nextjs':
        case 'next':
          env.NEXT_TELEMETRY_DISABLED = '1';
          break;
        case 'gatsby':
          env.GATSBY_TELEMETRY_DISABLED = '1';
          break;
      }
    }
    
    return env;
  }

  /**
   * Select appropriate template based on deployment configuration
   */
  private selectTemplate(deploymentInfo: DeploymentInfo): string {
    // Multi-environment deployment
    if (deploymentInfo.hasMultiEnvironment) {
      return 'multi-environment-deployment';
    }
    
    // Container deployment
    if (deploymentInfo.isContainerized) {
      if (deploymentInfo.cloudProvider) {
        return `${deploymentInfo.cloudProvider}-container-deployment`;
      }
      return 'container-deployment';
    }
    
    // Static site deployment
    if (deploymentInfo.isStaticSite) {
      const staticPlatforms = deploymentInfo.platforms.filter(p => 
        ['github-pages', 'netlify', 'vercel', 'static'].includes(p)
      );
      
      if (staticPlatforms.includes('github-pages')) {
        return 'github-pages-deployment';
      }
      if (staticPlatforms.includes('netlify')) {
        return 'netlify-deployment';
      }
      if (staticPlatforms.includes('vercel')) {
        return 'vercel-deployment';
      }
      
      return 'static-site-deployment';
    }
    
    // Default deployment template
    return 'basic-deployment';
  }

  /**
   * Prepare template data for compilation
   */
  private prepareTemplateData(deploymentInfo: DeploymentInfo, options?: GenerationOptions): any {
    return {
      // Deployment configuration
      platforms: deploymentInfo.platforms,
      isContainerized: deploymentInfo.isContainerized,
      isStaticSite: deploymentInfo.isStaticSite,
      hasMultiEnvironment: deploymentInfo.hasMultiEnvironment,
      
      // Environment configuration
      environments: deploymentInfo.environments,
      productionEnvironment: deploymentInfo.environments.find(env => env.type === 'production'),
      stagingEnvironment: deploymentInfo.environments.find(env => env.type === 'staging'),
      
      // Container configuration
      dockerfilePath: deploymentInfo.dockerfilePath,
      registryUrl: deploymentInfo.registryUrl,
      imageName: this.getImageName(options),
      imageTag: this.getImageTag(),
      
      // Static site configuration
      staticSiteConfig: deploymentInfo.staticSiteConfig,
      buildOutputPath: deploymentInfo.buildOutputPath,
      
      // Cloud configuration
      cloudProvider: deploymentInfo.cloudProvider,
      awsRegion: 'us-east-1', // Default region
      azureLocation: 'East US', // Default location
      gcpRegion: 'us-central1', // Default region
      
      // Options
      includeComments: options?.includeComments ?? true,
      optimizationLevel: options?.optimizationLevel || 'standard',
      securityLevel: options?.securityLevel || 'standard',
      
      // Security and compliance
      requireApproval: deploymentInfo.environments.some(env => env.approvalRequired),
      enableRollback: deploymentInfo.environments.some(env => env.rollbackEnabled),
      
      // Deployment strategies
      deploymentStrategies: this.getDeploymentStrategies(deploymentInfo.environments),
      
      // Monitoring and health checks
      enableHealthChecks: true,
      healthCheckUrl: '/health',
      healthCheckTimeout: 30
    };
  }

  /**
   * Get image name for container deployment
   */
  private getImageName(options?: GenerationOptions): string {
    // Use repository name if available, otherwise use a default
    return '${GITHUB_REPOSITORY}';
  }

  /**
   * Get image tag for container deployment
   */
  private getImageTag(): string {
    return '${GITHUB_SHA}';
  }

  /**
   * Get deployment strategies for environments
   */
  private getDeploymentStrategies(environments: EnvironmentConfig[]): Record<string, string> {
    const strategies: Record<string, string> = {};
    
    for (const env of environments) {
      strategies[env.name] = env.deploymentStrategy || 'rolling';
    }
    
    return strategies;
  }

  /**
   * Get optimizations applied to the deployment workflow
   */
  private getOptimizations(deploymentInfo: DeploymentInfo): string[] {
    const optimizations: string[] = [];
    
    if (deploymentInfo.isContainerized) {
      optimizations.push('Docker layer caching enabled');
      optimizations.push('Multi-platform container builds');
    }
    
    if (deploymentInfo.isStaticSite) {
      optimizations.push('Static asset caching');
      optimizations.push('Build artifact optimization');
    }
    
    if (deploymentInfo.hasMultiEnvironment) {
      optimizations.push('Multi-environment deployment pipeline');
      optimizations.push('Environment-specific configurations');
    }
    
    if (deploymentInfo.environments.some(env => env.approvalRequired)) {
      optimizations.push('Manual approval gates for production');
    }
    
    if (deploymentInfo.environments.some(env => env.rollbackEnabled)) {
      optimizations.push('Automated rollback capabilities');
    }
    
    optimizations.push('Health check validation');
    optimizations.push('Deployment status monitoring');
    
    return optimizations;
  }

  /**
   * Convert template to YAML with proper formatting
   */
  private templateToYAML(template: WorkflowTemplate, templateData: any): string {
    // Convert template to GitHub Actions workflow format
    const workflow: any = {
      name: template.name,
      on: template.triggers,
      permissions: template.permissions || { 
        contents: 'read',
        packages: 'write',
        deployments: 'write'
      },
      jobs: {}
    };

    // Add defaults if present
    if (template.defaults) {
      workflow.defaults = template.defaults;
    }

    // Add concurrency if present
    if (template.concurrency) {
      workflow.concurrency = template.concurrency;
    }

    // Convert jobs
    template.jobs.forEach((job, index) => {
      const jobId = job.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      workflow.jobs[jobId] = {
        name: job.name,
        'runs-on': job.runsOn,
        steps: job.steps.map(step => this.processStep(step, templateData)).filter(step => step !== null)
      };

      // Add optional job properties
      if (job.strategy) {
        workflow.jobs[jobId].strategy = job.strategy;
      }
      if (job.needs) {
        workflow.jobs[jobId].needs = job.needs;
      }
      if (job.if) {
        workflow.jobs[jobId].if = job.if;
      }
      if (job.environment) {
        workflow.jobs[jobId].environment = job.environment;
      }
      if (job.permissions) {
        workflow.jobs[jobId].permissions = job.permissions;
      }
      if (job.timeout) {
        workflow.jobs[jobId]['timeout-minutes'] = job.timeout;
      }
    });

    // Convert to YAML with proper formatting
    return yaml.stringify(workflow, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0,
      doubleQuotedAsJSON: false
    });
  }

  /**
   * Process individual step with template data
   */
  private processStep(step: StepTemplate, templateData: any): any | null {
    // Check if step should be included based on conditions
    if (step.if) {
      const condition = this.processTemplate(step.if, templateData);
      // Simple condition evaluation
      if (condition === 'false' || condition === '' || condition === 'undefined' || condition === 'null') {
        return null;
      }
    }

    const processedStep: any = {
      name: step.name
    };

    // Add uses or run
    if (step.uses) {
      processedStep.uses = step.uses;
    }
    if (step.run) {
      const runCommand = this.processTemplate(step.run, templateData);
      // Skip step if run command is empty after template processing
      if (runCommand.trim() === '' || runCommand.trim() === "''") {
        return null;
      }
      processedStep.run = runCommand;
    }

    // Skip step if it has neither uses nor run
    if (!processedStep.uses && !processedStep.run) {
      return null;
    }

    // Add with parameters
    if (step.with) {
      processedStep.with = {};
      Object.entries(step.with).forEach(([key, value]) => {
        processedStep.with[key] = this.processTemplate(String(value), templateData);
      });
    }

    // Add environment variables
    if (step.env) {
      processedStep.env = {};
      Object.entries(step.env).forEach(([key, value]) => {
        processedStep.env[key] = this.processTemplate(String(value), templateData);
      });
    }

    // Add conditional (after processing)
    if (step.if) {
      const processedCondition = this.processTemplate(step.if, templateData);
      if (processedCondition !== 'false' && processedCondition !== '' && processedCondition !== 'undefined') {
        processedStep.if = processedCondition;
      }
    }

    // Add other properties
    if (step.continueOnError) {
      processedStep['continue-on-error'] = step.continueOnError;
    }
    if (step.timeout) {
      processedStep['timeout-minutes'] = step.timeout;
    }
    if (step.workingDirectory) {
      processedStep['working-directory'] = step.workingDirectory;
    }

    return processedStep;
  }

  /**
   * Process template strings with data substitution
   */
  private processTemplate(template: string, data: any): string {
    let result = template;
    
    // Simple template variable substitution
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (result.includes(placeholder)) {
        // Handle boolean values specially
        if (typeof value === 'boolean') {
          result = result.replace(new RegExp(placeholder, 'g'), value ? 'true' : 'false');
        } else {
          result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
        }
      }
    });

    return result;
  }

  /**
   * Generate appropriate filename for the deployment workflow
   */
  private generateFilename(deploymentInfo: DeploymentInfo, workflowType: string): string {
    const type = workflowType.toLowerCase();
    
    if (deploymentInfo.hasMultiEnvironment) {
      return `${type}-multi-env.yml`;
    }
    
    if (deploymentInfo.isContainerized && deploymentInfo.cloudProvider) {
      return `${type}-${deploymentInfo.cloudProvider}.yml`;
    }
    
    if (deploymentInfo.isContainerized) {
      return `${type}-docker.yml`;
    }
    
    if (deploymentInfo.isStaticSite) {
      const staticPlatform = deploymentInfo.platforms.find(p => 
        ['github-pages', 'netlify', 'vercel'].includes(p)
      );
      
      if (staticPlatform) {
        return `${type}-${staticPlatform}.yml`;
      }
      
      return `${type}-static.yml`;
    }
    
    // If we have specific platforms, use the first one
    if (deploymentInfo.platforms.length > 0) {
      const platform = deploymentInfo.platforms[0];
      if (platform === 'docker') {
        return `${type}-docker.yml`;
      }
      return `${type}-${platform}.yml`;
    }
    
    return `${type}.yml`;
  }
}