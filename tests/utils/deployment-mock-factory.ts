/**
 * Mock Response Factory for Deployment Operations
 * 
 * Provides consistent mock responses for deployment operations to ensure
 * reliable test behavior and standardized success/failure patterns.
 * 
 * This factory supports various deployment operation types including:
 * - Application deployments
 * - Infrastructure deployments
 * - Database migrations
 * - Configuration updates
 * - Rollbacks
 * - Health checks
 */

import { Result, success, failure } from '../../src/shared/types/result';

/**
 * Deployment operation types supported by the mock factory
 */
export type DeploymentOperationType = 
  | 'application'
  | 'infrastructure'
  | 'database'
  | 'configuration'
  | 'rollback'
  | 'health-check'
  | 'scaling'
  | 'migration';

/**
 * Deployment operation status
 */
export type DeploymentStatus = 
  | 'pending'
  | 'in-progress'
  | 'deployed'
  | 'failed'
  | 'rolled-back'
  | 'cancelled'
  | 'verified';

/**
 * Deployment environment types
 */
export type DeploymentEnvironment = 
  | 'development'
  | 'staging'
  | 'production'
  | 'test'
  | 'preview';

/**
 * Deployment operation metadata
 */
export interface DeploymentMetadata {
  /** Unique identifier for the deployment operation */
  id: string;
  
  /** Type of deployment operation */
  type: DeploymentOperationType;
  
  /** Current status of the deployment */
  status: DeploymentStatus;
  
  /** Target environment for deployment */
  environment: DeploymentEnvironment;
  
  /** Version being deployed */
  version: string;
  
  /** Timestamp when the deployment was started */
  startTime: Date;
  
  /** Timestamp when the deployment was completed (if applicable) */
  endTime?: Date;
  
  /** Git commit hash or build identifier */
  buildId?: string;
  
  /** Deployment URL or endpoint */
  deploymentUrl?: string;
  
  /** Health check URL */
  healthCheckUrl?: string;
  
  /** Additional metadata specific to the deployment type */
  metadata?: Record<string, any>;
}

/**
 * Deployment operation result
 */
export interface DeploymentResult {
  /** Operation metadata */
  deployment: DeploymentMetadata;
  
  /** Success message or additional details */
  message: string;
  
  /** Duration of the operation in milliseconds */
  duration: number;
  
  /** Any warnings encountered during the operation */
  warnings?: string[];
  
  /** Deployment artifacts or outputs */
  artifacts?: string[];
}

/**
 * Deployment operation error details
 */
export interface DeploymentError {
  /** Error code for programmatic handling */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** The deployment operation that failed */
  operation: DeploymentOperationType;
  
  /** Environment where the failure occurred */
  environment: DeploymentEnvironment;
  
  /** Additional error context */
  context?: Record<string, any>;
  
  /** Suggested recovery actions */
  suggestions?: string[];
  
  /** Whether automatic rollback is recommended */
  rollbackRecommended?: boolean;
}

/**
 * Configuration options for the deployment mock factory
 */
export interface DeploymentMockConfig {
  /** Default success rate (0-1) for operations */
  successRate: number;
  
  /** Simulated operation duration range in milliseconds */
  durationRange: { min: number; max: number };
  
  /** Whether to include warnings in successful operations */
  includeWarnings: boolean;
  
  /** Default environment for deployments */
  defaultEnvironment: DeploymentEnvironment;
  
  /** Custom error scenarios to simulate */
  errorScenarios?: Partial<Record<DeploymentOperationType, DeploymentError>>;
  
  /** Whether to generate deployment URLs */
  generateUrls: boolean;
}

/**
 * Default configuration for the deployment mock factory
 */
const DEFAULT_CONFIG: DeploymentMockConfig = {
  successRate: 0.90,
  durationRange: { min: 5000, max: 30000 }, // 5-30 seconds for deployments
  includeWarnings: false,
  defaultEnvironment: 'staging',
  errorScenarios: {},
  generateUrls: true
};

/**
 * Mock Response Factory for Deployment Operations
 * 
 * Provides consistent, configurable mock responses for deployment operations
 * to ensure reliable test behavior across the test suite.
 */
