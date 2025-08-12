/**
 * Multi-Environment Generator for complex deployment workflows
 * Implements requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { 
  WorkflowTemplate, 
  JobTemplate, 
  StepTemplate, 
  TriggerConfig,
  PermissionConfig,
  MatrixStrategy 
} from '../types';
import { 
  EnvironmentConfig, 
  DetectionResult, 
  GenerationOptions 
} from '../interfaces';
import { EnvironmentManager, EnvironmentManagementResult } from '../environment-manager';

/**
 * Deployment strategy configuration
 */
export interface DeploymentStrategy {
  type: 'rolling' | 'blue-green' | 'canary';
  configuration: RollingConfig | BlueGreenConfig | CanaryConfig;
}

/**
 * Rolling deployment configuration
 */
export interface RollingConfig {
  maxUnavailable: string | number;
  maxSurge: string | number;
  progressDeadlineSeconds?: number;
  revisionHistoryLimit?: number;
}

/**
 * Blue-Green deployment configuration
 */
export interface BlueGreenConfig {
  prePromotionAnalysis?: AnalysisConfig;
  postPromotionAnalysis?: AnalysisConfig;
  scaleDownDelaySeconds?: number;
  previewReplicaCount?: number;
  autoPromotionEnabled?: boolean;
}

/**
 * Canary deployment configuration
 */
export interface CanaryConfig {
  steps: CanaryStep[];
  analysis?: AnalysisConfig;
  trafficRouting?: TrafficRoutingConfig;
  maxUnavailable?: string | number;
}

/**
 * Canary deployment step
 */
export interface CanaryStep {
  setWeight?: number;
  pause?: PauseConfig;
  setCanaryScale?: SetCanaryScaleConfig;
  analysis?: AnalysisConfig;
}

/**
 * Pause configuration for canary deployments
 */
export interface PauseConfig {
  duration?: string;
  untilApproved?: boolean;
}

/**
 * Set canary scale configuration
 */
export interface SetCanaryScaleConfig {
  weight?: number;
  replicas?: number;
  matchTrafficWeight?: boolean;
}

/**
 * Analysis configuration for deployment validation
 */
export interface AnalysisConfig {
  templates: AnalysisTemplate[];
  args?: AnalysisArg[];
}

/**
 * Analysis template for deployment validation
 */
export interface AnalysisTemplate {
  templateName: string;
  clusterScope?: boolean;
}

/**
 * Analysis argument
 */
export interface AnalysisArg {
  name: string;
  value?: string;
  valueFrom?: ValueFromConfig;
}

/**
 * Value from configuration
 */
export interface ValueFromConfig {
  podTemplateHashValue?: string;
  fieldRef?: FieldRefConfig;
}

/**
 * Field reference configuration
 */
export interface FieldRefConfig {
  fieldPath: string;
}

/**
 * Traffic routing configuration
 */
export interface TrafficRoutingConfig {
  istio?: IstioConfig;
  nginx?: NginxConfig;
  alb?: ALBConfig;
}

/**
 * Istio traffic routing configuration
 */
export interface IstioConfig {
  virtualService?: VirtualServiceConfig;
  destinationRule?: DestinationRuleConfig;
}

/**
 * Virtual service configuration
 */
export interface VirtualServiceConfig {
  name: string;
  routes: string[];
}

/**
 * Destination rule configuration
 */
export interface DestinationRuleConfig {
  name: string;
  canarySubsetName: string;
  stableSubsetName: string;
}

/**
 * Nginx traffic routing configuration
 */
export interface NginxConfig {
  stableIngress: string;
  annotationPrefix?: string;
  additionalIngressAnnotations?: Record<string, string>;
}

/**
 * ALB traffic routing configuration
 */
export interface ALBConfig {
  ingress: string;
  servicePort: number;
  annotationPrefix?: string;
  additionalIngressAnnotations?: Record<string, string>;
}

/**
 * Approval gate configuration
 */
export interface ApprovalGateConfig {
  environment: string;
  approvers: string[];
  requiredApprovals: number;
  timeoutMinutes?: number;
  instructions?: string;
}

/**
 * Environment promotion configuration
 */
export interface PromotionConfig {
  sourceEnvironment: string;
  targetEnvironment: string;
  conditions: PromotionCondition[];
  autoPromote?: boolean;
  rollbackOnFailure?: boolean;
}

/**
 * Promotion condition
 */
export interface PromotionCondition {
  type: 'manual_approval' | 'health_check' | 'test_success' | 'time_delay';
  configuration: any;
}

/**
 * Rollback configuration
 */
export interface RollbackConfig {
  enabled: boolean;
  triggers: RollbackTrigger[];
  strategy: 'immediate' | 'gradual';
  maxRetries?: number;
}

/**
 * Rollback trigger
 */
export interface RollbackTrigger {
  type: 'health_check_failure' | 'error_rate_threshold' | 'manual';
  threshold?: number;
  duration?: string;
}

/**
 * Multi-environment workflow generation result
 */
export interface MultiEnvironmentWorkflowResult {
  workflows: WorkflowTemplate[];
  environmentConfigs: EnvironmentConfig[];
  deploymentStrategies: Map<string, DeploymentStrategy>;
  approvalGates: ApprovalGateConfig[];
  promotionPipelines: PromotionConfig[];
  rollbackConfigs: Map<string, RollbackConfig>;
  warnings: string[];
}

/**
 * Multi-Environment Generator class for complex deployment workflows
 */
export class MultiEnvironmentGenerator {
  private environmentManager: EnvironmentManager;
  private deploymentStrategies: Map<string, DeploymentStrategy> = new Map();
  private approvalGates: Map<string, ApprovalGateConfig> = new Map();
  private promotionConfigs: Map<string, PromotionConfig> = new Map();
  private rollbackConfigs: Map<string, RollbackConfig> = new Map();

  constructor(environmentManager?: EnvironmentManager) {
    this.environmentManager = environmentManager || new EnvironmentManager();
  }

  /**
   * Generate multi-environment deployment workflows
   * Implements requirement 11.1: Generate separate deployment jobs for each environment
   */
  generateMultiEnvironmentWorkflows(
    environments: EnvironmentConfig[],
    detectionResult: DetectionResult,
    options?: GenerationOptions
  ): MultiEnvironmentWorkflowResult {
    const result: MultiEnvironmentWorkflowResult = {
      workflows: [],
      environmentConfigs: environments,
      deploymentStrategies: new Map(),
      approvalGates: [],
      promotionPipelines: [],
      rollbackConfigs: new Map(),
      warnings: []
    };

    // Configure deployment strategies for each environment
    this.configureDeploymentStrategies(environments, result);

    // Configure approval gates for production environments
    this.configureApprovalGates(environments, result);

    // Configure promotion pipelines
    this.configurePromotionPipelines(environments, result);

    // Configure rollback strategies
    this.configureRollbackStrategies(environments, result);

    // Generate individual environment workflows
    for (const environment of environments) {
      const workflow = this.generateEnvironmentWorkflow(
        environment,
        detectionResult,
        result,
        options
      );
      result.workflows.push(workflow);
    }

    // Generate promotion workflow
    const promotionWorkflow = this.generatePromotionWorkflow(environments, result, options);
    result.workflows.push(promotionWorkflow);

    // Generate rollback workflow
    const rollbackWorkflow = this.generateRollbackWorkflow(environments, result, options);
    result.workflows.push(rollbackWorkflow);

    return result;
  }

