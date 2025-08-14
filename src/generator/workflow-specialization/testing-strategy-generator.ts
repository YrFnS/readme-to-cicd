/**
 * Testing Strategy Generator
 * Generates comprehensive testing workflows including integration, E2E, contract, and chaos engineering tests
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';
import { WorkflowTemplate, StepTemplate } from '../types';
import { YAMLRenderer } from '../renderers/yaml-renderer';

/**
 * Advanced testing strategy configuration
 */
export interface AdvancedTestingConfig {
  integration: {
    enabled: boolean;
    serviceManagement: boolean;
    databaseTesting: boolean;
    apiTesting: boolean;
    mockServices: boolean;
    testContainers: boolean;
  };
  e2e: {
    enabled: boolean;
    browserAutomation: boolean;
    apiTesting: boolean;
    mobileAppTesting: boolean;
    crossBrowserTesting: boolean;
    visualRegression: boolean;
    performanceTesting: boolean;
  };
  contract: {
    enabled: boolean;
    consumerDriven: boolean;
    providerVerification: boolean;
    schemaValidation: boolean;
    apiDocumentation: boolean;
  };
  chaos: {
    enabled: boolean;
    faultInjection: boolean;
    resilienceTesting: boolean;
    networkChaos: boolean;
    resourceChaos: boolean;
    timeoutTesting: boolean;
  };
  testData: {
    enabled: boolean;
    provisioning: boolean;
    cleanup: boolean;
    anonymization: boolean;
    generation: boolean;
    migration: boolean;
  };
}

/**
 * Integration testing tools
 */
export type IntegrationTestTool = 'testcontainers' | 'docker-compose' | 'wiremock' | 'mockserver' | 'postman' | 'newman';

/**
 * E2E testing tools
 */
export type E2ETestTool = 'playwright' | 'cypress' | 'selenium' | 'puppeteer' | 'webdriver' | 'appium';

/**
 * Contract testing tools
 */
export type ContractTestTool = 'pact' | 'spring-cloud-contract' | 'openapi-generator' | 'swagger-codegen' | 'dredd';

/**
 * Chaos engineering tools
 */
export type ChaosTestTool = 'chaos-monkey' | 'litmus' | 'gremlin' | 'pumba' | 'toxiproxy' | 'chaos-toolkit';

/**
 * Testing Strategy Generator class
 */
export class TestingStrategyGenerator {
  private yamlRenderer: YAMLRenderer;
  private readonly defaultConfig: AdvancedTestingConfig;

  constructor() {
    this.yamlRenderer = new YAMLRenderer({
      yamlConfig: {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        noCompatMode: false,
        condenseFlow: false,
        quotingType: 'auto',
        forceQuotes: false,
        sortKeys: false
      },
      commentConfig: {
        enabled: true,
        includeGenerationInfo: true,
        includeStepDescriptions: true,
        includeOptimizationNotes: true,
        customComments: {}
      },
      preserveComments: true,
      addBlankLines: true
    });

    this.defaultConfig = this.initializeDefaultConfig();
  }

  /**
   * Generate comprehensive testing strategy workflow
   */
  async generateTestingStrategyWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const testingConfig = this.buildTestingConfig(detectionResult, options);
      
      // Create comprehensive testing workflow template
      const workflowTemplate: WorkflowTemplate = {
        name: 'Comprehensive Testing Strategy',
        type: 'ci',
        triggers: {
          push: {
            branches: ['main', 'develop', 'feature/*']
          },
          pullRequest: {
            branches: ['main', 'develop']
          },
          schedule: [
            { cron: '0 2 * * 1' }, // Weekly comprehensive testing
            { cron: '0 6 * * *' }  // Daily integration testing
          ],
          workflowDispatch: {
            inputs: {
              testType: {
                description: 'Type of testing to perform',
                required: true,
                default: 'comprehensive',
                type: 'choice',
                options: ['unit', 'integration', 'e2e', 'contract', 'chaos', 'comprehensive']
              },
              environment: {
                description: 'Environment to test against',
                required: false,
                default: 'staging',
                type: 'choice',
                options: ['development', 'staging', 'production']
              }
            }
          }
        },
        jobs: await this.generateTestingJobs(detectionResult, testingConfig, options),
        permissions: {
          contents: 'read',
          actions: 'read',
          checks: 'write',
          pullRequests: 'write',
          issues: 'write'
        },
        concurrency: {
          group: 'testing-${{ github.ref }}',
          cancelInProgress: true
        }
      };

