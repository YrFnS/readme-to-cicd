/**
 * Integration tests for ComponentOrchestrator
 * 
 * Tests the complete workflow execution pipeline including:
 * - README parsing
 * - Framework detection
 * - YAML generation
 * - File output
 * - Error handling and recovery
 * - Dry-run mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentOrchestrator } from '../../src/cli/lib/component-orchestrator';
import { Logger } from '../../src/cli/lib/logger';
import { ErrorHandler } from '../../src/cli/lib/error-handler';
import { CLIOptions } from '../../src/cli/lib/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('ComponentOrchestrator Integration Tests', () => {
  let orchestrator: ComponentOrchestrator;
  let logger: Logger;
  let errorHandler: ErrorHandler;
  let testDir: string;
  let readmeFile: string;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(tmpdir(), `orchestrator-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test README file
    readmeFile = path.join(testDir, 'README.md');
    await fs.writeFile(readmeFile, `
# Test Project

A Node.js application for testing the orchestrator.

## Installation

\`\`\`bash
npm install
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## Building

\`\`\`bash
npm run build
\`\`\`

## Dependencies

- express
- typescript
- jest
    `, 'utf8');

    // Initialize components
    logger = new Logger({ level: 'error' }); // Reduce noise in tests
    errorHandler = new ErrorHandler(logger);
    orchestrator = new ComponentOrchestrator(logger, errorHandler, {
      enableRecovery: true,
      maxRetries: 1, // Reduce retries for faster tests
      timeoutMs: 10000, // Shorter timeout for tests
      validateInputs: true,
      enablePerformanceTracking: true
    });

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Complete Workflow Execution', () => {
    it('should execute complete workflow successfully', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        outputDir: path.join(testDir, '.github', 'workflows'),
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
      expect(result.summary.filesProcessed).toBe(1);
      expect(result.summary.workflowsGenerated).toBeGreaterThan(0);
      expect(result.summary.frameworksDetected).toContain('Node.js');

      // Verify files were actually created
      for (const filePath of result.generatedFiles) {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
        
        // Verify file content is valid YAML
        const content = await fs.readFile(filePath, 'utf8');
        expect(content).toContain('name:');
        expect(content).toContain('on:');
        expect(content).toContain('jobs:');
      }
    });

    it('should handle specific workflow types', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        workflowType: ['ci', 'cd'],
        outputDir: path.join(testDir, '.github', 'workflows'),
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles.length).toBeGreaterThanOrEqual(2);
      expect(result.summary.workflowsGenerated).toBeGreaterThanOrEqual(2);
    });

    it('should track execution performance', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      expect(result.summary.executionTime).toBeGreaterThan(0);
      expect(result.summary.totalTime).toBeGreaterThan(0);
      expect(result.summary.totalTime).toBe(result.summary.executionTime);
    });
  });

  describe('Dry-Run Mode', () => {
    it('should execute dry-run without creating files', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        outputDir: path.join(testDir, '.github', 'workflows'),
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(0); // No files actually generated
      expect(result.summary.filesGenerated).toBe(0);
      expect(result.summary.workflowsGenerated).toBeGreaterThan(0); // But workflows were planned
      expect(result.warnings.some(w => w.includes('DRY RUN'))).toBe(true);

      // Verify no files were created
      const workflowDir = path.join(testDir, '.github', 'workflows');
      const dirExists = await fs.access(workflowDir).then(() => true).catch(() => false);
      if (dirExists) {
        const files = await fs.readdir(workflowDir);
        expect(files).toHaveLength(0);
      }
    });

    it('should provide detailed dry-run information', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      expect(result.summary.frameworksDetected.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Would generate'))).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle missing README file gracefully', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: path.join(testDir, 'nonexistent.md'),
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].category).toBe('processing');
      expect(result.errors[0].message).toContain('README file not found');
    });

    it('should handle invalid README content', async () => {
      // Create invalid README
      const invalidReadme = path.join(testDir, 'invalid.md');
      await fs.writeFile(invalidReadme, '', 'utf8'); // Empty file

      const options: CLIOptions = {
        command: 'generate',
        readmePath: invalidReadme,
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].category).toBe('processing');
    });

    it('should handle permission errors gracefully', async () => {
      // Create read-only output directory (if supported by OS)
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });
      
      try {
        await fs.chmod(readOnlyDir, 0o444); // Read-only
      } catch (error) {
        // Skip test if chmod is not supported
        return;
      }

      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        outputDir: readOnlyDir,
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.category === 'file-system')).toBe(true);

      // Restore permissions for cleanup
      await fs.chmod(readOnlyDir, 0o755);
    });

    it('should provide execution context in errors', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: path.join(testDir, 'nonexistent.md'),
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(false);
      expect(result.summary.executionTime).toBeGreaterThan(0);
      expect(result.summary.filesProcessed).toBe(0);
    });
  });

  describe('Component Integration', () => {
    it('should properly pass data between components', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        dryRun: true, // Use dry-run to avoid file I/O
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      
      // Verify that data flowed through all components
      expect(result.summary.filesProcessed).toBe(1); // README was parsed
      expect(result.summary.frameworksDetected.length).toBeGreaterThan(0); // Frameworks were detected
      expect(result.summary.workflowsGenerated).toBeGreaterThan(0); // Workflows were generated
    });

    it('should handle component failures gracefully', async () => {
      // Create README with content that might cause issues
      const problematicReadme = path.join(testDir, 'problematic.md');
      await fs.writeFile(problematicReadme, `
# Test Project

This is a minimal README with very little information.
      `, 'utf8');

      const options: CLIOptions = {
        command: 'generate',
        readmePath: problematicReadme,
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      // Should still succeed even with minimal information
      expect(result.success).toBe(true);
      expect(result.summary.filesProcessed).toBe(1);
    });
  });

  describe('Configuration and Options', () => {
    it('should respect custom output directory', async () => {
      const customOutputDir = path.join(testDir, 'custom-workflows');
      
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        outputDir: customOutputDir,
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles.every(f => f.startsWith(customOutputDir))).toBe(true);

      // Verify files exist in custom directory
      const dirExists = await fs.access(customOutputDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('should handle framework override', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        framework: ['python'], // Override detected framework
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      // Note: Framework override logic would need to be implemented in the orchestrator
      // This test verifies the option is accepted without errors
    });
  });

  describe('Performance and Statistics', () => {
    it('should provide execution statistics', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      await orchestrator.executeWorkflow(options);

      const stats = orchestrator.getExecutionStats();
      
      expect(stats).toHaveProperty('parser');
      expect(stats).toHaveProperty('detector');
      expect(stats).toHaveProperty('generator');
    });

    it('should support cache clearing', async () => {
      // Execute workflow to populate caches
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      await orchestrator.executeWorkflow(options);

      // Clear caches should not throw
      expect(() => orchestrator.clearCaches()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large README files', async () => {
      // Create large README
      const largeContent = Array(1000).fill(`
## Section

This is a section with some content.

\`\`\`bash
npm install
npm test
\`\`\`
      `).join('\n');

      const largeReadme = path.join(testDir, 'large.md');
      await fs.writeFile(largeReadme, `# Large Project\n${largeContent}`, 'utf8');

      const options: CLIOptions = {
        command: 'generate',
        readmePath: largeReadme,
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
      expect(result.summary.executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle README with special characters', async () => {
      const specialReadme = path.join(testDir, 'special.md');
      await fs.writeFile(specialReadme, `
# Tëst Prøjëct 🚀

A project with spëcial characters and émojis.

## Installatiön

\`\`\`bash
npm install --save-dev @types/nøde
\`\`\`

## Testing 🧪

\`\`\`bash
npm test
\`\`\`
      `, 'utf8');

      const options: CLIOptions = {
        command: 'generate',
        readmePath: specialReadme,
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await orchestrator.executeWorkflow(options);

      expect(result.success).toBe(true);
    });

    it('should handle concurrent executions', async () => {
      const options: CLIOptions = {
        command: 'generate',
        readmePath: readmeFile,
        dryRun: true,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false
      };

      // Execute multiple workflows concurrently
      const promises = Array(3).fill(null).map(() => 
        orchestrator.executeWorkflow(options)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});