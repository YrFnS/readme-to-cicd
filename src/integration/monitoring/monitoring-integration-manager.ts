import {
  IntegrationConfig,
  MonitoringPlatform,
  MetricData,
  AlertRule,
  SyncResult,
  IntegrationResult
} from '../types.js';
import { DatadogProvider } from './datadog-provider.js';
import { NewRelicProvider } from './newrelic-provider.js';
import { PrometheusProvider } from './prometheus-provider.js';

/**
 * Manager for monitoring platform integrations (Datadog, New Relic, Prometheus)
 */
export class MonitoringIntegrationManager {
  private platforms = new Map<string, MonitoringPlatform>();
  private datadogProvider: DatadogProvider;
  private newrelicProvider: NewRelicProvider;
  private prometheusProvider: PrometheusProvider;

  constructor() {
    this.datadogProvider = new DatadogProvider();
    this.newrelicProvider = new NewRelicProvider();
    this.prometheusProvider = new PrometheusProvider();
  }

  /**
   * Validate monitoring integration configuration
   */
  async validateConfig(config: IntegrationConfig): Promise<void> {
    const monitoringConfig = config.configuration as MonitoringPlatform;
    
    if (!monitoringConfig.type) {
      throw new Error('Monitoring integration must specify type');
    }

    const validTypes = ['datadog', 'newrelic', 'prometheus', 'custom'];
    if (!validTypes.includes(monitoringConfig.type)) {
      throw new Error(`Invalid monitoring platform type: ${monitoringConfig.type}`);
    }

    // Type-specific validation
    switch (monitoringConfig.type) {
      case 'datadog':
        await this.datadogProvider.validateConfig(monitoringConfig);
        break;
      case 'newrelic':
        await this.newrelicProvider.validateConfig(monitoringConfig);
        break;
      case 'prometheus':
        await this.prometheusProvider.validateConfig(monitoringConfig);
        break;
    }
  }

