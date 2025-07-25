/**
 * Integration tests for edge cases and error scenarios
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { loadFixtureCategory, validateParseResult, createTestCase, batchValidate, generateTestSummary } from '../utils/test-helpers';

describe('Edge Case Parsing Tests', () => {
  let parser: ReadmeParserImpl;
  let edgeCases: Map<string, string>;

  beforeAll(async () => {
    parser = new ReadmeParserImpl();
    edgeCases = await loadFixtureCategory('edge-cases');
  });

  describe('Minimal README Files', () => {
    it('should handle minimal README with basic content', async () => {
      const content = edgeCases.get('minimal-readme.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should still extract basic information
      expect(data.metadata.name).toContain('Project');
      expect(data.commands.run).toHaveLength(1);
      expect(data.commands.run[0].command).toBe('npm start');
      
      // Should have reasonable confidence despite minimal content
      expect(data.confidence.overall).toBeGreaterThan(0.3);
    });

    it('should handle empty README gracefully', async () => {
      const result = await parser.parseContent('');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should return empty but valid structure
      expect(data.languages).toHaveLength(0);
      expect(data.commands.build).toHaveLength(0);
      expect(data.commands.test).toHaveLength(0);
      expect(data.dependencies.packageFiles).toHaveLength(0);
      expect(data.confidence.overall).toBe(0);
    });

    it('should handle README with only title', async () => {
      const result = await parser.parseContent('# My Project\n');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      expect(data.metadata.name).toBe('My Project');
      expect(data.languages).toHaveLength(0);
      expect(data.confidence.overall).toBeGreaterThan(0);
    });
  });

  describe('Malformed Markdown', () => {
    it('should handle malformed markdown gracefully', async () => {
      const content = edgeCases.get('malformed-markdown.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should still extract some information despite malformed content
      expect(data.metadata.name).toContain('Malformed Markdown Test');
      
      // Should detect JavaScript despite unclosed code block
      const languages = data.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
      
      // Should handle mixed list markers
      expect(data.commands.build.length).toBeGreaterThan(0);
      
      // May have warnings but should not fail
      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should handle unclosed code blocks', async () => {
      const content = '# Test\n\n```javascript\nfunction test() {\n  console.log("unclosed");\n\n## Next Section\n\nMore content.';
      
      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should still detect JavaScript
      const languages = result.data!.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
    });

    it('should handle invalid HTML tags', async () => {
      const content = '# Test\n\n<div class="unclosed">\n<p>Unclosed paragraph\n<img src="missing-alt">\n\nSome text after.';
      
      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.metadata.name).toBe('Test');
    });
  });

  describe('Mixed Language Detection', () => {
    it('should handle polyglot projects correctly', async () => {
      const content = edgeCases.get('mixed-languages.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should detect multiple languages
      const languages = data.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('go');
      expect(languages).toContain('sql');
      expect(languages).toContain('rust');
      expect(languages).toContain('swift');
      expect(languages).toContain('kotlin');
      
      // Should detect frameworks
      const jsLang = data.languages.find(l => l.name.toLowerCase() === 'javascript');
      expect(jsLang?.frameworks).toContain('React');
      
      const pythonLang = data.languages.find(l => l.name.toLowerCase() === 'python');
      expect(pythonLang?.frameworks).toContain('Flask');
      
      // Should extract commands for different languages
      const buildCommands = data.commands.build.map(c => c.command);
      expect(buildCommands).toContain('npm run build');
      expect(buildCommands).toContain('go build');
      expect(buildCommands).toContain('cargo build --release');
      
      const testCommands = data.commands.test.map(c => c.command);
      expect(testCommands).toContain('npm test');
      expect(testCommands).toContain('pytest');
      expect(testCommands).toContain('go test ./...');
      expect(testCommands).toContain('cargo test');
    });

    it('should prioritize languages by frequency and context', async () => {
      const content = edgeCases.get('mixed-languages.md');
      const result = await parser.parseContent(content!);
      
      const data = result.data!;
      
      // Languages with more code blocks should have higher confidence
      const sortedLangs = data.languages.sort((a, b) => b.confidence - a.confidence);
      
      // Should have reasonable confidence scores
      expect(sortedLangs[0].confidence).toBeGreaterThan(0.7);
      expect(sortedLangs[sortedLangs.length - 1].confidence).toBeGreaterThan(0.3);
    });
  });

  describe('Unicode and International Content', () => {
    it('should handle Unicode content correctly', async () => {
      const content = edgeCases.get('unicode-content.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should extract project name with Unicode
      expect(data.metadata.name).toContain('Unicode Test Project');
      
      // Should detect languages despite Unicode comments
      const languages = data.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
      expect(languages).toContain('python');
      
      // Should handle Unicode in commands
      const testCommands = data.commands.test.map(c => c.command);
      expect(testCommands.some(cmd => cmd.includes('Unicode'))).toBe(true);
    });

    it('should handle emoji in headers and content', async () => {
      const content = '# 🚀 Emoji Project\n\n## 📋 Features\n\n- ✅ Feature 1\n- 🎨 Feature 2\n\n```bash\necho "✅ Tests passed!"\n```';
      
      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should extract project name without emoji interference
      expect(result.data!.metadata.name).toContain('Emoji Project');
      
      // Should detect shell commands with emoji
      const otherCommands = result.data!.commands.other.map(c => c.command);
      expect(otherCommands.some(cmd => cmd.includes('echo'))).toBe(true);
    });

    it('should handle right-to-left languages', async () => {
      const content = '# Arabic Test / اختبار عربي\n\nThis project supports Arabic: مرحبا بكم\n\n```javascript\n// Arabic comment: هذا تعليق\nconsole.log("مرحبا");\n```';
      
      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      expect(result.data!.metadata.name).toContain('Arabic Test');
      
      const languages = result.data!.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
    });
  });

  describe('Complex Formatting Scenarios', () => {
    it('should handle nested lists and complex structures', async () => {
      const content = `# Complex Structure

## Features

- Main feature 1
  - Sub-feature 1.1
    - Sub-sub-feature 1.1.1
  - Sub-feature 1.2
- Main feature 2
  1. Numbered sub-feature 2.1
  2. Numbered sub-feature 2.2
     - Mixed list item
     - Another mixed item

## Commands

\`\`\`bash
# Nested commands
if [ -f package.json ]; then
  npm install
  npm run build
else
  echo "No package.json found"
fi
\`\`\``;

      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should handle nested structure
      expect(result.data!.metadata.name).toBe('Complex Structure');
      
      // Should extract commands from complex bash structure
      const buildCommands = result.data!.commands.build.map(c => c.command);
      expect(buildCommands).toContain('npm run build');
    });

    it('should handle tables with code and commands', async () => {
      const content = `# Table Test

| Command | Description | Example |
|---------|-------------|---------|
| \`npm install\` | Install deps | \`npm install express\` |
| \`npm test\` | Run tests | \`npm test -- --watch\` |
| \`docker build\` | Build image | \`docker build -t app .\` |

## Code Examples

\`\`\`javascript
// Table processing
const commands = [
  { name: 'install', cmd: 'npm install' },
  { name: 'test', cmd: 'npm test' }
];
\`\`\``;

      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should extract commands from table
      const installCommands = result.data!.dependencies.installCommands.map(c => c.command);
      expect(installCommands).toContain('npm install');
      
      const testCommands = result.data!.commands.test.map(c => c.command);
      expect(testCommands).toContain('npm test');
      
      // Should detect JavaScript
      const languages = result.data!.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from parsing errors and continue', async () => {
      const content = `# Error Recovery Test

## Valid Section

\`\`\`javascript
function valid() {
  return true;
}
\`\`\`

## Invalid Section

\`\`\`invalid-syntax
This is not valid markdown or code
<<< broken syntax >>>
\`\`\`

## Another Valid Section

\`\`\`python
def another_valid():
    return True
\`\`\``;

      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should detect valid languages despite invalid sections
      const languages = result.data!.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
      expect(languages).toContain('python');
      
      // Should have warnings but not fail
      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should handle extremely long lines gracefully', async () => {
      const longLine = 'a'.repeat(10000);
      const content = `# Long Line Test\n\nThis line is very long: ${longLine}\n\n\`\`\`javascript\nfunction test() { return true; }\n\`\`\``;
      
      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should still detect JavaScript
      const languages = result.data!.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
    });
  });

  describe('Batch Edge Case Validation', () => {
    it('should handle all edge cases with acceptable accuracy', async () => {
      const testCases = [
        createTestCase(
          'Minimal README',
          edgeCases.get('minimal-readme.md')!,
          {
            metadata: { name: 'Project' },
            commands: { run: [{ command: 'npm start' }] }
          }
        ),
        createTestCase(
          'Malformed Markdown',
          edgeCases.get('malformed-markdown.md')!,
          {
            metadata: { name: 'Malformed Markdown Test' },
            languages: [{ name: 'JavaScript', confidence: 0.5, sources: ['code-block'] }]
          }
        ),
        createTestCase(
          'Mixed Languages',
          edgeCases.get('mixed-languages.md')!,
          {
            languages: [
              { name: 'JavaScript', confidence: 0.7, sources: ['code-block'] },
              { name: 'Python', confidence: 0.7, sources: ['code-block'] },
              { name: 'Go', confidence: 0.7, sources: ['code-block'] }
            ]
          }
        ),
        createTestCase(
          'Unicode Content',
          edgeCases.get('unicode-content.md')!,
          {
            metadata: { name: 'Unicode Test Project' },
            languages: [
              { name: 'JavaScript', confidence: 0.6, sources: ['code-block'] },
              { name: 'Python', confidence: 0.6, sources: ['code-block'] }
            ]
          }
        )
      ];

      const results = await batchValidate(testCases, (content) => parser.parseContent(content));
      
      console.log(generateTestSummary(results));
      
      // Should pass most edge case tests
      const passRate = Array.from(results.values()).filter(r => r.passed).length / results.size;
      const avgScore = Array.from(results.values()).reduce((sum, r) => sum + r.score, 0) / results.size;
      
      expect(passRate).toBeGreaterThan(0.6); // 60% pass rate for edge cases
      expect(avgScore).toBeGreaterThan(0.5); // 50% average score for edge cases
    });
  });
});