      // Render the workflow to YAML
      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);

      // Generate filename
      const filename = this.generateFilename(detectionResult, 'testing-strategy');

      // Create workflow output
      const workflowOutput: WorkflowOutput = {
        filename,
        content: renderingResult.yaml,
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: this.createDetectionSummary(detectionResult),
          optimizations: [
            'Comprehensive integration testing',
            'End-to-end browser automation',
            'Consumer-driven contract testing',
            'Chaos engineering resilience testing',
            'Automated test data management'
          ],
          warnings: this.generateTestingWarnings(detectionResult, testingConfig)
        }
      };

      return workflowOutput;
    } catch (error) {
      throw new Error(`Failed to generate testing strategy workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate integration testing workflow with service dependency management
   */
  async generateIntegrationTestingWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const workflowTemplate: WorkflowTemplate = {
        name: 'Integration Testing',
        type: 'ci',
        triggers: {
          push: {
            branches: ['main', 'develop']
          },
          pullRequest: {
            branches: ['main', 'develop']
          },
          schedule: [
            { cron: '0 6 * * *' } // Daily integration testing
          ]
        },
        jobs: [
          {
            name: 'integration-tests',
            runsOn: 'ubuntu-latest',
            services: this.generateTestServices(detectionResult),
            steps: this.generateIntegrationTestSteps(detectionResult, options)
          }
        ],
        permissions: {
          contents: 'read',
          checks: 'write'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, 'integration-testing');

      return {
        filename,
        content: renderingResult.yaml,
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: `Integration testing for ${detectionResult.frameworks.map(f => f.name).join(', ')}`,
          optimizations: ['Service dependency management', 'Database testing', 'API integration testing'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate integration testing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  
/**
   * Generate end-to-end testing workflow with browser automation and API testing
   */
  async generateE2ETestingWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const hasWebFramework = this.hasWebFramework(detectionResult);
      
      if (!hasWebFramework) {
        throw new Error('E2E testing workflow requires a web application framework');
      }

      const workflowTemplate: WorkflowTemplate = {
        name: 'End-to-End Testing',
        type: 'ci',
        triggers: {
          push: {
            branches: ['main', 'develop']
          },
          pullRequest: {
            branches: ['main', 'develop']
          },
          schedule: [
            { cron: '0 3 * * 2,4,6' } // Three times a week
          ],
          workflowDispatch: {
            inputs: {
              browser: {
                description: 'Browser to test with',
                required: false,
                default: 'chromium',
                type: 'choice',
                options: ['chromium', 'firefox', 'webkit', 'all']
              },
              environment: {
                description: 'Environment to test',
                required: false,
                default: 'staging'
              }
            }
          }
        },
        jobs: [
          {
            name: 'e2e-tests',
            runsOn: 'ubuntu-latest',
            strategy: this.generateE2ETestMatrix(detectionResult),
            steps: this.generateE2ETestSteps(detectionResult, options)
          }
        ],
        permissions: {
          contents: 'read',
          checks: 'write'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, 'e2e-testing');

      return {
        filename,
        content: renderingResult.yaml,
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: `E2E testing for web application`,
          optimizations: ['Cross-browser testing', 'Visual regression testing', 'API testing'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate E2E testing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate contract testing workflow with consumer-driven contract testing
   */
  async generateContractTestingWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const workflowTemplate: WorkflowTemplate = {
        name: 'Contract Testing',
        type: 'ci',
        triggers: {
          push: {
            branches: ['main', 'develop']
          },
          pullRequest: {
            branches: ['main', 'develop']
          },
          schedule: [
            { cron: '0 4 * * 1,3,5' } // Three times a week
          ]
        },
        jobs: [
          {
            name: 'contract-tests-consumer',
            runsOn: 'ubuntu-latest',
            steps: this.generateContractConsumerSteps(detectionResult, options)
          },
          {
            name: 'contract-tests-provider',
            runsOn: 'ubuntu-latest',
            needs: ['contract-tests-consumer'],
            steps: this.generateContractProviderSteps(detectionResult, options)
          }
        ],
        permissions: {
          contents: 'read',
          checks: 'write'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, 'contract-testing');

      return {
        filename,
        content: renderingResult.yaml,
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: `Contract testing for API services`,
          optimizations: ['Consumer-driven contracts', 'Provider verification', 'Schema validation'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate contract testing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate chaos engineering workflow with fault injection and resilience testing
   */
  async generateChaosEngineeringWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const workflowTemplate: WorkflowTemplate = {
        name: 'Chaos Engineering',
        type: 'ci',
        triggers: {
          schedule: [
            { cron: '0 5 * * 1' } // Weekly chaos testing
          ],
          workflowDispatch: {
            inputs: {
              chaosType: {
                description: 'Type of chaos experiment',
                required: true,
                default: 'network',
                type: 'choice',
                options: ['network', 'resource', 'timeout', 'comprehensive']
              },
              duration: {
                description: 'Duration of chaos experiment (minutes)',
                required: false,
                default: '10'
              }
            }
          }
        },
        jobs: [
          {
            name: 'chaos-experiments',
            runsOn: 'ubuntu-latest',
            steps: this.generateChaosEngineeringSteps(detectionResult, options)
          }
        ],
        permissions: {
          contents: 'read',
          checks: 'write'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, 'chaos-engineering');

      return {
        filename,
        content: renderingResult.yaml,
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: `Chaos engineering for resilience testing`,
          optimizations: ['Fault injection', 'Network chaos', 'Resource chaos', 'Timeout testing'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate chaos engineering workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate test data management workflow with provisioning and cleanup
   */
  async generateTestDataManagementWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const workflowTemplate: WorkflowTemplate = {
        name: 'Test Data Management',
        type: 'ci',
        triggers: {
          schedule: [
            { cron: '0 1 * * *' } // Daily test data management
          ],
          workflowDispatch: {
            inputs: {
              action: {
                description: 'Test data action',
                required: true,
                default: 'refresh',
                type: 'choice',
                options: ['provision', 'refresh', 'cleanup', 'anonymize']
              },
              environment: {
                description: 'Target environment',
                required: false,
                default: 'staging',
                type: 'choice',
                options: ['development', 'staging', 'testing']
              }
            }
          }
        },
        jobs: [
          {
            name: 'test-data-management',
            runsOn: 'ubuntu-latest',
            steps: this.generateTestDataManagementSteps(detectionResult, options)
          }
        ],
        permissions: {
          contents: 'read',
          actions: 'read'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, 'test-data-management');

      return {
        filename,
        content: renderingResult.yaml,
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: `Test data management for testing environments`,
          optimizations: ['Automated provisioning', 'Data anonymization', 'Cleanup automation'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate test data management workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive testing jobs for all testing types
   */
  private async generateTestingJobs(
    detectionResult: DetectionResult,
    testingConfig: AdvancedTestingConfig,
    options: GenerationOptions
  ): Promise<any[]> {
    const jobs: any[] = [];

    // Unit Tests (always included as baseline)
    jobs.push({
      name: 'unit-tests',
      runsOn: 'ubuntu-latest',
      steps: this.generateUnitTestSteps(detectionResult, options)
    });

    // Integration Tests
    if (testingConfig.integration.enabled) {
      jobs.push({
        name: 'integration-tests',
        runsOn: 'ubuntu-latest',
        needs: ['unit-tests'],
        services: this.generateTestServices(detectionResult),
        if: "github.event.inputs.testType == 'integration' || github.event.inputs.testType == 'comprehensive'",
        steps: this.generateIntegrationTestSteps(detectionResult, options)
      });
    }

    // E2E Tests
    if (testingConfig.e2e.enabled && this.hasWebFramework(detectionResult)) {
      jobs.push({
        name: 'e2e-tests',
        runsOn: 'ubuntu-latest',
        needs: ['integration-tests'],
        if: "github.event.inputs.testType == 'e2e' || github.event.inputs.testType == 'comprehensive'",
        strategy: this.generateE2ETestMatrix(detectionResult),
        steps: this.generateE2ETestSteps(detectionResult, options)
      });
    }

    // Contract Tests
    if (testingConfig.contract.enabled) {
      jobs.push({
        name: 'contract-tests-consumer',
        runsOn: 'ubuntu-latest',
        if: "github.event.inputs.testType == 'contract' || github.event.inputs.testType == 'comprehensive'",
        steps: this.generateContractConsumerSteps(detectionResult, options)
      });

      jobs.push({
        name: 'contract-tests-provider',
        runsOn: 'ubuntu-latest',
        needs: ['contract-tests-consumer'],
        if: "github.event.inputs.testType == 'contract' || github.event.inputs.testType == 'comprehensive'",
        steps: this.generateContractProviderSteps(detectionResult, options)
      });
    }

    // Chaos Engineering Tests
    if (testingConfig.chaos.enabled) {
      jobs.push({
        name: 'chaos-experiments',
        runsOn: 'ubuntu-latest',
        if: "github.event.inputs.testType == 'chaos' || github.event.inputs.testType == 'comprehensive'",
        steps: this.generateChaosEngineeringSteps(detectionResult, options)
      });
    }

    // Test Data Management
    if (testingConfig.testData.enabled) {
      jobs.push({
        name: 'test-data-setup',
        runsOn: 'ubuntu-latest',
        if: "github.event.inputs.testType == 'comprehensive'",
        steps: this.generateTestDataManagementSteps(detectionResult, options)
      });
    }

    // Test Results Aggregation
    jobs.push({
      name: 'test-results',
      runsOn: 'ubuntu-latest',
      needs: jobs.map(job => job.name).filter(name => name !== 'test-results'),
      if: 'always()',
      steps: this.generateTestResultsAggregationSteps(detectionResult, options)
    });

    return jobs;
  } 
 /**
   * Generate integration test steps with service dependency management
   */
  private generateIntegrationTestSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const languages = detectionResult.languages;
    const frameworks = detectionResult.frameworks;

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Setup language environment
    steps.push(...this.generateLanguageSetupSteps(languages));

    // Setup test containers for service dependencies
    steps.push({
      name: 'Setup test containers',
      run: `
        echo "Setting up test containers for integration testing..."
        docker-compose -f docker-compose.test.yml up -d
        sleep 30  # Wait for services to be ready
      `,
      shell: 'bash'
    });

    // Wait for services to be ready
    steps.push({
      name: 'Wait for services to be ready',
      run: this.getServiceReadinessCheck(detectionResult),
      shell: 'bash'
    });

    // Run database migrations if needed
    if (this.hasDatabaseFramework(detectionResult)) {
      steps.push({
        name: 'Run database migrations',
        run: this.getDatabaseMigrationCommand(detectionResult),
        env: {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
          NODE_ENV: 'test'
        }
      });
    }

    // Install dependencies
    steps.push({
      name: 'Install dependencies',
      run: this.getInstallCommand(detectionResult.packageManagers)
    });

    // Run integration tests
    steps.push({
      name: 'Run integration tests',
      run: this.getIntegrationTestCommand(detectionResult),
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
        REDIS_URL: 'redis://localhost:6379',
        API_BASE_URL: 'http://localhost:3000'
      }
    });

    // Generate test coverage report
    steps.push({
      name: 'Generate integration test coverage',
      run: this.getCoverageCommand(detectionResult),
      continueOnError: true
    });

    // Upload test results
    steps.push({
      name: 'Upload integration test results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'integration-test-results',
        path: 'test-results/integration/'
      }
    });

    // Cleanup test containers
    steps.push({
      name: 'Cleanup test containers',
      if: 'always()',
      run: 'docker-compose -f docker-compose.test.yml down -v',
      shell: 'bash'
    });

    return steps;
  }

  /**
   * Generate E2E test steps with browser automation and API testing
   */
  private generateE2ETestSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const e2eTool = this.detectE2ETool(detectionResult);

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Setup Node.js for E2E testing
    steps.push({
      name: 'Setup Node.js',
      uses: 'actions/setup-node@v4',
      with: {
        'node-version': '18',
        cache: 'npm'
      }
    });

    // Install dependencies
    steps.push({
      name: 'Install dependencies',
      run: 'npm ci'
    });

    // Install E2E testing dependencies
    steps.push({
      name: 'Install E2E testing dependencies',
      run: this.getE2EInstallCommand(e2eTool)
    });

    // Start application for E2E testing
    steps.push({
      name: 'Start application',
      run: this.getApplicationStartCommand(detectionResult),
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    });

    // Wait for application to be ready
    steps.push({
      name: 'Wait for application to be ready',
      run: 'npx wait-on http://localhost:3000 --timeout 60000'
    });

    // Run E2E tests based on detected tool
    if (e2eTool === 'playwright') {
      steps.push(...this.generatePlaywrightSteps(detectionResult));
    } else if (e2eTool === 'cypress') {
      steps.push(...this.generateCypressSteps(detectionResult));
    } else {
      steps.push(...this.generateGenericE2ESteps(detectionResult));
    }

    // Upload E2E test results
    steps.push({
      name: 'Upload E2E test results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'e2e-test-results-${{ matrix.browser }}',
        path: 'test-results/e2e/'
      }
    });

    // Upload screenshots and videos on failure
    steps.push({
      name: 'Upload test artifacts on failure',
      uses: 'actions/upload-artifact@v4',
      if: 'failure()',
      with: {
        name: 'e2e-artifacts-${{ matrix.browser }}',
        path: 'test-results/artifacts/'
      }
    });

    return steps;
  }

  /**
   * Generate contract consumer test steps
   */
  private generateContractConsumerSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const contractTool = this.detectContractTool(detectionResult);

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Setup language environment
    steps.push(...this.generateLanguageSetupSteps(detectionResult.languages));

    // Install dependencies
    steps.push({
      name: 'Install dependencies',
      run: this.getInstallCommand(detectionResult.packageManagers)
    });

    // Generate consumer contracts
    steps.push({
      name: 'Generate consumer contracts',
      run: this.getContractGenerationCommand(contractTool, 'consumer'),
      env: {
        PACT_BROKER_BASE_URL: '${{ secrets.PACT_BROKER_URL }}',
        PACT_BROKER_TOKEN: '${{ secrets.PACT_BROKER_TOKEN }}'
      }
    });

    // Run consumer contract tests
    steps.push({
      name: 'Run consumer contract tests',
      run: this.getContractTestCommand(contractTool, 'consumer')
    });

    // Publish consumer contracts
    steps.push({
      name: 'Publish consumer contracts',
      run: this.getContractPublishCommand(contractTool, 'consumer'),
      env: {
        PACT_BROKER_BASE_URL: '${{ secrets.PACT_BROKER_URL }}',
        PACT_BROKER_TOKEN: '${{ secrets.PACT_BROKER_TOKEN }}'
      }
    });

    // Upload contract test results
    steps.push({
      name: 'Upload contract test results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'contract-consumer-results',
        path: 'test-results/contracts/consumer/'
      }
    });

    return steps;
  }

  /**
   * Generate contract provider test steps
   */
  private generateContractProviderSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const contractTool = this.detectContractTool(detectionResult);

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Setup language environment
    steps.push(...this.generateLanguageSetupSteps(detectionResult.languages));

    // Install dependencies
    steps.push({
      name: 'Install dependencies',
      run: this.getInstallCommand(detectionResult.packageManagers)
    });

    // Start provider application
    steps.push({
      name: 'Start provider application',
      run: this.getApplicationStartCommand(detectionResult),
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    });

    // Wait for provider to be ready
    steps.push({
      name: 'Wait for provider to be ready',
      run: 'npx wait-on http://localhost:3000 --timeout 60000'
    });

    // Download consumer contracts
    steps.push({
      name: 'Download consumer contracts',
      run: this.getContractDownloadCommand(contractTool),
      env: {
        PACT_BROKER_BASE_URL: '${{ secrets.PACT_BROKER_URL }}',
        PACT_BROKER_TOKEN: '${{ secrets.PACT_BROKER_TOKEN }}'
      }
    });

    // Run provider contract verification
    steps.push({
      name: 'Run provider contract verification',
      run: this.getContractVerificationCommand(contractTool),
      env: {
        PROVIDER_BASE_URL: 'http://localhost:3000'
      }
    });

    // Publish verification results
    steps.push({
      name: 'Publish verification results',
      run: this.getContractPublishCommand(contractTool, 'provider'),
      env: {
        PACT_BROKER_BASE_URL: '${{ secrets.PACT_BROKER_URL }}',
        PACT_BROKER_TOKEN: '${{ secrets.PACT_BROKER_TOKEN }}'
      }
    });

    // Upload provider test results
    steps.push({
      name: 'Upload provider test results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'contract-provider-results',
        path: 'test-results/contracts/provider/'
      }
    });

    return steps;
  }

  /**
   * Generate chaos engineering steps with fault injection and resilience testing
   */
  private generateChaosEngineeringSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const chaosTool = this.detectChaosTool(detectionResult);

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Setup chaos engineering tools
    steps.push({
      name: 'Setup chaos engineering tools',
      run: this.getChaosToolSetupCommand(chaosTool)
    });

    // Start application for chaos testing
    steps.push({
      name: 'Start application for chaos testing',
      run: this.getApplicationStartCommand(detectionResult),
      env: {
        NODE_ENV: 'chaos',
        PORT: '3000'
      }
    });

    // Wait for application to be ready
    steps.push({
      name: 'Wait for application to be ready',
      run: 'npx wait-on http://localhost:3000 --timeout 60000'
    });

    // Run network chaos experiments
    steps.push({
      name: 'Run network chaos experiments',
      run: this.getNetworkChaosCommand(chaosTool),
      if: "github.event.inputs.chaosType == 'network' || github.event.inputs.chaosType == 'comprehensive'",
      continueOnError: true
    });

    // Run resource chaos experiments
    steps.push({
      name: 'Run resource chaos experiments',
      run: this.getResourceChaosCommand(chaosTool),
      if: "github.event.inputs.chaosType == 'resource' || github.event.inputs.chaosType == 'comprehensive'",
      continueOnError: true
    });

    // Run timeout chaos experiments
    steps.push({
      name: 'Run timeout chaos experiments',
      run: this.getTimeoutChaosCommand(chaosTool),
      if: "github.event.inputs.chaosType == 'timeout' || github.event.inputs.chaosType == 'comprehensive'",
      continueOnError: true
    });

    // Collect chaos experiment results
    steps.push({
      name: 'Collect chaos experiment results',
      run: `
        echo "Collecting chaos experiment results..."
        mkdir -p test-results/chaos
        # Collect application logs
        docker logs \$(docker ps -q) > test-results/chaos/application.log 2>&1 || true
        # Collect system metrics
        echo "System metrics during chaos experiments" > test-results/chaos/metrics.txt
      `,
      shell: 'bash'
    });

    // Upload chaos test results
    steps.push({
      name: 'Upload chaos test results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'chaos-test-results',
        path: 'test-results/chaos/'
      }
    });

    return steps;
  }

  /**
   * Generate test data management steps with provisioning and cleanup
   */
  private generateTestDataManagementSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Setup language environment
    steps.push(...this.generateLanguageSetupSteps(detectionResult.languages));

    // Install dependencies
    steps.push({
      name: 'Install dependencies',
      run: this.getInstallCommand(detectionResult.packageManagers)
    });

    // Setup test database
    if (this.hasDatabaseFramework(detectionResult)) {
      steps.push({
        name: 'Setup test database',
        run: `
          echo "Setting up test database..."
          docker run -d --name test-db -p 5432:5432 -e POSTGRES_PASSWORD=test -e POSTGRES_DB=testdb postgres:13
          sleep 10
        `,
        shell: 'bash'
      });
    }

    // Provision test data
    steps.push({
      name: 'Provision test data',
      run: this.getTestDataProvisionCommand(detectionResult),
      if: "github.event.inputs.action == 'provision' || github.event.inputs.action == 'refresh'",
      env: {
        DATABASE_URL: 'postgresql://postgres:test@localhost:5432/testdb',
        NODE_ENV: 'test'
      }
    });

    // Anonymize sensitive data
    steps.push({
      name: 'Anonymize sensitive data',
      run: this.getDataAnonymizationCommand(detectionResult),
      if: "github.event.inputs.action == 'anonymize'",
      env: {
        DATABASE_URL: 'postgresql://postgres:test@localhost:5432/testdb'
      }
    });

    // Generate synthetic test data
    steps.push({
      name: 'Generate synthetic test data',
      run: this.getSyntheticDataGenerationCommand(detectionResult),
      if: "github.event.inputs.action == 'provision' || github.event.inputs.action == 'refresh'"
    });

    // Validate test data integrity
    steps.push({
      name: 'Validate test data integrity',
      run: this.getDataValidationCommand(detectionResult),
      continueOnError: true
    });

    // Cleanup test data
    steps.push({
      name: 'Cleanup test data',
      run: this.getTestDataCleanupCommand(detectionResult),
      if: "github.event.inputs.action == 'cleanup' || always()",
      env: {
        DATABASE_URL: 'postgresql://postgres:test@localhost:5432/testdb'
      }
    });

    // Upload test data reports
    steps.push({
      name: 'Upload test data reports',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'test-data-reports',
        path: 'test-results/data-management/'
      }
    });

    return steps;
  }

  /**
   * Generate unit test steps (baseline for all testing strategies)
   */
  private generateUnitTestSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Setup language environment
    steps.push(...this.generateLanguageSetupSteps(detectionResult.languages));

    // Install dependencies
    steps.push({
      name: 'Install dependencies',
      run: this.getInstallCommand(detectionResult.packageManagers)
    });

    // Run unit tests
    steps.push({
      name: 'Run unit tests',
      run: this.getUnitTestCommand(detectionResult)
    });

    // Generate coverage report
    steps.push({
      name: 'Generate coverage report',
      run: this.getCoverageCommand(detectionResult),
      continueOnError: true
    });

    // Upload test results
    steps.push({
      name: 'Upload unit test results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'unit-test-results',
        path: 'test-results/unit/'
      }
    });

    return steps;
  }

  /**
   * Generate test results aggregation steps
   */
  private generateTestResultsAggregationSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Download all test artifacts
    steps.push({
      name: 'Download test artifacts',
      uses: 'actions/download-artifact@v4',
      with: {
        path: 'all-test-results/'
      }
    });

    // Aggregate test results
    steps.push({
      name: 'Aggregate test results',
      run: `
        echo "Aggregating test results..."
        mkdir -p aggregated-results
        
        # Combine all test results
        find all-test-results/ -name "*.xml" -exec cp {} aggregated-results/ \\;
        find all-test-results/ -name "*.json" -exec cp {} aggregated-results/ \\;
        
        # Generate summary report
        echo "# Test Results Summary" > aggregated-results/summary.md
        echo "Generated at: \$(date)" >> aggregated-results/summary.md
        echo "" >> aggregated-results/summary.md
        
        # Count test files
        unit_tests=\$(find all-test-results/ -name "*unit*" | wc -l)
        integration_tests=\$(find all-test-results/ -name "*integration*" | wc -l)
        e2e_tests=\$(find all-test-results/ -name "*e2e*" | wc -l)
        contract_tests=\$(find all-test-results/ -name "*contract*" | wc -l)
        chaos_tests=\$(find all-test-results/ -name "*chaos*" | wc -l)
        
        echo "- Unit Tests: \$unit_tests" >> aggregated-results/summary.md
        echo "- Integration Tests: \$integration_tests" >> aggregated-results/summary.md
        echo "- E2E Tests: \$e2e_tests" >> aggregated-results/summary.md
        echo "- Contract Tests: \$contract_tests" >> aggregated-results/summary.md
        echo "- Chaos Tests: \$chaos_tests" >> aggregated-results/summary.md
      `,
      shell: 'bash'
    });

    // Upload aggregated results
    steps.push({
      name: 'Upload aggregated test results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'aggregated-test-results',
        path: 'aggregated-results/'
      }
    });

    // Comment on PR with test summary
    steps.push({
      name: 'Comment on PR with test summary',
      uses: 'actions/github-script@v7',
      if: 'github.event_name == \'pull_request\'',
      with: {
        script: `
          const fs = require('fs');
          const summary = fs.readFileSync('aggregated-results/summary.md', 'utf8');
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '## 🧪 Test Results\\n\\n' + summary
          });
        `
      }
    });

    return steps;
  }

  /**
   * Generate language setup steps
   */
  private generateLanguageSetupSteps(languages: any[]): StepTemplate[] {
    const steps: StepTemplate[] = [];

    for (const language of languages) {
      switch (language.name.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          steps.push({
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': language.version || '18',
              cache: 'npm'
            }
          });
          break;
        case 'python':
          steps.push({
            name: 'Setup Python',
            uses: 'actions/setup-python@v4',
            with: {
              'python-version': language.version || '3.9'
            }
          });
          break;
        case 'java':
          steps.push({
            name: 'Setup Java',
            uses: 'actions/setup-java@v4',
            with: {
              'java-version': language.version || '11',
              distribution: 'temurin'
            }
          });
          break;
        case 'go':
          steps.push({
            name: 'Setup Go',
            uses: 'actions/setup-go@v4',
            with: {
              'go-version': language.version || '1.19'
            }
          });
          break;
        case 'rust':
          steps.push({
            name: 'Setup Rust',
            uses: 'actions-rs/toolchain@v1',
            with: {
              toolchain: language.version || 'stable',
              override: true
            }
          });
          break;
      }
    }

    return steps;
  }

  /**
   * Generate test services configuration
   */
  private generateTestServices(detectionResult: DetectionResult): Record<string, any> {
    const services: Record<string, any> = {};

    // Add PostgreSQL if database framework detected
    if (this.hasDatabaseFramework(detectionResult)) {
      services.postgres = {
        image: 'postgres:13',
        env: {
          POSTGRES_PASSWORD: 'test',
          POSTGRES_DB: 'testdb'
        },
        options: '--health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5',
        ports: ['5432:5432']
      };
    }

    // Add Redis if caching framework detected
    if (this.hasCachingFramework(detectionResult)) {
      services.redis = {
        image: 'redis:6',
        options: '--health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5',
        ports: ['6379:6379']
      };
    }

    // Add message queue if needed
    if (this.hasMessageQueueFramework(detectionResult)) {
      services.rabbitmq = {
        image: 'rabbitmq:3-management',
        env: {
          RABBITMQ_DEFAULT_USER: 'test',
          RABBITMQ_DEFAULT_PASS: 'test'
        },
        ports: ['5672:5672', '15672:15672']
      };
    }

    return services;
  }

  /**
   * Generate E2E test matrix strategy
   */
  private generateE2ETestMatrix(detectionResult: DetectionResult): any {
    const browsers = ['chromium'];
    
    // Add more browsers for comprehensive testing
    if (this.shouldUseCrossBrowserTesting(detectionResult)) {
      browsers.push('firefox', 'webkit');
    }

    return {
      matrix: {
        browser: browsers
      },
      failFast: false
    };
  }

  /**
   * Generate Playwright-specific steps
   */
  private generatePlaywrightSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Install Playwright browsers',
        run: 'npx playwright install --with-deps ${{ matrix.browser }}'
      },
      {
        name: 'Run Playwright tests',
        run: 'npx playwright test --project=${{ matrix.browser }}',
        env: {
          BASE_URL: 'http://localhost:3000'
        }
      }
    ];
  }

  /**
   * Generate Cypress-specific steps
   */
  private generateCypressSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Run Cypress tests',
        uses: 'cypress-io/github-action@v6',
        with: {
          start: this.getApplicationStartCommand(detectionResult),
          wait: 'http://localhost:3000',
          browser: '${{ matrix.browser }}'
        },
        env: {
          CYPRESS_BASE_URL: 'http://localhost:3000'
        }
      }
    ];
  }

  /**
   * Generate generic E2E steps
   */
  private generateGenericE2ESteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Run E2E tests',
        run: this.getE2ETestCommand(detectionResult),
        env: {
          BASE_URL: 'http://localhost:3000'
        }
      }
    ];
  }

  /**
   * Utility methods for framework detection
   */
  private hasWebFramework(detectionResult: DetectionResult): boolean {
    const webFrameworks = ['react', 'vue', 'angular', 'express', 'fastify', 'koa', 'django', 'flask', 'fastapi'];
    return detectionResult.frameworks.some(f => 
      webFrameworks.includes(f.name.toLowerCase())
    );
  }

  private hasDatabaseFramework(detectionResult: DetectionResult): boolean {
    const dbFrameworks = ['sequelize', 'typeorm', 'prisma', 'mongoose', 'sqlalchemy', 'django'];
    return detectionResult.frameworks.some(f => 
      dbFrameworks.includes(f.name.toLowerCase())
    );
  }

  private hasCachingFramework(detectionResult: DetectionResult): boolean {
    const cacheFrameworks = ['redis', 'memcached'];
    return detectionResult.frameworks.some(f => 
      cacheFrameworks.includes(f.name.toLowerCase())
    );
  }

  private hasMessageQueueFramework(detectionResult: DetectionResult): boolean {
    const mqFrameworks = ['rabbitmq', 'kafka', 'redis'];
    return detectionResult.frameworks.some(f => 
      mqFrameworks.includes(f.name.toLowerCase())
    );
  }

  private shouldUseCrossBrowserTesting(detectionResult: DetectionResult): boolean {
    // Use cross-browser testing for frontend frameworks
    const frontendFrameworks = ['react', 'vue', 'angular'];
    return detectionResult.frameworks.some(f => 
      frontendFrameworks.includes(f.name.toLowerCase())
    );
  }

  /**
   * Tool detection methods
   */
  private detectE2ETool(detectionResult: DetectionResult): E2ETestTool {
    const testingFrameworks = detectionResult.testingFrameworks || [];
    
    if (testingFrameworks.some(t => t.name.toLowerCase().includes('playwright'))) {
      return 'playwright';
    }
    if (testingFrameworks.some(t => t.name.toLowerCase().includes('cypress'))) {
      return 'cypress';
    }
    if (testingFrameworks.some(t => t.name.toLowerCase().includes('selenium'))) {
      return 'selenium';
    }
    
    // Default to Playwright for modern web apps
    return 'playwright';
  }

  private detectContractTool(detectionResult: DetectionResult): ContractTestTool {
    const languages = detectionResult.languages;
    
    if (languages.some(l => l.name.toLowerCase() === 'java')) {
      return 'spring-cloud-contract';
    }
    
    // Default to Pact for most languages
    return 'pact';
  }

  private detectChaosTool(detectionResult: DetectionResult): ChaosTestTool {
    // Default to chaos-toolkit for general purpose chaos engineering
    return 'chaos-toolkit';
  } 
 /**
   * Command generation methods
   */
  private getInstallCommand(packageManagers: any[]): string {
    if (packageManagers.some(pm => pm.name === 'npm')) {
      return 'npm ci';
    }
    if (packageManagers.some(pm => pm.name === 'yarn')) {
      return 'yarn install --frozen-lockfile';
    }
    if (packageManagers.some(pm => pm.name === 'pnpm')) {
      return 'pnpm install --frozen-lockfile';
    }
    if (packageManagers.some(pm => pm.name === 'pip')) {
      return 'pip install -r requirements.txt';
    }
    if (packageManagers.some(pm => pm.name === 'poetry')) {
      return 'poetry install';
    }
    if (packageManagers.some(pm => pm.name === 'cargo')) {
      return 'cargo build';
    }
    if (packageManagers.some(pm => pm.name === 'maven')) {
      return 'mvn install -DskipTests';
    }
    if (packageManagers.some(pm => pm.name === 'gradle')) {
      return './gradlew build -x test';
    }
    
    return 'echo "No package manager detected"';
  }

  private getUnitTestCommand(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages;
    const frameworks = detectionResult.frameworks;

    if (languages.some(l => l.name.toLowerCase() === 'javascript' || l.name.toLowerCase() === 'typescript')) {
      if (frameworks.some(f => f.name.toLowerCase() === 'jest')) {
        return 'npm run test:unit || npm test';
      }
      if (frameworks.some(f => f.name.toLowerCase() === 'vitest')) {
        return 'npm run test:unit || npx vitest run';
      }
      return 'npm test';
    }

    if (languages.some(l => l.name.toLowerCase() === 'python')) {
      return 'python -m pytest tests/unit/ -v';
    }

    if (languages.some(l => l.name.toLowerCase() === 'java')) {
      if (detectionResult.packageManagers.some(pm => pm.name === 'maven')) {
        return 'mvn test';
      }
      if (detectionResult.packageManagers.some(pm => pm.name === 'gradle')) {
        return './gradlew test';
      }
    }

    if (languages.some(l => l.name.toLowerCase() === 'go')) {
      return 'go test ./... -v';
    }

    if (languages.some(l => l.name.toLowerCase() === 'rust')) {
      return 'cargo test';
    }

    return 'echo "No unit test command configured"';
  }

  private getIntegrationTestCommand(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages;

    if (languages.some(l => l.name.toLowerCase() === 'javascript' || l.name.toLowerCase() === 'typescript')) {
      return 'npm run test:integration || npm run test -- --testPathPattern=integration';
    }

    if (languages.some(l => l.name.toLowerCase() === 'python')) {
      return 'python -m pytest tests/integration/ -v';
    }

    if (languages.some(l => l.name.toLowerCase() === 'java')) {
      return 'mvn test -Dtest=**/*IntegrationTest';
    }

    if (languages.some(l => l.name.toLowerCase() === 'go')) {
      return 'go test ./... -tags=integration -v';
    }

    return 'echo "No integration test command configured"';
  }

  private getE2ETestCommand(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages;

    if (languages.some(l => l.name.toLowerCase() === 'javascript' || l.name.toLowerCase() === 'typescript')) {
      return 'npm run test:e2e || npm run e2e';
    }

    if (languages.some(l => l.name.toLowerCase() === 'python')) {
      return 'python -m pytest tests/e2e/ -v';
    }

    return 'echo "No E2E test command configured"';
  }

  private getCoverageCommand(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages;

    if (languages.some(l => l.name.toLowerCase() === 'javascript' || l.name.toLowerCase() === 'typescript')) {
      return 'npm run test:coverage || npm run coverage';
    }

    if (languages.some(l => l.name.toLowerCase() === 'python')) {
      return 'python -m pytest --cov=src --cov-report=xml --cov-report=html';
    }

    if (languages.some(l => l.name.toLowerCase() === 'java')) {
      return 'mvn jacoco:report';
    }

    if (languages.some(l => l.name.toLowerCase() === 'go')) {
      return 'go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out -o coverage.html';
    }

    return 'echo "No coverage command configured"';
  }

  private getApplicationStartCommand(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks;
    const languages = detectionResult.languages;

    if (frameworks.some(f => f.name.toLowerCase() === 'express')) {
      return 'npm start &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'react')) {
      return 'npm start &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'next.js')) {
      return 'npm run build && npm start &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'django')) {
      return 'python manage.py runserver &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'flask')) {
      return 'python app.py &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'fastapi')) {
      return 'uvicorn main:app --host 0.0.0.0 --port 3000 &';
    }

    if (languages.some(l => l.name.toLowerCase() === 'javascript' || l.name.toLowerCase() === 'typescript')) {
      return 'npm start &';
    }

    return 'echo "No application start command configured" && sleep 5 &';
  }

  private getE2EInstallCommand(tool: E2ETestTool): string {
    switch (tool) {
      case 'playwright':
        return 'npm install -D @playwright/test';
      case 'cypress':
        return 'npm install -D cypress';
      case 'selenium':
        return 'npm install -D selenium-webdriver';
      case 'puppeteer':
        return 'npm install -D puppeteer';
      default:
        return 'npm install -D @playwright/test';
    }
  }

  private getServiceReadinessCheck(detectionResult: DetectionResult): string {
    let checks = [];

    if (this.hasDatabaseFramework(detectionResult)) {
      checks.push('until pg_isready -h localhost -p 5432; do sleep 1; done');
    }

    if (this.hasCachingFramework(detectionResult)) {
      checks.push('until redis-cli -h localhost -p 6379 ping; do sleep 1; done');
    }

    if (checks.length === 0) {
      return 'echo "No services to check"';
    }

    return checks.join(' && ');
  }

  private getDatabaseMigrationCommand(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks;

    if (frameworks.some(f => f.name.toLowerCase() === 'sequelize')) {
      return 'npx sequelize-cli db:migrate';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'typeorm')) {
      return 'npx typeorm migration:run';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'prisma')) {
      return 'npx prisma migrate deploy';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'django')) {
      return 'python manage.py migrate';
    }

    return 'echo "No migration command configured"';
  }

  /**
   * Contract testing command methods
   */
  private getContractGenerationCommand(tool: ContractTestTool, type: 'consumer' | 'provider'): string {
    switch (tool) {
      case 'pact':
        return type === 'consumer' 
          ? 'npm run test:pact:consumer'
          : 'npm run test:pact:provider';
      case 'spring-cloud-contract':
        return type === 'consumer'
          ? 'mvn spring-cloud-contract:generateStubs'
          : 'mvn spring-cloud-contract:generateTests';
      default:
        return `echo "Generating ${type} contracts with ${tool}"`;
    }
  }

  private getContractTestCommand(tool: ContractTestTool, type: 'consumer' | 'provider'): string {
    switch (tool) {
      case 'pact':
        return type === 'consumer'
          ? 'npm run test:pact:consumer'
          : 'npm run test:pact:provider';
      default:
        return `echo "Running ${type} contract tests with ${tool}"`;
    }
  }

  private getContractPublishCommand(tool: ContractTestTool, type: 'consumer' | 'provider'): string {
    switch (tool) {
      case 'pact':
        return type === 'consumer'
          ? 'npx pact-broker publish pacts --consumer-app-version=$GITHUB_SHA'
          : 'npx pact-broker create-version-tag --pacticipant=provider --version=$GITHUB_SHA --tag=main';
      default:
        return `echo "Publishing ${type} contracts with ${tool}"`;
    }
  }

  private getContractDownloadCommand(tool: ContractTestTool): string {
    switch (tool) {
      case 'pact':
        return 'npx pact-broker download-pacts --consumer-version-selectors=\'[{"tag":"main"}]\'';
      default:
        return `echo "Downloading contracts with ${tool}"`;
    }
  }

  private getContractVerificationCommand(tool: ContractTestTool): string {
    switch (tool) {
      case 'pact':
        return 'npm run test:pact:verify';
      default:
        return `echo "Verifying contracts with ${tool}"`;
    }
  }

  /**
   * Chaos engineering command methods
   */
  private getChaosToolSetupCommand(tool: ChaosTestTool): string {
    switch (tool) {
      case 'chaos-toolkit':
        return 'pip install chaostoolkit chaostoolkit-kubernetes';
      case 'litmus':
        return 'kubectl apply -f https://litmuschaos.github.io/litmus/litmus-operator-v1.13.8.yaml';
      case 'pumba':
        return 'docker pull gaiaadm/pumba';
      default:
        return 'pip install chaostoolkit';
    }
  }

  private getNetworkChaosCommand(tool: ChaosTestTool): string {
    switch (tool) {
      case 'chaos-toolkit':
        return 'chaos run experiments/network-chaos.json';
      case 'pumba':
        return 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock gaiaadm/pumba netem --duration 2m delay --time 1000 --jitter 100 --distribution normal';
      default:
        return 'echo "Running network chaos experiments"';
    }
  }

  private getResourceChaosCommand(tool: ChaosTestTool): string {
    switch (tool) {
      case 'chaos-toolkit':
        return 'chaos run experiments/resource-chaos.json';
      case 'pumba':
        return 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock gaiaadm/pumba stress --duration 2m --cpu 2 --memory 512m';
      default:
        return 'echo "Running resource chaos experiments"';
    }
  }

  private getTimeoutChaosCommand(tool: ChaosTestTool): string {
    switch (tool) {
      case 'chaos-toolkit':
        return 'chaos run experiments/timeout-chaos.json';
      default:
        return 'echo "Running timeout chaos experiments"';
    }
  }

  /**
   * Test data management command methods
   */
  private getTestDataProvisionCommand(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages;

    if (languages.some(l => l.name.toLowerCase() === 'javascript' || l.name.toLowerCase() === 'typescript')) {
      return 'npm run test:data:provision || node scripts/provision-test-data.js';
    }

    if (languages.some(l => l.name.toLowerCase() === 'python')) {
      return 'python scripts/provision_test_data.py';
    }

    return 'echo "Provisioning test data..."';
  }

  private getDataAnonymizationCommand(detectionResult: DetectionResult): string {
    return 'echo "Anonymizing sensitive test data..." && python scripts/anonymize_data.py';
  }

  private getSyntheticDataGenerationCommand(detectionResult: DetectionResult): string {
    return 'echo "Generating synthetic test data..." && python scripts/generate_synthetic_data.py';
  }

  private getDataValidationCommand(detectionResult: DetectionResult): string {
    return 'echo "Validating test data integrity..." && python scripts/validate_test_data.py';
  }

  private getTestDataCleanupCommand(detectionResult: DetectionResult): string {
    return 'echo "Cleaning up test data..." && python scripts/cleanup_test_data.py';
  }

  /**
   * Configuration and utility methods
   */
  private buildTestingConfig(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): AdvancedTestingConfig {
    const testingStrategy = options.testingStrategy;
    
    return {
      integration: {
        enabled: testingStrategy?.integrationTests ?? true,
        serviceManagement: true,
        databaseTesting: this.hasDatabaseFramework(detectionResult),
        apiTesting: true,
        mockServices: true,
        testContainers: true
      },
      e2e: {
        enabled: testingStrategy?.e2eTests ?? this.hasWebFramework(detectionResult),
        browserAutomation: this.hasWebFramework(detectionResult),
        apiTesting: true,
        mobileAppTesting: false,
        crossBrowserTesting: this.shouldUseCrossBrowserTesting(detectionResult),
        visualRegression: this.hasWebFramework(detectionResult),
        performanceTesting: testingStrategy?.performanceTests ?? false
      },
      contract: {
        enabled: testingStrategy?.contractTests ?? false,
        consumerDriven: true,
        providerVerification: true,
        schemaValidation: true,
        apiDocumentation: true
      },
      chaos: {
        enabled: testingStrategy?.chaosEngineering ?? false,
        faultInjection: true,
        resilienceTesting: true,
        networkChaos: true,
        resourceChaos: true,
        timeoutTesting: true
      },
      testData: {
        enabled: true,
        provisioning: true,
        cleanup: true,
        anonymization: true,
        generation: true,
        migration: this.hasDatabaseFramework(detectionResult)
      }
    };
  }

  private initializeDefaultConfig(): AdvancedTestingConfig {
    return {
      integration: {
        enabled: true,
        serviceManagement: true,
        databaseTesting: true,
        apiTesting: true,
        mockServices: true,
        testContainers: true
      },
      e2e: {
        enabled: true,
        browserAutomation: true,
        apiTesting: true,
        mobileAppTesting: false,
        crossBrowserTesting: true,
        visualRegression: true,
        performanceTesting: false
      },
      contract: {
        enabled: false,
        consumerDriven: true,
        providerVerification: true,
        schemaValidation: true,
        apiDocumentation: true
      },
      chaos: {
        enabled: false,
        faultInjection: true,
        resilienceTesting: true,
        networkChaos: true,
        resourceChaos: true,
        timeoutTesting: true
      },
      testData: {
        enabled: true,
        provisioning: true,
        cleanup: true,
        anonymization: true,
        generation: true,
        migration: true
      }
    };
  }

  private generateFilename(detectionResult: DetectionResult, suffix: string): string {
    const projectName = detectionResult.projectMetadata?.name || 'project';
    return `${projectName}-${suffix}.yml`;
  }

  private createDetectionSummary(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks.map(f => f.name).join(', ');
    const languages = detectionResult.languages.map(l => l.name).join(', ');
    return `Testing strategy for ${languages} project with ${frameworks}`;
  }

  private generateTestingWarnings(
    detectionResult: DetectionResult,
    testingConfig: AdvancedTestingConfig
  ): string[] {
    const warnings: string[] = [];

    if (testingConfig.e2e.enabled && !this.hasWebFramework(detectionResult)) {
      warnings.push('E2E testing enabled but no web framework detected');
    }

    if (testingConfig.chaos.enabled) {
      warnings.push('Chaos engineering tests may cause temporary service disruption');
    }

    if (!testingConfig.contract.enabled && detectionResult.frameworks.some(f => f.category === 'backend')) {
      warnings.push('Consider enabling contract testing for API services');
    }

    return warnings;
  }
}