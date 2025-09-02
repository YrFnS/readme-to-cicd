/**
 * VSCode Extension Specific Mocks
 * 
 * Specialized mocks for README-to-CICD extension components
 * that require specific VSCode API behaviors.
 */

import * as sinon from 'sinon';

/**
 * Mock for WorkflowTreeProvider testing
 */
export function createWorkflowTreeProviderMock() {
  return {
    // Mock workspace manager
    workspaceManager: {
      getWorkspaceFolders: sinon.stub().returns([
        {
          uri: { fsPath: '/mock/workspace' },
          name: 'mock-workspace',
          index: 0
        }
      ]),
      getReadmeFiles: sinon.stub().returns([
        {
          uri: {
            fsPath: '/mock/workspace/README.md',
            scheme: 'file',
            path: '/mock/workspace/README.md',
            toString: () => 'file:///mock/workspace/README.md'
          }
        }
      ])
    },

    // Mock CLI integration
    cliIntegration: {
      executeFrameworkDetection: sinon.stub().resolves({
        success: true,
        detectedFrameworks: [
          {
            name: 'Node.js',
            type: 'runtime',
            version: '18.0.0',
            confidence: 0.95,
            evidence: [
              {
                type: 'file',
                value: 'package.json',
                source: 'filesystem',
                confidence: 0.9
              },
              {
                type: 'command',
                value: 'npm install',
                source: 'readme',
                confidence: 0.8
              }
            ]
          },
          {
            name: 'React',
            type: 'framework',
            version: '18.2.0',
            confidence: 0.85,
            evidence: [
              {
                type: 'dependency',
                value: 'react',
                source: 'package.json',
                confidence: 0.9
              }
            ]
          }
        ],
        errors: []
      })
    },

    // Mock extension context
    context: {
      subscriptions: [],
      workspaceState: {
        get: sinon.stub().returns({}),
        update: sinon.stub().resolves()
      },
      globalState: {
        get: sinon.stub().returns({}),
        update: sinon.stub().resolves()
      }
    }
  };
}

/**
 * Mock for TooltipProvider testing
 */
export function createTooltipProviderMock() {
  return {
    // Mock GitHub Actions documentation
    githubActionsDoc: {
      initialize: sinon.stub().resolves(),
      getActionDocumentation: sinon.stub().callsFake(async (actionName: string) => {
        const docs: Record<string, any> = {
          'actions/checkout': {
            description: 'This action checks-out your repository under $GITHUB_WORKSPACE',
            inputs: [
              {
                name: 'repository',
                description: 'Repository name with owner',
                required: false
              },
              {
                name: 'ref',
                description: 'The branch, tag or SHA to checkout',
                required: false
              },
              {
                name: 'token',
                description: 'Personal access token (PAT)',
                required: false
              }
            ],
            examples: [
              {
                code: 'uses: actions/checkout@v4\nwith:\n  ref: main'
              }
            ],
            documentationUrl: 'https://github.com/actions/checkout'
          },
          'actions/setup-node': {
            description: 'Set up a specific version of Node.js and add the command-line tools to the PATH',
            inputs: [
              {
                name: 'node-version',
                description: 'Version Spec of the version to use',
                required: false
              },
              {
                name: 'cache',
                description: 'Used to specify a package manager for caching',
                required: false
              }
            ],
            examples: [
              {
                code: 'uses: actions/setup-node@v4\nwith:\n  node-version: 18\n  cache: npm'
              }
            ],
            documentationUrl: 'https://github.com/actions/setup-node'
          }
        };
        return docs[actionName] || null;
      }),
      getActionMetadata: sinon.stub().callsFake((actionName: string) => {
        const metadata: Record<string, any> = {
          'actions/checkout': {
            description: 'Checkout a Git repository at a particular version',
            tags: ['git', 'checkout', 'repository']
          },
          'actions/setup-node': {
            description: 'Setup Node.js environment',
            tags: ['node', 'javascript', 'npm']
          }
        };
        return metadata[actionName] || null;
      })
    }
  };
}

