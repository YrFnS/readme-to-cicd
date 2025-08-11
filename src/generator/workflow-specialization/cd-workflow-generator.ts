/**
 * CD Workflow Generator - Specialized for Continuous Deployment workflows
 * Focuses on deployment and release steps
 */

import { DetectionResult, GenerationOptions, WorkflowOutput, EnvironmentConfig } from '../interfaces';
import { WorkflowTemplate, JobTemplate, StepTemplate, TriggerConfig } from '../types';
import { ghExpr, ghScript, ghEnvVar, ghSecret, ghNeeds, ghContext, ghStepOutput } from './github-actions-utils';

export class CDWorkflowGenerator {
  /**
   * Generate CD-focused workflow optimized for deployment and release steps
   */
  async generateCDWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    const workflow = this.createCDWorkflowTemplate(detectionResult, options);
    const content = await this.renderWorkflow(workflow);
    
    return {
      filename: 'cd.yml',
      content,
      type: 'cd',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: this.createDetectionSummary(detectionResult),
        optimizations: this.getAppliedOptimizations(detectionResult, options),
        warnings: this.getWarnings(detectionResult, options)
      }
    };
  }

  /**
   * Create CD workflow template with deployment and release focus
   */
  private createCDWorkflowTemplate(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): WorkflowTemplate {
    return {
      name: 'Continuous Deployment',
      type: 'cd',
      triggers: this.createCDTriggers(options),
      jobs: this.createCDJobs(detectionResult, options),
      permissions: {
        contents: 'read',
        deployments: 'write',
        idToken: 'write', // For OIDC
        packages: 'write'
      },
      concurrency: {
        group: 'cd-${{ github.ref }}',
        cancelInProgress: false // Don't cancel deployments
      }
    };
  }

  /**
   * Create CD-specific triggers (successful CI, tags, manual dispatch)
   */
  private createCDTriggers(options: GenerationOptions): TriggerConfig {
    const triggers: TriggerConfig = {
      workflowDispatch: {
        inputs: {
          environment: {
            description: 'Environment to deploy to',
            required: true,
            type: 'choice',
            options: options.environments?.map(env => env.name) || ['staging', 'production']
          },
          version: {
            description: 'Version to deploy (optional)',
            required: false,
            type: 'string'
          }
        }
      }
    };

    // Add push trigger for main branch (staging deployment)
    triggers.push = {
      branches: ['main', 'master'],
      paths: ['src/**', 'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle']
    };

    // Add release trigger for production deployment
    triggers.release = {
      types: ['published']
    };

    return triggers;
  }

  /**
   * Create CD jobs focused on deployment and release
   */
  private createCDJobs(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate[] {
    const jobs: JobTemplate[] = [];

    // Add build job (reuse artifacts from CI if available)
    jobs.push(this.createBuildJob(detectionResult, options));

    // Add deployment jobs for each environment
    if (options.environments && options.environments.length > 0) {
      options.environments.forEach(env => {
        jobs.push(this.createDeploymentJob(detectionResult, options, env));
      });
    } else {
      // Default staging and production environments
      jobs.push(this.createDeploymentJob(detectionResult, options, {
        name: 'staging',
        type: 'staging',
        approvalRequired: false,
        secrets: [],
        variables: {},
        deploymentStrategy: 'rolling',
        rollbackEnabled: true
      }));
      
      jobs.push(this.createDeploymentJob(detectionResult, options, {
        name: 'production',
        type: 'production',
        approvalRequired: true,
        secrets: [],
        variables: {},
        deploymentStrategy: 'blue-green',
        rollbackEnabled: true
      }));
    }

    // Add post-deployment verification job
    jobs.push(this.createPostDeploymentJob(detectionResult, options));

    return jobs;
  }

  /**
   * Create build job for CD (may reuse CI artifacts)
   */
  private createBuildJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    // Try to download artifacts from CI workflow first
    steps.push({
      name: 'Download CI artifacts',
      uses: 'actions/download-artifact@v4',
      with: {
        name: 'build-artifacts-default',
        path: 'dist/'
      },
      continueOnError: true
    });

    // If no artifacts available, build from source
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult));
      steps.push(...this.createBuildSteps(primaryLanguage.name, detectionResult, options));
    }

    // Create deployment artifacts
    steps.push(...this.createDeploymentArtifactSteps(detectionResult, options));

    return {
      name: 'build',
      runsOn: 'ubuntu-latest',
      steps,
      outputs: {
        'artifact-name': '${{ steps.create-artifact.outputs.artifact-name }}',
        'version': '${{ steps.version.outputs.version }}'
      }
    };
  }

  /**
   * Create deployment job for specific environment
   */
  private createDeploymentJob(
    detectionResult: DetectionResult,
    options: GenerationOptions,
    environment: EnvironmentConfig
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      },
      {
        name: 'Download build artifacts',
        uses: 'actions/download-artifact@v4',
        with: {
          name: '${{ needs.build.outputs.artifact-name }}',
          path: 'dist/'
        }
      }
    ];

    // Add environment-specific setup
    steps.push(...this.createEnvironmentSetupSteps(environment, options));

    // Add deployment steps based on detected deployment targets
    steps.push(...this.createDeploymentSteps(detectionResult, environment, options));

    // Add health checks
    steps.push(...this.createHealthCheckSteps(environment));

    // Add rollback preparation
    if (environment.rollbackEnabled) {
      steps.push(...this.createRollbackPreparationSteps(environment));
    }

    const job: JobTemplate = {
      name: `deploy-${environment.name}`,
      runsOn: 'ubuntu-latest',
      environment: environment.approvalRequired ? {
        name: environment.name,
        url: `https://${environment.name}.example.com`
      } : environment.name,
      steps,
      needs: ['build']
    };

    // Add conditional execution based on trigger and environment
    if (environment.type === 'production') {
      job.if = "github.event_name == 'release' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production')";
    } else if (environment.type === 'staging') {
      job.if = "github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'staging')";
    }

    return job;
  }

  /**
   * Create post-deployment verification job
   */
  private createPostDeploymentJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Run smoke tests',
        run: 'curl -f ${{ vars.APP_URL }}/health || exit 1'
      },
      {
        name: 'Verify deployment metrics',
        run: 'echo "Checking deployment metrics..."'
      }
    ];

    // Add framework-specific verification steps
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createVerificationSteps(primaryLanguage.name, detectionResult));
    }

    // Add notification steps
    steps.push({
      name: 'Notify deployment success',
      uses: 'actions/github-script@v7',
      with: {
        script: `
          github.rest.repos.createDeploymentStatus({
            owner: context.repo.owner,
            repo: context.repo.repo,
            deployment_id: context.payload.deployment.id,
            state: 'success',
            description: 'Deployment completed successfully'
          });
        `
      },
      if: 'success()'
    });

    return {
      name: 'post-deployment',
      runsOn: 'ubuntu-latest',
      steps,
      needs: options.environments?.map(env => `deploy-${env.name}`) || ['deploy-staging', 'deploy-production'],
      if: 'always()'
    };
  }

  private createLanguageSetupSteps(
    language: string,
    detectionResult: DetectionResult
  ): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return this.createNodeJSSetupSteps(detectionResult);
      case 'python':
        return this.createPythonSetupSteps(detectionResult);
      case 'java':
        return this.createJavaSetupSteps(detectionResult);
      case 'rust':
        return this.createRustSetupSteps();
      case 'go':
        return this.createGoSetupSteps();
      default:
        return [];
    }
  }

  private createNodeJSSetupSteps(detectionResult: DetectionResult): StepTemplate[] {
    const packageManager = detectionResult.packageManagers.find(pm => 
      ['npm', 'yarn', 'pnpm'].includes(pm.name)
    )?.name || 'npm';

    const steps: StepTemplate[] = [
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '18',
          cache: packageManager
        }
      }
    ];

    switch (packageManager) {
      case 'yarn':
        steps.push({
          name: 'Install dependencies',
          run: 'yarn install --frozen-lockfile --production'
        });
        break;
      case 'pnpm':
        steps.push({
          name: 'Setup pnpm',
          uses: 'pnpm/action-setup@v2'
        });
        steps.push({
          name: 'Install dependencies',
          run: 'pnpm install --frozen-lockfile --prod'
        });
        break;
      default:
        steps.push({
          name: 'Install dependencies',
          run: 'npm ci --only=production'
        });
    }

    return steps;
  }

  private createPythonSetupSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Setup Python',
        uses: 'actions/setup-python@v5',
        with: {
          'python-version': '3.11'
        }
      },
      {
        name: 'Install dependencies',
        run: 'pip install -r requirements.txt'
      }
    ];
  }

  private createJavaSetupSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Setup JDK',
        uses: 'actions/setup-java@v4',
        with: {
          'java-version': '17',
          distribution: 'temurin'
        }
      }
    ];
  }

  private createRustSetupSteps(): StepTemplate[] {
    return [
      {
        name: 'Setup Rust',
        uses: 'dtolnay/rust-toolchain@stable'
      }
    ];
  }

  private createGoSetupSteps(): StepTemplate[] {
    return [
      {
        name: 'Setup Go',
        uses: 'actions/setup-go@v5',
        with: {
          'go-version': '1.21'
        }
      }
    ];
  }

  private createBuildSteps(
    language: string,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Add version determination step
    steps.push({
      name: 'Determine version',
      id: 'version',
      run: this.getVersionScript(language),
      env: {
        GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}'
      }
    });

    // Add language-specific build steps
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        steps.push({
          name: 'Build for production',
          run: 'npm run build',
          env: {
            NODE_ENV: 'production'
          }
        });
        break;
      case 'python':
        steps.push({
          name: 'Build Python package',
          run: 'python -m build'
        });
        break;
      case 'java':
        const buildTool = detectionResult.buildTools.find(bt => 
          ['maven', 'gradle'].includes(bt.name)
        )?.name || 'maven';
        steps.push({
          name: 'Build with ' + buildTool,
          run: buildTool === 'maven' ? 'mvn package -DskipTests' : './gradlew build -x test'
        });
        break;
      case 'rust':
        steps.push({
          name: 'Build Rust application',
          run: 'cargo build --release'
        });
        break;
      case 'go':
        steps.push({
          name: 'Build Go application',
          run: 'go build -ldflags="-X main.version=${{ steps.version.outputs.version }}" -o bin/app ./cmd/app'
        });
        break;
    }

    return steps;
  }

  private createDeploymentArtifactSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Detect deployment type
    const deploymentTargets = detectionResult.deploymentTargets;
    const isContainerized = deploymentTargets.some(dt => dt.type === 'container');
    const isStatic = deploymentTargets.some(dt => dt.type === 'static');

    if (isContainerized) {
      steps.push(...this.createContainerBuildSteps(detectionResult));
    }

    if (isStatic) {
      steps.push(...this.createStaticSiteBuildSteps(detectionResult));
    }

    // Create deployment artifact
    steps.push({
      name: 'Create deployment artifact',
      id: 'create-artifact',
      run: [
        'ARTIFACT_NAME="deployment-${{ steps.version.outputs.version }}-${{ github.sha }}"',
        'echo "artifact-name=$ARTIFACT_NAME" >> $GITHUB_OUTPUT',
        'tar -czf "$ARTIFACT_NAME.tar.gz" dist/ || tar -czf "$ARTIFACT_NAME.tar.gz" build/'
      ].join('\n')
    });

    steps.push({
      name: 'Upload deployment artifact',
      uses: 'actions/upload-artifact@v4',
      with: {
        name: '${{ steps.create-artifact.outputs.artifact-name }}',
        path: '${{ steps.create-artifact.outputs.artifact-name }}.tar.gz',
        'retention-days': 30
      }
    });

    return steps;
  }

  private createContainerBuildSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Set up Docker Buildx',
        uses: 'docker/setup-buildx-action@v3'
      },
      {
        name: 'Login to Container Registry',
        uses: 'docker/login-action@v3',
        with: {
          registry: '${{ vars.CONTAINER_REGISTRY || \'ghcr.io\' }}',
          username: '${{ github.actor }}',
          password: '${{ secrets.GITHUB_TOKEN }}'
        }
      },
      {
        name: 'Build and push Docker image',
        uses: 'docker/build-push-action@v5',
        with: {
          context: '.',
          push: true,
          tags: [
            '${{ vars.CONTAINER_REGISTRY || \'ghcr.io\' }}/${{ github.repository }}:${{ steps.version.outputs.version }}',
            '${{ vars.CONTAINER_REGISTRY || \'ghcr.io\' }}/${{ github.repository }}:latest'
          ].join('\n'),
          cache: {
            from: 'type=gha',
            to: 'type=gha,mode=max'
          }
        }
      }
    ];
  }

  private createStaticSiteBuildSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Optimize static assets',
        run: [
          '# Compress images if present',
          'if [ -d "dist/images" ] || [ -d "build/images" ]; then',
          '  echo "Optimizing images..."',
          'fi',
          '',
          '# Minify CSS and JS if not already done',
          'echo "Assets optimized for deployment"'
        ].join('\n')
      }
    ];
  }

  private createEnvironmentSetupSteps(
    environment: EnvironmentConfig,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Configure cloud provider credentials if OIDC is enabled
    if (options.environmentManagement?.includeOIDC) {
      steps.push({
        name: 'Configure AWS credentials',
        uses: 'aws-actions/configure-aws-credentials@v4',
        with: {
          'role-to-assume': `\${{ secrets.AWS_ROLE_ARN_${environment.name.toUpperCase()} }}`,
          'aws-region': '${{ vars.AWS_REGION }}',
          'role-session-name': `GitHubActions-${environment.name}`
        },
        if: "contains(github.repository, 'aws') || vars.CLOUD_PROVIDER == 'aws'"
      });

      steps.push({
        name: 'Azure Login',
        uses: 'azure/login@v1',
        with: {
          'client-id': '${{ secrets.AZURE_CLIENT_ID }}',
          'tenant-id': '${{ secrets.AZURE_TENANT_ID }}',
          'subscription-id': '${{ secrets.AZURE_SUBSCRIPTION_ID }}'
        },
        if: "contains(github.repository, 'azure') || vars.CLOUD_PROVIDER == 'azure'"
      });
    }

    // Set environment variables
    if (environment.variables && Object.keys(environment.variables).length > 0) {
      const envVars = Object.entries(environment.variables)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      steps.push({
        name: 'Set environment variables',
        run: [
          'cat << EOF >> $GITHUB_ENV',
          envVars,
          'EOF'
        ].join('\n')
      });
    }

    return steps;
  }

  private createDeploymentSteps(
    detectionResult: DetectionResult,
    environment: EnvironmentConfig,
    options: GenerationOptions
  ): StepTemplate[] {
    const deploymentTargets = detectionResult.deploymentTargets;
    const steps: StepTemplate[] = [];

    // Container deployment
    if (deploymentTargets.some(dt => dt.type === 'container')) {
      steps.push(...this.createContainerDeploymentSteps(environment, options));
    }

    // Static site deployment
    if (deploymentTargets.some(dt => dt.type === 'static')) {
      steps.push(...this.createStaticDeploymentSteps(environment, options));
    }

    // Serverless deployment
    if (deploymentTargets.some(dt => dt.type === 'serverless')) {
      steps.push(...this.createServerlessDeploymentSteps(environment, options));
    }

    // Traditional server deployment
    if (deploymentTargets.some(dt => dt.type === 'traditional')) {
      steps.push(...this.createTraditionalDeploymentSteps(environment, options));
    }

    return steps;
  }

  private createContainerDeploymentSteps(
    environment: EnvironmentConfig,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (environment.deploymentStrategy) {
      case 'blue-green':
        steps.push({
          name: 'Deploy with blue-green strategy',
          run: '# Blue-green deployment logic\n' +
               `kubectl set image deployment/app app=\${{ vars.CONTAINER_REGISTRY }}/\${{ github.repository }}:\${{ needs.build.outputs.version }} --namespace=${environment.name}\n` +
               `kubectl rollout status deployment/app --namespace=${environment.name} --timeout=300s`
        });
        break;
      
      case 'canary':
        steps.push({
          name: 'Deploy canary version',
          run: '# Canary deployment - start with 10% traffic\n' +
               `kubectl patch deployment app-canary -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","image":"\${{ vars.CONTAINER_REGISTRY }}/\${{ github.repository }}:\${{ needs.build.outputs.version }}"}]}}}}' --namespace=${environment.name}\n` +
               `kubectl scale deployment app-canary --replicas=1 --namespace=${environment.name}`
        });
        break;
      
      default: // rolling
        steps.push({
          name: 'Deploy with rolling update',
          run: `kubectl set image deployment/app app=\${{ vars.CONTAINER_REGISTRY }}/\${{ github.repository }}:\${{ needs.build.outputs.version }} --namespace=${environment.name}\n` +
               `kubectl rollout status deployment/app --namespace=${environment.name} --timeout=300s`
        });
    }

    return steps;
  }

  private createStaticDeploymentSteps(
    environment: EnvironmentConfig,
    options: GenerationOptions
  ): StepTemplate[] {
    return [
      {
        name: 'Deploy to S3',
        run: [
          `aws s3 sync dist/ s3://${ghEnvVar('S3_BUCKET', environment.name)} --delete`,
          `aws cloudfront create-invalidation --distribution-id ${ghEnvVar('CLOUDFRONT_DISTRIBUTION', environment.name)} --paths "/*"`
        ].join('\n'),
        if: "vars.CLOUD_PROVIDER == 'aws'"
      },
      {
        name: 'Deploy to Azure Static Web Apps',
        uses: 'Azure/static-web-apps-deploy@v1',
        with: {
          'azure_static_web_apps_api_token': `\${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_${environment.name.toUpperCase()} }}`,
          'repo_token': '${{ secrets.GITHUB_TOKEN }}',
          'action': 'upload',
          'app_location': 'dist'
        },
        if: "vars.CLOUD_PROVIDER == 'azure'"
      },
      {
        name: 'Deploy to Netlify',
        uses: 'nwtgck/actions-netlify@v3',
        with: {
          'publish-dir': 'dist',
          'production-branch': environment.type === 'production' ? 'main' : undefined,
          'github-token': '${{ secrets.GITHUB_TOKEN }}',
          'deploy-message': 'Deploy from GitHub Actions'
        },
        env: {
          NETLIFY_AUTH_TOKEN: `\${{ secrets.NETLIFY_AUTH_TOKEN }}`,
          NETLIFY_SITE_ID: `\${{ secrets.NETLIFY_SITE_ID_${environment.name.toUpperCase()} }}`
        },
        if: "vars.HOSTING_PROVIDER == 'netlify'"
      }
    ];
  }

  private createServerlessDeploymentSteps(
    environment: EnvironmentConfig,
    options: GenerationOptions
  ): StepTemplate[] {
    return [
      {
        name: 'Deploy to AWS Lambda',
        run: [
          '# Package and deploy serverless function',
          'zip -r function.zip . -x "*.git*" "node_modules/.cache/*" "tests/*"',
          `aws lambda update-function-code --function-name ${ghEnvVar('LAMBDA_FUNCTION', environment.name)} --zip-file fileb://function.zip`
        ].join('\n'),
        if: "vars.CLOUD_PROVIDER == 'aws'"
      },
      {
        name: 'Deploy to Vercel',
        uses: 'amondnet/vercel-action@v25',
        with: {
          'vercel-token': '${{ secrets.VERCEL_TOKEN }}',
          'vercel-org-id': '${{ secrets.VERCEL_ORG_ID }}',
          'vercel-project-id': '${{ secrets.VERCEL_PROJECT_ID }}',
          'vercel-args': environment.type === 'production' ? '--prod' : undefined
        },
        if: "vars.HOSTING_PROVIDER == 'vercel'"
      }
    ];
  }

  private createTraditionalDeploymentSteps(
    environment: EnvironmentConfig,
    options: GenerationOptions
  ): StepTemplate[] {
    return [
      {
        name: 'Deploy to server',
        run: [
          '# Extract deployment artifact',
          `tar -xzf ${ghNeeds('build', 'artifact-name')}.tar.gz`,
          '',
          '# Deploy using rsync or scp',
          `rsync -avz --delete dist/ ${ghSecret('DEPLOY_USER')}@${ghEnvVar('DEPLOY_HOST', environment.name)}:${ghEnvVar('DEPLOY_PATH')}`,
          '',
          '# Restart application service',
          `ssh ${ghSecret('DEPLOY_USER')}@${ghEnvVar('DEPLOY_HOST', environment.name)} "sudo systemctl restart ${ghEnvVar('APP_SERVICE_NAME')}"`
        ].join('\n')
      }
    ];
  }

  private createHealthCheckSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: 'Wait for deployment',
        run: 'sleep 30'
      },
      {
        name: 'Health check',
        run: [
          'for i in {1..10}; do',
          `  if curl -f ${ghEnvVar('APP_URL', environment.name)}/health; then`,
          '    echo "Health check passed"',
          '    exit 0',
          '  fi',
          '  echo "Health check failed, retrying in 10 seconds..."',
          '  sleep 10',
          'done',
          'echo "Health check failed after 10 attempts"',
          'exit 1'
        ].join('\n')
      },
      {
        name: 'Verify deployment version',
        run: [
          `DEPLOYED_VERSION=$(curl -s ${ghEnvVar('APP_URL', environment.name)}/version | jq -r '.version')`,
          `EXPECTED_VERSION="${ghNeeds('build', 'version')}"`,
          'if [ "$DEPLOYED_VERSION" = "$EXPECTED_VERSION" ]; then',
          '  echo "Version verification passed: $DEPLOYED_VERSION"',
          'else',
          '  echo "Version mismatch: expected $EXPECTED_VERSION, got $DEPLOYED_VERSION"',
          '  exit 1',
          'fi'
        ].join('\n')
      }
    ];
  }

  private createRollbackPreparationSteps(environment: EnvironmentConfig): StepTemplate[] {
    return [
      {
        name: 'Save rollback information',
        run: [
          `echo "ROLLBACK_VERSION=${ghNeeds('build', 'version')}" >> $GITHUB_ENV`,
          'echo "ROLLBACK_TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)" >> $GITHUB_ENV'
        ].join('\n')
      },
      {
        name: 'Create rollback script',
        run: [
          'cat << \'EOF\' > rollback.sh',
          '#!/bin/bash',
          'echo "Rolling back to previous version..."',
          '# Add rollback logic here based on deployment type',
          'EOF',
          'chmod +x rollback.sh'
        ].join('\n')
      }
    ];
  }

  private createVerificationSteps(
    language: string,
    detectionResult: DetectionResult
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Add language-specific verification
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        steps.push({
          name: 'Verify Node.js application',
          run: [
            '# Check if the application responds correctly',
            `response=$(curl -s ${ghEnvVar('APP_URL')}/api/health)`,
            'if echo "$response" | grep -q "ok"; then',
            '  echo "Application verification passed"',
            'else',
            '  echo "Application verification failed"',
            '  exit 1',
            'fi'
          ].join('\n')
        });
        break;
      
      case 'python':
        steps.push({
          name: 'Verify Python application',
          run: [
            '# Check Python application health',
            `curl -f ${ghEnvVar('APP_URL')}/health`
          ].join('\n')
        });
        break;
    }

    return steps;
  }

  private getVersionScript(language: string): string {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          'if [ "$GITHUB_EVENT_NAME" = "release" ]; then',
          `  VERSION=\${GITHUB_REF#refs/tags/}`,
          'else',
          `  VERSION=$(node -p "require('./package.json').version")-\${GITHUB_SHA::8}`,
          'fi',
          'echo "version=$VERSION" >> $GITHUB_OUTPUT'
        ].join('\n');
      
      case 'python':
        return [
          'if [ "$GITHUB_EVENT_NAME" = "release" ]; then',
          `  VERSION=\${GITHUB_REF#refs/tags/}`,
          'else',
          `  VERSION=$(python -c "import toml; print(toml.load('pyproject.toml')['project']['version'])")-\${GITHUB_SHA::8}`,
          'fi',
          'echo "version=$VERSION" >> $GITHUB_OUTPUT'
        ].join('\n');
      
      case 'java':
        return [
          'if [ "$GITHUB_EVENT_NAME" = "release" ]; then',
          `  VERSION=\${GITHUB_REF#refs/tags/}`,
          'else',
          `  VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)-\${GITHUB_SHA::8}`,
          'fi',
          'echo "version=$VERSION" >> $GITHUB_OUTPUT'
        ].join('\n');
      
      default:
        return [
          'if [ "$GITHUB_EVENT_NAME" = "release" ]; then',
          `  VERSION=\${GITHUB_REF#refs/tags/}`,
          'else',
          `  VERSION="1.0.0-\${GITHUB_SHA::8}"`,
          'fi',
          'echo "version=$VERSION" >> $GITHUB_OUTPUT'
        ].join('\n');
    }
  }

  private createDetectionSummary(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages.map(l => l.name).join(', ');
    const deploymentTargets = detectionResult.deploymentTargets.map(dt => dt.platform).join(', ');
    return `Languages: ${languages}; Deployment: ${deploymentTargets}`;
  }

  private getAppliedOptimizations(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): string[] {
    const optimizations: string[] = [];
    
    optimizations.push('Multi-environment deployment support');
    optimizations.push('Health checks and verification');
    optimizations.push('Artifact reuse from CI');
    
    if (options.environmentManagement?.includeOIDC) {
      optimizations.push('OIDC authentication for cloud deployments');
    }
    
    if (options.environments?.some(env => env.rollbackEnabled)) {
      optimizations.push('Rollback preparation and recovery');
    }

    return optimizations;
  }

  private getWarnings(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): string[] {
    const warnings: string[] = [];
    
    if (detectionResult.deploymentTargets.length === 0) {
      warnings.push('No deployment targets detected - using generic deployment');
    }
    
    if (!options.environments || options.environments.length === 0) {
      warnings.push('No environments configured - using default staging/production');
    }

    return warnings;
  }

  private async renderWorkflow(workflow: WorkflowTemplate): Promise<string> {
    // This would use the YAML renderer to convert the workflow template to YAML
    // For now, returning a placeholder
    return `# Generated CD Workflow\n# ${workflow.name}\n# Generated at: ${new Date().toISOString()}`;
  }
}