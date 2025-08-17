import * as vscode from 'vscode';

/**
 * Provides IntelliSense support for GitHub Actions YAML files
 */
export class YAMLIntelliSenseProvider implements 
  vscode.CompletionItemProvider, 
  vscode.HoverProvider,
  vscode.CodeActionProvider {

  private commonActions: Map<string, ActionInfo> = new Map();

  constructor() {
    this.initializeCommonActions();
  }

  /**
   * Initialize common GitHub Actions with their information
   */
  private initializeCommonActions(): void {
    const actions: ActionInfo[] = [
      {
        name: 'actions/checkout',
        description: 'Check out a Git repository at a particular version',
        versions: ['v4', 'v3', 'v2'],
        parameters: {
          'repository': 'Repository name with owner. For example, actions/checkout',
          'ref': 'The branch, tag or SHA to checkout',
          'token': 'Personal access token (PAT) used to fetch the repository',
          'ssh-key': 'SSH key used to fetch the repository',
          'path': 'Relative path under $GITHUB_WORKSPACE to place the repository',
          'clean': 'Whether to execute `git clean -ffdx && git reset --hard HEAD` before fetching',
          'fetch-depth': 'Number of commits to fetch. 0 indicates all history for all branches and tags',
          'lfs': 'Whether to download Git-LFS files',
          'submodules': 'Whether to checkout submodules: `true` to checkout submodules or `recursive` to recursively checkout submodules'
        },
        documentation: 'https://github.com/actions/checkout'
      },
      {
        name: 'actions/setup-node',
        description: 'Set up a specific version of Node.js and add it to the PATH',
        versions: ['v4', 'v3', 'v2'],
        parameters: {
          'node-version': 'Version Spec of the version to use. Examples: 12.x, 10.15.1, >=10.15.0',
          'node-version-file': 'File containing the version Spec of the version to use. Examples: .nvmrc, .node-version',
          'architecture': 'Target architecture for Node to use. Examples: x86, x64. Will use system architecture by default',
          'check-latest': 'Set this option if you want the action to check for the latest available version that satisfies the version spec',
          'registry-url': 'Optional registry to set up for auth. Will set the registry in a project level .npmrc and .yarnrc file',
          'scope': 'Optional scope for authenticating against scoped registries',
          'token': 'Used to pull node distributions from node-versions. Since there\'s a default, this is typically not supplied by the user',
          'cache': 'Used to specify a package manager for caching in the default directory. Supported values: npm, yarn, pnpm',
          'cache-dependency-path': 'Used to specify the path to a dependency file: package-lock.json, yarn.lock, etc.'
        },
        documentation: 'https://github.com/actions/setup-node'
      },
      {
        name: 'actions/setup-python',
        description: 'Set up a specific version of Python and add it to the PATH',
        versions: ['v4', 'v3', 'v2'],
        parameters: {
          'python-version': 'Version range or exact version of a Python version to use',
          'python-version-file': 'File containing the Python version to use. Example: .python-version',
          'cache': 'Used to specify a package manager for caching in the default directory. Supported values: pip, pipenv, poetry',
          'architecture': 'The target architecture (x86, x64) of the Python interpreter',
          'check-latest': 'Set this option if you want the action to check for the latest available version',
          'token': 'Used to pull python distributions from actions/python-versions',
          'cache-dependency-path': 'Used to specify the path to dependency files. Supports wildcards or a list of file names for caching multiple dependencies'
        },
        documentation: 'https://github.com/actions/setup-python'
      },
      {
        name: 'actions/upload-artifact',
        description: 'Upload a build artifact that will be available for later download',
        versions: ['v3', 'v2'],
        parameters: {
          'name': 'Artifact name',
          'path': 'A file, directory or wildcard pattern that describes what to upload',
          'if-no-files-found': 'The desired behavior if no files are found using the provided path',
          'retention-days': 'Duration after which artifact will expire in days'
        },
        documentation: 'https://github.com/actions/upload-artifact'
      },
      {
        name: 'actions/download-artifact',
        description: 'Download a build artifact that was previously uploaded',
        versions: ['v3', 'v2'],
        parameters: {
          'name': 'Artifact name',
          'path': 'Destination path'
        },
        documentation: 'https://github.com/actions/download-artifact'
      }
    ];

    for (const action of actions) {
      this.commonActions.set(action.name, action);
    }
  }

  /**
   * Provide completion items
   */
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    
    if (!this.isWorkflowFile(document)) {
      return [];
    }

    const line = document.lineAt(position);
    const lineText = line.text;
    const completionItems: vscode.CompletionItem[] = [];

    // Completion for 'uses' field
    if (lineText.includes('uses:') || lineText.trim().startsWith('uses:')) {
      completionItems.push(...this.getActionCompletions());
    }

    // Completion for 'runs-on' field
    if (lineText.includes('runs-on:') || lineText.trim().startsWith('runs-on:')) {
      completionItems.push(...this.getRunnerCompletions());
    }

    // Completion for 'on' triggers
    if (lineText.includes('on:') || lineText.trim().startsWith('on:')) {
      completionItems.push(...this.getTriggerCompletions());
    }

    // Completion for step properties
    if (this.isInStepsContext(document, position)) {
      completionItems.push(...this.getStepPropertyCompletions());
    }

    return completionItems;
  }

  /**
   * Get action completions
   */
  private getActionCompletions(): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    this.commonActions.forEach((actionInfo, actionName) => {
      const item = new vscode.CompletionItem(
        `${actionName}@${actionInfo.versions[0]}`,
        vscode.CompletionItemKind.Module
      );
      
      item.detail = actionInfo.description;
      item.documentation = new vscode.MarkdownString(
        `${actionInfo.description}\n\n[Documentation](${actionInfo.documentation})`
      );
      
      item.insertText = new vscode.SnippetString(`${actionName}@${actionInfo.versions[0]}`);
      completions.push(item);
    });

    return completions;
  }

  /**
   * Get runner completions
   */
  private getRunnerCompletions(): vscode.CompletionItem[] {
    const runners = [
      { name: 'ubuntu-latest', description: 'Latest Ubuntu runner' },
      { name: 'ubuntu-22.04', description: 'Ubuntu 22.04 runner' },
      { name: 'ubuntu-20.04', description: 'Ubuntu 20.04 runner' },
      { name: 'windows-latest', description: 'Latest Windows runner' },
      { name: 'windows-2022', description: 'Windows Server 2022 runner' },
      { name: 'windows-2019', description: 'Windows Server 2019 runner' },
      { name: 'macos-latest', description: 'Latest macOS runner' },
      { name: 'macos-12', description: 'macOS 12 runner' },
      { name: 'macos-11', description: 'macOS 11 runner' }
    ];

    return runners.map(runner => {
      const item = new vscode.CompletionItem(runner.name, vscode.CompletionItemKind.Value);
      item.detail = runner.description;
      return item;
    });
  }

  /**
   * Get trigger completions
   */
  private getTriggerCompletions(): vscode.CompletionItem[] {
    const triggers = [
      { name: 'push', description: 'Runs when commits are pushed to the repository' },
      { name: 'pull_request', description: 'Runs when a pull request is opened, synchronized, or reopened' },
      { name: 'schedule', description: 'Runs on a schedule using cron syntax' },
      { name: 'workflow_dispatch', description: 'Allows manual triggering of the workflow' },
      { name: 'release', description: 'Runs when a release is published' },
      { name: 'issues', description: 'Runs when an issue is opened, edited, or closed' },
      { name: 'workflow_call', description: 'Allows the workflow to be called by other workflows' }
    ];

    return triggers.map(trigger => {
      const item = new vscode.CompletionItem(trigger.name, vscode.CompletionItemKind.Event);
      item.detail = trigger.description;
      return item;
    });
  }

  /**
   * Get step property completions
   */
  private getStepPropertyCompletions(): vscode.CompletionItem[] {
    const properties = [
      { name: 'name', description: 'A name for your step to display on GitHub' },
      { name: 'id', description: 'A unique identifier for the step' },
      { name: 'if', description: 'Conditional to prevent a step from running unless a condition is met' },
      { name: 'uses', description: 'Selects an action to run as part of a step' },
      { name: 'run', description: 'Runs command-line programs using the operating system\'s shell' },
      { name: 'with', description: 'A map of the input parameters defined by the action' },
      { name: 'env', description: 'Sets environment variables for steps to use' },
      { name: 'continue-on-error', description: 'Prevents a job from failing when a step fails' },
      { name: 'timeout-minutes', description: 'The maximum number of minutes to run the step before killing the process' }
    ];

    return properties.map(prop => {
      const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
      item.detail = prop.description;
      item.insertText = new vscode.SnippetString(`${prop.name}: $1`);
      return item;
    });
  }

  /**
   * Provide hover information
   */
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    
    if (!this.isWorkflowFile(document)) {
      return;
    }

    const range = document.getWordRangeAtPosition(position);
    if (!range) {
      return;
    }

    const word = document.getText(range);
    const line = document.lineAt(position);
    
    // Check if hovering over an action reference
    if (line.text.includes('uses:')) {
      const actionMatch = line.text.match(/uses:\s*([^\s]+)/);
      if (actionMatch) {
        const actionRef = actionMatch[1];
        const actionName = actionRef.split('@')[0];
        const actionInfo = this.commonActions.get(actionName);
        
        if (actionInfo) {
          const markdown = new vscode.MarkdownString();
          markdown.appendMarkdown(`**${actionName}**\n\n`);
          markdown.appendMarkdown(`${actionInfo.description}\n\n`);
          markdown.appendMarkdown(`**Available versions:** ${actionInfo.versions.join(', ')}\n\n`);
          markdown.appendMarkdown(`[Documentation](${actionInfo.documentation})`);
          
          return new vscode.Hover(markdown, range);
        }
      }
    }

    return;
  }

  /**
   * Provide code actions (quick fixes)
   */
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === 'readme-to-cicd') {
        switch (diagnostic.code) {
          case 'invalid-action-reference':
            actions.push(this.createFixActionReferenceAction(document, diagnostic));
            break;
          case 'schema-validation-error':
            actions.push(this.createFixSchemaAction(document, diagnostic));
            break;
        }
      }
    }

    return actions;
  }

  /**
   * Create action to fix invalid action reference
   */
  private createFixActionReferenceAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Fix action reference format',
      vscode.CodeActionKind.QuickFix
    );

    const line = document.lineAt(diagnostic.range.start.line);
    const actionMatch = line.text.match(/uses:\s*([^\s]+)/);
    
    if (actionMatch) {
      const currentRef = actionMatch[1];
      const suggestedRef = this.suggestActionReference(currentRef);
      
      if (suggestedRef) {
        const edit = new vscode.WorkspaceEdit();
        const newText = line.text.replace(currentRef, suggestedRef);
        edit.replace(document.uri, line.range, newText);
        action.edit = edit;
      }
    }

    return action;
  }

  /**
   * Create action to fix schema validation error
   */
  private createFixSchemaAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Fix schema validation error',
      vscode.CodeActionKind.QuickFix
    );

    // This would contain logic to fix common schema validation errors
    // For now, we'll just provide a generic suggestion
    action.command = {
      command: 'readme-to-cicd.showSchemaHelp',
      title: 'Show GitHub Actions schema help',
      arguments: [diagnostic.message]
    };

    return action;
  }

  /**
   * Suggest a corrected action reference
   */
  private suggestActionReference(currentRef: string): string | null {
    // If it doesn't have a version, add @v1
    if (!currentRef.includes('@')) {
      return `${currentRef}@v1`;
    }

    // Check if it's a known action and suggest the latest version
    const actionName = currentRef.split('@')[0];
    const actionInfo = this.commonActions.get(actionName);
    
    if (actionInfo) {
      return `${actionName}@${actionInfo.versions[0]}`;
    }

    return null;
  }

  /**
   * Check if we're in a steps context
   */
  private isInStepsContext(document: vscode.TextDocument, position: vscode.Position): boolean {
    const text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    const lines = text.split('\n');
    
    // Look backwards to find if we're under a 'steps:' section
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('steps:')) {
        return true;
      }
      if (line.startsWith('jobs:') || line.match(/^\w+:/)) {
        break;
      }
    }
    
    return false;
  }

  /**
   * Check if document is a workflow file
   */
  private isWorkflowFile(document: vscode.TextDocument): boolean {
    const workflowPath = '.github/workflows/';
    return document.uri.fsPath.includes(workflowPath) && 
           (document.uri.fsPath.endsWith('.yml') || document.uri.fsPath.endsWith('.yaml'));
  }
}

/**
 * Information about a GitHub Action
 */
interface ActionInfo {
  name: string;
  description: string;
  versions: string[];
  parameters: Record<string, string>;
  documentation: string;
}