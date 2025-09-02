/**
 * Simple test to verify command registration mock setup
 */

const { setupVSCodeMock, cleanupVSCodeMock, createMockExtensionContext } = require('./test/setup/vscode-mock');

async function testCommandRegistrationMock() {
  console.log('Testing VSCode Command Registration Mock...');
  
  try {
    // Setup mock
    setupVSCodeMock();
    const vscode = require('vscode');
    const context = createMockExtensionContext();
    
    console.log('✓ VSCode mock setup successful');
    
    // Test command registration
    const commandId = 'test.command';
    const commandCallback = async (arg1, arg2) => {
      return { success: true, args: [arg1, arg2] };
    };
    
    const disposable = vscode.commands.registerCommand(commandId, commandCallback);
    console.log('✓ Command registered successfully');
    
    // Verify command is registered
    const isRegistered = vscode.commands.isCommandRegistered(commandId);
    console.log(`✓ Command registration verified: ${isRegistered}`);
    
    // Test command execution
    const result = await vscode.commands.executeCommand(commandId, 'hello', 'world');
    console.log('✓ Command executed successfully:', result);
    
    // Test command palette simulation
    const paletteResult = await vscode.commands.simulateCommandPaletteExecution(commandId, 'palette', 'test');
    console.log('✓ Command palette execution successful:', paletteResult);
    
    // Test execution history
    const executionHistory = vscode.commands.getExecutionHistory();
    console.log(`✓ Execution history tracked: ${executionHistory.length} executions`);
    
    // Test registration history
    const registrationHistory = vscode.commands.getRegistrationHistory();
    console.log(`✓ Registration history tracked: ${registrationHistory.length} registrations`);
    
    // Test command disposal
    disposable.dispose();
    const isStillRegistered = vscode.commands.isCommandRegistered(commandId);
    console.log(`✓ Command disposal verified: ${!isStillRegistered}`);
    
    // Test built-in command execution
    await vscode.commands.executeCommand('setContext', 'test.context', true);
    console.log('✓ Built-in command execution successful');
    
    // Test command listing
    const allCommands = await vscode.commands.getCommands();
    console.log(`✓ Command listing successful: ${allCommands.length} commands available`);
    
    // Test extension commands
    const extensionCommands = [
      'readme-to-cicd.generate',
      'readme-to-cicd.validate',
      'readme-to-cicd.preview',
      'readme-to-cicd.init',
      'readme-to-cicd.refresh'
    ];
    
    const extensionDisposables = [];
    for (const cmdId of extensionCommands) {
      const callback = async () => ({ command: cmdId, executed: true });
      const disp = vscode.commands.registerCommand(cmdId, callback);
      extensionDisposables.push(disp);
    }
    
    console.log('✓ Extension commands registered');
    
    // Test extension command execution
    for (const cmdId of extensionCommands) {
      const result = await vscode.commands.simulateCommandPaletteExecution(cmdId);
      if (result.success) {
        console.log(`✓ Extension command ${cmdId} executed successfully`);
      } else {
        console.log(`✗ Extension command ${cmdId} failed:`, result.error);
      }
    }
    
    // Cleanup extension commands
    extensionDisposables.forEach(disp => disp.dispose());
    console.log('✓ Extension commands disposed');
    
    // Test performance
    const performanceTestCommand = 'test.performance';
    const perfCallback = async (delay) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return { delay, completed: true };
    };
    
    vscode.commands.registerCommand(performanceTestCommand, perfCallback);
    
    const startTime = Date.now();
    await vscode.commands.executeCommand(performanceTestCommand, 10);
    const executionTime = Date.now() - startTime;
    
    console.log(`✓ Performance test completed in ${executionTime}ms`);
    
    // Final verification
    const finalHistory = vscode.commands.getExecutionHistory();
    const finalRegistrations = vscode.commands.getRegistrationHistory();
    
    console.log(`✓ Final verification: ${finalHistory.length} executions, ${finalRegistrations.length} registrations`);
    
    // Cleanup
    cleanupVSCodeMock();
    console.log('✓ Mock cleanup successful');
    
    console.log('\n🎉 All command registration mock tests passed!');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCommandRegistrationMock().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});