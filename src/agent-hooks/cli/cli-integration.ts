import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { ReadmeParserImpl } from '../../parser';
import { FrameworkDetectorImpl } from '../../detection';
import { YAMLGeneratorImpl, GenerationOptions, WorkflowType } from '../../generator';
import { Logger } from '../../cli/lib/logger';
import { ErrorHandler } from '../../cli/lib/error-handler';
import {
  RepositoryChanges,
  RepositoryInfo,
  WorkflowChange,
  FileChange,
  ConfigChange,
  DependencyChange
} from '../types';
import { CLIIntegrationConfig } from './types';

export class CLIIntegrationService {
  private config: CLIIntegrationConfig;
  private readmeParser?: ReadmeParserImpl;
  private frameworkDetector?: FrameworkDetectorImpl;
  private yamlGenerator?: YAMLGeneratorImpl;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor(config: CLIIntegrationConfig) {
    this.config = {
      enableCaching: true,
      maxConcurrentOperations: 5,
      timeoutMs: 30000,
      ...config
    };

    // Initialize with basic logger and error handler if not provided
    this.logger = config.logger || new Logger('info');
    this.errorHandler = config.errorHandler || new ErrorHandler(this.logger);
  }

  /**
   * Initialize CLI components
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing CLI integration service');

      // Initialize README parser
      this.readmeParser = new ReadmeParserImpl({
        enableCaching: this.config.enableCaching ?? true,
        enablePerformanceMonitoring: true,
        useIntegrationPipeline: true
      });

      // Initialize framework detector
      this.frameworkDetector = new FrameworkDetectorImpl();

      // Initialize YAML generator
      this.yamlGenerator = new YAMLGeneratorImpl({
        cacheEnabled: this.config.enableCaching ?? true,
        advancedPatternsEnabled: true
      });

      this.logger.info('CLI integration service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CLI integration service', { error });
      throw error;
    }
  }

  /**
   * Parse a README file using the CLI parser
   */
  async parseReadme(filePath: string): Promise<any> {
    if (!this.readmeParser) {
      throw new Error('CLI integration service not initialized');
    }

    try {
      this.logger.debug('Parsing README file', { filePath });
      const result = await this.readmeParser.parseFile(filePath);

      if (!result.success) {
        throw new Error(`README parsing failed: ${result.errors?.map(e => e.message).join(', ')}`);
      }

      return result.data;
    } catch (error) {
      this.logger.error('README parsing failed', { filePath, error });
      throw error;
    }
  }

  /**
   * Detect frameworks using the CLI framework detector
   */
  async detectFrameworks(projectInfo: any, workingDirectory: string): Promise<any> {
    if (!this.frameworkDetector) {
      throw new Error('CLI integration service not initialized');
    }

    try {
      this.logger.debug('Detecting frameworks', { workingDirectory });
      const result = await this.frameworkDetector.detectFrameworks(projectInfo, workingDirectory);
      return result;
    } catch (error) {
      this.logger.error('Framework detection failed', { workingDirectory, error });
      throw error;
    }
  }

