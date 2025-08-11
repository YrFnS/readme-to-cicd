/**
 * Utility for generating environment-specific workflow steps
 * Supports requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { StepTemplate } from '../types';
import { EnvironmentConfig } from '../interfaces';
import { EnvironmentManager, EnvironmentManagementResult } from '../environment-manager';

/**
 * Environment step generation options
 */
export interface EnvironmentStepOptions {
  includeValidation: boolean;
  includeOIDC: boolean;
  includeConfigGeneration: boolean;
  validateSecrets: boolean;
  generateEnvFiles: boolean;
}

/**
 * Environment step generator utility class
 */
export class EnvironmentStepGenerator {
  private environmentManager: EnvironmentManager;

  constructor(environmentManager: EnvironmentManager) {
    this.environmentManager = environmentManager;
  }

  /**
   * Generate complete environment setup steps for a workflow
   */
  generateEnvironmentSetupSteps(
    environments: EnvironmentConfig[],
    options: Partial<EnvironmentStepOptions> = {}
  ): StepTemplate[] {
    const defaultOptions: EnvironmentStepOptions = {
      includeValidation: true,
      includeOIDC: true,
      includeConfigGeneration: true,
      validateSecrets: true,
      generateEnvFiles: true
    };

    const finalOptions = { ...defaultOptions, ...options };
    const steps: StepTemplate[] = [];

    // Add environment detection step
    steps.push(this.generateEnvironmentDetectionStep());

    // Add secret validation steps
    if (finalOptions.validateSecrets) {
      steps.push(...this.generateSecretValidationSteps(environments));
    }

    // Add OIDC authentication steps
    if (finalOptions.includeOIDC) {
      steps.push(...this.generateOIDCAuthenticationSteps(environments));
    }

    // Add configuration file generation steps
    if (finalOptions.includeConfigGeneration) {
      steps.push(...this.generateConfigFileSteps(environments));
    }

    // Add environment file generation steps
    if (finalOptions.generateEnvFiles) {
      steps.push(...this.generateEnvFileSteps(environments));
    }

    return steps;
  }

  /**
   * Generate environment detection step
   */
  private generateEnvironmentDetectionStep(): StepTemplate {
    return {
      name: 'Detect deployment environment',
      id: 'detect-env',
      run: [
        'echo "Detecting deployment environment..."',
        'if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then',
        '  echo "environment=production" >> $GITHUB_OUTPUT',
        'elif [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then',
        '  echo "environment=staging" >> $GITHUB_OUTPUT',
        'elif [[ "${{ github.ref }}" == refs/heads/feature/* ]]; then',
        '  echo "environment=development" >> $GITHUB_OUTPUT',
        'else',
        '  echo "environment=development" >> $GITHUB_OUTPUT',
        'fi',
        'echo "Detected environment: $(cat $GITHUB_OUTPUT | grep environment | cut -d= -f2)"'
      ].join('\n')
    };
  }

  /**
   * Generate secret validation steps for each environment
   */
  private generateSecretValidationSteps(environments: EnvironmentConfig[]): StepTemplate[] {
    const steps: StepTemplate[] = [];

    for (const env of environments) {
      const secrets = this.environmentManager.getSecrets();
      const requiredSecrets: string[] = [];

      // Collect required secrets for this environment
      for (const [name, config] of secrets) {
        if (config.required && 
            (config.environments.includes(env.type) || config.environments.includes(env.name))) {
          requiredSecrets.push(name);
        }
      }

      if (requiredSecrets.length > 0) {
        steps.push({
          name: `Validate ${env.name} secrets`,
          run: [
            `echo "Validating secrets for ${env.name} environment..."`,
            ...requiredSecrets.map(secret => 
              `if [ -z "\$${secret}" ]; then echo "❌ Missing required secret: ${secret}"; exit 1; fi`
            ),
            `echo "✅ All required secrets for ${env.name} are present"`
          ].join('\n'),
          env: Object.fromEntries(
            requiredSecrets.map(secret => [secret, `\${{ secrets.${secret} }}`])
          ),
          if: `steps.detect-env.outputs.environment == '${env.type}'`
        });
      }
    }

    return steps;
  }

