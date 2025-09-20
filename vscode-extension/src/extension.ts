import * as vscode from 'vscode';
import { GenerateWorkflowCommand } from './commands/generateWorkflow';
import { ValidateWorkflowCommand } from './commands/validateWorkflow';
import { PreviewWorkflowCommand } from './commands/previewWorkflow';
import { InitConfigCommand } from './commands/initConfig';
import { WorkflowProvider } from './providers/workflowProvider';
import { StatusBarProvider } from './providers/statusBarProvider';
import { SidebarProvider } from './providers/sidebarProvider';
import { ConfigService } from './services/configService';
import { Logger } from './utils/logger';

let statusBarProvider: StatusBarProvider;
let sidebarProvider: SidebarProvider;

export function activate(context: vscode.ExtensionContext) {
    Logger.info('README to CICD extension is now active!');

    // Lazy initialization - defer heavy operations
    let configService: ConfigService | null = null;
    let workflowProvider: WorkflowProvider | null = null;
    let statusBarProvider: StatusBarProvider | null = null;
    let sidebarProvider: SidebarProvider | null = null;

    // Initialize lightweight services first
    const initializeServices = () => {
        if (!configService) configService = new ConfigService();
        if (!workflowProvider) workflowProvider = new WorkflowProvider();
        if (!statusBarProvider) statusBarProvider = new StatusBarProvider();
        if (!sidebarProvider) sidebarProvider = new SidebarProvider();
    };

    // Register commands with lazy initialization
    context.subscriptions.push(
        vscode.commands.registerCommand('readme-to-cicd.generate', async () => {
            initializeServices();
            const generateCommand = new GenerateWorkflowCommand(workflowProvider!);
            await generateCommand.execute();
        }),
        vscode.commands.registerCommand('readme-to-cicd.validate', async () => {
            initializeServices();
            const validateCommand = new ValidateWorkflowCommand();
            await validateCommand.execute();
        }),
        vscode.commands.registerCommand('readme-to-cicd.preview', async () => {
            initializeServices();
            const previewCommand = new PreviewWorkflowCommand(workflowProvider!);
            await previewCommand.execute();
        }),
        vscode.commands.registerCommand('readme-to-cicd.init', async () => {
            initializeServices();
            const initCommand = new InitConfigCommand();
            await initCommand.execute();
        }),
        vscode.commands.registerCommand('readme-to-cicd.refresh', async () => {
            initializeServices();
            if (sidebarProvider) await sidebarProvider.refresh();
        })
    );

    // Register providers on demand
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('readme-to-cicd-sidebar', {
            getTreeItem: (element) => {
                initializeServices();
                return sidebarProvider!.getTreeItem(element);
            },
            getChildren: (element) => {
                initializeServices();
                return sidebarProvider!.getChildren(element);
            }
        }),
        // Status bar will be initialized when first used
        {
            dispose: () => {
                if (statusBarProvider) statusBarProvider.dispose();
            }
        }
    );

    // Lightweight watcher - defer heavy operations
    const watcher = vscode.workspace.createFileSystemWatcher('**/README.{md,txt}');
    watcher.onDidChange(() => {
        if (statusBarProvider) statusBarProvider.refresh();
        if (sidebarProvider) sidebarProvider.refresh();
    });
    watcher.onDidCreate(() => {
        if (statusBarProvider) statusBarProvider.refresh();
        if (sidebarProvider) sidebarProvider.refresh();
        updateWorkspaceContext();
    });
    watcher.onDidDelete(() => {
        if (statusBarProvider) statusBarProvider.refresh();
        if (sidebarProvider) sidebarProvider.refresh();
        updateWorkspaceContext();
    });
    context.subscriptions.push(watcher);

    // Set initial context (lightweight)
    updateWorkspaceContext();

    // Show welcome message on first activation (lightweight)
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        showWelcomeMessage();
        context.globalState.update('hasShownWelcome', true);
    }

    Logger.info('README to CICD extension activated successfully - optimized for fast startup');
}

export function deactivate() {
    Logger.info('README to CICD extension is now deactivated');
}

async function updateWorkspaceContext() {
    const readmeFiles = await vscode.workspace.findFiles('**/README.{md,txt}');
    await vscode.commands.executeCommand('setContext', 'workspaceHasReadme', readmeFiles.length > 0);
}

function showWelcomeMessage() {
    vscode.window.showInformationMessage(
        'Welcome to README to CICD! Generate CI/CD workflows from your README files.',
        'Get Started',
        'View Documentation'
    ).then(selection => {
        switch (selection) {
            case 'Get Started':
                vscode.commands.executeCommand('readme-to-cicd.generate');
                break;
            case 'View Documentation':
                vscode.env.openExternal(vscode.Uri.parse('https://readme-to-cicd.com/docs'));
                break;
        }
    });
}