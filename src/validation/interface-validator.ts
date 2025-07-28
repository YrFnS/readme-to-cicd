/**
 * Component Interface Validation
 * 
 * Provides comprehensive validation of component interfaces, data contracts,
 * and TypeScript compilation to ensure proper integration between components.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

/**
 * Interface contract definition for validation
 */
export interface InterfaceContract {
  /** Name of the interface */
  name: string;
  /** Required methods and their signatures */
  methods: MethodSignature[];
  /** Required properties and their types */
  properties: PropertySignature[];
  /** Generic type parameters if any */
  generics?: string[];
  /** Extends clause if any */
  extends?: string[];
}

/**
 * Method signature definition
 */
export interface MethodSignature {
  name: string;
  parameters: ParameterSignature[];
  returnType: string;
  isAsync: boolean;
  isOptional: boolean;
}

/**
 * Parameter signature definition
 */
export interface ParameterSignature {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
}

/**
 * Property signature definition
 */
export interface PropertySignature {
  name: string;
  type: string;
  isOptional: boolean;
  isReadonly: boolean;
}

/**
 * Data contract between components
 */
export interface DataContract {
  /** Source component name */
  source: string;
  /** Target component name */
  target: string;
  /** Interface used for data transfer */
  interface: string;
  /** Description of the data flow */
  description: string;
  /** Required fields in the data */
  requiredFields: string[];
  /** Optional fields in the data */
  optionalFields?: string[];
}

/**
 * Validation result for interface contracts
 */
export interface InterfaceValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Component name being validated */
  component: string;
  /** Interface name being validated */
  interface: string;
  /** Validation errors found */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Validation metadata */
  metadata: ValidationMetadata;
}

/**
 * Validation error details
 */
export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  suggestion?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
  location?: {
    file: string;
    line?: number;
  };
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  validatedAt: Date;
  validationDuration: number;
  fileSize: number;
  linesOfCode: number;
  interfaceCount: number;
}

/**
 * TypeScript compilation result
 */
export interface CompilationResult {
  success: boolean;
  errors: CompilationError[];
  warnings: CompilationError[];
  outputFiles: string[];
  compilationTime: number;
}

/**
 * TypeScript compilation error
 */
export interface CompilationError {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Component interface validator
 */
export class ComponentInterfaceValidator {
  private readonly projectRoot: string;
  private readonly expectedContracts: Map<string, InterfaceContract[]>;
  private readonly dataContracts: DataContract[];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.expectedContracts = new Map();
    this.dataContracts = [];
    this.initializeExpectedContracts();
    this.initializeDataContracts();
  }

