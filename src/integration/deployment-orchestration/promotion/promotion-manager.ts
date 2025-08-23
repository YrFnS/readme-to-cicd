/**
 * @fileoverview Promotion manager implementation
 * Provides multi-environment promotion pipeline management
 */

import {
  IPromotionManager,
  PromotionPipeline,
  PromotionPipelineConfig,
  PromotionStatus,
  PromotionStage
} from '../interfaces.js';
import {
  PromotionResult,
  ValidationResult,
  DeploymentEnvironment
} from '../types.js';

/**
 * Promotion manager
 * Handles promotion pipelines between environments with approval gates and validation
 */
export class PromotionManager implements IPromotionManager {
  private promotionPipelines: Map<string, PromotionPipeline> = new Map();
  private promotionHistory: Map<string, PromotionResult[]> = new Map();

  /**
   * Create promotion pipeline
   */
  async createPromotionPipeline(config: PromotionPipelineConfig): Promise<PromotionPipeline> {
    const pipelineId = this.generatePipelineId(config.name);
    
    const stages: PromotionStage[] = config.stages.map(stageConfig => ({
      name: stageConfig.name,
      environment: stageConfig.environment,
      status: 'pending',
      deploymentId: undefined,
      startTime: undefined,
      endTime: undefined
    }));

    const pipeline: PromotionPipeline = {
      id: pipelineId,
      name: config.name,
      stages,
      currentStage: 0,
      status: 'active'
    };

    this.promotionPipelines.set(pipelineId, pipeline);
    
    console.log(`Created promotion pipeline: ${config.name} (ID: ${pipelineId})`);
    console.log(`Stages: ${stages.map(s => `${s.name} (${s.environment})`).join(' -> ')}`);
    
    return pipeline;
  }

  /**
   * Execute promotion between environments
   */
  async executePromotion(pipelineId: string, stage: string): Promise<PromotionResult> {
    try {
      const pipeline = this.promotionPipelines.get(pipelineId);
      if (!pipeline) {
        throw new Error(`Promotion pipeline not found: ${pipelineId}`);
      }

      const stageIndex = pipeline.stages.findIndex(s => s.name === stage);
      if (stageIndex === -1) {
        throw new Error(`Stage not found in pipeline: ${stage}`);
      }

      const targetStage = pipeline.stages[stageIndex];
      
      console.log(`Executing promotion to ${stage} (${targetStage.environment})`);

      // Validate promotion readiness
      const validationResult = await this.validatePromotion(pipelineId, stage);
      if (!validationResult.success) {
        throw new Error(`Promotion validation failed: ${validationResult.results.map(r => r.message).join(', ')}`);
      }

      // Update stage status
      targetStage.status = 'in-progress';
      targetStage.startTime = new Date();
      pipeline.currentStage = stageIndex;

      // Execute promotion steps
      await this.executePromotionSteps(pipelineId, targetStage);

      // Complete promotion
      targetStage.status = 'completed';
      targetStage.endTime = new Date();
      targetStage.deploymentId = this.generateDeploymentId(pipelineId, stage);

      // Update pipeline status
      if (stageIndex === pipeline.stages.length - 1) {
        pipeline.status = 'completed';
      }

      const result: PromotionResult = {
        success: true,
        fromEnvironment: stageIndex > 0 ? pipeline.stages[stageIndex - 1].environment : 'development',
        toEnvironment: targetStage.environment,
        deploymentId: targetStage.deploymentId!,
        approvals: [] // Would be populated from actual approval system
      };

      // Record promotion history
      this.recordPromotionHistory(pipelineId, result);

      console.log(`Promotion completed successfully: ${stage}`);
      return result;

    } catch (error) {
      const result: PromotionResult = {
        success: false,
        fromEnvironment: 'unknown',
        toEnvironment: 'unknown',
        deploymentId: '',
        approvals: []
      };

      this.recordPromotionHistory(pipelineId, result);

      console.error(`Promotion failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get promotion status
   */
  async getPromotionStatus(pipelineId: string): Promise<PromotionStatus> {
    const pipeline = this.promotionPipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Promotion pipeline not found: ${pipelineId}`);
    }

    const currentStage = pipeline.stages[pipeline.currentStage];
    const progress = ((pipeline.currentStage + 1) / pipeline.stages.length) * 100;

    const stageStatuses = pipeline.stages.map(stage => ({
      name: stage.name,
      status: stage.status,
      progress: stage.status === 'completed' ? 100 : stage.status === 'in-progress' ? 50 : 0,
      issues: this.getStageIssues(stage),
      approvals: {
        pending: [],
        completed: [],
        overallStatus: 'approved' as const // Mock data
      }
    }));

    const blockers = this.identifyPromotionBlockers(pipeline);

    return {
      pipelineId,
      currentStage: currentStage.name,
      progress,
      stages: stageStatuses,
      blockers
    };
  }

