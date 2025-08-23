/**
 * Base ServerlessManager implementation with common functionality
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
  ServerlessCodeConfig,
  ServerlessDeploymentPackageInfo
} from '../types/serverless-types';

export abstract class BaseServerlessManager implements ServerlessManager {
  protected readonly provider: string;
  protected readonly region: string;
  protected readonly config: Record<string, any>;

  constructor(provider: string, region: string, config: Record<string, any> = {}) {
    this.provider = provider;
    this.region = region;
    this.config = config;
  }

  // Abstract methods that must be implemented by provider-specific managers
  abstract deployFunction(config: ServerlessFunctionConfig): Promise<ServerlessDeploymentResult>;
  abstract updateFunction(functionId: string, config: ServerlessFunctionUpdateConfig): Promise<ServerlessDeploymentResult>;
  abstract deleteFunction(functionId: string): Promise<void>;
  abstract invokeFunction(functionId: string, payload?: any): Promise<ServerlessInvocationResult>;
  abstract getFunctionStatus(functionId: string): Promise<ServerlessFunctionStatus>;
  abstract getFunctionLogs(functionId: string, options?: ServerlessLogOptions): Promise<string[]>;
  abstract getFunctionMetrics(functionId: string, timeRange?: TimeRange): Promise<ServerlessFunctionMetrics>;
  abstract listFunctions(filters?: ServerlessFunctionFilters): Promise<ServerlessFunctionInfo[]>;
  abstract createAlias(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult>;
  abstract updateAlias(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult>;
  abstract deleteAlias(functionId: string, aliasName: string): Promise<void>;

  // Common utility methods
  protected validateFunctionConfig(config: ServerlessFunctionConfig): void {
    if (!config.name) {
      throw new Error('Function name is required');
    }
    if (!config.runtime) {
      throw new Error('Function runtime is required');
    }
    if (!config.handler) {
      throw new Error('Function handler is required');
    }
    if (!config.code) {
      throw new Error('Function code configuration is required');
    }
    if (config.timeout < 1 || config.timeout > 900) {
      throw new Error('Function timeout must be between 1 and 900 seconds');
    }
    if (config.memorySize < 128 || config.memorySize > 10240) {
      throw new Error('Function memory size must be between 128 and 10240 MB');
    }
  }

  protected validateCodeConfig(code: ServerlessCodeConfig): void {
    if (!code.type) {
      throw new Error('Code type is required');
    }
    if (!code.source) {
      throw new Error('Code source is required');
    }

    switch (code.type) {
      case 'zip':
        if (!code.zipFile && !code.source) {
          throw new Error('Zip file or source path is required for zip deployment');
        }
        break;
      case 's3':
        if (!code.s3Bucket || !code.s3Key) {
          throw new Error('S3 bucket and key are required for S3 deployment');
        }
        break;
      case 'image':
        if (!code.imageUri) {
          throw new Error('Image URI is required for image deployment');
        }
        break;
      case 'inline':
        if (!code.source) {
          throw new Error('Inline code source is required');
        }
        break;
      default:
        throw new Error(`Unsupported code type: ${code.type}`);
    }
  }

  protected generateFunctionId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${name}-${timestamp}-${random}`;
  }

  protected createDeploymentPackageInfo(
    type: 'zip' | 'image',
    size: number,
    sha256: string,
    location?: string
  ): ServerlessDeploymentPackageInfo {
    return {
      type,
      size,
      sha256,
      location,
      uploadUrl: location ? `${location}/upload` : undefined,
      downloadUrl: location ? `${location}/download` : undefined
    };
  }

  protected calculateCostEstimate(
    invocations: number,
    averageDuration: number,
    memorySize: number
  ): number {
    // Basic cost calculation (AWS Lambda pricing as baseline)
    const requestCost = invocations * 0.0000002; // $0.20 per 1M requests
    const computeCost = (invocations * averageDuration * memorySize / 1024) * 0.0000166667; // $0.0000166667 per GB-second
    return requestCost + computeCost;
  }

  protected formatLogEntry(timestamp: Date, level: string, message: string, requestId?: string): string {
    const timestampStr = timestamp.toISOString();
    const requestIdStr = requestId ? `[${requestId}]` : '';
    return `${timestampStr} ${level.toUpperCase()} ${requestIdStr} ${message}`;
  }

  protected parseLogEntry(logEntry: string): { timestamp: Date; level: string; message: string; requestId?: string } {
    const regex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(\w+)\s*(?:\[([^\]]+)\])?\s+(.+)$/;
    const match = logEntry.match(regex);
    
    if (!match) {
      return {
        timestamp: new Date(),
        level: 'INFO',
        message: logEntry
      };
    }

    return {
      timestamp: new Date(match[1]),
      level: match[2].toLowerCase(),
      message: match[4],
      requestId: match[3]
    };
  }

  protected sanitizeFunctionName(name: string): string {
    // Remove invalid characters and ensure valid length
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 64);
  }

  protected validateTimeout(timeout: number, maxTimeout: number = 900): void {
    if (timeout < 1 || timeout > maxTimeout) {
      throw new Error(`Timeout must be between 1 and ${maxTimeout} seconds`);
    }
  }

  protected validateMemorySize(memorySize: number, minMemory: number = 128, maxMemory: number = 10240): void {
    if (memorySize < minMemory || memorySize > maxMemory) {
      throw new Error(`Memory size must be between ${minMemory} and ${maxMemory} MB`);
    }
  }

  protected createDefaultEnvironment(): Record<string, string> {
    return {
      NODE_ENV: 'production',
      SERVERLESS_PROVIDER: this.provider,
      SERVERLESS_REGION: this.region,
      DEPLOYMENT_TIMESTAMP: new Date().toISOString()
    };
  }

  protected mergeEnvironmentVariables(
    defaultEnv: Record<string, string>,
    userEnv: Record<string, string>
  ): Record<string, string> {
    return { ...defaultEnv, ...userEnv };
  }

  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  protected isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ThrottlingException',
      'ServiceUnavailableException',
      'InternalServerError',
      'RequestTimeout',
      'TooManyRequestsException'
    ];
    
    return retryableErrors.some(errorType => 
      error.name === errorType || error.message.includes(errorType)
    );
  }

  protected async waitForFunctionActive(
    functionId: string,
    maxWaitTime: number = 300000, // 5 minutes
    pollInterval: number = 5000 // 5 seconds
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getFunctionStatus(functionId);
      
      if (status.state === 'Active') {
        return;
      }
      
      if (status.state === 'Failed') {
        throw new Error(`Function deployment failed: ${status.stateReason}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Function did not become active within ${maxWaitTime}ms`);
  }

  protected createErrorResult(
    functionId: string,
    error: Error,
    status?: ServerlessFunctionStatus
  ): ServerlessDeploymentResult {
    return {
      success: false,
      functionId,
      functionArn: '',
      version: '0',
      status: status || {
        state: 'Failed',
        stateReason: error.message,
        lastUpdateStatus: 'Failed',
        lastUpdateStatusReason: error.message,
        lastModified: new Date(),
        codeSize: 0,
        codeSha256: '',
        version: '0',
        revisionId: ''
      },
      message: error.message,
      timestamp: new Date()
    };
  }

  protected createSuccessResult(
    functionId: string,
    functionArn: string,
    version: string,
    status: ServerlessFunctionStatus,
    deploymentPackage?: ServerlessDeploymentPackageInfo
  ): ServerlessDeploymentResult {
    return {
      success: true,
      functionId,
      functionArn,
      version,
      status,
      message: 'Function deployed successfully',
      timestamp: new Date(),
      deploymentPackage
    };
  }
}