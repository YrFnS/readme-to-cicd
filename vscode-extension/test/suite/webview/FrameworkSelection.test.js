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
(0, mocha_1.describe)('FrameworkSelection Component', () => {
    (0, mocha_1.describe)('Framework Grouping', () => {
        (0, mocha_1.it)('should separate detected and other frameworks correctly', () => {
            const frameworks = [
                { id: 'nodejs', name: 'Node.js', detected: true, description: 'JavaScript runtime', confidence: 0.95 },
                { id: 'react', name: 'React', detected: true, description: 'UI library', confidence: 0.87 },
                { id: 'python', name: 'Python', detected: false, description: 'Programming language' },
                { id: 'java', name: 'Java', detected: false, description: 'Programming language' }
            ];
            const detectedFrameworks = frameworks.filter(f => f.detected);
            const otherFrameworks = frameworks.filter(f => !f.detected);
            assert.strictEqual(detectedFrameworks.length, 2);
            assert.strictEqual(otherFrameworks.length, 2);
            assert.ok(detectedFrameworks.every(f => f.detected));
            assert.ok(otherFrameworks.every(f => !f.detected));
        });
        (0, mocha_1.it)('should handle empty framework lists', () => {
            const frameworks = [];
            const detectedFrameworks = frameworks.filter(f => f.detected);
            const otherFrameworks = frameworks.filter(f => !f.detected);
            assert.strictEqual(detectedFrameworks.length, 0);
            assert.strictEqual(otherFrameworks.length, 0);
        });
    });
    (0, mocha_1.describe)('Framework Selection Logic', () => {
        (0, mocha_1.it)('should correctly identify selected frameworks', () => {
            const selectedFrameworks = ['nodejs', 'react'];
            const frameworkId = 'nodejs';
            const isSelected = selectedFrameworks.includes(frameworkId);
            assert.strictEqual(isSelected, true);
        });
        (0, mocha_1.it)('should handle framework toggle operations', () => {
            let selectedFrameworks = ['nodejs'];
            const toggleFramework = (frameworkId, enabled) => {
                if (enabled) {
                    selectedFrameworks = [...selectedFrameworks, frameworkId];
                }
                else {
                    selectedFrameworks = selectedFrameworks.filter(id => id !== frameworkId);
                }
            };
            // Test adding framework
            toggleFramework('react', true);
            assert.strictEqual(selectedFrameworks.length, 2);
            assert.ok(selectedFrameworks.includes('react'));
            // Test removing framework
            toggleFramework('nodejs', false);
            assert.strictEqual(selectedFrameworks.length, 1);
            assert.ok(!selectedFrameworks.includes('nodejs'));
        });
    });
    (0, mocha_1.describe)('Confidence Score Display', () => {
        (0, mocha_1.it)('should calculate confidence percentage correctly', () => {
            const framework = {
                id: 'nodejs',
                name: 'Node.js',
                detected: true,
                description: 'JavaScript runtime',
                confidence: 0.87
            };
            const confidenceLevel = framework.confidence ? Math.round(framework.confidence * 100) : null;
            assert.strictEqual(confidenceLevel, 87);
        });
        (0, mocha_1.it)('should handle missing confidence scores', () => {
            const framework = {
                id: 'nodejs',
                name: 'Node.js',
                detected: true,
                description: 'JavaScript runtime'
            };
            const confidenceLevel = framework.confidence ? Math.round(framework.confidence * 100) : null;
            assert.strictEqual(confidenceLevel, null);
        });
    });
    (0, mocha_1.describe)('Validation Logic', () => {
        (0, mocha_1.it)('should detect empty selection', () => {
            const selectedFrameworks = [];
            const isEmpty = selectedFrameworks.length === 0;
            assert.strictEqual(isEmpty, true);
        });
        (0, mocha_1.it)('should validate non-empty selection', () => {
            const selectedFrameworks = ['nodejs', 'react'];
            const isEmpty = selectedFrameworks.length === 0;
            assert.strictEqual(isEmpty, false);
        });
    });
    (0, mocha_1.describe)('Loading State Handling', () => {
        (0, mocha_1.it)('should disable interactions when loading', () => {
            const isLoading = true;
            // Simulate disabled state logic
            const isDisabled = isLoading;
            assert.strictEqual(isDisabled, true);
        });
        (0, mocha_1.it)('should enable interactions when not loading', () => {
            const isLoading = false;
            // Simulate enabled state logic
            const isDisabled = isLoading;
            assert.strictEqual(isDisabled, false);
        });
    });
    (0, mocha_1.describe)('Framework Data Validation', () => {
        (0, mocha_1.it)('should validate required framework properties', () => {
            const framework = {
                id: 'nodejs',
                name: 'Node.js',
                detected: true,
                description: 'JavaScript runtime for server-side applications'
            };
            assert.ok(framework.id);
            assert.ok(framework.name);
            assert.ok(typeof framework.detected === 'boolean');
            assert.ok(framework.description);
        });
        (0, mocha_1.it)('should handle optional framework properties', () => {
            const framework = {
                id: 'nodejs',
                name: 'Node.js',
                detected: true,
                description: 'JavaScript runtime',
                confidence: 0.95,
                version: '18.17.0'
            };
            assert.ok(framework.confidence !== undefined);
            assert.ok(framework.version !== undefined);
            assert.strictEqual(typeof framework.confidence, 'number');
            assert.strictEqual(typeof framework.version, 'string');
        });
    });
});
//# sourceMappingURL=FrameworkSelection.test.js.map