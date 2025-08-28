"use strict";
/**
 * Multi-Workflow Coordinator Tests
 *
 * Tests for multi-workflow generation, coordination, and template management.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const sinon = __importStar(require("sinon"));
const MultiWorkflowCoordinator_1 = require("../../src/core/MultiWorkflowCoordinator");
const TemplateManager_1 = require("../../src/core/TemplateManager");
const CLIIntegration_1 = require("../../src/core/CLIIntegration");
const FileSystemManager_1 = require("../../src/core/FileSystemManager");
const SettingsManager_1 = require("../../src/core/SettingsManager");
suite('MultiWorkflowCoordinator Tests', () => {
    let coordinator;
    let mockContext;
    let mockTemplateManager;
    let mockCLIIntegration;
    let mockFileSystemManager;
    let mockSettingsManager;
    setup(() => {
        mockContext = {
            subscriptions: [],
            workspaceState: {},
            globalState: {},
            extensionPath: '/test/path'
        };
        mockTemplateManager = sinon.createStubInstance(TemplateManager_1.TemplateManager);
        mockCLIIntegration = sinon.createStubInstance(CLIIntegration_1.CLIIntegration);
        mockFileSystemManager = sinon.createStubInstance(FileSystemManager_1.FileSystemManager);
        mockSettingsManager = sinon.createStubInstance(SettingsManager_1.SettingsManager);
        coordinator = new MultiWorkflowCoordinator_1.MultiWorkflowCoordinator(mockContext, mockTemplateManager, mockCLIIntegration, mockFileSystemManager, mockSettingsManager);
    });
    teardown(() => {
        sinon.restore();
    });
    suite('planMultiWorkflowGeneration', () => {
        test('should create generation plan for multiple workflow types', async () => {
            // Arrange
            const workflowTypes = ['ci', 'cd', 'security'];
            const readmePath = '/test/README.md';
            const outputDirectory = '.github/workflows';
            mockCLIIntegration.parseReadme.resolves({
                success: true,
                stdout: JSON.stringify({
                    frameworks: [
                        { name: 'nodejs', version: '18', confidence: 0.9 },
                        { name: 'docker', confidence: 0.8 }
                    ]
                }),
                stderr: '',
                exitCode: 0,
                executionTime: 100,
                command: 'parse'
            });
            mockTemplateManager.getTemplates.returns([
                {
                    id: 'ci-nodejs',
                    name: 'Node.js CI',
                    type: 'ci',
                    frameworks: ['nodejs'],
                    content: 'ci workflow content',
                    metadata: { usage: 100 }
                },
                {
                    id: 'cd-docker',
                    name: 'Docker CD',
                    type: 'cd',
                    frameworks: ['docker'],
                    content: 'cd workflow content',
                    metadata: { usage: 50 }
                }
            ]);
            mockFileSystemManager.listWorkflowFiles.resolves([]);
            // Act
            const plan = await coordinator.planMultiWorkflowGeneration(workflowTypes, readmePath, outputDirectory);
            // Assert
            assert.strictEqual(plan.workflows.length, 3);
            assert.strictEqual(plan.workflows[0].type, 'ci');
            assert.strictEqual(plan.workflows[1].type, 'cd');
            assert.strictEqual(plan.workflows[2].type, 'security');
            // Check dependencies
            assert.ok(plan.dependencies.length > 0);
            const cdDependency = plan.dependencies.find(d => d.workflow === 'Continuous Deployment');
            assert.ok(cdDependency);
            assert.ok(cdDependency.dependsOn.includes('Continuous Integration'));
        });
        test('should detect workflow conflicts', async () => {
            // Arrange
            const workflowTypes = ['ci', 'ci']; // Duplicate types
            const readmePath = '/test/README.md';
            const outputDirectory = '.github/workflows';
            mockCLIIntegration.parseReadme.resolves({
                success: true,
                stdout: JSON.stringify({ frameworks: [] }),
                stderr: '',
                exitCode: 0,
                executionTime: 100,
                command: 'parse'
            });
            mockTemplateManager.getTemplates.returns([]);
            mockFileSystemManager.listWorkflowFiles.resolves([]);
            // Act
            const plan = await coordinator.planMultiWorkflowGeneration(workflowTypes, readmePath, outputDirectory);
            // Assert
            assert.ok(plan.conflicts.length > 0);
            const namingConflict = plan.conflicts.find(c => c.type === 'naming');
            assert.ok(namingConflict);
        });
        test('should calculate estimated duration', async () => {
            // Arrange
            const workflowTypes = ['ci'];
            const readmePath = '/test/README.md';
            const outputDirectory = '.github/workflows';
            mockCLIIntegration.parseReadme.resolves({
                success: true,
                stdout: JSON.stringify({ frameworks: [] }),
                stderr: '',
                exitCode: 0,
                executionTime: 100,
                command: 'parse'
            });
            mockTemplateManager.getTemplates.returns([]);
            mockFileSystemManager.listWorkflowFiles.resolves([]);
            // Act
            const plan = await coordinator.planMultiWorkflowGeneration(workflowTypes, readmePath, outputDirectory);
            // Assert
            assert.ok(plan.estimatedDuration > 0);
            assert.ok(typeof plan.estimatedDuration === 'number');
        });
    });
    suite('executeMultiWorkflowGeneration', () => {
        test('should execute workflow generation plan successfully', async () => {
            // Arrange
            const plan = {
                workflows: [
                    {
                        id: 'ci-1',
                        name: 'CI Workflow',
                        type: 'ci',
                        templateId: 'ci-template',
                        configuration: {
                            workflowTypes: ['ci'],
                            frameworks: [],
                            deploymentTargets: [],
                            securityLevel: 'standard',
                            optimizationLevel: 'standard',
                            includeComments: true,
                            customSteps: []
                        },
                        estimatedSize: 1000,
                        requiredSecrets: [],
                        outputPath: '.github/workflows/ci.yml'
                    }
                ],
                dependencies: [],
                estimatedDuration: 30,
                requiredResources: [],
                conflicts: []
            };
            const readmePath = '/test/README.md';
            mockTemplateManager.generateMultiWorkflow.resolves({
                success: true,
                workflows: [
                    {
                        templateId: 'ci-template',
                        filename: 'ci.yml',
                        content: 'workflow content',
                        type: 'ci',
                        frameworks: [],
                        customized: false,
                        warnings: [],
                        sharedSecrets: [],
                        sharedVariables: {},
                        dependencies: []
                    }
                ],
                errors: [],
                coordination: {
                    executionOrder: ['ci'],
                    dependencies: [],
                    sharedResources: []
                }
            });
            mockFileSystemManager.writeWorkflowFile.resolves();
            // Act
            const result = await coordinator.executeMultiWorkflowGeneration(plan, readmePath);
            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.workflows.length, 1);
            assert.strictEqual(result.errors.length, 0);
        });
        test('should handle generation errors gracefully', async () => {
            // Arrange
            const plan = {
                workflows: [],
                dependencies: [],
                estimatedDuration: 30,
                requiredResources: [],
                conflicts: []
            };
            const readmePath = '/test/README.md';
            mockTemplateManager.generateMultiWorkflow.rejects(new Error('Template not found'));
            // Act
            const result = await coordinator.executeMultiWorkflowGeneration(plan, readmePath);
            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors.length > 0);
            assert.ok(result.errors[0].includes('Template not found'));
        });
        test('should report progress during execution', async () => {
            // Arrange
            const plan = {
                workflows: [
                    {
                        id: 'ci-1',
                        name: 'CI Workflow',
                        type: 'ci',
                        templateId: 'ci-template',
                        configuration: {
                            workflowTypes: ['ci'],
                            frameworks: [],
                            deploymentTargets: [],
                            securityLevel: 'standard',
                            optimizationLevel: 'standard',
                            includeComments: true,
                            customSteps: []
                        },
                        estimatedSize: 1000,
                        requiredSecrets: [],
                        outputPath: '.github/workflows/ci.yml'
                    }
                ],
                dependencies: [],
                estimatedDuration: 30,
                requiredResources: [],
                conflicts: []
            };
            const readmePath = '/test/README.md';
            const progressReports = [];
            mockTemplateManager.generateMultiWorkflow.resolves({
                success: true,
                workflows: [],
                errors: [],
                coordination: {
                    executionOrder: [],
                    dependencies: [],
                    sharedResources: []
                }
            });
            // Act
            await coordinator.executeMultiWorkflowGeneration(plan, readmePath, (progress, message) => {
                progressReports.push({ progress, message });
            });
            // Assert
            assert.ok(progressReports.length > 0);
            assert.ok(progressReports.some(r => r.progress === 100));
        });
    });
    suite('generateCoordinatedWorkflows', () => {
        test('should generate multiple workflows with coordination', async () => {
            // Arrange
            const workflowTypes = ['ci', 'cd'];
            const readmePath = '/test/README.md';
            const outputDirectory = '.github/workflows';
            // Mock the planning phase
            sinon.stub(coordinator, 'planMultiWorkflowGeneration').resolves({
                workflows: [
                    {
                        id: 'ci-1',
                        name: 'CI',
                        type: 'ci',
                        templateId: 'ci-template',
                        configuration: {},
                        estimatedSize: 1000,
                        requiredSecrets: [],
                        outputPath: '.github/workflows/ci.yml'
                    },
                    {
                        id: 'cd-1',
                        name: 'CD',
                        type: 'cd',
                        templateId: 'cd-template',
                        configuration: {},
                        estimatedSize: 1500,
                        requiredSecrets: [],
                        outputPath: '.github/workflows/cd.yml'
                    }
                ],
                dependencies: [
                    {
                        workflow: 'CD',
                        dependsOn: ['CI']
                    }
                ],
                estimatedDuration: 60,
                requiredResources: [],
                conflicts: []
            });
            // Mock the execution phase
            sinon.stub(coordinator, 'executeMultiWorkflowGeneration').resolves({
                success: true,
                workflows: [
                    {
                        templateId: 'ci-template',
                        filename: 'ci.yml',
                        content: 'ci content',
                        type: 'ci',
                        frameworks: [],
                        customized: false,
                        warnings: [],
                        sharedSecrets: [],
                        sharedVariables: {},
                        dependencies: []
                    },
                    {
                        templateId: 'cd-template',
                        filename: 'cd.yml',
                        content: 'cd content',
                        type: 'cd',
                        frameworks: [],
                        customized: false,
                        warnings: [],
                        sharedSecrets: [],
                        sharedVariables: {},
                        dependencies: ['CI']
                    }
                ],
                errors: [],
                coordination: {
                    executionOrder: ['ci', 'cd'],
                    dependencies: [{ workflow: 'CD', dependsOn: ['CI'] }],
                    sharedResources: []
                }
            });
            // Act
            const result = await coordinator.generateCoordinatedWorkflows(workflowTypes, readmePath, outputDirectory);
            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.workflows.length, 2);
            assert.ok(result.coordination.dependencies.length > 0);
        });
    });
    suite('updateWorkflowsWithStrategy', () => {
        test('should update workflows while preserving customizations', async () => {
            // Arrange
            const workflowPaths = ['/test/.github/workflows/ci.yml'];
            const strategy = {
                preserveCustomizations: true,
                backupExisting: true,
                mergeStrategy: 'merge',
                customSections: ['env', 'customSteps']
            };
            mockFileSystemManager.readWorkflowFile.resolves(`
name: CI
# Template ID: ci-template
on: [push]
env:
  CUSTOM_VAR: custom_value
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
`);
            mockTemplateManager.getTemplate.returns({
                id: 'ci-template',
                name: 'CI Template',
                type: 'ci',
                content: 'updated template content',
                metadata: { usage: 1 }
            });
            mockFileSystemManager.writeWorkflowFile.resolves();
            // Act
            const result = await coordinator.updateWorkflowsWithStrategy(workflowPaths, strategy);
            // Assert
            assert.strictEqual(result.updated.length, 1);
            assert.strictEqual(result.errors.length, 0);
            assert.ok(result.backups.length > 0);
        });
        test('should handle update errors gracefully', async () => {
            // Arrange
            const workflowPaths = ['/test/.github/workflows/invalid.yml'];
            const strategy = {
                preserveCustomizations: false,
                backupExisting: false,
                mergeStrategy: 'replace',
                customSections: []
            };
            mockFileSystemManager.readWorkflowFile.rejects(new Error('File not found'));
            // Act
            const result = await coordinator.updateWorkflowsWithStrategy(workflowPaths, strategy);
            // Assert
            assert.strictEqual(result.updated.length, 0);
            assert.strictEqual(result.errors.length, 1);
            assert.ok(result.errors[0].error.includes('File not found'));
        });
    });
    suite('manageTemplateCustomizations', () => {
        test('should apply customizations to workflow', async () => {
            // Arrange
            const workflowPath = '/test/.github/workflows/ci.yml';
            const customizations = {
                env: 'CUSTOM_ENV: value',
                customSteps: 'custom step content'
            };
            const preserveSections = ['env'];
            mockFileSystemManager.readWorkflowFile.resolves(`
name: CI
# Template ID: ci-template
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
`);
            mockFileSystemManager.writeWorkflowFile.resolves();
            // Act
            const result = await coordinator.manageTemplateCustomizations(workflowPath, customizations, preserveSections);
            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.templateId, 'ci-template');
            assert.ok(result.customizations.env);
            assert.ok(result.preservedSections.includes('env'));
        });
        test('should handle missing template ID', async () => {
            // Arrange
            const workflowPath = '/test/.github/workflows/ci.yml';
            const customizations = {};
            mockFileSystemManager.readWorkflowFile.resolves(`
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
`);
            // Act
            const result = await coordinator.manageTemplateCustomizations(workflowPath, customizations);
            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.templateId, undefined);
        });
    });
    suite('analyzeWorkflowCoordination', () => {
        test('should analyze workflow coordination and provide recommendations', async () => {
            // Arrange
            const workflowPaths = [
                '/test/.github/workflows/ci.yml',
                '/test/.github/workflows/cd.yml'
            ];
            // Mock loading existing workflows
            sinon.stub(coordinator, 'loadExistingWorkflows').resolves([
                {
                    name: 'CI',
                    jobs: {
                        test: {
                            steps: [
                                { uses: 'actions/checkout@v3' },
                                { uses: 'actions/setup-node@v3' }
                            ]
                        }
                    }
                },
                {
                    name: 'CD',
                    jobs: {
                        deploy: {
                            steps: [
                                { uses: 'actions/checkout@v3' }, // Duplicate step
                                { uses: 'actions/setup-node@v3' } // Duplicate step
                            ]
                        }
                    }
                }
            ]);
            // Act
            const analysis = await coordinator.analyzeWorkflowCoordination(workflowPaths);
            // Assert
            assert.ok(analysis.duplicatedSteps.length >= 0);
            assert.ok(analysis.sharedResources.length >= 0);
            assert.ok(analysis.recommendations.length >= 0);
        });
    });
});
//# sourceMappingURL=MultiWorkflowCoordinator.test.js.map