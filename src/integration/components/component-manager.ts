import { EventEmitter } from 'events';
import {
  ComponentDefinition,
  DeploymentConfig,
  DeploymentResult,
  ScalingConfig,
  HealthStatus,
  ComponentUpdate,
  ComponentRegistry,
  DependencyResolver,
  ValidationResult,
  ComponentCommunication,
  ComponentMetrics
} from './types';
import { ComponentRegistryImpl } from './component-registry';
import { DependencyResolverImpl } from './dependency-resolver';
import { ComponentDeployer } from './component-deployer';
import { ComponentScaler } from './component-scaler';
import { ComponentHealthMonitor } from './component-health-monitor';
import { ComponentCommunicationManager } from './component-communication-manager';

/**
 * ComponentManager handles the complete lifecycle of system components including
 * registration, deployment, scaling, health monitoring, and inter-component communication
 */
export class ComponentManager extends EventEmitter {
  private readonly registry: ComponentRegistry;
  private readonly dependencyResolver: DependencyResolver;
  private readonly deployer: ComponentDeployer;
  private readonly scaler: ComponentScaler;
  private readonly healthMonitor: ComponentHealthMonitor;
  private readonly communicationManager: ComponentCommunicationManager;
  
  private readonly deployments = new Map<string, DeploymentResult>();
  private readonly componentMetrics = new Map<string, ComponentMetrics>();
  private readonly rollbackHistory = new Map<string, ComponentDefinition[]>();
  
  constructor() {
    super();
    
    this.registry = new ComponentRegistryImpl();
    this.dependencyResolver = new DependencyResolverImpl(this.registry);
    this.deployer = new ComponentDeployer();
    this.scaler = new ComponentScaler();
    this.healthMonitor = new ComponentHealthMonitor();
    this.communicationManager = new ComponentCommunicationManager();
    
    this.initializeEventHandlers();
  }

  /**
   * Initialize event handlers for component lifecycle events
   */
  private initializeEventHandlers(): void {
    this.healthMonitor.on('healthChanged', (componentId: string, status: HealthStatus) => {
      this.handleHealthChange(componentId, status);
    });

    this.scaler.on('scalingEvent', (componentId: string, event: any) => {
      this.handleScalingEvent(componentId, event);
    });

    this.deployer.on('deploymentEvent', (componentId: string, event: any) => {
      this.handleDeploymentEvent(componentId, event);
    });
  }