/**
 * Mock for GenerateWorkflowCommand testing
 */
export function createGenerateWorkflowCommandMock() {
  return {
    // Mock workflow provider
    workflowProvider: {
      generateWorkflow: sinon.stub().resolves({
        workflows: {
          ci: 'name: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4',
          cd: 'name: CD\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4'
        },
        metadata: {
          frameworks: ['Node.js', 'React'],
          optimizationLevel: 'standard',
          generatedAt: new Date().toISOString()
        }
      }),
      analyzeReadme: sinon.stub().resolves({
        frameworks: ['Node.js', 'React'],
        commands: ['npm install', 'npm test', 'npm run build'],
        hasInstallSection: true,
        hasTestSection: true,
        hasBuildSection: true
      })
    },

    // Mock file utilities
    fileUtils: {
      ensureDirectory: sinon.stub().resolves(),
      writeFile: sinon.stub().resolves(),
      readFile: sinon.stub().resolves('mock file content'),
      exists: sinon.stub().returns(true)
    }
  };
}

/**
 * Mock for extension activation testing
 */
export function createExtensionActivationMock() {
  const vscode = require('vscode');
  
  return {
    // Mock all extension services
    configService: {
      initialize: sinon.stub().resolves(),
      getConfiguration: sinon.stub().returns({
        autoDetect: true,
        defaultOptimization: 'standard',
        workflowTypes: ['ci', 'cd']
      })
    },

    workflowProvider: {
      initialize: sinon.stub().resolves(),
      generateWorkflow: sinon.stub().resolves({})
    },

    statusBarProvider: {
      initialize: sinon.stub().resolves(),
      refresh: sinon.stub(),
      dispose: sinon.stub()
    },

    sidebarProvider: {
      initialize: sinon.stub().resolves(),
      refresh: sinon.stub(),
      dispose: sinon.stub(),
      getTreeItem: sinon.stub(),
      getChildren: sinon.stub().resolves([])
    },

    // Mock commands
    commands: {
      generateCommand: {
        execute: sinon.stub().resolves()
      },
      validateCommand: {
        execute: sinon.stub().resolves()
      },
      previewCommand: {
        execute: sinon.stub().resolves()
      },
      initCommand: {
        execute: sinon.stub().resolves()
      }
    },

    // Mock file system watcher
    createMockWatcher: () => {
      const watcher = vscode.workspace.createFileSystemWatcher('**/README.{md,txt}');
      
      // Add mock event handlers
      watcher.onDidChange.returns({ dispose: sinon.stub() });
      watcher.onDidCreate.returns({ dispose: sinon.stub() });
      watcher.onDidDelete.returns({ dispose: sinon.stub() });
      
      return watcher;
    }
  };
}

/**
 * Mock README content for testing
 */
export const mockReadmeContent = {
  nodejs: `# My Node.js Project

A sample Node.js application with React frontend.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
npm run test:coverage
\`\`\`

## Building

\`\`\`bash
npm run build
\`\`\`

## Deployment

\`\`\`bash
npm run deploy
\`\`\`

## Dependencies

- Node.js 18+
- React 18
- TypeScript
- Jest for testing
`,

  python: `# Python Project

A Python application with Flask web framework.

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Development

\`\`\`bash
python app.py
\`\`\`

## Testing

\`\`\`bash
pytest
pytest --coverage
\`\`\`

## Building

\`\`\`bash
python setup.py build
\`\`\`

## Dependencies

- Python 3.9+
- Flask
- pytest
`,

  java: `# Java Spring Boot Project

A Spring Boot application with Maven build system.

## Installation

\`\`\`bash
mvn clean install
\`\`\`

## Development

\`\`\`bash
mvn spring-boot:run
\`\`\`

## Testing

\`\`\`bash
mvn test
mvn verify
\`\`\`

## Building

\`\`\`bash
mvn package
\`\`\`

## Dependencies

- Java 11+
- Spring Boot 2.7
- Maven 3.6+
`
};

