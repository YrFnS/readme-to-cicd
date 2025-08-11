// YAML Generator main entry point
export * from './interfaces';
export * from './types';
export * from './yaml-generator';
export { EnvironmentManager, SecretConfig, VariableConfig, OIDCConfig, ConfigFileTemplate, EnvironmentManagementResult } from './environment-manager';
export { EnvironmentStepGenerator, EnvironmentStepOptions } from './utils/environment-step-generator';

// Export specialized generators for advanced usage
export { WorkflowSpecializationManager } from './workflow-specialization/workflow-specialization-manager';
export { TemplateManager } from './templates/template-manager';
export { NodeJSWorkflowGenerator } from './templates/nodejs-generator';
export { PythonWorkflowGenerator } from './templates/python-generator';
export { RustWorkflowGenerator } from './templates/rust-generator';
export { GoWorkflowGenerator } from './templates/go-generator';
export { JavaWorkflowGenerator } from './templates/java-generator';
export { DeploymentGenerator } from './templates/deployment-generator';
export { SecurityStepGenerator } from './templates/security-step-generator';
export { CacheStrategyGenerator } from './utils/cache-utils';

// Export workflow specialization types
export * from './workflow-specialization';