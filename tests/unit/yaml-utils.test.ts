/**
 * Unit tests for YAML utilities
 */

import { describe, it, expect } from 'vitest';
import { YAMLUtils } from '../../src/generator/utils/yaml-utils';

describe('YAMLUtils', () => {
  describe('normalizeIndentation', () => {
    it('should normalize 2-space indentation to 4-space', () => {
      const yaml = 'name: Test\non:\n  push:\n    branches:\n      - main';
      
      const result = YAMLUtils.normalizeIndentation(yaml, 4);

      expect(result).toContain('on:\n    push:\n        branches:\n            - main');
    });

    it('should handle mixed indentation', () => {
      const yaml = 'name: Test\non:\n   push:\n  branches:\n    - main';
      
      const result = YAMLUtils.normalizeIndentation(yaml, 2);

      expect(result).toContain('on:\n  push:\n  branches:\n    - main');
    });

    it('should preserve empty lines', () => {
      const yaml = 'name: Test\n\non:\n  push:';
      
      const result = YAMLUtils.normalizeIndentation(yaml, 2);

      expect(result).toContain('name: Test\n\non:\n  push:');
    });

    it('should handle zero indentation', () => {
      const yaml = 'name: Test\non: push';
      
      const result = YAMLUtils.normalizeIndentation(yaml, 2);

      expect(result).toBe('name: Test\non: push');
    });
  });

  describe('addBlankLines', () => {
    it('should add blank lines after top-level keys', () => {
      const yaml = 'name: Test\non:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest';
      
      const result = YAMLUtils.addBlankLines(yaml);

      expect(result).toContain('name: Test\n\non:');
      expect(result).toContain('push:\n\njobs:');
    });

    it('should add blank lines between jobs', () => {
      const yaml = 'jobs:\n  test:\n    runs-on: ubuntu-latest\n  build:\n    runs-on: ubuntu-latest';
      
      const result = YAMLUtils.addBlankLines(yaml);

      expect(result).toContain('jobs:\n\n  test:');
    });

    it('should not add excessive blank lines', () => {
      const yaml = 'name: Test\non:\n  push:';
      
      const result = YAMLUtils.addBlankLines(yaml);

      expect(result).not.toContain('\n\n\n');
    });
  });

  describe('removeExcessiveBlankLines', () => {
    it('should remove multiple consecutive blank lines', () => {
      const yaml = 'name: Test\n\n\n\non:\n  push:';
      
      const result = YAMLUtils.removeExcessiveBlankLines(yaml);

      expect(result).toContain('name: Test\n\non:');
      expect(result).not.toContain('\n\n\n');
    });

    it('should remove leading blank lines', () => {
      const yaml = '\n\n\nname: Test\non:\n  push:';
      
      const result = YAMLUtils.removeExcessiveBlankLines(yaml);

      expect(result).toMatch(/^name: Test/);
    });

    it('should ensure single trailing newline', () => {
      const yaml = 'name: Test\non:\n  push:\n\n\n';
      
      const result = YAMLUtils.removeExcessiveBlankLines(yaml);

      expect(result).toMatch(/push:\n$/);
    });
  });

  describe('validateSyntax', () => {
    it('should validate correct YAML', () => {
      const yaml = 'name: Test\non:\n  push:\n    branches:\n      - main';
      
      const result = YAMLUtils.validateSyntax(yaml);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect syntax errors', () => {
      const yaml = 'name: Test\non:\n  push:\n    branches\n      - main\n    invalid: [unclosed'; // Invalid YAML with unclosed bracket
      
      const result = YAMLUtils.validateSyntax(yaml);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should provide line and column information for errors', () => {
      const yaml = 'name: Test\non:\n  push:\n    branches\n      - main\n    invalid: [unclosed';
      
      const result = YAMLUtils.validateSyntax(yaml);

      expect(result.isValid).toBe(false);
      expect(result.line).toBeDefined();
    });

    it('should handle empty YAML', () => {
      const yaml = '';
      
      const result = YAMLUtils.validateSyntax(yaml);

      expect(result.isValid).toBe(true);
    });
  });

  describe('formatYAML', () => {
    it('should format YAML with specified indentation', () => {
      const yaml = 'name: Test\non:\n push:\n  branches:\n   - main';
      
      const result = YAMLUtils.formatYAML(yaml, { indent: 4 });

      expect(result).toContain('on:\n    push:');
    });

    it('should sort keys when requested', () => {
      const yaml = 'on:\n  push:\nname: Test';
      
      const result = YAMLUtils.formatYAML(yaml, { sortKeys: true });

      expect(result.indexOf('name:')).toBeLessThan(result.indexOf('on:'));
    });

    it('should respect line width', () => {
      const yaml = 'name: This is a very long workflow name that should be wrapped';
      
      const result = YAMLUtils.formatYAML(yaml, { lineWidth: 40 });

      // Should not exceed line width significantly
      const lines = result.split('\n');
      const longLines = lines.filter(line => line.length > 50);
      expect(longLines.length).toBe(0);
    });

    it('should add blank lines when requested', () => {
      const yaml = 'name: Test\non:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest';
      
      const result = YAMLUtils.formatYAML(yaml, { addBlankLines: true });

      expect(result).toContain('name: Test\n\non:');
    });

    it('should handle invalid YAML gracefully', () => {
      const yaml = 'name: Test\non:\n  push:\n    branches\n      - main\n    invalid: [unclosed';
      
      expect(() => YAMLUtils.formatYAML(yaml)).toThrow('YAML formatting failed');
    });
  });

  describe('analyzeStructure', () => {
    it('should analyze basic workflow structure', () => {
      const yaml = `
name: Test
on:
  push:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Test
        run: npm test
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: npm run build
`;

      const result = YAMLUtils.analyzeStructure(yaml);

      expect(result.topLevelKeys).toContain('name');
      expect(result.topLevelKeys).toContain('on');
      expect(result.topLevelKeys).toContain('jobs');
      expect(result.jobCount).toBe(2);
      expect(result.stepCount).toBe(3);
      expect(result.hasMatrix).toBe(false);
      expect(result.hasCaching).toBe(false);
      expect(result.hasSecrets).toBe(false);
    });

    it('should detect matrix strategy', () => {
      const yaml = `
jobs:
  test:
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - name: Test
        run: npm test
`;

      const result = YAMLUtils.analyzeStructure(yaml);

      expect(result.hasMatrix).toBe(true);
    });

    it('should detect caching', () => {
      const yaml = `
jobs:
  test:
    steps:
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: npm-cache
`;

      const result = YAMLUtils.analyzeStructure(yaml);

      expect(result.hasCaching).toBe(true);
    });

    it('should detect secrets usage', () => {
      const yaml = `
jobs:
  deploy:
    steps:
      - name: Deploy
        env:
          API_KEY: \${{ secrets.API_KEY }}
        run: deploy.sh
`;

      const result = YAMLUtils.analyzeStructure(yaml);

      expect(result.hasSecrets).toBe(true);
    });

    it('should handle empty or invalid YAML', () => {
      expect(() => YAMLUtils.analyzeStructure('')).not.toThrow();
      expect(() => YAMLUtils.analyzeStructure('invalid: yaml: content:')).toThrow();
    });
  });

  describe('mergeYAMLConfigs', () => {
    it('should merge two YAML configurations', () => {
      const base = `
name: Base
on:
  push:
jobs:
  test:
    runs-on: ubuntu-latest
`;

      const override = `
on:
  pull_request:
jobs:
  test:
    runs-on: windows-latest
  build:
    runs-on: ubuntu-latest
`;

      const result = YAMLUtils.mergeYAMLConfigs(base, override);

      expect(result).toContain('name: Base');
      expect(result).toContain('pull_request:');
      expect(result).toContain('runs-on: windows-latest');
      expect(result).toContain('build:');
    });

    it('should override arrays completely', () => {
      const base = `
on:
  push:
    branches:
      - main
      - develop
`;

      const override = `
on:
  push:
    branches:
      - production
`;

      const result = YAMLUtils.mergeYAMLConfigs(base, override);

      expect(result).toContain('- production');
      expect(result).not.toContain('- main');
      expect(result).not.toContain('- develop');
    });

    it('should handle null and undefined values', () => {
      const base = `
name: Base
on:
  push:
`;

      const override = `
name: null
on: null
`;

      const result = YAMLUtils.mergeYAMLConfigs(base, override);

      expect(result).toContain('name: null');
      expect(result).toContain('on: null');
    });

    it('should handle invalid YAML', () => {
      const base = 'name: Base';
      const override = 'invalid: yaml: content:';

      expect(() => YAMLUtils.mergeYAMLConfigs(base, override)).toThrow('YAML merge failed');
    });
  });

  describe('extractComments', () => {
    it('should extract comments with line numbers', () => {
      const yaml = `# This is a comment
name: Test
# Another comment
on:
  push: # Inline comment (not extracted)
# Final comment
jobs:`;

      const result = YAMLUtils.extractComments(yaml);

      expect(result.get(1)).toBe('This is a comment');
      expect(result.get(3)).toBe('Another comment');
      expect(result.get(6)).toBe('Final comment');
      expect(result.has(5)).toBe(false); // Inline comments not extracted
    });

    it('should handle indented comments', () => {
      const yaml = `name: Test
jobs:
  # Job comment
  test:
    # Step comment
    steps:`;

      const result = YAMLUtils.extractComments(yaml);

      expect(result.get(3)).toBe('Job comment');
      expect(result.get(5)).toBe('Step comment');
    });

    it('should handle empty input', () => {
      const result = YAMLUtils.extractComments('');

      expect(result.size).toBe(0);
    });
  });

  describe('preserveComments', () => {
    it('should preserve comments during transformation', () => {
      const original = `# Original comment
name: Test
# Job comment
jobs:
  test:
    runs-on: ubuntu-latest`;

      const transformed = `name: Test
jobs:
  test:
    runs-on: ubuntu-latest`;

      const result = YAMLUtils.preserveComments(original, transformed);

      expect(result).toContain('# Original comment');
      expect(result).toContain('# Job comment');
    });

    it('should handle mismatched line counts', () => {
      const original = `# Comment 1
# Comment 2
name: Test`;

      const transformed = `name: Test
on:
  push:`;

      const result = YAMLUtils.preserveComments(original, transformed);

      expect(result).toContain('# Comment 1');
      expect(result).toContain('# Comment 2');
    });

    it('should preserve indentation of comments', () => {
      const original = `name: Test
jobs:
  # Indented comment
  test:
    runs-on: ubuntu-latest`;

      const transformed = `name: Test
jobs:
  test:
    runs-on: ubuntu-latest`;

      const result = YAMLUtils.preserveComments(original, transformed);

      expect(result).toContain('  # Indented comment');
    });
  });
});