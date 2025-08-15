/**
 * Output Handler
 * 
 * Handles file system operations and output management for the CLI tool.
 * Provides file writing, validation, conflict detection, backup functionality,
 * and comprehensive error handling for workflow file generation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIError, OutputConfig } from './types';
import { Logger } from './logger';

/**
 * File conflict resolution strategies
 */
export type ConflictResolution = 'overwrite' | 'backup' | 'skip' | 'merge' | 'prompt';

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  filePath: string;
  action: 'created' | 'updated' | 'skipped' | 'backed-up';
  backupPath?: string;
  error?: CLIError;
}

/**
 * Output operation result
 */
export interface OutputResult {
  success: boolean;
  filesProcessed: number;
  filesCreated: number;
  filesUpdated: number;
  filesSkipped: number;
  backupsCreated: number;
  errors: CLIError[];
  warnings: string[];
  generatedFiles: string[];
  backupFiles: string[];
}

/**
 * File conflict information
 */
export interface FileConflict {
  filePath: string;
  existingContent: string;
  newContent: string;
  lastModified: Date;
  size: number;
  canMerge: boolean;
}

/**
 * Output handler options
 */
export interface OutputHandlerOptions {
  conflictResolution: ConflictResolution;
  createBackups: boolean;
  validatePermissions: boolean;
  dryRun: boolean;
  overwriteReadonly: boolean;
}

/**
 * Workflow file information
 */
export interface WorkflowFile {
  filename: string;
  content: string;
  type: string;
  metadata?: {
    description?: string;
    version?: string;
    generated?: Date;
  };
}

/**
 * Main output handler class for file system operations
 */
export class OutputHandler {
  private logger: Logger;
  private options: OutputHandlerOptions;

  constructor(logger: Logger, options: Partial<OutputHandlerOptions> = {}) {
    this.logger = logger;
    this.options = {
      conflictResolution: 'backup',
      createBackups: true,
      validatePermissions: true,
      dryRun: false,
      overwriteReadonly: false,
      ...options
    };
  }

  /**
   * Write workflow files to the specified output directory
   */
  async writeWorkflowFiles(
    workflowFiles: WorkflowFile[],
    outputDirectory: string,
    outputConfig?: OutputConfig
  ): Promise<OutputResult> {
    const result: OutputResult = {
      success: true,
      filesProcessed: 0,
      filesCreated: 0,
      filesUpdated: 0,
      filesSkipped: 0,
      backupsCreated: 0,
      errors: [],
      warnings: [],
      generatedFiles: [],
      backupFiles: []
    };

    this.logger.info('Starting workflow file output', {
      fileCount: workflowFiles.length,
      outputDirectory,
      dryRun: this.options.dryRun
    });

    try {
      // Validate and prepare output directory
      const validatedOutputDir = await this.validateAndPrepareOutputDirectory(outputDirectory);
      
      // Process each workflow file
      for (const workflowFile of workflowFiles) {
        result.filesProcessed++;
        
        const fileResult = await this.writeWorkflowFile(
          workflowFile,
          validatedOutputDir,
          outputConfig
        );

        // Update result based on file operation outcome
        this.updateResultFromFileOperation(result, fileResult);

        if (!fileResult.success) {
          result.success = false;
        }
      }

      this.logger.info('Workflow file output completed', {
        success: result.success,
        filesProcessed: result.filesProcessed,
        filesCreated: result.filesCreated,
        filesUpdated: result.filesUpdated,
        filesSkipped: result.filesSkipped,
        backupsCreated: result.backupsCreated,
        errorCount: result.errors.length
      });

    } catch (error) {
      result.success = false;
      const cliError = this.createFileSystemError(
        'OUTPUT_DIRECTORY_ERROR',
        `Failed to prepare output directory: ${error instanceof Error ? error.message : String(error)}`,
        outputDirectory
      );
      result.errors.push(cliError);
      
      this.logger.error('Workflow file output failed', {
        error: cliError.message,
        outputDirectory
      });
    }

    return result;
  }

