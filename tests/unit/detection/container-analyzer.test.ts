import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContainerAnalyzer } from '../../../src/detection/analyzers/container';
import { ProjectInfo } from '../../../src/detection/interfaces/language-analyzer';
import { FileSystemScanner } from '../../../src/detection/utils/file-scanner';

// Mock the FileSystemScanner
vi.mock('../../../src/detection/utils/file-scanner');

describe('ContainerAnalyzer', () => {
  let analyzer: ContainerAnalyzer;
  let mockFileScanner: vi.Mocked<FileSystemScanner>;

  beforeEach(() => {
    analyzer = new ContainerAnalyzer();
    mockFileScanner = vi.mocked(FileSystemScanner.prototype);
  });

  describe('canAnalyze', () => {
    it('should return true when Dockerfile is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'docker-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Dockerfile'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when docker-compose.yml is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'compose-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['docker-compose.yml'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when docker-compose.yaml is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'compose-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['docker-compose.yaml'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when Chart.yaml is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'helm-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Chart.yaml'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when values.yaml is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'helm-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['values.yaml'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when docker commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'docker-project',
        languages: [],
        dependencies: [],
        buildCommands: ['docker build -t myapp .'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when kubectl commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'k8s-project',
        languages: [],
        dependencies: [],
        buildCommands: ['kubectl apply -f deployment.yaml'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when helm commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'helm-project',
        languages: [],
        dependencies: [],
        buildCommands: ['helm install myapp .'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when docker-compose commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'compose-project',
        languages: [],
        dependencies: [],
        buildCommands: ['docker-compose up -d'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return false for non-container projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'regular-project',
        languages: ['Python'],
        dependencies: ['flask'],
        buildCommands: ['python setup.py build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['setup.py'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(false);
    });
  });

  describe('analyze', () => {
    describe('Docker detection', () => {
      it('should detect Docker from Dockerfile', async () => {
        const projectInfo: ProjectInfo = {
          name: 'docker-app',
          languages: ['JavaScript'],
          dependencies: [],
          buildCommands: ['docker build -t myapp .'],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Dockerfile'],
          rawContent: 'A containerized application'
        };

        const mockDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;

        mockFileScanner.readConfigFile.mockResolvedValue(mockDockerfile);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
        const dockerFramework = result.frameworks.find(f => f.name === 'Docker');
        expect(dockerFramework).toBeDefined();
        expect(dockerFramework?.name).toBe('Docker');
        expect(dockerFramework?.type).toBe('build_tool');
        expect(dockerFramework?.confidence).toBeGreaterThan(0.7);
        expect(dockerFramework?.metadata?.containerType).toBe('docker');
        expect(dockerFramework?.metadata?.baseImage).toBe('node:18-alpine');
        expect(dockerFramework?.metadata?.exposedPorts).toEqual([3000]);
      });

      it('should detect multi-stage Docker builds', async () => {
        const projectInfo: ProjectInfo = {
          name: 'multistage-app',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Dockerfile'],
          rawContent: ''
        };

        const mockDockerfile = `FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80`;

        mockFileScanner.readConfigFile.mockResolvedValue(mockDockerfile);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        const dockerFramework = result.frameworks.find(f => f.name === 'Docker');
        expect(dockerFramework?.metadata?.isMultiStage).toBe(true);
        expect(dockerFramework?.metadata?.baseImage).toBe('node:18');
        expect(dockerFramework?.metadata?.exposedPorts).toEqual([80]);
      });

      it('should handle Dockerfile parsing errors gracefully', async () => {
        const projectInfo: ProjectInfo = {
          name: 'broken-docker',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Dockerfile'],
          rawContent: ''
        };

        mockFileScanner.readConfigFile.mockRejectedValue(new Error('File not found'));

        const result = await analyzer.analyze(projectInfo, '/test/path');

        const dockerFramework = result.frameworks.find(f => f.name === 'Docker');
        expect(dockerFramework).toBeDefined();
        expect(dockerFramework?.confidence).toBeLessThan(0.7);
      });
    });

    describe('Docker Compose detection', () => {
      it('should detect Docker Compose from docker-compose.yml', async () => {
        const projectInfo: ProjectInfo = {
          name: 'compose-app',
          languages: [],
          dependencies: [],
          buildCommands: ['docker-compose up -d'],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['docker-compose.yml'],
          rawContent: 'A multi-container application'
        };

        const mockComposeFile = {
          version: '3.8',
          services: {
            web: {
              build: '.',
              ports: ['3000:3000']
            },
            db: {
              image: 'postgres:13',
              environment: {
                POSTGRES_DB: 'myapp'
              }
            }
          },
          networks: {
            app_network: {}
          },
          volumes: {
            db_data: {}
          }
        };

        mockFileScanner.readConfigFile.mockResolvedValue(mockComposeFile);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
        const composeFramework = result.frameworks.find(f => f.name === 'Docker Compose');
        expect(composeFramework).toBeDefined();
        expect(composeFramework?.name).toBe('Docker Compose');
        expect(composeFramework?.type).toBe('build_tool');
        expect(composeFramework?.confidence).toBeGreaterThan(0.7);
        expect(composeFramework?.metadata?.containerType).toBe('compose');
        expect(composeFramework?.metadata?.services).toEqual(['web', 'db']);
        expect(composeFramework?.metadata?.networks).toEqual(['app_network']);
        expect(composeFramework?.metadata?.volumes).toEqual(['db_data']);
      });

      it('should detect Docker Compose from docker-compose.yaml', async () => {
        const projectInfo: ProjectInfo = {
          name: 'compose-app',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['docker-compose.yaml'],
          rawContent: ''
        };

        const mockComposeFile = {
          version: '3.8',
          services: {
            app: {
              build: '.'
            }
          }
        };

        mockFileScanner.readConfigFile.mockResolvedValue(mockComposeFile);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        const composeFramework = result.frameworks.find(f => f.name === 'Docker Compose');
        expect(composeFramework).toBeDefined();
        expect(composeFramework?.metadata?.services).toEqual(['app']);
      });

      it('should handle docker-compose.yml parsing errors', async () => {
        const projectInfo: ProjectInfo = {
          name: 'broken-compose',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['docker-compose.yml'],
          rawContent: ''
        };

        mockFileScanner.readConfigFile.mockRejectedValue(new Error('Invalid YAML'));

        const result = await analyzer.analyze(projectInfo, '/test/path');

        const composeFramework = result.frameworks.find(f => f.name === 'Docker Compose');
        expect(composeFramework).toBeDefined();
        expect(composeFramework?.confidence).toBeLessThan(0.7);
      });
    });

    describe('Kubernetes detection', () => {
      it('should detect Kubernetes from manifest files', async () => {
        const projectInfo: ProjectInfo = {
          name: 'k8s-app',
          languages: [],
          dependencies: [],
          buildCommands: ['kubectl apply -f k8s/'],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['deployment.yaml', 'service.yaml'],
          rawContent: 'A Kubernetes application'
        };

        const mockDeployment = {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: 'myapp',
            namespace: 'production'
          }
        };

        const mockService = {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            name: 'myapp-service',
            namespace: 'production'
          }
        };

        mockFileScanner.readConfigFile
          .mockResolvedValueOnce(mockDeployment)
          .mockResolvedValueOnce(mockService);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
        const k8sFramework = result.frameworks.find(f => f.name === 'Kubernetes');
        expect(k8sFramework).toBeDefined();
        expect(k8sFramework?.name).toBe('Kubernetes');
        expect(k8sFramework?.type).toBe('build_tool');
        expect(k8sFramework?.confidence).toBeGreaterThan(0.6);
        expect(k8sFramework?.metadata?.containerType).toBe('kubernetes');
        expect(k8sFramework?.metadata?.resources).toEqual(['Deployment', 'Service']);
        expect(k8sFramework?.metadata?.namespaces).toEqual(['production']);
      });

      it('should detect Kubernetes from kubectl commands only', async () => {
        const projectInfo: ProjectInfo = {
          name: 'k8s-project',
          languages: [],
          dependencies: [],
          buildCommands: ['kubectl apply -f .'],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: [],
          rawContent: ''
        };

        const result = await analyzer.analyze(projectInfo, '/test/path');

        const k8sFramework = result.frameworks.find(f => f.name === 'Kubernetes');
        expect(k8sFramework).toBeDefined();
        expect(k8sFramework?.confidence).toBeGreaterThan(0.5);
      });

      it('should detect Kubernetes directory structure', async () => {
        const projectInfo: ProjectInfo = {
          name: 'k8s-project',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['k8s/deployment.yaml', 'kubernetes/service.yaml'],
          rawContent: ''
        };

        const result = await analyzer.analyze(projectInfo, '/test/path');

        const k8sFramework = result.frameworks.find(f => f.name === 'Kubernetes');
        expect(k8sFramework).toBeDefined();
      });
    });

    describe('Helm detection', () => {
      it('should detect Helm from Chart.yaml and values.yaml', async () => {
        const projectInfo: ProjectInfo = {
          name: 'helm-chart',
          languages: [],
          dependencies: [],
          buildCommands: ['helm install myapp .'],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Chart.yaml', 'values.yaml'],
          rawContent: 'A Helm chart'
        };

        const mockChart = {
          apiVersion: 'v2',
          name: 'myapp',
          version: '1.0.0',
          description: 'My application Helm chart'
        };

        mockFileScanner.readConfigFile.mockResolvedValue(mockChart);
        mockFileScanner.fileExists.mockResolvedValue(true);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
        const helmFramework = result.frameworks.find(f => f.name === 'Helm');
        expect(helmFramework).toBeDefined();
        expect(helmFramework?.name).toBe('Helm');
        expect(helmFramework?.type).toBe('build_tool');
        expect(helmFramework?.confidence).toBeGreaterThan(0.8);
        expect(helmFramework?.metadata?.containerType).toBe('helm');
        expect(helmFramework?.metadata?.chartName).toBe('myapp');
        expect(helmFramework?.metadata?.chartVersion).toBe('1.0.0');
        expect(helmFramework?.metadata?.hasValues).toBe(true);

        expect(result.buildTools.length).toBeGreaterThanOrEqual(1);
        const helmBuildTool = result.buildTools.find(bt => bt.name === 'Helm');
        expect(helmBuildTool).toBeDefined();
        expect(helmBuildTool?.configFile).toBe('Chart.yaml');
      });

      it('should detect Helm from Chart.yaml only', async () => {
        const projectInfo: ProjectInfo = {
          name: 'helm-chart',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Chart.yaml'],
          rawContent: ''
        };

        const mockChart = {
          apiVersion: 'v2',
          name: 'simple-chart',
          version: '0.1.0'
        };

        mockFileScanner.readConfigFile.mockResolvedValue(mockChart);
        mockFileScanner.fileExists.mockResolvedValue(false);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        const helmFramework = result.frameworks.find(f => f.name === 'Helm');
        expect(helmFramework).toBeDefined();
        expect(helmFramework?.metadata?.hasValues).toBe(false);
      });

      it('should handle Chart.yaml parsing errors', async () => {
        const projectInfo: ProjectInfo = {
          name: 'broken-helm',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Chart.yaml'],
          rawContent: ''
        };

        mockFileScanner.readConfigFile.mockRejectedValue(new Error('Invalid YAML'));

        const result = await analyzer.analyze(projectInfo, '/test/path');

        const helmFramework = result.frameworks.find(f => f.name === 'Helm');
        expect(helmFramework).toBeDefined();
        expect(helmFramework?.confidence).toBeLessThan(0.7);
      });
    });

    describe('Multiple container technologies', () => {
      it('should detect multiple container technologies in one project', async () => {
        const projectInfo: ProjectInfo = {
          name: 'full-container-project',
          languages: [],
          dependencies: [],
          buildCommands: ['docker build .', 'helm install myapp .'],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Dockerfile', 'docker-compose.yml', 'Chart.yaml', 'values.yaml'],
          rawContent: 'A project with Docker, Compose, and Helm'
        };

        const mockDockerfile = 'FROM node:18\nEXPOSE 3000';
        const mockCompose = { version: '3.8', services: { app: { build: '.' } } };
        const mockChart = { name: 'myapp', version: '1.0.0' };

        mockFileScanner.readConfigFile
          .mockResolvedValueOnce(mockDockerfile)
          .mockResolvedValueOnce(mockCompose)
          .mockResolvedValueOnce(mockChart);
        mockFileScanner.fileExists.mockResolvedValue(true);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.frameworks.length).toBeGreaterThanOrEqual(3);
        const frameworkNames = result.frameworks.map(f => f.name);
        expect(frameworkNames).toContain('Docker');
        expect(frameworkNames).toContain('Docker Compose');
        expect(frameworkNames).toContain('Helm');
      });
    });

    describe('Error handling', () => {
      it('should handle file system errors gracefully', async () => {
        const projectInfo: ProjectInfo = {
          name: 'error-project',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Dockerfile'],
          rawContent: ''
        };

        // Mock the file scanner to throw an error when trying to read the Dockerfile
        mockFileScanner.readConfigFile.mockRejectedValue(new Error('Permission denied'));

        const result = await analyzer.analyze(projectInfo, '/test/path');

        // Should still detect Docker framework but with lower confidence due to parsing error
        expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
        const dockerFramework = result.frameworks.find(f => f.name === 'Docker');
        expect(dockerFramework).toBeDefined();
        
        // Should have evidence that Dockerfile was found but couldn't be parsed
        const parseErrorEvidence = dockerFramework?.evidence.find(e => 
          e.value.includes('could not be parsed')
        );
        expect(parseErrorEvidence).toBeDefined();
      });

      it('should return low confidence when no container technologies detected', async () => {
        const projectInfo: ProjectInfo = {
          name: 'no-container-project',
          languages: ['Python'],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: [],
          rawContent: ''
        };

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.frameworks).toHaveLength(0);
        expect(result.confidence).toBe(0.1);
      });
    });

    describe('Recommendations', () => {
      it('should provide recommendations for Docker-only projects', async () => {
        const projectInfo: ProjectInfo = {
          name: 'docker-only',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['Dockerfile'],
          rawContent: ''
        };

        const mockDockerfile = 'FROM node:18\nEXPOSE 3000';
        mockFileScanner.readConfigFile.mockResolvedValue(mockDockerfile);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.recommendations).toContain('Consider using Docker Compose for multi-container development environments');
        expect(result.recommendations).toContain('Add .dockerignore file to optimize build context');
        expect(result.recommendations).toContain('Use multi-stage builds to reduce image size');
        expect(result.recommendations).toContain('Consider using specific image tags instead of latest');
      });

      it('should provide recommendations for Compose and Kubernetes projects', async () => {
        const projectInfo: ProjectInfo = {
          name: 'compose-k8s',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['docker-compose.yml', 'deployment.yaml'],
          rawContent: ''
        };

        const mockCompose = { version: '3.8', services: { app: { build: '.' } } };
        const mockDeployment = { kind: 'Deployment', metadata: { name: 'app' } };

        mockFileScanner.readConfigFile
          .mockResolvedValueOnce(mockCompose)
          .mockResolvedValueOnce(mockDeployment);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.recommendations).toContain('Consider using Docker Compose for development and Kubernetes for production');
      });

      it('should recommend Helm for Kubernetes projects', async () => {
        const projectInfo: ProjectInfo = {
          name: 'k8s-only',
          languages: [],
          dependencies: [],
          buildCommands: [],
          testCommands: [],
          installationSteps: [],
          usageExamples: [],
          configFiles: ['deployment.yaml'],
          rawContent: ''
        };

        const mockDeployment = { kind: 'Deployment', metadata: { name: 'app' } };
        mockFileScanner.readConfigFile.mockResolvedValue(mockDeployment);

        const result = await analyzer.analyze(projectInfo, '/test/path');

        expect(result.recommendations).toContain('Consider using Helm for easier Kubernetes application management');
      });
    });
  });

  describe('generateCISteps', () => {
    it('should return empty array (placeholder for task 11)', () => {
      const frameworks = [
        {
          name: 'Docker',
          type: 'build_tool' as const,
          confidence: 0.9,
          evidence: [],
          ecosystem: 'container'
        }
      ];

      const result = analyzer.generateCISteps(frameworks);

      expect(result).toEqual([]);
    });
  });
});