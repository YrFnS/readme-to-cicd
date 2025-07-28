/**
 * Unit tests for Component Interface Validator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { 
  ComponentInterfaceValidator,
  InterfaceContract,
  ValidationReportGenerator,
  InterfaceValidationResult,
  DataContractValidationResult,
  CompilationResult
} from '../../src/validation/interface-validator';

// Mock fs module
vi.mock('fs');
vi.mock('child_process');

const mockFs = vi.mocked(fs);

describe('ComponentInterfaceValidator', () => {
  let validator: ComponentInterfaceValidator;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    validator = new ComponentInterfaceValidator(mockProjectRoot);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateInterface', () => {
    it('should validate a correctly implemented interface', async () => {
      const contract: InterfaceContract = {
        name: 'TestInterface',
        methods: [
          {
            name: 'testMethod',
            parameters: [{ name: 'param', type: 'string', isOptional: false }],
            returnType: 'Promise<string>',
            isAsync: true,
            isOptional: false
          }
        ],
        properties: [
          {
            name: 'testProperty',
            type: 'string',
            isOptional: false,
            isReadonly: false
          }
        ]
      };

      const mockFileContent = `
        export interface TestInterface {
          testProperty: string;
          testMethod(param: string): Promise<string>;
        }
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);
      mockFs.statSync.mockReturnValue({ size: 1000 } as any);

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(true);
      expect(result.component).toBe('TestComponent');
      expect(result.interface).toBe('TestInterface');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing interface file', async () => {
      const contract: InterfaceContract = {
        name: 'MissingInterface',
        methods: [],
        properties: []
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INTERFACE_FILE_NOT_FOUND');
    });

    it('should detect missing interface definition', async () => {
      const contract: InterfaceContract = {
        name: 'MissingInterface',
        methods: [],
        properties: []
      };

      // Mock file exists but doesn't contain the interface
      mockFs.existsSync.mockImplementation((path) => {
        // Return false for all possible paths to simulate interface not found
        return false;
      });

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INTERFACE_FILE_NOT_FOUND');
    });

    it('should detect missing methods', async () => {
      const contract: InterfaceContract = {
        name: 'TestInterface',
        methods: [
          {
            name: 'missingMethod',
            parameters: [],
            returnType: 'void',
            isAsync: false,
            isOptional: false
          }
        ],
        properties: []
      };

      const mockFileContent = `
        export interface TestInterface {
          existingMethod(): void;
        }
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);
      mockFs.statSync.mockReturnValue({ size: 300 } as any);

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_METHOD');
      expect(result.errors[0].message).toContain('missingMethod');
    });

    it('should detect missing properties', async () => {
      const contract: InterfaceContract = {
        name: 'TestInterface',
        methods: [],
        properties: [
          {
            name: 'missingProperty',
            type: 'string',
            isOptional: false,
            isReadonly: false
          }
        ]
      };

      const mockFileContent = `
        export interface TestInterface {
          existingProperty: number;
        }
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);
      mockFs.statSync.mockReturnValue({ size: 200 } as any);

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_PROPERTY');
      expect(result.errors[0].message).toContain('missingProperty');
    });

    it('should handle validation errors gracefully', async () => {
      const contract: InterfaceContract = {
        name: 'TestInterface',
        methods: [],
        properties: []
      };

      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });

    it('should validate interface with generics', async () => {
      const contract: InterfaceContract = {
        name: 'GenericInterface',
        methods: [],
        properties: [],
        generics: ['T']
      };

      const mockFileContent = `
        export interface GenericInterface<T> {
          data: T;
        }
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);
      mockFs.statSync.mockReturnValue({ size: 150 } as any);

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(true);
    });

    it('should validate readonly properties', async () => {
      const contract: InterfaceContract = {
        name: 'TestInterface',
        methods: [],
        properties: [
          {
            name: 'readonlyProp',
            type: 'string',
            isOptional: false,
            isReadonly: true
          }
        ]
      };

      const mockFileContent = `
        export interface TestInterface {
          readonly readonlyProp: string;
        }
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);
      mockFs.statSync.mockReturnValue({ size: 120 } as any);

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(true);
    });

    it('should validate optional properties and methods', async () => {
      const contract: InterfaceContract = {
        name: 'TestInterface',
        methods: [
          {
            name: 'optionalMethod',
            parameters: [],
            returnType: 'void',
            isAsync: false,
            isOptional: true
          }
        ],
        properties: [
          {
            name: 'optionalProp',
            type: 'string',
            isOptional: true,
            isReadonly: false
          }
        ]
      };

      const mockFileContent = `
        export interface TestInterface {
          optionalProp?: string;
          optionalMethod?(): void;
        }
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);
      mockFs.statSync.mockReturnValue({ size: 140 } as any);

      const result = await validator.validateInterface('TestComponent', contract);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateAllInterfaces', () => {
    it('should validate all expected interfaces', async () => {
      const mockFileContent = `
        export interface ReadmeParser {
          parseFile(filePath: string): Promise<ParseResult>;
          parseContent(content: string): Promise<ParseResult>;
        }
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);
      mockFs.statSync.mockReturnValue({ size: 500 } as any);

      const results = await validator.validateAllInterfaces();

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      
      // Should include ReadmeParser validation
      const readmeParserResult = results.find(r => r.interface === 'ReadmeParser');
      expect(readmeParserResult).toBeDefined();
    });
  });

  describe('validateDataContracts', () => {
    it('should validate data contracts between components', async () => {
      const mockFileContent = `
        export interface LanguageContext {
          language: string;
          confidence: number;
          sourceRange: SourceRange;
          evidence: Evidence[];
        }
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);

      const results = await validator.validateDataContracts();

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should detect missing data contract interfaces', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const results = await validator.validateDataContracts();

      expect(results).toBeInstanceOf(Array);
      // Should have errors for missing interfaces
      const hasErrors = results.some(r => r.errors.length > 0);
      expect(hasErrors).toBe(true);
    });
  });

  describe('validateTypeScriptCompilation', () => {
    it('should validate successful TypeScript compilation', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await validator.validateTypeScriptCompilation();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle TypeScript compilation errors', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('src/test.ts(10,5): error TS2322: Type string is not assignable to type number');
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Error exit code
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await validator.validateTypeScriptCompilation();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe(2322);
    });
  });
});

describe('ValidationReportGenerator', () => {
  it('should generate comprehensive validation report', () => {
    const interfaceResults: InterfaceValidationResult[] = [
      {
        isValid: true,
        component: 'TestComponent',
        interface: 'TestInterface',
        errors: [],
        warnings: [],
        metadata: {
          validatedAt: new Date(),
          validationDuration: 100,
          fileSize: 1000,
          linesOfCode: 50,
          interfaceCount: 1
        }
      }
    ];

    const dataContractResults: DataContractValidationResult[] = [
      {
        isValid: true,
        contract: {
          source: 'ComponentA',
          target: 'ComponentB',
          interface: 'DataInterface',
          description: 'Test contract',
          requiredFields: ['field1']
        },
        errors: [],
        warnings: [],
        validatedAt: new Date()
      }
    ];

    const compilationResult: CompilationResult = {
      success: true,
      errors: [],
      warnings: [],
      outputFiles: [],
      compilationTime: 2000
    };

    const report = ValidationReportGenerator.generateReport(
      interfaceResults,
      dataContractResults,
      compilationResult
    );

    expect(report.summary.overallValid).toBe(true);
    expect(report.summary.totalInterfaces).toBe(1);
    expect(report.summary.validInterfaces).toBe(1);
    expect(report.summary.totalDataContracts).toBe(1);
    expect(report.summary.validDataContracts).toBe(1);
    expect(report.summary.compilationSuccess).toBe(true);
    expect(report.recommendations).toContain('All validations passed! Consider adding more comprehensive integration tests.');
  });

  it('should generate report with errors and recommendations', () => {
    const interfaceResults: InterfaceValidationResult[] = [
      {
        isValid: false,
        component: 'TestComponent',
        interface: 'TestInterface',
        errors: [
          {
            code: 'MISSING_METHOD',
            message: 'Method missing',
            severity: 'error'
          }
        ],
        warnings: [],
        metadata: {
          validatedAt: new Date(),
          validationDuration: 100,
          fileSize: 1000,
          linesOfCode: 50,
          interfaceCount: 1
        }
      }
    ];

    const dataContractResults: DataContractValidationResult[] = [];

    const compilationResult: CompilationResult = {
      success: false,
      errors: [
        {
          file: 'test.ts',
          line: 10,
          column: 5,
          code: 2322,
          message: 'Type error',
          severity: 'error'
        }
      ],
      warnings: [],
      outputFiles: [],
      compilationTime: 1500
    };

    const report = ValidationReportGenerator.generateReport(
      interfaceResults,
      dataContractResults,
      compilationResult
    );

    expect(report.summary.overallValid).toBe(false);
    expect(report.summary.totalErrors).toBe(2); // 1 interface + 1 compilation
    expect(report.recommendations).toContain('Fix 1 invalid interface(s) to ensure proper component integration');
    expect(report.recommendations).toContain('Fix 1 TypeScript compilation error(s)');
  });
});