  /**
   * Write a single workflow file
   */
  private async writeWorkflowFile(
    workflowFile: WorkflowFile,
    outputDirectory: string,
    outputConfig?: OutputConfig
  ): Promise<FileOperationResult> {
    const filePath = path.join(outputDirectory, workflowFile.filename);
    
    this.logger.debug('Processing workflow file', {
      filename: workflowFile.filename,
      filePath,
      type: workflowFile.type
    });

    try {
      // Check if file already exists
      const fileExists = await this.fileExists(filePath);
      
      if (fileExists) {
        return await this.handleFileConflict(workflowFile, filePath, outputConfig);
      } else {
        return await this.createNewFile(workflowFile, filePath, outputConfig);
      }

    } catch (error) {
      const cliError = this.createFileSystemError(
        'FILE_WRITE_ERROR',
        `Failed to write workflow file: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );

      return {
        success: false,
        filePath,
        action: 'skipped',
        error: cliError
      };
    }
  }

  /**
   * Handle file conflicts based on resolution strategy
   */
  private async handleFileConflict(
    workflowFile: WorkflowFile,
    filePath: string,
    outputConfig?: OutputConfig
  ): Promise<FileOperationResult> {
    this.logger.debug('File conflict detected', {
      filePath,
      resolution: this.options.conflictResolution
    });

    switch (this.options.conflictResolution) {
      case 'overwrite':
        return await this.overwriteFile(workflowFile, filePath, outputConfig);
        
      case 'backup':
        return await this.backupAndOverwrite(workflowFile, filePath, outputConfig);
        
      case 'skip':
        this.logger.info('Skipping existing file', { filePath });
        return {
          success: true,
          filePath,
          action: 'skipped'
        };
        
      case 'merge':
        // Get conflict information for merge
        const conflict = await this.analyzeFileConflict(workflowFile, filePath);
        return await this.mergeFiles(workflowFile, filePath, conflict, outputConfig);
        
      case 'prompt':
        // For now, default to backup strategy when prompting is not available
        // In a real implementation, this would integrate with the prompt system
        return await this.backupAndOverwrite(workflowFile, filePath, outputConfig);
        
      default:
        throw new Error(`Unknown conflict resolution strategy: ${this.options.conflictResolution}`);
    }
  }

  /**
   * Create a new workflow file
   */
  private async createNewFile(
    workflowFile: WorkflowFile,
    filePath: string,
    outputConfig?: OutputConfig
  ): Promise<FileOperationResult> {
    if (this.options.dryRun) {
      this.logger.info('DRY RUN: Would create file', { filePath });
      return {
        success: true,
        filePath,
        action: 'created'
      };
    }

    // Validate permissions before writing
    if (this.options.validatePermissions) {
      await this.validateFilePermissions(path.dirname(filePath), 'write');
    }

    // Format content according to output config
    const formattedContent = this.formatFileContent(workflowFile.content, outputConfig);
    
    // Write the file
    await fs.writeFile(filePath, formattedContent, 'utf8');
    
    this.logger.info('Created new workflow file', {
      filePath,
      type: workflowFile.type,
      size: formattedContent.length
    });

    return {
      success: true,
      filePath,
      action: 'created'
    };
  }

  /**
   * Overwrite existing file
   */
  private async overwriteFile(
    workflowFile: WorkflowFile,
    filePath: string,
    outputConfig?: OutputConfig
  ): Promise<FileOperationResult> {
    if (this.options.dryRun) {
      this.logger.info('DRY RUN: Would overwrite file', { filePath });
      return {
        success: true,
        filePath,
        action: 'updated'
      };
    }

    // Check if file is readonly and handle accordingly
    await this.handleReadonlyFile(filePath);

    // Format content according to output config
    const formattedContent = this.formatFileContent(workflowFile.content, outputConfig);
    
    // Write the file
    await fs.writeFile(filePath, formattedContent, 'utf8');
    
    this.logger.info('Overwritten existing workflow file', {
      filePath,
      type: workflowFile.type,
      size: formattedContent.length
    });

    return {
      success: true,
      filePath,
      action: 'updated'
    };
  }

  /**
   * Create backup and overwrite file
   */
  private async backupAndOverwrite(
    workflowFile: WorkflowFile,
    filePath: string,
    outputConfig?: OutputConfig
  ): Promise<FileOperationResult> {
    let backupPath: string | undefined;

    try {
      // Create backup if not in dry-run mode
      if (!this.options.dryRun && this.options.createBackups) {
        backupPath = await this.createBackup(filePath);
      }

      // Overwrite the original file
      const overwriteResult = await this.overwriteFile(workflowFile, filePath, outputConfig);
      
      const result: FileOperationResult = {
        ...overwriteResult,
        action: 'backed-up'
      };
      
      if (backupPath) {
        result.backupPath = backupPath;
      }
      
      return result;

    } catch (error) {
      const cliError = this.createFileSystemError(
        'BACKUP_FAILED',
        `Failed to backup and overwrite file: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );

      return {
        success: false,
        filePath,
        action: 'skipped',
        error: cliError
      };
    }
  }

