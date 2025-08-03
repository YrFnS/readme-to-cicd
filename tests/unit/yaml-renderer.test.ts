/**
 * Unit tests for YAML Renderer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { YAMLRenderer } from '../../src/generator/renderers/yaml-renderer';
import { FormattingOptions } from '../../src/generator/renderers/renderer-types';
import { WorkflowTemplate, WorkflowType } from '../../src/generator/types';

describe('YAMLRenderer', () => {
  let renderer: YAMLRenderer;
  let defaultOptions: FormattingOptions;
  let sampleWorkflow: WorkflowTemplate;

  beforeEach(() => {
    defaultOptions = {
      yamlConfig: {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        noCompatMode: true,
        condenseFlow: false,
        quotingType: 'auto',
        forceQuotes: false,
        sortKeys: false
      },
      commentConfig: {
        enabled: true,
        includeGenerationInfo: true,
        includeStepDescriptions: true,
        includeOptimizationNotes: false,
        customComments: {}
      },
      preserveComments: true,
      addBlankLines: true
    };

    renderer = new YAMLRenderer(defaultOptions);

    sampleWorkflow = {
      name: 'CI Pipeline',
      type: 'ci' as WorkflowType,
      triggers: {
        push: {
          branches: ['main', 'develop']
        },
        pullRequest: {
          branches: ['main']
        }
      },
      jobs: [
        {
          name: 'Build and Test',
          runsOn: 'ubuntu-latest',
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup Node.js',
              uses: 'actions/setup-node@v4',
              with: {
                'node-version': '18',
                cache: 'npm'
              }
            },
            {
              name: 'Install dependencies',
              run: 'npm ci'
            },
            {
              name: 'Run tests',
              run: 'npm test'
            }
          ]
        }
      ]
    };
  });

  describe('renderWorkflow', () => {
    it('should render a basic workflow to valid YAML', () => {
      const result = renderer.renderWorkflow(sampleWorkflow);

      expect(result.yaml).toBeTruthy();
      expect(result.metadata.linesCount).toBeGreaterThan(0);
      expect(result.metadata.charactersCount).toBeGreaterThan(0);
      expect(result.metadata.renderingTime).toBeGreaterThanOrEqual(0);
      expect(result.warnings).toEqual([]);
    });

    it('should include workflow name in YAML', () => {
      const result = renderer.renderWorkflow(sampleWorkflow);

      expect(result.yaml).toContain('name: CI Pipeline');
    });

    it('should convert triggers correctly', () => {
      const result = renderer.renderWorkflow(sampleWorkflow);

      expect(result.yaml).toContain('on:');
      expect(result.yaml).toContain('push:');
      expect(result.yaml).toContain('pull_request:');
      expect(result.yaml).toContain('- main');
      expect(result.yaml).toContain('- develop');
    });

    it('should convert jobs correctly', () => {
      const result = renderer.renderWorkflow(sampleWorkflow);

      expect(result.yaml).toContain('jobs:');
      expect(result.yaml).toContain('build-and-test:');
      expect(result.yaml).toContain('runs-on: ubuntu-latest');
    });

    it('should convert steps correctly', () => {
      const result = renderer.renderWorkflow(sampleWorkflow);

      expect(result.yaml).toContain('steps:');
      expect(result.yaml).toContain('- name: Checkout code');
      expect(result.yaml).toContain('uses: actions/checkout@v4');
      expect(result.yaml).toContain('- name: Setup Node.js');
      expect(result.yaml).toContain('uses: actions/setup-node@v4');
      expect(result.yaml).toContain('with:');
      expect(result.yaml).toContain("node-version: '18'");
      expect(result.yaml).toContain('cache: npm');
    });

    it('should handle workflow with permissions', () => {
      const workflowWithPermissions = {
        ...sampleWorkflow,
        permissions: {
          contents: 'read' as const,
          actions: 'read' as const
        }
      };

      const result = renderer.renderWorkflow(workflowWithPermissions);

      expect(result.yaml).toContain('permissions:');
      expect(result.yaml).toContain('contents: read');
      expect(result.yaml).toContain('actions: read');
    });

    it('should handle workflow with concurrency', () => {
      const workflowWithConcurrency = {
        ...sampleWorkflow,
        concurrency: {
          group: 'ci-${{ github.ref }}',
          cancelInProgress: true
        }
      };

      const result = renderer.renderWorkflow(workflowWithConcurrency);

      expect(result.yaml).toContain('concurrency:');
      expect(result.yaml).toContain('group: ci-${{ github.ref }}');
      expect(result.yaml).toContain('cancel-in-progress: true');
    });

    it('should handle job with strategy matrix', () => {
      const workflowWithMatrix = {
        ...sampleWorkflow,
        jobs: [
          {
            ...sampleWorkflow.jobs[0],
            strategy: {
              matrix: {
                'node-version': ['16', '18', '20'],
                os: ['ubuntu-latest', 'windows-latest']
              },
              failFast: false
            }
          }
        ]
      };

      const result = renderer.renderWorkflow(workflowWithMatrix);

      expect(result.yaml).toContain('strategy:');
      expect(result.yaml).toContain('matrix:');
      expect(result.yaml).toContain('node-version:');
      expect(result.yaml).toContain("- '16'");
      expect(result.yaml).toContain("- '18'");
      expect(result.yaml).toContain("- '20'");
      expect(result.yaml).toContain('fail-fast: false');
    });

    it('should handle job dependencies', () => {
      const workflowWithDependencies = {
        ...sampleWorkflow,
        jobs: [
          sampleWorkflow.jobs[0],
          {
            name: 'Deploy',
            runsOn: 'ubuntu-latest',
            needs: ['build-and-test'],
            steps: [
              {
                name: 'Deploy to staging',
                run: 'echo "Deploying..."'
              }
            ]
          }
        ]
      };

      const result = renderer.renderWorkflow(workflowWithDependencies);

      expect(result.yaml).toContain('deploy:');
      expect(result.yaml).toContain('needs:');
      expect(result.yaml).toContain('- build-and-test');
    });

    it('should calculate metadata correctly', () => {
      const result = renderer.renderWorkflow(sampleWorkflow);

      expect(result.metadata.linesCount).toBeGreaterThan(10);
      expect(result.metadata.charactersCount).toBeGreaterThan(100);
      expect(result.metadata.renderingTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.metadata.optimizationsApplied)).toBe(true);
    });

    it('should detect caching optimization', () => {
      // The sample workflow already has cache: 'npm' in setup-node step
      const result = renderer.renderWorkflow(sampleWorkflow);

      expect(result.metadata.optimizationsApplied).toContain('dependency-caching');
    });

    it('should detect matrix builds optimization', () => {
      const workflowWithMatrix = {
        ...sampleWorkflow,
        jobs: [
          {
            ...sampleWorkflow.jobs[0],
            strategy: {
              matrix: {
                'node-version': ['16', '18', '20']
              }
            }
          }
        ]
      };

      const result = renderer.renderWorkflow(workflowWithMatrix);

      expect(result.metadata.optimizationsApplied).toContain('matrix-builds');
    });

    it('should detect parallel execution optimization', () => {
      const workflowWithMultipleJobs = {
        ...sampleWorkflow,
        jobs: [
          sampleWorkflow.jobs[0],
          {
            name: 'Lint',
            runsOn: 'ubuntu-latest',
            steps: [
              {
                name: 'Run linter',
                run: 'npm run lint'
              }
            ]
          }
        ]
      };

      const result = renderer.renderWorkflow(workflowWithMultipleJobs);

      expect(result.metadata.optimizationsApplied).toContain('parallel-execution');
    });

    it('should throw error for invalid workflow', () => {
      const invalidWorkflow = {
        ...sampleWorkflow,
        jobs: null as any
      };

      expect(() => renderer.renderWorkflow(invalidWorkflow)).toThrow();
    });
  });

  describe('injectComments', () => {
    it('should add generation info comments when enabled', () => {
      const yamlContent = 'name: Test\non:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest';
      
      const result = renderer.injectComments(yamlContent, sampleWorkflow);

      expect(result).toContain('# This workflow was automatically generated by README-to-CICD');
      expect(result).toContain('# Generated at:');
      expect(result).toContain('# Workflow type: ci');
    });

    it('should add workflow description comment', () => {
      const yamlContent = 'name: CI Pipeline\non:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest';
      
      const result = renderer.injectComments(yamlContent, sampleWorkflow);

      expect(result).toContain('# CI Pipeline - Continuous Integration workflow for building and testing');
    });

    it('should add trigger comments', () => {
      const yamlContent = 'name: Test\non:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest';
      
      const result = renderer.injectComments(yamlContent, sampleWorkflow);

      expect(result).toContain('# Workflow triggers');
    });

    it('should add job comments when enabled', () => {
      const yamlContent = 'name: Test\njobs:\n  build-and-test:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Test';
      
      const result = renderer.injectComments(yamlContent, sampleWorkflow);

      expect(result).toContain('# Job: Build and Test');
    });

    it('should add step description comments', () => {
      const yamlContent = 'steps:\n  - name: Checkout code\n  - name: Setup Node.js';
      
      const result = renderer.injectComments(yamlContent, sampleWorkflow);

      expect(result).toContain('# Check out repository code');
      expect(result).toContain('# Set up runtime environment');
    });

    it('should add custom comments', () => {
      const customOptions = {
        ...defaultOptions,
        commentConfig: {
          ...defaultOptions.commentConfig,
          customComments: {
            'npm ci': 'Install dependencies with clean install'
          }
        }
      };

      const customRenderer = new YAMLRenderer(customOptions);
      const yamlContent = 'steps:\n  - name: Install\n    run: npm ci';
      
      const result = customRenderer.injectComments(yamlContent, sampleWorkflow);

      expect(result).toContain('# Install dependencies with clean install');
    });

    it('should not add comments when disabled', () => {
      const noCommentsOptions = {
        ...defaultOptions,
        commentConfig: {
          ...defaultOptions.commentConfig,
          enabled: false
        }
      };

      const noCommentsRenderer = new YAMLRenderer(noCommentsOptions);
      const yamlContent = 'name: Test\non:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest';
      
      const result = noCommentsRenderer.injectComments(yamlContent, sampleWorkflow);

      expect(result).toBe(yamlContent);
    });
  });

  describe('formatYAML', () => {
    it('should remove trailing whitespace', () => {
      const yamlContent = 'name: Test   \non:  \n  push:   ';
      
      const result = renderer.formatYAML(yamlContent);

      expect(result).not.toContain('   \n');
      expect(result).not.toContain('  \n');
    });

    it('should remove leading empty lines', () => {
      const yamlContent = '\n\n\nname: Test\non:\n  push:';
      
      const result = renderer.formatYAML(yamlContent);

      expect(result).not.toMatch(/^\n+/);
    });

    it('should ensure single trailing newline', () => {
      const yamlContent = 'name: Test\non:\n  push:';
      
      const result = renderer.formatYAML(yamlContent);

      expect(result).toMatch(/\n$/);
      expect(result).not.toMatch(/\n\n$/);
    });

    it('should handle empty content', () => {
      const yamlContent = '';
      
      const result = renderer.formatYAML(yamlContent);

      expect(result).toBe('');
    });
  });

  describe('validateYAMLSyntax', () => {
    it('should validate correct YAML', () => {
      const validYaml = 'name: Test\non:\n  push:\n    branches:\n      - main';
      
      const result = renderer.validateYAMLSyntax(validYaml);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect invalid YAML syntax', () => {
      const invalidYaml = 'name: Test\non:\n  push:\n    branches:\n      - main\n    invalid: [unclosed'; // Unclosed bracket
      
      const result = renderer.validateYAMLSyntax(invalidYaml);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should detect indentation errors', () => {
      const invalidYaml = 'name: Test\n  on:\n push:\n  branches:\n    - main'; // Inconsistent indentation
      
      const result = renderer.validateYAMLSyntax(invalidYaml);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('sanitizeJobName', () => {
    it('should convert to lowercase', () => {
      const workflow = {
        ...sampleWorkflow,
        jobs: [
          {
            ...sampleWorkflow.jobs[0],
            name: 'BUILD AND TEST'
          }
        ]
      };

      const result = renderer.renderWorkflow(workflow);

      expect(result.yaml).toContain('build-and-test:');
    });

    it('should replace spaces with hyphens', () => {
      const workflow = {
        ...sampleWorkflow,
        jobs: [
          {
            ...sampleWorkflow.jobs[0],
            name: 'build and test'
          }
        ]
      };

      const result = renderer.renderWorkflow(workflow);

      expect(result.yaml).toContain('build-and-test:');
    });

    it('should remove special characters', () => {
      const workflow = {
        ...sampleWorkflow,
        jobs: [
          {
            ...sampleWorkflow.jobs[0],
            name: 'build & test!'
          }
        ]
      };

      const result = renderer.renderWorkflow(workflow);

      expect(result.yaml).toContain('build-test:');
    });

    it('should handle multiple consecutive hyphens', () => {
      const workflow = {
        ...sampleWorkflow,
        jobs: [
          {
            ...sampleWorkflow.jobs[0],
            name: 'build   test'
          }
        ]
      };

      const result = renderer.renderWorkflow(workflow);

      expect(result.yaml).toContain('build-test:');
    });
  });

  describe('integration with different workflow types', () => {
    it('should handle CD workflow type', () => {
      const cdWorkflow = {
        ...sampleWorkflow,
        type: 'cd' as WorkflowType,
        name: 'Deploy Pipeline'
      };

      const result = renderer.renderWorkflow(cdWorkflow);

      expect(result.yaml).toContain('name: Deploy Pipeline');
      expect(result.yaml).toContain('# Deploy Pipeline - Continuous Deployment workflow for releasing to production');
    });

    it('should handle release workflow type', () => {
      const releaseWorkflow = {
        ...sampleWorkflow,
        type: 'release' as WorkflowType,
        name: 'Release Pipeline'
      };

      const result = renderer.renderWorkflow(releaseWorkflow);

      expect(result.yaml).toContain('# Release Pipeline - Release workflow for versioning and publishing');
    });

    it('should handle security workflow type', () => {
      const securityWorkflow = {
        ...sampleWorkflow,
        type: 'security' as WorkflowType,
        name: 'Security Scan'
      };

      const result = renderer.renderWorkflow(securityWorkflow);

      expect(result.yaml).toContain('# Security Scan - Security workflow for vulnerability scanning and compliance');
    });
  });
});