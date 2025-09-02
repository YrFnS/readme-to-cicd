/**
 * Simple Test for Extension Test Utilities
 * 
 * Basic validation that the test utilities can be imported and used.
 */

import * as assert from 'assert';
import { 
  ExtensionTestContext,
  ExtensionTestSuite,
  ExtensionTestUtils
} from './extension-test-utilities';

suite('Extension Test Utilities - Simple Tests', () => {
  test('should create ExtensionTestContext', () => {
    const context = new ExtensionTestContext();
    assert.ok(context, 'Should create context');
    assert.ok(context.config, 'Should have config');
    assert.ok(context.sandbox, 'Should have sandbox');
  });

  test('should create ExtensionTestSuite', () => {
    const suite = new ExtensionTestSuite();
    assert.ok(suite, 'Should create suite');
    
    const context = suite.getContext();
    assert.ok(context, 'Should get context');
  });

  test('should create README-to-CICD test suite', () => {
    const suite = ExtensionTestUtils.createReadmeToCICDTestSuite();
    assert.ok(suite, 'Should create README-to-CICD suite');
    
    const context = suite.getContext();
    assert.ok(context.config.mockReadmeContent, 'Should have mock README content');
    assert.ok(context.config.mockWorkflowFiles, 'Should have mock workflow files');
  });

  test('should create minimal test context', async () => {
    const context = ExtensionTestUtils.createMinimalTestContext();
    assert.ok(context, 'Should create minimal context');
    assert.ok(context.config.enableVSCodeMock, 'Should enable VSCode mock');
    assert.ok(!context.config.enableFileSystemMock, 'Should not enable file system mock');
  });

  test('should create integration test context', async () => {
    const context = ExtensionTestUtils.createIntegrationTestContext();
    assert.ok(context, 'Should create integration context');
    assert.ok(context.config.enableVSCodeMock, 'Should enable VSCode mock');
    assert.ok(context.config.enableFileSystemMock, 'Should enable file system mock');
    assert.ok(context.config.enableWindowMock, 'Should enable window mock');
  });

  test('should have proper configuration defaults', () => {
    const context = new ExtensionTestContext();
    
    assert.strictEqual(context.config.enableVSCodeMock, true, 'Should enable VSCode mock by default');
    assert.strictEqual(context.config.enableFileSystemMock, true, 'Should enable file system mock by default');
    assert.strictEqual(context.config.enableWindowMock, true, 'Should enable window mock by default');
    assert.strictEqual(context.config.simulateUserInteraction, true, 'Should simulate user interaction by default');
    assert.strictEqual(context.config.mockWorkspaceFolder, '/mock/workspace', 'Should have default workspace folder');
  });

  test('should allow configuration overrides', () => {
    const context = new ExtensionTestContext({
      enableVSCodeMock: false,
      mockWorkspaceFolder: '/custom/workspace',
      simulateUserInteraction: false
    });
    
    assert.strictEqual(context.config.enableVSCodeMock, false, 'Should override VSCode mock setting');
    assert.strictEqual(context.config.mockWorkspaceFolder, '/custom/workspace', 'Should override workspace folder');
    assert.strictEqual(context.config.simulateUserInteraction, false, 'Should override user interaction setting');
  });

  test('should initialize and cleanup properly', async () => {
    const context = new ExtensionTestContext({
      enableVSCodeMock: true,
      enableFileSystemMock: false,
      enableWindowMock: false
    });
    
    // Test setup
    await context.setup();
    assert.ok(context.vscode, 'Should initialize VSCode mock');
    assert.ok(context.mockContext, 'Should initialize mock context');
    
    // Test cleanup
    context.cleanup();
    // Should not throw errors
  });

  test('should track registered commands and providers', async () => {
    const context = new ExtensionTestContext();
    await context.setup();
    
    // Initially empty
    assert.strictEqual(context.registeredCommands.size, 0, 'Should start with no commands');
    assert.strictEqual(context.registeredProviders.size, 0, 'Should start with no providers');
    
    // Register a command
    const mockCallback = () => ({ success: true });
    context.registerCommand('test.command', mockCallback);
    
    assert.strictEqual(context.registeredCommands.size, 1, 'Should track registered command');
    assert.ok(context.registeredCommands.has('test.command'), 'Should have registered command');
    
    context.cleanup();
  });

  test('should provide test statistics', async () => {
    const context = new ExtensionTestContext();
    await context.setup();
    
    const stats = context.getTestStats();
    assert.ok(stats, 'Should provide stats');
    assert.strictEqual(typeof stats.registeredCommands, 'number', 'Should have command count');
    assert.strictEqual(typeof stats.registeredProviders, 'number', 'Should have provider count');
    assert.strictEqual(typeof stats.createdDisposables, 'number', 'Should have disposable count');
    assert.ok(Array.isArray(stats.messageHistory), 'Should have message history array');
    assert.ok(Array.isArray(stats.interactionHistory), 'Should have interaction history array');
    
    context.cleanup();
  });
});