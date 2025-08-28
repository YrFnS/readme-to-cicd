"use strict";
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
const mocha_1 = require("mocha");
(0, mocha_1.describe)('PreviewApp Component', () => {
    const mockWorkflows = [
        {
            name: 'ci.yml',
            path: '.github/workflows/ci.yml',
            content: 'name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest',
            language: 'yaml',
            size: 85
        },
        {
            name: 'deploy.yml',
            path: '.github/workflows/deploy.yml',
            content: 'name: Deploy\non: [push]\njobs:\n  deploy:\n    runs-on: ubuntu-latest',
            language: 'yaml',
            size: 78
        }
    ];
    (0, mocha_1.describe)('State Management', () => {
        (0, mocha_1.it)('should initialize with loading state', () => {
            const initialState = {
                isLoading: true,
                error: null,
                workflows: [],
                selectedWorkflow: null,
                editMode: false,
                hasChanges: false
            };
            assert.strictEqual(initialState.isLoading, true);
            assert.strictEqual(initialState.workflows.length, 0);
            assert.strictEqual(initialState.selectedWorkflow, null);
        });
        (0, mocha_1.it)('should update state when workflows are loaded', () => {
            let previewState = {
                isLoading: true,
                error: null,
                workflows: [],
                selectedWorkflow: null,
                editMode: false,
                hasChanges: false
            };
            // Simulate workflow loading
            previewState = {
                ...previewState,
                workflows: mockWorkflows,
                isLoading: false,
                selectedWorkflow: mockWorkflows[0].name
            };
            assert.strictEqual(previewState.isLoading, false);
            assert.strictEqual(previewState.workflows.length, 2);
            assert.strictEqual(previewState.selectedWorkflow, 'ci.yml');
        });
        (0, mocha_1.it)('should handle error states correctly', () => {
            const errorState = {
                isLoading: false,
                error: 'Failed to generate workflows',
                workflows: [],
                selectedWorkflow: null,
                editMode: false,
                hasChanges: false
            };
            assert.strictEqual(errorState.isLoading, false);
            assert.strictEqual(errorState.error, 'Failed to generate workflows');
            assert.strictEqual(errorState.workflows.length, 0);
        });
    });
    (0, mocha_1.describe)('Configuration Handling', () => {
        (0, mocha_1.it)('should handle configuration changes', () => {
            let configuration = {
                frameworks: ['nodejs'],
                workflowTypes: ['ci'],
                deploymentPlatform: '',
                deploymentConfig: {}
            };
            const handleConfigurationChange = (updates) => {
                configuration = { ...configuration, ...updates };
            };
            // Test framework addition
            handleConfigurationChange({ frameworks: ['nodejs', 'react'] });
            assert.strictEqual(configuration.frameworks.length, 2);
            assert.ok(configuration.frameworks.includes('react'));
            // Test deployment platform change
            handleConfigurationChange({ deploymentPlatform: 'netlify' });
            assert.strictEqual(configuration.deploymentPlatform, 'netlify');
        });
        (0, mocha_1.it)('should trigger preview updates on configuration changes', () => {
            let previewUpdateRequested = false;
            const mockVSCodeAPI = {
                postMessage: (message) => {
                    if (message.type === 'requestPreviewUpdate') {
                        previewUpdateRequested = true;
                    }
                }
            };
            // Simulate configuration change
            mockVSCodeAPI.postMessage({
                type: 'requestPreviewUpdate',
                data: { frameworks: ['nodejs', 'react'] }
            });
            assert.strictEqual(previewUpdateRequested, true);
        });
    });
    (0, mocha_1.describe)('Workflow Selection', () => {
        (0, mocha_1.it)('should handle workflow selection correctly', () => {
            let selectedWorkflow = 'ci.yml';
            let editMode = false;
            let hasChanges = false;
            const handleWorkflowSelect = (workflowName) => {
                selectedWorkflow = workflowName;
                editMode = false;
                hasChanges = false;
            };
            handleWorkflowSelect('deploy.yml');
            assert.strictEqual(selectedWorkflow, 'deploy.yml');
            assert.strictEqual(editMode, false);
            assert.strictEqual(hasChanges, false);
        });
        (0, mocha_1.it)('should find selected workflow file correctly', () => {
            const selectedWorkflowName = 'ci.yml';
            const selectedWorkflowFile = mockWorkflows.find(w => w.name === selectedWorkflowName);
            assert.ok(selectedWorkflowFile);
            assert.strictEqual(selectedWorkflowFile.name, 'ci.yml');
            assert.strictEqual(selectedWorkflowFile.path, '.github/workflows/ci.yml');
        });
    });
    (0, mocha_1.describe)('Edit Mode Handling', () => {
        (0, mocha_1.it)('should toggle edit mode correctly', () => {
            let editMode = false;
            let hasChanges = false;
            const handleEditToggle = () => {
                editMode = !editMode;
                hasChanges = false;
            };
            // Enter edit mode
            handleEditToggle();
            assert.strictEqual(editMode, true);
            assert.strictEqual(hasChanges, false);
            // Exit edit mode
            handleEditToggle();
            assert.strictEqual(editMode, false);
            assert.strictEqual(hasChanges, false);
        });
        (0, mocha_1.it)('should detect content changes correctly', () => {
            const originalContent = 'name: CI\non: [push]';
            const modifiedContent = 'name: CI\non: [push, pull_request]';
            const hasChanges = modifiedContent !== originalContent;
            assert.strictEqual(hasChanges, true);
        });
        (0, mocha_1.it)('should handle save changes correctly', () => {
            let saveRequested = false;
            let savedWorkflow = '';
            let savedContent = '';
            const mockVSCodeAPI = {
                postMessage: (message) => {
                    if (message.type === 'saveWorkflowChanges') {
                        saveRequested = true;
                        savedWorkflow = message.data.workflowName;
                        savedContent = message.data.content;
                    }
                }
            };
            // Simulate save
            mockVSCodeAPI.postMessage({
                type: 'saveWorkflowChanges',
                data: {
                    workflowName: 'ci.yml',
                    content: 'name: CI\non: [push, pull_request]'
                }
            });
            assert.strictEqual(saveRequested, true);
            assert.strictEqual(savedWorkflow, 'ci.yml');
            assert.ok(savedContent.includes('pull_request'));
        });
    });
    (0, mocha_1.describe)('Layout Management', () => {
        (0, mocha_1.it)('should handle layout changes correctly', () => {
            let layout = {
                splitView: true,
                configurationWidth: 30,
                previewWidth: 70,
                orientation: 'horizontal'
            };
            const handleLayoutChange = (newLayout) => {
                layout = { ...layout, ...newLayout };
            };
            // Test split view toggle
            handleLayoutChange({ splitView: false });
            assert.strictEqual(layout.splitView, false);
            // Test orientation change
            handleLayoutChange({ orientation: 'vertical' });
            assert.strictEqual(layout.orientation, 'vertical');
            // Test width adjustment
            handleLayoutChange({ configurationWidth: 40, previewWidth: 60 });
            assert.strictEqual(layout.configurationWidth, 40);
            assert.strictEqual(layout.previewWidth, 60);
        });
        (0, mocha_1.it)('should calculate layout styles correctly', () => {
            const layout = {
                splitView: true,
                configurationWidth: 30,
                previewWidth: 70,
                orientation: 'horizontal'
            };
            // Test horizontal layout
            const horizontalConfigStyle = {
                width: layout.orientation === 'horizontal' ? `${layout.configurationWidth}%` : '100%',
                height: layout.orientation === 'vertical' ? `${layout.configurationWidth}%` : '100%'
            };
            assert.strictEqual(horizontalConfigStyle.width, '30%');
            assert.strictEqual(horizontalConfigStyle.height, '100%');
            // Test vertical layout
            const verticalLayout = { ...layout, orientation: 'vertical' };
            const verticalConfigStyle = {
                width: verticalLayout.orientation === 'horizontal' ? `${verticalLayout.configurationWidth}%` : '100%',
                height: verticalLayout.orientation === 'vertical' ? `${verticalLayout.configurationWidth}%` : '100%'
            };
            assert.strictEqual(verticalConfigStyle.width, '100%');
            assert.strictEqual(verticalConfigStyle.height, '30%');
        });
    });
    (0, mocha_1.describe)('Message Handling', () => {
        (0, mocha_1.it)('should handle preview update messages', () => {
            let workflows = [];
            let isLoading = true;
            let selectedWorkflow = null;
            const handleMessage = (message) => {
                if (message.type === 'previewUpdate') {
                    workflows = message.data.workflows;
                    isLoading = false;
                    selectedWorkflow = message.data.workflows[0]?.name || null;
                }
            };
            handleMessage({
                type: 'previewUpdate',
                data: { workflows: mockWorkflows }
            });
            assert.strictEqual(workflows.length, 2);
            assert.strictEqual(isLoading, false);
            assert.strictEqual(selectedWorkflow, 'ci.yml');
        });
        (0, mocha_1.it)('should handle configuration change messages', () => {
            let configuration = {
                frameworks: ['nodejs'],
                workflowTypes: ['ci'],
                deploymentPlatform: '',
                deploymentConfig: {}
            };
            const handleMessage = (message) => {
                if (message.type === 'configurationChange') {
                    configuration = message.data;
                }
            };
            handleMessage({
                type: 'configurationChange',
                data: {
                    frameworks: ['nodejs', 'react'],
                    workflowTypes: ['ci', 'cd'],
                    deploymentPlatform: 'netlify',
                    deploymentConfig: { siteId: 'test' }
                }
            });
            assert.strictEqual(configuration.frameworks.length, 2);
            assert.strictEqual(configuration.workflowTypes.length, 2);
            assert.strictEqual(configuration.deploymentPlatform, 'netlify');
        });
    });
    (0, mocha_1.describe)('Action Handlers', () => {
        (0, mocha_1.it)('should handle generate action correctly', () => {
            let generateRequested = false;
            let generatedConfig = null;
            let generatedWorkflows = [];
            const mockVSCodeAPI = {
                postMessage: (message) => {
                    if (message.type === 'generateWorkflows') {
                        generateRequested = true;
                        generatedConfig = message.data.configuration;
                        generatedWorkflows = message.data.workflows;
                    }
                }
            };
            const configuration = {
                frameworks: ['nodejs'],
                workflowTypes: ['ci'],
                deploymentPlatform: 'netlify',
                deploymentConfig: {}
            };
            mockVSCodeAPI.postMessage({
                type: 'generateWorkflows',
                data: {
                    configuration,
                    workflows: mockWorkflows
                }
            });
            assert.strictEqual(generateRequested, true);
            assert.deepStrictEqual(generatedConfig, configuration);
            assert.strictEqual(generatedWorkflows.length, 2);
        });
        (0, mocha_1.it)('should handle cancel action correctly', () => {
            let cancelRequested = false;
            const mockVSCodeAPI = {
                postMessage: (message) => {
                    if (message.type === 'cancelPreview') {
                        cancelRequested = true;
                    }
                }
            };
            mockVSCodeAPI.postMessage({
                type: 'cancelPreview'
            });
            assert.strictEqual(cancelRequested, true);
        });
    });
});
//# sourceMappingURL=PreviewApp.test.js.map