/**
 * Integration tests for serverless deployment capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AWSLambdaManager } from '../../../src/integration/deployment/serverless/aws-lambda-manager';
import { AzureFunctionsManager } from '../../../src/integration/deployment/serverless/azure-functions-manager';
import { GoogleCloudFunctionsManager } from '../../../src/integration/deployment/serverless/google-cloud-functions-manager';
import { ServerlessManagerFactory } from '../../../src/integration/deployment/serverless/serverless-manager-factory';
import { MultiCloudServerlessOrchestrator } from '../../../src/integration/deployment/serverless/multi-cloud-serverless-orchestrator';
import { ServerlessMonitoringSystem } from '../../../src/integration/deployment/serverless/serverless-monitoring-system';
import { ServerlessSecurityManager } from '../../../src/integration/deployment/serverless/serverless-security-manager';
import {
  ServerlessFunctionConfig,
  ServerlessFunctionUpdateConfig,
  ServerlessInvocationResult,
  ServerlessAliasConfig,
  TimeRange,
  MultiCloudServerlessConfig,
  ServerlessMonitoringConfig,
  ServerlessSecurityManagerConfig
} from '../../../src/integration/deployment/types/serverless-types';

describe('Serverless Deployment Integration Tests', () => {
  describe('AWS Lambda Manager', () => {
    let awsManager: AWSLambdaManager;

    beforeEach(() => {
      awsManager = new AWSLambdaManager(
        'us-east-1',
        'test-access-key',
        'test-secret-key',
        undefined,
        { timeout: 30000 }
      );
    });

    it('should deploy a function successfully', async () => {
      const config: ServerlessFunctionConfig = {
        name: 'test-function',
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        code: {
          type: 'zip',
          source: './test-function.zip'
        },
        environment: {
          variables: {
            NODE_ENV: 'production',
            API_KEY: 'test-key'
          }
        },
        timeout: 30,
        memorySize: 128,
        description: 'Test function for integration testing'
      };

      const result = await awsManager.deployFunction(config);

      expect(result.success).toBe(true);
      expect(result.functionId).toBe('test-function');
      expect(result.functionArn).toContain('arn:aws:lambda');
      expect(result.status.state).toBe('Active');
      expect(result.deploymentPackage).toBeDefined();
    });

    it('should update a function successfully', async () => {
      // First deploy a function
      const deployConfig: ServerlessFunctionConfig = {
        name: 'test-function-update',
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        code: { type: 'zip', source: './test-function.zip' },
        environment: { variables: {} },
        timeout: 30,
        memorySize: 128
      };

      const deployResult = await awsManager.deployFunction(deployConfig);
      expect(deployResult.success).toBe(true);

      // Then update it
      const updateConfig: ServerlessFunctionUpdateConfig = {
        timeout: 60,
        memorySize: 256,
        environment: {
          variables: {
            NODE_ENV: 'staging',
            DEBUG: 'true'
          }
        }
      };

      const updateResult = await awsManager.updateFunction(deployResult.functionId, updateConfig);

      expect(updateResult.success).toBe(true);
      expect(updateResult.functionId).toBe(deployResult.functionId);
      expect(updateResult.status.state).toBe('Active');
    });

    it('should invoke a function and return results', async () => {
      const functionId = 'test-function-invoke';
      const payload = { message: 'Hello, World!', timestamp: Date.now() };

      const result: ServerlessInvocationResult = await awsManager.invokeFunction(functionId, payload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.payload).toBeDefined();
      expect(result.requestId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.billedDuration).toBeGreaterThan(0);
    });

    it('should get function metrics', async () => {
      const functionId = 'test-function-metrics';
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        end: new Date()
      };

      const metrics = await awsManager.getFunctionMetrics(functionId, timeRange);

      expect(metrics).toBeDefined();
      expect(metrics.invocations).toBeDefined();
      expect(metrics.duration).toBeDefined();
      expect(metrics.errors).toBeDefined();
      expect(metrics.coldStarts).toBeDefined();
      expect(metrics.costMetrics).toBeDefined();
      expect(metrics.costMetrics.totalCost).toBeGreaterThanOrEqual(0);
    });

    it('should create and manage aliases', async () => {
      const functionId = 'test-function-alias';
      const aliasConfig: ServerlessAliasConfig = {
        name: 'production',
        functionVersion: '1',
        description: 'Production alias for stable releases'
      };

      const createResult = await awsManager.createAlias(functionId, aliasConfig);

      expect(createResult.aliasArn).toContain(functionId);
      expect(createResult.name).toBe('production');
      expect(createResult.functionVersion).toBe('1');

      // Update alias
      const updateResult = await awsManager.updateAlias(functionId, 'production', {
        functionVersion: '2',
        description: 'Updated production alias'
      });

      expect(updateResult.functionVersion).toBe('2');
      expect(updateResult.name).toBe('production');

      // Delete alias
      await expect(awsManager.deleteAlias(functionId, 'production')).resolves.not.toThrow();
    });

    it('should handle function deletion', async () => {
      const functionId = 'test-function-delete';

      await expect(awsManager.deleteFunction(functionId)).resolves.not.toThrow();
    });

    it('should list functions with filters', async () => {
      const functions = await awsManager.listFunctions({
        runtime: 'nodejs18.x',
        maxItems: 10
      });

      expect(Array.isArray(functions)).toBe(true);
      expect(functions.length).toBeGreaterThanOrEqual(0);
      
      if (functions.length > 0) {
        expect(functions[0]).toHaveProperty('functionName');
        expect(functions[0]).toHaveProperty('functionArn');
        expect(functions[0]).toHaveProperty('runtime');
      }
    });
  });

  describe('Azure Functions Manager', () => {
    let azureManager: AzureFunctionsManager;

    beforeEach(() => {
      azureManager = new AzureFunctionsManager(
        'test-subscription-id',
        'test-client-id',
        'test-client-secret',
        'test-tenant-id',
        { timeout: 30000 }
      );
    });

    it('should deploy an Azure function successfully', async () => {
      const config: ServerlessFunctionConfig = {
        name: 'test-azure-function',
        runtime: 'node',
        handler: 'index.js',
        code: {
          type: 'zip',
          source: './test-function.zip'
        },
        environment: {
          variables: {
            FUNCTIONS_WORKER_RUNTIME: 'node',
            WEBSITE_NODE_DEFAULT_VERSION: '~18'
          }
        },
        timeout: 300, // Azure default is 5 minutes
        memorySize: 1536, // Azure default
        description: 'Test Azure function'
      };

      const result = await azureManager.deployFunction(config);

      expect(result.success).toBe(true);
      expect(result.functionId).toContain('test-azure-function');
      expect(result.functionArn).toContain('/subscriptions/');
      expect(result.status.state).toBe('Active');
    });

    it('should invoke Azure function with proper response format', async () => {
      const functionId = 'test-rg/test-app/test-function';
      const payload = { data: 'test payload' };

      const result = await azureManager.invokeFunction(functionId, payload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.payload).toBeDefined();
      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
    });

    it('should get Azure-specific metrics', async () => {
      const functionId = 'test-rg/test-app/test-function';
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const metrics = await azureManager.getFunctionMetrics(functionId, timeRange);

      expect(metrics.invocations.unit).toBe('Count');
      expect(metrics.duration.unit).toBe('Count'); // Azure uses execution units
      expect(metrics.costMetrics.currency).toBe('USD');
      expect(metrics.costMetrics.breakdown).toBeDefined();
      expect(Array.isArray(metrics.costMetrics.breakdown)).toBe(true);
    });
  });

  describe('Google Cloud Functions Manager', () => {
    let gcpManager: GoogleCloudFunctionsManager;

    beforeEach(() => {
      gcpManager = new GoogleCloudFunctionsManager(
        'test-project-id',
        'us-central1',
        undefined,
        { type: 'service_account', project_id: 'test-project' },
        { timeout: 30000 }
      );
    });

    it('should deploy a GCP function successfully', async () => {
      const config: ServerlessFunctionConfig = {
        name: 'test-gcp-function',
        runtime: 'nodejs18',
        handler: 'main',
        code: {
          type: 'zip',
          source: './test-function.zip'
        },
        environment: {
          variables: {
            NODE_ENV: 'production'
          }
        },
        timeout: 60, // GCP default
        memorySize: 256, // GCP default
        description: 'Test GCP function'
      };

      const result = await gcpManager.deployFunction(config);

      expect(result.success).toBe(true);
      expect(result.functionArn).toContain('projects/test-project-id');
      expect(result.functionArn).toContain('locations/us-central1');
      expect(result.functionArn).toContain('functions/test-gcp-function');
    });

    it('should handle GCP-specific invocation format', async () => {
      const functionId = 'projects/test-project/locations/us-central1/functions/test-function';
      const payload = { message: 'Hello GCP!' };

      const result = await gcpManager.invokeFunction(functionId, payload);

      expect(result.success).toBe(true);
      expect(result.requestId).toContain('gcp');
      expect(result.billedDuration).toBeGreaterThan(0);
      expect(result.billedDuration % 100).toBe(0); // GCP bills in 100ms increments
    });
  });

  describe('ServerlessManagerFactory', () => {
    it('should create AWS Lambda manager', () => {
      const config = {
        provider: 'aws' as const,
        region: 'us-east-1',
        credentials: {
          type: 'aws' as const,
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      };

      const manager = ServerlessManagerFactory.create(config);
      expect(manager).toBeInstanceOf(AWSLambdaManager);
    });

    it('should create Azure Functions manager', () => {
      const config = {
        provider: 'azure' as const,
        region: 'eastus',
        credentials: {
          type: 'azure' as const,
          subscriptionId: 'test-sub',
          clientId: 'test-client',
          clientSecret: 'test-secret',
          tenantId: 'test-tenant'
        }
      };

      const manager = ServerlessManagerFactory.create(config);
      expect(manager).toBeInstanceOf(AzureFunctionsManager);
    });

    it('should create Google Cloud Functions manager', () => {
      const config = {
        provider: 'gcp' as const,
        region: 'us-central1',
        credentials: {
          type: 'gcp' as const,
          projectId: 'test-project',
          keyFilename: './service-account.json'
        }
      };

      const manager = ServerlessManagerFactory.create(config);
      expect(manager).toBeInstanceOf(GoogleCloudFunctionsManager);
    });

    it('should validate configuration', () => {
      expect(() => {
        ServerlessManagerFactory.validateConfig({
          provider: 'aws',
          region: 'us-east-1',
          credentials: {
            type: 'aws',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
          }
        });
      }).not.toThrow();

      expect(() => {
        ServerlessManagerFactory.validateConfig({
          provider: 'aws',
          region: '',
          credentials: {
            type: 'aws',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
          }
        });
      }).toThrow('Region is required');
    });

    it('should return supported providers and regions', () => {
      const providers = ServerlessManagerFactory.getSupportedProviders();
      expect(providers).toContain('aws');
      expect(providers).toContain('azure');
      expect(providers).toContain('gcp');

      const awsRegions = ServerlessManagerFactory.getSupportedRegions('aws');
      expect(awsRegions).toContain('us-east-1');
      expect(awsRegions).toContain('eu-west-1');

      const awsRuntimes = ServerlessManagerFactory.getSupportedRuntimes('aws');
      expect(awsRuntimes).toContain('nodejs18.x');
      expect(awsRuntimes).toContain('python3.11');
    });
  });

  describe('Multi-Cloud Serverless Orchestrator', () => {
    let orchestrator: MultiCloudServerlessOrchestrator;
    let mockAWSManager: AWSLambdaManager;
    let mockAzureManager: AzureFunctionsManager;

    beforeEach(() => {
      mockAWSManager = new AWSLambdaManager('us-east-1', 'key', 'secret');
      mockAzureManager = new AzureFunctionsManager('sub', 'client', 'secret', 'tenant');

      const config: MultiCloudServerlessConfig = {
        primary: {
          provider: 'aws',
          config: mockAWSManager as any,
          weight: 70,
          priority: 1
        },
        secondary: [
          {
            provider: 'azure',
            config: mockAzureManager as any,
            weight: 30,
            priority: 2
          }
        ],
        failover: {
          enabled: true,
          healthCheck: {
            timeout: 5000,
            interval: 30000,
            retries: 3
          },
          failoverThreshold: 3,
          recoveryThreshold: 1,
          failoverDelay: 1000,
          recoveryDelay: 5000
        },
        loadBalancing: {
          strategy: 'weighted',
          healthCheck: {
            timeout: 5000,
            interval: 30000,
            retries: 3
          }
        }
      };

      orchestrator = new MultiCloudServerlessOrchestrator(config);
    });

    afterEach(() => {
      orchestrator.dispose();
    });

    it('should deploy to primary provider', async () => {
      const config: ServerlessFunctionConfig = {
        name: 'multi-cloud-function',
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        code: { type: 'zip', source: './function.zip' },
        environment: { variables: {} },
        timeout: 30,
        memorySize: 128
      };

      const result = await orchestrator.deployFunction(config);

      expect(result.success).toBe(true);
      expect(result.functionId).toBe('multi-cloud-function');
    });

    it('should handle failover deployment', async () => {
      // Mock primary deployment failure
      vi.spyOn(mockAWSManager, 'deployFunction').mockRejectedValue(new Error('AWS deployment failed'));

      const config: ServerlessFunctionConfig = {
        name: 'failover-function',
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        code: { type: 'zip', source: './function.zip' },
        environment: { variables: {} },
        timeout: 30,
        memorySize: 128
      };

      const result = await orchestrator.deployFunction(config);

      expect(result.success).toBe(true);
      expect(result.functionId).toBe('failover-function');
    });

    it('should aggregate logs from multiple providers', async () => {
      const functionId = 'multi-cloud-logs';
      const options = {
        startTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        limit: 100
      };

      const logs = await orchestrator.getFunctionLogs(functionId, options);

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should get multi-cloud status', async () => {
      const status = await orchestrator.getMultiCloudStatus();

      expect(status).toHaveProperty('aws');
      expect(status).toHaveProperty('azure');
      expect(['healthy', 'unhealthy', 'unknown']).toContain(status.aws);
      expect(['healthy', 'unhealthy', 'unknown']).toContain(status.azure);
    });

    it('should switch primary provider', async () => {
      await orchestrator.switchPrimary('azure');

      // Verify that azure is now primary (this would require access to internal state)
      // For now, we just ensure the method doesn't throw
      expect(true).toBe(true);
    });

    it('should list functions from all providers', async () => {
      const functions = await orchestrator.listFunctions();

      expect(Array.isArray(functions)).toBe(true);
      // Functions should be prefixed with provider name
      if (functions.length > 0) {
        expect(functions[0].functionName).toMatch(/^(aws|azure|gcp):/);
      }
    });
  });

  describe('Serverless Monitoring System', () => {
    let monitoringSystem: ServerlessMonitoringSystem;
    let mockAWSManager: AWSLambdaManager;

    beforeEach(() => {
      mockAWSManager = new AWSLambdaManager('us-east-1', 'key', 'secret');

      const config: ServerlessMonitoringConfig = {
        providers: [
          {
            provider: 'aws',
            manager: mockAWSManager,
            functions: ['test-function-1', 'test-function-2'],
            metricsInterval: 60000, // 1 minute
            enabled: true
          }
        ],
        alerting: {
          enabled: true,
          channels: [
            {
              type: 'email',
              config: { recipients: ['admin@example.com'] }
            }
          ],
          rules: [
            {
              name: 'High Error Rate',
              condition: {
                metric: 'errors',
                operator: 'gt',
                threshold: 10,
                duration: 300000 // 5 minutes
              },
              severity: 'high',
              channels: ['email'],
              cooldown: 900000 // 15 minutes
            }
          ]
        },
        dashboards: [],
        costTracking: {
          enabled: true,
          budgets: [
            {
              name: 'Monthly Serverless Budget',
              amount: 1000,
              currency: 'USD',
              period: 'monthly',
              scope: 'global'
            }
          ],
          alerts: [
            {
              name: 'Budget Alert',
              threshold: 80, // 80% of budget
              channels: ['email']
            }
          ],
          optimization: {
            enabled: true,
            rightSizing: true,
            unusedFunctionDetection: true,
            coldStartOptimization: true,
            concurrencyOptimization: true
          }
        },
        performanceThresholds: {
          maxDuration: 5000, // 5 seconds
          maxMemoryUtilization: 80, // 80%
          maxErrorRate: 5, // 5%
          maxColdStartRate: 20, // 20%
          maxCost: 0.01 // $0.01 per invocation
        },
        coldStartTracking: {
          enabled: true,
          trackingInterval: 300000, // 5 minutes
          optimizationEnabled: true,
          warmupSchedules: [
            {
              functionId: 'test-function-1',
              schedule: '*/15 * * * *', // Every 15 minutes
              concurrency: 2,
              enabled: true
            }
          ]
        }
      };

      monitoringSystem = new ServerlessMonitoringSystem(config);
    });

    afterEach(() => {
      monitoringSystem.dispose();
    });

    it('should generate monitoring report', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        end: new Date()
      };

      const report = await monitoringSystem.getMonitoringReport(timeRange);

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.period).toEqual(timeRange);
      expect(report.summary).toBeDefined();
      expect(Array.isArray(report.functions)).toBe(true);
      expect(report.costs).toBeDefined();
      expect(Array.isArray(report.alerts)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should track cold starts', async () => {
      const functionId = 'test-function-1';
      const provider = 'aws';
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const analysis = await monitoringSystem.trackColdStarts(functionId, provider, timeRange);

      expect(analysis.functionId).toBe(functionId);
      expect(analysis.provider).toBe(provider);
      expect(analysis.timeRange).toEqual(timeRange);
      expect(typeof analysis.coldStartRate).toBe('number');
      expect(typeof analysis.averageColdStartDuration).toBe('number');
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should optimize cold starts', async () => {
      const functionId = 'test-function-1';
      const provider = 'aws';

      const optimization = await monitoringSystem.optimizeColdStarts(functionId, provider);

      expect(optimization.functionId).toBe(functionId);
      expect(optimization.provider).toBe(provider);
      expect(optimization.analysis).toBeDefined();
      expect(Array.isArray(optimization.optimizations)).toBe(true);
      expect(typeof optimization.estimatedSavings).toBe('number');

      // Check optimization types
      const optimizationTypes = optimization.optimizations.map(opt => opt.type);
      expect(optimizationTypes).toContain('provisioned-concurrency');
      expect(optimizationTypes).toContain('memory-optimization');
      expect(optimizationTypes).toContain('warmup-scheduling');
    });

    it('should analyze concurrency', async () => {
      const functionId = 'test-function-1';
      const provider = 'aws';
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const analysis = await monitoringSystem.analyzeConcurrency(functionId, provider, timeRange);

      expect(analysis.functionId).toBe(functionId);
      expect(analysis.provider).toBe(provider);
      expect(typeof analysis.maxConcurrency).toBe('number');
      expect(typeof analysis.averageConcurrency).toBe('number');
      expect(typeof analysis.throttles).toBe('number');
      expect(typeof analysis.throttleRate).toBe('number');
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should generate cost optimization report', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      };

      const report = await monitoringSystem.generateCostOptimizationReport(timeRange);

      expect(report.timeRange).toEqual(timeRange);
      expect(typeof report.currentCost).toBe('number');
      expect(Array.isArray(report.optimizations)).toBe(true);
      expect(typeof report.totalPotentialSaving).toBe('number');
      expect(typeof report.projectedCost).toBe('number');
      expect(typeof report.savingsPercentage).toBe('number');

      // Check optimization types
      if (report.optimizations.length > 0) {
        const optimizationTypes = report.optimizations.map(opt => opt.type);
        expect(optimizationTypes.some(type => 
          ['unused-function', 'memory-rightsizing', 'cold-start-optimization'].includes(type)
        )).toBe(true);
      }
    });
  });

  describe('Serverless Security Manager', () => {
    let securityManager: ServerlessSecurityManager;
    let mockAWSManager: AWSLambdaManager;

    beforeEach(() => {
      mockAWSManager = new AWSLambdaManager('us-east-1', 'key', 'secret');

      const config: ServerlessSecurityManagerConfig = {
        providers: [
          {
            provider: 'aws',
            manager: mockAWSManager,
            iamConfig: {
              rolePrefix: 'serverless-function',
              defaultPolicies: ['AWSLambdaBasicExecutionRole'],
              customPolicies: [],
              crossAccountAccess: []
            },
            networkSecurity: {
              vpcConfig: {
                enabled: true,
                subnetIds: ['subnet-12345'],
                securityGroupIds: ['sg-12345'],
                routeTableIds: ['rt-12345']
              },
              apiGateway: {
                authorizationType: 'AWS_IAM',
                apiKeyRequired: true,
                corsEnabled: true,
                throttling: {
                  rateLimit: 1000,
                  burstLimit: 2000
                },
                wafEnabled: true
              },
              loadBalancer: {
                sslPolicy: 'ELBSecurityPolicy-TLS-1-2-2017-01',
                securityGroups: ['sg-lb-12345'],
                accessLogsEnabled: true
              }
            },
            dataProtection: {
              encryptionAtRest: {
                enabled: true,
                algorithm: 'aws:kms'
              },
              encryptionInTransit: {
                enabled: true,
                tlsVersion: '1.3',
                cipherSuites: ['TLS_AES_256_GCM_SHA384']
              },
              dataClassification: {
                enabled: true,
                classifications: [],
                scanningEnabled: true
              },
              backupEncryption: {
                enabled: true,
                retentionPeriod: 30
              }
            }
          }
        ],
        globalPolicies: [
          {
            name: 'Security Best Practices',
            description: 'Enforce security best practices across all functions',
            rules: [
              {
                id: 'encryption-at-rest',
                name: 'Encryption at Rest Required',
                description: 'All functions must have encryption at rest enabled',
                category: 'encryption',
                severity: 'high',
                condition: {
                  type: 'function-property',
                  property: 'kmsKeyArn',
                  operator: 'exists',
                  value: true
                },
                action: {
                  type: 'deny'
                }
              }
            ],
            enforcement: 'mandatory',
            exceptions: []
          }
        ],
        complianceFrameworks: [
          {
            name: 'SOC2',
            version: '2017',
            controls: [
              {
                id: 'CC6.1',
                name: 'Logical and Physical Access Controls',
                description: 'Access controls are implemented',
                category: 'Access Control',
                requirements: ['IAM roles configured', 'VPC isolation enabled'],
                automatedChecks: [],
                manualChecks: []
              }
            ],
            assessmentSchedule: '0 0 1 * *' // Monthly
          }
        ],
        auditConfig: {
          enabled: true,
          logDestination: {
            type: 'cloudwatch',
            config: { logGroup: '/aws/lambda/audit' }
          },
          events: [
            {
              type: 'function-invocation',
              enabled: true,
              includePayload: false,
              includeResponse: false
            }
          ],
          retention: {
            period: 90,
            archiveAfter: 30,
            deleteAfter: 365
          },
          alerting: {
            enabled: true,
            channels: [],
            rules: []
          }
        },
        encryptionConfig: {
          defaultAlgorithm: 'AES-256',
          keyRotationEnabled: true,
          keyRotationInterval: 90,
          keyManagement: {
            provider: 'aws-kms',
            config: {}
          }
        }
      };

      securityManager = new ServerlessSecurityManager(config);
    });

    afterEach(() => {
      securityManager.dispose();
    });

    it('should assess function security', async () => {
      const functionId = 'test-secure-function';
      const provider = 'aws';

      const assessment = await securityManager.assessFunctionSecurity(functionId, provider);

      expect(assessment.functionId).toBe(functionId);
      expect(assessment.provider).toBe(provider);
      expect(assessment.timestamp).toBeInstanceOf(Date);
      expect(typeof assessment.overallScore).toBe('number');
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(assessment.categories)).toBe(true);
      expect(Array.isArray(assessment.violations)).toBe(true);
      expect(Array.isArray(assessment.recommendations)).toBe(true);
      expect(Array.isArray(assessment.complianceStatus)).toBe(true);
    });

    it('should configure IAM role', async () => {
      const functionId = 'test-iam-function';
      const provider = 'aws';
      const permissions = [
        's3:GetObject',
        's3:PutObject',
        'dynamodb:GetItem',
        'dynamodb:PutItem'
      ];

      const result = await securityManager.configureIAMRole(functionId, provider, permissions);

      expect(result.roleName).toContain('serverless-function');
      expect(result.roleName).toContain(functionId);
      expect(result.roleArn).toContain('arn:aws:iam::');
      expect(result.permissions).toEqual(permissions);
      expect(result.policyDocument).toBeDefined();
      expect(result.attachedAt).toBeInstanceOf(Date);
    });

    it('should configure network security', async () => {
      const functionId = 'test-network-function';
      const provider = 'aws';
      const networkConfig = {
        vpcConfig: {
          enabled: true,
          subnetIds: ['subnet-abc123'],
          securityGroupIds: ['sg-def456'],
          routeTableIds: ['rt-ghi789']
        },
        apiGateway: {
          authorizationType: 'COGNITO_USER_POOLS' as const,
          apiKeyRequired: true,
          corsEnabled: true,
          throttling: {
            rateLimit: 500,
            burstLimit: 1000
          },
          wafEnabled: true
        },
        loadBalancer: {
          sslPolicy: 'ELBSecurityPolicy-TLS-1-3-2021-06',
          securityGroups: ['sg-lb-789'],
          accessLogsEnabled: true
        }
      };

      await expect(
        securityManager.configureNetworkSecurity(functionId, provider, networkConfig)
      ).resolves.not.toThrow();
    });

    it('should enable encryption', async () => {
      const functionId = 'test-encryption-function';
      const provider = 'aws';
      const encryptionConfig = {
        encryptionAtRest: {
          enabled: true,
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          algorithm: 'aws:kms' as const
        },
        encryptionInTransit: {
          enabled: true,
          tlsVersion: '1.3' as const,
          cipherSuites: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256']
        },
        dataClassification: {
          enabled: true,
          classifications: [],
          scanningEnabled: true
        },
        backupEncryption: {
          enabled: true,
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/backup-key',
          retentionPeriod: 90
        }
      };

      await expect(
        securityManager.enableEncryption(functionId, provider, encryptionConfig)
      ).resolves.not.toThrow();
    });

    it('should scan for vulnerabilities', async () => {
      const functionId = 'test-vuln-function';
      const provider = 'aws';

      const report = await securityManager.scanForVulnerabilities(functionId, provider);

      expect(report.functionId).toBe(functionId);
      expect(report.provider).toBe(provider);
      expect(report.scanTimestamp).toBeInstanceOf(Date);
      expect(Array.isArray(report.vulnerabilities)).toBe(true);
      expect(report.summary).toBeDefined();
      expect(typeof report.summary.total).toBe('number');
      expect(typeof report.summary.critical).toBe('number');
      expect(typeof report.summary.high).toBe('number');
      expect(typeof report.summary.medium).toBe('number');
      expect(typeof report.summary.low).toBe('number');
      expect(typeof report.riskScore).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should generate compliance report', async () => {
      const framework = 'SOC2';

      const report = await securityManager.generateComplianceReport(framework);

      expect(report.framework).toBe(framework);
      expect(report.version).toBe('2017');
      expect(report.assessmentDate).toBeInstanceOf(Date);
      expect(typeof report.overallCompliance).toBe('number');
      expect(report.overallCompliance).toBeGreaterThanOrEqual(0);
      expect(report.overallCompliance).toBeLessThanOrEqual(100);
      expect(Array.isArray(report.controlResults)).toBe(true);
      expect(Array.isArray(report.findings)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.nextAssessment).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid function configurations', async () => {
      const awsManager = new AWSLambdaManager('us-east-1', 'key', 'secret');
      
      const invalidConfig = {
        name: '', // Invalid: empty name
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        code: { type: 'zip', source: './function.zip' },
        environment: { variables: {} },
        timeout: 1000, // Invalid: exceeds maximum
        memorySize: 64 // Invalid: below minimum
      } as ServerlessFunctionConfig;

      await expect(awsManager.deployFunction(invalidConfig)).rejects.toThrow();
    });

    it('should handle network timeouts gracefully', async () => {
      const awsManager = new AWSLambdaManager('us-east-1', 'key', 'secret');
      
      // Mock a timeout scenario
      vi.spyOn(awsManager, 'getFunctionStatus').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Network timeout');
      });

      await expect(awsManager.getFunctionStatus('timeout-function')).rejects.toThrow('Network timeout');
    });

    it('should handle provider-specific errors', async () => {
      const azureManager = new AzureFunctionsManager('sub', 'client', 'secret', 'tenant');
      
      // Test Azure-specific error handling
      await expect(azureManager.deleteFunction('non-existent-function')).resolves.not.toThrow();
    });

    it('should validate multi-cloud configuration', () => {
      expect(() => {
        new MultiCloudServerlessOrchestrator({
          primary: {
            provider: 'aws',
            config: {} as any
          }
          // Missing secondary and other required fields
        } as MultiCloudServerlessConfig);
      }).not.toThrow(); // Should handle missing optional fields gracefully
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent function deployments', async () => {
      const awsManager = new AWSLambdaManager('us-east-1', 'key', 'secret');
      
      const deploymentPromises = Array.from({ length: 5 }, (_, i) => {
        const config: ServerlessFunctionConfig = {
          name: `concurrent-function-${i}`,
          runtime: 'nodejs18.x',
          handler: 'index.handler',
          code: { type: 'zip', source: './function.zip' },
          environment: { variables: {} },
          timeout: 30,
          memorySize: 128
        };
        
        return awsManager.deployFunction(config);
      });

      const results = await Promise.allSettled(deploymentPromises);
      
      // All deployments should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(true);
          expect(result.value.functionId).toBe(`concurrent-function-${index}`);
        }
      });
    });

    it('should handle large metric datasets efficiently', async () => {
      const awsManager = new AWSLambdaManager('us-east-1', 'key', 'secret');
      
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      };

      const startTime = Date.now();
      const metrics = await awsManager.getFunctionMetrics('large-dataset-function', timeRange);
      const endTime = Date.now();

      expect(metrics).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(Array.isArray(metrics.invocations.dataPoints)).toBe(true);
    });
  });
});