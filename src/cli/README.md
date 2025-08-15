# CLI Tool Component

Command-line interface for the README-to-CICD system that provides a user-friendly way to generate GitHub Actions workflows from README files.

## Project Structure

```
src/cli/
├── bin/
│   └── cli.ts              # Main CLI entry point
├── lib/
│   ├── cli-application.ts  # Main CLI application class
│   ├── error-handler.ts    # Error handling and user-friendly messages
│   ├── logger.ts           # Structured logging with JSON format
│   └── types.ts            # TypeScript interfaces and types
├── config/
│   └── default-config.ts   # Default configuration settings
├── index.ts                # Main exports
└── README.md               # This file
```

## Installation

The CLI tool is installed as part of the main package:

```bash
npm install
npm run build
npm link  # For global installation
```

## Usage

```bash
# Basic usage
readme-to-cicd generate

# Show help
readme-to-cicd --help

# Show version
readme-to-cicd --version
```

## Current Implementation Status

✅ **Task 1 Complete**: Project structure and core dependencies
- CLI project structure with bin, lib, and config directories
- package.json with CLI entry point and required dependencies
- Core dependencies installed (commander, cosmiconfig, inquirer, ora, chalk, boxen)
- TypeScript configuration for CLI development
- Basic project scaffolding and entry point

## Next Steps

- **Task 2**: Implement command-line argument parsing
- **Task 3**: Build configuration management system
- **Task 4**: Create interactive prompt system
- **Task 5**: Implement progress management and user feedback

## Dependencies

### Core CLI Libraries
- **commander**: Command-line argument parsing
- **cosmiconfig**: Configuration file loading
- **inquirer**: Interactive prompts
- **ora**: Terminal spinners
- **chalk**: Terminal styling
- **boxen**: Terminal boxes

### Development Dependencies
- **@types/inquirer**: TypeScript types for inquirer
- **typescript**: TypeScript compiler
- **vitest**: Testing framework

## Testing

```bash
# Run CLI-specific tests
npm test -- tests/unit/cli/

# Test the CLI directly
node dist/cli/bin/cli.js --help
```

## Architecture

The CLI tool follows a modular architecture with clear separation of concerns:

1. **CLI Entry Point** (`bin/cli.ts`): Main executable with global error handling
2. **CLI Application** (`lib/cli-application.ts`): Command routing and execution
3. **Error Handler** (`lib/error-handler.ts`): User-friendly error messages
4. **Logger** (`lib/logger.ts`): Structured logging with correlation IDs
5. **Types** (`lib/types.ts`): TypeScript interfaces and type definitions
6. **Configuration** (`config/default-config.ts`): Default settings and options