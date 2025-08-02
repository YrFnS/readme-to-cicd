import { describe, it, expect } from 'vitest';
import { CIStepGenerator } from '../../src/detection/templates/step-generator';
import { DetectionResult } from '../../src/detection/interfaces/detection-result';
import { FrameworkInfo, ContainerInfo } from '../../src/detection/interfaces/framework-info';
import { OverallConfidence } from '../../src/detection/interfaces/confidence';

describe('CI Step Generation Integration', () => {
  const generator = new CIStepGenerator();

  describe('Full Stack Application', () => {
    it('should generate comprehensive pipeline for React + Express + Docker project', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.9,
            evidence: [
              { type: 'dependency', source: 'package.json', value: 'react@18.0.0', weight: 0.9 }
            ],
            ecosystem: 'nodejs',
            version: '18.0.0',
            metadata: {
              nodeVersion: '18',
              packageManager: 'npm',
              scripts: {
                build: 'react-scripts build',
                test: 'react-scripts test',
                lint: 'eslint src/'
              }
            }
          } as FrameworkInfo,
          {
            name: 'Express',
            type: 'backend_framework',
            confidence: 0.8,
            evidence: [
              { type: 'dependency', source: 'package.json', value: 'express@4.18.0', weight: 0.9 }
            ],
            ecosystem: 'nodejs',
            version: '4.18.0',
            metadata: {
              nodeVersion: '18',
              packageManager: 'npm'
            }
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [
          {
            type: 'docker',
            configFiles: ['Dockerfile'],
            baseImages: ['node:18-alpine'],
            ports: [3000, 3001]
          } as ContainerInfo
        ],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 150
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      // Verify pipeline structure
      expect(pipeline.setup.length).toBeGreaterThan(0);
      expect(pipeline.build.length).toBeGreaterThan(0);
      expect(pipeline.test.length).toBeGreaterThan(0);
      expect(pipeline.security.length).toBeGreaterThan(0);
      expect(pipeline.deploy.length).toBeGreaterThan(0);
      expect(pipeline.cache.length).toBeGreaterThan(0);

      // Verify Node.js setup (should be deduplicated)
      const nodeSetupSteps = pipeline.setup.filter(step => step.id === 'setup-node');
      expect(nodeSetupSteps).toHaveLength(1);
      expect(nodeSetupSteps[0].uses).toBe('actions/setup-node@v4');

      // Verify Docker steps
      const dockerBuildSteps = pipeline.build.filter(step => step.id.includes('docker'));
      expect(dockerBuildSteps.length).toBeGreaterThan(0);

      // Verify security scanning
      expect(pipeline.security.some(step => step.id === 'dependency-scan')).toBe(true);
      expect(pipeline.security.some(step => step.id === 'npm-audit')).toBe(true);
      expect(pipeline.security.some(step => step.id === 'container-scan')).toBe(true);

      // Verify caching
      expect(pipeline.cache.some(cache => cache.id === 'node-modules')).toBe(true);

      // Verify metadata
      expect(pipeline.metadata.secrets).toContain('DOCKER_USERNAME');
      expect(pipeline.metadata.secrets).toContain('DOCKER_PASSWORD');
      expect(pipeline.metadata.variables.NODE_ENV).toBe('test');
    });
  });

  describe('Multi-Language Project', () => {
    it('should generate pipeline for Python Django + Rust microservice project', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Django',
            type: 'web_framework',
            confidence: 0.9,
            evidence: [
              { type: 'dependency', source: 'requirements.txt', value: 'Django==4.2.0', weight: 0.9 }
            ],
            ecosystem: 'python',
            version: '4.2.0',
            metadata: {
              pythonVersion: '3.9',
              settingsModule: 'myproject.settings'
            }
          } as FrameworkInfo,
          {
            name: 'Rust',
            type: 'backend_framework',
            confidence: 0.8,
            evidence: [
              { type: 'config_file', source: 'Cargo.toml', value: 'Cargo.toml', weight: 0.9 }
            ],
            ecosystem: 'rust',
            version: '1.70.0',
            metadata: {
              rustVersion: 'stable'
            }
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 200
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      // Verify both Python and Rust setup steps
      const pythonSetupSteps = pipeline.setup.filter(step => step.uses?.includes('setup-python'));
      const rustSetupSteps = pipeline.setup.filter(step => step.uses?.includes('actions-rs/toolchain'));
      
      expect(pythonSetupSteps).toHaveLength(1);
      expect(rustSetupSteps).toHaveLength(1);

      // Verify Django-specific steps
      const djangoSteps = pipeline.build.filter(step => 
        step.command?.includes('collectstatic') || step.command?.includes('migrate')
      );
      expect(djangoSteps.length).toBeGreaterThan(0);

      // Verify Rust-specific steps
      const cargoSteps = pipeline.build.filter(step => step.command?.includes('cargo'));
      expect(cargoSteps.length).toBeGreaterThan(0);

      // Verify security steps for both ecosystems
      expect(pipeline.security.some(step => step.id === 'safety-check')).toBe(true);
      expect(pipeline.security.some(step => step.id === 'cargo-audit')).toBe(true);

      // Verify caching for both ecosystems
      expect(pipeline.cache.some(cache => cache.id === 'pip-cache')).toBe(true);
      expect(pipeline.cache.some(cache => cache.id === 'cargo-cache')).toBe(true);

      // Verify secrets
      expect(pipeline.metadata.secrets).toContain('DJANGO_SECRET_KEY');

      // Verify environment variables
      expect(pipeline.metadata.variables.PYTHONPATH).toBe('.');
      expect(pipeline.metadata.variables.CARGO_TERM_COLOR).toBe('always');
    });
  });

  describe('Java Enterprise Project', () => {
    it('should generate pipeline for Spring Boot with Maven', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Spring Boot',
            type: 'web_framework',
            confidence: 0.9,
            evidence: [
              { type: 'dependency', source: 'pom.xml', value: 'spring-boot-starter', weight: 0.9 }
            ],
            ecosystem: 'java',
            buildTool: 'maven',
            version: '3.1.0',
            metadata: {
              javaVersion: '17'
            }
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 120
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      // Verify Java setup
      const javaSetupSteps = pipeline.setup.filter(step => step.uses?.includes('setup-java'));
      expect(javaSetupSteps).toHaveLength(1);
      expect(javaSetupSteps[0].with?.['java-version']).toBe('17');

      // Verify Maven steps
      const mavenSteps = pipeline.build.filter(step => step.command?.includes('mvn'));
      expect(mavenSteps.length).toBeGreaterThan(0);

      // Verify Maven caching
      expect(pipeline.cache.some(cache => cache.id === 'maven-cache')).toBe(true);
      expect(pipeline.cache[0].paths).toContain('~/.m2/repository');
    });
  });

  describe('Error Handling', () => {
    it('should handle projects with no recognized frameworks gracefully', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'UnknownFramework',
            type: 'web_framework',
            confidence: 0.5,
            evidence: [],
            ecosystem: 'unknown'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 80
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      // Should still generate basic security steps
      expect(pipeline.security.length).toBeGreaterThan(0);
      expect(pipeline.security.some(step => step.id === 'dependency-scan')).toBe(true);
      expect(pipeline.security.some(step => step.id === 'codeql-analysis')).toBe(true);

      // Should have valid metadata
      expect(pipeline.metadata.name).toBe('Generated CI Pipeline');
      expect(pipeline.metadata.triggers).toHaveLength(2);
    });

    it('should handle empty detection results', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 50
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      // Should have minimal but valid pipeline
      expect(pipeline.setup).toHaveLength(0);
      expect(pipeline.build).toHaveLength(0);
      expect(pipeline.test).toHaveLength(0);
      expect(pipeline.security.length).toBeGreaterThanOrEqual(0); // May have basic security steps
      expect(pipeline.deploy).toHaveLength(0);
      expect(pipeline.cache).toHaveLength(0);

      // Should have valid metadata
      expect(pipeline.metadata).toBeDefined();
      expect(pipeline.metadata.name).toBe('Generated CI Pipeline');
    });
  });

  describe('Performance and Optimization', () => {
    it('should generate pipeline efficiently for large projects', async () => {
      // Create a large detection result with many frameworks
      const frameworks: FrameworkInfo[] = [];
      for (let i = 0; i < 10; i++) {
        frameworks.push({
          name: `Framework${i}`,
          type: 'web_framework',
          confidence: 0.8,
          evidence: [],
          ecosystem: i % 2 === 0 ? 'nodejs' : 'python'
        } as FrameworkInfo);
      }

      const detectionResult: DetectionResult = {
        frameworks,
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 300
      };

      const startTime = Date.now();
      const pipeline = await generator.generatePipeline(detectionResult);
      const endTime = Date.now();

      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should properly deduplicate steps
      const setupSteps = pipeline.setup.filter(step => step.id === 'setup-node');
      expect(setupSteps).toHaveLength(1); // Should be deduplicated

      const pythonSetupSteps = pipeline.setup.filter(step => step.uses?.includes('setup-python'));
      expect(pythonSetupSteps).toHaveLength(1); // Should be deduplicated
    });
  });
});