/**
 * Workflow Writer Implementation
 * 
 * Handles writing workflow files to the file system with proper directory validation
 * and error handling for file system operations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorkflowFile {
  name: string;
  content: string;
  path: string;
}

export class WorkflowWriterError extends Error {
  constructor(message: string, public readonly operation: string, public readonly cause?: Error) {
    super(`WorkflowWriter ${operation} failed: ${message}`);
    this.name = 'WorkflowWriterError';
  }
}

export class WorkflowWriter {
  /**
   * Writes workflow files to the specified output directory
   * @param workflows Array of workflow files to write
   * @param outputDir Base output directory
   */
  async writeWorkflowFiles(workflows: WorkflowFile[], outputDir: string): Promise<void> {
    if (!workflows || workflows.length === 0) {
      throw new WorkflowWriterError('No workflows provided', 'validation');
    }

    if (!outputDir || typeof outputDir !== 'string') {
      throw new WorkflowWriterError('Invalid output directory', 'validation');
    }

    try {
      // Validate and ensure output directory exists
      await this.ensureDirectoryExists(outputDir);

      // Write each workflow file
      for (const workflow of workflows) {
        await this.writeWorkflowFile(workflow, outputDir);
      }
    } catch (error) {
      if (error instanceof WorkflowWriterError) {
        throw error;
      }
      throw new WorkflowWriterError(
        `Failed to write workflow files: ${error instanceof Error ? error.message : String(error)}`,
        'write',
        error as Error
      );
    }
  }

  /**
   * Writes a single workflow file to the file system
   * @param workflow The workflow file to write
   * @param outputDir Base output directory
   */
  private async writeWorkflowFile(workflow: WorkflowFile, outputDir: string): Promise<void> {
    this.validateWorkflowFile(workflow);

    const workflowDir = path.join(outputDir, workflow.path);
    const fullPath = path.join(workflowDir, workflow.name);

    try {
      // Ensure the workflow directory exists
      await this.ensureDirectoryExists(workflowDir);

      // Write the workflow file
      await fs.writeFile(fullPath, workflow.content, 'utf8');
    } catch (error) {
      throw new WorkflowWriterError(
        `Failed to write workflow file ${workflow.name}: ${error instanceof Error ? error.message : String(error)}`,
        'write-file',
        error as Error
      );
    }
  }

  /**
   * Validates a workflow file structure
   * @param workflow The workflow file to validate
   */
  private validateWorkflowFile(workflow: WorkflowFile): void {
    if (!workflow) {
      throw new WorkflowWriterError('Workflow file is null or undefined', 'validation');
    }

    if (!workflow.name || typeof workflow.name !== 'string') {
      throw new WorkflowWriterError('Workflow file name is required and must be a string', 'validation');
    }

    if (!workflow.content || typeof workflow.content !== 'string') {
      throw new WorkflowWriterError('Workflow file content is required and must be a string', 'validation');
    }

    if (!workflow.path || typeof workflow.path !== 'string') {
      throw new WorkflowWriterError('Workflow file path is required and must be a string', 'validation');
    }

    // Validate file name doesn't contain invalid characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(workflow.name)) {
      throw new WorkflowWriterError(
        `Workflow file name contains invalid characters: ${workflow.name}`,
        'validation'
      );
    }

    // Ensure path doesn't contain directory traversal attempts
    const normalizedPath = path.normalize(workflow.path);
    if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
      throw new WorkflowWriterError(
        `Workflow path contains invalid directory traversal: ${workflow.path}`,
        'validation'
      );
    }
  }

  /**
   * Ensures a directory exists, creating it if necessary
   * @param directory The directory path to ensure exists
   */
  private async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await fs.access(directory);
    } catch (error) {
      // Directory doesn't exist, create it
      try {
        await fs.mkdir(directory, { recursive: true });
      } catch (mkdirError) {
        throw new WorkflowWriterError(
          `Failed to create directory ${directory}: ${mkdirError instanceof Error ? mkdirError.message : String(mkdirError)}`,
          'mkdir',
          mkdirError as Error
        );
      }
    }
  }
}

/**
 * Convenience function to write workflow files
 * @param workflows Array of workflow files to write
 * @param outputDir Base output directory
 */
export async function writeWorkflowFiles(workflows: WorkflowFile[], outputDir: string): Promise<void> {
  const writer = new WorkflowWriter();
  await writer.writeWorkflowFiles(workflows, outputDir);
}