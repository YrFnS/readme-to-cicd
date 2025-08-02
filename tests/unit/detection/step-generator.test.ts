import { describe, it, expect, beforeEach } from 'vitest';
import { CIStepGenerator } from '../../../src/detection/templates/step-generator';
import { DetectionResult } from '../../../src/detection/interfaces/detection-result';
import { FrameworkInfo, ContainerInfo } from '../../../src/detection/interfaces/framework-info';
import { OverallConfidence } from '../../../src/detection/interfaces/confidence';

describe('CIStepGenerator', () => {
  let generator: CIStepGenerator;

  beforeEach(() => {
    generator = new CIStepGenerator();
  });

  describe('Pipeline Generation', () => {
    it('should generate complete pipeline for Node.js project', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs',
            version: '18.0.0',
            metadata: {
              nodeVersion: '18',
              packageManager: 'npm'
            }
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 100
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.setup).toHaveLength(1);
      expect(pipeline.build).toHaveLength(2);
      expect(pipeline.test).toHaveLength(2);
      expect(pipeline.security.length).toBeGreaterThan(0);
      expect(pipeline.cache).toHaveLength(1);
      expect(pipeline.metadata.name).toBe('Generated CI Pipeline');
    });

    it('should generate pipeline for Python Django project', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Django',
            type: 'web_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'python',
            version: '4.2.0',
            metadata: {
              pythonVersion: '3.9'
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

      expect(pipeline.setup).toHaveLength(1);
      expect(pipeline.build).toHaveLength(3); // install, collect static, migrate
      expect(pipeline.test).toHaveLength(2);
      expect(pipeline.security.length).toBeGreaterThan(0);
      expect(pipeline.cache).toHaveLength(1);
      expect(pipeline.metadata.secrets).toContain('DJANGO_SECRET_KEY');
    });

    it('should generate pipeline for Rust project', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Rust',
            type: 'backend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'rust',
            version: '1.70.0'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 140
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.setup).toHaveLength(1);
      expect(pipeline.build).toHaveLength(2);
      expect(pipeline.test).toHaveLength(3); // test, clippy, fmt
      expect(pipeline.security.length).toBeGreaterThan(0);
      expect(pipeline.cache).toHaveLength(1);
    });

    it('should generate pipeline with container steps', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Express',
            type: 'backend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [
          {
            type: 'docker',
            configFiles: ['Dockerfile'],
            baseImages: ['node:18-alpine'],
            ports: [3000]
          } as ContainerInfo
        ],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 110
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.build.some(step => step.id.includes('docker'))).toBe(true);
      expect(pipeline.deploy.some(step => step.id.includes('docker'))).toBe(true);
      expect(pipeline.security.some(step => step.id === 'container-scan')).toBe(true);
      expect(pipeline.metadata.secrets).toContain('DOCKER_USERNAME');
    });

    it('should handle multiple frameworks', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo,
          {
            name: 'Express',
            type: 'backend_framework',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 130
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      // Should have steps from both frameworks but deduplicated
      expect(pipeline.setup.length).toBeGreaterThan(0);
      expect(pipeline.build.length).toBeGreaterThan(0);
      expect(pipeline.test.length).toBeGreaterThan(0);
      
      // Should not have duplicate setup steps
      const setupNodeSteps = pipeline.setup.filter(step => step.id === 'setup-node');
      expect(setupNodeSteps).toHaveLength(1);
    });
  });

  describe('Caching Strategies', () => {
    it('should generate Node.js caching strategy', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 90
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.cache).toHaveLength(1);
      expect(pipeline.cache[0].id).toBe('node-modules');
      expect(pipeline.cache[0].paths).toContain('node_modules');
      expect(pipeline.cache[0].key).toContain('node-');
    });

    it('should generate Python caching strategy', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Django',
            type: 'web_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'python'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 95
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.cache).toHaveLength(1);
      expect(pipeline.cache[0].id).toBe('pip-cache');
      expect(pipeline.cache[0].paths).toContain('~/.cache/pip');
      expect(pipeline.cache[0].key).toContain('pip-');
    });

    it('should generate Rust caching strategy', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Rust',
            type: 'backend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'rust'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 105
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.cache).toHaveLength(1);
      expect(pipeline.cache[0].id).toBe('cargo-cache');
      expect(pipeline.cache[0].paths).toContain('target');
      expect(pipeline.cache[0].key).toContain('cargo-');
    });

    it('should generate Maven caching strategy', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Spring Boot',
            type: 'web_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'java',
            buildTool: 'maven'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 115
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.cache).toHaveLength(1);
      expect(pipeline.cache[0].id).toBe('maven-cache');
      expect(pipeline.cache[0].paths).toContain('~/.m2/repository');
      expect(pipeline.cache[0].key).toContain('maven-');
    });
  });

  describe('Security Steps', () => {
    it('should generate dependency scanning for all frameworks', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 85
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.security.some(step => step.id === 'dependency-scan')).toBe(true);
      expect(pipeline.security.some(step => step.id === 'codeql-analysis')).toBe(true);
    });

    it('should generate Node.js specific security steps', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Express',
            type: 'backend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 88
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.security.some(step => step.id === 'npm-audit')).toBe(true);
    });

    it('should generate Python specific security steps', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Flask',
            type: 'web_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'python'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 92
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.security.some(step => step.id === 'safety-check')).toBe(true);
    });

    it('should generate container security scanning', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [],
        buildTools: [],
        containers: [
          {
            type: 'docker',
            configFiles: ['Dockerfile']
          } as ContainerInfo
        ],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 75
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.security.some(step => step.id === 'container-scan')).toBe(true);
    });
  });

  describe('Environment Variables', () => {
    it('should generate Node.js environment variables', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Express',
            type: 'backend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 82
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.metadata.variables.NODE_ENV).toBe('test');
    });

    it('should generate Python environment variables', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Django',
            type: 'web_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'python'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 87
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.metadata.variables.PYTHONPATH).toBe('.');
    });

    it('should generate Rust environment variables', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Rust',
            type: 'backend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'rust'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 93
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.metadata.variables.CARGO_TERM_COLOR).toBe('always');
    });
  });

  describe('Step Deduplication', () => {
    it('should deduplicate identical steps from multiple frameworks', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo,
          {
            name: 'Express',
            type: 'backend_framework',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
          } as FrameworkInfo
        ],
        buildTools: [],
        containers: [],
        confidence: {} as OverallConfidence,
        alternatives: [],
        warnings: [],
        detectedAt: new Date(),
        executionTime: 125
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      // Should have only one Node.js setup step despite two Node.js frameworks
      const setupSteps = pipeline.setup.filter(step => step.id === 'setup-node');
      expect(setupSteps).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle frameworks without templates gracefully', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'UnknownFramework',
            type: 'web_framework',
            confidence: 0.9,
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
        executionTime: 70
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      // Should still generate basic security steps
      expect(pipeline.security.length).toBeGreaterThan(0);
      expect(pipeline.metadata).toBeDefined();
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
        executionTime: 45
      };

      const pipeline = await generator.generatePipeline(detectionResult);

      expect(pipeline.setup).toHaveLength(0);
      expect(pipeline.build).toHaveLength(0);
      expect(pipeline.test).toHaveLength(0);
      expect(pipeline.cache).toHaveLength(0);
      expect(pipeline.metadata).toBeDefined();
    });
  });
});