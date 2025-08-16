/**
 * Process Executor
 * 
 * Utility class for executing CLI commands from the VS Code extension.
 * Provides process management, timeout handling, and progress reporting.
 */

import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { ProcessExecutionOptions, ProcessExecutionResult, CLIProgressReport } from './types';

export interface ProcessExecutorOptions {
  defaultTimeout?: number;
  enableLogging?: boolean;
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
}

export class ProcessExecutor {
  private readonly logger: vscode.LogOutputChannel;
  private readonly options: ProcessExecutorOptions;
  private activeProcesses: Map<string, ChildProcess> = new Map();

  constructor(options: ProcessExecutorOptions = {}) {
    this.options = {
      defaultTimeout: 30000, // 30 seconds
      enableLogging: true,
      ...options
    };

    this.logger = vscode.window.createOutputChannel('README to CI/CD - Process Executor', { log: true });
  }

  /**
   * Execute a CLI command with progress reporting
   */
  async executeCommand(
    options: ProcessExecutionOptions,
    progressCallback?: (progress: CLIProgressReport) => void,
    cancellationToken?: vscode.CancellationToken
  ): Promise<ProcessExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    this.log('info', `Starting command execution: ${options.command} ${options.args.join(' ')}`, { executionId });

    try {
      // Validate command
      this.validateCommand(options);

      // Setup execution environment
      const execOptions = this.prepareExecutionOptions(options);

      // Report initial progress
      if (progressCallback) {
        progressCallback({
          stage: 'parsing',
          progress: 0,
          message: 'Starting command execution...',
          timestamp: new Date()
        });
      }

      // Execute the command
      const result = await this.executeProcess(execOptions, executionId, progressCallback, cancellationToken);

      // Calculate execution time
      result.executionTime = Date.now() - startTime;

      this.log('info', `Command execution completed`, {
        executionId,
        success: result.success,
        exitCode: result.exitCode,
        executionTime: result.executionTime
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.log('error', `Command execution failed: ${errorMessage}`, { executionId, executionTime });

      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        executionTime,
        timedOut: false
      };
    } finally {
      // Clean up active process tracking
      this.activeProcesses.delete(executionId);
    }
  }

  /**
   * Execute CLI command specifically for README to CI/CD
   */
  async executeCLICommand(
    command: 'generate' | 'validate' | 'init',
    args: string[],
    workingDirectory?: string,
    progressCallback?: (progress: CLIProgressReport) => void,
    cancellationToken?: vscode.CancellationToken
  ): Promise<ProcessExecutionResult> {
    // Determine CLI executable path
    const cliPath = await this.resolveCLIPath();

    // Build command arguments
    const commandArgs = [command, ...args];

    // Execute the CLI command
    return this.executeCommand(
      {
        command: cliPath,
        args: commandArgs,
        cwd: workingDirectory || this.options.workingDirectory,
        timeout: this.options.defaultTimeout,
        shell: process.platform === 'win32' // Use shell on Windows
      },
      progressCallback,
      cancellationToken
    );
  }

  /**
   * Execute process with proper error handling and progress reporting
   */
  private async executeProcess(
    options: ProcessExecutionOptions,
    executionId: string,
    progressCallback?: (progress: CLIProgressReport) => void,
    cancellationToken?: vscode.CancellationToken
  ): Promise<ProcessExecutionResult> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let resolved = false;