  /**
   * Generate workflows using the CLI YAML generator
   */
  async generateWorkflows(detectionResult: any, options: Partial<GenerationOptions> = {}): Promise<any[]> {
    if (!this.yamlGenerator) {
      throw new Error('CLI integration service not initialized');
    }

    try {
      this.logger.debug('Generating workflows', { workflowCount: detectionResult.frameworks.length });

      // Create default options for required fields
      const defaultOptions: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        ...options
      };

      const workflows = await this.yamlGenerator.generateRecommendedWorkflows(
        this.convertDetectionResult(detectionResult, { name: 'unknown-project' }),
        defaultOptions
      );

      return workflows;
    } catch (error) {
      this.logger.error('Workflow generation failed', { error });
      throw error;
    }
  }

  /**
   * Analyze repository changes and generate appropriate workflows
   */
  async analyzeChangesAndGenerateWorkflows(
    changes: RepositoryChanges,
    repository: RepositoryInfo
  ): Promise<WorkflowChange[]> {
    try {
      this.logger.info('Analyzing repository changes and generating workflows', {
        repository: repository.fullName,
        changesCount: changes.modifiedFiles.length + changes.addedFiles.length
      });

      // Find README file changes
      const readmeChange = changes.modifiedFiles.find(change =>
        change.path.toLowerCase().includes('readme.md')
      );

      if (!readmeChange) {
        this.logger.debug('No README changes detected');
        return [];
      }

      // Parse README file
      const readmePath = resolve(repository.name, readmeChange.path);
      if (!existsSync(readmePath)) {
        this.logger.warn('README file not found', { path: readmePath });
        return [];
      }

      const parseData = await this.parseReadme(readmePath);

      // Convert parse data to project info
      const projectInfo = this.convertParseDataToProjectInfo(parseData, repository);

      // Detect frameworks
      const detectionResult = await this.detectFrameworks(projectInfo, repository.name);

      // Generate workflows
      const generationOptions: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        agentHooksEnabled: true
      };

      const workflows = await this.generateWorkflows(detectionResult, generationOptions);

      // Convert workflows to WorkflowChange format
      const workflowChanges: WorkflowChange[] = workflows.map(workflow => ({
        type: 'create',
        file: `.github/workflows/${workflow.filename}`,
        content: workflow.content,
        description: `Generated ${workflow.type} workflow based on README analysis`,
        category: this.mapWorkflowTypeToCategory(workflow.type)
      }));

      this.logger.info('Workflow generation completed', {
        repository: repository.fullName,
        workflowsGenerated: workflowChanges.length
      });

      return workflowChanges;

    } catch (error) {
      this.logger.error('Analysis and workflow generation failed', {
        repository: repository.fullName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute CLI commands with proper error handling
   */
  async executeCLICommand(
    command: string,
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
      maxBuffer?: number;
    } = {}
  ): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
    return new Promise((resolve, reject) => {
      try {
        this.logger.debug('Executing CLI command', { command, args, cwd: options.cwd });

        const child = spawn(command, args, {
          cwd: options.cwd || process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: options.timeout || this.config.timeoutMs
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          const success = code === 0;
          const result: any = {
            success,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          };
          if (!success) {
            result.error = `Command failed with exit code ${code}`;
          }
          resolve(result);
        });

        child.on('error', (error) => {
          this.logger.error('CLI command execution failed', { command, args, error });
          resolve({
            success: false,
            stdout,
            stderr,
            error: `Command execution failed: ${error.message}`
          });
        });

      } catch (error) {
        this.logger.error('CLI command setup failed', { command, args, error });
        reject(error);
      }
    });
  }

  /**
   * Run the full readme-to-cicd workflow for a repository
   */
  async runReadmeToCICDWorkflow(
    repository: RepositoryInfo,
    options: {
      workflowType?: string[];
      outputDir?: string;
      dryRun?: boolean;
    } = {}
  ): Promise<{ success: boolean; workflows: any[]; error?: string }> {
    try {
      const readmePath = resolve(repository.name, 'README.md');

      if (!existsSync(readmePath)) {
        return {
          success: false,
          workflows: [],
          error: `README.md not found in ${repository.name}`
        };
      }

      // Parse README
      const parseData = await this.parseReadme(readmePath);
      const projectInfo = this.convertParseDataToProjectInfo(parseData, repository);

      // Detect frameworks
      const detectionResult = await this.detectFrameworks(projectInfo, repository.name);

      // Generate workflows
      const generationOptions: GenerationOptions = {
        workflowType: (Array.isArray(options.workflowType) ? options.workflowType[0] : options.workflowType) as WorkflowType || 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        agentHooksEnabled: true
      };

      const workflows = await this.generateWorkflows(detectionResult, generationOptions);

      return {
        success: true,
        workflows
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('readme-to-cicd workflow failed', {
        repository: repository.fullName,
        error: errorMessage
      });

      return {
        success: false,
        workflows: [],
        error: errorMessage
      };
    }
  }

  /**
   * Convert parse data to project info format expected by detector
   */
  private convertParseDataToProjectInfo(parseData: any, repository: RepositoryInfo): any {
    // Create a proper dependencies array
    const packages = parseData.dependencies?.packages || [];
    const dependenciesArray = packages.map((pkg: any) => {
      if (typeof pkg === 'string') {
        return pkg;
      }
      return pkg.name || String(pkg);
    });

    return {
      name: parseData.metadata?.name || repository.name,
      languages: parseData.languages || [],
      configFiles: [], // Would need to be populated from file system scan
      dependencies: dependenciesArray,
      buildCommands: [],
      commands: parseData.commands || {},
      testing: parseData.testing || {}
    };
  }

  /**
   * Convert detection result to generator-expected format
   */
  private convertDetectionResult(detectionResult: any, repository: any): any {
    return {
      frameworks: detectionResult.frameworks.map((f: any) => ({
        name: f.name,
        version: f.version,
        confidence: f.confidence,
        evidence: f.evidence?.map((e: any) => e.value || e.source || e.type || 'Evidence found') || [],
        category: this.mapFrameworkTypeToCategory(f.type)
      })),
      languages: detectionResult.frameworks
        .filter((f: any) => f.ecosystem)
        .map((f: any) => ({
          name: this.mapEcosystemToLanguage(f.ecosystem),
          version: f.version,
          confidence: f.confidence,
          primary: f.confidence > 0.7
        })),
      buildTools: detectionResult.buildTools.map((bt: any) => ({
        name: bt.name,
        configFile: bt.configFile,
        confidence: bt.confidence
      })),
      packageManagers: detectionResult.buildTools
        .filter((bt: any) => ['npm', 'yarn', 'pip', 'cargo', 'maven', 'gradle'].includes(bt.name.toLowerCase()))
        .map((bt: any) => ({
          name: bt.name,
          lockFile: bt.configFile,
          confidence: bt.confidence
        })),
      testingFrameworks: detectionResult.frameworks
        .filter((f: any) => f.type === 'testing_framework' || f.name.toLowerCase().includes('test'))
        .map((f: any) => ({
          name: f.name,
          type: 'unit' as const,
          confidence: f.confidence
        })),
      deploymentTargets: detectionResult.containers.map((c: any) => ({
        platform: c.type || 'docker',
        type: 'container' as const,
        confidence: 0.8
      })),
      projectMetadata: {
        name: repository.name,
        description: 'Auto-generated from README analysis',
        version: '1.0.0'
      }
    };
  }

  /**
   * Map framework type to generator category
   */
  private mapFrameworkTypeToCategory(type: string): 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop' {
    switch (type) {
      case 'frontend_framework':
      case 'static_site_generator':
        return 'frontend';
      case 'backend_framework':
      case 'api_framework':
      case 'microservice_framework':
        return 'backend';
      case 'fullstack_framework':
        return 'fullstack';
      case 'mobile_framework':
        return 'mobile';
      case 'desktop_framework':
        return 'desktop';
      default:
        return 'backend';
    }
  }

  /**
   * Map ecosystem to language name
   */
  private mapEcosystemToLanguage(ecosystem: string): string {
    switch (ecosystem) {
      case 'nodejs':
        return 'JavaScript';
      case 'python':
        return 'Python';
      case 'rust':
        return 'Rust';
      case 'go':
        return 'Go';
      case 'java':
        return 'Java';
      default:
        return ecosystem;
    }
  }

  /**
   * Map workflow type to category
   */
  private mapWorkflowTypeToCategory(type: string): 'ci' | 'cd' | 'security' | 'performance' | 'monitoring' {
    switch (type) {
      case 'ci':
        return 'ci';
      case 'cd':
        return 'cd';
      case 'security':
        return 'security';
      case 'performance':
        return 'performance';
      case 'monitoring':
        return 'monitoring';
      default:
        return 'ci';
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    parser: any;
    detector: any;
    generator: any;
  } {
    return {
      parser: this.readmeParser?.getPerformanceStats() || {},
      detector: this.frameworkDetector?.getPerformanceStats() || {},
      generator: {}
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.readmeParser?.clearPerformanceData();
    this.frameworkDetector?.clearCaches();
    this.logger.info('CLI integration caches cleared');
  }
}