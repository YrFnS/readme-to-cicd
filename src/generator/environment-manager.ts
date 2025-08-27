/**
 * Environment Manager for handling environment variables, secrets, and configuration
 * Implements requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { EnvironmentConfig, DetectionResult } from './interfaces';
import { StepTemplate } from './types';

/**
 * Configuration for secret management
 */
export interface SecretConfig {
  name: string;
  description?: string;
  required: boolean;
  environments: string[];
  type: 'api_key' | 'token' | 'certificate' | 'connection_string' | 'generic';
}

/**
 * Configuration for environment variables
 */
export interface VariableConfig {
  name: string;
  value?: string;
  description?: string;
  required: boolean;
  environments: string[];
  type: 'string' | 'number' | 'boolean' | 'json';
}

/**
 * OIDC configuration for cloud deployments
 */
export interface OIDCConfig {
  provider: 'aws' | 'azure' | 'gcp' | 'custom';
  audience?: string;
  issuer?: string;
  subject?: string;
  roleArn?: string; // AWS specific
  subscriptionId?: string; // Azure specific
  workloadIdentityProvider?: string; // GCP specific
  serviceAccount?: string; // GCP specific
}

/**
 * Configuration file template
 */
export interface ConfigFileTemplate {
  filename: string;
  content: string;
  environment?: string;
  format: 'json' | 'yaml' | 'env' | 'toml' | 'ini';
  variables: string[];
  secrets: string[];
}

/**
 * Environment management result
 */
export interface EnvironmentManagementResult {
  environmentSteps: StepTemplate[];
  secretReferences: Record<string, string>;
  variableReferences: Record<string, string>;
  configFiles: ConfigFileTemplate[];
  oidcSteps: StepTemplate[];
  warnings: string[];
}

/**
 * Environment Manager class for handling variables, secrets, and configuration
 */
export class EnvironmentManager {
  private secrets: Map<string, SecretConfig> = new Map();
  private variables: Map<string, VariableConfig> = new Map();
  private oidcConfigs: Map<string, OIDCConfig> = new Map();
  private configTemplates: Map<string, ConfigFileTemplate> = new Map();

  /**
   * Register a secret configuration
   */
  registerSecret(secret: SecretConfig): void {
    this.secrets.set(secret.name, secret);
  }

  /**
   * Register a variable configuration
   */
  registerVariable(variable: VariableConfig): void {
    this.variables.set(variable.name, variable);
  }

  /**
   * Register OIDC configuration for cloud deployment
   */
  registerOIDC(environment: string, config: OIDCConfig): void {
    this.oidcConfigs.set(environment, config);
  }

  /**
   * Register configuration file template
   */
  registerConfigTemplate(template: ConfigFileTemplate): void {
    this.configTemplates.set(template.filename, template);
  }

  /**
   * Generate environment management steps for workflows
   */
  generateEnvironmentSteps(
    environments: EnvironmentConfig[],
    detectionResult: DetectionResult
  ): EnvironmentManagementResult {
    const result: EnvironmentManagementResult = {
      environmentSteps: [],
      secretReferences: {},
      variableReferences: {},
      configFiles: [],
      oidcSteps: [],
      warnings: []
    };

    // Auto-detect common secrets and variables based on frameworks
    this.autoDetectSecretsAndVariables(detectionResult);

    // Generate steps for each environment
    for (const env of environments) {
      const envSteps = this.generateEnvironmentSpecificSteps(env, result);
      result.environmentSteps.push(...envSteps);
    }

    // Generate OIDC authentication steps
    result.oidcSteps = this.generateOIDCSteps(environments);

    // Generate configuration files
    result.configFiles = this.generateConfigFiles(environments);

    // Validate configuration
    this.validateConfiguration(result);

    return result;
  }

