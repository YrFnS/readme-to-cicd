/**
 * README Command Handler
 * 
 * Handles CLI commands that interact with the README parser.
 * Provides command handlers for parsing README files and extracting project information.
 */

import { CLIOptions, CLIResult, CLIError } from './types';
import { Logger } from './logger';
import { ErrorHandler } from './error-handler';
import { ReadmeParserImpl, createReadmeParserWithPipeline } from '../../parser';
import { ParseResult } from '../../parser/types';
import path from 'path';
import fs from 'fs/promises';
import ora from 'ora';

export interface ReadmeCommandOptions {
  readmePath?: string;
  outputFormat?: 'json' | 'yaml' | 'text';
  verbose?: boolean;
  debug?: boolean;
  includeMetadata?: boolean;
  includeConfidence?: boolean;
}

/**
 * Handler for README parsing commands
 */
export class ReadmeCommandHandler {
  private parser: ReadmeParserImpl;

  constructor(
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandler
  ) {
    // Initialize parser with IntegrationPipeline for enhanced processing
    this.parser = createReadmeParserWithPipeline();
  }

  /**
   * Handle README parse command
   */
  async handleParseCommand(options: ReadmeCommandOptions): Promise<CLIResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting README parse command', { options });

      // Resolve README file path
      const readmePath = await this.resolveReadmePath(options.readmePath);

      // Validate file exists
      await this.validateReadmeFile(readmePath);

      // Parse the README file with timeout, retries, and progress
      const parseResult = await this.safeParseFileWithRetry(readmePath);

      // Print parse results to console for immediate feedback
      console.log('\n📋 README Parse Results:');
      console.log('='.repeat(50));
      if (parseResult.success) {
        if (parseResult.data.metadata && parseResult.data.metadata.name) {
          console.log(`Project: ${parseResult.data.metadata.name}`);
        }
        if (parseResult.data.languages && parseResult.data.languages.length > 0) {
          console.log('\nLanguages:');
          parseResult.data.languages.forEach((lang: any) => {
            console.log(`  - ${lang.name} (confidence: ${(lang.confidence * 100).toFixed(1)}%)`);
          });
        }
        if (parseResult.data.commands) {
          const commandTypes = ['install', 'build', 'test', 'run', 'other'];
          commandTypes.forEach(type => {
            if (parseResult.data.commands[type] && parseResult.data.commands[type].length > 0) {
              console.log(`\n${type.toUpperCase()} Commands:`);
              parseResult.data.commands[type].forEach((cmd: any) => {
                console.log(`  - ${cmd.command || cmd}`);
              });
            }
          });
        }
        if (parseResult.data.dependencies && (parseResult.data.dependencies.packages || []).length > 0) {
          console.log('\nDependencies:');
          (parseResult.data.dependencies.packages || []).forEach((dep: any) => {
            console.log(`  - ${dep.name || dep}`);
          });
        }
        if (parseResult.data.confidence) {
          console.log(`\nOverall Confidence: ${(parseResult.data.confidence.overall * 100).toFixed(1)}%`);
        }
      } else {
        console.log('❌ Parse failed');
        parseResult.errors.forEach((error: any) => {
          console.log(`  - ${error.message}`);
        });
      }
      console.log('\n' + '='.repeat(50) + '\n');

      // Force exit after printing results to prevent hanging
      process.exit(0);

      // Process and format results (this line will not be reached due to exit)
      const cliResult = await this.processParseResult(parseResult, options, readmePath);

      // Add execution time
      cliResult.summary.executionTime = Date.now() - startTime;

      this.logger.info('README parse command completed', {
        success: cliResult.success,
        filePath: readmePath,
        executionTime: cliResult.summary.executionTime
      });

