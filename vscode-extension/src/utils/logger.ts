import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    static initialize() {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel('README to CICD');
        }
    }

    static info(message: string, ...args: any[]) {
        this.initialize();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] INFO: ${message}`;
        this.outputChannel.appendLine(logMessage);
        
        if (args.length > 0) {
            this.outputChannel.appendLine(JSON.stringify(args, null, 2));
        }
        
        console.log(logMessage, ...args);
    }

    static error(message: string, error?: any) {
        this.initialize();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${message}`;
        this.outputChannel.appendLine(logMessage);
        
        if (error) {
            if (error instanceof Error) {
                this.outputChannel.appendLine(`Stack: ${error.stack}`);
            } else {
                this.outputChannel.appendLine(`Error details: ${JSON.stringify(error, null, 2)}`);
            }
        }
        
        console.error(logMessage, error);
    }

    static warn(message: string, ...args: any[]) {
        this.initialize();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] WARN: ${message}`;
        this.outputChannel.appendLine(logMessage);
        
        if (args.length > 0) {
            this.outputChannel.appendLine(JSON.stringify(args, null, 2));
        }
        
        console.warn(logMessage, ...args);
    }

    static debug(message: string, ...args: any[]) {
        this.initialize();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] DEBUG: ${message}`;
        this.outputChannel.appendLine(logMessage);
        
        if (args.length > 0) {
            this.outputChannel.appendLine(JSON.stringify(args, null, 2));
        }
        
        console.debug(logMessage, ...args);
    }

    static show() {
        this.initialize();
        this.outputChannel.show();
    }
}