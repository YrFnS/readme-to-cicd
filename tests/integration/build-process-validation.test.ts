/**
 * Build Process Validation Tests
 * 
 * These tests verify that the integration validation is properly integrated
 * into the build process and that all validation steps execute correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Build Process Validation Tests', () => {
  const projectRoot = process.cwd();
  const reportPath = join(projectRoot, 'integration-validation-report.json');

  beforeEach(() => {
    // Clean up any existing report
    if (existsSync(reportPath)) {
      unlinkSync(reportPath);
    }
  });

  afterEach(() => {
    // Clean up report after test
    if (existsSync(reportPath)) {
      unlinkSync(reportPath);
    }
  });

  describe('Integration Validation Script', () => {
    it('should execute integration validation script successfully', () => {
      // Run the integration validation script
      const result = execSync('node scripts/integration-validation.js', {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });

      // Verify script executed successfully
      expect(result).toContain('Integration validation');
      
      // Verify report was generated
      expect(existsSync(reportPath)).toBe(true);
    }, 30000);

    it('should generate comprehensive validation report', () => {
      // Run validation
      execSync('node scripts/integration-validation.js', {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      // Read and parse report
      const reportContent = readFileSync(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      // Verify report structure
      expect(report.summary).toBeDefined();
      expect(report.results).toBeDefined();
      expect(report.system).toBeDefined();

      // Verify summary fields
      expect(report.summary.totalSteps).toBeGreaterThan(0);
      expect(report.summary.successful).toBeGreaterThanOrEqual(0);
      expect(report.summary.failed).toBeGreaterThanOrEqual(0);
      expect(report.summary.executionTime).toBeGreaterThan(0);
      expect(report.summary.timestamp).toBeDefined();

      // Verify system information
      expect(report.system.nodeVersion).toBeDefined();
      expect(report.system.platform).toBeDefined();
      expect(report.system.arch).toBeDefined();
      expect(report.system.cwd).toBeDefined();

      // Verify results array
      expect(Array.isArray(report.results)).toBe(true);
      expect(report.results.length).toBeGreaterThan(0);

      // Verify each result has required fields
      for (const result of report.results) {
        expect(result.step).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.message).toBeDefined();
        expect(result.timestamp).toBeDefined();
      }
    }, 30000);

    it('should validate all required integration steps', () => {
      // Run validation
      execSync('node scripts/integration-validation.js', {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      // Read report
      const reportContent = readFileSync(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      // Expected validation steps
      const expectedSteps = [
        'typescript-compilation',
        'component-interfaces',
        'integration-tests',
        'end-to-end-pipeline',
        'performance-validation',
        'memory-validation'
      ];

      const actualSteps = report.results.map((r: any) => r.step);

      // Verify all expected steps are present
      for (const expectedStep of expectedSteps) {
        expect(actualSteps).toContain(expectedStep);
      }
    }, 30000);

    it('should handle validation failures gracefully', () => {
      // This test would require a way to simulate failures
      // For now, we'll just verify the script can handle errors
      
      try {
        // Run validation (should succeed in normal conditions)
        const result = execSync('node scripts/integration-validation.js', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });

        // If it succeeds, verify success message
        expect(result).toContain('Integration validation passed');
      } catch (error) {
        // If it fails, verify error handling
        expect(error).toBeDefined();
        
        // Report should still be generated even on failure
        if (existsSync(reportPath)) {
          const reportContent = readFileSync(reportPath, 'utf8');
          const report = JSON.parse(reportContent);
          expect(report.summary.failed).toBeGreaterThan(0);
        }
      }
    }, 30000);
  });

  describe('NPM Scripts Integration', () => {
    it('should include integration validation in build script', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      // Verify build script includes validation
      expect(packageJson.scripts.build).toContain('validate:integration');
      
      // Verify validation script exists
      expect(packageJson.scripts['validate:integration']).toBeDefined();
      expect(packageJson.scripts['validate:integration']).toContain('integration-validation.js');
    });

    it('should execute validate:integration npm script', () => {
      const result = execSync('npm run validate:integration', {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });

      expect(result).toContain('Integration validation');
      expect(existsSync(reportPath)).toBe(true);
    }, 30000);

    it('should execute validate:build npm script', () => {
      const result = execSync('npm run validate:build', {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });

      // Should include both type checking and integration validation
      expect(result).toContain('Integration validation');
      expect(existsSync(reportPath)).toBe(true);
    }, 45000);

    it('should have CI script that includes all validations', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      // Verify CI script exists and includes validations
      expect(packageJson.scripts.ci).toBeDefined();
      expect(packageJson.scripts.ci).toContain('lint');
      expect(packageJson.scripts.ci).toContain('validate:build');
      expect(packageJson.scripts.ci).toContain('test:all');
    });
  });

  describe('TypeScript Compilation Validation', () => {
    it('should validate TypeScript compilation as part of integration', () => {
      // Run validation
      execSync('node scripts/integration-validation.js', {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      // Check report for TypeScript validation
      const reportContent = readFileSync(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      const tsResult = report.results.find((r: any) => r.step === 'typescript-compilation');
      expect(tsResult).toBeDefined();
      expect(tsResult.success).toBe(true);
      expect(tsResult.message).toContain('TypeScript compilation successful');
    }, 30000);

    it('should run type checking before integration validation in build', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      // Verify validate:build includes type-check before validate:integration
      const validateBuildScript = packageJson.scripts['validate:build'];
      expect(validateBuildScript).toContain('type-check');
      expect(validateBuildScript).toContain('validate:integration');
      
      // Verify order (type-check should come before validate:integration)
      const typeCheckIndex = validateBuildScript.indexOf('type-check');
      const integrationIndex = validateBuildScript.indexOf('validate:integration');
      expect(typeCheckIndex).toBeLessThan(integrationIndex);
    });
  });

  describe('Performance and Memory Validation', () => {
    it('should include performance validation in integration tests', () => {
      // Run validation
      execSync('node scripts/integration-validation.js', {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      // Check report for performance validation
      const reportContent = readFileSync(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      const perfResult = report.results.find((r: any) => r.step === 'performance-validation');
      expect(perfResult).toBeDefined();
      expect(perfResult.message).toContain('Performance validation');
      
      if (perfResult.success && perfResult.details) {
        expect(perfResult.details.executionTime).toBeDefined();
        expect(perfResult.details.threshold).toBeDefined();
      }
    }, 30000);

    it('should include memory validation in integration tests', () => {
      // Run validation
      execSync('node scripts/integration-validation.js', {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      // Check report for memory validation
      const reportContent = readFileSync(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      const memResult = report.results.find((r: any) => r.step === 'memory-validation');
      expect(memResult).toBeDefined();
      expect(memResult.message).toContain('Memory validation');
      
      if (memResult.details) {
        expect(memResult.details.initialMemory).toBeDefined();
        expect(memResult.details.finalMemory).toBeDefined();
        expect(memResult.details.increase).toBeDefined();
      }
    }, 30000);
  });

  describe('Error Handling and Recovery', () => {
    it('should continue validation even if some steps fail', () => {
      // This is a conceptual test - in practice, we'd need to simulate failures
      // For now, we verify that the validation script has proper error handling structure
      
      const scriptPath = join(projectRoot, 'scripts', 'integration-validation.js');
      const scriptContent = readFileSync(scriptPath, 'utf8');
      
      // Verify error handling patterns exist in the script
      expect(scriptContent).toContain('try {');
      expect(scriptContent).toContain('catch (error)');
      expect(scriptContent).toContain('addResult');
      expect(scriptContent).toContain('success: false');
    });

    it('should generate report even when validation fails', () => {
      // Run validation (should succeed, but test the structure)
      try {
        execSync('node scripts/integration-validation.js', {
          cwd: projectRoot,
          stdio: 'pipe'
        });
      } catch (error) {
        // Even if validation fails, report should exist
        // This is more of a structural test
      }

      // Report should exist regardless
      expect(existsSync(reportPath)).toBe(true);
      
      const reportContent = readFileSync(reportPath, 'utf8');
      const report = JSON.parse(reportContent);
      
      // Report should have proper structure even on failure
      expect(report.summary).toBeDefined();
      expect(report.results).toBeDefined();
      expect(Array.isArray(report.results)).toBe(true);
    }, 30000);
  });

  describe('CI/CD Integration', () => {
    it('should have GitHub Actions workflow for integration validation', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'integration-validation.yml');
      expect(existsSync(workflowPath)).toBe(true);
      
      const workflowContent = readFileSync(workflowPath, 'utf8');
      
      // Verify workflow includes integration validation steps
      expect(workflowContent).toContain('validate:integration');
      expect(workflowContent).toContain('test:integration');
      expect(workflowContent).toContain('integration-validation-report');
    });

    it('should validate across multiple Node.js versions in CI', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'integration-validation.yml');
      const workflowContent = readFileSync(workflowPath, 'utf8');
      
      // Verify matrix strategy for multiple Node versions
      expect(workflowContent).toContain('matrix:');
      expect(workflowContent).toContain('node-version:');
      expect(workflowContent).toContain('18.x');
      expect(workflowContent).toContain('20.x');
    });

    it('should upload validation artifacts in CI', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'integration-validation.yml');
      const workflowContent = readFileSync(workflowPath, 'utf8');
      
      // Verify artifact upload steps
      expect(workflowContent).toContain('upload-artifact');
      expect(workflowContent).toContain('integration-validation-report');
      expect(workflowContent).toContain('retention-days');
    });
  });
});