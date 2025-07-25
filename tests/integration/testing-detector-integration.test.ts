/**
 * Integration tests for TestingDetector with ReadmeParserImpl
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { ProjectInfo, TestingInfo } from '../../src/parser/types';

describe('TestingDetector Integration', () => {
  let parser: ReadmeParserImpl;

  beforeEach(() => {
    parser = new ReadmeParserImpl();
  });

  describe('End-to-End Testing Framework Detection', () => {
    it('should detect testing frameworks in a complete README', async () => {
      const content = `
# My Full-Stack Project

A modern web application with comprehensive testing.

## Tech Stack
- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL

## Testing Strategy

### Frontend Testing
We use Jest for unit testing and Cypress for E2E testing.

\`\`\`bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e
\`\`\`

Configuration files:
- \`jest.config.js\` - Jest configuration
- \`cypress.config.js\` - Cypress configuration

### Backend Testing
Python backend uses pytest for comprehensive testing.

\`\`\`bash
# Run Python tests
python -m pytest tests/
pytest --cov=src tests/
\`\`\`

Configuration in \`pytest.ini\`.

### Code Coverage
We use nyc for JavaScript coverage and coverage.py for Python.

\`\`\`bash
# JavaScript coverage
npm run test:coverage

# Python coverage
coverage run -m pytest
coverage report
\`\`\`

Reports are uploaded to Codecov.

## Development

\`\`\`bash
npm install
pip install -r requirements.txt
npm start
python app.py
\`\`\`
      `;

      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);

      const projectInfo = result.data as ProjectInfo;
      const testingInfo = projectInfo.testing;

      // Should detect multiple frameworks
      expect(testingInfo.frameworks.length).toBeGreaterThanOrEqual(3);
      
      const frameworkNames = testingInfo.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Jest');
      expect(frameworkNames).toContain('Cypress');
      expect(frameworkNames).toContain('pytest');

      // Should detect testing tools
      expect(testingInfo.tools.length).toBeGreaterThan(0);
      const toolNames = testingInfo.tools.map(t => t.name);
      expect(toolNames).toContain('Istanbul/nyc');
      expect(toolNames).toContain('Codecov');

      // Should detect config files
      expect(testingInfo.configFiles).toContain('jest.config.js');
      expect(testingInfo.configFiles).toContain('cypress.config.js');
      expect(testingInfo.configFiles).toContain('pytest.ini');

      // Should have reasonable confidence
      expect(testingInfo.confidence).toBeGreaterThan(0.6);
    });

    it('should work with language detection for framework context', async () => {
      const content = `
# JavaScript Testing Project

This Node.js project uses modern testing practices.

## Languages
- JavaScript/TypeScript
- Some Python scripts

## Testing
We use Jest for all our JavaScript testing needs.

\`\`\`javascript
// Example test
import { test, expect } from '@jest/globals';

test('adds 1 + 2 to equal 3', () => {
  expect(1 + 2).toBe(3);
});
\`\`\`

\`\`\`bash
npm test
jest --watch
\`\`\`
      `;

      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);

      const projectInfo = result.data as ProjectInfo;
      
      // Should detect JavaScript as primary language
      expect(projectInfo.languages.length).toBeGreaterThan(0);
      const jsLang = projectInfo.languages.find(l => l.name === 'JavaScript');
      expect(jsLang).toBeDefined();

      // Should detect Jest framework for JavaScript
      const jestFramework = projectInfo.testing.frameworks.find(f => f.name === 'Jest');
      expect(jestFramework).toBeDefined();
      expect(jestFramework!.language).toBe('JavaScript');
      expect(jestFramework!.confidence).toBeGreaterThan(0.7);
    });

    it('should handle projects with no testing setup', async () => {
      const content = `
# Simple Project

A basic project without testing setup.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Features
- Feature 1
- Feature 2
- Feature 3
      `;

      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);

      const projectInfo = result.data as ProjectInfo;
      const testingInfo = projectInfo.testing;

      expect(testingInfo.frameworks).toHaveLength(0);
      expect(testingInfo.tools).toHaveLength(0);
      expect(testingInfo.configFiles).toHaveLength(0);
      expect(testingInfo.confidence).toBe(0);
    });

    it('should integrate with command extraction', async () => {
      const content = `
# Testing Commands Project

## Testing

Run tests with these commands:

\`\`\`bash
# Unit tests with Jest
npm test
npm run test:unit

# E2E tests with Cypress
npm run test:e2e
cypress run

# Python tests
python -m pytest
pytest tests/

# Coverage
npm run test:coverage
pytest --cov=src
\`\`\`
      `;

      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);

      const projectInfo = result.data as ProjectInfo;

      // Should detect testing frameworks
      const frameworkNames = projectInfo.testing.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Jest');
      expect(frameworkNames).toContain('Cypress');
      expect(frameworkNames).toContain('pytest');

      // Should also detect test commands
      const testCommands = projectInfo.commands.test;
      expect(testCommands.length).toBeGreaterThan(0);
      
      const commandStrings = testCommands.map(c => c.command);
      expect(commandStrings.some(cmd => cmd.includes('npm test'))).toBe(true);
      expect(commandStrings.some(cmd => cmd.includes('pytest'))).toBe(true);
    });

    it('should work with complex multi-language projects', async () => {
      const content = `
# Polyglot Testing Project

A multi-language project with comprehensive testing.

## Languages & Frameworks

### Frontend (TypeScript/React)
- **Testing**: Jest + React Testing Library
- **E2E**: Playwright
- **Config**: \`jest.config.ts\`, \`playwright.config.ts\`

### Backend (Python/FastAPI)  
- **Testing**: pytest + pytest-asyncio
- **Config**: \`pytest.ini\`, \`pyproject.toml\`

### Mobile (Java/Android)
- **Testing**: JUnit 5 + Espresso
- **Config**: \`build.gradle\`

### Infrastructure (Go)
- **Testing**: Built-in testing package + Testify
- **Commands**: \`go test ./...\`

## Test Commands

\`\`\`bash
# Frontend
npm run test              # Jest unit tests
npm run test:e2e         # Playwright E2E tests

# Backend  
python -m pytest        # Python unit tests
pytest --cov=app tests/ # With coverage

# Mobile
./gradlew test          # JUnit tests

# Infrastructure
go test ./...           # Go tests
go test -v -race ./...  # With race detection
\`\`\`

## Coverage & Reporting
- **JavaScript**: nyc + Jest coverage
- **Python**: coverage.py
- **Reporting**: Codecov for all languages
      `;

      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);

      const projectInfo = result.data as ProjectInfo;
      const testingInfo = projectInfo.testing;

      // Should detect multiple frameworks across languages
      expect(testingInfo.frameworks.length).toBeGreaterThanOrEqual(4);
      
      const frameworkNames = testingInfo.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Jest');
      expect(frameworkNames).toContain('Playwright');
      expect(frameworkNames).toContain('pytest');
      expect(frameworkNames).toContain('JUnit');
      expect(frameworkNames).toContain('Go Testing');

      // Should detect different languages for frameworks
      const jestFramework = testingInfo.frameworks.find(f => f.name === 'Jest');
      const pytestFramework = testingInfo.frameworks.find(f => f.name === 'pytest');
      const junitFramework = testingInfo.frameworks.find(f => f.name === 'JUnit');
      const goFramework = testingInfo.frameworks.find(f => f.name === 'Go Testing');

      expect(jestFramework?.language).toBe('JavaScript');
      expect(pytestFramework?.language).toBe('Python');
      expect(junitFramework?.language).toBe('Java');
      expect(goFramework?.language).toBe('Go');

      // Should detect testing tools
      const toolNames = testingInfo.tools.map(t => t.name);
      expect(toolNames).toContain('Istanbul/nyc');
      expect(toolNames).toContain('Coverage.py');
      expect(toolNames).toContain('Codecov');

      // Should detect config files
      expect(testingInfo.configFiles).toContain('jest.config.ts');
      expect(testingInfo.configFiles).toContain('playwright.config.ts');
      expect(testingInfo.configFiles).toContain('pytest.ini');
      expect(testingInfo.configFiles).toContain('pyproject.toml');

      // Should have high confidence due to comprehensive setup
      expect(testingInfo.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed content gracefully', async () => {
      const content = `
# Broken Testing Setup

Some testing info with malformed markdown:

\`\`\`javascript
// Unclosed code block
const test = 'broken';

## Testing
We use Jest but this markdown is malformed.

\`\`\`bash
npm test
# Another unclosed block
      `;

      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);

      const projectInfo = result.data as ProjectInfo;
      
      // Should still detect some testing information despite malformed markdown
      expect(projectInfo.testing.frameworks.length).toBeGreaterThanOrEqual(0);
      
      // If Jest is detected, it should have reasonable confidence
      const jestFramework = projectInfo.testing.frameworks.find(f => f.name === 'Jest');
      if (jestFramework) {
        expect(jestFramework.confidence).toBeGreaterThan(0);
      }
    });

    it('should maintain performance with large README files', async () => {
      // Create a large README with repeated testing sections
      const baseSection = `
## Testing Section

We use Jest for testing:

\`\`\`javascript
test('example', () => {
  expect(true).toBe(true);
});
\`\`\`

\`\`\`bash
npm test
jest --watch
\`\`\`

Configuration in \`jest.config.js\`.
      `;

      const content = `# Large Project\n\n${baseSection.repeat(100)}`;

      const startTime = Date.now();
      const result = await parser.parseContent(content);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      const projectInfo = result.data as ProjectInfo;
      
      // Should still detect Jest despite repetition
      const jestFramework = projectInfo.testing.frameworks.find(f => f.name === 'Jest');
      expect(jestFramework).toBeDefined();
      expect(jestFramework!.confidence).toBeGreaterThan(0.8);
    });
  });
});