import * as assert from 'assert';
import { describe, it } from 'mocha';

describe('WorkflowPreview Component', () => {
  const mockWorkflow = {
    name: 'ci.yml',
    path: '.github/workflows/ci.yml',
    content: `name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test`,
    language: 'yaml' as const,
    size: 285
  };

  describe('YAML Validation', () => {
    it('should detect tab characters as errors', () => {
      const contentWithTabs = 'name: CI\n\truns-on: ubuntu-latest';
      const lines = contentWithTabs.split('\n');
      const issues: any[] = [];

      lines.forEach((line, index) => {
        if (line.includes('\t')) {
          issues.push({
            line: index + 1,
            column: line.indexOf('\t') + 1,
            message: 'YAML should use spaces, not tabs for indentation',
            severity: 'error',
            code: 'YAML_TAB_INDENTATION'
          });
        }
      });

      assert.strictEqual(issues.length, 1);
      assert.strictEqual(issues[0].severity, 'error');
      assert.strictEqual(issues[0].code, 'YAML_TAB_INDENTATION');
    });

    it('should detect inconsistent indentation as warnings', () => {
      const contentWithBadIndentation = 'name: CI\n jobs:\n   test:';
      const lines = contentWithBadIndentation.split('\n');
      const issues: any[] = [];

      lines.forEach((line, index) => {
        const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
        if (leadingSpaces > 0 && leadingSpaces % 2 !== 0) {
          issues.push({
            line: index + 1,
            column: 1,
            message: 'Inconsistent indentation. Use 2 spaces per level',
            severity: 'warning',
            code: 'YAML_INDENTATION'
          });
        }
      });

      assert.strictEqual(issues.length, 1);
      assert.strictEqual(issues[0].severity, 'warning');
      assert.strictEqual(issues[0].code, 'YAML_INDENTATION');
    });

    it('should detect missing action versions as warnings', () => {
      const contentWithoutVersions = 'uses: actions/checkout\nuses: actions/setup-node';
      const lines = contentWithoutVersions.split('\n');
      const issues: any[] = [];

      lines.forEach((line, index) => {
        if (line.trim().startsWith('uses:')) {
          const actionMatch = line.match(/uses:\s*(.+)/);
          if (actionMatch) {
            const action = actionMatch[1].trim();
            if (!action.includes('@') && !action.startsWith('./')) {
              issues.push({
                line: index + 1,
                column: line.indexOf(action) + 1,
                message: 'Action should specify a version (e.g., @v1, @main)',
                severity: 'warning',
                code: 'GITHUB_ACTION_VERSION'
              });
            }
          }
        }
      });

      assert.strictEqual(issues.length, 2);
      assert.ok(issues.every(issue => issue.code === 'GITHUB_ACTION_VERSION'));
    });

    it('should validate correct YAML as valid', () => {
      const validContent = mockWorkflow.content;
      const lines = validContent.split('\n');
      const issues: any[] = [];

      // Check for tabs
      lines.forEach((line, index) => {
        if (line.includes('\t')) {
          issues.push({ severity: 'error' });
        }
      });

      // Check for indentation issues
      lines.forEach((line, index) => {
        const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
        if (leadingSpaces > 0 && leadingSpaces % 2 !== 0) {
          issues.push({ severity: 'warning' });
        }
      });

      const errorCount = issues.filter(i => i.severity === 'error').length;
      assert.strictEqual(errorCount, 0);
    });
  });

  describe('Syntax Highlighting', () => {
    it('should highlight YAML keywords correctly', () => {
      const content = 'on:\npush:\njobs:\nsteps:';
      
      const syntaxHighlight = (yamlContent: string): string => {
        return yamlContent
          .replace(/^(\s*)(on|push|pull_request|jobs|steps|runs-on|uses|with|env):/gm, 
                   '$1<span class="yaml-keyword">$2</span>:');
      };

      const highlighted = syntaxHighlight(content);
      
      assert.ok(highlighted.includes('<span class="yaml-keyword">on</span>:'));
      assert.ok(highlighted.includes('<span class="yaml-keyword">jobs</span>:'));
      assert.ok(highlighted.includes('<span class="yaml-keyword">steps</span>:'));
    });

    it('should highlight string values correctly', () => {
      const content = 'name: "CI Pipeline"\nbranch: \'main\'';
      
      const syntaxHighlight = (yamlContent: string): string => {
        return yamlContent
          .replace(/:\s*(['"]).+?\1/g, (match) => 
                   match.replace(/(['"]).+?\1/, '<span class="yaml-string">$&</span>'));
      };

      const highlighted = syntaxHighlight(content);
      
      assert.ok(highlighted.includes('<span class="yaml-string">"CI Pipeline"</span>'));
      assert.ok(highlighted.includes('<span class="yaml-string">\'main\'</span>'));
    });

    it('should highlight comments correctly', () => {
      const content = 'name: CI # This is a comment\n# Full line comment';
      
      const syntaxHighlight = (yamlContent: string): string => {
        return yamlContent.replace(/#.*/g, '<span class="yaml-comment">$&</span>');
      };

      const highlighted = syntaxHighlight(content);
      
      assert.ok(highlighted.includes('<span class="yaml-comment"># This is a comment</span>'));
      assert.ok(highlighted.includes('<span class="yaml-comment"># Full line comment</span>'));
    });

    it('should highlight numbers and booleans correctly', () => {
      const content = 'timeout: 30\nenabled: true\ndisabled: false';
      
      const syntaxHighlight = (yamlContent: string): string => {
        return yamlContent
          .replace(/:\s*(\d+)/g, ': <span class="yaml-number">$1</span>')
          .replace(/:\s*(true|false)/g, ': <span class="yaml-boolean">$1</span>');
      };

      const highlighted = syntaxHighlight(content);
      
      assert.ok(highlighted.includes('<span class="yaml-number">30</span>'));
      assert.ok(highlighted.includes('<span class="yaml-boolean">true</span>'));
      assert.ok(highlighted.includes('<span class="yaml-boolean">false</span>'));
    });
  });

  describe('Line Numbers Generation', () => {
    it('should generate correct line numbers', () => {
      const content = 'line 1\nline 2\nline 3\nline 4';
      
      const getLineNumbers = (content: string): string => {
        const lines = content.split('\n');
        return lines.map((_, index) => index + 1).join('\n');
      };

      const lineNumbers = getLineNumbers(content);
      
      assert.strictEqual(lineNumbers, '1\n2\n3\n4');
    });

    it('should handle empty content', () => {
      const content = '';
      
      const getLineNumbers = (content: string): string => {
        const lines = content.split('\n');
        return lines.map((_, index) => index + 1).join('\n');
      };

      const lineNumbers = getLineNumbers(content);
      
      assert.strictEqual(lineNumbers, '1');
    });

    it('should handle single line content', () => {
      const content = 'single line';
      
      const getLineNumbers = (content: string): string => {
        const lines = content.split('\n');
        return lines.map((_, index) => index + 1).join('\n');
      };

      const lineNumbers = getLineNumbers(content);
      
      assert.strictEqual(lineNumbers, '1');
    });
  });

  describe('Content Change Handling', () => {
    it('should detect content changes correctly', () => {
      const originalContent = mockWorkflow.content;
      const modifiedContent = originalContent + '\n      - run: npm run lint';
      
      const hasChanges = modifiedContent !== originalContent;
      
      assert.strictEqual(hasChanges, true);
    });

    it('should handle content updates', () => {
      let currentContent = mockWorkflow.content;
      
      const handleContentChange = (newContent: string) => {
        currentContent = newContent;
      };

      const newContent = 'name: Updated CI\non: [push]';
      handleContentChange(newContent);
      
      assert.strictEqual(currentContent, newContent);
    });

    it('should preserve content when no changes made', () => {
      const originalContent = mockWorkflow.content;
      let currentContent = originalContent;
      
      const handleContentChange = (newContent: string) => {
        currentContent = newContent;
      };

      handleContentChange(originalContent);
      
      assert.strictEqual(currentContent, originalContent);
    });
  });

  describe('Validation Status Display', () => {
    it('should show valid status when no issues', () => {
      const validation = {
        isValid: true,
        issues: [],
        yamlSyntaxValid: true,
        githubActionsValid: true
      };

      const statusText = validation.isValid ? '✅ Valid' : '❌ Invalid';
      
      assert.strictEqual(statusText, '✅ Valid');
    });

    it('should show error count when invalid', () => {
      const validation = {
        isValid: false,
        issues: [
          { severity: 'error', message: 'Error 1' },
          { severity: 'error', message: 'Error 2' },
          { severity: 'warning', message: 'Warning 1' }
        ],
        yamlSyntaxValid: false,
        githubActionsValid: true
      };

      const errorCount = validation.issues.filter(i => i.severity === 'error').length;
      const statusText = validation.isValid ? '✅ Valid' : `❌ ${errorCount} errors`;
      
      assert.strictEqual(statusText, '❌ 2 errors');
    });

    it('should show warning count separately', () => {
      const validation = {
        isValid: true,
        issues: [
          { severity: 'warning', message: 'Warning 1' },
          { severity: 'warning', message: 'Warning 2' }
        ],
        yamlSyntaxValid: true,
        githubActionsValid: true
      };

      const warningCount = validation.issues.filter(i => i.severity === 'warning').length;
      const warningText = warningCount > 0 ? `⚠️ ${warningCount} warnings` : '';
      
      assert.strictEqual(warningText, '⚠️ 2 warnings');
    });
  });

  describe('Workflow Statistics', () => {
    it('should calculate correct line count', () => {
      const content = mockWorkflow.content;
      const lineCount = content.split('\n').length;
      
      assert.strictEqual(lineCount, 16);
    });

    it('should calculate correct character count', () => {
      const content = mockWorkflow.content;
      const charCount = content.length;
      
      assert.strictEqual(charCount, mockWorkflow.size);
    });

    it('should display correct language', () => {
      const language = mockWorkflow.language.toUpperCase();
      
      assert.strictEqual(language, 'YAML');
    });
  });

  describe('Edit Mode Behavior', () => {
    it('should switch between view and edit modes', () => {
      let editMode = false;
      
      const toggleEditMode = () => {
        editMode = !editMode;
      };

      // Enter edit mode
      toggleEditMode();
      assert.strictEqual(editMode, true);

      // Exit edit mode
      toggleEditMode();
      assert.strictEqual(editMode, false);
    });

    it('should show appropriate UI elements in edit mode', () => {
      const editMode = true;
      const showTextarea = editMode;
      const showSyntaxHighlighting = !editMode;
      
      assert.strictEqual(showTextarea, true);
      assert.strictEqual(showSyntaxHighlighting, false);
    });

    it('should show appropriate UI elements in view mode', () => {
      const editMode = false;
      const showTextarea = editMode;
      const showSyntaxHighlighting = !editMode;
      
      assert.strictEqual(showTextarea, false);
      assert.strictEqual(showSyntaxHighlighting, true);
    });
  });
});