  /**
   * Auto-detect common secrets and variables based on detected frameworks
   */
  private autoDetectSecretsAndVariables(detectionResult: DetectionResult): void {
    // Detect common secrets based on frameworks
    for (const framework of detectionResult.frameworks) {
      switch (framework.name.toLowerCase()) {
        case 'react':
        case 'next.js':
        case 'vue':
        case 'angular':
          this.registerCommonFrontendSecrets();
          break;
        case 'express':
        case 'fastify':
        case 'koa':
          this.registerCommonBackendSecrets();
          break;
        case 'django':
        case 'flask':
        case 'fastapi':
          this.registerCommonPythonSecrets();
          break;
        case 'spring':
        case 'spring boot':
          this.registerCommonJavaSecrets();
          break;
      }
    }

    // Detect deployment-specific secrets
    for (const target of detectionResult.deploymentTargets) {
      switch (target.platform.toLowerCase()) {
        case 'aws':
          this.registerAWSSecrets();
          break;
        case 'azure':
          this.registerAzureSecrets();
          break;
        case 'gcp':
        case 'google cloud':
          this.registerGCPSecrets();
          break;
        case 'docker':
        case 'dockerhub':
          this.registerDockerSecrets();
          break;
        case 'vercel':
          this.registerVercelSecrets();
          break;
        case 'netlify':
          this.registerNetlifySecrets();
          break;
      }
    }
  }

  /**
   * Register common frontend secrets
   */
  private registerCommonFrontendSecrets(): void {
    this.registerSecret({
      name: 'REACT_APP_API_URL',
      description: 'API endpoint URL for frontend application',
      required: false,
      environments: ['development', 'staging', 'production'],
      type: 'generic'
    });

    this.registerVariable({
      name: 'NODE_ENV',
      description: 'Node.js environment',
      required: true,
      environments: ['development', 'staging', 'production'],
      type: 'string'
    });
  }  /**
  
 * Register common backend secrets
   */
  private registerCommonBackendSecrets(): void {
    this.registerSecret({
      name: 'DATABASE_URL',
      description: 'Database connection string',
      required: true,
      environments: ['development', 'staging', 'production'],
      type: 'connection_string'
    });

    this.registerSecret({
      name: 'JWT_SECRET',
      description: 'JWT signing secret',
      required: true,
      environments: ['staging', 'production'],
      type: 'token'
    });

    this.registerSecret({
      name: 'API_KEY',
      description: 'External API key',
      required: false,
      environments: ['staging', 'production'],
      type: 'api_key'
    });
  }

  /**
   * Register common Python secrets
   */
  private registerCommonPythonSecrets(): void {
    this.registerSecret({
      name: 'SECRET_KEY',
      description: 'Django/Flask secret key',
      required: true,
      environments: ['staging', 'production'],
      type: 'token'
    });

    this.registerSecret({
      name: 'DATABASE_URL',
      description: 'Database connection string',
      required: true,
      environments: ['development', 'staging', 'production'],
      type: 'connection_string'
    });
  }

  /**
   * Register common Java secrets
   */
  private registerCommonJavaSecrets(): void {
    this.registerSecret({
      name: 'SPRING_DATASOURCE_URL',
      description: 'Spring Boot datasource URL',
      required: true,
      environments: ['development', 'staging', 'production'],
      type: 'connection_string'
    });

    this.registerSecret({
      name: 'SPRING_DATASOURCE_USERNAME',
      description: 'Database username',
      required: true,
      environments: ['development', 'staging', 'production'],
      type: 'generic'
    });

    this.registerSecret({
      name: 'SPRING_DATASOURCE_PASSWORD',
      description: 'Database password',
      required: true,
      environments: ['development', 'staging', 'production'],
      type: 'generic'
    });
  }

  /**
   * Register AWS-specific secrets
   */
  private registerAWSSecrets(): void {
    this.registerSecret({
      name: 'AWS_ACCESS_KEY_ID',
      description: 'AWS access key ID',
      required: false, // Not needed with OIDC
      environments: ['staging', 'production'],
      type: 'api_key'
    });

    this.registerSecret({
      name: 'AWS_SECRET_ACCESS_KEY',
      description: 'AWS secret access key',
      required: false, // Not needed with OIDC
      environments: ['staging', 'production'],
      type: 'token'
    });

    this.registerVariable({
      name: 'AWS_REGION',
      description: 'AWS region',
      required: true,
      environments: ['staging', 'production'],
      type: 'string'
    });
  }

