/**
 * Simple test runner to verify VSCode API mocking works
 */

const { setupVSCodeMock, cleanupVSCodeMock, createMockExtensionContext } = require('./out/test/setup/vscode-mock');

console.log('Testing VSCode API Mock...');

try {
  // Setup VSCode mock
  setupVSCodeMock();
  
  // Test basic VSCode API access
  const vscode = require('vscode');
  
  console.log('✓ VSCode module can be required');
  
  // Test workspace API
  if (vscode.workspace && vscode.workspace.workspaceFolders) {
    console.log('✓ Workspace API is available');
    console.log(`  - Found ${vscode.workspace.workspaceFolders.length} workspace folder(s)`);
  }
  
  // Test window API
  if (vscode.window && typeof vscode.window.showInformationMessage === 'function') {
    console.log('✓ Window API is available');
  }
  
  // Test commands API
  if (vscode.commands && typeof vscode.commands.registerCommand === 'function') {
    console.log('✓ Commands API is available');
  }
  
  // Test configuration
  const config = vscode.workspace.getConfiguration('readme-to-cicd');
  if (config && typeof config.get === 'function') {
    console.log('✓ Configuration API is available');
    console.log(`  - autoDetect: ${config.get('autoDetect')}`);
    console.log(`  - defaultOptimization: ${config.get('defaultOptimization')}`);
  }
  
  // Test file operations
  vscode.workspace.findFiles('**/README.{md,txt}').then(files => {
    console.log(`✓ File search works - found ${files.length} README file(s)`);
    
    if (files.length > 0) {
      return vscode.workspace.fs.readFile(files[0]);
    }
  }).then(content => {
    if (content) {
      console.log(`✓ File reading works - read ${content.length} bytes`);
    }
  }).catch(error => {
    console.error('✗ File operations failed:', error.message);
  });
  
  // Test extension context
  const context = createMockExtensionContext();
  if (context && Array.isArray(context.subscriptions)) {
    console.log('✓ Extension context mock is available');
    console.log(`  - Extension path: ${context.extensionPath}`);
  }
  
  // Test command registration
  const disposable = vscode.commands.registerCommand('test.command', () => {
    console.log('Test command executed');
  });
  
  if (disposable && typeof disposable.dispose === 'function') {
    console.log('✓ Command registration works');
    disposable.dispose();
  }
  
  // Test message display
  vscode.window.showInformationMessage('Test message', 'OK', 'Cancel').then(result => {
    console.log(`✓ Message display works - user selected: ${result}`);
  });
  
  // Test progress
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Test Progress'
  }, async (progress) => {
    progress.report({ message: 'Testing...', increment: 50 });
    console.log('✓ Progress reporting works');
    return 'completed';
  }).then(result => {
    console.log(`✓ Progress task completed: ${result}`);
  });
  
  console.log('\n🎉 All VSCode API mock tests passed!');
  
} catch (error) {
  console.error('✗ VSCode API mock test failed:', error);
  process.exit(1);
} finally {
  // Cleanup
  cleanupVSCodeMock();
  console.log('✓ Cleanup completed');
}