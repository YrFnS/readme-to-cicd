/**
 * Workflow Validator for GitHub Actions YAML validation
 */

import * as yaml from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ValidationResult, ValidationError, ValidationWarning } from '../interfaces';
import { ValidationConfig, SchemaValidationResult, ActionValidationResult, ValidationIssue } from './validation-types';

/**
 * GitHub Actions workflow schema definition
 */
const GITHUB_ACTIONS_SCHEMA = {
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
            workflow_dispatch: { type: 'object' },
            repository_dispatch: { type: 'object' }
          }
        }
      ]
    },
    permissions: {
      oneOf: [
        { type: 'string', enum: ['read-all', 'write-all'] },
        {
          type: 'object',
          properties: {
            contents: { type: 'string', enum: ['read', 'write', 'none'] },
            'security-events': { type: 'string', enum: ['read', 'write', 'none'] },
            actions: { type: 'string', enum: ['read', 'write', 'none'] },
            checks: { type: 'string', enum: ['read', 'write', 'none'] },
            deployments: { type: 'string', enum: ['read', 'write', 'none'] },
            issues: { type: 'string', enum: ['read', 'write', 'none'] },
            packages: { type: 'string', enum: ['read', 'write', 'none'] },
            'pull-requests': { type: 'string', enum: ['read', 'write', 'none'] },
            'repository-projects': { type: 'string', enum: ['read', 'write', 'none'] },
            statuses: { type: 'string', enum: ['read', 'write', 'none'] }
          }
        }
      ]
    },
    env: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    defaults: {
      type: 'object',
      properties: {
        run: {
          type: 'object',
          properties: {
            shell: { type: 'string' },
            'working-directory': { type: 'string' }
          }
        }
      }
    },
    jobs: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z_][a-zA-Z0-9_-]*$': {
          type: 'object',
          properties: {
            name: { type: 'string' },
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
            permissions: {
              oneOf: [
                { type: 'string', enum: ['read-all', 'write-all'] },
                {
                  type: 'object',
                  properties: {
                    contents: { type: 'string', enum: ['read', 'write', 'none'] },
                    'security-events': { type: 'string', enum: ['read', 'write', 'none'] }
                  }
                }
              ]
            },
            environment: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' }
                  },
                  required: ['name']
                }
              ]
            },
            concurrency: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    group: { type: 'string' },
                    'cancel-in-progress': { type: 'boolean' }
                  },
                  required: ['group']
                }
              ]
            },
            outputs: {
              type: 'object',
              additionalProperties: { type: 'string' }
            },
            env: {
              type: 'object',
              additionalProperties: { type: 'string' }
            },
            defaults: {
              type: 'object',
              properties: {
                run: {
                  type: 'object',
                  properties: {
                    shell: { type: 'string' },
                    'working-directory': { type: 'string' }
                  }
                }
              }
            },
            'timeout-minutes': { type: 'number', minimum: 1, maximum: 360 },
            strategy: {
              type: 'object',
              properties: {
                matrix: {
                  type: 'object',
                  properties: {
                    include: { type: 'array' },
                    exclude: { type: 'array' }
                  },
                  additionalProperties: {
                    oneOf: [
                      { type: 'array' },
                      { type: 'string' },
                      { type: 'number' },
                      { type: 'boolean' }
                    ]
                  }
                },
                'fail-fast': { type: 'boolean' },
                'max-parallel': { type: 'number', minimum: 1 }
              }
            },
            'continue-on-error': { type: 'boolean' },
            container: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    image: { type: 'string' },
                    credentials: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    },
                    env: {
                      type: 'object',
                      additionalProperties: { type: 'string' }
                    },
                    ports: { type: 'array', items: { type: 'number' } },
                    volumes: { type: 'array', items: { type: 'string' } },
                    options: { type: 'string' }
                  },
                  required: ['image']
                }
              ]
            },
            services: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  image: { type: 'string' },
                  credentials: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  },
                  env: {
                    type: 'object',
                    additionalProperties: { type: 'string' }
                  },
                  ports: { type: 'array', items: { type: 'number' } },
                  volumes: { type: 'array', items: { type: 'string' } },
                  options: { type: 'string' }
                },
                required: ['image']
              }
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  uses: { type: 'string' },
                  run: { type: 'string' },
                  with: {
                    type: 'object',
                    additionalProperties: { type: 'string' }
                  },
                  env: {
                    type: 'object',
                    additionalProperties: { type: 'string' }
                  },
                  if: { type: 'string' },
                  'continue-on-error': { type: 'boolean' },
                  'timeout-minutes': { type: 'number', minimum: 1, maximum: 360 },
                  shell: { type: 'string' },
                  'working-directory': { type: 'string' }
                },
                oneOf: [
                  { required: ['uses'] },
                  { required: ['run'] }
                ]
              }
            }
          },
          required: ['runs-on', 'steps']
        }
      },
      additionalProperties: false
    }
  },
  required: ['jobs'],
  additionalProperties: false
};

