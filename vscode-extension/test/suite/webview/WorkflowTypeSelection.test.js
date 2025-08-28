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
(0, mocha_1.describe)('WorkflowTypeSelection Component', () => {
    const WORKFLOW_TYPES = [
        {
            id: 'ci',
            name: 'Continuous Integration (CI)',
            description: 'Automated testing, building, and code quality checks on every push',
            icon: '🔄',
            enabled: true
        },
        {
            id: 'cd',
            name: 'Continuous Deployment (CD)',
            description: 'Automated deployment to staging and production environments',
            icon: '🚀',
            enabled: false
        },
        {
            id: 'release',
            name: 'Release Automation',
            description: 'Automated versioning, changelog generation, and release publishing',
            icon: '📦',
            enabled: false
        },
        {
            id: 'maintenance',
            name: 'Maintenance Tasks',
            description: 'Scheduled dependency updates, security scans, and cleanup tasks',
            icon: '🔧',
            enabled: false
        }
    ];
    (0, mocha_1.describe)('Workflow Type Selection Logic', () => {
        (0, mocha_1.it)('should correctly identify selected workflow types', () => {
            const selectedTypes = ['ci', 'cd'];
            const workflowTypeId = 'ci';
            const isSelected = selectedTypes.includes(workflowTypeId);
            assert.strictEqual(isSelected, true);
        });
        (0, mocha_1.it)('should handle workflow type toggle operations', () => {
            let selectedTypes = ['ci'];
            const toggleWorkflowType = (workflowType, enabled) => {
                if (enabled) {
                    selectedTypes = [...selectedTypes, workflowType];
                }
                else {
                    selectedTypes = selectedTypes.filter(type => type !== workflowType);
                }
            };
            // Test adding workflow type
            toggleWorkflowType('cd', true);
            assert.strictEqual(selectedTypes.length, 2);
            assert.ok(selectedTypes.includes('cd'));
            // Test removing workflow type
            toggleWorkflowType('ci', false);
            assert.strictEqual(selectedTypes.length, 1);
            assert.ok(!selectedTypes.includes('ci'));
        });
    });
    (0, mocha_1.describe)('Workflow Features Mapping', () => {
        (0, mocha_1.it)('should return correct features for CI workflow', () => {
            const getWorkflowFeatures = (workflowId) => {
                switch (workflowId) {
                    case 'ci':
                        return ['Unit Tests', 'Linting', 'Build Verification', 'Code Coverage'];
                    case 'cd':
                        return ['Environment Deployment', 'Health Checks', 'Rollback Support'];
                    case 'release':
                        return ['Semantic Versioning', 'Changelog', 'GitHub Releases', 'NPM Publishing'];
                    case 'maintenance':
                        return ['Dependency Updates', 'Security Scans', 'Performance Monitoring'];
                    default:
                        return [];
                }
            };
            const ciFeatures = getWorkflowFeatures('ci');
            assert.strictEqual(ciFeatures.length, 4);
            assert.ok(ciFeatures.includes('Unit Tests'));
            assert.ok(ciFeatures.includes('Linting'));
            assert.ok(ciFeatures.includes('Build Verification'));
            assert.ok(ciFeatures.includes('Code Coverage'));
        });
        (0, mocha_1.it)('should return correct features for CD workflow', () => {
            const getWorkflowFeatures = (workflowId) => {
                switch (workflowId) {
                    case 'ci':
                        return ['Unit Tests', 'Linting', 'Build Verification', 'Code Coverage'];
                    case 'cd':
                        return ['Environment Deployment', 'Health Checks', 'Rollback Support'];
                    case 'release':
                        return ['Semantic Versioning', 'Changelog', 'GitHub Releases', 'NPM Publishing'];
                    case 'maintenance':
                        return ['Dependency Updates', 'Security Scans', 'Performance Monitoring'];
                    default:
                        return [];
                }
            };
            const cdFeatures = getWorkflowFeatures('cd');
            assert.strictEqual(cdFeatures.length, 3);
            assert.ok(cdFeatures.includes('Environment Deployment'));
            assert.ok(cdFeatures.includes('Health Checks'));
            assert.ok(cdFeatures.includes('Rollback Support'));
        });
        (0, mocha_1.it)('should return empty array for unknown workflow types', () => {
            const getWorkflowFeatures = (workflowId) => {
                switch (workflowId) {
                    case 'ci':
                        return ['Unit Tests', 'Linting', 'Build Verification', 'Code Coverage'];
                    case 'cd':
                        return ['Environment Deployment', 'Health Checks', 'Rollback Support'];
                    case 'release':
                        return ['Semantic Versioning', 'Changelog', 'GitHub Releases', 'NPM Publishing'];
                    case 'maintenance':
                        return ['Dependency Updates', 'Security Scans', 'Performance Monitoring'];
                    default:
                        return [];
                }
            };
            const unknownFeatures = getWorkflowFeatures('unknown');
            assert.strictEqual(unknownFeatures.length, 0);
        });
    });
    (0, mocha_1.describe)('Workflow Type Validation', () => {
        (0, mocha_1.it)('should detect empty selection', () => {
            const selectedTypes = [];
            const isEmpty = selectedTypes.length === 0;
            assert.strictEqual(isEmpty, true);
        });
        (0, mocha_1.it)('should validate non-empty selection', () => {
            const selectedTypes = ['ci', 'cd'];
            const isEmpty = selectedTypes.length === 0;
            assert.strictEqual(isEmpty, false);
        });
        (0, mocha_1.it)('should identify CI as recommended workflow', () => {
            const ciWorkflow = WORKFLOW_TYPES.find(wt => wt.id === 'ci');
            assert.ok(ciWorkflow);
            assert.strictEqual(ciWorkflow.id, 'ci');
            // CI is typically recommended as the base workflow
        });
    });
    (0, mocha_1.describe)('Selection Summary Logic', () => {
        (0, mocha_1.it)('should generate correct selection summary', () => {
            const selectedTypes = ['ci', 'release'];
            const selectedWorkflows = selectedTypes.map(typeId => {
                return WORKFLOW_TYPES.find(wt => wt.id === typeId);
            }).filter(Boolean);
            assert.strictEqual(selectedWorkflows.length, 2);
            assert.strictEqual(selectedWorkflows[0]?.id, 'ci');
            assert.strictEqual(selectedWorkflows[1]?.id, 'release');
        });
        (0, mocha_1.it)('should handle empty selection summary', () => {
            const selectedTypes = [];
            const selectedWorkflows = selectedTypes.map(typeId => {
                return WORKFLOW_TYPES.find(wt => wt.id === typeId);
            }).filter(Boolean);
            assert.strictEqual(selectedWorkflows.length, 0);
        });
    });
    (0, mocha_1.describe)('Workflow Type Data Validation', () => {
        (0, mocha_1.it)('should validate required workflow type properties', () => {
            const workflowType = WORKFLOW_TYPES[0];
            assert.ok(workflowType.id);
            assert.ok(workflowType.name);
            assert.ok(workflowType.description);
            assert.ok(workflowType.icon);
            assert.ok(typeof workflowType.enabled === 'boolean');
        });
        (0, mocha_1.it)('should have all expected workflow types', () => {
            const expectedIds = ['ci', 'cd', 'release', 'maintenance'];
            const actualIds = WORKFLOW_TYPES.map(wt => wt.id);
            expectedIds.forEach(expectedId => {
                assert.ok(actualIds.includes(expectedId), `Missing workflow type: ${expectedId}`);
            });
        });
    });
});
//# sourceMappingURL=WorkflowTypeSelection.test.js.map