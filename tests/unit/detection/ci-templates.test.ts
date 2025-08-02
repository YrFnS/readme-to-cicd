import { describe, it, expect, beforeEach } from 'vitest';
import { CITemplateRegistry } from '../../../src/detection/templates/ci-templates';

describe('CITemplateRegistry', () => {
  let registry: CITemplateRegistry;

  beforeEach(() => {
    registry = new CITemplateRegistry();
  });

  describe('Template Registration', () => {
    it('should register and retrieve templates', () => {
      const template = {
        setup: [],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      registry.registerTemplate('test-framework', template);
      const retrieved = registry.getTemplate('test-framework');
      
      expect(retrieved).toEqual(template);
    });

    it('should handle case-insensitive template names', () => {
      const template = {
        setup: [],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      registry.registerTemplate('Test-Framework', template);
      
      expect(registry.getTemplate('test-framework')).toEqual(template);
      expect(registry.getTemplate('TEST-FRAMEWORK')).toEqual(template);
    });

    it('should return undefined for non-existent templates', () => {
      expect(registry.getTemplate('non-existent')).toBeUndefined();
    });
  });

  describe('Built-in Templates', () => {
    it('should have Node.js template', () => {
      const template = registry.getTemplate('nodejs');
      
      expect(template).toBeDefined();
      expect(template?.setup).toHaveLength(1);
      expect(template?.build).toHaveLength(2);
      expect(template?.test).toHaveLength(2);
      expect(template?.metadata.description).toContain('Node.js');
    });

    it('should have React template', () => {
      const template = registry.getTemplate('react');
      
      expect(template).toBeDefined();
      expect(template?.setup).toHaveLength(1);
      expect(template?.build).toHaveLength(2);
      expect(template?.test).toHaveLength(2);
      expect(template?.deploy).toHaveLength(1);
      expect(template?.metadata.description).toContain('React');
    });

    it('should have Python template', () => {
      const template = registry.getTemplate('python');
      
      expect(template).toBeDefined();
      expect(template?.setup).toHaveLength(1);
      expect(template?.build).toHaveLength(2);
      expect(template?.test).toHaveLength(2);
      expect(template?.metadata.description).toContain('Python');
    });

    it('should have Django template', () => {
      const template = registry.getTemplate('django');
      
      expect(template).toBeDefined();
      expect(template?.setup).toHaveLength(1);
      expect(template?.build).toHaveLength(3);
      expect(template?.test).toHaveLength(2);
      expect(template?.environment).toHaveLength(2);
      expect(template?.metadata.requiredSecrets).toContain('DJANGO_SECRET_KEY');
    });

    it('should have Rust template', () => {
      const template = registry.getTemplate('rust');
      
      expect(template).toBeDefined();
      expect(template?.setup).toHaveLength(1);
      expect(template?.build).toHaveLength(2);
      expect(template?.test).toHaveLength(3);
      expect(template?.metadata.description).toContain('Rust');
    });

    it('should have Go template', () => {
      const template = registry.getTemplate('go');
      
      expect(template).toBeDefined();
      expect(template?.setup).toHaveLength(1);
      expect(template?.build).toHaveLength(1);
      expect(template?.test).toHaveLength(2);
      expect(template?.metadata.description).toContain('Go');
    });

    it('should have Maven template', () => {
      const template = registry.getTemplate('maven');
      
      expect(template).toBeDefined();
      expect(template?.setup).toHaveLength(1);
      expect(template?.build).toHaveLength(2);
      expect(template?.test).toHaveLength(1);
      expect(template?.metadata.description).toContain('Maven');
    });

    it('should have Docker template', () => {
      const template = registry.getTemplate('docker');
      
      expect(template).toBeDefined();
      expect(template?.setup).toHaveLength(1);
      expect(template?.build).toHaveLength(1);
      expect(template?.test).toHaveLength(1);
      expect(template?.deploy).toHaveLength(2);
      expect(template?.metadata.requiredSecrets).toContain('DOCKER_USERNAME');
    });
  });

  describe('Template Structure Validation', () => {
    it('should have valid step templates with required fields', () => {
      const template = registry.getTemplate('nodejs');
      
      expect(template).toBeDefined();
      
      // Check setup steps
      template?.setup.forEach(step => {
        expect(step.id).toBeDefined();
        expect(step.name).toBeDefined();
        expect(step.variables).toBeDefined();
        expect(Array.isArray(step.variables)).toBe(true);
      });
      
      // Check build steps
      template?.build.forEach(step => {
        expect(step.id).toBeDefined();
        expect(step.name).toBeDefined();
        expect(step.variables).toBeDefined();
      });
    });

    it('should have valid metadata for all templates', () => {
      const templateNames = registry.getAvailableTemplates();
      
      templateNames.forEach(name => {
        const template = registry.getTemplate(name);
        expect(template?.metadata).toBeDefined();
        expect(template?.metadata.version).toBeDefined();
        expect(template?.metadata.description).toBeDefined();
        expect(Array.isArray(template?.metadata.requiredSecrets)).toBe(true);
        expect(typeof template?.metadata.estimatedDuration).toBe('number');
      });
    });
  });

  describe('Template Variables', () => {
    it('should include proper variables in Node.js template', () => {
      const template = registry.getTemplate('nodejs');
      
      const setupStep = template?.setup[0];
      expect(setupStep?.variables).toContain('nodeVersion');
      expect(setupStep?.variables).toContain('packageManager');
      
      const buildStep = template?.build[0];
      expect(buildStep?.variables).toContain('packageManager');
    });

    it('should include proper variables in Python template', () => {
      const template = registry.getTemplate('python');
      
      const setupStep = template?.setup[0];
      expect(setupStep?.variables).toContain('pythonVersion');
      
      const testStep = template?.test.find(step => step.id === 'run-pytest');
      expect(testStep?.variables).toContain('packageName');
    });

    it('should include proper variables in Docker template', () => {
      const template = registry.getTemplate('docker');
      
      const buildStep = template?.build[0];
      expect(buildStep?.variables).toContain('imageName');
      expect(buildStep?.variables).toContain('imageTag');
    });
  });

  describe('Available Templates', () => {
    it('should return list of all available templates', () => {
      const templates = registry.getAvailableTemplates();
      
      expect(templates).toContain('nodejs');
      expect(templates).toContain('react');
      expect(templates).toContain('python');
      expect(templates).toContain('django');
      expect(templates).toContain('rust');
      expect(templates).toContain('go');
      expect(templates).toContain('maven');
      expect(templates).toContain('docker');
      expect(templates.length).toBeGreaterThan(8);
    });
  });
});