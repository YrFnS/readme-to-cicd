/**
 * Integration tests for multi-analyzer context sharing scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Unmock fs for this test to allow real file operations
vi.unmock('fs');
vi.unmock('fs/promises');
vi.unmock('path');

import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { IntegrationPipeline } from '../../src/parser/integration-pipeline';
import { AnalysisContextBuilder } from '../../src/shared/types/analysis-context';
import { ContextValidator } from '../../src/shared/validation/context-validator';
import { 
  LanguageDetectorAdapter,
  CommandExtractorAdapter,
  DependencyExtractorAdapter,
  TestingDetectorAdapter
} from '../../src/parser/analyzers/analyzer-adapters';
import { MetadataExtractor } from '../../src/parser/analyzers/metadata-extractor';

describe('Context Sharing Integration Tests', () => {
  let parser: ReadmeParserImpl;
  let pipeline: IntegrationPipeline;
  let contextValidator: ContextValidator;

  beforeEach(() => {
    // Create pipeline and parser like the working debug script
    pipeline = new IntegrationPipeline();
    parser = new ReadmeParserImpl(pipeline, { 
      enableCaching: false, 
      enablePerformanceMonitoring: false 
    });
    contextValidator = new ContextValidator();
  });

  afterEach(() => {
    if (pipeline) {
      pipeline.cleanup();
    }
  });

  describe('Language Context Sharing', () => {
    it('should share language contexts from LanguageDetector to CommandExtractor', async () => {
      const readmeContent = `
# Node.js Project

A TypeScript application with testing.

## Installation

\`\`\`bash
npm install
npm test
npm run build
\`\`\`

## Development

\`\`\`javascript
const app = require('./app');
app.listen(3000);
\`\`\`
      `;

      const result = await parser.parseContent(readmeContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify language detection
      expect(result.data!.languages).toBeDefined();
      expect(result.data!.languages.length).toBeGreaterThan(0);
      
      // Verify commands have language associations
      expect(result.data!.commands).toBeDefined();
      const allCommands = [
        ...result.data!.commands.install,
        ...result.data!.commands.test,
        ...result.data!.commands.build,
        ...result.data!.commands.run
      ];
      
      // At least some commands should have language associations
      const commandsWithLanguage = allCommands.filter(cmd => cmd.language && cmd.language !== 'Shell');
      expect(commandsWithLanguage.length).toBeGreaterThan(0);
      
      console.log('Commands with language associations:', commandsWithLanguage);
    });

    it('should propagate language contexts through the entire pipeline', async () => {
      const readmeContent = `
# Python Data Science Project

A machine learning project using Python and scikit-learn.

## Setup

\`\`\`bash
pip install -r requirements.txt
python -m pytest tests/
python main.py
\`\`\`

## Dependencies

- pandas
- numpy
- scikit-learn
- pytest
      `;

      const result = await parser.parseContent(readmeContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify Python is detected
      const pythonLanguage = result.data!.languages.find(lang => lang.name === 'Python');
      expect(pythonLanguage).toBeDefined();
      expect(pythonLanguage!.confidence).toBeGreaterThan(0.5);
      
      // Verify Python-specific dependencies are detected
      expect(result.data!.dependencies.packages.some(pkg => pkg.name === 'pandas')).toBe(true);
      
      // Verify Python commands are associated correctly
      const pythonCommands = [
        ...result.data!.commands.install,
        ...result.data!.commands.test,
        ...result.data!.commands.run
      ].filter(cmd => cmd.language === 'Python' || cmd.command.includes('python') || cmd.command.includes('pip'));
      
      expect(pythonCommands.length).toBeGreaterThan(0);
      
      console.log('Python-related commands:', pythonCommands);
    });
  });

  describe('Dependency Context Sharing', () => {
    it('should share dependency information between analyzers', async () => {
      const readmeContent = `
# Full Stack Application

A React frontend with Node.js backend and PostgreSQL database.

## Installation

\`\`\`bash
npm install
pip install psycopg2
\`\`\`

## Environment Variables

- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: Secret for JWT tokens
- NODE_ENV: Environment (development/production)

## Testing

\`\`\`bash
npm test
pytest
\`\`\`
      `;

      const result = await parser.parseContent(readmeContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify multiple languages detected
      const languages = result.data!.languages.map(lang => lang.name);
      expect(languages).toContain('JavaScript');
      expect(languages).toContain('Python');
      
      // Verify dependencies from both ecosystems
      const packages = result.data!.dependencies.packages;
      expect(packages.some(pkg => pkg.manager === 'npm')).toBe(true);
      expect(packages.some(pkg => pkg.manager === 'pip')).toBe(true);
      
      // Verify environment variables include database-related ones
      const envVars = result.data!.metadata.environment || [];
      expect(envVars.some(env => env.name === 'DATABASE_URL')).toBe(true);
      expect(envVars.some(env => env.name === 'JWT_SECRET')).toBe(true);
      
      console.log('Detected languages:', languages);
      console.log('Environment variables:', envVars.map(env => env.name));
    });
  });

  describe('Testing Framework Context Sharing', () => {
    it('should associate testing frameworks with correct languages', async () => {
      const readmeContent = `
# Multi-Language Testing Project

## JavaScript Testing

\`\`\`bash
npm install jest
npm test
\`\`\`

## Python Testing

\`\`\`bash
pip install pytest
python -m pytest
\`\`\`

## Java Testing

\`\`\`bash
mvn test
\`\`\`

Dependencies:
- jest (JavaScript testing)
- pytest (Python testing)
- junit (Java testing)
      `;

      const result = await parser.parseContent(readmeContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify multiple languages detected
      const languages = result.data!.languages.map(lang => lang.name);
      expect(languages.length).toBeGreaterThan(1);
      
      // Verify testing frameworks are detected
      const testingFrameworks = result.data!.testing.frameworks;
      expect(testingFrameworks.length).toBeGreaterThan(0);
      
      // Verify frameworks are associated with correct languages
      const jestFramework = testingFrameworks.find(fw => fw.name.toLowerCase().includes('jest'));
      const pytestFramework = testingFrameworks.find(fw => fw.name.toLowerCase().includes('pytest'));
      
      if (jestFramework) {
        expect(jestFramework.language).toBe('JavaScript');
      }
      
      if (pytestFramework) {
        expect(pytestFramework.language).toBe('Python');
      }
      
      console.log('Testing frameworks:', testingFrameworks);
    });
  });

  describe('Context Validation', () => {
    it('should validate context integrity throughout the pipeline', async () => {
      const readmeContent = `
# Context Validation Test Project

A comprehensive project to test context sharing.

## Languages
- TypeScript
- Python

## Commands
\`\`\`bash
npm install
npm test
pip install -r requirements.txt
python test.py
\`\`\`
      `;

      // Create a context manually to test validation
      const context = AnalysisContextBuilder.create()
        .withSourceInfo({
          contentLength: readmeContent.length,
          lineCount: readmeContent.split('\n').length,
          contentHash: 'test-hash',
          contentType: 'markdown'
        })
        .build();

      // Validate the context
      const validation = contextValidator.validate(context);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      
      // Test the actual parsing with validation
      const result = await parser.parseContent(readmeContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('Context validation passed');
    });

    it('should detect and report context validation errors', async () => {
      // Create an invalid context
      const invalidContext = {
        sessionId: '', // Invalid: empty session ID
        languageContexts: [],
        sharedData: {} as any, // Invalid: not a Map
        metadata: null as any, // Invalid: null metadata
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          rulesApplied: [],
          dataFlowValidation: {
            isValid: true,
            executionSequence: [],
            dependencies: [],
            dataPropagation: [],
            inheritanceValidation: []
          }
        },
        inheritanceChain: []
      };

      const validation = contextValidator.validate(invalidContext as any);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      // Check for specific validation errors
      const errorCodes = validation.errors.map(error => error.code);
      expect(errorCodes).toContain('session-id-present');
      expect(errorCodes).toContain('metadata-present');
      expect(errorCodes).toContain('shared-data-initialized');
      
      console.log('Validation errors detected:', errorCodes);
    });
  });

  describe('End-to-End Context Flow', () => {
    it('should demonstrate complete context sharing workflow', async () => {
      const readmeContent = `
# Complete Context Sharing Demo

A full-featured application demonstrating context sharing between all analyzers.

## Project Description

This is a modern web application built with React, Node.js, and PostgreSQL.
It includes comprehensive testing, CI/CD, and deployment configurations.

## Tech Stack

- **Frontend**: React, TypeScript, Jest
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Testing**: Jest, Cypress, pytest
- **DevOps**: Docker, GitHub Actions

## Installation

\`\`\`bash
# Install dependencies
npm install
pip install -r requirements.txt

# Setup database
createdb myapp
psql myapp < schema.sql
\`\`\`

## Development

\`\`\`bash
# Start development server
npm run dev

# Run tests
npm test
npm run test:e2e
python -m pytest

# Build for production
npm run build
docker build -t myapp .
\`\`\`

## Environment Variables

- \`DATABASE_URL\`: PostgreSQL connection string (required)
- \`JWT_SECRET\`: Secret for JWT tokens (required)
- \`NODE_ENV\`: Environment mode (default: development)
- \`PORT\`: Server port (default: 3000)
- \`REDIS_URL\`: Redis connection for caching (optional)

## Project Structure

\`\`\`
src/
├── components/
├── pages/
├── utils/
├── services/
└── tests/
backend/
├── controllers/
├── models/
├── routes/
└── tests/
\`\`\`

## Dependencies

### Frontend
- react
- typescript
- jest
- cypress

### Backend
- express
- pg (PostgreSQL client)
- jsonwebtoken
- bcrypt

### Python Services
- fastapi
- sqlalchemy
- pytest
- redis
      `;

      const result = await parser.parseContent(readmeContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Comprehensive validation of all shared context
      
      // 1. Languages should be detected and shared
      const languages = result.data!.languages;
      expect(languages.length).toBeGreaterThan(2);
      const languageNames = languages.map(lang => lang.name);
      expect(languageNames).toContain('JavaScript');
      expect(languageNames).toContain('TypeScript');
      expect(languageNames).toContain('Python');
      
      // 2. Commands should have language associations
      const allCommands = [
        ...result.data!.commands.install,
        ...result.data!.commands.test,
        ...result.data!.commands.build,
        ...result.data!.commands.run
      ];
      const commandsWithLanguage = allCommands.filter(cmd => cmd.language && cmd.language !== 'Shell');
      expect(commandsWithLanguage.length).toBeGreaterThan(0);
      
      // 3. Dependencies should be categorized by language/manager
      const dependencies = result.data!.dependencies;
      expect(dependencies.packages.length).toBeGreaterThan(0);
      const npmPackages = dependencies.packages.filter(pkg => pkg.manager === 'npm');
      const pipPackages = dependencies.packages.filter(pkg => pkg.manager === 'pip');
      expect(npmPackages.length).toBeGreaterThan(0);
      expect(pipPackages.length).toBeGreaterThan(0);
      
      // 4. Testing frameworks should be associated with languages
      const testingFrameworks = result.data!.testing.frameworks;
      expect(testingFrameworks.length).toBeGreaterThan(0);
      const jsTestFrameworks = testingFrameworks.filter(fw => fw.language === 'JavaScript');
      const pyTestFrameworks = testingFrameworks.filter(fw => fw.language === 'Python');
      expect(jsTestFrameworks.length).toBeGreaterThan(0);
      expect(pyTestFrameworks.length).toBeGreaterThan(0);
      
      // 5. Metadata should include enhanced environment variables
      const envVars = result.data!.metadata.environment || [];
      expect(envVars.length).toBeGreaterThan(4);
      expect(envVars.some(env => env.name === 'DATABASE_URL')).toBe(true);
      expect(envVars.some(env => env.name === 'JWT_SECRET')).toBe(true);
      
      // 6. Overall confidence should be high due to context sharing
      expect(result.data!.confidence.overall).toBeGreaterThan(0.7);
      
      console.log('=== Complete Context Sharing Results ===');
      console.log('Languages:', languageNames);
      console.log('Commands with language:', commandsWithLanguage.length);
      console.log('NPM packages:', npmPackages.length);
      console.log('Pip packages:', pipPackages.length);
      console.log('JS test frameworks:', jsTestFrameworks.length);
      console.log('Python test frameworks:', pyTestFrameworks.length);
      console.log('Environment variables:', envVars.length);
      console.log('Overall confidence:', result.data!.confidence.overall);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle analyzer failures gracefully while maintaining context', async () => {
      const readmeContent = `
# Error Handling Test

This tests how the system handles analyzer failures.

\`\`\`bash
npm install
\`\`\`
      `;

      // This should work even if some analyzers fail
      const result = await parser.parseContent(readmeContent);
      
      // The system should still return results even with partial failures
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should have at least some basic information
      expect(result.data!.metadata.name).toBeDefined();
      
      console.log('Error handling test completed successfully');
    });
  });
});

describe('Context Sharing Performance Tests', () => {
  let parser: ReadmeParserImpl;
  let pipeline: IntegrationPipeline;

  beforeEach(() => {
    pipeline = new IntegrationPipeline();
    parser = new ReadmeParserImpl(pipeline, { 
      enableCaching: true, 
      enablePerformanceMonitoring: true 
    });
  });

  afterEach(() => {
    if (pipeline) {
      pipeline.cleanup();
    }
  });

  it('should maintain performance with context sharing enabled', async () => {
    const largeReadmeContent = `
# Large Project for Performance Testing

${'## Section '.repeat(50)}

${'```bash\nnpm install\nnpm test\n```\n'.repeat(20)}

${'- dependency-'.repeat(100)}

${'Environment variable: TEST_VAR_'.repeat(50)}
    `;

    const startTime = Date.now();
    const result = await parser.parseContent(largeReadmeContent);
    const endTime = Date.now();
    
    const processingTime = endTime - startTime;
    
    expect(result.success).toBe(true);
    expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    console.log(`Performance test completed in ${processingTime}ms`);
  });
});