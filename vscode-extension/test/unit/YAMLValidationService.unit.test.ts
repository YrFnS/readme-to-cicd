import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { YAMLValidationService } from '../../src/core/YAMLValidationService';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';

suite('YAMLValidationService Unit Tests', () => {
  let validationService: YAMLValidationService;
  let mockDocument: vscode.TextDocument;

  setup(() => {
    validationService = new YAMLValidationService();
    
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
    } as any;
  });

  teardown(() => {
    validationService.dispose();
    sinon.restore();
  });

  suite('validateYAMLFile', () => {
    test('should validate correct YAML workflow', async () => {
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
      (mockDocument.getText as sinon.SinonStub).returns(validYaml);

      const result = await validationService.validateYAMLFile(mockDocument);

      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('should detect YAML syntax errors', async () => {
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
      (mockDocument.getText as sinon.SinonStub).returns(invalidYaml);

      const result = await validationService.validateYAMLFile(mockDocument);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some(error => error.code === 'yaml-syntax-error'));
    });

    test('should validate required properties', async () => {
      const yamlMissingRequired = `
name: Test Workflow
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
      (mockDocument.getText as sinon.SinonStub).returns(yamlMissingRequired);

      const result = await validationService.validateYAMLFile(mockDocument);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some(error => error.code === 'schema-validation-error'));
    });

    test('should validate job structure', async () => {
      const yamlMissingRunsOn = `
name: Test Workflow
on: push
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
`;
      (mockDocument.getText as sinon.SinonStub).returns(yamlMissingRunsOn);

      const result = await validationService.validateYAMLFile(mockDocument);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some(error => error.code === 'schema-validation-error'));
    });

    test('should validate environment variable names', async () => {
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
      (mockDocument.getText as sinon.SinonStub).returns(yamlInvalidEnvName);

      const result = await validationService.validateYAMLFile(mockDocument);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some(error => error.code === 'invalid-env-name'));
    });

    test('should handle complex workflow structures', async () => {
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
      (mockDocument.getText as sinon.SinonStub).returns(complexYaml);

      const result = await validationService.validateYAMLFile(mockDocument);

      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
    });
  });

  suite('updateDiagnostics', () => {
    let mockDiagnosticCollection: any;

    setup(() => {
      mockDiagnosticCollection = {
        set: sinon.stub(),
        delete: sinon.stub(),
        dispose: sinon.stub()
      };
      
      // Mock the diagnostic collection creation
      sinon.stub(vscode.languages, 'createDiagnosticCollection').returns(mockDiagnosticCollection);
    });

    test('should update diagnostics for workflow files', async () => {
      const invalidYaml = `
name: Test
on: push
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
`;
      (mockDocument.getText as sinon.SinonStub).returns(invalidYaml);

      await validationService.updateDiagnostics(mockDocument);

      assert.ok(mockDiagnosticCollection.set.calledOnce);
      const [uri, diagnostics] = mockDiagnosticCollection.set.firstCall.args;
      assert.strictEqual(uri, mockDocument.uri);
      assert.ok(Array.isArray(diagnostics));
    });

    test('should not update diagnostics for non-workflow files', async () => {
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
    let mockDiagnosticCollection: any;

    setup(() => {
      mockDiagnosticCollection = {
        set: sinon.stub(),
        delete: sinon.stub(),
        dispose: sinon.stub()
      };
      
      sinon.stub(vscode.languages, 'createDiagnosticCollection').returns(mockDiagnosticCollection);
    });

    test('should clear diagnostics for document', () => {
      validationService.clearDiagnostics(mockDocument);

      assert.ok(mockDiagnosticCollection.delete.calledOnce);
      assert.strictEqual(mockDiagnosticCollection.delete.firstCall.args[0], mockDocument.uri);
    });
  });

  suite('Action Reference Validation', () => {
    test('should validate action reference format', async () => {
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
      (mockDocument.getText as sinon.SinonStub).returns(yamlWithInvalidAction);

      const result = await validationService.validateYAMLFile(mockDocument);

      // Should have warnings for invalid action references
      assert.ok(result.warnings.some(warning => warning.code === 'invalid-action-reference'));
    });

    test('should accept valid action references', async () => {
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
      (mockDocument.getText as sinon.SinonStub).returns(yamlWithValidActions);

      const result = await validationService.validateYAMLFile(mockDocument);

      // Should not have warnings for valid action references
      assert.ok(!result.warnings.some(warning => warning.code === 'invalid-action-reference'));
    });
  });

  suite('Error Positioning', () => {
    test('should provide accurate line numbers for errors', async () => {
      const yamlWithError = `name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Invalid step
        invalid_property: value`;
      
      (mockDocument.getText as sinon.SinonStub).returns(yamlWithError);

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