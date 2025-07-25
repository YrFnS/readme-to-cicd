/**
 * Integration tests for CommandExtractor with real README files
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandExtractor } from '../../src/parser/analyzers/command-extractor';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { CommandInfo } from '../../src/parser/types';

describe('CommandExtractor Integration', () => {
  let extractor: CommandExtractor;
  let markdownParser: MarkdownParser;

  beforeEach(() => {
    extractor = new CommandExtractor();
    markdownParser = new MarkdownParser();
  });

  it('should extract commands from a typical Node.js project README', async () => {
    const readmeContent = `
# My Awesome Project

A modern web application built with Node.js and TypeScript.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

To start the development server:

\`\`\`bash
npm run dev
\`\`\`

## Building

Build the project for production:

\`\`\`bash
npm run build
npm run build:prod
\`\`\`

## Testing

Run the test suite:

\`\`\`bash
npm test
npm run test:coverage
\`\`\`

## Running

Start the application:

\`\`\`bash
npm start
\`\`\`

You can also run \`npm run dev\` for development mode.
    `;

    const parseResult = await markdownParser.parseContent(readmeContent);
    expect(parseResult.success).toBe(true);

    const result = await extractor.analyze(parseResult.data!.ast, readmeContent);
    expect(result.confidence).toBeGreaterThan(0.8);

    const commands = result.data as CommandInfo;

    // Should extract install commands
    expect(commands.install.length).toBeGreaterThan(0);
    expect(commands.install.some(cmd => cmd.command === 'npm install')).toBe(true);

    // Should extract build commands
    expect(commands.build.length).toBeGreaterThan(0);
    expect(commands.build.some(cmd => cmd.command === 'npm run build')).toBe(true);
    expect(commands.build.some(cmd => cmd.command === 'npm run build:prod')).toBe(true);

    // Should extract test commands
    expect(commands.test.length).toBeGreaterThan(0);
    expect(commands.test.some(cmd => cmd.command === 'npm test')).toBe(true);
    expect(commands.test.some(cmd => cmd.command === 'npm run test:coverage')).toBe(true);

    // Should extract run commands
    expect(commands.run.length).toBeGreaterThan(0);
    expect(commands.run.some(cmd => cmd.command === 'npm start')).toBe(true);
    expect(commands.run.some(cmd => cmd.command === 'npm run dev')).toBe(true);

    // Should have high confidence for code block commands
    const npmBuild = commands.build.find(cmd => cmd.command === 'npm run build');
    expect(npmBuild?.confidence).toBeGreaterThan(0.8);
    expect(npmBuild?.context).toBe('code-block');
  });

  it('should extract commands from a Python project README', async () => {
    const readmeContent = `
# Python Data Analysis Tool

A powerful data analysis tool built with Python.

## Setup

Install dependencies:

\`\`\`bash
pip install -r requirements.txt
python -m pip install --upgrade pip
\`\`\`

## Development

Create virtual environment:

\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
\`\`\`

## Testing

Run tests with pytest:

\`\`\`bash
pytest
python -m pytest tests/
python -m unittest discover
\`\`\`

## Running

Execute the main script:

\`\`\`bash
python main.py
python3 app.py --config config.json
python -m mypackage
\`\`\`
    `;

    const parseResult = await markdownParser.parseContent(readmeContent);
    expect(parseResult.success).toBe(true);

    const result = await extractor.analyze(parseResult.data!.ast, readmeContent);
    expect(result.confidence).toBeGreaterThan(0.7);

    const commands = result.data as CommandInfo;

    // Should extract install commands
    expect(commands.install.length).toBeGreaterThan(0);
    expect(commands.install.some(cmd => cmd.command === 'pip install -r requirements.txt')).toBe(true);
    expect(commands.install.some(cmd => cmd.command === 'python -m pip install --upgrade pip')).toBe(true);

    // Should extract test commands
    expect(commands.test.length).toBeGreaterThan(0);
    expect(commands.test.some(cmd => cmd.command === 'pytest')).toBe(true);
    expect(commands.test.some(cmd => cmd.command === 'python -m pytest tests/')).toBe(true);
    expect(commands.test.some(cmd => cmd.command === 'python -m unittest discover')).toBe(true);

    // Should extract run commands
    expect(commands.run.length).toBeGreaterThan(0);
    expect(commands.run.some(cmd => cmd.command === 'python main.py')).toBe(true);
    expect(commands.run.some(cmd => cmd.command === 'python3 app.py --config config.json')).toBe(true);
    expect(commands.run.some(cmd => cmd.command === 'python -m mypackage')).toBe(true);

    // Should identify Python language context
    const pythonCommands = [...commands.install, ...commands.test, ...commands.run]
      .filter(cmd => cmd.language === 'Python');
    expect(pythonCommands.length).toBeGreaterThan(0);
  });

  it('should extract commands from a Rust project README', async () => {
    const readmeContent = `
# Rust CLI Tool

A fast command-line tool written in Rust.

## Building

Build the project:

\`\`\`bash
cargo build
cargo build --release
\`\`\`

## Testing

Run the test suite:

\`\`\`bash
cargo test
cargo test --release
cargo test -- --nocapture
\`\`\`

## Running

Execute the binary:

\`\`\`bash
cargo run
cargo run --release -- --help
cargo run -- input.txt output.txt
\`\`\`

## Installation

Install from crates.io:

\`\`\`bash
cargo install my-tool
\`\`\`
    `;

    const parseResult = await markdownParser.parseContent(readmeContent);
    expect(parseResult.success).toBe(true);

    const result = await extractor.analyze(parseResult.data!.ast, readmeContent);
    expect(result.confidence).toBeGreaterThan(0.8);

    const commands = result.data as CommandInfo;

    // Should extract build commands
    expect(commands.build.length).toBeGreaterThan(0);
    expect(commands.build.some(cmd => cmd.command === 'cargo build')).toBe(true);
    expect(commands.build.some(cmd => cmd.command === 'cargo build --release')).toBe(true);

    // Should extract test commands
    expect(commands.test.length).toBeGreaterThan(0);
    expect(commands.test.some(cmd => cmd.command === 'cargo test')).toBe(true);
    expect(commands.test.some(cmd => cmd.command === 'cargo test --release')).toBe(true);
    expect(commands.test.some(cmd => cmd.command === 'cargo test -- --nocapture')).toBe(true);

    // Should extract run commands
    expect(commands.run.length).toBeGreaterThan(0);
    expect(commands.run.some(cmd => cmd.command === 'cargo run')).toBe(true);
    expect(commands.run.some(cmd => cmd.command === 'cargo run --release -- --help')).toBe(true);
    expect(commands.run.some(cmd => cmd.command === 'cargo run -- input.txt output.txt')).toBe(true);

    // Should identify Rust language context
    const rustCommands = [...commands.build, ...commands.test, ...commands.run]
      .filter(cmd => cmd.language === 'Rust');
    expect(rustCommands.length).toBeGreaterThan(0);
  });

  it('should extract commands from a multi-language project README', async () => {
    const readmeContent = `
# Full-Stack Application

A web application with React frontend and Node.js backend.

## Frontend Setup

\`\`\`bash
cd frontend
npm install
npm run build
npm start
\`\`\`

## Backend Setup

\`\`\`bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
\`\`\`

## Testing

Frontend tests:
\`\`\`bash
npm test
\`\`\`

Backend tests:
\`\`\`bash
pytest
\`\`\`

## Docker

\`\`\`bash
docker build -t myapp .
docker run -p 3000:3000 myapp
docker-compose up
\`\`\`
    `;

    const parseResult = await markdownParser.parseContent(readmeContent);
    expect(parseResult.success).toBe(true);

    const result = await extractor.analyze(parseResult.data!.ast, readmeContent);
    expect(result.confidence).toBeGreaterThan(0.7);

    const commands = result.data as CommandInfo;

    // Should extract JavaScript/Node.js commands
    expect(commands.install.some(cmd => cmd.command === 'npm install')).toBe(true);
    expect(commands.build.some(cmd => cmd.command === 'npm run build')).toBe(true);
    expect(commands.run.some(cmd => cmd.command === 'npm start')).toBe(true);
    expect(commands.test.some(cmd => cmd.command === 'npm test')).toBe(true);

    // Should extract Python commands
    expect(commands.install.some(cmd => cmd.command === 'pip install -r requirements.txt')).toBe(true);
    expect(commands.test.some(cmd => cmd.command === 'pytest')).toBe(true);

    // Should extract Docker commands
    expect(commands.other.some(cmd => cmd.command === 'docker build -t myapp .')).toBe(true);
    expect(commands.other.some(cmd => cmd.command === 'docker run -p 3000:3000 myapp')).toBe(true);
    expect(commands.other.some(cmd => cmd.command === 'docker-compose up')).toBe(true);

    // Should have mixed language contexts
    const jsCommands = [...commands.install, ...commands.build, ...commands.run, ...commands.test]
      .filter(cmd => cmd.language === 'JavaScript');
    const pythonCommands = [...commands.install, ...commands.test]
      .filter(cmd => cmd.language === 'Python');

    expect(jsCommands.length).toBeGreaterThan(0);
    expect(pythonCommands.length).toBeGreaterThan(0);
  });

  it('should handle README with minimal command information', async () => {
    const readmeContent = `
# Simple Project

A basic project with minimal setup.

## Usage

Just run the application.

## Notes

This project is very simple and doesn't require complex build steps.
    `;

    const parseResult = await markdownParser.parseContent(readmeContent);
    expect(parseResult.success).toBe(true);

    const result = await extractor.analyze(parseResult.data!.ast, readmeContent);
    
    const commands = result.data as CommandInfo;

    // Should handle gracefully with no commands
    expect(commands.build).toHaveLength(0);
    expect(commands.test).toHaveLength(0);
    expect(commands.run).toHaveLength(0);
    expect(commands.install).toHaveLength(0);
    expect(commands.other).toHaveLength(0);

    // Should have low confidence when no commands found
    expect(result.confidence).toBe(0);
  });

  it('should preserve command parameters and context correctly', async () => {
    const readmeContent = `
# Advanced Usage

## Complex Commands

\`\`\`bash
npm run build -- --mode production --optimize
cargo test --release --features "feature1,feature2"
python -m pytest tests/ -v --cov=src --cov-report=html
docker run -d -p 8080:80 -v $(pwd):/app --name mycontainer myimage
\`\`\`
    `;

    const parseResult = await markdownParser.parseContent(readmeContent);
    expect(parseResult.success).toBe(true);

    const result = await extractor.analyze(parseResult.data!.ast, readmeContent);
    
    const commands = result.data as CommandInfo;

    // Should preserve complex parameters
    const npmBuild = commands.build.find(cmd => cmd.command.includes('npm run build -- --mode production'));
    const cargoTest = commands.test.find(cmd => cmd.command.includes('cargo test --release --features'));
    const pytestCmd = commands.test.find(cmd => cmd.command.includes('python -m pytest tests/ -v --cov'));
    const dockerRun = commands.other.find(cmd => cmd.command.includes('docker run -d -p 8080:80'));

    expect(npmBuild).toBeDefined();
    expect(cargoTest).toBeDefined();
    expect(pytestCmd).toBeDefined();
    expect(dockerRun).toBeDefined();

    // All should be from code blocks with high confidence
    expect(npmBuild?.context).toBe('code-block');
    expect(cargoTest?.context).toBe('code-block');
    expect(pytestCmd?.context).toBe('code-block');
    expect(dockerRun?.context).toBe('code-block');

    expect(npmBuild?.confidence).toBeGreaterThan(0.8);
    expect(cargoTest?.confidence).toBeGreaterThan(0.8);
    expect(pytestCmd?.confidence).toBeGreaterThan(0.8);
    expect(dockerRun?.confidence).toBeGreaterThan(0.7);
  });
});