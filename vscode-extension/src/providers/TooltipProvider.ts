import * as vscode from 'vscode';
import { GitHubActionsDocumentation, ActionDocumentation } from '../core/GitHubActionsDocumentation';

/**
 * Provides hover tooltips for GitHub Actions workflows
 */
export class TooltipProvider implements vscode.HoverProvider {
  private githubActionsDoc: GitHubActionsDocumentation;

  constructor() {
    this.githubActionsDoc = new GitHubActionsDocumentation();
  }

  /**
   * Initialize the tooltip provider
   */
  public async initialize(): Promise<void> {
    await this.githubActionsDoc.initialize();
  }

  /**
   * Provide hover information for the given position and document
   */
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    // Only provide hovers for YAML files in .github/workflows/
    if (!this.isWorkflowFile(document)) {
      return undefined;
    }

    const line = document.lineAt(position.line);
    const lineText = line.text;
    const wordRange = document.getWordRangeAtPosition(position);
    
    if (!wordRange) {
      return undefined;
    }

    // Check what type of element we're hovering over
    const hoverInfo = await this.getHoverInfo(document, position, lineText);
    
    if (hoverInfo) {
      return new vscode.Hover(hoverInfo.content, hoverInfo.range || wordRange);
    }

    return undefined;
  }

  /**
   * Check if the document is a GitHub Actions workflow file
   */
  private isWorkflowFile(document: vscode.TextDocument): boolean {
    const filePath = document.fileName;
    return filePath.includes('.github/workflows/') && 
           (filePath.endsWith('.yml') || filePath.endsWith('.yaml'));
  }

  /**
   * Get hover information based on context
   */
  private async getHoverInfo(
    document: vscode.TextDocument,
    position: vscode.Position,
    lineText: string
  ): Promise<{ content: vscode.MarkdownString; range?: vscode.Range } | undefined> {
    // Check for GitHub Actions (uses: keyword)
    const actionMatch = lineText.match(/uses:\s*([^\s@]+)(@[^\s]+)?/);
    if (actionMatch) {
      const actionName = actionMatch[1];
      const version = actionMatch[2];
      return await this.getActionHover(actionName, version);
    }

    // Check for workflow events
    const eventMatch = lineText.match(/on:\s*(\w+)/);
    if (eventMatch) {
      const eventName = eventMatch[1];
      return this.getEventHover(eventName);
    }

    // Check for job properties
    const jobPropertyMatch = lineText.match(/^\s*(runs-on|strategy|env|if|needs|timeout-minutes):/);
    if (jobPropertyMatch) {
      const property = jobPropertyMatch[1];
      return this.getJobPropertyHover(property);
    }

    // Check for step properties
    const stepPropertyMatch = lineText.match(/^\s*-?\s*(name|run|uses|with|env|if|continue-on-error):/);
    if (stepPropertyMatch) {
      const property = stepPropertyMatch[1];
      return this.getStepPropertyHover(property);
    }

    // Check for context expressions
    const contextMatch = lineText.match(/\$\{\{\s*([^}]+)\s*\}\}/);
    if (contextMatch) {
      const expression = contextMatch[1];
      return this.getContextHover(expression, position, document);
    }

    // Check for runner labels
    const runnerMatch = lineText.match(/runs-on:\s*([^\s]+)/);
    if (runnerMatch) {
      const runner = runnerMatch[1];
      return this.getRunnerHover(runner);
    }

    return undefined;
  }

  /**
   * Get hover information for GitHub Actions
   */
  private async getActionHover(actionName: string, version?: string): Promise<{ content: vscode.MarkdownString; range?: vscode.Range }> {
    const documentation = await this.githubActionsDoc.getActionDocumentation(actionName);
    const metadata = this.githubActionsDoc.getActionMetadata(actionName);

    const content = new vscode.MarkdownString();
    content.isTrusted = true;

    // Action title and description
    content.appendMarkdown(`### ${actionName}${version || ''}\n\n`);
    
    if (documentation) {
      content.appendMarkdown(`${documentation.description}\n\n`);
      
      // Inputs
      if (documentation.inputs.length > 0) {
        content.appendMarkdown(`**Inputs:**\n`);
        for (const input of documentation.inputs.slice(0, 5)) { // Show first 5 inputs
          const required = input.required ? ' *(required)*' : '';
          content.appendMarkdown(`- \`${input.name}\`${required}: ${input.description}\n`);
        }
        if (documentation.inputs.length > 5) {
          content.appendMarkdown(`- *...and ${documentation.inputs.length - 5} more*\n`);
        }
        content.appendMarkdown('\n');
      }

      // Quick example
      if (documentation.examples.length > 0) {
        const example = documentation.examples[0];
        content.appendMarkdown(`**Example:**\n\`\`\`yaml\n${example.code}\n\`\`\`\n\n`);
      }

      // Documentation link
      content.appendMarkdown(`[View Documentation](${documentation.documentationUrl})`);
    } else if (metadata) {
      content.appendMarkdown(`${metadata.description}\n\n`);
      content.appendMarkdown(`**Tags:** ${metadata.tags.join(', ')}\n\n`);
      content.appendMarkdown(`[View on GitHub Marketplace](https://github.com/marketplace/actions/${actionName.split('/')[1]})`);
    } else {
      content.appendMarkdown(`GitHub Action: ${actionName}\n\n`);
      content.appendMarkdown(`[Search on GitHub Marketplace](https://github.com/marketplace?query=${encodeURIComponent(actionName)})`);
    }

    return { content };
  }

  /**
   * Get hover information for workflow events
   */
  private getEventHover(eventName: string): { content: vscode.MarkdownString } {
    const content = new vscode.MarkdownString();
    content.isTrusted = true;

    const eventDescriptions: Record<string, string> = {
      'push': 'Runs when commits are pushed to the repository',
      'pull_request': 'Runs when a pull request is opened, synchronized, or reopened',
      'schedule': 'Runs on a schedule using cron syntax',
      'workflow_dispatch': 'Allows manual triggering of the workflow',
      'release': 'Runs when a release is published, unpublished, created, edited, deleted, or prereleased',
      'issues': 'Runs when an issue is opened, edited, deleted, transferred, pinned, unpinned, closed, reopened, assigned, unassigned, labeled, or unlabeled',
      'workflow_call': 'Allows this workflow to be called by other workflows',
      'repository_dispatch': 'Runs when a repository dispatch event is received'
    };

    content.appendMarkdown(`### ${eventName} Event\n\n`);
    content.appendMarkdown(`${eventDescriptions[eventName] || 'GitHub Actions workflow event'}\n\n`);
    content.appendMarkdown(`[Learn more about events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#${eventName})`);

    return { content };
  }

  /**
   * Get hover information for job properties
   */
  private getJobPropertyHover(property: string): { content: vscode.MarkdownString } {
    const content = new vscode.MarkdownString();
    content.isTrusted = true;

    const propertyDescriptions: Record<string, { description: string; example?: string }> = {
      'runs-on': {
        description: 'Specifies the type of machine to run the job on',
        example: 'runs-on: ubuntu-latest'
      },
      'strategy': {
        description: 'Defines a matrix strategy for running multiple variations of a job',
        example: 'strategy:\n  matrix:\n    node-version: [14, 16, 18]'
      },
      'env': {
        description: 'Sets environment variables for all steps in the job',
        example: 'env:\n  NODE_ENV: production'
      },
      'if': {
        description: 'Conditional expression to determine if the job should run',
        example: 'if: github.ref == \'refs/heads/main\''
      },
      'needs': {
        description: 'Identifies jobs that must complete successfully before this job runs',
        example: 'needs: [build, test]'
      },
      'timeout-minutes': {
        description: 'Maximum number of minutes to let a job run before canceling it',
        example: 'timeout-minutes: 30'
      }
    };

    const info = propertyDescriptions[property];
    if (info) {
      content.appendMarkdown(`### ${property}\n\n`);
      content.appendMarkdown(`${info.description}\n\n`);
      
      if (info.example) {
        content.appendMarkdown(`**Example:**\n\`\`\`yaml\n${info.example}\n\`\`\`\n\n`);
      }
    }

    content.appendMarkdown(`[Learn more about job properties](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobs)`);

    return { content };
  }

  /**
   * Get hover information for step properties
   */
  private getStepPropertyHover(property: string): { content: vscode.MarkdownString } {
    const content = new vscode.MarkdownString();
    content.isTrusted = true;

    const propertyDescriptions: Record<string, { description: string; example?: string }> = {
      'name': {
        description: 'A name for your step to display on GitHub',
        example: 'name: Run tests'
      },
      'run': {
        description: 'Runs command-line programs using the operating system\'s shell',
        example: 'run: npm test'
      },
      'uses': {
        description: 'Selects an action to run as part of a step in your job',
        example: 'uses: actions/checkout@v4'
      },
      'with': {
        description: 'A map of the input parameters defined by the action',
        example: 'with:\n  node-version: 18'
      },
      'env': {
        description: 'Sets environment variables for steps to use in the runner environment',
        example: 'env:\n  API_KEY: ${{ secrets.API_KEY }}'
      },
      'if': {
        description: 'Prevents a step from running unless a condition is met',
        example: 'if: success()'
      },
      'continue-on-error': {
        description: 'Prevents a job from failing when a step fails',
        example: 'continue-on-error: true'
      }
    };

    const info = propertyDescriptions[property];
    if (info) {
      content.appendMarkdown(`### ${property}\n\n`);
      content.appendMarkdown(`${info.description}\n\n`);
      
      if (info.example) {
        content.appendMarkdown(`**Example:**\n\`\`\`yaml\n${info.example}\n\`\`\`\n\n`);
      }
    }

    content.appendMarkdown(`[Learn more about step properties](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idsteps)`);

    return { content };
  }

  /**
   * Get hover information for context expressions
   */
  private getContextHover(expression: string, position: vscode.Position, document: vscode.TextDocument): { content: vscode.MarkdownString } {
    const content = new vscode.MarkdownString();
    content.isTrusted = true;

    // Parse the expression to identify context
    const contextMatch = expression.match(/^(\w+)\.?/);
    if (!contextMatch) {
      return { content };
    }

    const contextName = contextMatch[1];
    const contextDescriptions: Record<string, string> = {
      'github': 'Information about the workflow run and the event that triggered the run',
      'env': 'Environment variables set in a workflow, job, or step',
      'job': 'Information about the currently running job',
      'steps': 'Information about the steps that have been run in the current job',
      'runner': 'Information about the runner that is running the current job',
      'secrets': 'Access to secrets configured in your repository',
      'strategy': 'Information about the matrix execution strategy for the current job',
      'matrix': 'Access to the matrix parameters configured for the current job',
      'needs': 'Access to the outputs of all jobs that are defined as a direct dependency of the current job',
      'inputs': 'Access to the inputs of a reusable workflow'
    };

    content.appendMarkdown(`### \${{ ${expression} }}\n\n`);
    
    if (contextDescriptions[contextName]) {
      content.appendMarkdown(`**${contextName} context:** ${contextDescriptions[contextName]}\n\n`);
    }

    // Provide specific examples for common contexts
    if (contextName === 'github') {
      content.appendMarkdown(`**Common properties:**\n`);
      content.appendMarkdown(`- \`github.ref\`: The branch or tag ref that triggered the workflow\n`);
      content.appendMarkdown(`- \`github.sha\`: The commit SHA that triggered the workflow\n`);
      content.appendMarkdown(`- \`github.actor\`: The username of the user that initiated the workflow\n`);
      content.appendMarkdown(`- \`github.repository\`: The owner and repository name\n\n`);
    }

    content.appendMarkdown(`[Learn more about contexts](https://docs.github.com/en/actions/learn-github-actions/contexts#${contextName}-context)`);

    return { content };
  }

  /**
   * Get hover information for runner labels
   */
  private getRunnerHover(runner: string): { content: vscode.MarkdownString } {
    const content = new vscode.MarkdownString();
    content.isTrusted = true;

    const runnerDescriptions: Record<string, string> = {
      'ubuntu-latest': 'Latest Ubuntu runner (currently Ubuntu 22.04)',
      'ubuntu-22.04': 'Ubuntu 22.04 LTS runner',
      'ubuntu-20.04': 'Ubuntu 20.04 LTS runner',
      'windows-latest': 'Latest Windows runner (currently Windows Server 2022)',
      'windows-2022': 'Windows Server 2022 runner',
      'windows-2019': 'Windows Server 2019 runner',
      'macos-latest': 'Latest macOS runner (currently macOS 12)',
      'macos-12': 'macOS Monterey 12 runner',
      'macos-11': 'macOS Big Sur 11 runner'
    };

    content.appendMarkdown(`### ${runner}\n\n`);
    content.appendMarkdown(`${runnerDescriptions[runner] || 'GitHub-hosted runner'}\n\n`);
    
    if (runner.includes('ubuntu')) {
      content.appendMarkdown(`**Included software:** Git, Docker, Node.js, Python, Ruby, Java, .NET, and more\n\n`);
    } else if (runner.includes('windows')) {
      content.appendMarkdown(`**Included software:** Git, Docker, Node.js, Python, PowerShell, Visual Studio, and more\n\n`);
    } else if (runner.includes('macos')) {
      content.appendMarkdown(`**Included software:** Git, Node.js, Python, Ruby, Xcode, and more\n\n`);
    }

    content.appendMarkdown(`[View runner specifications](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)`);

    return { content };
  }
}