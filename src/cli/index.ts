/**
 * CLI Tool Main Export
 * 
 * Exports the main CLI components for use by other parts of the system.
 * This module provides access to all CLI functionality including workflow writing,
 * options management, and directory validation.
 */

// Core CLI Components
export { CLIApplication } from './lib/cli-application';
export { CommandParser } from './lib/command-parser';
export { ComponentOrchestrator } from './lib/component-orchestrator';
export { Logger } from './lib/logger';
export { ErrorHandler } from './lib/error-handler';
export { CIEnvironmentDetector, MachineOutputFormatter, CIExitCodeManager } from './lib/ci-environment';
export * from './lib/types';
export { DEFAULT_CONFIG } from './config/default-config';

// Workflow Writing Functionality
/**
 * WorkflowWriter class for writing workflow files to the file system
 * @see {@link WorkflowWriter}
 */
export { WorkflowWriter } from './workflow-writer';

/**
 * Error class for workflow writing operations
 * @see {@link WorkflowWriterError}
 */
export { WorkflowWriterError } from './workflow-writer';

/**
 * Convenience function to write workflow files to a specified directory
 * @param workflows - Array of workflow files to write
 * @param outputDir - Base output directory where workflows will be written
 * @returns Promise that resolves when all workflows are written
 * @throws {WorkflowWriterError} When workflow writing fails
 * @example
 * ```typescript
 * const workflows = [
 *   { name: 'ci.yml', content: 'name: CI\n...', path: '.github/workflows' }
 * ];
 * await writeWorkflowFiles(workflows, './output');
 * ```
 */
export { writeWorkflowFiles } from './workflow-writer';

/**
 * TypeScript interface for workflow file structure
 * @see {@link WorkflowFile}
 */
export { type WorkflowFile } from './workflow-writer';

// Options Management Functionality
/**
 * OptionsManager class for managing CLI configuration options
 * @see {@link OptionsManager}
 */
export { OptionsManager } from './options-manager';

/**
 * Convenience function to update CLI configuration options
 * @param options - Partial CLI options to update
 * @param config - Optional configuration for the options manager
 * @returns Promise that resolves when options are updated and persisted
 * @throws {OptionsManagerError} When option updates fail
 * @example
 * ```typescript
 * await updateOptions({ 
 *   verbose: true, 
 *   outputDir: './custom-output' 
 * });
 * ```
 */
export { updateOptions } from './options-manager';

// Directory Validation Functionality
/**
 * DirectoryValidator class for validating output directories
 * @see {@link DirectoryValidator}
 */
export { DirectoryValidator } from './directory-validator';

/**
 * Convenience function to validate an output directory
 * @param directory - The directory path to validate
 * @returns Promise<ValidationResult> with validation results including errors and warnings
 * @throws Never throws - all validation errors are returned in the result object
 * @example
 * ```typescript
 * const result = await validateOutputDirectory('./output');
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Validation warnings:', result.warnings);
 * }
 * ```
 */
export { validateOutputDirectory } from './directory-validator';

/**
 * TypeScript interface for directory validation results
 * @see {@link ValidationResult}
 */
export { type ValidationResult } from './directory-validator';