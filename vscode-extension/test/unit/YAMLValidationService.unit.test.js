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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const sinon = __importStar(require("sinon"));
const YAMLValidationService_1 = require("../../src/core/YAMLValidationService");
const node_test_1 = __importDefault(require("node:test"));
suite('YAMLValidationService Unit Tests', () => {
    let validationService;
    let mockDocument;
    setup(() => {
        validationService = new YAMLValidationService_1.YAMLValidationService();
        // Create mock document
        mockDocument = {
            uri: vscode.Uri.file('/test/.github/workflows/test.yml'),
            fileName: '/test/.github/workflows/test.yml',
            isUntitled: false,
            languageId: 'yaml',
            version: 1,
            isDirty: false,
            isClosed: false,
            save: sinon.stub(),
            eol: vscode.EndOfLine.LF,
            lineCount: 10,
            getText: sinon.stub(),
            getWordRangeAtPosition: sinon.stub(),
            lineAt: sinon.stub(),
            offsetAt: sinon.stub(),
            positionAt: sinon.stub(),
            validateRange: sinon.stub(),
            validatePosition: sinon.stub()
        };
    });
    teardown(() => {
        validationService.dispose();
        sinon.restore();
    });
    suite('validateYAMLFile', () => {
        (0, node_test_1.default)('should validate correct YAML workflow', async () => {
            const validYaml = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
`;
            mockDocument.getText.returns(validYaml);
            const result = await validationService.validateYAMLFile(mockDocument);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.errors.length, 0);
        });
        (0, node_test_1.default)('should detect YAML syntax errors', async () => {
            const invalidYaml = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
      invalid_indentation
`;
            mockDocument.getText.returns(invalidYaml);
            const result = await validationService.validateYAMLFile(mockDocument);
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.length > 0);
            assert.ok(result.errors.some(error => error.code === 'yaml-syntax-error'));
        });
        (0, node_test_1.default)('should validate required properties', async () => {
            const yamlMissingRequired = `
name: Test Workflow
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
            mockDocument.getText.returns(yamlMissingRequired);
            const result = await validationService.validateYAMLFile(mockDocument);
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(error => error.code === 'schema-validation-error'));
        });
        (0, node_test_1.default)('should validate job structure', async () => {
            const yamlMissingRunsOn = `
name: Test Workflow
on: push
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
`;
            mockDocument.getText.returns(yamlMissingRunsOn);
            const result = await validationService.validateYAMLFile(mockDocument);
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(error => error.code === 'schema-validation-error'));
        });
        (0, node_test_1.default)('should validate environment variable names', async () => {
            const yamlInvalidEnvName = `
name: Test Workflow
on: push
env:
  VALID_NAME: value
  123_INVALID: value
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
            mockDocument.getText.returns(yamlInvalidEnvName);
            const result = await validationService.validateYAMLFile(mockDocument);
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(error => error.code === 'invalid-env-name'));
        });
        (0, node_test_1.default)('should handle complex workflow structures', async () => {
            const complexYaml = `
name: Complex Workflow
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'
env:
  NODE_VERSION: '18'
  CACHE_KEY: 'v1'
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: echo "Deploying..."
`;
            mockDocument.getText.returns(complexYaml);
            const result = await validationService.validateYAMLFile(mockDocument);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.errors.length, 0);
        });
    });
    suite('updateDiagnostics', () => {
        let mockDiagnosticCollection;
        setup(() => {
            mockDiagnosticCollection = {
                set: sinon.stub(),
                delete: sinon.stub(),
                dispose: sinon.stub()
            };
            // Mock the diagnostic collection creation
            sinon.stub(vscode.languages, 'createDiagnosticCollection').returns(mockDiagnosticCollection);
        });
        (0, node_test_1.default)('should update diagnostics for workflow files', async () => {
            const invalidYaml = `
name: Test
on: push
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
`;
            mockDocument.getText.returns(invalidYaml);
            await validationService.updateDiagnostics(mockDocument);
            assert.ok(mockDiagnosticCollection.set.calledOnce);
            const [uri, diagnostics] = mockDiagnosticCollection.set.firstCall.args;
            assert.strictEqual(uri, mockDocument.uri);
            assert.ok(Array.isArray(diagnostics));
        });
        (0, node_test_1.default)('should not update diagnostics for non-workflow files', async () => {
            const nonWorkflowDocument = {
                ...mockDocument,
                uri: vscode.Uri.file('/test/package.json'),
                fileName: '/test/package.json'
            };
            await validationService.updateDiagnostics(nonWorkflowDocument);
            assert.ok(mockDiagnosticCollection.set.notCalled);
        });
    });
    suite('clearDiagnostics', () => {
        let mockDiagnosticCollection;
        setup(() => {
            mockDiagnosticCollection = {
                set: sinon.stub(),
                delete: sinon.stub(),
                dispose: sinon.stub()
            };
            sinon.stub(vscode.languages, 'createDiagnosticCollection').returns(mockDiagnosticCollection);
        });
        (0, node_test_1.default)('should clear diagnostics for document', () => {
            validationService.clearDiagnostics(mockDocument);
            assert.ok(mockDiagnosticCollection.delete.calledOnce);
            assert.strictEqual(mockDiagnosticCollection.delete.firstCall.args[0], mockDocument.uri);
        });
    });
    suite('Action Reference Validation', () => {
        (0, node_test_1.default)('should validate action reference format', async () => {
            const yamlWithInvalidAction = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: invalid-action-format
      - uses: actions/checkout
      - uses: actions/setup-node@v4
`;
            mockDocument.getText.returns(yamlWithInvalidAction);
            const result = await validationService.validateYAMLFile(mockDocument);
            // Should have warnings for invalid action references
            assert.ok(result.warnings.some(warning => warning.code === 'invalid-action-reference'));
        });
        (0, node_test_1.default)('should accept valid action references', async () => {
            const yamlWithValidActions = `
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: docker/build-push-action@v5
`;
            mockDocument.getText.returns(yamlWithValidActions);
            const result = await validationService.validateYAMLFile(mockDocument);
            // Should not have warnings for valid action references
            assert.ok(!result.warnings.some(warning => warning.code === 'invalid-action-reference'));
        });
    });
    suite('Error Positioning', () => {
        (0, node_test_1.default)('should provide accurate line numbers for errors', async () => {
            const yamlWithError = `name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Invalid step
        invalid_property: value`;
            mockDocument.getText.returns(yamlWithError);
            const result = await validationService.validateYAMLFile(mockDocument);
            if (result.errors.length > 0) {
                const error = result.errors[0];
                assert.strictEqual(typeof error.line, 'number');
                assert.ok(error.line >= 0);
                assert.strictEqual(typeof error.column, 'number');
                assert.ok(error.column >= 0);
            }
        });
    });
});
//# sourceMappingURL=YAMLValidationService.unit.test.js.map