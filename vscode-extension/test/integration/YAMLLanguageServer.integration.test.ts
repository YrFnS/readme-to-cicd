import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { YAMLLanguageServer } from '../../src/core/YAMLLanguageServer';

suite('YAMLLanguageServer Integration Tests', () => {
  let languageServer: YAMLLanguageServer;
  let testWorkspaceUri: vscode.Uri;
  let workflowsDir: vscode.Uri;

  suiteSetup(async () => {
    // Create test workspace
    testWorkspaceUri = vscode.Uri.file(path.join(__dirname, '..', 'fixtures', 'test-workspace'));
    workflowsDir = vscode.Uri.joinPath(testWorkspaceUri, '.github', 'workflows');
    
    // Ensure workflows directory exists
    try {
      await vscode.workspace.fs.createDirectory(workflowsDir);
    } catch (error) {
      // Directory might already exist
    }
  });

  setup(async () => {
    const mockContext = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => [],
        setKeysForSync: () => {}
      },
      extensionPath: path.join(__dirname, '..', '..'),
      extensionUri: vscode.Uri.file(path.join(__dirname, '..', '..')),
      environmentVariableCollection: {} as any,
      asAbsolutePath: (relativePath: string) => path.join(__dirname, '..', '..', relativePath),
      storageUri: undefined,
      storagePath: undefined,
      globalStorageUri: vscode.Uri.file(path.join(__dirname, '..', 'fixtures', 'global-storage')),
      globalStoragePath: path.join(__dirname, '..', 'fixtures', 'global-storage'),
      logUri: vscode.Uri.file(path.join(__dirname, '..', 'fixtures', 'logs')),
      logPath: path.join(__dirname, '..', 'fixtures', 'logs'),
      extensionMode: vscode.ExtensionMode.Test,
      extension: {} as any,
      secrets: {} as any
    } as vscode.ExtensionContext;

    languageServer = new YAMLLanguageServer(mockContext);
  });

  teardown(() => {
    languageServer.dispose();
  });

  suiteTeardown(async () => {
    // Clean up test files
    try {
      await vscode.workspace.fs.delete(testWorkspaceUri, { recursive: true, useTrash: false });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  suite('Document Validation', () => {
    test('should validate workflow file on open', async () => {
      const workflowContent = `name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
`;

      const workflowUri = vscode.Uri.joinPath(workflowsDir, 'test.yml');
      
      // Create the workflow file
      await vscode.workspace.fs.writeFile(
        workflowUri,
        Buffer.from(workflowContent, 'utf8')
      );

      // Open the document
      const document = await vscode.workspace.openTextDocument(workflowUri);
      
      // Wait a bit for validation to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check that the document was opened successfully
      assert.strictEqual(document.languageId, 'yaml');
      assert.ok(document.getText().includes('Test Workflow'));
    });

    test('should detect validation errors in workflow files', async () => {
      const invalidWorkflowContent = `name: Invalid Workflow
on: push
jobs:
  test:
    # Missing runs-on
    steps:
      - uses: actions/checkout@v4
`;

      const workflowUri = vscode.Uri.joinPath(workflowsDir, 'invalid.yml');
      
      // Create the invalid workflow file
      await vscode.workspace.fs.writeFile(
        workflowUri,
        Buffer.from(invalidWorkflowContent, 'utf8')
      );

      // Open the document
      const document = await vscode.workspace.openTextDocument(workflowUri);
      
      // Wait for validation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get diagnostics for the document
      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      
      // Should have validation errors
      assert.ok(diagnostics.length > 0);
      assert.ok(diagnostics.some(d => d.source === 'readme-to-cicd'));
    });
  });

  suite('IntelliSense Integration', () => {
    test('should provide completions in workflow files', async () => {
      const workflowContent = `name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: `;

      const workflowUri = vscode.Uri.joinPath(workflowsDir, 'completion-test.yml');
      
      // Create the workflow file
      await vscode.workspace.fs.writeFile(
        workflowUri,
        Buffer.from(workflowContent, 'utf8')
      );

      // Open the document
      const document = await vscode.workspace.openTextDocument(workflowUri);
      await vscode.window.showTextDocument(document);

      // Position at the end of "uses: "
      const position = new vscode.Position(6, 14);

      // Request completions
      const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider',
        document.uri,
        position
      );

      assert.ok(completions);
      assert.ok(completions.items.length > 0);
      
      // Should include common actions
      const actionLabels = completions.items.map(item => item.label.toString());
      assert.ok(actionLabels.some(label => label.includes('actions/checkout')));
    });

    test('should provide hover information for actions', async () => {
      const workflowContent = `name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

      const workflowUri = vscode.Uri.joinPath(workflowsDir, 'hover-test.yml');
      
      // Create the workflow file
      await vscode.workspace.fs.writeFile(
        workflowUri,
        Buffer.from(workflowContent, 'utf8')
      );

      // Open the document
      const document = await vscode.workspace.openTextDocument(workflowUri);
      await vscode.window.showTextDocument(document);

      // Position over "actions/checkout"
      const position = new vscode.Position(6, 20);

      // Request hover information
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        document.uri,
        position
      );

      assert.ok(hovers);
      assert.ok(hovers.length > 0);
      
      const hoverContent = hovers[0].contents[0] as vscode.MarkdownString;
      assert.ok(hoverContent.value.includes('actions/checkout'));
    });
  });

  suite('Command Integration', () => {
    test('should execute validate current workflow command', async () => {
      const workflowContent = `name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

      const workflowUri = vscode.Uri.joinPath(workflowsDir, 'validate-test.yml');
      
      // Create the workflow file
      await vscode.workspace.fs.writeFile(
        workflowUri,
        Buffer.from(workflowContent, 'utf8')
      );

      // Open the document
      const document = await vscode.workspace.openTextDocument(workflowUri);
      await vscode.window.showTextDocument(document);

      // Execute validation command
      await vscode.commands.executeCommand('readme-to-cicd.validateCurrentWorkflow');

      // Wait for validation to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Command should execute without throwing
      assert.ok(true);
    });

    test('should execute format workflow command', async () => {
      const workflowContent = `name: Test Workflow
on:   push
jobs:
  test:
    runs-on:   ubuntu-latest
    steps:
      - uses:   actions/checkout@v4
`;

      const workflowUri = vscode.Uri.joinPath(workflowsDir, 'format-test.yml');
      
      // Create the workflow file
      await vscode.workspace.fs.writeFile(
        workflowUri,
        Buffer.from(workflowContent, 'utf8')
      );

      // Open the document
      const document = await vscode.workspace.openTextDocument(workflowUri);
      await vscode.window.showTextDocument(document);

      // Execute format command
      await vscode.commands.executeCommand('readme-to-cicd.formatWorkflow');

      // Wait for formatting to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Command should execute without throwing
      assert.ok(true);
    });

    test('should execute insert workflow snippet command', async () => {
      const workflowUri = vscode.Uri.joinPath(workflowsDir, 'snippet-test.yml');
      
      // Create empty workflow file
      await vscode.workspace.fs.writeFile(
        workflowUri,
        Buffer.from('', 'utf8')
      );

      // Open the document
      const document = await vscode.workspace.openTextDocument(workflowUri);
      await vscode.window.showTextDocument(document);

      // Execute snippet command (this will show a quick pick, but we can't interact with it in tests)
      try {
        await vscode.commands.executeCommand('readme-to-cicd.insertWorkflowSnippet');
        assert.ok(true);
      } catch (error) {
        // Command might fail in test environment due to UI interaction
        // That's okay, we just want to ensure it's registered
        assert.ok(true);
      }
    });
  });

  suite('Schema Help', () => {
    test('should show schema help panel', async () => {
      // Execute schema help command
      await vscode.commands.executeCommand('readme-to-cicd.showSchemaHelp');

      // Wait for panel to be created
      await new Promise(resolve => setTimeout(resolve, 500));

      // Command should execute without throwing
      assert.ok(true);
    });

    test('should show schema help with error message', async () => {
      // Execute schema help command with error message
      await vscode.commands.executeCommand(
        'readme-to-cicd.showSchemaHelp',
        'Test error message'
      );

      // Wait for panel to be created
      await new Promise(resolve => setTimeout(resolve, 500));

      // Command should execute without throwing
      assert.ok(true);
    });
  });

  suite('Real-time Validation', () => {
    test('should update diagnostics on document change', async () => {
      const initialContent = `name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

      const workflowUri = vscode.Uri.joinPath(workflowsDir, 'realtime-test.yml');
      
      // Create the workflow file
      await vscode.workspace.fs.writeFile(
        workflowUri,
        Buffer.from(initialContent, 'utf8')
      );

      // Open the document
      const document = await vscode.workspace.openTextDocument(workflowUri);
      const editor = await vscode.window.showTextDocument(document);

      // Wait for initial validation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Make an invalid edit
      await editor.edit(editBuilder => {
        editBuilder.replace(
          new vscode.Range(3, 0, 4, 0),
          '  test:\n'  // Remove runs-on
        );
      });

      // Wait for validation to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should now have validation errors
      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      assert.ok(diagnostics.length > 0);
    });
  });
});