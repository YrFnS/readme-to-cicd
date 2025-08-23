/**
 * ServerlessManager factory for creating provider-specific managers
 */

import { ServerlessManager } from '../types/serverless-types';
import { AWSLambdaManager } from './aws-lambda-manager';
import { AzureFunctionsManager } from './azure-functions-manager';
import { GoogleCloudFunctionsManager } from './google-cloud-functions-manager';

export interface ServerlessManagerConfig {
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  credentials: ProviderCredentials;
  config?: Record<string, any>;
}

export type ProviderCredentials = 
  | AWSCredentials
  | AzureCredentials
  | GCPCredentials;

export interface AWSCredentials {
  type: 'aws';
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface AzureCredentials {
  type: 'azure';
  subscriptionId: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface GCPCredentials {
  type: 'gcp';
  projectId: string;
  keyFilename?: string;
  credentials?: any;
}

export class ServerlessManagerFactory {
  /**
   * Create a ServerlessManager instance for the specified provider
   */
  static create(config: ServerlessManagerConfig): ServerlessManager {
    switch (config.provider) {
      case 'aws':
        return ServerlessManagerFactory.createAWSManager(config);
      case 'azure':
        return ServerlessManagerFactory.createAzureManager(config);
      case 'gcp':
        return ServerlessManagerFactory.createGCPManager(config);
      default:
        throw new Error(`Unsupported serverless provider: ${config.provider}`);
    }
  }

  /**
   * Create multiple ServerlessManager instances for multi-cloud deployment
   */
  static createMultiple(configs: ServerlessManagerConfig[]): ServerlessManager[] {
    return configs.map(config => ServerlessManagerFactory.create(config));
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(config: ServerlessManagerConfig): void {
    if (!config.provider) {
      throw new Error('Provider is required');
    }

    if (!config.region) {
      throw new Error('Region is required');
    }

    if (!config.credentials) {
      throw new Error('Credentials are required');
    }

    switch (config.provider) {
      case 'aws':
        ServerlessManagerFactory.validateAWSCredentials(config.credentials as AWSCredentials);
        break;
      case 'azure':
        ServerlessManagerFactory.validateAzureCredentials(config.credentials as AzureCredentials);
        break;
      case 'gcp':
        ServerlessManagerFactory.validateGCPCredentials(config.credentials as GCPCredentials);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Get supported providers
   */
  static getSupportedProviders(): string[] {
    return ['aws', 'azure', 'gcp'];
  }

  /**
   * Get supported regions for a provider
   */
  static getSupportedRegions(provider: string): string[] {
    switch (provider) {
      case 'aws':
        return [
          'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
          'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
          'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
          'ca-central-1', 'sa-east-1'
        ];
      case 'azure':
        return [
          'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
          'centralus', 'northcentralus', 'southcentralus',
          'westeurope', 'northeurope', 'uksouth', 'ukwest',
          'eastasia', 'southeastasia', 'japaneast', 'japanwest',
          'australiaeast', 'australiasoutheast', 'canadacentral', 'canadaeast'
        ];
      case 'gcp':
        return [
          'us-central1', 'us-east1', 'us-east4', 'us-west1', 'us-west2', 'us-west3', 'us-west4',
          'europe-west1', 'europe-west2', 'europe-west3', 'europe-west4', 'europe-west6',
          'asia-east1', 'asia-east2', 'asia-northeast1', 'asia-northeast2', 'asia-northeast3',
          'asia-south1', 'asia-southeast1', 'asia-southeast2',
          'australia-southeast1', 'northamerica-northeast1', 'southamerica-east1'
        ];
      default:
        return [];
    }
  }

  /**
   * Get supported runtimes for a provider
   */
  static getSupportedRuntimes(provider: string): string[] {
    switch (provider) {
      case 'aws':
        return [
          'nodejs18.x', 'nodejs16.x', 'nodejs14.x',
          'python3.11', 'python3.10', 'python3.9', 'python3.8',
          'java17', 'java11', 'java8.al2',
          'dotnet6', 'dotnetcore3.1',
          'go1.x',
          'ruby3.2', 'ruby2.7',
          'provided.al2', 'provided'
        ];
      case 'azure':
        return [
          'dotnet-isolated', 'dotnet', 'node', 'python', 'java', 'powershell'
        ];
      case 'gcp':
        return [
          'nodejs18', 'nodejs16', 'nodejs14',
          'python311', 'python310', 'python39', 'python38',
          'go119', 'go118', 'go116',
          'java17', 'java11',
          'dotnet6', 'dotnet3',
          'ruby30', 'ruby27'
        ];
      default:
        return [];
    }
  }

  // Private factory methods
  private static createAWSManager(config: ServerlessManagerConfig): AWSLambdaManager {
    const credentials = config.credentials as AWSCredentials;
    return new AWSLambdaManager(
      config.region,
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.sessionToken,
      config.config
    );
  }

  private static createAzureManager(config: ServerlessManagerConfig): AzureFunctionsManager {
    const credentials = config.credentials as AzureCredentials;
    return new AzureFunctionsManager(
      credentials.subscriptionId,
      credentials.clientId,
      credentials.clientSecret,
      credentials.tenantId,
      config.config
    );
  }

  private static createGCPManager(config: ServerlessManagerConfig): GoogleCloudFunctionsManager {
    const credentials = config.credentials as GCPCredentials;
    return new GoogleCloudFunctionsManager(
      credentials.projectId,
      config.region,
      credentials.keyFilename,
      credentials.credentials,
      config.config
    );
  }

  // Validation methods
  private static validateAWSCredentials(credentials: AWSCredentials): void {
    if (!credentials.accessKeyId) {
      throw new Error('AWS Access Key ID is required');
    }
    if (!credentials.secretAccessKey) {
      throw new Error('AWS Secret Access Key is required');
    }
  }

  private static validateAzureCredentials(credentials: AzureCredentials): void {
    if (!credentials.subscriptionId) {
      throw new Error('Azure Subscription ID is required');
    }
    if (!credentials.clientId) {
      throw new Error('Azure Client ID is required');
    }
    if (!credentials.clientSecret) {
      throw new Error('Azure Client Secret is required');
    }
    if (!credentials.tenantId) {
      throw new Error('Azure Tenant ID is required');
    }
  }

  private static validateGCPCredentials(credentials: GCPCredentials): void {
    if (!credentials.projectId) {
      throw new Error('GCP Project ID is required');
    }
    if (!credentials.keyFilename && !credentials.credentials) {
      throw new Error('GCP Key filename or credentials object is required');
    }
  }
}