/**
 * FileReader - Handles async file reading with comprehensive error handling
 */

import { promises as fs, constants as fsConstants } from 'fs';
import { resolve, isAbsolute } from 'path';
import { ParseError, Result } from '../types';

/**
 * Custom error class for file reading operations
 */
export class FileReadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly filePath: string,
    public readonly originalError?: Error
  ) {
    super(`File read failed for ${filePath}: ${message}`);
    this.name = 'FileReadError';
  }
}

/**
 * File reading result with metadata
 */
export interface FileReadResult {
  content: string;
  filePath: string;
  size: number;
  encoding: string;
}

/**
 * FileReader class with robust error handling and validation
 */
export class FileReader {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly SUPPORTED_ENCODINGS = ['utf8', 'utf-8', 'ascii'] as const;
  
  /**
   * Read a file with comprehensive error handling
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<Result<FileReadResult, ParseError>> {
    try {
      // Validate input parameters
      const validationResult = this.validateInput(filePath, encoding);
      if (!validationResult.success) {
        return validationResult;
      }

      const normalizedPath = this.normalizePath(filePath);
      
      // Check file accessibility
      try {
        await fs.access(normalizedPath, fsConstants.F_OK | fsConstants.R_OK);
      } catch (error) {
        return this.handleAccessError(error, normalizedPath);
      }

      // Get file stats for size validation
      let stats;
      try {
        stats = await fs.stat(normalizedPath);
      } catch (error) {
        return this.handleStatError(error, normalizedPath);
      }
      
      if (stats.size > FileReader.MAX_FILE_SIZE) {
        return {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size (${stats.size} bytes) exceeds maximum allowed size (${FileReader.MAX_FILE_SIZE} bytes)`,
            component: 'FileReader',
            severity: 'error'
          }
        };
      }

      // Read file content
      let content;
      try {
        content = await fs.readFile(normalizedPath, encoding);
      } catch (error) {
        return this.handleReadError(error, normalizedPath);
      }
      
      // Validate content encoding
      const contentValidation = this.validateContent(content);
      if (!contentValidation.success) {
        return contentValidation;
      }

      return {
        success: true,
        data: {
          content,
          filePath: normalizedPath,
          size: stats.size,
          encoding
        }
      };

    } catch (error) {
      return this.handleFileError(error, filePath);
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(filePath: string, encoding: BufferEncoding): Result<void, ParseError> {
    if (!filePath || typeof filePath !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'File path is required and must be a non-empty string',
          component: 'FileReader',
          severity: 'error'
        }
      };
    }

    if (filePath.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_PATH',
          message: 'File path cannot be empty or whitespace only',
          component: 'FileReader',
          severity: 'error'
        }
      };
    }

    // Check for path traversal attempts
    if (filePath.includes('..') || filePath.includes('~')) {
      return {
        success: false,
        error: {
          code: 'UNSAFE_PATH',
          message: 'File path contains potentially unsafe characters (.. or ~)',
          component: 'FileReader',
          severity: 'error'
        }
      };
    }

    if (!FileReader.SUPPORTED_ENCODINGS.includes(encoding as any)) {
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_ENCODING',
          message: `Encoding '${encoding}' is not supported. Supported encodings: ${FileReader.SUPPORTED_ENCODINGS.join(', ')}`,
          component: 'FileReader',
          severity: 'error'
        }
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Normalize file path for consistent handling
   */
  private normalizePath(filePath: string): string {
    // Convert to absolute path if relative
    if (!isAbsolute(filePath)) {
      return resolve(process.cwd(), filePath);
    }
    return resolve(filePath);
  }

  /**
   * Handle file access errors
   */
  private handleAccessError(error: unknown, filePath: string): Result<FileReadResult, ParseError> {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `File does not exist: ${filePath}`,
            component: 'FileReader',
            severity: 'error'
          }
        };
      }
      if (error.message.includes('EACCES')) {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Permission denied accessing file: ${filePath}`,
            component: 'FileReader',
            severity: 'error'
          }
        };
      }
    }
    return {
      success: false,
      error: {
        code: 'ACCESS_ERROR',
        message: `Cannot access file: ${filePath}`,
        component: 'FileReader',
        severity: 'error'
      }
    };
  }

  /**
   * Handle file stat errors
   */
  private handleStatError(error: unknown, filePath: string): Result<FileReadResult, ParseError> {
    if (error instanceof Error) {
      if (error.message.includes('EISDIR')) {
        return {
          success: false,
          error: {
            code: 'IS_DIRECTORY',
            message: `Path is a directory, not a file: ${filePath}`,
            component: 'FileReader',
            severity: 'error'
          }
        };
      }
      if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
        return {
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Too many open files',
            component: 'FileReader',
            severity: 'error'
          }
        };
      }
      if (error.message.includes('ENOSPC')) {
        return {
          success: false,
          error: {
            code: 'NO_SPACE',
            message: 'No space left on device',
            component: 'FileReader',
            severity: 'error'
          }
        };
      }
    }
    return this.handleFileError(error, filePath);
  }

  /**
   * Handle file read errors
   */
  private handleReadError(error: unknown, filePath: string): Result<FileReadResult, ParseError> {
    return this.handleFileError(error, filePath);
  }

  /**
   * Validate file content
   */
  private validateContent(content: string): Result<void, ParseError> {
    if (typeof content !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'File content must be a string',
          component: 'FileReader',
          severity: 'error'
        }
      };
    }

    // Check for null bytes which might indicate binary content
    if (content.includes('\0')) {
      return {
        success: false,
        error: {
          code: 'BINARY_CONTENT',
          message: 'File appears to contain binary data (null bytes detected)',
          component: 'FileReader',
          severity: 'error'
        }
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Handle file system errors with detailed error information
   */
  private handleFileError(error: unknown, filePath: string): Result<FileReadResult, ParseError> {
    if (error instanceof Error) {
      return {
        success: false,
        error: {
          code: 'FILE_READ_ERROR',
          message: error.message,
          component: 'FileReader',
          severity: 'error',
          details: {
            originalError: error.message,
            filePath
          }
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred while reading the file',
        component: 'FileReader',
        severity: 'error',
        details: { filePath }
      }
    };
  }
}