import {
  IntegrationConfig,
  CICDPlatform,
  PipelineExecution,
  SyncResult,
  IntegrationResult
} from '../types.js';
import { JenkinsProvider } from './jenkins-provider.js';
import { GitLabCIProvider } from './gitlab-ci-provider.js';
import { GitHubActionsProvider } from './github-actions-provider.js';

/**
 * Manager for CI/CD platform integrations (Jenkins, GitLab CI, GitHub Actions)
 */
export class CICDIntegrationManager {
  private platforms = new Map<string, CICDPlatform>();
  private jenkinsProvider: JenkinsProvider;
  private gitlabProvider: GitLabCIProvider;
  private githubProvider: GitHubActionsProvider;

  constructor() {
    this.jenkinsProvider = new JenkinsProvider();
    this.gitlabProvider = new GitLabCIProvider();
    this.githubProvider = new GitHubActionsProvider();
  }

  /**
   * Validate CI/CD integration configuration
   */
  async validateConfig(config: IntegrationConfig): Promise<void> {
    const cicdConfig = config.configuration as CICDPlatform;
    
    if (!cicdConfig.type || !cicdConfig.baseUrl) {
      throw new Error('CI/CD integration must specify type and baseUrl');
    }

    const validTypes = ['jenkins', 'gitlab-ci', 'github-actions', 'azure-devops'];
    if (!validTypes.includes(cicdConfig.type)) {
      throw new Error(`Invalid CI/CD platform type: ${cicdConfig.type}`);
    }

    // Type-specific validation
    switch (cicdConfig.type) {
      case 'jenkins':
        await this.jenkinsProvider.validateConfig(cicdConfig);
        break;
      case 'gitlab-ci':
        await this.gitlabProvider.validateConfig(cicdConfig);
        break;
      case 'github-actions':
        await this.githubProvider.validateConfig(cicdConfig);
        break;
    }
  }

