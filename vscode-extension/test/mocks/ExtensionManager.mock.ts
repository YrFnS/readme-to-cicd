/**
 * ExtensionManager Mock
 * 
 * Simplified mock implementation of ExtensionManager for testing
 * without complex dependencies and initialization requirements.
 */

import * as sinon from 'sinon';

export class MockExtensionManager {
  private activated: boolean = false;
  private workspaceManager: any;
  private settingsManager: any;
  private commandManager: any;
  private fileWatcherManager: any;

  constructor(private context: any) {
    this.workspaceManager = {
      initialize: sinon.stub().resolves(),
      dispose: sinon.stub()
    };
    
    this.settingsManager = {
      initialize: sinon.stub().resolves(),
      dispose: sinon.stub()
    };
    
    this.commandManager = {
      initialize: sinon.stub().resolves(),
      dispose: sinon.stub()
    };
    
    this.fileWatcherManager = {
      initialize: sinon.stub().resolves(),
      dispose: sinon.stub()
    };
  }

  async activate(): Promise<void> {
    if (this.activated) {
      console.warn('Extension is already activated');
      return;
    }

    // Simulate activation process
    await this.workspaceManager.initialize();
    await this.settingsManager.initialize();
    await this.commandManager.initialize();
    await this.fileWatcherManager.initialize();
    
    this.activated = true;
  }

  async deactivate(): Promise<void> {
    if (!this.activated) {
      return;
    }

    // Simulate deactivation process
    this.workspaceManager.dispose();
    this.settingsManager.dispose();
    this.commandManager.dispose();
    this.fileWatcherManager.dispose();
    
    this.activated = false;
  }

  isExtensionActivated(): boolean {
    return this.activated;
  }

  getWorkspaceManager(): any {
    return this.workspaceManager;
  }

  getSettingsManager(): any {
    return this.settingsManager;
  }

  getCommandManager(): any {
    return this.commandManager;
  }

  getFileWatcherManager(): any {
    return this.fileWatcherManager;
  }
}