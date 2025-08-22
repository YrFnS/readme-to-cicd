import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyResolverImpl } from '../../../src/integration/components/dependency-resolver';
import { ComponentRegistryImpl } from '../../../src/integration/components/component-registry';
import { ComponentDefinition } from '../../../src/integration/components/types';

describe('DependencyResolverImpl', () => {
  let resolver: DependencyResolverImpl;
  let registry: ComponentRegistryImpl;
  let components: ComponentDefinition[];

  beforeEach(async () => {
    registry = new ComponentRegistryImpl();
    resolver = new DependencyResolverImpl(registry);

    // Create test components with dependencies
    components = [
      {
        id: 'database',
        name: 'Database',
        version: '1.0.0',
        type: 'service',
        dependencies: [],
        resources: { cpu: '100m', memory: '128Mi' },
        healthCheck: {
          type: 'tcp',
          port: 5432,
          initialDelaySeconds: 30,
          periodSeconds: 10,
          timeoutSeconds: 5,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: { minReplicas: 1, maxReplicas: 3 }
      },
      {
        id: 'cache',
        name: 'Cache',
        version: '1.0.0',
        type: 'service',
        dependencies: [],
        resources: { cpu: '50m', memory: '64Mi' },
        healthCheck: {
          type: 'tcp',
          port: 6379,
          initialDelaySeconds: 10,
          periodSeconds: 5,
          timeoutSeconds: 3,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: { minReplicas: 1, maxReplicas: 2 }
      },
      {
        id: 'api-service',
        name: 'API Service',
        version: '1.0.0',
        type: 'service',
        dependencies: ['database', 'cache'],
        resources: { cpu: '200m', memory: '256Mi' },
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
        scaling: { minReplicas: 2, maxReplicas: 10 }
      },
      {
        id: 'web-app',
        name: 'Web Application',
        version: '1.0.0',
        type: 'service',
        dependencies: ['api-service'],
        resources: { cpu: '100m', memory: '128Mi' },
        healthCheck: {
          type: 'http',
          endpoint: '/health',
          port: 3000,
          initialDelaySeconds: 20,
          periodSeconds: 10,
          timeoutSeconds: 5,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: { minReplicas: 1, maxReplicas: 5 }
      }
    ];

    // Register all components
    for (const component of components) {
      await registry.register(component);
    }
  });

  describe('Dependency Resolution', () => {
    it('should resolve direct dependencies', async () => {
      const dependencies = await resolver.resolve('api-service');
      
      expect(dependencies).toContain('database');
      expect(dependencies).toContain('cache');
      expect(dependencies).toHaveLength(2);
    });

    it('should resolve transitive dependencies', async () => {
      const dependencies = await resolver.resolve('web-app');
      
      expect(dependencies).toContain('api-service');
      expect(dependencies).toContain('database');
      expect(dependencies).toContain('cache');
      expect(dependencies).toHaveLength(3);
    });

    it('should return empty array for component with no dependencies', async () => {
      const dependencies = await resolver.resolve('database');
      
      expect(dependencies).toHaveLength(0);
    });

    it('should handle non-existent component', async () => {
      await expect(resolver.resolve('non-existent'))
        .rejects.toThrow('Component not found: non-existent');
    });

    it('should not include duplicate dependencies', async () => {
      // Create a component with duplicate transitive dependencies
      const complexComponent: ComponentDefinition = {
        id: 'complex-service',
        name: 'Complex Service',
        version: '1.0.0',
        type: 'service',
        dependencies: ['api-service', 'database'], // database is also a dependency of api-service
        resources: { cpu: '100m', memory: '128Mi' },
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
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await registry.register(complexComponent);
      
      const dependencies = await resolver.resolve('complex-service');
      
      // Should contain each dependency only once
      const uniqueDeps = [...new Set(dependencies)];
      expect(dependencies).toHaveLength(uniqueDeps.length);
    });
  });

  describe('Dependency Validation', () => {
    it('should validate existing dependencies', async () => {
      const result = await resolver.validate(['database', 'cache']);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing dependencies', async () => {
      const result = await resolver.validate(['database', 'non-existent']);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DEPENDENCY');
      expect(result.errors[0].message).toContain('non-existent');
    });

    it('should detect circular dependencies', async () => {
      // Create circular dependency: A -> B -> A
      const componentA: ComponentDefinition = {
        id: 'component-a',
        name: 'Component A',
        version: '1.0.0',
        type: 'service',
        dependencies: ['component-b'],
        resources: { cpu: '100m', memory: '128Mi' },
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
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      const componentB: ComponentDefinition = {
        id: 'component-b',
        name: 'Component B',
        version: '1.0.0',
        type: 'service',
        dependencies: ['component-a'], // Circular dependency
        resources: { cpu: '100m', memory: '128Mi' },
        healthCheck: {
          type: 'http',
          endpoint: '/health',
          port: 8081,
          initialDelaySeconds: 30,
          periodSeconds: 10,
          timeoutSeconds: 5,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await registry.register(componentA);
      await registry.register(componentB);

      const result = await resolver.validate(['component-a', 'component-b']);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should handle empty dependency list', async () => {
      const result = await resolver.validate([]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Installation Order', () => {
    it('should return correct installation order', async () => {
      const order = await resolver.getInstallOrder(components);
      
      // Dependencies should come before dependents
      const databaseIndex = order.indexOf('database');
      const cacheIndex = order.indexOf('cache');
      const apiServiceIndex = order.indexOf('api-service');
      const webAppIndex = order.indexOf('web-app');

      expect(databaseIndex).toBeLessThan(apiServiceIndex);
      expect(cacheIndex).toBeLessThan(apiServiceIndex);
      expect(apiServiceIndex).toBeLessThan(webAppIndex);
    });

    it('should handle components with no dependencies', async () => {
      const independentComponents = components.filter(c => c.dependencies.length === 0);
      
      const order = await resolver.getInstallOrder(independentComponents);
      
      expect(order).toHaveLength(independentComponents.length);
      expect(order).toContain('database');
      expect(order).toContain('cache');
    });

    it('should handle single component', async () => {
      const order = await resolver.getInstallOrder([components[0]]);
      
      expect(order).toHaveLength(1);
      expect(order[0]).toBe('database');
    });

    it('should detect circular dependencies in installation order', async () => {
      // Create components with circular dependency
      const circularComponents: ComponentDefinition[] = [
        {
          id: 'comp-x',
          name: 'Component X',
          version: '1.0.0',
          type: 'service',
          dependencies: ['comp-y'],
          resources: { cpu: '100m', memory: '128Mi' },
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
          scaling: { minReplicas: 1, maxReplicas: 3 }
        },
        {
          id: 'comp-y',
          name: 'Component Y',
          version: '1.0.0',
          type: 'service',
          dependencies: ['comp-x'],
          resources: { cpu: '100m', memory: '128Mi' },
          healthCheck: {
            type: 'http',
            endpoint: '/health',
            port: 8081,
            initialDelaySeconds: 30,
            periodSeconds: 10,
            timeoutSeconds: 5,
            failureThreshold: 3,
            successThreshold: 1
          },
          scaling: { minReplicas: 1, maxReplicas: 3 }
        }
      ];

      await expect(resolver.getInstallOrder(circularComponents))
        .rejects.toThrow('Circular dependency detected in component graph');
    });
  });

  describe('Dependency Tree', () => {
    it('should build dependency tree', async () => {
      const tree = await resolver.getDependencyTree('web-app');
      
      expect(tree.id).toBe('web-app');
      expect(tree.name).toBe('Web Application');
      expect(tree.version).toBe('1.0.0');
      expect(tree.dependencies).toHaveLength(1);
      
      const apiServiceDep = tree.dependencies[0];
      expect(apiServiceDep.id).toBe('api-service');
      expect(apiServiceDep.dependencies).toHaveLength(2);
    });

    it('should handle component with no dependencies', async () => {
      const tree = await resolver.getDependencyTree('database');
      
      expect(tree.id).toBe('database');
      expect(tree.dependencies).toHaveLength(0);
    });
  });

  describe('Affected Components', () => {
    it('should find components affected by update', async () => {
      const affected = await resolver.findAffectedComponents('database');
      
      expect(affected).toContain('api-service');
      expect(affected).toContain('web-app');
      expect(affected).toHaveLength(2);
    });

    it('should return empty array for leaf components', async () => {
      const affected = await resolver.findAffectedComponents('web-app');
      
      expect(affected).toHaveLength(0);
    });

    it('should handle non-existent component', async () => {
      const affected = await resolver.findAffectedComponents('non-existent');
      
      expect(affected).toHaveLength(0);
    });
  });

  describe('Update Order Validation', () => {
    it('should validate correct update order', async () => {
      const updateOrder = ['database', 'cache', 'api-service', 'web-app'];
      
      const result = await resolver.validateUpdateOrder(updateOrder);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect dependency order violations', async () => {
      const invalidOrder = ['web-app', 'api-service', 'database', 'cache'];
      
      const result = await resolver.validateUpdateOrder(invalidOrder);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DEPENDENCY_ORDER_VIOLATION')).toBe(true);
    });

    it('should handle non-existent components in update order', async () => {
      const orderWithMissing = ['database', 'non-existent', 'api-service'];
      
      const result = await resolver.validateUpdateOrder(orderWithMissing);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'COMPONENT_NOT_FOUND')).toBe(true);
    });

    it('should suggest optimal order for invalid order', async () => {
      const invalidOrder = ['web-app', 'api-service', 'database'];
      
      const result = await resolver.validateUpdateOrder(invalidOrder);
      
      expect(result.valid).toBe(false);
      expect(result.warnings.some(w => w.code === 'SUGGESTED_ORDER')).toBe(true);
    });

    it('should handle empty update order', async () => {
      const result = await resolver.validateUpdateOrder([]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Version Compatibility', () => {
    it('should detect version conflicts', async () => {
      // Create components with same name but different versions
      const component1: ComponentDefinition = {
        id: 'service-v1',
        name: 'shared-service', // Same name
        version: '1.0.0',
        type: 'service',
        dependencies: [],
        resources: { cpu: '100m', memory: '128Mi' },
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
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      const component2: ComponentDefinition = {
        id: 'service-v2',
        name: 'shared-service', // Same name
        version: '2.0.0', // Different version
        type: 'service',
        dependencies: [],
        resources: { cpu: '100m', memory: '128Mi' },
        healthCheck: {
          type: 'http',
          endpoint: '/health',
          port: 8081,
          initialDelaySeconds: 30,
          periodSeconds: 10,
          timeoutSeconds: 5,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await registry.register(component1);
      await registry.register(component2);

      const result = await resolver.validate(['service-v1', 'service-v2']);
      
      // Should have warnings about version conflicts
      expect(result.warnings.some(w => w.code === 'VERSION_CONFLICT')).toBe(true);
    });
  });
});