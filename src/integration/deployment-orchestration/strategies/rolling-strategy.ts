/**
 * @fileoverview Rolling deployment strategy implementation
 * Provides gradual replacement of instances with configurable batch sizes and availability controls
 */

import {
  IRollingStrategy,
  RollingProgress
} from '../interfaces.js';
import {
  DeploymentConfig,
  DeploymentResult,
  ValidationResult,
  DeploymentMetrics,
  RollingStrategyConfig,
  ValidationStepResult
} from '../types.js';

/**
 * Rolling deployment strategy
 * Gradually replaces old instances with new ones in configurable batches
 */
export class RollingStrategy implements IRollingStrategy {
  readonly type = 'rolling';
  
  private rollingProgress: Map<string, RollingProgress> = new Map();
  private pausedDeployments: Set<string> = new Set();

  /**
   * Execute rolling deployment
   */
  async execute(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      const deploymentId = config.id;
      const strategyConfig = config.metadata?.rollingConfig as RollingStrategyConfig;
      
      if (!strategyConfig) {
        throw new Error('Rolling strategy configuration is required');
      }

      console.log(`Rolling deployment starting with batch size: ${strategyConfig.batchSize}`);

      // Initialize rolling deployment
      const progress = await this.initializeRollingDeployment(deploymentId, config, strategyConfig);
      this.rollingProgress.set(deploymentId, progress);

      // Calculate deployment batches
      const batches = this.calculateDeploymentBatches(config, strategyConfig);
      console.log(`Rolling deployment will execute ${batches.length} batches`);

      // Execute rolling deployment batches
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        console.log(`Executing rolling batch ${batchIndex + 1}/${batches.length} (${batch.replicas} replicas)`);

        // Check if deployment is paused
        if (this.pausedDeployments.has(deploymentId)) {
          console.log('Rolling deployment is paused, waiting for resume');
          await this.waitForResume(deploymentId);
        }

        // Deploy batch
        await this.deployBatch(deploymentId, batch, batchIndex);

        // Wait for batch to be ready
        await this.waitForBatchReady(deploymentId, batch);

        // Validate batch health
        const batchValidation = await this.validateBatch(deploymentId, batch);
        if (!batchValidation.success) {
          throw new Error(`Batch ${batchIndex + 1} validation failed: ${batchValidation.results.map(r => r.message).join(', ')}`);
        }

        // Update progress
        await this.updateRollingProgress(deploymentId, batchIndex + 1, batches.length);

        // Pause between batches if configured
        if (strategyConfig.pauseBetweenBatches > 0 && batchIndex < batches.length - 1) {
          console.log(`Pausing ${strategyConfig.pauseBetweenBatches}ms between batches`);
          await this.pauseBetweenBatches(strategyConfig.pauseBetweenBatches);
        }

        // Check progress deadline
        const elapsed = Date.now() - progress.startTime.getTime();
        if (elapsed > strategyConfig.progressDeadline) {
          throw new Error(`Rolling deployment exceeded progress deadline of ${strategyConfig.progressDeadline}ms`);
        }
      }

      // Complete rolling deployment
      await this.completeRollingDeployment(deploymentId);