  /**
   * Merge files (basic implementation)
   */
  private async mergeFiles(
    workflowFile: WorkflowFile,
    filePath: string,
    conflict: FileConflict,
    outputConfig?: OutputConfig
  ): Promise<FileOperationResult> {
    if (!conflict.canMerge) {
      this.logger.warn('Files cannot be merged, falling back to backup strategy', { filePath });
      return await this.backupAndOverwrite(workflowFile, filePath, outputConfig);
    }

    if (this.options.dryRun) {
      this.logger.info('DRY RUN: Would merge files', { filePath });
      return {
        success: true,
        filePath,
        action: 'updated'
      };
    }

    // Simple merge strategy: append new content with separator
    const mergedContent = this.mergeWorkflowContent(conflict.existingContent, workflowFile.content);
    const formattedContent = this.formatFileContent(mergedContent, outputConfig);
    
    await fs.writeFile(filePath, formattedContent, 'utf8');
    
    this.logger.info('Merged workflow files', {
      filePath,
      originalSize: conflict.existingContent.length,
      newSize: formattedContent.length
    });

    return {
      success: true,
      filePath,
      action: 'updated'
    };
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;
    
    await fs.copyFile(filePath, backupPath);
    
    this.logger.info('Created backup file', {
      originalPath: filePath,
      backupPath
    });

    return backupPath;
  }

  /**
   * Analyze file conflict to determine merge possibility
   */
  private async analyzeFileConflict(
    workflowFile: WorkflowFile,
    filePath: string
  ): Promise<FileConflict> {
    const existingContent = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);
    
    // Simple heuristic: YAML files can potentially be merged if they don't have conflicting keys
    const canMerge = this.canMergeWorkflowFiles(existingContent, workflowFile.content);

