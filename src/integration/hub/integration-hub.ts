import {
  IntegrationConfig,
  IntegrationHub as IIntegrationHub,
  IntegrationType,
  SyncResult,
  HealthCheckResult,
  IntegrationEvent,
  IntegrationEventType,
  IntegrationResult
} from '../types.js';
import { IdentityIntegrationManager } from '../identity/identity-integration-manager.js';
import { WorkflowIntegrationManager } from '../workflow/workflow-integration-manager.js';
import { NotificationIntegrationManager } from '../notifications/notification-integration-manager.js';
import { CICDIntegrationManager } from '../cicd/cicd-integration-manager.js';
import { MonitoringIntegrationManager } from '../monitoring/monitoring-integration-manager.js';

/**
 * Central hub for managing all enterprise integrations
 */
export class IntegrationHub implements IIntegrationHub {
  private integrations = new Map<string, IntegrationConfig>();
  private eventListeners = new Map<IntegrationEventType, Array<(event: IntegrationEvent) => void>>();
  
  private identityManager: IdentityIntegrationManager;
  private workflowManager: WorkflowIntegrationManager;
  private notificationManager: NotificationIntegrationManager;
  private cicdManager: CICDIntegrationManager;
  private monitoringManager: MonitoringIntegrationManager;

  constructor() {
    this.identityManager = new IdentityIntegrationManager();
    this.workflowManager = new WorkflowIntegrationManager();
    this.notificationManager = new NotificationIntegrationManager();
    this.cicdManager = new CICDIntegrationManager();
    this.monitoringManager = new MonitoringIntegrationManager();
  }

  /**
   * Register a new integration
   */
  async registerIntegration(config: IntegrationConfig): Promise<void> {
    try {
      // Validate configuration
      await this.validateIntegrationConfig(config);
      
      // Initialize the integration based on type
      await this.initializeIntegration(config);
      
      // Store configuration
      this.integrations.set(config.id, config);
      
      // Emit registration event
      this.emitEvent('configuration-changed', config.id, { action: 'registered' });
      
      console.log(`Integration ${config.id} registered successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emitEvent('error-occurred', config.id, { error: errorMessage });
      throw new Error(`Failed to register integration ${config.id}: ${errorMessage}`);
    }
  }

  /**
   * Remove an integration
   */
  async removeIntegration(id: string): Promise<void> {
    const integration = this.integrations.get(id);
    if (!integration) {
      throw new Error(`Integration ${id} not found`);
    }

    try {
      // Cleanup integration resources
      await this.cleanupIntegration(integration);
      
      // Remove from storage
      this.integrations.delete(id);
      
      // Emit removal event
      this.emitEvent('configuration-changed', id, { action: 'removed' });
      
      console.log(`Integration ${id} removed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emitEvent('error-occurred', id, { error: errorMessage });
      throw new Error(`Failed to remove integration ${id}: ${errorMessage}`);
    }
  }  /**
   * Get a specific integration
   */
  async getIntegration(id: string): Promise<IntegrationConfig | null> {
    return this.integrations.get(id) || null;
  }

  /**
   * List all integrations, optionally filtered by type
   */
  async listIntegrations(type?: IntegrationType): Promise<IntegrationConfig[]> {
    const allIntegrations = Array.from(this.integrations.values());
    
    if (type) {
      return allIntegrations.filter(integration => integration.type === type);
    }
    
    return allIntegrations;
  }

  /**
   * Synchronize data for a specific integration
   */
  async syncIntegration(id: string): Promise<SyncResult> {
    const integration = this.integrations.get(id);
    if (!integration) {
      throw new Error(`Integration ${id} not found`);
    }

    const startTime = Date.now();
    this.emitEvent('sync-started', id, { startTime });

    try {
      const result = await this.performSync(integration);
      
      // Update last sync time
      if (integration.metadata) {
        integration.metadata.lastSync = new Date();
      }
      
      this.emitEvent('sync-completed', id, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const failedResult: SyncResult = {
        success: false,
        itemsSynced: 0,
        errors: [errorMessage],
        duration: Date.now() - startTime,
        lastSync: new Date()
      };
      
      this.emitEvent('sync-failed', id, failedResult);
      return failedResult;
    }
  }

  /**
   * Perform health check on integrations
   */
  async healthCheck(id?: string): Promise<HealthCheckResult[]> {
    const integrationsToCheck = id 
      ? [this.integrations.get(id)].filter(Boolean) as IntegrationConfig[]
      : Array.from(this.integrations.values());

    const results: HealthCheckResult[] = [];

    for (const integration of integrationsToCheck) {
      const startTime = Date.now();
      
      try {
        const isHealthy = await this.checkIntegrationHealth(integration);
        const responseTime = Date.now() - startTime;
        
        const result: HealthCheckResult = {
          integrationId: integration.id,
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          lastCheck: new Date()
        };
        
        results.push(result);
        this.emitEvent('health-check', integration.id, result);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const result: HealthCheckResult = {
          integrationId: integration.id,
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
        
        results.push(result);
        this.emitEvent('health-check', integration.id, result);
      }
    }

    return results;
  }  /**
   * Add event listener for integration events
   */
  addEventListener(eventType: IntegrationEventType, listener: (event: IntegrationEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: IntegrationEventType, listener: (event: IntegrationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get integration manager by type
   */
  getIntegrationManager(type: IntegrationType) {
    switch (type) {
      case 'identity':
        return this.identityManager;
      case 'workflow':
        return this.workflowManager;
      case 'notification':
        return this.notificationManager;
      case 'cicd':
        return this.cicdManager;
      case 'monitoring':
        return this.monitoringManager;
      default:
        throw new Error(`Unknown integration type: ${type}`);
    }
  }

  // Private helper methods
  private async validateIntegrationConfig(config: IntegrationConfig): Promise<void> {
    if (!config.id || !config.name || !config.type) {
      throw new Error('Integration config must have id, name, and type');
    }

    if (this.integrations.has(config.id)) {
      throw new Error(`Integration with id ${config.id} already exists`);
    }

    // Validate type-specific configuration
    const manager = this.getIntegrationManager(config.type);
    if (manager && typeof manager.validateConfig === 'function') {
      await manager.validateConfig(config);
    }
  }

  private async initializeIntegration(config: IntegrationConfig): Promise<void> {
    const manager = this.getIntegrationManager(config.type);
    if (manager && typeof manager.initialize === 'function') {
      await manager.initialize(config);
    }
  }

  private async cleanupIntegration(config: IntegrationConfig): Promise<void> {
    const manager = this.getIntegrationManager(config.type);
    if (manager && typeof manager.cleanup === 'function') {
      await manager.cleanup(config);
    }
  }

  private async performSync(config: IntegrationConfig): Promise<SyncResult> {
    const manager = this.getIntegrationManager(config.type);
    if (manager && typeof manager.sync === 'function') {
      return await manager.sync(config);
    }

    // Default sync result if no specific sync method
    return {
      success: true,
      itemsSynced: 0,
      errors: [],
      duration: 0,
      lastSync: new Date()
    };
  }

  private async checkIntegrationHealth(config: IntegrationConfig): Promise<boolean> {
    const manager = this.getIntegrationManager(config.type);
    if (manager && typeof manager.healthCheck === 'function') {
      return await manager.healthCheck(config);
    }

    // Default to healthy if no specific health check
    return true;
  }

  private emitEvent(type: IntegrationEventType, integrationId: string, data: any): void {
    const event: IntegrationEvent = {
      type,
      integrationId,
      timestamp: new Date(),
      data,
      correlationId: this.generateCorrelationId()
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}