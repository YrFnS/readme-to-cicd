"use strict";
/**
 * CLI Integration Tests
 *
 * Comprehensive tests for the CLI integration layer with mock CLI responses.
 * Tests process execution, data transformation, and error handling.
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
const vscode = __importStar(require("vscode"));
const sinon = __importStar(require("sinon"));
const CLIIntegration_1 = require("../../../src/core/CLIIntegration");
const ProcessExecutor_1 = require("../../../src/core/ProcessExecutor");
const DataTransformer_1 = require("../../../src/core/DataTransformer");
const ProgressReporter_1 = require("../../../src/core/ProgressReporter");
suite('CLI Integration Tests', () => {
    let cliIntegration;
    let processExecutorStub;
    let dataTransformerStub;
    let progressReporterStub;
    let mockWorkspaceConfig;
    const mockWorkflowConfiguration = {
        workflowTypes: ['ci', 'cd'],
        frameworks: [
            { name: 'Node.js', enabled: true, confidence: 0.9 },
            { name: 'React', enabled: true, confidence: 0.8 }
        ],
        deploymentTargets: [],
        securityLevel: 'standard',
        optimizationLevel: 'standard',
        includeComments: true,
        customSteps: []
    };
    const mockSuccessfulCLIResult = {
        success: true,
        stdout: JSON.stringify({
            success: true,
            generatedFiles: ['.github/workflows/ci.yml', '.github/workflows/cd.yml'],
            errors: [],
            warnings: [],
            summary: {
                totalTime: 5000,
                filesGenerated: 2,
                workflowsCreated: 2,
                frameworksDetected: ['Node.js', 'React'],
                optimizationsApplied: 3,
                executionTime: 5000,
                filesProcessed: 1,
                workflowsGenerated: 2
            },
            detectedFrameworks: [
                {
                    name: 'Node.js',
                    version: '18.0.0',
                    confidence: 0.9,
                    type: 'runtime',
                    ecosystem: 'nodejs',
                    evidence: []
                }
            ]
        }),
        stderr: '',
        exitCode: 0,
        executionTime: 5000,
        timedOut: false
    };
    setup(() => {
        // Create stubs for dependencies
        processExecutorStub = sinon.createStubInstance(ProcessExecutor_1.ProcessExecutor);
        dataTransformerStub = sinon.createStubInstance(DataTransformer_1.DataTransformer);
        progressReporterStub = sinon.createStubInstance(ProgressReporter_1.ProgressReporter);
        // Mock VS Code workspace configuration
        mockWorkspaceConfig = sinon.stub(vscode.workspace, 'getConfiguration');
        mockWorkspaceConfig.returns({
            get: sinon.stub().callsFake((key, defaultValue) => {
                const config = {
                    'defaultOutputDirectory': '.github/workflows',
                    'enableAutoGeneration': false,
                    'preferredWorkflowTypes': ['ci'],
                    'customTemplates': [],
                    'gitIntegration.autoCommit': false,
                    'gitIntegration.commitMessage': 'Add generated CI/CD workflows',
                    'gitIntegration.createPR': false,
                    'showPreviewByDefault': true,
                    'enableInlineValidation': true,
                    'notificationLevel': 'all'
                };
                return config[key] || defaultValue;
            })
        });
        // Setup default stub behaviors
        setupDefaultStubBehaviors();
        // Create CLI integration instance
        cliIntegration = new CLIIntegration_1.CLIIntegration({
            timeout: 30000,
            enableLogging: false // Disable logging in tests
        });
        // Replace internal components with stubs
        cliIntegration.processExecutor = processExecutorStub;
        cliIntegration.dataTransformer = dataTransformerStub;
        cliIntegration.progressReporter = progressReporterStub;
    });
    teardown(() => {
        sinon.restore();
        cliIntegration.dispose();
    });
    function setupDefaultStubBehaviors() {
        // Setup data transformer stubs
        dataTransformerStub.transformVSCodeSettingsToConfig.returns({
            success: true,
            data: {
                defaultOutputDirectory: '.github/workflows',
                enableAutoGeneration: false,
                preferredWorkflowTypes: ['ci'],
                customTemplates: [],
                gitIntegration: {
                    autoCommit: false,
                    commitMessage: 'Add generated CI/CD workflows',
                    createPR: false
                },
                showPreviewByDefault: true,
                enableInlineValidation: true,
                notificationLevel: 'all'
            },
            errors: [],
            warnings: []
        });
        dataTransformerStub.transformConfigurationToCLIArgs.returns({
            success: true,
            data: ['generate', '--readme', 'README.md', '--output', '.github/workflows', '--workflow-type', 'ci', 'cd'],
            errors: [],
            warnings: []
        });
        dataTransformerStub.transformCLIResultToExtension.returns({
            success: true,
            data: {
                success: true,
                generatedFiles: ['.github/workflows/ci.yml', '.github/workflows/cd.yml'],
                errors: [],
                warnings: [],
                summary: {
                    totalTime: 5000,
                    filesGenerated: 2,
                    workflowsCreated: 2,
                    frameworksDetected: ['Node.js', 'React'],
                    optimizationsApplied: 3,
                    executionTime: 5000,
                    filesProcessed: 1,
                    workflowsGenerated: 2
                },
                detectedFrameworks: []
            },
            errors: [],
            warnings: []
        });
        // Setup process executor stubs
        processExecutorStub.executeCLICommand.resolves(mockSuccessfulCLIResult);
        // Setup progress reporter stubs
        progressReporterStub.startProgress.resolves(() => { });
        progressReporterStub.createProgressCallback.returns(() => { });
        progressReporterStub.showSuccess.resolves(undefined);
        progressReporterStub.showError.resolves(undefined);
    }
    suite('generateWorkflows', () => {
        test('should successfully generate workflows', async () => {
            const result = await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration, '.github/workflows');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.generatedFiles.length, 2);
            assert.strictEqual(result.errors.length, 0);
            // Verify method calls
            assert(dataTransformerStub.transformVSCodeSettingsToConfig.calledOnce);
            assert(dataTransformerStub.transformConfigurationToCLIArgs.calledOnce);
            assert(processExecutorStub.executeCLICommand.calledOnce);
            assert(dataTransformerStub.transformCLIResultToExtension.calledOnce);
        });
        test('should handle CLI execution failure', async () => {
            // Setup failure scenario
            processExecutorStub.executeCLICommand.resolves({
                success: false,
                stdout: '',
                stderr: 'CLI execution failed',
                exitCode: 1,
                executionTime: 1000,
                timedOut: false
            });
            dataTransformerStub.transformCLIResultToExtension.returns({
                success: true,
                data: {
                    success: false,
                    generatedFiles: [],
                    errors: [{
                            code: 'CLI_ERROR',
                            message: 'CLI execution failed',
                            category: 'processing',
                            severity: 'error',
                            suggestions: []
                        }],
                    warnings: [],
                    summary: {
                        totalTime: 1000,
                        filesGenerated: 0,
                        workflowsCreated: 0,
                        frameworksDetected: [],
                        optimizationsApplied: 0,
                        executionTime: 1000,
                        filesProcessed: 0,
                        workflowsGenerated: 0
                    },
                    detectedFrameworks: []
                },
                errors: [],
                warnings: []
            });
            const result = await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.errors.length, 1);
            assert.strictEqual(result.errors[0].message, 'CLI execution failed');
        });
        test('should handle configuration transformation failure', async () => {
            // Setup configuration failure
            dataTransformerStub.transformConfigurationToCLIArgs.returns({
                success: false,
                errors: ['Invalid configuration'],
                warnings: []
            });
            const result = await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.errors.length, 1);
            assert(result.errors[0].message.includes('Configuration transformation failed'));
        });
        test('should handle cancellation', async () => {
            const cancellationToken = new vscode.CancellationTokenSource();
            // Cancel immediately
            cancellationToken.cancel();
            const result = await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration, undefined, cancellationToken.token);
            // Should still attempt execution but may be cancelled
            assert(processExecutorStub.executeCLICommand.calledOnce);
        });
    });
    suite('previewWorkflows', () => {
        test('should successfully generate preview', async () => {
            // Setup dry-run result
            const dryRunResult = {
                success: true,
                stdout: 'Detected framework: Node.js\nWould generate: ci.yml\nWould generate: cd.yml',
                stderr: '',
                exitCode: 0,
                executionTime: 2000,
                timedOut: false
            };
            processExecutorStub.executeCLICommand.resolves(dryRunResult);
            const result = await cliIntegration.previewWorkflows('README.md', mockWorkflowConfiguration);
            assert.strictEqual(result.workflows.length, 2);
            assert.strictEqual(result.detectedFrameworks.length, 1);
            assert.strictEqual(result.detectedFrameworks[0].name, 'Node.js');
            // Verify dry-run was used
            const cliArgs = dataTransformerStub.transformConfigurationToCLIArgs.getCall(0).args;
            assert.strictEqual(cliArgs[3], true); // dry-run flag
        });
        test('should handle preview failure gracefully', async () => {
            processExecutorStub.executeCLICommand.rejects(new Error('Preview failed'));
            const result = await cliIntegration.previewWorkflows('README.md', mockWorkflowConfiguration);
            assert.strictEqual(result.workflows.length, 0);
            assert.strictEqual(result.detectedFrameworks.length, 0);
        });
    });
    suite('validateWorkflows', () => {
        test('should successfully validate workflows', async () => {
            const validationResult = {
                success: true,
                stdout: 'All workflows are valid',
                stderr: '',
                exitCode: 0,
                executionTime: 1000,
                timedOut: false
            };
            processExecutorStub.executeCLICommand.resolves(validationResult);
            const result = await cliIntegration.validateWorkflows('.github/workflows');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.command, 'validate');
            assert(progressReporterStub.showSuccess.calledOnce);
        });
        test('should handle validation failure', async () => {
            const validationResult = {
                success: false,
                stdout: '',
                stderr: 'Validation errors found',
                exitCode: 1,
                executionTime: 1000,
                timedOut: false
            };
            processExecutorStub.executeCLICommand.resolves(validationResult);
            const result = await cliIntegration.validateWorkflows('.github/workflows');
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.stderr, 'Validation errors found');
            assert(progressReporterStub.showError.calledOnce);
        });
    });
    suite('initializeProject', () => {
        test('should successfully initialize project', async () => {
            const initResult = {
                success: true,
                stdout: 'Project initialized successfully',
                stderr: '',
                exitCode: 0,
                executionTime: 2000,
                timedOut: false
            };
            processExecutorStub.executeCLICommand.resolves(initResult);
            const result = await cliIntegration.initializeProject('/path/to/project', 'basic');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.command, 'init');
            assert(progressReporterStub.showSuccess.calledOnce);
            // Verify correct CLI command was called
            const cliCall = processExecutorStub.executeCLICommand.getCall(0);
            assert.strictEqual(cliCall.args[0], 'init');
            assert.deepStrictEqual(cliCall.args[1], ['--template', 'basic', '--path', '/path/to/project']);
        });
        test('should handle initialization failure', async () => {
            processExecutorStub.executeCLICommand.rejects(new Error('Init failed'));
            const result = await cliIntegration.initializeProject('/path/to/project');
            assert.strictEqual(result.success, false);
            assert(result.stderr.includes('Init failed'));
            assert(progressReporterStub.showError.calledOnce);
        });
    });
    suite('getCLIStatus', () => {
        test('should detect available CLI', async () => {
            const versionResult = {
                success: true,
                stdout: '1.0.0',
                stderr: '',
                exitCode: 0,
                executionTime: 500,
                timedOut: false
            };
            processExecutorStub.executeCommand.resolves(versionResult);
            const status = await cliIntegration.getCLIStatus();
            assert.strictEqual(status.available, true);
            assert.strictEqual(status.version, '1.0.0');
            assert.strictEqual(status.error, undefined);
        });
        test('should detect unavailable CLI', async () => {
            processExecutorStub.executeCommand.rejects(new Error('Command not found'));
            const status = await cliIntegration.getCLIStatus();
            assert.strictEqual(status.available, false);
            assert(status.error?.includes('Command not found'));
        });
    });
    suite('Error Handling', () => {
        test('should handle process executor errors', async () => {
            processExecutorStub.executeCLICommand.rejects(new Error('Process execution failed'));
            const result = await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.errors.length, 1);
            assert(result.errors[0].message.includes('Process execution failed'));
        });
        test('should handle data transformation errors', async () => {
            dataTransformerStub.transformVSCodeSettingsToConfig.returns({
                success: false,
                errors: ['Settings transformation failed'],
                warnings: []
            });
            const result = await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration);
            assert.strictEqual(result.success, false);
            assert(result.errors[0].message.includes('Failed to load extension configuration'));
        });
    });
    suite('Progress Reporting', () => {
        test('should report progress during generation', async () => {
            await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration);
            assert(progressReporterStub.startProgress.calledOnce);
            assert(progressReporterStub.startProgress.calledWith('Generating CI/CD Workflows', true));
        });
        test('should show success notification on completion', async () => {
            await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration);
            assert(progressReporterStub.showSuccess.calledOnce);
            const successCall = progressReporterStub.showSuccess.getCall(0);
            assert(successCall.args[0].includes('Generated 2 workflow file(s)'));
        });
        test('should show error notification on failure', async () => {
            processExecutorStub.executeCLICommand.rejects(new Error('Test error'));
            await cliIntegration.generateWorkflows('README.md', mockWorkflowConfiguration);
            assert(progressReporterStub.showError.calledOnce);
        });
    });
    suite('Resource Management', () => {
        test('should dispose resources properly', () => {
            cliIntegration.dispose();
            assert(processExecutorStub.dispose.calledOnce);
            assert(dataTransformerStub.dispose.calledOnce);
            assert(progressReporterStub.dispose.calledOnce);
        });
        test('should kill active processes', async () => {
            await cliIntegration.killAllProcesses();
            assert(processExecutorStub.killAllProcesses.calledOnce);
        });
        test('should report active process count', () => {
            processExecutorStub.getActiveProcessCount.returns(2);
            const count = cliIntegration.getActiveProcessCount();
            assert.strictEqual(count, 2);
        });
    });
});
//# sourceMappingURL=CLIIntegration.test.js.map