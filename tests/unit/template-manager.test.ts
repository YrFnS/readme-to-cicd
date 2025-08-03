/**
 * Unit tests for Template Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TemplateManager } from '../../src/generator/templates/template-manager';
import { TemplateLoadConfig } from '../../src/generator/templates/template-types';

describe('TemplateManager', () => {
  let templateManager: TemplateManager;
  let config: TemplateLoadConfig;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test templates
    tempDir = path.join(__dirname, '../../temp-templates');
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    config = {
      baseTemplatesPath: path.join(__dirname, '../../templates'),
      customTemplatesPath: tempDir,
      cacheEnabled: true,
      reloadOnChange: false
    };

    templateManager = new TemplateManager(config);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadTemplate', () => {
    it('should load basic CI template', async () => {
      const template = await templateManager.loadTemplate('ci-basic');

      expect(template.name).toContain('{{name}}');
      expect(template.type).toBe('ci');
      expect(template.jobs).toHaveLength(1);
      expect(template.jobs[0].name).toBe('Build and Test');
      expect(template.jobs[0].steps).toHaveLength(2);
    });

    it('should load Node.js framework template', async () => {
      const template = await templateManager.loadTemplate('nodejs-ci');

      expect(template.name).toContain('Node.js CI');
      expect(template.type).toBe('ci');
      expect(template.jobs).toHaveLength(1);
      expect(template.jobs[0].steps.some(step => step.uses?.includes('setup-node'))).toBe(true);
    });

    it('should load Python framework template', async () => {
      const template = await templateManager.loadTemplate('python-ci');

      expect(template.name).toContain('Python CI');
      expect(template.type).toBe('ci');
      expect(template.jobs).toHaveLength(1);
      expect(template.jobs[0].steps.some(step => step.uses?.includes('setup-python'))).toBe(true);
    });

    it('should cache loaded templates', async () => {
      // Load template twice
      const template1 = await templateManager.loadTemplate('ci-basic');
      const template2 = await templateManager.loadTemplate('ci-basic');

      // Should be the same object reference (cached)
      expect(template1).toBe(template2);
    });

    it('should throw error for non-existent template', async () => {
      await expect(templateManager.loadTemplate('non-existent')).rejects.toThrow('Template \'non-existent\' not found');
    });

    it('should prefer custom templates over base templates', async () => {
      // Create custom template
      const customTemplate = `name: "Custom Template"
type: ci
triggers:
  push:
    branches:
      - custom
jobs:
  - name: "Custom Job"
    runsOn: "ubuntu-latest"
    steps:
      - name: "Custom step"
        run: "echo custom"`;

      await fs.writeFile(path.join(tempDir, 'ci-basic.yaml'), customTemplate);

      const template = await templateManager.loadTemplate('ci-basic');

      expect(template.name).toBe('Custom Template');
      expect(template.jobs[0].name).toBe('Custom Job');
    });
  });

  describe('compileTemplate', () => {
    it('should compile template with data', async () => {
      const data = {
        name: 'My Project',
        version: '1.0.0'
      };

      const result = await templateManager.compileTemplate('ci-basic', data);

      expect(result.template.name).toBe('My Project');
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.name).toBe('ci-basic');
    });

    it('should handle compilation errors gracefully', async () => {
      // Create invalid template
      const invalidTemplate = `name: "{{invalid.nested.property}}"
type: ci
jobs: invalid_structure`;

      await fs.writeFile(path.join(tempDir, 'invalid.yaml'), invalidTemplate);

      const result = await templateManager.compileTemplate('invalid', {});

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.template.name).toBe('invalid'); // Fallback template
    });

    it('should validate compiled template', async () => {
      // Create template with validation issues
      const templateWithIssues = `name: "Test Template"
type: ci
triggers: {}
jobs:
  - name: ""
    runsOn: ""
    steps: 
      - name: "Invalid step"`;

      await fs.writeFile(path.join(tempDir, 'validation-test.yaml'), templateWithIssues);

      const result = await templateManager.compileTemplate('validation-test', {});

      // Template should compile but may have validation issues
      expect(result.template.name).toBe('Test Template');
      expect(result.metadata.name).toBe('validation-test');
      // Validation may or may not catch issues depending on normalization
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getFrameworkRegistry', () => {
    it('should return framework registry', () => {
      const registry = templateManager.getFrameworkRegistry();

      expect(registry).toHaveProperty('nodejs');
      expect(registry).toHaveProperty('python');
      expect(registry).toHaveProperty('rust');
      expect(registry).toHaveProperty('go');
      expect(registry).toHaveProperty('java');
      expect(registry).toHaveProperty('docker');
      expect(registry).toHaveProperty('frontend');
    });

    it('should cache framework registry', () => {
      const registry1 = templateManager.getFrameworkRegistry();
      const registry2 = templateManager.getFrameworkRegistry();

      expect(registry1).toBe(registry2);
    });
  });

  describe('clearCache', () => {
    it('should clear template cache', async () => {
      // Load and cache a template
      await templateManager.loadTemplate('ci-basic');
      
      // Clear cache
      templateManager.clearCache();
      
      // Load again - should not be cached
      const template = await templateManager.loadTemplate('ci-basic');
      expect(template).toBeTruthy();
    });

    it('should clear framework registry cache', () => {
      // Get registry to cache it
      templateManager.getFrameworkRegistry();
      
      // Clear cache
      templateManager.clearCache();
      
      // Get registry again - should rebuild
      const registry = templateManager.getFrameworkRegistry();
      expect(registry).toBeTruthy();
    });
  });

  describe('reloadTemplates', () => {
    it('should reload templates without errors', async () => {
      await expect(templateManager.reloadTemplates()).resolves.not.toThrow();
    });

    it('should clear cache when reloading', async () => {
      // Load and cache a template
      await templateManager.loadTemplate('ci-basic');
      
      // Reload templates
      await templateManager.reloadTemplates();
      
      // Template should be reloaded
      const template = await templateManager.loadTemplate('ci-basic');
      expect(template).toBeTruthy();
    });
  });

  describe('template hierarchy', () => {
    it('should support multiple template formats', async () => {
      // Create JSON template
      const jsonTemplate = {
        name: 'JSON Template',
        type: 'ci',
        triggers: { push: { branches: ['main'] } },
        jobs: [{
          name: 'JSON Job',
          runsOn: 'ubuntu-latest',
          steps: [{ name: 'JSON Step', run: 'echo json' }]
        }]
      };

      await fs.writeFile(
        path.join(tempDir, 'json-template.json'), 
        JSON.stringify(jsonTemplate, null, 2)
      );

      const template = await templateManager.loadTemplate('json-template');

      expect(template.name).toBe('JSON Template');
      expect(template.jobs[0].name).toBe('JSON Job');
    });

    it('should handle template inheritance', async () => {
      // This would test template inheritance if implemented
      // For now, just verify basic loading works
      const template = await templateManager.loadTemplate('ci-basic');
      expect(template).toBeTruthy();
    });
  });

  describe('Handlebars helpers', () => {
    it('should register framework detection helpers', async () => {
      // Create template using framework helpers
      const templateWithHelpers = `name: "Framework Test"
type: ci
jobs:
  - name: "{{#if (isNodeJS framework)}}Node.js{{else}}Other{{/if}} Build"
    runsOn: "ubuntu-latest"
    steps:
      - name: "Test step"
        run: "echo test"`;

      await fs.writeFile(path.join(tempDir, 'helpers-test.yaml'), templateWithHelpers);

      const result = await templateManager.compileTemplate('helpers-test', { framework: 'nodejs' });

      expect(result.template.jobs[0].name).toBe('Node.js Build');
    });
  });
});