export class DeploymentMockFactory {
  private config: DeploymentMockConfig;
  private operationCounter = 0;

  constructor(config: Partial<DeploymentMockConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a mock deployment operation result
   * 
   * @param type The type of deployment operation
   * @param options Additional options for the mock
   * @returns A Result containing either success or failure response
   */
  createDeploymentResponse(
    type: DeploymentOperationType,
    options: {
      forceSuccess?: boolean;
      forceFailure?: boolean;
      environment?: DeploymentEnvironment;
      version?: string;
      customMetadata?: Record<string, any>;
    } = {}
  ): Result<DeploymentResult, DeploymentError> {
    const operationId = this.generateOperationId();
    const startTime = new Date();
    const duration = this.generateDuration();
    const endTime = new Date(startTime.getTime() + duration);
    const environment = options.environment || this.config.defaultEnvironment;
    const version = options.version || this.generateVersion();

    // Determine if operation should succeed or fail
    const shouldSucceed = options.forceSuccess || 
      (!options.forceFailure && Math.random() < this.config.successRate);

    if (shouldSucceed) {
      return this.createSuccessResponse(
        type, 
        operationId, 
        startTime, 
        endTime, 
        duration, 
        environment, 
        version, 
        options.customMetadata
      );
    } else {
      return this.createFailureResponse(
        type, 
        operationId, 
        startTime, 
        environment, 
        version, 
        options.customMetadata
      );
    }
  }

  /**
   * Create a successful deployment operation response
   */
  private createSuccessResponse(
    type: DeploymentOperationType,
    operationId: string,
    startTime: Date,
    endTime: Date,
    duration: number,
    environment: DeploymentEnvironment,
    version: string,
    customMetadata?: Record<string, any>
  ): Result<DeploymentResult, DeploymentError> {
    const deployment: DeploymentMetadata = {
      id: operationId,
      type,
      status: 'deployed',
      environment,
      version,
      startTime,
      endTime,
      buildId: this.generateBuildId(),
      deploymentUrl: this.config.generateUrls ? this.generateDeploymentUrl(environment, operationId) : undefined,
      healthCheckUrl: this.config.generateUrls ? this.generateHealthCheckUrl(environment, operationId) : undefined,
      metadata: {
        ...this.getDefaultMetadata(type, environment),
        ...customMetadata
      }
    };

    const result: DeploymentResult = {
      deployment,
      message: this.getSuccessMessage(type, environment),
      duration,
      warnings: this.config.includeWarnings ? this.generateWarnings(type) : undefined,
      artifacts: this.generateArtifacts(type)
    };

    return success(result);
  }

  /**
   * Create a failed deployment operation response
   */
  private createFailureResponse(
    type: DeploymentOperationType,
    operationId: string,
    startTime: Date,
    environment: DeploymentEnvironment,
    version: string,
    customMetadata?: Record<string, any>
  ): Result<DeploymentResult, DeploymentError> {
    const customError = this.config.errorScenarios?.[type];
    
    const error: DeploymentError = customError || {
      code: this.generateErrorCode(type),
      message: this.getFailureMessage(type, environment),
      operation: type,
      environment,
      context: {
        operationId,
        startTime: startTime.toISOString(),
        version,
        ...customMetadata
      },
      suggestions: this.getRecoverySuggestions(type),
      rollbackRecommended: this.shouldRecommendRollback(type)
    };

    return failure(error);
  }  /**
  
 * Generate a unique operation ID
   */
  private generateOperationId(): string {
    this.operationCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.operationCounter.toString(36);
    return `deploy_${timestamp}_${counter}`;
  }

  /**
   * Generate a realistic operation duration
   */
  private generateDuration(): number {
    const { min, max } = this.config.durationRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a version string
   */
  private generateVersion(): string {
    const major = Math.floor(Math.random() * 5) + 1;
    const minor = Math.floor(Math.random() * 10);
    const patch = Math.floor(Math.random() * 20);
    return `${major}.${minor}.${patch}`;
  }

  /**
   * Generate a build ID
   */
  private generateBuildId(): string {
    const chars = '0123456789abcdef';
    let buildId = '';
    for (let i = 0; i < 8; i++) {
      buildId += chars[Math.floor(Math.random() * chars.length)];
    }
    return buildId;
  }

  /**
   * Generate a deployment URL
   */
  private generateDeploymentUrl(environment: DeploymentEnvironment, operationId: string): string {
    const subdomain = environment === 'production' ? 'app' : `${environment}-app`;
    return `https://${subdomain}.example.com/${operationId}`;
  }

  /**
   * Generate a health check URL
   */
  private generateHealthCheckUrl(environment: DeploymentEnvironment, operationId: string): string {
    const subdomain = environment === 'production' ? 'app' : `${environment}-app`;
    return `https://${subdomain}.example.com/health`;
  }

  /**
   * Get default metadata for operation type and environment
   */
  private getDefaultMetadata(type: DeploymentOperationType, environment: DeploymentEnvironment): Record<string, any> {
    const metadata: Record<DeploymentOperationType, Record<string, any>> = {
      'application': {
        instances: environment === 'production' ? 3 : 1,
        cpu: environment === 'production' ? '1000m' : '500m',
        memory: environment === 'production' ? '2Gi' : '1Gi',
        replicas: environment === 'production' ? 3 : 1
      },
      'infrastructure': {
        resources: ['vpc', 'subnets', 'security-groups'],
        region: 'us-east-1',
        availabilityZones: environment === 'production' ? ['us-east-1a', 'us-east-1b', 'us-east-1c'] : ['us-east-1a']
      },
      'database': {
        engine: 'postgresql',
        version: '14.9',
        instanceClass: environment === 'production' ? 'db.r5.large' : 'db.t3.micro',
        multiAZ: environment === 'production'
      },
      'configuration': {
        configFiles: ['app.config.json', 'database.config.json'],
        secrets: ['api-key', 'database-password'],
        featureFlags: Math.floor(Math.random() * 10) + 5
      },
      'rollback': {
        previousVersion: this.generateVersion(),
        rollbackReason: 'deployment-failure',
        affectedServices: ['api', 'web', 'worker']
      },
      'health-check': {
        endpoints: ['/health', '/ready', '/metrics'],
        timeout: 30,
        retries: 3
      },
      'scaling': {
        previousReplicas: Math.floor(Math.random() * 5) + 1,
        newReplicas: Math.floor(Math.random() * 10) + 2,
        scalingPolicy: 'horizontal'
      },
      'migration': {
        migrationType: 'schema-update',
        affectedTables: ['users', 'projects', 'workflows'],
        backupCreated: true
      }
    };

    return metadata[type] || {};
  }

  /**
   * Get success message for operation type and environment
   */
  private getSuccessMessage(type: DeploymentOperationType, environment: DeploymentEnvironment): string {
    const messages: Record<DeploymentOperationType, string> = {
      'application': `Application successfully deployed to ${environment}`,
      'infrastructure': `Infrastructure successfully provisioned in ${environment}`,
      'database': `Database successfully deployed to ${environment}`,
      'configuration': `Configuration successfully updated in ${environment}`,
      'rollback': `Rollback successfully completed in ${environment}`,
      'health-check': `Health check passed successfully for ${environment} deployment`,
      'scaling': `Scaling operation completed successfully in ${environment}`,
      'migration': `Database migration completed successfully in ${environment}`
    };

    return messages[type];
  }

  /**
   * Get failure message for operation type and environment
   */
  private getFailureMessage(type: DeploymentOperationType, environment: DeploymentEnvironment): string {
    const messages: Record<DeploymentOperationType, string> = {
      'application': `Application deployment failed in ${environment} due to container startup error`,
      'infrastructure': `Infrastructure provisioning failed in ${environment} due to resource limits`,
      'database': `Database deployment failed in ${environment} due to connection timeout`,
      'configuration': `Configuration update failed in ${environment} due to validation error`,
      'rollback': `Rollback failed in ${environment} due to missing previous version`,
      'health-check': `Health check failed for ${environment} deployment - service not responding`,
      'scaling': `Scaling operation failed in ${environment} due to resource constraints`,
      'migration': `Database migration failed in ${environment} due to schema conflict`
    };

    return messages[type];
  }

  /**
   * Generate error code for operation type
   */
  private generateErrorCode(type: DeploymentOperationType): string {
    const codes: Record<DeploymentOperationType, string> = {
      'application': 'DEPLOY_APP_CONTAINER_STARTUP_FAILED',
      'infrastructure': 'DEPLOY_INFRA_RESOURCE_LIMIT_EXCEEDED',
      'database': 'DEPLOY_DB_CONNECTION_TIMEOUT',
      'configuration': 'DEPLOY_CONFIG_VALIDATION_FAILED',
      'rollback': 'DEPLOY_ROLLBACK_VERSION_NOT_FOUND',
      'health-check': 'DEPLOY_HEALTH_CHECK_TIMEOUT',
      'scaling': 'DEPLOY_SCALING_RESOURCE_CONSTRAINT',
      'migration': 'DEPLOY_MIGRATION_SCHEMA_CONFLICT'
    };

    return codes[type];
  }

  /**
   * Get recovery suggestions for operation type
   */
  private getRecoverySuggestions(type: DeploymentOperationType): string[] {
    const suggestions: Record<DeploymentOperationType, string[]> = {
      'application': [
        'Check application logs for startup errors',
        'Verify container image is valid and accessible',
        'Ensure all required environment variables are set',
        'Check resource limits and quotas'
      ],
      'infrastructure': [
        'Check AWS service limits and quotas',
        'Verify IAM permissions for resource creation',
        'Review resource requirements and availability',
        'Consider deploying to a different region'
      ],
      'database': [
        'Verify database connection parameters',
        'Check network connectivity and security groups',
        'Ensure database instance is running and accessible',
        'Review database logs for connection issues'
      ],
      'configuration': [
        'Validate configuration file syntax',
        'Check for missing required configuration values',
        'Verify configuration schema compliance',
        'Review configuration change logs'
      ],
      'rollback': [
        'Verify previous version exists in deployment history',
        'Check rollback permissions and access',
        'Ensure rollback target is compatible',
        'Consider manual restoration from backup'
      ],
      'health-check': [
        'Check application startup logs',
        'Verify health check endpoint is accessible',
        'Increase health check timeout if needed',
        'Check load balancer configuration'
      ],
      'scaling': [
        'Check cluster resource availability',
        'Verify scaling policies and limits',
        'Review resource quotas and constraints',
        'Consider scaling in smaller increments'
      ],
      'migration': [
        'Review migration scripts for conflicts',
        'Check database schema compatibility',
        'Verify migration rollback procedures',
        'Consider running migration in maintenance window'
      ]
    };

    return suggestions[type] || ['Contact DevOps team for assistance'];
  }

  /**
   * Determine if rollback should be recommended for operation type
   */
  private shouldRecommendRollback(type: DeploymentOperationType): boolean {
    const rollbackRecommended: Record<DeploymentOperationType, boolean> = {
      'application': true,
      'infrastructure': false, // Infrastructure rollbacks are complex
      'database': true,
      'configuration': true,
      'rollback': false, // Already a rollback operation
      'health-check': false, // Health checks don't need rollback
      'scaling': true,
      'migration': true
    };

    return rollbackRecommended[type];
  }

  /**
   * Generate deployment artifacts
   */
  private generateArtifacts(type: DeploymentOperationType): string[] {
    const artifacts: Record<DeploymentOperationType, string[]> = {
      'application': [
        'deployment.yaml',
        'service.yaml',
        'configmap.yaml',
        'ingress.yaml'
      ],
      'infrastructure': [
        'cloudformation-template.yaml',
        'terraform-state.tfstate',
        'resource-inventory.json'
      ],
      'database': [
        'database-schema.sql',
        'migration-scripts.sql',
        'backup-manifest.json'
      ],
      'configuration': [
        'config-diff.json',
        'validation-report.json',
        'rollback-config.json'
      ],
      'rollback': [
        'rollback-manifest.json',
        'previous-config.json',
        'rollback-log.txt'
      ],
      'health-check': [
        'health-report.json',
        'endpoint-status.json'
      ],
      'scaling': [
        'scaling-manifest.yaml',
        'resource-usage.json',
        'scaling-log.txt'
      ],
      'migration': [
        'migration-log.sql',
        'schema-diff.json',
        'data-validation.json'
      ]
    };

    return artifacts[type] || [];
  }

  /**
   * Generate warnings for successful operations
   */
  private generateWarnings(type: DeploymentOperationType): string[] {
    const warningPool: Record<DeploymentOperationType, string[]> = {
      'application': [
        'Deployment took longer than expected',
        'Some health checks had intermittent failures',
        'Resource usage is higher than baseline'
      ],
      'infrastructure': [
        'Some resources were created in non-preferred availability zones',
        'Cost optimization recommendations available',
        'Security group rules are more permissive than recommended'
      ],
      'database': [
        'Database migration included schema changes',
        'Connection pool size may need adjustment',
        'Backup window overlaps with peak usage'
      ],
      'configuration': [
        'Configuration changes require application restart',
        'Some feature flags were automatically enabled',
        'Cache invalidation may be needed'
      ],
      'rollback': [
        'Data loss may have occurred during rollback',
        'Some configuration changes were not reverted',
        'Manual verification of system state recommended'
      ],
      'health-check': [
        'Response times are higher than baseline',
        'Some endpoints showed degraded performance',
        'Memory usage is approaching limits'
      ],
      'scaling': [
        'Scaling operation may impact performance temporarily',
        'Resource costs will increase',
        'Load balancer configuration may need updates'
      ],
      'migration': [
        'Migration included data transformations',
        'Some indexes were rebuilt during migration',
        'Application cache should be cleared'
      ]
    };

    const warnings = warningPool[type] || [];
    
    // Randomly select 0-2 warnings
    const warningCount = Math.floor(Math.random() * 3);
    const selectedWarnings: string[] = [];
    
    for (let i = 0; i < warningCount && i < warnings.length; i++) {
      const randomIndex = Math.floor(Math.random() * warnings.length);
      if (!selectedWarnings.includes(warnings[randomIndex])) {
        selectedWarnings.push(warnings[randomIndex]);
      }
    }
    
    return selectedWarnings;
  }

  /**
   * Update factory configuration
   */
  updateConfig(newConfig: Partial<DeploymentMockConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset factory state (useful for testing)
   */
  reset(): void {
    this.operationCounter = 0;
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get current factory configuration
   */
  getConfig(): DeploymentMockConfig {
    return { ...this.config };
  }
}

/**
 * Default instance of the deployment mock factory
 * Can be used directly for simple test scenarios
 */
export const defaultDeploymentMockFactory = new DeploymentMockFactory();

/**
 * Convenience functions for common deployment operation mocks
 */
export const DeploymentMocks = {
  /**
   * Create a successful application deployment response
   */
  successfulAppDeployment: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('application', { 
      forceSuccess: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a failed application deployment response
   */
  failedAppDeployment: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('application', { 
      forceFailure: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a successful infrastructure deployment response
   */
  successfulInfraDeployment: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('infrastructure', { 
      forceSuccess: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a failed infrastructure deployment response
   */
  failedInfraDeployment: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('infrastructure', { 
      forceFailure: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a successful database deployment response
   */
  successfulDbDeployment: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('database', { 
      forceSuccess: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a failed database deployment response
   */
  failedDbDeployment: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('database', { 
      forceFailure: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a successful configuration update response
   */
  successfulConfigUpdate: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('configuration', { 
      forceSuccess: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a failed configuration update response
   */
  failedConfigUpdate: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('configuration', { 
      forceFailure: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a successful rollback response
   */
  successfulRollback: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('rollback', { 
      forceSuccess: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a failed rollback response
   */
  failedRollback: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('rollback', { 
      forceFailure: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a successful health check response
   */
  successfulHealthCheck: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('health-check', { 
      forceSuccess: true, 
      environment,
      customMetadata 
    }),

  /**
   * Create a failed health check response
   */
  failedHealthCheck: (environment?: DeploymentEnvironment, customMetadata?: Record<string, any>) =>
    defaultDeploymentMockFactory.createDeploymentResponse('health-check', { 
      forceFailure: true, 
      environment,
      customMetadata 
    })
};