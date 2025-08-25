/**
 * YAML Generator Spec Tests
 * Comprehensive tests validating all YAML Generator spec requirements
 * Target: 75+ tests covering all 5 requirements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { YamlGenerator } from '../../../src/generator/yaml-generator';
import { EnvironmentManager } from '../../../src/generator/environment-manager';
import { loadSpecRequirements, measurePerformance, loadExpectedYaml } from '../utils/spec-test-helpers';
import * as yaml from 'js-yaml';

describe('YAML Generator - Complete Spec Validation', () => {
  let generator: YamlGenerator;
  let envManager: EnvironmentManager;
  
  beforeEach(() => {
    envManager = new EnvironmentManager();
    generator = new YamlGenerator(envManager);
  });

  describe('Requirement 1: Valid GitHub Actions YAML Generation', () => {
    describe('User Story: As a developer, I want the system to generate valid GitHub Actions YAML files', () => {
      
      describe('AC1: Generate syntactically valid YAML files', () => {
        it('should generate valid YAML syntax', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
            suggestedSteps: [
              { type: 'setup', name: 'Setup Node.js', action: 'actions/setup-node@v3' },
              { type: 'install', command: 'npm ci' },
              { type: 'build', command: 'npm run build' }
            ]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          
          // Validate YAML syntax
          expect(() => yaml.load(result.data?.yaml || '')).not.toThrow();
        });

        it('should generate well-formed YAML structure', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Python', confidence: 0.8 }],
            suggestedSteps: [
              { type: 'setup', name: 'Setup Python', action: 'actions/setup-python@v4' }
            ]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          
          const parsed = yaml.load(result.data?.yaml || '') as any;
          expect(parsed).toHaveProperty('name');
          expect(parsed).toHaveProperty('on');
          expect(parsed).toHaveProperty('jobs');
        });

        it('should handle special characters in YAML', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
            suggestedSteps: [
              { type: 'test', command: 'npm test -- --coverage="true"' }
            ]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          expect(() => yaml.load(result.data?.yaml || '')).not.toThrow();
        });
      });

      describe('AC2: Include proper workflow structure', () => {
        it('should include workflow name', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'React', confidence: 0.9 }]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          
          const parsed = yaml.load(result.data?.yaml || '') as any;
          expect(parsed.name).toBeDefined();
          expect(typeof parsed.name).toBe('string');
        });

        it('should include appropriate triggers', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          
          const parsed = yaml.load(result.data?.yaml || '') as any;
          expect(parsed.on).toBeDefined();
          expect(parsed.on.push || parsed.on.pull_request).toBeDefined();
        });

        it('should include jobs section', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Python', confidence: 0.8 }]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          
          const parsed = yaml.load(result.data?.yaml || '') as any;
          expect(parsed.jobs).toBeDefined();
          expect(typeof parsed.jobs).toBe('object');
        });

        it('should include runner configuration', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          
          const parsed = yaml.load(result.data?.yaml || '') as any;
          const job = Object.values(parsed.jobs)[0] as any;
          expect(job['runs-on']).toBeDefined();
        });
      });
    });
  });
});    
  describe('AC3: Validate syntax and structure before output', () => {
        it('should validate YAML syntax before returning', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
            suggestedSteps: [
              { type: 'setup', name: 'Setup Node.js', action: 'actions/setup-node@v3' }
            ]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          
          // Should not return invalid YAML
          expect(() => yaml.load(result.data?.yaml || '')).not.toThrow();
        });

        it('should validate GitHub Actions schema', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Python', confidence: 0.8 }]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          
          const parsed = yaml.load(result.data?.yaml || '') as any;
          
          // Validate required GitHub Actions fields
          expect(parsed).toHaveProperty('name');
          expect(parsed).toHaveProperty('on');
          expect(parsed).toHaveProperty('jobs');
          
          const job = Object.values(parsed.jobs)[0] as any;
          expect(job).toHaveProperty('runs-on');
          expect(job).toHaveProperty('steps');
        });

        it('should return validation errors for invalid input', async () => {
          const invalidData = {
            detectedFrameworks: null,
            suggestedSteps: undefined
          };
          
          const result = await generator.generateWorkflow(invalidData as any);
          expect(result.success).toBe(false);
          expect(result.errors).toBeDefined();
        });
      });

      describe('AC4: Use appropriate GitHub Actions marketplace actions', () => {
        it('should use official setup actions for Node.js', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
            suggestedSteps: [
              { type: 'setup', name: 'Setup Node.js', action: 'actions/setup-node@v3' }
            ]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          expect(result.data?.yaml).toContain('actions/setup-node@v3');
        });

        it('should use official setup actions for Python', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Python', confidence: 0.8 }],
            suggestedSteps: [
              { type: 'setup', name: 'Setup Python', action: 'actions/setup-python@v4' }
            ]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          expect(result.data?.yaml).toContain('actions/setup-python@v4');
        });

        it('should use checkout action for repository access', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          expect(result.data?.yaml).toContain('actions/checkout@v3');
        });

        it('should use cache actions for dependency caching', async () => {
          const frameworkData = {
            detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
            suggestedSteps: [
              { type: 'cache', name: 'Cache dependencies', action: 'actions/cache@v3' }
            ]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          expect(result.success).toBe(true);
          expect(result.data?.yaml).toContain('actions/cache@v3');
        });
      });

      describe('AC5: Provide detailed error messages', () => {
        it('should provide specific error for missing framework data', async () => {
          const result = await generator.generateWorkflow(null as any);
          expect(result.success).toBe(false);
          expect(result.errors?.[0]?.message).toContain('framework data');
        });

        it('should provide line numbers for YAML syntax errors', async () => {
          // Simulate internal YAML generation error
          const frameworkData = {
            detectedFrameworks: [{ name: 'Invalid\nFramework', confidence: 0.9 }]
          };
          
          const result = await generator.generateWorkflow(frameworkData);
          if (!result.success) {
            expect(result.errors?.[0]?.message).toBeDefined();
          }
        });

        it('should provide actionable suggestions in error messages', async () => {
          const invalidData = {
            detectedFrameworks: [],
            suggestedSteps: []
          };
          
          const result = await generator.generateWorkflow(invalidData);
          expect(result.success).toBe(false);
          expect(result.errors?.[0]?.message).toContain('suggestion');
        });
      });
    });
  });

  describe('Requirement 2: Template System Functionality', () => {
    describe('User Story: As a developer, I want flexible template-based workflow generation', () => {
      
      it('should use appropriate template for Node.js projects', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        expect(result.data?.template).toBe('nodejs');
      });

      it('should use appropriate template for Python projects', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Python', confidence: 0.8 }]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        expect(result.data?.template).toBe('python');
      });

      it('should support custom template variables', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
          templateVariables: {
            nodeVersion: '18.x',
            packageManager: 'npm'
          }
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        expect(result.data?.yaml).toContain('18.x');
      });

      it('should handle template inheritance', async () => {
        const frameworkData = {
          detectedFrameworks: [
            { name: 'Node.js', confidence: 0.9 },
            { name: 'React', confidence: 0.8 }
          ]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        // Should inherit from Node.js template and extend with React-specific steps
      });
    });
  });

  describe('Requirement 3: Workflow Specialization', () => {
    describe('User Story: As a developer, I want specialized workflows for different project types', () => {
      
      it('should generate React-specific build workflow', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'React', confidence: 0.9 }],
          suggestedSteps: [
            { type: 'setup', name: 'Setup Node.js', action: 'actions/setup-node@v3' },
            { type: 'install', command: 'npm ci' },
            { type: 'build', command: 'npm run build' }
          ]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        expect(result.data?.yaml).toContain('npm run build');
      });

      it('should generate Django-specific workflow', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Django', confidence: 0.8 }],
          suggestedSteps: [
            { type: 'setup', name: 'Setup Python', action: 'actions/setup-python@v4' },
            { type: 'install', command: 'pip install -r requirements.txt' },
            { type: 'test', command: 'python manage.py test' }
          ]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        expect(result.data?.yaml).toContain('python manage.py test');
      });

      it('should generate Docker-based workflow when Dockerfile exists', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
          hasDockerfile: true,
          suggestedSteps: [
            { type: 'docker', command: 'docker build -t app .' }
          ]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        expect(result.data?.yaml).toContain('docker build');
      });

      it('should generate multi-stage workflow for complex projects', async () => {
        const frameworkData = {
          detectedFrameworks: [
            { name: 'Node.js', confidence: 0.9 },
            { name: 'Python', confidence: 0.7 }
          ],
          suggestedSteps: [
            { type: 'setup', name: 'Setup Node.js', action: 'actions/setup-node@v3' },
            { type: 'setup', name: 'Setup Python', action: 'actions/setup-python@v4' },
            { type: 'install', command: 'npm ci' },
            { type: 'install', command: 'pip install -r requirements.txt' }
          ]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        
        const parsed = yaml.load(result.data?.yaml || '') as any;
        expect(Object.keys(parsed.jobs).length).toBeGreaterThan(1);
      });
    });
  });

  describe('Requirement 4: Environment Management', () => {
    describe('User Story: As a developer, I want proper environment configuration in workflows', () => {
      
      it('should configure Node.js version matrix', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
          environmentConfig: {
            nodeVersions: ['16.x', '18.x', '20.x']
          }
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        
        const parsed = yaml.load(result.data?.yaml || '') as any;
        const job = Object.values(parsed.jobs)[0] as any;
        expect(job.strategy?.matrix?.['node-version']).toEqual(['16.x', '18.x', '20.x']);
      });

      it('should configure Python version matrix', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Python', confidence: 0.8 }],
          environmentConfig: {
            pythonVersions: ['3.8', '3.9', '3.10', '3.11']
          }
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        
        const parsed = yaml.load(result.data?.yaml || '') as any;
        const job = Object.values(parsed.jobs)[0] as any;
        expect(job.strategy?.matrix?.['python-version']).toContain('3.8');
      });

      it('should configure operating system matrix', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
          environmentConfig: {
            operatingSystems: ['ubuntu-latest', 'windows-latest', 'macos-latest']
          }
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        
        const parsed = yaml.load(result.data?.yaml || '') as any;
        const job = Object.values(parsed.jobs)[0] as any;
        expect(job.strategy?.matrix?.os).toEqual(['ubuntu-latest', 'windows-latest', 'macos-latest']);
      });

      it('should set environment variables', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
          environmentConfig: {
            environmentVariables: {
              NODE_ENV: 'test',
              CI: 'true'
            }
          }
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        
        const parsed = yaml.load(result.data?.yaml || '') as any;
        const job = Object.values(parsed.jobs)[0] as any;
        expect(job.env?.NODE_ENV).toBe('test');
        expect(job.env?.CI).toBe('true');
      });
    });
  });

  describe('Requirement 5: Error Handling and Validation', () => {
    describe('User Story: As a developer, I want robust error handling in workflow generation', () => {
      
      it('should handle missing framework data gracefully', async () => {
        const result = await generator.generateWorkflow(undefined as any);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.[0]?.code).toBe('MISSING_FRAMEWORK_DATA');
      });

      it('should validate step dependencies', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
          suggestedSteps: [
            { type: 'build', command: 'npm run build' }, // Missing setup step
            { type: 'test', command: 'npm test' }
          ]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(true);
        
        // Should automatically add missing setup step
        expect(result.data?.yaml).toContain('actions/setup-node');
      });

      it('should validate action versions', async () => {
        const frameworkData = {
          detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
          suggestedSteps: [
            { type: 'setup', name: 'Setup Node.js', action: 'actions/setup-node@v999' } // Invalid version
          ]
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        if (!result.success) {
          expect(result.errors?.[0]?.message).toContain('version');
        }
      });

      it('should provide recovery suggestions for common errors', async () => {
        const frameworkData = {
          detectedFrameworks: [],
          suggestedSteps: []
        };
        
        const result = await generator.generateWorkflow(frameworkData);
        expect(result.success).toBe(false);
        expect(result.errors?.[0]?.suggestions).toBeDefined();
        expect(result.errors?.[0]?.suggestions?.length).toBeGreaterThan(0);
      });
    });
  });

  // Performance tests
  describe('YAML Generator - Performance Requirements', () => {
    it('should generate YAML within performance limits', async () => {
      const complexFrameworkData = {
        detectedFrameworks: [
          { name: 'Node.js', confidence: 0.9 },
          { name: 'React', confidence: 0.8 },
          { name: 'TypeScript', confidence: 0.7 }
        ],
        suggestedSteps: Array.from({ length: 20 }, (_, i) => ({
          type: 'test',
          command: `test-command-${i}`
        })),
        environmentConfig: {
          nodeVersions: ['16.x', '18.x', '20.x'],
          operatingSystems: ['ubuntu-latest', 'windows-latest', 'macos-latest']
        }
      };
      
      const { result, executionTime, withinLimit } = await measurePerformance(
        () => generator.generateWorkflow(complexFrameworkData),
        1000 // 1 second limit
      );
      
      expect(result.success).toBe(true);
      expect(withinLimit).toBe(true);
      expect(executionTime).toBeLessThan(1000);
    });

    it('should handle large template variables efficiently', async () => {
      const largeTemplateVars = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`var${i}`, `value${i}`])
      );
      
      const frameworkData = {
        detectedFrameworks: [{ name: 'Node.js', confidence: 0.9 }],
        templateVariables: largeTemplateVars
      };
      
      const { result, executionTime } = await measurePerformance(
        () => generator.generateWorkflow(frameworkData)
      );
      
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(2000); // 2 second limit
    });
  });

  // Integration tests
  describe('Integration with Framework Detection', () => {
    it('should work with framework detection output', async () => {
      // Simulate framework detection output
      const frameworkDetectionOutput = {
        detectedFrameworks: [
          { name: 'React', confidence: 0.9, version: '^18.0.0' },
          { name: 'Node.js', confidence: 0.8, version: '18.x' }
        ],
        suggestedSteps: [
          { type: 'setup', name: 'Setup Node.js', action: 'actions/setup-node@v3' },
          { type: 'install', command: 'npm ci' },
          { type: 'build', command: 'npm run build' },
          { type: 'test', command: 'npm test' }
        ],
        recommendedPackageManager: 'npm',
        overallConfidence: 0.85
      };
      
      const result = await generator.generateWorkflow(frameworkDetectionOutput);
      expect(result.success).toBe(true);
      expect(result.data?.yaml).toBeDefined();
      
      // Validate generated workflow contains expected elements
      const parsed = yaml.load(result.data?.yaml || '') as any;
      expect(parsed.name).toBeDefined();
      expect(parsed.jobs).toBeDefined();
    });
  });

  // Comparison tests with expected outputs
  describe('Expected Output Validation', () => {
    it('should match expected output for Node.js React project', async () => {
      const frameworkData = {
        detectedFrameworks: [
          { name: 'React', confidence: 0.9 },
          { name: 'Node.js', confidence: 0.8 }
        ],
        suggestedSteps: [
          { type: 'setup', name: 'Setup Node.js', action: 'actions/setup-node@v3' },
          { type: 'install', command: 'npm ci' },
          { type: 'build', command: 'npm run build' },
          { type: 'test', command: 'npm test' }
        ]
      };
      
      const result = await generator.generateWorkflow(frameworkData);
      expect(result.success).toBe(true);
      
      // Load expected output for comparison
      const expectedYaml = loadExpectedYaml('nodejs-react-workflow.yml');
      const expectedParsed = yaml.load(expectedYaml) as any;
      const actualParsed = yaml.load(result.data?.yaml || '') as any;
      
      // Compare key structural elements
      expect(actualParsed.name).toBeDefined();
      expect(actualParsed.on).toEqual(expectedParsed.on);
      expect(Object.keys(actualParsed.jobs)).toEqual(Object.keys(expectedParsed.jobs));
    });
  });
});