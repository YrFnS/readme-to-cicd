/**
 * README Command Handler Unit Tests
 * 
 * Tests the ReadmeCommandHandler class in isolation with mocked dependencies.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ReadmeCommandHandler, ReadmeCommandOptions } from '../../../src/cli/lib/readme-command-handler';
import { Logger } from '../../../src/cli/lib/logger';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';
import fs from 'fs/promises';
import path from 'path';

// Mock the parser module
vi.mock('../../../src/parser', () => ({
  createReadmeParserWithPipeline: vi.fn(() => ({
    parseFile: vi.fn()
  }))
}));

// Mock fs/promises
vi.mock('fs/promises');

describe('ReadmeCommandHandler', () => {
  let handler: ReadmeCommandHandler;
  let mockLogger: Logger;
  let mockErrorHandler: ErrorHandler;
  let mockParser: any;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
      updateConfig: vi.fn()
    } as any;

    // Create mock error handler
    mockErrorHandler = {
      handleCLIError: vi.fn().mockReturnValue({
        success: false,
        generatedFiles: [],
        errors: ['Mock error'],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      })
    } as any;

    // Create handler instance
    handler = new ReadmeCommandHandler(mockLogger, mockErrorHandler);

    // Get the mocked parser instance
    const { createReadmeParserWithPipeline } = require('../../../src/parser');
    mockParser = createReadmeParserWithPipeline();
  });

  describe('handleParseCommand', () => {
    it('should successfully parse README file', async () => {
      // Mock successful parse result
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'Test Project', description: 'Test description' },
          languages: [{ name: 'JavaScript', confidence: 0.9 }],
          dependencies: [{ name: 'react', version: '^18.0.0' }],
          commands: { install: [{ command: 'npm install' }] },
          testing: { frameworks: ['jest'] },
          confidence: { overall: 0.85 }
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md',
        outputFormat: 'text',
        verbose: false,
        debug: false
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.filesProcessed).toBe(1);
      expect(result.summary.frameworksDetected).toContain('JavaScript');
      expect(mockParser.parseFile).toHaveBeenCalledWith('/test/README.md');
    });

    it('should handle parse failure gracefully', async () => {
      // Mock failed parse result
      const mockParseResult = {
        success: false,
        errors: [{ message: 'Parse failed', code: 'PARSE_ERROR', component: 'Parser', severity: 'error' }]
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md',
        outputFormat: 'text'
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Parse failed');
    });

    it('should generate JSON output file when requested', async () => {
      // Mock successful parse result
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'Test Project' },
          languages: [{ name: 'JavaScript', confidence: 0.9 }],
          dependencies: [],
          commands: {},
          testing: {},
          confidence: { overall: 0.85 }
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md',
        outputFormat: 'json'
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0]).toMatch(/\.json$/);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should include confidence scores when requested', async () => {
      // Mock successful parse result
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'Test Project' },
          languages: [{ name: 'JavaScript', confidence: 0.9 }],
          dependencies: [],
          commands: {},
          testing: {},
          confidence: { overall: 0.85 }
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md',
        outputFormat: 'json',
        includeConfidence: true
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
      
      // Verify that confidence was included in the written content
      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);
      expect(parsedContent).toHaveProperty('confidence');
    });
  });

  describe('handleAnalyzeCommand', () => {
    it('should generate detailed analysis report', async () => {
      // Mock successful parse result
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'Test Project', description: 'Test description' },
          languages: [{ name: 'JavaScript', confidence: 0.9 }],
          dependencies: [{ name: 'react', version: '^18.0.0' }],
          commands: { install: [{ command: 'npm install' }] },
          testing: { frameworks: ['jest'] },
          confidence: { overall: 0.85 }
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.writeFile as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md'
      };

      const result = await handler.handleAnalyzeCommand(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0]).toMatch(/detailed-analysis\.json$/);
      expect(fs.writeFile).toHaveBeenCalled();
      
      // Verify analysis report structure
      const writeCall = (fs.writeFile as Mock).mock.calls[0];
      const writtenContent = writeCall[1];
      const report = JSON.parse(writtenContent);
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('diagnostics');
    });
  });

  describe('handleValidateCommand', () => {
    it('should validate README successfully', async () => {
      // Mock successful parse result with good confidence
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'Test Project', description: 'Test description' },
          languages: [{ name: 'JavaScript', confidence: 0.9 }],
          dependencies: [{ name: 'react', version: '^18.0.0' }],
          commands: { install: [{ command: 'npm install' }] },
          testing: { frameworks: ['jest'] },
          confidence: { overall: 0.85 }
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md'
      };

      const result = await handler.handleValidateCommand(options);

      expect(result.success).toBe(true);
      expect(result.summary.filesProcessed).toBe(1);
    });

    it('should fail validation for low confidence analysis', async () => {
      // Mock parse result with very low confidence
      const mockParseResult = {
        success: true,
        data: {
          metadata: {},
          languages: [],
          dependencies: [],
          commands: {},
          testing: {},
          confidence: { overall: 0.2 } // Very low confidence
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md'
      };

      const result = await handler.handleValidateCommand(options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('confidence too low');
    });

    it('should provide warnings for missing information', async () => {
      // Mock parse result with missing information
      const mockParseResult = {
        success: true,
        data: {
          metadata: {}, // No name
          languages: [], // No languages
          dependencies: [],
          commands: {}, // No commands
          testing: {},
          confidence: { overall: 0.7 } // Decent confidence but missing info
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md'
      };

      const result = await handler.handleValidateCommand(options);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Project name not detected'))).toBe(true);
      expect(result.warnings.some(w => w.includes('No programming languages detected'))).toBe(true);
      expect(result.warnings.some(w => w.includes('No commands detected'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle file not found error', async () => {
      // Mock file not found
      (fs.stat as Mock).mockRejectedValue({ code: 'ENOENT' });

      const options: ReadmeCommandOptions = {
        readmePath: '/test/nonexistent.md'
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(false);
      expect(mockErrorHandler.handleCLIError).toHaveBeenCalled();
    });

    it('should handle file access permission error', async () => {
      // Mock permission denied
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true });
      (fs.access as Mock).mockRejectedValue({ code: 'EACCES' });

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md'
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(false);
      expect(mockErrorHandler.handleCLIError).toHaveBeenCalled();
    });

    it('should handle parser errors gracefully', async () => {
      // Mock parser throwing error
      mockParser.parseFile.mockRejectedValue(new Error('Parser internal error'));
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);

      const options: ReadmeCommandOptions = {
        readmePath: '/test/README.md'
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(false);
      expect(mockErrorHandler.handleCLIError).toHaveBeenCalled();
    });
  });

  describe('README Path Resolution', () => {
    it('should resolve absolute paths correctly', async () => {
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'Test Project' },
          languages: [],
          dependencies: [],
          commands: {},
          testing: {},
          confidence: { overall: 0.8 }
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);

      const absolutePath = path.resolve('/absolute/path/README.md');
      const options: ReadmeCommandOptions = {
        readmePath: absolutePath
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(true);
      expect(mockParser.parseFile).toHaveBeenCalledWith(absolutePath);
    });

    it('should resolve relative paths correctly', async () => {
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'Test Project' },
          languages: [],
          dependencies: [],
          commands: {},
          testing: {},
          confidence: { overall: 0.8 }
        },
        errors: [],
        warnings: []
      };

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      
      // Mock file system operations
      (fs.stat as Mock).mockResolvedValue({ isFile: () => true, size: 1000, mtime: new Date() });
      (fs.access as Mock).mockResolvedValue(undefined);

      const relativePath = './docs/README.md';
      const expectedAbsolutePath = path.resolve(relativePath);
      
      const options: ReadmeCommandOptions = {
        readmePath: relativePath
      };

      const result = await handler.handleParseCommand(options);

      expect(result.success).toBe(true);
      expect(mockParser.parseFile).toHaveBeenCalledWith(expectedAbsolutePath);
    });
  });
});