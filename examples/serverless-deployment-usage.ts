/**
 * Example usage of serverless deployment capabilities
 */

import {
  ServerlessManagerFactory,
  MultiCloudServerlessOrchestrator,
  ServerlessMonitoringSystem,
  ServerlessSecurityManager,
  AWSLambdaManager,
  AzureFunctionsManager,
  GoogleCloudFunctionsManager
} from '../src/integration/deployment';

import {
  ServerlessFunctionConfig,
  ServerlessManagerConfig,
  MultiCloudServerlessConfig,
  ServerlessMonitoringConfig,
  ServerlessSecurityManagerConfig,
  TimeRange
} from '../src/integration/deployment/types/serverless-types';

async function demonstrateServerlessDeployment() {
  console.log('🚀 Serverless Deployment Capabilities Demo\n');

  // 1. Single Provider Deployment (AWS Lambda)
  console.log('1. Single Provider Deployment (AWS Lambda)');
  console.log('==========================================');

  const awsConfig: ServerlessManagerConfig = {
    provider: 'aws',
    region: 'us-east-1',
    credentials: {
      type: 'aws',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'demo-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'demo-secret'
    },
    config: {
      timeout: 30000,
      retries: 3
    }
  };

  const awsManager = ServerlessManagerFactory.create(awsConfig);

  const functionConfig: ServerlessFunctionConfig = {
    name: 'readme-to-cicd-processor',
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    code: {
      type: 'zip',
      source: './dist/function.zip'
    },
    environment: {
      variables: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        API_ENDPOINT: 'https://api.example.com'
      }
    },
    timeout: 30,
    memorySize: 256,
    description: 'README to CI/CD processor function',
    tags: {
      Project: 'readme-to-cicd',
      Environment: 'production',
      Owner: 'platform-team'
    },
    vpc: {
      subnetIds: ['subnet-12345', 'subnet-67890'],
      securityGroupIds: ['sg-abcdef']
    },
    deadLetterQueue: {
      targetArn: 'arn:aws:sqs:us-east-1:123456789012:dlq'
    },
    tracing: {
      mode: 'Active'
    },
    concurrency: {
      reservedConcurrency: 10,
      provisionedConcurrency: 5
    },
    security: {
      role: 'arn:aws:iam::123456789012:role/lambda-execution-role',
      kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
    },
    monitoring: {
      cloudWatch: {
        logGroup: '/aws/lambda/readme-to-cicd-processor',
        logRetentionDays: 14,
        metricsEnabled: true,
        detailedMonitoring: true
      },
      xRay: {
        tracingEnabled: true,
        samplingRate: 0.1
      },
      alarms: [
        {
          name: 'HighErrorRate',
          description: 'Alert when error rate exceeds 5%',
          metricName: 'Errors',
          namespace: 'AWS/Lambda',
          statistic: 'Sum',
          period: 300,
          evaluationPeriods: 2,
          threshold: 5,
          comparisonOperator: 'GreaterThanThreshold',
          alarmActions: ['arn:aws:sns:us-east-1:123456789012:alerts']
        }
      ]
    },
    scaling: {
      autoScaling: true,
      minConcurrency: 2,
      maxConcurrency: 100,
      targetUtilization: 70
    },
    costOptimization: {
      rightSizing: true,
      scheduledScaling: [
        {
          name: 'BusinessHours',
          schedule: '0 9 * * MON-FRI',
          minConcurrency: 5,
          maxConcurrency: 50,
          timezone: 'America/New_York'
        },
        {
          name: 'OffHours',
          schedule: '0 18 * * MON-FRI',
          minConcurrency: 1,
          maxConcurrency: 10,
          timezone: 'America/New_York'
        }
      ],
      costAlerts: [
        {
          name: 'MonthlyBudgetAlert',
          threshold: 100,
          currency: 'USD',
          period: 'Monthly',
          notifications: ['admin@example.com']
        }
      ]
    }
  };

  try {
    console.log('Deploying function...');
    const deployResult = await awsManager.deployFunction(functionConfig);
    
    if (deployResult.success) {
      console.log(`✅ Function deployed successfully!`);
      console.log(`   Function ID: ${deployResult.functionId}`);
      console.log(`   Function ARN: ${deployResult.functionArn}`);
      console.log(`   Version: ${deployResult.version}`);
      console.log(`   Status: ${deployResult.status.state}`);
      
      // Test function invocation
      console.log('\nTesting function invocation...');
      const testPayload = {
        readme: 'https://github.com/example/repo/blob/main/README.md',
        repository: 'example/repo',
        branch: 'main'
      };
      
      const invokeResult = await awsManager.invokeFunction(deployResult.functionId, testPayload);
      
      if (invokeResult.success) {
        console.log(`✅ Function invoked successfully!`);
        console.log(`   Status Code: ${invokeResult.statusCode}`);
        console.log(`   Duration: ${invokeResult.duration}ms`);
        console.log(`   Billed Duration: ${invokeResult.billedDuration}ms`);
        console.log(`   Memory Used: ${invokeResult.memoryUsed}MB`);
        console.log(`   Request ID: ${invokeResult.requestId}`);
      } else {
        console.log(`❌ Function invocation failed: ${invokeResult.error?.errorMessage}`);
      }
      
      // Create alias for production
      console.log('\nCreating production alias...');
      const aliasResult = await awsManager.createAlias(deployResult.functionId, {
        name: 'production',
        functionVersion: deployResult.version,
        description: 'Production alias for stable releases',
        routingConfig: {
          additionalVersionWeights: {
            '2': 0.1 // 10% traffic to version 2 for canary testing
          }
        }
      });
      
      console.log(`✅ Alias created: ${aliasResult.aliasArn}`);
      
    } else {
      console.log(`❌ Deployment failed: ${deployResult.message}`);
    }
  } catch (error) {
    console.error('❌ Error during AWS deployment:', error);
  }

  console.log('\n');

  // 2. Multi-Cloud Deployment
  console.log('2. Multi-Cloud Deployment');
  console.log('=========================');

  const multiCloudConfig: MultiCloudServerlessConfig = {
    primary: {
      provider: 'aws',
      config: awsManager as any,
      weight: 70,
      priority: 1
    },
    secondary: [
      {
        provider: 'azure',
        config: new AzureFunctionsManager(
          process.env.AZURE_SUBSCRIPTION_ID || 'demo-sub',
          process.env.AZURE_CLIENT_ID || 'demo-client',
          process.env.AZURE_CLIENT_SECRET || 'demo-secret',
          process.env.AZURE_TENANT_ID || 'demo-tenant'
        ) as any,
        weight: 20,
        priority: 2
      },
      {
        provider: 'gcp',
        config: new GoogleCloudFunctionsManager(
          process.env.GCP_PROJECT_ID || 'demo-project',
          'us-central1',
          process.env.GCP_KEY_FILE,
          undefined
        ) as any,
        weight: 10,
        priority: 3
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
      },
      stickySession: false
    },
    dataSync: {
      enabled: true,
      strategy: 'eventual-consistency',
      syncInterval: 60000,
      conflictResolution: 'last-write-wins'
    }
  };

  const orchestrator = new MultiCloudServerlessOrchestrator(multiCloudConfig);

  try {
    console.log('Deploying to multi-cloud setup...');
    const multiCloudResult = await orchestrator.deployFunction({
      ...functionConfig,
      name: 'readme-to-cicd-multicloud'
    });

    if (multiCloudResult.success) {
      console.log(`✅ Multi-cloud deployment successful!`);
      console.log(`   Primary deployment: ${multiCloudResult.functionId}`);
      
      // Test load balancing
      console.log('\nTesting load-balanced invocations...');
      const invocationPromises = Array.from({ length: 5 }, (_, i) => 
        orchestrator.invokeFunction(multiCloudResult.functionId, { test: `request-${i}` })
      );
      
      const invocationResults = await Promise.allSettled(invocationPromises);
      const successfulInvocations = invocationResults.filter(r => r.status === 'fulfilled').length;
      
      console.log(`✅ ${successfulInvocations}/5 invocations successful`);
      
      // Check multi-cloud status
      const status = await orchestrator.getMultiCloudStatus();
      console.log('\nMulti-cloud status:');
      Object.entries(status).forEach(([provider, health]) => {
        console.log(`   ${provider}: ${health}`);
      });
      
    } else {
      console.log(`❌ Multi-cloud deployment failed: ${multiCloudResult.message}`);
    }
  } catch (error) {
    console.error('❌ Error during multi-cloud deployment:', error);
  } finally {
    orchestrator.dispose();
  }

  console.log('\n');

  // 3. Monitoring and Observability
  console.log('3. Monitoring and Observability');
  console.log('===============================');

  const monitoringConfig: ServerlessMonitoringConfig = {
    providers: [
      {
        provider: 'aws',
        manager: awsManager,
        functions: ['readme-to-cicd-processor', 'readme-to-cicd-multicloud'],
        metricsInterval: 60000, // 1 minute
        enabled: true
      }
    ],
    alerting: {
      enabled: true,
      channels: [
        {
          type: 'email',
          config: {
            recipients: ['devops@example.com', 'alerts@example.com'],
            smtpServer: 'smtp.example.com',
            smtpPort: 587
          }
        },
        {
          type: 'slack',
          config: {
            webhookUrl: process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/...',
            channel: '#alerts',
            username: 'ServerlessBot'
          }
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
          channels: ['email', 'slack'],
          cooldown: 900000 // 15 minutes
        },
        {
          name: 'High Cold Start Rate',
          condition: {
            metric: 'coldStarts',
            operator: 'gt',
            threshold: 20, // 20% cold start rate
            duration: 600000 // 10 minutes
          },
          severity: 'medium',
          channels: ['slack'],
          cooldown: 1800000 // 30 minutes
        },
        {
          name: 'High Cost',
          condition: {
            metric: 'cost',
            operator: 'gt',
            threshold: 100, // $100
            duration: 86400000 // 24 hours
          },
          severity: 'medium',
          channels: ['email'],
          cooldown: 86400000 // 24 hours
        }
      ]
    },
    dashboards: [
      {
        name: 'Serverless Overview',
        widgets: [
          {
            type: 'metric',
            x: 0,
            y: 0,
            width: 6,
            height: 4,
            properties: {
              title: 'Function Invocations',
              metrics: ['AWS/Lambda', 'Invocations'],
              period: 300,
              stat: 'Sum'
            }
          },
          {
            type: 'metric',
            x: 6,
            y: 0,
            width: 6,
            height: 4,
            properties: {
              title: 'Error Rate',
              metrics: ['AWS/Lambda', 'Errors'],
              period: 300,
              stat: 'Average'
            }
          }
        ]
      }
    ],
    costTracking: {
      enabled: true,
      budgets: [
        {
          name: 'Monthly Serverless Budget',
          amount: 500,
          currency: 'USD',
          period: 'monthly',
          scope: 'global'
        },
        {
          name: 'Weekly Function Budget',
          amount: 100,
          currency: 'USD',
          period: 'weekly',
          scope: 'function',
          target: 'readme-to-cicd-processor'
        }
      ],
      alerts: [
        {
          name: 'Budget Alert 80%',
          threshold: 80,
          channels: ['email']
        },
        {
          name: 'Budget Alert 95%',
          threshold: 95,
          channels: ['email', 'slack']
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
          functionId: 'readme-to-cicd-processor',
          schedule: '*/15 * * * *', // Every 15 minutes during business hours
          concurrency: 2,
          enabled: true
        }
      ]
    }
  };

  const monitoringSystem = new ServerlessMonitoringSystem(monitoringConfig);

  try {
    console.log('Generating monitoring report...');
    const timeRange: TimeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      end: new Date()
    };

    const report = await monitoringSystem.getMonitoringReport(timeRange);
    
    console.log(`✅ Monitoring report generated`);
    console.log(`   Period: ${report.period.start.toISOString()} - ${report.period.end.toISOString()}`);
    console.log(`   Total Invocations: ${report.summary.totalInvocations}`);
    console.log(`   Total Errors: ${report.summary.totalErrors}`);
    console.log(`   Average Duration: ${report.summary.averageDuration}ms`);
    console.log(`   Total Cost: $${report.summary.totalCost.toFixed(2)}`);
    console.log(`   Cold Start Rate: ${report.summary.coldStartRate.toFixed(1)}%`);
    console.log(`   Healthy Functions: ${report.summary.healthyFunctions}`);
    console.log(`   Unhealthy Functions: ${report.summary.unhealthyFunctions}`);
    console.log(`   Active Alerts: ${report.alerts.length}`);
    console.log(`   Recommendations: ${report.recommendations.length}`);

    // Cold start analysis
    console.log('\nAnalyzing cold starts...');
    const coldStartAnalysis = await monitoringSystem.trackColdStarts(
      'readme-to-cicd-processor',
      'aws',
      timeRange
    );
    
    console.log(`   Cold Start Rate: ${coldStartAnalysis.coldStartRate.toFixed(1)}%`);
    console.log(`   Average Cold Start Duration: ${coldStartAnalysis.averageColdStartDuration.toFixed(0)}ms`);
    console.log(`   Cold Start Impact: ${coldStartAnalysis.coldStartImpact.toFixed(0)}ms total`);
    console.log(`   Recommendations: ${coldStartAnalysis.recommendations.length}`);

    // Cost optimization
    console.log('\nGenerating cost optimization report...');
    const costReport = await monitoringSystem.generateCostOptimizationReport(timeRange);
    
    console.log(`   Current Cost: $${costReport.currentCost.toFixed(2)}`);
    console.log(`   Potential Savings: $${costReport.totalPotentialSaving.toFixed(2)}`);
    console.log(`   Projected Cost: $${costReport.projectedCost.toFixed(2)}`);
    console.log(`   Savings Percentage: ${costReport.savingsPercentage.toFixed(1)}%`);
    console.log(`   Optimization Opportunities: ${costReport.optimizations.length}`);

  } catch (error) {
    console.error('❌ Error during monitoring:', error);
  } finally {
    monitoringSystem.dispose();
  }

  console.log('\n');

  // 4. Security Management
  console.log('4. Security Management');
  console.log('======================');

  const securityConfig: ServerlessSecurityManagerConfig = {
    providers: [
      {
        provider: 'aws',
        manager: awsManager,
        iamConfig: {
          rolePrefix: 'readme-to-cicd',
          defaultPolicies: [
            'AWSLambdaBasicExecutionRole',
            'AWSLambdaVPCAccessExecutionRole'
          ],
          customPolicies: [
            {
              name: 'ReadmeProcessorPolicy',
              description: 'Custom policy for README processor function',
              statements: [
                {
                  effect: 'Allow',
                  actions: [
                    's3:GetObject',
                    's3:PutObject'
                  ],
                  resources: [
                    'arn:aws:s3:::readme-to-cicd-bucket/*'
                  ]
                },
                {
                  effect: 'Allow',
                  actions: [
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:UpdateItem'
                  ],
                  resources: [
                    'arn:aws:dynamodb:us-east-1:123456789012:table/readme-metadata'
                  ]
                }
              ]
            }
          ],
          crossAccountAccess: []
        },
        networkSecurity: {
          vpcConfig: {
            enabled: true,
            vpcId: 'vpc-12345678',
            subnetIds: ['subnet-12345', 'subnet-67890'],
            securityGroupIds: ['sg-abcdef'],
            routeTableIds: ['rt-12345']
          },
          apiGateway: {
            authorizationType: 'AWS_IAM',
            apiKeyRequired: true,
            corsEnabled: true,
            throttling: {
              rateLimit: 1000,
              burstLimit: 2000,
              quotaLimit: 10000,
              quotaPeriod: 'DAY'
            },
            wafEnabled: true
          },
          loadBalancer: {
            sslPolicy: 'ELBSecurityPolicy-TLS-1-3-2021-06',
            securityGroups: ['sg-lb-12345'],
            accessLogsEnabled: true
          }
        },
        dataProtection: {
          encryptionAtRest: {
            enabled: true,
            kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
            algorithm: 'aws:kms'
          },
          encryptionInTransit: {
            enabled: true,
            tlsVersion: '1.3',
            cipherSuites: [
              'TLS_AES_256_GCM_SHA384',
              'TLS_CHACHA20_POLY1305_SHA256'
            ]
          },
          dataClassification: {
            enabled: true,
            classifications: [
              {
                type: 'confidential',
                patterns: ['password', 'secret', 'key', 'token'],
                actions: [
                  {
                    type: 'encrypt',
                    config: { algorithm: 'AES-256' }
                  },
                  {
                    type: 'alert',
                    config: { severity: 'high' }
                  }
                ]
              }
            ],
            scanningEnabled: true
          },
          backupEncryption: {
            enabled: true,
            kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/backup-key',
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
            id: 'encryption-at-rest-required',
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
          },
          {
            id: 'vpc-required',
            name: 'VPC Configuration Required',
            description: 'Functions processing sensitive data must be in VPC',
            category: 'network',
            severity: 'medium',
            condition: {
              type: 'function-property',
              property: 'vpcConfig',
              operator: 'exists',
              value: true
            },
            action: {
              type: 'warn'
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
            description: 'The entity implements logical and physical access controls',
            category: 'Access Control',
            requirements: [
              'IAM roles properly configured',
              'VPC isolation enabled',
              'API Gateway authentication enabled'
            ],
            automatedChecks: [
              {
                id: 'iam-role-check',
                name: 'IAM Role Configuration Check',
                description: 'Verify IAM roles follow least privilege principle',
                script: 'check-iam-roles.js',
                schedule: '0 */6 * * *', // Every 6 hours
                remediation: {
                  type: 'semi-automatic',
                  instructions: [
                    'Review IAM role permissions',
                    'Remove unnecessary permissions',
                    'Apply least privilege principle'
                  ],
                  approvalRequired: true
                }
              }
            ],
            manualChecks: [
              {
                id: 'access-review',
                name: 'Quarterly Access Review',
                description: 'Review all function access permissions',
                instructions: [
                  'List all functions and their permissions',
                  'Verify business justification for each permission',
                  'Remove unnecessary access'
                ],
                frequency: 'quarterly',
                assignee: 'security-team@example.com'
              }
            ]
          }
        ],
        assessmentSchedule: '0 0 1 * *' // Monthly on the 1st
      }
    ],
    auditConfig: {
      enabled: true,
      logDestination: {
        type: 'cloudwatch',
        config: {
          logGroup: '/aws/lambda/security-audit',
          retentionInDays: 90
        }
      },
      events: [
        {
          type: 'function-invocation',
          enabled: true,
          includePayload: false,
          includeResponse: false
        },
        {
          type: 'function-deployment',
          enabled: true,
          includePayload: true,
          includeResponse: true
        },
        {
          type: 'permission-change',
          enabled: true,
          includePayload: true,
          includeResponse: true
        }
      ],
      retention: {
        period: 90,
        archiveAfter: 30,
        deleteAfter: 2555 // 7 years
      },
      alerting: {
        enabled: true,
        channels: [
          {
            type: 'email',
            config: {
              recipients: ['security@example.com']
            }
          }
        ],
        rules: [
          {
            name: 'Suspicious Activity',
            condition: 'event.type == "permission-change" AND event.severity == "high"',
            severity: 'critical',
            channels: ['email'],
            cooldown: 300000 // 5 minutes
          }
        ]
      }
    },
    encryptionConfig: {
      defaultAlgorithm: 'AES-256-GCM',
      keyRotationEnabled: true,
      keyRotationInterval: 90, // 90 days
      keyManagement: {
        provider: 'aws-kms',
        config: {
          keyPolicy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: 'arn:aws:iam::123456789012:root' },
                Action: 'kms:*',
                Resource: '*'
              }
            ]
          }
        }
      }
    }
  };

  const securityManager = new ServerlessSecurityManager(securityConfig);

  try {
    console.log('Assessing function security...');
    const securityAssessment = await securityManager.assessFunctionSecurity(
      'readme-to-cicd-processor',
      'aws'
    );
    
    console.log(`✅ Security assessment completed`);
    console.log(`   Overall Score: ${securityAssessment.overallScore}/100`);
    console.log(`   Categories Assessed: ${securityAssessment.categories.length}`);
    console.log(`   Security Violations: ${securityAssessment.violations.length}`);
    console.log(`   Recommendations: ${securityAssessment.recommendations.length}`);
    console.log(`   Compliance Frameworks: ${securityAssessment.complianceStatus.length}`);

    // Configure IAM role
    console.log('\nConfiguring IAM role...');
    const iamResult = await securityManager.configureIAMRole(
      'readme-to-cicd-processor',
      'aws',
      [
        's3:GetObject',
        's3:PutObject',
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ]
    );
    
    console.log(`✅ IAM role configured`);
    console.log(`   Role Name: ${iamResult.roleName}`);
    console.log(`   Role ARN: ${iamResult.roleArn}`);
    console.log(`   Permissions: ${iamResult.permissions.length}`);

    // Vulnerability scan
    console.log('\nScanning for vulnerabilities...');
    const vulnReport = await securityManager.scanForVulnerabilities(
      'readme-to-cicd-processor',
      'aws'
    );
    
    console.log(`✅ Vulnerability scan completed`);
    console.log(`   Total Vulnerabilities: ${vulnReport.summary.total}`);
    console.log(`   Critical: ${vulnReport.summary.critical}`);
    console.log(`   High: ${vulnReport.summary.high}`);
    console.log(`   Medium: ${vulnReport.summary.medium}`);
    console.log(`   Low: ${vulnReport.summary.low}`);
    console.log(`   Risk Score: ${vulnReport.riskScore}/100`);

    // Compliance report
    console.log('\nGenerating compliance report...');
    const complianceReport = await securityManager.generateComplianceReport('SOC2');
    
    console.log(`✅ Compliance report generated`);
    console.log(`   Framework: ${complianceReport.framework} ${complianceReport.version}`);
    console.log(`   Overall Compliance: ${complianceReport.overallCompliance}%`);
    console.log(`   Controls Assessed: ${complianceReport.controlResults.length}`);
    console.log(`   Findings: ${complianceReport.findings.length}`);
    console.log(`   Recommendations: ${complianceReport.recommendations.length}`);

  } catch (error) {
    console.error('❌ Error during security assessment:', error);
  } finally {
    securityManager.dispose();
  }

  console.log('\n🎉 Serverless deployment capabilities demonstration completed!');
  console.log('\nKey Features Demonstrated:');
  console.log('• Single and multi-cloud serverless deployments');
  console.log('• Function packaging and dependency management');
  console.log('• Serverless scaling with concurrency controls');
  console.log('• Cost optimization with scheduled scaling');
  console.log('• Comprehensive monitoring with cold start tracking');
  console.log('• Performance analysis and optimization recommendations');
  console.log('• Security management with IAM roles and compliance');
  console.log('• Multi-provider failover and load balancing');
  console.log('• Automated vulnerability scanning');
  console.log('• Compliance reporting and audit trails');
}

// Run the demonstration
if (require.main === module) {
  demonstrateServerlessDeployment().catch(console.error);
}

export { demonstrateServerlessDeployment };