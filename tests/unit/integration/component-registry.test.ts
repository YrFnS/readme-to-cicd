import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentRegistryImpl } from '../../../src/integration/components/component-registry';
import { ComponentDefinition } from '../../../src/integration/components/types';

describe('ComponentRegistryImpl', () => {
  let registry: ComponentRegistryImpl;
  let mockComponent: ComponentDefinition;

  beforeEach(() => {
    registry = new ComponentRegistryImpl();
    
    mockComponent = {
      id: 'test-service',
      name: 'Test Service',
      version: '1.0.0',
      type: 'service',
      dependencies: [],
      resources: {
        cpu: '100m',
        memory: '128Mi'
      },
      healthCheck: {
        type: 'http',
        endpoint: '/health',
        port: 8080,
        initialDelaySeconds: 30,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 3,
        successThreshold: 1
      },
      scaling: {
        minReplicas: 1,
        maxReplicas: 5,
        targetCPUUtilization: 70
      }
    };
  });

  describe('Component Registration', () => {
    it('should register a component successfully', async () => {
      await expect(registry.register(mockComponent)).resolves.not.toThrow();
      
      const retrieved = await registry.get('test-service');
      expect(retrieved).toEqual(mockComponent);
    });

    it('should prevent duplicate component registration', async () => {
      await registry.register(mockComponent);
      
      await expect(registry.register(mockComponent))
        .rejects.toThrow('Component with ID test-service already exists');
    });

    it('should validate component definition', async () => {
      const invalidComponent = { ...mockComponent, id: '' };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Component validation failed');
    });

    it('should validate component ID format', async () => {
      const invalidComponent = { ...mockComponent, id: 'Invalid_ID!' };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Component ID must contain only lowercase letters, numbers, and hyphens');
    });

    it('should validate component type', async () => {
      const invalidComponent = { ...mockComponent, type: 'invalid' as any };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Component type must be one of: service, function, worker, extension');
    });

    it('should validate resource requirements', async () => {
      const invalidComponent = { ...mockComponent, resources: { cpu: '', memory: '' } };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('CPU resource requirement is required');
    });

    it('should validate health check configuration', async () => {
      const invalidComponent = {
        ...mockComponent,
        healthCheck: {
          ...mockComponent.healthCheck,
          type: 'invalid' as any
        }
      };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Health check type must be one of: http, tcp, exec, grpc');
    });

    it('should validate scaling configuration', async () => {
      const invalidComponent = {
        ...mockComponent,
        scaling: {
          minReplicas: -1,
          maxReplicas: 5
        }
      };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Minimum replicas must be >= 0');
    });

    it('should detect self-dependency', async () => {
      const invalidComponent = {
        ...mockComponent,
        dependencies: ['test-service'] // Self-dependency
      };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Component cannot depend on itself');
    });
  });

  describe('Component Retrieval', () => {
    beforeEach(async () => {
      await registry.register(mockComponent);
    });

    it('should retrieve existing component', async () => {
      const retrieved = await registry.get('test-service');
      
      expect(retrieved).toEqual(mockComponent);
    });

    it('should return null for non-existent component', async () => {
      const retrieved = await registry.get('non-existent');
      
      expect(retrieved).toBeNull();
    });

    it('should list all components', async () => {
      const components = await registry.list();
      
      expect(components).toHaveLength(1);
      expect(components[0]).toEqual(mockComponent);
    });

    it('should check component existence', async () => {
      const exists = await registry.exists('test-service');
      const notExists = await registry.exists('non-existent');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should count components', async () => {
      const count = await registry.count();
      
      expect(count).toBe(1);
    });

    it('should find components by type', async () => {
      const services = await registry.findByType('service');
      const functions = await registry.findByType('function');
      
      expect(services).toHaveLength(1);
      expect(services[0]).toEqual(mockComponent);
      expect(functions).toHaveLength(0);
    });
  });

  describe('Component Updates', () => {
    beforeEach(async () => {
      await registry.register(mockComponent);
    });

    it('should update component successfully', async () => {
      const update = { version: '1.1.0', name: 'Updated Test Service' };
      
      await expect(registry.update('test-service', update)).resolves.not.toThrow();
      
      const updated = await registry.get('test-service');
      expect(updated?.version).toBe('1.1.0');
      expect(updated?.name).toBe('Updated Test Service');
      expect(updated?.id).toBe('test-service'); // ID should not change
    });

    it('should validate updated component', async () => {
      const invalidUpdate = { resources: { cpu: '', memory: '' } };
      
      await expect(registry.update('test-service', invalidUpdate))
        .rejects.toThrow('Component validation failed');
    });

    it('should fail update for non-existent component', async () => {
      await expect(registry.update('non-existent', { version: '2.0.0' }))
        .rejects.toThrow('Component with ID non-existent not found');
    });

    it('should preserve ID during update', async () => {
      const update = { id: 'different-id', version: '1.1.0' };
      
      await registry.update('test-service', update);
      
      const updated = await registry.get('test-service');
      expect(updated?.id).toBe('test-service'); // Should remain unchanged
    });
  });

  describe('Component Unregistration', () => {
    beforeEach(async () => {
      await registry.register(mockComponent);
    });

    it('should unregister component successfully', async () => {
      await expect(registry.unregister('test-service')).resolves.not.toThrow();
      
      const retrieved = await registry.get('test-service');
      expect(retrieved).toBeNull();
    });

    it('should fail unregistration for non-existent component', async () => {
      await expect(registry.unregister('non-existent'))
        .rejects.toThrow('Component with ID non-existent not found');
    });

    it('should update count after unregistration', async () => {
      await registry.unregister('test-service');
      
      const count = await registry.count();
      expect(count).toBe(0);
    });
  });

  describe('Dependency Management', () => {
    it('should find dependent components', async () => {
      // Register a dependency
      const dependency = { ...mockComponent, id: 'dependency-service' };
      await registry.register(dependency);
      
      // Register a component that depends on it
      const dependent = {
        ...mockComponent,
        id: 'dependent-service',
        dependencies: ['dependency-service']
      };
      await registry.register(dependent);
      
      const dependents = await registry.findDependents('dependency-service');
      
      expect(dependents).toHaveLength(1);
      expect(dependents[0].id).toBe('dependent-service');
    });

    it('should return empty array when no dependents exist', async () => {
      await registry.register(mockComponent);
      
      const dependents = await registry.findDependents('test-service');
      
      expect(dependents).toHaveLength(0);
    });
  });

  describe('Registry Management', () => {
    beforeEach(async () => {
      await registry.register(mockComponent);
    });

    it('should clear all components', async () => {
      await registry.clear();
      
      const count = await registry.count();
      const components = await registry.list();
      
      expect(count).toBe(0);
      expect(components).toHaveLength(0);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle missing required fields', async () => {
      const invalidComponent = {
        id: 'test',
        name: '',
        version: '',
        type: 'service' as const,
        dependencies: [],
        resources: undefined as any,
        healthCheck: undefined as any,
        scaling: undefined as any
      };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Component validation failed');
    });

    it('should validate health check timing parameters', async () => {
      const invalidComponent = {
        ...mockComponent,
        healthCheck: {
          ...mockComponent.healthCheck,
          initialDelaySeconds: -1,
          periodSeconds: 0,
          timeoutSeconds: -1
        }
      };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Component validation failed');
    });

    it('should validate scaling replica bounds', async () => {
      const invalidComponent = {
        ...mockComponent,
        scaling: {
          minReplicas: 5,
          maxReplicas: 3 // Max < Min
        }
      };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Maximum replicas must be >= minimum replicas');
    });

    it('should validate CPU utilization target', async () => {
      const invalidComponent = {
        ...mockComponent,
        scaling: {
          ...mockComponent.scaling,
          targetCPUUtilization: 150 // > 100%
        }
      };
      
      await expect(registry.register(invalidComponent))
        .rejects.toThrow('Target CPU utilization must be between 1 and 100');
    });

    it('should warn about duplicate dependencies', async () => {
      const componentWithDuplicateDeps = {
        ...mockComponent,
        dependencies: ['dep1', 'dep1', 'dep2']
      };
      
      // Should not throw but should generate warnings
      // In a real implementation, you might want to access the validation result
      // For now, we just ensure it doesn't throw
      await expect(registry.register(componentWithDuplicateDeps))
        .resolves.not.toThrow();
    });
  });
});