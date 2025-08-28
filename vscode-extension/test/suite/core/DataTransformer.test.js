"use strict";
/**
 * Data Transformer Tests
 *
 * Tests for the DataTransformer class including configuration transformation,
 * CLI result parsing, and error handling.
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
const vscode = __importStar(require("vscode"));
const DataTransformer_1 = require("../../../src/core/DataTransformer");
suite('Data Transformer Tests', () => {
    let dataTransformer;
    let mockWorkspaceConfig;
    const mockWorkflowConfiguration = {
        workflowTypes: ['ci', 'cd'],
        frameworks: [
            { name: 'Node.js', enabled: true, confidence: 0.9 },
            { name: 'React', enabled: true, confidence: 0.8 },
            { name: 'Python', enabled: false, confidence: 0.6 }
        ],
        deploymentTargets: [],
        securityLevel: 'standard',
        optimizationLevel: 'standard',
        includeComments: true,
        customSteps: []
    };
    const mockExtensionConfiguration = {
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
    };
    setup(() => {
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
        dataTransformer = new DataTransformer_1.DataTransformer();
    });
    teardown(() => {
        sinon.restore();
        dataTransformer.dispose();
    });
    suite('transformConfigurationToCLI', () => {
        test('should transform configuration to CLI request', () => {
            const result = dataTransformer.transformConfigurationToCLI(mockWorkflowConfiguration, mockExtensionConfiguration, 'README.md', '.github/workflows');
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.strictEqual(result.data.readmePath, 'README.md');
            assert.strictEqual(result.data.outputDirectory, '.github/workflows');
            assert.deepStrictEqual(result.data.workflowTypes, ['ci', 'cd']);
            assert.deepStrictEqual(result.data.frameworks, ['Node.js', 'React']);
            assert.strictEqual(result.data.interactive, false);
        });
        test('should filter disabled frameworks', () => {
            const result = dataTransformer.transformConfigurationToCLI(mockWorkflowConfiguration, mockExtensionConfiguration, 'README.md', '.github/workflows');
            assert.strictEqual(result.success, true);
            assert(result.data);
            // Should only include enabled frameworks (Node.js and React, not Python)
            assert.strictEqual(result.data.frameworks?.length, 2);
            assert(result.data.frameworks?.includes('Node.js'));
            assert(result.data.frameworks?.includes('React'));
            assert(!result.data.frameworks?.includes('Python'));
        });
        test('should handle empty frameworks list', () => {
            const configWithNoFrameworks = {
                ...mockWorkflowConfiguration,
                frameworks: []
            };
            const result = dataTransformer.transformConfigurationToCLI(configWithNoFrameworks, mockExtensionConfiguration, 'README.md', '.github/workflows');
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.deepStrictEqual(result.data.frameworks, []);
        });
    });
    suite('transformConfigurationToCLIArgs', () => {
        test('should generate correct CLI arguments', () => {
            const result = dataTransformer.transformConfigurationToCLIArgs(mockWorkflowConfiguration, 'README.md', '.github/workflows', false);
            assert.strictEqual(result.success, true);
            assert(result.data);
            const args = result.data;
            assert.strictEqual(args[0], 'generate');
            assert(args.includes('--readme'));
            assert(args.includes('README.md'));
            assert(args.includes('--output'));
            assert(args.includes('.github/workflows'));
            assert(args.includes('--workflow-type'));
            assert(args.includes('ci'));
            assert(args.includes('cd'));
            assert(args.includes('--framework'));
            assert(args.includes('Node.js'));
            assert(args.includes('React'));
            assert(args.includes('--non-interactive'));
            assert(args.includes('--output-format'));
            assert(args.includes('json'));
        });
        test('should include dry-run flag when specified', () => {
            const result = dataTransformer.transformConfigurationToCLIArgs(mockWorkflowConfiguration, 'README.md', '.github/workflows', true // dry run
            );
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert(result.data.includes('--dry-run'));
        });
        test('should include optimization level when not standard', () => {
            const configWithOptimization = {
                ...mockWorkflowConfiguration,
                optimizationLevel: 'aggressive'
            };
            const result = dataTransformer.transformConfigurationToCLIArgs(configWithOptimization, 'README.md', '.github/workflows');
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert(result.data.includes('--optimization'));
            assert(result.data.includes('aggressive'));
        });
        test('should include security level when not standard', () => {
            const configWithSecurity = {
                ...mockWorkflowConfiguration,
                securityLevel: 'strict'
            };
            const result = dataTransformer.transformConfigurationToCLIArgs(configWithSecurity, 'README.md', '.github/workflows');
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert(result.data.includes('--security'));
            assert(result.data.includes('strict'));
        });
        test('should include comments flag when enabled', () => {
            const result = dataTransformer.transformConfigurationToCLIArgs(mockWorkflowConfiguration, 'README.md', '.github/workflows');
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert(result.data.includes('--include-comments'));
        });
    });
    suite('transformCLIResultToExtension', () => {
        test('should parse JSON CLI output', () => {
            const jsonOutput = JSON.stringify({
                success: true,
                generatedFiles: ['ci.yml', 'cd.yml'],
                errors: [],
                warnings: ['Warning: No tests detected'],
                summary: {
                    totalTime: 5000,
                    filesGenerated: 2,
                    workflowsCreated: 2,
                    frameworksDetected: ['Node.js'],
                    optimizationsApplied: 1,
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
            });
            const result = dataTransformer.transformCLIResultToExtension(jsonOutput, '', 0);
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.strictEqual(result.data.success, true);
            assert.strictEqual(result.data.generatedFiles.length, 2);
            assert.strictEqual(result.data.warnings.length, 1);
            assert.strictEqual(result.data.detectedFrameworks.length, 1);
            assert.strictEqual(result.data.detectedFrameworks[0].name, 'Node.js');
        });
        test('should parse text CLI output as fallback', () => {
            const textOutput = `
        Generated: ci.yml
        Generated: cd.yml
        Warning: No tests detected
      `;
            const result = dataTransformer.transformCLIResultToExtension(textOutput, '', 0);
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.strictEqual(result.data.success, true);
            assert.strictEqual(result.data.generatedFiles.length, 2);
            assert(result.data.generatedFiles.includes('ci.yml'));
            assert(result.data.generatedFiles.includes('cd.yml'));
            assert.strictEqual(result.data.warnings.length, 1);
            assert(result.data.warnings[0].includes('No tests detected'));
        });
        test('should handle CLI failure', () => {
            const result = dataTransformer.transformCLIResultToExtension('', 'CLI execution failed', 1);
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.strictEqual(result.data.success, false);
            assert.strictEqual(result.data.errors.length, 1);
            assert.strictEqual(result.data.errors[0].message, 'CLI execution failed');
        });
        test('should handle malformed JSON gracefully', () => {
            const malformedJson = '{ invalid json }';
            const result = dataTransformer.transformCLIResultToExtension(malformedJson, '', 0);
            assert.strictEqual(result.success, true);
            assert(result.data);
            // Should fall back to text parsing
            assert.strictEqual(result.data.success, true);
        });
    });
    suite('transformVSCodeSettingsToConfig', () => {
        test('should transform VS Code settings to extension config', () => {
            const result = dataTransformer.transformVSCodeSettingsToConfig();
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.strictEqual(result.data.defaultOutputDirectory, '.github/workflows');
            assert.strictEqual(result.data.enableAutoGeneration, false);
            assert.deepStrictEqual(result.data.preferredWorkflowTypes, ['ci']);
            assert.strictEqual(result.data.showPreviewByDefault, true);
            assert.strictEqual(result.data.enableInlineValidation, true);
            assert.strictEqual(result.data.notificationLevel, 'all');
        });
        test('should handle missing configuration gracefully', () => {
            // Mock configuration that returns undefined for all keys
            mockWorkspaceConfig.returns({
                get: sinon.stub().returns(undefined)
            });
            const result = dataTransformer.transformVSCodeSettingsToConfig();
            assert.strictEqual(result.success, true);
            assert(result.data);
            // Should use default values
            assert.strictEqual(result.data.defaultOutputDirectory, '.github/workflows');
            assert.strictEqual(result.data.enableAutoGeneration, false);
        });
    });
    suite('transformDetectedFrameworks', () => {
        test('should transform CLI frameworks to extension format', () => {
            const cliFrameworks = [
                {
                    name: 'Node.js',
                    version: '18.0.0',
                    confidence: 0.9,
                    type: 'runtime',
                    ecosystem: 'nodejs',
                    evidence: [
                        { type: 'file', source: 'package.json', value: 'found', confidence: 0.9 }
                    ]
                },
                {
                    name: 'React',
                    confidence: 0.8,
                    type: 'frontend_framework',
                    ecosystem: 'frontend'
                }
            ];
            const result = dataTransformer.transformDetectedFrameworks(cliFrameworks);
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.strictEqual(result.data.length, 2);
            const nodeFramework = result.data[0];
            assert.strictEqual(nodeFramework.name, 'Node.js');
            assert.strictEqual(nodeFramework.version, '18.0.0');
            assert.strictEqual(nodeFramework.confidence, 0.9);
            assert.strictEqual(nodeFramework.type, 'runtime');
            assert.strictEqual(nodeFramework.ecosystem, 'nodejs');
            assert.strictEqual(nodeFramework.evidence.length, 1);
            const reactFramework = result.data[1];
            assert.strictEqual(reactFramework.name, 'React');
            assert.strictEqual(reactFramework.confidence, 0.8);
            assert.strictEqual(reactFramework.type, 'frontend_framework');
            assert.strictEqual(reactFramework.ecosystem, 'frontend');
        });
        test('should handle frameworks with missing properties', () => {
            const cliFrameworks = [
                {
                    name: 'Unknown Framework'
                    // Missing other properties
                },
                {
                    // Missing name
                    confidence: 0.5
                }
            ];
            const result = dataTransformer.transformDetectedFrameworks(cliFrameworks);
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.strictEqual(result.data.length, 2);
            const firstFramework = result.data[0];
            assert.strictEqual(firstFramework.name, 'Unknown Framework');
            assert.strictEqual(firstFramework.confidence, 0.5); // Default
            assert.strictEqual(firstFramework.type, 'unknown');
            assert.strictEqual(firstFramework.ecosystem, 'unknown');
            const secondFramework = result.data[1];
            assert.strictEqual(secondFramework.name, 'Unknown Framework'); // Default
            assert.strictEqual(secondFramework.confidence, 0.5);
        });
        test('should handle empty frameworks array', () => {
            const result = dataTransformer.transformDetectedFrameworks([]);
            assert.strictEqual(result.success, true);
            assert(result.data);
            assert.strictEqual(result.data.length, 0);
        });
    });
    suite('Error Handling', () => {
        test('should handle transformation errors gracefully', () => {
            // Force an error by passing invalid data
            const result = dataTransformer.transformConfigurationToCLI(null, mockExtensionConfiguration, 'README.md', '.github/workflows');
            assert.strictEqual(result.success, false);
            assert(result.errors.length > 0);
            assert(result.errors[0].includes('Configuration transformation failed'));
        });
        test('should handle CLI result parsing errors', () => {
            // Mock console.error to avoid test output noise
            const consoleErrorStub = sinon.stub(console, 'error');
            const result = dataTransformer.transformCLIResultToExtension(null, '', 0);
            assert.strictEqual(result.success, false);
            assert(result.errors.length > 0);
            consoleErrorStub.restore();
        });
        test('should handle VS Code settings errors', () => {
            // Mock workspace.getConfiguration to throw an error
            mockWorkspaceConfig.throws(new Error('Settings access failed'));
            const result = dataTransformer.transformVSCodeSettingsToConfig();
            assert.strictEqual(result.success, false);
            assert(result.errors.length > 0);
            assert(result.errors[0].includes('VS Code settings transformation failed'));
        });
    });
    suite('Validation', () => {
        test('should validate transformation context', () => {
            const validContext = {
                sourceFormat: 'extension',
                targetFormat: 'cli',
                operation: 'configuration'
            };
            const isValid = dataTransformer.validateTransformationContext(validContext);
            assert.strictEqual(isValid, true);
        });
        test('should reject invalid transformation context', () => {
            const invalidContext = {
                sourceFormat: 'extension',
                targetFormat: 'extension', // Same as source
                operation: 'configuration'
            };
            const isValid = dataTransformer.validateTransformationContext(invalidContext);
            assert.strictEqual(isValid, false);
        });
        test('should reject unknown formats', () => {
            const invalidContext = {
                sourceFormat: 'unknown',
                targetFormat: 'cli',
                operation: 'configuration'
            };
            const isValid = dataTransformer.validateTransformationContext(invalidContext);
            assert.strictEqual(isValid, false);
        });
        test('should reject unknown operations', () => {
            const invalidContext = {
                sourceFormat: 'extension',
                targetFormat: 'cli',
                operation: 'unknown'
            };
            const isValid = dataTransformer.validateTransformationContext(invalidContext);
            assert.strictEqual(isValid, false);
        });
    });
});
//# sourceMappingURL=DataTransformer.test.js.map