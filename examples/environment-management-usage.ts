/**
 * Example usage of EnvironmentManager for handling secrets, variables, and OIDC
 * Demonstrates requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { EnvironmentManager, SecretConfig, VariableConfig, OIDCConfig, ConfigFileTemplate } from '../src/generator/environment-manager';
import { EnvironmentStepGenerator } from '../src/generator/utils/environment-step-generator';
import { EnvironmentConfig, DetectionResult } from '../src/generator/interfaces';

// Example: Setting up environment management for a Node.js application
async function setupEnvironmentManagement() {
  const environmentManager = new EnvironmentManager();
  const stepGenerator = new EnvironmentStepGenerator(environmentManager);

  // 1. Register application-specific secrets
  const secrets: SecretConfig[] = [
    {
      name: 'DATABASE_URL',
      description: 'PostgreSQL database connection string',
      required: true,
      environments: ['staging', 'production'],
      type: 'connection_string'
    },
    {
      name: 'JWT_SECRET',
      description: 'JWT signing secret for authentication',
      required: true,
      environments: ['staging', 'production'],
      type: 'token'
    },
    {
      name: 'STRIPE_SECRET_KEY',
      description: 'Stripe payment processing secret key',
      required: false,
      environments: ['production'],
      type: 'api_key'
    },
    {
      name: 'SENDGRID_API_KEY',
      description: 'SendGrid email service API key',
      required: false,
      environments: ['staging', 'production'],
      type: 'api_key'
    }
  ];

  secrets.forEach(secret => environmentManager.registerSecret(secret));

  // 2. Register environment variables
  const variables: VariableConfig[] = [
    {
      name: 'NODE_ENV',
      description: 'Node.js environment',
      required: true,
      environments: ['development', 'staging', 'production'],
      type: 'string'
    },
    {
      name: 'PORT',
      value: '3000',
      description: 'Server port',
      required: false,
      environments: ['development', 'staging', 'production'],
      type: 'number'
    },
    {
      name: 'LOG_LEVEL',
      value: 'info',
      description: 'Logging level',
      required: false,
      environments: ['development', 'staging', 'production'],
      type: 'string'
    },
    {
      name: 'CORS_ORIGIN',
      description: 'CORS allowed origins',
      required: true,
      environments: ['staging', 'production'],
      type: 'string'
    }
  ];

  variables.forEach(variable => environmentManager.registerVariable(variable));

  // 3. Configure OIDC for cloud deployments
  const oidcConfigs: Array<{ env: string; config: OIDCConfig }> = [
    {
      env: 'staging',
      config: {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions-Staging',
        audience: 'sts.amazonaws.com'
      }
    },
    {
      env: 'production',
      config: {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions-Production',
        audience: 'sts.amazonaws.com'
      }
    }
  ];

  oidcConfigs.forEach(({ env, config }) => {
    environmentManager.registerOIDC(env, config);
  });

  // 4. Register configuration file templates
  const configTemplates: ConfigFileTemplate[] = [
    {
      filename: 'config.{{environment}}.json',
      content: JSON.stringify({
        database: {
          url: '{{DATABASE_URL}}'
        },
        jwt: {
          secret: '{{JWT_SECRET}}'
        },
        server: {
          port: '{{PORT}}',
          corsOrigin: '{{CORS_ORIGIN}}'
        },
        logging: {
          level: '{{LOG_LEVEL}}'
        },
        features: {
          payments: '{{STRIPE_SECRET_KEY}}' ? true : false,
          email: '{{SENDGRID_API_KEY}}' ? true : false
        }
      }, null, 2),
      format: 'json',
      variables: ['PORT', 'CORS_ORIGIN', 'LOG_LEVEL'],
      secrets: ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'SENDGRID_API_KEY']
    },
    {
      filename: 'docker-compose.{{environment}}.yml',
      content: `version: '3.8'
services:
  app:
    image: myapp:latest
    environment:
      - NODE_ENV={{NODE_ENV}}
      - PORT={{PORT}}
      - DATABASE_URL={{DATABASE_URL}}
      - JWT_SECRET={{JWT_SECRET}}
      - LOG_LEVEL={{LOG_LEVEL}}
      - CORS_ORIGIN={{CORS_ORIGIN}}
    ports:
      - "{{PORT}}:{{PORT}}"
  
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=myapp
      - POSTGRES_PASSWORD={{DATABASE_URL}}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:`,
      format: 'yaml',
      variables: ['NODE_ENV', 'PORT', 'LOG_LEVEL', 'CORS_ORIGIN'],
      secrets: ['DATABASE_URL', 'JWT_SECRET']
    }
  ];

  configTemplates.forEach(template => {
    environmentManager.registerConfigTemplate(template);
  });

  // 5. Define environments
  const environments: EnvironmentConfig[] = [
    {
      name: 'development',
      type: 'development',
      approvalRequired: false,
      secrets: ['DATABASE_URL'],
      variables: {
        NODE_ENV: 'development',
        PORT: '3000',
        LOG_LEVEL: 'debug',
        CORS_ORIGIN: 'http://localhost:3000'
      },
      deploymentStrategy: 'rolling',
      rollbackEnabled: false
    },
    {
      name: 'staging',
      type: 'staging',
      approvalRequired: false,
      secrets: ['DATABASE_URL', 'JWT_SECRET', 'SENDGRID_API_KEY'],
      variables: {
        NODE_ENV: 'staging',
        PORT: '3000',
        LOG_LEVEL: 'info',
        CORS_ORIGIN: 'https://staging.myapp.com'
      },
      deploymentStrategy: 'rolling',
      rollbackEnabled: true
    },
    {
      name: 'production',
      type: 'production',
      approvalRequired: true,
      secrets: ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'SENDGRID_API_KEY'],
      variables: {
        NODE_ENV: 'production',
        PORT: '3000',
        LOG_LEVEL: 'warn',
        CORS_ORIGIN: 'https://myapp.com'
      },
      deploymentStrategy: 'blue-green',
      rollbackEnabled: true
    }
  ];

  // 6. Mock detection result
  const detectionResult: DetectionResult = {
    frameworks: [
      { name: 'Express', confidence: 0.9, evidence: ['package.json'], category: 'backend' }
    ],
    languages: [
      { name: 'TypeScript', confidence: 0.9, primary: true }
    ],
    buildTools: [
      { name: 'npm', confidence: 0.9, configFile: 'package.json' }
    ],
    packageManagers: [
      { name: 'npm', confidence: 0.9, lockFile: 'package-lock.json' }
    ],
    testingFrameworks: [
      { name: 'Jest', type: 'unit', confidence: 0.8 }
    ],
    deploymentTargets: [
      { platform: 'AWS', type: 'container', confidence: 0.8 }
    ],
    projectMetadata: {
      name: 'myapp',
      description: 'My Node.js application',
      version: '1.0.0'
    }
  };

  // 7. Generate environment management steps
  console.log('🔧 Generating environment management steps...\n');

  const result = environmentManager.generateEnvironmentSteps(environments, detectionResult);

  console.log('📋 Environment Steps Generated:');
  result.environmentSteps.forEach((step, index) => {
    console.log(`${index + 1}. ${step.name}`);
  });

  console.log('\n🔐 Secret References:');
  Object.entries(result.secretReferences).forEach(([name, ref]) => {
    console.log(`  ${name}: ${ref}`);
  });

  console.log('\n📝 Variable References:');
  Object.entries(result.variableReferences).forEach(([name, ref]) => {
    console.log(`  ${name}: ${ref}`);
  });

  console.log('\n📄 Configuration Files:');
  result.configFiles.forEach(file => {
    console.log(`  ${file.filename} (${file.format})`);
  });

  console.log('\n🔑 OIDC Steps:');
  result.oidcSteps.forEach((step, index) => {
    console.log(`${index + 1}. ${step.name}`);
  });

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }

  // 8. Generate complete workflow steps
  console.log('\n🚀 Generating complete environment setup steps...\n');

  const workflowSteps = stepGenerator.generateEnvironmentSetupSteps(environments, {
    includeValidation: true,
    includeOIDC: true,
    includeConfigGeneration: true,
    validateSecrets: true,
    generateEnvFiles: true
  });

  console.log('📋 Complete Workflow Steps:');
  workflowSteps.forEach((step, index) => {
    console.log(`${index + 1}. ${step.name}`);
    if (step.if) {
      console.log(`   Condition: ${step.if}`);
    }
  });

  // 9. Generate deployment steps for different types
  console.log('\n🚢 Generating deployment steps...\n');

  const containerDeploymentSteps = stepGenerator.generateDeploymentSteps(environments, 'container');
  console.log('Container Deployment Steps:');
  containerDeploymentSteps.forEach((step, index) => {
    console.log(`${index + 1}. ${step.name}`);
  });

  return {
    environmentManager,
    stepGenerator,
    result,
    workflowSteps,
    containerDeploymentSteps
  };
}

// Example: Advanced OIDC configuration for multiple cloud providers
async function setupMultiCloudOIDC() {
  const environmentManager = new EnvironmentManager();

  // AWS OIDC configuration
  environmentManager.registerOIDC('aws-production', {
    provider: 'aws',
    roleArn: 'arn:aws:iam::123456789012:role/GitHubActions-Production',
    audience: 'sts.amazonaws.com'
  });

  // Azure OIDC configuration
  environmentManager.registerOIDC('azure-production', {
    provider: 'azure',
    subscriptionId: 'subscription-id-123',
    audience: 'api://AzureADTokenExchange'
  });

  // GCP OIDC configuration
  environmentManager.registerOIDC('gcp-production', {
    provider: 'gcp',
    workloadIdentityProvider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/github',
    serviceAccount: 'github-actions@my-project.iam.gserviceaccount.com'
  });

  // Custom OIDC configuration
  environmentManager.registerOIDC('custom-production', {
    provider: 'custom',
    audience: 'https://my-custom-service.com',
    issuer: 'https://token.actions.githubusercontent.com'
  });

  console.log('🌐 Multi-cloud OIDC configurations registered');
  console.log('OIDC Configs:', Array.from(environmentManager.getOIDCConfigs().entries()));

  return environmentManager;
}

// Run examples
if (require.main === module) {
  console.log('🎯 Environment Management Examples\n');
  
  setupEnvironmentManagement()
    .then(() => {
      console.log('\n✅ Basic environment management example completed\n');
      return setupMultiCloudOIDC();
    })
    .then(() => {
      console.log('\n✅ Multi-cloud OIDC example completed');
    })
    .catch(error => {
      console.error('❌ Error running examples:', error);
    });
}

export {
  setupEnvironmentManagement,
  setupMultiCloudOIDC
};