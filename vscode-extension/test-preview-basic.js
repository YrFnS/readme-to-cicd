/**
 * Basic Preview Functionality Test
 * 
 * Simple test to verify the preview webview functionality works
 */

const { WebviewManager } = require('./out/src/core/WebviewManager');

// Mock VS Code API
const mockVscode = {
  Uri: {
    file: (path) => ({ fsPath: path, path }),
    joinPath: (base, ...segments) => ({ fsPath: base.fsPath + '/' + segments.join('/') })
  },
  window: {
    createWebviewPanel: (viewType, title, showOptions, options) => ({
      viewType,
      title,
      webview: {
        html: '',
        asWebviewUri: (uri) => uri,
        postMessage: async (message) => {
          console.log('Webview message sent:', message.type);
          return true;
        },
        onDidReceiveMessage: () => ({ dispose: () => {} })
      },
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => console.log('Panel disposed')
    })
  },
  ViewColumn: {
    One: 1,
    Two: 2
  }
};

// Mock extension context
const mockContext = {
  subscriptions: [],
  workspaceState: {
    get: () => ({}),
    update: () => Promise.resolve()
  },
  globalState: {
    get: () => ({}),
    update: () => Promise.resolve()
  },
  extensionPath: '/test/extension'
};

async function testPreviewFunctionality() {
  console.log('Testing Preview Webview Functionality...\n');

  try {
    // Create WebviewManager
    const webviewManager = new WebviewManager({
      extensionUri: mockVscode.Uri.file('/test/extension'),
      context: mockContext,
      enableLogging: true
    });

    console.log('✓ WebviewManager created successfully');

    // Test 1: Create preview panel
    const previewData = {
      workflows: [
        {
          filename: 'ci.yml',
          content: 'name: CI\non: [push, pull_request]',
          type: 'ci',
          description: 'CI workflow',
          estimatedSize: 150
        }
      ],
      configuration: {
        frameworks: ['nodejs'],
        workflowTypes: ['ci'],
        deploymentPlatform: 'github-pages',
        deploymentConfig: {}
      },
      detectedFrameworks: [],
      estimatedFiles: ['ci.yml']
    };

    const panel = await webviewManager.createPreviewPanel(previewData);
    console.log('✓ Preview panel created:', panel.title);

    // Test 2: Send preview update
    const success = await webviewManager.sendMessage('preview', {
      type: 'previewUpdate',
      payload: previewData
    });
    console.log('✓ Preview update sent:', success);

    // Test 3: Test mock workflow generation
    const configuration = {
      frameworks: ['nodejs', 'python'],
      workflowTypes: ['ci', 'cd'],
      deploymentPlatform: 'netlify',
      deploymentConfig: {}
    };

    const workflows = webviewManager.generateMockWorkflows(configuration);
    console.log('✓ Mock workflows generated:', workflows.length, 'workflows');
    
    workflows.forEach(workflow => {
      console.log(`  - ${workflow.filename} (${workflow.type}): ${workflow.content.split('\n').length} lines`);
    });

    // Test 4: Test message handling
    await webviewManager.handleWebviewMessage('preview', {
      type: 'requestInitialPreview',
      payload: {}
    });
    console.log('✓ Initial preview request handled');

    await webviewManager.handleWebviewMessage('preview', {
      type: 'generateWorkflows',
      payload: {
        configuration,
        workflows
      }
    });
    console.log('✓ Generate workflows request handled');

    // Cleanup
    webviewManager.dispose();
    console.log('✓ WebviewManager disposed');

    console.log('\n🎉 All preview functionality tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testPreviewFunctionality();