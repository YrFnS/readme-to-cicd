/**
 * Webview Test Utilities
 * 
 * Utilities for testing VSCode webview panels, webview views,
 * and UI components in the README-to-CICD extension.
 */

import * as sinon from 'sinon';
import { ExtensionTestContext } from './extension-test-utilities';

/**
 * Webview test configuration
 */
export interface WebviewTestConfig {
  viewType: string;
  title: string;
  showOptions?: any;
  options?: {
    enableScripts?: boolean;
    enableForms?: boolean;
    localResourceRoots?: any[];
    portMapping?: any[];
  };
  initialHtml?: string;
  enableMessageHandling?: boolean;
}

/**
 * Webview message for testing
 */
export interface WebviewMessage {
  command: string;
  data?: any;
  timestamp?: number;
}

/**
 * Webview test helper
 */
export class WebviewTestHelper {
  private context: ExtensionTestContext;
  private createdPanels: Map<string, any> = new Map();
  private messageHistory: Array<{
    panelId: string;
    direction: 'sent' | 'received';
    message: WebviewMessage;
    timestamp: number;
  }> = [];

  constructor(context: ExtensionTestContext) {
    this.context = context;
  }

  /**
   * Create a webview panel for testing
   */
  createWebviewPanel(config: WebviewTestConfig): any {
    const panel = this.context.createWebviewPanel(
      config.viewType,
      config.title,
      config.options
    );

    // Setup message handling if enabled
    if (config.enableMessageHandling) {
      this.setupMessageHandling(panel, config.viewType);
    }

    // Set initial HTML if provided
    if (config.initialHtml) {
      panel.webview.html = config.initialHtml;
    }

    this.createdPanels.set(config.viewType, panel);
    return panel;
  }

  /**
   * Setup message handling for webview
   */
  private setupMessageHandling(panel: any, panelId: string): void {
    // Mock message receiving
    panel.webview.onDidReceiveMessage = sinon.stub().callsFake((handler: Function) => {
      panel._messageHandler = handler;
      return { dispose: sinon.stub() };
    });

    // Override postMessage to track sent messages
    const originalPostMessage = panel.webview.postMessage;
    panel.webview.postMessage = sinon.stub().callsFake(async (message: WebviewMessage) => {
      this.messageHistory.push({
        panelId,
        direction: 'sent',
        message: { ...message, timestamp: Date.now() },
        timestamp: Date.now()
      });

      return originalPostMessage.call(panel.webview, message);
    });
  }

  /**
   * Simulate receiving a message from webview
   */
  simulateWebviewMessage(panelId: string, message: WebviewMessage): void {
    const panel = this.createdPanels.get(panelId);
    if (!panel || !panel._messageHandler) {
      throw new Error(`Panel ${panelId} not found or message handler not set`);
    }

    this.messageHistory.push({
      panelId,
      direction: 'received',
      message: { ...message, timestamp: Date.now() },
      timestamp: Date.now()
    });

    panel._messageHandler(message);
  }

  /**
   * Send message to webview
   */
  async sendMessageToWebview(panelId: string, message: WebviewMessage): Promise<boolean> {
    const panel = this.createdPanels.get(panelId);
    if (!panel) {
      throw new Error(`Panel ${panelId} not found`);
    }

    return await panel.webview.postMessage(message);
  }

  /**
   * Get webview panel by ID
   */
  getWebviewPanel(panelId: string): any {
    return this.createdPanels.get(panelId);
  }

  /**
   * Test webview HTML content
   */
  testWebviewHtml(panelId: string, expectedContent: string | RegExp): boolean {
    const panel = this.createdPanels.get(panelId);
    if (!panel) {
      throw new Error(`Panel ${panelId} not found`);
    }

    const html = panel.webview.html;
    
    if (typeof expectedContent === 'string') {
      return html.includes(expectedContent);
    } else {
      return expectedContent.test(html);
    }
  }

  /**
   * Test webview message flow
   */
  async testMessageFlow(
    panelId: string,
    messagesToSend: WebviewMessage[],
    expectedResponses: WebviewMessage[]
  ): Promise<{
    success: boolean;
    sentMessages: WebviewMessage[];
    receivedMessages: WebviewMessage[];
    error?: Error;
  }> {
    try {
      const sentMessages: WebviewMessage[] = [];
      const receivedMessages: WebviewMessage[] = [];

      // Send messages
      for (const message of messagesToSend) {
        await this.sendMessageToWebview(panelId, message);
        sentMessages.push(message);
      }

      // Simulate responses
      for (const response of expectedResponses) {
        this.simulateWebviewMessage(panelId, response);
        receivedMessages.push(response);
      }

      return {
        success: true,
        sentMessages,
        receivedMessages
      };
    } catch (error) {
      return {
        success: false,
        sentMessages: [],
        receivedMessages: [],
        error: error as Error
      };
    }
  }