  /**
   * Validate all component interfaces
   */
  public async validateAllInterfaces(): Promise<InterfaceValidationResult[]> {
    const results: InterfaceValidationResult[] = [];
    
    for (const [component, contracts] of this.expectedContracts) {
      for (const contract of contracts) {
        const result = await this.validateInterface(component, contract);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Validate a specific component interface
   */
  public async validateInterface(
    component: string, 
    contract: InterfaceContract
  ): Promise<InterfaceValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Find the interface file
      const interfaceFile = this.findInterfaceFile(component, contract.name);
      if (!interfaceFile) {
        errors.push({
          code: 'INTERFACE_FILE_NOT_FOUND',
          message: `Interface file for ${contract.name} not found in component ${component}`,
          severity: 'error',
          suggestion: `Create interface file at expected location for ${component}`
        });
        
        return this.createValidationResult(
          false, component, contract.name, errors, warnings, startTime, 0, 0, 0
        );
      }

      // Read and parse the interface file
      const fileContent = fs.readFileSync(interfaceFile, 'utf8');
      const fileStats = fs.statSync(interfaceFile);
      const linesOfCode = fileContent.split('\n').length;

      // Validate interface exists
      const interfaceExists = this.checkInterfaceExists(fileContent, contract.name);
      if (!interfaceExists) {
        errors.push({
          code: 'INTERFACE_NOT_DEFINED',
          message: `Interface ${contract.name} is not defined in ${interfaceFile}`,
          severity: 'error',
          location: { file: interfaceFile },
          suggestion: `Define interface ${contract.name} with required methods and properties`
        });
      } else {
        // Validate interface structure
        await this.validateInterfaceStructure(fileContent, contract, interfaceFile, errors, warnings);
      }

      // Count interfaces in file
      const interfaceCount = this.countInterfaces(fileContent);

      const isValid = errors.length === 0;
      return this.createValidationResult(
        isValid, component, contract.name, errors, warnings, 
        startTime, fileStats.size, linesOfCode, interfaceCount
      );

    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });

      return this.createValidationResult(
        false, component, contract.name, errors, warnings, startTime, 0, 0, 0
      );
    }
  }

  /**
   * Validate data contracts between components
   */
  public async validateDataContracts(): Promise<DataContractValidationResult[]> {
    const results: DataContractValidationResult[] = [];

    for (const contract of this.dataContracts) {
      const result = await this.validateDataContract(contract);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate TypeScript compilation
   */
  public async validateTypeScriptCompilation(): Promise<CompilationResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const tscPath = path.join(this.projectRoot, 'node_modules', '.bin', 'tsc');
      const configPath = path.join(this.projectRoot, 'tsconfig.json');

      const tsc = spawn('node', [tscPath, '--noEmit', '--project', configPath], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      tsc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      tsc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tsc.on('close', (code) => {
        const compilationTime = Date.now() - startTime;
        const success = code === 0;
        
        const errors: CompilationError[] = [];
        const warnings: CompilationError[] = [];

        // Parse TypeScript compiler output
        const output = stderr || stdout;
        const lines = output.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^(.+?)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)$/);
          if (match) {
            const [, file, lineNum, colNum, severity, code, message] = match;
            if (file && lineNum && colNum && code && message) {
              const error: CompilationError = {
                file: file.replace(this.projectRoot, '').replace(/^[\/\\]/, ''),
                line: parseInt(lineNum, 10),
                column: parseInt(colNum, 10),
                code: parseInt(code, 10),
                message: message.trim(),
                severity: severity as 'error' | 'warning'
              };

              if (severity === 'error') {
                errors.push(error);
              } else {
                warnings.push(error);
              }
            }
          }
        }

        resolve({
          success,
          errors,
          warnings,
          outputFiles: [], // Not applicable for --noEmit
          compilationTime
        });
      });

      tsc.on('error', (error) => {
        resolve({
          success: false,
          errors: [{
            file: 'typescript',
            line: 0,
            column: 0,
            code: 0,
            message: `TypeScript compilation failed: ${error.message}`,
            severity: 'error'
          }],
          warnings: [],
          outputFiles: [],
          compilationTime: Date.now() - startTime
        });
      });
    });
  }

  /**
   * Initialize expected interface contracts for all components
   */
  private initializeExpectedContracts(): void {
    // README Parser contracts
    this.expectedContracts.set('ReadmeParser', [
      {
        name: 'ReadmeParser',
        methods: [
          {
            name: 'parseFile',
            parameters: [{ name: 'filePath', type: 'string', isOptional: false }],
            returnType: 'Promise<ParseResult>',
            isAsync: true,
            isOptional: false
          },
          {
            name: 'parseContent',
            parameters: [{ name: 'content', type: 'string', isOptional: false }],
            returnType: 'Promise<ParseResult>',
            isAsync: true,
            isOptional: false
          }
        ],
        properties: []
      }
    ]);

    // Enhanced LanguageDetector contracts
    this.expectedContracts.set('LanguageDetector', [
      {
        name: 'EnhancedLanguageDetector',
        methods: [
          {
            name: 'detect',
            parameters: [{ name: 'content', type: 'string', isOptional: false }],
            returnType: 'DetectionResult',
            isAsync: false,
            isOptional: false
          },
          {
            name: 'getContext',
            parameters: [{ name: 'position', type: 'number', isOptional: false }],
            returnType: 'LanguageContext',
            isAsync: false,
            isOptional: false
          },
          {
            name: 'getConfidenceScore',
            parameters: [
              { name: 'language', type: 'string', isOptional: false },
              { name: 'evidence', type: 'Evidence[]', isOptional: false }
            ],
            returnType: 'number',
            isAsync: false,
            isOptional: false
          }
        ],
        properties: []
      }
    ]);

    // Context-Aware CommandExtractor contracts
    this.expectedContracts.set('CommandExtractor', [
      {
        name: 'ContextAwareCommandExtractor',
        methods: [
          {
            name: 'extractWithContext',
            parameters: [
              { name: 'content', type: 'string', isOptional: false },
              { name: 'context', type: 'LanguageContext[]', isOptional: false }
            ],
            returnType: 'CommandExtractionResult',
            isAsync: false,
            isOptional: false
          },
          {
            name: 'inheritContext',
            parameters: [{ name: 'context', type: 'LanguageContext', isOptional: false }],
            returnType: 'void',
            isAsync: false,
            isOptional: false
          }
        ],
        properties: []
      }
    ]);

    // Integrated ResultAggregator contracts
    this.expectedContracts.set('ResultAggregator', [
      {
        name: 'IntegratedResultAggregator',
        methods: [
          {
            name: 'aggregate',
            parameters: [{ name: 'results', type: 'AnalyzerResult[]', isOptional: false }],
            returnType: 'AggregatedResult',
            isAsync: false,
            isOptional: false
          },
          {
            name: 'resolveConflicts',
            parameters: [{ name: 'conflictingResults', type: 'AnalyzerResult[]', isOptional: false }],
            returnType: 'ResolvedResult',
            isAsync: false,
            isOptional: false
          },
          {
            name: 'validateIntegration',
            parameters: [{ name: 'result', type: 'AggregatedResult', isOptional: false }],
            returnType: 'ValidationResult',
            isAsync: false,
            isOptional: false
          }
        ],
        properties: []
      }
    ]);
  }

  /**
   * Initialize data contracts between components
   */
  private initializeDataContracts(): void {
    this.dataContracts.push(
      {
        source: 'LanguageDetector',
        target: 'CommandExtractor',
        interface: 'LanguageContext',
        description: 'Language context inheritance from detector to extractor',
        requiredFields: ['language', 'confidence', 'sourceRange', 'evidence']
      },
      {
        source: 'LanguageDetector',
        target: 'ResultAggregator',
        interface: 'DetectionResult',
        description: 'Detection results flow to aggregator',
        requiredFields: ['languages', 'contexts', 'overallConfidence']
      },
      {
        source: 'CommandExtractor',
        target: 'ResultAggregator',
        interface: 'CommandExtractionResult',
        description: 'Command extraction results flow to aggregator',
        requiredFields: ['commands', 'contextMappings', 'extractionMetadata']
      }
    );
  }

  // Helper methods continue in next part...  
