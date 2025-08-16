export interface Framework {
  id: string;
  name: string;
  detected: boolean;
  description: string;
  confidence?: number;
  version?: string;
}

export interface WorkflowConfiguration {
  frameworks: string[];
  workflowTypes: string[];
  deploymentPlatform: string;
  deploymentConfig: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface WebviewMessage {
  type: string;
  data: any;
  requestId?: string;
}

export interface WorkflowType {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface DeploymentPlatform {
  id: string;
  name: string;
  description: string;
  configFields: DeploymentConfigField[];
}

export interface DeploymentConfigField {
  name: string;
  type: 'text' | 'select' | 'boolean' | 'number';
  label: string;
  description?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}