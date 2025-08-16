/**
 * Batch Processor
 * 
 * Handles batch processing of multiple projects with recursive directory scanning,
 * parallel processing, error isolation, and comprehensive reporting.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { ComponentOrchestrator } from './component-orchestrator';
import { Logger } from './logger';
import { ErrorHandler } from './error-handler';
import {
  CLIOptions,
  CLIResult,
  CLIError,
  BatchProcessingOptions,
  BatchProcessingResult,
  BatchProjectResult,
  ProjectInfo,
  ProjectDetectionResult,
  BatchExecutionSummary
} from './types';

/**
 * Configuration options for batch processing
 */
export interface BatchProcessorConfig {
  maxConcurrency: number;
  projectDetectionTimeout: number;
  processingTimeout: number;
  enableProgressReporting: boolean;
  enableDetailedLogging: boolean;
}

/**
 * Progress callback for batch processing updates
 */
export type BatchProgressCallback = (progress: {
  totalProjects: number;
  processedProjects: number;
  currentProject?: string;
  phase: 'detection' | 'processing' | 'complete';
}) => void;

/**
 * Main batch processor class for handling multiple projects
 */
export class BatchProcessor {
  private orchestrator: ComponentOrchestrator;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: BatchProcessorConfig;

  constructor(
    orchestrator: ComponentOrchestrator,
    logger: Logger,
    errorHandler: ErrorHandler,
    config: Partial<BatchProcessorConfig> = {}
  ) {
    this.orchestrator = orchestrator;
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.config = {
      maxConcurrency: 4,
      projectDetectionTimeout: 30000,
      processingTimeout: 120000,
      enableProgressReporting: true,
      enableDetailedLogging: false,
      ...config
    };

    this.logger.debug('BatchProcessor initialized', {
      config: this.config
    });
  }

