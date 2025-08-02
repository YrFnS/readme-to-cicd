import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  DetectionError, 
  ParseError, 
  DetectionFailureError, 
  ConfigurationError,
  FileSystemError,
  ValidationError,
  IntegrationError,
  ResourceError
} from '../../../src/detection/errors/detection-errors';
import { ErrorRecovery, Result } from '../../../src/detection/errors/error-recovery';
import { AlternativeSuggestionGenerator } from '../../../src/detection/utils/alternative-suggestions';
import { ConflictResolver } from '../../../src/detection/utils/conflict-resolution';
import { WarningSystem } from '../../../src/detection/utils/warning-system';
import { DetectionLogger, createLogger } from '../../../src/detection/utils/logger';

describe('Error Handling System', () => {
  describe('Custom Error Classes', () => {
    it('should create ParseError with correct properties', () => {
      const error = new ParseError('Invalid JSON', '/path/to/file.json', 42, { syntax: 'json' });
      
      expect(error.name).toBe('ParseError');
      expect(error.code).toBe('PARSE_ERROR');
      expect(error.component).toBe('parser');
      expect(error.recoverable).toBe(true);
      expect(error.context.filePath).toBe('/path/to/file.json');
      expect(error.context.line).toBe(42);
      expect(error.context.syntax).toBe('json');
      expect(error.message).toContain('Parse failed in /path/to/file.json at line 42');
    });

    it('should create DetectionFailureError with correct properties', () => {
      const error = new DetectionFailureError('Analysis failed', 'NodeJSAnalyzer', { reason: 'timeout' });
      
      expect(error.name).toBe('DetectionFailureError');
      expect(error.code).toBe('DETECTION_FAILURE');
      expect(error.component).toBe('NodeJSAnalyzer');
      expect(error.recoverable).toBe(true);
      expect(error.context.reason).toBe('timeout');
    });

    it('should convert error to log format', () => {
      const error = new ConfigurationError('Missing config', 'package.json');
      const logFormat = error.toLogFormat();
      
      expect(logFormat.error).toBe('ConfigurationError');
      expect(logFormat.code).toBe('CONFIGURATION_ERROR');
      expect(logFormat.component).toBe('configuration');
      expect(logFormat.recoverable).toBe(false);
      expect(logFormat.context.configFile).toBe('package.json');
    });
  });

  describe('Error Recovery', () => {
    it('should retry operation on recoverable error', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new DetectionFailureError('Temporary failure', 'test');
        }
        return 'success';
      });

      const result = await ErrorRecovery.withRetry(operation, { maxAttempts: 3 });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry on non-recoverable error', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        throw new ConfigurationError('Invalid config', 'test.json');
      });

      const result = await ErrorRecovery.withRetry(operation, { maxAttempts: 3 });
      
      expect(result.success).toBe(false);
      expect(attempts).toBe(1);
    });

    it('should use fallback operation when primary fails', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new DetectionFailureError('Primary failed', 'test'));
      const fallbackOperation = vi.fn().mockResolvedValue('fallback result');

      const result = await ErrorRecovery.withFallback(primaryOperation, fallbackOperation);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback result');
      expect(primaryOperation).toHaveBeenCalledTimes(1);
      expect(fallbackOperation).toHaveBeenCalledTimes(1);
    });

    it('should safely execute operation with default value', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const onError = vi.fn();

      const result = await ErrorRecovery.safely(operation, 'default', onError);
      
      expect(result).toBe('default');
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should validate input correctly', () => {
      const validator = (value: string) => value.length > 0;
      
      const validResult = ErrorRecovery.validate('test', validator, 'Empty string');
      expect(validResult.success).toBe(true);
      expect(validResult.data).toBe('test');

      const invalidResult = ErrorRecovery.validate('', validator, 'Empty string');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.message).toBe('Empty string');
    });
  });

  describe('Alternative Suggestion Generator', () => {
    let generator: AlternativeSuggestionGenerator;

    beforeEach(() => {
      generator = new AlternativeSuggestionGenerator();
    });

    it('should generate alternatives for low confidence detection', () => {
      const context = {
        detectedFrameworks: [],
        evidence: [
          { type: 'text_mention', source: 'README.md', value: 'react', weight: 0.3 }
        ],
        confidence: { score: 0.4, level: 'low' as const, breakdown: {} as any, factors: [], recommendations: [] },
        projectLanguages: ['JavaScript'],
        configFiles: []
      };

      const alternatives = generator.generateAlternatives(context);
      
      expect(alternatives.length).toBeGreaterThan(0);
      // Check if React is in the alternatives (it might not be first due to sorting)
      expect(alternatives.some(alt => alt.name === 'React')).toBe(true);
      const reactAlternative = alternatives.find(alt => alt.name === 'React');
      expect(reactAlternative?.reason).toContain('documentation');
    });

    it('should suggest missing common frameworks', () => {
      const context = {
        detectedFrameworks: [],
        evidence: [],
        confidence: { score: 0.3, level: 'low' as const, breakdown: {} as any, factors: [], recommendations: [] },
        projectLanguages: ['JavaScript'],
        configFiles: []
      };

      const alternatives = generator.generateAlternatives(context);
      
      // Should suggest at least some JavaScript frameworks
      expect(alternatives.length).toBeGreaterThan(0);
      const frameworkNames = alternatives.map(alt => alt.name);
      // Check that at least one common JavaScript framework is suggested
      const hasJavaScriptFramework = frameworkNames.some(name => 
        ['React', 'Vue.js', 'Express'].includes(name));
      expect(hasJavaScriptFramework).toBe(true);
    });

    it('should limit alternatives to top 5', () => {
      const context = {
        detectedFrameworks: [],
        evidence: Array.from({ length: 10 }, (_, i) => ({
          type: 'text_mention',
          source: 'README.md',
          value: `framework${i}`,
          weight: 0.3
        })),
        confidence: { score: 0.3, level: 'low' as const, breakdown: {} as any, factors: [], recommendations: [] },
        projectLanguages: ['JavaScript'],
        configFiles: []
      };

      const alternatives = generator.generateAlternatives(context);
      
      expect(alternatives.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Conflict Resolver', () => {
    let resolver: ConflictResolver;

    beforeEach(() => {
      resolver = new ConflictResolver();
    });

    it('should detect duplicate framework conflicts', () => {
      const context = {
        frameworks: [
          { name: 'React', confidence: 0.8, type: 'frontend_framework' as const },
          { name: 'React', confidence: 0.6, type: 'frontend_framework' as const }
        ],
        buildTools: [],
        evidence: [],
        projectLanguages: ['JavaScript']
      };

      const conflicts = resolver.detectConflicts(context);
      
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('duplicate_framework');
      expect(conflicts[0].affectedItems).toEqual(['React', 'React']);
    });

    it('should detect incompatible framework conflicts', () => {
      const context = {
        frameworks: [
          { name: 'React', confidence: 0.8, type: 'frontend_framework' as const },
          { name: 'Vue.js', confidence: 0.7, type: 'frontend_framework' as const }
        ],
        buildTools: [],
        evidence: [],
        projectLanguages: ['JavaScript']
      };

      const conflicts = resolver.detectConflicts(context);
      
      expect(conflicts.some(c => c.type === 'incompatible_frameworks')).toBe(true);
    });

    it('should resolve duplicate framework conflicts', () => {
      const context = {
        frameworks: [
          { name: 'React', confidence: 0.8, type: 'frontend_framework' as const },
          { name: 'React', confidence: 0.6, type: 'frontend_framework' as const }
        ],
        buildTools: [],
        evidence: [],
        projectLanguages: ['JavaScript']
      };

      const conflicts = resolver.detectConflicts(context);
      const resolution = resolver.resolveConflicts(conflicts, context);
      
      expect(resolution.resolvedContext.frameworks.length).toBe(1);
      expect(resolution.resolvedContext.frameworks[0].confidence).toBe(0.8);
      expect(resolution.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Warning System', () => {
    let warningSystem: WarningSystem;

    beforeEach(() => {
      warningSystem = new WarningSystem();
    });

    it('should generate low confidence warning', () => {
      const context = {
        frameworks: [],
        buildTools: [],
        evidence: [],
        confidence: { score: 0.3, level: 'low' as const, breakdown: {} as any, factors: [], recommendations: [] },
        conflicts: [],
        projectLanguages: ['JavaScript'],
        configFiles: []
      };

      const warnings = warningSystem.generateWarnings(context);
      
      expect(warnings.some(w => w.id === 'low_confidence')).toBe(true);
      expect(warnings.find(w => w.id === 'low_confidence')?.severity).toBe('warning');
    });

    it('should generate missing configuration warning', () => {
      const context = {
        frameworks: [],
        buildTools: [],
        evidence: [],
        confidence: { score: 0.8, level: 'high' as const, breakdown: {} as any, factors: [], recommendations: [] },
        conflicts: [],
        projectLanguages: ['JavaScript'],
        configFiles: ['package.json'] // Only one config file
      };

      const warnings = warningSystem.generateWarnings(context);
      
      expect(warnings.some(w => w.id === 'missing_config')).toBe(true);
    });

    it('should filter warnings by severity', () => {
      const context = {
        frameworks: [],
        buildTools: [],
        evidence: [],
        confidence: { score: 0.3, level: 'low' as const, breakdown: {} as any, factors: [], recommendations: [] },
        conflicts: [],
        projectLanguages: ['JavaScript'],
        configFiles: []
      };

      const allWarnings = warningSystem.generateWarnings(context);
      const errorWarnings = warningSystem.filterBySeverity(allWarnings, 'error');
      
      expect(errorWarnings.length).toBeLessThanOrEqual(allWarnings.length);
      expect(errorWarnings.every(w => ['error', 'critical'].includes(w.severity))).toBe(true);
    });
  });

  describe('Detection Logger', () => {
    let logger: DetectionLogger;

    beforeEach(() => {
      logger = createLogger({ enableConsole: false, sanitizeSecrets: false });
    });

    it('should log messages with correct structure', () => {
      logger.info('TestComponent', 'Test message', { testField: 'value' });
      
      const entries = logger.getLogEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].level).toBe('info');
      expect(entries[0].component).toBe('TestComponent');
      expect(entries[0].message).toBe('Test message');
      expect(entries[0].context?.testField).toBe('value');
    });

    it('should filter log entries by level', () => {
      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warning message');
      logger.error('Test', 'Error message');

      const errorEntries = logger.getLogEntriesByLevel('error');
      expect(errorEntries.length).toBe(1);
      expect(errorEntries[0].level).toBe('error');
    });

    it('should filter log entries by component', () => {
      logger.info('Component1', 'Message 1');
      logger.info('Component2', 'Message 2');
      logger.info('Component1', 'Message 3');

      const component1Entries = logger.getLogEntriesByComponent('Component1');
      expect(component1Entries.length).toBe(2);
      expect(component1Entries.every(e => e.component === 'Component1')).toBe(true);
    });

    it('should sanitize sensitive information', () => {
      const sanitizingLogger = createLogger({ enableConsole: false, sanitizeSecrets: true });
      sanitizingLogger.info('Test', 'Test message', { 
        password: 'secret123',
        apiKey: 'key123',
        normalField: 'value'
      });

      const entries = sanitizingLogger.getLogEntries();
      expect(entries[0].context?.password).toBe('[REDACTED]');
      expect(entries[0].context?.apiKey).toBe('[REDACTED]');
      expect(entries[0].context?.normalField).toBe('value');
    });

    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ sessionId: 'test123' });
      childLogger.info('Test', 'Child message');

      const entries = childLogger.getLogEntries();
      expect(entries[0].context?.sessionId).toBe('test123');
    });

    it('should export logs as JSON', () => {
      logger.info('Test', 'Test message');
      const exported = logger.exportLogs();
      
      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });
  });
});