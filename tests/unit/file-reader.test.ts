/**
 * Unit tests for FileReader class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { FileReader, FileReadError } from '../../src/parser/utils/file-reader';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    stat: vi.fn(),
    access: vi.fn()
  },
  constants: {
    F_OK: 0,
    R_OK: 4
  }
}));

describe('FileReader', () => {
  let fileReader: FileReader;
  const mockFs = fs as any;

  beforeEach(() => {
    fileReader = new FileReader();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('readFile', () => {
    it('should successfully read a valid file', async () => {
      const mockContent = '# Test README\n\nThis is a test.';
      const mockStats = { size: mockContent.length };
      
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await fileReader.readFile('test.md');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(mockContent);
        expect(result.data.size).toBe(mockContent.length);
        expect(result.data.encoding).toBe('utf8');
        expect(result.data.filePath).toContain('test.md');
      }
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      mockFs.access.mockRejectedValue(error);

      const result = await fileReader.readFile('nonexistent.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FILE_NOT_FOUND');
        expect(result.error.message).toContain('File does not exist');
        expect(result.error.component).toBe('FileReader');
      }
    });

    it('should handle permission denied error', async () => {
      const error = new Error('EACCES: permission denied');
      mockFs.access.mockRejectedValue(error);

      const result = await fileReader.readFile('restricted.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
        expect(result.error.message).toContain('Permission denied');
      }
    });

    it('should reject invalid file path', async () => {
      const result = await fileReader.readFile('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_PATH');
        expect(result.error.message).toContain('required and must be a non-empty string');
      }
    });

    it('should reject null or undefined file path', async () => {
      const result1 = await fileReader.readFile(null as any);
      const result2 = await fileReader.readFile(undefined as any);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      
      if (!result1.success) {
        expect(result1.error.code).toBe('INVALID_PATH');
      }
      if (!result2.success) {
        expect(result2.error.code).toBe('INVALID_PATH');
      }
    });

    it('should reject unsafe file paths with path traversal', async () => {
      const result1 = await fileReader.readFile('../../../etc/passwd');
      const result2 = await fileReader.readFile('~/secret.txt');

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      
      if (!result1.success) {
        expect(result1.error.code).toBe('UNSAFE_PATH');
      }
      if (!result2.success) {
        expect(result2.error.code).toBe('UNSAFE_PATH');
      }
    });

    it('should reject unsupported encoding', async () => {
      const result = await fileReader.readFile('test.md', 'binary' as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNSUPPORTED_ENCODING');
        expect(result.error.message).toContain('not supported');
      }
    });

    it('should handle file too large error', async () => {
      const largeSize = 11 * 1024 * 1024; // 11MB (exceeds 10MB limit)
      const mockStats = { size: largeSize };
      
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats);

      const result = await fileReader.readFile('large.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FILE_TOO_LARGE');
        expect(result.error.message).toContain('exceeds maximum allowed size');
      }
    });

    it('should handle binary content detection', async () => {
      const binaryContent = 'Hello\0World'; // Contains null byte
      const mockStats = { size: binaryContent.length };
      
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue(binaryContent);

      const result = await fileReader.readFile('binary.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BINARY_CONTENT');
        expect(result.error.message).toContain('binary data');
      }
    });

    it('should handle directory instead of file error', async () => {
      const error = new Error('EISDIR: illegal operation on a directory');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockRejectedValue(error);

      const result = await fileReader.readFile('directory');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('IS_DIRECTORY');
        expect(result.error.message).toContain('directory, not a file');
      }
    });

    it('should handle too many open files error', async () => {
      const error = new Error('EMFILE: too many open files');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockRejectedValue(error);

      const result = await fileReader.readFile('test.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOO_MANY_FILES');
        expect(result.error.message).toContain('Too many open files');
      }
    });

    it('should handle no space left on device error', async () => {
      const error = new Error('ENOSPC: no space left on device');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockRejectedValue(error);

      const result = await fileReader.readFile('test.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NO_SPACE');
        expect(result.error.message).toContain('No space left');
      }
    });

    it('should handle unknown errors gracefully', async () => {
      const error = new Error('Unknown filesystem error');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockRejectedValue(error);

      const result = await fileReader.readFile('test.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FILE_READ_ERROR');
        expect(result.error.component).toBe('FileReader');
        expect(result.error.severity).toBe('error');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockRejectedValue('String error');

      const result = await fileReader.readFile('test.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
        expect(result.error.message).toContain('unknown error occurred');
      }
    });

    it('should support different encodings', async () => {
      const mockContent = 'ASCII content';
      const mockStats = { size: mockContent.length };
      
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await fileReader.readFile('test.md', 'ascii');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.encoding).toBe('ascii');
        expect(mockFs.readFile).toHaveBeenCalledWith(
          expect.any(String),
          'ascii'
        );
      }
    });

    it('should normalize relative paths to absolute', async () => {
      const mockContent = 'Test content';
      const mockStats = { size: mockContent.length };
      
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await fileReader.readFile('relative/path/test.md');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filePath).toMatch(/^[A-Za-z]:/); // Windows absolute path
        expect(result.data.filePath).toContain('relative');
        expect(result.data.filePath).toContain('test.md');
      }
    });

    it('should preserve absolute paths', async () => {
      const absolutePath = 'C:\\absolute\\path\\test.md';
      const mockContent = 'Test content';
      const mockStats = { size: mockContent.length };
      
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await fileReader.readFile(absolutePath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filePath).toContain('absolute');
        expect(result.data.filePath).toContain('test.md');
      }
    });
  });
});