  /**
   * Register Azure-specific secrets
   */
  private registerAzureSecrets(): void {
    this.registerSecret({
      name: 'AZURE_CLIENT_ID',
      description: 'Azure client ID',
      required: false, // Not needed with OIDC
      environments: ['staging', 'production'],
      type: 'api_key'
    });

    this.registerSecret({
      name: 'AZURE_CLIENT_SECRET',
      description: 'Azure client secret',
      required: false, // Not needed with OIDC
      environments: ['staging', 'production'],
      type: 'token'
    });

    this.registerSecret({
      name: 'AZURE_TENANT_ID',
      description: 'Azure tenant ID',
      required: true,
      environments: ['staging', 'production'],
      type: 'generic'
    });
  }

  /**
   * Register GCP-specific secrets
   */
  private registerGCPSecrets(): void {
    this.registerSecret({
      name: 'GCP_SERVICE_ACCOUNT_KEY',
      description: 'GCP service account key JSON',
      required: false, // Not needed with OIDC
      environments: ['staging', 'production'],
      type: 'certificate'
    });

    this.registerVariable({
      name: 'GCP_PROJECT_ID',
      description: 'GCP project ID',
      required: true,
      environments: ['staging', 'production'],
      type: 'string'
    });
  }

  /**
   * Register Docker-specific secrets
   */
  private registerDockerSecrets(): void {
    this.registerSecret({
      name: 'DOCKER_USERNAME',
      description: 'Docker registry username',
      required: true,
      environments: ['staging', 'production'],
      type: 'generic'
    });

    this.registerSecret({
      name: 'DOCKER_PASSWORD',
      description: 'Docker registry password',
      required: true,
      environments: ['staging', 'production'],
      type: 'token'
    });
  }

  /**
   * Register Vercel-specific secrets
   */
  private registerVercelSecrets(): void {
    this.registerSecret({
      name: 'VERCEL_TOKEN',
      description: 'Vercel deployment token',
      required: true,
      environments: ['staging', 'production'],
      type: 'token'
    });

    this.registerSecret({
      name: 'VERCEL_ORG_ID',
      description: 'Vercel organization ID',
      required: true,
      environments: ['staging', 'production'],
      type: 'generic'
    });

    this.registerSecret({
      name: 'VERCEL_PROJECT_ID',
      description: 'Vercel project ID',
      required: true,
      environments: ['staging', 'production'],
      type: 'generic'
    });
  }

  /**
   * Register Netlify-specific secrets
   */
  private registerNetlifySecrets(): void {
    this.registerSecret({
      name: 'NETLIFY_AUTH_TOKEN',
      description: 'Netlify authentication token',
      required: true,
      environments: ['staging', 'production'],
      type: 'token'
    });

    this.registerSecret({
      name: 'NETLIFY_SITE_ID',
      description: 'Netlify site ID',
      required: true,
      environments: ['staging', 'production'],
      type: 'generic'
    });
  }

  /**
   * Generate environment-specific workflow steps
   */
  private generateEnvironmentSpecificSteps(
    environment: EnvironmentConfig,
    result: EnvironmentManagementResult
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Add environment variable setup step
    const envVars = this.getEnvironmentVariables(environment);
    if (Object.keys(envVars).length > 0) {
      steps.push({
        name: `Set up ${environment.name} environment variables`,
        run: 'echo "Setting up environment variables"',
        env: envVars
      });

      // Store variable references
      Object.assign(result.variableReferences, envVars);
    }

    // Add secret validation step
    const secrets = this.getEnvironmentSecrets(environment);
    if (secrets.length > 0) {
      steps.push({
        name: `Validate ${environment.name} secrets`,
        run: this.generateSecretValidationScript(secrets),
        env: this.generateSecretEnvVars(secrets)
      });

      // Store secret references
      for (const secret of secrets) {
        result.secretReferences[secret] = `\${{ secrets.${secret} }}`;
      }
    }

    return steps;
  }

