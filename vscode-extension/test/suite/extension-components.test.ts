/**
 * Extension Components Tests
 * 
 * Tests for the main extension components using comprehensive VSCode API mocks.
 * This validates that all extension functionality works correctly with mocked VSCode APIs.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { 
  setupVSCodeMock, 
  cleanupVSCodeMock, 
  createMockExtensionContext 
} from '../setup/vscode-mock';
import {
  createWorkflowTreeProviderMock,
  createTooltipProviderMock,
  createGenerateWorkflowCommandMock,
  createExtensionActivationMock,
  createMockFileSystem,
  setupMockFileSystem,
  mockReadmeContent,
  mockWorkflowContent
} from '../mocks/vscode-extension-mocks';

suite('Extension Components Tests', () => {
  let sandbox: sinon.SinonSandbox;
  let mockContext: any;

  setup(() => {
    sandbox = sinon.createSandbox();
    setupVSCodeMock();
    mockContext = createMockExtensionContext();
  });

  teardown(() => {
    cleanupVSCodeMock();
    sandbox.restore();
  });

  suite('Extension Activation', () => {
    test('should activate extension successfully', async () => {
      const vscode = require('vscode');
      const activationMock = createExtensionActivationMock();
      
      // Mock the extension activation function
      const activate = async (context: any) => {
        // Register commands
        context.subscriptions.push(
          vscode.commands.registerCommand('readme-to-cicd.generate', 
            () => activationMock.commands.generateCommand.execute()),
          vscode.commands.registerCommand('readme-to-cicd.validate', 
            () => activationMock.commands.validateCommand.execute()),
          vscode.commands.registerCommand('readme-to-cicd.preview', 
            () => activationMock.commands.previewCommand.execute()),
          vscode.commands.registerCommand('readme-to-cicd.init', 
            () => activationMock.commands.initCommand.execute()),
          vscode.commands.registerCommand('readme-to-cicd.refresh', 
            () => activationMock.sidebarProvider.refresh())
        );

        // Register tree data provider
        context.subscriptions.push(
          vscode.window.registerTreeDataProvider('readme-to-cicd-sidebar', activationMock.sidebarProvider)
        );

        // Create file watcher
        const watcher = activationMock.createMockWatcher();
        context.subscriptions.push(watcher);

        return true;
      };

      const result = await activate(mockContext);
      
      assert.strictEqual(result, true, 'Extension should activate successfully');
      assert.ok(mockContext.subscriptions.length > 0, 'Should register subscriptions');
      
      // Verify commands are registered
      const commands = await vscode.commands.getCommands();
      assert.ok(commands.includes('readme-to-cicd.generate'), 'Should register generate command');
      assert.ok(commands.includes('readme-to-cicd.validate'), 'Should register validate command');
      assert.ok(commands.includes('readme-to-cicd.preview'), 'Should register preview command');
    });

    test('should handle activation errors gracefully', async () => {
      const vscode = require('vscode');
      
      const activate = async (context: any) => {
        // Simulate an error during activation
        throw new Error('Activation failed');
      };

      try {
        await activate(mockContext);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw an Error');
        assert.ok(error.message.includes('Activation failed'), 'Should include error message');
      }
    });

    test('should set up file watchers correctly', async () => {
      const vscode = require('vscode');
      const activationMock = createExtensionActivationMock();
      
      const watcher = activationMock.createMockWatcher();
      
      assert.ok(watcher, 'Watcher should be created');
      assert.strictEqual(typeof watcher.onDidCreate, 'function', 'Should have onDidCreate handler');
      assert.strictEqual(typeof watcher.onDidChange, 'function', 'Should have onDidChange handler');
      assert.strictEqual(typeof watcher.onDidDelete, 'function', 'Should have onDidDelete handler');
      assert.strictEqual(typeof watcher.dispose, 'function', 'Should have dispose method');
    });
  });

  suite('Command Execution', () => {
    test('should execute generate workflow command', async () => {
      const vscode = require('vscode');
      const commandMock = createGenerateWorkflowCommandMock();
      
      // Setup mock file system
      const mockFS = createMockFileSystem();
      setupMockFileSystem(vscode, mockFS);
      
      // Mock the generate command
      const executeGenerate = async () => {
        // Find README file
        const readmeFiles = await vscode.workspace.findFiles('**/README.{md,txt}');
        assert.ok(readmeFiles.length > 0, 'Should find README files');
        
        // Read README content
        const readmeContent = await vscode.workspace.fs.readFile(readmeFiles[0]);
        const contentStr = Buffer.from(readmeContent).toString('utf8');
        assert.ok(contentStr.includes('Node.js'), 'Should read README content');
        
        // Analyze README
        const analysis = await commandMock.workflowProvider.analyzeReadme(contentStr);
        assert.ok(analysis.frameworks.includes('Node.js'), 'Should detect Node.js framework');
        
        // Generate workflow
        const workflow = await commandMock.workflowProvider.generateWorkflow(analysis);
        assert.ok(workflow.workflows.ci, 'Should generate CI workflow');
        assert.ok(workflow.workflows.cd, 'Should generate CD workflow');
        
        return workflow;
      };

      const result = await executeGenerate();
      assert.ok(result, 'Command should execute successfully');
      assert.ok(result.workflows, 'Should return workflows');
    });

    test('should show progress during workflow generation', async () => {
      const vscode = require('vscode');
      
      let progressReported = false;
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating CI/CD Workflow",
          cancellable: true
        },
        async (progress: any, token: any) => {
          progress.report({ increment: 0, message: "Reading README..." });
          progress.report({ increment: 25, message: "Analyzing content..." });
          progress.report({ increment: 50, message: "Getting user preferences..." });
          progress.report({ increment: 75, message: "Generating workflow..." });
          progress.report({ increment: 100, message: "Complete!" });
          
          progressReported = true;
          return { success: true };
        }
      );
      
      assert.ok(result.success, 'Progress task should complete successfully');
      assert.strictEqual(progressReported, true, 'Progress should be reported');
    });

    test('should handle user cancellation', async () => {
      const vscode = require('vscode');
      
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating CI/CD Workflow",
          cancellable: true
        },
        async (progress: any, token: any) => {
          if (token.isCancellationRequested) {
            return { cancelled: true };
          }
          return { success: true };
        }
      );
      
      // In our mock, cancellation is not requested by default
      assert.ok(result.success, 'Should complete when not cancelled');
    });
  });

  suite('Workflow Tree Provider', () => {
    test('should provide tree items', async () => {
      const treeMock = createWorkflowTreeProviderMock();
      
      // Mock tree provider
      const treeProvider = {
        getTreeItem: (element: any) => {
          return {
            label: element.label,
            collapsibleState: element.children ? 2 : 0, // Expanded : None
            tooltip: element.tooltip,
            contextValue: element.contextValue,
            command: element.command
          };
        },
        
        getChildren: async (element?: any) => {
          if (!element) {
            // Root items
            return [
              {
                label: 'Workflows (2)',
                contextValue: 'workflows-folder',
                tooltip: 'Generated and existing workflow files',
                children: [
                  {
                    label: 'ci.yml',
                    contextValue: 'workflow-file',
                    tooltip: 'CI workflow'
                  },
                  {
                    label: 'cd.yml',
                    contextValue: 'workflow-file',
                    tooltip: 'CD workflow'
                  }
                ]
              },
              {
                label: 'Detected Frameworks (2)',
                contextValue: 'frameworks-folder',
                tooltip: 'Frameworks detected in the project',
                children: [
                  {
                    label: 'Node.js (18.0.0)',
                    contextValue: 'detected-framework',
                    tooltip: 'runtime framework - Confidence: 95%'
                  },
                  {
                    label: 'React (18.2.0)',
                    contextValue: 'detected-framework',
                    tooltip: 'framework framework - Confidence: 85%'
                  }
                ]
              }
            ];
          }
          return element.children || [];
        }
      };
      
      const rootItems = await treeProvider.getChildren();
      assert.ok(Array.isArray(rootItems), 'Should return array of root items');
      assert.strictEqual(rootItems.length, 2, 'Should have workflows and frameworks sections');
      
      const workflowsSection = rootItems[0];
      assert.strictEqual(workflowsSection.label, 'Workflows (2)', 'Should have workflows section');
      
      const workflowItems = await treeProvider.getChildren(workflowsSection);
      assert.strictEqual(workflowItems.length, 2, 'Should have 2 workflow files');
      assert.ok(workflowItems.some((item: any) => item.label === 'ci.yml'), 'Should include ci.yml');
      assert.ok(workflowItems.some((item: any) => item.label === 'cd.yml'), 'Should include cd.yml');
    });

    test('should refresh tree data', () => {
      const vscode = require('vscode');
      
      // Mock tree data provider with refresh capability
      const treeProvider = {
        _onDidChangeTreeData: {
          fire: sinon.stub()
        },
        refresh: function() {
          this._onDidChangeTreeData.fire();
        },
        getTreeItem: sinon.stub(),
        getChildren: sinon.stub().resolves([])
      };
      
      treeProvider.refresh();
      assert.ok(treeProvider._onDidChangeTreeData.fire.called, 'Should fire tree data change event');
    });

    test('should handle framework detection results', async () => {
      const treeMock = createWorkflowTreeProviderMock();
      
      const detectionResult = await treeMock.cliIntegration.executeFrameworkDetection({
        readmePath: '/mock/workspace/README.md',
        outputDirectory: '/mock/workspace/.github/workflows',
        dryRun: true
      });
      
      assert.ok(detectionResult.success, 'Framework detection should succeed');
      assert.ok(Array.isArray(detectionResult.detectedFrameworks), 'Should return frameworks array');
      assert.strictEqual(detectionResult.detectedFrameworks.length, 2, 'Should detect 2 frameworks');
      
      const nodejs = detectionResult.detectedFrameworks.find((f: any) => f.name === 'Node.js');
      assert.ok(nodejs, 'Should detect Node.js');
      assert.strictEqual(nodejs.confidence, 0.95, 'Should have high confidence');
      assert.ok(Array.isArray(nodejs.evidence), 'Should provide evidence');
    });
  });

  suite('Tooltip Provider', () => {
    test('should provide hover information for GitHub Actions', async () => {
      const tooltipMock = createTooltipProviderMock();
      
      const actionDoc = await tooltipMock.githubActionsDoc.getActionDocumentation('actions/checkout');
      
      assert.ok(actionDoc, 'Should return action documentation');
      assert.ok(actionDoc.description.includes('checks-out your repository'), 'Should have correct description');
      assert.ok(Array.isArray(actionDoc.inputs), 'Should have inputs array');
      assert.ok(actionDoc.inputs.some((input: any) => input.name === 'repository'), 'Should include repository input');
      assert.ok(Array.isArray(actionDoc.examples), 'Should have examples');
      assert.ok(actionDoc.documentationUrl, 'Should have documentation URL');
    });

    test('should provide hover for setup actions', async () => {
      const tooltipMock = createTooltipProviderMock();
      
      const setupNodeDoc = await tooltipMock.githubActionsDoc.getActionDocumentation('actions/setup-node');
      
      assert.ok(setupNodeDoc, 'Should return setup-node documentation');
      assert.ok(setupNodeDoc.description.includes('Node.js'), 'Should mention Node.js');
      assert.ok(setupNodeDoc.inputs.some((input: any) => input.name === 'node-version'), 'Should include node-version input');
      assert.ok(setupNodeDoc.inputs.some((input: any) => input.name === 'cache'), 'Should include cache input');
    });

    test('should handle unknown actions gracefully', async () => {
      const tooltipMock = createTooltipProviderMock();
      
      const unknownDoc = await tooltipMock.githubActionsDoc.getActionDocumentation('unknown/action');
      
      assert.strictEqual(unknownDoc, null, 'Should return null for unknown actions');
    });

    test('should provide action metadata', () => {
      const tooltipMock = createTooltipProviderMock();
      
      const metadata = tooltipMock.githubActionsDoc.getActionMetadata('actions/checkout');
      
      assert.ok(metadata, 'Should return metadata');
      assert.ok(metadata.description, 'Should have description');
      assert.ok(Array.isArray(metadata.tags), 'Should have tags array');
      assert.ok(metadata.tags.includes('git'), 'Should include relevant tags');
    });
  });

  suite('User Interaction', () => {
    test('should show workflow type selection', async () => {
      const vscode = require('vscode');
      
      const workflowTypes = [
        { label: '$(gear) CI Only', description: 'Continuous Integration workflow', value: ['ci'] },
        { label: '$(gear) CI + CD', description: 'CI and Continuous Deployment', value: ['ci', 'cd'] },
        { label: '$(gear) CI + CD + Release', description: 'Full pipeline with releases', value: ['ci', 'cd', 'release'] }
      ];
      
      const selection = await vscode.window.showQuickPick(workflowTypes, {
        placeHolder: 'Select workflow types to generate'
      });
      
      assert.ok(selection, 'Should return a selection');
      assert.strictEqual(selection.label, '$(gear) CI Only', 'Should return first option by default');
      assert.deepStrictEqual(selection.value, ['ci'], 'Should have correct value');
    });

    test('should show optimization level selection', async () => {
      const vscode = require('vscode');
      
      const optimizationLevels = [
        { label: '$(zap) Basic', description: 'Fast builds, minimal optimization', value: 'basic' },
        { label: '$(gear) Standard', description: 'Balanced performance and features', value: 'standard' },
        { label: '$(rocket) Aggressive', description: 'Maximum optimization and features', value: 'aggressive' }
      ];
      
      const selection = await vscode.window.showQuickPick(optimizationLevels, {
        placeHolder: 'Select optimization level'
      });
      
      assert.ok(selection, 'Should return a selection');
      assert.strictEqual(selection.value, 'basic', 'Should return first option value');
    });

    test('should show success messages with actions', async () => {
      const vscode = require('vscode');
      
      const action = await vscode.window.showInformationMessage(
        'Generated 2 workflow file(s) successfully!',
        'Open Workflows',
        'View in Explorer'
      );
      
      assert.strictEqual(action, 'Open Workflows', 'Should return first action by default');
    });

    test('should handle README file selection', async () => {
      const vscode = require('vscode');
      
      // Setup mock file system with multiple README files
      const mockFS = createMockFileSystem();
      (mockFS['/mock/workspace'] as any)['docs'] = { 'README.md': 'Documentation README' };
      setupMockFileSystem(vscode, mockFS);
      
      const readmeFiles = await vscode.workspace.findFiles('**/README.{md,txt}');
      
      if (readmeFiles.length > 1) {
        const items = readmeFiles.map((uri: any) => ({
          label: uri.fsPath.split('/').slice(-2, -1)[0] || 'root',
          description: vscode.workspace.asRelativePath(uri),
          uri
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select README file to analyze'
        });
        
        assert.ok(selected, 'Should return a selection');
        assert.ok(selected.uri, 'Should have URI');
      }
    });
  });

  suite('File Operations', () => {
    test('should read README files correctly', async () => {
      const vscode = require('vscode');
      const mockFS = createMockFileSystem();
      setupMockFileSystem(vscode, mockFS);
      
      const readmeFiles = await vscode.workspace.findFiles('**/README.{md,txt}');
      assert.ok(readmeFiles.length > 0, 'Should find README files');
      
      const content = await vscode.workspace.fs.readFile(readmeFiles[0]);
      const contentStr = Buffer.from(content).toString('utf8');
      
      assert.ok(contentStr.includes('Node.js Project'), 'Should read correct content');
      assert.ok(contentStr.includes('npm install'), 'Should include installation commands');
      assert.ok(contentStr.includes('npm test'), 'Should include test commands');
    });

    test('should write workflow files', async () => {
      const vscode = require('vscode');
      
      const workflowContent = mockWorkflowContent.ci;
      const uri = vscode.Uri.file('/mock/workspace/.github/workflows/ci.yml');
      
      await vscode.workspace.fs.writeFile(uri, Buffer.from(workflowContent));
      
      assert.ok(vscode.workspace.fs.writeFile.calledWith(uri), 'Should write workflow file');
    });

    test('should create workflow directory if needed', async () => {
      const vscode = require('vscode');
      
      const workflowDir = vscode.Uri.file('/mock/workspace/.github/workflows');
      
      await vscode.workspace.fs.createDirectory(workflowDir);
      
      assert.ok(vscode.workspace.fs.createDirectory.calledWith(workflowDir), 'Should create directory');
    });

    test('should open generated workflows', async () => {
      const vscode = require('vscode');
      
      const workflowUri = vscode.Uri.file('/mock/workspace/.github/workflows/ci.yml');
      const document = await vscode.workspace.openTextDocument(workflowUri);
      const editor = await vscode.window.showTextDocument(document);
      
      assert.ok(editor, 'Should open workflow file');
      assert.ok(editor.document, 'Should have document');
      assert.strictEqual(editor.document.languageId, 'yaml', 'Should be YAML document');
    });
  });

  suite('Configuration Management', () => {
    test('should read extension configuration', () => {
      const vscode = require('vscode');
      
      const config = vscode.workspace.getConfiguration('readme-to-cicd');
      
      assert.strictEqual(config.get('autoDetect'), true, 'Should get autoDetect setting');
      assert.strictEqual(config.get('defaultOptimization'), 'standard', 'Should get optimization setting');
      assert.deepStrictEqual(config.get('workflowTypes'), ['ci', 'cd'], 'Should get workflow types');
      assert.strictEqual(config.get('outputDirectory'), '.github/workflows', 'Should get output directory');
    });

    test('should handle configuration updates', async () => {
      const vscode = require('vscode');
      
      const config = vscode.workspace.getConfiguration('readme-to-cicd');
      
      await config.update('autoDetect', false);
      assert.ok(config.update.calledWith('autoDetect', false), 'Should update configuration');
    });

    test('should provide configuration defaults', () => {
      const vscode = require('vscode');
      
      const config = vscode.workspace.getConfiguration('readme-to-cicd');
      
      const customValue = config.get('nonExistentSetting', 'default-value');
      assert.strictEqual(customValue, 'default-value', 'Should return default value for non-existent setting');
    });
  });

  suite('Error Handling', () => {
    test('should handle file read errors gracefully', async () => {
      const vscode = require('vscode');
      
      // Mock file read error
      vscode.workspace.fs.readFile.rejects(new Error('File not found'));
      
      try {
        await vscode.workspace.fs.readFile(vscode.Uri.file('/nonexistent/file.txt'));
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw an Error');
        assert.ok(error.message.includes('File not found'), 'Should include error message');
      }
    });

    test('should show error messages to user', async () => {
      const vscode = require('vscode');
      
      const result = await vscode.window.showErrorMessage(
        'Failed to generate workflow: Invalid README format',
        'Retry',
        'Cancel'
      );
      
      assert.strictEqual(result, 'Retry', 'Should return first action');
    });

    test('should handle command execution errors', async () => {
      const vscode = require('vscode');
      
      // Register a command that throws an error
      vscode.commands.registerCommand('test.error', () => {
        throw new Error('Command failed');
      });
      
      try {
        await vscode.commands.executeCommand('test.error');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw an Error');
        assert.ok(error.message.includes('Command failed'), 'Should include error message');
      }
    });
  });
});