  /**
   * Initialize monitoring integration
   */
  async initialize(config: IntegrationConfig): Promise<void> {
    const monitoringConfig = config.configuration as MonitoringPlatform;
    
    try {
      switch (monitoringConfig.type) {
        case 'datadog':
          await this.datadogProvider.initialize(monitoringConfig, config.credentials);
          break;
        case 'newrelic':
          await this.newrelicProvider.initialize(monitoringConfig, config.credentials);
          break;
        case 'prometheus':
          await this.prometheusProvider.initialize(monitoringConfig, config.credentials);
          break;
      }

      this.platforms.set(config.id, monitoringConfig);
      console.log(`Monitoring platform ${config.id} initialized successfully`);
    } catch (error) {
      throw new Error(`Failed to initialize monitoring platform: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Cleanup monitoring integration
   */
  async cleanup(config: IntegrationConfig): Promise<void> {
    const monitoringConfig = config.configuration as MonitoringPlatform;
    
    try {
      switch (monitoringConfig.type) {
        case 'datadog':
          await this.datadogProvider.cleanup();
          break;
        case 'newrelic':
          await this.newrelicProvider.cleanup();
          break;
        case 'prometheus':
          await this.prometheusProvider.cleanup();
          break;
      }

      this.platforms.delete(config.id);
      console.log(`Monitoring platform ${config.id} cleaned up successfully`);
    } catch (error) {
      console.error(`Error cleaning up monitoring platform ${config.id}:`, error);
    }
  }

  /**
   * Sync monitoring data
   */
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    const monitoringConfig = this.platforms.get(config.id);
    if (!monitoringConfig) {
      throw new Error(`Monitoring platform ${config.id} not initialized`);
    }

    const startTime = Date.now();
    let itemsSynced = 0;
    const errors: string[] = [];

    try {
      let metrics: MetricData[] = [];

      switch (monitoringConfig.type) {
        case 'datadog':
          metrics = await this.datadogProvider.getMetrics();
          break;
        case 'newrelic':
          metrics = await this.newrelicProvider.getMetrics();
          break;
        case 'prometheus':
          metrics = await this.prometheusProvider.getMetrics();
          break;
      }

      itemsSynced = metrics.length;
      
      // Process metrics
      await this.processMetrics(metrics, config.id);

      return {
        success: true,
        itemsSynced,
        errors,
        duration: Date.now() - startTime,
        lastSync: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        success: false,
        itemsSynced,
        errors,
        duration: Date.now() - startTime,
        lastSync: new Date()
      };
    }
  }

  /**
   * Health check for monitoring platform
   */
  async healthCheck(config: IntegrationConfig): Promise<boolean> {
    const monitoringConfig = this.platforms.get(config.id);
    if (!monitoringConfig) {
      return false;
    }

    try {
      switch (monitoringConfig.type) {
        case 'datadog':
          return await this.datadogProvider.healthCheck();
        case 'newrelic':
          return await this.newrelicProvider.healthCheck();
        case 'prometheus':
          return await this.prometheusProvider.healthCheck();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Health check failed for monitoring platform ${config.id}:`, error);
      return false;
    }
  }  /**
   * Send metrics to monitoring platform
   */
  async sendMetrics(platformId: string, metrics: MetricData[]): Promise<IntegrationResult<void>> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return {
        success: false,
        error: `Monitoring platform ${platformId} not found`
      };
    }

    try {
      let success = false;

      switch (platform.type) {
        case 'datadog':
          success = await this.datadogProvider.sendMetrics(metrics);
          break;
        case 'newrelic':
          success = await this.newrelicProvider.sendMetrics(metrics);
          break;
        case 'prometheus':
          success = await this.prometheusProvider.sendMetrics(metrics);
          break;
      }

      if (success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Failed to send metrics'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error sending metrics'
      };
    }
  }

  /**
   * Create alert rule
   */
  async createAlertRule(platformId: string, alertRule: AlertRule): Promise<IntegrationResult<string>> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return {
        success: false,
        error: `Monitoring platform ${platformId} not found`
      };
    }

    try {
      let ruleId: string | null = null;

      switch (platform.type) {
        case 'datadog':
          ruleId = await this.datadogProvider.createAlertRule(alertRule);
          break;
        case 'newrelic':
          ruleId = await this.newrelicProvider.createAlertRule(alertRule);
          break;
        case 'prometheus':
          ruleId = await this.prometheusProvider.createAlertRule(alertRule);
          break;
      }

      if (ruleId) {
        return {
          success: true,
          data: ruleId
        };
      } else {
        return {
          success: false,
          error: 'Failed to create alert rule'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error creating alert rule'
      };
    }
  }

  /**
   * Query metrics from monitoring platform
   */
  async queryMetrics(
    platformId: string, 
    query: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<IntegrationResult<MetricData[]>> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return {
        success: false,
        error: `Monitoring platform ${platformId} not found`
      };
    }

    try {
      let metrics: MetricData[] = [];

      switch (platform.type) {
        case 'datadog':
          metrics = await this.datadogProvider.queryMetrics(query, startTime, endTime);
          break;
        case 'newrelic':
          metrics = await this.newrelicProvider.queryMetrics(query, startTime, endTime);
          break;
        case 'prometheus':
          metrics = await this.prometheusProvider.queryMetrics(query, startTime, endTime);
          break;
      }

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error querying metrics'
      };
    }
  }

  /**
   * Get dashboard URL for monitoring platform
   */
  getDashboardUrl(platformId: string, dashboardId?: string): string | null {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return null;
    }

    switch (platform.type) {
      case 'datadog':
        return this.datadogProvider.getDashboardUrl(dashboardId);
      case 'newrelic':
        return this.newrelicProvider.getDashboardUrl(dashboardId);
      case 'prometheus':
        return this.prometheusProvider.getDashboardUrl(dashboardId);
      default:
        return null;
    }
  }

  // Private helper methods
  private async processMetrics(metrics: MetricData[], platformId: string): Promise<void> {
    console.log(`Processing ${metrics.length} metrics from platform ${platformId}`);
    
    for (const metric of metrics) {
      console.log(`Processed metric: ${metric.name} = ${metric.value} ${metric.unit || ''}`);
    }
  }
}