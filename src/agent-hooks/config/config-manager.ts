import {
  ConfigurationSchema,
  ConfigurationValue,
  ConfigurationSet,
  ConfigurationTemplate,
  DeploymentConfiguration,
  EnvironmentConfiguration,
  ConfigurationChange,
  ConfigurationBackup,
  ConfigurationAudit,
  DeploymentHistory,
  ConfigurationHealth,
  ConfigurationDashboard,
  ConfigurationMetrics,
  EnvironmentType,
  DeploymentMode,
  ConfigurationSource,
  ConfigurationScope
} from '../types/config';
import { RepositoryInfo } from '../types';
import { ErrorHandler } from '../errors/error-handler';
import { NotificationSystem } from '../notifications/notification-system';
import { NotificationType, NotificationPriority, NotificationChannel } from '../types/notifications';

export class ConfigurationManager {
  private schemas: Map<string, ConfigurationSchema>;
  private configurations: Map<string, ConfigurationSet>;
  private templates: Map<string, ConfigurationTemplate>;
  private deployments: Map<string, DeploymentConfiguration>;
  private environments: Map<string, EnvironmentConfiguration>;
  private backups: Map<string, ConfigurationBackup[]>;
  private auditLogs: ConfigurationAudit[];
  private deploymentHistory: DeploymentHistory[];

  private errorHandler: ErrorHandler;
  private notificationSystem: NotificationSystem;

  constructor(
    errorHandler: ErrorHandler,
    notificationSystem: NotificationSystem
  ) {
    this.schemas = new Map();
    this.configurations = new Map();
    this.templates = new Map();
    this.deployments = new Map();
    this.environments = new Map();
    this.backups = new Map();
    this.auditLogs = [];
    this.deploymentHistory = [];

    this.errorHandler = errorHandler;
    this.notificationSystem = notificationSystem;

    this.initializeDefaultSchemas();
    this.initializeDefaultTemplates();
  }

  private initializeDefaultSchemas(): void {
    // Initialize default configuration schemas
    const baseSchema: ConfigurationSchema = {
      id: 'base-config',
      name: 'Base Configuration',
      version: '1.0.0',
      description: 'Base configuration schema for Agent Hooks',
      properties: [],
      required: [],
      additionalProperties: true
    };

    this.schemas.set(baseSchema.id, baseSchema);
  }

