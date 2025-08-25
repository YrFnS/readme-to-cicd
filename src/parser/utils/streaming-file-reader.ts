/**
 * Streaming File Reader - Handles large files with streaming support
 */

import { createReadStream, promises as fs, constants as fsConstants } from 'fs';
import { resolve, isAbsolute } from 'path';
import { Readable } from 'stream';
import { ParseError, Result } from '../types';
import { FileReadResult } from './file-reader';

// Import Node.js types
type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';

/**
 * Streaming read options
 */
export interface StreamingOptions {
  chunkSize?: number;        // Size of each chunk in bytes
  encoding?: BufferEncoding; // Text encoding
  maxSize?: number;          // Maximum file size to process
  timeout?: number;          // Timeout in milliseconds
}

/**
 * Streaming read result with additional metadata
 */
export interface StreamingReadResult extends FileReadResult {
  chunksRead: number;
  streamingTime: number;
  peakMemoryUsage: number;
}

/**
 * Progress callback for streaming operations
 */
export type ProgressCallback = (bytesRead: number, totalBytes: number, progress: number) => void;

/**
 * Streaming File Reader for handling large README files
 */
export class StreamingFileReader {
  private static readonly DEFAULT_CHUNK_SIZE = 64 * 1024; // 64KB
  private static readonly DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Read a file using streaming for large files
   */
  async readFileStreaming(
    filePath: string,
    options: StreamingOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<Result<StreamingReadResult, ParseError>> {
    const startTime = Date.now();
    let peakMemoryUsage = 0;

    try {
      // Validate and normalize path
      const validationResult = this.validateInput(filePath, options);
      if (!validationResult.success) {
        return {
          success: false,
          error: 'error' in validationResult ? validationResult.error : {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            component: 'StreamingFileReader',
            severity: 'error' as const
          }
        };
      }

      const normalizedPath = this.normalizePath(filePath);
      const config = this.getConfig(options);

      // Check file accessibility and get stats
      const fileStats = await this.getFileStats(normalizedPath);
      if (!fileStats.success) {
        return {
          success: false,
          error: 'error' in fileStats ? fileStats.error : {
            code: 'FILE_STATS_ERROR',
            message: 'File stats failed',
            component: 'StreamingFileReader',
            severity: 'error' as const
          }
        };
      }

      const { size: fileSize } = fileStats.data;

      // Check if file is too large
      if (fileSize > config.maxSize) {
        return {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size (${fileSize} bytes) exceeds maximum allowed size (${config.maxSize} bytes)`,
            component: 'StreamingFileReader',
            severity: 'error'
          }
        };
      }

      // Decide whether to use streaming or regular read
      const useStreaming = fileSize > config.chunkSize * 2; // Use streaming for files larger than 2 chunks

      if (!useStreaming) {
        // For small files, use regular read
        return this.readFileRegular(normalizedPath, config.encoding, fileSize);
      }

      // Stream the file
      const streamResult = await this.streamFile(
        normalizedPath,
        fileSize,
        config,
        progressCallback
      );

      if (!streamResult.success) {
        return {
          success: false,
          error: 'error' in streamResult ? streamResult.error : {
            code: 'STREAM_ERROR',
            message: 'Stream failed',
            component: 'StreamingFileReader',
            severity: 'error' as const
          }
        };
      }

      const { content, chunksRead, memoryPeak } = streamResult.data;
      peakMemoryUsage = memoryPeak;

      // Validate content
      const contentValidation = this.validateContent(content);
      if (!contentValidation.success) {
        return {
          success: false,
          error: 'error' in contentValidation ? contentValidation.error : {
            code: 'CONTENT_VALIDATION_ERROR',
            message: 'Content validation failed',
            component: 'StreamingFileReader',
            severity: 'error' as const
          }
        };
      }

      const streamingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          content,
          filePath: normalizedPath,
          size: fileSize,
          encoding: config.encoding,
          chunksRead,
          streamingTime,
          peakMemoryUsage
        }
      };

    } catch (error) {
      return this.handleStreamingError(error, filePath);
    }
  }

  /**
   * Check if a file should be read using streaming
   */
  async shouldUseStreaming(filePath: string, chunkSize: number = StreamingFileReader.DEFAULT_CHUNK_SIZE): Promise<boolean> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const stats = await fs.stat(normalizedPath);
      return stats.size > chunkSize * 2;
    } catch {
      return false;
    }
  }

  /**
   * Get file size without reading content
   */
  async getFileSize(filePath: string): Promise<Result<number, ParseError>> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const stats = await fs.stat(normalizedPath);
      return { success: true, data: stats.size };
    } catch (error) {
      return this.handleStreamingError(error, filePath);
    }
  }

  /**
   * Stream file content in chunks
   */
  private async streamFile(
    filePath: string,
    fileSize: number,
    config: Required<StreamingOptions>,
    progressCallback?: ProgressCallback
  ): Promise<Result<{ content: string; chunksRead: number; memoryPeak: number }, ParseError>> {
    return new Promise((resolve) => {
      let content = '';
      let bytesRead = 0;
      let chunksRead = 0;
      let memoryPeak = 0;
      let timeoutHandle: NodeJS.Timeout;

      const stream = createReadStream(filePath, {
        encoding: config.encoding,
        highWaterMark: config.chunkSize
      });

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        stream.destroy();
        resolve({
          success: false,
          error: {
            code: 'STREAM_TIMEOUT',
            message: `Streaming timeout after ${config.timeout}ms`,
            component: 'StreamingFileReader',
            severity: 'error'
          }
        });
      }, config.timeout);

      stream.on('data', (chunk: string | Buffer) => {
        const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString(config.encoding);
        content += chunkStr;
        bytesRead += Buffer.byteLength(chunkStr, config.encoding);
        chunksRead++;

        // Track memory usage
        const currentMemory = process.memoryUsage().heapUsed;
        if (currentMemory > memoryPeak) {
          memoryPeak = currentMemory;
        }

        // Call progress callback
        if (progressCallback) {
          const progress = fileSize > 0 ? bytesRead / fileSize : 0;
          progressCallback(bytesRead, fileSize, progress);
        }

        // Check if we've exceeded max size during streaming
        if (bytesRead > config.maxSize) {
          stream.destroy();
          resolve({
            success: false,
            error: {
              code: 'CONTENT_TOO_LARGE',
              message: `Content size exceeded maximum during streaming (${bytesRead} > ${config.maxSize})`,
              component: 'StreamingFileReader',
              severity: 'error'
            }
          });
          return;
        }
      });

      stream.on('end', () => {
        clearTimeout(timeoutHandle);
        resolve({
          success: true,
          data: { content, chunksRead, memoryPeak }
        });
      });

      stream.on('error', (error) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          error: {
            code: 'STREAM_ERROR',
            message: `Streaming error: ${error.message}`,
            component: 'StreamingFileReader',
            severity: 'error',
            details: { originalError: error.message }
          }
        });
      });
    });
  }

  /**
   * Read file using regular fs.readFile for small files
   */
  private async readFileRegular(
    filePath: string,
    encoding: BufferEncoding,
    fileSize: number
  ): Promise<Result<StreamingReadResult, ParseError>> {
    try {
      const content = await fs.readFile(filePath, encoding);
      
      return {
        success: true,
        data: {
          content,
          filePath,
          size: fileSize,
          encoding,
          chunksRead: 1,
          streamingTime: 0,
          peakMemoryUsage: process.memoryUsage().heapUsed
        }
      };
    } catch (error) {
      return this.handleStreamingError(error, filePath);
    }
  }

  /**
   * Get file stats with error handling
   */
  private async getFileStats(filePath: string): Promise<Result<{ size: number }, ParseError>> {
    try {
      await fs.access(filePath, fsConstants.F_OK | fsConstants.R_OK);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        return {
          success: false,
          error: {
            code: 'IS_DIRECTORY',
            message: `Path is a directory, not a file: ${filePath}`,
            component: 'StreamingFileReader',
            severity: 'error'
          }
        };
      }

      return { success: true, data: { size: stats.size } };
    } catch (error) {
      return this.handleStreamingError(error, filePath);
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(
    filePath: string,
    options: StreamingOptions
  ): Result<void, ParseError> {
    if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'File path is required and must be a non-empty string',
          component: 'StreamingFileReader',
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
          component: 'StreamingFileReader',
          severity: 'error'
        }
      };
    }

    // Validate options
    if (options.chunkSize !== undefined && (options.chunkSize <= 0 || options.chunkSize > 10 * 1024 * 1024)) {
      return {
        success: false,
        error: {
          code: 'INVALID_CHUNK_SIZE',
          message: 'Chunk size must be between 1 byte and 10MB',
          component: 'StreamingFileReader',
          severity: 'error'
        }
      };
    }

    if (options.timeout !== undefined && options.timeout <= 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_TIMEOUT',
          message: 'Timeout must be greater than 0',
          component: 'StreamingFileReader',
          severity: 'error'
        }
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Get configuration with defaults
   */
  private getConfig(options: StreamingOptions): Required<StreamingOptions> {
    return {
      chunkSize: options.chunkSize ?? StreamingFileReader.DEFAULT_CHUNK_SIZE,
      encoding: options.encoding ?? 'utf8',
      maxSize: options.maxSize ?? StreamingFileReader.DEFAULT_MAX_SIZE,
      timeout: options.timeout ?? StreamingFileReader.DEFAULT_TIMEOUT
    };
  }

  /**
   * Normalize file path
   */
  private normalizePath(filePath: string): string {
    if (!isAbsolute(filePath)) {
      return resolve(process.cwd(), filePath);
    }
    return resolve(filePath);
  }

  /**
   * Validate content after reading
   */
  private validateContent(content: string): Result<void, ParseError> {
    if (typeof content !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'File content must be a string',
          component: 'StreamingFileReader',
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
          component: 'StreamingFileReader',
          severity: 'error'
        }
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Handle streaming errors
   */
  private handleStreamingError(error: unknown, filePath: string): Result<any, ParseError> {
    if (error instanceof Error) {
      let code = 'STREAMING_ERROR';
      let message = error.message;

      if (error.message.includes('ENOENT')) {
        code = 'FILE_NOT_FOUND';
        message = `File does not exist: ${filePath}`;
      } else if (error.message.includes('EACCES')) {
        code = 'PERMISSION_DENIED';
        message = `Permission denied accessing file: ${filePath}`;
      } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
        code = 'TOO_MANY_FILES';
        message = 'Too many open files';
      }

      return {
        success: false,
        error: {
          code,
          message,
          component: 'StreamingFileReader',
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
        message: 'An unknown error occurred during streaming',
        component: 'StreamingFileReader',
        severity: 'error',
        details: { filePath }
      }
    };
  }
}

/**
 * Create a readable stream from string content (useful for testing)
 */
export function createContentStream(content: string, chunkSize: number = 1024): Readable {
  let position = 0;
  
  return new Readable({
    read() {
      if (position >= content.length) {
        this.push(null); // End of stream
        return;
      }

      const chunk = content.slice(position, position + chunkSize);
      position += chunkSize;
      this.push(chunk);
    }
  });
}