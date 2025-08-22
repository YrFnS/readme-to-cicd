import { Logger } from '../../cli/lib/logger';
import { ErrorHandler } from '../../cli/lib/error-handler';

export interface CLIIntegrationConfig {
  enableCaching?: boolean;
  maxConcurrentOperations?: number;
  timeoutMs?: number;
  logger?: Logger;
  errorHandler?: ErrorHandler;
}

export interface CLICommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export interface WorkflowGenerationOptions {
  workflowType?: string[];
  outputDir?: string;
  dryRun?: boolean;
  includeComments?: boolean;
  securityLevel?: 'basic' | 'standard' | 'advanced';
  optimizationLevel?: 'basic' | 'standard' | 'advanced';
}

export interface CLIAnalysisResult {
  success: boolean;
  workflows: any[];
  errors: string[];
  warnings: string[];
  performance: {
    parsingTime: number;
    detectionTime: number;
    generationTime: number;
    totalTime: number;
  };
}