  /**
   * Register a component with dependency resolution and validation
   */
  async registerComponent(component: ComponentDefinition): Promise<void> {
    try {
      // Validate component definition
      const validation = await this.validateComponentDefinition(component);
      if (!validation.valid) {
        throw new Error(`Component validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Resolve and validate dependencies
      const dependencyValidation = await this.dependencyResolver.validate(component.dependencies);
      if (!dependencyValidation.valid) {
        throw new Error(`Dependency validation failed: ${dependencyValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Register component
      await this.registry.register(component);

      // Initialize health monitoring
      await this.healthMonitor.addComponent(component);

      // Setup communication channels
      await this.communicationManager.setupComponent(component);

      this.emit('componentRegistered', {
        componentId: component.id,
        timestamp: new Date()
      });

    } catch (error) {
      this.emit('componentRegistrationFailed', {
        componentId: component.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Deploy a component with health checking and rollback capabilities
   */
  async deployComponent(componentId: string, config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      // Get component definition
      const component = await this.registry.get(componentId);
      if (!component) {
        throw new Error(`Component not found: ${componentId}`);
      }

      // Store current version for rollback
      await this.storeRollbackVersion(componentId, component);

      // Resolve deployment order based on dependencies
      const deploymentOrder = await this.resolveDependencyOrder([component]);

      // Deploy component
      const result = await this.deployer.deploy(component, config);

      // Store deployment result
      this.deployments.set(componentId, result);

      // Start health monitoring
      await this.healthMonitor.startMonitoring(componentId);

      // Setup auto-scaling if configured
      if (component.scaling.maxReplicas > component.scaling.minReplicas) {
        await this.scaler.enableAutoScaling(componentId, component.scaling);
      }

      this.emit('componentDeployed', {
        componentId,
        deploymentId: result.deploymentId,
        timestamp: new Date()
      });

      return result;

    } catch (error) {
      const errorResult: DeploymentResult = {
        success: false,
        deploymentId: `failed-${Date.now()}`,
        status: {
          phase: 'Failed',
          replicas: { desired: 0, current: 0, ready: 0, available: 0 },
          conditions: [{
            type: 'Failed',
            status: 'True',
            reason: 'DeploymentError',
            message: error instanceof Error ? error.message : 'Unknown error',
            lastTransitionTime: new Date()
          }]
        },
        message: error instanceof Error ? error.message : 'Deployment failed',
        timestamp: new Date()
      };

      this.deployments.set(componentId, errorResult);

      this.emit('componentDeploymentFailed', {
        componentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      return errorResult;
    }
  }

  /**
   * Scale a component with auto-scaling policies and resource management
   */
  async scaleComponent(componentId: string, scaling: ScalingConfig): Promise<void> {
    try {
      const component = await this.registry.get(componentId);
      if (!component) {
        throw new Error(`Component not found: ${componentId}`);
      }

      const deployment = this.deployments.get(componentId);
      if (!deployment || !deployment.success) {
        throw new Error(`Component not deployed or deployment failed: ${componentId}`);
      }

      // Perform scaling operation
      await this.scaler.scale(componentId, scaling);

      // Update component definition if scaling policy changed
      if (scaling.policy) {
        const updatedComponent = {
          ...component,
          scaling: { ...component.scaling, ...scaling.policy }
        };
        await this.registry.update(componentId, updatedComponent);
      }

      this.emit('componentScaled', {
        componentId,
        scaling,
        timestamp: new Date()
      });

    } catch (error) {
      this.emit('componentScalingFailed', {
        componentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Perform health check on a component
   */
  async healthCheck(componentId: string): Promise<HealthStatus> {
    try {
      const component = await this.registry.get(componentId);
      if (!component) {
        throw new Error(`Component not found: ${componentId}`);
      }

      const health = await this.healthMonitor.checkHealth(componentId);
      
      // Store metrics if available
      const metrics = await this.healthMonitor.getMetrics(componentId);
      if (metrics) {
        this.componentMetrics.set(componentId, metrics);
      }

      return health;

    } catch (error) {
      return {
        status: 'unhealthy',
        checks: [{
          name: 'health-check',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Health check failed',
          timestamp: new Date()
        }],
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Update a component with validation and rollback support
   */
  async updateComponent(componentId: string, update: ComponentUpdate): Promise<void> {
    try {
      const currentComponent = await this.registry.get(componentId);
      if (!currentComponent) {
        throw new Error(`Component not found: ${componentId}`);
      }

      // Store current version for rollback
      await this.storeRollbackVersion(componentId, currentComponent);

      // Create updated component definition
      const updatedComponent: ComponentDefinition = {
        ...currentComponent,
        version: update.version || currentComponent.version,
        resources: update.resources || currentComponent.resources,
        scaling: update.scaling || currentComponent.scaling,
        healthCheck: update.healthCheck || currentComponent.healthCheck,
        metadata: {
          ...currentComponent.metadata,
          ...update.config,
          lastUpdated: new Date().toISOString()
        }
      };

      // Validate updated component
      const validation = await this.validateComponentDefinition(updatedComponent);
      if (!validation.valid) {
        throw new Error(`Updated component validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Update registry
      await this.registry.update(componentId, updatedComponent);

      // Update deployment if component is deployed
      const deployment = this.deployments.get(componentId);
      if (deployment && deployment.success) {
        await this.deployer.update(componentId, updatedComponent);
      }

      // Update health monitoring configuration
      await this.healthMonitor.updateComponent(componentId, updatedComponent);

      // Update scaling configuration
      if (update.scaling) {
        await this.scaler.updateScalingPolicy(componentId, update.scaling);
      }

      this.emit('componentUpdated', {
        componentId,
        update,
        timestamp: new Date()
      });

    } catch (error) {
      // Only attempt rollback if component exists and has rollback history
      const hasRollbackHistory = this.rollbackHistory.has(componentId) && 
                                 this.rollbackHistory.get(componentId)!.length > 0;
      
      if (hasRollbackHistory) {
        try {
          await this.rollbackComponent(componentId);
        } catch (rollbackError) {
          // Log rollback failure but don't override original error
          console.warn(`Rollback failed for ${componentId}:`, rollbackError);
        }
      }
      
      this.emit('componentUpdateFailed', {
        componentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Rollback a component to previous version
   */
  async rollbackComponent(componentId: string): Promise<void> {
    try {
      const rollbackVersions = this.rollbackHistory.get(componentId);
      if (!rollbackVersions || rollbackVersions.length === 0) {
        throw new Error(`No rollback version available for component: ${componentId}`);
      }

      const previousVersion = rollbackVersions[rollbackVersions.length - 1];
      
      // Update registry with previous version
      await this.registry.update(componentId, previousVersion);

      // Rollback deployment
      const deployment = this.deployments.get(componentId);
      if (deployment && deployment.success) {
        await this.deployer.rollback(componentId, previousVersion);
      }

      // Update health monitoring
      await this.healthMonitor.updateComponent(componentId, previousVersion);

      // Update scaling policy
      await this.scaler.updateScalingPolicy(componentId, previousVersion.scaling);

      this.emit('componentRolledBack', {
        componentId,
        version: previousVersion.version,
        timestamp: new Date()
      });

    } catch (error) {
      this.emit('componentRollbackFailed', {
        componentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Stop and remove a component
   */
  async removeComponent(componentId: string): Promise<void> {
    try {
      // Stop health monitoring
      await this.healthMonitor.removeComponent(componentId);

      // Disable auto-scaling
      await this.scaler.disableAutoScaling(componentId);

      // Remove deployment
      const deployment = this.deployments.get(componentId);
      if (deployment && deployment.success) {
        await this.deployer.remove(componentId);
      }

      // Cleanup communication channels
      await this.communicationManager.cleanupComponent(componentId);

      // Remove from registry
      await this.registry.unregister(componentId);

      // Cleanup local state
      this.deployments.delete(componentId);
      this.componentMetrics.delete(componentId);
      this.rollbackHistory.delete(componentId);

      this.emit('componentRemoved', {
        componentId,
        timestamp: new Date()
      });

    } catch (error) {
      this.emit('componentRemovalFailed', {
        componentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Get component status and metrics
   */
  async getComponentStatus(componentId: string): Promise<{
    component: ComponentDefinition | null;
    deployment: DeploymentResult | null;
    health: HealthStatus;
    metrics: ComponentMetrics | null;
  }> {
    const component = await this.registry.get(componentId);
    const deployment = this.deployments.get(componentId) || null;
    const health = await this.healthCheck(componentId);
    const metrics = this.componentMetrics.get(componentId) || null;

    return { component, deployment, health, metrics };
  }

  /**
   * List all registered components
   */
  async listComponents(): Promise<ComponentDefinition[]> {
    return await this.registry.list();
  }

  /**
   * Get component communication configuration
   */
  async getComponentCommunication(componentId: string): Promise<ComponentCommunication | null> {
    return await this.communicationManager.getConfiguration(componentId);
  }

  /**
   * Setup inter-component communication
   */
  async setupCommunication(communication: ComponentCommunication): Promise<void> {
    await this.communicationManager.setup(communication);
  }

  /**
   * Private helper methods
   */
  private async validateComponentDefinition(component: ComponentDefinition): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation
    if (!component.id || component.id.trim() === '') {
      errors.push({ code: 'MISSING_ID', message: 'Component ID is required' });
    }

    if (!component.name || component.name.trim() === '') {
      errors.push({ code: 'MISSING_NAME', message: 'Component name is required' });
    }

    if (!component.version || component.version.trim() === '') {
      errors.push({ code: 'MISSING_VERSION', message: 'Component version is required' });
    }

    // Resource validation
    if (!component.resources.cpu) {
      errors.push({ code: 'MISSING_CPU', message: 'CPU resource requirement is required' });
    }

    if (!component.resources.memory) {
      errors.push({ code: 'MISSING_MEMORY', message: 'Memory resource requirement is required' });
    }

    // Scaling validation
    if (component.scaling.minReplicas < 0) {
      errors.push({ code: 'INVALID_MIN_REPLICAS', message: 'Minimum replicas must be >= 0' });
    }

    if (component.scaling.maxReplicas < component.scaling.minReplicas) {
      errors.push({ code: 'INVALID_MAX_REPLICAS', message: 'Maximum replicas must be >= minimum replicas' });
    }

    // Health check validation
    if (component.healthCheck.initialDelaySeconds < 0) {
      errors.push({ code: 'INVALID_INITIAL_DELAY', message: 'Initial delay must be >= 0' });
    }

    if (component.healthCheck.periodSeconds <= 0) {
      errors.push({ code: 'INVALID_PERIOD', message: 'Period must be > 0' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async storeRollbackVersion(componentId: string, component: ComponentDefinition): Promise<void> {
    const history = this.rollbackHistory.get(componentId) || [];
    history.push({ ...component });
    
    // Keep only last 5 versions
    if (history.length > 5) {
      history.shift();
    }
    
    this.rollbackHistory.set(componentId, history);
  }

  private async resolveDependencyOrder(components: ComponentDefinition[]): Promise<string[]> {
    const componentIds = components.map(c => c.id);
    return await this.dependencyResolver.getInstallOrder(components);
  }

  private async handleHealthChange(componentId: string, status: HealthStatus): Promise<void> {
    this.emit('healthChanged', { componentId, status, timestamp: new Date() });

    // Handle unhealthy components
    if (status.status === 'unhealthy') {
      await this.handleUnhealthyComponent(componentId, status);
    }
  }

  private async handleScalingEvent(componentId: string, event: any): Promise<void> {
    this.emit('scalingEvent', { componentId, event, timestamp: new Date() });
  }

  private async handleDeploymentEvent(componentId: string, event: any): Promise<void> {
    this.emit('deploymentEvent', { componentId, event, timestamp: new Date() });
  }

  private async handleUnhealthyComponent(componentId: string, status: HealthStatus): Promise<void> {
    try {
      // Attempt automatic recovery
      const component = await this.registry.get(componentId);
      if (component) {
        // Try restarting the component
        await this.deployer.restart(componentId);
        
        this.emit('componentRecoveryAttempted', {
          componentId,
          action: 'restart',
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.emit('componentRecoveryFailed', {
        componentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    await this.healthMonitor.shutdown();
    await this.scaler.shutdown();
    await this.deployer.shutdown();
    await this.communicationManager.shutdown();
    this.removeAllListeners();
  }
}