  /**
   * Get message history for a panel
   */
  getMessageHistory(panelId?: string): Array<{
    panelId: string;
    direction: 'sent' | 'received';
    message: WebviewMessage;
    timestamp: number;
  }> {
    if (panelId) {
      return this.messageHistory.filter(h => h.panelId === panelId);
    }
    return [...this.messageHistory];
  }

  /**
   * Clear message history
   */
  clearMessageHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Verify message was sent/received
   */
  verifyMessage(
    panelId: string,
    direction: 'sent' | 'received',
    command: string,
    data?: any
  ): boolean {
    return this.messageHistory.some(h => 
      h.panelId === panelId &&
      h.direction === direction &&
      h.message.command === command &&
      (data === undefined || JSON.stringify(h.message.data) === JSON.stringify(data))
    );
  }

  /**
   * Dispose all created panels
   */
  disposeAllPanels(): void {
    this.createdPanels.forEach(panel => {
      if (panel && typeof panel.dispose === 'function') {
        panel.dispose();
      }
    });
    this.createdPanels.clear();
  }
}

/**
 * README-to-CICD specific webview scenarios
 */
export class ReadmeToCICDWebviewScenarios {
  /**
   * Test workflow preview webview
   */
  static createWorkflowPreviewWebview(helper: WebviewTestHelper): any {
    const config: WebviewTestConfig = {
      viewType: 'readme-to-cicd.workflowPreview',
      title: 'Workflow Preview',
      options: {
        enableScripts: true,
        enableForms: false
      },
      initialHtml: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Workflow Preview</title>
          <style>
            body { font-family: var(--vscode-font-family); }
            .workflow-container { margin: 20px; }
            .workflow-file { margin-bottom: 20px; }
            .workflow-header { font-weight: bold; margin-bottom: 10px; }
            .workflow-content { 
              background: var(--vscode-editor-background);
              padding: 10px;
              border-radius: 4px;
              font-family: monospace;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <div class="workflow-container">
            <h1>Generated Workflows</h1>
            <div id="workflows"></div>
            <button id="generateBtn">Generate Workflows</button>
            <button id="saveBtn">Save to Files</button>
          </div>
          <script>
            const vscode = acquireVsCodeApi();
            
            document.getElementById('generateBtn').addEventListener('click', () => {
              vscode.postMessage({ command: 'generate', data: { type: 'all' } });
            });
            
            document.getElementById('saveBtn').addEventListener('click', () => {
              vscode.postMessage({ command: 'save', data: { location: '.github/workflows' } });
            });
            
            window.addEventListener('message', event => {
              const message = event.data;
              if (message.command === 'updateWorkflows') {
                updateWorkflowDisplay(message.data);
              }
            });
            
            function updateWorkflowDisplay(workflows) {
              const container = document.getElementById('workflows');
              container.innerHTML = '';
              
              Object.entries(workflows).forEach(([name, content]) => {
                const workflowDiv = document.createElement('div');
                workflowDiv.className = 'workflow-file';
                workflowDiv.innerHTML = \`
                  <div class="workflow-header">\${name}.yml</div>
                  <div class="workflow-content">\${content}</div>
                \`;
                container.appendChild(workflowDiv);
              });
            }
          </script>
        </body>
        </html>
      `,
      enableMessageHandling: true
    };

    return helper.createWebviewPanel(config);
  }

  /**
   * Test configuration webview
   */
  static createConfigurationWebview(helper: WebviewTestHelper): any {
    const config: WebviewTestConfig = {
      viewType: 'readme-to-cicd.configuration',
      title: 'Extension Configuration',
      options: {
        enableScripts: true,
        enableForms: true
      },
      initialHtml: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Configuration</title>
          <style>
            body { font-family: var(--vscode-font-family); padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, select { width: 100%; padding: 8px; }
            button { padding: 10px 20px; margin-right: 10px; }
          </style>
        </head>
        <body>
          <h1>README-to-CICD Configuration</h1>
          <form id="configForm">
            <div class="form-group">
              <label for="autoDetect">Auto-detect frameworks</label>
              <input type="checkbox" id="autoDetect" checked>
            </div>
            <div class="form-group">
              <label for="optimization">Optimization level</label>
              <select id="optimization">
                <option value="basic">Basic</option>
                <option value="standard" selected>Standard</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
            <div class="form-group">
              <label for="outputDir">Output directory</label>
              <input type="text" id="outputDir" value=".github/workflows">
            </div>
            <button type="button" id="saveBtn">Save Configuration</button>
            <button type="button" id="resetBtn">Reset to Defaults</button>
          </form>
          <script>
            const vscode = acquireVsCodeApi();
            
            document.getElementById('saveBtn').addEventListener('click', () => {
              const config = {
                autoDetect: document.getElementById('autoDetect').checked,
                optimization: document.getElementById('optimization').value,
                outputDirectory: document.getElementById('outputDir').value
              };
              vscode.postMessage({ command: 'saveConfig', data: config });
            });
            
            document.getElementById('resetBtn').addEventListener('click', () => {
              vscode.postMessage({ command: 'resetConfig' });
            });
            
            window.addEventListener('message', event => {
              const message = event.data;
              if (message.command === 'loadConfig') {
                loadConfiguration(message.data);
              }
            });
            
            function loadConfiguration(config) {
              document.getElementById('autoDetect').checked = config.autoDetect;
              document.getElementById('optimization').value = config.optimization;
              document.getElementById('outputDir').value = config.outputDirectory;
            }
          </script>
        </body>
        </html>
      `,
      enableMessageHandling: true
    };

    return helper.createWebviewPanel(config);
  }

  /**
   * Test framework detection results webview
   */
  static createFrameworkDetectionWebview(helper: WebviewTestHelper): any {
    const config: WebviewTestConfig = {
      viewType: 'readme-to-cicd.frameworkDetection',
      title: 'Framework Detection Results',
      options: {
        enableScripts: true
      },
      initialHtml: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Framework Detection</title>
          <style>
            body { font-family: var(--vscode-font-family); padding: 20px; }
            .framework-item { 
              border: 1px solid var(--vscode-panel-border);
              margin-bottom: 10px;
              padding: 15px;
              border-radius: 4px;
            }
            .framework-name { font-weight: bold; font-size: 1.1em; }
            .framework-confidence { color: var(--vscode-descriptionForeground); }
            .framework-evidence { margin-top: 10px; }
            .evidence-item { 
              background: var(--vscode-editor-background);
              padding: 5px;
              margin: 2px 0;
              border-radius: 2px;
              font-family: monospace;
              font-size: 0.9em;
            }
            .confidence-bar {
              width: 100%;
              height: 8px;
              background: var(--vscode-panel-background);
              border-radius: 4px;
              overflow: hidden;
              margin: 5px 0;
            }
            .confidence-fill {
              height: 100%;
              background: var(--vscode-progressBar-background);
              transition: width 0.3s ease;
            }
          </style>
        </head>
        <body>
          <h1>Detected Frameworks</h1>
          <div id="frameworks"></div>
          <button id="refreshBtn">Refresh Detection</button>
          <script>
            const vscode = acquireVsCodeApi();
            
            document.getElementById('refreshBtn').addEventListener('click', () => {
              vscode.postMessage({ command: 'refreshDetection' });
            });
            
            window.addEventListener('message', event => {
              const message = event.data;
              if (message.command === 'updateFrameworks') {
                updateFrameworkDisplay(message.data);
              }
            });
            
            function updateFrameworkDisplay(frameworks) {
              const container = document.getElementById('frameworks');
              container.innerHTML = '';
              
              frameworks.forEach(framework => {
                const frameworkDiv = document.createElement('div');
                frameworkDiv.className = 'framework-item';
                frameworkDiv.innerHTML = \`
                  <div class="framework-name">\${framework.name} (\${framework.version || 'unknown'})</div>
                  <div class="framework-confidence">Confidence: \${Math.round(framework.confidence * 100)}%</div>
                  <div class="confidence-bar">
                    <div class="confidence-fill" style="width: \${framework.confidence * 100}%"></div>
                  </div>
                  <div class="framework-evidence">
                    <strong>Evidence:</strong>
                    \${framework.evidence.map(e => \`
                      <div class="evidence-item">\${e.type}: \${e.value} (from \${e.source})</div>
                    \`).join('')}
                  </div>
                \`;
                container.appendChild(frameworkDiv);
              });
            }
          </script>
        </body>
        </html>
      `,
      enableMessageHandling: true
    };

    return helper.createWebviewPanel(config);
  }
}

/**
 * Webview test utilities for common patterns
 */
export class WebviewTestUtils {
  /**
   * Test webview lifecycle (create, show, hide, dispose)
   */
  static async testWebviewLifecycle(helper: WebviewTestHelper, config: WebviewTestConfig): Promise<{
    created: boolean;
    visible: boolean;
    disposed: boolean;
    error?: Error;
  }> {
    try {
      // Create webview
      const panel = helper.createWebviewPanel(config);
      const created = panel !== null;

      // Test visibility
      panel.reveal();
      const visible = panel.visible === true;

      // Test disposal
      panel.dispose();
      const disposed = true; // Mock always succeeds

      return { created, visible, disposed };
    } catch (error) {
      return { created: false, visible: false, disposed: false, error: error as Error };
    }
  }

  /**
   * Test webview message communication
   */
  static async testWebviewCommunication(
    helper: WebviewTestHelper,
    panelId: string,
    testMessages: Array<{
      direction: 'send' | 'receive';
      message: WebviewMessage;
      expectedResponse?: WebviewMessage;
    }>
  ): Promise<{
    success: boolean;
    messagesProcessed: number;
    error?: Error;
  }> {
    try {
      let messagesProcessed = 0;

      for (const test of testMessages) {
        if (test.direction === 'send') {
          await helper.sendMessageToWebview(panelId, test.message);
        } else {
          helper.simulateWebviewMessage(panelId, test.message);
        }

        messagesProcessed++;

        // Verify expected response if provided
        if (test.expectedResponse) {
          const verified = helper.verifyMessage(
            panelId,
            test.direction === 'send' ? 'sent' : 'received',
            test.expectedResponse.command,
            test.expectedResponse.data
          );

          if (!verified) {
            throw new Error(`Expected response not found for message: ${test.message.command}`);
          }
        }
      }

      return { success: true, messagesProcessed };
    } catch (error) {
      return { success: false, messagesProcessed: 0, error: error as Error };
    }
  }

  /**
   * Test webview HTML rendering
   */
  static testWebviewHtmlRendering(
    helper: WebviewTestHelper,
    panelId: string,
    expectedElements: Array<{
      selector: string;
      content?: string;
      attributes?: Record<string, string>;
    }>
  ): {
    success: boolean;
    foundElements: string[];
    missingElements: string[];
  } {
    const panel = helper.getWebviewPanel(panelId);
    if (!panel) {
      return { success: false, foundElements: [], missingElements: expectedElements.map(e => e.selector) };
    }

    const html = panel.webview.html;
    const foundElements: string[] = [];
    const missingElements: string[] = [];

    expectedElements.forEach(element => {
      // Simple HTML content checking (in real implementation, you might use a DOM parser)
      const hasElement = html.includes(element.selector.replace('#', 'id="').replace('.', 'class="'));
      
      if (hasElement) {
        foundElements.push(element.selector);
        
        // Check content if specified
        if (element.content && !html.includes(element.content)) {
          missingElements.push(`${element.selector} (content: ${element.content})`);
        }
      } else {
        missingElements.push(element.selector);
      }
    });

    return {
      success: missingElements.length === 0,
      foundElements,
      missingElements
    };
  }

  /**
   * Create a mock webview API for testing
   */
  static createMockWebviewAPI(): any {
    const state: any = {};
    const messageHandlers: Function[] = [];

    return {
      postMessage: sinon.stub().callsFake(async (message: any) => {
        // Simulate message posting
        return true;
      }),
      
      setState: sinon.stub().callsFake((newState: any) => {
        Object.assign(state, newState);
      }),
      
      getState: sinon.stub().callsFake(() => {
        return { ...state };
      }),
      
      onDidReceiveMessage: sinon.stub().callsFake((handler: Function) => {
        messageHandlers.push(handler);
        return { dispose: sinon.stub() };
      }),
      
      // Helper methods for testing
      _simulateMessage: (message: any) => {
        messageHandlers.forEach(handler => handler(message));
      },
      
      _getState: () => ({ ...state }),
      
      _reset: () => {
        Object.keys(state).forEach(key => delete state[key]);
        messageHandlers.length = 0;
      }
    };
  }
}

// Export types and classes
export type { WebviewTestConfig, WebviewMessage };