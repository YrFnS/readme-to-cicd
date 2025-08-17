import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as vscode from 'vscode';
import { WorkflowValidator } from '../../src/core/WorkflowValidator';
import { 
  WorkflowFile, 
  DetectedFramework,
  WorkflowType 
} from '../../src/core/types';

// Mock VS Code API
vi.mock('vscode', () => ({
  languages: {
    createDiagnosticCollection: vi.fn(() => ({
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn()
    }))
  },
  workspace: {
    openTextDocument: vi.fn()
  },
  Range: vi.fn(),
  Position: vi.fn(),
  Diagnostic: vi.fn(),
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
  },
  WorkspaceEdit: vi.fn(),
  CodeActionKind: {
    QuickFix: 'quickfix'
  }
}));

describe('WorkflowValidator', () => {
  let validator: WorkflowValidator;
  let mockDocument: any;

  beforeEach(() => {
    validator = new WorkflowValidator();
    mockDocument = {
      getText: vi.fn(),
      uri: { fsPath: '.github/workflows/test.yml' }
    };
    
    (vscode.workspace.openTextDocument as Mock).mockResolvedValue(mockDocument);
  });

  describe('validateWorkflow', () => {
    it('should validate a simple workflow successfully', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'test.yml',
        content: `
name: Test Workflow
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/test.yml'
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.syntaxValidation).toBeDefined();
      expect(result.actionValidation).toBeDefined();
      expect(result.secretValidation).toBeDefined();
      expect(result.performanceAnalysis).toBeDefined();
      expect(result.securityAnalysis).toBeDefined();
    });

    it('should detect syntax errors in invalid YAML', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'invalid.yml',
        content: `
name: Invalid Workflow
on: [push
jobs:
  test:
    runs-on: ubuntu-latest
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/invalid.yml'
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile);

      expect(result.syntaxValidation.isValid).toBe(false);
      expect(result.syntaxValidation.errors.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(100);
    });

    it('should validate action references', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'actions.yml',
        content: `
name: Action Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: invalid-action-format
      - uses: actions/setup-node@v3
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/actions.yml'
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile);

      expect(result.actionValidation.errors.length).toBeGreaterThan(0);
      expect(result.actionValidation.errors[0]?.code).toBe('invalid-action-reference');
    });

    it('should detect hardcoded secrets', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'secrets.yml',
        content: `
name: Secret Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: echo "password=secret123"
        env:
          API_KEY: "hardcoded-key-123"
        `,
        type: 'cd' as WorkflowType,
        relativePath: '.github/workflows/secrets.yml'
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile);

      expect(result.secretValidation.errors.length).toBeGreaterThan(0);
      expect(result.secretValidation.errors.some(e => e.code === 'hardcoded-secret')).toBe(true);
    });

    it('should warn about undefined secrets', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'undefined-secrets.yml',
        content: `
name: Undefined Secret Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: echo "Deploying..."
        env:
          API_KEY: \${{ secrets.UNDEFINED_SECRET }}
        `,
        type: 'cd' as WorkflowType,
        relativePath: '.github/workflows/undefined-secrets.yml'
      };

      const context = {
        projectSecrets: ['DEFINED_SECRET']
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile, context);

      expect(result.secretValidation.warnings.length).toBeGreaterThan(0);
      expect(result.secretValidation.warnings.some(w => w.code === 'undefined-secret')).toBe(true);
    });

    it('should analyze performance and suggest optimizations', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'performance.yml',
        content: `
name: Performance Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/performance.yml'
      };

      const detectedFrameworks: DetectedFramework[] = [{
        name: 'nodejs',
        confidence: 0.9,
        type: 'runtime',
        ecosystem: 'javascript',
        evidence: []
      }];

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });

      expect(result.performanceAnalysis.bottlenecks.length).toBeGreaterThan(0);
      expect(result.performanceAnalysis.bottlenecks.some(b => b.type === 'missing-cache')).toBe(true);
      expect(result.optimizationSuggestions.length).toBeGreaterThan(0);
    });

    it('should detect security vulnerabilities', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'security.yml',
        content: `
name: Security Test
on: 
  pull_request_target:
    branches: [main]
permissions: write-all
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Dangerous step
        run: echo "\${{ github.event.pull_request.title }}"
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/security.yml'
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile);

      expect(result.securityAnalysis.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.securityAnalysis.vulnerabilities.some(v => v.type === 'excessive-permissions')).toBe(true);
      expect(result.securityAnalysis.vulnerabilities.some(v => v.type === 'pull-request-target')).toBe(true);
      expect(result.securityAnalysis.vulnerabilities.some(v => v.type === 'script-injection')).toBe(true);
    });

    it('should generate quick fixes for common issues', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'quickfix.yml',
        content: `
name: Quick Fix Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3  # Outdated version
      - run: npm install
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/quickfix.yml'
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile);

      expect(result.quickFixes.length).toBeGreaterThan(0);
    });
  });

  describe('simulateWorkflow', () => {
    it('should simulate workflow execution successfully', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'simulate.yml',
        content: `
name: Simulation Test
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run deploy
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/simulate.yml'
      };

      const result = await validator.simulateWorkflow(workflowFile);

      expect(result.success).toBe(true);
      expect(result.executionPlan.length).toBeGreaterThan(0);
      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(result.resourceUsage).toBeDefined();
      expect(result.resourceUsage.cpu).toBeGreaterThan(0);
      expect(result.resourceUsage.memory).toBeGreaterThan(0);
    });

    it('should identify potential issues during simulation', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'issues.yml',
        content: `
name: Issues Test
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy with secret
        run: echo "Deploying with \${{ secrets.MISSING_SECRET }}"
        `,
        type: 'cd' as WorkflowType,
        relativePath: '.github/workflows/issues.yml'
      };

      const simulationOptions = {
        availableSecrets: ['AVAILABLE_SECRET']
      };

      const result = await validator.simulateWorkflow(workflowFile, simulationOptions);

      expect(result.potentialIssues.length).toBeGreaterThan(0);
      expect(result.potentialIssues.some(i => i.type === 'missing-secret')).toBe(true);
    });

    it('should estimate execution time and resources', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'estimation.yml',
        content: `
name: Estimation Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test
      - run: npm run build
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/estimation.yml'
      };

      const result = await validator.simulateWorkflow(workflowFile);

      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(result.resourceUsage.cpu).toBeGreaterThan(0);
      expect(result.resourceUsage.memory).toBeGreaterThan(0);
      expect(result.resourceUsage.storage).toBeGreaterThan(0);
    });

    it('should handle simulation errors gracefully', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'error.yml',
        content: 'invalid yaml content [',
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/error.yml'
      };

      const result = await validator.simulateWorkflow(workflowFile);

      expect(result.success).toBe(false);
      expect(result.potentialIssues.length).toBeGreaterThan(0);
      expect(result.potentialIssues[0]?.type).toBe('simulation-error');
    });
  });

  describe('framework-specific optimizations', () => {
    it('should suggest Node.js optimizations', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'nodejs.yml',
        content: `
name: Node.js Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/nodejs.yml'
      };

      const detectedFrameworks: DetectedFramework[] = [{
        name: 'nodejs',
        confidence: 0.9,
        type: 'runtime',
        ecosystem: 'javascript',
        evidence: []
      }];

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });

      expect(result.optimizationSuggestions.some(s => s.type === 'caching')).toBe(true);
      expect(result.optimizationSuggestions.some(s => s.description.includes('Node.js'))).toBe(true);
    });

    it('should suggest Python optimizations', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'python.yml',
        content: `
name: Python Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
      - run: pip install -r requirements.txt
      - run: pytest
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/python.yml'
      };

      const detectedFrameworks: DetectedFramework[] = [{
        name: 'python',
        confidence: 0.9,
        type: 'runtime',
        ecosystem: 'python',
        evidence: []
      }];

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });

      expect(result.optimizationSuggestions.some(s => s.type === 'caching')).toBe(true);
      expect(result.optimizationSuggestions.some(s => s.description.includes('Python'))).toBe(true);
    });

    it('should suggest Java optimizations', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'java.yml',
        content: `
name: Java Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v3
      - run: mvn clean compile
      - run: mvn test
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/java.yml'
      };

      const detectedFrameworks: DetectedFramework[] = [{
        name: 'java',
        confidence: 0.9,
        type: 'runtime',
        ecosystem: 'java',
        evidence: []
      }];

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });

      expect(result.optimizationSuggestions.some(s => s.type === 'caching')).toBe(true);
      expect(result.optimizationSuggestions.some(s => s.description.includes('Maven'))).toBe(true);
    });
  });

  describe('matrix build analysis', () => {
    it('should detect inefficient matrix builds', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'matrix.yml',
        content: `
name: Matrix Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [12, 14, 16, 18, 20]
        os: [ubuntu-latest, windows-latest, macos-latest]
        python-version: [3.8, 3.9, 3.10, 3.11]
    steps:
      - uses: actions/checkout@v4
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/matrix.yml'
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile);

      expect(result.performanceAnalysis.bottlenecks.length).toBeGreaterThan(0);
      // 5 * 3 * 4 = 60 combinations, should be flagged as inefficient
    });

    it('should suggest fail-fast strategy for matrix builds', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'matrix-no-failfast.yml',
        content: `
name: Matrix No Fail Fast
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4
        `,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/matrix-no-failfast.yml'
      };

      mockDocument.getText.mockReturnValue(workflowFile.content);

      const result = await validator.validateWorkflow(workflowFile);

      expect(result.optimizationSuggestions.some(s => 
        s.type === 'strategy' && s.description.includes('fail-fast')
      )).toBe(true);
    });
  });

  describe('disposal', () => {
    it('should dispose resources properly', () => {
      expect(() => validator.dispose()).not.toThrow();
    });
  });
});