      return {
        success: true,
        deploymentId,
        executionId: deploymentId,
        status: 'completed',
        message: 'Rolling deployment completed successfully'
      };

    } catch (error) {
      return {
        success: false,
        deploymentId: config.id,
        executionId: config.id,
        status: 'failed',
        message: `Rolling deployment failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate rolling strategy configuration
   */
  async validateConfig(config: DeploymentConfig): Promise<ValidationResult> {
    const results: ValidationStepResult[] = [];
    
    // Check for rolling specific configuration
    const strategyConfig = config.metadata?.rollingConfig as RollingStrategyConfig;
    if (!strategyConfig) {
      results.push({
        name: 'strategy-config',
        success: false,
        message: 'Rolling strategy configuration is missing',
        duration: 0
      });
    } else {
      results.push({
        name: 'strategy-config',
        success: true,
        message: 'Rolling strategy configuration is valid',
        duration: 0
      });

      // Validate batch size
      if (typeof strategyConfig.batchSize === 'number' && strategyConfig.batchSize <= 0) {
        results.push({
          name: 'batch-size',
          success: false,
          message: 'Batch size must be positive',
          duration: 0
        });
      } else if (typeof strategyConfig.batchSize === 'string' && !strategyConfig.batchSize.match(/^\d+%?$/)) {
        results.push({
          name: 'batch-size',
          success: false,
          message: 'Batch size string must be a number or percentage',
          duration: 0
        });
      } else {
        results.push({
          name: 'batch-size',
          success: true,
          message: 'Batch size configuration is valid',
          duration: 0
        });
      }

      // Validate max unavailable
      if (typeof strategyConfig.maxUnavailable === 'number' && strategyConfig.maxUnavailable < 0) {
        results.push({
          name: 'max-unavailable',
          success: false,
          message: 'Max unavailable must be non-negative',
          duration: 0
        });
      } else if (typeof strategyConfig.maxUnavailable === 'string' && !strategyConfig.maxUnavailable.match(/^\d+%?$/)) {
        results.push({
          name: 'max-unavailable',
          success: false,
          message: 'Max unavailable string must be a number or percentage',
          duration: 0
        });
      } else {
        results.push({
          name: 'max-unavailable',
          success: true,
          message: 'Max unavailable configuration is valid',
          duration: 0
        });
      }

      // Validate max surge
      if (typeof strategyConfig.maxSurge === 'number' && strategyConfig.maxSurge < 0) {
        results.push({
          name: 'max-surge',
          success: false,
          message: 'Max surge must be non-negative',
          duration: 0
        });
      } else if (typeof strategyConfig.maxSurge === 'string' && !strategyConfig.maxSurge.match(/^\d+%?$/)) {
        results.push({
          name: 'max-surge',
          success: false,
          message: 'Max surge string must be a number or percentage',
          duration: 0
        });
      } else {
        results.push({
          name: 'max-surge',
          success: true,
          message: 'Max surge configuration is valid',
          duration: 0
        });
      }

      // Validate progress deadline
      if (strategyConfig.progressDeadline <= 0) {
        results.push({
          name: 'progress-deadline',
          success: false,
          message: 'Progress deadline must be positive',
          duration: 0
        });
      } else {
        results.push({
          name: 'progress-deadline',
          success: true,
          message: 'Progress deadline is valid',
          duration: 0
        });
      }

      // Validate pause between batches
      if (strategyConfig.pauseBetweenBatches < 0) {
        results.push({
          name: 'pause-between-batches',
          success: false,
          message: 'Pause between batches must be non-negative',
          duration: 0
        });
      } else {
        results.push({
          name: 'pause-between-batches',
          success: true,
          message: 'Pause between batches is valid',
          duration: 0
        });
      }
    }

    // Validate component replicas for rolling deployment
    const componentsWithoutReplicas = config.components.filter(c => !c.replicas || c.replicas < 2);
    if (componentsWithoutReplicas.length > 0) {
      results.push({
        name: 'component-replicas',
        success: false,
        message: `Components need at least 2 replicas for rolling deployment: ${componentsWithoutReplicas.map(c => c.name).join(', ')}`,
        duration: 0
      });
    } else {
      results.push({
        name: 'component-replicas',
        success: true,
        message: 'Component replica configuration is valid for rolling deployment',
        duration: 0
      });
    }

    const success = results.every(r => r.success);
    const overallScore = results.filter(r => r.success).length / results.length;

    return {
      success,
      results,
      overallScore,
      recommendations: success ? [] : [
        'Configure valid batch size (number or percentage)',
        'Set appropriate max unavailable and max surge values',
        'Ensure components have at least 2 replicas',
        'Set reasonable progress deadline'
      ]
    };
  }

  /**
   * Get deployment metrics for rolling strategy
   */
  async getMetrics(deploymentId: string): Promise<DeploymentMetrics> {
    const progress = this.rollingProgress.get(deploymentId);

    return {
      duration: progress ? Date.now() - progress.startTime.getTime() : 0,
      resourceUsage: {
        cpu: 0, // Would be calculated from monitoring
        memory: 0,
        network: 0,
        storage: 0
      },
      performance: {
        responseTime: 0, // Would be calculated from health checks
        throughput: 0,
        errorRate: 0,
        availability: progress ? (progress.readyReplicas / progress.totalReplicas) * 100 : 0
      },
      success: progress ? progress.updatedReplicas === progress.totalReplicas : false,
      rollbackCount: 0
    };
  }

  /**
   * Handle rollback for rolling deployment
   */
  async rollback(deploymentId: string, targetVersion?: string): Promise<DeploymentResult> {
    try {
      console.log(`Rolling deployment rollback initiated for ${deploymentId}`);

      // Stop current rolling deployment
      this.pausedDeployments.add(deploymentId);

      // Rollback to previous version
      await this.rollbackToVersion(deploymentId, targetVersion);

      return {
        success: true,
        deploymentId,
        executionId: deploymentId,
        status: 'rolled-back',
        message: 'Rolling deployment rolled back successfully',
        rollbackInfo: {
          triggered: true,
          reason: 'Manual rollback requested',
          previousVersion: targetVersion || 'previous',
          rollbackTime: new Date(),
          success: true
        }
      };

    } catch (error) {
      return {
        success: false,
        deploymentId,
        executionId: deploymentId,
        status: 'failed',
        message: `Rolling deployment rollback failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get current rolling update progress
   */
  async getRollingProgress(deploymentId: string): Promise<RollingProgress> {
    const progress = this.rollingProgress.get(deploymentId);
    if (!progress) {
      throw new Error('Rolling deployment not found');
    }

    return progress;
  }

  /**
   * Pause rolling update
   */
  async pauseRolling(deploymentId: string): Promise<void> {
    const progress = this.rollingProgress.get(deploymentId);
    if (!progress) {
      throw new Error('Rolling deployment not found');
    }

    this.pausedDeployments.add(deploymentId);
    console.log(`Rolling deployment ${deploymentId} paused`);
  }

  /**
   * Resume rolling update
   */
  async resumeRolling(deploymentId: string): Promise<void> {
    const progress = this.rollingProgress.get(deploymentId);
    if (!progress) {
      throw new Error('Rolling deployment not found');
    }

    this.pausedDeployments.delete(deploymentId);
    console.log(`Rolling deployment ${deploymentId} resumed`);
  }

  /**
   * Initialize rolling deployment
   */
  private async initializeRollingDeployment(
    deploymentId: string,
    config: DeploymentConfig,
    strategyConfig: RollingStrategyConfig
  ): Promise<RollingProgress & { startTime: Date }> {
    const totalReplicas = config.components.reduce((sum, component) => sum + (component.replicas || 1), 0);

    const progress = {
      totalReplicas,
      updatedReplicas: 0,
      readyReplicas: 0,
      availableReplicas: totalReplicas, // Start with all old replicas available
      unavailableReplicas: 0,
      percentage: 0,
      startTime: new Date()
    };

    console.log(`Initialized rolling deployment with ${totalReplicas} total replicas`);
    return progress;
  }

  /**
   * Calculate deployment batches
   */
  private calculateDeploymentBatches(
    config: DeploymentConfig,
    strategyConfig: RollingStrategyConfig
  ): DeploymentBatch[] {
    const batches: DeploymentBatch[] = [];
    
    for (const component of config.components) {
      const totalReplicas = component.replicas || 1;
      const batchSize = this.calculateBatchSize(totalReplicas, strategyConfig.batchSize);
      
      let remainingReplicas = totalReplicas;
      let batchNumber = 1;
      
      while (remainingReplicas > 0) {
        const replicasInBatch = Math.min(batchSize, remainingReplicas);
        
        batches.push({
          component: component.name,
          batchNumber,
          replicas: replicasInBatch,
          totalReplicas,
          startReplica: totalReplicas - remainingReplicas,
          endReplica: totalReplicas - remainingReplicas + replicasInBatch - 1
        });
        
        remainingReplicas -= replicasInBatch;
        batchNumber++;
      }
    }

    return batches;
  }

  /**
   * Calculate batch size from configuration
   */
  private calculateBatchSize(totalReplicas: number, batchSizeConfig: number | string): number {
    if (typeof batchSizeConfig === 'number') {
      return Math.max(1, Math.min(batchSizeConfig, totalReplicas));
    }
    
    if (typeof batchSizeConfig === 'string' && batchSizeConfig.endsWith('%')) {
      const percentage = parseInt(batchSizeConfig.slice(0, -1));
      return Math.max(1, Math.ceil((percentage / 100) * totalReplicas));
    }
    
    const numericValue = parseInt(batchSizeConfig);
    return Math.max(1, Math.min(numericValue, totalReplicas));
  }

  /**
   * Deploy batch
   */
  private async deployBatch(
    deploymentId: string,
    batch: DeploymentBatch,
    batchIndex: number
  ): Promise<void> {
    console.log(`Deploying batch ${batch.batchNumber} for component ${batch.component}: replicas ${batch.startReplica}-${batch.endReplica}`);

    // Simulate batch deployment
    // In real implementation, this would:
    // 1. Create new replicas with new version
    // 2. Wait for new replicas to be ready
    // 3. Remove old replicas
    // 4. Update load balancer configuration

    await this.simulateDeploymentStep(`Deploy batch ${batchIndex + 1}`, 3000);
  }

  /**
   * Wait for batch to be ready
   */
  private async waitForBatchReady(deploymentId: string, batch: DeploymentBatch): Promise<void> {
    console.log(`Waiting for batch ${batch.batchNumber} to be ready`);

    // Simulate waiting for readiness
    // In real implementation, this would check health endpoints
    await this.simulateDeploymentStep(`Wait for batch ${batch.batchNumber} readiness`, 2000);

    // Update progress
    const progress = this.rollingProgress.get(deploymentId);
    if (progress) {
      progress.updatedReplicas += batch.replicas;
      progress.readyReplicas += batch.replicas;
      progress.percentage = (progress.updatedReplicas / progress.totalReplicas) * 100;
      this.rollingProgress.set(deploymentId, progress);
    }
  }

  /**
   * Validate batch health
   */
  private async validateBatch(deploymentId: string, batch: DeploymentBatch): Promise<ValidationResult> {
    const results: ValidationStepResult[] = [];

    // Health check validation
    const healthCheck = await this.performBatchHealthCheck(batch);
    results.push({
      name: `health-check-batch-${batch.batchNumber}`,
      success: healthCheck.success,
      message: healthCheck.message,
      duration: healthCheck.duration
    });

    // Performance validation
    const performanceCheck = await this.performBatchPerformanceCheck(batch);
    results.push({
      name: `performance-check-batch-${batch.batchNumber}`,
      success: performanceCheck.success,
      message: performanceCheck.message,
      duration: performanceCheck.duration
    });

    const success = results.every(r => r.success);
    const overallScore = results.filter(r => r.success).length / results.length;

    return {
      success,
      results,
      overallScore,
      recommendations: success ? [] : [
        `Fix health check issues in batch ${batch.batchNumber}`,
        `Optimize performance in batch ${batch.batchNumber}`
      ]
    };
  }

  /**
   * Update rolling progress
   */
  private async updateRollingProgress(
    deploymentId: string,
    completedBatches: number,
    totalBatches: number
  ): Promise<void> {
    const progress = this.rollingProgress.get(deploymentId);
    if (progress) {
      progress.percentage = (completedBatches / totalBatches) * 100;
      this.rollingProgress.set(deploymentId, progress);
    }

    console.log(`Rolling progress: ${completedBatches}/${totalBatches} batches completed (${progress?.percentage.toFixed(1)}%)`);
  }

  /**
   * Pause between batches
   */
  private async pauseBetweenBatches(duration: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Wait for resume
   */
  private async waitForResume(deploymentId: string): Promise<void> {
    while (this.pausedDeployments.has(deploymentId)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Complete rolling deployment
   */
  private async completeRollingDeployment(deploymentId: string): Promise<void> {
    console.log('Completing rolling deployment');

    const progress = this.rollingProgress.get(deploymentId);
    if (progress) {
      progress.percentage = 100;
      progress.availableReplicas = progress.totalReplicas;
      progress.unavailableReplicas = 0;
      this.rollingProgress.set(deploymentId, progress);
    }

    await this.simulateDeploymentStep('Complete rolling deployment', 1000);
  }

  /**
   * Rollback to version
   */
  private async rollbackToVersion(deploymentId: string, targetVersion?: string): Promise<void> {
    console.log(`Rolling back to version: ${targetVersion || 'previous'}`);

    // Reset progress
    const progress = this.rollingProgress.get(deploymentId);
    if (progress) {
      progress.updatedReplicas = 0;
      progress.readyReplicas = progress.totalReplicas; // All old replicas are ready
      progress.percentage = 0;
      this.rollingProgress.set(deploymentId, progress);
    }

    await this.simulateDeploymentStep('Rollback rolling deployment', 2000);
  }

  /**
   * Perform batch health check
   */
  private async performBatchHealthCheck(
    batch: DeploymentBatch
  ): Promise<{ success: boolean; message: string; duration: number }> {
    const startTime = Date.now();
    
    // Simulate health check
    await this.simulateDeploymentStep(`Health check batch ${batch.batchNumber}`, 1000);
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      message: `Health check passed for batch ${batch.batchNumber}`,
      duration
    };
  }

  /**
   * Perform batch performance check
   */
  private async performBatchPerformanceCheck(
    batch: DeploymentBatch
  ): Promise<{ success: boolean; message: string; duration: number }> {
    const startTime = Date.now();
    
    // Simulate performance check
    await this.simulateDeploymentStep(`Performance check batch ${batch.batchNumber}`, 800);
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      message: `Performance check passed for batch ${batch.batchNumber}`,
      duration
    };
  }

  /**
   * Simulate deployment step with delay
   */
  private async simulateDeploymentStep(stepName: string, duration: number): Promise<void> {
    console.log(`Executing: ${stepName} (${duration}ms)`);
    await new Promise(resolve => setTimeout(resolve, duration));
  }
}

interface DeploymentBatch {
  component: string;
  batchNumber: number;
  replicas: number;
  totalReplicas: number;
  startReplica: number;
  endReplica: number;
}