import * as vscode from 'vscode';
import { GitHubActionsDocumentation } from './GitHubActionsDocumentation';
import { ErrorExplanationService } from './ErrorExplanationService';
import { TooltipProvider } from '../providers/TooltipProvider';

/**
 * Central help system that coordinates all contextual help features
 */
export class HelpSystem {
  private readonly context: vscode.ExtensionContext;
  private readonly githubActionsDoc: GitHubActionsDocumentation;
  private readonly errorExplanationService: ErrorExplanationService;
  private readonly tooltipProvider: TooltipProvider;
  private helpPanel: vscode.WebviewPanel | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.githubActionsDoc = new GitHubActionsDocumentation();
    this.errorExplanationService = new ErrorExplanationService();
    this.tooltipProvider = new TooltipProvider();
  }

  /**
   * Initialize the help system and register providers
   */
  public async initialize(): Promise<void> {
    // Register hover providers
    this.context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        { scheme: 'file', language: 'yaml' },
        this.tooltipProvider
      )
    );

    // Register commands
    this.registerCommands();

    // Initialize GitHub Actions documentation
    await this.githubActionsDoc.initialize();
  }

  /**
   * Register help-related commands
   */
  private registerCommands(): void {
    // Show help panel command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.showHelp', () => {
        this.showHelpPanel();
      })
    );

    // Show contextual help command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.showContextualHelp', (context?: string) => {
        this.showContextualHelp(context);
      })
    );

    // Explain error command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.explainError', (error: any) => {
        this.explainError(error);
      })
    );

    // Open documentation command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.openDocumentation', (topic?: string) => {
        this.openDocumentation(topic);
      })
    );
  }

  /**
   * Show the main help panel
   */
  public showHelpPanel(): void {
    if (this.helpPanel) {
      this.helpPanel.reveal();
      return;
    }

    this.helpPanel = vscode.window.createWebviewPanel(
      'readme-to-cicd-help',
      'README to CI/CD Help',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'media'),
          vscode.Uri.joinPath(this.context.extensionUri, 'webview-ui', 'build')
        ]
      }
    );

    // Set up webview content
    this.helpPanel.webview.html = this.getHelpPanelContent();

    // Handle panel disposal
    this.helpPanel.onDidDispose(() => {
      this.helpPanel = undefined;
    });

    // Handle messages from webview
    this.helpPanel.webview.onDidReceiveMessage(
      message => this.handleHelpPanelMessage(message),
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Show contextual help based on current context
   */
  public showContextualHelp(context?: string): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    const document = activeEditor.document;
    const position = activeEditor.selection.active;
    
    // Determine context if not provided
    if (!context) {
      context = this.determineContext(document, position);
    }

    // Show help panel with specific context
    this.showHelpPanel();
    
    // Send context to webview
    if (this.helpPanel) {
      this.helpPanel.webview.postMessage({
        command: 'showContext',
        context: context
      });
    }
  }

  /**
   * Explain an error with actionable suggestions
   */
  public explainError(error: any): void {
    const explanation = this.errorExplanationService.explainError(error);
    
    // Show error explanation in help panel
    this.showHelpPanel();
    
    if (this.helpPanel) {
      this.helpPanel.webview.postMessage({
        command: 'showError',
        error: error,
        explanation: explanation
      });
    }
  }

  /**
   * Open external documentation for a specific topic
   */
  public openDocumentation(topic?: string): void {
    const documentationUrl = this.githubActionsDoc.getDocumentationUrl(topic);
    
    if (documentationUrl) {
      vscode.env.openExternal(vscode.Uri.parse(documentationUrl));
    } else {
      // Fallback to general GitHub Actions documentation
      vscode.env.openExternal(vscode.Uri.parse('https://docs.github.com/en/actions'));
    }
  }

  /**
   * Determine context based on document and cursor position
   */
  private determineContext(document: vscode.TextDocument, position: vscode.Position): string {
    const line = document.lineAt(position.line).text;
    const fileName = document.fileName;

    // Check if we're in a YAML workflow file
    if (fileName.includes('.github/workflows/') && fileName.endsWith('.yml')) {
      // Analyze YAML structure to determine context
      if (line.includes('uses:')) {
        return 'github-action';
      } else if (line.includes('run:')) {
        return 'shell-command';
      } else if (line.includes('strategy:')) {
        return 'build-matrix';
      } else if (line.includes('env:')) {
        return 'environment-variables';
      }
      return 'workflow-syntax';
    }

    // Check if we're in a README file
    if (fileName.endsWith('README.md')) {
      return 'readme-analysis';
    }

    // Check if we're in package.json
    if (fileName.endsWith('package.json')) {
      return 'package-configuration';
    }

    return 'general';
  }

  /**
   * Generate HTML content for the help panel
   */
  private getHelpPanelContent(): string {
    const webviewUri = this.helpPanel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview-ui', 'build')
    );

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>README to CI/CD Help</title>
        <link href="${webviewUri}/help.css" rel="stylesheet">
      </head>
      <body>
        <div id="help-container">
          <header>
            <h1>README to CI/CD Help</h1>
            <nav>
              <button id="getting-started" class="nav-button active">Getting Started</button>
              <button id="configuration" class="nav-button">Configuration</button>
              <button id="workflows" class="nav-button">Workflows</button>
              <button id="troubleshooting" class="nav-button">Troubleshooting</button>
            </nav>
          </header>
          
          <main id="help-content">
            <section id="getting-started-content" class="help-section active">
              <h2>Getting Started</h2>
              <p>Welcome to README to CI/CD! This extension automatically generates GitHub Actions workflows from your README files.</p>
              
              <h3>Quick Start</h3>
              <ol>
                <li>Open a project with a README.md file</li>
                <li>Run the command "Generate Workflow" from the Command Palette</li>
                <li>Review and customize the generated workflow</li>
                <li>Save the workflow to your .github/workflows/ directory</li>
              </ol>
              
              <h3>Key Features</h3>
              <ul>
                <li>Automatic framework detection</li>
                <li>Intelligent workflow generation</li>
                <li>Real-time preview and validation</li>
                <li>Customizable templates</li>
              </ul>
            </section>
            
            <section id="configuration-content" class="help-section">
              <h2>Configuration</h2>
              <p>Configure the extension to match your project needs.</p>
              <!-- Configuration help content will be loaded dynamically -->
            </section>
            
            <section id="workflows-content" class="help-section">
              <h2>Workflows</h2>
              <p>Learn about different workflow types and customization options.</p>
              <!-- Workflow help content will be loaded dynamically -->
            </section>
            
            <section id="troubleshooting-content" class="help-section">
              <h2>Troubleshooting</h2>
              <p>Common issues and solutions.</p>
              <!-- Troubleshooting content will be loaded dynamically -->
            </section>
          </main>
        </div>
        
        <script src="${webviewUri}/help.js"></script>
      </body>
      </html>
    `;
  }

  /**
   * Handle messages from the help panel webview
   */
  private handleHelpPanelMessage(message: any): void {
    switch (message.command) {
      case 'openDocumentation':
        this.openDocumentation(message.topic);
        break;
      case 'runCommand':
        vscode.commands.executeCommand(message.commandId, ...message.args);
        break;
      case 'showExample':
        this.showExample(message.exampleId);
        break;
      default:
        console.warn('Unknown help panel message:', message);
    }
  }

  /**
   * Show an example in a new editor
   */
  private showExample(exampleId: string): void {
    // Implementation for showing examples
    const examples = this.getExamples();
    const example = examples[exampleId];
    
    if (example) {
      vscode.workspace.openTextDocument({
        content: example.content,
        language: example.language
      }).then(document => {
        vscode.window.showTextDocument(document);
      });
    }
  }

  /**
   * Get available examples
   */
  private getExamples(): Record<string, { content: string; language: string }> {
    return {
      'basic-nodejs': {
        content: `name: Node.js CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test`,
        language: 'yaml'
      },
      'python-workflow': {
        content: `name: Python CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        python-version: [3.8, 3.9, '3.10', '3.11']
    
    steps:
    - uses: actions/checkout@v4
    - name: Set up Python \${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: \${{ matrix.python-version }}
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    - name: Run tests
      run: |
        python -m pytest`,
        language: 'yaml'
      }
    };
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.helpPanel) {
      this.helpPanel.dispose();
    }
  }
}