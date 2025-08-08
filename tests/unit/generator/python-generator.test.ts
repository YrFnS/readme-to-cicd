import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PythonWorkflowGenerator } from '../../../src/generator/templates/python-generator';
import { DetectionResult } from '../../../src/generator/interfaces';
import { TemplateManager } from '../../../src/generator/templates/template-manager';

describe('PythonWorkflowGenerator', () => {
  let generator: PythonWorkflowGenerator;
  let mockTemplateManager: TemplateManager;

  beforeEach(() => {
    mockTemplateManager = {
      compileTemplate: vi.fn().mockResolvedValue({
        template: {
          name: 'Test Workflow',
          triggers: { push: { branches: ['main'] } },
          jobs: [{
            name: 'test',
            runsOn: 'ubuntu-latest',
            strategy: {
              matrix: {
                'python-version': ['{{pythonVersions}}']
              }
            },
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v4' },
              { name: 'Setup Python', uses: 'actions/setup-python@v4', with: { 'python-version': '{{pythonVersion}}' } },
              { name: 'Install', run: '{{installCommand}}' },
              { name: 'Test', run: '{{testCommand}}' }
            ]
          }]
        },
        errors: [],
        warnings: []
      })
    } as any;
    
    generator = new PythonWorkflowGenerator(mockTemplateManager);
  });

  describe('Django workflow generation', () => {
    it('should generate Django workflow with migrations and testing', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
        frameworks: [{ name: 'django', confidence: 0.9, evidence: ['manage.py'], category: 'backend' }],
        packageManagers: [{ name: 'pip', lockFile: 'requirements.txt', confidence: 0.8 }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('django-ci.yml');
      expect(result.content).toContain('python-version');
      expect(result.content).toContain('pip install');
      expect(result.metadata.detectionSummary).toContain('django');
    });
  });

  describe('Flask workflow generation', () => {
    it('should generate Flask workflow with WSGI setup', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.10', confidence: 0.9 }],
        frameworks: [{ name: 'flask', confidence: 0.9, evidence: ['app.py'], category: 'backend' }],
        packageManagers: [{ name: 'pip', lockFile: 'requirements.txt', confidence: 0.8 }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('flask-ci.yml');
      expect(result.content).toContain('python-version');
      expect(result.metadata.detectionSummary).toContain('flask');
    });
  });

  describe('FastAPI workflow generation', () => {
    it('should generate FastAPI workflow with async considerations', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
        frameworks: [{ name: 'fastapi', confidence: 0.9, evidence: ['main.py'], category: 'backend' }],
        packageManagers: [{ name: 'pip', lockFile: 'requirements.txt', confidence: 0.8 }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('fastapi-ci.yml');
      expect(result.content).toContain('python-version');
      expect(result.metadata.detectionSummary).toContain('fastapi');
    });
  });

  describe('Python version matrix', () => {
    it('should generate matrix strategy for multiple Python versions', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
        frameworks: [{ name: 'django', confidence: 0.9, evidence: ['manage.py'], category: 'backend' }],
        packageManagers: [{ name: 'pip', lockFile: 'requirements.txt', confidence: 0.8 }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'aggressive' });

      expect(result.content).toContain('matrix');
      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple Python versions');
    });
  });

  describe('Virtual environment setup', () => {
    it('should include virtual environment setup for all frameworks', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.10', confidence: 0.9 }],
        frameworks: [{ name: 'flask', confidence: 0.9, evidence: ['app.py'], category: 'backend' }],
        packageManagers: [{ name: 'pip', lockFile: 'requirements.txt', confidence: 0.8 }],
        testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
        buildTools: []
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Virtual environment setup and caching');
      expect(result.filename).toBe('flask-ci.yml');
    });
  });
});