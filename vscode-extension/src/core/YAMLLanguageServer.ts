import * as vscode from 'vscode';
import { YAMLValidationService } from './YAMLValidationService';
import { YAMLIntelliSenseProvider } from '../providers/YAMLIntelliSenseProvider';

/**
 * YAML Language Server integration for GitHub Actions workflows
 */
export class YAMLLanguageServer {
  private validationService: YAMLValidationService;
  private intelliSenseProvider: YAMLIntelliSenseProvider;
  private disposables: vscode.Disposable[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.validationService = new YAMLValidationService();
    this.intelliSenseProvider = new YAMLIntelliSenseProvider();
    this.initialize();
  }

  /**
   * Initialize the language server features
   */
  private initialize(): void {
    this.registerProviders();
    this.setupDocumentListeners();
    this.registerCommands();
  }

  /**
   * Register language providers
   */
  private registerProviders(): void {
    // Register completion provider for YAML files
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'yaml' },
      this.intelliSenseProvider,
      ':', ' ', '@', '/'
    );

    // Register hover provider for YAML files
    const hoverProvider = vscode.languages.registerHoverProvider(
      { scheme: 'file', language: 'yaml' },
      this.intelliSenseProvider
    );

    // Register code action provider for YAML files
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'yaml' },
      this.intelliSenseProvider,
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
      }
    );

    // Register for YML files as well
    const completionProviderYml = vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'yml' },
      this.intelliSenseProvider,
      ':', ' ', '@', '/'
    );

    const hoverProviderYml = vscode.languages.registerHoverProvider(
      { scheme: 'file', language: 'yml' },
      this.intelliSenseProvider
    );

    const codeActionProviderYml = vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'yml' },
      this.intelliSenseProvider,
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
      }
    );

    this.disposables.push(
      completionProvider,
      hoverProvider,
      codeActionProvider,
      completionProviderYml,
      hoverProviderYml,
      codeActionProviderYml
    );
  }

  /**
   * Setup document change listeners for validation
   */
  private setupDocumentListeners(): void {
    // Validate on document open
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
      (document) => this.validateDocument(document)
    );

    // Validate on document change
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
      (event) => this.validateDocument(event.document)
    );

    // Clear diagnostics on document close
    const onDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument(
      (document) => this.validationService.clearDiagnostics(document)
    );

    // Validate all open documents on startup
    vscode.workspace.textDocuments.forEach(document => {
      this.validateDocument(document);
    });

    this.disposables.push(
      onDidOpenTextDocument,
      onDidChangeTextDocument,
      onDidCloseTextDocument
    );
  }

  /**
   * Register extension commands
   */
  private registerCommands(): void {
    // Command to validate current workflow file
    const validateCommand = vscode.commands.registerCommand(
      'readme-to-cicd.validateCurrentWorkflow',
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          await this.validateDocument(activeEditor.document);
          vscode.window.showInformationMessage('Workflow validation completed');
        } else {
          vscode.window.showWarningMessage('No active editor found');
        }
      }
    );

    // Command to show schema help
    const schemaHelpCommand = vscode.commands.registerCommand(
      'readme-to-cicd.showSchemaHelp',
      (errorMessage?: string) => {
        this.showSchemaHelp(errorMessage);
      }
    );

    // Command to format workflow file
    const formatCommand = vscode.commands.registerCommand(
      'readme-to-cicd.formatWorkflow',
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && this.isWorkflowFile(activeEditor.document)) {
          await this.formatWorkflowFile(activeEditor);
        } else {
          vscode.window.showWarningMessage('Please open a workflow file to format');
        }
      }
    );

    // Command to insert common workflow snippets
    const insertSnippetCommand = vscode.commands.registerCommand(
      'readme-to-cicd.insertWorkflowSnippet',
      async () => {
        await this.showSnippetPicker();
      }
    );

    this.disposables.push(
      validateCommand,
      schemaHelpCommand,
      formatCommand,
      insertSnippetCommand
    );
  }

  /**
   * Validate a document if it's a workflow file
   */
  private async validateDocument(document: vscode.TextDocument): Promise<void> {
    if (this.isWorkflowFile(document)) {
      await this.validationService.updateDiagnostics(document);
    }
  }

  /**
   * Check if document is a workflow file
   */
  private isWorkflowFile(document: vscode.TextDocument): boolean {
    const workflowPath = '.github/workflows/';
    return document.uri.fsPath.includes(workflowPath) && 
           (document.uri.fsPath.endsWith('.yml') || document.uri.fsPath.endsWith('.yaml'));
  }

  /**
   * Show schema help panel
   */
  private showSchemaHelp(errorMessage?: string): void {
    const panel = vscode.window.createWebviewPanel(
      'yamlSchemaHelp',
      'GitHub Actions Schema Help',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getSchemaHelpHtml(errorMessage);
  }

  /**
   * Generate schema help HTML content
   */
  private getSchemaHelpHtml(errorMessage?: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitHub Actions Schema Help</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
          }
          .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-textSeparator-foreground);
            padding-bottom: 5px;
          }
          .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            padding: 10px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            overflow-x: auto;
          }
          .property {
            margin-bottom: 15px;
          }
          .property-name {
            font-weight: bold;
            color: var(--vscode-symbolIcon-propertyForeground);
          }
          .property-type {
            color: var(--vscode-symbolIcon-keywordForeground);
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <h1>GitHub Actions Workflow Schema Help</h1>
        
        ${errorMessage ? `
          <div class="error-message">
            <strong>Error:</strong> ${errorMessage}
          </div>
        ` : ''}

        <div class="section">
          <h2>Basic Workflow Structure</h2>
          <div class="code-block">
name: Workflow Name
on: [push, pull_request]
jobs:
  job-name:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
          </div>
        </div>

        <div class="section">
          <h2>Required Properties</h2>
          <div class="property">
            <span class="property-name">on</span> <span class="property-type">(object|string|array)</span><br>
            Defines the events that trigger the workflow
          </div>
          <div class="property">
            <span class="property-name">jobs</span> <span class="property-type">(object)</span><br>
            Contains one or more jobs to run
          </div>
          <div class="property">
            <span class="property-name">runs-on</span> <span class="property-type">(string|array)</span><br>
            Specifies the runner environment for each job
          </div>
        </div>

        <div class="section">
          <h2>Common Triggers</h2>
          <div class="code-block">
# Single event
on: push

# Multiple events
on: [push, pull_request]

# Event with configuration
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly
          </div>
        </div>

        <div class="section">
          <h2>Popular Actions</h2>
          <div class="property">
            <span class="property-name">actions/checkout@v4</span><br>
            Check out repository code
          </div>
          <div class="property">
            <span class="property-name">actions/setup-node@v4</span><br>
            Set up Node.js environment
          </div>
          <div class="property">
            <span class="property-name">actions/setup-python@v4</span><br>
            Set up Python environment
          </div>
        </div>

        <div class="section">
          <h2>Resources</h2>
          <ul>
            <li><a href="https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions">Official Workflow Syntax</a></li>
            <li><a href="https://github.com/marketplace?type=actions">GitHub Actions Marketplace</a></li>
            <li><a href="https://docs.github.com/en/actions/learn-github-actions">Learn GitHub Actions</a></li>
          </ul>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Format workflow file using YAML formatter
   */
  private async formatWorkflowFile(editor: vscode.TextEditor): Promise<void> {
    try {
      await vscode.commands.executeCommand('editor.action.formatDocument');
      vscode.window.showInformationMessage('Workflow file formatted successfully');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to format workflow file: ${error}`);
    }
  }

  /**
   * Show snippet picker for common workflow patterns
   */
  private async showSnippetPicker(): Promise<void> {
    const snippets = [
      {
        label: 'Basic CI Workflow',
        description: 'Simple CI workflow with checkout and test',
        snippet: `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test`
      },
      {
        label: 'Node.js Workflow',
        description: 'Node.js workflow with multiple versions',
        snippet: `name: Node.js CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test`
      },
      {
        label: 'Python Workflow',
        description: 'Python workflow with multiple versions',
        snippet: `name: Python CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.8', '3.9', '3.10', '3.11']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: \${{ matrix.python-version }}
      - run: pip install -r requirements.txt
      - run: pytest`
      }
    ];

    const selected = await vscode.window.showQuickPick(snippets, {
      placeHolder: 'Select a workflow snippet to insert'
    });

    if (selected) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const position = editor.selection.active;
        await editor.edit(editBuilder => {
          editBuilder.insert(position, selected.snippet);
        });
      }
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.validationService.dispose();
    this.disposables.forEach(disposable => disposable.dispose());
  }
}