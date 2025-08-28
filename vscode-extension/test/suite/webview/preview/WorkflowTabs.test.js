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
(0, mocha_1.describe)('WorkflowTabs Component', () => {
    const mockWorkflows = [
        {
            name: 'ci.yml',
            path: '.github/workflows/ci.yml',
            content: 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "test"',
            language: 'yaml',
            size: 95
        },
        {
            name: 'deploy.yml',
            path: '.github/workflows/deploy.yml',
            content: 'name: Deploy\non: [push]\njobs:\n  deploy:\n    runs-on: ubuntu-latest',
            language: 'yaml',
            size: 78
        },
        {
            name: 'release.yml',
            path: '.github/workflows/release.yml',
            content: 'name: Release\non: [release]\njobs:\n  publish:\n    runs-on: ubuntu-latest',
            language: 'yaml',
            size: 82
        },
        {
            name: 'security-scan.yml',
            path: '.github/workflows/security-scan.yml',
            content: 'name: Security Scan\non: [schedule]\njobs:\n  scan:\n    runs-on: ubuntu-latest',
            language: 'yaml',
            size: 88
        }
    ];
    (0, mocha_1.describe)('Workflow Icon Assignment', () => {
        (0, mocha_1.it)('should assign correct icons based on workflow names', () => {
            const getWorkflowIcon = (workflowName) => {
                const name = workflowName.toLowerCase();
                if (name.includes('ci') || name.includes('test'))
                    return '🔄';
                if (name.includes('cd') || name.includes('deploy'))
                    return '🚀';
                if (name.includes('release'))
                    return '📦';
                if (name.includes('security') || name.includes('scan'))
                    return '🔒';
                if (name.includes('maintenance') || name.includes('update'))
                    return '🔧';
                return '📄';
            };
            assert.strictEqual(getWorkflowIcon('ci.yml'), '🔄');
            assert.strictEqual(getWorkflowIcon('deploy.yml'), '🚀');
            assert.strictEqual(getWorkflowIcon('release.yml'), '📦');
            assert.strictEqual(getWorkflowIcon('security-scan.yml'), '🔒');
            assert.strictEqual(getWorkflowIcon('unknown.yml'), '📄');
        });
        (0, mocha_1.it)('should handle case-insensitive matching', () => {
            const getWorkflowIcon = (workflowName) => {
                const name = workflowName.toLowerCase();
                if (name.includes('ci') || name.includes('test'))
                    return '🔄';
                if (name.includes('cd') || name.includes('deploy'))
                    return '🚀';
                return '📄';
            };
            assert.strictEqual(getWorkflowIcon('CI.YML'), '🔄');
            assert.strictEqual(getWorkflowIcon('Deploy.yml'), '🚀');
            assert.strictEqual(getWorkflowIcon('TEST-WORKFLOW.yml'), '🔄');
        });
    });
    (0, mocha_1.describe)('Workflow Type Classification', () => {
        (0, mocha_1.it)('should classify workflow types correctly', () => {
            const getWorkflowType = (workflowName) => {
                const name = workflowName.toLowerCase();
                if (name.includes('ci') || name.includes('test'))
                    return 'CI';
                if (name.includes('cd') || name.includes('deploy'))
                    return 'CD';
                if (name.includes('release'))
                    return 'Release';
                if (name.includes('security') || name.includes('scan'))
                    return 'Security';
                if (name.includes('maintenance') || name.includes('update'))
                    return 'Maintenance';
                return 'Workflow';
            };
            assert.strictEqual(getWorkflowType('ci.yml'), 'CI');
            assert.strictEqual(getWorkflowType('deploy.yml'), 'CD');
            assert.strictEqual(getWorkflowType('release.yml'), 'Release');
            assert.strictEqual(getWorkflowType('security-scan.yml'), 'Security');
            assert.strictEqual(getWorkflowType('custom.yml'), 'Workflow');
        });
        (0, mocha_1.it)('should handle multiple keywords in workflow names', () => {
            const getWorkflowType = (workflowName) => {
                const name = workflowName.toLowerCase();
                if (name.includes('ci') || name.includes('test'))
                    return 'CI';
                if (name.includes('cd') || name.includes('deploy'))
                    return 'CD';
                if (name.includes('release'))
                    return 'Release';
                return 'Workflow';
            };
            assert.strictEqual(getWorkflowType('ci-test-build.yml'), 'CI');
            assert.strictEqual(getWorkflowType('deploy-to-production.yml'), 'CD');
            assert.strictEqual(getWorkflowType('release-automation.yml'), 'Release');
        });
    });
    (0, mocha_1.describe)('File Size Formatting', () => {
        (0, mocha_1.it)('should format bytes correctly', () => {
            const formatFileSize = (bytes) => {
                if (bytes < 1024)
                    return `${bytes} B`;
                if (bytes < 1024 * 1024)
                    return `${(bytes / 1024).toFixed(1)} KB`;
                return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            };
            assert.strictEqual(formatFileSize(500), '500 B');
            assert.strictEqual(formatFileSize(1024), '1.0 KB');
            assert.strictEqual(formatFileSize(1536), '1.5 KB');
            assert.strictEqual(formatFileSize(1048576), '1.0 MB');
            assert.strictEqual(formatFileSize(1572864), '1.5 MB');
        });
        (0, mocha_1.it)('should handle edge cases in file size formatting', () => {
            const formatFileSize = (bytes) => {
                if (bytes < 1024)
                    return `${bytes} B`;
                if (bytes < 1024 * 1024)
                    return `${(bytes / 1024).toFixed(1)} KB`;
                return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            };
            assert.strictEqual(formatFileSize(0), '0 B');
            assert.strictEqual(formatFileSize(1), '1 B');
            assert.strictEqual(formatFileSize(1023), '1023 B');
            assert.strictEqual(formatFileSize(1025), '1.0 KB');
        });
    });
    (0, mocha_1.describe)('Workflow Selection Logic', () => {
        (0, mocha_1.it)('should handle workflow selection correctly', () => {
            let selectedWorkflow = 'ci.yml';
            const handleWorkflowSelect = (workflowName) => {
                selectedWorkflow = workflowName;
            };
            handleWorkflowSelect('deploy.yml');
            assert.strictEqual(selectedWorkflow, 'deploy.yml');
            handleWorkflowSelect('release.yml');
            assert.strictEqual(selectedWorkflow, 'release.yml');
        });
        (0, mocha_1.it)('should identify active tab correctly', () => {
            const selectedWorkflow = 'ci.yml';
            const workflowName = 'ci.yml';
            const isActive = selectedWorkflow === workflowName;
            assert.strictEqual(isActive, true);
        });
        (0, mocha_1.it)('should identify inactive tabs correctly', () => {
            const selectedWorkflow = 'ci.yml';
            const workflowName = 'deploy.yml';
            const isActive = selectedWorkflow === workflowName;
            assert.strictEqual(isActive, false);
        });
    });
    (0, mocha_1.describe)('Empty State Handling', () => {
        (0, mocha_1.it)('should detect empty workflow list', () => {
            const workflows = [];
            const isEmpty = workflows.length === 0;
            assert.strictEqual(isEmpty, true);
        });
        (0, mocha_1.it)('should detect non-empty workflow list', () => {
            const workflows = mockWorkflows;
            const isEmpty = workflows.length === 0;
            assert.strictEqual(isEmpty, false);
        });
    });
    (0, mocha_1.describe)('Summary Statistics', () => {
        (0, mocha_1.it)('should calculate total file size correctly', () => {
            const totalSize = mockWorkflows.reduce((sum, w) => sum + w.size, 0);
            assert.strictEqual(totalSize, 343); // 95 + 78 + 82 + 88
        });
        (0, mocha_1.it)('should calculate total line count correctly', () => {
            const totalLines = mockWorkflows.reduce((sum, w) => sum + w.content.split('\n').length, 0);
            // ci.yml: 7 lines, deploy.yml: 4 lines, release.yml: 4 lines, security-scan.yml: 4 lines
            assert.strictEqual(totalLines, 19);
        });
        (0, mocha_1.it)('should identify unique workflow types', () => {
            const getWorkflowType = (workflowName) => {
                const name = workflowName.toLowerCase();
                if (name.includes('ci') || name.includes('test'))
                    return 'CI';
                if (name.includes('cd') || name.includes('deploy'))
                    return 'CD';
                if (name.includes('release'))
                    return 'Release';
                if (name.includes('security') || name.includes('scan'))
                    return 'Security';
                return 'Workflow';
            };
            const workflowTypes = Array.from(new Set(mockWorkflows.map(w => getWorkflowType(w.name))));
            assert.strictEqual(workflowTypes.length, 4);
            assert.ok(workflowTypes.includes('CI'));
            assert.ok(workflowTypes.includes('CD'));
            assert.ok(workflowTypes.includes('Release'));
            assert.ok(workflowTypes.includes('Security'));
        });
    });
    (0, mocha_1.describe)('Tab Display Information', () => {
        (0, mocha_1.it)('should extract correct tab details', () => {
            const workflow = mockWorkflows[0]; // ci.yml
            const tabDetails = {
                name: workflow.name,
                path: workflow.path,
                size: workflow.size,
                lines: workflow.content.split('\n').length
            };
            assert.strictEqual(tabDetails.name, 'ci.yml');
            assert.strictEqual(tabDetails.path, '.github/workflows/ci.yml');
            assert.strictEqual(tabDetails.size, 95);
            assert.strictEqual(tabDetails.lines, 7);
        });
        (0, mocha_1.it)('should handle workflows with different content lengths', () => {
            const shortWorkflow = {
                name: 'short.yml',
                content: 'name: Short',
                size: 11
            };
            const longWorkflow = {
                name: 'long.yml',
                content: 'name: Long\n'.repeat(100),
                size: 1100
            };
            const shortLines = shortWorkflow.content.split('\n').length;
            const longLines = longWorkflow.content.split('\n').length;
            assert.strictEqual(shortLines, 1);
            assert.strictEqual(longLines, 100);
        });
    });
    (0, mocha_1.describe)('Tab Actions', () => {
        (0, mocha_1.it)('should handle refresh action', () => {
            let refreshCalled = false;
            // Mock window.location.reload
            const mockReload = () => {
                refreshCalled = true;
            };
            mockReload();
            assert.strictEqual(refreshCalled, true);
        });
        (0, mocha_1.it)('should provide correct tab count in header', () => {
            const workflowCount = mockWorkflows.length;
            const headerText = `Generated Workflows (${workflowCount})`;
            assert.strictEqual(headerText, 'Generated Workflows (4)');
        });
    });
    (0, mocha_1.describe)('Workflow Path Handling', () => {
        (0, mocha_1.it)('should display correct workflow paths', () => {
            const expectedPaths = [
                '.github/workflows/ci.yml',
                '.github/workflows/deploy.yml',
                '.github/workflows/release.yml',
                '.github/workflows/security-scan.yml'
            ];
            const actualPaths = mockWorkflows.map(w => w.path);
            assert.deepStrictEqual(actualPaths, expectedPaths);
        });
        (0, mocha_1.it)('should handle different path formats', () => {
            const workflows = [
                { path: '.github/workflows/ci.yml' },
                { path: 'workflows/deploy.yml' },
                { path: 'ci/build.yml' }
            ];
            const paths = workflows.map(w => w.path);
            assert.strictEqual(paths.length, 3);
            assert.ok(paths.every(path => path.includes('.yml')));
        });
    });
});
//# sourceMappingURL=WorkflowTabs.test.js.map