import * as vscode from 'vscode';

/**
 * Service for managing GitHub Actions documentation and help resources
 */
export class GitHubActionsDocumentation {
  private documentationCache: Map<string, any> = new Map();
  private actionMetadata: Map<string, ActionMetadata> = new Map();

  /**
   * Initialize the documentation service
   */
  public async initialize(): Promise<void> {
    // Load popular GitHub Actions metadata
    await this.loadPopularActions();
  }

  /**
   * Get documentation URL for a specific topic
   */
  public getDocumentationUrl(topic?: string): string | undefined {
    const baseUrl = 'https://docs.github.com/en/actions';
    
    const topicUrls: Record<string, string> = {
      'workflow-syntax': `${baseUrl}/using-workflows/workflow-syntax-for-github-actions`,
      'github-action': `${baseUrl}/creating-actions`,
      'shell-command': `${baseUrl}/using-workflows/workflow-commands-for-github-actions`,
      'build-matrix': `${baseUrl}/using-jobs/using-a-matrix-for-your-jobs`,
      'environment-variables': `${baseUrl}/learn-github-actions/variables`,
      'secrets': `${baseUrl}/security-guides/encrypted-secrets`,
      'contexts': `${baseUrl}/learn-github-actions/contexts`,
      'expressions': `${baseUrl}/learn-github-actions/expressions`,
      'events': `${baseUrl}/using-workflows/events-that-trigger-workflows`,
      'runners': `${baseUrl}/using-github-hosted-runners/about-github-hosted-runners`,
      'marketplace': 'https://github.com/marketplace?type=actions'
    };

    return topic ? topicUrls[topic] : baseUrl;
  }

  /**
   * Get action metadata for IntelliSense and documentation
   */
  public getActionMetadata(actionName: string): ActionMetadata | undefined {
    return this.actionMetadata.get(actionName);
  }

  /**
   * Get all available actions for IntelliSense
   */
  public getAllActions(): ActionMetadata[] {
    return Array.from(this.actionMetadata.values());
  }

