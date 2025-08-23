/**
 * Multi-cloud serverless orchestrator for managing functions across multiple providers
 */

import {
  ServerlessManager,
  ServerlessFunctionConfig,
  ServerlessFunctionUpdateConfig,
  ServerlessDeploymentResult,
  ServerlessInvocationResult,
  ServerlessFunctionStatus,
  ServerlessLogOptions,
  ServerlessFunctionMetrics,
  ServerlessFunctionFilters,
  ServerlessFunctionInfo,
  ServerlessAliasConfig,
  ServerlessAliasUpdateConfig,
  ServerlessAliasResult,
  TimeRange,
  MultiCloudServerlessConfig,
  ServerlessProviderConfig,
  ServerlessFailoverConfig,
  ServerlessLoadBalancingConfig,
  ServerlessHealthCheckConfig
} from '../types/serverless-types';
import { ServerlessManagerFactory, ServerlessManagerConfig } from './serverless-manager-factory';

export class MultiCloudServerlessOrchestrator implements ServerlessManager {
  private readonly managers: Map<string, ServerlessManager> = new Map();
  private readonly config: MultiCloudServerlessConfig;
  private readonly healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: MultiCloudServerlessConfig) {
    this.config = config;
    this.initializeManagers();
    
    if (config.failover?.enabled) {
      this.startHealthChecking();
    }
  }

  async deployFunction(config: ServerlessFunctionConfig): Promise<ServerlessDeploymentResult> {
    const primaryManager = this.getPrimaryManager();
    
    try {
      // Deploy to primary provider
      const primaryResult = await primaryManager.deployFunction(config);
      
      // Deploy to secondary providers if configured
      if (this.config.secondary && this.config.secondary.length > 0) {
        const secondaryResults = await Promise.allSettled(
          this.config.secondary.map(async (secondaryConfig) => {
            const manager = this.managers.get(secondaryConfig.provider);
            if (manager) {
              return manager.deployFunction(config);
            }
            throw new Error(`Manager not found for provider: ${secondaryConfig.provider}`);
          })
        );

        // Log secondary deployment results
        secondaryResults.forEach((result, index) => {
          const provider = this.config.secondary![index].provider;
          if (result.status === 'rejected') {
            console.warn(`Secondary deployment to ${provider} failed:`, result.reason);
          } else {
            console.log(`Secondary deployment to ${provider} succeeded`);
          }
        });
      }

      return primaryResult;
    } catch (error) {
      // Attempt failover if configured
      if (this.config.failover?.enabled && this.config.secondary && this.config.secondary.length > 0) {
        console.warn('Primary deployment failed, attempting failover');
        return this.deployWithFailover(config);
      }
      
      throw error;
    }
  }

  async updateFunction(functionId: string, config: ServerlessFunctionUpdateConfig): Promise<ServerlessDeploymentResult> {
    const primaryManager = this.getPrimaryManager();
    
    try {
      const result = await primaryManager.updateFunction(functionId, config);
      
      // Update secondary deployments
      if (this.config.secondary && this.config.secondary.length > 0) {
        await Promise.allSettled(
          this.config.secondary.map(async (secondaryConfig) => {
            const manager = this.managers.get(secondaryConfig.provider);
            if (manager) {
              return manager.updateFunction(functionId, config);
            }
          })
        );
      }
      
      return result;
    } catch (error) {
      if (this.config.failover?.enabled) {
        return this.updateWithFailover(functionId, config);
      }
      throw error;
    }
  }

  async deleteFunction(functionId: string): Promise<void> {
    const deletePromises: Promise<void>[] = [];
    
    // Delete from all providers
    for (const manager of this.managers.values()) {
      deletePromises.push(
        manager.deleteFunction(functionId).catch(error => {
          console.warn(`Failed to delete function ${functionId} from provider:`, error);
        })
      );
    }
    
    await Promise.allSettled(deletePromises);
  }

  async invokeFunction(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    if (this.config.loadBalancing) {
      return this.invokeWithLoadBalancing(functionId, payload);
    }
    
    const primaryManager = this.getPrimaryManager();
    
    try {
      return await primaryManager.invokeFunction(functionId, payload);
    } catch (error) {
      if (this.config.failover?.enabled) {
        return this.invokeWithFailover(functionId, payload);
      }
      throw error;
    }
  }

  async getFunctionStatus(functionId: string): Promise<ServerlessFunctionStatus> {
    const primaryManager = this.getPrimaryManager();
    return primaryManager.getFunctionStatus(functionId);
  }

  async getFunctionLogs(functionId: string, options?: ServerlessLogOptions): Promise<string[]> {
    const allLogs: string[] = [];
    
    // Collect logs from all providers
    const logPromises = Array.from(this.managers.values()).map(async (manager) => {
      try {
        return await manager.getFunctionLogs(functionId, options);
      } catch (error) {
        console.warn('Failed to get logs from provider:', error);
        return [];
      }
    });
    
    const results = await Promise.allSettled(logPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allLogs.push(...result.value);
      }
    });
    
    // Sort logs by timestamp if possible
    return allLogs.sort((a, b) => {
      const timestampA = this.extractTimestamp(a);
      const timestampB = this.extractTimestamp(b);
      return timestampA.getTime() - timestampB.getTime();
    });
  }

  async getFunctionMetrics(functionId: string, timeRange?: TimeRange): Promise<ServerlessFunctionMetrics> {
    const primaryManager = this.getPrimaryManager();
    
    try {
      return await primaryManager.getFunctionMetrics(functionId, timeRange);
    } catch (error) {
      // Try secondary providers
      for (const secondaryConfig of this.config.secondary || []) {
        const manager = this.managers.get(secondaryConfig.provider);
        if (manager) {
          try {
            return await manager.getFunctionMetrics(functionId, timeRange);
          } catch (secondaryError) {
            console.warn(`Failed to get metrics from ${secondaryConfig.provider}:`, secondaryError);
          }
        }
      }
      throw error;
    }
  }

  async listFunctions(filters?: ServerlessFunctionFilters): Promise<ServerlessFunctionInfo[]> {
    const allFunctions: ServerlessFunctionInfo[] = [];
    
    // List functions from all providers
    const listPromises = Array.from(this.managers.entries()).map(async ([provider, manager]) => {
      try {
        const functions = await manager.listFunctions(filters);
        return functions.map(func => ({
          ...func,
          functionName: `${provider}:${func.functionName}` // Prefix with provider
        }));
      } catch (error) {
        console.warn(`Failed to list functions from ${provider}:`, error);
        return [];
      }
    });
    
    const results = await Promise.allSettled(listPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allFunctions.push(...result.value);
      }
    });
    
    return allFunctions;
  }

  async createAlias(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult> {
    const primaryManager = this.getPrimaryManager();
    return primaryManager.createAlias(functionId, alias);
  }

  async updateAlias(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult> {
    const primaryManager = this.getPrimaryManager();
    return primaryManager.updateAlias(functionId, aliasName, config);
  }

  async deleteAlias(functionId: string, aliasName: string): Promise<void> {
    const primaryManager = this.getPrimaryManager();
    return primaryManager.deleteAlias(functionId, aliasName);
  }

  // Multi-cloud specific methods
  async getMultiCloudStatus(): Promise<Record<string, 'healthy' | 'unhealthy' | 'unknown'>> {
    const status: Record<string, 'healthy' | 'unhealthy' | 'unknown'> = {};
    
    const healthCheckPromises = Array.from(this.managers.entries()).map(async ([provider, manager]) => {
      try {
        // Perform a simple health check by listing functions
        await manager.listFunctions({ maxItems: 1 });
        status[provider] = 'healthy';
      } catch (error) {
        status[provider] = 'unhealthy';
      }
    });
    
    await Promise.allSettled(healthCheckPromises);
    
    return status;
  }

  async switchPrimary(newPrimaryProvider: string): Promise<void> {
    const newPrimary = this.config.secondary?.find(s => s.provider === newPrimaryProvider);
    if (!newPrimary) {
      throw new Error(`Provider ${newPrimaryProvider} not found in secondary providers`);
    }
    
    // Move current primary to secondary
    const currentPrimary = this.config.primary;
    this.config.secondary = this.config.secondary?.filter(s => s.provider !== newPrimaryProvider) || [];
    this.config.secondary.push(currentPrimary);
    
    // Set new primary
    this.config.primary = newPrimary;
    
    console.log(`Switched primary provider to ${newPrimaryProvider}`);
  }

  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  // Private methods
  private initializeManagers(): void {
    // Initialize primary manager
    const primaryManagerConfig: ServerlessManagerConfig = {
      provider: this.config.primary.provider,
      region: 'global', // Will be overridden by provider-specific config
      credentials: this.config.primary.config.credentials,
      config: this.config.primary.config
    };
    
    const primaryManager = ServerlessManagerFactory.create(primaryManagerConfig);
    this.managers.set(this.config.primary.provider, primaryManager);
    
    // Initialize secondary managers
    if (this.config.secondary) {
      for (const secondaryConfig of this.config.secondary) {
        const managerConfig: ServerlessManagerConfig = {
          provider: secondaryConfig.provider,
          region: 'global',
          credentials: secondaryConfig.config.credentials,
          config: secondaryConfig.config
        };
        
        const manager = ServerlessManagerFactory.create(managerConfig);
        this.managers.set(secondaryConfig.provider, manager);
      }
    }
  }

  private getPrimaryManager(): ServerlessManager {
    const manager = this.managers.get(this.config.primary.provider);
    if (!manager) {
      throw new Error(`Primary manager not found for provider: ${this.config.primary.provider}`);
    }
    return manager;
  }

  private async deployWithFailover(config: ServerlessFunctionConfig): Promise<ServerlessDeploymentResult> {
    if (!this.config.secondary || this.config.secondary.length === 0) {
      throw new Error('No secondary providers configured for failover');
    }
    
    for (const secondaryConfig of this.config.secondary) {
      const manager = this.managers.get(secondaryConfig.provider);
      if (manager) {
        try {
          const result = await manager.deployFunction(config);
          console.log(`Failover deployment successful on ${secondaryConfig.provider}`);
          return result;
        } catch (error) {
          console.warn(`Failover deployment failed on ${secondaryConfig.provider}:`, error);
        }
      }
    }
    
    throw new Error('All failover deployments failed');
  }

  private async updateWithFailover(functionId: string, config: ServerlessFunctionUpdateConfig): Promise<ServerlessDeploymentResult> {
    if (!this.config.secondary || this.config.secondary.length === 0) {
      throw new Error('No secondary providers configured for failover');
    }
    
    for (const secondaryConfig of this.config.secondary) {
      const manager = this.managers.get(secondaryConfig.provider);
      if (manager) {
        try {
          const result = await manager.updateFunction(functionId, config);
          console.log(`Failover update successful on ${secondaryConfig.provider}`);
          return result;
        } catch (error) {
          console.warn(`Failover update failed on ${secondaryConfig.provider}:`, error);
        }
      }
    }
    
    throw new Error('All failover updates failed');
  }

  private async invokeWithFailover(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    if (!this.config.secondary || this.config.secondary.length === 0) {
      throw new Error('No secondary providers configured for failover');
    }
    
    for (const secondaryConfig of this.config.secondary) {
      const manager = this.managers.get(secondaryConfig.provider);
      if (manager) {
        try {
          const result = await manager.invokeFunction(functionId, payload);
          console.log(`Failover invocation successful on ${secondaryConfig.provider}`);
          return result;
        } catch (error) {
          console.warn(`Failover invocation failed on ${secondaryConfig.provider}:`, error);
        }
      }
    }
    
    throw new Error('All failover invocations failed');
  }

  private async invokeWithLoadBalancing(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    const loadBalancing = this.config.loadBalancing!;
    
    switch (loadBalancing.strategy) {
      case 'round-robin':
        return this.invokeRoundRobin(functionId, payload);
      case 'weighted':
        return this.invokeWeighted(functionId, payload);
      case 'least-connections':
        return this.invokeLeastConnections(functionId, payload);
      case 'geographic':
        return this.invokeGeographic(functionId, payload);
      default:
        return this.getPrimaryManager().invokeFunction(functionId, payload);
    }
  }

  private async invokeRoundRobin(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    // Simple round-robin implementation
    const managers = Array.from(this.managers.values());
    const index = Math.floor(Math.random() * managers.length);
    return managers[index].invokeFunction(functionId, payload);
  }

  private async invokeWeighted(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    // Weighted selection based on provider weights
    const totalWeight = this.config.primary.weight || 1 + 
      (this.config.secondary?.reduce((sum, s) => sum + (s.weight || 1), 0) || 0);
    
    let random = Math.random() * totalWeight;
    
    // Check primary
    const primaryWeight = this.config.primary.weight || 1;
    if (random <= primaryWeight) {
      return this.getPrimaryManager().invokeFunction(functionId, payload);
    }
    random -= primaryWeight;
    
    // Check secondary providers
    if (this.config.secondary) {
      for (const secondaryConfig of this.config.secondary) {
        const weight = secondaryConfig.weight || 1;
        if (random <= weight) {
          const manager = this.managers.get(secondaryConfig.provider);
          if (manager) {
            return manager.invokeFunction(functionId, payload);
          }
        }
        random -= weight;
      }
    }
    
    // Fallback to primary
    return this.getPrimaryManager().invokeFunction(functionId, payload);
  }

  private async invokeLeastConnections(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    // For simplicity, use round-robin (in real implementation, track active connections)
    return this.invokeRoundRobin(functionId, payload);
  }

  private async invokeGeographic(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    // For simplicity, use primary (in real implementation, determine closest region)
    return this.getPrimaryManager().invokeFunction(functionId, payload);
  }

  private startHealthChecking(): void {
    const interval = this.config.failover?.healthCheck.interval || 30000; // 30 seconds default
    
    setInterval(async () => {
      const status = await this.getMultiCloudStatus();
      
      // Check if primary is unhealthy
      if (status[this.config.primary.provider] === 'unhealthy') {
        console.warn(`Primary provider ${this.config.primary.provider} is unhealthy`);
        
        // Find a healthy secondary provider
        const healthySecondary = this.config.secondary?.find(s => status[s.provider] === 'healthy');
        if (healthySecondary) {
          console.log(`Switching to healthy secondary provider: ${healthySecondary.provider}`);
          await this.switchPrimary(healthySecondary.provider);
        }
      }
    }, interval);
  }

  private extractTimestamp(logEntry: string): Date {
    // Try to extract timestamp from log entry
    const timestampRegex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/;
    const match = logEntry.match(timestampRegex);
    
    if (match) {
      return new Date(match[1]);
    }
    
    return new Date(); // Fallback to current time
  }
}