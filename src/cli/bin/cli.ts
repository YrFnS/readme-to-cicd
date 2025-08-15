#!/usr/bin/env node

/**
 * CLI Entry Point for README-to-CICD
 * 
 * This is the main executable entry point for the CLI tool.
 * It initializes the CLI application and handles global error catching.
 */

import { CLIApplication } from '../lib/cli-application';
import { ErrorHandler } from '../lib/error-handler';
import { Logger } from '../lib/logger';

async function main(): Promise<void> {
  const logger = new Logger();
  const errorHandler = new ErrorHandler(logger);
  
  try {
    const cli = new CLIApplication(logger, errorHandler);
    await cli.run(process.argv);
  } catch (error) {
    errorHandler.handleFatalError(error as Error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});