import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeploymentGenerator } from '../../../src/generator/templates/deployment-generator';
import { DetectionResult, GenerationOptions, EnvironmentConfig } from '../../../src/generator/interfaces';
import { TemplateManager } from '../../../src/generator/templates/template-manager';

describe('DeploymentGenerator', () => {
  let generator: DeploymentGenerator;
  let mockTemplateManager: TemplateManager;

  beforeEach(() => {
    mockTemplateManager = {
      compileTemplate: vi.fn().mockResolvedValue({
        template: {
          name: 'Test Deployment Workflow',
          type: 'cd',
          triggers: { push: { branches: ['main'] } },
          jobs: [{
            name: 'deploy',
            runsOn: 'ubuntu-latest',
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v4' },
              { name: 'Deploy', run: 'echo "Deploying..."' }
            ]
          }]
        },
        errors: [],
        warnings: []
      })
    } as any;
    
    generator = new DeploymentGenerator(mockTemplateManager);
  });

  describe('Container deployment generation', () => {
    it('should generate Docker container deployment workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'express', confidence: 0.9, evidence: ['package.json'], category: 'backend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.9 }],
        projectMetadata: {
          name: 'test-app',
          description: 'Test application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.type).toBe('cd');
      expect(result.filename).toBe('cd-docker.yml');
      expect(result.content).toContain('name: Test Deployment Workflow');
      expect(result.metadata.detectionSummary).toContain('docker');
      expect(result.metadata.optimizations).toContain('Docker layer caching enabled');
    });

    it('should generate AWS container deployment workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'fastapi', confidence: 0.9, evidence: ['main.py'], category: 'backend' }],
        packageManagers: [{ name: 'pip', lockFile: 'requirements.txt', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [
          { platform: 'aws-ecs', type: 'container', confidence: 0.9 },
          { platform: 'docker', type: 'container', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'fastapi-app',
          description: 'FastAPI application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-aws.yml');
      expect(result.metadata.detectionSummary).toContain('aws');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'aws-container-deployment',
        expect.objectContaining({
          isContainerized: true,
          cloudProvider: 'aws'
        })
      );
    });

    it('should generate Azure container deployment workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'C#', version: '8.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'aspnet', confidence: 0.9, evidence: ['Program.cs'], category: 'backend' }],
        packageManagers: [],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [
          { platform: 'azure-container-apps', type: 'container', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'aspnet-app',
          description: 'ASP.NET application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-azure.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'azure-container-deployment',
        expect.objectContaining({
          isContainerized: true,
          cloudProvider: 'azure'
        })
      );
    });

    it('should generate GCP container deployment workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'gin', confidence: 0.9, evidence: ['main.go'], category: 'backend' }],
        packageManagers: [],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [
          { platform: 'gcp-cloud-run', type: 'container', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'gin-app',
          description: 'Gin application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-gcp.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'gcp-container-deployment',
        expect.objectContaining({
          isContainerized: true,
          cloudProvider: 'gcp'
        })
      );
    });
  });

  describe('Static site deployment generation', () => {
    it('should generate GitHub Pages deployment workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [
          { platform: 'github-pages', type: 'static', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'react-app',
          description: 'React application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-github-pages.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'github-pages-deployment',
        expect.objectContaining({
          isStaticSite: true,
          staticSiteConfig: expect.objectContaining({
            buildCommand: 'npm run build',
            outputDirectory: 'build',
            nodeVersion: '18'
          })
        })
      );
    });

    it('should generate Netlify deployment workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '20', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'vue', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
        packageManagers: [{ name: 'yarn', lockFile: 'yarn.lock', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [
          { platform: 'netlify', type: 'static', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'vue-app',
          description: 'Vue application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-netlify.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'netlify-deployment',
        expect.objectContaining({
          isStaticSite: true,
          staticSiteConfig: expect.objectContaining({
            buildCommand: 'yarn build',
            outputDirectory: 'dist',
            nodeVersion: '20'
          })
        })
      );
    });

    it('should generate Vercel deployment workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'TypeScript', version: '5.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'nextjs', confidence: 0.9, evidence: ['next.config.js'], category: 'fullstack' }],
        packageManagers: [{ name: 'pnpm', lockFile: 'pnpm-lock.yaml', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [
          { platform: 'vercel', type: 'static', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'nextjs-app',
          description: 'Next.js application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-vercel.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'vercel-deployment',
        expect.objectContaining({
          isStaticSite: true,
          staticSiteConfig: expect.objectContaining({
            buildCommand: 'pnpm build && pnpm export',
            outputDirectory: 'out',
            nodeVersion: '5.0'
          })
        })
      );
    });

    it('should generate generic static site deployment workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'angular', confidence: 0.9, evidence: ['angular.json'], category: 'frontend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [
          { platform: 'static-hosting', type: 'static', confidence: 0.7 }
        ],
        projectMetadata: {
          name: 'angular-app',
          description: 'Angular application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-static.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'static-site-deployment',
        expect.objectContaining({
          isStaticSite: true,
          staticSiteConfig: expect.objectContaining({
            buildCommand: 'npm run build',
            outputDirectory: 'dist'
          })
        })
      );
    });
  });

  describe('Multi-environment deployment generation', () => {
    it('should generate multi-environment deployment workflow', async () => {
      const environments: EnvironmentConfig[] = [
        {
          name: 'staging',
          type: 'staging',
          approvalRequired: false,
          secrets: ['STAGING_API_KEY'],
          variables: { NODE_ENV: 'staging' },
          deploymentStrategy: 'rolling',
          rollbackEnabled: true
        },
        {
          name: 'production',
          type: 'production',
          approvalRequired: true,
          secrets: ['PROD_API_KEY'],
          variables: { NODE_ENV: 'production' },
          deploymentStrategy: 'blue-green',
          rollbackEnabled: true
        }
      ];

      const options: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'standard',
        includeComments: true,
        environments,
        securityLevel: 'standard'
      };

      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'express', confidence: 0.9, evidence: ['package.json'], category: 'backend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.9 }],
        projectMetadata: {
          name: 'multi-env-app',
          description: 'Multi-environment application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult, options);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-multi-env.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'multi-environment-deployment',
        expect.objectContaining({
          hasMultiEnvironment: true,
          environments: environments,
          requireApproval: true,
          enableRollback: true,
          deploymentStrategies: {
            staging: 'rolling',
            production: 'blue-green'
          }
        })
      );
    });

    it('should handle single environment as non-multi-environment', async () => {
      const environments: EnvironmentConfig[] = [
        {
          name: 'production',
          type: 'production',
          approvalRequired: false,
          secrets: ['API_KEY'],
          variables: { NODE_ENV: 'production' },
          deploymentStrategy: 'rolling',
          rollbackEnabled: false
        }
      ];

      const options: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'standard',
        includeComments: true,
        environments,
        securityLevel: 'basic'
      };

      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'flask', confidence: 0.9, evidence: ['app.py'], category: 'backend' }],
        packageManagers: [{ name: 'pip', lockFile: 'requirements.txt', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.9 }],
        projectMetadata: {
          name: 'flask-app',
          description: 'Flask application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult, options);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-docker.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'container-deployment',
        expect.objectContaining({
          hasMultiEnvironment: false,
          isContainerized: true
        })
      );
    });
  });

  describe('Framework inference', () => {
    it('should infer static site deployment for frontend frameworks', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [], // No explicit deployment targets
        projectMetadata: {
          name: 'react-app',
          description: 'React application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-static.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'static-site-deployment',
        expect.objectContaining({
          isStaticSite: true,
          platforms: ['static']
        })
      );
    });

    it('should infer container deployment for backend frameworks', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'express', confidence: 0.9, evidence: ['package.json'], category: 'backend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [], // No explicit deployment targets
        projectMetadata: {
          name: 'express-app',
          description: 'Express application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result).toBeDefined();
      expect(result.filename).toBe('cd-docker.yml');
      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'container-deployment',
        expect.objectContaining({
          isContainerized: true,
          platforms: ['docker']
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when no deployment platforms detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9, primary: true }],
        frameworks: [], // No frameworks
        packageManagers: [],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [], // No deployment targets
        projectMetadata: {
          name: 'unknown-app',
          description: 'Unknown application type'
        }
      };

      await expect(generator.generateWorkflow(detectionResult))
        .rejects
        .toThrow('No deployment platforms detected in detection results');
    });

    it('should throw error when template compilation fails', async () => {
      mockTemplateManager.compileTemplate = vi.fn().mockResolvedValue({
        template: {},
        errors: ['Template compilation failed'],
        warnings: []
      });

      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [{ platform: 'github-pages', type: 'static', confidence: 0.9 }],
        projectMetadata: {
          name: 'react-app',
          description: 'React application'
        }
      };

      await expect(generator.generateWorkflow(detectionResult))
        .rejects
        .toThrow('Template compilation failed: Template compilation failed');
    });
  });

  describe('Configuration handling', () => {
    it('should handle different security levels', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'express', confidence: 0.9, evidence: ['package.json'], category: 'backend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.9 }],
        projectMetadata: {
          name: 'secure-app',
          description: 'Secure application'
        }
      };

      const enterpriseOptions: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'aggressive',
        includeComments: true,
        securityLevel: 'enterprise'
      };

      const result = await generator.generateWorkflow(detectionResult, enterpriseOptions);

      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'container-deployment',
        expect.objectContaining({
          securityLevel: 'enterprise'
        })
      );
    });

    it('should handle different optimization levels', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [{ platform: 'github-pages', type: 'static', confidence: 0.9 }],
        projectMetadata: {
          name: 'optimized-app',
          description: 'Optimized application'
        }
      };

      const aggressiveOptions: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'aggressive',
        includeComments: false,
        securityLevel: 'standard'
      };

      const result = await generator.generateWorkflow(detectionResult, aggressiveOptions);

      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'github-pages-deployment',
        expect.objectContaining({
          optimizationLevel: 'aggressive',
          includeComments: false
        })
      );
    });
  });

  describe('Static site configuration', () => {
    it('should configure Next.js static export correctly', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'TypeScript', version: '5.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'nextjs', confidence: 0.9, evidence: ['next.config.js'], category: 'fullstack' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [{ platform: 'static', type: 'static', confidence: 0.8 }],
        projectMetadata: {
          name: 'nextjs-static',
          description: 'Next.js static site'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'static-site-deployment',
        expect.objectContaining({
          staticSiteConfig: expect.objectContaining({
            buildCommand: 'npm run build && npm run export',
            outputDirectory: 'out',
            nodeVersion: '5.0',
            environmentVariables: expect.objectContaining({
              NEXT_TELEMETRY_DISABLED: '1'
            })
          })
        })
      );
    });

    it('should configure Gatsby correctly', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'gatsby', confidence: 0.9, evidence: ['gatsby-config.js'], category: 'frontend' }],
        packageManagers: [{ name: 'yarn', lockFile: 'yarn.lock', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [{ platform: 'netlify', type: 'static', confidence: 0.9 }],
        projectMetadata: {
          name: 'gatsby-site',
          description: 'Gatsby site'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(mockTemplateManager.compileTemplate).toHaveBeenCalledWith(
        'netlify-deployment',
        expect.objectContaining({
          staticSiteConfig: expect.objectContaining({
            buildCommand: 'yarn build',
            outputDirectory: 'public',
            environmentVariables: expect.objectContaining({
              GATSBY_TELEMETRY_DISABLED: '1'
            })
          })
        })
      );
    });
  });
});