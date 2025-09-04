/**
 * MonitoringSystemFactory
 * 
 * Factory class for creating and configuring MonitoringSystem instances
 * with consistent initialization patterns and configuration management.
 * 
 * Supports both agent-hooks and integration MonitoringSystem implementations
 * with proper dependency injection and configuration validation.
 */

import { Logger } from '../../cli/lib/logger';
import { Result, success, failure } from '../types/result';

// Import both MonitoringSystem implementations
import { MonitoringSystem as AgentHooksMonitoringSystem } from '../../agent-hooks/monitoring/monitoring-system';
import { MonitoringSystem as IntegrationMonitoringSystem } from '../../integration/monitoring/monitoring-system';

// Import required dependencies for agent-hooks version
import { ErrorHandler } from '../../agent-hooks/errors/error-handler';
import { PerformanceMonitor } from '../../agent-hooks/performance/performance-monitor';
import { NotificationSystem } from '../../agent-hooks/notifications/notification-system';
import { MonitoringConfig } from '../../agent-hooks/types/monitoring';

/**
 * Configuration for MonitoringSystem factory
 */
export interface MonitoringSystemFactoryConfig {
  type: 'agent-hooks' | 'integration';
  logger?: Logger;
  config?: Partial<MonitoringConfig> | Partial<IntegrationMonitoringConfig>;
  dependencies?: {
    errorHandler?: ErrorHandler;
    performanceMonitor?: PerformanceMonitor;
    notificationSystem?: NotificationSystem;
  };
}

/**
 * Integration MonitoringSystem configuration interface
 */
export interface IntegrationMonitoringConfig {
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  metricsPort: number;
  metricsPath: string;
  healthCheckInterval: number;
  alertingEnabled: boolean;
  retentionPeriod: number;
}

/**
 * Factory result type
 */
export type MonitoringSystemInstance = AgentHooksMonitoringSystem | IntegrationMonitoringSystem;

/**
 * Factory class for creating MonitoringSystem instances
 */
export class MonitoringSystemFactory {
  private static readonly DEFAULT_AGENT_HOOKS_CONFIG: MonitoringConfig = {
    enabled: true,
    metrics: {
      enabled: true,
      collectInterval: 60000,
      retention: '7d',
      exporters: []
    },
    alerts: {
      enabled: true,
      rules: [],
      evaluationInterval: 30000,
      resolveTimeout: '5m'
    },
    healthChecks: {
      enabled: true,
      checks: [],
      globalTimeout: 30000
    },
    logging: {
      enabled: true,
      level: 'info',
      format: 'json',
      outputs: [],
      retention: '7d'
    },
    tracing: {
      enabled: false,
      sampleRate: 0.1,
      exporters: [],
      retention: '7d'
    },
    dashboards: {
      enabled: false,
      refreshInterval: 30000,
      panels: []
    }
  };

  private static readonly DEFAULT_INTEGRATION_CONFIG: IntegrationMonitoringConfig = {
    enableMetrics: true,
    enableHealthChecks: true,
    metricsPort: 9090,
    metricsPath: '/metrics',
    healthCheckInterval: 60000,
    alertingEnabled: true,
    retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  };