      return cliResult;

    } catch (error) {
      this.logger.error('README parse command failed', { error, options });
      console.error('\n❌ Command failed. Exiting...');
      process.exit(1);
    }
  }

  /**
   * Handle README analyze command (detailed analysis)
   */
  async handleAnalyzeCommand(options: ReadmeCommandOptions): Promise<CLIResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting README analyze command', { options });
      
      // Resolve README file path
      const readmePath = await this.resolveReadmePath(options.readmePath);
      
      // Validate file exists
      await this.validateReadmeFile(readmePath);
      
      // Parse the README file with timeout, retries, and progress
      const parseResult = await this.safeParseFileWithRetry(readmePath);
      
      // Process results with detailed analysis
      const cliResult = await this.processAnalyzeResult(parseResult, options, readmePath);
      
      // Add execution time
      cliResult.summary.executionTime = Date.now() - startTime;
      
      this.logger.info('README analyze command completed', {
        success: cliResult.success,
        filePath: readmePath,
        executionTime: cliResult.summary.executionTime
      });
      
      return cliResult;
      
    } catch (error) {
      this.logger.error('README analyze command failed', { error, options });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }

  /**
   * Handle README validate command (validation only)
   */
  async handleValidateCommand(options: ReadmeCommandOptions): Promise<CLIResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting README validate command', { options });
      
      // Resolve README file path
      const readmePath = await this.resolveReadmePath(options.readmePath);
      
      // Validate file exists and is readable
      await this.validateReadmeFile(readmePath);
      
      // Parse the README file for validation with timeout, retries, and progress
      const parseResult = await this.safeParseFileWithRetry(readmePath);
      
      // Process validation results
      const cliResult = await this.processValidationResult(parseResult, options, readmePath);
      
      // Add execution time
      cliResult.summary.executionTime = Date.now() - startTime;
      
      this.logger.info('README validate command completed', {
        success: cliResult.success,
        filePath: readmePath,
        executionTime: cliResult.summary.executionTime
      });
      
      return cliResult;
      
    } catch (error) {
      this.logger.error('README validate command failed', { error, options });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }

  /**
   * Resolve README file path with intelligent defaults
   */
  private async resolveReadmePath(providedPath?: string): Promise<string> {
    if (providedPath) {
      // Use provided path (can be relative or absolute)
      return path.resolve(providedPath);
    }
    
    // Try common README file names in current directory
    const commonNames = ['README.md', 'readme.md', 'README.txt', 'readme.txt', 'README'];
    
    for (const name of commonNames) {
      const fullPath = path.resolve(name);
      try {
        await fs.access(fullPath);
        this.logger.debug('Found README file', { path: fullPath });
        return fullPath;
      } catch {
        // File doesn't exist, try next
        continue;
      }
    }
    
    // Default to README.md if nothing found
    const defaultPath = path.resolve('README.md');
    this.logger.debug('Using default README path', { path: defaultPath });
    return defaultPath;
  }

  /**
   * Validate that README file exists and is readable
   */
  private async validateReadmeFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }
      
      // Check if file is readable
      await fs.access(filePath, fs.constants.R_OK);
      
      this.logger.debug('README file validation passed', { 
        filePath, 
        size: stats.size,
        modified: stats.mtime
      });
      
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error(`README file not found: ${filePath}`);
      } else if ((error as any).code === 'EACCES') {
        throw new Error(`README file is not readable: ${filePath}`);
      } else {
        throw new Error(`Failed to access README file: ${filePath} - ${(error as Error).message}`);
      }
    }
  }

  /**
   * Process parse result into CLI result format
   */
  private async processParseResult(
    parseResult: ParseResult, 
    options: ReadmeCommandOptions, 
    filePath: string
  ): Promise<CLIResult> {
    if (!parseResult.success) {
      return {
        success: false,
        generatedFiles: [],
        errors: parseResult.errors?.map(e => ({
          code: 'PARSE_ERROR',
          message: e.message,
          category: 'processing' as const,
          severity: 'error' as const,
          suggestions: []
        })) || [{
          code: 'PARSE_FAILED',
          message: 'Parse failed',
          category: 'processing' as const,
          severity: 'error' as const,
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 1,
          workflowsGenerated: 0
        }
      };
    }

    const projectInfo = parseResult.data!;
    
    // Format output based on requested format
    const outputContent = this.formatParseOutput(projectInfo, options);
    
    // Generate output file if requested
    const generatedFiles: string[] = [];
    if (options.outputFormat && options.outputFormat !== 'text') {
      const outputPath = await this.writeOutputFile(outputContent, options.outputFormat, filePath);
      generatedFiles.push(outputPath);
    }

    return {
      success: true,
      generatedFiles,
      errors: [],
      warnings: parseResult.warnings || [],
      summary: {
        totalTime: 0,
        filesGenerated: generatedFiles.length,
        workflowsCreated: 0,
        frameworksDetected: projectInfo.languages?.map(l => l.name) || [],
        optimizationsApplied: 0,
        executionTime: 0,
        filesProcessed: 1,
        workflowsGenerated: 0
      }
    };
  }  
/**
   * Process analyze result with detailed analysis
   */
  private async processAnalyzeResult(
    parseResult: ParseResult, 
    options: ReadmeCommandOptions, 
    filePath: string
  ): Promise<CLIResult> {
    if (!parseResult.success) {
      return {
        success: false,
        generatedFiles: [],
        errors: parseResult.errors?.map(e => ({
          code: 'ANALYSIS_ERROR',
          message: e.message,
          category: 'processing' as const,
          severity: 'error' as const,
          suggestions: []
        })) || [{
          code: 'ANALYSIS_FAILED',
          message: 'Analysis failed',
          category: 'processing' as const,
          severity: 'error' as const,
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 1,
          workflowsGenerated: 0
        }
      };
    }

    const projectInfo = parseResult.data!;
    
    // Create detailed analysis report
    const analysisReport = this.createAnalysisReport(projectInfo, options);
    
    // Generate analysis output file
    const generatedFiles: string[] = [];
    const outputPath = await this.writeAnalysisReport(analysisReport, filePath);
    generatedFiles.push(outputPath);

    return {
      success: true,
      generatedFiles,
      errors: [],
      warnings: parseResult.warnings || [],
      summary: {
        totalTime: 0,
        filesGenerated: generatedFiles.length,
        workflowsCreated: 0,
        frameworksDetected: projectInfo.languages?.map(l => l.name) || [],
        optimizationsApplied: 0,
        executionTime: 0,
        filesProcessed: 1,
        workflowsGenerated: 0
      }
    };
  }

  /**
   * Process validation result
   */
  private async processValidationResult(
    parseResult: ParseResult, 
    options: ReadmeCommandOptions, 
    filePath: string
  ): Promise<CLIResult> {
    const validationErrors: CLIError[] = [];
    const validationWarnings: string[] = [];

    if (!parseResult.success) {
      validationErrors.push(...(parseResult.errors?.map(e => ({
        code: 'VALIDATION_ERROR',
        message: e.message,
        category: 'processing' as const,
        severity: 'error' as const,
        suggestions: []
      })) || [{
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        category: 'processing' as const,
        severity: 'error' as const,
        suggestions: []
      }]));
    } else {
      const projectInfo = parseResult.data!;
      
      // Perform validation checks
      this.validateProjectInfo(projectInfo, validationErrors, validationWarnings);
    }

    return {
      success: validationErrors.length === 0,
      generatedFiles: [],
      errors: validationErrors,
      warnings: [...(parseResult.warnings || []), ...validationWarnings],
      summary: {
        totalTime: 0,
        filesGenerated: 0,
        workflowsCreated: 0,
        frameworksDetected: parseResult.success ? (parseResult.data!.languages?.map(l => l.name) || []) : [],
        optimizationsApplied: 0,
        executionTime: 0,
        filesProcessed: 1,
        workflowsGenerated: 0
      }
    };
  }

  /**
   * Format parse output based on requested format
   */
  private formatParseOutput(projectInfo: any, options: ReadmeCommandOptions): string {
    const output: any = {
      metadata: projectInfo.metadata,
      languages: projectInfo.languages,
      dependencies: projectInfo.dependencies,
      commands: projectInfo.commands,
      testing: projectInfo.testing
    };

    if (options.includeConfidence) {
      output.confidence = projectInfo.confidence;
    }

    if (options.includeMetadata) {
      output.processingMetadata = {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    }

    switch (options.outputFormat) {
      case 'json':
        return JSON.stringify(output, null, 2);
      case 'yaml':
        const yaml = require('js-yaml');
        return yaml.dump(output);
      case 'text':
      default:
        return this.formatTextOutput(output);
    }
  }

  /**
   * Format output as human-readable text
   */
  private formatTextOutput(data: any): string {
    const lines: string[] = [];
    
    lines.push('README Analysis Results');
    lines.push('======================');
    lines.push('');

    if (data.metadata?.name) {
      lines.push(`Project: ${data.metadata.name}`);
    }
    if (data.metadata?.description) {
      lines.push(`Description: ${data.metadata.description}`);
    }
    lines.push('');

    if (data.languages?.length > 0) {
      lines.push('Languages:');
      data.languages.forEach((lang: any) => {
        lines.push(`  - ${lang.name} (confidence: ${(lang.confidence * 100).toFixed(1)}%)`);
      });
      lines.push('');
    }

    if (data.dependencies?.length > 0) {
      lines.push('Dependencies:');
      data.dependencies.forEach((dep: any) => {
        lines.push(`  - ${dep.name}${dep.version ? ` (${dep.version})` : ''}`);
      });
      lines.push('');
    }

    if (data.commands) {
      lines.push('Commands:');
      Object.entries(data.commands).forEach(([category, commands]: [string, any]) => {
        if (Array.isArray(commands) && commands.length > 0) {
          lines.push(`  ${category}:`);
          commands.forEach((cmd: any) => {
            lines.push(`    - ${cmd.command}`);
          });
        }
      });
      lines.push('');
    }

    if (data.confidence) {
      lines.push(`Overall Confidence: ${(data.confidence.overall * 100).toFixed(1)}%`);
    }

    return lines.join('\n');
  }

  /**
   * Create detailed analysis report
   */
  private createAnalysisReport(projectInfo: any, options: ReadmeCommandOptions): any {
    return {
      summary: {
        projectName: projectInfo.metadata?.name || 'Unknown',
        analysisDate: new Date().toISOString(),
        overallConfidence: projectInfo.confidence?.overall || 0
      },
      details: {
        metadata: projectInfo.metadata,
        languages: projectInfo.languages,
        dependencies: projectInfo.dependencies,
        commands: projectInfo.commands,
        testing: projectInfo.testing,
        confidence: projectInfo.confidence
      },
      recommendations: this.generateRecommendations(projectInfo),
      diagnostics: this.generateDiagnostics(projectInfo)
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(projectInfo: any): string[] {
    const recommendations: string[] = [];

    if (!projectInfo.languages || projectInfo.languages.length === 0) {
      recommendations.push('Consider adding code examples or language-specific sections to improve framework detection');
    }

    if (!projectInfo.commands?.install || projectInfo.commands.install.length === 0) {
      recommendations.push('Add installation instructions to help users get started');
    }

    if (!projectInfo.commands?.test || projectInfo.commands.test.length === 0) {
      recommendations.push('Include testing commands to improve CI/CD workflow generation');
    }

    if (!projectInfo.dependencies || projectInfo.dependencies.length === 0) {
      recommendations.push('Document project dependencies for better dependency management');
    }

    if (projectInfo.confidence?.overall < 0.7) {
      recommendations.push('Consider adding more detailed project information to improve analysis confidence');
    }

    return recommendations;
  }

  /**
   * Generate diagnostics information
   */
  private generateDiagnostics(projectInfo: any): any {
    return {
      analysisQuality: {
        languageDetection: projectInfo.languages?.length > 0 ? 'good' : 'poor',
        dependencyExtraction: projectInfo.dependencies?.length > 0 ? 'good' : 'poor',
        commandExtraction: Object.keys(projectInfo.commands || {}).length > 0 ? 'good' : 'poor',
        metadataExtraction: projectInfo.metadata?.name ? 'good' : 'poor'
      },
      confidenceBreakdown: projectInfo.confidence || {},
      potentialIssues: this.identifyPotentialIssues(projectInfo)
    };
  }

  /**
   * Identify potential issues in the analysis
   */
  private identifyPotentialIssues(projectInfo: any): string[] {
    const issues: string[] = [];

    if (projectInfo.confidence?.overall < 0.5) {
      issues.push('Low overall confidence - README may lack sufficient technical details');
    }

    if (!projectInfo.metadata?.name) {
      issues.push('Project name not detected - consider adding a clear title');
    }

    if (!projectInfo.metadata?.description) {
      issues.push('Project description not found - add a description section');
    }

    return issues;
  }

  /**
   * Validate project information and collect issues
   */
  private validateProjectInfo(
    projectInfo: any, 
    errors: CLIError[], 
    warnings: string[]
  ): void {
    // Check for critical missing information
    if (!projectInfo.metadata?.name) {
      warnings.push('Project name not detected');
    }

    if (!projectInfo.languages || projectInfo.languages.length === 0) {
      warnings.push('No programming languages detected');
    }

    if (!projectInfo.commands || Object.keys(projectInfo.commands).length === 0) {
      warnings.push('No commands detected');
    }

    // Check confidence levels
    if (projectInfo.confidence?.overall < 0.3) {
      errors.push({
        code: 'LOW_CONFIDENCE',
        message: 'Analysis confidence too low - README may be incomplete or malformed',
        category: 'processing',
        severity: 'error',
        suggestions: ['Add more technical details to your README', 'Include installation instructions', 'Add usage examples']
      });
    } else if (projectInfo.confidence?.overall < 0.6) {
      warnings.push('Analysis confidence is moderate - consider adding more technical details');
    }

    // Validate language detection
    if (projectInfo.languages) {
      const lowConfidenceLanguages = projectInfo.languages.filter((l: any) => l.confidence < 0.5);
      if (lowConfidenceLanguages.length > 0) {
        warnings.push(`Low confidence language detections: ${lowConfidenceLanguages.map((l: any) => l.name).join(', ')}`);
      }
    }
  }

  /**
   * Write output file
   */
  private async writeOutputFile(
    content: string, 
    format: string, 
    originalPath: string
  ): Promise<string> {
    const dir = path.dirname(originalPath);
    const basename = path.basename(originalPath, path.extname(originalPath));
    const outputPath = path.join(dir, `${basename}-analysis.${format}`);
    
    await fs.writeFile(outputPath, content, 'utf8');
    
    this.logger.debug('Output file written', { outputPath, format });
    return outputPath;
  }

  /**
   * Write analysis report
   */
  private async writeAnalysisReport(report: any, originalPath: string): Promise<string> {
    const dir = path.dirname(originalPath);
    const basename = path.basename(originalPath, path.extname(originalPath));
    const outputPath = path.join(dir, `${basename}-detailed-analysis.json`);
    
    const content = JSON.stringify(report, null, 2);
    await fs.writeFile(outputPath, content, 'utf8');
    
    this.logger.debug('Analysis report written', { outputPath });
    return outputPath;
  }

  /**
   * Safely parse file with retries, timeout, and progress indicator
   */
  private async safeParseFileWithRetry(filePath: string, maxRetries: number = 3): Promise<ParseResult> {
    const stats = await fs.stat(filePath);
    if (stats.size > 5 * 1024 * 1024) { // 5MB threshold
      this.logger.warn(`Large file detected (${(stats.size / 1024 / 1024).toFixed(1)}MB). Processing may take longer. Consider splitting for better performance.`);
    }

    let lastError: Error | null = null;
    let delay = 100; // Initial backoff delay in ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const spinner = ora({
        text: `Processing README file (attempt ${attempt}/${maxRetries})...`,
        spinner: 'dots'
      });
      spinner.start();

      try {
        // Adjust timeout based on file size
        const fileSizeMB = stats.size / 1024 / 1024;
        const timeoutMs = Math.min(60000, 10000 + fileSizeMB * 10000); // 10s base + 10s per MB, max 60s

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Parse timeout after ${timeoutMs / 1000} seconds on attempt ${attempt} (file size: ${(stats.size / 1024 / 1024).toFixed(1)}MB)`), timeoutMs)
        ));

        // Race parsing with timeout
        const parsePromise = Promise.race([
          this.parser.parseFile(filePath),
          timeoutPromise
        ]) as Promise<ParseResult>;

        const result = await parsePromise;
        spinner.succeed(`File processed successfully in ${((Date.now() - spinner.startTime) / 1000).toFixed(1)}s`);
        return result;

      } catch (error) {
        spinner.fail(`Processing failed (attempt ${attempt}/${maxRetries}): ${(error as Error).message}`);
        lastError = error as Error;

        if (attempt === maxRetries) {
          this.logger.error(`Parse failed after ${maxRetries} attempts`, { error: lastError.message, filePath, size: stats.size });
          throw lastError;
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 100;
        this.logger.warn(`Retry ${attempt + 1} in ${delay + jitter}ms due to: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        delay *= 1.5; // Backoff 1.5x to be more aggressive on retries
      }
    }

    // Unreachable, but for completeness
    throw lastError!;
  }
}