import {
  IntegrationConfig,
  WorkflowSystem,
  WorkflowItem,
  SyncResult,
  IntegrationResult
} from '../types.js';
import { JiraProvider } from './jira-provider.js';
import { ServiceNowProvider } from './servicenow-provider.js';
import { CustomWorkflowProvider } from './custom-workflow-provider.js';

/**
 * Manager for workflow system integrations (Jira, ServiceNow, Custom)
 */
export class WorkflowIntegrationManager {
  private systems = new Map<string, WorkflowSystem>();
  private jiraProvider: JiraProvider;
  private serviceNowProvider: ServiceNowProvider;
  private customProvider: CustomWorkflowProvider;

  constructor() {
    this.jiraProvider = new JiraProvider();
    this.serviceNowProvider = new ServiceNowProvider();
    this.customProvider = new CustomWorkflowProvider();
  }

  /**
   * Validate workflow integration configuration
   */
  async validateConfig(config: IntegrationConfig): Promise<void> {
    const workflowConfig = config.configuration as WorkflowSystem;
    
    if (!workflowConfig.type || !workflowConfig.baseUrl) {
      throw new Error('Workflow integration must specify type and baseUrl');
    }

    const validTypes = ['jira', 'servicenow', 'custom'];
    if (!validTypes.includes(workflowConfig.type)) {
      throw new Error(`Invalid workflow system type: ${workflowConfig.type}`);
    }

    // Type-specific validation
    switch (workflowConfig.type) {
      case 'jira':
        await this.jiraProvider.validateConfig(workflowConfig);
        break;
      case 'servicenow':
        await this.serviceNowProvider.validateConfig(workflowConfig);
        break;
      case 'custom':
        await this.customProvider.validateConfig(workflowConfig);
        break;
    }
  }

  /**
   * Initialize workflow integration
   */
  async initialize(config: IntegrationConfig): Promise<void> {
    const workflowConfig = config.configuration as WorkflowSystem;
    
    try {
      switch (workflowConfig.type) {
        case 'jira':
          await this.jiraProvider.initialize(workflowConfig, config.credentials);
          break;
        case 'servicenow':
          await this.serviceNowProvider.initialize(workflowConfig, config.credentials);
          break;
        case 'custom':
          await this.customProvider.initialize(workflowConfig, config.credentials);
          break;
      }

      this.systems.set(config.id, workflowConfig);
      console.log(`Workflow system ${config.id} initialized successfully`);
    } catch (error) {
      throw new Error(`Failed to initialize workflow system: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Cleanup workflow integration
   */
  async cleanup(config: IntegrationConfig): Promise<void> {
    const workflowConfig = config.configuration as WorkflowSystem;
    
    try {
      switch (workflowConfig.type) {
        case 'jira':
          await this.jiraProvider.cleanup();
          break;
        case 'servicenow':
          await this.serviceNowProvider.cleanup();
          break;
        case 'custom':
          await this.customProvider.cleanup();
          break;
      }

      this.systems.delete(config.id);
      console.log(`Workflow system ${config.id} cleaned up successfully`);
    } catch (error) {
      console.error(`Error cleaning up workflow system ${config.id}:`, error);
    }
  }

  /**
   * Sync workflow items
   */
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    const workflowConfig = this.systems.get(config.id);
    if (!workflowConfig) {
      throw new Error(`Workflow system ${config.id} not initialized`);
    }

    const startTime = Date.now();
    let itemsSynced = 0;
    const errors: string[] = [];

    try {
      let items: WorkflowItem[] = [];

      switch (workflowConfig.type) {
        case 'jira':
          items = await this.jiraProvider.getWorkflowItems();
          break;
        case 'servicenow':
          items = await this.serviceNowProvider.getWorkflowItems();
          break;
        case 'custom':
          items = await this.customProvider.getWorkflowItems();
          break;
      }

      itemsSynced = items.length;
      
      // Process workflow items
      await this.processWorkflowItems(items, config.id);

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
   * Health check for workflow system
   */
  async healthCheck(config: IntegrationConfig): Promise<boolean> {
    const workflowConfig = this.systems.get(config.id);
    if (!workflowConfig) {
      return false;
    }

    try {
      switch (workflowConfig.type) {
        case 'jira':
          return await this.jiraProvider.healthCheck();
        case 'servicenow':
          return await this.serviceNowProvider.healthCheck();
        case 'custom':
          return await this.customProvider.healthCheck();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Health check failed for workflow system ${config.id}:`, error);
      return false;
    }
  }  /**
   * Create workflow item
   */
  async createWorkflowItem(systemId: string, item: Partial<WorkflowItem>): Promise<IntegrationResult<WorkflowItem>> {
    const system = this.systems.get(systemId);
    if (!system) {
      return {
        success: false,
        error: `Workflow system ${systemId} not found`
      };
    }

    try {
      let createdItem: WorkflowItem | null = null;

      switch (system.type) {
        case 'jira':
          createdItem = await this.jiraProvider.createItem(item);
          break;
        case 'servicenow':
          createdItem = await this.serviceNowProvider.createItem(item);
          break;
        case 'custom':
          createdItem = await this.customProvider.createItem(item);
          break;
      }

      if (createdItem) {
        return {
          success: true,
          data: createdItem
        };
      } else {
        return {
          success: false,
          error: 'Failed to create workflow item'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error creating workflow item'
      };
    }
  }

  /**
   * Update workflow item
   */
  async updateWorkflowItem(systemId: string, itemId: string, updates: Partial<WorkflowItem>): Promise<IntegrationResult<WorkflowItem>> {
    const system = this.systems.get(systemId);
    if (!system) {
      return {
        success: false,
        error: `Workflow system ${systemId} not found`
      };
    }

    try {
      let updatedItem: WorkflowItem | null = null;

      switch (system.type) {
        case 'jira':
          updatedItem = await this.jiraProvider.updateItem(itemId, updates);
          break;
        case 'servicenow':
          updatedItem = await this.serviceNowProvider.updateItem(itemId, updates);
          break;
        case 'custom':
          updatedItem = await this.customProvider.updateItem(itemId, updates);
          break;
      }

      if (updatedItem) {
        return {
          success: true,
          data: updatedItem
        };
      } else {
        return {
          success: false,
          error: 'Failed to update workflow item'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error updating workflow item'
      };
    }
  }

  /**
   * Get workflow item by ID
   */
  async getWorkflowItem(systemId: string, itemId: string): Promise<IntegrationResult<WorkflowItem>> {
    const system = this.systems.get(systemId);
    if (!system) {
      return {
        success: false,
        error: `Workflow system ${systemId} not found`
      };
    }

    try {
      let item: WorkflowItem | null = null;

      switch (system.type) {
        case 'jira':
          item = await this.jiraProvider.getItemById(itemId);
          break;
        case 'servicenow':
          item = await this.serviceNowProvider.getItemById(itemId);
          break;
        case 'custom':
          item = await this.customProvider.getItemById(itemId);
          break;
      }

      if (item) {
        return {
          success: true,
          data: item
        };
      } else {
        return {
          success: false,
          error: 'Workflow item not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error retrieving workflow item'
      };
    }
  }

  // Private helper methods
  private async processWorkflowItems(items: WorkflowItem[], systemId: string): Promise<void> {
    console.log(`Processing ${items.length} workflow items from system ${systemId}`);
    
    for (const item of items) {
      console.log(`Processed workflow item: ${item.title} (${item.status})`);
    }
  }
}