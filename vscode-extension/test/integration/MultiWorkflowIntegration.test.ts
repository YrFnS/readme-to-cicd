/**
 * Multi-Workflow Integration Tests
 * 
 * Integration tests for multi-workflow generation and template management.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as path from 'path';
import { MultiWorkflowCoordinator } from '../../src/core/MultiWorkflowCoordinator';
import { TemplateManager, WorkflowTemplate } from '../../src/core/TemplateManager';
import { CLIIntegration } from '../../src/core/CLIIntegration';
import { FileSystemManager } from '../../src/core/FileSystemManager';
import { SettingsManager } from '../../src/core/SettingsManager';
import { WorkflowType, ExtensionConfiguration } from '../../src/core/types';

suite('Multi-Workflow Integration Tests', () => {
  let coordinator: MultiWorkflowCoordinator;
  let templateManager: TemplateManager;
  let mockContext: vscode.ExtensionContext;
  let mockCLIIntegration: sinon.SinonStubbedInstance<CLIIntegration>;
  let mockFileSystemManager: sinon.SinonStubbedInstance<FileSystemManager>;
  let mockSettingsManager: sinon.SinonStubbedInstance<SettingsManager>;
  let mockConfiguration: ExtensionConfiguration;

  setup(async () => {
    mockContext = {
      subscriptions: [],
      workspaceState: {} as any,
      globalState: {} as any,
      extensionPath: '/test/extension',
      globalStorageUri: vscode.Uri.file('/test/global')
    } as vscode.ExtensionContext;

    mockConfiguration = {
      defaultOutputDirectory: '.github/workflows',
      enableAutoGeneration: false,
      preferredWorkflowTypes: ['ci', 'cd'],
      customTemplates: [],
      gitIntegration: {
        autoCommit: false,
        commitMessage: 'Update workflows',
        createPR: false
      },
      showPreviewByDefault: true,
      enableInlineValidation: true,
      notificationLevel: 'all'
    };

    // Create real template manager
    templateManager = new TemplateManager(mockContext, mockConfiguration);

    // Mock other dependencies
    mockCLIIntegration = sinon.createStubInstance(CLIIntegration);
    mockFileSystemManager = sinon.createStubInstance(FileSystemManager);
    mockSettingsManager = sinon.createStubInstance(SettingsManager);

    coordinator = new MultiWorkflowCoordinator(
      mockContext,
      templateManager,
      mockCLIIntegration as any,
      mockFileSystemManager as any,
      mockSettingsManager as any
    );

    // Setup test templates
    await setupTestTemplates();
  });

  teardown(() => {
    sinon.restore();
  });

  async function setupTestTemplates(): Promise<void> {
    // Create test templates
    const ciTemplate: WorkflowTemplate = {
      id: 'test-ci-template',
      name: 'Test CI Template',
      description: 'Test CI workflow template',
      type: 'ci',
      category: 'built-in',
      version: '1.0.0',
      tags: ['ci', 'test'],
      frameworks: ['nodejs'],
      content: `
name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: {{nodeVersion}}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
`,
      variables: [
        {
          name: 'nodeVersion',
          description: 'Node.js version',
          type: 'string',
          required: true,
          defaultValue: '18'
        }
      ],
      dependencies: ['actions/checkout', 'actions/setup-node'],
      metadata: {
        created: new Date(),
        modified: new Date(),
        usage: 0,
        compatibility: ['nodejs'],
        requirements: ['package.json'],
        examples: []
      }
    };

    const cdTemplate: WorkflowTemplate = {
      id: 'test-cd-template',
      name: 'Test CD Template',
      description: 'Test CD workflow template',
      type: 'cd',
      category: 'built-in',
      version: '1.0.0',
      tags: ['cd', 'deployment'],
      frameworks: ['nodejs', 'docker'],
      content: `
name: CD
on:
  workflow_run:
    workflows: ["CI"]
    types:
      - completed
    branches: [ main ]

env:
  NODE_VERSION: {{nodeVersion}}
  REGISTRY: {{registry}}

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: \${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: \${{ env.NODE_VERSION }}
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to staging
        run: npm run deploy:staging
        env:
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}
`,
      variables: [
        {
          name: 'nodeVersion',
          description: 'Node.js version',
          type: 'string',
          required: true,
          defaultValue: '18'
        },
        {
          name: 'registry',
          description: 'Container registry',
          type: 'string',
          required: false,
          defaultValue: 'ghcr.io'
        }
      ],
      dependencies: ['actions/checkout', 'actions/setup-node'],
      metadata: {
        created: new Date(),
        modified: new Date(),
        usage: 0,
        compatibility: ['nodejs', 'docker'],
        requirements: ['package.json'],
        examples: []
      }
    };

    const securityTemplate: WorkflowTemplate = {
      id: 'test-security-template',
      name: 'Test Security Template',
      description: 'Test security workflow template',
      type: 'security',
      category: 'built-in',
      version: '1.0.0',
      tags: ['security', 'scanning'],
      frameworks: [],
      content: `
name: Security Scan
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Run security audit
        run: npm audit --audit-level high
      
      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript
`,
      variables: [],
      dependencies: ['actions/checkout', 'github/codeql-action/analyze'],
      metadata: {
        created: new Date(),
        modified: new Date(),
        usage: 0,
        compatibility: [],
        requirements: [],
        examples: []
      }
    };

    // Add templates to template manager
    (templateManager as any).templates.set('test-ci-template', ciTemplate);
    (templateManager as any).templates.set('test-cd-template', cdTemplate);
    (templateManager as any).templates.set('test-security-template', securityTemplate);
  }

  suite('End-to-End Multi-Workflow Generation', () => {
    test('should generate coordinated CI/CD workflows', async () => {
      // Arrange
      const workflowTypes: WorkflowType[] = ['ci', 'cd'];
      const readmePath = '/test/project/README.md';
      const outputDirectory = '.github/workflows';

      // Mock CLI integration response
      mockCLIIntegration.parseReadme.resolves({
        success: true,
        stdout: JSON.stringify({
          frameworks: [
            { name: 'nodejs', version: '18', confidence: 0.9, type: 'runtime' },
            { name: 'npm', confidence: 0.8, type: 'package-manager' }
          ],
          projectType: 'web-application',
          hasTests: true,
          hasDocumentation: true
        }),
        stderr: '',
        exitCode: 0,
        executionTime: 150,
        command: 'parse-readme'
      });

      // Mock file system operations
      mockFileSystemManager.listWorkflowFiles.resolves([]);
      mockFileSystemManager.writeWorkflowFile.resolves();

      // Act
      const result = await coordinator.generateCoordinatedWorkflows(
        workflowTypes,
        readmePath,
        outputDirectory
      );

      // Assert
      assert.strictEqual(result.success, true, `Generation failed: ${result.errors.join(', ')}`);
      assert.strictEqual(result.workflows.length, 2);
      
      // Check CI workflow
      const ciWorkflow = result.workflows.find(w => w.type === 'ci');
      assert.ok(ciWorkflow, 'CI workflow not found');
      assert.ok(ciWorkflow.content.includes('name: CI'));
      assert.ok(ciWorkflow.content.includes('actions/checkout@v3'));
      assert.ok(ciWorkflow.content.includes('actions/setup-node@v3'));
      
      // Check CD workflow
      const cdWorkflow = result.workflows.find(w => w.type === 'cd');
      assert.ok(cdWorkflow, 'CD workflow not found');
      assert.ok(cdWorkflow.content.includes('name: CD'));
      assert.ok(cdWorkflow.content.includes('workflow_run'));
      assert.ok(cdWorkflow.dependencies.includes('CI'));
      
      // Check coordination
      assert.ok(result.coordination.dependencies.length > 0);
      const cdDependency = result.coordination.dependencies.find(d => d.workflow === 'CD');
      assert.ok(cdDependency);
      assert.ok(cdDependency.dependsOn.includes('CI'));
    });

    test('should generate workflows with shared secrets and variables', async () => {
      // Arrange
      const workflowTypes: WorkflowType[] = ['ci', 'cd'];
      const readmePath = '/test/project/README.md';
      const outputDirectory = '.github/workflows';

      mockCLIIntegration.parseReadme.resolves({
        success: true,
        stdout: JSON.stringify({
          frameworks: [{ name: 'nodejs', version: '18', confidence: 0.9 }]
        }),
        stderr: '',
        exitCode: 0,
        executionTime: 100,
        command: 'parse-readme'
      });

      mockFileSystemManager.listWorkflowFiles.resolves([]);
      mockFileSystemManager.writeWorkflowFile.resolves();

      // Act
      const result = await coordinator.generateCoordinatedWorkflows(
        workflowTypes,
        readmePath,
        outputDirectory,
        {
          coordination: {
            sharedSecrets: ['DEPLOY_TOKEN', 'NPM_TOKEN'],
            sharedVariables: { nodeVersion: '18', registry: 'ghcr.io' },
            dependencies: [],
            executionOrder: [],
            conflictResolution: 'merge'
          }
        }
      );

      // Assert
      assert.strictEqual(result.success, true);
      
      // Check shared secrets
      result.workflows.forEach(workflow => {
        assert.ok(workflow.sharedSecrets.includes('DEPLOY_TOKEN'));
        assert.ok(workflow.sharedSecrets.includes('NPM_TOKEN'));
      });

      // Check shared variables
      result.workflows.forEach(workflow => {
        assert.strictEqual(workflow.sharedVariables.nodeVersion, '18');
        assert.strictEqual(workflow.sharedVariables.registry, 'ghcr.io');
      });
    });

    test('should handle complex multi-workflow scenario', async () => {
      // Arrange
      const workflowTypes: WorkflowType[] = ['ci', 'cd', 'security'];
      const readmePath = '/test/complex-project/README.md';
      const outputDirectory = '.github/workflows';

      mockCLIIntegration.parseReadme.resolves({
        success: true,
        stdout: JSON.stringify({
          frameworks: [
            { name: 'nodejs', version: '18', confidence: 0.9 },
            { name: 'docker', confidence: 0.8 },
            { name: 'typescript', confidence: 0.7 }
          ],
          projectType: 'microservice',
          hasTests: true,
          hasDocumentation: true,
          complexity: 'complex'
        }),
        stderr: '',
        exitCode: 0,
        executionTime: 200,
        command: 'parse-readme'
      });

      mockFileSystemManager.listWorkflowFiles.resolves([]);
      mockFileSystemManager.writeWorkflowFile.resolves();

      // Act
      const result = await coordinator.generateCoordinatedWorkflows(
        workflowTypes,
        readmePath,
        outputDirectory
      );

      // Assert
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.workflows.length, 3);
      
      // Check execution order (CI should run first, then security, then CD)
      const executionOrder = result.coordination.executionOrder;
      assert.ok(executionOrder.includes('ci'));
      assert.ok(executionOrder.includes('cd'));
      assert.ok(executionOrder.includes('security'));
      
      // CI should come before CD
      const ciIndex = executionOrder.indexOf('ci');
      const cdIndex = executionOrder.indexOf('cd');
      assert.ok(ciIndex < cdIndex, 'CI should run before CD');
    });
  });

  suite('Template Customization Integration', () => {
    test('should apply and preserve template customizations', async () => {
      // Arrange
      const workflowPath = '/test/.github/workflows/ci.yml';
      const existingContent = `
# Template ID: test-ci-template
name: CI
on: [push]
env:
  CUSTOM_VAR: custom_value
  NODE_VERSION: 16
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Custom steps start
      - name: Custom step
        run: echo "Custom logic"
      # Custom steps end
      - name: Run tests
        run: npm test
`;

      const customizations = {
        env: 'CUSTOM_VAR: updated_value\nNEW_VAR: new_value',
        customSteps: '- name: Updated custom step\n  run: echo "Updated logic"'
      };

      mockFileSystemManager.readWorkflowFile.resolves(existingContent);
      mockFileSystemManager.writeWorkflowFile.resolves();

      // Act
      const result = await coordinator.manageTemplateCustomizations(
        workflowPath,
        customizations,
        ['env', 'customSteps']
      );

      // Assert
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.templateId, 'test-ci-template');
      assert.ok(result.customizations.env);
      assert.ok(result.customizations.customSteps);
      assert.ok(result.preservedSections.includes('env'));
      assert.ok(result.preservedSections.includes('customSteps'));
    });

    test('should update workflows while preserving customizations', async () => {
      // Arrange
      const workflowPaths = ['/test/.github/workflows/ci.yml'];
      const strategy = {
        preserveCustomizations: true,
        backupExisting: true,
        mergeStrategy: 'merge' as const,
        customSections: ['env', 'customSteps']
      };

      const existingContent = `
# Template ID: test-ci-template
name: CI
on: [push]
env:
  CUSTOM_VAR: preserved_value
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
`;

      mockFileSystemManager.readWorkflowFile.resolves(existingContent);
      mockFileSystemManager.writeWorkflowFile.resolves();

      // Act
      const result = await coordinator.updateWorkflowsWithStrategy(
        workflowPaths,
        strategy
      );

      // Assert
      assert.strictEqual(result.updated.length, 1);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.backups.length > 0);
      
      // Verify backup was created
      const updateResult = result.updated[0];
      assert.ok(updateResult.backupPath);
      assert.ok(updateResult.backupPath.includes('.backup.'));
    });
  });

  suite('Template Management Integration', () => {
    test('should create and use custom template in multi-workflow generation', async () => {
      // Arrange
      const customWorkflowContent = `
name: Custom {{workflowType}}
on:
  push:
    branches: [ {{branch}} ]

jobs:
  custom-job:
    runs-on: {{runner}}
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Custom step
        run: echo "Custom workflow for {{framework}}"
`;

      // Create custom template
      const customTemplate = await templateManager.createCustomTemplate(
        'Custom CI Template',
        'Custom CI workflow for testing',
        customWorkflowContent,
        'ci',
        ['nodejs'],
        ['custom', 'test']
      );

      // Add to coordinator's template manager
      (templateManager as any).templates.set(customTemplate.id, customTemplate);

      const workflowTypes: WorkflowType[] = ['ci'];
      const readmePath = '/test/project/README.md';
      const outputDirectory = '.github/workflows';

      mockCLIIntegration.parseReadme.resolves({
        success: true,
        stdout: JSON.stringify({
          frameworks: [{ name: 'nodejs', confidence: 0.9 }]
        }),
        stderr: '',
        exitCode: 0,
        executionTime: 100,
        command: 'parse-readme'
      });

      mockFileSystemManager.listWorkflowFiles.resolves([]);
      mockFileSystemManager.writeWorkflowFile.resolves();

      // Override template selection to use custom template
      const originalSelectOptimalTemplate = (coordinator as any).selectOptimalTemplate;
      (coordinator as any).selectOptimalTemplate = async () => customTemplate.id;

      // Act
      const result = await coordinator.generateCoordinatedWorkflows(
        workflowTypes,
        readmePath,
        outputDirectory
      );

      // Restore original method
      (coordinator as any).selectOptimalTemplate = originalSelectOptimalTemplate;

      // Assert
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.workflows.length, 1);
      
      const workflow = result.workflows[0];
      assert.strictEqual(workflow.templateId, customTemplate.id);
      assert.ok(workflow.content.includes('Custom CI'));
      assert.ok(workflow.content.includes('Custom step'));
    });

    test('should validate templates before using in generation', async () => {
      // Arrange
      const invalidTemplate = {
        id: 'invalid-template',
        name: 'Invalid Template',
        description: 'Template with invalid content',
        type: 'ci',
        category: 'custom',
        version: '1.0.0',
        tags: [],
        frameworks: [],
        content: 'invalid yaml content [', // Invalid YAML
        variables: [],
        dependencies: [],
        metadata: {
          created: new Date(),
          modified: new Date(),
          usage: 0,
          compatibility: [],
          requirements: [],
          examples: []
        }
      } as WorkflowTemplate;

      // Act
      const validation = templateManager.validateTemplate(invalidTemplate);

      // Assert
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.length > 0);
      assert.ok(validation.errors.some(e => e.includes('Invalid YAML structure')));
    });
  });

  suite('Error Handling and Recovery', () => {
    test('should handle CLI integration failures gracefully', async () => {
      // Arrange
      const workflowTypes: WorkflowType[] = ['ci'];
      const readmePath = '/test/project/README.md';
      const outputDirectory = '.github/workflows';

      mockCLIIntegration.parseReadme.rejects(new Error('CLI execution failed'));

      // Act
      const result = await coordinator.generateCoordinatedWorkflows(
        workflowTypes,
        readmePath,
        outputDirectory
      );

      // Assert
      assert.strictEqual(result.success, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0].includes('CLI execution failed'));
    });

    test('should handle file system errors during workflow writing', async () => {
      // Arrange
      const workflowTypes: WorkflowType[] = ['ci'];
      const readmePath = '/test/project/README.md';
      const outputDirectory = '.github/workflows';

      mockCLIIntegration.parseReadme.resolves({
        success: true,
        stdout: JSON.stringify({ frameworks: [] }),
        stderr: '',
        exitCode: 0,
        executionTime: 100,
        command: 'parse-readme'
      });

      mockFileSystemManager.listWorkflowFiles.resolves([]);
      mockFileSystemManager.writeWorkflowFile.rejects(new Error('Permission denied'));

      // Act
      const result = await coordinator.generateCoordinatedWorkflows(
        workflowTypes,
        readmePath,
        outputDirectory
      );

      // Assert
      assert.strictEqual(result.success, false);
      assert.ok(result.errors.length > 0);
    });

    test('should handle template not found errors', async () => {
      // Arrange
      const workflowTypes: WorkflowType[] = ['maintenance']; // No template for this type
      const readmePath = '/test/project/README.md';
      const outputDirectory = '.github/workflows';

      mockCLIIntegration.parseReadme.resolves({
        success: true,
        stdout: JSON.stringify({ frameworks: [] }),
        stderr: '',
        exitCode: 0,
        executionTime: 100,
        command: 'parse-readme'
      });

      mockFileSystemManager.listWorkflowFiles.resolves([]);

      // Act
      const result = await coordinator.generateCoordinatedWorkflows(
        workflowTypes,
        readmePath,
        outputDirectory
      );

      // Assert
      assert.strictEqual(result.success, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some(e => e.includes('No templates found')));
    });
  });

  suite('Performance and Progress Reporting', () => {
    test('should report progress during multi-workflow generation', async () => {
      // Arrange
      const workflowTypes: WorkflowType[] = ['ci', 'cd'];
      const readmePath = '/test/project/README.md';
      const outputDirectory = '.github/workflows';
      const progressReports: Array<{ progress: number; message: string }> = [];

      mockCLIIntegration.parseReadme.resolves({
        success: true,
        stdout: JSON.stringify({ frameworks: [{ name: 'nodejs', confidence: 0.9 }] }),
        stderr: '',
        exitCode: 0,
        executionTime: 100,
        command: 'parse-readme'
      });

      mockFileSystemManager.listWorkflowFiles.resolves([]);
      mockFileSystemManager.writeWorkflowFile.resolves();

      // Act
      await coordinator.generateCoordinatedWorkflows(
        workflowTypes,
        readmePath,
        outputDirectory,
        undefined,
        (progress, message) => {
          progressReports.push({ progress, message });
        }
      );

      // Assert
      assert.ok(progressReports.length > 0);
      assert.ok(progressReports.some(r => r.progress === 10)); // Planning phase
      assert.ok(progressReports.some(r => r.progress === 100)); // Completion
      assert.ok(progressReports.some(r => r.message.includes('Planning')));
      assert.ok(progressReports.some(r => r.message.includes('complete')));
    });

    test('should estimate generation duration accurately', async () => {
      // Arrange
      const workflowTypes: WorkflowType[] = ['ci', 'cd', 'security'];
      const readmePath = '/test/project/README.md';
      const outputDirectory = '.github/workflows';

      mockCLIIntegration.parseReadme.resolves({
        success: true,
        stdout: JSON.stringify({
          frameworks: [
            { name: 'nodejs', confidence: 0.9 },
            { name: 'docker', confidence: 0.8 }
          ]
        }),
        stderr: '',
        exitCode: 0,
        executionTime: 100,
        command: 'parse-readme'
      });

      mockFileSystemManager.listWorkflowFiles.resolves([]);

      // Act
      const plan = await coordinator.planMultiWorkflowGeneration(
        workflowTypes,
        readmePath,
        outputDirectory
      );

      // Assert
      assert.ok(plan.estimatedDuration > 0);
      assert.ok(plan.estimatedDuration < 300); // Should be reasonable (< 5 minutes)
      
      // More workflows should take longer
      assert.ok(plan.estimatedDuration > 30); // Base time for multiple workflows
    });
  });
});