  private initializeDefaultTemplates(): void {
    // Initialize default configuration templates
    const defaultTemplate: ConfigurationTemplate = {
      id: 'default-template',
      name: 'Default Configuration Template',
      description: 'Default template for Agent Hooks configuration',
      category: 'general',
      schema: this.schemas.get('base-config') || {
        id: 'base-config',
        name: 'Base Configuration',
        version: '1.0.0',
        properties: [],
        required: [],
        additionalProperties: true
      },
      defaultValues: {},
      examples: [],
      tags: ['default'],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(defaultTemplate.id, defaultTemplate);
  }

  // Configuration Schema Management
  addSchema(schema: ConfigurationSchema): void {
    this.schemas.set(schema.id, schema);
    this.logAudit('create', schema.id, 'system', { schema });
  }

  getSchema(schemaId: string): ConfigurationSchema | undefined {
    return this.schemas.get(schemaId);
  }

  validateConfiguration(config: Record<string, any>, schemaId: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [`Schema ${schemaId} not found`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required properties
    for (const required of schema.required) {
      if (!(required in config)) {
        errors.push(`Required property '${required}' is missing`);
      }
    }

    // Validate each property
    for (const [key, value] of Object.entries(config)) {
      const property = schema.properties.find(p => p.name === key);
      if (!property) {
        if (!schema.additionalProperties) {
          errors.push(`Unknown property '${key}'`);
        }
        continue;
      }

      const validation = this.validateProperty(key, value, property);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateProperty(
    key: string,
    value: any,
    property: any
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type validation
    if (typeof value !== property.type) {
      errors.push(`Property '${key}' must be of type ${property.type}, got ${typeof value}`);
    }

    // String validations
    if (property.type === 'string') {
      if (property.minLength && value.length < property.minLength) {
        errors.push(`Property '${key}' must be at least ${property.minLength} characters`);
      }
      if (property.maxLength && value.length > property.maxLength) {
        errors.push(`Property '${key}' must be at most ${property.maxLength} characters`);
      }
      if (property.pattern && !new RegExp(property.pattern).test(value)) {
        errors.push(`Property '${key}' does not match required pattern`);
      }
    }

    // Number validations
    if (property.type === 'number') {
      if (property.minimum !== undefined && value < property.minimum) {
        errors.push(`Property '${key}' must be at least ${property.minimum}`);
      }
      if (property.maximum !== undefined && value > property.maximum) {
        errors.push(`Property '${key}' must be at most ${property.maximum}`);
      }
    }

    // Enum validation
    if (property.enum && !property.enum.includes(value)) {
      errors.push(`Property '${key}' must be one of: ${property.enum.join(', ')}`);
    }

    return { errors, warnings };
  }

  // Configuration Management
  createConfiguration(
    name: string,
    environment: EnvironmentType,
    values: Record<string, any>,
    schemaId?: string,
    repository?: RepositoryInfo,
    team?: string
  ): string {
    try {
      const configId = this.generateId('config');

      // Validate configuration if schema is provided
      if (schemaId) {
        const validation = this.validateConfiguration(values, schemaId);
        if (!validation.valid) {
          throw new Error(`Configuration validation __failed: ${validation.errors.join(', ')}`);
        }
      }

      const configuration: ConfigurationSet = {
        id: configId,
        name,
        environment,
        repository: repository!,
        team: team!,
        values: this.mapToConfigurationValues(values),
        ...(schemaId && { schema: this.schemas.get(schemaId)! }),
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.configurations.set(configId, configuration);
      this.logAudit('create', configId, 'system', { configuration });

      // Send notification
      this.notificationSystem.sendNotification(
        NotificationType.CUSTOM,
        NotificationPriority.MEDIUM,
        'Configuration Created',
        `New configuration '${name}' created for ${environment}`,
        [{ channel: NotificationChannel.SLACK, address: '#config' }],
        repository,
        { configId }
      );

      return configId;

    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        component: 'config-manager',
        operation: 'create_configuration'
      });
      throw error;
    }
  }

  getConfiguration(configId: string): ConfigurationSet | undefined {
    return this.configurations.get(configId);
  }

  updateConfiguration(
    configId: string,
    updates: Partial<ConfigurationSet>,
    userId?: string
  ): boolean {
    try {
      const config = this.configurations.get(configId);
      if (!config) {return false;}

      const oldValues = { ...config };
      const updatedConfig = { ...config, ...updates, version: config.version + 1, updatedAt: new Date() };
      this.configurations.set(configId, updatedConfig);

      // Create change record
      const changes = this.calculateChanges(oldValues, updatedConfig);
      const change: ConfigurationChange = {
        id: this.generateId('change'),
        configurationId: configId,
        changes,
        appliedAt: new Date(),
        appliedBy: userId || 'system',
        reason: 'Configuration update'
      };

      this.logAudit('update', configId, userId || 'system', {
        updates,
        changes
      });

      // Create backup
      this.createBackup(configId, oldValues.values, userId || 'system', 'Pre-update backup');

      // Send notification
      this.notificationSystem.sendNotification(
        NotificationType.CUSTOM,
        NotificationPriority.MEDIUM,
        'Configuration Updated',
        `Configuration '${config.name}' updated`,
        [{ channel: NotificationChannel.SLACK, address: '#config' }],
        config.repository,
        { configId, changes: changes.length }
      );

      return true;

    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        component: 'config-manager',
        operation: 'update_configuration'
      });
      throw error;
    }
  }

  private mapToConfigurationValues(values: Record<string, any>): ConfigurationValue[] {
    return Object.entries(values).map(([key, value]) => ({
      key,
      value,
      source: ConfigurationSource.DEFAULT,
      scope: ConfigurationScope.GLOBAL,
      _encrypted: this.isSensitiveKey(key),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /credential/i
    ];
    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  private calculateChanges(oldConfig: ConfigurationSet, newConfig: ConfigurationSet): any[] {
    const changes = [];
    const oldValues = Object.fromEntries(oldConfig.values.map(v => [v.key, v.value]));
    const newValues = Object.fromEntries(newConfig.values.map(v => [v.key, v.value]));

    // Added values
    for (const [key, value] of Object.entries(newValues)) {
      if (!(key in oldValues)) {
        changes.push({ key, type: 'added', newValue: value });
      }
    }

    // Modified values
    for (const [key, newValue] of Object.entries(newValues)) {
      const oldValue = oldValues[key];
      if (oldValue !== undefined && oldValue !== newValue) {
        changes.push({ key, type: 'modified', oldValue, newValue });
      }
    }

    // Deleted values
    for (const [key, oldValue] of Object.entries(oldValues)) {
      if (!(key in newValues)) {
        changes.push({ key, type: 'deleted', oldValue });
      }
    }

    return changes;
  }

  // Environment Management
  createEnvironment(environment: EnvironmentConfiguration): void {
    this.environments.set(environment.id, environment);
    this.logAudit('create', environment.id, 'system', { environment });
  }

  getEnvironment(environmentId: string): EnvironmentConfiguration | undefined {
    return this.environments.get(environmentId);
  }

  getEnvironmentsByType(type: EnvironmentType): EnvironmentConfiguration[] {
    return Array.from(this.environments.values()).filter(env => env.type === type);
  }

  // Deployment Management
  createDeployment(deployment: DeploymentConfiguration): void {
    this.deployments.set(deployment.id, deployment);
    this.logAudit('create', deployment.id, 'system', { deployment });
  }

  getDeployment(deploymentId: string): DeploymentConfiguration | undefined {
    return this.deployments.get(deploymentId);
  }

  async executeDeployment(
    deploymentId: string,
    userId?: string
  ): Promise<string> {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      const historyId = this.generateId('deployment-history');

      const history: DeploymentHistory = {
        id: historyId,
        configurationId: deployment.configuration.id,
        deploymentId,
        version: deployment.version,
        status: 'pending',
        startTime: new Date(),
        success: false,
        metrics: [],
        logs: []
      };

      this.deploymentHistory.push(history);

      // Start deployment process
      await this.executeDeploymentProcess(deployment, history);

      return historyId;

    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        component: 'config-manager',
        operation: 'execute_deployment'
      });
      throw error;
    }
  }

  private async executeDeploymentProcess(
    deployment: DeploymentConfiguration,
    history: DeploymentHistory
  ): Promise<void> {
    // This would implement the actual deployment logic
    // For now, we'll simulate a successful deployment

    history.status = 'in_progress';
    this.logDeploymentEvent(history.id, 'info', 'Starting deployment process');

    // Simulate deployment steps
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.logDeploymentEvent(history.id, 'info', `Deployment step ${i + 1} completed`);
    }

    history.status = 'completed';
    history.endTime = new Date();
    history.duration = history.endTime.getTime() - history.startTime.getTime();
    history.success = true;

    this.logDeploymentEvent(history.id, 'info', 'Deployment completed successfully');
  }

