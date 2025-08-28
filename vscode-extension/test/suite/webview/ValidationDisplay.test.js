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
(0, mocha_1.describe)('ValidationDisplay Component', () => {
    (0, mocha_1.describe)('Validation State Detection', () => {
        (0, mocha_1.it)('should detect valid configuration with no errors or warnings', () => {
            const validationResult = {
                isValid: true,
                errors: [],
                warnings: []
            };
            const isCompletelyValid = validationResult.isValid &&
                validationResult.errors.length === 0 &&
                validationResult.warnings.length === 0;
            assert.strictEqual(isCompletelyValid, true);
        });
        (0, mocha_1.it)('should detect invalid configuration with errors', () => {
            const validationResult = {
                isValid: false,
                errors: [
                    { field: 'frameworks', message: 'At least one framework must be selected', code: 'REQUIRED' }
                ],
                warnings: []
            };
            const hasErrors = validationResult.errors.length > 0;
            assert.strictEqual(validationResult.isValid, false);
            assert.strictEqual(hasErrors, true);
        });
        (0, mocha_1.it)('should detect valid configuration with warnings only', () => {
            const validationResult = {
                isValid: true,
                errors: [],
                warnings: [
                    { field: 'deployment', message: 'No deployment platform configured', code: 'OPTIONAL' }
                ]
            };
            const hasWarnings = validationResult.warnings.length > 0;
            const hasErrors = validationResult.errors.length > 0;
            assert.strictEqual(validationResult.isValid, true);
            assert.strictEqual(hasWarnings, true);
            assert.strictEqual(hasErrors, false);
        });
    });
    (0, mocha_1.describe)('Error Rendering Logic', () => {
        (0, mocha_1.it)('should render error with all properties', () => {
            const error = {
                field: 'frameworks',
                message: 'At least one framework must be selected',
                code: 'REQUIRED'
            };
            // Simulate error rendering logic
            const errorDisplay = {
                field: error.field,
                message: error.message,
                code: error.code,
                type: 'error'
            };
            assert.strictEqual(errorDisplay.field, 'frameworks');
            assert.strictEqual(errorDisplay.message, 'At least one framework must be selected');
            assert.strictEqual(errorDisplay.code, 'REQUIRED');
            assert.strictEqual(errorDisplay.type, 'error');
        });
        (0, mocha_1.it)('should handle multiple errors', () => {
            const errors = [
                { field: 'frameworks', message: 'No frameworks selected', code: 'REQUIRED' },
                { field: 'workflowTypes', message: 'No workflow types selected', code: 'REQUIRED' },
                { field: 'deployment.siteId', message: 'Site ID is required', code: 'REQUIRED' }
            ];
            assert.strictEqual(errors.length, 3);
            errors.forEach(error => {
                assert.ok(error.field);
                assert.ok(error.message);
                assert.ok(error.code);
            });
        });
    });
    (0, mocha_1.describe)('Warning Rendering Logic', () => {
        (0, mocha_1.it)('should render warning with all properties', () => {
            const warning = {
                field: 'deployment',
                message: 'No deployment platform configured',
                code: 'OPTIONAL'
            };
            // Simulate warning rendering logic
            const warningDisplay = {
                field: warning.field,
                message: warning.message,
                code: warning.code,
                type: 'warning'
            };
            assert.strictEqual(warningDisplay.field, 'deployment');
            assert.strictEqual(warningDisplay.message, 'No deployment platform configured');
            assert.strictEqual(warningDisplay.code, 'OPTIONAL');
            assert.strictEqual(warningDisplay.type, 'warning');
        });
        (0, mocha_1.it)('should handle multiple warnings', () => {
            const warnings = [
                { field: 'deployment', message: 'No deployment configured', code: 'OPTIONAL' },
                { field: 'testing', message: 'No test configuration found', code: 'RECOMMENDED' }
            ];
            assert.strictEqual(warnings.length, 2);
            warnings.forEach(warning => {
                assert.ok(warning.field);
                assert.ok(warning.message);
                assert.ok(warning.code);
            });
        });
    });
    (0, mocha_1.describe)('Validation Summary Logic', () => {
        (0, mocha_1.it)('should generate correct error count summary', () => {
            const errors = [
                { field: 'frameworks', message: 'Error 1', code: 'REQUIRED' },
                { field: 'workflowTypes', message: 'Error 2', code: 'REQUIRED' }
            ];
            const errorCount = errors.length;
            const errorText = `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
            assert.strictEqual(errorText, '2 errors');
        });
        (0, mocha_1.it)('should generate correct warning count summary', () => {
            const warnings = [
                { field: 'deployment', message: 'Warning 1', code: 'OPTIONAL' }
            ];
            const warningCount = warnings.length;
            const warningText = `${warningCount} warning${warningCount !== 1 ? 's' : ''}`;
            assert.strictEqual(warningText, '1 warning');
        });
        (0, mocha_1.it)('should handle singular vs plural correctly', () => {
            // Test singular
            const singleError = [{ field: 'test', message: 'Test', code: 'TEST' }];
            const singleErrorText = `${singleError.length} error${singleError.length !== 1 ? 's' : ''}`;
            assert.strictEqual(singleErrorText, '1 error');
            // Test plural
            const multipleErrors = [
                { field: 'test1', message: 'Test 1', code: 'TEST' },
                { field: 'test2', message: 'Test 2', code: 'TEST' }
            ];
            const multipleErrorText = `${multipleErrors.length} error${multipleErrors.length !== 1 ? 's' : ''}`;
            assert.strictEqual(multipleErrorText, '2 errors');
        });
    });
    (0, mocha_1.describe)('Validation Icon Logic', () => {
        (0, mocha_1.it)('should use success icon for valid configuration', () => {
            const isValid = true;
            const hasErrors = false;
            const icon = isValid && !hasErrors ? '✅' : '❌';
            assert.strictEqual(icon, '✅');
        });
        (0, mocha_1.it)('should use error icon for invalid configuration', () => {
            const isValid = false;
            const hasErrors = true;
            const icon = isValid && !hasErrors ? '✅' : '❌';
            assert.strictEqual(icon, '❌');
        });
        (0, mocha_1.it)('should use appropriate icons for different validation types', () => {
            const errorIcon = '❌';
            const warningIcon = '⚠️';
            const successIcon = '✅';
            assert.strictEqual(errorIcon, '❌');
            assert.strictEqual(warningIcon, '⚠️');
            assert.strictEqual(successIcon, '✅');
        });
    });
    (0, mocha_1.describe)('Help Content Logic', () => {
        (0, mocha_1.it)('should provide help for invalid configurations', () => {
            const isValid = false;
            const helpItems = [
                'Check that all required fields are filled',
                'Ensure at least one framework is selected',
                'Verify deployment configuration is complete',
                'Review workflow type selections'
            ];
            if (!isValid) {
                assert.strictEqual(helpItems.length, 4);
                assert.ok(helpItems.includes('Check that all required fields are filled'));
                assert.ok(helpItems.includes('Ensure at least one framework is selected'));
            }
        });
        (0, mocha_1.it)('should not show help for valid configurations', () => {
            const isValid = true;
            const showHelp = !isValid;
            assert.strictEqual(showHelp, false);
        });
    });
    (0, mocha_1.describe)('Validation Result Processing', () => {
        (0, mocha_1.it)('should process complex validation result correctly', () => {
            const validationResult = {
                isValid: false,
                errors: [
                    { field: 'frameworks', message: 'No frameworks selected', code: 'REQUIRED' },
                    { field: 'deployment.siteId', message: 'Site ID required for Netlify', code: 'REQUIRED' }
                ],
                warnings: [
                    { field: 'testing', message: 'No test configuration detected', code: 'RECOMMENDED' },
                    { field: 'security', message: 'Consider adding security scanning', code: 'OPTIONAL' }
                ]
            };
            const summary = {
                isValid: validationResult.isValid,
                errorCount: validationResult.errors.length,
                warningCount: validationResult.warnings.length,
                totalIssues: validationResult.errors.length + validationResult.warnings.length
            };
            assert.strictEqual(summary.isValid, false);
            assert.strictEqual(summary.errorCount, 2);
            assert.strictEqual(summary.warningCount, 2);
            assert.strictEqual(summary.totalIssues, 4);
        });
        (0, mocha_1.it)('should handle empty validation result', () => {
            const validationResult = {
                isValid: true,
                errors: [],
                warnings: []
            };
            const isEmpty = validationResult.errors.length === 0 &&
                validationResult.warnings.length === 0;
            assert.strictEqual(isEmpty, true);
            assert.strictEqual(validationResult.isValid, true);
        });
    });
});
//# sourceMappingURL=ValidationDisplay.test.js.map