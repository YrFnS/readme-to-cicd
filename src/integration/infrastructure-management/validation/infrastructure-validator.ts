/**
 * Infrastructure Validator Implementation
 * 
 * Provides comprehensive validation for infrastructure configurations
 * across multiple cloud providers with security, compliance, and best practices checks.
 */

import {
  InfrastructureConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../interfaces.js';

import {
  CloudProvider,
  SecurityConfig,
  NetworkConfig,
  MonitoringConfig,
  ResourceConfig
} from '../types.js';

export class InfrastructureValidator {
  private validationRules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Validate infrastructure configuration
   */
  async validateConfiguration(config: InfrastructureConfig): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic configuration validation
      const basicValidation = this.validateBasicConfiguration(config);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Provider-specific validation
      const providerValidation = await this.validateProviderConfiguration(config);
      errors.push(...providerValidation.errors);
      warnings.push(...providerValidation.warnings);

      // Security validation
      const securityValidation = this.validateSecurityConfiguration(config.security);
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);

      // Network validation
      const networkValidation = this.validateNetworkConfiguration(config.networking);
      errors.push(...networkValidation.errors);
      warnings.push(...networkValidation.warnings);

      // Resource validation
      const resourceValidation = this.validateResourceConfiguration(config.resources);
      errors.push(...resourceValidation.errors);
      warnings.push(...resourceValidation.warnings);

      // Monitoring validation
      const monitoringValidation = this.validateMonitoringConfiguration(config.monitoring);
      errors.push(...monitoringValidation.errors);
      warnings.push(...monitoringValidation.warnings);

      // Compliance validation
      const complianceValidation = this.validateComplianceRequirements(config);
      errors.push(...complianceValidation.errors);
      warnings.push(...complianceValidation.warnings);

      // Best practices validation
      const bestPracticesValidation = this.validateBestPractices(config);
      errors.push(...bestPracticesValidation.errors);
      warnings.push(...bestPracticesValidation.warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          severity: 'error'
        }],
        warnings
      };
    }
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // Basic configuration rules
    this.validationRules.set('required_fields', {
      name: 'Required Fields',
      description: 'Validate required configuration fields',
      severity: 'error',
      validate: (config: any) => this.validateRequiredFields(config)
    });

    // Security rules
    this.validationRules.set('encryption_enabled', {
      name: 'Encryption Enabled',
      description: 'Ensure encryption is enabled for data at rest and in transit',
      severity: 'error',
      validate: (config: any) => this.validateEncryption(config.security)
    });

    // Network security rules
    this.validationRules.set('network_security', {
      name: 'Network Security',
      description: 'Validate network security configuration',
      severity: 'warning',
      validate: (config: any) => this.validateNetworkSecurity(config.networking)
    });

    // Resource naming rules
    this.validationRules.set('resource_naming', {
      name: 'Resource Naming',
      description: 'Validate resource naming conventions',
      severity: 'warning',
      validate: (config: any) => this.validateResourceNaming(config.resources)
    });

    // Cost optimization rules
    this.validationRules.set('cost_optimization', {
      name: 'Cost Optimization',
      description: 'Check for cost optimization opportunities',
      severity: 'warning',
      validate: (config: any) => this.validateCostOptimization(config)
    });
  }

  /**
   * Validate basic configuration
   */
  private validateBasicConfiguration(config: InfrastructureConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields
    if (!config.id || config.id.trim() === '') {
      errors.push({
        code: 'MISSING_ID',
        message: 'Infrastructure ID is required',
        field: 'id',
        severity: 'error'
      });
    }

    if (!config.name || config.name.trim() === '') {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Infrastructure name is required',
        field: 'name',
        severity: 'error'
      });
    }

    if (!config.environment) {
      errors.push({
        code: 'MISSING_ENVIRONMENT',
        message: 'Environment is required',
        field: 'environment',
        severity: 'error'
      });
    }

    if (!config.provider) {
      errors.push({
        code: 'MISSING_PROVIDER',
        message: 'Cloud provider is required',
        field: 'provider',
        severity: 'error'
      });
    }

    if (!config.region || config.region.length === 0) {
      errors.push({
        code: 'MISSING_REGION',
        message: 'At least one region is required',
        field: 'region',
        severity: 'error'
      });
    }

    // Validate ID format
    if (config.id && !/^[a-z0-9-]+$/.test(config.id)) {
      errors.push({
        code: 'INVALID_ID_FORMAT',
        message: 'Infrastructure ID must contain only lowercase letters, numbers, and hyphens',
        field: 'id',
        severity: 'error'
      });
    }

    // Validate name format
    if (config.name && config.name.length > 64) {
      warnings.push({
        code: 'LONG_NAME',
        message: 'Infrastructure name is longer than 64 characters',
        field: 'name',
        recommendation: 'Use shorter names for better readability'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate provider-specific configuration
   */
  private async validateProviderConfiguration(config: InfrastructureConfig): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const supportedProviders: CloudProvider[] = ['aws', 'azure', 'gcp', 'kubernetes', 'hybrid'];
    
    if (!supportedProviders.includes(config.provider)) {
      errors.push({
        code: 'UNSUPPORTED_PROVIDER',
        message: `Unsupported cloud provider: ${config.provider}`,
        field: 'provider',
        severity: 'error'
      });
    }

    // Provider-specific region validation
    switch (config.provider) {
      case 'aws':
        const awsRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
        for (const region of config.region) {
          if (!awsRegions.includes(region)) {
            warnings.push({
              code: 'UNKNOWN_AWS_REGION',
              message: `Unknown AWS region: ${region}`,
              field: 'region',
              recommendation: 'Verify region availability and naming'
            });
          }
        }
        break;

      case 'azure':
        const azureRegions = ['eastus', 'westus2', 'westeurope', 'southeastasia'];
        for (const region of config.region) {
          if (!azureRegions.includes(region)) {
            warnings.push({
              code: 'UNKNOWN_AZURE_REGION',
              message: `Unknown Azure region: ${region}`,
              field: 'region',
              recommendation: 'Verify region availability and naming'
            });
          }
        }
        break;

      case 'gcp':
        const gcpRegions = ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'];
        for (const region of config.region) {
          if (!gcpRegions.includes(region)) {
            warnings.push({
              code: 'UNKNOWN_GCP_REGION',
              message: `Unknown GCP region: ${region}`,
              field: 'region',
              recommendation: 'Verify region availability and naming'
            });
          }
        }
        break;
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate security configuration
   */
  private validateSecurityConfiguration(security: SecurityConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate encryption
    if (!security.encryption.atRest) {
      errors.push({
        code: 'ENCRYPTION_AT_REST_DISABLED',
        message: 'Encryption at rest is disabled',
        field: 'security.encryption.atRest',
        severity: 'error'
      });
    }

    if (!security.encryption.inTransit) {
      errors.push({
        code: 'ENCRYPTION_IN_TRANSIT_DISABLED',
        message: 'Encryption in transit is disabled',
        field: 'security.encryption.inTransit',
        severity: 'error'
      });
    }

    // Validate key management
    if (!security.encryption.keyManagement.rotationEnabled) {
      warnings.push({
        code: 'KEY_ROTATION_DISABLED',
        message: 'Key rotation is disabled',
        field: 'security.encryption.keyManagement.rotationEnabled',
        recommendation: 'Enable automatic key rotation for better security'
      });
    }

    // Validate authentication
    const supportedAuthProviders = ['oauth2', 'saml', 'oidc', 'api-key'];
    if (!supportedAuthProviders.includes(security.authentication.provider)) {
      errors.push({
        code: 'UNSUPPORTED_AUTH_PROVIDER',
        message: `Unsupported authentication provider: ${security.authentication.provider}`,
        field: 'security.authentication.provider',
        severity: 'error'
      });
    }

    // Validate RBAC
    if (!security.authorization.rbac) {
      warnings.push({
        code: 'RBAC_DISABLED',
        message: 'Role-based access control is disabled',
        field: 'security.authorization.rbac',
        recommendation: 'Enable RBAC for better access control'
      });
    }

    // Validate audit logging
    if (!security.audit.enabled) {
      warnings.push({
        code: 'AUDIT_LOGGING_DISABLED',
        message: 'Audit logging is disabled',
        field: 'security.audit.enabled',
        recommendation: 'Enable audit logging for compliance and security monitoring'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate network configuration
   */
  private validateNetworkConfiguration(networking: NetworkConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate subnets
    if (!networking.subnets || networking.subnets.length === 0) {
      errors.push({
        code: 'MISSING_SUBNETS',
        message: 'At least one subnet is required',
        field: 'networking.subnets',
        severity: 'error'
      });
    }

    // Validate security groups
    if (!networking.securityGroups || networking.securityGroups.length === 0) {
      warnings.push({
        code: 'MISSING_SECURITY_GROUPS',
        message: 'No security groups configured',
        field: 'networking.securityGroups',
        recommendation: 'Configure security groups for network access control'
      });
    }

    // Validate load balancer configuration
    if (networking.loadBalancer) {
      if (!networking.loadBalancer.healthCheck) {
        warnings.push({
          code: 'MISSING_HEALTH_CHECK',
          message: 'Load balancer health check not configured',
          field: 'networking.loadBalancer.healthCheck',
          recommendation: 'Configure health checks for better reliability'
        });
      }
    }

    // Validate firewall rules
    if (networking.firewall) {
      const hasAllowAllRule = networking.firewall.rules.some(rule => 
        rule.sourceIp === '0.0.0.0/0' && rule.action === 'allow'
      );
      
      if (hasAllowAllRule) {
        warnings.push({
          code: 'OVERLY_PERMISSIVE_FIREWALL',
          message: 'Firewall has overly permissive rules',
          field: 'networking.firewall.rules',
          recommendation: 'Restrict firewall rules to specific IP ranges'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate resource configuration
   */
  private validateResourceConfiguration(resources: ResourceConfig[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!resources || resources.length === 0) {
      errors.push({
        code: 'NO_RESOURCES',
        message: 'No resources configured',
        field: 'resources',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Validate each resource
    resources.forEach((resource, index) => {
      // Validate resource name
      if (!resource.name || resource.name.trim() === '') {
        errors.push({
          code: 'MISSING_RESOURCE_NAME',
          message: `Resource at index ${index} is missing a name`,
          field: `resources[${index}].name`,
          severity: 'error'
        });
      }

      // Validate resource type
      if (!resource.type || resource.type.trim() === '') {
        errors.push({
          code: 'MISSING_RESOURCE_TYPE',
          message: `Resource ${resource.name} is missing a type`,
          field: `resources[${index}].type`,
          severity: 'error'
        });
      }

      // Validate naming conventions
      if (resource.name && !/^[a-z0-9-]+$/.test(resource.name)) {
        warnings.push({
          code: 'INVALID_RESOURCE_NAME',
          message: `Resource name ${resource.name} doesn't follow naming conventions`,
          field: `resources[${index}].name`,
          recommendation: 'Use lowercase letters, numbers, and hyphens only'
        });
      }

      // Check for required tags
      const requiredTags = ['environment', 'project', 'owner'];
      requiredTags.forEach(tag => {
        if (!resource.tags || !resource.tags[tag]) {
          warnings.push({
            code: 'MISSING_REQUIRED_TAG',
            message: `Resource ${resource.name} is missing required tag: ${tag}`,
            field: `resources[${index}].tags.${tag}`,
            recommendation: `Add ${tag} tag for better resource management`
          });
        }
      });
    });

    // Check for duplicate resource names
    const resourceNames = resources.map(r => r.name).filter(Boolean);
    const duplicateNames = resourceNames.filter((name, index) => resourceNames.indexOf(name) !== index);
    
    duplicateNames.forEach(name => {
      errors.push({
        code: 'DUPLICATE_RESOURCE_NAME',
        message: `Duplicate resource name: ${name}`,
        field: 'resources',
        severity: 'error'
      });
    });

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate monitoring configuration
   */
  private validateMonitoringConfiguration(monitoring: MonitoringConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate metrics configuration
    if (!monitoring.metrics.provider) {
      warnings.push({
        code: 'MISSING_METRICS_PROVIDER',
        message: 'Metrics provider not configured',
        field: 'monitoring.metrics.provider',
        recommendation: 'Configure metrics collection for observability'
      });
    }

    // Validate logging configuration
    if (!monitoring.logging.provider) {
      warnings.push({
        code: 'MISSING_LOGGING_PROVIDER',
        message: 'Logging provider not configured',
        field: 'monitoring.logging.provider',
        recommendation: 'Configure log aggregation for troubleshooting'
      });
    }

    // Validate alerting configuration
    if (!monitoring.alerting.channels || monitoring.alerting.channels.length === 0) {
      warnings.push({
        code: 'MISSING_ALERT_CHANNELS',
        message: 'No alert channels configured',
        field: 'monitoring.alerting.channels',
        recommendation: 'Configure alert channels for incident response'
      });
    }

    // Validate retention periods
    if (monitoring.metrics.retention < 7) {
      warnings.push({
        code: 'SHORT_METRICS_RETENTION',
        message: 'Metrics retention period is less than 7 days',
        field: 'monitoring.metrics.retention',
        recommendation: 'Consider longer retention for trend analysis'
      });
    }

    if (monitoring.logging.retention < 30) {
      warnings.push({
        code: 'SHORT_LOGGING_RETENTION',
        message: 'Logging retention period is less than 30 days',
        field: 'monitoring.logging.retention',
        recommendation: 'Consider longer retention for compliance and debugging'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate compliance requirements
   */
  private validateComplianceRequirements(config: InfrastructureConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for compliance frameworks
    if (!config.security.compliance.frameworks || config.security.compliance.frameworks.length === 0) {
      warnings.push({
        code: 'NO_COMPLIANCE_FRAMEWORKS',
        message: 'No compliance frameworks specified',
        field: 'security.compliance.frameworks',
        recommendation: 'Specify applicable compliance frameworks (SOC2, HIPAA, etc.)'
      });
    }

    // Validate data residency requirements
    if (config.environment === 'production') {
      const hasMultipleRegions = config.region.length > 1;
      if (hasMultipleRegions) {
        warnings.push({
          code: 'MULTI_REGION_COMPLIANCE',
          message: 'Multi-region deployment may have data residency implications',
          field: 'region',
          recommendation: 'Verify data residency requirements for all regions'
        });
      }
    }

    // Check for security scanning
    if (!config.security.compliance.scanning) {
      warnings.push({
        code: 'SECURITY_SCANNING_DISABLED',
        message: 'Security scanning is disabled',
        field: 'security.compliance.scanning',
        recommendation: 'Enable security scanning for vulnerability detection'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate best practices
   */
  private validateBestPractices(config: InfrastructureConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for high availability
    if (config.region.length === 1) {
      warnings.push({
        code: 'SINGLE_REGION_DEPLOYMENT',
        message: 'Single region deployment may not provide high availability',
        field: 'region',
        recommendation: 'Consider multi-region deployment for high availability'
      });
    }

    // Check for backup configuration
    const hasBackupResources = config.resources.some(resource => 
      resource.type.toLowerCase().includes('backup') || 
      resource.properties?.backup === true
    );
    
    if (!hasBackupResources) {
      warnings.push({
        code: 'NO_BACKUP_CONFIGURATION',
        message: 'No backup configuration found',
        field: 'resources',
        recommendation: 'Configure backup for data protection'
      });
    }

    // Check for cost optimization
    const hasAutoScaling = config.resources.some(resource => 
      resource.properties?.autoScaling === true
    );
    
    if (!hasAutoScaling) {
      warnings.push({
        code: 'NO_AUTO_SCALING',
        message: 'No auto-scaling configuration found',
        field: 'resources',
        recommendation: 'Configure auto-scaling for cost optimization'
      });
    }

    // Check for disaster recovery
    if (config.environment === 'production') {
      const hasDRConfiguration = config.resources.some(resource => 
        resource.properties?.disasterRecovery === true
      );
      
      if (!hasDRConfiguration) {
        warnings.push({
          code: 'NO_DISASTER_RECOVERY',
          message: 'No disaster recovery configuration found for production environment',
          field: 'resources',
          recommendation: 'Configure disaster recovery for production workloads'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Helper validation methods

  private validateRequiredFields(config: any): boolean {
    const requiredFields = ['id', 'name', 'environment', 'provider', 'region'];
    return requiredFields.every(field => config[field] !== undefined && config[field] !== null);
  }

  private validateEncryption(security: SecurityConfig): boolean {
    return security.encryption.atRest && security.encryption.inTransit;
  }

  private validateNetworkSecurity(networking: NetworkConfig): boolean {
    return networking.securityGroups && networking.securityGroups.length > 0;
  }

  private validateResourceNaming(resources: ResourceConfig[]): boolean {
    return resources.every(resource => 
      resource.name && /^[a-z0-9-]+$/.test(resource.name)
    );
  }

  private validateCostOptimization(config: InfrastructureConfig): boolean {
    return config.resources.some(resource => 
      resource.properties?.autoScaling === true || 
      resource.properties?.spotInstances === true
    );
  }
}

/**
 * Validation rule interface
 */
interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning';
  validate: (config: any) => boolean;
}

export default InfrastructureValidator;