/**
 * Known GitHub Actions marketplace actions with their latest versions
 */
const KNOWN_ACTIONS = {
  'actions/checkout': { latestVersion: 'v4', deprecated: false },
  'actions/setup-node': { latestVersion: 'v4', deprecated: false },
  'actions/setup-python': { latestVersion: 'v5', deprecated: false },
  'actions/setup-java': { latestVersion: 'v4', deprecated: false },
  'actions/setup-go': { latestVersion: 'v5', deprecated: false },
  'actions/cache': { latestVersion: 'v4', deprecated: false },
  'actions/upload-artifact': { latestVersion: 'v4', deprecated: false },
  'actions/download-artifact': { latestVersion: 'v4', deprecated: false },
  'docker/setup-buildx-action': { latestVersion: 'v3', deprecated: false },
  'docker/build-push-action': { latestVersion: 'v5', deprecated: false },
  'github/codeql-action/init': { latestVersion: 'v3', deprecated: false },
  'github/codeql-action/analyze': { latestVersion: 'v3', deprecated: false },
  'codecov/codecov-action': { latestVersion: 'v4', deprecated: false }
};

/**
 * Workflow Validator class using ajv for JSON schema validation
 */
export class WorkflowValidator {
  private config: ValidationConfig;
  private ajv: Ajv;

  constructor(config: ValidationConfig = { 
    strictMode: true, 
    allowUnknownActions: false, 
    validateActionVersions: true, 
    customRules: [] 
  }) {
    this.config = config;
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    
    // Add the GitHub Actions schema
    this.ajv.addSchema(GITHUB_ACTIONS_SCHEMA, 'github-actions-workflow');
  }

