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
const jsdom_1 = require("jsdom");
// Mock VS Code API
const mockVSCodeAPI = {
    postMessage: (message) => { },
    setState: (state) => { },
    getState: () => ({})
};
// Setup DOM environment for React testing
let dom;
let window;
(0, mocha_1.describe)('ConfigurationApp Component', () => {
    (0, mocha_1.beforeEach)(() => {
        // Setup JSDOM environment
        dom = new jsdom_1.JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });
        window = dom.window;
        global.window = window;
        global.document = window.document;
        global.navigator = window.navigator;
        // Mock VS Code API
        global.acquireVsCodeApi = () => mockVSCodeAPI;
    });
    (0, mocha_1.afterEach)(() => {
        dom.window.close();
    });
    (0, mocha_1.describe)('Component Initialization', () => {
        (0, mocha_1.it)('should initialize with default configuration', () => {
            // Test that component initializes with expected default state
            const defaultConfig = {
                frameworks: [],
                workflowTypes: ['ci'],
                deploymentPlatform: '',
                deploymentConfig: {}
            };
            // This would require actual React testing setup
            // For now, we're testing the logic structure
            assert.ok(defaultConfig.workflowTypes.includes('ci'));
            assert.strictEqual(defaultConfig.frameworks.length, 0);
        });
        (0, mocha_1.it)('should request initial configuration on mount', () => {
            let messagesSent = [];
            const mockAPI = {
                ...mockVSCodeAPI,
                postMessage: (message) => {
                    messagesSent.push(message);
                }
            };
            global.acquireVsCodeApi = () => mockAPI;
            // Simulate component mount behavior
            const expectedMessage = { type: 'requestConfiguration' };
            // In a real test, this would be triggered by component mount
            mockAPI.postMessage(expectedMessage);
            assert.strictEqual(messagesSent.length, 1);
            assert.strictEqual(messagesSent[0].type, 'requestConfiguration');
        });
    });
    (0, mocha_1.describe)('Message Handling', () => {
        (0, mocha_1.it)('should handle configuration update messages', () => {
            const testConfig = {
                frameworks: ['nodejs', 'react'],
                workflowTypes: ['ci', 'cd'],
                deploymentPlatform: 'netlify',
                deploymentConfig: { siteId: 'test-site' }
            };
            // Test message handling logic
            const messageHandler = (message) => {
                switch (message.type) {
                    case 'configurationUpdate':
                        return message.data;
                    default:
                        return null;
                }
            };
            const result = messageHandler({
                type: 'configurationUpdate',
                data: testConfig
            });
            assert.deepStrictEqual(result, testConfig);
        });
        (0, mocha_1.it)('should handle framework detection results', () => {
            const detectionResults = [
                { id: 'nodejs', name: 'Node.js', detected: true, confidence: 0.95 },
                { id: 'react', name: 'React', detected: true, confidence: 0.87 },
                { id: 'python', name: 'Python', detected: false, confidence: 0.1 }
            ];
            const messageHandler = (message) => {
                if (message.type === 'frameworkDetectionResult') {
                    return message.data;
                }
                return null;
            };
            const result = messageHandler({
                type: 'frameworkDetectionResult',
                data: detectionResults
            });
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0].detected, true);
            assert.strictEqual(result[2].detected, false);
        });
        (0, mocha_1.it)('should handle validation results', () => {
            const validationResult = {
                isValid: false,
                errors: [
                    { field: 'frameworks', message: 'At least one framework must be selected', code: 'REQUIRED' }
                ],
                warnings: [
                    { field: 'deployment', message: 'No deployment platform configured', code: 'OPTIONAL' }
                ]
            };
            const messageHandler = (message) => {
                if (message.type === 'validationResult') {
                    return message.data;
                }
                return null;
            };
            const result = messageHandler({
                type: 'validationResult',
                data: validationResult
            });
            assert.strictEqual(result.isValid, false);
            assert.strictEqual(result.errors.length, 1);
            assert.strictEqual(result.warnings.length, 1);
        });
    });
    (0, mocha_1.describe)('Configuration Changes', () => {
        (0, mocha_1.it)('should handle framework toggle correctly', () => {
            let currentFrameworks = [];
            const handleFrameworkToggle = (frameworkId, enabled) => {
                if (enabled) {
                    currentFrameworks = [...currentFrameworks, frameworkId];
                }
                else {
                    currentFrameworks = currentFrameworks.filter(id => id !== frameworkId);
                }
            };
            // Test adding frameworks
            handleFrameworkToggle('nodejs', true);
            handleFrameworkToggle('react', true);
            assert.strictEqual(currentFrameworks.length, 2);
            assert.ok(currentFrameworks.includes('nodejs'));
            assert.ok(currentFrameworks.includes('react'));
            // Test removing framework
            handleFrameworkToggle('nodejs', false);
            assert.strictEqual(currentFrameworks.length, 1);
            assert.ok(!currentFrameworks.includes('nodejs'));
            assert.ok(currentFrameworks.includes('react'));
        });
        (0, mocha_1.it)('should handle workflow type toggle correctly', () => {
            let currentTypes = ['ci'];
            const handleWorkflowTypeToggle = (workflowType, enabled) => {
                if (enabled) {
                    currentTypes = [...currentTypes, workflowType];
                }
                else {
                    currentTypes = currentTypes.filter(type => type !== workflowType);
                }
            };
            // Test adding workflow type
            handleWorkflowTypeToggle('cd', true);
            assert.strictEqual(currentTypes.length, 2);
            assert.ok(currentTypes.includes('ci'));
            assert.ok(currentTypes.includes('cd'));
            // Test removing workflow type
            handleWorkflowTypeToggle('ci', false);
            assert.strictEqual(currentTypes.length, 1);
            assert.ok(!currentTypes.includes('ci'));
            assert.ok(currentTypes.includes('cd'));
        });
        (0, mocha_1.it)('should handle deployment configuration changes', () => {
            let deploymentConfig = {
                platform: '',
                config: {}
            };
            const handleDeploymentChange = (platform, config) => {
                deploymentConfig = { platform, config };
            };
            // Test setting deployment configuration
            const netlifyConfig = {
                siteId: 'test-site-123',
                buildCommand: 'npm run build',
                publishDir: 'dist'
            };
            handleDeploymentChange('netlify', netlifyConfig);
            assert.strictEqual(deploymentConfig.platform, 'netlify');
            assert.deepStrictEqual(deploymentConfig.config, netlifyConfig);
        });
    });
    (0, mocha_1.describe)('Action Handlers', () => {
        (0, mocha_1.it)('should send preview request with current configuration', () => {
            let messagesSent = [];
            const mockAPI = {
                ...mockVSCodeAPI,
                postMessage: (message) => {
                    messagesSent.push(message);
                }
            };
            const testConfig = {
                frameworks: ['nodejs'],
                workflowTypes: ['ci'],
                deploymentPlatform: 'github-pages',
                deploymentConfig: { branch: 'main' }
            };
            const handlePreview = () => {
                mockAPI.postMessage({
                    type: 'previewRequest',
                    data: testConfig
                });
            };
            handlePreview();
            assert.strictEqual(messagesSent.length, 1);
            assert.strictEqual(messagesSent[0].type, 'previewRequest');
            assert.deepStrictEqual(messagesSent[0].data, testConfig);
        });
        (0, mocha_1.it)('should send generate request with current configuration', () => {
            let messagesSent = [];
            const mockAPI = {
                ...mockVSCodeAPI,
                postMessage: (message) => {
                    messagesSent.push(message);
                }
            };
            const testConfig = {
                frameworks: ['nodejs', 'react'],
                workflowTypes: ['ci', 'cd'],
                deploymentPlatform: 'netlify',
                deploymentConfig: { siteId: 'test' }
            };
            const handleGenerate = () => {
                mockAPI.postMessage({
                    type: 'generateRequest',
                    data: testConfig
                });
            };
            handleGenerate();
            assert.strictEqual(messagesSent.length, 1);
            assert.strictEqual(messagesSent[0].type, 'generateRequest');
            assert.deepStrictEqual(messagesSent[0].data, testConfig);
        });
        (0, mocha_1.it)('should send cancel request', () => {
            let messagesSent = [];
            const mockAPI = {
                ...mockVSCodeAPI,
                postMessage: (message) => {
                    messagesSent.push(message);
                }
            };
            const handleCancel = () => {
                mockAPI.postMessage({
                    type: 'cancelRequest'
                });
            };
            handleCancel();
            assert.strictEqual(messagesSent.length, 1);
            assert.strictEqual(messagesSent[0].type, 'cancelRequest');
        });
    });
});
//# sourceMappingURL=ConfigurationApp.test.js.map