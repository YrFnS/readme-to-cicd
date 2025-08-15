/**
 * Workflow Validator Tests
 * 
 * Comprehensive test suite for the WorkflowValidator class,
 * covering validation scenarios with various workflow configurations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  WorkflowValidator,
  WorkflowValidationResult,
  ValidationReport,
  WorkflowUpdateResult
} from '../../../src/cli/lib/workflow-validator';

describe('WorkflowValidator', () => {
  let validator: WorkflowValidator;
  let tempDir: string;
  let workflowsDir: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-validator-test-'));
    workflowsDir = path.join(tempDir, '.github', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    
    validator = new WorkflowValidator(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateWorkflow', () => {
    it('should validate a basic valid workflow', async () => {
      const validWorkflow = `
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Run tests
        run: npm test
`;

      const workflowPath = path.join(workflowsDir, 'ci.yml');
      fs.writeFileSync(workflowPath, validWorkflow);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(true);
      expect(result.workflowName).toBe('CI');
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.jobCount).toBe(1);
      expect(result.metadata.actionCount).toBe(1);
    });

    it('should detect YAML syntax errors', async () => {
      const invalidYaml = `
name: CI
on: [push, pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
`;

      const workflowPath = path.join(workflowsDir, 'invalid.yml');
      fs.writeFileSync(workflowPath, invalidYaml);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('YAML_SYNTAX_ERROR');
      expect(result.errors[0].category).toBe('syntax');
    });

    it('should detect missing required fields', async () => {
      const missingFields = `
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
`;

      const workflowPath = path.join(workflowsDir, 'missing-trigger.yml');
      fs.writeFileSync(workflowPath, missingFields);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_TRIGGER')).toBe(true);
    });

    it('should detect missing jobs', async () => {
      const noJobs = `
name: CI
on: [push]
`;

      const workflowPath = path.join(workflowsDir, 'no-jobs.yml');
      fs.writeFileSync(workflowPath, noJobs);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_JOBS')).toBe(true);
    });

    it('should detect missing runs-on in jobs', async () => {
      const missingRunsOn = `
name: CI
on: [push]
jobs:
  test:
    steps:
      - name: Test
        run: echo "test"
`;

      const workflowPath = path.join(workflowsDir, 'missing-runs-on.yml');
      fs.writeFileSync(workflowPath, missingRunsOn);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_RUNS_ON')).toBe(true);
    });

    it('should detect missing steps in jobs', async () => {
      const missingSteps = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
`;

      const workflowPath = path.join(workflowsDir, 'missing-steps.yml');
      fs.writeFileSync(workflowPath, missingSteps);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_STEPS')).toBe(true);
    });

    it('should detect invalid steps without uses or run', async () => {
      const invalidStep = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Invalid step
`;

      const workflowPath = path.join(workflowsDir, 'invalid-step.yml');
      fs.writeFileSync(workflowPath, invalidStep);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_STEP')).toBe(true);
    });

    it('should warn about deprecated actions', async () => {
      const deprecatedAction = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v1
`;

      const workflowPath = path.join(workflowsDir, 'deprecated.yml');
      fs.writeFileSync(workflowPath, deprecatedAction);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.warnings.some(w => w.code === 'DEPRECATED_ACTION')).toBe(true);
    });

    it('should warn about unpinned action versions', async () => {
      const unpinnedAction = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@main
`;

      const workflowPath = path.join(workflowsDir, 'unpinned.yml');
      fs.writeFileSync(workflowPath, unpinnedAction);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.warnings.some(w => w.code === 'UNPINNED_ACTION_VERSION')).toBe(true);
    });

    it('should warn about missing step names', async () => {
      const missingStepName = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const workflowPath = path.join(workflowsDir, 'missing-step-name.yml');
      fs.writeFileSync(workflowPath, missingStepName);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.warnings.some(w => w.code === 'MISSING_STEP_NAME')).toBe(true);
    });

    it('should suggest adding concurrency control', async () => {
      const longRunningWorkflow = `
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build
`;

      const workflowPath = path.join(workflowsDir, 'long-running.yml');
      fs.writeFileSync(workflowPath, longRunningWorkflow);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.suggestions.some(s => s.id === 'add-concurrency-control')).toBe(true);
    });

    it('should suggest adding permissions', async () => {
      const noPermissions = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const workflowPath = path.join(workflowsDir, 'no-permissions.yml');
      fs.writeFileSync(workflowPath, noPermissions);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.suggestions.some(s => s.id === 'add-permissions')).toBe(true);
    });

    it('should suggest adding caching', async () => {
      const noCaching = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
`;

      const workflowPath = path.join(workflowsDir, 'no-caching.yml');
      fs.writeFileSync(workflowPath, noCaching);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.suggestions.some(s => s.id === 'add-caching')).toBe(true);
    });

    it('should detect security issues with hardcoded secrets', async () => {
      const hardcodedSecret = `
name: CI
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: echo "API_KEY=sk-1234567890abcdef" >> $GITHUB_ENV
`;

      const workflowPath = path.join(workflowsDir, 'hardcoded-secret.yml');
      fs.writeFileSync(workflowPath, hardcodedSecret);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.errors.some(e => e.code === 'HARDCODED_SECRET')).toBe(true);
    });

    it('should warn about pull_request_target risks', async () => {
      const pullRequestTarget = `
name: CI
on: [pull_request_target]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const workflowPath = path.join(workflowsDir, 'pr-target.yml');
      fs.writeFileSync(workflowPath, pullRequestTarget);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.warnings.some(w => w.code === 'PULL_REQUEST_TARGET_RISK')).toBe(true);
    });

    it('should detect script injection vulnerabilities', async () => {
      const scriptInjection = `name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: 'echo "Title: \${{ github.event.pull_request.title }}"'
`;

      const workflowPath = path.join(workflowsDir, 'script-injection.yml');
      fs.writeFileSync(workflowPath, scriptInjection);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.errors.some(e => e.code === 'SCRIPT_INJECTION_RISK')).toBe(true);
    });

    it('should handle non-existent files gracefully', async () => {
      const nonExistentPath = path.join(workflowsDir, 'does-not-exist.yml');

      const result = await validator.validateWorkflow(nonExistentPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
    });

    it('should calculate workflow complexity correctly', async () => {
      const complexWorkflow = `
name: Complex CI
on: [push, pull_request, schedule]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run lint
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [14, 16, 18]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: \${{ matrix.node }}
      - run: npm install
      - run: npm test
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - run: npm run deploy
`;

      const workflowPath = path.join(workflowsDir, 'complex.yml');
      fs.writeFileSync(workflowPath, complexWorkflow);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.metadata.workflowComplexity).toBe('high');
      expect(result.metadata.jobCount).toBe(4);
      expect(result.metadata.actionCount).toBe(5);
      expect(result.metadata.triggerCount).toBe(3);
    });
  });

  describe('validateWorkflows', () => {
    it('should validate multiple workflow files', async () => {
      const workflow1 = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const workflow2 = `
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run deploy
`;

      const path1 = path.join(workflowsDir, 'ci.yml');
      const path2 = path.join(workflowsDir, 'deploy.yml');
      fs.writeFileSync(path1, workflow1);
      fs.writeFileSync(path2, workflow2);

      const report = await validator.validateWorkflows([path1, path2]);

      expect(report.totalFiles).toBe(2);
      expect(report.validFiles).toBe(2);
      expect(report.invalidFiles).toBe(0);
      expect(report.results).toHaveLength(2);
    });

    it('should handle mixed valid and invalid workflows', async () => {
      const validWorkflow = `
name: Valid
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const invalidWorkflow = `
name: Invalid
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
`;

      const validPath = path.join(workflowsDir, 'valid.yml');
      const invalidPath = path.join(workflowsDir, 'invalid.yml');
      fs.writeFileSync(validPath, validWorkflow);
      fs.writeFileSync(invalidPath, invalidWorkflow);

      const report = await validator.validateWorkflows([validPath, invalidPath]);

      expect(report.totalFiles).toBe(2);
      expect(report.validFiles).toBe(1);
      expect(report.invalidFiles).toBe(1);
      expect(report.summary.overallValid).toBe(false);
    });
  });

  describe('validateAllWorkflows', () => {
    it('should validate all workflows in .github/workflows directory', async () => {
      const workflow1 = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const workflow2 = `
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run deploy
`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), workflow1);
      fs.writeFileSync(path.join(workflowsDir, 'deploy.yaml'), workflow2);

      const report = await validator.validateAllWorkflows();

      expect(report.totalFiles).toBe(2);
      expect(report.results).toHaveLength(2);
    });

    it('should handle missing .github/workflows directory', async () => {
      // Remove the workflows directory
      fs.rmSync(workflowsDir, { recursive: true, force: true });

      const report = await validator.validateAllWorkflows();

      expect(report.totalFiles).toBe(0);
      expect(report.validFiles).toBe(0);
      expect(report.invalidFiles).toBe(0);
      expect(report.recommendations).toContain('No .github/workflows directory found. Consider adding CI/CD workflows.');
    });

    it('should only process .yml and .yaml files', async () => {
      const workflow = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), workflow);
      fs.writeFileSync(path.join(workflowsDir, 'deploy.yaml'), workflow);
      fs.writeFileSync(path.join(workflowsDir, 'readme.md'), '# README');
      fs.writeFileSync(path.join(workflowsDir, 'config.json'), '{}');

      const report = await validator.validateAllWorkflows();

      expect(report.totalFiles).toBe(2);
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow with improvements', async () => {
      const originalWorkflow = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const workflowPath = path.join(workflowsDir, 'update-test.yml');
      fs.writeFileSync(workflowPath, originalWorkflow);

      const improvements = [
        {
          id: 'add-concurrency-control',
          title: 'Add concurrency control',
          description: 'Prevent multiple workflow runs from interfering',
          impact: 'medium' as const,
          effort: 'low' as const,
          category: 'reliability' as const
        }
      ];

      const result = await validator.updateWorkflow(workflowPath, improvements);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('modify');
      expect(result.backupPath).toBeDefined();
      expect(fs.existsSync(result.backupPath!)).toBe(true);
    });

    it('should handle non-existent files', async () => {
      const nonExistentPath = path.join(workflowsDir, 'does-not-exist.yml');

      const result = await validator.updateWorkflow(nonExistentPath, []);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
    });

    it('should generate diff for changes', async () => {
      const originalWorkflow = `name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test`;

      const workflowPath = path.join(workflowsDir, 'diff-test.yml');
      fs.writeFileSync(workflowPath, originalWorkflow);

      const improvements = [
        {
          id: 'add-permissions',
          title: 'Add permissions',
          description: 'Add explicit permissions',
          impact: 'high' as const,
          effort: 'low' as const,
          category: 'security' as const
        }
      ];

      const result = await validator.updateWorkflow(workflowPath, improvements);

      expect(result.success).toBe(true);
      expect(result.diff).toBeTruthy();
      expect(result.diff).toContain('permissions:');
    });
  });

  describe('validation report generation', () => {
    it('should generate comprehensive validation report', async () => {
      const validWorkflow = `
name: Valid
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const invalidWorkflow = `
name: Invalid
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
`;

      const securityIssueWorkflow = `
name: Security Issue
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: echo "SECRET=abc123" >> $GITHUB_ENV
`;

      fs.writeFileSync(path.join(workflowsDir, 'valid.yml'), validWorkflow);
      fs.writeFileSync(path.join(workflowsDir, 'invalid.yml'), invalidWorkflow);
      fs.writeFileSync(path.join(workflowsDir, 'security.yml'), securityIssueWorkflow);

      const report = await validator.validateAllWorkflows();

      expect(report.summary.overallValid).toBe(false);
      expect(report.summary.totalErrors).toBeGreaterThan(0);
      expect(report.summary.securityIssues).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('security') || r.includes('repository'))).toBe(true);
    });

    it('should provide recommendations based on findings', async () => {
      const workflowWithIssues = `
name: Issues
on: [pull_request_target]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - run: npm install
      - run: npm test
`;

      fs.writeFileSync(path.join(workflowsDir, 'issues.yml'), workflowWithIssues);

      const report = await validator.validateAllWorkflows();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('deprecated'))).toBe(true);
    });

    it('should handle empty workflows directory gracefully', async () => {
      // Remove the workflows directory to test missing directory case
      fs.rmSync(path.join(tempDir, '.github'), { recursive: true, force: true });
      
      const report = await validator.validateAllWorkflows();

      expect(report.totalFiles).toBe(0);
      expect(report.summary.overallValid).toBe(true);
      expect(report.recommendations).toContain('No .github/workflows directory found. Consider adding CI/CD workflows.');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed YAML gracefully', async () => {
      const malformedYaml = `
name: Malformed
on: [push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const workflowPath = path.join(workflowsDir, 'malformed.yml');
      fs.writeFileSync(workflowPath, malformedYaml);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('YAML_SYNTAX_ERROR');
      expect(result.errors[0].severity).toBe('error');
    });

    it('should handle empty workflow files', async () => {
      const emptyWorkflow = '';

      const workflowPath = path.join(workflowsDir, 'empty.yml');
      fs.writeFileSync(workflowPath, emptyWorkflow);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_TRIGGER')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_JOBS')).toBe(true);
    });

    it('should handle workflows with only comments', async () => {
      const commentOnlyWorkflow = `
# This is a comment
# Another comment
`;

      const workflowPath = path.join(workflowsDir, 'comments-only.yml');
      fs.writeFileSync(workflowPath, commentOnlyWorkflow);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
    });

    it('should handle very large workflow files', async () => {
      let largeWorkflow = `
name: Large Workflow
on: [push]
jobs:
`;

      // Generate a workflow with many jobs
      for (let i = 0; i < 50; i++) {
        largeWorkflow += `
  job${i}:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: echo "Job ${i}"
`;
      }

      const workflowPath = path.join(workflowsDir, 'large.yml');
      fs.writeFileSync(workflowPath, largeWorkflow);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.metadata.workflowComplexity).toBe('high');
      expect(result.metadata.jobCount).toBe(50);
    });

    it('should handle file system errors gracefully', async () => {
      const workflowPath = '/invalid/path/workflow.yml';

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('performance and metadata', () => {
    it('should track validation duration', async () => {
      const workflow = `
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
`;

      const workflowPath = path.join(workflowsDir, 'timing.yml');
      fs.writeFileSync(workflowPath, workflow);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.metadata.validationDuration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.validatedAt).toBeInstanceOf(Date);
    });

    it('should calculate file metadata correctly', async () => {
      const workflow = `name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test`;

      const workflowPath = path.join(workflowsDir, 'metadata.yml');
      fs.writeFileSync(workflowPath, workflow);

      const result = await validator.validateWorkflow(workflowPath);

      expect(result.metadata.fileSize).toBeGreaterThan(0);
      expect(result.metadata.linesOfCode).toBeGreaterThan(0);
      expect(result.metadata.actionCount).toBe(1);
      expect(result.metadata.jobCount).toBe(1);
      expect(result.metadata.triggerCount).toBe(1);
    });
  });
});