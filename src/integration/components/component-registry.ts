import { ComponentDefinition, ComponentRegistry, ValidationResult } from './types';

/**
 * In-memory component registry with persistence support
 */
export class ComponentRegistryImpl implements ComponentRegistry {
  private components = new Map<string, ComponentDefinition>();
  private readonly persistencePath: string;

  constructor(persistencePath: string = './data/components.json') {
    this.persistencePath = persistencePath;
    this.loadFromPersistence();
  }

  /**
   * Register a new component
   */
  async register(component: ComponentDefinition): Promise<void> {
    // Check if component already exists
    if (this.components.has(component.id)) {
      throw new Error(`Component with ID ${component.id} already exists`);
    }

    // Validate component definition
    const validation = this.validateComponent(component);
    if (!validation.valid) {
      throw new Error(`Component validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Store component
    this.components.set(component.id, { ...component });
    
    // Persist to storage
    await this.saveToPersistence();
  }

  /**
   * Unregister a component
   */
  async unregister(componentId: string): Promise<void> {
    if (!this.components.has(componentId)) {
      throw new Error(`Component with ID ${componentId} not found`);
    }

    this.components.delete(componentId);
    await this.saveToPersistence();
  }

  /**
   * Get a component by ID
   */
  async get(componentId: string): Promise<ComponentDefinition | null> {
    return this.components.get(componentId) || null;
  }

  /**
   * List all registered components
   */
  async list(): Promise<ComponentDefinition[]> {
    return Array.from(this.components.values());
  }

  /**
   * Update a component
   */
  async update(componentId: string, update: Partial<ComponentDefinition>): Promise<void> {
    const existing = this.components.get(componentId);
    if (!existing) {
      throw new Error(`Component with ID ${componentId} not found`);
    }

    const updated = { ...existing, ...update, id: componentId }; // Ensure ID cannot be changed
    
    // Validate updated component
    const validation = this.validateComponent(updated);
    if (!validation.valid) {
      throw new Error(`Component validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.components.set(componentId, updated);
    await this.saveToPersistence();
  }

  /**
   * Find components by criteria
   */
  async findByType(type: ComponentDefinition['type']): Promise<ComponentDefinition[]> {
    return Array.from(this.components.values()).filter(c => c.type === type);
  }

  /**
   * Find components that depend on a specific component
   */
  async findDependents(componentId: string): Promise<ComponentDefinition[]> {
    return Array.from(this.components.values()).filter(c => 
      c.dependencies.includes(componentId)
    );
  }

  /**
   * Check if a component exists
   */
  async exists(componentId: string): Promise<boolean> {
    return this.components.has(componentId);
  }

  /**
   * Get component count
   */
  async count(): Promise<number> {
    return this.components.size;
  }

  /**
   * Clear all components (for testing)
   */
  async clear(): Promise<void> {
    this.components.clear();
    await this.saveToPersistence();
  }

  /**
   * Validate component definition
   */
  private validateComponent(component: ComponentDefinition): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Required fields
    if (!component.id?.trim()) {
      errors.push({ code: 'MISSING_ID', message: 'Component ID is required' });
    }

    if (!component.name?.trim()) {
      errors.push({ code: 'MISSING_NAME', message: 'Component name is required' });
    }

    if (!component.version?.trim()) {
      errors.push({ code: 'MISSING_VERSION', message: 'Component version is required' });
    }

    // ID format validation
    if (component.id && !/^[a-z0-9-]+$/.test(component.id)) {
      errors.push({ 
        code: 'INVALID_ID_FORMAT', 
        message: 'Component ID must contain only lowercase letters, numbers, and hyphens' 
      });
    }

    // Type validation
    const validTypes = ['service', 'function', 'worker', 'extension'];
    if (!validTypes.includes(component.type)) {
      errors.push({ 
        code: 'INVALID_TYPE', 
        message: `Component type must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Resource validation
    if (!component.resources) {
      errors.push({ code: 'MISSING_RESOURCES', message: 'Resource requirements are required' });
    } else {
      if (!component.resources.cpu) {
        errors.push({ code: 'MISSING_CPU', message: 'CPU resource requirement is required' });
      }
      if (!component.resources.memory) {
        errors.push({ code: 'MISSING_MEMORY', message: 'Memory resource requirement is required' });
      }
    }

    // Health check validation
    if (!component.healthCheck) {
      errors.push({ code: 'MISSING_HEALTH_CHECK', message: 'Health check configuration is required' });
    } else {
      const validHealthCheckTypes = ['http', 'tcp', 'exec', 'grpc'];
      if (!validHealthCheckTypes.includes(component.healthCheck.type)) {
        errors.push({ 
          code: 'INVALID_HEALTH_CHECK_TYPE', 
          message: `Health check type must be one of: ${validHealthCheckTypes.join(', ')}` 
        });
      }

      if (component.healthCheck.initialDelaySeconds < 0) {
        errors.push({ code: 'INVALID_INITIAL_DELAY', message: 'Initial delay must be >= 0' });
      }

      if (component.healthCheck.periodSeconds <= 0) {
        errors.push({ code: 'INVALID_PERIOD', message: 'Period must be > 0' });
      }

      if (component.healthCheck.timeoutSeconds <= 0) {
        errors.push({ code: 'INVALID_TIMEOUT', message: 'Timeout must be > 0' });
      }
    }

    // Scaling validation
    if (!component.scaling) {
      errors.push({ code: 'MISSING_SCALING', message: 'Scaling policy is required' });
    } else {
      if (component.scaling.minReplicas < 0) {
        errors.push({ code: 'INVALID_MIN_REPLICAS', message: 'Minimum replicas must be >= 0' });
      }

      if (component.scaling.maxReplicas < component.scaling.minReplicas) {
        errors.push({ code: 'INVALID_MAX_REPLICAS', message: 'Maximum replicas must be >= minimum replicas' });
      }

      if (component.scaling.targetCPUUtilization && 
          (component.scaling.targetCPUUtilization <= 0 || component.scaling.targetCPUUtilization > 100)) {
        errors.push({ code: 'INVALID_CPU_TARGET', message: 'Target CPU utilization must be between 1 and 100' });
      }
    }

    // Dependencies validation
    if (component.dependencies) {
      // Check for self-dependency
      if (component.dependencies.includes(component.id)) {
        errors.push({ code: 'SELF_DEPENDENCY', message: 'Component cannot depend on itself' });
      }

      // Check for duplicate dependencies
      const uniqueDeps = new Set(component.dependencies);
      if (uniqueDeps.size !== component.dependencies.length) {
        warnings.push({ code: 'DUPLICATE_DEPENDENCIES', message: 'Duplicate dependencies found' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Load components from persistence
   */
  private async loadFromPersistence(): Promise<void> {
    try {
      // In a real implementation, this would load from a file or database
      // For now, we'll use in-memory storage
      console.log(`Loading components from ${this.persistencePath}`);
    } catch (error) {
      console.warn('Failed to load components from persistence:', error);
    }
  }

  /**
   * Save components to persistence
   */
  private async saveToPersistence(): Promise<void> {
    try {
      // In a real implementation, this would save to a file or database
      const data = Array.from(this.components.values());
      console.log(`Saving ${data.length} components to ${this.persistencePath}`);
    } catch (error) {
      console.warn('Failed to save components to persistence:', error);
    }
  }
}