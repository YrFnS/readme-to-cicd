/**
 * Azure Functions ServerlessManager implementation
 */

import { BaseServerlessManager } from './base-serverless-manager';
import {
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
  AzureFunctionConfig,
  ServerlessMetricData,
  ServerlessMetricDataPoint,
  ServerlessCostMetrics,
  ServerlessCostBreakdown
} from '../types/serverless-types';

export class AzureFunctionsManager extends BaseServerlessManager {
  private readonly subscriptionId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantId: string;

  constructor(
    subscriptionId: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    config: Record<string, any> = {}
  ) {
    super('azure', 'global', config);
    this.subscriptionId = subscriptionId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tenantId = tenantId;
  }

  async deployFunction(config: ServerlessFunctionConfig): Promise<ServerlessDeploymentResult> {
    try {
      this.validateFunctionConfig(config);
      this.validateCodeConfig(config.code);
      
      const azureConfig = config as AzureFunctionConfig;
      const functionName = this.sanitizeFunctionName(config.name);
      
      // Ensure Function App exists
      await this.ensureFunctionAppExists(azureConfig);
      
      // Prepare deployment package
      const deploymentPackage = await this.prepareDeploymentPackage(config.code);
      
      // Deploy function
      const functionId = await this.deployAzureFunction(functionName, azureConfig, deploymentPackage);
      
      // Configure function settings
      await this.configureFunctionSettings(functionId, azureConfig);
      
      // Wait for deployment to complete
      await this.waitForFunctionActive(functionId);
      
      // Get final status
      const status = await this.getFunctionStatus(functionId);
      const functionArn = this.buildFunctionArn(azureConfig, functionName);
      
      return this.createSuccessResult(
        functionId,
        functionArn,
        status.version,
        status,
        deploymentPackage
      );
    } catch (error) {
      return this.createErrorResult(config.name, error as Error);
    }
  }

  async updateFunction(functionId: string, config: ServerlessFunctionUpdateConfig): Promise<ServerlessDeploymentResult> {
    try {
      // Update function code if provided
      if (config.code) {
        this.validateCodeConfig(config.code);
        const deploymentPackage = await this.prepareDeploymentPackage(config.code);
        await this.updateFunctionCode(functionId, deploymentPackage);
      }

      // Update function configuration
      await this.updateFunctionConfiguration(functionId, config);

      // Wait for update to complete
      await this.waitForFunctionActive(functionId);

      // Get updated status
      const status = await this.getFunctionStatus(functionId);
      const functionInfo = await this.getFunctionInfo(functionId);

      return this.createSuccessResult(
        functionId,
        functionInfo.functionArn,
        status.version,
        status
      );
    } catch (error) {
      return this.createErrorResult(functionId, error as Error);
    }
  }

  async deleteFunction(functionId: string): Promise<void> {
    try {
      await this.retryOperation(async () => {
        await this.deleteAzureFunction(functionId);
      });
    } catch (error) {
      throw new Error(`Failed to delete function ${functionId}: ${(error as Error).message}`);
    }
  }