    return {
      filePath,
      existingContent,
      newContent: workflowFile.content,
      lastModified: stats.mtime,
      size: stats.size,
      canMerge
    };
  }

  /**
   * Check if workflow files can be merged
   */
  private canMergeWorkflowFiles(existingContent: string, newContent: string): boolean {
    // Basic check: if both files are YAML and have different workflow names, they might be mergeable
    try {
      const existingHasName = /^name:\s*(.+)$/m.test(existingContent);
      const newHasName = /^name:\s*(.+)$/m.test(newContent);
      
      if (existingHasName && newHasName) {
        const existingName = existingContent.match(/^name:\s*(.+)$/m)?.[1]?.trim();
        const newName = newContent.match(/^name:\s*(.+)$/m)?.[1]?.trim();
        
        // Different workflow names suggest they can coexist
        return existingName !== newName;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Merge workflow content (basic implementation)
   */
  private mergeWorkflowContent(existingContent: string, newContent: string): string {
    // Simple merge: combine both workflows with a separator comment
    return `${existingContent}\n\n# --- Merged workflow content ---\n\n${newContent}`;
  }

  /**
   * Validate and prepare output directory
   */
  private async validateAndPrepareOutputDirectory(outputDirectory: string): Promise<string> {
    // Resolve and normalize the path
    const resolvedPath = path.resolve(outputDirectory);
    
    // Validate path security (prevent directory traversal)
    if (!this.isPathSafe(resolvedPath)) {
      throw new Error(`Unsafe output directory path: ${outputDirectory}`);
    }

    // Check if directory exists
    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error(`Output path is not a directory: ${resolvedPath}`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist, create it
        if (!this.options.dryRun) {
          await fs.mkdir(resolvedPath, { recursive: true });
          this.logger.info('Created output directory', { path: resolvedPath });
        } else {
          this.logger.info('DRY RUN: Would create output directory', { path: resolvedPath });
        }
      } else {
        throw error;
      }
    }

    // Validate permissions
    if (this.options.validatePermissions && !this.options.dryRun) {
      await this.validateFilePermissions(resolvedPath, 'write');
    }

    return resolvedPath;
  }

  /**
   * Check if a path is safe (no directory traversal)
   */
  private isPathSafe(targetPath: string): boolean {
    const resolved = path.resolve(targetPath);
    const cwd = process.cwd();
    
    // Allow paths within current working directory or absolute paths that don't traverse up
    return resolved.startsWith(cwd) || path.isAbsolute(resolved);
  }

  /**
   * Validate file permissions
   */
  private async validateFilePermissions(dirPath: string, operation: 'read' | 'write'): Promise<void> {
    try {
      await fs.access(dirPath, operation === 'write' ? fs.constants.W_OK : fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Insufficient ${operation} permissions for directory: ${dirPath}`);
    }
  }

  /**
   * Handle readonly files
   */
  private async handleReadonlyFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      // Check if file is readonly (no write permission for owner)
      if (!(stats.mode & 0o200)) {
        if (this.options.overwriteReadonly) {
          // Make file writable
          await fs.chmod(filePath, stats.mode | 0o200);
          this.logger.warn('Made readonly file writable', { filePath });
        } else {
          throw new Error(`File is readonly and overwriteReadonly is disabled: ${filePath}`);
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Format file content according to output configuration
   */
  private formatFileContent(content: string, outputConfig?: OutputConfig): string {
    if (!outputConfig) {
      return content;
    }

    let formattedContent = content;

    // Handle indentation
    if (outputConfig.indentation && outputConfig.indentation !== 2) {
      // Convert from 2-space to desired indentation
      const lines = content.split('\n');
      formattedContent = lines.map(line => {
        const match = line.match(/^(\s*)(.*)/);
        if (match) {
          const [, indent, rest] = match;
          const indentLevel = Math.floor((indent?.length || 0) / 2);
          const newIndent = ' '.repeat(indentLevel * outputConfig.indentation);
          return newIndent + rest;
        }
        return line;
      }).join('\n');
    }

    // Add metadata comment if requested
    if (outputConfig.includeMetadata) {
      const timestamp = new Date().toISOString();
      const metadataComment = `# Generated by readme-to-cicd on ${timestamp}\n# Do not edit this file manually\n\n`;
      formattedContent = metadataComment + formattedContent;
    }

    return formattedContent;
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Update result from file operation
   */
  private updateResultFromFileOperation(result: OutputResult, fileResult: FileOperationResult): void {
    if (fileResult.success) {
      result.generatedFiles.push(fileResult.filePath);
      
      switch (fileResult.action) {
        case 'created':
          result.filesCreated++;
          break;
        case 'updated':
          result.filesUpdated++;
          break;
        case 'skipped':
          result.filesSkipped++;
          break;
        case 'backed-up':
          result.filesUpdated++;
          result.backupsCreated++;
          if (fileResult.backupPath) {
            result.backupFiles.push(fileResult.backupPath);
          }
          break;
      }
    } else {
      if (fileResult.error) {
        result.errors.push(fileResult.error);
      }
      result.filesSkipped++;
    }
  }

  /**
   * Create file system error
   */
  private createFileSystemError(code: string, message: string, filePath?: string): CLIError {
    return {
      code,
      message,
      category: 'file-system',
      severity: 'error',
      suggestions: this.getErrorSuggestions(code, filePath),
      context: filePath ? { filePath } : undefined
    };
  }

  /**
   * Get error suggestions based on error code
   */
  private getErrorSuggestions(code: string, filePath?: string): string[] {
    switch (code) {
      case 'OUTPUT_DIRECTORY_ERROR':
        return [
          'Check if the output directory path is valid',
          'Ensure you have write permissions to the parent directory',
          'Try using an absolute path for the output directory'
        ];
      
      case 'FILE_WRITE_ERROR':
        return [
          'Check if you have write permissions to the target directory',
          'Ensure the file is not currently open in another application',
          'Verify there is sufficient disk space available'
        ];
      
      case 'BACKUP_FAILED':
        return [
          'Check if you have write permissions to create backup files',
          'Ensure there is sufficient disk space for backups',
          'Consider disabling backup creation if not needed'
        ];
      
      default:
        return [
          'Check file and directory permissions',
          'Ensure sufficient disk space is available',
          'Try running with elevated permissions if necessary'
        ];
    }
  }

  /**
   * Get current options
   */
  getOptions(): OutputHandlerOptions {
    return { ...this.options };
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<OutputHandlerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.logger.debug('Updated output handler options', { options: this.options });
  }

  /**
   * Validate output directory without creating it
   */
  async validateOutputDirectory(outputDirectory: string): Promise<{
    valid: boolean;
    exists: boolean;
    writable: boolean;
    errors: string[];
  }> {
    const result = {
      valid: true,
      exists: false,
      writable: false,
      errors: [] as string[]
    };

    try {
      const resolvedPath = path.resolve(outputDirectory);
      
      // Check path safety
      if (!this.isPathSafe(resolvedPath)) {
        result.valid = false;
        result.errors.push(`Unsafe output directory path: ${outputDirectory}`);
        return result;
      }

      // Check if directory exists
      try {
        const stats = await fs.stat(resolvedPath);
        result.exists = true;
        
        if (!stats.isDirectory()) {
          result.valid = false;
          result.errors.push(`Output path is not a directory: ${resolvedPath}`);
          return result;
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          result.valid = false;
          result.errors.push(`Cannot access output directory: ${error.message}`);
          return result;
        }
      }

      // Check write permissions
      if (result.exists) {
        try {
          await fs.access(resolvedPath, fs.constants.W_OK);
          result.writable = true;
        } catch {
          result.errors.push(`No write permission for directory: ${resolvedPath}`);
        }
      } else {
        // Check if parent directory is writable
        const parentDir = path.dirname(resolvedPath);
        try {
          await fs.access(parentDir, fs.constants.W_OK);
          result.writable = true;
        } catch {
          result.errors.push(`No write permission for parent directory: ${parentDir}`);
        }
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Directory validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}