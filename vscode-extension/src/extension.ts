import * as vscode from 'vscode';
import { ExtensionManager } from './core/ExtensionManager';

let extensionManager: ExtensionManager | undefined;

/**
 * Main extension activation function
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    console.log('README to CI/CD extension is activating...');

    // Initialize extension manager
    extensionManager = new ExtensionManager(context);
    
    // Activate the extension
    await extensionManager.activate();
    
    console.log('README to CI/CD extension is now active!');
  } catch (error) {
    console.error('Failed to activate README to CI/CD extension:', error);
    vscode.window.showErrorMessage(
      `Failed to activate README to CI/CD extension: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export async function deactivate(): Promise<void> {
  try {
    console.log('README to CI/CD extension is deactivating...');
    
    if (extensionManager) {
      await extensionManager.deactivate();
      extensionManager = undefined;
    }
    
    console.log('README to CI/CD extension is now deactivated');
  } catch (error) {
    console.error('Error during extension deactivation:', error);
  }
}

