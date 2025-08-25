# 🎨 VSCode Extension Development Guide

**Complete guide to creating and using the README-to-CICD VSCode Extension**

## 📋 Table of Contents

1. [Extension Overview](#extension-overview)
2. [Development Setup](#development-setup)
3. [Extension Architecture](#extension-architecture)
4. [Building the Extension](#building-the-extension)
5. [Publishing](#publishing)
6. [Usage Guide](#usage-guide)
7. [Customization](#customization)

---

## 🎯 Extension Overview

The README-to-CICD VSCode Extension provides seamless integration for generating CI/CD workflows directly from your IDE.

### Features
- ✅ **One-click workflow generation** from README files
- ✅ **Live preview** of generated workflows
- ✅ **Framework detection** with visual indicators
- ✅ **Command palette integration**
- ✅ **Status bar integration**
- ✅ **Sidebar panel** for workflow management
- ✅ **Settings configuration** through VSCode preferences

---

## 🛠️ Development Setup

### Prerequisites
```bash
# Required tools
node -v    # 18+
npm -v     # 9+
code -v    # VSCode 1.74+

# Install VSCode Extension CLI
npm install -g @vscode/vsce
npm install -g yo generator-code
```

### Create Extension Structure
```bash
# Generate extension scaffold
yo code

# Choose:
# ? What type of extension do you want to create? New Extension (TypeScript)
# ? What's the name of your extension? README to CICD
# ? What's the identifier of your extension? readme-to-cicd
# ? What's the description of your extension? Generate CI/CD workflows from README files
# ? Initialize a git repository? Yes
# ? Bundle the source code with webpack? Yes
# ? Package manager? npm

cd readme-to-cicd-extension
```

### Project Structure
```
vscode-extension/
├── src/
│   ├── extension.ts           # Main extension entry point
│   ├── commands/              # Command implementations
│   │   ├── generateWorkflow.ts
│   │   ├── validateWorkflow.ts
│   │   └── previewWorkflow.ts
│   ├── providers/             # VSCode providers
│   │   ├── workflowProvider.ts
│   │   ├── statusBarProvider.ts
│   │   └── sidebarProvider.ts
│   ├── services/              # Core services
│   │   ├── readmeService.ts
│   │   ├── workflowService.ts
│   │   └── configService.ts
│   └── utils/                 # Utilities
│       ├── logger.ts
│       └── fileUtils.ts
├── resources/                 # Extension resources
│   ├── icons/
│   └── templates/
├── package.json              # Extension manifest
├── tsconfig.json
├── webpack.config.js
└── README.md
```

---

## 🏗️ Extension Architecture

### 1. Extension Manifest (package.json)

```json
{
  "name": "readme-to-cicd",
  "displayName": "README to CICD",
  "description": "Generate CI/CD workflows from README files",
  "version": "1.0.0",
  "publisher": "readme-to-cicd",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "keywords": ["cicd", "github-actions", "workflow", "automation"],
  "activationEvents": [
    "onLanguage:markdown",
    "workspaceContains:**/README.md"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "readme-to-cicd.generate",
        "title": "Generate Workflow",
        "category": "README to CICD",
        "icon": "$(gear)"
      },
      {
        "command": "readme-to-cicd.validate",
        "title": "Validate Workflow",
        "category": "README to CICD",
        "icon": "$(check)"
      },
      {
        "command": "readme-to-cicd.preview",
        "title": "Preview Workflow",
        "category": "README to CICD",
        "icon": "$(eye)"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "command": "readme-to-cicd.generate",
          "when": "resourceFilename == README.md",
          "group": "readme-to-cicd"
        }
      ],
      "editor/context": [
        {
          "command": "readme-to-cicd.generate",
          "when": "resourceFilename == README.md",
          "group": "readme-to-cicd"
        }
      ]
    },
    "views": {
      "explorer": [
        {
          "id": "readme-to-cicd-sidebar",
          "name": "README to CICD",
          "when": "workspaceHasReadme"
        }
      ]
    },
    "configuration": {
      "title": "README to CICD",
      "properties": {
        "readme-to-cicd.autoDetect": {
          "type": "boolean",
          "default": true,
          "description": "Automatically detect frameworks"
        },
        "readme-to-cicd.defaultOptimization": {
          "type": "string",
          "enum": ["basic", "standard", "aggressive"],
          "default": "standard",
          "description": "Default optimization level"
        },
        "readme-to-cicd.workflowTypes": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["ci", "cd", "release"]
          },
          "default": ["ci", "cd"],
          "description": "Default workflow types to generate"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "webpack",
    "watch": "webpack --watch",
    "package": "webpack --mode production --devtool hidden-source-map",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "16.x",
    "@typescript-eslint/eslint-plugin": "^5.45.0",
    "@typescript-eslint/parser": "^5.45.0",
    "eslint": "^8.28.0",
    "typescript": "^4.9.4",
    "webpack": "^5.75.0",
    "webpack-cli": "^5.0.0",
    "ts-loader": "^9.4.1"
  },
  "dependencies": {
    "readme-to-cicd": "^1.0.0"
  }
}
```

### 2. Main Extension File (src/extension.ts)

```typescript
import * as vscode from 'vscode';
import { GenerateWorkflowCommand } from './commands/generateWorkflow';
import { ValidateWorkflowCommand } from './commands/validateWorkflow';
import { PreviewWorkflowCommand } from './commands/previewWorkflow';
import { WorkflowProvider } from './providers/workflowProvider';
import { StatusBarProvider } from './providers/statusBarProvider';
import { SidebarProvider } from './providers/sidebarProvider';
import { ConfigService } from './services/configService';

export function activate(context: vscode.ExtensionContext) {
    console.log('README to CICD extension is now active!');

    // Initialize services
    const configService = new ConfigService();
    
    // Initialize providers
    const workflowProvider = new WorkflowProvider();
    const statusBarProvider = new StatusBarProvider();
    const sidebarProvider = new SidebarProvider();

    // Register commands
    const generateCommand = new GenerateWorkflowCommand(workflowProvider);
    const validateCommand = new ValidateWorkflowCommand();
    const previewCommand = new PreviewWorkflowCommand(workflowProvider);

    // Register command handlers
    context.subscriptions.push(
        vscode.commands.registerCommand('readme-to-cicd.generate', 
            () => generateCommand.execute()),
        vscode.commands.registerCommand('readme-to-cicd.validate', 
            () => validateCommand.execute()),
        vscode.commands.registerCommand('readme-to-cicd.preview', 
            () => previewCommand.execute())
    );

    // Register providers
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('readme-to-cicd-sidebar', sidebarProvider),
        statusBarProvider
    );

    // Watch for README changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/README.md');
    watcher.onDidChange(() => {
        statusBarProvider.refresh();
        sidebarProvider.refresh();
    });
    context.subscriptions.push(watcher);

    // Set context for when clauses
    vscode.commands.executeCommand('setContext', 'workspaceHasReadme', 
        vscode.workspace.findFiles('**/README.md').then(files => files.length > 0));
}

export function deactivate() {
    console.log('README to CICD extension is now deactivated');
}
```

### 3. Generate Workflow Command (src/commands/generateWorkflow.ts)

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ComponentFactory } from 'readme-to-cicd';
import { WorkflowProvider } from '../providers/workflowProvider';

export class GenerateWorkflowCommand {
    constructor(private workflowProvider: WorkflowProvider) {}

    async execute(): Promise<void> {
        try {
            // Get active README file
            const readmeUri = await this.getReadmeFile();
            if (!readmeUri) {
                vscode.window.showErrorMessage('No README.md file found');
                return;
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating CI/CD Workflow",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Reading README..." });

                // Read README content
                const readmeContent = fs.readFileSync(readmeUri.fsPath, 'utf8');

                progress.report({ increment: 25, message: "Analyzing content..." });

                // Parse README
                const factory = ComponentFactory.getInstance();
                const parser = factory.createReadmeParser();
                const parseResult = await parser.parseContent(readmeContent);

                if (!parseResult.success) {
                    throw new Error('Failed to parse README');
                }

                progress.report({ increment: 50, message: "Generating workflow..." });

                // Get user preferences
                const options = await this.getWorkflowOptions();

                // Generate workflow
                const generator = factory.createYAMLGenerator();
                const workflowResult = await generator.generateWorkflow(
                    parseResult.data, 
                    options
                );

                if (!workflowResult.success) {
                    throw new Error('Failed to generate workflow');
                }

                progress.report({ increment: 75, message: "Saving workflow..." });

                // Save workflow
                await this.saveWorkflow(workflowResult.data, options.workflowType);

                progress.report({ increment: 100, message: "Complete!" });
            });

            vscode.window.showInformationMessage(
                'CI/CD Workflow generated successfully!',
                'Open Workflow'
            ).then(selection => {
                if (selection === 'Open Workflow') {
                    this.openGeneratedWorkflow();
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to generate workflow: ${error.message}`
            );
        }
    }

    private async getReadmeFile(): Promise<vscode.Uri | undefined> {
        // Try active editor first
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith('README.md')) {
            return activeEditor.document.uri;
        }

        // Search workspace
        const readmeFiles = await vscode.workspace.findFiles('**/README.md');
        if (readmeFiles.length === 0) {
            return undefined;
        }

        if (readmeFiles.length === 1) {
            return readmeFiles[0];
        }

        // Multiple README files - let user choose
        const items = readmeFiles.map(uri => ({
            label: path.basename(path.dirname(uri.fsPath)),
            description: uri.fsPath,
            uri
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select README file'
        });

        return selected?.uri;
    }

    private async getWorkflowOptions(): Promise<any> {
        const config = vscode.workspace.getConfiguration('readme-to-cicd');
        
        // Get workflow types
        const workflowTypes = await vscode.window.showQuickPick(
            [
                { label: 'CI Only', value: 'ci' },
                { label: 'CI + CD', value: 'ci,cd' },
                { label: 'CI + CD + Release', value: 'ci,cd,release' }
            ],
            { placeHolder: 'Select workflow types' }
        );

        // Get optimization level
        const optimization = await vscode.window.showQuickPick(
            [
                { label: 'Basic (Fast builds)', value: 'basic' },
                { label: 'Standard (Balanced)', value: 'standard' },
                { label: 'Aggressive (Maximum optimization)', value: 'aggressive' }
            ],
            { placeHolder: 'Select optimization level' }
        );

        return {
            workflowType: workflowTypes?.value || config.get('workflowTypes', ['ci'])[0],
            optimizationLevel: optimization?.value || config.get('defaultOptimization', 'standard')
        };
    }

    private async saveWorkflow(content: string, workflowType: string): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const workflowDir = path.join(workspaceFolder.uri.fsPath, '.github', 'workflows');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(workflowDir)) {
            fs.mkdirSync(workflowDir, { recursive: true });
        }

        const filename = `${workflowType}.yml`;
        const filepath = path.join(workflowDir, filename);

        fs.writeFileSync(filepath, content);
    }

    private async openGeneratedWorkflow(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        const workflowPath = path.join(
            workspaceFolder.uri.fsPath, 
            '.github', 
            'workflows', 
            'ci.yml'
        );

        if (fs.existsSync(workflowPath)) {
            const document = await vscode.workspace.openTextDocument(workflowPath);
            await vscode.window.showTextDocument(document);
        }
    }
}
```

### 4. Sidebar Provider (src/providers/sidebarProvider.ts)

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ComponentFactory } from 'readme-to-cicd';

export class SidebarProvider implements vscode.TreeDataProvider<SidebarItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SidebarItem | undefined | null | void> = new vscode.EventEmitter<SidebarItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SidebarItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SidebarItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SidebarItem): Promise<SidebarItem[]> {
        if (!element) {
            return this.getRootItems();
        }
        return [];
    }

    private async getRootItems(): Promise<SidebarItem[]> {
        const items: SidebarItem[] = [];

        try {
            // Detect frameworks
            const frameworks = await this.detectFrameworks();
            if (frameworks.length > 0) {
                items.push(new SidebarItem(
                    'Detected Frameworks',
                    vscode.TreeItemCollapsibleState.Expanded,
                    'frameworks'
                ));
                
                frameworks.forEach(framework => {
                    items.push(new SidebarItem(
                        `${framework.name} (${Math.round(framework.confidence * 100)}%)`,
                        vscode.TreeItemCollapsibleState.None,
                        'framework',
                        {
                            command: 'readme-to-cicd.generate',
                            title: 'Generate Workflow',
                            arguments: [framework.name]
                        }
                    ));
                });
            }

            // Show existing workflows
            const workflows = await this.getExistingWorkflows();
            if (workflows.length > 0) {
                items.push(new SidebarItem(
                    'Existing Workflows',
                    vscode.TreeItemCollapsibleState.Expanded,
                    'workflows'
                ));

                workflows.forEach(workflow => {
                    items.push(new SidebarItem(
                        workflow.name,
                        vscode.TreeItemCollapsibleState.None,
                        'workflow',
                        {
                            command: 'vscode.open',
                            title: 'Open Workflow',
                            arguments: [workflow.uri]
                        }
                    ));
                });
            }

            // Quick actions
            items.push(new SidebarItem(
                'Generate New Workflow',
                vscode.TreeItemCollapsibleState.None,
                'action',
                {
                    command: 'readme-to-cicd.generate',
                    title: 'Generate Workflow'
                }
            ));

        } catch (error) {
            items.push(new SidebarItem(
                'Error loading data',
                vscode.TreeItemCollapsibleState.None,
                'error'
            ));
        }

        return items;
    }

    private async detectFrameworks(): Promise<any[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return [];

        const readmeFiles = await vscode.workspace.findFiles('**/README.md');
        if (readmeFiles.length === 0) return [];

        try {
            const readmeContent = fs.readFileSync(readmeFiles[0].fsPath, 'utf8');
            const factory = ComponentFactory.getInstance();
            const parser = factory.createReadmeParser();
            const result = await parser.parseContent(readmeContent);

            if (result.success && result.data?.languages) {
                return result.data.languages.map(lang => ({
                    name: lang.language,
                    confidence: lang.confidence
                }));
            }
        } catch (error) {
            console.error('Framework detection failed:', error);
        }

        return [];
    }

    private async getExistingWorkflows(): Promise<any[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return [];

        const workflowDir = path.join(workspaceFolder.uri.fsPath, '.github', 'workflows');
        if (!fs.existsSync(workflowDir)) return [];

        const files = fs.readdirSync(workflowDir)
            .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
            .map(file => ({
                name: file,
                uri: vscode.Uri.file(path.join(workflowDir, file))
            }));

        return files;
    }
}

class SidebarItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
    }
}
```

---

## 🔨 Building the Extension

### Development Build
```bash
cd vscode-extension
npm install
npm run compile
```

### Testing the Extension
```bash
# Open extension development host
code --extensionDevelopmentPath=. --new-window

# Or use F5 in VSCode to launch debug session
```

### Package for Distribution
```bash
# Install packaging tool
npm install -g @vscode/vsce

# Package extension
vsce package

# This creates: readme-to-cicd-1.0.0.vsix
```

### Local Installation
```bash
# Install packaged extension
code --install-extension readme-to-cicd-1.0.0.vsix
```

---

## 📦 Publishing

### Publish to VSCode Marketplace

#### 1. Create Publisher Account
```bash
# Create account at https://marketplace.visualstudio.com/manage
# Get Personal Access Token from Azure DevOps

# Login with vsce
vsce login your-publisher-name
```

#### 2. Publish Extension
```bash
# Publish to marketplace
vsce publish

# Or publish specific version
vsce publish 1.0.1

# Publish pre-release
vsce publish --pre-release
```

#### 3. Update Extension
```bash
# Update version and publish
vsce publish patch  # 1.0.0 -> 1.0.1
vsce publish minor  # 1.0.0 -> 1.1.0
vsce publish major  # 1.0.0 -> 2.0.0
```

### Alternative Distribution

#### GitHub Releases
```bash
# Create release with .vsix file
gh release create v1.0.0 readme-to-cicd-1.0.0.vsix
```

#### Private Distribution
```bash
# Share .vsix file directly
# Users install with: code --install-extension readme-to-cicd-1.0.0.vsix
```

---

## 🎯 Usage Guide

### Installation from Marketplace
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search "README to CICD"
4. Click Install

### Basic Usage

#### 1. Generate Workflow
- Open project with README.md
- Press `Ctrl+Shift+P`
- Type "README to CICD: Generate"
- Select workflow options
- Workflow created in `.github/workflows/`

#### 2. Using Sidebar
- Open Explorer panel
- Find "README to CICD" section
- View detected frameworks
- Click "Generate New Workflow"

#### 3. Context Menu
- Right-click on README.md
- Select "Generate CI/CD Workflow"
- Choose options in dialog

#### 4. Status Bar
- View detected frameworks in status bar
- Click to quickly generate workflows

### Advanced Features

#### Live Preview
```bash
# Command Palette
Ctrl+Shift+P -> "README to CICD: Preview Workflow"
```

#### Validation
```bash
# Validate existing workflows
Ctrl+Shift+P -> "README to CICD: Validate Workflow"
```

#### Settings
```json
{
  "readme-to-cicd.autoDetect": true,
  "readme-to-cicd.defaultOptimization": "standard",
  "readme-to-cicd.workflowTypes": ["ci", "cd"],
  "readme-to-cicd.outputDirectory": ".github/workflows",
  "readme-to-cicd.showStatusBar": true,
  "readme-to-cicd.enablePreview": true
}
```

---

## 🎨 Customization

### Custom Icons
```typescript
// Add to package.json
"contributes": {
  "icons": {
    "readme-to-cicd-icon": {
      "description": "README to CICD icon",
      "default": {
        "fontPath": "./resources/icons/readme-to-cicd.woff",
        "fontCharacter": "\\E001"
      }
    }
  }
}
```

### Custom Themes
```json
{
  "contributes": {
    "colors": {
      "readme-to-cicd.successColor": {
        "description": "Success color for README to CICD",
        "defaults": {
          "dark": "#4CAF50",
          "light": "#2E7D32"
        }
      }
    }
  }
}
```

### Custom Keybindings
```json
{
  "contributes": {
    "keybindings": [
      {
        "command": "readme-to-cicd.generate",
        "key": "ctrl+shift+g",
        "when": "resourceFilename == README.md"
      }
    ]
  }
}
```

---

## 🚀 Next Steps

1. **Set up development environment**
2. **Build and test the extension**
3. **Customize for your needs**
4. **Package and distribute**
5. **Publish to marketplace**

The VSCode extension provides a seamless way to integrate README-to-CICD into your development workflow, making CI/CD generation as simple as a right-click!

---

**Happy coding!** 🎉