  /**
   * Generate OIDC authentication steps
   */
  private generateOIDCAuthenticationSteps(environments: EnvironmentConfig[]): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const oidcConfigs = this.environmentManager.getOIDCConfigs();

    for (const env of environments) {
      const oidcConfig = oidcConfigs.get(env.name) || oidcConfigs.get(env.type);
      if (!oidcConfig) continue;

      switch (oidcConfig.provider) {
        case 'aws':
          steps.push({
            name: `Configure AWS credentials for ${env.name}`,
            uses: 'aws-actions/configure-aws-credentials@v4',
            with: {
              'role-to-assume': oidcConfig.roleArn || `\${{ secrets.AWS_ROLE_ARN_${env.name.toUpperCase()} }}`,
              'role-session-name': `GitHubActions-${env.name}-\${{ github.run_id }}`,
              'aws-region': `\${{ vars.AWS_REGION || 'us-east-1' }}`,
              'audience': oidcConfig.audience || 'sts.amazonaws.com'
            },
            if: `steps.detect-env.outputs.environment == '${env.type}'`
          });
          break;

        case 'azure':
          steps.push({
            name: `Azure Login for ${env.name}`,
            uses: 'azure/login@v1',
            with: {
              'client-id': `\${{ secrets.AZURE_CLIENT_ID }}`,
              'tenant-id': `\${{ secrets.AZURE_TENANT_ID }}`,
              'subscription-id': oidcConfig.subscriptionId || `\${{ secrets.AZURE_SUBSCRIPTION_ID }}`
            },
            if: `steps.detect-env.outputs.environment == '${env.type}'`
          });
          break;

        case 'gcp':
          steps.push({
            name: `Authenticate to Google Cloud for ${env.name}`,
            uses: 'google-github-actions/auth@v2',
            with: {
              'workload_identity_provider': oidcConfig.workloadIdentityProvider || `\${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}`,
              'service_account': oidcConfig.serviceAccount || `\${{ secrets.GCP_SERVICE_ACCOUNT }}`
            },
            if: `steps.detect-env.outputs.environment == '${env.type}'`
          });
          break;
      }
    }

