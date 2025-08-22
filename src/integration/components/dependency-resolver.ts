import { ComponentDefinition, ComponentRegistry, DependencyResolver, ValidationResult } from './types';

/**
 * Dependency resolver for component installation and update ordering
 */
export class DependencyResolverImpl implements DependencyResolver {
  constructor(private readonly registry: ComponentRegistry) {}

  /**
   * Resolve all dependencies for a component
   */
  async resolve(componentId: string): Promise<string[]> {
    const visited = new Set<string>();
    const dependencies: string[] = [];

    await this.resolveDependenciesRecursive(componentId, visited, dependencies);
    
    return dependencies;
  }

  /**
   * Validate that all dependencies exist and are valid
   */
  async validate(dependencies: string[]): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for circular dependencies
    const circularDeps = await this.detectCircularDependencies(dependencies);
    if (circularDeps.length > 0) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `Circular dependency detected: ${circularDeps.join(' -> ')}`
      });
    }

    // Check that all dependencies exist
    for (const depId of dependencies) {
      const exists = await this.registry.exists(depId);
      if (!exists) {
        errors.push({
          code: 'MISSING_DEPENDENCY',
          message: `Dependency not found: ${depId}`,
          field: 'dependencies',
          value: depId
        });
      }
    }

    // Check for version compatibility (simplified)
    const versionConflicts = await this.checkVersionCompatibility(dependencies);
    for (const conflict of versionConflicts) {
      warnings.push({
        code: 'VERSION_CONFLICT',
        message: `Potential version conflict: ${conflict.component} requires ${conflict.required} but ${conflict.available} is available`,
        field: 'version'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get installation order for components based on dependencies
   */
  async getInstallOrder(components: ComponentDefinition[]): Promise<string[]> {
    const graph = await this.buildDependencyGraph(components);
    return this.topologicalSort(graph);
  }

  /**
   * Recursively resolve dependencies
   */
  private async resolveDependenciesRecursive(
    componentId: string, 
    visited: Set<string>, 
    dependencies: string[]
  ): Promise<void> {
    if (visited.has(componentId)) {
      return; // Already processed or circular dependency
    }

    visited.add(componentId);

    const component = await this.registry.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    // Process each dependency
    for (const depId of component.dependencies) {
      if (!dependencies.includes(depId)) {
        dependencies.push(depId);
      }
      
      // Recursively resolve dependencies of dependencies
      await this.resolveDependenciesRecursive(depId, visited, dependencies);
    }
  }

  /**
   * Detect circular dependencies using DFS
   */
  private async detectCircularDependencies(dependencies: string[]): Promise<string[]> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    for (const depId of dependencies) {
      const cycle = await this.detectCycleFromNode(depId, visited, recursionStack, path);
      if (cycle.length > 0) {
        return cycle;
      }
    }

    return [];
  }

  /**
   * Detect cycle starting from a specific node
   */
  private async detectCycleFromNode(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): Promise<string[]> {
    if (recursionStack.has(nodeId)) {
      // Found cycle - return the cycle path
      const cycleStart = path.indexOf(nodeId);
      return path.slice(cycleStart).concat([nodeId]);
    }

    if (visited.has(nodeId)) {
      return [];
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const component = await this.registry.get(nodeId);
    if (component) {
      for (const depId of component.dependencies) {
        const cycle = await this.detectCycleFromNode(depId, visited, recursionStack, path);
        if (cycle.length > 0) {
          return cycle;
        }
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return [];
  }

  /**
   * Check for version compatibility issues
   */
  private async checkVersionCompatibility(dependencies: string[]): Promise<any[]> {
    const conflicts: any[] = [];

    // This is a simplified version compatibility check
    // In a real implementation, this would use semantic versioning
    const versionMap = new Map<string, string>();

    for (const depId of dependencies) {
      const component = await this.registry.get(depId);
      if (component) {
        const existingVersion = versionMap.get(component.name);
        if (existingVersion && existingVersion !== component.version) {
          conflicts.push({
            component: component.name,
            required: component.version,
            available: existingVersion
          });
        } else {
          versionMap.set(component.name, component.version);
        }
      }
    }

    return conflicts;
  }

  /**
   * Build dependency graph for topological sorting
   */
  private async buildDependencyGraph(components: ComponentDefinition[]): Promise<Map<string, string[]>> {
    const graph = new Map<string, string[]>();

    // Initialize graph with all components
    for (const component of components) {
      graph.set(component.id, []);
    }

    // Add edges (dependencies)
    for (const component of components) {
      for (const depId of component.dependencies) {
        const deps = graph.get(depId) || [];
        deps.push(component.id);
        graph.set(depId, deps);
      }
    }

    return graph;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];

    // Calculate in-degrees
    for (const [node, _] of graph) {
      inDegree.set(node, 0);
    }

    for (const [_, neighbors] of graph) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }

    // Find nodes with no incoming edges
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles
    if (result.length !== graph.size) {
      throw new Error('Circular dependency detected in component graph');
    }

    return result;
  }

  /**
   * Get dependency tree for a component
   */
  async getDependencyTree(componentId: string): Promise<any> {
    const component = await this.registry.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    const tree = {
      id: componentId,
      name: component.name,
      version: component.version,
      dependencies: []
    };

    for (const depId of component.dependencies) {
      const depTree = await this.getDependencyTree(depId);
      (tree.dependencies as any[]).push(depTree);
    }

    return tree;
  }

  /**
   * Find components that would be affected by updating a component
   */
  async findAffectedComponents(componentId: string): Promise<string[]> {
    const affected: string[] = [];
    const allComponents = await this.registry.list();

    for (const component of allComponents) {
      const dependencies = await this.resolve(component.id);
      if (dependencies.includes(componentId)) {
        affected.push(component.id);
      }
    }

    return affected;
  }

  /**
   * Validate update order to ensure dependencies are updated first
   */
  async validateUpdateOrder(componentIds: string[]): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      const components = await Promise.all(
        componentIds.map(id => this.registry.get(id))
      );

      const validComponents = components.filter(c => c !== null) as ComponentDefinition[];
      const sortedOrder = await this.getInstallOrder(validComponents);

      // Check if the provided order respects dependencies
      for (let i = 0; i < componentIds.length; i++) {
        const componentId = componentIds[i];
        const component = validComponents.find(c => c.id === componentId);
        
        if (!component) {
          errors.push({
            code: 'COMPONENT_NOT_FOUND',
            message: `Component not found: ${componentId}`
          });
          continue;
        }

        // Check if any dependencies come after this component in the update order
        for (const depId of component.dependencies) {
          const depIndex = componentIds.indexOf(depId);
          if (depIndex > i) {
            errors.push({
              code: 'DEPENDENCY_ORDER_VIOLATION',
              message: `Component ${componentId} depends on ${depId} but ${depId} is scheduled for update after ${componentId}`
            });
          }
        }
      }

      // Suggest optimal order if current order has issues
      if (errors.length > 0) {
        warnings.push({
          code: 'SUGGESTED_ORDER',
          message: `Suggested update order: ${sortedOrder.join(' -> ')}`
        });
      }

    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown validation error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}