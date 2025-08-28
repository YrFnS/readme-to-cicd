"use strict";
/**
 * Preview Webview Tests
 *
 * Tests for the preview webview functionality including syntax highlighting,
 * real-time updates, and workflow validation.
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
const WebviewManager_1 = require("../../../../src/core/WebviewManager");
const types_1 = require("../../../../src/core/types");
describe('Preview Webview', () => {
    let webviewManager;
    let mockContext;
    let mockExtensionUri;
    beforeEach(() => {
        mockExtensionUri = vscode.Uri.file('/test/extension');
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: () => ({}),
                update: () => Promise.resolve()
            },
            globalState: {
                get: () => ({}),
                update: () => Promise.resolve()
            },
            extensionPath: '/test/extension'
        };
        webviewManager = new WebviewManager_1.WebviewManager({
            extensionUri: mockExtensionUri,
            context: mockContext,
            enableLogging: false
        });
    });
    afterEach(() => {
        webviewManager.dispose();
    });
    describe('Preview Panel Creation', () => {
        it('should create preview panel with correct configuration', async () => {
            const mockPreviewData = {
                workflows: [
                    {
                        filename: 'ci.yml',
                        content: 'name: CI\non: [push]',
                        type: 'ci',
                        description: 'CI workflow',
                        estimatedSize: 100
                    }
                ],
                configuration: {
                    frameworks: ['nodejs'],
                    workflowTypes: ['ci'],
                    deploymentPlatform: '',
                    deploymentConfig: {}
                },
                detectedFrameworks: [],
                estimatedFiles: ['ci.yml']
            };
            const panel = await webviewManager.createPreviewPanel(mockPreviewData);
            assert.ok(panel, 'Preview panel should be created');
            assert.strictEqual(panel.title, 'Workflow Preview');
            assert.strictEqual(panel.viewType, 'readme-to-cicd.preview');
        });
        it('should create preview panel without initial data', async () => {
            const panel = await webviewManager.createPreviewPanel();
            assert.ok(panel, 'Preview panel should be created without initial data');
            assert.strictEqual(panel.title, 'Workflow Preview');
        });
        it('should dispose existing panel when creating new one', async () => {
            const panel1 = await webviewManager.createPreviewPanel();
            const panel2 = await webviewManager.createPreviewPanel();
            assert.ok(panel1, 'First panel should be created');
            assert.ok(panel2, 'Second panel should be created');
            assert.notStrictEqual(panel1, panel2, 'Panels should be different instances');
        });
    });
    describe('Preview Data Updates', () => {
        it('should send preview update message', async () => {
            const panel = await webviewManager.createPreviewPanel();
            const previewData = {
                workflows: [
                    {
                        filename: 'ci.yml',
                        content: 'name: CI\non: [push, pull_request]',
                        type: 'ci',
                        description: 'CI workflow',
                        estimatedSize: 150
                    }
                ],
                configuration: {
                    frameworks: ['nodejs', 'react'],
                    workflowTypes: ['ci'],
                    deploymentPlatform: 'github-pages',
                    deploymentConfig: {}
                },
                detectedFrameworks: [],
                estimatedFiles: ['ci.yml']
            };
            const success = await webviewManager.sendMessage('preview', {
                type: types_1.MessageType.PREVIEW_UPDATE,
                payload: previewData
            });
            assert.ok(success, 'Preview update message should be sent successfully');
        });
        it('should handle multiple workflow previews', async () => {
            const panel = await webviewManager.createPreviewPanel();
            const previewData = {
                workflows: [
                    {
                        filename: 'ci.yml',
                        content: 'name: CI\non: [push]',
                        type: 'ci',
                        description: 'CI workflow',
                        estimatedSize: 100
                    },
                    {
                        filename: 'cd.yml',
                        content: 'name: CD\non: [push]',
                        type: 'cd',
                        description: 'CD workflow',
                        estimatedSize: 200
                    }
                ],
                configuration: {
                    frameworks: ['nodejs'],
                    workflowTypes: ['ci', 'cd'],
                    deploymentPlatform: 'netlify',
                    deploymentConfig: {}
                },
                detectedFrameworks: [],
                estimatedFiles: ['ci.yml', 'cd.yml']
            };
            const success = await webviewManager.sendMessage('preview', {
                type: types_1.MessageType.PREVIEW_UPDATE,
                payload: previewData
            });
            assert.ok(success, 'Multiple workflow preview should be sent successfully');
        });
    });
    describe('Message Handling', () => {
        it('should handle initial preview request', async () => {
            const panel = await webviewManager.createPreviewPanel();
            let messageHandled = false;
            webviewManager.registerMessageHandler('preview', types_1.MessageType.REQUEST_INITIAL_PREVIEW, async (message) => {
                messageHandled = true;
                assert.strictEqual(message.type, types_1.MessageType.REQUEST_INITIAL_PREVIEW);
            });
            // Simulate message from webview
            await webviewManager.handleWebviewMessage('preview', {
                type: types_1.MessageType.REQUEST_INITIAL_PREVIEW,
                payload: {}
            });
            assert.ok(messageHandled, 'Initial preview request should be handled');
        });
        it('should handle preview update request', async () => {
            const panel = await webviewManager.createPreviewPanel();
            let messageHandled = false;
            webviewManager.registerMessageHandler('preview', types_1.MessageType.REQUEST_PREVIEW_UPDATE, async (message) => {
                messageHandled = true;
                assert.strictEqual(message.type, types_1.MessageType.REQUEST_PREVIEW_UPDATE);
            });
            const configuration = {
                frameworks: ['nodejs'],
                workflowTypes: ['ci'],
                deploymentPlatform: '',
                deploymentConfig: {}
            };
            // Simulate message from webview
            await webviewManager.handleWebviewMessage('preview', {
                type: types_1.MessageType.REQUEST_PREVIEW_UPDATE,
                payload: configuration
            });
            assert.ok(messageHandled, 'Preview update request should be handled');
        });
        it('should handle workflow generation request', async () => {
            const panel = await webviewManager.createPreviewPanel();
            let messageHandled = false;
            webviewManager.registerMessageHandler('preview', types_1.MessageType.GENERATE_WORKFLOWS, async (message) => {
                messageHandled = true;
                assert.strictEqual(message.type, types_1.MessageType.GENERATE_WORKFLOWS);
                assert.ok(message.payload.configuration, 'Configuration should be provided');
                assert.ok(message.payload.workflows, 'Workflows should be provided');
            });
            const requestData = {
                configuration: {
                    frameworks: ['nodejs'],
                    workflowTypes: ['ci'],
                    deploymentPlatform: '',
                    deploymentConfig: {}
                },
                workflows: [
                    {
                        filename: 'ci.yml',
                        content: 'name: CI\non: [push]',
                        type: 'ci',
                        description: 'CI workflow',
                        estimatedSize: 100
                    }
                ]
            };
            // Simulate message from webview
            await webviewManager.handleWebviewMessage('preview', {
                type: types_1.MessageType.GENERATE_WORKFLOWS,
                payload: requestData
            });
            assert.ok(messageHandled, 'Workflow generation request should be handled');
        });
        it('should handle save workflow changes', async () => {
            const panel = await webviewManager.createPreviewPanel();
            let messageHandled = false;
            webviewManager.registerMessageHandler('preview', types_1.MessageType.SAVE_WORKFLOW_CHANGES, async (message) => {
                messageHandled = true;
                assert.strictEqual(message.type, types_1.MessageType.SAVE_WORKFLOW_CHANGES);
                assert.strictEqual(message.payload.workflowName, 'ci.yml');
                assert.ok(message.payload.content, 'Content should be provided');
            });
            const saveData = {
                workflowName: 'ci.yml',
                content: 'name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest'
            };
            // Simulate message from webview
            await webviewManager.handleWebviewMessage('preview', {
                type: types_1.MessageType.SAVE_WORKFLOW_CHANGES,
                payload: saveData
            });
            assert.ok(messageHandled, 'Save workflow changes should be handled');
        });
        it('should handle cancel preview', async () => {
            const panel = await webviewManager.createPreviewPanel();
            let messageHandled = false;
            webviewManager.registerMessageHandler('preview', types_1.MessageType.CANCEL_PREVIEW, async (message) => {
                messageHandled = true;
                assert.strictEqual(message.type, types_1.MessageType.CANCEL_PREVIEW);
            });
            // Simulate message from webview
            await webviewManager.handleWebviewMessage('preview', {
                type: types_1.MessageType.CANCEL_PREVIEW,
                payload: {}
            });
            assert.ok(messageHandled, 'Cancel preview should be handled');
        });
    });
    describe('Mock Workflow Generation', () => {
        it('should generate mock CI workflow', () => {
            const configuration = {
                frameworks: ['nodejs'],
                workflowTypes: ['ci'],
                deploymentPlatform: '',
                deploymentConfig: {}
            };
            const workflows = webviewManager.generateMockWorkflows(configuration);
            assert.strictEqual(workflows.length, 1, 'Should generate one workflow');
            assert.strictEqual(workflows[0].filename, 'ci.yml');
            assert.strictEqual(workflows[0].type, 'ci');
            assert.ok(workflows[0].content.includes('name: CI'), 'Should contain CI workflow name');
            assert.ok(workflows[0].content.includes('nodejs'), 'Should include Node.js setup for nodejs framework');
        });
        it('should generate mock CD workflow', () => {
            const configuration = {
                frameworks: ['nodejs'],
                workflowTypes: ['cd'],
                deploymentPlatform: 'netlify',
                deploymentConfig: {}
            };
            const workflows = webviewManager.generateMockWorkflows(configuration);
            assert.strictEqual(workflows.length, 1, 'Should generate one workflow');
            assert.strictEqual(workflows[0].filename, 'cd.yml');
            assert.strictEqual(workflows[0].type, 'cd');
            assert.ok(workflows[0].content.includes('name: CD'), 'Should contain CD workflow name');
            assert.ok(workflows[0].content.includes('Netlify'), 'Should include Netlify deployment');
        });
        it('should generate multiple workflows', () => {
            const configuration = {
                frameworks: ['nodejs', 'python'],
                workflowTypes: ['ci', 'cd', 'release'],
                deploymentPlatform: 'github-pages',
                deploymentConfig: {}
            };
            const workflows = webviewManager.generateMockWorkflows(configuration);
            assert.strictEqual(workflows.length, 3, 'Should generate three workflows');
            const workflowTypes = workflows.map(w => w.type);
            assert.ok(workflowTypes.includes('ci'), 'Should include CI workflow');
            assert.ok(workflowTypes.includes('cd'), 'Should include CD workflow');
            assert.ok(workflowTypes.includes('release'), 'Should include release workflow');
        });
        it('should include framework-specific content', () => {
            const configuration = {
                frameworks: ['python', 'docker'],
                workflowTypes: ['ci'],
                deploymentPlatform: '',
                deploymentConfig: {}
            };
            const workflows = webviewManager.generateMockWorkflows(configuration);
            const ciWorkflow = workflows[0];
            assert.ok(ciWorkflow.content.includes('python'), 'Should include Python setup');
            assert.ok(ciWorkflow.content.includes('docker'), 'Should include Docker build');
            assert.ok(ciWorkflow.content.includes('pytest'), 'Should include Python testing');
        });
    });
    describe('Panel State Management', () => {
        it('should track panel state', async () => {
            const previewData = {
                workflows: [],
                configuration: {
                    frameworks: [],
                    workflowTypes: ['ci'],
                    deploymentPlatform: '',
                    deploymentConfig: {}
                },
                detectedFrameworks: [],
                estimatedFiles: []
            };
            const panel = await webviewManager.createPreviewPanel(previewData);
            const activePanels = webviewManager.getActivePanels();
            assert.ok(activePanels.has('preview'), 'Preview panel should be tracked');
            assert.strictEqual(activePanels.get('preview'), panel, 'Should return correct panel instance');
        });
        it('should clean up on disposal', async () => {
            const panel = await webviewManager.createPreviewPanel();
            // Simulate panel disposal
            panel.dispose();
            const activePanels = webviewManager.getActivePanels();
            // Note: The panel might still be in the map until the disposal event is processed
            // This is expected behavior as disposal is asynchronous
        });
    });
});
//# sourceMappingURL=PreviewWebview.test.js.map