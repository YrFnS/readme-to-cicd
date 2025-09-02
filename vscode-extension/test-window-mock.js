/**
 * Simple test script to verify VSCode Window API Mock Configuration
 */

const { setupVSCodeMock, cleanupVSCodeMock } = require('./out/test/setup/vscode-mock');

async function testWindowMockConfiguration() {
  console.log('Testing VSCode Window API Mock Configuration...');
  
  try {
    // Setup mock
    setupVSCodeMock();
    const vscode = require('vscode');
    
    console.log('✓ VSCode module loaded successfully');
    
    // Test basic window API availability
    if (!vscode.window) {
      throw new Error('Window API not available');
    }
    console.log('✓ Window API is available');
    
    // Test configuration methods
    if (typeof vscode.window.setMockConfig !== 'function') {
      throw new Error('setMockConfig method not available');
    }
    console.log('✓ Configuration methods available');
    
    // Test message configuration
    vscode.window.setMockConfig({
      informationResponse: 'Test Response'
    });
    
    const result = await vscode.window.showInformationMessage('Test message', 'Option 1', 'Option 2');
    if (result !== 'Test Response') {
      throw new Error(`Expected 'Test Response', got '${result}'`);
    }
    console.log('✓ Information message configuration works');
    
    // Test message history
    const history = vscode.window.getMessageHistory();
    if (history.length !== 1) {
      throw new Error(`Expected 1 message in history, got ${history.length}`);
    }
    if (history[0].type !== 'information') {
      throw new Error(`Expected 'information' type, got '${history[0].type}'`);
    }
    console.log('✓ Message history tracking works');
    
    // Test quick pick configuration
    vscode.window.setMockConfig({
      quickPickResponse: 'Selected Item'
    });
    
    const quickPickResult = await vscode.window.showQuickPick(['Item 1', 'Item 2', 'Item 3']);
    if (quickPickResult !== 'Selected Item') {
      throw new Error(`Expected 'Selected Item', got '${quickPickResult}'`);
    }
    console.log('✓ Quick pick configuration works');
    
    // Test input box configuration
    vscode.window.setMockConfig({
      inputBoxResponse: 'User Input'
    });
    
    const inputResult = await vscode.window.showInputBox({ prompt: 'Enter value' });
    if (inputResult !== 'User Input') {
      throw new Error(`Expected 'User Input', got '${inputResult}'`);
    }
    console.log('✓ Input box configuration works');
    
    // Test cancellation simulation
    vscode.window.resetMockConfig(); // Clear all previous config
    vscode.window.setMockConfig({ simulateCancel: true });
    
    const cancelResult = await vscode.window.showInformationMessage('Cancel test', 'OK');
    if (cancelResult !== undefined) {
      throw new Error(`Expected undefined (cancelled), got '${cancelResult}'`);
    }
    console.log('✓ Cancellation simulation works');
    
    // Test configuration reset
    vscode.window.resetMockConfig();
    const config = vscode.window.getMockConfig();
    if (Object.keys(config).length !== 0) {
      throw new Error(`Expected empty config after reset, got ${JSON.stringify(config)}`);
    }
    console.log('✓ Configuration reset works');
    
    // Test interaction history
    await vscode.window.showQuickPick(['Test']);
    const interactionHistory = vscode.window.getInteractionHistory();
    if (interactionHistory.length !== 1) {
      throw new Error(`Expected 1 interaction in history, got ${interactionHistory.length}`);
    }
    console.log('✓ Interaction history tracking works');
    
    console.log('\n🎉 All VSCode Window API Mock Configuration tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    cleanupVSCodeMock();
  }
}

// Run the test
testWindowMockConfiguration().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});