  /**
   * Initialize CI/CD integration
   */
  async initialize(config: IntegrationConfig): Promise<void> {
    const cicdConfig = config.configuration as CICDPlatform;
    
    try {
      switch (cicdConfig.type) {
        case 'jenkins':
          await this.jenkinsProvider.initialize(cicdConfig, config.credentials);
          break;
        case 'gitlab-ci':
          await this.gitlabProvider.initialize(cicdConfig, config.credentials);
          break;
        case 'github-actions':
          await this.githubProvider.initialize(cicdConfig, config.credentials);
          break;
      }

      this.platforms.set(config.id, cicdConfig);
      console.log(`CI/CD platform ${config.id} initialized successfully`);
    } catch (error) {
      throw new Error(`Failed to initialize CI/CD platform: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Cleanup CI/CD integration
   */
  async cleanup(config: IntegrationConfig): Promise<void> {
    const cicdConfig = config.configuration as CICDPlatform;
    
    try {
      switch (cicdConfig.type) {
        case 'jenkins':
          await this.jenkinsProvider.cleanup();
          break;
        case 'gitlab-ci':
          await this.gitlabProvider.cleanup();
          break;
        case 'github-actions':
          await this.githubProvider.cleanup();
          break;
      }

      this.platforms.delete(config.id);
      console.log(`CI/CD platform ${config.id} cleaned up successfully`);
    } catch (error) {
      console.error(`Error cleaning up CI/CD platform ${config.id}:`, error);
    }
  }

  /**
   * Sync pipeline executions
   */
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    const cicdConfig = this.platforms.get(config.id);
    if (!cicdConfig) {
      throw new Error(`CI/CD platform ${config.id} not initialized`);
    }

    const startTime = Date.now();
    let itemsSynced = 0;
    const errors: string[] = [];

    try {
      let executions: PipelineExecution[] = [];

      switch (cicdConfig.type) {
        case 'jenkins':
          executions = await this.jenkinsProvider.getPipelineExecutions();
          break;
        case 'gitlab-ci':
          executions = await this.gitlabProvider.getPipelineExecutions();
          break;
        case 'github-actions':
          executions = await this.githubProvider.getPipelineExecutions();
          break;
      }

      itemsSynced = executions.length;
      
      // Process pipeline executions
      await this.processPipelineExecutions(executions, config.id);

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
   * Health check for CI/CD platform
   */
  async healthCheck(config: IntegrationConfig): Promise<boolean> {
    const cicdConfig = this.platforms.get(config.id);
    if (!cicdConfig) {
      return false;
    }

    try {
      switch (cicdConfig.type) {
        case 'jenkins':
          return await this.jenkinsProvider.healthCheck();
        case 'gitlab-ci':
          return await this.gitlabProvider.healthCheck();
        case 'github-actions':
          return await this.githubProvider.healthCheck();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Health check failed for CI/CD platform ${config.id}:`, error);
      return false;
    }
  }  /**
   * Trigger pipeline execution
   */
  async triggerPipeline(platformId: string, pipelineName: string, branch?: string, parameters?: Record<string, any>): Promise<IntegrationResult<PipelineExecution>> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return {
        success: false,
        error: `CI/CD platform ${platformId} not found`
      };
    }

    try {
      let execution: PipelineExecution | null = null;

      switch (platform.type) {
        case 'jenkins':
          execution = await this.jenkinsProvider.triggerPipeline(pipelineName, branch, parameters);
          break;
        case 'gitlab-ci':
          execution = await this.gitlabProvider.triggerPipeline(pipelineName, branch, parameters);
          break;
        case 'github-actions':
          execution = await this.githubProvider.triggerPipeline(pipelineName, branch, parameters);
          break;
      }

      if (execution) {
        return {
          success: true,
          data: execution
        };
      } else {
        return {
          success: false,
          error: 'Failed to trigger pipeline'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error triggering pipeline'
      };
    }
  }

  /**
   * Get pipeline execution status
   */
  async getPipelineStatus(platformId: string, executionId: string): Promise<IntegrationResult<PipelineExecution>> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return {
        success: false,
        error: `CI/CD platform ${platformId} not found`
      };
    }

    try {
      let execution: PipelineExecution | null = null;

      switch (platform.type) {
        case 'jenkins':
          execution = await this.jenkinsProvider.getPipelineStatus(executionId);
          break;
        case 'gitlab-ci':
          execution = await this.gitlabProvider.getPipelineStatus(executionId);
          break;
        case 'github-actions':
          execution = await this.githubProvider.getPipelineStatus(executionId);
          break;
      }

      if (execution) {
        return {
          success: true,
          data: execution
        };
      } else {
        return {
          success: false,
          error: 'Pipeline execution not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error retrieving pipeline status'
      };
    }
  }

  /**
   * Cancel pipeline execution
   */
  async cancelPipeline(platformId: string, executionId: string): Promise<IntegrationResult<void>> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return {
        success: false,
        error: `CI/CD platform ${platformId} not found`
      };
    }

    try {
      let success = false;

      switch (platform.type) {
        case 'jenkins':
          success = await this.jenkinsProvider.cancelPipeline(executionId);
          break;
        case 'gitlab-ci':
          success = await this.gitlabProvider.cancelPipeline(executionId);
          break;
        case 'github-actions':
          success = await this.githubProvider.cancelPipeline(executionId);
          break;
      }

      if (success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Failed to cancel pipeline'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error cancelling pipeline'
      };
    }
  }

  /**
   * Get pipeline logs
   */
  async getPipelineLogs(platformId: string, executionId: string): Promise<IntegrationResult<string>> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return {
        success: false,
        error: `CI/CD platform ${platformId} not found`
      };
    }

    try {
      let logs: string | null = null;

      switch (platform.type) {
        case 'jenkins':
          logs = await this.jenkinsProvider.getPipelineLogs(executionId);
          break;
        case 'gitlab-ci':
          logs = await this.gitlabProvider.getPipelineLogs(executionId);
          break;
        case 'github-actions':
          logs = await this.githubProvider.getPipelineLogs(executionId);
          break;
      }

      if (logs !== null) {
        return {
          success: true,
          data: logs
        };
      } else {
        return {
          success: false,
          error: 'Pipeline logs not available'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error retrieving pipeline logs'
      };
    }
  }

  // Private helper methods
  private async processPipelineExecutions(executions: PipelineExecution[], platformId: string): Promise<void> {
    console.log(`Processing ${executions.length} pipeline executions from platform ${platformId}`);
    
    for (const execution of executions) {
      console.log(`Processed pipeline execution: ${execution.name} (${execution.status})`);
    }
  }
}