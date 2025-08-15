/**
 * Configuration Management System Exports
 * 
 * Central export point for all configuration management functionality.
 */

export { ConfigurationManager, ConfigurationError, configurationManager } from './configuration-manager';
export { validateConfiguration, validateDefaults } from './validation';
export { DEFAULT_CONFIG } from './default-config';
export type {
  CLIConfig,
  DefaultSettings,
  TemplateConfig,
  OrganizationPolicies,
  OutputConfig,
  GitConfig,
  UIConfig,
  ConfigurationSource,
  ConfigValidationError,
  ConfigValidationResult
} from './types';