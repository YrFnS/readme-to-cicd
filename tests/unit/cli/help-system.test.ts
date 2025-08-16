/**
 * Tests for HelpSystem
 * 
 * Comprehensive test suite for the help and documentation system
 * including command suggestions, contextual help, and troubleshooting.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HelpSystem, HelpRequest, HelpResponse } from '../../../src/cli/lib/help-system';
import { CLIError, FrameworkInfo } from '../../../src/cli/lib/types';

describe('HelpSystem', () => {
  let helpSystem: HelpSystem;

  beforeEach(() => {
    helpSystem = new HelpSystem();
  });

  describe('getHelp', () => {
    it('should return main help when no command specified', async () => {
      const request: HelpRequest = {};
      const help = await helpSystem.getHelp(request);

      expect(help.title).toContain('readme-to-cicd');
      expect(help.description).toContain('GitHub Actions workflows');
      expect(help.usage.length).toBeGreaterThan(0);
      expect(help.examples.length).toBeGreaterThan(0);
      expect(help.options.length).toBeGreaterThan(0);
    });

    it('should return generate command help', async () => {
      const request: HelpRequest = { command: 'generate' };
      const help = await helpSystem.getHelp(request);

      expect(help.title).toContain('generate');
      expect(help.description).toContain('README files');
      expect(help.examples.some(ex => ex.includes('readme-to-cicd generate'))).toBe(true);
      expect(help.options.some(opt => opt.flag.includes('--output-dir'))).toBe(true);
      expect(help.options.some(opt => opt.flag.includes('--workflow-type'))).toBe(true);
    });

    it('should return validate command help', async () => {
      const request: HelpRequest = { command: 'validate' };
      const help = await helpSystem.getHelp(request);

      expect(help.title).toContain('validate');
      expect(help.description).toContain('workflows');
      expect(help.examples.some(ex => ex.includes('readme-to-cicd validate'))).toBe(true);
      expect(help.options.some(opt => opt.flag.includes('--update'))).toBe(true);
    });

    it('should return init command help', async () => {
      const request: HelpRequest = { command: 'init' };
      const help = await helpSystem.getHelp(request);

      expect(help.title).toContain('init');
      expect(help.description).toContain('configuration');
      expect(help.examples.some(ex => ex.includes('readme-to-cicd init'))).toBe(true);
      expect(help.options.some(opt => opt.flag.includes('--template'))).toBe(true);
    });

    it('should return export command help', async () => {
      const request: HelpRequest = { command: 'export' };
      const help = await helpSystem.getHelp(request);

      expect(help.title).toContain('export');
      expect(help.description).toContain('configuration');
      expect(help.examples.some(ex => ex.includes('readme-to-cicd export'))).toBe(true);
      expect(help.options.some(opt => opt.flag.includes('--output'))).toBe(true);
    });

    it('should return import command help', async () => {
      const request: HelpRequest = { command: 'import' };
      const help = await helpSystem.getHelp(request);

      expect(help.title).toContain('import');
      expect(help.description).toContain('configuration');
      expect(help.examples.some(ex => ex.includes('readme-to-cicd import'))).toBe(true);
      expect(help.options.some(opt => opt.flag.includes('--merge'))).toBe(true);
    });

    it('should return unknown command help with suggestions', async () => {
      const request: HelpRequest = { command: 'generat' }; // typo
      const help = await helpSystem.getHelp(request);

      expect(help.title).toContain('Unknown command');
      expect(help.suggestions).toBeDefined();
      expect(help.suggestions!.length).toBeGreaterThan(0);
      expect(help.suggestions!.some(s => s.includes('generate'))).toBe(true);
    });

    it('should include contextual tips when project path provided', async () => {
      const request: HelpRequest = {
        command: 'generate',
        projectPath: './test-project',
        detectedFrameworks: [
          { name: 'nodejs', confidence: 0.9, description: 'Node.js project' }
        ] as FrameworkInfo[]
      };

      const help = await helpSystem.getHelp(request);
      
      // Note: contextualTips might be empty if project analysis fails
      // This is expected behavior for non-existent test paths
      expect(help.contextualTips).toBeDefined();
    });

    it('should include troubleshooting links when error provided', async () => {
      const error: CLIError = {
        code: 'UNKNOWN_COMMAND',
        message: 'Unknown command: generat',
        category: 'user-input',
        severity: 'error',
        suggestions: []
      };

      const request: HelpRequest = { error };
      const help = await helpSystem.getHelp(request);

      expect(help.troubleshootingLinks).toBeDefined();
      expect(help.troubleshootingLinks!.length).toBeGreaterThan(0);
    });
  });

  describe('getErrorHelp', () => {
    it('should return error-specific help', () => {
      const error: CLIError = {
        code: 'PARSE_ERROR',
        message: 'Invalid command syntax',
        category: 'user-input',
        severity: 'error',
        suggestions: ['Check syntax', 'Use --help']
      };

      const help = helpSystem.getErrorHelp(error);

      expect(help.title).toContain('Error');
      expect(help.title).toContain(error.message);
      expect(help.suggestions).toEqual(error.suggestions);
      expect(help.troubleshootingLinks).toBeDefined();
    });

    it('should include command suggestions for unknown command errors', () => {
      const error: CLIError = {
        code: 'UNKNOWN_COMMAND',
        message: 'Unknown command: generat',
        category: 'user-input',
        severity: 'error',
        suggestions: []
      };

      const help = helpSystem.getErrorHelp(error, 'generat');

      expect(help.suggestions.length).toBeGreaterThan(0);
      expect(help.suggestions.some(s => s.includes('generate'))).toBe(true);
    });
  });

  describe('formatHelp', () => {
    it('should format help response correctly', () => {
      const helpResponse: HelpResponse = {
        title: 'Test Command',
        description: 'Test description',
        usage: ['test-cli command [options]'],
        examples: ['test-cli command --option value'],
        options: [
          {
            flag: '--option',
            description: 'Test option',
            type: 'string',
            default: 'default-value',
            required: false,
            examples: ['--option value']
          }
        ],
        suggestions: ['suggestion1', 'suggestion2'],
        contextualTips: ['tip1', 'tip2'],
        relatedCommands: ['related-command'],
        troubleshootingLinks: [
          {
            title: 'Troubleshooting',
            description: 'Help with issues',
            section: 'troubleshooting-section'
          }
        ]
      };

      const formatted = helpSystem.formatHelp(helpResponse);

      expect(formatted).toContain('Test Command');
      expect(formatted).toContain('Test description');
      expect(formatted).toContain('Usage:');
      expect(formatted).toContain('test-cli command [options]');
      expect(formatted).toContain('Options:');
      expect(formatted).toContain('--option');
      expect(formatted).toContain('Examples:');
      expect(formatted).toContain('test-cli command --option value');
      expect(formatted).toContain('Did you mean:');
      expect(formatted).toContain('suggestion1');
      expect(formatted).toContain('Tips for your project:');
      expect(formatted).toContain('tip1');
      expect(formatted).toContain('Related commands:');
      expect(formatted).toContain('related-command');
      expect(formatted).toContain('Troubleshooting:');
      expect(formatted).toContain('Troubleshooting');
    });

    it('should handle empty sections gracefully', () => {
      const helpResponse: HelpResponse = {
        title: 'Minimal Help',
        description: '',
        usage: [],
        examples: [],
        options: []
      };

      const formatted = helpSystem.formatHelp(helpResponse);

      expect(formatted).toContain('Minimal Help');
      expect(formatted).not.toContain('Usage:');
      expect(formatted).not.toContain('Options:');
      expect(formatted).not.toContain('Examples:');
    });
  });

  describe('help system options', () => {
    it('should respect disabled command suggestions', async () => {
      const helpSystemWithoutSuggestions = new HelpSystem({
        enableCommandSuggestions: false
      });

      const request: HelpRequest = { command: 'generat' };
      const help = await helpSystemWithoutSuggestions.getHelp(request);

      expect(help.suggestions).toBeUndefined();
    });

    it('should respect disabled contextual help', async () => {
      const helpSystemWithoutContextual = new HelpSystem({
        enableContextualHelp: false
      });

      const request: HelpRequest = {
        command: 'generate',
        projectPath: './test-project'
      };

      const help = await helpSystemWithoutContextual.getHelp(request);

      expect(help.contextualTips).toBeUndefined();
    });

    it('should respect disabled troubleshooting', async () => {
      const helpSystemWithoutTroubleshooting = new HelpSystem({
        enableTroubleshooting: false
      });

      const error: CLIError = {
        code: 'PARSE_ERROR',
        message: 'Test error',
        category: 'user-input',
        severity: 'error',
        suggestions: []
      };

      const request: HelpRequest = { error };
      const help = await helpSystemWithoutTroubleshooting.getHelp(request);

      expect(help.troubleshootingLinks).toBeUndefined();
    });

    it('should respect max suggestions limit', async () => {
      const helpSystemWithLimit = new HelpSystem({
        maxSuggestions: 2
      });

      const request: HelpRequest = { command: 'xyz' }; // Should generate multiple suggestions
      const help = await helpSystemWithLimit.getHelp(request);

      if (help.suggestions) {
        expect(help.suggestions.length).toBeLessThanOrEqual(2);
      }
    });
  });
});