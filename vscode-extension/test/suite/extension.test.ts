import * as assert from 'assert';
import * as sinon from 'sinon';
import { setupVSCodeMock, cleanupVSCodeMock, createMockExtensionContext } from '../setup/vscode-mock';
import { MockExtensionManager } from '../mocks/ExtensionManager.mock';

suite('Extension Activation and Lifecycle Tests', () => {
  let mockContext: any;
  let extensionManager: MockExtensionManager;

  setup(() => {
    setupVSCodeMock();
    mockContext = createMockExtensionContext();
  });

  teardown(() => {
    cleanupVSCodeMock();
    sinon.restore();
  });

  test('ExtensionManager should initialize successfully', async () => {
    extensionManager = new MockExtensionManager(mockContext);
    
    assert.ok(extensionManager, 'ExtensionManager should be created');
    assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should not be activated initially');
  });

  test('ExtensionManager should activate all components', async () => {
    extensionManager = new MockExtensionManager(mockContext);
    
    await extensionManager.activate();
    
    assert.strictEqual(extensionManager.isExtensionActivated(), true, 'Extension should be activated');
    assert.ok(extensionManager.getWorkspaceManager(), 'WorkspaceManager should be available');
    assert.ok(extensionManager.getSettingsManager(), 'SettingsManager should be available');
    assert.ok(extensionManager.getCommandManager(), 'CommandManager should be available');
    assert.ok(extensionManager.getFileWatcherManager(), 'FileWatcherManager should be available');
  });

  test('ExtensionManager should handle activation errors gracefully', async () => {
    extensionManager = new MockExtensionManager(mockContext);
    
    // Mock an error during workspace initialization
    extensionManager.getWorkspaceManager().initialize.rejects(new Error('Workspace initialization failed'));
    
    try {
      await extensionManager.activate();
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw an Error');
      assert.ok(error.message.includes('Workspace initialization failed'), 'Should include workspace failure message');
    }
    
    assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should not be activated after error');
  });

  test('ExtensionManager should deactivate successfully', async () => {
    extensionManager = new MockExtensionManager(mockContext);
    
    await extensionManager.activate();
    assert.strictEqual(extensionManager.isExtensionActivated(), true, 'Extension should be activated');
    
    // Test deactivation
    await extensionManager.deactivate();
    assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should be deactivated');
  });

  test('ExtensionManager should handle deactivation errors gracefully', async () => {
    extensionManager = new MockExtensionManager(mockContext);
    
    await extensionManager.activate();
    
    // Mock dispose error
    extensionManager.getWorkspaceManager().dispose.throws(new Error('Dispose error'));
    
    // Deactivation should not throw even if components fail to dispose
    await extensionManager.deactivate();
    assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should be deactivated despite errors');
  });

  test('ExtensionManager should prevent double activation', async () => {
    extensionManager = new MockExtensionManager(mockContext);
    
    // First activation
    await extensionManager.activate();
    assert.strictEqual(extensionManager.isExtensionActivated(), true, 'Extension should be activated');
    
    // Second activation should not throw but should warn
    const consoleSpy = sinon.spy(console, 'warn');
    await extensionManager.activate();
    
    assert.strictEqual(extensionManager.isExtensionActivated(), true, 'Extension should still be activated');
    assert.ok(consoleSpy.calledWith('Extension is already activated'), 'Should warn about double activation');
  });

  test('ExtensionManager should handle deactivation when not activated', async () => {
    extensionManager = new MockExtensionManager(mockContext);
    
    // Deactivate without activating first
    await extensionManager.deactivate();
    
    // Should not throw and should remain not activated
    assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should remain not activated');
  });
});