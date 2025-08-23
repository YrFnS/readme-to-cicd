/**
 * AWS Lambda ServerlessManager implementation
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
  AWSLambdaConfig,
  ServerlessMetricData,
  ServerlessMetricStatistics,
  ServerlessMetricDataPoint,
  ServerlessCostMetrics,
  ServerlessCostBreakdown,
  ServerlessConcurrencyMetrics
} from '../types/serverless-types';

export class AWSLambdaManager extends BaseServerlessManager {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly sessionToken?: string;

  constructor(
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    sessionToken?: string,
    config: Record<string, any> = {}
  ) {
    super('aws', region, config);
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sessionToken = sessionToken;
  }

  async deployFunction(config: ServerlessFunctionConfig): Promise<ServerlessDeploymentResult> {
    try {
      this.validateFunctionConfig(config);
      this.validateCodeConfig(config.code);
      
      const awsConfig = config as AWSLambdaConfig;
      const functionName = this.sanitizeFunctionName(config.name);
      
      // Prepare deployment package
      const deploymentPackage = await this.prepareDeploymentPackage(config.code);
      
      // Create or update function
      const functionArn = await this.createOrUpdateFunction(functionName, awsConfig, deploymentPackage);
      
      // Configure additional settings
      await this.configureFunctionSettings(functionName, awsConfig);
      
      // Wait for function to become active
      await this.waitForFunctionActive(functionName);
      
      // Get final status
      const status = await this.getFunctionStatus(functionName);
      
      return this.createSuccessResult(
        functionName,
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
        await this.deleteLambdaFunction(functionId);
      });
    } catch (error) {
      throw new Error(`Failed to delete function ${functionId}: ${(error as Error).message}`);
    }
  }

  async invokeFunction(functionId: string, payload?: any): Promise<ServerlessInvocationResult> {
    try {
      const startTime = Date.now();
      const result = await this.invokeLambdaFunction(functionId, payload);
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        success: !result.errorMessage,
        statusCode: result.statusCode || 200,
        payload: result.payload,
        logs: result.logResult ? [result.logResult] : [],
        duration,
        billedDuration: result.billedDuration || duration,
        memoryUsed: result.memoryUsed || 0,
        maxMemoryUsed: result.maxMemoryUsed || 0,
        requestId: result.requestId || '',
        timestamp: new Date(),
        error: result.errorMessage ? {
          errorType: result.errorType || 'Unknown',
          errorMessage: result.errorMessage,
          stackTrace: result.stackTrace
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
        state: this.mapLambdaStateToServerlessState(functionInfo.state || 'Active'),
        stateReason: functionInfo.stateReason,
        stateReasonCode: functionInfo.stateReasonCode,
        lastUpdateStatus: this.mapLambdaUpdateStatusToServerlessStatus(functionInfo.lastUpdateStatus || 'Successful'),
        lastUpdateStatusReason: functionInfo.lastUpdateStatusReason,
        lastUpdateStatusReasonCode: functionInfo.lastUpdateStatusReasonCode,
        lastModified: functionInfo.lastModified,
        codeSize: functionInfo.codeSize,
        codeSha256: functionInfo.codeSha256,
        version: functionInfo.version,
        masterArn: functionInfo.masterArn,
        revisionId: functionInfo.revisionId
      };
    } catch (error) {
      throw new Error(`Failed to get function status for ${functionId}: ${(error as Error).message}`);
    }
  }

  async getFunctionLogs(functionId: string, options?: ServerlessLogOptions): Promise<string[]> {
    try {
      const logGroupName = `/aws/lambda/${functionId}`;
      const logs = await this.getCloudWatchLogs(logGroupName, options);
      return logs;
    } catch (error) {
      throw new Error(`Failed to get logs for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async getFunctionMetrics(functionId: string, timeRange?: TimeRange): Promise<ServerlessFunctionMetrics> {
    try {
      const endTime = timeRange?.end || new Date();
      const startTime = timeRange?.start || new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      const [
        invocations,
        duration,
        errors,
        throttles,
        deadLetterErrors,
        concurrentExecutions,
        coldStarts
      ] = await Promise.all([
        this.getCloudWatchMetric('AWS/Lambda', 'Invocations', functionId, startTime, endTime),
        this.getCloudWatchMetric('AWS/Lambda', 'Duration', functionId, startTime, endTime),
        this.getCloudWatchMetric('AWS/Lambda', 'Errors', functionId, startTime, endTime),
        this.getCloudWatchMetric('AWS/Lambda', 'Throttles', functionId, startTime, endTime),
        this.getCloudWatchMetric('AWS/Lambda', 'DeadLetterErrors', functionId, startTime, endTime),
        this.getCloudWatchMetric('AWS/Lambda', 'ConcurrentExecutions', functionId, startTime, endTime),
        this.getColdStartMetrics(functionId, startTime, endTime)
      ]);

      const costMetrics = await this.calculateCostMetrics(functionId, startTime, endTime);

      return {
        invocations,
        duration,
        errors,
        throttles,
        deadLetterErrors,
        iteratorAge: await this.getCloudWatchMetric('AWS/Lambda', 'IteratorAge', functionId, startTime, endTime),
        concurrentExecutions,
        unreservedConcurrentExecutions: await this.getCloudWatchMetric('AWS/Lambda', 'UnreservedConcurrentExecutions', functionId, startTime, endTime),
        provisionedConcurrencyInvocations: await this.getCloudWatchMetric('AWS/Lambda', 'ProvisionedConcurrencyInvocations', functionId, startTime, endTime),
        provisionedConcurrencySpilloverInvocations: await this.getCloudWatchMetric('AWS/Lambda', 'ProvisionedConcurrencySpilloverInvocations', functionId, startTime, endTime),
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
      const functions = await this.listLambdaFunctions(filters);
      return functions;
    } catch (error) {
      throw new Error(`Failed to list functions: ${(error as Error).message}`);
    }
  }

  async createAlias(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult> {
    try {
      const result = await this.createLambdaAlias(functionId, alias);
      return result;
    } catch (error) {
      throw new Error(`Failed to create alias for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async updateAlias(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult> {
    try {
      const result = await this.updateLambdaAlias(functionId, aliasName, config);
      return result;
    } catch (error) {
      throw new Error(`Failed to update alias ${aliasName} for function ${functionId}: ${(error as Error).message}`);
    }
  }

  async deleteAlias(functionId: string, aliasName: string): Promise<void> {
    try {
      await this.deleteLambdaAlias(functionId, aliasName);
    } catch (error) {
      throw new Error(`Failed to delete alias ${aliasName} for function ${functionId}: ${(error as Error).message}`);
    }
  }

  // Private AWS Lambda specific methods
  private async prepareDeploymentPackage(code: any): Promise<any> {
    // Mock implementation - in real implementation, this would:
    // 1. Create ZIP file from source code
    // 2. Upload to S3 if needed
    // 3. Return deployment package info
    return {
      type: code.type,
      size: 1024 * 1024, // 1MB mock size
      sha256: 'mock-sha256-hash',
      location: code.source
    };
  }

  private async createOrUpdateFunction(functionName: string, config: AWSLambdaConfig, deploymentPackage: any): Promise<string> {
    // Mock implementation - in real implementation, this would call AWS Lambda API
    const functionArn = `arn:aws:lambda:${this.region}:123456789012:function:${functionName}`;
    return functionArn;
  }

  private async configureFunctionSettings(functionName: string, config: AWSLambdaConfig): Promise<void> {
    // Mock implementation - configure VPC, environment variables, etc.
  }

  private async updateFunctionCode(functionId: string, deploymentPackage: any): Promise<void> {
    // Mock implementation - update function code
  }

  private async updateFunctionConfiguration(functionId: string, config: ServerlessFunctionUpdateConfig): Promise<void> {
    // Mock implementation - update function configuration
  }

  private async deleteLambdaFunction(functionId: string): Promise<void> {
    // Mock implementation - delete Lambda function
  }

  private async invokeLambdaFunction(functionId: string, payload?: any): Promise<any> {
    // Mock implementation - invoke Lambda function
    return {
      statusCode: 200,
      payload: { result: 'success', input: payload },
      requestId: 'mock-request-id',
      billedDuration: 100,
      memoryUsed: 64,
      maxMemoryUsed: 128
    };
  }

  private async getFunctionInfo(functionId: string): Promise<ServerlessFunctionInfo> {
    // Mock implementation - get function info from AWS Lambda
    return {
      functionName: functionId,
      functionArn: `arn:aws:lambda:${this.region}:123456789012:function:${functionId}`,
      runtime: 'nodejs18.x',
      role: 'arn:aws:iam::123456789012:role/lambda-role',
      handler: 'index.handler',
      codeSize: 1024 * 1024,
      description: 'Mock function',
      timeout: 30,
      memorySize: 128,
      lastModified: new Date(),
      codeSha256: 'mock-sha256',
      version: '$LATEST',
      revisionId: 'mock-revision-id',
      packageType: 'Zip',
      state: 'Active',
      lastUpdateStatus: 'Successful'
    };
  }

  private async getCloudWatchLogs(logGroupName: string, options?: ServerlessLogOptions): Promise<string[]> {
    // Mock implementation - get logs from CloudWatch
    return [
      this.formatLogEntry(new Date(), 'INFO', 'Function started', 'req-123'),
      this.formatLogEntry(new Date(), 'INFO', 'Processing request', 'req-123'),
      this.formatLogEntry(new Date(), 'INFO', 'Function completed', 'req-123')
    ];
  }

  private async getCloudWatchMetric(
    namespace: string,
    metricName: string,
    functionId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ServerlessMetricData> {
    // Mock implementation - get metrics from CloudWatch
    const mockValue = Math.random() * 100;
    const dataPoints: ServerlessMetricDataPoint[] = [];
    
    // Generate mock data points
    const interval = (endTime.getTime() - startTime.getTime()) / 10;
    for (let i = 0; i < 10; i++) {
      dataPoints.push({
        timestamp: new Date(startTime.getTime() + i * interval),
        value: mockValue + (Math.random() - 0.5) * 20,
        unit: this.getMetricUnit(metricName)
      });
    }

    return {
      value: mockValue,
      unit: this.getMetricUnit(metricName),
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
    // Mock implementation - calculate cold start metrics
    return this.getCloudWatchMetric('Custom/Lambda', 'ColdStarts', functionId, startTime, endTime);
  }

  private async getWarmStartMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessMetricData> {
    // Mock implementation - calculate warm start metrics
    return this.getCloudWatchMetric('Custom/Lambda', 'WarmStarts', functionId, startTime, endTime);
  }

  private async getMemoryUtilizationMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessMetricData> {
    // Mock implementation - calculate memory utilization
    return this.getCloudWatchMetric('Custom/Lambda', 'MemoryUtilization', functionId, startTime, endTime);
  }

  private async calculateCostMetrics(functionId: string, startTime: Date, endTime: Date): Promise<ServerlessCostMetrics> {
    // Mock implementation - calculate cost metrics
    const invocations = 1000;
    const averageDuration = 100; // ms
    const memorySize = 128; // MB
    
    const totalCost = this.calculateCostEstimate(invocations, averageDuration, memorySize);
    
    return {
      totalCost,
      requestCost: totalCost * 0.2,
      durationCost: totalCost * 0.8,
      memoryCost: 0,
      storageCost: 0,
      dataCost: 0,
      currency: 'USD',
      period: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      breakdown: [
        {
          service: 'Lambda Requests',
          cost: totalCost * 0.2,
          percentage: 20,
          details: { requests: invocations }
        },
        {
          service: 'Lambda Compute',
          cost: totalCost * 0.8,
          percentage: 80,
          details: { 'gb-seconds': (invocations * averageDuration * memorySize) / (1000 * 1024) }
        }
      ]
    };
  }

  private async listLambdaFunctions(filters?: ServerlessFunctionFilters): Promise<ServerlessFunctionInfo[]> {
    // Mock implementation - list Lambda functions
    const mockFunction = await this.getFunctionInfo('mock-function');
    return [mockFunction];
  }

  private async createLambdaAlias(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult> {
    // Mock implementation - create Lambda alias
    return {
      aliasArn: `arn:aws:lambda:${this.region}:123456789012:function:${functionId}:${alias.name}`,
      name: alias.name,
      functionVersion: alias.functionVersion,
      description: alias.description,
      routingConfig: alias.routingConfig,
      revisionId: 'mock-revision-id'
    };
  }

  private async updateLambdaAlias(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult> {
    // Mock implementation - update Lambda alias
    return {
      aliasArn: `arn:aws:lambda:${this.region}:123456789012:function:${functionId}:${aliasName}`,
      name: aliasName,
      functionVersion: config.functionVersion || '1',
      description: config.description,
      routingConfig: config.routingConfig,
      revisionId: 'updated-revision-id'
    };
  }

  private async deleteLambdaAlias(functionId: string, aliasName: string): Promise<void> {
    // Mock implementation - delete Lambda alias
  }

  private mapLambdaStateToServerlessState(lambdaState: string): 'Pending' | 'Active' | 'Inactive' | 'Failed' | 'Updating' {
    switch (lambdaState) {
      case 'Pending': return 'Pending';
      case 'Active': return 'Active';
      case 'Inactive': return 'Inactive';
      case 'Failed': return 'Failed';
      default: return 'Active';
    }
  }

  private mapLambdaUpdateStatusToServerlessStatus(lambdaStatus: string): 'Successful' | 'Failed' | 'InProgress' {
    switch (lambdaStatus) {
      case 'Successful': return 'Successful';
      case 'Failed': return 'Failed';
      case 'InProgress': return 'InProgress';
      default: return 'Successful';
    }
  }

  private getMetricUnit(metricName: string): string {
    const unitMap: Record<string, string> = {
      'Invocations': 'Count',
      'Duration': 'Milliseconds',
      'Errors': 'Count',
      'Throttles': 'Count',
      'DeadLetterErrors': 'Count',
      'IteratorAge': 'Milliseconds',
      'ConcurrentExecutions': 'Count',
      'UnreservedConcurrentExecutions': 'Count',
      'ProvisionedConcurrencyInvocations': 'Count',
      'ProvisionedConcurrencySpilloverInvocations': 'Count',
      'ColdStarts': 'Count',
      'WarmStarts': 'Count',
      'MemoryUtilization': 'Percent'
    };
    
    return unitMap[metricName] || 'None';
  }
}