  /**
   * Create a MonitoringSystem instance with the specified configuration
   */
  static async create(factoryConfig: MonitoringSystemFactoryConfig): Promise<Result<MonitoringSystemInstance, Error>> {
    try {
      // Validate configuration
      const validationResult = this.validateConfig(factoryConfig);
      if (!validationResult.success) {
        return validationResult as Result<MonitoringSystemInstance, Error>;
      }

      let instance: MonitoringSystemInstance;

      switch (factoryConfig.type) {
        case 'agent-hooks':
          instance = await this.createAgentHooksInstance(factoryConfig);
          break;
        case 'integration':
          instance = await this.createIntegrationInstance(factoryConfig);
          break;
        default:
          return failure(new Error(`Unknown MonitoringSystem type: ${factoryConfig.type}`));
      }

      return success(instance);

    } catch (error) {
      return failure(new Error(`Failed to create MonitoringSystem: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  /**
   * Create a development-optimized MonitoringSystem instance
   */
  static async createForDevelopment(type: 'agent-hooks' | 'integration' = 'integration'): Promise<Result<MonitoringSystemInstance, Error>> {
    const devConfig: MonitoringSystemFactoryConfig = {
      type,
      logger: this.createDefaultLogger(),
      config: type === 'agent-hooks' ? {
        ...this.DEFAULT_AGENT_HOOKS_CONFIG,
        healthCheckInterval: 30000, // More frequent health checks for development
        metricsPort: 9091 // Different port to avoid conflicts
      } : {
        ...this.DEFAULT_INTEGRATION_CONFIG,
        healthCheckInterval: 30000, // More frequent health checks for development
        metricsPort: 9091 // Different port to avoid conflicts
      }
    };

    return this.create(devConfig);
  }

  /**
   * Create a production-optimized MonitoringSystem instance
   */
  static async createForProduction(type: 'agent-hooks' | 'integration' = 'integration'): Promise<Result<MonitoringSystemInstance, Error>> {
    const prodConfig: MonitoringSystemFactoryConfig = {
      type,
      logger: this.createDefaultLogger(),
      config: type === 'agent-hooks' ? {
        ...this.DEFAULT_AGENT_HOOKS_CONFIG,
        alertingEnabled: true, // Ensure alerting is enabled in production
        retentionPeriod: 30 // 30 days retention for production
      } : {
        ...this.DEFAULT_INTEGRATION_CONFIG,
        alertingEnabled: true, // Ensure alerting is enabled in production
        retentionPeriod: 30 // 30 days retention for production
      }
    };

    return this.create(prodConfig);
  }

  /**
   * Create a test-optimized MonitoringSystem instance
   */
  static async createForTesting(type: 'agent-hooks' | 'integration' = 'integration'): Promise<Result<MonitoringSystemInstance, Error>> {
    const testConfig: MonitoringSystemFactoryConfig = {
      type,
      logger: this.createTestLogger(),
      config: type === 'agent-hooks' ? {
        ...this.DEFAULT_AGENT_HOOKS_CONFIG,
        ...this.DEFAULT_AGENT_HOOKS_CONFIG,
        metricsPort: 0, // Use random port for testing
        healthCheckInterval: 5000, // Frequent health checks for testing
        alertingEnabled: false, // Disable alerting in tests
        retentionPeriod: 1 // 1 day retention for testing
      } : {
        ...this.DEFAULT_INTEGRATION_CONFIG,
        enableMetrics: true,
        enableHealthChecks: true,
        metricsPort: 0, // Use random port for testing
        healthCheckInterval: 5000, // Frequent health checks for testing
        alertingEnabled: false, // Disable alerting in tests
        retentionPeriod: 60 * 1000 // 1 minute retention for testing
      }
    };

    return this.create(testConfig);
  }

  /**
   * Reset all MonitoringSystem singleton instances
   */
  static resetAllInstances(): void {
    try {
      AgentHooksMonitoringSystem.resetInstance();
    } catch (error) {
      // Ignore errors if class doesn't exist or method fails
    }

    try {
      IntegrationMonitoringSystem.resetInstance();
    } catch (error) {
      // Ignore errors if class doesn't exist or method fails
    }
  }

  /**
   * Check if any MonitoringSystem instances exist
   */
  static hasAnyInstance(): boolean {
    try {
      const agentHooksExists = AgentHooksMonitoringSystem.hasInstance();
      const integrationExists = IntegrationMonitoringSystem.hasInstance();
      return agentHooksExists || integrationExists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get configuration template for a specific type
   */
  static getConfigTemplate(type: 'agent-hooks' | 'integration'): MonitoringConfig | IntegrationMonitoringConfig {
    switch (type) {
      case 'agent-hooks':
        return { ...this.DEFAULT_AGENT_HOOKS_CONFIG };
      case 'integration':
        return { ...this.DEFAULT_INTEGRATION_CONFIG };
      default:
        throw new Error(`Unknown MonitoringSystem type: ${type}`);
    }
  }

  // Private helper methods

  private static async createAgentHooksInstance(factoryConfig: MonitoringSystemFactoryConfig): Promise<AgentHooksMonitoringSystem> {
    const config = {
      ...this.DEFAULT_AGENT_HOOKS_CONFIG,
      ...(factoryConfig.config as Partial<MonitoringConfig>)
    };

    const logger = factoryConfig.logger || this.createDefaultLogger();

    // Create or use provided dependencies
    const errorHandler = factoryConfig.dependencies?.errorHandler || this.createDefaultErrorHandler(logger);
    const performanceMonitor = factoryConfig.dependencies?.performanceMonitor || this.createDefaultPerformanceMonitor(logger);
    const notificationSystem = factoryConfig.dependencies?.notificationSystem || this.createDefaultNotificationSystem(logger);

    return AgentHooksMonitoringSystem.getInstance(
      config,
      errorHandler,
      performanceMonitor,
      notificationSystem
    );
  }

  private static async createIntegrationInstance(factoryConfig: MonitoringSystemFactoryConfig): Promise<IntegrationMonitoringSystem> {
    const config = {
      ...this.DEFAULT_INTEGRATION_CONFIG,
      ...(factoryConfig.config as Partial<IntegrationMonitoringConfig>)
    };

    const logger = factoryConfig.logger || this.createDefaultLogger();

    return IntegrationMonitoringSystem.getInstance(logger, config);
  }

  private static validateConfig(factoryConfig: MonitoringSystemFactoryConfig): Result<void, Error> {
    if (!factoryConfig.type) {
      return failure(new Error('MonitoringSystem type is required'));
    }

    if (!['agent-hooks', 'integration'].includes(factoryConfig.type)) {
      return failure(new Error(`Invalid MonitoringSystem type: ${factoryConfig.type}. Must be 'agent-hooks' or 'integration'`));
    }

    // Validate agent-hooks specific requirements
    if (factoryConfig.type === 'agent-hooks') {
      const config = factoryConfig.config as Partial<MonitoringConfig>;
      if (config?.metrics?.collectInterval && config.metrics.collectInterval < 1000) {
        return failure(new Error('Metrics collection interval must be at least 1000ms'));
      }
      if (config?.alerts?.evaluationInterval && config.alerts.evaluationInterval < 1000) {
        return failure(new Error('Alert evaluation interval must be at least 1000ms'));
      }
    }

    // Validate integration specific requirements
    if (factoryConfig.type === 'integration') {
      const config = factoryConfig.config as Partial<IntegrationMonitoringConfig>;
      if (config?.metricsPort && (config.metricsPort < 0 || config.metricsPort > 65535)) {
        return failure(new Error('Metrics port must be between 0 and 65535'));
      }
      if (config?.healthCheckInterval && config.healthCheckInterval < 1000) {
        return failure(new Error('Health check interval must be at least 1000ms'));
      }
    }

    return success(undefined);
  }

  private static createDefaultLogger(): Logger {
    return {
      info: (message: string, meta?: any) => {
        if (process.env.NODE_ENV !== 'test') {
          console.log(`[INFO] ${message}`, meta || '');
        }
      },
      error: (message: string, meta?: any) => {
        if (process.env.NODE_ENV !== 'test') {
          console.error(`[ERROR] ${message}`, meta || '');
        }
      },
      warn: (message: string, meta?: any) => {
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`[WARN] ${message}`, meta || '');
        }
      },
      debug: (message: string, meta?: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[DEBUG] ${message}`, meta || '');
        }
      }
    } as Logger;
  }

  private static createTestLogger(): Logger {
    return {
      info: () => {}, // Silent in tests
      error: () => {}, // Silent in tests
      warn: () => {}, // Silent in tests
      debug: () => {} // Silent in tests
    } as unknown as Logger;
  }

  private static createDefaultErrorHandler(logger: Logger): ErrorHandler {
    return {
      handleError: async (error: Error, context?: any) => {
        logger.error('Error handled by default error handler', {
          error: error.message,
          stack: error.stack,
          context
        });
      }
    } as unknown as ErrorHandler;
  }

  private static createDefaultPerformanceMonitor(logger: Logger): PerformanceMonitor {
    return {
      startTimer: (name: string) => {
        const startTime = Date.now();
        return {
          end: () => {
            const duration = Date.now() - startTime;
            logger.debug('Performance timer ended', { name, duration });
            return duration;
          }
        };
      },
      endTimer: (name: string) => {
        logger.debug('Performance timer ended', { name });
      },
      recordMetric: (name: string, value: number, labels?: Record<string, string>) => {
        logger.debug('Performance metric recorded', { name, value, labels });
      }
    } as unknown as PerformanceMonitor;
  }

  private static createDefaultNotificationSystem(logger: Logger): NotificationSystem {
    return {
      sendNotification: async (type: any, priority: any, title: string, message: string, channels: any[]) => {
        logger.info('Notification sent', { type, priority, title, message, channels: channels.length });
      }
    } as unknown as NotificationSystem;
  }
}