  /**
   * Get environment variables for a specific environment
   */
  private getEnvironmentVariables(environment: EnvironmentConfig): Record<string, string> {
    const envVars: Record<string, string> = {};

    // Add configured variables from environment config
    Object.assign(envVars, environment.variables);

    // Add registered variables that apply to this environment
    for (const [name, config] of this.variables) {
      if (config.environments.includes(environment.type) || config.environments.includes(environment.name)) {
        if (config.value) {
          envVars[name] = config.value;
        } else {
          envVars[name] = `\${{ vars.${name} }}`;
        }
      }
    }

    return envVars;
  }

  /**
   * Get secrets for a specific environment
   */
  private getEnvironmentSecrets(environment: EnvironmentConfig): string[] {
    const secrets: string[] = [];

    // Add configured secrets from environment config
    secrets.push(...environment.secrets);

    // Add registered secrets that apply to this environment
    for (const [name, config] of this.secrets) {
      if (config.environments.includes(environment.type) || config.environments.includes(environment.name)) {
        if (!secrets.includes(name)) {
          secrets.push(name);
        }
      }
    }

    return secrets;
  }

  /**
   * Generate secret validation script
   */
  private generateSecretValidationScript(secrets: string[]): string {
    const validationLines = secrets.map(secret => 
      `if [ -z "\$${secret}" ]; then echo "__Error: ${secret} is not set"; exit 1; fi`
    );

    return [
      'echo "Validating required secrets..."',
      ...validationLines,
      'echo "All required secrets are present"'
    ].join('\n');
  }

  /**
   * Generate environment variables for secret validation
   */
  private generateSecretEnvVars(secrets: string[]): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    for (const secret of secrets) {
      envVars[secret] = `\${{ secrets.${secret} }}`;
    }