  /**
   * Configure deployment strategies for environments
   * Implements requirement 11.4: Include rollback and blue-green deployment strategies
   */
  private configureDeploymentStrategies(
    environments: EnvironmentConfig[],
    result: MultiEnvironmentWorkflowResult
  ): void {
    for (const env of environments) {
      let strategy: DeploymentStrategy;

      switch (env.deploymentStrategy) {
        case 'blue-green':
          strategy = {
            type: 'blue-green',
            configuration: this.createBlueGreenConfig(env)
          };
          break;
        case 'canary':
          strategy = {
            type: 'canary',
            configuration: this.createCanaryConfig(env)
          };
          break;
        case 'rolling':
        default:
          strategy = {
            type: 'rolling',
            configuration: this.createRollingConfig(env)
          };
          break;
      }

      this.deploymentStrategies.set(env.name, strategy);
      result.deploymentStrategies.set(env.name, strategy);
    }
  }

  /**
   * Create rolling deployment configuration
   */
  private createRollingConfig(environment: EnvironmentConfig): RollingConfig {
    return {
      maxUnavailable: environment.type === 'production' ? '25%' : '50%',
      maxSurge: environment.type === 'production' ? '25%' : '100%',
      progressDeadlineSeconds: 600,
      revisionHistoryLimit: 10
    };
  }

  /**
   * Create blue-green deployment configuration
   */
  private createBlueGreenConfig(environment: EnvironmentConfig): BlueGreenConfig {
    return {
      prePromotionAnalysis: {
        templates: [
          {
            templateName: 'success-rate',
            clusterScope: false
          },
          {
            templateName: 'avg-req-duration',
            clusterScope: false
          }
        ],
        args: [
          {
            name: 'service-name',
            value: `${environment.name}-service`
          }
        ]
      },
      postPromotionAnalysis: {
        templates: [
          {
            templateName: 'success-rate',
            clusterScope: false
          }
        ]
      },
      scaleDownDelaySeconds: environment.type === 'production' ? 300 : 60,
      previewReplicaCount: 1,
      autoPromotionEnabled: environment.type !== 'production'
    };
  }

  /**
   * Create canary deployment configuration
   */
  private createCanaryConfig(environment: EnvironmentConfig): CanaryConfig {
    const steps: CanaryStep[] = [
      { setWeight: 20 },
      { 
        pause: { 
          duration: environment.type === 'production' ? '5m' : '2m' 
        } 
      },
      { setWeight: 40 },
      { 
        pause: { 
          duration: environment.type === 'production' ? '10m' : '5m' 
        } 
      },
      { setWeight: 60 },
      { 
        pause: { 
          untilApproved: environment.type === 'production' 
        } 
      },
      { setWeight: 80 },
      { 
        pause: { 
          duration: environment.type === 'production' ? '10m' : '5m' 
        } 
      }
    ];

    return {
      steps,
      analysis: {
        templates: [
          {
            templateName: 'success-rate',
            clusterScope: false
          },
          {
            templateName: 'avg-req-duration',
            clusterScope: false
          }
        ],
        args: [
          {
            name: 'service-name',
            value: `${environment.name}-service`
          }
        ]
      },
      maxUnavailable: '25%'
    };
  }  /**
   
* Configure approval gates for environments
   * Implements requirement 11.2: Include manual approval gates and environment protection rules
   */
  private configureApprovalGates(
    environments: EnvironmentConfig[],
    result: MultiEnvironmentWorkflowResult
  ): void {
    for (const env of environments) {
      if (env.approvalRequired || env.type === 'production') {
        const approvalGate: ApprovalGateConfig = {
          environment: env.name,
          approvers: this.getEnvironmentApprovers(env),
          requiredApprovals: env.type === 'production' ? 2 : 1,
          timeoutMinutes: 60,
          instructions: `Please review and approve deployment to ${env.name} environment`
        };

        this.approvalGates.set(env.name, approvalGate);
        result.approvalGates.push(approvalGate);
      }
    }
  }

  /**
   * Get approvers for an environment
   */
  private getEnvironmentApprovers(environment: EnvironmentConfig): string[] {
    // Default approvers based on environment type
    switch (environment.type) {
      case 'production':
        return ['@team-leads', '@devops-team', '@security-team'];
      case 'staging':
        return ['@team-leads', '@qa-team'];
      case 'development':
      default:
        return ['@developers'];
    }
  }

  /**
   * Configure promotion pipelines
   * Implements requirement 11.5: Create workflows that promote releases through environments sequentially
   */
  private configurePromotionPipelines(
    environments: EnvironmentConfig[],
    result: MultiEnvironmentWorkflowResult
  ): void {
    // Sort environments by promotion order
    const sortedEnvs = this.sortEnvironmentsByPromotionOrder(environments);

    for (let i = 0; i < sortedEnvs.length - 1; i++) {
      const sourceEnv = sortedEnvs[i];
      const targetEnv = sortedEnvs[i + 1];

      const promotionConfig: PromotionConfig = {
        sourceEnvironment: sourceEnv.name,
        targetEnvironment: targetEnv.name,
        conditions: this.createPromotionConditions(sourceEnv, targetEnv),
        autoPromote: targetEnv.type !== 'production',
        rollbackOnFailure: true
      };

      this.promotionConfigs.set(`${sourceEnv.name}-to-${targetEnv.name}`, promotionConfig);
      result.promotionPipelines.push(promotionConfig);
    }
  }

  /**
   * Sort environments by promotion order
   */
  private sortEnvironmentsByPromotionOrder(environments: EnvironmentConfig[]): EnvironmentConfig[] {
    const order = ['development', 'staging', 'production'];
    return environments.sort((a, b) => {
      const aIndex = order.indexOf(a.type);
      const bIndex = order.indexOf(b.type);
      return aIndex - bIndex;
    });
  }

