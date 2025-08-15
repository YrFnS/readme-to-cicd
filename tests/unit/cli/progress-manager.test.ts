/**
 * ProgressManager Unit Tests
 * 
 * Tests for progress management, user feedback, and execution summaries.
 * Covers progress indicators, step logging, and output formatting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressManager, ProgressOptions } from '../../../src/cli/progress/progress-manager';
import { ExecutionSummary, CLIError } from '../../../src/cli/lib/types';

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock chalk to return plain strings for easier testing
vi.mock('chalk', () => ({
  default: {
    blue: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
    cyan: (str: string) => str,
    gray: (str: string) => str,
    grey: (str: string) => str,
    bold: (str: string) => str
  }
}));

// Mock ora
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: ''
  }))
}));

describe('ProgressManager', () => {
  let progressManager: ProgressManager;
  let mockOptions: ProgressOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOptions = {
      verbose: false,
      debug: false,
      quiet: false,
      showTimestamps: true,
      showDuration: true
    };
    progressManager = new ProgressManager(mockOptions);
  });

  afterEach(() => {
    progressManager.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const manager = new ProgressManager();
      expect(manager).toBeInstanceOf(ProgressManager);
    });

    it('should initialize progress tracking with total steps', () => {
      progressManager.initialize(5, 'Test Process');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Test Process')
      );
    });

    it('should not log when quiet mode is enabled', () => {
      const quietManager = new ProgressManager({ quiet: true });
      quietManager.initialize(5, 'Test Process');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('step management', () => {
    beforeEach(() => {
      progressManager.initialize(3, 'Test Process');
      vi.clearAllMocks(); // Clear initialization logs
    });

    it('should start a new step', () => {
      progressManager.startStep('step1', 'First Step', 'Testing first step');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('First Step')
      );
    });

    it('should update step progress', () => {
      progressManager.startStep('step1', 'First Step', 'Testing first step');
      progressManager.updateStep('Updated message', 'Additional details');
      
      const steps = progressManager.getSteps();
      expect(steps[0].details).toBe('Additional details');
    });

    it('should complete step with success status', () => {
      progressManager.startStep('step1', 'First Step', 'Testing first step');
      progressManager.completeStep('step1', 'success');
      
      const steps = progressManager.getSteps();
      expect(steps[0].status).toBe('success');
      expect(steps[0].endTime).toBeDefined();
      expect(steps[0].duration).toBeDefined();
    });

    it('should complete step with error status', () => {
      const error: CLIError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        category: 'processing',
        severity: 'error',
        suggestions: ['Try again', 'Check configuration']
      };

      progressManager.startStep('step1', 'First Step', 'Testing first step');
      progressManager.completeStep('step1', 'error', error);
      
      const steps = progressManager.getSteps();
      expect(steps[0].status).toBe('error');
      expect(steps[0].error).toEqual(error);
    });

    it('should handle skipped steps', () => {
      progressManager.startStep('step1', 'First Step', 'Testing first step');
      progressManager.completeStep('step1', 'skipped');
      
      const steps = progressManager.getSteps();
      expect(steps[0].status).toBe('skipped');
    });

    it('should track progress correctly', () => {
      progressManager.startStep('step1', 'First Step', 'Testing first step');
      progressManager.completeStep('step1', 'success');
      
      const progress = progressManager.getProgress();
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(3);
      expect(progress.percentage).toBe(33);
    });
  });

  describe('logging methods', () => {
    it('should log info messages', () => {
      progressManager.info('Information message', 'Additional details');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Information message')
      );
    });

    it('should log warning messages', () => {
      progressManager.warn('Warning message', 'Warning details');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Warning message')
      );
    });

    it('should log error messages', () => {
      const error: CLIError = {
        code: 'TEST_ERROR',
        message: 'Test error',
        category: 'user-input',
        severity: 'error',
        suggestions: ['Fix input']
      };

      progressManager.error('Error occurred', error);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred')
      );
    });

    it('should log debug messages only in debug mode', () => {
      // Debug disabled
      progressManager.debug('Debug message', { data: 'test' });
      expect(mockConsoleLog).not.toHaveBeenCalled();

      // Debug enabled
      const debugManager = new ProgressManager({ debug: true });
      debugManager.debug('Debug message', { data: 'test' });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });

    it('should not log when quiet mode is enabled', () => {
      const quietManager = new ProgressManager({ quiet: true });
      
      quietManager.info('Info message');
      quietManager.warn('Warning message');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('execution summary', () => {
    it('should display execution summary', () => {
      const summary: ExecutionSummary = {
        totalTime: 5000,
        filesGenerated: 3,
        workflowsCreated: 2,
        frameworksDetected: ['React', 'Node.js'],
        optimizationsApplied: 1
      };

      const generatedFiles = [
        '.github/workflows/ci.yml',
        '.github/workflows/cd.yml',
        'package.json'
      ];

      progressManager.displaySummary(summary, generatedFiles);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Execution Summary')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Files generated: 3')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Workflows created: 2')
      );
    });

    it('should show generated files in summary', () => {
      const summary: ExecutionSummary = {
        totalTime: 1000,
        filesGenerated: 1,
        workflowsCreated: 1,
        frameworksDetected: ['React'],
        optimizationsApplied: 0
      };

      const generatedFiles = ['.github/workflows/ci.yml'];

      progressManager.displaySummary(summary, generatedFiles);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Generated Files:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('.github/workflows/ci.yml')
      );
    });

    it('should show error summary when steps failed', () => {
      progressManager.startStep('step1', 'Failed Step', 'This will fail');
      const error: CLIError = {
        code: 'STEP_FAILED',
        message: 'Step failed',
        category: 'processing',
        severity: 'error',
        suggestions: []
      };
      progressManager.completeStep('step1', 'error', error);

      const summary: ExecutionSummary = {
        totalTime: 1000,
        filesGenerated: 0,
        workflowsCreated: 0,
        frameworksDetected: [],
        optimizationsApplied: 0
      };

      progressManager.displaySummary(summary);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Errors:')
      );
    });

    it('should show performance breakdown in verbose mode', () => {
      const verboseManager = new ProgressManager({ verbose: true });
      
      verboseManager.startStep('step1', 'Step 1', 'First step');
      verboseManager.completeStep('step1', 'success');
      
      const summary: ExecutionSummary = {
        totalTime: 2000,
        filesGenerated: 1,
        workflowsCreated: 1,
        frameworksDetected: ['React'],
        optimizationsApplied: 0
      };

      verboseManager.displaySummary(summary);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Performance Breakdown:')
      );
    });
  });

  describe('utility methods', () => {
    it('should get current progress statistics', () => {
      progressManager.initialize(5);
      progressManager.startStep('step1', 'Step 1', 'First step');
      progressManager.completeStep('step1', 'success');
      
      const progress = progressManager.getProgress();
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(5);
      expect(progress.percentage).toBe(20);
    });

    it('should get all steps with status', () => {
      progressManager.startStep('step1', 'Step 1', 'First step');
      progressManager.completeStep('step1', 'success');
      progressManager.startStep('step2', 'Step 2', 'Second step');
      progressManager.completeStep('step2', 'error');
      
      const steps = progressManager.getSteps();
      expect(steps).toHaveLength(2);
      expect(steps[0].status).toBe('success');
      expect(steps[1].status).toBe('error');
    });

    it('should cleanup resources', () => {
      progressManager.startStep('step1', 'Step 1', 'First step');
      progressManager.cleanup();
      
      // Should not throw errors after cleanup
      expect(() => progressManager.cleanup()).not.toThrow();
    });
  });

  describe('formatting', () => {
    it('should format timestamps when enabled', () => {
      const timestampManager = new ProgressManager({ showTimestamps: true });
      timestampManager.info('Test message');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\]/)
      );
    });

    it('should not show timestamps when disabled', () => {
      const noTimestampManager = new ProgressManager({ showTimestamps: false });
      noTimestampManager.info('Test message');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.not.stringMatching(/\[\d{2}:\d{2}:\d{2}\]/)
      );
    });

    it('should show duration when enabled', async () => {
      const durationManager = new ProgressManager({ showDuration: true });
      durationManager.startStep('step1', 'Step 1', 'First step');
      
      // Add small delay to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      durationManager.completeStep('step1', 'success');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\(\d+ms\)|\(\d+s\)/)
      );
    });
  });
});