    return envVars;
  }

  /**
   * Generate OIDC authentication steps for cloud deployments
   */
  private generateOIDCSteps(environments: EnvironmentConfig[]): StepTemplate[] {
    const steps: StepTemplate[] = [];

    for (const env of environments) {
      const oidcConfig = this.oidcConfigs.get(env.name) || this.oidcConfigs.get(env.type);
      if (!oidcConfig) {continue;}

      switch (oidcConfig.provider) {
        case 'aws':
          steps.push(this.generateAWSOIDCStep(env, oidcConfig));
          break;
        case 'azure':
          steps.push(this.generateAzureOIDCStep(env, oidcConfig));
          break;
        case 'gcp':
          steps.push(this.generateGCPOIDCStep(env, oidcConfig));
          break;
        case 'custom':
          steps.push(this.generateCustomOIDCStep(env, oidcConfig));
          break;
      }
    }

    return steps;
  }

  /**
   * Generate AWS OIDC authentication step
   */
  private generateAWSOIDCStep(environment: EnvironmentConfig, config: OIDCConfig): StepTemplate {
    return {
      name: `Configure AWS credentials for ${environment.name}`,
      uses: 'aws-actions/configure-aws-credentials@v4',
      with: {
        'role-to-assume': config.roleArn || `\${{ secrets.AWS_ROLE_ARN_${environment.name.toUpperCase()} }}`,
        'role-session-name': `GitHubActions-${environment.name}`,
        'aws-region': `\${{ vars.AWS_REGION || 'us-east-1' }}`,
        'audience': config.audience || 'sts.amazonaws.com'
      },
      if: `github.ref == 'refs/heads/main' && github.event_name == 'push'`
    };
  }

  /**
   * Generate Azure OIDC authentication step
   */
  private generateAzureOIDCStep(environment: EnvironmentConfig, config: OIDCConfig): StepTemplate {
    return {
      name: `Azure Login for ${environment.name}`,
      uses: 'azure/login@v1',
      with: {
        'client-id': `\${{ secrets.AZURE_CLIENT_ID }}`,
        'tenant-id': `\${{ secrets.AZURE_TENANT_ID }}`,
        'subscription-id': config.subscriptionId || `\${{ secrets.AZURE_SUBSCRIPTION_ID }}`,
        'audience': config.audience || 'api://AzureADTokenExchange'
      },
      if: `github.ref == 'refs/heads/main' && github.event_name == 'push'`
    };
  }

  /**
   * Generate GCP OIDC authentication step
   */
  private generateGCPOIDCStep(environment: EnvironmentConfig, config: OIDCConfig): StepTemplate {
    return {
      name: `Authenticate to Google Cloud for ${environment.name}`,
      uses: 'google-github-actions/auth@v2',
      with: {
        'workload_identity_provider': config.workloadIdentityProvider || `\${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}`,
        'service_account': config.serviceAccount || `\${{ secrets.GCP_SERVICE_ACCOUNT }}`,
        'audience': config.audience || 'https://github.com/google-github-actions/auth'
      },
      if: `github.ref == 'refs/heads/main' && github.event_name == 'push'`
    };
  }

  /**
   * Generate custom OIDC authentication step
   */
  private generateCustomOIDCStep(environment: EnvironmentConfig, config: OIDCConfig): StepTemplate {
    return {
      name: `Custom OIDC authentication for ${environment.name}`,
      run: [
        'echo "Custom OIDC authentication"',
        'echo "Configuring custom OIDC authentication"',
        `export OIDC_TOKEN=$(curl -H "_Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \\`,
        `  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=${config.audience || 'custom'}" | jq -r '.value')`,
        'echo "OIDC token configured"'
      ].join('\n'),
      env: {
        OIDC_ISSUER: config.issuer || 'https://token.actions.githubusercontent.com',
        OIDC_SUBJECT: config.subject || 'repo:${{ github.repository }}:ref:${{ github.ref }}'
      },
      if: `github.ref == 'refs/heads/main' && github.event_name == 'push'`
    };
  }

  /**
   * Generate configuration files from templates
   */
  private generateConfigFiles(environments: EnvironmentConfig[]): ConfigFileTemplate[] {
    const configFiles: ConfigFileTemplate[] = [];

    if (this.configTemplates.size > 0) {
      for (const [filename, template] of this.configTemplates) {
        for (const env of environments) {
          if (!template.environment || template.environment === env.name || template.environment === env.type) {
            const processedTemplate = this.processConfigTemplate(template, env);
            configFiles.push(processedTemplate);
          }
        }
      }
    } else {
      // Generate default configuration files if none are registered
      for (const env of environments) {
        configFiles.push(this.generateDefaultConfigFile(env));
      }
    }

    return configFiles;
  }

  /**
   * Process configuration template with environment-specific values
   */
  private processConfigTemplate(template: ConfigFileTemplate, environment: EnvironmentConfig): ConfigFileTemplate {
    let processedContent = template.content;

    // Replace variable placeholders
    for (const [name, config] of this.variables) {
      if (config.environments.includes(environment.type) || config.environments.includes(environment.name)) {
        const placeholder = `{{${name}}}`;
        const value = environment.variables[name] || config.value || `\${{ vars.${name} }}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // Replace secret placeholders
    for (const [name, config] of this.secrets) {
      if (config.environments.includes(environment.type) || config.environments.includes(environment.name)) {
        const placeholder = `{{${name}}}`;
        const value = `\${{ secrets.${name} }}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    return {
      ...template,
      filename: template.filename.replace('{{environment}}', environment.name),
      content: processedContent,
      environment: environment.name
    };
  }

  /**
   * Generate default configuration file for environment
   */
  private generateDefaultConfigFile(environment: EnvironmentConfig): ConfigFileTemplate {
    const variables: string[] = [];
    const secrets: string[] = [];

    // Collect applicable variables and secrets
    for (const [name, config] of this.variables) {
      if (config.environments.includes(environment.type) || config.environments.includes(environment.name)) {
        variables.push(name);
      }
    }

    for (const [name, config] of this.secrets) {
      if (config.environments.includes(environment.type) || config.environments.includes(environment.name)) {
        secrets.push(name);
      }
    }

    // Generate .env file content
    const envContent = [
      `# Environment configuration for ${environment.name}`,
      `# Generated automatically by YAML Generator`,
      '',
      '# Environment Variables',
      ...variables.map(name => `${name}={{${name}}}`),
      '',
      '# Secrets (will be injected at runtime)',
      ...secrets.map(name => `${name}={{${name}}}`)
    ].join('\n');

    return {
      filename: `.env.${environment.name}`,
      content: envContent,
      environment: environment.name,
      format: 'env',
      variables,
      secrets
    };
  }

  /**
   * Validate configuration for completeness and security
   */
  private validateConfiguration(result: EnvironmentManagementResult): void {
    // Check for required secrets that are missing
    for (const [name, config] of this.secrets) {
      if (config.required) {
        const isConfigured = Object.keys(result.secretReferences).includes(name);
        if (!isConfigured) {
          result.warnings.push(`Required secret '${name}' is not configured for any environment`);
        }
      }
    }

    // Check for required variables that are missing
    for (const [name, config] of this.variables) {
      if (config.required) {
        const isConfigured = Object.keys(result.variableReferences).includes(name);
        if (!isConfigured) {
          result.warnings.push(`Required variable '${name}' is not configured for any environment`);
        }
      }
    }

    // Check for potential security issues
    for (const [name, value] of Object.entries(result.variableReferences)) {
      if (this.isPotentialSecret(name, value)) {
        result.warnings.push(`Variable '${name}' appears to contain sensitive data and should be moved to secrets`);
      }
    }

    // Validate OIDC configurations
    for (const [env, config] of this.oidcConfigs) {
      if (config.provider === 'aws' && !config.roleArn) {
        result.warnings.push(`AWS OIDC configuration for '${env}' is missing roleArn`);
      }
      if (config.provider === 'azure' && !config.subscriptionId) {
        result.warnings.push(`Azure OIDC configuration for '${env}' is missing subscriptionId`);
      }
      if (config.provider === 'gcp' && (!config.workloadIdentityProvider || !config.serviceAccount)) {
        result.warnings.push(`GCP OIDC configuration for '${env}' is missing required fields`);
      }
    }
  }

  /**
   * Check if a variable name or value suggests it should be a secret
   */
  private isPotentialSecret(name: string, value: string): boolean {
    const secretKeywords = ['password', 'secret', 'key', 'token', 'api_key', 'private', 'credential'];
    const nameCheck = secretKeywords.some(keyword => name.toLowerCase().includes(keyword));
    const valueCheck = value.length > 20 && !value.includes('${{ vars.') && !value.includes('${{ secrets.');
    
    return nameCheck || valueCheck;
  }

  /**
   * Get all registered secrets
   */
  getSecrets(): Map<string, SecretConfig> {
    return new Map(this.secrets);
  }

  /**
   * Get all registered variables
   */
  getVariables(): Map<string, VariableConfig> {
    return new Map(this.variables);
  }

  /**
   * Get all OIDC configurations
   */
  getOIDCConfigs(): Map<string, OIDCConfig> {
    return new Map(this.oidcConfigs);
  }

  /**
   * Get all configuration templates
   */
  getConfigTemplates(): Map<string, ConfigFileTemplate> {
    return new Map(this.configTemplates);
  }

  /**
   * Clear all configurations (useful for testing)
   */
  clear(): void {
    this.secrets.clear();
    this.variables.clear();
    this.oidcConfigs.clear();
    this.configTemplates.clear();
  }
}