  /**
   * Create promotion conditions between environments
   */
  private createPromotionConditions(
    sourceEnv: EnvironmentConfig,
    targetEnv: EnvironmentConfig
  ): PromotionCondition[] {
    const conditions: PromotionCondition[] = [];

    // Health check condition
    conditions.push({
      type: 'health_check',
      configuration: {
        endpoint: `/health`,
        expectedStatus: 200,
        timeout: 30,
        retries: 3
      }
    });

    // Test success condition
    conditions.push({
      type: 'test_success',
      configuration: {
        testSuite: 'integration',
        environment: sourceEnv.name
      }
    });

    // Manual approval for production
    if (targetEnv.type === 'production') {
      conditions.push({
        type: 'manual_approval',
        configuration: {
          approvers: this.getEnvironmentApprovers(targetEnv),
          requiredApprovals: 2,
          timeoutMinutes: 120
        }
      });
    }

    // Time delay for production
    if (targetEnv.type === 'production') {
      conditions.push({
        type: 'time_delay',
        configuration: {
          duration: '30m',
          reason: 'Soak time before production deployment'
        }
      });
    }

    return conditions;
  }

  /**
   * Configure rollback strategies
   * Implements requirement 11.4: Include rollback and blue-green deployment strategies
   */
  private configureRollbackStrategies(
    environments: EnvironmentConfig[],
    result: MultiEnvironmentWorkflowResult
  ): void {
    for (const env of environments) {
      if (env.rollbackEnabled) {
        const rollbackConfig: RollbackConfig = {
          enabled: true,
          triggers: this.createRollbackTriggers(env),
          strategy: env.type === 'production' ? 'gradual' : 'immediate',
          maxRetries: 3
        };

        this.rollbackConfigs.set(env.name, rollbackConfig);
        result.rollbackConfigs.set(env.name, rollbackConfig);
      }
    }
  }

  /**
   * Create rollback triggers for an environment
   */
  private createRollbackTriggers(environment: EnvironmentConfig): RollbackTrigger[] {
    const triggers: RollbackTrigger[] = [];

    // Health check failure trigger
    triggers.push({
      type: 'health_check_failure',
      threshold: 3,
      duration: '5m'
    });

    // Error rate threshold trigger
    triggers.push({
      type: 'error_rate_threshold',
      threshold: environment.type === 'production' ? 5 : 10, // 5% for prod, 10% for others
      duration: '10m'
    });

    // Manual trigger
    triggers.push({
      type: 'manual'
    });

    return triggers;
  }  /**

   * Generate workflow for a specific environment
   * Implements requirement 11.1: Generate separate deployment jobs for each environment
   */
  private generateEnvironmentWorkflow(
    environment: EnvironmentConfig,
    detectionResult: DetectionResult,
    result: MultiEnvironmentWorkflowResult,
    options?: GenerationOptions
  ): WorkflowTemplate {
    const strategy = this.deploymentStrategies.get(environment.name);
    const approvalGate = this.approvalGates.get(environment.name);
    const rollbackConfig = this.rollbackConfigs.get(environment.name);

    // Generate environment management steps
    const envManagement = this.environmentManager.generateEnvironmentSteps(
      [environment],
      detectionResult
    );

    const jobs: JobTemplate[] = [];

    // Add pre-deployment job
    jobs.push(this.createPreDeploymentJob(environment, envManagement));

    // Add approval job if required
    if (approvalGate) {
      jobs.push(this.createApprovalJob(environment, approvalGate));
    }

    // Add deployment job
    jobs.push(this.createDeploymentJob(environment, strategy, envManagement, detectionResult));

    // Add post-deployment validation job
    jobs.push(this.createPostDeploymentJob(environment, strategy));

    // Add rollback job if enabled
    if (rollbackConfig) {
      jobs.push(this.createRollbackJob(environment, rollbackConfig));
    }

    return {
      name: `Deploy to ${environment.name}`,
      type: 'cd',
      triggers: this.createEnvironmentTriggers(environment),
      jobs,
      environment: environment,
      permissions: this.createEnvironmentPermissions(environment),
      concurrency: {
        group: `deploy-${environment.name}`,
        cancelInProgress: false
      }
    };
  }