/**
   * Find interface file for a component
   */
  private findInterfaceFile(component: string, interfaceName: string): string | null {
    const possiblePaths = [
      `src/${component.toLowerCase()}/types/index.ts`,
      `src/${component.toLowerCase()}/index.ts`,
      `src/shared/types/index.ts`,
      `src/shared/types/${component.toLowerCase()}.ts`,
      `src/parser/types/index.ts` // Fallback for parser types
    ];

    for (const relativePath of possiblePaths) {
      const fullPath = path.join(this.projectRoot, relativePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (this.checkInterfaceExists(content, interfaceName)) {
          return fullPath;
        }
      }
    }

    return null;
  }

  /**
   * Check if interface exists in file content
   */
  private checkInterfaceExists(content: string, interfaceName: string): boolean {
    const patterns = [
      new RegExp(`interface\\s+${interfaceName}\\s*{`, 'g'),
      new RegExp(`export\\s+interface\\s+${interfaceName}\\s*{`, 'g'),
      new RegExp(`interface\\s+${interfaceName}\\s*<.*?>\\s*{`, 'g'),
      new RegExp(`export\\s+interface\\s+${interfaceName}\\s*<.*?>\\s*{`, 'g')
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate interface structure against contract
   */
  private async validateInterfaceStructure(
    content: string,
    contract: InterfaceContract,
    filePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Extract interface definition
    const interfaceMatch = this.extractInterfaceDefinition(content, contract.name);
    if (!interfaceMatch) {
      errors.push({
        code: 'INTERFACE_EXTRACTION_FAILED',
        message: `Could not extract interface definition for ${contract.name}`,
        severity: 'error',
        location: { file: filePath }
      });
      return;
    }

    const interfaceBody = interfaceMatch.body;

    // Validate methods
    for (const method of contract.methods) {
      const methodExists = this.checkMethodExists(interfaceBody, method);
      if (!methodExists) {
        errors.push({
          code: 'MISSING_METHOD',
          message: `Method ${method.name} is missing from interface ${contract.name}`,
          severity: 'error',
          location: { file: filePath },
          suggestion: `Add method: ${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): ${method.returnType}`
        });
      } else {
        // Validate method signature
        const signatureValid = this.validateMethodSignature(interfaceBody, method);
        if (!signatureValid) {
          warnings.push({
            code: 'METHOD_SIGNATURE_MISMATCH',
            message: `Method ${method.name} signature may not match expected contract`,
            suggestion: `Verify method signature matches: ${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): ${method.returnType}`,
            location: { file: filePath }
          });
        }
      }
    }

    // Validate properties
    for (const property of contract.properties) {
      const propertyExists = this.checkPropertyExists(interfaceBody, property);
      if (!propertyExists) {
        errors.push({
          code: 'MISSING_PROPERTY',
          message: `Property ${property.name} is missing from interface ${contract.name}`,
          severity: 'error',
          location: { file: filePath },
          suggestion: `Add property: ${property.isReadonly ? 'readonly ' : ''}${property.name}${property.isOptional ? '?' : ''}: ${property.type}`
        });
      }
    }
  }

  /**
   * Extract interface definition from content
   */
  private extractInterfaceDefinition(content: string, interfaceName: string): { body: string } | null {
    const pattern = new RegExp(
      `(?:export\\s+)?interface\\s+${interfaceName}(?:\\s*<[^>]*>)?\\s*(?:extends\\s+[^{]*)?\\s*{([^}]*(?:{[^}]*}[^}]*)*)}`,
      'gs'
    );
    
    const match = pattern.exec(content);
    if (match && match[1]) {
      return { body: match[1] };
    }
    
    return null;
  }

  /**
   * Check if method exists in interface body
   */
  private checkMethodExists(interfaceBody: string, method: MethodSignature): boolean {
    // Check for method name with optional suffix
    const optionalSuffix = method.isOptional ? '\\?' : '\\??';
    const methodPattern = new RegExp(`${method.name}${optionalSuffix}\\s*\\(`, 'g');
    return methodPattern.test(interfaceBody);
  }

  /**
   * Validate method signature
   */
  private validateMethodSignature(interfaceBody: string, method: MethodSignature): boolean {
    // Basic signature validation - could be enhanced for parameter types
    const asyncPrefix = method.isAsync ? '(?:async\\s+)?' : '';
    const optionalSuffix = method.isOptional ? '\\?' : '';
    const pattern = new RegExp(
      `${asyncPrefix}${method.name}${optionalSuffix}\\s*\\([^)]*\\)\\s*:.*${method.returnType.replace(/[<>]/g, '\\$&')}`,
      'g'
    );
    
    return pattern.test(interfaceBody);
  }

  /**
   * Check if property exists in interface body
   */
  private checkPropertyExists(interfaceBody: string, property: PropertySignature): boolean {
    const readonlyPrefix = property.isReadonly ? 'readonly\\s+' : '(?:readonly\\s+)?';
    const optionalSuffix = property.isOptional ? '\\?' : '\\??';
    const pattern = new RegExp(`${readonlyPrefix}${property.name}${optionalSuffix}\\s*:`, 'g');
    
    return pattern.test(interfaceBody);
  }

  /**
   * Count interfaces in file content
   */
  private countInterfaces(content: string): number {
    const pattern = /(?:export\s+)?interface\s+\w+/g;
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Validate data contract between components
   */
  private async validateDataContract(contract: DataContract): Promise<DataContractValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if interface exists
    const interfaceFile = this.findInterfaceFile('shared', contract.interface);
    if (!interfaceFile) {
      errors.push({
        code: 'DATA_CONTRACT_INTERFACE_MISSING',
        message: `Interface ${contract.interface} for data contract ${contract.source} → ${contract.target} not found`,
        severity: 'error',
        suggestion: `Define interface ${contract.interface} in shared types`
      });
    } else {
      // Validate required fields exist in interface
      const content = fs.readFileSync(interfaceFile, 'utf8');
      const interfaceDefinition = this.extractInterfaceDefinition(content, contract.interface);
      
      if (interfaceDefinition) {
        for (const field of contract.requiredFields) {
          if (!interfaceDefinition.body.includes(field)) {
            warnings.push({
              code: 'MISSING_REQUIRED_FIELD',
              message: `Required field ${field} may be missing from interface ${contract.interface}`,
              suggestion: `Verify field ${field} exists in interface definition`,
              location: { file: interfaceFile }
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      contract,
      errors,
      warnings,
      validatedAt: new Date()
    };
  }

  /**
   * Create validation result
   */
  private createValidationResult(
    isValid: boolean,
    component: string,
    interfaceName: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    startTime: number,
    fileSize: number,
    linesOfCode: number,
    interfaceCount: number
  ): InterfaceValidationResult {
    return {
      isValid,
      component,
      interface: interfaceName,
      errors,
      warnings,
      metadata: {
        validatedAt: new Date(),
        validationDuration: Date.now() - startTime,
        fileSize,
        linesOfCode,
        interfaceCount
      }
    };
  }
}

/**
 * Data contract validation result
 */
export interface DataContractValidationResult {
  isValid: boolean;
  contract: DataContract;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validatedAt: Date;
}

/**
 * Validation report generator
 */
export class ValidationReportGenerator {
  /**
   * Generate comprehensive validation report
   */
  public static generateReport(
    interfaceResults: InterfaceValidationResult[],
    dataContractResults: DataContractValidationResult[],
    compilationResult: CompilationResult
  ): ValidationReport {
    const totalInterfaces = interfaceResults.length;
    const validInterfaces = interfaceResults.filter(r => r.isValid).length;
    const totalDataContracts = dataContractResults.length;
    const validDataContracts = dataContractResults.filter(r => r.isValid).length;

    const allErrors = [
      ...interfaceResults.flatMap(r => r.errors),
      ...dataContractResults.flatMap(r => r.errors),
      ...compilationResult.errors.map(e => ({
        code: `TS${e.code}`,
        message: e.message,
        severity: e.severity as 'error' | 'warning' | 'info',
        location: { file: e.file, line: e.line, column: e.column }
      }))
    ];

    const allWarnings = [
      ...interfaceResults.flatMap(r => r.warnings),
      ...dataContractResults.flatMap(r => r.warnings),
      ...compilationResult.warnings.map(w => ({
        code: `TS${w.code}`,
        message: w.message,
        location: { file: w.file, line: w.line }
      }))
    ];

    return {
      summary: {
        overallValid: allErrors.length === 0,
        totalInterfaces,
        validInterfaces,
        totalDataContracts,
        validDataContracts,
        compilationSuccess: compilationResult.success,
        totalErrors: allErrors.length,
        totalWarnings: allWarnings.length
      },
      interfaceValidation: {
        results: interfaceResults,
        summary: {
          total: totalInterfaces,
          valid: validInterfaces,
          invalid: totalInterfaces - validInterfaces
        }
      },
      dataContractValidation: {
        results: dataContractResults,
        summary: {
          total: totalDataContracts,
          valid: validDataContracts,
          invalid: totalDataContracts - validDataContracts
        }
      },
      compilationValidation: compilationResult,
      errors: allErrors,
      warnings: allWarnings,
      generatedAt: new Date(),
      recommendations: this.generateRecommendations(interfaceResults, dataContractResults, compilationResult)
    };
  }

  /**
   * Generate recommendations based on validation results
   */
  private static generateRecommendations(
    interfaceResults: InterfaceValidationResult[],
    dataContractResults: DataContractValidationResult[],
    compilationResult: CompilationResult
  ): string[] {
    const recommendations: string[] = [];

    // Interface recommendations
    const invalidInterfaces = interfaceResults.filter(r => !r.isValid);
    if (invalidInterfaces.length > 0) {
      recommendations.push(`Fix ${invalidInterfaces.length} invalid interface(s) to ensure proper component integration`);
    }

    // Data contract recommendations
    const invalidContracts = dataContractResults.filter(r => !r.isValid);
    if (invalidContracts.length > 0) {
      recommendations.push(`Resolve ${invalidContracts.length} data contract issue(s) to ensure proper data flow`);
    }

    // Compilation recommendations
    if (!compilationResult.success) {
      recommendations.push(`Fix ${compilationResult.errors.length} TypeScript compilation error(s)`);
    }

    if (compilationResult.warnings.length > 0) {
      recommendations.push(`Address ${compilationResult.warnings.length} TypeScript warning(s) for better code quality`);
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('All validations passed! Consider adding more comprehensive integration tests.');
    }

    return recommendations;
  }
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  summary: ValidationSummary;
  interfaceValidation: InterfaceValidationSummary;
  dataContractValidation: DataContractValidationSummary;
  compilationValidation: CompilationResult;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  generatedAt: Date;
  recommendations: string[];
}

/**
 * Validation summary
 */
export interface ValidationSummary {
  overallValid: boolean;
  totalInterfaces: number;
  validInterfaces: number;
  totalDataContracts: number;
  validDataContracts: number;
  compilationSuccess: boolean;
  totalErrors: number;
  totalWarnings: number;
}

/**
 * Interface validation summary
 */
export interface InterfaceValidationSummary {
  results: InterfaceValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

/**
 * Data contract validation summary
 */
export interface DataContractValidationSummary {
  results: DataContractValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}