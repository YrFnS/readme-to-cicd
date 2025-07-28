/**
 * End-to-End Integration Pipeline Tests
 * 
 * These tests verify the complete data flow pipeline from content input
 * to final aggregated results, including error handling and recovery mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  IntegrationPipeline, 
  PipelineConfig, 
  executeIntegrationPipeline,
  createIntegrationPipeline,
  validatePipelineConfig
} from '../../src/parser/integration-pipeline';
import { ComponentFactory } from '../../src/parser/component-factory';

describe('End-to-End Integration Pipeline Tests', () => {
  let factory: ComponentFactory;

  beforeEach(() => {
    factory = ComponentFactory.getInstance();
    factory.reset();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('Basic Pipeline Execution', () => {
    it('should execute complete pipeline with JavaScript project', async () => {
      const content = `
# My JavaScript Project

A Node.js application built with Express.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
npm test
\`\`\`

## Dependencies

- express
- jest
- nodemon
      `;

      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.pipelineMetadata).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();

      // Verify language detection
      expect(result.data!.languages).toBeDefined();
      expect(result.data!.languages.length).toBeGreaterThan(0);
      
      // Verify command extraction
      expect(result.data!.commands).toBeDefined();
      expect(result.data!.commands.install.length).toBeGreaterThan(0);
      expect(result.data!.commands.test.length).toBeGreaterThan(0);

      // Verify confidence scores
      expect(result.data!.confidence.overall).toBeGreaterThan(0);
    }, 10000);

    it('should execute complete pipeline with Python project', async () => {
      const content = `
# Python Data Science Project

A machine learning project using scikit-learn.

## Setup

\`\`\`python
pip install -r requirements.txt
\`\`\`

## Running

\`\`\`python
python main.py
pytest tests/
\`\`\`

## Dependencies

- pandas
- scikit-learn
- pytest
      `;

      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Verify Python language detection
      const pythonLanguage = result.data!.languages.find(lang => lang.name === 'Python');
      expect(pythonLanguage).toBeDefined();
      expect(pythonLanguage!.confidence).toBeGreaterThan(0.5);

      // Verify Python commands
      expect(result.data!.commands.install.some(cmd => cmd.command.includes('pip'))).toBe(true);
      expect(result.data!.commands.test.some(cmd => cmd.command.includes('pytest'))).toBe(true);
    }, 10000);

    it('should execute complete pipeline with multi-language project', async () => {
      const content = `
# Full-Stack Application

Frontend in React, Backend in Node.js, ML in Python.

## Frontend Setup

\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

## Backend Setup

\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

## ML Pipeline

\`\`\`python
cd ml
pip install -r requirements.txt
python train.py
\`\`\`

## Testing

\`\`\`bash
npm test
pytest ml/tests/
\`\`\`
      `;

      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Verify multiple languages detected
      expect(result.data!.languages.length).toBeGreaterThanOrEqual(2);
      
      const languageNames = result.data!.languages.map(lang => lang.name);
      expect(languageNames).toContain('JavaScript');
      expect(languageNames).toContain('Python');

      // Verify commands from different languages
      const allCommands = [
        ...result.data!.commands.install,
        ...result.data!.commands.test,
        ...result.data!.commands.run
      ];
      
      expect(allCommands.some(cmd => cmd.command.includes('npm'))).toBe(true);
      expect(allCommands.some(cmd => cmd.command.includes('pip'))).toBe(true);
    }, 10000);
  });

  describe('Pipeline Configuration', () => {
    it('should execute with custom configuration', async () => {
      const config: PipelineConfig = {
        enableLogging: true,
        logLevel: 'debug',
        pipelineTimeout: 60000,
        enableRecovery: true,
        maxRetries: 5,
        confidenceThreshold: 0.7
      };

      const content = `# Test Project\n\n\`\`\`bash\nnpm install\n\`\`\``;
      const result = await executeIntegrationPipeline(content, config);

      expect(result.success).toBe(true);
      expect(result.pipelineMetadata).toBeDefined();
      expect(result.pipelineMetadata!.completedStages.length).toBeGreaterThan(0);
    });

    it('should validate pipeline configuration', () => {
      const validConfig: PipelineConfig = {
        pipelineTimeout: 30000,
        maxRetries: 3,
        confidenceThreshold: 0.5,
        maxContexts: 100
      };

      const validation = validatePipelineConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid pipeline configuration', () => {
      const invalidConfig: PipelineConfig = {
        pipelineTimeout: -1000,
        maxRetries: -1,
        confidenceThreshold: 2.0,
        maxContexts: -10
      };

      const validation = validatePipelineConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle empty content gracefully', async () => {
      const result = await executeIntegrationPipeline('');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].message).toContain('empty');
    });

    it('should handle malformed markdown content', async () => {
      const malformedContent = `
# Broken Markdown

\`\`\`unclosed-code-block
npm install
# Missing closing backticks

[Broken link](
      `;

      const result = await executeIntegrationPipeline(malformedContent);

      // Should succeed with recovery mechanisms
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
    });

    it('should recover from analyzer failures', async () => {
      const config: PipelineConfig = {
        enableRecovery: true,
        maxRetries: 2
      };

      // Content that might cause some analyzers to fail
      const problematicContent = `
# Test Project

\`\`\`
// Ambiguous code block without language
some code here
\`\`\`

Random text with no clear patterns.
      `;

      const result = await executeIntegrationPipeline(problematicContent, config);

      expect(result.success).toBe(true);
      expect(result.pipelineMetadata).toBeDefined();
      
      // Should have completed most stages even with some failures
      expect(result.pipelineMetadata!.completedStages.length).toBeGreaterThan(5);
    });

    it('should handle timeout scenarios', async () => {
      const config: PipelineConfig = {
        pipelineTimeout: 100, // Very short timeout
        enableRecovery: false
      };

      const largeContent = `# Large Project\n\n${'## Section\n\nContent here.\n\n'.repeat(1000)}`;

      const result = await executeIntegrationPipeline(largeContent, config);

      // Should fail due to timeout
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('timeout');
    }, 5000);

    it('should provide detailed error information', async () => {
      const result = await executeIntegrationPipeline('');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);

      const error = result.errors![0];
      expect(error.code).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.component).toBeDefined();
      expect(error.severity).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide performance metrics', async () => {
      const content = `# Test Project\n\n\`\`\`bash\nnpm install\nnpm test\n\`\`\``;
      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      expect(result.performanceMetrics).toBeDefined();
      expect(result.pipelineMetadata).toBeDefined();
      expect(result.pipelineMetadata!.executionTime).toBeGreaterThan(0);
    });

    it('should track stage execution times', async () => {
      const pipeline = createIntegrationPipeline({
        enablePerformanceMonitoring: true
      });

      const content = `# Test Project\n\n\`\`\`javascript\nconsole.log('hello');\n\`\`\``;
      const result = await pipeline.execute(content);

      expect(result.success).toBe(true);
      
      const healthStatus = pipeline.getHealthStatus();
      expect(healthStatus.status).toBeDefined();
      expect(healthStatus.performanceStats).toBeDefined();
      expect(healthStatus.totalExecutions).toBeGreaterThan(0);
    });

    it('should handle memory usage monitoring', async () => {
      const pipeline = createIntegrationPipeline();
      
      // Execute multiple times to test memory usage
      for (let i = 0; i < 3; i++) {
        const content = `# Test Project ${i}\n\n\`\`\`bash\nnpm install\n\`\`\``;
        await pipeline.execute(content);
      }

      const healthStatus = pipeline.getHealthStatus();
      expect(healthStatus.memoryUsage).toBeDefined();
      expect(healthStatus.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(healthStatus.totalExecutions).toBe(3);
    });
  });

  describe('Data Flow Validation', () => {
    it('should validate data flow between components', async () => {
      const content = `
# React TypeScript Project

\`\`\`typescript
interface User {
  id: number;
  name: string;
}
\`\`\`

## Setup

\`\`\`bash
npm install
npm run build
npm test
\`\`\`
      `;

      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      expect(result.integrationValidation).toBeDefined();
      
      const validation = result.integrationValidation!;
      expect(validation.isValid).toBe(true);
      expect(validation.completeness).toBeGreaterThan(0.5);

      // Verify data flow integrity
      expect(result.data!.languages.length).toBeGreaterThan(0);
      expect(result.data!.commands.install.length).toBeGreaterThan(0);
      expect(result.data!.confidence.overall).toBeGreaterThan(0);
    });

    it('should detect and resolve conflicts', async () => {
      const content = `
# Mixed Project

\`\`\`javascript
// JavaScript code
console.log('hello');
\`\`\`

\`\`\`typescript
// TypeScript code
const message: string = 'hello';
\`\`\`

\`\`\`bash
npm install
yarn install
\`\`\`
      `;

      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      
      // Should handle conflicting package managers gracefully
      const installCommands = result.data!.commands.install;
      expect(installCommands.length).toBeGreaterThan(0);
      
      // Should detect both JavaScript and TypeScript
      const languages = result.data!.languages.map(lang => lang.name);
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should maintain context inheritance across components', async () => {
      const content = `
# Multi-Language Project

## JavaScript Section

\`\`\`javascript
npm install
npm start
\`\`\`

## Python Section

\`\`\`python
pip install -r requirements.txt
python app.py
\`\`\`
      `;

      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      
      // Verify that commands are associated with correct languages
      const allCommands = [
        ...result.data!.commands.install,
        ...result.data!.commands.run
      ];
      
      // Should have commands from both languages
      expect(allCommands.some(cmd => cmd.command.includes('npm'))).toBe(true);
      expect(allCommands.some(cmd => cmd.command.includes('pip'))).toBe(true);
      
      // Verify language contexts are properly detected
      const languages = result.data!.languages.map(lang => lang.name);
      expect(languages).toContain('JavaScript');
      expect(languages).toContain('Python');
    });
  });

  describe('Integration Metadata', () => {
    it('should provide comprehensive integration metadata', async () => {
      const content = `# Test Project\n\n\`\`\`bash\nnpm install\n\`\`\``;
      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      expect(result.pipelineMetadata).toBeDefined();

      const metadata = result.pipelineMetadata!;
      expect(metadata.startTime).toBeDefined();
      expect(metadata.completedStages).toBeDefined();
      expect(metadata.completedStages.length).toBeGreaterThan(0);
      expect(metadata.executionTime).toBeGreaterThan(0);
      expect(metadata.recoveryAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should track analyzer usage and success rates', async () => {
      const content = `
# Complex Project

\`\`\`javascript
const express = require('express');
\`\`\`

\`\`\`json
{
  "name": "test-project",
  "dependencies": {
    "express": "^4.18.0"
  }
}
\`\`\`

\`\`\`bash
npm install
npm test
\`\`\`
      `;

      const result = await executeIntegrationPipeline(content);

      expect(result.success).toBe(true);
      expect(result.pipelineMetadata).toBeDefined();
      
      // Should have completed most pipeline stages
      const completedStages = result.pipelineMetadata!.completedStages;
      expect(completedStages).toContain('language-detection');
      expect(completedStages).toContain('command-extraction');
      expect(completedStages).toContain('result-aggregation');
    });
  });

  describe('Pipeline Instance Management', () => {
    it('should create and manage pipeline instances', () => {
      const pipeline1 = createIntegrationPipeline();
      const pipeline2 = createIntegrationPipeline();

      expect(pipeline1).toBeDefined();
      expect(pipeline2).toBeDefined();
      expect(pipeline1).not.toBe(pipeline2); // Should be different instances
    });

    it('should allow configuration updates', () => {
      const pipeline = createIntegrationPipeline({
        enableLogging: false,
        maxRetries: 1
      });

      const initialConfig = pipeline.getConfiguration();
      expect(initialConfig.enableLogging).toBe(false);
      expect(initialConfig.maxRetries).toBe(1);

      pipeline.updateConfiguration({
        enableLogging: true,
        maxRetries: 5
      });

      const updatedConfig = pipeline.getConfiguration();
      expect(updatedConfig.enableLogging).toBe(true);
      expect(updatedConfig.maxRetries).toBe(5);
    });

    it('should clear performance data', async () => {
      const pipeline = createIntegrationPipeline();
      
      // Execute pipeline to generate performance data
      await pipeline.execute('# Test\n\n```bash\nnpm install\n```');
      
      let healthStatus = pipeline.getHealthStatus();
      expect(healthStatus.totalExecutions).toBeGreaterThan(0);
      
      // Clear performance data
      pipeline.clearPerformanceData();
      
      healthStatus = pipeline.getHealthStatus();
      expect(healthStatus.totalExecutions).toBe(0);
    });
  });
});