  async invokeFunction(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    try {
      const startTime = Date.now();
      const result = await this.invokeAzureFunction(functionId, payload);
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        success: result.statusCode >= 200 && result.statusCode < 300,
        statusCode: result.statusCode,
        payload: result.body,
        logs: result.logs || [],
        duration,
        billedDuration: Math.ceil(duration / 100) * 100, // Azure bills in 100ms increments
        memoryUsed: result.memoryUsed || 0,
        maxMemoryUsed: result.maxMemoryUsed || 0,
        requestId: result.requestId || '',
        timestamp: new Date(),
        error: result.error ? {
          errorType: result.error.type || 'Unknown',
          errorMessage: result.error.message,
          stackTrace: result.error.stackTrace
        } : undefined
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        duration: 0,
        billedDuration: 0,
        memoryUsed: 0,
        maxMemoryUsed: 0,
        requestId: '',
        timestamp: new Date(),
        error: {
          errorType: 'InvocationError',
          errorMessage: (error as Error).message
        }
      };
    }
  }

  async getFunctionStatus(functionId: string): Promise<ServerlessFunctionStatus> {
    try {
      const functionInfo = await this.getFunctionInfo(functionId);
      
      return {
        state: this.mapAzureStateToServerlessState(functionInfo.state || 'Active'),
        stateReason: functionInfo.stateReason,
        stateReasonCode: functionInfo.stateReasonCode,
        lastUpdateStatus: this.mapAzureUpdateStatusToServerlessStatus(functionInfo.lastUpdateStatus || 'Successful'),
        lastUpdateStatusReason: functionInfo.lastUpdateStatusReason,
        lastUpdateStatusReasonCode: functionInfo.lastUpdateStatusReasonCode,
        lastModified: functionInfo.lastModified,
        codeSize: functionInfo.codeSize,
        codeSha256: functionInfo.codeSha256,
        version: functionInfo.version,
        revisionId: functionInfo.revisionId
      };
    } catch (error) {
      throw new Error(`Failed to get function status for ${functionId}: ${(error as Error).message}`);
    }
  }

  async getFunctionLogs(functionId: string, options?: ServerlessLogOptions): Promise<string[]> {
    try {
      const logs = await this.getApplicationInsightsLogs(functionId, options);
      return logs;
    } catch (error) {
      throw new Error(`Failed to get logs for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async getFunctionMetrics(functionId: string, timeRange?: TimeRange): Promise<ServerlessFunctionMetrics> {
    try {
      const endTime = timeRange?.end || new Date();
      const startTime = timeRange?.start || new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      const [
        invocations,
        duration,
        errors,
        throttles,
        concurrentExecutions,
        coldStarts
      ] = await Promise.all([
        this.getAzureMetric('FunctionExecutionCount', functionId, startTime, endTime),
        this.getAzureMetric('FunctionExecutionUnits', functionId, startTime, endTime),
        this.getAzureMetric('Http5xx', functionId, startTime, endTime),
        this.getAzureMetric('Http429', functionId, startTime, endTime),
        this.getAzureMetric('CurrentAssemblies', functionId, startTime, endTime),
        this.getColdStartMetrics(functionId, startTime, endTime)
      ]);

      const costMetrics = await this.calculateCostMetrics(functionId, startTime, endTime);

      return {
        invocations,
        duration,
        errors,
        throttles,
        deadLetterErrors: await this.getAzureMetric('DeadLetterQueue', functionId, startTime, endTime),
        iteratorAge: await this.getAzureMetric('IteratorAge', functionId, startTime, endTime),
        concurrentExecutions,
        unreservedConcurrentExecutions: concurrentExecutions, // Azure doesn't have reserved concurrency
        provisionedConcurrencyInvocations: await this.getAzureMetric('ProvisionedConcurrencyInvocations', functionId, startTime, endTime),
        provisionedConcurrencySpilloverInvocations: await this.getAzureMetric('ProvisionedConcurrencySpillover', functionId, startTime, endTime),
        coldStarts,
        warmStarts: await this.getWarmStartMetrics(functionId, startTime, endTime),
        memoryUtilization: await this.getMemoryUtilizationMetrics(functionId, startTime, endTime),
        costMetrics
      };
    } catch (error) {
      throw new Error(`Failed to get metrics for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async listFunctions(filters?: ServerlessFunctionFilters): Promise<ServerlessFunctionInfo[]> {
    try {
      const functions = await this.listAzureFunctions(filters);
      return functions;
    } catch (error) {
      throw new Error(`Failed to list functions: ${(error as Error).message}`);
    }
  }

  async createAlias(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult> {
    try {
      // Azure Functions uses deployment slots instead of aliases
      const result = await this.createDeploymentSlot(functionId, alias);
      return result;
    } catch (error) {
      throw new Error(`Failed to create alias for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async updateAlias(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult> {
    try {
      const result = await this.updateDeploymentSlot(functionId, aliasName, config);
      return result;
    } catch (error) {
      throw new Error(`Failed to update alias ${aliasName} for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async deleteAlias(functionId: string, aliasName: string): Promise<void> {
    try {
      await this.deleteDeploymentSlot(functionId, aliasName);
    } catch (error) {
      throw new Error(`Failed to delete alias ${aliasName} for function ${functionId}: ${(error as Error).message}`);
    }
  }

  // Private Azure Functions specific methods
  private async ensureFunctionAppExists(config: AzureFunctionConfig): Promise<void> {
    // Mock implementation - ensure Function App exists
    // In real implementation, this would create the Function App if it doesn't exist
  }

  private async prepareDeploymentPackage(code: any): Promise<any> {
    // Mock implementation - prepare deployment package for Azure Functions
    return {
      type: code.type,
      size: 1024 * 1024, // 1MB mock size
      sha256: 'mock-azure-sha256-hash',
      location: code.source
    };
  }

  private async deployAzureFunction(functionName: string, config: AzureFunctionConfig, deploymentPackage: any): Promise<string> {
    // Mock implementation - deploy function to Azure
    return `${config.resourceGroup}/${config.functionApp}/${functionName}`;
  }

  private async configureFunctionSettings(functionId: string, config: AzureFunctionConfig): Promise<void> {
    // Mock implementation - configure function settings
  }

  private async updateFunctionCode(functionId: string, deploymentPackage: any): Promise<void> {
    // Mock implementation - update function code
  }

  private async updateFunctionConfiguration(functionId: string, config: ServerlessFunctionUpdateConfig): Promise<void> {
    // Mock implementation - update function configuration
  }

  private async deleteAzureFunction(functionId: string): Promise<void> {
    // Mock implementation - delete Azure function
  }

  private async invokeAzureFunction(functionId: string, payload?: any): Promise<any> {
    // Mock implementation - invoke Azure function
    return {
      statusCode: 200,
      body: { result: 'success', input: payload },
      requestId: 'mock-azure-request-id',
      memoryUsed: 64,
      maxMemoryUsed: 128,
      logs: ['Function started', 'Processing request', 'Function completed']
    };
  }

  private async getFunctionInfo(functionId: string): Promise<ServerlessFunctionInfo> {
    // Mock implementation - get function info from Azure
    const [resourceGroup, functionApp, functionName] = functionId.split('/');
    
    return {
      functionName,
      functionArn: this.buildFunctionArn({ resourceGroup, functionApp } as AzureFunctionConfig, functionName),
      runtime: 'node',
      role: 'Contributor',
      handler: 'index.js',
      codeSize: 1024 * 1024,
      description: 'Mock Azure function',
      timeout: 300, // Azure default is 5 minutes
      memorySize: 1536, // Azure default
      lastModified: new Date(),
      codeSha256: 'mock-azure-sha256',
      version: '1.0',
      revisionId: 'mock-azure-revision-id',
      packageType: 'Zip',
      state: 'Active',
      lastUpdateStatus: 'Successful'
    };
  }

  private async getApplicationInsightsLogs(functionId: string, options?: ServerlessLogOptions): Promise<string[]> {
    // Mock implementation - get logs from Application Insights
    return [
      this.formatLogEntry(new Date(), 'INFO', 'Function started', 'req-azure-123'),
      this.formatLogEntry(new Date(), 'INFO', 'Processing request', 'req-azure-123'),
      this.formatLogEntry(new Date(), 'INFO', 'Function completed', 'req-azure-123')
    ];
  }

  private async getAzureMetric(
    metricName: string,
    functionId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ServerlessMetricData> {
    // Mock implementation - get metrics from Azure Monitor
    const mockValue = Math.random() * 100;
    const dataPoints: ServerlessMetricDataPoint[] = [];
    
    // Generate mock data points
    const interval = (endTime.getTime() - startTime.getTime()) / 10;
    for (let i = 0; i < 10; i++) {
      dataPoints.push({
        timestamp: new Date(startTime.getTime() + i * interval),
        value: mockValue + (Math.random() - 0.5) * 20,
        unit: this.getAzureMetricUnit(metricName)
      });
    }

    return {
      value: mockValue,
      unit: this.getAzureMetricUnit(metricName),
      timestamp: new Date(),
      statistics: {
        average: mockValue,
        maximum: mockValue * 1.5,
        minimum: mockValue * 0.5,
        sum: mockValue * 10,
        sampleCount: 10
      },
      dataPoints
    };
  }

  private async getColdStartMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessMetricData> {
    // Mock implementation - calculate cold start metrics for Azure
    return this.getAzureMetric('ColdStarts', functionId, startTime, endTime);
  }

  private async getWarmStartMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessMetricData> {
    // Mock implementation - calculate warm start metrics for Azure
    return this.getAzureMetric('WarmStarts', functionId, startTime, endTime);
  }

  private async getMemoryUtilizationMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessMetricData> {
    // Mock implementation - calculate memory utilization for Azure
    return this.getAzureMetric('MemoryWorkingSet', functionId, startTime, endTime);
  }

  private async calculateCostMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessCostMetrics> {
    // Mock implementation - calculate cost metrics for Azure Functions
    const executions = 1000;
    const averageDuration = 200; // ms
    const memorySize = 1536; // MB (Azure default)
    
    // Azure Functions pricing: $0.20 per million executions + $0.000016 per GB-s
    const executionCost = (executions / 1000000) * 0.20;
    const computeCost = (executions * averageDuration * memorySize / 1024) / 1000 * 0.000016;
    const totalCost = executionCost + computeCost;
    
    return {
      totalCost,
      requestCost: executionCost,
      durationCost: computeCost,
      memoryCost: 0,
      storageCost: 0,
      dataCost: 0,
      currency: 'USD',
      period: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      breakdown: [
        {
          service: 'Function Executions',
          cost: executionCost,
          percentage: (executionCost / totalCost) * 100,
          details: { executions }
        },
        {
          service: 'Function Compute',
          cost: computeCost,
          percentage: (computeCost / totalCost) * 100,
          details: { 'gb-seconds': (executions * averageDuration * memorySize) / (1000 * 1024) }
        }
      ]
    };
  }

  private async listAzureFunctions(filters?: ServerlessFunctionFilters): Promise<ServerlessFunctionInfo[]> {
    // Mock implementation - list Azure functions
    const mockFunction = await this.getFunctionInfo('mock-rg/mock-app/mock-function');
    return [mockFunction];
  }

  private async createDeploymentSlot(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult> {
    // Mock implementation - create deployment slot (Azure's equivalent of alias)
    const [resourceGroup, functionApp, functionName] = functionId.split('/');
    
    return {
      aliasArn: this.buildFunctionArn({ resourceGroup, functionApp } as AzureFunctionConfig, `${functionName}-${alias.name}`),
      name: alias.name,
      functionVersion: alias.functionVersion,
      description: alias.description,
      revisionId: 'mock-azure-revision-id'
    };
  }

  private async updateDeploymentSlot(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult> {
    // Mock implementation - update deployment slot
    const [resourceGroup, functionApp, functionName] = functionId.split('/');
    
    return {
      aliasArn: this.buildFunctionArn({ resourceGroup, functionApp } as AzureFunctionConfig, `${functionName}-${aliasName}`),
      name: aliasName,
      functionVersion: config.functionVersion || '1',
      description: config.description,
      revisionId: 'updated-azure-revision-id'
    };
  }

  private async deleteDeploymentSlot(functionId: string, aliasName: string): Promise<void> {
    // Mock implementation - delete deployment slot
  }

  private buildFunctionArn(config: AzureFunctionConfig, functionName: string): string {
    return `/subscriptions/${this.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.Web/sites/${config.functionApp}/functions/${functionName}`;
  }

  private mapAzureStateToServerlessState(azureState: string): 'Pending' | 'Active' | 'Inactive' | 'Failed' | 'Updating' {
    switch (azureState.toLowerCase()) {
      case 'running': return 'Active';
      case 'stopped': return 'Inactive';
      case 'starting': return 'Pending';
      case 'stopping': return 'Updating';
      case 'error': return 'Failed';
      default: return 'Active';
    }
  }

  private mapAzureUpdateStatusToServerlessStatus(azureStatus: string): 'Successful' | 'Failed' | 'InProgress' {
    switch (azureStatus.toLowerCase()) {
      case 'succeeded': return 'Successful';
      case 'failed': return 'Failed';
      case 'inprogress': return 'InProgress';
      case 'running': return 'InProgress';
      default: return 'Successful';
    }
  }

  private getAzureMetricUnit(metricName: string): string {
    const unitMap: Record<string, string> = {
      'FunctionExecutionCount': 'Count',
      'FunctionExecutionUnits': 'Count',
      'Http5xx': 'Count',
      'Http429': 'Count',
      'CurrentAssemblies': 'Count',
      'DeadLetterQueue': 'Count',
      'IteratorAge': 'Milliseconds',
      'ProvisionedConcurrencyInvocations': 'Count',
      'ProvisionedConcurrencySpillover': 'Count',
      'ColdStarts': 'Count',
      'WarmStarts': 'Count',
      'MemoryWorkingSet': 'Bytes'
    };
    
    return unitMap[metricName] || 'None';
  }
}