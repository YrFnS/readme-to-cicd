import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { CompilationValidator, TypeScriptError, CompilationResult } from '../../../src/validation/compilation-validator.js';

// Mock child_process and fs modules
vi.mock('child_process');
vi.mock('fs');

const mockExecSync = vi.mocked(execSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

describe('CompilationValidator', () => {
  let validator: CompilationValidator;

  beforeEach(() => {
    validator = new CompilationValidator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateTypeScript', () => {
    it('should return success result when TypeScript compilation succeeds', async () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      const result = await validator.validateTypeScript();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.success).toBe(true);
      expect(result.data!.errorCount).toBe(0);
      expect(result.data!.errors).toEqual([]);
      expect(result.data!.exitCode).toBe(0);
      expect(mockExecSync).toHaveBeenCalledWith('npx tsc --noEmit', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
    });

    it('should return failure result when TypeScript compilation fails', async () => {
      // Arrange
      const mockError = {
        status: 2,
        stdout: 'src/test.ts(10,5): error TS2304: Cannot find name "unknownVariable".\n',
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      // Act
      const result = await validator.validateTypeScript();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.success).toBe(false);
      expect(result.data!.errorCount).toBe(1);
      expect(result.data!.errors).toHaveLength(1);
      expect(result.data!.errors[0]).toEqual({
        file: 'src/test.ts',
        line: 10,
        column: 5,
        code: 'TS2304',
        message: 'Cannot find name "unknownVariable".',
        severity: 'error'
      });
      expect(result.data!.exitCode).toBe(2);
    });

    it('should handle multiple TypeScript errors', async () => {
      // Arrange
      const mockError = {
        status: 2,
        stdout: `src/test1.ts(10,5): error TS2304: Cannot find name "unknownVariable".
src/test2.ts(15,10): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`,
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      // Act
      const result = await validator.validateTypeScript();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data!.errorCount).toBe(2);
      expect(result.data!.errors).toHaveLength(2);
      expect(result.data!.errors[0].code).toBe('TS2304');
      expect(result.data!.errors[1].code).toBe('TS2345');
    });

    it('should handle warnings separately from errors', async () => {
      // Arrange
      const mockError = {
        status: 0,
        stdout: `src/test.ts(5,1): warning TS6133: 'unusedVariable' is declared but its value is never read.
src/test.ts(10,5): error TS2304: Cannot find name "unknownVariable".`,
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      // Act
      const result = await validator.validateTypeScript();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data!.errorCount).toBe(1);
      expect(result.data!.errors).toHaveLength(1);
      expect(result.data!.warnings).toHaveLength(1);
      expect(result.data!.warnings[0].severity).toBe('warning');
      expect(result.data!.warnings[0].code).toBe('TS6133');
    });

    it('should handle execution errors gracefully', async () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Act
      const result = await validator.validateTypeScript();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Command not found');
    });

    it('should parse error lines with different formats', async () => {
      // Arrange
      const mockError = {
        status: 2,
        stdout: `error TS2304: Cannot find name 'Result'.
src/complex/path/file.ts(25,15): error TS2345: Type error message.`,
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      // Act
      const result = await validator.validateTypeScript();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data!.errors).toHaveLength(2);
      
      // First error (simple format)
      expect(result.data!.errors[0]).toEqual({
        file: 'unknown',
        line: 0,
        column: 0,
        code: 'TS2304',
        message: "Cannot find name 'Result'.",
        severity: 'error'
      });
      
      // Second error (full format)
      expect(result.data!.errors[1]).toEqual({
        file: 'src/complex/path/file.ts',
        line: 25,
        column: 15,
        code: 'TS2345',
        message: 'Type error message.',
        severity: 'error'
      });
    });
  });

  describe('checkErrorCount', () => {
    it('should return -1 when no validation has been run', () => {
      // Act
      const errorCount = validator.checkErrorCount();

      // Assert
      expect(errorCount).toBe(-1);
    });

    it('should return correct error count after validation', async () => {
      // Arrange
      const mockError = {
        status: 2,
        stdout: 'src/test.ts(10,5): error TS2304: Cannot find name "unknownVariable".\n',
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      // Act
      await validator.validateTypeScript();
      const errorCount = validator.checkErrorCount();

      // Assert
      expect(errorCount).toBe(1);
    });

    it('should return 0 for successful compilation', async () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      await validator.validateTypeScript();
      const errorCount = validator.checkErrorCount();

      // Assert
      expect(errorCount).toBe(0);
    });
  });

  describe('generateReport', () => {
    it('should throw error when no validation result is available', () => {
      // Act & Assert
      expect(() => validator.generateReport()).toThrow(
        'No compilation result available. Run validateTypeScript() first.'
      );
    });

    it('should generate comprehensive report for successful compilation', async () => {
      // Arrange
      mockExecSync.mockReturnValue('');
      await validator.validateTypeScript();

      // Act
      const report = validator.generateReport();

      // Assert
      expect(report.result.success).toBe(true);
      expect(report.requirements.requirement_3_1_zero_errors).toBe(true);
      expect(report.requirements.requirement_3_2_successful_compilation).toBe(true);
      expect(report.requirements.requirement_3_3_report_generated).toBe(true);
      expect(report.integrationDeploymentReady).toBe(true);
      expect(report.summary).toContain('✅ TypeScript compilation successful');
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('compilation-validation-report.json'),
        expect.stringContaining('"success": true')
      );
    });

    it('should generate comprehensive report for failed compilation', async () => {
      // Arrange
      const mockError = {
        status: 2,
        stdout: 'src/test.ts(10,5): error TS2304: Cannot find name "unknownVariable".\n',
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });
      await validator.validateTypeScript();

      // Act
      const report = validator.generateReport();

      // Assert
      expect(report.result.success).toBe(false);
      expect(report.requirements.requirement_3_1_zero_errors).toBe(false);
      expect(report.requirements.requirement_3_2_successful_compilation).toBe(false);
      expect(report.requirements.requirement_3_3_report_generated).toBe(true);
      expect(report.integrationDeploymentReady).toBe(false);
      expect(report.summary).toContain('❌ TypeScript compilation failed');
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it('should include warnings in the summary', async () => {
      // Arrange
      const mockError = {
        status: 0,
        stdout: 'src/test.ts(5,1): warning TS6133: Unused variable.\n',
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });
      await validator.validateTypeScript();

      // Act
      const report = validator.generateReport();

      // Assert
      expect(report.summary).toContain('✅ TypeScript compilation successful with 1 warnings');
    });
  });

  describe('validateFixes', () => {
    it('should return success when compilation succeeds', async () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      const result = await validator.validateFixes();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return failure with errors when compilation fails', async () => {
      // Arrange
      const mockError = {
        status: 2,
        stdout: 'src/test.ts(10,5): error TS2304: Cannot find name "unknownVariable".\n',
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      // Act
      const result = await validator.validateFixes();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(Array.isArray(result.error)).toBe(true);
      expect(result.error![0]).toEqual({
        file: 'src/test.ts',
        line: 10,
        column: 5,
        code: 'TS2304',
        message: 'Cannot find name "unknownVariable".',
        severity: 'error'
      });
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const result = await validator.validateFixes();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(Array.isArray(result.error)).toBe(true);
      expect(result.error![0]).toBeInstanceOf(Error);
    });
  });

  describe('getCurrentResult', () => {
    it('should return null when no validation has been run', () => {
      // Act
      const result = validator.getCurrentResult();

      // Assert
      expect(result).toBeNull();
    });

    it('should return current result after validation', async () => {
      // Arrange
      mockExecSync.mockReturnValue('');
      await validator.validateTypeScript();

      // Act
      const result = validator.getCurrentResult();

      // Assert
      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.errorCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset validator state', async () => {
      // Arrange
      mockExecSync.mockReturnValue('');
      await validator.validateTypeScript();
      expect(validator.getCurrentResult()).toBeDefined();

      // Act
      validator.reset();

      // Assert
      expect(validator.getCurrentResult()).toBeNull();
      expect(validator.checkErrorCount()).toBe(-1);
    });
  });

  describe('error parsing edge cases', () => {
    it('should handle malformed error lines gracefully', async () => {
      // Arrange
      const mockError = {
        status: 2,
        stdout: `Invalid error line format
src/test.ts(10,5): error TS2304: Cannot find name "unknownVariable".
Another invalid line`,
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      // Act
      const result = await validator.validateTypeScript();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data!.errors).toHaveLength(1);
      expect(result.data!.errors[0].code).toBe('TS2304');
    });

    it('should handle empty output', async () => {
      // Arrange
      const mockError = {
        status: 1,
        stdout: '',
        stderr: ''
      };
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      // Act
      const result = await validator.validateTypeScript();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data!.errors).toHaveLength(0);
      expect(result.data!.errorCount).toBe(0);
      expect(result.data!.success).toBe(true); // No errors found, so success
    });
  });
});