  // Backup and Recovery
  createBackup(
    configId: string,
    data: Record<string, any>,
    userId: string,
    reason?: string
  ): string {
    const backupId = this.generateId('backup');

    const backup: ConfigurationBackup = {
      id: backupId,
      configurationId: configId,
      version: this.configurations.get(configId)?.version || 1,
      data,
      createdAt: new Date(),
      createdBy: userId,
      reason: reason!
    };

    const configBackups = this.backups.get(configId) || [];
    configBackups.push(backup);
    this.backups.set(configId, configBackups);

    this.logAudit('backup', backupId, userId, { configId, reason });

    return backupId;
  }

  restoreFromBackup(
    configId: string,
    backupId: string,
    userId: string
  ): boolean {
    try {
      const backups = this.backups.get(configId);
      const backup = backups?.find(b => b.id === backupId);

      if (!backup) {return false;}

      const config = this.configurations.get(configId);
      if (!config) {return false;}

      // Create current backup before restore
      this.createBackup(configId, Object.fromEntries(config.values.map(v => [v.key, v.value])), userId, 'Pre-restore backup');

      // Restore from backup
      const restoredValues = this.mapToConfigurationValues(backup.data);
      const updatedConfig = {
        ...config,
        values: restoredValues,
        version: config.version + 1,
        updatedAt: new Date()
      };

      this.configurations.set(configId, updatedConfig);

      this.logAudit('restore', configId, userId, {
        backupId,
        __restoredVersion: backup.version
      });

      return true;

    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        component: 'config-manager',
        operation: 'restore_from_backup'
      });
      return false;
    }
  }

  // Health and Monitoring
  async getConfigurationHealth(): Promise<ConfigurationHealth> {
    const checks = await this.performHealthChecks();
    const issues = checks.filter(c => c.status !== 'healthy').map(c => c.message);
    const overall = this.calculateOverallHealth(checks);

    return {
      overall,
      checks,
      timestamp: new Date(),
      issues,
      recommendations: this.generateHealthRecommendations(checks)
    };
  }

  private async performHealthChecks(): Promise<any[]> {
    const checks = [];

    // Configuration validation check
    const invalidConfigs = Array.from(this.configurations.values())
      .filter(config => config.schema && !this.validateConfiguration(
        Object.fromEntries(config.values.map(v => [v.key, v.value])),
        config.schema.id
      ).valid);

    checks.push({
      name: 'Configuration Validation',
      status: invalidConfigs.length === 0 ? 'healthy' : 'unhealthy',
      message: invalidConfigs.length === 0
        ? 'All configurations are valid'
        : `${invalidConfigs.length} configurations have validation errors`,
      lastCheck: new Date()
    });

    // Environment consistency check
    const activeEnvironments = Array.from(this.environments.values()).filter(env => env.isActive);
    checks.push({
      name: 'Environment Consistency',
      status: activeEnvironments.length > 0 ? 'healthy' : 'degraded',
      message: activeEnvironments.length > 0
        ? `${activeEnvironments.length} active environments`
        : 'No active environments configured',
      lastCheck: new Date()
    });

    // Backup coverage check
    const configsWithBackups = Array.from(this.backups.keys()).length;
    const totalConfigs = this.configurations.size;
    const backupCoverage = totalConfigs > 0 ? (configsWithBackups / totalConfigs) * 100 : 100;

    checks.push({
      name: 'Backup Coverage',
      status: backupCoverage >= 80 ? 'healthy' : backupCoverage >= 50 ? 'degraded' : 'unhealthy',
      message: `Backup coverage: ${backupCoverage.toFixed(1)}%`,
      lastCheck: new Date()
    });

    return checks;
  }

  private calculateOverallHealth(checks: any[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const degraded = checks.filter(c => c.status === 'degraded').length;

    if (unhealthy > 0) {return 'unhealthy';}
    if (degraded > 0) {return 'degraded';}
    return 'healthy';
  }

  private generateHealthRecommendations(checks: any[]): string[] {
    const recommendations = [];

    if (checks.some(c => c.name === 'Configuration Validation' && c.status !== 'healthy')) {
      recommendations.push('Review and fix configuration validation errors');
    }

    if (checks.some(c => c.name === 'Backup Coverage' && c.status !== 'healthy')) {
      recommendations.push('Create backups for configurations without recent backups');
    }

    if (checks.some(c => c.name === 'Environment Consistency' && c.status !== 'healthy')) {
      recommendations.push('Configure and activate environment-specific settings');
    }

    return recommendations;
  }

  // Dashboard and Reporting
  async getConfigurationDashboard(): Promise<ConfigurationDashboard> {
    const environments = Array.from(this.environments.values());
    const recentChanges = this.auditLogs
      .filter(log => log.action === 'update')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(log => ({
        id: log.id,
        configurationId: log.configurationId,
        changes: log.changes || [],
        appliedAt: log.timestamp,
        appliedBy: log.userId
      }));

    return {
      environments,
      recentChanges,
      deploymentHistory: this.deploymentHistory.slice(-10),
      health: await this.getConfigurationHealth(),
      alerts: [], // Would be populated from monitoring system
      metrics: await this.getConfigurationMetrics()
    };
  }

  private async getConfigurationMetrics(): Promise<ConfigurationMetrics> {
    const totalConfigurations = this.configurations.size;
    const activeEnvironments = Array.from(this.environments.values()).filter(env => env.isActive).length;
    const recentChanges = this.auditLogs.filter(log =>
      log.action === 'update' &&
      log.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    const failedDeployments = this.deploymentHistory.filter(d => !d.success).length;
    const successfulDeployments = this.deploymentHistory.filter(d => d.success && d.duration);
    const averageDeploymentTime = successfulDeployments.length > 0
      ? successfulDeployments.reduce((sum, d) => sum + (d.duration || 0), 0) / successfulDeployments.length
      : 0;

    const health = await this.getConfigurationHealth();
    const configurationHealthScore = health.overall === 'healthy' ? 100 :
                                  health.overall === 'degraded' ? 70 : 30;

    // Count secrets that need rotation (simplified)
    const secretsRotationDue = 0; // Would be calculated from environment secrets

    return {
      totalConfigurations,
      activeEnvironments,
      recentChanges,
      failedDeployments,
      averageDeploymentTime,
      configurationHealthScore,
      secretsRotationDue
    };
  }

  // Utility Methods
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logAudit(action: 'create' | 'update' | 'delete' | 'backup' | 'restore', resourceId: string, userId: string, details: Record<string, any>): void {
    const audit: ConfigurationAudit = {
      id: this.generateId('audit'),
      configurationId: resourceId,
      action,
      changes: [],
      userId,
      timestamp: new Date(),
      reason: details.reason
    };

    this.auditLogs.push(audit);
  }

  private logDeploymentEvent(historyId: string, level: string, message: string): void {
    const history = this.deploymentHistory.find(h => h.id === historyId);
    if (history) {
      history.logs.push({
        timestamp: new Date(),
        level: level as any,
        message,
        component: 'config-manager'
      });
    }
  }
}