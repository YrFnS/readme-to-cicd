/**
 * Directory Validator
 * 
 * Validates output directories for CLI operations.
 * Checks directory access, permissions, and provides warnings for non-empty directories.
 */

import { promises as fs, constants as fsConstants } from 'fs';
import * as path from 'path';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DirectoryValidator {
  /**
   * Validates an output directory for CLI operations
   * @param directory - The directory path to validate
   * @returns Promise<ValidationResult> - Validation result with errors and warnings
   */
  async validateOutputDirectory(directory: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Normalize the directory path
      const normalizedDirectory = path.resolve(directory);

      // Check if directory exists
      await fs.access(normalizedDirectory);

      // Check if directory is writable
      await fs.access(normalizedDirectory, fsConstants.W_OK);

      // Check if directory is empty (warning, not error)
      const files = await fs.readdir(normalizedDirectory);
      if (files.length > 0) {
        result.warnings.push(`Directory ${normalizedDirectory} is not empty`);
      }

    } catch (error: any) {
      result.isValid = false;
      
      if (error.code === 'ENOENT') {
        result.errors.push(`Directory ${directory} does not exist`);
      } else if (error.code === 'EACCES') {
        result.errors.push(`Directory ${directory} is not writable`);
      } else {
        result.errors.push(`Cannot access directory ${directory}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Validates multiple directories at once
   * @param directories - Array of directory paths to validate
   * @returns Promise<Record<string, ValidationResult>> - Map of directory paths to validation results
   */
  async validateMultipleDirectories(directories: string[]): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};

    await Promise.all(
      directories.map(async (directory) => {
        results[directory] = await this.validateOutputDirectory(directory);
      })
    );

    return results;
  }

  /**
   * Creates a directory if it doesn't exist and validates it
   * @param directory - The directory path to create and validate
   * @returns Promise<ValidationResult> - Validation result after creation attempt
   */
  async createAndValidateDirectory(directory: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const normalizedDirectory = path.resolve(directory);
      
      // Try to create the directory if it doesn't exist
      await fs.mkdir(normalizedDirectory, { recursive: true });
      
      // Now validate the created directory
      const validationResult = await this.validateOutputDirectory(normalizedDirectory);
      
      // Merge results
      result.isValid = validationResult.isValid;
      result.errors = validationResult.errors;
      result.warnings = validationResult.warnings;

    } catch (error: any) {
      result.isValid = false;
      result.errors.push(`Failed to create directory ${directory}: ${error.message}`);
    }

    return result;
  }
}

// Export a default instance for convenience
export const directoryValidator = new DirectoryValidator();

// Export the validateOutputDirectory function for backward compatibility
export async function validateOutputDirectory(directory: string): Promise<ValidationResult> {
  return directoryValidator.validateOutputDirectory(directory);
}