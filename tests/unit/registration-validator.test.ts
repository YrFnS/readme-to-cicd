/**
 * Comprehensive unit tests for RegistrationValidator
 * 
 * Tests validation logic with various analyzer types and edge cases
 * to ensure robust analyzer registration validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RegistrationValidator,
  AnalyzerInterface,
  InterfaceValidationResult,
  DependencyValidationResult,
  CapabilityValidationResult,
  ValidationDetails
} from '../../src/parser/analyzers/enhanced-analyzer-registry';
import { AnalyzerResult } from '../../src/parser/types';
import { MarkdownAST } from '../../src/shared/markdown-parser';
import { AnalysisContext } from '../../src/shared/types/analysis-context';

describe('RegistrationValidator - Comprehensive Analyzer Type Testing', () => {
  let validator: RegistrationValidator;

  beforeEach(() => {
    validator = new RegistrationValidator();
  });

  describe('Valid Analyzer Types', () => {
    it('should validate minimal compliant analyzer', () => {
      class MinimalAnalyzer implements AnalyzerInterface {
        readonly name = 'MinimalAnalyzer';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const analyzer = new MinimalAnalyzer();
      const result = validator.validateAnalyzerInterface(analyzer);

      expect(result.isValid).toBe(true);
      expect(result.complianceScore).toBe(1);
      expect(result.missingMethods).toHaveLength(0);
      expect(result.invalidMethods).toHaveLength(0);
    });

    it('should validate analyzer with optional context parameter', () => {
      class ContextAwareAnalyzer implements AnalyzerInterface {
        readonly name = 'ContextAwareAnalyzer';

        async analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult> {
          return { 
            success: true, 
            data: { hasContext: !!context }, 
            confidence: context ? 0.9 : 0.7 
          };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown', 'text/plain'],
            requiresContext: true,
            canProcessLargeFiles: false,
            estimatedProcessingTime: 500,
            dependencies: ['ContextProvider']
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const analyzer = new ContextAwareAnalyzer();
      const result = validator.validateAnalyzerInterface(analyzer);

      expect(result.isValid).toBe(true);
      expect(result.complianceScore).toBe(1);
    });

    it('should validate analyzer with complex capabilities', () => {
      class ComplexAnalyzer implements AnalyzerInterface {
        readonly name = 'ComplexAnalyzer';

        async analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult> {
          return { success: true, data: { complex: true }, confidence: 0.95 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: [
              'text/markdown', 
              'text/plain', 
              'application/json',
              'text/yaml'
            ],
            requiresContext: true,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 2000,
            dependencies: ['Parser', 'Validator', 'Cache']
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const analyzer = new ComplexAnalyzer();
      const validation = validator.validateAnalyzer(analyzer);

      expect(validation.interfaceCompliance.isValid).toBe(true);
      expect(validation.dependencyValidation.isValid).toBe(true);
      expect(validation.capabilityValidation.isValid).toBe(true);
    });
  });

  describe('Invalid Analyzer Types - Missing Methods', () => {
    it('should detect analyzer missing analyze method', () => {
      class NoAnalyzeMethod {
        readonly name = 'NoAnalyzeMethod';

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateAnalyzerInterface(new NoAnalyzeMethod() as any);

      expect(result.isValid).toBe(false);
      expect(result.missingMethods).toContain('analyze');
      expect(result.complianceScore).toBeLessThan(1);
      expect(result.details).toContain('Missing required method: analyze');
    });

    it('should detect analyzer missing getCapabilities method', () => {
      class NoCapabilitiesMethod {
        readonly name = 'NoCapabilitiesMethod';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateAnalyzerInterface(new NoCapabilitiesMethod() as any);

      expect(result.isValid).toBe(false);
      expect(result.missingMethods).toContain('getCapabilities');
      expect(result.details).toContain('Missing required method: getCapabilities');
    });

    it('should detect analyzer missing validateInterface method', () => {
      class NoValidateMethod {
        readonly name = 'NoValidateMethod';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }
      }

      const result = validator.validateAnalyzerInterface(new NoValidateMethod() as any);

      expect(result.isValid).toBe(false);
      expect(result.missingMethods).toContain('validateInterface');
      expect(result.details).toContain('Missing required method: validateInterface');
    });

    it('should detect analyzer missing name property', () => {
      class NoNameProperty {
        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateAnalyzerInterface(new NoNameProperty() as any);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('Missing required property: name');
    });
  });

  describe('Invalid Analyzer Types - Wrong Method Signatures', () => {
    it('should detect analyze method with insufficient parameters', () => {
      class BadAnalyzeSignature {
        readonly name = 'BadAnalyzeSignature';

        // Wrong signature - only one parameter
        async analyze(content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateAnalyzerInterface(new BadAnalyzeSignature() as any);

      expect(result.isValid).toBe(false);
      expect(result.invalidMethods).toContain('analyze');
      expect(result.details).toContain('analyze method must accept at least 2 parameters (ast, content)');
    });

    it('should detect non-function methods', () => {
      class NonFunctionMethods {
        readonly name = 'NonFunctionMethods';
        analyze = 'not a function';
        getCapabilities = 42;
        validateInterface = true;
      }

      const result = validator.validateAnalyzerInterface(new NonFunctionMethods() as any);

      expect(result.isValid).toBe(false);
      expect(result.invalidMethods).toContain('analyze');
      expect(result.invalidMethods).toContain('getCapabilities');
      expect(result.invalidMethods).toContain('validateInterface');
      expect(result.details).toContain("Property 'analyze' must be a function");
      expect(result.details).toContain("Property 'getCapabilities' must be a function");
      expect(result.details).toContain("Property 'validateInterface' must be a function");
    });

    it('should detect validateInterface method returning non-boolean', () => {
      class BadValidateReturn {
        readonly name = 'BadValidateReturn';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface() {
          return 'not a boolean';
        }
      }

      const result = validator.validateAnalyzerInterface(new BadValidateReturn() as any);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('validateInterface method must return a boolean');
    });

    it('should detect self-validation failure', () => {
      class SelfValidationFails {
        readonly name = 'SelfValidationFails';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return false; // Self-validation fails
        }
      }

      const result = validator.validateAnalyzerInterface(new SelfValidationFails());

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('Analyzer self-validation failed');
    });
  });

  describe('Invalid Analyzer Types - Wrong Property Types', () => {
    it('should detect non-string name property', () => {
      class NonStringName {
        readonly name = 123; // Should be string

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateAnalyzerInterface(new NonStringName() as any);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain("Property 'name' must be a string");
    });

    it('should handle empty name property', () => {
      class EmptyName {
        readonly name = '';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateAnalyzerInterface(new EmptyName());

      // Empty name should still pass basic validation, but might be caught by other validation rules
      expect(result.missingMethods).toHaveLength(0);
      expect(result.invalidMethods).toHaveLength(0);
    });
  });

  describe('Capability Validation - Various Types', () => {
    it('should validate analyzer with minimal capabilities', () => {
      class MinimalCapabilities {
        readonly name = 'MinimalCapabilities';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: false,
            estimatedProcessingTime: 0,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new MinimalCapabilities());

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid supportedContentTypes', () => {
      class InvalidContentTypes {
        readonly name = 'InvalidContentTypes';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: 'not an array',
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new InvalidContentTypes() as any);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('supportedContentTypes must be an array');
    });

    it('should detect invalid boolean properties', () => {
      class InvalidBooleans {
        readonly name = 'InvalidBooleans';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: 'not a boolean',
            canProcessLargeFiles: 'also not a boolean',
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new InvalidBooleans() as any);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('requiresContext must be a boolean');
      expect(result.issues).toContain('canProcessLargeFiles must be a boolean');
    });

    it('should detect invalid estimatedProcessingTime', () => {
      class InvalidProcessingTime {
        readonly name = 'InvalidProcessingTime';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 'not a number',
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new InvalidProcessingTime() as any);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('estimatedProcessingTime must be a number');
    });

    it('should detect negative processing time', () => {
      class NegativeProcessingTime {
        readonly name = 'NegativeProcessingTime';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: -100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new NegativeProcessingTime());

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('estimatedProcessingTime must be non-negative');
    });

    it('should provide performance recommendations', () => {
      class SlowAnalyzer {
        readonly name = 'SlowAnalyzer';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: [], // Empty array
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 10000, // 10 seconds
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new SlowAnalyzer());

      expect(result.isValid).toBe(true);
      expect(result.recommendations).toContain('Consider optimizing analyzer for better performance (>5s processing time)');
      expect(result.recommendations).toContain('Consider specifying supported content types for better optimization');
    });

    it('should handle null capabilities return', () => {
      class NullCapabilities {
        readonly name = 'NullCapabilities';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return null;
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new NullCapabilities() as any);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('getCapabilities method returned null or undefined');
    });

    it('should handle undefined capabilities return', () => {
      class UndefinedCapabilities {
        readonly name = 'UndefinedCapabilities';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return undefined;
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new UndefinedCapabilities() as any);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('getCapabilities method returned null or undefined');
    });
  });

  describe('Dependency Validation - Various Types', () => {
    it('should validate analyzer with no dependencies', () => {
      class NoDependencies {
        readonly name = 'NoDependencies';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateDependencies(new NoDependencies());

      expect(result.isValid).toBe(true);
      expect(result.missingDependencies).toHaveLength(0);
      expect(result.circularDependencies).toHaveLength(0);
      expect(result.resolutionOrder).toHaveLength(0);
    });

    it('should handle analyzer with multiple dependencies', () => {
      class MultipleDependencies {
        readonly name = 'MultipleDependencies';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: true,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 500,
            dependencies: ['Parser', 'Validator', 'Cache', 'Logger']
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateDependencies(new MultipleDependencies());

      expect(result.isValid).toBe(true);
      expect(result.resolutionOrder).toContain('Parser');
      expect(result.resolutionOrder).toContain('Validator');
      expect(result.resolutionOrder).toContain('Cache');
      expect(result.resolutionOrder).toContain('Logger');
      expect(result.resolutionOrder).toHaveLength(4);
    });

    it('should handle analyzer without getCapabilities method', () => {
      class NoCapabilitiesMethod {
        readonly name = 'NoCapabilitiesMethod';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateDependencies(new NoCapabilitiesMethod() as any);

      expect(result.isValid).toBe(true);
      expect(result.missingDependencies).toHaveLength(0);
      expect(result.resolutionOrder).toHaveLength(0);
    });

    it('should handle analyzer with throwing getCapabilities method', () => {
      class ThrowingCapabilities {
        readonly name = 'ThrowingCapabilities';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          throw new Error('Capabilities error');
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateDependencies(new ThrowingCapabilities());

      expect(result.isValid).toBe(true); // Should not fail dependency validation due to capability errors
      expect(result.missingDependencies).toHaveLength(0);
    });
  });

  describe('Error Handling in Validation', () => {
    it('should handle analyzer with throwing validateInterface method', () => {
      class ThrowingValidateInterface {
        readonly name = 'ThrowingValidateInterface';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          throw new Error('Validation error');
        }
      }

      const result = validator.validateAnalyzerInterface(new ThrowingValidateInterface());

      expect(result.isValid).toBe(false);
      expect(result.details.some(d => d.includes('Error calling validateInterface'))).toBe(true);
    });

    it('should handle analyzer with throwing getCapabilities method', () => {
      class ThrowingGetCapabilities {
        readonly name = 'ThrowingGetCapabilities';

        async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
          return { success: true, data: {}, confidence: 1 };
        }

        getCapabilities() {
          throw new Error('Capabilities error');
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateCapabilities(new ThrowingGetCapabilities());

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('Error validating capabilities'))).toBe(true);
    });

    it('should handle completely invalid objects', () => {
      const notAnAnalyzer = {
        someProperty: 'value',
        someMethod: () => 'not an analyzer'
      };

      const result = validator.validateAnalyzerInterface(notAnAnalyzer as any);

      expect(result.isValid).toBe(false);
      expect(result.missingMethods.length).toBeGreaterThan(0);
      expect(result.complianceScore).toBeLessThan(1);
    });

    it('should handle null analyzer', () => {
      const result = validator.validateAnalyzerInterface(null as any);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('Analyzer is null');
      expect(result.complianceScore).toBe(0);
    });

    it('should handle undefined analyzer', () => {
      const result = validator.validateAnalyzerInterface(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('Analyzer is undefined');
      expect(result.complianceScore).toBe(0);
    });
  });

  describe('Comprehensive Validation Scenarios', () => {
    it('should provide detailed validation for complex invalid analyzer', () => {
      class ComplexInvalidAnalyzer {
        // Wrong type for name
        readonly name = 123;
        
        // Missing analyze method entirely
        
        // Wrong return type for getCapabilities
        getCapabilities() {
          return 'not capabilities';
        }

        // Wrong return type for validateInterface
        validateInterface() {
          return 'not boolean';
        }
      }

      const validation = validator.validateAnalyzer(new ComplexInvalidAnalyzer() as any);

      expect(validation.interfaceCompliance.isValid).toBe(false);
      expect(validation.interfaceCompliance.missingMethods).toContain('analyze');
      expect(validation.interfaceCompliance.details).toContain("Property 'name' must be a string");
      expect(validation.interfaceCompliance.details).toContain('validateInterface method must return a boolean');
      
      expect(validation.capabilityValidation.isValid).toBe(false);
      expect(validation.capabilityValidation.issues.length).toBeGreaterThan(0);
    });

    it('should calculate accurate compliance scores', () => {
      class PartiallyCompliantAnalyzer {
        readonly name = 'PartiallyCompliant';
        
        // Missing analyze method
        
        getCapabilities() {
          return {
            supportedContentTypes: ['text/markdown'],
            requiresContext: false,
            canProcessLargeFiles: true,
            estimatedProcessingTime: 100,
            dependencies: []
          };
        }

        validateInterface(): boolean {
          return true;
        }
      }

      const result = validator.validateAnalyzerInterface(new PartiallyCompliantAnalyzer() as any);

      expect(result.isValid).toBe(false);
      expect(result.complianceScore).toBeGreaterThan(0);
      expect(result.complianceScore).toBeLessThan(1);
      
      // Should have 3 required methods + 1 required property = 4 total checks
      // Missing 1 method (analyze) = 3/4 = 0.75
      expect(result.complianceScore).toBe(0.75);
    });

    it('should handle analyzer with all validation issues', () => {
      class AllIssuesAnalyzer {
        // No name property
        
        // analyze method with wrong signature
        analyze(oneParam: any) {
          return 'wrong return type';
        }

        // getCapabilities returns invalid structure
        getCapabilities() {
          return {
            supportedContentTypes: 'not array',
            requiresContext: 'not boolean',
            canProcessLargeFiles: 'not boolean',
            estimatedProcessingTime: 'not number',
            dependencies: 'not array'
          };
        }

        // validateInterface returns wrong type
        validateInterface() {
          return 'not boolean';
        }
      }

      const validation = validator.validateAnalyzer(new AllIssuesAnalyzer() as any);

      expect(validation.interfaceCompliance.isValid).toBe(false);
      expect(validation.capabilityValidation.isValid).toBe(false);
      expect(validation.dependencyValidation.isValid).toBe(true); // Dependencies validation is more lenient
      
      expect(validation.interfaceCompliance.details.length).toBeGreaterThanOrEqual(3);
      expect(validation.capabilityValidation.issues.length).toBeGreaterThanOrEqual(3);
    });
  });
});