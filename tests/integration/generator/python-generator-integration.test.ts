import { describe, it, expect, beforeEach } from 'vitest';
import { PythonWorkflowGenerator } from '../../../src/generator/templates/python-generator';
import { TemplateManager } from '../../../src/generator/templates/template-manager';
import { TemplateLoadConfig } from '../../../src/generator/templates/template-types';
import { DetectionResult } from '../../../src/generator/interfaces';
import * as yaml from 'yaml';

describe('PythonWorkflowGenerator Integration Tests', () => {
  let generator: PythonWorkflowGenerator;
  let templateManager: TemplateManager;

  beforeEach(() => {
    const config: TemplateLoadConfig = {
      baseTemplatesPath: 'templates/frameworks',
      cacheEnabled: true,
      reloadOnChange: false
    };
    templateManager = new TemplateManager(config);
    generator = new PythonWorkflowGenerator(templateManager);
  });

  describe('Django workflow integration', () => {
    it('should generate complete Django workflow with real templates', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
        frameworks: [{ 
          name: 'django', 
          confidence: 0.9, 
          evidence: ['manage.py', 'settings.py'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'pip', 
          lockFile: 'requirements.txt', 
          confidence: 0.8 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: [
          { name: 'flake8', confidence: 0.7 },
          { name: 'mypy', confidence: 0.6 }
        ]
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate basic structure
      expect(result.filename).toBe('django-ci.yml');
      expect(result.type).toBe('ci');
      expect(result.content).toBeTruthy();

      // Parse and validate YAML structure
      const workflow = yaml.parse(result.content);
      expect(workflow.name).toContain('Django CI');
      expect(workflow.on.push.branches).toContain('main');
      expect(workflow.jobs.test).toBeDefined();
      
      // Validate Django-specific steps
      expect(result.content).toContain('python manage.py migrate');
      expect(result.content).toContain('postgres');
      expect(result.content).toContain('DJANGO_SETTINGS_MODULE');
      
      // Validate Python setup
      expect(result.content).toContain('actions/setup-python@v4');
      expect(result.content).toContain('python-version');
      
      // Validate optimizations
      expect(result.metadata.optimizations).toContain('pip dependency caching enabled');
      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple Python versions');
      expect(result.metadata.optimizations).toContain('Virtual environment setup and caching');
    });

    it('should handle Django with Poetry package manager', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.10', confidence: 0.9 }],
        frameworks: [{ 
          name: 'django', 
          confidence: 0.9, 
          evidence: ['manage.py'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'poetry', 
          lockFile: 'poetry.lock', 
          confidence: 0.9 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.content).toContain('poetry install');
      expect(result.content).toContain('poetry run');
      expect(result.metadata.optimizations).toContain('Poetry dependency management optimized');
    });
  });

  describe('Flask workflow integration', () => {
    it('should generate complete Flask workflow with real templates', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.10', confidence: 0.9 }],
        frameworks: [{ 
          name: 'flask', 
          confidence: 0.9, 
          evidence: ['app.py', 'from flask import'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'pip', 
          lockFile: 'requirements.txt', 
          confidence: 0.8 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate basic structure
      expect(result.filename).toBe('flask-ci.yml');
      expect(result.type).toBe('ci');

      // Parse and validate YAML structure
      const workflow = yaml.parse(result.content);
      expect(workflow.name).toContain('Flask CI');
      expect(workflow.jobs.test).toBeDefined();

      // Validate Flask-specific environment
      expect(result.content).toContain('FLASK_ENV: testing');
      expect(result.content).toContain('FLASK_APP');
      
      // Validate WSGI test
      expect(result.content).toContain('test_client().get');
    });
  });

  describe('FastAPI workflow integration', () => {
    it('should generate complete FastAPI workflow with real templates', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
        frameworks: [{ 
          name: 'fastapi', 
          confidence: 0.9, 
          evidence: ['main.py', 'from fastapi import'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'pip', 
          lockFile: 'requirements.txt', 
          confidence: 0.8 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate basic structure
      expect(result.filename).toBe('fastapi-ci.yml');
      expect(result.type).toBe('ci');

      // Parse and validate YAML structure
      const workflow = yaml.parse(result.content);
      expect(workflow.name).toContain('FastAPI CI');
      expect(workflow.jobs.test).toBeDefined();

      // Validate FastAPI-specific features
      expect(result.content).toContain('TESTING: "true"');
      expect(result.content).toContain('uvicorn.run');
      expect(result.content).toContain('curl -f http://localhost:8000');
    });
  });

  describe('Python version matrix integration', () => {
    it('should generate matrix strategy with aggressive optimization', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
        frameworks: [{ 
          name: 'django', 
          confidence: 0.9, 
          evidence: ['manage.py'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'pip', 
          lockFile: 'requirements.txt', 
          confidence: 0.8 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult, { 
        optimizationLevel: 'aggressive' 
      });

      // Parse YAML and validate matrix
      const workflow = yaml.parse(result.content);
      expect(workflow.jobs.test.strategy.matrix['python-version']).toEqual([
        '3.8', '3.9', '3.10', '3.11', '3.12'
      ]);
    });

    it('should generate basic matrix strategy with standard optimization', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.10', confidence: 0.9 }],
        frameworks: [{ 
          name: 'flask', 
          confidence: 0.9, 
          evidence: ['app.py'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'pip', 
          lockFile: 'requirements.txt', 
          confidence: 0.8 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult, { 
        optimizationLevel: 'standard' 
      });

      // Parse YAML and validate matrix
      const workflow = yaml.parse(result.content);
      expect(workflow.jobs.test.strategy.matrix['python-version']).toEqual([
        '3.10', '3.11'
      ]);
    });
  });

  describe('Package manager integration', () => {
    it('should handle Pipenv package manager correctly', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.9', confidence: 0.9 }],
        frameworks: [{ 
          name: 'flask', 
          confidence: 0.9, 
          evidence: ['app.py'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'pipenv', 
          lockFile: 'Pipfile.lock', 
          confidence: 0.9 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.content).toContain('pipenv install --dev');
      expect(result.content).toContain('pipenv run');
      expect(result.metadata.optimizations).toContain('Pipenv virtual environment optimized');
    });

    it('should handle Conda package manager correctly', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.8', confidence: 0.9 }],
        frameworks: [{ 
          name: 'python', 
          confidence: 0.8, 
          evidence: ['*.py'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'conda', 
          lockFile: 'environment.yml', 
          confidence: 0.9 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.content).toContain('conda env');
      expect(result.filename).toBe('ci.yml'); // Generic Python
    });
  });

  describe('Testing framework integration', () => {
    it('should handle unittest framework', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.9', confidence: 0.9 }],
        frameworks: [{ 
          name: 'python', 
          confidence: 0.8, 
          evidence: ['*.py'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'pip', 
          lockFile: 'requirements.txt', 
          confidence: 0.8 
        }],
        testingFrameworks: [{ name: 'unittest', confidence: 0.9 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.content).toContain('python -m unittest discover');
    });
  });

  describe('Build tools integration', () => {
    it('should include linting and type checking when detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
        frameworks: [{ 
          name: 'fastapi', 
          confidence: 0.9, 
          evidence: ['main.py'], 
          category: 'backend' 
        }],
        packageManagers: [{ 
          name: 'poetry', 
          lockFile: 'poetry.lock', 
          confidence: 0.9 
        }],
        testingFrameworks: [{ name: 'pytest-cov', confidence: 0.8 }],
        buildTools: [
          { name: 'flake8', confidence: 0.8 },
          { name: 'mypy', confidence: 0.7 },
          { name: 'black', confidence: 0.6 }
        ]
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.content).toContain('poetry run python -m flake8');
      expect(result.content).toContain('poetry run python -m mypy');
      expect(result.metadata.optimizations).toContain('Type checking with mypy included');
      expect(result.metadata.optimizations).toContain('Code linting with flake8 included');
      expect(result.metadata.optimizations).toContain('Test coverage reporting enabled');
    });
  });

  describe('Error handling integration', () => {
    it('should handle missing Python language gracefully', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9 }],
        frameworks: [],
        packageManagers: [],
        testingFrameworks: [],
        buildTools: []
      };

      await expect(generator.generateWorkflow(detectionResult))
        .rejects.toThrow('No Python framework detected');
    });

    it('should handle generic Python project without specific framework', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.10', confidence: 0.9 }],
        frameworks: [], // No specific framework detected
        packageManagers: [{ 
          name: 'pip', 
          lockFile: 'requirements.txt', 
          confidence: 0.8 
        }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('ci.yml');
      expect(result.metadata.detectionSummary).toContain('Python python project');
    });
  });

  describe('Workflow validation', () => {
    it('should generate valid YAML for all framework types', async () => {
      const frameworks = ['django', 'flask', 'fastapi'];
      
      for (const framework of frameworks) {
        const detectionResult: DetectionResult = {
          languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
          frameworks: [{ 
            name: framework, 
            confidence: 0.9, 
            evidence: [`${framework} detected`], 
            category: 'backend' 
          }],
          packageManagers: [{ 
            name: 'pip', 
            lockFile: 'requirements.txt', 
            confidence: 0.8 
          }],
          testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
          buildTools: []
        };

        const result = await generator.generateWorkflow(detectionResult);
        
        // Should parse without throwing
        expect(() => yaml.parse(result.content)).not.toThrow();
        
        // Should have required GitHub Actions structure
        const workflow = yaml.parse(result.content);
        expect(workflow.name).toBeTruthy();
        expect(workflow.on).toBeTruthy();
        expect(workflow.jobs).toBeTruthy();
        expect(Object.keys(workflow.jobs).length).toBeGreaterThan(0);
      }
    });
  });
});