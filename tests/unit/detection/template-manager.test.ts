import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateManager } from '../../../src/detection/templates/template-manager';
import { CITemplate } from '../../../src/detection/interfaces/detection-rules';

describe('TemplateManager', () => {
  let templateManager: TemplateManager;

  beforeEach(() => {
    templateManager = new TemplateManager();
  });

  describe('Variable Substitution', () => {
    it('should substitute simple variables in template strings', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'setup-node',
            name: 'Setup Node.js {{ nodeVersion }}',
            command: '{{ packageManager }} install',
            variables: ['nodeVersion', 'packageManager']
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = {
        nodeVersion: '18',
        packageManager: 'npm'
      };

      const rendered = templateManager.renderTemplate(template, variables);
      
      expect(rendered.setup[0].name).toBe('Setup Node.js 18');
      expect(rendered.setup[0].command).toBe('npm install');
    });

    it('should substitute variables in with parameters', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'setup-action',
            name: 'Setup Action',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '{{ nodeVersion }}',
              'cache': '{{ packageManager }}'
            },
            variables: ['nodeVersion', 'packageManager']
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = {
        nodeVersion: '18',
        packageManager: 'yarn'
      };

      const rendered = templateManager.renderTemplate(template, variables);
      
      expect(rendered.setup[0].with?.['node-version']).toBe('18');
      expect(rendered.setup[0].with?.['cache']).toBe('yarn');
    });

    it('should substitute variables in environment variables', () => {
      const template: CITemplate = {
        setup: [],
        build: [],
        test: [],
        environment: [
          {
            name: 'NODE_ENV',
            value: '{{ environment }}',
            required: true,
            description: 'Node environment'
          }
        ],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = {
        environment: 'production'
      };

      const rendered = templateManager.renderTemplate(template, variables);
      
      expect(rendered.environment?.[0].value).toBe('production');
    });

    it('should handle variables with whitespace', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'test-step',
            name: 'Test {{  spaced  }} variable',
            command: '{{spaced}} command',
            variables: ['spaced']
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = {
        spaced: 'value'
      };

      const rendered = templateManager.renderTemplate(template, variables);
      
      expect(rendered.setup[0].name).toBe('Test value variable');
      expect(rendered.setup[0].command).toBe('value command');
    });

    it('should leave unmatched variables unchanged', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'test-step',
            name: 'Test {{ unknownVar }} variable',
            variables: []
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = {
        knownVar: 'value'
      };

      const rendered = templateManager.renderTemplate(template, variables);
      
      expect(rendered.setup[0].name).toBe('Test {{ unknownVar }} variable');
    });
  });

  describe('Variable Extraction', () => {
    it('should extract variables from template strings', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'setup-step',
            name: 'Setup {{ framework }} with {{ version }}',
            command: '{{ packageManager }} install',
            variables: []
          }
        ],
        build: [
          {
            id: 'build-step',
            name: 'Build project',
            with: {
              'input': '{{ buildInput }}',
              'output': '{{ buildOutput }}'
            },
            variables: []
          }
        ],
        test: [],
        environment: [
          {
            name: 'ENV_VAR',
            value: '{{ envValue }}',
            required: true
          }
        ],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = templateManager.extractTemplateVariables(template);
      
      expect(variables).toContain('framework');
      expect(variables).toContain('version');
      expect(variables).toContain('packageManager');
      expect(variables).toContain('buildInput');
      expect(variables).toContain('buildOutput');
      expect(variables).toContain('envValue');
      expect(variables).toHaveLength(6);
    });

    it('should handle duplicate variables', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'step1',
            name: 'Step with {{ var }}',
            command: '{{ var }} command',
            variables: []
          },
          {
            id: 'step2',
            name: 'Another {{ var }} step',
            variables: []
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = templateManager.extractTemplateVariables(template);
      
      expect(variables).toContain('var');
      expect(variables).toHaveLength(1);
    });
  });

  describe('Template Validation', () => {
    it('should validate template with all required variables provided', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'setup-step',
            name: 'Setup {{ framework }}',
            command: '{{ packageManager }} install',
            variables: []
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = {
        framework: 'React',
        packageManager: 'npm'
      };

      const validation = templateManager.validateTemplate(template, variables);
      
      expect(validation.isValid).toBe(true);
      expect(validation.missingVariables).toHaveLength(0);
      expect(validation.unusedVariables).toHaveLength(0);
    });

    it('should detect missing variables', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'setup-step',
            name: 'Setup {{ framework }}',
            command: '{{ packageManager }} install',
            variables: []
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = {
        framework: 'React'
        // Missing packageManager
      };

      const validation = templateManager.validateTemplate(template, variables);
      
      expect(validation.isValid).toBe(false);
      expect(validation.missingVariables).toContain('packageManager');
      expect(validation.unusedVariables).toHaveLength(0);
    });

    it('should detect unused variables', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'setup-step',
            name: 'Setup {{ framework }}',
            variables: []
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Test template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      };

      const variables = {
        framework: 'React',
        unusedVar: 'value'
      };

      const validation = templateManager.validateTemplate(template, variables);
      
      expect(validation.isValid).toBe(true);
      expect(validation.missingVariables).toHaveLength(0);
      expect(validation.unusedVariables).toContain('unusedVar');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates', () => {
      const template: CITemplate = {
        setup: [],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Empty template',
          requiredSecrets: [],
          estimatedDuration: 0
        }
      };

      const rendered = templateManager.renderTemplate(template, {});
      
      expect(rendered.setup).toHaveLength(0);
      expect(rendered.build).toHaveLength(0);
      expect(rendered.test).toHaveLength(0);
    });

    it('should handle templates with no variables', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'static-step',
            name: 'Static step name',
            command: 'static command',
            variables: []
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Static template',
          requiredSecrets: [],
          estimatedDuration: 1
        }
      };

      const rendered = templateManager.renderTemplate(template, {});
      
      expect(rendered.setup[0].name).toBe('Static step name');
      expect(rendered.setup[0].command).toBe('static command');
    });

    it('should handle malformed variable syntax', () => {
      const template: CITemplate = {
        setup: [
          {
            id: 'malformed-step',
            name: 'Step with { single brace } and {{ double }}',
            variables: []
          }
        ],
        build: [],
        test: [],
        metadata: {
          version: '1.0.0',
          description: 'Malformed template',
          requiredSecrets: [],
          estimatedDuration: 1
        }
      };

      const variables = {
        double: 'replaced'
      };

      const rendered = templateManager.renderTemplate(template, variables);
      
      expect(rendered.setup[0].name).toBe('Step with { single brace } and replaced');
    });
  });
});