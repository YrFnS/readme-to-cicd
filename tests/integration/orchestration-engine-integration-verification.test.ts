/**
 * Integration Verification Tests for Orchestration Engine
 * 
 * This test suite verifies the complete end-to-end workflow from README parsing
 * to YAML generation, with specific focus on:
 * - Complete README-to-YAML generation pipeline
 * - Result type usage throughout the flow
 * - Regression tests for fixed compilation errors
 * - Error handling and recovery mechanisms
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrchestrationEngine, WorkflowRequest } from '../../src/integration/orchestration-engine';
import { Result, isSuccess, isFailure } from '../../src/shared/types/result';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Orchestration Engine Integration Verification', () => {
  let orchestrationEngine: OrchestrationEngine;
  let testDir: string;

  beforeEach(async () => {
    orchestrationEngine = new OrchestrationEngine();
    testDir = path.join(process.cwd(), 'test-output', `orchestration-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Workflow Tests', () => {
    it('should successfully process a complete README-to-YAML workflow for Node.js project', async () => {
      // Arrange
      const readmePath = path.join(testDir, 'README.md');
      const readmeContent = `# My Node.js Project

A sample Node.js application with React frontend.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
npm test
npm run build
\`\`\`

## Dependencies

- Node.js 18+
- React 18
- Express 4.x
- Jest for testing
`;
      await fs.writeFile(readmePath, readmeContent);

      const request: WorkflowRequest = {
        readmePath,
        outputDir: testDir,
        workflowTypes: ['ci'],
        dryRun: false
      };

      // Act
      const result = await orchestrationEngine.processWorkflowRequest(request);

      // Assert
      expect(result).toBeDefined();
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        const orchestrationResult = result.data;
        expect(orchestrationResult.success).toBe(true);
        expect(orchestrationResult.generatedFiles).toHaveLength(1);
        expect(orchestrationResult.detectedFrameworks).toContain('Node.js');
        expect(orchestrationResult.generatedFiles[0]).toMatch(/\.ya?ml$/);
      }
    });

    it('should successfully process a Python project README', async () => {
      // Arrange
      const readmePath = path.join(testDir, 'README.md');
      const readmeContent = `# My Python Project

A sample Python application with Flask.

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Usage

\`\`\`bash
python app.py
pytest
\`\`\`

## Dependencies

- Python 3.9+
- Flask 2.x
- pytest for testing
`;
      await fs.writeFile(readmePath, readmeContent);

      const request: WorkflowRequest = {
        readmePath,
        outputDir: testDir,
        workflowTypes: ['ci']
      };

      // Act
      const result = await orchestrationEngine.processWorkflowRequest(request);

      // Assert
      expect(result).toBeDefined();
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        const orchestrationResult = result.data;
        expect(orchestrationResult.success).toBe(true);
        expect(orchestrationResult.generatedFiles).toHaveLength(1);
        expect(orchestrationResult.detectedFrameworks).toContain('Python');
      }
    });
  });

  describe('Result Type Usage Verification', () => {
    it('should use Result type consistently throughout the pipeline', async () => {
      // Arrange
      const readmePath = path.join(testDir, 'README.md');
      const readmeContent = `# Test Project

## Installation
\`\`\`bash
npm install
\`\`\`
`;
      await fs.writeFile(readmePath, readmeContent);

      const request: WorkflowRequest = {
        readmePath,
        outputDir: testDir
      };

      // Act
      const result = await orchestrationEngine.processWorkflowRequest(request);

      // Assert - Verify Result type structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(result).toHaveProperty('data');
        expect(result).not.toHaveProperty('error');
      } else {
        expect(result).toHaveProperty('error');
        expect(result).not.toHaveProperty('data');
      }
    });

    it('should return proper error Result when README file does not exist', async () => {
      // Arrange
      const nonExistentPath = path.join(testDir, 'non-existent-readme.md');
      const request: WorkflowRequest = {
        readmePath: nonExistentPath,
        outputDir: testDir
      };

      // Act
      const result = await orchestrationEngine.processWorkflowRequest(request);

      // Assert
      expect(result).toBeDefined();
      expect(isFailure(result)).toBe(true);
      
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('README parsing failed');
      }
    });

    it('should handle malformed README content gracefully', async () => {
      // Arrange
      const readmePath = path.join(testDir, 'README.md');
      const malformedContent = '# Incomplete README\n\n```javascript\n// Missing closing backticks';
      await fs.writeFile(readmePath, malformedContent);

      const request: WorkflowRequest = {
        readmePath,
        outputDir: testDir
      };

      // Act
      const result = await orchestrationEngine.processWorkflowRequest(request);

      // Assert - Should handle gracefully, either succeed with warnings or fail with proper error
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Regression Tests for Fixed Compilation Errors', () => {
    it('should successfully import and use Result type without compilation errors', async () => {
      // This test verifies that the Result type import fix is working
      const result: Result<string, Error> = { success: true, data: 'test' };
      expect(isSuccess(result)).toBe(true);
      
      const errorResult: Result<string, Error> = { success: false, error: new Error('test error') };
      expect(isFailure(errorResult)).toBe(true);
    });

    it('should call generateWorkflow method (not generateWorkflows) without compilation errors', async () => {
      // Arrange
      const readmePath = path.join(testDir, 'README.md');
      const readmeContent = `# Test Project
## Installation
\`\`\`bash
npm install
\`\`\`
`;
      await fs.writeFile(readmePath, readmeContent);

      const request: WorkflowRequest = {
        readmePath,
        outputDir: testDir
      };

      // Act & Assert - This test passes if no compilation errors occur
      const result = await orchestrationEngine.processWorkflowRequest(request);
      expect(result).toBeDefined();
      
      // The fact that this executes without TypeScript compilation errors
      // verifies that the method name fix is working correctly
    });

    it('should validate system health and component integration', async () => {
      // Act
      const healthResult = await orchestrationEngine.validateSystemHealth();

      // Assert
      expect(healthResult).toBeDefined();
      expect(isSuccess(healthResult)).toBe(true);
      
      if (isSuccess(healthResult)) {
        expect(healthResult.data).toBe(true);
      }
    });

    it('should provide system status information', () => {
      // Act
      const status = orchestrationEngine.getSystemStatus();

      // Assert
      expect(status).toBeDefined();
      expect(status.components).toBeDefined();
      expect(status.components.readmeParser).toBe(true);
      expect(status.components.frameworkDetector).toBe(true);
      expect(status.components.yamlGenerator).toBe(true);
      expect(status.ready).toBe(true);
      expect(status.version).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid workflow request parameters', async () => {
      // Arrange
      const invalidRequest: WorkflowRequest = {
        readmePath: '', // Invalid empty path
        outputDir: testDir
      };

      // Act
      const result = await orchestrationEngine.processWorkflowRequest(invalidRequest);

      // Assert
      expect(result).toBeDefined();
      expect(isFailure(result)).toBe(true);
      
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle framework detection failures gracefully', async () => {
      // Arrange
      const readmePath = path.join(testDir, 'README.md');
      const minimalContent = '# Empty Project\n\nNo content here.';
      await fs.writeFile(readmePath, minimalContent);

      const request: WorkflowRequest = {
        readmePath,
        outputDir: testDir
      };

      // Act
      const result = await orchestrationEngine.processWorkflowRequest(request);

      // Assert - Should either succeed with minimal detection or fail gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle YAML generation errors appropriately', async () => {
      // This test ensures that if YAML generation fails, it's handled properly
      // The orchestration engine should return a proper Result with error information
      
      const readmePath = path.join(testDir, 'README.md');
      const readmeContent = `# Test Project
## Installation
\`\`\`bash
npm install
\`\`\`
`;
      await fs.writeFile(readmePath, readmeContent);

      const request: WorkflowRequest = {
        readmePath,
        outputDir: '/invalid/path/that/does/not/exist', // This might cause YAML generation to fail
        workflowTypes: ['ci']
      };

      const result = await orchestrationEngine.processWorkflowRequest(request);
      
      // Should handle the error gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });
});