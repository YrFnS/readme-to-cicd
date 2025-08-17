import * as vscode from 'vscode';
import { ExtensionManager } from './core/ExtensionManager';
import { ExtensionConfiguration } from './core/types';

let extensionManager: ExtensionManager | undefined;

/**
 * Main extension activation function
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    console.log('README to CI/CD extension is activating...');

    // Load configuration
    const configuration: ExtensionConfiguration = {
      debugMode: vscode.workspace.getConfiguration('readme-to-cicd').get('debugMode', false),
      notificationLevel: vscode.workspace.getConfiguration('readme-to-cicd').get('notificationLevel', 'all'),
      enableFeedbackRequests: vscode.workspace.getConfiguration('readme-to-cicd').get('enableFeedbackRequests', true),
      logLevel: vscode.workspace.getConfiguration('readme-to-cicd').get('logLevel', 'info'),
      enableFileLogging: vscode.workspace.getConfiguration('readme-to-cicd').get('enableFileLogging', false)
    };

    // Initialize extension manager with error handling
    extensionManager = new ExtensionManager(context, configuration);
    
    // Initialize the extension with comprehensive error handling
    await extensionManager.initialize();
    
    console.log('README to CI/CD extension is now active!');
  } catch (error) {
    console.error('Failed to activate README to CI/CD extension:', error);
    
    // Show user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const choice = await vscode.window.showErrorMessage(
      `Failed to activate README to CI/CD extension: ${errorMessage}`,
      'Retry',
      'Report Issue'
    );

    if (choice === 'Retry') {
      // Retry activation
      setTimeout(() => activate(context), 1000);
    } else if (choice === 'Report Issue' && extensionManager) {
      await extensionManager.handleCriticalError(
        error instanceof Error ? error : new Error(errorMessage),
        'extension-activation'
      );
    }
    
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
    // Don't use extension manager here as it might be disposed
  }
}

/**
 * Get the extension manager instance (for testing or other components)
 */
export function getExtensionManager(): ExtensionManager | undefined {
  return extensionManager;
}