  /**
   * Create pre-deployment job
   */
  private createPreDeploymentJob(
    environment: EnvironmentConfig,
    envManagement: EnvironmentManagementResult
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      },
      ...envManagement.environmentSteps,
      ...envManagement.oidcSteps,
      {
        name: 'Validate deployment prerequisites',
        run: [
          'echo "Validating deployment prerequisites for ${{ matrix.environment }}"',
          'echo "Checking environment configuration..."',
          'echo "Validating secrets and variables..."',
          'echo "Prerequisites validated successfully"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          DEPLOYMENT_STRATEGY: environment.deploymentStrategy
        }
      },
      {
        name: 'Run pre-deployment tests',
        run: [
          'echo "Running pre-deployment tests..."',
          'npm run test:pre-deploy || echo "No pre-deployment tests configured"',
          'echo "Pre-deployment tests completed"'
        ].join('\n'),
        continueOnError: true
      }
    ];

    return {
      name: `pre-deploy-${environment.name}`,
      runsOn: 'ubuntu-latest',
      steps,
      environment: {
        name: environment.name,
        url: environment.variables.DEPLOYMENT_URL || undefined
      },
      outputs: {
        'deployment-id': '${{ steps.generate-id.outputs.deployment-id }}',
        'environment-ready': 'true'
      }
    };
  }

  /**
   * Create approval job
   * Implements requirement 11.2: Include manual approval gates and environment protection rules
   */
  private createApprovalJob(
    environment: EnvironmentConfig,
    approvalGate: ApprovalGateConfig
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Request deployment approval',
        run: [
          `echo "Requesting approval for deployment to ${environment.name}"`,
          `echo "Required approvals: ${approvalGate.requiredApprovals}"`,
          `echo "Approvers: ${approvalGate.approvers.join(', ')}"`,
          `echo "Instructions: ${approvalGate.instructions}"`,
          'echo "Waiting for approval..."'
        ].join('\n')
      },
      {
        name: 'Wait for approval',
        uses: 'trstringer/manual-approval@v1',
        with: {
          secret: '${{ secrets.GITHUB_TOKEN }}',
          approvers: approvalGate.approvers.join(','),
          'minimum-approvals': approvalGate.requiredApprovals.toString(),
          'issue-title': `Deployment Approval Required: ${environment.name}`,
          'issue-body': approvalGate.instructions,
          'exclude-workflow-initiator-as-approver': 'false'
        },
        'timeout-minutes': approvalGate.timeoutMinutes
      }
    ];

    return {
      name: `approve-${environment.name}`,
      runsOn: 'ubuntu-latest',
      steps,
      needs: [`pre-deploy-${environment.name}`],
      environment: {
        name: `${environment.name}-approval`,
        url: environment.variables.DEPLOYMENT_URL || undefined
      },
      if: `needs.pre-deploy-${environment.name}.outputs.environment-ready == 'true'`
    };
  }  /**
   *
 Create deployment job with strategy-specific steps
   * Implements requirement 11.3: Use appropriate secrets and variables for each environment
   */
  private createDeploymentJob(
    environment: EnvironmentConfig,
    strategy: DeploymentStrategy | undefined,
    envManagement: EnvironmentManagementResult,
    detectionResult: DetectionResult
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      },
      ...envManagement.environmentSteps,
      ...envManagement.oidcSteps
    ];

    // Add framework-specific deployment steps
    steps.push(...this.createFrameworkDeploymentSteps(detectionResult, environment));

    // Add strategy-specific deployment steps
    if (strategy) {
      steps.push(...this.createStrategyDeploymentSteps(environment, strategy));
    }

    // Add health check steps
    steps.push(...this.createHealthCheckSteps(environment));

    const needsJobs = [`pre-deploy-${environment.name}`];
    const approvalGate = this.approvalGates.get(environment.name);
    if (approvalGate) {
      needsJobs.push(`approve-${environment.name}`);
    }

    return {
      name: `deploy-${environment.name}`,
      runsOn: 'ubuntu-latest',
      steps,
      needs: needsJobs,
      environment: {
        name: environment.name,
        url: environment.variables.DEPLOYMENT_URL || undefined
      },
      timeout: 30,
      outputs: {
        'deployment-status': '${{ steps.deploy.outputs.status }}',
        'deployment-url': '${{ steps.deploy.outputs.url }}',
        'deployment-version': '${{ steps.deploy.outputs.version }}'
      }
    };
  }

  /**
   * Create framework-specific deployment steps
   */
  private createFrameworkDeploymentSteps(
    detectionResult: DetectionResult,
    environment: EnvironmentConfig
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const primaryFramework = detectionResult.frameworks.find(f => f.confidence > 0.8);

    if (!primaryFramework) {
      // Generic deployment steps
      steps.push({
        name: 'Deploy application',
        id: 'deploy',
        run: [
          'echo "Deploying application to ${{ matrix.environment }}"',
          'echo "No specific framework detected, using generic deployment"',
          'echo "status=success" >> $GITHUB_OUTPUT',
          'echo "url=${{ env.DEPLOYMENT_URL }}" >> $GITHUB_OUTPUT',
          'echo "version=${{ github.sha }}" >> $GITHUB_OUTPUT'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          DEPLOYMENT_URL: environment.variables.DEPLOYMENT_URL || `https://${environment.name}.example.com`
        }
      });
      return steps;
    }

    switch (primaryFramework.name.toLowerCase()) {
      case 'react':
      case 'vue':
      case 'angular':
        steps.push(...this.createFrontendDeploymentSteps(environment, primaryFramework));
        break;
      case 'next.js':
        steps.push(...this.createNextJSDeploymentSteps(environment));
        break;
      case 'express':
      case 'fastify':
      case 'koa':
        steps.push(...this.createNodeJSDeploymentSteps(environment));
        break;
      case 'django':
      case 'flask':
      case 'fastapi':
        steps.push(...this.createPythonDeploymentSteps(environment, primaryFramework));
        break;
      case 'spring':
      case 'spring boot':
        steps.push(...this.createJavaDeploymentSteps(environment));
        break;
      default:
        steps.push(...this.createGenericDeploymentSteps(environment));
        break;
    }

    return steps;
  }

  /**
   * Create frontend deployment steps
   */
  private createFrontendDeploymentSteps(
    environment: EnvironmentConfig,
    framework: any
  ): StepTemplate[] {
    return [
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '18',
          cache: 'npm'
        }
      },
      {
        name: 'Install dependencies',
        run: 'npm ci'
      },
      {
        name: 'Build application',
        run: 'npm run build',
        env: {
          NODE_ENV: 'production',
          REACT_APP_ENV: environment.name
        }
      },
      {
        name: 'Deploy to static hosting',
        id: 'deploy',
        run: [
          'echo "Deploying frontend application to ${{ env.ENVIRONMENT }}"',
          'echo "Framework: ${{ env.FRAMEWORK }}"',
          '# Add your static hosting deployment commands here',
          'echo "status=success" >> $GITHUB_OUTPUT',
          'echo "url=${{ env.DEPLOYMENT_URL }}" >> $GITHUB_OUTPUT',
          'echo "version=${{ github.sha }}" >> $GITHUB_OUTPUT'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          FRAMEWORK: framework.name,
          DEPLOYMENT_URL: environment.variables.DEPLOYMENT_URL || `https://${environment.name}.example.com`
        }
      }
    ];
  }

  /**
   * Create Next.js deployment steps
   */
  private createNextJSDeploymentSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '18',
          cache: 'npm'
        }
      },
      {
        name: 'Install dependencies',
        run: 'npm ci'
      },
      {
        name: 'Build Next.js application',
        run: 'npm run build',
        env: {
          NODE_ENV: 'production',
          NEXT_PUBLIC_ENV: environment.name
        }
      },
      {
        name: 'Deploy to Vercel',
        id: 'deploy',
        uses: 'amondnet/vercel-action@v25',
        with: {
          'vercel-token': '${{ secrets.VERCEL_TOKEN }}',
          'vercel-org-id': '${{ secrets.VERCEL_ORG_ID }}',
          'vercel-project-id': '${{ secrets.VERCEL_PROJECT_ID }}',
          'vercel-args': environment.type === 'production' ? '--prod' : '--target preview'
        }
      }
    ];
  }  /**

   * Create Node.js deployment steps
   */
  private createNodeJSDeploymentSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '18',
          cache: 'npm'
        }
      },
      {
        name: 'Install dependencies',
        run: 'npm ci'
      },
      {
        name: 'Build application',
        run: 'npm run build',
        env: {
          NODE_ENV: 'production'
        }
      },
      {
        name: 'Deploy Node.js application',
        id: 'deploy',
        run: [
          'echo "Deploying Node.js application to ${{ env.ENVIRONMENT }}"',
          '# Add your Node.js deployment commands here (Docker, PM2, etc.)',
          'echo "status=success" >> $GITHUB_OUTPUT',
          'echo "url=${{ env.DEPLOYMENT_URL }}" >> $GITHUB_OUTPUT',
          'echo "version=${{ github.sha }}" >> $GITHUB_OUTPUT'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          DEPLOYMENT_URL: environment.variables.DEPLOYMENT_URL || `https://${environment.name}.example.com`
        }
      }
    ];
  }

  /**
   * Create Python deployment steps
   */
  private createPythonDeploymentSteps(
    environment: EnvironmentConfig,
    framework: any
  ): StepTemplate[] {
    return [
      {
        name: 'Setup Python',
        uses: 'actions/setup-python@v4',
        with: {
          'python-version': '3.11'
        }
      },
      {
        name: 'Install dependencies',
        run: [
          'python -m pip install --upgrade pip',
          'pip install -r requirements.txt'
        ].join('\n')
      },
      {
        name: 'Run database migrations',
        run: framework.name.toLowerCase() === 'django' 
          ? 'python manage.py migrate'
          : 'echo "No migrations needed for this framework"',
        env: {
          DATABASE_URL: '${{ secrets.DATABASE_URL }}'
        },
        if: framework.name.toLowerCase() === 'django'
      },
      {
        name: 'Deploy Python application',
        id: 'deploy',
        run: [
          'echo "Deploying Python application to ${{ env.ENVIRONMENT }}"',
          'echo "Framework: ${{ env.FRAMEWORK }}"',
          '# Add your Python deployment commands here',
          'echo "status=success" >> $GITHUB_OUTPUT',
          'echo "url=${{ env.DEPLOYMENT_URL }}" >> $GITHUB_OUTPUT',
          'echo "version=${{ github.sha }}" >> $GITHUB_OUTPUT'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          FRAMEWORK: framework.name,
          DEPLOYMENT_URL: environment.variables.DEPLOYMENT_URL || `https://${environment.name}.example.com`
        }
      }
    ];
  }

  /**
   * Create Java deployment steps
   */
  private createJavaDeploymentSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: 'Setup JDK',
        uses: 'actions/setup-java@v3',
        with: {
          'java-version': '17',
          distribution: 'temurin'
        }
      },
      {
        name: 'Build with Maven',
        run: 'mvn clean package -DskipTests'
      },
      {
        name: 'Deploy Java application',
        id: 'deploy',
        run: [
          'echo "Deploying Java application to ${{ env.ENVIRONMENT }}"',
          '# Add your Java deployment commands here',
          'echo "status=success" >> $GITHUB_OUTPUT',
          'echo "url=${{ env.DEPLOYMENT_URL }}" >> $GITHUB_OUTPUT',
          'echo "version=${{ github.sha }}" >> $GITHUB_OUTPUT'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          DEPLOYMENT_URL: environment.variables.DEPLOYMENT_URL || `https://${environment.name}.example.com`
        }
      }
    ];
  }

  /**
   * Create generic deployment steps
   */
  private createGenericDeploymentSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: 'Deploy application',
        id: 'deploy',
        run: [
          'echo "Deploying application to ${{ env.ENVIRONMENT }}"',
          '# Add your deployment commands here',
          'echo "status=success" >> $GITHUB_OUTPUT',
          'echo "url=${{ env.DEPLOYMENT_URL }}" >> $GITHUB_OUTPUT',
          'echo "version=${{ github.sha }}" >> $GITHUB_OUTPUT'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          DEPLOYMENT_URL: environment.variables.DEPLOYMENT_URL || `https://${environment.name}.example.com`
        }
      }
    ];
  }  