  /**
   * Process multiple projects based on batch options
   */
  async processBatch(
    batchOptions: BatchProcessingOptions,
    cliOptions: CLIOptions,
    progressCallback?: BatchProgressCallback
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    
    this.logger.info('Starting batch processing', {
      directories: batchOptions.directories,
      recursive: batchOptions.recursive,
      parallel: batchOptions.parallel,
      maxConcurrency: batchOptions.maxConcurrency || this.config.maxConcurrency
    });

    try {
      // Phase 1: Project Detection
      progressCallback?.({
        totalProjects: 0,
        processedProjects: 0,
        phase: 'detection'
      });

      const detectionResult = await this.detectProjects(batchOptions);
      
      this.logger.info('Project detection completed', {
        projectsFound: detectionResult.projects.length,
        directoriesScanned: detectionResult.totalDirectoriesScanned,
        detectionTime: detectionResult.detectionTime
      });

      if (detectionResult.projects.length === 0) {
        return this.createEmptyResult(startTime, 'No projects found in specified directories');
      }

      // Phase 2: Project Processing
      progressCallback?.({
        totalProjects: detectionResult.projects.length,
        processedProjects: 0,
        phase: 'processing'
      });

      const projectResults = await this.processProjects(
        detectionResult.projects,
        batchOptions,
        cliOptions,
        progressCallback
      );

      // Phase 3: Results Compilation
      progressCallback?.({
        totalProjects: detectionResult.projects.length,
        processedProjects: detectionResult.projects.length,
        phase: 'complete'
      });

      const batchResult = this.compileBatchResult(
        detectionResult,
        projectResults,
        startTime
      );

      this.logger.info('Batch processing completed', {
        totalProjects: batchResult.totalProjects,
        successful: batchResult.successfulProjects,
        failed: batchResult.failedProjects,
        skipped: batchResult.skippedProjects,
        totalTime: batchResult.totalExecutionTime
      });

      return batchResult;

    } catch (error) {
      this.logger.error('Batch processing failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return this.createErrorResult(startTime, error);
    }
  }

  /**
   * Detect projects in specified directories
   */
  private async detectProjects(options: BatchProcessingOptions): Promise<ProjectDetectionResult> {
    const startTime = Date.now();
    const projects: ProjectInfo[] = [];
    let totalDirectoriesScanned = 0;
    let excludedDirectories = 0;

    for (const directory of options.directories) {
      try {
        const resolvedDir = path.resolve(directory);
        
        // Validate directory exists
        const stats = await fs.stat(resolvedDir);
        if (!stats.isDirectory()) {
          this.logger.warn('Skipping non-directory path', { path: resolvedDir });
          continue;
        }

        // Scan directory for projects
        const scanResult = await this.scanDirectory(
          resolvedDir,
          options.recursive,
          options.projectDetectionPattern,
          options.excludePatterns
        );

        projects.push(...scanResult.projects);
        totalDirectoriesScanned += scanResult.directoriesScanned;
        excludedDirectories += scanResult.excludedDirectories;

      } catch (error) {
        this.logger.error('Failed to scan directory', {
          directory,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      projects,
      totalDirectoriesScanned,
      excludedDirectories,
      detectionTime: Date.now() - startTime
    };
  }

  /**
   * Scan a directory for projects
   */
  private async scanDirectory(
    directory: string,
    recursive: boolean,
    projectPattern?: string,
    excludePatterns?: string[]
  ): Promise<{
    projects: ProjectInfo[];
    directoriesScanned: number;
    excludedDirectories: number;
  }> {
    const projects: ProjectInfo[] = [];
    let directoriesScanned = 0;
    let excludedDirectories = 0;

    const scanQueue: string[] = [directory];
    const visited = new Set<string>();

    while (scanQueue.length > 0) {
      const currentDir = scanQueue.shift()!;
      
      // Avoid infinite loops with symlinks
      const realPath = await fs.realpath(currentDir);
      if (visited.has(realPath)) {
        continue;
      }
      visited.add(realPath);

      directoriesScanned++;

      try {
        // Check if directory should be excluded
        if (this.shouldExcludeDirectory(currentDir, excludePatterns)) {
          excludedDirectories++;
          continue;
        }

        // Check if this directory contains a project
        const projectInfo = await this.detectProjectInDirectory(currentDir, projectPattern);
        if (projectInfo) {
          projects.push(projectInfo);
        }

        // If recursive, add subdirectories to scan queue
        if (recursive) {
          const entries = await fs.readdir(currentDir, { withFileTypes: true });
          
          for (const entry of entries) {
            // Handle both Dirent objects and plain objects from mocks
            const isDirectory = typeof entry.isDirectory === 'function' ? 
              entry.isDirectory() : 
              (entry as any).isDirectory?.() || false;
            const entryName = typeof entry === 'string' ? entry : entry.name;
            
            if (isDirectory && !entryName.startsWith('.')) {
              const subDir = path.join(currentDir, entryName);
              
              // Skip common non-project directories
              if (!this.isCommonNonProjectDirectory(entryName)) {
                scanQueue.push(subDir);
              }
            }
          }
        }

      } catch (error) {
        this.logger.debug('Failed to scan directory', {
          directory: currentDir,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      projects,
      directoriesScanned,
      excludedDirectories
    };
  }

  /**
   * Detect if a directory contains a project
   */
  private async detectProjectInDirectory(
    directory: string,
    projectPattern?: string
  ): Promise<ProjectInfo | null> {
    try {
      const entries = await fs.readdir(directory);
      
      // Handle both string array and Dirent array formats
      const entryNames = entries.map((entry): string => 
        typeof entry === 'string' ? entry : (entry as any).name
      );
      const entrySet = new Set(entryNames);

      // Look for README files
      const readmeFiles = entryNames.filter(entry => 
        /^readme\.(md|txt|rst)$/i.test(entry)
      );

      if (readmeFiles.length === 0) {
        return null; // No README file found
      }

      // Prefer README.md, then README.txt, then others
      const readmeFile = readmeFiles.find(f => f.toLowerCase() === 'readme.md') ||
                        readmeFiles.find(f => f.toLowerCase() === 'readme.txt') ||
                        readmeFiles[0];

      // readmeFile is guaranteed to exist since readmeFiles.length > 0
      const readmePath = path.join(directory, readmeFile!);

      // Check for additional project indicators
      const hasPackageJson = entrySet.has('package.json');
      const hasGitRepo = entrySet.has('.git');

      // Estimate project complexity based on indicators
      const complexity = this.estimateProjectComplexity(entrySet);

      // Extract project name from directory or package.json
      let projectName = path.basename(directory);
      
      if (hasPackageJson) {
        try {
          const packageJsonPath = path.join(directory, 'package.json');
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
          projectName = packageJson.name || projectName;
        } catch {
          // Ignore package.json parsing errors
        }
      }

      // Apply project pattern filter if specified
      if (projectPattern && !new RegExp(projectPattern).test(projectName)) {
        return null;
      }

      return {
        path: directory,
        name: projectName,
        readmePath,
        hasPackageJson,
        hasGitRepo,
        estimatedComplexity: complexity
      };

    } catch (error) {
      this.logger.debug('Failed to detect project in directory', {
        directory,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Process multiple projects with optional parallelization
   */
  private async processProjects(
    projects: ProjectInfo[],
    batchOptions: BatchProcessingOptions,
    cliOptions: CLIOptions,
    progressCallback?: BatchProgressCallback
  ): Promise<BatchProjectResult[]> {
    const results: BatchProjectResult[] = [];
    
    if (batchOptions.parallel) {
      // Parallel processing with concurrency control
      const concurrency = Math.min(
        batchOptions.maxConcurrency || this.config.maxConcurrency,
        projects.length
      );

      this.logger.info('Starting parallel processing', {
        totalProjects: projects.length,
        concurrency
      });

      const chunks = this.chunkArray(projects, concurrency);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(project => 
          this.processProject(project, cliOptions, batchOptions.continueOnError)
        );

        const chunkResults = await Promise.allSettled(chunkPromises);
        
        for (let i = 0; i < chunkResults.length; i++) {
          const result = chunkResults[i];
          const project = chunk[i];
          
          if (!project) {
            continue; // Skip if project is undefined
          }
          
          if (result && result.status === 'fulfilled') {
            results.push(result.value);
          } else if (result && result.status === 'rejected') {
            // Create error result for failed promise
            results.push({
              project: project,
              success: false,
              error: {
                code: 'PROCESSING_FAILED',
                message: result.reason instanceof Error ? result.reason.message : String(result.reason),
                category: 'processing',
                severity: 'error',
                suggestions: ['Check project structure and dependencies']
              },
              executionTime: 0
            });
          }

          // Update progress
          progressCallback?.({
            totalProjects: projects.length,
            processedProjects: results.length,
            currentProject: project.name,
            phase: 'processing'
          });
        }
      }

    } else {
      // Sequential processing
      this.logger.info('Starting sequential processing', {
        totalProjects: projects.length
      });

      for (const project of projects) {
        const result = await this.processProject(
          project,
          cliOptions,
          batchOptions.continueOnError
        );
        
        results.push(result);

        // Update progress
        progressCallback?.({
          totalProjects: projects.length,
          processedProjects: results.length,
          currentProject: project.name,
          phase: 'processing'
        });

        // If not continuing on error and this project failed, stop processing
        if (!batchOptions.continueOnError && !result.success) {
          this.logger.warn('Stopping batch processing due to project failure', {
            failedProject: project.name,
            error: result.error?.message
          });
          break;
        }
      }
    }

    return results;
  }

  /**
   * Process a single project
   */
  private async processProject(
    project: ProjectInfo,
    cliOptions: CLIOptions,
    continueOnError: boolean
  ): Promise<BatchProjectResult> {
    const startTime = Date.now();

    this.logger.debug('Processing project', {
      project: project.name,
      path: project.path,
      readmePath: project.readmePath
    });

    try {
      // Create project-specific CLI options
      const projectOptions: CLIOptions = {
        ...cliOptions,
        readmePath: project.readmePath,
        // Override output directory to be relative to project
        outputDir: cliOptions.outputDir || path.join(project.path, '.github', 'workflows')
      };

      // Execute workflow for this project
      const result = await this.executeWithTimeout(
        () => this.orchestrator.executeWorkflow(projectOptions),
        this.config.processingTimeout
      );

      const executionTime = Date.now() - startTime;

      this.logger.info('Project processed successfully', {
        project: project.name,
        filesGenerated: result.generatedFiles.length,
        executionTime
      });

      return {
        project,
        success: result.success,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Project processing failed', {
        project: project.name,
        error: errorMessage,
        executionTime,
        continueOnError
      });

      const cliError: CLIError = {
        code: 'PROJECT_PROCESSING_FAILED',
        message: `Failed to process project ${project.name}: ${errorMessage}`,
        category: 'processing',
        severity: 'error',
        suggestions: [
          'Check README file format and content',
          'Verify project structure and dependencies',
          'Run with --debug flag for more details'
        ]
      };

      return {
        project,
        success: false,
        error: cliError,
        executionTime
      };
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Compile batch processing results
   */
  private compileBatchResult(
    detectionResult: ProjectDetectionResult,
    projectResults: BatchProjectResult[],
    startTime: number
  ): BatchProcessingResult {
    const totalExecutionTime = Date.now() - startTime;
    
    const successfulProjects = projectResults.filter(r => r.success).length;
    const failedProjects = projectResults.filter(r => !r.success && !r.skipped).length;
    const skippedProjects = projectResults.filter(r => r.skipped).length;

    // Aggregate statistics
    const totalFilesGenerated = projectResults
      .filter(r => r.success && r.result)
      .reduce((sum, r) => sum + (r.result!.generatedFiles.length || 0), 0);

    const totalWorkflowsCreated = projectResults
      .filter(r => r.success && r.result)
      .reduce((sum, r) => sum + (r.result!.summary.workflowsCreated || 0), 0);

    // Framework detection statistics
    const frameworksDetected: Record<string, number> = {};
    projectResults
      .filter(r => r.success && r.result)
      .forEach(r => {
        r.result!.summary.frameworksDetected.forEach(framework => {
          frameworksDetected[framework] = (frameworksDetected[framework] || 0) + 1;
        });
      });

    // Error categorization
    const errorsByCategory: Record<string, number> = {};
    projectResults
      .filter(r => !r.success && r.error)
      .forEach(r => {
        const category = r.error!.category;
        errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
      });

    // Calculate average execution time
    const validExecutionTimes = projectResults
      .filter(r => r.executionTime > 0)
      .map(r => r.executionTime);
    
    const averageExecutionTime = validExecutionTimes.length > 0
      ? validExecutionTimes.reduce((sum, time) => sum + time, 0) / validExecutionTimes.length
      : 0;

    const summary: BatchExecutionSummary = {
      totalProjectsFound: detectionResult.projects.length,
      totalProjectsProcessed: projectResults.length,
      totalFilesGenerated,
      totalWorkflowsCreated,
      frameworksDetected,
      averageExecutionTime,
      parallelExecutions: 0, // Would need to track this during parallel processing
      errorsByCategory
    };

    // Collect all errors and warnings
    const allErrors: CLIError[] = [];
    const allWarnings: string[] = [];

    projectResults.forEach(r => {
      if (r.error) {
        allErrors.push(r.error);
      }
      if (r.result) {
        allErrors.push(...r.result.errors);
        allWarnings.push(...r.result.warnings);
      }
    });

    return {
      success: failedProjects === 0,
      totalProjects: detectionResult.projects.length,
      processedProjects: projectResults.length,
      successfulProjects,
      failedProjects,
      skippedProjects,
      projectResults,
      totalExecutionTime,
      summary,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Create empty result when no projects found
   */
  private createEmptyResult(startTime: number, message: string): BatchProcessingResult {
    return {
      success: true,
      totalProjects: 0,
      processedProjects: 0,
      successfulProjects: 0,
      failedProjects: 0,
      skippedProjects: 0,
      projectResults: [],
      totalExecutionTime: Date.now() - startTime,
      summary: {
        totalProjectsFound: 0,
        totalProjectsProcessed: 0,
        totalFilesGenerated: 0,
        totalWorkflowsCreated: 0,
        frameworksDetected: {},
        averageExecutionTime: 0,
        parallelExecutions: 0,
        errorsByCategory: {}
      },
      errors: [],
      warnings: [message]
    };
  }

  /**
   * Create error result for batch processing failure
   */
  private createErrorResult(startTime: number, error: unknown): BatchProcessingResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const cliError: CLIError = {
      code: 'BATCH_PROCESSING_FAILED',
      message: `Batch processing failed: ${errorMessage}`,
      category: 'processing',
      severity: 'error',
      suggestions: [
        'Check directory paths and permissions',
        'Verify project structure requirements',
        'Run with --debug flag for more details'
      ]
    };

    return {
      success: false,
      totalProjects: 0,
      processedProjects: 0,
      successfulProjects: 0,
      failedProjects: 0,
      skippedProjects: 0,
      projectResults: [],
      totalExecutionTime: Date.now() - startTime,
      summary: {
        totalProjectsFound: 0,
        totalProjectsProcessed: 0,
        totalFilesGenerated: 0,
        totalWorkflowsCreated: 0,
        frameworksDetected: {},
        averageExecutionTime: 0,
        parallelExecutions: 0,
        errorsByCategory: { [cliError.category]: 1 }
      },
      errors: [cliError],
      warnings: []
    };
  }

  /**
   * Check if directory should be excluded
   */
  private shouldExcludeDirectory(directory: string, excludePatterns?: string[]): boolean {
    if (!excludePatterns || excludePatterns.length === 0) {
      return false;
    }

    const dirName = path.basename(directory);
    const relativePath = path.relative(process.cwd(), directory);

    return excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(dirName) || regex.test(relativePath);
    });
  }

  /**
   * Check if directory name indicates a common non-project directory
   */
  private isCommonNonProjectDirectory(dirName: string): boolean {
    const nonProjectDirs = [
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      'build',
      'dist',
      'target',
      'bin',
      'obj',
      'out',
      'coverage',
      '.nyc_output',
      'logs',
      'tmp',
      'temp',
      '.cache',
      '.vscode',
      '.idea',
      '__pycache__',
      '.pytest_cache',
      'venv',
      'env',
      '.env'
    ];

    return nonProjectDirs.includes(dirName.toLowerCase());
  }

  /**
   * Estimate project complexity based on file indicators
   */
  private estimateProjectComplexity(entries: Set<string>): 'low' | 'medium' | 'high' {
    let complexityScore = 0;

    // Package managers and build tools
    if (entries.has('package.json')) complexityScore += 2;
    if (entries.has('yarn.lock') || entries.has('package-lock.json')) complexityScore += 1;
    if (entries.has('Dockerfile')) complexityScore += 2;
    if (entries.has('docker-compose.yml')) complexityScore += 2;
    if (entries.has('Makefile')) complexityScore += 1;
    if (entries.has('CMakeLists.txt')) complexityScore += 2;
    if (entries.has('pom.xml') || entries.has('build.gradle')) complexityScore += 2;
    if (entries.has('Cargo.toml')) complexityScore += 2;
    if (entries.has('go.mod')) complexityScore += 1;
    if (entries.has('requirements.txt') || entries.has('setup.py') || entries.has('pyproject.toml')) complexityScore += 1;

    // Configuration files
    if (entries.has('tsconfig.json')) complexityScore += 1;
    if (entries.has('webpack.config.js') || entries.has('vite.config.js')) complexityScore += 2;
    if (entries.has('.eslintrc.json') || entries.has('.eslintrc.js')) complexityScore += 1;

    // Source directories
    if (entries.has('src')) complexityScore += 1;
    if (entries.has('lib')) complexityScore += 1;
    if (entries.has('test') || entries.has('tests')) complexityScore += 1;

    // CI/CD files
    if (entries.has('.github')) complexityScore += 1;
    if (entries.has('.gitlab-ci.yml')) complexityScore += 1;

    if (complexityScore >= 8) return 'high';
    if (complexityScore >= 4) return 'medium';
    return 'low';
  }

  /**
   * Split array into chunks for parallel processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get batch processing statistics
   */
  getProcessingStats(): {
    config: BatchProcessorConfig;
    orchestratorStats: any;
  } {
    return {
      config: this.config,
      orchestratorStats: this.orchestrator.getExecutionStats()
    };
  }

  /**
   * Update batch processor configuration
   */
  updateConfig(newConfig: Partial<BatchProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.debug('BatchProcessor configuration updated', {
      config: this.config
    });
  }
}