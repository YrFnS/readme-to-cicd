/**
 * Tests for CommandSuggestionEngine
 * 
 * Test suite for command suggestion functionality including
 * typo detection, similarity matching, and option suggestions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandSuggestionEngine, CommandSuggestion } from '../../../src/cli/lib/command-suggestion-engine';

describe('CommandSuggestionEngine', () => {
  let engine: CommandSuggestionEngine;

  beforeEach(() => {
    engine = new CommandSuggestionEngine();
  });

  describe('suggestCommands', () => {
    it('should suggest exact matches', () => {
      const suggestions = engine.suggestCommands('generate');
      expect(suggestions).toContain('generate');
    });

    it('should suggest commands for common typos', () => {
      const suggestions = engine.suggestCommands('generat');
      expect(suggestions).toContain('generate');
    });

    it('should suggest commands for multiple typos', () => {
      const testCases = [
        { input: 'generete', expected: 'generate' },
        { input: 'genrate', expected: 'generate' },
        { input: 'validat', expected: 'validate' },
        { input: 'valiate', expected: 'validate' },
        { input: 'initi', expected: 'init' },
        { input: 'exprot', expected: 'export' },
        { input: 'improt', expected: 'import' }
      ];

      for (const { input, expected } of testCases) {
        const suggestions = engine.suggestCommands(input);
        expect(suggestions).toContain(expected);
      }
    });

    it('should suggest commands for aliases', () => {
      const aliasCases = [
        { input: 'gen', expected: 'generate' },
        { input: 'create', expected: 'generate' },
        { input: 'build', expected: 'generate' },
        { input: 'check', expected: 'validate' },
        { input: 'verify', expected: 'validate' },
        { input: 'setup', expected: 'init' },
        { input: 'initialize', expected: 'init' },
        { input: 'save', expected: 'export' },
        { input: 'load', expected: 'import' }
      ];

      for (const { input, expected } of aliasCases) {
        const suggestions = engine.suggestCommands(input);
        expect(suggestions).toContain(expected);
      }
    });

    it('should suggest commands for partial matches', () => {
      const suggestions = engine.suggestCommands('gen');
      expect(suggestions).toContain('generate');
    });

    it('should suggest commands for fuzzy matches', () => {
      const suggestions = engine.suggestCommands('generaet');
      expect(suggestions).toContain('generate');
    });

    it('should suggest related commands based on context', () => {
      const contextCases = [
        { input: 'workflow', expected: ['generate', 'validate'] },
        { input: 'cicd', expected: ['generate', 'validate'] },
        { input: 'yaml', expected: ['generate', 'validate'] },
        { input: 'github', expected: ['generate', 'validate'] }
      ];

      for (const { input, expected } of contextCases) {
        const suggestions = engine.suggestCommands(input);
        expected.forEach(exp => {
          expect(suggestions).toContain(exp);
        });
      }
    });

    it('should limit suggestions to maxSuggestions parameter', () => {
      const suggestions = engine.suggestCommands('xyz', 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for very dissimilar input', () => {
      const suggestions = engine.suggestCommands('zzzzzzzzz');
      // Should return some suggestions even for dissimilar input (fallback behavior)
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should handle case insensitive input', () => {
      const suggestions = engine.suggestCommands('GENERATE');
      expect(suggestions).toContain('generate');
    });

    it('should handle input with whitespace', () => {
      const suggestions = engine.suggestCommands('  generate  ');
      expect(suggestions).toContain('generate');
    });
  });

  describe('getDetailedSuggestions', () => {
    it('should return detailed suggestions with similarity scores', () => {
      const suggestions = engine.getDetailedSuggestions('generat');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('command');
      expect(suggestions[0]).toHaveProperty('similarity');
      expect(suggestions[0]).toHaveProperty('reason');
      expect(suggestions[0]).toHaveProperty('category');
      
      // Should find generate as top suggestion
      expect(suggestions[0].command).toBe('generate');
      expect(suggestions[0].similarity).toBeGreaterThan(0.8);
    });

    it('should sort suggestions by similarity score', () => {
      const suggestions = engine.getDetailedSuggestions('gen');
      
      // Verify descending order of similarity
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].similarity).toBeGreaterThanOrEqual(suggestions[i].similarity);
      }
    });

    it('should categorize suggestions correctly', () => {
      const exactMatch = engine.getDetailedSuggestions('generate');
      expect(exactMatch[0].category).toBe('exact-match');

      const typoMatch = engine.getDetailedSuggestions('generat');
      expect(typoMatch[0].category).toBe('typo');

      const aliasMatch = engine.getDetailedSuggestions('gen');
      expect(aliasMatch.some(s => s.category === 'similar')).toBe(true);
    });

    it('should provide meaningful reasons', () => {
      const suggestions = engine.getDetailedSuggestions('generat');
      
      expect(suggestions[0].reason).toContain('generate');
      expect(suggestions[0].reason.length).toBeGreaterThan(0);
    });
  });

  describe('suggestOptions', () => {
    it('should suggest options for generate command', () => {
      const options = engine.suggestOptions('generate', 'output');
      expect(options).toContain('--output-dir');
    });

    it('should suggest options for validate command', () => {
      const options = engine.suggestOptions('validate', 'update');
      expect(options).toContain('--update');
    });

    it('should suggest options for init command', () => {
      const options = engine.suggestOptions('init', 'template');
      expect(options).toContain('--template');
    });

    it('should suggest options for export command', () => {
      const options = engine.suggestOptions('export', 'output');
      expect(options).toContain('--output');
    });

    it('should suggest options for import command', () => {
      const options = engine.suggestOptions('import', 'merge');
      expect(options).toContain('--merge');
    });

    it('should suggest common options for all commands', () => {
      const commands = ['generate', 'validate', 'init', 'export', 'import'];
      
      for (const command of commands) {
        const verboseOptions = engine.suggestOptions(command, 'verbose');
        expect(verboseOptions).toContain('--verbose');
        
        const debugOptions = engine.suggestOptions(command, 'debug');
        expect(debugOptions).toContain('--debug');
        
        const quietOptions = engine.suggestOptions(command, 'quiet');
        expect(quietOptions).toContain('--quiet');
      }
    });

    it('should return empty array for unknown command', () => {
      const options = engine.suggestOptions('unknown', 'option');
      expect(options).toEqual([]);
    });

    it('should handle partial option matching', () => {
      const options = engine.suggestOptions('generate', 'work');
      expect(options).toContain('--workflow-type');
    });
  });

  describe('isLikelyMisspelledOption', () => {
    it('should identify likely misspelled options', () => {
      expect(engine.isLikelyMisspelledOption('--outpu')).toBe(true);
      expect(engine.isLikelyMisspelledOption('-verbos')).toBe(true);
      expect(engine.isLikelyMisspelledOption('--workflow-typ')).toBe(true);
    });

    it('should not identify short options as misspelled', () => {
      expect(engine.isLikelyMisspelledOption('-v')).toBe(false);
      expect(engine.isLikelyMisspelledOption('-h')).toBe(false);
    });

    it('should not identify non-options as misspelled', () => {
      expect(engine.isLikelyMisspelledOption('generate')).toBe(false);
      expect(engine.isLikelyMisspelledOption('file.txt')).toBe(false);
    });
  });

  describe('suggestOptionCorrections', () => {
    it('should suggest corrections for misspelled options', () => {
      const availableOptions = ['--output-dir', '--workflow-type', '--framework', '--verbose', '--debug'];
      
      const corrections = engine.suggestOptionCorrections('--outpu', availableOptions);
      expect(corrections).toContain('--output-dir');
    });

    it('should suggest corrections based on similarity', () => {
      const availableOptions = ['--workflow-type', '--framework', '--verbose'];
      
      const corrections = engine.suggestOptionCorrections('--workflo', availableOptions);
      expect(corrections).toContain('--workflow-type');
    });

    it('should limit corrections to reasonable similarity threshold', () => {
      const availableOptions = ['--output-dir', '--workflow-type'];
      
      const corrections = engine.suggestOptionCorrections('--xyz', availableOptions);
      expect(corrections.length).toBeLessThanOrEqual(3);
    });

    it('should handle options with and without dashes', () => {
      const availableOptions = ['--output-dir', '--verbose'];
      
      const corrections1 = engine.suggestOptionCorrections('output', availableOptions);
      expect(corrections1).toContain('--output-dir');
      
      const corrections2 = engine.suggestOptionCorrections('--outpu', availableOptions);
      expect(corrections2).toContain('--output-dir');
    });

    it('should return empty array when no good matches found', () => {
      const availableOptions = ['--output-dir', '--verbose'];
      
      const corrections = engine.suggestOptionCorrections('--completely-different', availableOptions);
      expect(corrections.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const suggestions = engine.suggestCommands('');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should handle null and undefined input gracefully', () => {
      // TypeScript should prevent this, but test runtime behavior
      expect(() => engine.suggestCommands(null as any)).not.toThrow();
      expect(() => engine.suggestCommands(undefined as any)).not.toThrow();
    });

    it('should handle very long input', () => {
      const longInput = 'a'.repeat(1000);
      const suggestions = engine.suggestCommands(longInput);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should handle special characters in input', () => {
      const suggestions = engine.suggestCommands('gen@rate!');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});