  /**
   * Validate workflow YAML content
   */
  validateWorkflow(yamlContent: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    try {
      // Parse YAML
      const workflowObject = yaml.parse(yamlContent);
      
      if (!workflowObject) {
        errors.push({
          type: 'syntax',
          message: 'Empty or invalid YAML content',
          severity: 'error'
        });
        return { isValid: false, errors, warnings, suggestions };
      }

      // Validate schema
      const schemaResult = this.validateSchema(workflowObject);
      errors.push(...schemaResult.errors.map(issue => ({
        type: issue.type as 'syntax' | 'schema' | 'action' | 'security',
        message: issue.message,
        line: issue.line || undefined,
        column: issue.column || undefined,
        severity: issue.severity as 'error' | 'warning'
      })));
      
      warnings.push(...schemaResult.warnings.map(issue => ({
        type: issue.type as 'optimization' | 'best-practice' | 'compatibility',
        message: issue.message,
        line: issue.line || undefined,
        column: issue.column || undefined
      })));

      // Validate actions
      const actionResult = this.validateActions(workflowObject);
      if (!actionResult.isValid) {
        errors.push(...actionResult.securityIssues.map(issue => ({
          type: issue.type as 'syntax' | 'schema' | 'action' | 'security',
          message: issue.message,
          line: issue.line || undefined,
          column: issue.column || undefined,
          severity: issue.severity as 'error' | 'warning'
        })));

        // Add warnings for unknown actions
        actionResult.unknownActions.forEach(action => {
          warnings.push({
            type: 'compatibility',
            message: `Unknown action: ${action}. Verify this action exists in the marketplace.`
          });
        });

        // Add warnings for deprecated actions
        actionResult.deprecatedActions.forEach(action => {
          warnings.push({
            type: 'best-practice',
            message: `Deprecated action: ${action}. Consider updating to a newer version.`
          });
        });
      }

      // Apply custom rules
      this.config.customRules.forEach(rule => {
        try {
          const issues = rule.validator(workflowObject);
          issues.forEach(issue => {
            if (issue.severity === 'error') {
              errors.push({
                type: issue.type as 'syntax' | 'schema' | 'action' | 'security',
                message: `${rule.name}: ${issue.message}`,
                line: issue.line || undefined,
                column: issue.column || undefined,
                severity: 'error'
              });
            } else {
              warnings.push({
                type: 'best-practice',
                message: `${rule.name}: ${issue.message}`,
                line: issue.line || undefined,
                column: issue.column || undefined
              });
            }
            
            if (issue.suggestion) {
              suggestions.push(issue.suggestion);
            }
          });
        } catch (ruleError) {
          warnings.push({
            type: 'best-practice',
            message: `Custom rule '${rule.name}' failed to execute: ${ruleError instanceof Error ? ruleError.message : String(ruleError)}`
          });
        }
      });

      // Generate suggestions based on common issues
      if (errors.length === 0 && warnings.length === 0) {
        suggestions.push('Workflow validation passed successfully!');
      } else {
        if (warnings.some(w => w.type === 'compatibility')) {
          suggestions.push('Consider using well-known GitHub Actions from the marketplace for better reliability.');
        }
        if (warnings.some(w => w.type === 'best-practice')) {
          suggestions.push('Review best practices for GitHub Actions workflows to improve maintainability.');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };

    } catch (parseError) {
      const error = parseError as Error;
      errors.push({
        type: 'syntax',
        message: `YAML parsing failed: ${error.message}`,
        severity: 'error'
      });

      return {
        isValid: false,
        errors,
        warnings,
        suggestions: ['Check YAML syntax and indentation']
      };
    }
  }

  /**
   * Validate against GitHub Actions schema
   */
  validateSchema(workflowObject: any): SchemaValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const validate = this.ajv.getSchema('github-actions-workflow');
    if (!validate) {
      errors.push({
        type: 'schema',
        message: 'GitHub Actions schema not found',
        path: '',
        severity: 'error'
      });
      return { isValid: false, errors, warnings, schema: 'github-actions-workflow' };
    }

    const isValid = validate(workflowObject);
    
    if (!isValid && validate.errors) {
      validate.errors.forEach(error => {
        const path = error.instancePath || error.schemaPath || '';
        const message = `${path}: ${error.message}`;
        
        errors.push({
          type: 'schema',
          message,
          path,
          severity: this.config.strictMode ? 'error' : 'warning'
        });
      });
    }

    // Additional schema-based warnings
    if (workflowObject.jobs) {
      Object.keys(workflowObject.jobs).forEach(jobId => {
        const job = workflowObject.jobs[jobId];
        
        // Check for missing permissions
        if (!workflowObject.permissions && !job.permissions) {
          warnings.push({
            type: 'security',
            message: 'Consider specifying explicit permissions for better security',
            path: `jobs.${jobId}`,
            severity: 'warning',
            suggestion: 'Add permissions section to limit token scope'
          });
        }

        // Check for timeout settings
        if (!job['timeout-minutes']) {
          warnings.push({
            type: 'performance',
            message: 'Consider setting timeout-minutes to prevent runaway jobs',
            path: `jobs.${jobId}`,
            severity: 'info',
            suggestion: 'Add timeout-minutes: 30 or appropriate value'
          });
        }

        // Check for matrix strategy optimization
        if (job.strategy?.matrix && !job.strategy['fail-fast']) {
          warnings.push({
            type: 'performance',
            message: 'Consider setting fail-fast: false for matrix builds to see all results',
            path: `jobs.${jobId}.strategy`,
            severity: 'info'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      schema: 'github-actions-workflow'
    };
  }

  /**
   * Validate GitHub Actions marketplace actions
   */
  validateActions(workflowObject: any): ActionValidationResult {
    const unknownActions: string[] = [];
    const deprecatedActions: string[] = [];
    const securityIssues: ValidationIssue[] = [];

    if (!workflowObject.jobs) {
      return {
        isValid: true,
        unknownActions,
        deprecatedActions,
        securityIssues
      };
    }

    Object.keys(workflowObject.jobs).forEach(jobId => {
      const job = workflowObject.jobs[jobId];
      
      if (!job.steps || !Array.isArray(job.steps)) {
        return;
      }

      job.steps.forEach((step: any, stepIndex: number) => {
        if (!step.uses) {
          return;
        }

        const actionRef = step.uses;
        const [actionName, version] = actionRef.split('@');

        // Check if action is known
        const knownAction = KNOWN_ACTIONS[actionName as keyof typeof KNOWN_ACTIONS];
        
        if (!knownAction && !this.config.allowUnknownActions) {
          unknownActions.push(actionRef);
        }

        // Check for deprecated actions
        if (knownAction?.deprecated) {
          deprecatedActions.push(actionRef);
        }

        // Validate action versions
        if (this.config.validateActionVersions && knownAction && version) {
          if (version !== knownAction.latestVersion) {
            securityIssues.push({
              type: 'security',
              message: `Action ${actionName} is using version ${version}, latest is ${knownAction.latestVersion}`,
              path: `jobs.${jobId}.steps[${stepIndex}].uses`,
              severity: 'warning',
              suggestion: `Update to ${actionName}@${knownAction.latestVersion}`
            });
          }
        }

        // Security checks
        if (!version || version === 'main' || version === 'master') {
          securityIssues.push({
            type: 'security',
            message: `Action ${actionName} should use a specific version tag for security`,
            path: `jobs.${jobId}.steps[${stepIndex}].uses`,
            severity: 'error',
            suggestion: 'Pin to a specific version like @v4 instead of @main'
          });
        }

        // Check for potentially dangerous actions
        if (actionName.includes('eval') || actionName.includes('exec')) {
          securityIssues.push({
            type: 'security',
            message: `Action ${actionName} may execute arbitrary code - review carefully`,
            path: `jobs.${jobId}.steps[${stepIndex}].uses`,
            severity: 'warning'
          });
        }

        // Check for third-party actions without verification
        if (!actionName.startsWith('actions/') && 
            !actionName.startsWith('github/') && 
            !actionName.startsWith('docker/') &&
            !actionName.startsWith('codecov/')) {
          securityIssues.push({
            type: 'security',
            message: `Third-party action ${actionName} - verify trustworthiness`,
            path: `jobs.${jobId}.steps[${stepIndex}].uses`,
            severity: 'info',
            suggestion: 'Review action source code and maintainer reputation'
          });
        }
      });
    });

    return {
      isValid: securityIssues.filter(issue => issue.severity === 'error').length === 0,
      unknownActions: [...new Set(unknownActions)],
      deprecatedActions: [...new Set(deprecatedActions)],
      securityIssues
    };
  }

  /**
   * Add custom validation rule
   */
  addCustomRule(rule: ValidationConfig['customRules'][0]): void {
    this.config.customRules.push(rule);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}