      // Spawn the process
      const childProcess = spawn(options.command, options.args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        shell: options.shell || false,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Track the process
      this.activeProcesses.set(executionId, childProcess);

      // Setup timeout
      const timeout = options.timeout || this.options.defaultTimeout!;
      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          timedOut = true;
          childProcess.kill('SIGTERM');
          
          // Force kill after 5 seconds
          setTimeout(() => {
            if (!resolved) {
              childProcess.kill('SIGKILL');
            }
          }, 5000);
        }
      }, timeout);

      // Handle cancellation
      if (cancellationToken) {
        cancellationToken.onCancellationRequested(() => {
          if (!resolved) {
            this.log('info', 'Command execution cancelled by user', { executionId });
            childProcess.kill('SIGTERM');
          }
        });
      }

      // Collect stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        
        // Parse progress from CLI output if available
        this.parseProgressFromOutput(output, progressCallback);
        
        this.log('debug', 'Process stdout', { executionId, output: output.trim() });
      });

      // Collect stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        
        this.log('debug', 'Process stderr', { executionId, output: output.trim() });
      });

      // Handle process completion
      childProcess.on('close', (code: number | null, signal: string | null) => {
        if (resolved) return;
        resolved = true;

        clearTimeout(timeoutHandle);

        const result: ProcessExecutionResult = {
          success: code === 0 && !timedOut,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || -1,
          signal: signal || undefined,
          executionTime: 0, // Will be set by caller
          timedOut
        };

        if (timedOut) {
          result.stderr = `Command timed out after ${timeout}ms`;
        }

        // Report completion progress
        if (progressCallback) {
          progressCallback({
            stage: result.success ? 'complete' : 'error',
            progress: 100,
            message: result.success ? 'Command completed successfully' : 'Command failed',
            details: result.success ? undefined : result.stderr,
            timestamp: new Date()
          });
        }

        resolve(result);
      });

      // Handle process errors
      childProcess.on('error', (error: Error) => {
        if (resolved) return;
        resolved = true;

        clearTimeout(timeoutHandle);

        this.log('error', 'Process error', { executionId, error: error.message });

        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: error.message,
          exitCode: -1,
          executionTime: 0,
          timedOut: false
        });
      });
    });
  }

  /**
   * Parse progress information from CLI output
   */
  private parseProgressFromOutput(
    output: string,
    progressCallback?: (progress: CLIProgressReport) => void
  ): void {
    if (!progressCallback) return;

    // Look for progress indicators in the output
    const lines = output.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Parse different progress patterns
      if (trimmedLine.includes('Parsing README')) {
        progressCallback({
          stage: 'parsing',
          progress: 25,
          message: 'Parsing README file...',
          timestamp: new Date()
        });
      } else if (trimmedLine.includes('Detecting frameworks')) {
        progressCallback({
          stage: 'detection',
          progress: 50,
          message: 'Detecting frameworks...',
          timestamp: new Date()
        });
      } else if (trimmedLine.includes('Generating workflows')) {
        progressCallback({
          stage: 'generation',
          progress: 75,
          message: 'Generating workflows...',
          timestamp: new Date()
        });
      } else if (trimmedLine.includes('Writing files')) {
        progressCallback({
          stage: 'output',
          progress: 90,
          message: 'Writing workflow files...',
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Resolve the path to the CLI executable
   */
  private async resolveCLIPath(): Promise<string> {
    // Try to find the CLI in the workspace
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    if (workspaceFolder) {
      // Look for local CLI installation
      const localCliPath = path.join(workspaceFolder.uri.fsPath, 'node_modules', '.bin', 'readme-to-cicd');
      
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(localCliPath));
        return localCliPath;
      } catch {
        // Local CLI not found, continue to global search
      }
    }

    // Try global installation
    const globalCliCommand = process.platform === 'win32' ? 'readme-to-cicd.cmd' : 'readme-to-cicd';
    
    // For now, assume the CLI is available in PATH
    // In a real implementation, we might want to check if it exists
    return globalCliCommand;
  }

  /**
   * Validate command options
   */
  private validateCommand(options: ProcessExecutionOptions): void {
    if (!options.command) {
      throw new Error('Command is required');
    }

    if (!Array.isArray(options.args)) {
      throw new Error('Arguments must be an array');
    }

    if (options.timeout && options.timeout <= 0) {
      throw new Error('Timeout must be positive');
    }
  }

  /**
   * Prepare execution options with defaults
   */
  private prepareExecutionOptions(options: ProcessExecutionOptions): ProcessExecutionOptions {
    return {
      ...options,
      cwd: options.cwd || this.options.workingDirectory || process.cwd(),
      timeout: options.timeout || this.options.defaultTimeout,
      env: {
        ...process.env,
        ...this.options.environmentVariables,
        ...options.env
      }
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Kill all active processes
   */
  async killAllProcesses(): Promise<void> {
    const processes = Array.from(this.activeProcesses.values());
    
    for (const process of processes) {
      try {
        process.kill('SIGTERM');
      } catch (error) {
        this.log('warn', 'Failed to kill process', { error });
      }
    }

    this.activeProcesses.clear();
  }

  /**
   * Get active process count
   */
  getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * Log message with context
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: any): void {
    if (!this.options.enableLogging) return;

    const logMessage = context ? `${message} ${JSON.stringify(context)}` : message;

    switch (level) {
      case 'info':
        this.logger.info(logMessage);
        break;
      case 'warn':
        this.logger.warn(logMessage);
        break;
      case 'error':
        this.logger.error(logMessage);
        break;
      case 'debug':
        this.logger.debug(logMessage);
        break;
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.killAllProcesses();
    this.logger.dispose();
  }
}