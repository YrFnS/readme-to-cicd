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

    // Initialize services
    const configService = new ConfigService();
    
    // Initialize providers
    const workflowProvider = new WorkflowProvider();
    statusBarProvider = new StatusBarProvider();
    sidebarProvider = new SidebarProvider();

    // Initialize commands
    const generateCommand = new GenerateWorkflowCommand(workflowProvider);
    const validateCommand = new ValidateWorkflowCommand();
    const previewCommand = new PreviewWorkflowCommand(workflowProvider);
    const initCommand = new InitConfigCommand();

    // Register command handlers
    context.subscriptions.push(
        vscode.commands.registerCommand('readme-to-cicd.generate', 
            () => generateCommand.execute()),
        vscode.commands.registerCommand('readme-to-cicd.validate', 
            () => validateCommand.execute()),
        vscode.commands.registerCommand('readme-to-cicd.preview', 
            () => previewCommand.execute()),
        vscode.commands.registerCommand('readme-to-cicd.init', 
            () => initCommand.execute()),
        vscode.commands.registerCommand('readme-to-cicd.refresh', 
            () => sidebarProvider.refresh())
    );

    // Register providers
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('readme-to-cicd-sidebar', sidebarProvider),
        statusBarProvider
    );

    // Watch for README changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/README.{md,txt}');
    watcher.onDidChange(() => {
        statusBarProvider.refresh();
        sidebarProvider.refresh();
    });
    watcher.onDidCreate(() => {
        statusBarProvider.refresh();
        sidebarProvider.refresh();
        updateWorkspaceContext();
    });
    watcher.onDidDelete(() => {
        statusBarProvider.refresh();
        sidebarProvider.refresh();
        updateWorkspaceContext();
    });
    context.subscriptions.push(watcher);

    // Set initial context
    updateWorkspaceContext();

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        showWelcomeMessage();
        context.globalState.update('hasShownWelcome', true);
    }

    Logger.info('README to CICD extension activated successfully');
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