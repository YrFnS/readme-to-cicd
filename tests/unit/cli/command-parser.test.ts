/**
 * Unit Tests for CommandParser
 * 
 * Comprehensive test suite covering argument parsing, validation,
 * error handling, and help system functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from '../../../src/cli/lib/command-parser';
import { CLIOptions, WorkflowType } from '../../../src/cli/lib/types';

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe('Basic Command Parsing', () => {
    it('should parse generate command with default options', () => {
      const args = ['node', 'cli.js', 'generate'];
      const options = parser.parseArguments(args);

      expect(options.command).toBe('generate');
      expect(options.dryRun).toBe(false);
      expect(options.interactive).toBe(false);
      expect(options.verbose).toBe(false);
      expect(options.debug).toBe(false);
      expect(options.quiet).toBe(false);
    });

    it('should parse generate command with README path', () => {
      const args = ['node', 'cli.js', 'generate', './docs/README.md'];
      const options = parser.parseArguments(args);

      expect(options.command).toBe('generate');
      expect(options.readmePath).toBe('./docs/README.md');
    });

    it('should parse validate command', () => {
      const args = ['node', 'cli.js', 'validate'];
      const options = parser.parseArguments(args);

      expect(options.command).toBe('validate');
    });

    it('should parse init command', () => {
      const args = ['node', 'cli.js', 'init'];
      const options = parser.parseArguments(args);

      expect(options.command).toBe('init');
    });

    it('should parse export command', () => {
      const args = ['node', 'cli.js', 'export'];
      const options = parser.parseArguments(args);

      expect(options.command).toBe('export');
    });

    it('should parse import command', () => {
      const args = ['node', 'cli.js', 'import', 'config.json'];
      const options = parser.parseArguments(args);

      expect(options.command).toBe('import');
    });
  });

  describe('Generate Command Options', () => {
    it('should parse output directory option', () => {
      const args = ['node', 'cli.js', 'generate', '--output-dir', './workflows'];
      const options = parser.parseArguments(args);

      expect(options.outputDir).toBe('./workflows');
    });

    it('should parse output directory option with short flag', () => {
      const args = ['node', 'cli.js', 'generate', '-o', './custom'];
      const options = parser.parseArguments(args);

      expect(options.outputDir).toBe('./custom');
    });

    it('should parse single workflow type', () => {
      const args = ['node', 'cli.js', 'generate', '--workflow-type', 'ci'];
      const options = parser.parseArguments(args);

      expect(options.workflowType).toEqual(['ci']);
    });

    it('should parse multiple workflow types', () => {
      const args = ['node', 'cli.js', 'generate', '--workflow-type', 'ci', 'cd', 'release'];
      const options = parser.parseArguments(args);

      expect(options.workflowType).toEqual(['ci', 'cd', 'release']);
    });

    it('should parse workflow type with short flag', () => {
      const args = ['node', 'cli.js', 'generate', '-w', 'ci', 'cd'];
      const options = parser.parseArguments(args);

      expect(options.workflowType).toEqual(['ci', 'cd']);
    });

    it('should parse single framework override', () => {
      const args = ['node', 'cli.js', 'generate', '--framework', 'nodejs'];
      const options = parser.parseArguments(args);

      expect(options.framework).toEqual(['nodejs']);
    });

    it('should parse multiple framework overrides', () => {
      const args = ['node', 'cli.js', 'generate', '--framework', 'nodejs', 'react', 'typescript'];
      const options = parser.parseArguments(args);

      expect(options.framework).toEqual(['nodejs', 'react', 'typescript']);
    });

    it('should parse framework with short flag', () => {
      const args = ['node', 'cli.js', 'generate', '-f', 'python', 'django'];
      const options = parser.parseArguments(args);

      expect(options.framework).toEqual(['python', 'django']);
    });

    it('should parse dry-run flag', () => {
      const args = ['node', 'cli.js', 'generate', '--dry-run'];
      const options = parser.parseArguments(args);

      expect(options.dryRun).toBe(true);
    });
  });

  describe('Global Options', () => {
    it('should parse verbose flag', () => {
      const args = ['node', 'cli.js', 'generate', '--verbose'];
      const options = parser.parseArguments(args);

      expect(options.verbose).toBe(true);
    });

    it('should parse verbose flag with short option', () => {
      const args = ['node', 'cli.js', 'generate', '-v'];
      const options = parser.parseArguments(args);

      expect(options.verbose).toBe(true);
    });

    it('should parse debug flag', () => {
      const args = ['node', 'cli.js', 'generate', '--debug'];
      const options = parser.parseArguments(args);

      expect(options.debug).toBe(true);
    });

    it('should parse debug flag with short option', () => {
      const args = ['node', 'cli.js', 'generate', '-d'];
      const options = parser.parseArguments(args);

      expect(options.debug).toBe(true);
    });

    it('should parse quiet flag', () => {
      const args = ['node', 'cli.js', 'generate', '--quiet'];
      const options = parser.parseArguments(args);

      expect(options.quiet).toBe(true);
    });

    it('should parse quiet flag with short option', () => {
      const args = ['node', 'cli.js', 'generate', '-q'];
      const options = parser.parseArguments(args);

      expect(options.quiet).toBe(true);
    });

    it('should parse interactive flag', () => {
      const args = ['node', 'cli.js', 'generate', '--interactive'];
      const options = parser.parseArguments(args);

      expect(options.interactive).toBe(true);
    });

    it('should parse interactive flag with short option', () => {
      const args = ['node', 'cli.js', 'generate', '-i'];
      const options = parser.parseArguments(args);

      expect(options.interactive).toBe(true);
    });

    it('should parse config option', () => {
      const args = ['node', 'cli.js', 'generate', '--config', './custom-config.json'];
      const options = parser.parseArguments(args);

      expect(options.config).toBe('./custom-config.json');
    });

    it('should parse config option with short flag', () => {
      const args = ['node', 'cli.js', 'generate', '-c', './config.yaml'];
      const options = parser.parseArguments(args);

      expect(options.config).toBe('./config.yaml');
    });
  });

  describe('Complex Command Combinations', () => {
    it('should parse generate command with all options', () => {
      const args = [
        'node', 'cli.js', 'generate', './custom/README.md',
        '--output-dir', './custom-workflows',
        '--workflow-type', 'ci', 'cd',
        '--framework', 'nodejs', 'typescript',
        '--dry-run',
        '--interactive',
        '--verbose',
        '--config', './config.json'
      ];
      const options = parser.parseArguments(args);

      expect(options.command).toBe('generate');
      expect(options.readmePath).toBe('./custom/README.md');
      expect(options.outputDir).toBe('./custom-workflows');
      expect(options.workflowType).toEqual(['ci', 'cd']);
      expect(options.framework).toEqual(['nodejs', 'typescript']);
      expect(options.dryRun).toBe(true);
      expect(options.interactive).toBe(true);
      expect(options.verbose).toBe(true);
      expect(options.config).toBe('./config.json');
    });

    it('should parse validate command with options', () => {
      const args = [
        'node', 'cli.js', 'validate', '.github/workflows/ci.yml',
        '--update',
        '--debug'
      ];
      const options = parser.parseArguments(args);

      expect(options.command).toBe('validate');
      expect(options.debug).toBe(true);
    });

    it('should parse mixed short and long options', () => {
      const args = [
        'node', 'cli.js', 'generate',
        '-o', './workflows',
        '--workflow-type', 'ci',
        '-f', 'python',
        '--dry-run',
        '-v'
      ];
      const options = parser.parseArguments(args);

      expect(options.outputDir).toBe('./workflows');
      expect(options.workflowType).toEqual(['ci']);
      expect(options.framework).toEqual(['python']);
      expect(options.dryRun).toBe(true);
      expect(options.verbose).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should throw error for invalid command', () => {
      const args = ['node', 'cli.js', 'invalid-command'];
      
      expect(() => parser.parseArguments(args)).toThrow('Invalid command: invalid-command');
    });

    it('should throw error for invalid workflow type', () => {
      const args = ['node', 'cli.js', 'generate', '--workflow-type', 'invalid'];
      
      expect(() => parser.parseArguments(args)).toThrow();
    });

    it('should throw error for multiple invalid workflow types', () => {
      const args = ['node', 'cli.js', 'generate', '--workflow-type', 'invalid1', 'invalid2', 'ci'];
      
      expect(() => parser.parseArguments(args)).toThrow();
    });

    it('should throw error for mutually exclusive verbose and quiet options', () => {
      const args = ['node', 'cli.js', 'generate', '--verbose', '--quiet'];
      
      expect(() => parser.parseArguments(args)).toThrow('Options --verbose and --quiet are mutually exclusive');
    });

    it('should throw error for mutually exclusive debug and quiet options', () => {
      const args = ['node', 'cli.js', 'generate', '--debug', '--quiet'];
      
      expect(() => parser.parseArguments(args)).toThrow('Options --debug and --quiet are mutually exclusive');
    });

    it('should allow debug and verbose together (debug implies verbose)', () => {
      const args = ['node', 'cli.js', 'generate', '--debug', '--verbose'];
      const options = parser.parseArguments(args);

      expect(options.debug).toBe(true);
      expect(options.verbose).toBe(true);
    });
  });

  describe('Default Values', () => {
    it('should use default output directory', () => {
      const args = ['node', 'cli.js', 'generate'];
      const options = parser.parseArguments(args);

      expect(options.outputDir).toBe('.github/workflows');
    });

    it('should use default workflow types', () => {
      const args = ['node', 'cli.js', 'generate'];
      const options = parser.parseArguments(args);

      expect(options.workflowType).toEqual(['ci', 'cd']);
    });

    it('should have false defaults for boolean flags', () => {
      const args = ['node', 'cli.js', 'generate'];
      const options = parser.parseArguments(args);

      expect(options.dryRun).toBe(false);
      expect(options.interactive).toBe(false);
      expect(options.verbose).toBe(false);
      expect(options.debug).toBe(false);
      expect(options.quiet).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty workflow type array', () => {
      const args = ['node', 'cli.js', 'generate', '--workflow-type'];
      
      // This should be handled by commander's validation
      expect(() => parser.parseArguments(args)).toThrow();
    });

    it('should handle empty framework array', () => {
      const args = ['node', 'cli.js', 'generate', '--framework'];
      
      // This should be handled by commander's validation
      expect(() => parser.parseArguments(args)).toThrow();
    });

    it('should handle missing required argument for import command', () => {
      const args = ['node', 'cli.js', 'import'];
      
      expect(() => parser.parseArguments(args)).toThrow();
    });

    it('should handle special characters in paths', () => {
      const args = ['node', 'cli.js', 'generate', './path with spaces/README.md'];
      const options = parser.parseArguments(args);

      expect(options.readmePath).toBe('./path with spaces/README.md');
    });

    it('should handle absolute paths', () => {
      const args = ['node', 'cli.js', 'generate', '/absolute/path/README.md'];
      const options = parser.parseArguments(args);

      expect(options.readmePath).toBe('/absolute/path/README.md');
    });
  });

  describe('Help System', () => {
    it('should provide program instance for help access', () => {
      const program = parser.getProgram();
      
      expect(program).toBeDefined();
      expect(program.name()).toBe('readme-to-cicd');
      expect(program.description()).toContain('GitHub Actions CI/CD workflows');
    });

    it('should have help text configured', () => {
      const program = parser.getProgram();
      const helpText = program.helpInformation();
      
      expect(helpText).toContain('readme-to-cicd');
      expect(helpText).toContain('generate');
      expect(helpText).toContain('validate');
      // Note: Examples are added via addHelpText but may not appear in helpInformation()
      expect(helpText.length).toBeGreaterThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should create structured error for parsing failures', () => {
      const args = ['node', 'cli.js', 'generate', '--invalid-option'];
      
      expect(() => parser.parseArguments(args)).toThrow();
    });

    it('should handle commander parsing errors gracefully', () => {
      // Test with malformed arguments that commander would reject
      const args = ['node', 'cli.js', 'generate', '--workflow-type', '--another-option'];
      
      expect(() => parser.parseArguments(args)).toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should return properly typed CLIOptions', () => {
      const args = ['node', 'cli.js', 'generate'];
      const options = parser.parseArguments(args);

      // TypeScript compilation ensures these types are correct
      expect(typeof options.command).toBe('string');
      expect(typeof options.dryRun).toBe('boolean');
      expect(typeof options.interactive).toBe('boolean');
      expect(typeof options.verbose).toBe('boolean');
      expect(typeof options.debug).toBe('boolean');
      expect(typeof options.quiet).toBe('boolean');
    });

    it('should handle workflow types as proper enum values', () => {
      const args = ['node', 'cli.js', 'generate', '--workflow-type', 'ci', 'cd', 'release'];
      const options = parser.parseArguments(args);

      const validTypes: WorkflowType[] = ['ci', 'cd', 'release'];
      options.workflowType?.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });
  });
});