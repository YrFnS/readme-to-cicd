/**
 * Simple test to verify basic window mock functionality
 */

const { setupVSCodeMock, cleanupVSCodeMock } = require('./out/test/setup/vscode-mock');

async function testBasicWindowMock() {
  console.log('Testing basic window mock functionality...');
  
  try {
    setupVSCodeMock();
    const vscode = require('vscode');
    
    // Test 1: Default behavior
    console.log('Test 1: Default behavior');
    const result1 = await vscode.window.showInformationMessage('Test', 'OK', 'Cancel');
    console.log('Result 1:', result1); // Should be 'OK' (first item)
    
    // Test 2: Configured response
    console.log('Test 2: Configured response');
    vscode.window.setMockConfig({ informationResponse: 'Custom' });
    const result2 = await vscode.window.showInformationMessage('Test', 'OK', 'Cancel');
    console.log('Result 2:', result2); // Should be 'Custom'
    
    // Test 3: Reset and cancellation
    console.log('Test 3: Reset and cancellation');
    vscode.window.resetMockConfig();
    console.log('Config after reset:', vscode.window.getMockConfig());
    
    vscode.window.setMockConfig({ simulateCancel: true });
    console.log('Config after setting cancel:', vscode.window.getMockConfig());
    
    const result3 = await vscode.window.showInformationMessage('Test', 'OK', 'Cancel');
    console.log('Result 3:', result3); // Should be undefined
    
    if (result3 === undefined) {
      console.log('✓ Cancellation works correctly');
    } else {
      console.log('❌ Cancellation failed, got:', result3);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    cleanupVSCodeMock();
  }
}

testBasicWindowMock();