  /**
   * Search for actions by name or description
   */
  public searchActions(query: string): ActionMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllActions().filter(action => 
      action.name.toLowerCase().includes(lowerQuery) ||
      action.description.toLowerCase().includes(lowerQuery) ||
      action.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get documentation for a specific action
   */
  public async getActionDocumentation(actionName: string): Promise<ActionDocumentation | undefined> {
    // Check cache first
    if (this.documentationCache.has(actionName)) {
      return this.documentationCache.get(actionName);
    }

    try {
      // For popular actions, we have local documentation
      const localDoc = this.getLocalActionDocumentation(actionName);
      if (localDoc) {
        this.documentationCache.set(actionName, localDoc);
        return localDoc;
      }

      // For other actions, we could fetch from GitHub API
      // This is a simplified implementation
      const doc: ActionDocumentation = {
        name: actionName,
        description: `GitHub Action: ${actionName}`,
        inputs: [],
        outputs: [],
        examples: [],
        documentationUrl: `https://github.com/marketplace/actions/${actionName.split('/')[1]}`
      };

      this.documentationCache.set(actionName, doc);
      return doc;
    } catch (error) {
      console.error(`Failed to get documentation for action ${actionName}:`, error);
      return undefined;
    }
  }

  /**
   * Load metadata for popular GitHub Actions
   */
  private async loadPopularActions(): Promise<void> {
    const popularActions: ActionMetadata[] = [
      {
        name: 'actions/checkout',
        version: 'v4',
        description: 'Check out a repository',
        tags: ['git', 'repository', 'checkout'],
        inputs: [
          { name: 'repository', description: 'Repository name with owner', required: false },
          { name: 'ref', description: 'The branch, tag or SHA to checkout', required: false },
          { name: 'token', description: 'Personal access token', required: false },
          { name: 'path', description: 'Relative path under $GITHUB_WORKSPACE', required: false }
        ],
        outputs: []
      },
      {
        name: 'actions/setup-node',
        version: 'v4',
        description: 'Set up Node.js environment',
        tags: ['node', 'javascript', 'npm', 'yarn'],
        inputs: [
          { name: 'node-version', description: 'Version Spec of the version to use', required: false },
          { name: 'cache', description: 'Used to specify a package manager for caching', required: false },
          { name: 'registry-url', description: 'Optional registry to set up for auth', required: false }
        ],
        outputs: [
          { name: 'cache-hit', description: 'A boolean value to indicate if a cache was hit' }
        ]
      },
      {
        name: 'actions/setup-python',
        version: 'v4',
        description: 'Set up Python environment',
        tags: ['python', 'pip', 'conda'],
        inputs: [
          { name: 'python-version', description: 'Version range or exact version of Python', required: false },
          { name: 'cache', description: 'Used to specify a package manager for caching', required: false },
          { name: 'architecture', description: 'The target architecture (x86, x64)', required: false }
        ],
        outputs: [
          { name: 'python-version', description: 'The installed Python version' },
          { name: 'cache-hit', description: 'A boolean value to indicate if a cache was hit' }
        ]
      },
      {
        name: 'actions/setup-java',
        version: 'v4',
        description: 'Set up Java environment',
        tags: ['java', 'maven', 'gradle'],
        inputs: [
          { name: 'java-version', description: 'The Java version to set up', required: true },
          { name: 'distribution', description: 'Java distribution', required: true },
          { name: 'cache', description: 'Name of the build platform to cache dependencies', required: false }
        ],
        outputs: [
          { name: 'distribution', description: 'Distribution of Java that has been installed' },
          { name: 'path', description: 'Path to where Java has been installed' },
          { name: 'version', description: 'Actual version of the java environment that has been installed' }
        ]
      },
      {
        name: 'actions/upload-artifact',
        version: 'v4',
        description: 'Upload artifacts from your workflow',
        tags: ['artifacts', 'upload', 'storage'],
        inputs: [
          { name: 'name', description: 'Artifact name', required: false },
          { name: 'path', description: 'A file, directory or wildcard pattern', required: true },
          { name: 'retention-days', description: 'Duration after which artifact will expire', required: false }
        ],
        outputs: [
          { name: 'artifact-id', description: 'GitHub ID of an Artifact' },
          { name: 'artifact-url', description: 'URL to download an Artifact' }
        ]
      },
      {
        name: 'actions/download-artifact',
        version: 'v4',
        description: 'Download artifacts from your workflow',
        tags: ['artifacts', 'download', 'storage'],
        inputs: [
          { name: 'name', description: 'Name of the artifact to download', required: false },
          { name: 'path', description: 'Destination path', required: false },
          { name: 'pattern', description: 'A glob pattern to match artifacts', required: false }
        ],
        outputs: [
          { name: 'download-path', description: 'Absolute path where the artifacts were downloaded' }
        ]
      }
    ];

    // Store in metadata map
    for (const action of popularActions) {
      this.actionMetadata.set(action.name, action);
    }
  }

  /**
   * Get local documentation for popular actions
   */
  private getLocalActionDocumentation(actionName: string): ActionDocumentation | undefined {
    const localDocs: Record<string, ActionDocumentation> = {
      'actions/checkout': {
        name: 'actions/checkout',
        description: 'This action checks-out your repository under $GITHUB_WORKSPACE, so your workflow can access it.',
        inputs: [
          {
            name: 'repository',
            description: 'Repository name with owner. For example, actions/checkout',
            required: false,
            default: '${{ github.repository }}'
          },
          {
            name: 'ref',
            description: 'The branch, tag or SHA to checkout. When checking out the repository that triggered a workflow, this defaults to the reference or SHA for that event.',
            required: false,
            default: '${{ github.sha }}'
          },
          {
            name: 'token',
            description: 'Personal access token (PAT) used to fetch the repository.',
            required: false,
            default: '${{ github.token }}'
          }
        ],
        outputs: [],
        examples: [
          {
            title: 'Basic checkout',
            code: `- uses: actions/checkout@v4`
          },
          {
            title: 'Checkout specific branch',
            code: `- uses: actions/checkout@v4
  with:
    ref: develop`
          },
          {
            title: 'Checkout with token',
            code: `- uses: actions/checkout@v4
  with:
    token: \${{ secrets.GITHUB_TOKEN }}`
          }
        ],
        documentationUrl: 'https://github.com/actions/checkout'
      },
      'actions/setup-node': {
        name: 'actions/setup-node',
        description: 'This action sets up a Node.js environment for use in actions by downloading and caching a version of Node.js.',
        inputs: [
          {
            name: 'node-version',
            description: 'Version Spec of the version to use. Examples: 12.x, 10.15.1, >=10.15.0',
            required: false
          },
          {
            name: 'cache',
            description: 'Used to specify a package manager for caching in the default directory. Supported values: npm, yarn, pnpm',
            required: false
          }
        ],
        outputs: [
          {
            name: 'cache-hit',
            description: 'A boolean value to indicate if a cache was hit'
          }
        ],
        examples: [
          {
            title: 'Basic Node.js setup',
            code: `- uses: actions/setup-node@v4
  with:
    node-version: '18'`
          },
          {
            title: 'Node.js with npm cache',
            code: `- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'`
          },
          {
            title: 'Matrix strategy',
            code: `strategy:
  matrix:
    node-version: [16.x, 18.x, 20.x]
steps:
- uses: actions/setup-node@v4
  with:
    node-version: \${{ matrix.node-version }}
    cache: 'npm'`
          }
        ],
        documentationUrl: 'https://github.com/actions/setup-node'
      }
    };

    return localDocs[actionName];
  }
}

/**
 * Metadata for a GitHub Action
 */
export interface ActionMetadata {
  name: string;
  version: string;
  description: string;
  tags: string[];
  inputs: ActionInput[];
  outputs: ActionOutput[];
}

/**
 * Input parameter for a GitHub Action
 */
export interface ActionInput {
  name: string;
  description: string;
  required: boolean;
  default?: string;
}

/**
 * Output parameter for a GitHub Action
 */
export interface ActionOutput {
  name: string;
  description: string;
}

/**
 * Complete documentation for a GitHub Action
 */
export interface ActionDocumentation {
  name: string;
  description: string;
  inputs: ActionInput[];
  outputs: ActionOutput[];
  examples: ActionExample[];
  documentationUrl: string;
}

/**
 * Example usage of a GitHub Action
 */
export interface ActionExample {
  title: string;
  code: string;
  description?: string;
}