/**
 * Mock workflow YAML content for testing
 */
export const mockWorkflowContent = {
  ci: `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16, 18, 20]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Run build
        run: npm run build
`,

  cd: `name: CD

on:
  push:
    branches: [main]
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: \${{ github.event.workflow_run.conclusion == 'success' }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to production
        run: npm run deploy
        env:
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}
`
};

/**
 * Create mock file system structure for testing
 */
export function createMockFileSystem() {
  return {
    '/mock/workspace': {
      'README.md': mockReadmeContent.nodejs,
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          dev: 'npm run start',
          test: 'jest',
          build: 'webpack',
          deploy: 'gh-pages -d dist'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          jest: '^29.0.0',
          webpack: '^5.0.0',
          typescript: '^4.9.0'
        }
      }, null, 2),
      '.github': {
        workflows: {
          'ci.yml': mockWorkflowContent.ci,
          'cd.yml': mockWorkflowContent.cd
        }
      },
      src: {
        'index.ts': 'console.log("Hello World");',
        'App.tsx': 'export default function App() { return <div>Hello</div>; }'
      },
      tests: {
        'App.test.tsx': 'test("renders hello", () => { expect(true).toBe(true); });'
      }
    }
  };
}

/**
 * Helper to setup mock file system in VSCode workspace mock
 */
export function setupMockFileSystem(vscode: any, fileSystem: any) {
  // Override workspace.fs methods to use mock file system
  vscode.workspace.fs.readFile = sinon.stub().callsFake(async (uri: any) => {
    const path = uri.fsPath || uri.path;
    const content = getFileFromMockFS(fileSystem, path);
    return Buffer.from(content || 'mock content');
  });

  vscode.workspace.fs.readDirectory = sinon.stub().callsFake(async (uri: any) => {
    const path = uri.fsPath || uri.path;
    const dir = getDirectoryFromMockFS(fileSystem, path);
    if (dir && typeof dir === 'object') {
      return Object.entries(dir).map(([name, content]) => [
        name,
        typeof content === 'object' ? 2 : 1 // Directory : File
      ]);
    }
    return [];
  });

  vscode.workspace.findFiles = sinon.stub().callsFake(async (pattern: string) => {
    const files = findFilesInMockFS(fileSystem, pattern);
    return files.map(path => ({
      fsPath: path,
      scheme: 'file',
      path: path,
      toString: () => `file://${path}`
    }));
  });
}

function getFileFromMockFS(fs: any, path: string): string | null {
  const parts = path.split('/').filter(p => p && p !== 'mock' && p !== 'workspace');
  let current = fs['/mock/workspace'];
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  
  return typeof current === 'string' ? current : null;
}

function getDirectoryFromMockFS(fs: any, path: string): any {
  const parts = path.split('/').filter(p => p && p !== 'mock' && p !== 'workspace');
  let current = fs['/mock/workspace'];
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  
  return typeof current === 'object' ? current : null;
}

function findFilesInMockFS(fs: any, pattern: string): string[] {
  const files: string[] = [];
  
  function traverse(obj: any, currentPath: string) {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = `${currentPath}/${key}`;
      
      if (typeof value === 'string') {
        // It's a file
        if (matchesPattern(key, pattern)) {
          files.push(fullPath);
        }
      } else if (typeof value === 'object') {
        // It's a directory
        traverse(value, fullPath);
      }
    }
  }
  
  traverse(fs['/mock/workspace'], '/mock/workspace');
  return files;
}

function matchesPattern(filename: string, pattern: string): boolean {
  // Simple pattern matching for common cases
  if (pattern.includes('README')) {
    return filename.toLowerCase().includes('readme');
  }
  if (pattern.includes('.github/workflows')) {
    return filename.endsWith('.yml') || filename.endsWith('.yaml');
  }
  if (pattern.includes('package.json')) {
    return filename === 'package.json';
  }
  
  // Default: match any file
  return true;
}