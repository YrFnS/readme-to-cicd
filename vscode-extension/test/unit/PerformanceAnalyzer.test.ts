/**
 * Performance Analyzer Tests
 * 
 * Tests for workflow performance analysis and optimization recommendations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { PerformanceAnalyzer } from '../../src/core/PerformanceAnalyzer';
import { ExtensionConfiguration } from '../../src/core/types';

// Mock VS Code API
vi.mock('vscode', () => ({
  workspace: {
    fs: {
      readFile: vi.fn()
    }
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path }))
  }
}));

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;
  let mockContext: vscode.ExtensionContext;
  let mockConfiguration: ExtensionConfiguration;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {} as any,
      globalState: {} as any,
      extensionPath: '/test/path'
    } as vscode.ExtensionContext;

    mockConfiguration = {
      defaultOutputDirectory: '.github/workflows',
      enableAutoGeneration: false,
      preferredWorkflowTypes: ['ci'],
      customTemplates: [],
      gitIntegration: {
        autoCommit: false,
        commitMessage: 'Update workflows',
        createPR: false
      },
      showPreviewByDefault: true,
      enableInlineValidation: true,
      notificationLevel: 'all'
    };

    analyzer = new PerformanceAnalyzer(mockContext, mockConfiguration);
  });

  describe('analyzeWorkflowPerformance', () => {
    it('should analyze a basic Node.js workflow', async () => {
      const mockWorkflow = {
        name: 'CI',
        on: ['push'],
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v3' },
              { name: 'Install dependencies', run: 'npm install' },
              { name: 'Run tests', run: 'npm test' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/workflow.yml');

      expect(result).toBeDefined();
      expect(result.workflowPath).toBe('/test/workflow.yml');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.cachingOpportunities).toHaveLength(1);
      expect(result.cachingOpportunities[0].framework).toBe('node');
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          category: 'caching',
          title: expect.stringContaining('dependencies'),
          applicableSteps: expect.any(Array)
        })
      );
    });

    it('should identify Docker caching opportunities', async () => {
      const mockWorkflow = {
        name: 'Build',
        on: ['push'],
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v3' },
              { name: 'Build Docker image', run: 'docker build -t app .' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/docker-workflow.yml');

      expect(result.cachingOpportunities).toContainEqual(
        expect.objectContaining({
          cacheType: 'docker-layers',
          framework: 'docker'
        })
      );
    });

    it('should suggest parallelization for independent jobs', async () => {
      const mockWorkflow = {
        name: 'CI/CD',
        on: ['push'],
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ name: 'Run tests', run: 'npm test' }]
          },
          lint: {
            'runs-on': 'ubuntu-latest',
            steps: [{ name: 'Run linter', run: 'npm run lint' }]
          },
          build: {
            'runs-on': 'ubuntu-latest',
            needs: ['test', 'lint'],
            steps: [{ name: 'Build', run: 'npm run build' }]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/parallel-workflow.yml');

      expect(result.parallelizationSuggestions).toContainEqual(
        expect.objectContaining({
          suggestedStructure: 'parallel',
          affectedJobs: expect.arrayContaining(['test', 'lint'])
        })
      );
    });

    it('should identify matrix build opportunities', async () => {
      const mockWorkflow = {
        name: 'Test',
        on: ['push'],
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Setup Node', uses: 'actions/setup-node@v3' },
              { name: 'Install', run: 'npm install' },
              { name: 'Test', run: 'npm test' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/matrix-workflow.yml');

      expect(result.parallelizationSuggestions).toContainEqual(
        expect.objectContaining({
          suggestedStructure: 'matrix',
          implementation: expect.objectContaining({
            strategy: 'matrix-build'
          })
        })
      );
    });

    it('should identify performance bottlenecks', async () => {
      const mockWorkflow = {
        name: 'Slow Build',
        on: ['push'],
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Long build', run: 'mvn install' }, // Should be identified as slow
              { name: 'Docker build', run: 'docker build -t app .' } // Should be identified as slow
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/slow-workflow.yml');

      expect(result.bottlenecks).toHaveLength(2);
      expect(result.bottlenecks).toContainEqual(
        expect.objectContaining({
          type: 'slow-step',
          estimatedDuration: 300 // 5 minutes for mvn install
        })
      );
      expect(result.bottlenecks).toContainEqual(
        expect.objectContaining({
          type: 'slow-step',
          estimatedDuration: 360 // 6 minutes for docker build
        })
      );
    });

    it('should calculate overall performance score', async () => {
      const mockWorkflow = {
        name: 'Perfect Workflow',
        on: ['push'],
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v3' },
              { name: 'Cache', uses: 'actions/cache@v3' },
              { name: 'Quick test', run: 'echo "test"' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/perfect-workflow.yml');

      expect(result.overallScore).toBeGreaterThan(80); // Should have high score
    });
  });

  describe('analyzeMultipleWorkflows', () => {
    it('should analyze multiple workflows and find cross-workflow optimizations', async () => {
      const mockWorkflow1 = {
        name: 'Workflow 1',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ name: 'Install', run: 'npm install' }]
          }
        }
      };

      const mockWorkflow2 = {
        name: 'Workflow 2',
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            steps: [{ name: 'Install', run: 'npm install' }]
          }
        }
      };

      vi.mocked(vscode.workspace.fs.readFile)
        .mockResolvedValueOnce(Buffer.from(JSON.stringify(mockWorkflow1)))
        .mockResolvedValueOnce(Buffer.from(JSON.stringify(mockWorkflow2)));

      const result = await analyzer.analyzeMultipleWorkflows([
        '/test/workflow1.yml',
        '/test/workflow2.yml'
      ]);

      expect(result.workflows).toHaveLength(2);
      expect(result.crossWorkflowOptimizations).toContainEqual(
        expect.objectContaining({
          type: 'shared-caching',
          affectedWorkflows: expect.arrayContaining(['/test/workflow1.yml', '/test/workflow2.yml'])
        })
      );
      expect(result.sharedCachingOpportunities).toHaveLength(1);
    });
  });

  describe('generateOptimizedWorkflow', () => {
    it('should apply caching recommendations', async () => {
      const mockWorkflow = {
        name: 'CI',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v3' },
              { name: 'Install', run: 'npm install' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      // First analyze to get recommendations
      const analysis = await analyzer.analyzeWorkflowPerformance('/test/workflow.yml');
      const cachingRecommendation = analysis.recommendations.find(r => r.category === 'caching');
      
      expect(cachingRecommendation).toBeDefined();

      // Then generate optimized workflow
      const result = await analyzer.generateOptimizedWorkflow(
        '/test/workflow.yml',
        [cachingRecommendation!.id]
      );

      expect(result.appliedOptimizations).toHaveLength(1);
      expect(result.appliedOptimizations[0].applied).toBe(true);
      expect(result.estimatedTimeSaving).toBeGreaterThan(0);
      expect(result.optimizedContent).toContain('actions/cache');
    });

    it('should handle failed optimizations gracefully', async () => {
      const mockWorkflow = {
        name: 'CI',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [{ name: 'Test', run: 'npm test' }]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.generateOptimizedWorkflow(
        '/test/workflow.yml',
        ['non-existent-recommendation']
      );

      expect(result.warnings).toContain('Recommendation non-existent-recommendation not found');
      expect(result.appliedOptimizations).toHaveLength(0);
    });
  });

  describe('framework detection', () => {
    it('should detect Python framework', async () => {
      const mockWorkflow = {
        name: 'Python CI',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Install', run: 'pip install -r requirements.txt' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/python-workflow.yml');

      expect(result.cachingOpportunities).toContainEqual(
        expect.objectContaining({
          framework: 'python',
          cacheType: 'dependencies'
        })
      );
    });

    it('should detect Java framework', async () => {
      const mockWorkflow = {
        name: 'Java CI',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Build', run: 'mvn compile' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/java-workflow.yml');

      expect(result.cachingOpportunities).toContainEqual(
        expect.objectContaining({
          framework: 'java',
          cacheType: 'dependencies'
        })
      );
    });

    it('should detect Go framework', async () => {
      const mockWorkflow = {
        name: 'Go CI',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Download deps', run: 'go mod download' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/go-workflow.yml');

      expect(result.cachingOpportunities).toContainEqual(
        expect.objectContaining({
          framework: 'go',
          cacheType: 'dependencies'
        })
      );
    });
  });

  describe('resource optimization', () => {
    it('should suggest runner optimizations', async () => {
      const mockWorkflow = {
        name: 'Simple CI',
        jobs: {
          test: {
            'runs-on': 'macos-latest', // Expensive runner for simple task
            steps: [
              { name: 'Simple test', run: 'echo "test"' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/expensive-workflow.yml');

      expect(result.resourceOptimizations).toContainEqual(
        expect.objectContaining({
          resourceType: 'runner',
          currentUsage: 'macos-latest',
          recommendedUsage: 'ubuntu-latest',
          costImpact: 'decrease'
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle invalid YAML gracefully', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from('invalid: yaml: content:'));

      await expect(analyzer.analyzeWorkflowPerformance('/test/invalid.yml'))
        .rejects.toThrow('Failed to analyze workflow performance');
    });

    it('should handle file read errors', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('File not found'));

      await expect(analyzer.analyzeWorkflowPerformance('/test/missing.yml'))
        .rejects.toThrow('Failed to analyze workflow performance');
    });
  });

  describe('performance calculations', () => {
    it('should calculate estimated improvements correctly', async () => {
      const mockWorkflow = {
        name: 'Unoptimized',
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Install', run: 'npm install' },
              { name: 'Build', run: 'npm run build' },
              { name: 'Test', run: 'npm test' }
            ]
          }
        }
      };

      const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);

      const result = await analyzer.analyzeWorkflowPerformance('/test/unoptimized.yml');

      expect(result.estimatedImprovements).toContainEqual(
        expect.objectContaining({
          category: 'Caching',
          timeSaving: expect.any(Number),
          confidence: expect.any(Number)
        })
      );

      const cachingImprovement = result.estimatedImprovements.find(i => i.category === 'Caching');
      expect(cachingImprovement?.timeSaving).toBeGreaterThan(0);
      expect(cachingImprovement?.confidence).toBeGreaterThan(0);
      expect(cachingImprovement?.confidence).toBeLessThanOrEqual(1);
    });
  });
});