import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Result } from '../shared/types/result.js';

/**
 * TypeScript error information
 */
export interface TypeScriptError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Compilation result information
 */
export interface CompilationResult {
  success: boolean;
  errorCount: number;
  errors: TypeScriptError[];
  warnings: TypeScriptError[];
  timestamp: string;
  exitCode: number;
}

/**
 * Compilation report for documentation and tracking
 */
export interface CompilationReport {
  result: CompilationResult;
  requirements: {
    requirement_3_1_zero_errors: boolean;
    requirement_3_2_successful_compilation: boolean;
    requirement_3_3_report_generated: boolean;
  };
  integrationDeploymentReady: boolean;
  summary: string;
}

/**
 * Resolution action tracking
 */
export interface ResolutionAction {
  type: 'type-import' | 'method-rename' | 'interface-fix';
  file: string;
  description: string;
  status: 'pending' | 'applied' | 'verified';
}

/**
 * Error resolution status tracking
 */
export interface ErrorResolutionStatus {
  totalErrors: number;
  resolvedErrors: number;
  remainingErrors: TypeScriptError[];
  resolutionActions: ResolutionAction[];
}

/**
 * CompilationValidator class for automated TypeScript error checking
 * 
 * Provides methods for running TypeScript compiler programmatically,
 * error reporting, and status tracking functionality.
 */
export class CompilationValidator {
  private currentResult: CompilationResult | null = null;

  /**
   * Run TypeScript compilation validation
   * 
   * @returns Promise<Result<CompilationResult, Error>>
   */
  async validateTypeScript(): Promise<Result<CompilationResult, Error>> {
    try {
      const timestamp = new Date().toISOString();
      
      // Initialize result structure
      const result: CompilationResult = {
        success: false,
        errorCount: 0,
        errors: [],
        warnings: [],
        timestamp,
        exitCode: 1
      };

      try {
        // Execute TypeScript compilation check
        execSync('npx tsc --noEmit', { 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // If we reach here, compilation succeeded
        result.success = true;
        result.exitCode = 0;
        result.errorCount = 0;
        
      } catch (error: any) {
        // Check if this is a compilation error (has stdout/stderr) or execution error
        if (error.stdout !== undefined || error.stderr !== undefined) {
          // Parse compilation errors from output
          const output = error.stdout || error.stderr || '';
          result.exitCode = error.status || 1;
          result.errors = this.parseTypeScriptErrors(output);
          result.warnings = this.parseTypeScriptWarnings(output);
          result.errorCount = result.errors.length;
          result.success = result.errorCount === 0;
        } else {
          // This is an execution error (command not found, etc.)
          throw error;
        }
      }

      this.currentResult = result;
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown validation error')
      };
    }
  }

  /**
   * Check current error count
   * 
   * @returns number of compilation errors
   */
  checkErrorCount(): number {
    return this.currentResult?.errorCount ?? -1;
  }

  /**
   * Generate comprehensive compilation report
   * 
   * @returns CompilationReport
   */
  generateReport(): CompilationReport {
    if (!this.currentResult) {
      throw new Error('No compilation result available. Run validateTypeScript() first.');
    }

    const report: CompilationReport = {
      result: this.currentResult,
      requirements: {
        requirement_3_1_zero_errors: this.currentResult.errorCount === 0,
        requirement_3_2_successful_compilation: this.currentResult.success,
        requirement_3_3_report_generated: true
      },
      integrationDeploymentReady: this.currentResult.success && this.currentResult.errorCount === 0,
      summary: this.generateSummary()
    };

    // Write report to file
    const reportPath = join(process.cwd(), 'compilation-validation-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Validate error fixes with comprehensive checking
   * 
   * @returns Promise<Result<boolean, TypeScriptError[]>>
   */
  async validateFixes(): Promise<Result<boolean, TypeScriptError[]>> {
    const validationResult = await this.validateTypeScript();
    
    if (!validationResult.success) {
      return {
        success: false,
        error: [new Error('Compilation validation failed') as any]
      };
    }

    const result = validationResult.data;
    
    if (result.errorCount === 0) {
      return { success: true, data: true };
    }
    
    return { 
      success: false, 
      error: result.errors 
    };
  }

  /**
   * Parse TypeScript errors from compiler output
   * 
   * @param output - Compiler output string
   * @returns Array of TypeScriptError objects
   */
  private parseTypeScriptErrors(output: string): TypeScriptError[] {
    const errors: TypeScriptError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('error TS')) {
        const error = this.parseErrorLine(line, 'error');
        if (error) {
          errors.push(error);
        }
      }
    }
    
    return errors;
  }

  /**
   * Parse TypeScript warnings from compiler output
   * 
   * @param output - Compiler output string
   * @returns Array of TypeScriptError objects (warnings)
   */
  private parseTypeScriptWarnings(output: string): TypeScriptError[] {
    const warnings: TypeScriptError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('warning TS')) {
        const warning = this.parseErrorLine(line, 'warning');
        if (warning) {
          warnings.push(warning);
        }
      }
    }
    
    return warnings;
  }

  /**
   * Parse individual error/warning line
   * 
   * @param line - Error line from compiler output
   * @param severity - 'error' or 'warning'
   * @returns TypeScriptError object or null
   */
  private parseErrorLine(line: string, severity: 'error' | 'warning'): TypeScriptError | null {
    // Pattern: file.ts(line,column): error TS2304: message
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/);
    
    if (match && match[1] && match[2] && match[3] && match[5] && match[6]) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        code: `TS${match[5]}`,
        message: match[6],
        severity
      };
    }
    
    // Fallback for simpler patterns
    const simpleMatch = line.match(/(error|warning)\s+TS(\d+):\s+(.+)/);
    if (simpleMatch && simpleMatch[2] && simpleMatch[3]) {
      return {
        file: 'unknown',
        line: 0,
        column: 0,
        code: `TS${simpleMatch[2]}`,
        message: simpleMatch[3],
        severity
      };
    }
    
    return null;
  }

  /**
   * Generate human-readable summary
   * 
   * @returns Summary string
   */
  private generateSummary(): string {
    if (!this.currentResult) {
      return 'No compilation result available';
    }

    const { success, errorCount, warnings } = this.currentResult;
    
    if (success) {
      return `✅ TypeScript compilation successful with ${warnings.length} warnings`;
    } else {
      return `❌ TypeScript compilation failed with ${errorCount} errors and ${warnings.length} warnings`;
    }
  }

  /**
   * Get current compilation result
   * 
   * @returns Current CompilationResult or null
   */
  getCurrentResult(): CompilationResult | null {
    return this.currentResult;
  }

  /**
   * Reset validator state
   */
  reset(): void {
    this.currentResult = null;
  }
}