/**
 * Google Cloud Functions ServerlessManager implementation
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
  GoogleCloudFunctionConfig,
  ServerlessMetricData,
  ServerlessMetricDataPoint,
  ServerlessCostMetrics,
  ServerlessCostBreakdown
} from '../types/serverless-types';

export class GoogleCloudFunctionsManager extends BaseServerlessManager {
  private readonly projectId: string;
  private readonly keyFilename?: string;
  private readonly credentials?: any;

  constructor(
    projectId: string,
    region: string,
    keyFilename?: string,
    credentials?: any,
    config: Record<string, any> = {}
  ) {
    super('gcp', region, config);
    this.projectId = projectId;
    this.keyFilename = keyFilename;
    this.credentials = credentials;
  }

  async deployFunction(config: ServerlessFunctionConfig): Promise<ServerlessDeploymentResult> {
    try {
      this.validateFunctionConfig(config);
      this.validateCodeConfig(config.code);
      
      const gcpConfig = config as GoogleCloudFunctionConfig;
      const functionName = this.sanitizeFunctionName(config.name);
      
      // Prepare deployment package
      const deploymentPackage = await this.prepareDeploymentPackage(config.code);
      
      // Deploy function
      const functionId = await this.deployGCPFunction(functionName, gcpConfig, deploymentPackage);
      
      // Configure function settings
      await this.configureFunctionSettings(functionId, gcpConfig);
      
      // Wait for deployment to complete
      await this.waitForFunctionActive(functionId);
      
      // Get final status
      const status = await this.getFunctionStatus(functionId);
      const functionArn = this.buildFunctionArn(gcpConfig, functionName);
      
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
        await this.deleteGCPFunction(functionId);
      });
    } catch (error) {
      throw new Error(`Failed to delete function ${functionId}: ${(error as Error).message}`);
    }
  }

  async invokeFunction(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    try {
      const startTime = Date.now();
      const result = await this.invokeGCPFunction(functionId, payload);
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        success: result.status >= 200 && result.status < 300,
        statusCode: result.status,
        payload: result.data,
        logs: result.logs || [],
        duration,
        billedDuration: Math.ceil(duration / 100) * 100, // GCP bills in 100ms increments
        memoryUsed: result.memoryUsed || 0,
        maxMemoryUsed: result.maxMemoryUsed || 0,
        requestId: result.executionId || '',
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
        state: this.mapGCPStateToServerlessState(functionInfo.state || 'Active'),
        stateReason: functionInfo.stateReason,
        stateReasonCode: functionInfo.stateReasonCode,
        lastUpdateStatus: this.mapGCPUpdateStatusToServerlessStatus(functionInfo.lastUpdateStatus || 'Successful'),
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
      const logs = await this.getCloudLoggingLogs(functionId, options);
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
        this.getGCPMetric('cloudfunctions.googleapis.com/function/executions', functionId, startTime, endTime),
        this.getGCPMetric('cloudfunctions.googleapis.com/function/execution_times', functionId, startTime, endTime),
        this.getGCPMetric('cloudfunctions.googleapis.com/function/user_memory_bytes', functionId, startTime, endTime),
        this.getGCPMetric('cloudfunctions.googleapis.com/function/network_egress', functionId, startTime, endTime),
        this.getGCPMetric('cloudfunctions.googleapis.com/function/active_instances', functionId, startTime, endTime),
        this.getColdStartMetrics(functionId, startTime, endTime)
      ]);

      const costMetrics = await this.calculateCostMetrics(functionId, startTime, endTime);

      return {
        invocations,
        duration,
        errors,
        throttles,
        deadLetterErrors: await this.getGCPMetric('cloudfunctions.googleapis.com/function/dead_letter_queue', functionId, startTime, endTime),
        iteratorAge: await this.getGCPMetric('cloudfunctions.googleapis.com/function/iterator_age', functionId, startTime, endTime),
        concurrentExecutions,
        unreservedConcurrentExecutions: concurrentExecutions, // GCP doesn't have reserved concurrency
        provisionedConcurrencyInvocations: await this.getGCPMetric('cloudfunctions.googleapis.com/function/provisioned_concurrency_invocations', functionId, startTime, endTime),
        provisionedConcurrencySpilloverInvocations: await this.getGCPMetric('cloudfunctions.googleapis.com/function/provisioned_concurrency_spillover', functionId, startTime, endTime),
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
      const functions = await this.listGCPFunctions(filters);
      return functions;
    } catch (error) {
      throw new Error(`Failed to list functions: ${(error as Error).message}`);
    }
  }

  async createAlias(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult> {
    try {
      // GCP uses traffic splitting instead of aliases
      const result = await this.createTrafficSplit(functionId, alias);
      return result;
    } catch (error) {
      throw new Error(`Failed to create alias for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async updateAlias(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult> {
    try {
      const result = await this.updateTrafficSplit(functionId, aliasName, config);
      return result;
    } catch (error) {
      throw new Error(`Failed to update alias ${aliasName} for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async deleteAlias(functionId: string, aliasName: string): Promise<void> {
    try {
      await this.deleteTrafficSplit(functionId, aliasName);
    } catch (error) {
      throw new Error(`Failed to delete alias ${aliasName} for function ${functionId}: ${(error as Error).message}`);
    }
  }

  // Private Google Cloud Functions specific methods
  private async prepareDeploymentPackage(code: any): Promise<any> {
    // Mock implementation - prepare deployment package for GCP Functions
    return {
      type: code.type,
      size: 1024 * 1024, // 1MB mock size
      sha256: 'mock-gcp-sha256-hash',
      location: code.source
    };
  }

  private async deployGCPFunction(functionName: string, config: GoogleCloudFunctionConfig, deploymentPackage: any): Promise<string> {
    // Mock implementation - deploy function to GCP
    return `projects/${this.projectId}/locations/${this.region}/functions/${functionName}`;
  }

  private async configureFunctionSettings(functionId: string, config: GoogleCloudFunctionConfig): Promise<void> {
    // Mock implementation - configure function settings
  }

  private async updateFunctionCode(functionId: string, deploymentPackage: any): Promise<void> {
    // Mock implementation - update function code
  }

  private async updateFunctionConfiguration(functionId: string, config: ServerlessFunctionUpdateConfig): Promise<void> {
    // Mock implementation - update function configuration
  }

  private async deleteGCPFunction(functionId: string): Promise<void> {
    // Mock implementation - delete GCP function
  }

  private async invokeGCPFunction(functionId: string, payload?: any): Promise<any> {
    // Mock implementation - invoke GCP function
    return {
      status: 200,
      data: { result: 'success', input: payload },
      executionId: 'mock-gcp-execution-id',
      memoryUsed: 64,
      maxMemoryUsed: 256,
      logs: ['Function started', 'Processing request', 'Function completed']
    };
  }

  private async getFunctionInfo(functionId: string): Promise<ServerlessFunctionInfo> {
    // Mock implementation - get function info from GCP
    const functionName = functionId.split('/').pop() || 'unknown';
    
    return {
      functionName,
      functionArn: functionId,
      runtime: 'nodejs18',
      role: 'roles/cloudfunctions.invoker',
      handler: 'main',
      codeSize: 1024 * 1024,
      description: 'Mock GCP function',
      timeout: 60, // GCP default is 60 seconds
      memorySize: 256, // GCP default is 256MB
      lastModified: new Date(),
      codeSha256: 'mock-gcp-sha256',
      version: '1',
      revisionId: 'mock-gcp-revision-id',
      packageType: 'Zip',
      state: 'Active',
      lastUpdateStatus: 'Successful'
    };
  }

  private async getCloudLoggingLogs(functionId: string, options?: ServerlessLogOptions): Promise<string[]> {
    // Mock implementation - get logs from Cloud Logging
    return [
      this.formatLogEntry(new Date(), 'INFO', 'Function started', 'req-gcp-123'),
      this.formatLogEntry(new Date(), 'INFO', 'Processing request', 'req-gcp-123'),
      this.formatLogEntry(new Date(), 'INFO', 'Function completed', 'req-gcp-123')
    ];
  }

  private async getGCPMetric(
    metricType: string,
    functionId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ServerlessMetricData> {
    // Mock implementation - get metrics from Cloud Monitoring
    const mockValue = Math.random() * 100;
    const dataPoints: ServerlessMetricDataPoint[] = [];
    
    // Generate mock data points
    const interval = (endTime.getTime() - startTime.getTime()) / 10;
    for (let i = 0; i < 10; i++) {
      dataPoints.push({
        timestamp: new Date(startTime.getTime() + i * interval),
        value: mockValue + (Math.random() - 0.5) * 20,
        unit: this.getGCPMetricUnit(metricType)
      });
    }

    return {
      value: mockValue,
      unit: this.getGCPMetricUnit(metricType),
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
    // Mock implementation - calculate cold start metrics for GCP
    return this.getGCPMetric('cloudfunctions.googleapis.com/function/cold_starts', functionId, startTime, endTime);
  }

  private async getWarmStartMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessMetricData> {
    // Mock implementation - calculate warm start metrics for GCP
    return this.getGCPMetric('cloudfunctions.googleapis.com/function/warm_starts', functionId, startTime, endTime);
  }

  private async getMemoryUtilizationMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessMetricData> {
    // Mock implementation - calculate memory utilization for GCP
    return this.getGCPMetric('cloudfunctions.googleapis.com/function/user_memory_bytes', functionId, startTime, endTime);
  }

  private async calculateCostMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessCostMetrics> {
    // Mock implementation - calculate cost metrics for GCP Functions
    const invocations = 1000;
    const averageDuration = 150; // ms
    const memorySize = 256; // MB (GCP default)
    
    // GCP Functions pricing: $0.40 per million invocations + $0.0000025 per GB-second
    const invocationCost = (invocations / 1000000) * 0.40;
    const computeCost = (invocations * averageDuration * memorySize / 1024) / 1000 * 0.0000025;
    const totalCost = invocationCost + computeCost;
    
    return {
      totalCost,
      requestCost: invocationCost,
      durationCost: computeCost,
      memoryCost: 0,
      storageCost: 0,
      dataCost: 0,
      currency: 'USD',
      period: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      breakdown: [
        {
          service: 'Function Invocations',
          cost: invocationCost,
          percentage: (invocationCost / totalCost) * 100,
          details: { invocations }
        },
        {
          service: 'Function Compute',
          cost: computeCost,
          percentage: (computeCost / totalCost) * 100,
          details: { 'gb-seconds': (invocations * averageDuration * memorySize) / (1000 * 1024) }
        }
      ]
    };
  }

  private async listGCPFunctions(filters?: ServerlessFunctionFilters): Promise<ServerlessFunctionInfo[]> {
    // Mock implementation - list GCP functions
    const mockFunction = await this.getFunctionInfo(`projects/${this.projectId}/locations/${this.region}/functions/mock-function`);
    return [mockFunction];
  }

  private async createTrafficSplit(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult> {
    // Mock implementation - create traffic split (GCP's equivalent of alias)
    return {
      aliasArn: `${functionId}:${alias.name}`,
      name: alias.name,
      functionVersion: alias.functionVersion,
      description: alias.description,
      revisionId: 'mock-gcp-revision-id'
    };
  }

  private async updateTrafficSplit(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult> {
    // Mock implementation - update traffic split
    return {
      aliasArn: `${functionId}:${aliasName}`,
      name: aliasName,
      functionVersion: config.functionVersion || '1',
      description: config.description,
      revisionId: 'updated-gcp-revision-id'
    };
  }

  private async deleteTrafficSplit(functionId: string, aliasName: string): Promise<void> {
    // Mock implementation - delete traffic split
  }

  private buildFunctionArn(config: GoogleCloudFunctionConfig, functionName: string): string {
    return `projects/${config.project}/locations/${config.region}/functions/${functionName}`;
  }

  private mapGCPStateToServerlessState(gcpState: string): 'Pending' | 'Active' | 'Inactive' | 'Failed' | 'Updating' {
    switch (gcpState.toLowerCase()) {
      case 'active': return 'Active';
      case 'offline': return 'Inactive';
      case 'deploy_in_progress': return 'Pending';
      case 'delete_in_progress': return 'Updating';
      case 'cloud_function_status_unspecified': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Active';
    }
  }

  private mapGCPUpdateStatusToServerlessStatus(gcpStatus: string): 'Successful' | 'Failed' | 'InProgress' {
    switch (gcpStatus.toLowerCase()) {
      case 'successful': return 'Successful';
      case 'failed': return 'Failed';
      case 'in_progress': return 'InProgress';
      case 'deploy_in_progress': return 'InProgress';
      default: return 'Successful';
    }
  }

  private getGCPMetricUnit(metricType: string): string {
    const unitMap: Record<string, string> = {
      'cloudfunctions.googleapis.com/function/executions': 'Count',
      'cloudfunctions.googleapis.com/function/execution_times': 'Milliseconds',
      'cloudfunctions.googleapis.com/function/user_memory_bytes': 'Bytes',
      'cloudfunctions.googleapis.com/function/network_egress': 'Bytes',
      'cloudfunctions.googleapis.com/function/active_instances': 'Count',
      'cloudfunctions.googleapis.com/function/dead_letter_queue': 'Count',
      'cloudfunctions.googleapis.com/function/iterator_age': 'Milliseconds',
      'cloudfunctions.googleapis.com/function/provisioned_concurrency_invocations': 'Count',
      'cloudfunctions.googleapis.com/function/provisioned_concurrency_spillover': 'Count',
      'cloudfunctions.googleapis.com/function/cold_starts': 'Count',
      'cloudfunctions.googleapis.com/function/warm_starts': 'Count'
    };
    
    return unitMap[metricType] || 'None';
  }
}