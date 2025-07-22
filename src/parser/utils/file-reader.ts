/**
 * FileReader utility for reading README files with comprehensive error handling
 */

import { promises as fs } from 'fs';
import { resolve, isAbsolute } from 'path';
import { ParseError, Result } from '../types';

/**
 * File reading options
 */
export interface FileReadOptions {
  encoding?: BufferEncoding;
  maxSize?: number; // Maximum file size in bytes
  timeout?: number; // Timeout in milliseconds
}

/**
 * File reading result
 */
export interface FileReadResult {
  content: string;
  filePath: string;
  size: number;
  encoding: BufferEncoding;
}

/**
 * FileReader class with async file reading and comprehensive error handling
 */
export class FileReader {
  private static readonly DEFAULT_ENCODING: BufferEncoding = 'utf-8';
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds

  /**
   * Read a file with comprehensive error handling and validation
   */
  static async readFile(
    filePath: string, 
    options: FileReadOptions = {}
  ): Promise<Result<FileReadResult, ParseError>> {
    const {
      encoding = FileReader.DEFAULT_ENCODING,
      maxSize = FileReader.DEFAULT_MAX_SIZE,
      timeout = FileReader.DEFAULT_TIMEOUT
    } = options;

    try {
      // Validate input parameters
      const validationResult = FileReader.validateInput(filePath, options);
      if (!validationResult.success) {
        return validationResult;
      }

      // Resolve and normalize file path
      const resolvedPath = FileReader.resolvePath(filePath);

      // Check file accessibility and get stats
      const statsResult = await FileReader.getFileStats(resolvedPath, timeout);
      if (!statsResult.success) {
        return statsResult;
      }

      const stats = statsResult.data;

      // Validate file size
      if (stats.size > maxSize) {
        return {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size (${stats.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
            component: 'FileReader',
            severity: 'error',
            details: { filePath: resolvedPath, size: stats.size, maxSize }
          }
        };
      }

      // Read file content with timeout
      const content = await FileReader.readFileWithTimeout(resolvedPath, encoding, timeout);

      // Validate content encoding
      const encodingValidation = FileReader.validateEncoding(content, encoding);
      if (!encodingValidation.success) {
        return encodingValidation;
      }

      return {
        success: true,
        data: {
          content,
          filePath: resolvedPath,
          size: stats.size,
          encoding
        }
      };

    } catch (error) {
      return FileReader.handleUnexpectedError(error, filePath);
    }
  }

  /**
   * Validate input parameters
   */
  private static validateInput(
    filePath: string, 
    options: FileReadOptions
  ): Result<void, ParseError> {
    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_FILE_PATH',
          message: 'File path is required and must be a non-empty string',
          component: 'FileReader',
          severity: 'error',
          details: { filePath }
        }
      };
    }

    if (filePath.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_FILE_PATH',
          message: 'File path cannot be empty or whitespace only',
          component: 'FileReader',
          severity: 'error',
          details: { filePath }
        }
      };
    }

    // Validate options
    if (options.maxSize !== undefined && (options.maxSize <= 0 || !Number.isInteger(options.maxSize))) {
      return {
        success: false,
        error: {
          code: 'INVALID_MAX_SIZE',
          message: 'maxSize must be a positive integer',
          component: 'FileReader',
          severity: 'error',
          details: { maxSize: options.maxSize }
        }
      };
    }

    if (options.timeout !== undefined && (options.timeout <= 0 || !Number.isInteger(options.timeout))) {
      return {
        success: false,
        error: {
          code: 'INVALID_TIMEOUT',
          message: 'timeout must be a positive integer',
          component: 'FileReader',
          severity: 'error',
          details: { timeout: options.timeout }
        }
      };
    }

    return { success: true, data: undefined };
  }