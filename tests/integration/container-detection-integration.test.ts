import { describe, it, expect, beforeEach } from 'vitest';
import { DetectionEngine } from '../../src/detection/detection-engine';
import { ContainerAnalyzer } from '../../src/detection/analyzers/container';
import { ProjectInfo } from '../../src/detection/interfaces/language-analyzer';

describe('Container Detection Integration', () => {
  let detectionEngine: DetectionEngine;

  beforeEach(() => {
    detectionEngine = new DetectionEngine();
    detectionEngine.registerAnalyzer(new ContainerAnalyzer());
  });

  describe('Docker project detection', () => {
    it('should detect Docker in a containerized Node.js project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'containerized-app',
        description: 'A containerized Node.js application',
        languages: ['JavaScript'],
        dependencies: ['express'],
        buildCommands: ['docker build -t myapp .', 'npm run build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install', 'docker build -t myapp .'],
        usageExamples: ['docker run -p 3000:3000 myapp'],
        configFiles: ['Dockerfile', 'package.json'],
        rawContent: 'A Node.js application with Docker containerization'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks.length).toBeGreaterThan(0);
      
      const dockerFramework = result.frameworks.find(f => f.name === 'Docker');
      expect(dockerFramework).toBeDefined();
      expect(dockerFramework?.ecosystem).toBe('container');
      expect(dockerFramework?.type).toBe('build_tool');
      expect(dockerFramework?.confidence).toBeGreaterThan(0.7);
    });

    it('should detect Docker Compose in a multi-service project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'microservices-app',
        description: 'A microservices application with Docker Compose',
        languages: ['JavaScript', 'Python'],
        dependencies: ['express', 'flask'],
        buildCommands: ['docker-compose build', 'docker-compose up -d'],
        testCommands: ['docker-compose run --rm test'],
        installationSteps: ['docker-compose up -d'],
        usageExamples: ['docker-compose up', 'docker-compose down'],
        configFiles: ['docker-compose.yml', 'Dockerfile'],
        rawContent: 'A multi-service application using Docker Compose for orchestration'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks.length).toBeGreaterThan(0);
      
      const composeFramework = result.frameworks.find(f => f.name === 'Docker Compose');
      expect(composeFramework).toBeDefined();
      expect(composeFramework?.ecosystem).toBe('container');
      expect(composeFramework?.confidence).toBeGreaterThan(0.7);

      const dockerFramework = result.frameworks.find(f => f.name === 'Docker');
      expect(dockerFramework).toBeDefined();
    });
  });

  describe('Kubernetes project detection', () => {
    it('should detect Kubernetes in a cloud-native project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'k8s-app',
        description: 'A Kubernetes-native application',
        languages: ['Go'],
        dependencies: ['gin-gonic/gin'],
        buildCommands: ['go build', 'kubectl apply -f k8s/'],
        testCommands: ['go test'],
        installationSteps: ['kubectl apply -f deployment.yaml'],
        usageExamples: ['kubectl get pods', 'kubectl logs -f deployment/myapp'],
        configFiles: ['deployment.yaml', 'service.yaml', 'go.mod'],
        rawContent: 'A Go application deployed on Kubernetes'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks.length).toBeGreaterThan(0);
      
      const k8sFramework = result.frameworks.find(f => f.name === 'Kubernetes');
      expect(k8sFramework).toBeDefined();
      expect(k8sFramework?.ecosystem).toBe('container');
      expect(k8sFramework?.type).toBe('build_tool');
      expect(k8sFramework?.confidence).toBeGreaterThan(0.6);
    });

    it('should detect Helm in a Kubernetes project with charts', async () => {
      const projectInfo: ProjectInfo = {
        name: 'helm-chart',
        description: 'A Helm chart for Kubernetes deployment',
        languages: [],
        dependencies: [],
        buildCommands: ['helm package .', 'helm install myapp .'],
        testCommands: ['helm test myapp'],
        installationSteps: ['helm install myapp .'],
        usageExamples: ['helm upgrade myapp .', 'helm uninstall myapp'],
        configFiles: ['Chart.yaml', 'values.yaml'],
        rawContent: 'A Helm chart for deploying applications to Kubernetes'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks.length).toBeGreaterThan(0);
      
      const helmFramework = result.frameworks.find(f => f.name === 'Helm');
      expect(helmFramework).toBeDefined();
      expect(helmFramework?.ecosystem).toBe('container');
      expect(helmFramework?.type).toBe('build_tool');
      expect(helmFramework?.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Complex container scenarios', () => {
    it('should detect multiple container technologies in a full-stack project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'full-stack-containerized',
        description: 'A full-stack application with Docker, Compose, and Kubernetes',
        languages: ['TypeScript', 'Python'],
        dependencies: ['react', 'fastapi'],
        buildCommands: [
          'docker build -t frontend .',
          'docker-compose build',
          'helm package .',
          'kubectl apply -f k8s/'
        ],
        testCommands: ['docker-compose run --rm test'],
        installationSteps: ['docker-compose up -d'],
        usageExamples: [
          'docker-compose up',
          'helm install myapp .',
          'kubectl get pods'
        ],
        configFiles: [
          'Dockerfile',
          'docker-compose.yml',
          'Chart.yaml',
          'values.yaml',
          'deployment.yaml',
          'service.yaml'
        ],
        rawContent: 'A comprehensive containerized application with multiple deployment options'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks.length).toBeGreaterThanOrEqual(4);
      
      const frameworkNames = result.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Docker');
      expect(frameworkNames).toContain('Docker Compose');
      expect(frameworkNames).toContain('Kubernetes');
      expect(frameworkNames).toContain('Helm');

      // All container frameworks should have the container ecosystem
      const containerFrameworks = result.frameworks.filter(f => f.ecosystem === 'container');
      expect(containerFrameworks.length).toBeGreaterThanOrEqual(4);
    });

    it('should detect Docker framework with appropriate confidence', async () => {
      const projectInfo: ProjectInfo = {
        name: 'docker-only-project',
        description: 'A simple Docker project',
        languages: ['Python'],
        dependencies: ['flask'],
        buildCommands: ['docker build -t myapp .'],
        testCommands: [],
        installationSteps: ['docker build -t myapp .'],
        usageExamples: ['docker run -p 5000:5000 myapp'],
        configFiles: ['Dockerfile'],
        rawContent: 'A simple Flask application with Docker'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks.length).toBeGreaterThan(0);
      
      const dockerFramework = result.frameworks.find(f => f.name === 'Docker');
      expect(dockerFramework).toBeDefined();
      expect(dockerFramework?.confidence).toBeGreaterThan(0.7);
      
      // Should have evidence for Dockerfile and docker build command
      expect(dockerFramework?.evidence.length).toBeGreaterThan(1);
      
      const configEvidence = dockerFramework?.evidence.find(e => 
        e.type === 'config_file' && e.source === 'Dockerfile'
      );
      expect(configEvidence).toBeDefined();
      
      const commandEvidence = dockerFramework?.evidence.find(e => 
        e.type === 'command_pattern' && e.value === 'docker build'
      );
      expect(commandEvidence).toBeDefined();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle projects with container mentions but no actual container files', async () => {
      const projectInfo: ProjectInfo = {
        name: 'false-positive-project',
        description: 'A project that mentions Docker but does not use it',
        languages: ['JavaScript'],
        dependencies: ['express'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json'],
        rawContent: 'This project mentions Docker in the documentation but does not actually use containers'
      };

      const result = await detectionEngine.analyze(projectInfo);

      // Should not detect container frameworks based on text mentions alone
      const containerFrameworks = result.frameworks.filter(f => f.ecosystem === 'container');
      expect(containerFrameworks.length).toBe(0);
    });

    it('should handle projects with minimal container evidence', async () => {
      const projectInfo: ProjectInfo = {
        name: 'minimal-container-project',
        description: 'A project with minimal container evidence',
        languages: [],
        dependencies: [],
        buildCommands: ['docker build .'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'Minimal project with just a docker command'
      };

      const result = await detectionEngine.analyze(projectInfo);

      const dockerFramework = result.frameworks.find(f => f.name === 'Docker');
      expect(dockerFramework).toBeDefined();
      expect(dockerFramework?.confidence).toBeGreaterThan(0.5);
      expect(dockerFramework?.confidence).toBeLessThan(0.9); // Lower confidence due to minimal evidence
    });
  });
});