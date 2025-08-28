"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const vscode = __importStar(require("vscode"));
const WorkflowValidator_1 = require("../../src/core/WorkflowValidator");
// Mock VS Code API
vitest_1.vi.mock('vscode', () => ({
    languages: {
        createDiagnosticCollection: vitest_1.vi.fn(() => ({
            set: vitest_1.vi.fn(),
            delete: vitest_1.vi.fn(),
            dispose: vitest_1.vi.fn()
        }))
    },
    workspace: {
        openTextDocument: vitest_1.vi.fn()
    },
    Range: vitest_1.vi.fn(),
    Position: vitest_1.vi.fn(),
    Diagnostic: vitest_1.vi.fn(),
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    },
    WorkspaceEdit: vitest_1.vi.fn(),
    CodeActionKind: {
        QuickFix: 'quickfix'
    }
}));
(0, vitest_1.describe)('WorkflowValidator', () => {
    let validator;
    let mockDocument;
    (0, vitest_1.beforeEach)(() => {
        validator = new WorkflowValidator_1.WorkflowValidator();
        mockDocument = {
            getText: vitest_1.vi.fn(),
            uri: { fsPath: '.github/workflows/test.yml' }
        };
        vscode.workspace.openTextDocument.mockResolvedValue(mockDocument);
    });
    (0, vitest_1.describe)('validateWorkflow', () => {
        (0, vitest_1.it)('should validate a simple workflow successfully', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/test.yml'
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.overallScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.syntaxValidation).toBeDefined();
            (0, vitest_1.expect)(result.actionValidation).toBeDefined();
            (0, vitest_1.expect)(result.secretValidation).toBeDefined();
            (0, vitest_1.expect)(result.performanceAnalysis).toBeDefined();
            (0, vitest_1.expect)(result.securityAnalysis).toBeDefined();
        });
        (0, vitest_1.it)('should detect syntax errors in invalid YAML', async () => {
            const workflowFile = {
                filename: 'invalid.yml',
                content: `
name: Invalid Workflow
on: [push
jobs:
  test:
    runs-on: ubuntu-latest
        `,
                type: 'ci',
                relativePath: '.github/workflows/invalid.yml'
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.syntaxValidation.isValid).toBe(false);
            (0, vitest_1.expect)(result.syntaxValidation.errors.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.overallScore).toBeLessThan(100);
        });
        (0, vitest_1.it)('should validate action references', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/actions.yml'
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.actionValidation.errors.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.actionValidation.errors[0]?.code).toBe('invalid-action-reference');
        });
        (0, vitest_1.it)('should detect hardcoded secrets', async () => {
            const workflowFile = {
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
                type: 'cd',
                relativePath: '.github/workflows/secrets.yml'
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.secretValidation.errors.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.secretValidation.errors.some(e => e.code === 'hardcoded-secret')).toBe(true);
        });
        (0, vitest_1.it)('should warn about undefined secrets', async () => {
            const workflowFile = {
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
                type: 'cd',
                relativePath: '.github/workflows/undefined-secrets.yml'
            };
            const context = {
                projectSecrets: ['DEFINED_SECRET']
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile, context);
            (0, vitest_1.expect)(result.secretValidation.warnings.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.secretValidation.warnings.some(w => w.code === 'undefined-secret')).toBe(true);
        });
        (0, vitest_1.it)('should analyze performance and suggest optimizations', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/performance.yml'
            };
            const detectedFrameworks = [{
                    name: 'nodejs',
                    confidence: 0.9,
                    type: 'runtime',
                    ecosystem: 'javascript',
                    evidence: []
                }];
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });
            (0, vitest_1.expect)(result.performanceAnalysis.bottlenecks.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.performanceAnalysis.bottlenecks.some(b => b.type === 'missing-cache')).toBe(true);
            (0, vitest_1.expect)(result.optimizationSuggestions.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should detect security vulnerabilities', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/security.yml'
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.securityAnalysis.vulnerabilities.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.securityAnalysis.vulnerabilities.some(v => v.type === 'excessive-permissions')).toBe(true);
            (0, vitest_1.expect)(result.securityAnalysis.vulnerabilities.some(v => v.type === 'pull-request-target')).toBe(true);
            (0, vitest_1.expect)(result.securityAnalysis.vulnerabilities.some(v => v.type === 'script-injection')).toBe(true);
        });
        (0, vitest_1.it)('should generate quick fixes for common issues', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/quickfix.yml'
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.quickFixes.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('simulateWorkflow', () => {
        (0, vitest_1.it)('should simulate workflow execution successfully', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/simulate.yml'
            };
            const result = await validator.simulateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.executionPlan.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.estimatedDuration).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.resourceUsage).toBeDefined();
            (0, vitest_1.expect)(result.resourceUsage.cpu).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.resourceUsage.memory).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should identify potential issues during simulation', async () => {
            const workflowFile = {
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
                type: 'cd',
                relativePath: '.github/workflows/issues.yml'
            };
            const simulationOptions = {
                availableSecrets: ['AVAILABLE_SECRET']
            };
            const result = await validator.simulateWorkflow(workflowFile, simulationOptions);
            (0, vitest_1.expect)(result.potentialIssues.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.potentialIssues.some(i => i.type === 'missing-secret')).toBe(true);
        });
        (0, vitest_1.it)('should estimate execution time and resources', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/estimation.yml'
            };
            const result = await validator.simulateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.estimatedDuration).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.resourceUsage.cpu).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.resourceUsage.memory).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.resourceUsage.storage).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should handle simulation errors gracefully', async () => {
            const workflowFile = {
                filename: 'error.yml',
                content: 'invalid yaml content [',
                type: 'ci',
                relativePath: '.github/workflows/error.yml'
            };
            const result = await validator.simulateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.potentialIssues.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.potentialIssues[0]?.type).toBe('simulation-error');
        });
    });
    (0, vitest_1.describe)('framework-specific optimizations', () => {
        (0, vitest_1.it)('should suggest Node.js optimizations', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/nodejs.yml'
            };
            const detectedFrameworks = [{
                    name: 'nodejs',
                    confidence: 0.9,
                    type: 'runtime',
                    ecosystem: 'javascript',
                    evidence: []
                }];
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });
            (0, vitest_1.expect)(result.optimizationSuggestions.some(s => s.type === 'caching')).toBe(true);
            (0, vitest_1.expect)(result.optimizationSuggestions.some(s => s.description.includes('Node.js'))).toBe(true);
        });
        (0, vitest_1.it)('should suggest Python optimizations', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/python.yml'
            };
            const detectedFrameworks = [{
                    name: 'python',
                    confidence: 0.9,
                    type: 'runtime',
                    ecosystem: 'python',
                    evidence: []
                }];
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });
            (0, vitest_1.expect)(result.optimizationSuggestions.some(s => s.type === 'caching')).toBe(true);
            (0, vitest_1.expect)(result.optimizationSuggestions.some(s => s.description.includes('Python'))).toBe(true);
        });
        (0, vitest_1.it)('should suggest Java optimizations', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/java.yml'
            };
            const detectedFrameworks = [{
                    name: 'java',
                    confidence: 0.9,
                    type: 'runtime',
                    ecosystem: 'java',
                    evidence: []
                }];
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });
            (0, vitest_1.expect)(result.optimizationSuggestions.some(s => s.type === 'caching')).toBe(true);
            (0, vitest_1.expect)(result.optimizationSuggestions.some(s => s.description.includes('Maven'))).toBe(true);
        });
    });
    (0, vitest_1.describe)('matrix build analysis', () => {
        (0, vitest_1.it)('should detect inefficient matrix builds', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/matrix.yml'
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.performanceAnalysis.bottlenecks.length).toBeGreaterThan(0);
            // 5 * 3 * 4 = 60 combinations, should be flagged as inefficient
        });
        (0, vitest_1.it)('should suggest fail-fast strategy for matrix builds', async () => {
            const workflowFile = {
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
                type: 'ci',
                relativePath: '.github/workflows/matrix-no-failfast.yml'
            };
            mockDocument.getText.mockReturnValue(workflowFile.content);
            const result = await validator.validateWorkflow(workflowFile);
            (0, vitest_1.expect)(result.optimizationSuggestions.some(s => s.type === 'strategy' && s.description.includes('fail-fast'))).toBe(true);
        });
    });
    (0, vitest_1.describe)('disposal', () => {
        (0, vitest_1.it)('should dispose resources properly', () => {
            (0, vitest_1.expect)(() => validator.dispose()).not.toThrow();
        });
    });
});
//# sourceMappingURL=WorkflowValidator.unit.test.js.map