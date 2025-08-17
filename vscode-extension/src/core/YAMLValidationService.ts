import * as vscode from 'vscode';
import * as yaml from 'yaml';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { WorkflowValidationResult, ValidationError, ValidationSeverity } from './types';

/**
 * Service for validating YAML workflow files against GitHub Actions schema
 */
export class YAMLValidationService {
  private ajv: Ajv;
  private githubActionsSchema: any;
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('readme-to-cicd-yaml');
    this.loadGitHubActionsSchema();
  }

  /**
   * Load GitHub Actions workflow schema
   */
  private async loadGitHubActionsSchema(): Promise<void> {
    // GitHub Actions workflow schema (simplified version)
    this.githubActionsSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        on: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
            {
              type: 'object',
              properties: {
                push: {
                  type: 'object',
                  properties: {
                    branches: { type: 'array', items: { type: 'string' } },
                    tags: { type: 'array', items: { type: 'string' } },
                    paths: { type: 'array', items: { type: 'string' } }
                  }
                },
                pull_request: {
                  type: 'object',
                  properties: {
                    branches: { type: 'array', items: { type: 'string' } },
                    paths: { type: 'array', items: { type: 'string' } }
                  }
                },
                schedule: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      cron: { type: 'string' }
                    },
                    required: ['cron']
                  }
                },
                workflow_dispatch: { type: 'object' }
              }
            }
          ]
        },
        env: {
          type: 'object',
          patternProperties: {
            '^[A-Za-z_][A-Za-z0-9_]*$': { type: 'string' }
          }
        },
        jobs: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z_][a-zA-Z0-9_-]*$': {
              type: 'object',
              properties: {
                'runs-on': {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ]
                },
                needs: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ]
                },
                if: { type: 'string' },
                env: {
                  type: 'object',
                  patternProperties: {
                    '^[A-Za-z_][A-Za-z0-9_]*$': { type: 'string' }
                  }
                },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      id: { type: 'string' },
                      if: { type: 'string' },
                      uses: { type: 'string' },
                      run: { type: 'string' },
                      with: { type: 'object' },
                      env: {
                        type: 'object',
                        patternProperties: {
                          '^[A-Za-z_][A-Za-z0-9_]*$': { type: 'string' }
                        }
                      }
                    }
                  }
                }
              },
              required: ['runs-on']
            }
          }
        }
      },
      required: ['on', 'jobs']
    };

    this.ajv.addSchema(this.githubActionsSchema, 'github-actions-workflow');
  }

  /**
   * Validate YAML syntax and structure
   */
  public async validateYAMLFile(document: vscode.TextDocument): Promise<WorkflowValidationResult> {
    const content = document.getText();
    const errors: ValidationError[] = [];

    try {
      // First, validate YAML syntax
      const parsedYaml = yaml.parseDocument(content);
      
      if (parsedYaml.errors.length > 0) {
        for (const error of parsedYaml.errors) {
          const pos = error.pos as [number, number] | undefined;
          errors.push({
            message: `YAML syntax error: ${error.message}`,
            severity: ValidationSeverity.Error,
            line: pos ? this.getLineFromPosition(content, pos[0]) : 0,
            column: pos ? this.getColumnFromPosition(content, pos[0]) : 0,
            code: 'yaml-syntax-error'
          });
        }
      }

      // If YAML is valid, validate against GitHub Actions schema
      if (errors.length === 0) {
        const yamlObject = parsedYaml.toJS();
        const validate = this.ajv.getSchema('github-actions-workflow');
        
        if (validate && !validate(yamlObject)) {
          for (const error of validate.errors || []) {
            const ajvError = error as ErrorObject;
            errors.push({
              message: `Schema validation error: ${ajvError.message} at ${ajvError.instancePath}`,
              severity: ValidationSeverity.Error,
              line: this.getLineFromPath(content, ajvError.instancePath || ''),
              column: 0,
              code: 'schema-validation-error',
              data: ajvError
            });
          }
        }
      }

      // Additional GitHub Actions specific validations
      if (errors.length === 0) {
        const additionalErrors = await this.validateGitHubActionsSpecific(content, parsedYaml.toJS());
        errors.push(...additionalErrors);
      }

    } catch (error) {
      errors.push({
        message: `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: ValidationSeverity.Error,
        line: 0,
        column: 0,
        code: 'parse-error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: errors.filter(e => e.severity === ValidationSeverity.Warning)
    };
  }

  /**
   * Perform GitHub Actions specific validations
   */
  private async validateGitHubActionsSpecific(content: string, yamlObject: any): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate action references
    if (yamlObject.jobs) {
      for (const [jobName, job] of Object.entries(yamlObject.jobs as any)) {
        const jobObj = job as any;
        if (jobObj.steps && Array.isArray(jobObj.steps)) {
          for (let i = 0; i < jobObj.steps.length; i++) {
            const step = jobObj.steps[i];
            if (step && step.uses) {
              const actionValidation = await this.validateActionReference(step.uses);
              if (!actionValidation.isValid) {
                errors.push({
                  message: `Invalid action reference: ${step.uses}`,
                  severity: ValidationSeverity.Warning,
                  line: this.getLineFromPath(content, `/jobs/${jobName}/steps/${i}/uses`),
                  column: 0,
                  code: 'invalid-action-reference'
                });
              }
            }
          }
        }
      }
    }

    // Validate environment variable names
    if (yamlObject.env) {
      for (const [envName] of Object.entries(yamlObject.env)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(envName)) {
          errors.push({
            message: `Invalid environment variable name: ${envName}`,
            severity: ValidationSeverity.Error,
            line: this.getLineFromPath(content, `/env/${envName}`),
            column: 0,
            code: 'invalid-env-name'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate action reference format and availability
   */
  private async validateActionReference(actionRef: string): Promise<{ isValid: boolean; suggestion?: string }> {
    // Basic format validation
    const actionPattern = /^([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)@([a-zA-Z0-9_.-]+)$/;
    if (!actionPattern.test(actionRef)) {
      return { isValid: false, suggestion: 'Action reference should be in format: owner/repo@version' };
    }

    // TODO: In a real implementation, you might want to check against GitHub API
    // For now, we'll just validate the format
    return { isValid: true };
  }

  /**
   * Update diagnostics for a document
   */
  public async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
    if (!this.isWorkflowFile(document)) {
      return;
    }

    const validationResult = await this.validateYAMLFile(document);
    const diagnostics: vscode.Diagnostic[] = [];

    for (const error of validationResult.errors) {
      const range = new vscode.Range(
        new vscode.Position(error.line, error.column),
        new vscode.Position(error.line, error.column + 10) // Approximate end position
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        error.message,
        error.severity === ValidationSeverity.Error 
          ? vscode.DiagnosticSeverity.Error 
          : vscode.DiagnosticSeverity.Warning
      );

      diagnostic.code = error.code;
      diagnostic.source = 'readme-to-cicd';
      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Clear diagnostics for a document
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Check if document is a workflow file
   */
  private isWorkflowFile(document: vscode.TextDocument): boolean {
    const workflowPath = '.github/workflows/';
    return document.uri.fsPath.includes(workflowPath) && 
           (document.uri.fsPath.endsWith('.yml') || document.uri.fsPath.endsWith('.yaml'));
  }

  /**
   * Get line number from character position
   */
  private getLineFromPosition(content: string, position: number): number {
    const lines = content.substring(0, position).split('\n');
    return Math.max(0, lines.length - 1);
  }

  /**
   * Get column number from character position
   */
  private getColumnFromPosition(content: string, position: number): number {
    const lines = content.substring(0, position).split('\n');
    return lines[lines.length - 1].length;
  }

  /**
   * Get line number from JSON path
   */
  private getLineFromPath(content: string, path: string): number {
    // This is a simplified implementation
    // In a real scenario, you'd want to map JSON paths to YAML line numbers
    const lines = content.split('\n');
    const pathParts = path.split('/').filter(p => p);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (pathParts.some(part => line.includes(part))) {
        return i;
      }
    }
    
    return 0;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}