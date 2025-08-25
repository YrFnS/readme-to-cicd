import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { WorkflowProvider } from '../providers/workflowProvider';
import { Logger } from '../utils/logger';
import { FileUtils } from '../utils/fileUtils';

export class GenerateWorkflowCommand {
    constructor(private workflowProvider: WorkflowProvider) {}

    async execute(): Promise<void> {
        try {
            Logger.info('Starting workflow generation...');

            // Get active README file
            const readmeUri = await this.getReadmeFile();
            if (!readmeUri) {
                vscode.window.showErrorMessage('No README.md file found in workspace');
                return;
            }

            Logger.info(`Using README file: ${readmeUri.fsPath}`);

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating CI/CD Workflow",
                cancellable: true
            }, async (progress, token) => {
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 0, message: "Reading README..." });

                // Read README content
                const readmeContent = fs.readFileSync(readmeUri.fsPath, 'utf8');
                Logger.info(`README content length: ${readmeContent.length} characters`);

                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 25, message: "Analyzing content..." });

                // Analyze README content (simplified version)
                const analysis = await this.analyzeReadme(readmeContent);
                Logger.info(`Detected frameworks: ${analysis.frameworks.join(', ')}`);

                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 50, message: "Getting user preferences..." });

                // Get user preferences
                const options = await this.getWorkflowOptions();
                if (!options) {
                    Logger.info('User cancelled workflow generation');
                    return;
                }

                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 75, message: "Generating workflow..." });

                // Generate workflow
                const workflow = await this.generateWorkflowContent(analysis, options);

                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 90, message: "Saving workflow..." });

                // Save workflow
                const savedFiles = await this.saveWorkflows(workflow, options);

                progress.report({ increment: 100, message: "Complete!" });

                // Show success message
                const message = `Generated ${savedFiles.length} workflow file(s) successfully!`;
                const action = await vscode.window.showInformationMessage(
                    message,
                    'Open Workflows',
                    'View in Explorer'
                );

                if (action === 'Open Workflows') {
                    await this.openGeneratedWorkflows(savedFiles);
                } else if (action === 'View in Explorer') {
                    await this.revealInExplorer(savedFiles[0]);
                }
            });

        } catch (error) {
            Logger.error('Failed to generate workflow', error);
            vscode.window.showErrorMessage(
                `Failed to generate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    private async getReadmeFile(): Promise<vscode.Uri | undefined> {
        // Try active editor first
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && this.isReadmeFile(activeEditor.document.fileName)) {
            return activeEditor.document.uri;
        }

        // Search workspace
        const readmeFiles = await vscode.workspace.findFiles('**/README.{md,txt}');
        if (readmeFiles.length === 0) {
            return undefined;
        }

        if (readmeFiles.length === 1) {
            return readmeFiles[0];
        }

        // Multiple README files - let user choose
        const items = readmeFiles.map(uri => ({
            label: path.basename(path.dirname(uri.fsPath)),
            description: vscode.workspace.asRelativePath(uri),
            uri
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select README file to analyze'
        });

        return selected?.uri;
    }

    private isReadmeFile(filename: string): boolean {
        const basename = path.basename(filename).toLowerCase();
        return basename === 'readme.md' || basename === 'readme.txt';
    }

    private async analyzeReadme(content: string): Promise<any> {
        // Simplified analysis - in real implementation, use the core parser
        const frameworks: string[] = [];
        const commands: string[] = [];

        // Detect common frameworks
        if (content.includes('npm') || content.includes('package.json')) {
            frameworks.push('Node.js');
        }
        if (content.includes('pip') || content.includes('requirements.txt')) {
            frameworks.push('Python');
        }
        if (content.includes('cargo') || content.includes('Cargo.toml')) {
            frameworks.push('Rust');
        }
        if (content.includes('go mod') || content.includes('go.mod')) {
            frameworks.push('Go');
        }
        if (content.includes('mvn') || content.includes('pom.xml')) {
            frameworks.push('Java');
        }

        // Extract commands from code blocks
        const codeBlockRegex = /```(?:bash|sh|shell)?\n([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            const blockContent = match[1];
            const lines = blockContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
            commands.push(...lines);
        }

        return {
            frameworks,
            commands,
            hasInstallSection: /##?\s*install/i.test(content),
            hasTestSection: /##?\s*test/i.test(content),
            hasBuildSection: /##?\s*build/i.test(content)
        };
    }

    private async getWorkflowOptions(): Promise<any> {
        const config = vscode.workspace.getConfiguration('readme-to-cicd');
        
        // Get workflow types
        const workflowTypeItems = [
            { label: '$(gear) CI Only', description: 'Continuous Integration workflow', value: ['ci'] },
            { label: '$(gear) CI + CD', description: 'CI and Continuous Deployment', value: ['ci', 'cd'] },
            { label: '$(gear) CI + CD + Release', description: 'Full pipeline with releases', value: ['ci', 'cd', 'release'] },
            { label: '$(settings) Custom...', description: 'Choose specific workflow types', value: 'custom' }
        ];

        const workflowSelection = await vscode.window.showQuickPick(workflowTypeItems, {
            placeHolder: 'Select workflow types to generate'
        });

        if (!workflowSelection) {
            return null;
        }

        let workflowTypes = workflowSelection.value;

        if (workflowTypes === 'custom') {
            const customTypes = await vscode.window.showQuickPick(
                [
                    { label: 'CI (Continuous Integration)', value: 'ci', picked: true },
                    { label: 'CD (Continuous Deployment)', value: 'cd', picked: false },
                    { label: 'Release (Release Management)', value: 'release', picked: false }
                ],
                {
                    placeHolder: 'Select workflow types',
                    canPickMany: true
                }
            );

            if (!customTypes || customTypes.length === 0) {
                return null;
            }

            workflowTypes = customTypes.map(item => item.value);
        }

        // Get optimization level
        const optimizationItems = [
            { label: '$(zap) Basic', description: 'Fast builds, minimal optimization', value: 'basic' },
            { label: '$(gear) Standard', description: 'Balanced performance and features', value: 'standard' },
            { label: '$(rocket) Aggressive', description: 'Maximum optimization and features', value: 'aggressive' }
        ];

        const optimization = await vscode.window.showQuickPick(optimizationItems, {
            placeHolder: 'Select optimization level'
        });

        if (!optimization) {
            return null;
        }

        return {
            workflowTypes,
            optimizationLevel: optimization.value,
            outputDirectory: config.get('outputDirectory', '.github/workflows')
        };
    }

    private async generateWorkflowContent(analysis: any, options: any): Promise<any> {
        const workflows: any = {};

        for (const workflowType of options.workflowTypes) {
            workflows[workflowType] = this.generateWorkflowYAML(workflowType, analysis, options);
        }

        return workflows;
    }

    private generateWorkflowYAML(type: string, analysis: any, options: any): string {
        // Simplified YAML generation - in real implementation, use the core generator
        const framework = analysis.frameworks[0] || 'Generic';
        
        let yaml = `name: ${type.toUpperCase()}\n\n`;
        
        // Triggers
        if (type === 'ci') {
            yaml += `on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

`;
        } else if (type === 'cd') {
            yaml += `on:
  push:
    branches: [main]
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

`;
        } else if (type === 'release') {
            yaml += `on:
  push:
    tags: ['v*']

`;
        }

        // Jobs
        yaml += `jobs:
  ${type}:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
`;

        // Framework-specific steps
        if (framework === 'Node.js') {
            yaml += `      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
`;
            if (analysis.hasTestSection) {
                yaml += `      - name: Run tests
        run: npm test
        
`;
            }
            if (analysis.hasBuildSection) {
                yaml += `      - name: Build
        run: npm run build
        
`;
            }
        } else if (framework === 'Python') {
            yaml += `      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          
`;
            if (analysis.hasTestSection) {
                yaml += `      - name: Run tests
        run: pytest
        
`;
            }
        }

        // Add deployment steps for CD
        if (type === 'cd') {
            yaml += `      - name: Deploy
        run: echo "Add your deployment steps here"
        
`;
        }

        return yaml;
    }

    private async saveWorkflows(workflows: any, options: any): Promise<string[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const workflowDir = path.join(workspaceFolder.uri.fsPath, options.outputDirectory);
        
        // Create directory if it doesn't exist
        await FileUtils.ensureDirectory(workflowDir);

        const savedFiles: string[] = [];

        for (const [type, content] of Object.entries(workflows)) {
            const filename = `${type}.yml`;
            const filepath = path.join(workflowDir, filename);
            
            fs.writeFileSync(filepath, content as string);
            savedFiles.push(filepath);
            
            Logger.info(`Saved workflow: ${filepath}`);
        }

        return savedFiles;
    }

    private async openGeneratedWorkflows(files: string[]): Promise<void> {
        for (const file of files) {
            if (fs.existsSync(file)) {
                const document = await vscode.workspace.openTextDocument(file);
                await vscode.window.showTextDocument(document);
            }
        }
    }

    private async revealInExplorer(file: string): Promise<void> {
        if (fs.existsSync(file)) {
            const uri = vscode.Uri.file(file);
            await vscode.commands.executeCommand('revealInExplorer', uri);
        }
    }
}