/**
 * CLI User Experience Tests
 * 
 * Focused testing of user experience aspects including:
 * - Interactive prompts and user input handling
 * - Error messages and help system
 * - Command suggestions and typo correction
 * - Contextual help and guidance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLIApplication } from '../src/cli/lib/cli-application';
import { HelpSystem } from '../src/cli/lib/help-system';
import { CommandSuggestionEngine } from '../src/cli/lib/command-suggestion-engine';
import { ContextualHelpProvider } from '../src/cli/lib/contextual-help-provider';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('CLI User Experience Tests', () => {
  let cliApp: CLIApplication;
  let helpSystem: HelpSystem;
  let suggestionEngine: CommandSuggestionEngine;
  let contextualHelp: ContextualHelpProvider;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-ux-test-'));
    
    cliApp = new CLIApplication();
    helpSystem = new HelpSystem();
    suggestionEngine = new CommandSuggestionEngine();
    contextualHelp = new ContextualHelpProvider();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Interactive Prompts and User Input', () => {
    it('should handle framework confirmation prompts correctly', async () => {
      const mockFrameworks = [
        { name: 'Node.js', confidence: 0.9, evidence: ['package.json', 'npm scripts'] },
        { name: 'TypeScript', confidence: 0.8, evidence: ['tsconfig.json', '.ts files'] },
        { name: 'React', confidence: 0.7, evidence: ['react dependency', 'JSX syntax'] }
      ];

      // Test automatic confirmation for high-confidence frameworks
      const highConfidenceResult = await promptHandler.confirmFrameworks(mockFrameworks, {
        autoConfirmThreshold: 0.85,
        interactive: false
      });

      expect(highConfidenceResult.confirmed).toContain('Node.js');
      expect(highConfidenceResult.confirmed).not.toContain('React'); // Below threshold

      // Test interactive confirmation
      const interactiveResult = await promptHandler.confirmFrameworks(mockFrameworks, {
        interactive: true,
        simulatedInput: ['y', 'y', 'n'] // Confirm Node.js and TypeScript, decline React
      });

      expect(interactiveResult.confirmed).toContain('Node.js');
      expect(interactiveResult.confirmed).toContain('TypeScript');
      expect(interactiveResult.confirmed).not.toContain('React');
    });

    it('should handle workflow type selection prompts', async () => {
      const availableWorkflows = [
        { type: 'ci', description: 'Continuous Integration - Run tests on every push' },
        { type: 'cd', description: 'Continuous Deployment - Deploy to staging/production' },
        { type: 'release', description: 'Release Management - Create releases and publish packages' },
        { type: 'security', description: 'Security Scanning - Automated security checks' }
      ];

      const result = await promptHandler.selectWorkflowTypes(availableWorkflows, {
        interactive: true,
        simulatedInput: ['ci', 'cd'] // Select CI and CD workflows
      });

      expect(result.selected).toContain('ci');
      expect(result.selected).toContain('cd');
      expect(result.selected).not.toContain('release');
      expect(result.selected).not.toContain('security');
    });

    it('should handle conflict resolution prompts', async () => {
      const conflicts = [
        {
          type: 'multiple-package-managers',
          description: 'Both npm and yarn detected',
          options: [
            { value: 'npm', description: 'Use npm (package.json scripts detected)' },
            { value: 'yarn', description: 'Use yarn (yarn.lock file found)' }
          ]
        },
        {
          type: 'framework-version-conflict',
          description: 'Multiple React versions detected',
          options: [
            { value: 'react-18', description: 'Use React 18 (latest)' },
            { value: 'react-17', description: 'Use React 17 (legacy)' }
          ]
        }
      ];

      const result = await promptHandler.resolveConflicts(conflicts, {
        interactive: true,
        simulatedInput: ['npm', 'react-18']
      });

      expect(result.resolutions['multiple-package-managers']).toBe('npm');
      expect(result.resolutions['framework-version-conflict']).toBe('react-18');
    });

    it('should provide clear progress feedback during interactive operations', async () => {
      const projectDir = path.join(tempDir, 'interactive-progress');
      await fs.mkdir(projectDir, { recursive: true });

      const readmeContent = `# Interactive Progress Test

## Installation
\`\`\`bash
npm install
\`\`\`

## Build
\`\`\`bash
npm run build
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);

      const progressMessages: string[] = [];
      
      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--interactive',
        '--dry-run'
      ], {
        onProgress: (message: string) => progressMessages.push(message),
        simulatedInput: ['y', 'ci,cd', 'y']
      });

      expect(result.success).toBe(true);
      expect(progressMessages.length).toBeGreaterThan(0);
      
      // Should include meaningful progress messages
      expect(progressMessages.some(msg => msg.includes('Analyzing'))).toBe(true);
      expect(progressMessages.some(msg => msg.includes('Detecting'))).toBe(true);
      expect(progressMessages.some(msg => msg.includes('Generating'))).toBe(true);
    });

    it('should handle user cancellation gracefully', async () => {
      const projectDir = path.join(tempDir, 'cancellation-test');
      await fs.mkdir(projectDir, { recursive: true });
      await fs.writeFile(path.join(projectDir, 'README.md'), '# Cancellation Test');

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--interactive'
      ], {
        simulatedInput: ['n'] // Cancel at first prompt
      });

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(result.errors.some(e => e.message.includes('cancelled'))).toBe(true);
    });
  });

  describe('Error Messages and Help System', () => {
    it('should provide clear and actionable error messages', async () => {
      const errorScenarios = [
        {
          name: 'File not found',
          command: ['generate', '--readme-path', '/nonexistent/file.md'],
          expectedErrorType: 'FileNotFoundError',
          expectedSuggestions: ['check path', 'create file']
        },
        {
          name: 'Invalid configuration',
          command: ['generate', '--config', path.join(tempDir, 'invalid.json')],
          expectedErrorType: 'ConfigurationError',
          expectedSuggestions: ['validate config', 'use init']
        },
        {
          name: 'Permission denied',
          command: ['generate', '--output-dir', '/root/restricted'],
          expectedErrorType: 'PermissionError',
          expectedSuggestions: ['check permissions', 'use different directory']
        }
      ];

      // Create invalid config file
      await fs.writeFile(path.join(tempDir, 'invalid.json'), '{ invalid json }');

      for (const scenario of errorScenarios) {
        const result = await cliApp.execute(scenario.command);

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        const error = result.errors[0];
        expect(error.type).toBe(scenario.expectedErrorType);
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(10); // Should be descriptive

        // Should provide actionable suggestions
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions.length).toBeGreaterThan(0);
        
        for (const expectedSuggestion of scenario.expectedSuggestions) {
          expect(result.suggestions.some(s => 
            s.toLowerCase().includes(expectedSuggestion.toLowerCase())
          )).toBe(true);
        }
      }
    });

    it('should provide comprehensive help documentation', async () => {
      const helpTopics = [
        { command: ['--help'], expectedSections: ['Usage', 'Commands', 'Options', 'Examples'] },
        { command: ['generate', '--help'], expectedSections: ['Description', 'Usage', 'Options', 'Examples'] },
        { command: ['validate', '--help'], expectedSections: ['Description', 'Usage', 'Options'] },
        { command: ['init', '--help'], expectedSections: ['Description', 'Usage', 'Options'] }
      ];

      for (const topic of helpTopics) {
        const result = await cliApp.execute(topic.command);

        expect(result.success).toBe(true);
        expect(result.helpText).toBeDefined();
        expect(result.helpText.length).toBeGreaterThan(100); // Should be comprehensive

        for (const section of topic.expectedSections) {
          expect(result.helpText.toLowerCase().includes(section.toLowerCase())).toBe(true);
        }
      }
    });

    it('should provide contextual help based on project state', async () => {
      const scenarios = [
        {
          name: 'Empty directory',
          setup: async (dir: string) => {
            // Empty directory - no setup needed
          },
          expectedHelp: ['init command', 'create README', 'getting started']
        },
        {
          name: 'README exists, no workflows',
          setup: async (dir: string) => {
            await fs.writeFile(path.join(dir, 'README.md'), '# Test Project');
          },
          expectedHelp: ['generate command', 'workflow types', 'configuration']
        },
        {
          name: 'Workflows exist',
          setup: async (dir: string) => {
            await fs.writeFile(path.join(dir, 'README.md'), '# Test Project');
            const workflowDir = path.join(dir, '.github', 'workflows');
            await fs.mkdir(workflowDir, { recursive: true });
            await fs.writeFile(path.join(workflowDir, 'ci.yml'), 'name: CI\non: [push]');
          },
          expectedHelp: ['validate command', 'update workflows', 'export config']
        }
      ];

      for (const scenario of scenarios) {
        const projectDir = path.join(tempDir, scenario.name.replace(/\s+/g, '-'));
        await fs.mkdir(projectDir, { recursive: true });
        await scenario.setup(projectDir);

        const result = await contextualHelp.getContextualHelp(projectDir);

        expect(result.suggestions).toBeDefined();
        expect(result.suggestions.length).toBeGreaterThan(0);

        for (const expectedHelpItem of scenario.expectedHelp) {
          expect(result.suggestions.some(s => 
            s.toLowerCase().includes(expectedHelpItem.toLowerCase())
          )).toBe(true);
        }
      }
    });

    it('should format help text for optimal readability', async () => {
      const result = await cliApp.execute(['--help']);

      expect(result.success).toBe(true);
      expect(result.helpText).toBeDefined();

      // Should have proper formatting
      const lines = result.helpText.split('\n');
      
      // Should have reasonable line lengths (not too long)
      const longLines = lines.filter(line => line.length > 100);
      expect(longLines.length).toBeLessThan(lines.length * 0.1); // Less than 10% of lines should be very long

      // Should have proper indentation for options
      const optionLines = lines.filter(line => line.trim().startsWith('-'));
      expect(optionLines.length).toBeGreaterThan(0);
      expect(optionLines.every(line => line.startsWith('  '))).toBe(true); // Should be indented

      // Should include examples
      expect(result.helpText.toLowerCase().includes('example')).toBe(true);
    });
  });

  describe('Command Suggestions and Typo Correction', () => {
    it('should suggest correct commands for typos', async () => {
      const typoTests = [
        { input: 'generat', expected: 'generate', maxDistance: 2 },
        { input: 'validat', expected: 'validate', maxDistance: 2 },
        { input: 'initi', expected: 'init', maxDistance: 2 },
        { input: 'exprt', expected: 'export', maxDistance: 2 },
        { input: 'imprt', expected: 'import', maxDistance: 2 },
        { input: 'hlp', expected: 'help', maxDistance: 2 },
        { input: 'versio', expected: 'version', maxDistance: 2 }
      ];

      for (const test of typoTests) {
        const suggestions = suggestionEngine.suggestCommands(test.input);

        expect(suggestions).toBeDefined();
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0].command).toBe(test.expected);
        expect(suggestions[0].distance).toBeLessThanOrEqual(test.maxDistance);
      }
    });

    it('should suggest correct options for typos', async () => {
      const optionTypoTests = [
        { input: '--verbos', expected: '--verbose' },
        { input: '--quie', expected: '--quiet' },
        { input: '--dry-ru', expected: '--dry-run' },
        { input: '--outpu-dir', expected: '--output-dir' },
        { input: '--readm-path', expected: '--readme-path' },
        { input: '--confi', expected: '--config' }
      ];

      for (const test of optionTypoTests) {
        const suggestions = suggestionEngine.suggestOptions(test.input);

        expect(suggestions).toBeDefined();
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0].option).toBe(test.expected);
      }
    });

    it('should provide suggestions when no exact match is found', async () => {
      const result = await cliApp.execute(['unknowncommand']);

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Should suggest similar commands
      expect(result.suggestions.some(s => s.includes('generate'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('validate'))).toBe(true);
    });

    it('should handle partial command completion', async () => {
      const partialCommands = ['gen', 'val', 'ini', 'exp', 'imp'];

      for (const partial of partialCommands) {
        const suggestions = suggestionEngine.completeCommand(partial);

        expect(suggestions).toBeDefined();
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.every(s => s.startsWith(partial))).toBe(true);
      }
    });

    it('should rank suggestions by relevance and frequency', async () => {
      // Test with a common typo that could match multiple commands
      const suggestions = suggestionEngine.suggestCommands('gen');

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);

      // 'generate' should be ranked higher than other matches due to frequency
      expect(suggestions[0].command).toBe('generate');
      
      // Suggestions should be sorted by score (best first)
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].score).toBeLessThanOrEqual(suggestions[i - 1].score);
      }
    });
  });

  describe('User Guidance and Onboarding', () => {
    it('should provide guided setup for new users', async () => {
      const newUserDir = path.join(tempDir, 'new-user');
      await fs.mkdir(newUserDir, { recursive: true });

      const result = await cliApp.execute([
        'init',
        '--project-dir', newUserDir,
        '--guided'
      ], {
        simulatedInput: [
          'My New Project', // Project name
          'A test project for CLI', // Description
          'Node.js', // Primary language
          'y', // Include CI workflow
          'y', // Include CD workflow
          'n', // Skip security scanning for now
          'y' // Confirm setup
        ]
      });

      expect(result.success).toBe(true);
      expect(result.guidedSetup).toBeDefined();
      expect(result.guidedSetup.completed).toBe(true);

      // Should create appropriate files
      const configExists = await fs.access(path.join(newUserDir, '.readme-to-cicd.json')).then(() => true).catch(() => false);
      expect(configExists).toBe(true);

      const readmeExists = await fs.access(path.join(newUserDir, 'README.md')).then(() => true).catch(() => false);
      expect(readmeExists).toBe(true);
    });

    it('should provide tips and best practices during operation', async () => {
      const projectDir = path.join(tempDir, 'tips-test');
      await fs.mkdir(projectDir, { recursive: true });

      const basicReadme = `# Basic Project

## Build
\`\`\`bash
npm run build
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), basicReadme);

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--tips',
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      expect(result.tips).toBeDefined();
      expect(result.tips.length).toBeGreaterThan(0);

      // Should provide relevant tips
      const tipCategories = ['security', 'performance', 'best-practices', 'documentation'];
      const providedTips = result.tips.map(tip => tip.category);
      
      expect(tipCategories.some(category => providedTips.includes(category))).toBe(true);
    });

    it('should adapt guidance based on user experience level', async () => {
      const experienceLevels = ['beginner', 'intermediate', 'advanced'];

      for (const level of experienceLevels) {
        const result = await helpSystem.getHelpForLevel(level);

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();

        if (level === 'beginner') {
          expect(result.content.includes('Getting Started')).toBe(true);
          expect(result.content.includes('Basic Concepts')).toBe(true);
        } else if (level === 'advanced') {
          expect(result.content.includes('Advanced Configuration')).toBe(true);
          expect(result.content.includes('Customization')).toBe(true);
        }
      }
    });

    it('should provide troubleshooting guidance for common issues', async () => {
      const commonIssues = [
        'no-readme-found',
        'no-frameworks-detected',
        'permission-denied',
        'invalid-configuration',
        'workflow-validation-failed'
      ];

      for (const issue of commonIssues) {
        const guidance = await helpSystem.getTroubleshootingGuidance(issue);

        expect(guidance).toBeDefined();
        expect(guidance.problem).toBeDefined();
        expect(guidance.solutions).toBeDefined();
        expect(guidance.solutions.length).toBeGreaterThan(0);
        expect(guidance.preventionTips).toBeDefined();

        // Each solution should be actionable
        guidance.solutions.forEach(solution => {
          expect(solution.steps).toBeDefined();
          expect(solution.steps.length).toBeGreaterThan(0);
        });
      }
    });
  });
});