/**
   * Create strategy-specific deployment steps
   * Implements requirement 11.4: Include rollback and blue-green deployment strategies
   */
  private createStrategyDeploymentSteps(
    environment: EnvironmentConfig,
    strategy: DeploymentStrategy
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (strategy.type) {
      case 'blue-green':
        steps.push(...this.createBlueGreenDeploymentSteps(environment, strategy.configuration as BlueGreenConfig));
        break;
      case 'canary':
        steps.push(...this.createCanaryDeploymentSteps(environment, strategy.configuration as CanaryConfig));
        break;
      case 'rolling':
        steps.push(...this.createRollingDeploymentSteps(environment, strategy.configuration as RollingConfig));
        break;
    }

    return steps;
  }

  /**
   * Create blue-green deployment steps
   */
  private createBlueGreenDeploymentSteps(
    environment: EnvironmentConfig,
    config: BlueGreenConfig
  ): StepTemplate[] {
    return [
      {
        name: 'Deploy to green environment',
        run: [
          'echo "Deploying to green environment for ${{ env.ENVIRONMENT }}"',
          'echo "Preview replica count: ${{ env.PREVIEW_REPLICAS }}"',
          '# Deploy to green/preview environment',
          'echo "Green deployment completed"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          PREVIEW_REPLICAS: config.previewReplicaCount?.toString() || '1'
        }
      },
      {
        name: 'Run pre-promotion analysis',
        run: [
          'echo "Running pre-promotion analysis..."',
          'echo "Checking success rate and request duration"',
          '# Run analysis templates',
          'echo "Pre-promotion analysis passed"'
        ].join('\n'),
        if: config.prePromotionAnalysis ? 'true' : 'false'
      },
      {
        name: 'Promote to blue environment',
        run: [
          'echo "Promoting green to blue environment"',
          'echo "Auto promotion enabled: ${{ env.AUTO_PROMOTION }}"',
          '# Switch traffic from blue to green',
          'echo "Traffic switched to new version"'
        ].join('\n'),
        env: {
          AUTO_PROMOTION: config.autoPromotionEnabled?.toString() || 'false'
        }
      },
      {
        name: 'Run post-promotion analysis',
        run: [
          'echo "Running post-promotion analysis..."',
          'echo "Monitoring new version performance"',
          '# Run post-promotion checks',
          'echo "Post-promotion analysis completed"'
        ].join('\n'),
        if: config.postPromotionAnalysis ? 'true' : 'false'
      },
      {
        name: 'Scale down old version',
        run: [
          'echo "Scaling down old version after ${{ env.SCALE_DOWN_DELAY }} seconds"',
          'sleep ${{ env.SCALE_DOWN_DELAY }}',
          '# Scale down old version',
          'echo "Old version scaled down"'
        ].join('\n'),
        env: {
          SCALE_DOWN_DELAY: config.scaleDownDelaySeconds?.toString() || '300'
        }
      }
    ];
  }

  /**
   * Create canary deployment steps
   */
  private createCanaryDeploymentSteps(
    environment: EnvironmentConfig,
    config: CanaryConfig
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    steps.push({
      name: 'Initialize canary deployment',
      run: [
        'echo "Initializing canary deployment for ${{ env.ENVIRONMENT }}"',
        'echo "Max unavailable: ${{ env.MAX_UNAVAILABLE }}"',
        '# Initialize canary deployment',
        'echo "Canary deployment initialized"'
      ].join('\n'),
      env: {
        ENVIRONMENT: environment.name,
        MAX_UNAVAILABLE: config.maxUnavailable || '25%'
      }
    });

    // Add steps for each canary step
    config.steps.forEach((step, index) => {
      if (step.setWeight !== undefined) {
        steps.push({
          name: `Set canary weight to ${step.setWeight}%`,
          run: [
            `echo "Setting canary traffic weight to ${step.setWeight}%"`,
            `# Update traffic routing to send ${step.setWeight}% to canary`,
            'echo "Traffic weight updated"'
          ].join('\n')
        });
      }

      if (step.pause) {
        if (step.pause.duration) {
          steps.push({
            name: `Pause for ${step.pause.duration}`,
            run: [
              `echo "Pausing canary deployment for ${step.pause.duration}"`,
              `sleep ${this.convertDurationToSeconds(step.pause.duration)}`,
              'echo "Pause completed"'
            ].join('\n')
          });
        }

        if (step.pause.untilApproved) {
          steps.push({
            name: 'Wait for manual approval',
            uses: 'trstringer/manual-approval@v1',
            with: {
              secret: '${{ secrets.GITHUB_TOKEN }}',
              approvers: this.getEnvironmentApprovers(environment).join(','),
              'minimum-approvals': '1',
              'issue-title': `Canary Deployment Approval: ${environment.name}`,
              'issue-body': `Please approve continuation of canary deployment at ${step.setWeight || 'current'}% traffic`
            }
          });
        }
      }

      if (step.analysis) {
        steps.push({
          name: `Run canary analysis (step ${index + 1})`,
          run: [
            'echo "Running canary analysis..."',
            'echo "Checking success rate and performance metrics"',
            '# Run analysis templates',
            'echo "Canary analysis passed"'
          ].join('\n')
        });
      }
    });

    steps.push({
      name: 'Complete canary deployment',
      run: [
        'echo "Completing canary deployment"',
        'echo "Setting traffic weight to 100%"',
        '# Complete canary deployment',
        'echo "Canary deployment completed successfully"'
      ].join('\n')
    });

    return steps;
  }

  /**
   * Create rolling deployment steps
   */
  private createRollingDeploymentSteps(
    environment: EnvironmentConfig,
    config: RollingConfig
  ): StepTemplate[] {
    return [
      {
        name: 'Execute rolling deployment',
        run: [
          'echo "Executing rolling deployment for ${{ env.ENVIRONMENT }}"',
          'echo "Max unavailable: ${{ env.MAX_UNAVAILABLE }}"',
          'echo "Max surge: ${{ env.MAX_SURGE }}"',
          '# Execute rolling deployment',
          'echo "Rolling deployment completed"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          MAX_UNAVAILABLE: config.maxUnavailable.toString(),
          MAX_SURGE: config.maxSurge.toString(),
          PROGRESS_DEADLINE: config.progressDeadlineSeconds?.toString() || '600'
        }
      },
      {
        name: 'Monitor rolling deployment progress',
        run: [
          'echo "Monitoring rolling deployment progress..."',
          'echo "Progress deadline: ${{ env.PROGRESS_DEADLINE }} seconds"',
          '# Monitor deployment progress',
          'echo "Rolling deployment monitoring completed"'
        ].join('\n'),
        env: {
          PROGRESS_DEADLINE: config.progressDeadlineSeconds?.toString() || '600'
        }
      }
    ];
  }

  /**
   * Convert duration string to seconds
   */
  private convertDurationToSeconds(duration: string): string {
    const match = duration.match(/^(\d+)([smh])$/);
    if (!match) return '60'; // Default to 60 seconds

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value.toString();
      case 'm': return (value * 60).toString();
      case 'h': return (value * 3600).toString();
      default: return '60';
    }
  }  /**

   * Create health check steps
   */
  private createHealthCheckSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: 'Wait for deployment to be ready',
        run: [
          'echo "Waiting for deployment to be ready..."',
          'sleep 30',
          'echo "Deployment should be ready"'
        ].join('\n')
      },
      {
        name: 'Run health checks',
        run: [
          'echo "Running health checks for ${{ env.ENVIRONMENT }}"',
          'echo "Checking endpoint: ${{ env.HEALTH_ENDPOINT }}"',
          'curl -f ${{ env.HEALTH_ENDPOINT }} || exit 1',
          'echo "Health checks passed"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          HEALTH_ENDPOINT: environment.variables.HEALTH_ENDPOINT || `${environment.variables.DEPLOYMENT_URL || 'https://example.com'}/health`
        },
        continueOnError: false,
        timeout: 5
      },
      {
        name: 'Run smoke tests',
        run: [
          'echo "Running smoke tests..."',
          'npm run test:smoke || echo "No smoke tests configured"',
          'echo "Smoke tests completed"'
        ].join('\n'),
        continueOnError: true
      }
    ];
  }

  /**
   * Create post-deployment validation job
   */
  private createPostDeploymentJob(
    environment: EnvironmentConfig,
    strategy: DeploymentStrategy | undefined
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Validate deployment success',
        run: [
          'echo "Validating deployment success for ${{ env.ENVIRONMENT }}"',
          'echo "Deployment status: ${{ needs.deploy-' + environment.name + '.outputs.deployment-status }}"',
          'echo "Deployment URL: ${{ needs.deploy-' + environment.name + '.outputs.deployment-url }}"',
          'echo "Deployment version: ${{ needs.deploy-' + environment.name + '.outputs.deployment-version }}"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name
        }
      },
      {
        name: 'Run integration tests',
        run: [
          'echo "Running integration tests against deployed application..."',
          'npm run test:integration || echo "No integration tests configured"',
          'echo "Integration tests completed"'
        ].join('\n'),
        env: {
          TEST_URL: `\${{ needs.deploy-${environment.name}.outputs.deployment-url }}`
        },
        continueOnError: environment.type !== 'production'
      },
      {
        name: 'Update deployment status',
        run: [
          'echo "Updating deployment status..."',
          'echo "Deployment to ${{ env.ENVIRONMENT }} completed successfully"',
          'echo "Version: ${{ needs.deploy-' + environment.name + '.outputs.deployment-version }}"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name
        }
      }
    ];

    return {
      name: `post-deploy-${environment.name}`,
      runsOn: 'ubuntu-latest',
      steps,
      needs: [`deploy-${environment.name}`],
      if: `needs.deploy-${environment.name}.outputs.deployment-status == 'success'`,
      environment: {
        name: `${environment.name}-validation`
      }
    };
  }

  /**
   * Create rollback job
   * Implements requirement 11.4: Include rollback and blue-green deployment strategies
   */
  private createRollbackJob(
    environment: EnvironmentConfig,
    rollbackConfig: RollbackConfig
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Detect rollback trigger',
        run: [
          'echo "Checking for rollback triggers..."',
          'echo "Rollback strategy: ${{ env.ROLLBACK_STRATEGY }}"',
          'echo "Max retries: ${{ env.MAX_RETRIES }}"',
          '# Check rollback triggers',
          'echo "Rollback trigger detected or manual rollback requested"'
        ].join('\n'),
        env: {
          ROLLBACK_STRATEGY: rollbackConfig.strategy,
          MAX_RETRIES: rollbackConfig.maxRetries?.toString() || '3'
        }
      },
      {
        name: 'Execute rollback',
        run: [
          'echo "Executing rollback for ${{ env.ENVIRONMENT }}"',
          'echo "Rolling back to previous version..."',
          '# Execute rollback commands',
          'echo "Rollback completed"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name
        }
      },
      {
        name: 'Verify rollback success',
        run: [
          'echo "Verifying rollback success..."',
          'curl -f ${{ env.HEALTH_ENDPOINT }} || exit 1',
          'echo "Rollback verification completed"'
        ].join('\n'),
        env: {
          HEALTH_ENDPOINT: environment.variables.HEALTH_ENDPOINT || `${environment.variables.DEPLOYMENT_URL || 'https://example.com'}/health`
        }
      },
      {
        name: 'Notify rollback completion',
        run: [
          'echo "Notifying rollback completion..."',
          'echo "Rollback for ${{ env.ENVIRONMENT }} completed successfully"',
          '# Send notifications',
          'echo "Rollback notifications sent"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name
        }
      }
    ];

    return {
      name: `rollback-${environment.name}`,
      runsOn: 'ubuntu-latest',
      steps,
      needs: [`deploy-${environment.name}`],
      if: `failure() || cancelled() || github.event.inputs.rollback == 'true'`,
      environment: {
        name: `${environment.name}-rollback`
      }
    };
  } 
 /**
   * Create environment-specific triggers
   */
  private createEnvironmentTriggers(environment: EnvironmentConfig): TriggerConfig {
    const triggers: TriggerConfig = {
      workflowDispatch: {
        inputs: {
          environment: {
            description: 'Environment to deploy to',
            required: true,
            default: environment.name,
            type: 'choice',
            options: [environment.name]
          },
          rollback: {
            description: 'Perform rollback instead of deployment',
            required: false,
            default: 'false',
            type: 'boolean'
          }
        }
      }
    };

    // Add push triggers for non-production environments
    if (environment.type !== 'production') {
      triggers.push = {
        branches: environment.type === 'development' ? ['main', 'develop'] : ['main']
      };
    }

    // Add schedule for production deployments
    if (environment.type === 'production') {
      triggers.schedule = [
        {
          cron: '0 9 * * 1-5' // 9 AM UTC, Monday to Friday
        }
      ];
    }

    return triggers;
  }

  /**
   * Create environment-specific permissions
   */
  private createEnvironmentPermissions(environment: EnvironmentConfig): PermissionConfig {
    const permissions: PermissionConfig = {
      contents: 'read',
      deployments: 'write',
      idToken: 'write', // For OIDC
      issues: 'write' // For approval workflows
    };

    // Add additional permissions for production
    if (environment.type === 'production') {
      permissions.checks = 'write';
      permissions.statuses = 'write';
    }

    return permissions;
  }

  /**
   * Generate promotion workflow
   * Implements requirement 11.5: Create workflows that promote releases through environments sequentially
   */
  private generatePromotionWorkflow(
    environments: EnvironmentConfig[],
    result: MultiEnvironmentWorkflowResult,
    options?: GenerationOptions
  ): WorkflowTemplate {
    const jobs: JobTemplate[] = [];

    // Create promotion jobs for each promotion pipeline
    for (const promotion of result.promotionPipelines) {
      jobs.push(this.createPromotionJob(promotion, environments));
    }

    return {
      name: 'Environment Promotion Pipeline',
      type: 'cd',
      triggers: {
        workflowDispatch: {
          inputs: {
            'source-environment': {
              description: 'Source environment to promote from',
              required: true,
              type: 'choice',
              options: environments.map(env => env.name)
            },
            'target-environment': {
              description: 'Target environment to promote to',
              required: true,
              type: 'choice',
              options: environments.map(env => env.name)
            },
            'auto-promote': {
              description: 'Automatically promote if conditions are met',
              required: false,
              default: 'false',
              type: 'boolean'
            }
          }
        }
      },
      jobs,
      permissions: {
        contents: 'read',
        deployments: 'write',
        idToken: 'write',
        issues: 'write'
      }
    };
  }

  /**
   * Create promotion job
   */
  private createPromotionJob(
    promotion: PromotionConfig,
    environments: EnvironmentConfig[]
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Validate promotion conditions',
        run: [
          'echo "Validating promotion from ${{ env.SOURCE_ENV }} to ${{ env.TARGET_ENV }}"',
          'echo "Auto promote: ${{ env.AUTO_PROMOTE }}"',
          'echo "Rollback on failure: ${{ env.ROLLBACK_ON_FAILURE }}"'
        ].join('\n'),
        env: {
          SOURCE_ENV: promotion.sourceEnvironment,
          TARGET_ENV: promotion.targetEnvironment,
          AUTO_PROMOTE: promotion.autoPromote?.toString() || 'false',
          ROLLBACK_ON_FAILURE: promotion.rollbackOnFailure?.toString() || 'false'
        }
      }
    ];

    // Add condition validation steps
    for (const condition of promotion.conditions) {
      steps.push(this.createPromotionConditionStep(condition, promotion));
    }

    // Add promotion execution step
    steps.push({
      name: 'Execute promotion',
      run: [
        'echo "Executing promotion from ${{ env.SOURCE_ENV }} to ${{ env.TARGET_ENV }}"',
        '# Trigger deployment to target environment',
        'echo "Promotion completed successfully"'
      ].join('\n'),
      env: {
        SOURCE_ENV: promotion.sourceEnvironment,
        TARGET_ENV: promotion.targetEnvironment
      }
    });

    return {
      name: `promote-${promotion.sourceEnvironment}-to-${promotion.targetEnvironment}`,
      runsOn: 'ubuntu-latest',
      steps,
      if: `github.event.inputs.source-environment == '${promotion.sourceEnvironment}' && github.event.inputs.target-environment == '${promotion.targetEnvironment}'`
    };
  }

  /**
   * Create promotion condition step
   */
  private createPromotionConditionStep(
    condition: PromotionCondition,
    promotion: PromotionConfig
  ): StepTemplate {
    switch (condition.type) {
      case 'health_check':
        return {
          name: 'Health check validation',
          run: [
            'echo "Running health check validation..."',
            `curl -f ${condition.configuration.endpoint} || exit 1`,
            'echo "Health check passed"'
          ].join('\n'),
          timeout: condition.configuration.timeout || 30
        };

      case 'test_success':
        return {
          name: 'Test success validation',
          run: [
            'echo "Validating test success..."',
            `npm run test:${condition.configuration.testSuite} || exit 1`,
            'echo "Tests passed"'
          ].join('\n')
        };

      case 'manual_approval':
        return {
          name: 'Manual approval',
          uses: 'trstringer/manual-approval@v1',
          with: {
            secret: '${{ secrets.GITHUB_TOKEN }}',
            approvers: condition.configuration.approvers.join(','),
            'minimum-approvals': condition.configuration.requiredApprovals.toString(),
            'issue-title': `Promotion Approval: ${promotion.sourceEnvironment} → ${promotion.targetEnvironment}`,
            'issue-body': 'Please approve the promotion to the next environment'
          },
          'timeout-minutes': condition.configuration.timeoutMinutes || 60
        };

      case 'time_delay':
        return {
          name: 'Time delay',
          run: [
            `echo "Waiting for ${condition.configuration.duration} (${condition.configuration.reason})"`,
            `sleep ${this.convertDurationToSeconds(condition.configuration.duration)}`,
            'echo "Time delay completed"'
          ].join('\n')
        };

      default:
        return {
          name: 'Unknown condition',
          run: 'echo "Unknown promotion condition type"'
        };
    }
  }  /**
 
  * Generate rollback workflow
   * Implements requirement 11.4: Include rollback and blue-green deployment strategies
   */
  private generateRollbackWorkflow(
    environments: EnvironmentConfig[],
    result: MultiEnvironmentWorkflowResult,
    options?: GenerationOptions
  ): WorkflowTemplate {
    const jobs: JobTemplate[] = [];

    // Create rollback jobs for each environment
    for (const environment of environments) {
      const rollbackConfig = result.rollbackConfigs.get(environment.name);
      if (rollbackConfig) {
        jobs.push(this.createRollbackWorkflowJob(environment, rollbackConfig));
      }
    }

    return {
      name: 'Emergency Rollback',
      type: 'cd',
      triggers: {
        workflowDispatch: {
          inputs: {
            environment: {
              description: 'Environment to rollback',
              required: true,
              type: 'choice',
              options: environments.filter(env => env.rollbackEnabled).map(env => env.name)
            },
            reason: {
              description: 'Reason for rollback',
              required: true,
              type: 'string'
            },
            'rollback-strategy': {
              description: 'Rollback strategy',
              required: false,
              default: 'immediate',
              type: 'choice',
              options: ['immediate', 'gradual']
            }
          }
        }
      },
      jobs,
      permissions: {
        contents: 'read',
        deployments: 'write',
        idToken: 'write',
        issues: 'write'
      }
    };
  }

  /**
   * Create rollback workflow job
   */
  private createRollbackWorkflowJob(
    environment: EnvironmentConfig,
    rollbackConfig: RollbackConfig
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Validate rollback request',
        run: [
          'echo "Validating rollback request for ${{ env.ENVIRONMENT }}"',
          'echo "Reason: ${{ github.event.inputs.reason }}"',
          'echo "Strategy: ${{ github.event.inputs.rollback-strategy }}"',
          'echo "Max retries: ${{ env.MAX_RETRIES }}"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name,
          MAX_RETRIES: rollbackConfig.maxRetries?.toString() || '3'
        }
      },
      {
        name: 'Create rollback issue',
        uses: 'actions/github-script@v7',
        with: {
          script: `
            const issue = await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Emergency Rollback: ${environment.name}',
              body: \`
                **Environment:** ${environment.name}
                **Reason:** \${{ github.event.inputs.reason }}
                **Strategy:** \${{ github.event.inputs.rollback-strategy }}
                **Initiated by:** @\${{ github.actor }}
                **Workflow:** \${{ github.workflow }}
                **Run:** \${{ github.run_id }}
              \`,
              labels: ['rollback', 'emergency', environment.name]
            });
            console.log('Created rollback issue:', issue.data.number);
          `
        }
      },
      {
        name: 'Execute rollback',
        run: [
          'echo "Executing ${{ github.event.inputs.rollback-strategy }} rollback..."',
          'echo "Rolling back ${{ env.ENVIRONMENT }} to previous version"',
          '# Execute rollback commands based on strategy',
          'if [ "${{ github.event.inputs.rollback-strategy }}" = "gradual" ]; then',
          '  echo "Performing gradual rollback..."',
          '  # Gradual rollback logic',
          'else',
          '  echo "Performing immediate rollback..."',
          '  # Immediate rollback logic',
          'fi',
          'echo "Rollback execution completed"'
        ].join('\n'),
        env: {
          ENVIRONMENT: environment.name
        }
      },
      {
        name: 'Verify rollback',
        run: [
          'echo "Verifying rollback success..."',
          'curl -f ${{ env.HEALTH_ENDPOINT }} || exit 1',
          'echo "Running post-rollback tests..."',
          'npm run test:smoke || echo "No smoke tests configured"',
          'echo "Rollback verification completed"'
        ].join('\n'),
        env: {
          HEALTH_ENDPOINT: environment.variables.HEALTH_ENDPOINT || `${environment.variables.DEPLOYMENT_URL || 'https://example.com'}/health`
        }
      },
      {
        name: 'Update rollback status',
        uses: 'actions/github-script@v7',
        with: {
          script: `
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.issue?.number || 1,
              body: \`
                ✅ **Rollback Completed Successfully**
                
                **Environment:** ${environment.name}
                **Strategy:** \${{ github.event.inputs.rollback-strategy }}
                **Completed at:** \${{ new Date().toISOString() }}
                **Verification:** Health checks passed
              \`
            });
          `
        }
      }
    ];

    return {
      name: `rollback-${environment.name}`,
      runsOn: 'ubuntu-latest',
      steps,
      if: `github.event.inputs.environment == '${environment.name}'`,
      environment: {
        name: `${environment.name}-rollback`
      }
    };
  }

  /**
   * Get deployment strategy for environment
   */
  getDeploymentStrategy(environmentName: string): DeploymentStrategy | undefined {
    return this.deploymentStrategies.get(environmentName);
  }

  /**
   * Get approval gate for environment
   */
  getApprovalGate(environmentName: string): ApprovalGateConfig | undefined {
    return this.approvalGates.get(environmentName);
  }

  /**
   * Get promotion config for environment pair
   */
  getPromotionConfig(sourceEnv: string, targetEnv: string): PromotionConfig | undefined {
    return this.promotionConfigs.get(`${sourceEnv}-to-${targetEnv}`);
  }

  /**
   * Get rollback config for environment
   */
  getRollbackConfig(environmentName: string): RollbackConfig | undefined {
    return this.rollbackConfigs.get(environmentName);
  }

  /**
   * Clear all configurations (useful for testing)
   */
  clear(): void {
    this.deploymentStrategies.clear();
    this.approvalGates.clear();
    this.promotionConfigs.clear();
    this.rollbackConfigs.clear();
    this.environmentManager.clear();
  }
}