    return steps;
  }

  /**
   * Generate configuration file creation steps
   */
  private generateConfigFileSteps(environments: EnvironmentConfig[]): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const configTemplates = this.environmentManager.getConfigTemplates();

    if (configTemplates.size === 0) {
      return steps;
    }

    for (const env of environments) {
      const envTemplates = Array.from(configTemplates.values()).filter(
        template => !template.environment || 
                   template.environment === env.name || 
                   template.environment === env.type
      );

      if (envTemplates.length > 0) {
        steps.push({
          name: `Generate configuration files for ${env.name}`,
          run: [
            `echo "Generating configuration files for ${env.name}..."`,
            ...envTemplates.map(template => {
              const processedFilename = template.filename.replace('{{environment}}', env.name);
              return [
                `echo "Creating ${processedFilename}..."`,
                `cat > ${processedFilename} << 'EOF'`,
                template.content,
                'EOF'
              ].join('\n');
            }),
            `echo "✅ Configuration files generated for ${env.name}"`
          ].join('\n'),
          if: `steps.detect-env.outputs.environment == '${env.type}'`
        });
      }
    }

    return steps;
  }

  /**
   * Generate environment file creation steps
   */
  private generateEnvFileSteps(environments: EnvironmentConfig[]): StepTemplate[] {
    const steps: StepTemplate[] = [];

    for (const env of environments) {
      const variables = this.environmentManager.getVariables();
      const secrets = this.environmentManager.getSecrets();
      
      const envVars: string[] = [];
      const envSecrets: string[] = [];

      // Collect variables for this environment
      for (const [name, config] of variables) {
        if (config.environments.includes(env.type) || config.environments.includes(env.name)) {
          envVars.push(name);
        }
      }

      // Collect secrets for this environment
      for (const [name, config] of secrets) {
        if (config.environments.includes(env.type) || config.environments.includes(env.name)) {
          envSecrets.push(name);
        }
      }

      if (envVars.length > 0 || envSecrets.length > 0) {
        const envContent = [
          `# Environment configuration for ${env.name}`,
          `# Generated at: $(date)`,
          '',
          '# Variables',
          ...envVars.map(name => `${name}=\${{ vars.${name} || env.${name} }}`),
          '',
          '# Secrets',
          ...envSecrets.map(name => `${name}=\${{ secrets.${name} }}`)
        ];

        steps.push({
          name: `Create .env file for ${env.name}`,
          run: [
            `echo "Creating .env.${env.name} file..."`,
            `cat > .env.${env.name} << 'EOF'`,
            ...envContent,
            'EOF',
            `echo "✅ .env.${env.name} file created"`
          ].join('\n'),
          env: {
            ...Object.fromEntries(envVars.map(name => [name, `\${{ vars.${name} }}`])),
            ...Object.fromEntries(envSecrets.map(name => [name, `\${{ secrets.${name} }}`]))
          },
          if: `steps.detect-env.outputs.environment == '${env.type}'`
        });
      }
    }

    return steps;
  }

  /**
   * Generate environment-specific deployment steps
   */
  generateDeploymentSteps(
    environments: EnvironmentConfig[],
    deploymentType: 'static' | 'container' | 'serverless' | 'traditional'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    for (const env of environments) {
      switch (deploymentType) {
        case 'static':
          steps.push(...this.generateStaticDeploymentSteps(env));
          break;
        case 'container':
          steps.push(...this.generateContainerDeploymentSteps(env));
          break;
        case 'serverless':
          steps.push(...this.generateServerlessDeploymentSteps(env));
          break;
        case 'traditional':
          steps.push(...this.generateTraditionalDeploymentSteps(env));
          break;
      }
    }

    return steps;
  }

  /**
   * Generate static site deployment steps
   */
  private generateStaticDeploymentSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: `Deploy to ${environment.name} (Static)`,
        run: [
          `echo "Deploying static site to ${environment.name}..."`,
          'npm run build',
          `echo "✅ Static site deployed to ${environment.name}"`
        ].join('\n'),
        if: `steps.detect-env.outputs.environment == '${environment.type}'`
      }
    ];
  }

  /**
   * Generate container deployment steps
   */
  private generateContainerDeploymentSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: `Build and push container for ${environment.name}`,
        run: [
          `echo "Building container for ${environment.name}..."`,
          `docker build -t \${{ vars.CONTAINER_REGISTRY }}/\${{ vars.IMAGE_NAME }}:${environment.name}-\${{ github.sha }} .`,
          `docker push \${{ vars.CONTAINER_REGISTRY }}/\${{ vars.IMAGE_NAME }}:${environment.name}-\${{ github.sha }}`,
          `echo "✅ Container deployed to ${environment.name}"`
        ].join('\n'),
        env: {
          DOCKER_USERNAME: '${{ secrets.DOCKER_USERNAME }}',
          DOCKER_PASSWORD: '${{ secrets.DOCKER_PASSWORD }}'
        },
        if: `steps.detect-env.outputs.environment == '${environment.type}'`
      }
    ];
  }

  /**
   * Generate serverless deployment steps
   */
  private generateServerlessDeploymentSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: `Deploy serverless to ${environment.name}`,
        run: [
          `echo "Deploying serverless application to ${environment.name}..."`,
          `serverless deploy --stage ${environment.name}`,
          `echo "✅ Serverless application deployed to ${environment.name}"`
        ].join('\n'),
        if: `steps.detect-env.outputs.environment == '${environment.type}'`
      }
    ];
  }

  /**
   * Generate traditional deployment steps
   */
  private generateTraditionalDeploymentSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: `Deploy to ${environment.name} (Traditional)`,
        run: [
          `echo "Deploying application to ${environment.name}..."`,
          'npm run build',
          `rsync -avz --delete dist/ \${{ secrets.DEPLOY_HOST_${environment.name.toUpperCase()} }}:\${{ vars.DEPLOY_PATH_${environment.name.toUpperCase()} }}`,
          `echo "✅ Application deployed to ${environment.name}"`
        ].join('\n'),
        if: `steps.detect-env.outputs.environment == '${environment.type}'`
      }
    ];
  }
}