  /**
   * Validate promotion readiness
   */
  async validatePromotion(pipelineId: string, stage: string): Promise<ValidationResult> {
    const pipeline = this.promotionPipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Promotion pipeline not found: ${pipelineId}`);
    }

    const results = [];

    // Validate stage order
    const stageIndex = pipeline.stages.findIndex(s => s.name === stage);
    const currentStageIndex = pipeline.currentStage;
    
    if (stageIndex !== currentStageIndex) {
      results.push({
        name: 'stage-order',
        success: false,
        message: `Cannot promote to ${stage}. Current stage is ${pipeline.stages[currentStageIndex].name}`,
        duration: 0
      });
    } else {
      results.push({
        name: 'stage-order',
        success: true,
        message: 'Stage order is valid',
        duration: 0
      });
    }

    // Validate prerequisites
    const targetStage = pipeline.stages[stageIndex];
    if (stageIndex > 0) {
      const previousStage = pipeline.stages[stageIndex - 1];
      if (previousStage.status !== 'completed') {
        results.push({
          name: 'prerequisites',
          success: false,
          message: `Previous stage ${previousStage.name} must be completed first`,
          duration: 0
        });
      } else {
        results.push({
          name: 'prerequisites',
          success: true,
          message: 'Prerequisites are satisfied',
          duration: 0
        });
      }
    }

    // Validate environment readiness
    const envValidation = await this.validateEnvironmentReadiness(targetStage.environment);
    results.push(envValidation);

    // Validate approvals (mock)
    results.push({
      name: 'approvals',
      success: true,
      message: 'All required approvals obtained',
      duration: 0
    });

    const success = results.every(r => r.success);
    const overallScore = results.filter(r => r.success).length / results.length;

    return {
      success,
      results,
      overallScore,
      recommendations: success ? [] : results.filter(r => !r.success).map(r => r.message)
    };
  }

  /**
   * Generate unique pipeline ID
   */
  private generatePipelineId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${random}`;
  }

  /**
   * Generate deployment ID
   */
  private generateDeploymentId(pipelineId: string, stage: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    return `${pipelineId}-${stage}-${timestamp}-${random}`;
  }

  /**
   * Execute promotion steps
   */
  private async executePromotionSteps(pipelineId: string, stage: PromotionStage): Promise<void> {
    console.log(`Executing promotion steps for stage: ${stage.name}`);

    // Step 1: Prepare target environment
    await this.simulatePromotionStep('Prepare target environment', 2000);

    // Step 2: Deploy to target environment
    await this.simulatePromotionStep('Deploy to target environment', 5000);

    // Step 3: Run validation tests
    await this.simulatePromotionStep('Run validation tests', 3000);

    // Step 4: Update configuration
    await this.simulatePromotionStep('Update configuration', 1000);

    // Step 5: Verify deployment
    await this.simulatePromotionStep('Verify deployment', 2000);

    console.log(`Promotion steps completed for stage: ${stage.name}`);
  }

  /**
   * Validate environment readiness
   */
  private async validateEnvironmentReadiness(environment: DeploymentEnvironment): Promise<any> {
    await this.simulatePromotionStep(`Validate ${environment} environment`, 1500);

    // Simulate validation result
    const success = Math.random() > 0.1; // 90% success rate

    return {
      name: 'environment-readiness',
      success,
      message: success 
        ? `Environment ${environment} is ready for deployment`
        : `Environment ${environment} is not ready for deployment`,
      duration: 1500
    };
  }

  /**
   * Get stage issues
   */
  private getStageIssues(stage: PromotionStage): string[] {
    const issues: string[] = [];

    if (stage.status === 'failed') {
      issues.push('Deployment failed');
    }

    if (stage.status === 'in-progress') {
      const elapsed = stage.startTime ? Date.now() - stage.startTime.getTime() : 0;
      if (elapsed > 600000) { // > 10 minutes
        issues.push('Deployment taking longer than expected');
      }
    }

    return issues;
  }

  /**
   * Identify promotion blockers
   */
  private identifyPromotionBlockers(pipeline: PromotionPipeline): any[] {
    const blockers: any[] = [];

    const currentStage = pipeline.stages[pipeline.currentStage];
    
    if (currentStage.status === 'failed') {
      blockers.push({
        stage: currentStage.name,
        type: 'error',
        message: 'Current stage has failed',
        resolvable: true
      });
    }

    // Check for approval blockers (mock)
    if (currentStage.environment === 'production') {
      blockers.push({
        stage: currentStage.name,
        type: 'approval',
        message: 'Waiting for production deployment approval',
        resolvable: true
      });
    }

    return blockers;
  }

  /**
   * Record promotion history
   */
  private recordPromotionHistory(pipelineId: string, result: PromotionResult): void {
    let history = this.promotionHistory.get(pipelineId);
    if (!history) {
      history = [];
      this.promotionHistory.set(pipelineId, history);
    }

    history.push(result);

    // Keep only last 20 promotion results
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  /**
   * Simulate promotion step with delay
   */
  private async simulatePromotionStep(stepName: string, duration: number): Promise<void> {
    console.log(`Executing: ${stepName} (${duration}ms)`);
    await new Promise(resolve => setTimeout(resolve, Math.min(duration, 2000))); // Max 2s for simulation
  }
}