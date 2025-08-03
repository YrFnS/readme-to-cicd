/**
 * Validation-specific type definitions
 */

/**
 * Validation configuration
 */
export interface ValidationConfig {
  strictMode: boolean;
  allowUnknownActions: boolean;
  validateActionVersions: boolean;
  customRules: ValidationRule[];
}

/**
 * Custom validation rule
 */
export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validator: (workflow: any) => ValidationIssue[];
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  type: 'syntax' | 'schema' | 'action' | 'security' | 'performance';
  message: string;
  path: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  schema: string;
}

/**
 * Action validation result
 */
export interface ActionValidationResult {
  isValid: boolean;
  unknownActions: string[];
  deprecatedActions: string[];
  securityIssues: ValidationIssue[];
}