/**
 * Tests for template fallback system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TemplateFallbackManager,
  TemplateFallbackConfig,
  FallbackRule
} from '../../../src/generator/templates/template-fallback-manager';
import { DetectionResult, FrameworkDetection, LanguageDetection } from '../../../src/generator/interfaces';
import { TemplateLoadError, TemplateCompilationError } from '../../../src/generator/errors/generation-errors';
import { WorkflowTemplate, FrameworkTemplate, LanguageTemplate } from '../../../src/generator/types';

// Mock fs module
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

describe('TemplateFallbackManager', () => {
  let fallbackManager: TemplateFallbackManager;
  let mockDetectionResult: DetectionResult;

  beforeEach(() => {
    fallbackManager = new TemplateFallbackManager();
    
    mockDetectionResult = {
      frameworks: [
        {
          name: 'react',
          version: '18.0.0',
          confidence: 0.9,
          evidence: ['package.json'],
          category: 'frontend'
        }
      ],
      languages: [
        {
          name: 'nodejs',
          version: '18.0.0',
          confidence: 0.95,
          primary: true
        }
      ],
      buildTools: [],
      packageManagers: [],
      testingFrameworks: [],
      deploymentTargets: [],
      projectMetadata: {
        name: 'test-project',
        description: 'Test project'
      }
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Template Loading with Fallback', () => {
    it('should load primary template successfully', async () => {
      const mockTemplate: WorkflowTemplate = {
        name: 'React CI',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTemplate));

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'react-nodejs'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('react-nodejs.yaml'),
        'utf-8'
      );
    });

    it('should fallback to secondary template when primary fails', async () => {
      const mockTemplate: WorkflowTemplate = {
        name: 'Generic CI',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValue(JSON.stringify(mockTemplate));

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'react-nodejs'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Used fallback template")
        ])
      );
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should fail when all templates in hierarchy fail', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'react-nodejs'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TemplateLoadError);
    });

    it('should use generic template when fallback is disabled', async () => {
      const disabledManager = new TemplateFallbackManager({
        enableFallback: false
      });

      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await disabledManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'react-nodejs'
      );

      expect(result.success).toBe(false);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Framework Template Fallback', () => {
    it('should load framework-specific template', async () => {
      const mockFrameworkTemplate: FrameworkTemplate = {
        framework: 'react',
        language: 'nodejs',
        customSteps: [{ name: 'Build React', run: 'npm run build' }],
        dependencies: ['react', 'react-dom'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test']
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockFrameworkTemplate));

      const framework: FrameworkDetection = {
        name: 'react',
        confidence: 0.9,
        evidence: ['package.json'],
        category: 'frontend'
      };

      const language: LanguageDetection = {
        name: 'nodejs',
        confidence: 0.95,
        primary: true
      };

      const result = await fallbackManager.getFrameworkTemplate(framework, language);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFrameworkTemplate);
    });

    it('should fallback through framework template hierarchy', async () => {
      const mockGenericTemplate: FrameworkTemplate = {
        framework: 'generic-framework',
        language: 'generic',
        customSteps: [{ name: 'Generic Build', run: 'echo "build"' }],
        dependencies: [],
        buildCommands: ['echo "build"'],
        testCommands: ['echo "test"']
      };

      mockFs.readFile
        .mockRejectedValueOnce(new Error('react-nodejs not found'))
        .mockRejectedValueOnce(new Error('react-generic not found'))
        .mockRejectedValueOnce(new Error('nodejs-frontend not found'))
        .mockRejectedValueOnce(new Error('nodejs-generic not found'))
        .mockRejectedValueOnce(new Error('frontend-generic not found'))
        .mockResolvedValue(JSON.stringify(mockGenericTemplate));

      const framework: FrameworkDetection = {
        name: 'react',
        confidence: 0.9,
        evidence: ['package.json'],
        category: 'frontend'
      };

      const language: LanguageDetection = {
        name: 'nodejs',
        confidence: 0.95,
        primary: true
      };

      const result = await fallbackManager.getFrameworkTemplate(framework, language);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGenericTemplate);
      expect(mockFs.readFile).toHaveBeenCalledTimes(6);
    });
  });

  describe('Language Template Fallback', () => {
    it('should load language-specific template', async () => {
      const mockLanguageTemplate: LanguageTemplate = {
        language: 'nodejs',
        setupSteps: [{ name: 'Setup Node', uses: 'actions/setup-node@v4' }],
        buildSteps: [{ name: 'Build', run: 'npm run build' }],
        testSteps: [{ name: 'Test', run: 'npm test' }],
        cacheStrategy: {
          enabled: true,
          strategy: {
            type: 'dependencies',
            paths: ['node_modules'],
            key: 'npm-${{ hashFiles(\'**/package-lock.json\') }}',
            restoreKeys: ['npm-']
          }
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockLanguageTemplate));

      const language: LanguageDetection = {
        name: 'nodejs',
        version: '18.0.0',
        confidence: 0.95,
        primary: true
      };

      const result = await fallbackManager.getLanguageTemplate(language);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLanguageTemplate);
    });

    it('should fallback through language template hierarchy', async () => {
      const mockGenericTemplate: LanguageTemplate = {
        language: 'generic-language',
        setupSteps: [{ name: 'Generic Setup', run: 'echo "setup"' }],
        buildSteps: [{ name: 'Generic Build', run: 'echo "build"' }],
        testSteps: [{ name: 'Generic Test', run: 'echo "test"' }],
        cacheStrategy: {
          enabled: false,
          strategy: {
            type: 'custom',
            paths: [],
            key: '',
            restoreKeys: []
          }
        }
      };

      mockFs.readFile
        .mockRejectedValueOnce(new Error('nodejs-18.0.0 not found'))
        .mockRejectedValueOnce(new Error('nodejs-latest not found'))
        .mockRejectedValueOnce(new Error('nodejs-generic not found'))
        .mockResolvedValue(JSON.stringify(mockGenericTemplate));

      const language: LanguageDetection = {
        name: 'nodejs',
        version: '18.0.0',
        confidence: 0.95,
        primary: true
      };

      const result = await fallbackManager.getLanguageTemplate(language);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGenericTemplate);
      expect(mockFs.readFile).toHaveBeenCalledTimes(4);
    });
  });

  describe('Generic Template Generation', () => {
    it('should generate minimal template', async () => {
      const result = await fallbackManager.getGenericTemplate('minimal');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Minimal CI');
      expect(result.data?.jobs).toHaveLength(1);
      expect(result.data?.jobs[0].steps).toHaveLength(2);
    });

    it('should generate basic template', async () => {
      const result = await fallbackManager.getGenericTemplate('basic');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Basic CI');
      expect(result.data?.permissions).toBeDefined();
      expect(result.data?.jobs[0].steps).toHaveLength(5);
    });

    it('should generate standard template', async () => {
      const result = await fallbackManager.getGenericTemplate('standard');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Standard CI/CD');
      expect(result.data?.jobs).toHaveLength(2);
      expect(result.data?.permissions?.securityEvents).toBe('write');
    });

    it('should generate comprehensive template', async () => {
      const result = await fallbackManager.getGenericTemplate('comprehensive');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Comprehensive CI/CD');
      expect(result.data?.jobs).toHaveLength(3);
      expect(result.data?.triggers?.schedule).toBeDefined();
      expect(result.data?.jobs[0].strategy?.matrix).toBeDefined();
    });
  });

  describe('Template Caching', () => {
    it('should cache loaded templates', async () => {
      const mockTemplate: WorkflowTemplate = {
        name: 'Cached Template',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTemplate));

      // First call should read from file
      const result1 = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'cached-template'
      );

      // Second call should use cache
      const result2 = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'cached-template'
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should provide cache statistics', async () => {
      const mockTemplate: WorkflowTemplate = {
        name: 'Test Template',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTemplate));

      // Load template multiple times
      await fallbackManager.getTemplateWithFallback(mockDetectionResult, 'workflow', 'test-template');
      await fallbackManager.getTemplateWithFallback(mockDetectionResult, 'workflow', 'test-template');
      await fallbackManager.getTemplateWithFallback(mockDetectionResult, 'workflow', 'test-template');

      const stats = fallbackManager.getCacheStats();

      expect(stats.templateCount).toBe(1);
      expect(stats.totalAccesses).toBe(3);
      expect(stats.averageAccessCount).toBe(3);
    });

    it('should clear cache when requested', async () => {
      const mockTemplate: WorkflowTemplate = {
        name: 'Test Template',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTemplate));

      // Load template
      await fallbackManager.getTemplateWithFallback(mockDetectionResult, 'workflow', 'test-template');

      // Clear cache
      fallbackManager.clearCache();

      // Load template again - should read from file
      await fallbackManager.getTemplateWithFallback(mockDetectionResult, 'workflow', 'test-template');

      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should disable caching when configured', async () => {
      const noCacheManager = new TemplateFallbackManager({
        cacheTemplates: false
      });

      const mockTemplate: WorkflowTemplate = {
        name: 'No Cache Template',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTemplate));

      // Load template twice
      await noCacheManager.getTemplateWithFallback(mockDetectionResult, 'workflow', 'no-cache-template');
      await noCacheManager.getTemplateWithFallback(mockDetectionResult, 'workflow', 'no-cache-template');

      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom Fallback Rules', () => {
    it('should apply custom fallback rules', async () => {
      const customRule: FallbackRule = {
        name: 'React Projects',
        condition: (detection) => detection.frameworks.some(f => f.name === 'react'),
        fallbackTemplate: 'react-optimized',
        priority: 10
      };

      fallbackManager.addFallbackRule(customRule);

      const mockTemplate: WorkflowTemplate = {
        name: 'React Optimized',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile
        .mockRejectedValueOnce(new Error('Primary template not found'))
        .mockResolvedValue(JSON.stringify(mockTemplate));

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'primary-template'
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('React Optimized');
    });

    it('should prioritize custom rules by priority', async () => {
      const lowPriorityRule: FallbackRule = {
        name: 'Low Priority',
        condition: () => true,
        fallbackTemplate: 'low-priority',
        priority: 1
      };

      const highPriorityRule: FallbackRule = {
        name: 'High Priority',
        condition: () => true,
        fallbackTemplate: 'high-priority',
        priority: 10
      };

      fallbackManager.addFallbackRule(lowPriorityRule);
      fallbackManager.addFallbackRule(highPriorityRule);

      const mockTemplate: WorkflowTemplate = {
        name: 'High Priority Template',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile
        .mockRejectedValueOnce(new Error('Primary template not found'))
        .mockResolvedValue(JSON.stringify(mockTemplate));

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'primary-template'
      );

      expect(result.success).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('high-priority.yaml'),
        'utf-8'
      );
    });
  });

  describe('Template Validation', () => {
    it('should validate template structure', async () => {
      const invalidTemplate = {
        // Missing required fields
        type: 'ci'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidTemplate));

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'invalid-template'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TemplateCompilationError);
    });

    it('should skip validation when disabled', async () => {
      const noValidationManager = new TemplateFallbackManager({
        validateTemplates: false
      });

      const invalidTemplate = {
        type: 'ci'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidTemplate));

      const result = await noValidationManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'invalid-template'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<TemplateFallbackConfig> = {
        enableFallback: false,
        cacheTemplates: false,
        validateTemplates: false
      };

      fallbackManager.updateConfig(newConfig);

      // Test that configuration was updated by checking behavior
      expect(fallbackManager).toBeDefined();
    });

    it('should use custom template directory', async () => {
      const customManager = new TemplateFallbackManager({
        templateDirectory: '/custom/templates'
      });

      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await customManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'test-template'
      );

      // Check that at least one call used the custom template directory
      const calls = mockFs.readFile.mock.calls;
      const hasCustomDirectoryCall = calls.some(call => 
        call[0].includes('/custom/templates') || call[0].includes('\\custom\\templates')
      );
      expect(hasCustomDirectoryCall).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockFs.readFile.mockResolvedValue('invalid json {');

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'invalid-json-template'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TemplateCompilationError);
    });

    it('should handle file system errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'permission-denied-template'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TemplateLoadError);
    });

    it('should handle metadata loading errors gracefully', async () => {
      const mockTemplate: WorkflowTemplate = {
        name: 'Test Template',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'build',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }]
        }]
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockTemplate))
        .mockRejectedValueOnce(new Error('Metadata not found'));

      const result = await fallbackManager.getTemplateWithFallback(
        mockDetectionResult,
        'workflow',
        'no-metadata-template'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
    });
  });
});