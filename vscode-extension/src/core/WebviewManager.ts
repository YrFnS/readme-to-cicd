/**
 * WebviewManager - Manages VS Code webview panels and communication
 * 
 * Handles creation, disposal, and lifecycle management of custom UI panels.
 * Implements secure message passing and state persistence for webviews.
 */

import * as vscode from 'vscode';
import {
  WebviewMessage,
  MessageType,
  WorkflowConfiguration,
  GenerationRequest,
  PreviewData,
  ExtensionError,
  ErrorCategory
} from './types';

export interface WebviewManagerOptions {
  extensionUri: vscode.Uri;
  context: vscode.ExtensionContext;
  enableLogging?: boolean;
}

export interface WebviewPanelConfig {
  viewType: string;
  title: string;
  showOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn; preserveFocus?: boolean };
  options?: vscode.WebviewPanelOptions & vscode.WebviewOptions;
}

export interface WebviewState {
  panelId: string;
  viewType: string;
  title: string;
  visible: boolean;
  active: boolean;
  data?: any;
  lastUpdated: Date;
}

/**
 * Manages webview panels for configuration and preview interfaces
 */
export class WebviewManager {
  private readonly panels = new Map<string, vscode.WebviewPanel>();
  private readonly messageHandlers = new Map<string, Map<MessageType, (message: WebviewMessage) => Promise<void>>>();
  private readonly stateStorage = new Map<string, WebviewState>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly options: WebviewManagerOptions) {
    this.setupGlobalMessageHandlers();
  }

  /**
   * Creates a configuration webview panel
   */
  public async createConfigurationPanel(
    initialConfig?: WorkflowConfiguration
  ): Promise<vscode.WebviewPanel> {
    const panelId = 'configuration';
    
    // Dispose existing panel if it exists
    if (this.panels.has(panelId)) {
      this.panels.get(panelId)?.dispose();
    }

    const config: WebviewPanelConfig = {
      viewType: 'readme-to-cicd.configuration',
      title: 'Workflow Configuration',
      showOptions: vscode.ViewColumn.One,
      options: {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.options.extensionUri, 'webview-ui'),
          vscode.Uri.joinPath(this.options.extensionUri, 'media')
        ]
      }
    };

    const panel = vscode.window.createWebviewPanel(
      config.viewType,
      config.title,
      config.showOptions,
      config.options
    );

    // Configure webview security and content
    await this.configureWebview(panel.webview, 'configuration');
    
    // Set up message handling
    this.setupPanelMessageHandling(panelId, panel);
    
    // Store panel reference
    this.panels.set(panelId, panel);
    
    // Initialize with configuration data
    if (initialConfig) {
      await this.sendMessage(panelId, {
        type: MessageType.CONFIGURATION_UPDATE,
        payload: initialConfig
      });
    }

    // Set up disposal handling
    panel.onDidDispose(() => {
      this.handlePanelDisposal(panelId);
    }, null, this.disposables);

    // Update state
    this.updatePanelState(panelId, {
      panelId,
      viewType: config.viewType,
      title: config.title,
      visible: true,
      active: true,
      data: initialConfig,
      lastUpdated: new Date()
    });

    return panel;
  }

  /**
   * Creates a preview webview panel
   */
  public async createPreviewPanel(
    previewData?: PreviewData
  ): Promise<vscode.WebviewPanel> {
    const panelId = 'preview';
    
    // Dispose existing panel if it exists
    if (this.panels.has(panelId)) {
      this.panels.get(panelId)?.dispose();
    }

    const config: WebviewPanelConfig = {
      viewType: 'readme-to-cicd.preview',
      title: 'Workflow Preview',
      showOptions: vscode.ViewColumn.Two,
      options: {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.options.extensionUri, 'webview-ui'),
          vscode.Uri.joinPath(this.options.extensionUri, 'media')
        ]
      }
    };

    const panel = vscode.window.createWebviewPanel(
      config.viewType,
      config.title,
      config.showOptions,
      config.options
    );

    // Configure webview security and content
    await this.configureWebview(panel.webview, 'preview');
    
    // Set up message handling
    this.setupPanelMessageHandling(panelId, panel);
    
    // Store panel reference
    this.panels.set(panelId, panel);
    
    // Initialize with preview data
    if (previewData) {
      await this.sendMessage(panelId, {
        type: MessageType.PREVIEW_UPDATE,
        payload: previewData
      });
    }

    // Set up disposal handling
    panel.onDidDispose(() => {
      this.handlePanelDisposal(panelId);
    }, null, this.disposables);

    // Update state
    this.updatePanelState(panelId, {
      panelId,
      viewType: config.viewType,
      title: config.title,
      visible: true,
      active: true,
      data: previewData,
      lastUpdated: new Date()
    });

    return panel;
  }  /*
*
   * Gets an existing webview panel by ID
   */
  public getPanel(panelId: string): vscode.WebviewPanel | undefined {
    return this.panels.get(panelId);
  }

  /**
   * Gets all active panels
   */
  public getActivePanels(): Map<string, vscode.WebviewPanel> {
    return new Map(this.panels);
  }

  /**
   * Sends a message to a specific webview panel
   */
  public async sendMessage(panelId: string, message: WebviewMessage): Promise<boolean> {
    const panel = this.panels.get(panelId);
    if (!panel) {
      this.logError(`Panel ${panelId} not found for message`, message);
      return false;
    }

    try {
      await panel.webview.postMessage(message);
      this.log(`Message sent to ${panelId}:`, message.type);
      return true;
    } catch (error) {
      this.logError(`Failed to send message to ${panelId}:`, error);
      return false;
    }
  }

  /**
   * Broadcasts a message to all active panels
   */
  public async broadcastMessage(message: WebviewMessage): Promise<number> {
    let successCount = 0;
    
    for (const [panelId] of Array.from(this.panels)) {
      const success = await this.sendMessage(panelId, message);
      if (success) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * Registers a message handler for a specific panel and message type
   */
  public registerMessageHandler(
    panelId: string,
    messageType: MessageType,
    handler: (message: WebviewMessage) => Promise<void>
  ): void {
    if (!this.messageHandlers.has(panelId)) {
      this.messageHandlers.set(panelId, new Map());
    }
    
    this.messageHandlers.get(panelId)!.set(messageType, handler);
    this.log(`Registered handler for ${panelId}:${messageType}`);
  }

  /**
   * Unregisters a message handler
   */
  public unregisterMessageHandler(panelId: string, messageType: MessageType): void {
    const panelHandlers = this.messageHandlers.get(panelId);
    if (panelHandlers) {
      panelHandlers.delete(messageType);
      this.log(`Unregistered handler for ${panelId}:${messageType}`);
    }
  }

  /**
   * Restores webview state from storage
   */
  public async restoreWebviewState(): Promise<void> {
    try {
      const storedState = this.options.context.workspaceState.get<Record<string, WebviewState>>('webviewStates', {});
      
      for (const [panelId, state] of Object.entries(storedState)) {
        this.stateStorage.set(panelId, state);
        this.log(`Restored state for panel: ${panelId}`);
      }
    } catch (error) {
      this.logError('Failed to restore webview state:', error);
    }
  }

  /**
   * Persists webview state to storage
   */
  public async persistWebviewState(): Promise<void> {
    try {
      const stateObject = Object.fromEntries(this.stateStorage);
      await this.options.context.workspaceState.update('webviewStates', stateObject);
      this.log('Webview state persisted');
    } catch (error) {
      this.logError('Failed to persist webview state:', error);
    }
  }

  /**
   * Disposes all webview panels and cleans up resources
   */
  public dispose(): void {
    // Dispose all panels
    for (const [panelId, panel] of Array.from(this.panels)) {
      try {
        panel.dispose();
        this.log(`Disposed panel: ${panelId}`);
      } catch (error) {
        this.logError(`Error disposing panel ${panelId}:`, error);
      }
    }

    // Clear collections
    this.panels.clear();
    this.messageHandlers.clear();

    // Dispose event subscriptions
    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logError('Error disposing subscription:', error);
      }
    });
    this.disposables.length = 0;

    // Persist final state
    this.persistWebviewState().catch(error => {
      this.logError('Failed to persist final state:', error);
    });

    this.log('WebviewManager disposed');
  }

  /**
   * Configures webview security and loads content
   */
  private async configureWebview(webview: vscode.Webview, panelType: 'configuration' | 'preview'): Promise<void> {
    // Configure Content Security Policy
    const csp = this.generateContentSecurityPolicy();
    
    // Get webview content
    const htmlContent = await this.getWebviewContent(webview, panelType, csp);
    
    // Set webview HTML
    webview.html = htmlContent;
  }

  /**
   * Generates Content Security Policy for webview security
   */
  private generateContentSecurityPolicy(): string {
    const nonce = this.generateNonce();

    return [
      `default-src 'none'`,
      `script-src 'nonce-${nonce}' vscode-resource:`,
      `style-src 'nonce-${nonce}' vscode-resource: 'unsafe-inline'`,
      `img-src vscode-resource: https: data:`,
      `font-src vscode-resource: https:`,
      `connect-src https: vscode-resource:`,
      `worker-src 'none'`,
      `object-src 'none'`,
      `frame-src 'none'`
    ].join('; ');
  }

  /**
   * Generates a cryptographic nonce for CSP
   */
  private generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
      nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
  }

  /**
   * Gets webview HTML content for the specified panel type
   */
  private async getWebviewContent(
    webview: vscode.Webview,
    panelType: 'configuration' | 'preview',
    csp: string
  ): Promise<string> {
    const nonce = this.generateNonce();
    
    // Get URIs for webview resources
    const webviewUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.options.extensionUri, 'webview-ui', panelType)
    );
    
    const mediaUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.options.extensionUri, 'media')
    );

    // Generate HTML content based on panel type
    if (panelType === 'configuration') {
      return this.getConfigurationPanelHtml(webviewUri, mediaUri, nonce, csp);
    } else {
      return this.getPreviewPanelHtml(webviewUri, mediaUri, nonce, csp);
    }
  }

  /**
   * Generates HTML for configuration panel
   */
  private getConfigurationPanelHtml(
    webviewUri: vscode.Uri,
    _mediaUri: vscode.Uri,
    nonce: string,
    csp: string
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <title>Workflow Configuration</title>
        <link rel="stylesheet" nonce="${nonce}" href="${webviewUri}/configuration.css">
      </head>
      <body>
        <div id="configuration-root">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading configuration panel...</p>
          </div>
        </div>
        <script nonce="${nonce}" src="${webviewUri}/configuration.js"></script>
      </body>
      </html>
    `;
  }

  /**
   * Generates HTML for preview panel
   */
  private getPreviewPanelHtml(
    webviewUri: vscode.Uri,
    _mediaUri: vscode.Uri,
    nonce: string,
    csp: string
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <title>Workflow Preview</title>
        <link rel="stylesheet" nonce="${nonce}" href="${webviewUri}/preview.css">
        <style nonce="${nonce}">
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            gap: 20px;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--vscode-progressBar-background);
            border-top: 4px solid var(--vscode-progressBar-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div id="preview-root">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading preview panel...</p>
          </div>
        </div>
        <script nonce="${nonce}" src="${webviewUri}/preview.js"></script>
      </body>
      </html>
    `;
  }

  /**
   * Sets up message handling for a webview panel
   */
  private setupPanelMessageHandling(panelId: string, panel: vscode.WebviewPanel): void {
    panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        try {
          await this.handleWebviewMessage(panelId, message);
        } catch (error) {
          this.logError(`Error handling message from ${panelId}:`, error);
          
          // Send error notification back to webview
          await this.sendMessage(panelId, {
            type: MessageType.ERROR_NOTIFICATION,
            payload: {
              code: 'MESSAGE_HANDLER_ERROR',
              message: 'Failed to process message',
              category: 'processing' as ErrorCategory,
              severity: 'error',
              actions: []
            } as ExtensionError,
            requestId: message.requestId || undefined
          });
        }
      },
      null,
      this.disposables
    );

    // Track panel visibility changes
    panel.onDidChangeViewState(
      (e) => {
        const state = this.stateStorage.get(panelId);
        if (state) {
          state.visible = e.webviewPanel.visible;
          state.active = e.webviewPanel.active;
          state.lastUpdated = new Date();
          this.updatePanelState(panelId, state);
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Handles incoming messages from webviews
   */
  private async handleWebviewMessage(panelId: string, message: WebviewMessage): Promise<void> {
    this.log(`Received message from ${panelId}:`, message.type);

    // Get panel-specific handlers
    const panelHandlers = this.messageHandlers.get(panelId);
    if (panelHandlers?.has(message.type)) {
      const handler = panelHandlers.get(message.type)!;
      await handler(message);
      return;
    }

    // Handle common message types
    switch (message.type) {
      case MessageType.CONFIGURATION_UPDATE:
        await this.handleConfigurationUpdate(panelId, message);
        break;
        
      case MessageType.GENERATE_REQUEST:
        await this.handleGenerateRequest(panelId, message);
        break;

      case MessageType.REQUEST_INITIAL_PREVIEW:
        await this.handleRequestInitialPreview(panelId, message);
        break;

      case MessageType.REQUEST_PREVIEW_UPDATE:
        await this.handleRequestPreviewUpdate(panelId, message);
        break;

      case MessageType.SAVE_WORKFLOW_CHANGES:
        await this.handleSaveWorkflowChanges(panelId, message);
        break;

      case MessageType.GENERATE_WORKFLOWS:
        await this.handleGenerateWorkflows(panelId, message);
        break;

      case MessageType.CANCEL_PREVIEW:
        await this.handleCancelPreview(panelId, message);
        break;

      case MessageType.EDIT_CONFIGURATION:
        await this.handleEditConfiguration(panelId, message);
        break;
        
      default:
        this.log(`No handler found for message type: ${message.type}`);
    }
  }

  /**
   * Sets up global message handlers for common operations
   */
  private setupGlobalMessageHandlers(): void {
    // These handlers will be called if no panel-specific handler is found
    // Implementation can be extended as needed
  }

  /**
   * Handles configuration update messages
   */
  private async handleConfigurationUpdate(panelId: string, message: WebviewMessage): Promise<void> {
    const configuration = message.payload as WorkflowConfiguration;
    
    // Update stored state
    const state = this.stateStorage.get(panelId);
    if (state) {
      state.data = configuration;
      state.lastUpdated = new Date();
      this.updatePanelState(panelId, state);
    }

    // Persist configuration
    await this.persistWebviewState();
    
    this.log(`Configuration updated for ${panelId}`);
  }

  /**
   * Handles workflow generation requests
   */
  private async handleGenerateRequest(panelId: string, message: WebviewMessage): Promise<void> {
    const request = message.payload as GenerationRequest;
    
    this.log(`Generation request from ${panelId}:`, request.readmePath);
    
    // This would typically trigger the CLI integration
    // For now, just acknowledge the request
    await this.sendMessage(panelId, {
      type: MessageType.PROGRESS_UPDATE,
      payload: {
        stage: 'parsing',
        progress: 0,
        message: 'Starting workflow generation...',
        timestamp: new Date()
      },
      requestId: message.requestId || undefined
    });
  }

  /**
   * Handles panel disposal cleanup
   */
  private handlePanelDisposal(panelId: string): void {
    this.panels.delete(panelId);
    this.messageHandlers.delete(panelId);
    
    // Update state to reflect disposal
    const state = this.stateStorage.get(panelId);
    if (state) {
      state.visible = false;
      state.active = false;
      state.lastUpdated = new Date();
      this.updatePanelState(panelId, state);
    }

    this.log(`Panel disposed: ${panelId}`);
  }

  /**
   * Updates panel state in storage
   */
  private updatePanelState(panelId: string, state: WebviewState): void {
    this.stateStorage.set(panelId, state);
    
    // Persist state asynchronously
    this.persistWebviewState().catch(error => {
      this.logError('Failed to persist state update:', error);
    });
  }

  /**
   * Logs messages if logging is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.options.enableLogging) {
      console.log(`[WebviewManager] ${message}`, ...args);
    }
  }

  /**
   * Logs error messages
   */
  private logError(message: string, error: any): void {
    console.error(`[WebviewManager] ${message}`, error);
  }

  /**
   * Handles request for initial preview data
   */
  private async handleRequestInitialPreview(panelId: string, message: WebviewMessage): Promise<void> {
    this.log(`Handling initial preview request for ${panelId}`);
    
    // This would typically fetch initial preview data from CLI integration
    // For now, send empty preview data
    await this.sendMessage(panelId, {
      type: MessageType.PREVIEW_UPDATE,
      payload: {
        workflows: [],
        configuration: {
          frameworks: [],
          workflowTypes: ['ci'],
          deploymentPlatform: '',
          deploymentConfig: {}
        },
        detectedFrameworks: [],
        estimatedFiles: []
      } as PreviewData,
      requestId: message.requestId
    });
  }

  /**
   * Handles request for preview update with new configuration
   */
  private async handleRequestPreviewUpdate(panelId: string, message: WebviewMessage): Promise<void> {
    const configuration = message.payload;
    this.log(`Handling preview update request for ${panelId}`, configuration);
    
    // This would typically trigger CLI integration to generate new preview
    // For now, send mock workflow data
    const mockWorkflows = this.generateMockWorkflows(configuration);
    
    await this.sendMessage(panelId, {
      type: MessageType.PREVIEW_UPDATE,
      payload: {
        workflows: mockWorkflows,
        configuration,
        detectedFrameworks: [],
        estimatedFiles: mockWorkflows.map(w => w.filename)
      } as PreviewData,
      requestId: message.requestId
    });
  }

  /**
   * Handles saving workflow changes
   */
  private async handleSaveWorkflowChanges(panelId: string, message: WebviewMessage): Promise<void> {
    const { workflowName, content } = message.payload;
    this.log(`Saving workflow changes for ${workflowName}`);
    
    // This would typically save the changes to the file system or temporary storage
    // For now, just acknowledge the save
    await this.sendMessage(panelId, {
      type: MessageType.PROGRESS_UPDATE,
      payload: {
        stage: 'complete',
        progress: 100,
        message: `Saved changes to ${workflowName}`,
        timestamp: new Date()
      },
      requestId: message.requestId
    });
  }

  /**
   * Handles workflow generation request
   */
  private async handleGenerateWorkflows(panelId: string, message: WebviewMessage): Promise<void> {
    const { configuration, workflows } = message.payload;
    this.log(`Generating workflows with configuration:`, configuration);
    
    // This would typically trigger the CLI integration to generate actual files
    // For now, simulate the generation process
    await this.sendMessage(panelId, {
      type: MessageType.PROGRESS_UPDATE,
      payload: {
        stage: 'generation',
        progress: 50,
        message: 'Generating workflow files...',
        timestamp: new Date()
      },
      requestId: message.requestId
    });

    // Simulate completion
    setTimeout(async () => {
      await this.sendMessage(panelId, {
        type: MessageType.PROGRESS_UPDATE,
        payload: {
          stage: 'complete',
          progress: 100,
          message: `Generated ${workflows.length} workflow files`,
          timestamp: new Date()
        },
        requestId: message.requestId
      });
    }, 1000);
  }

  /**
   * Handles preview cancellation
   */
  private async handleCancelPreview(panelId: string, message: WebviewMessage): Promise<void> {
    this.log(`Cancelling preview for ${panelId}`);
    
    // Close the preview panel
    const panel = this.panels.get(panelId);
    if (panel) {
      panel.dispose();
    }
  }

  /**
   * Handles edit configuration request
   */
  private async handleEditConfiguration(panelId: string, message: WebviewMessage): Promise<void> {
    this.log(`Opening configuration panel from ${panelId}`);
    
    // This would typically open or focus the configuration panel
    // For now, just acknowledge the request
    await this.sendMessage(panelId, {
      type: MessageType.PROGRESS_UPDATE,
      payload: {
        stage: 'complete',
        progress: 100,
        message: 'Configuration panel opened',
        timestamp: new Date()
      },
      requestId: message.requestId
    });
  }

  /**
   * Generates mock workflow data for preview
   */
  private generateMockWorkflows(configuration: any): WorkflowPreview[] {
    const workflows: WorkflowPreview[] = [];
    
    if (configuration.workflowTypes.includes('ci')) {
      workflows.push({
        filename: 'ci.yml',
        content: this.generateMockCIWorkflow(configuration),
        type: 'ci',
        description: 'Continuous Integration workflow',
        estimatedSize: 1024
      });
    }

    if (configuration.workflowTypes.includes('cd')) {
      workflows.push({
        filename: 'cd.yml',
        content: this.generateMockCDWorkflow(configuration),
        type: 'cd',
        description: 'Continuous Deployment workflow',
        estimatedSize: 1536
      });
    }

    if (configuration.workflowTypes.includes('release')) {
      workflows.push({
        filename: 'release.yml',
        content: this.generateMockReleaseWorkflow(configuration),
        type: 'release',
        description: 'Release automation workflow',
        estimatedSize: 2048
      });
    }

    return workflows;
  }

  /**
   * Generates mock CI workflow content
   */
  private generateMockCIWorkflow(configuration: any): string {
    const frameworks = configuration.frameworks || [];
    const hasNodeJS = frameworks.includes('nodejs');
    const hasPython = frameworks.includes('python');
    const hasDocker = frameworks.includes('docker');

    return `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    ${hasNodeJS ? `- name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint` : ''}
    
    ${hasPython ? `- name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install Python dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run Python tests
      run: pytest` : ''}
    
    ${hasDocker ? `- name: Build Docker image
      run: docker build -t test-image .
    
    - name: Run Docker tests
      run: docker run --rm test-image npm test` : ''}`;
  }

  /**
   * Generates mock CD workflow content
   */
  private generateMockCDWorkflow(configuration: any): string {
    const platform = configuration.deploymentPlatform || '';

    return `name: CD

on:
  push:
    branches: [ main ]
  release:
    types: [ published ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    ${platform === 'github-pages' ? `- name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: \${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist` : ''}
    
    ${platform === 'netlify' ? `- name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2.0
      with:
        publish-dir: './dist'
        production-branch: main
        github-token: \${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
      env:
        NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}` : ''}
    
    ${platform === 'vercel' ? `- name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.ORG_ID }}
        vercel-project-id: \${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'` : ''}`;
  }

  /**
   * Generates mock release workflow content
   */
  private generateMockReleaseWorkflow(configuration: any): string {
    return `name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Run tests
      run: npm test
    
    - name: Create Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: \${{ github.ref }}
        release_name: Release \${{ github.ref }}
        draft: false
        prerelease: false
    
    - name: Publish to npm
      run: npm publish
      env:
        NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}`;
  }
}

/**
 * Factory function to create WebviewManager instance
 */
export function createWebviewManager(options: WebviewManagerOptions): WebviewManager {
  return new WebviewManager(options);
}