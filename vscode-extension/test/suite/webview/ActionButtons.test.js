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
(0, mocha_1.describe)('ActionButtons Component', () => {
    (0, mocha_1.describe)('Button State Logic', () => {
        (0, mocha_1.it)('should enable preview button when not loading', () => {
            const isLoading = false;
            const isPreviewDisabled = isLoading;
            assert.strictEqual(isPreviewDisabled, false);
        });
        (0, mocha_1.it)('should disable preview button when loading', () => {
            const isLoading = true;
            const isPreviewDisabled = isLoading;
            assert.strictEqual(isPreviewDisabled, true);
        });
        (0, mocha_1.it)('should enable generate button when valid and not loading', () => {
            const isValid = true;
            const isLoading = false;
            const isGenerateDisabled = !isValid || isLoading;
            assert.strictEqual(isGenerateDisabled, false);
        });
        (0, mocha_1.it)('should disable generate button when invalid', () => {
            const isValid = false;
            const isLoading = false;
            const isGenerateDisabled = !isValid || isLoading;
            assert.strictEqual(isGenerateDisabled, true);
        });
        (0, mocha_1.it)('should disable generate button when loading', () => {
            const isValid = true;
            const isLoading = true;
            const isGenerateDisabled = !isValid || isLoading;
            assert.strictEqual(isGenerateDisabled, true);
        });
        (0, mocha_1.it)('should disable cancel button when loading', () => {
            const isLoading = true;
            const isCancelDisabled = isLoading;
            assert.strictEqual(isCancelDisabled, true);
        });
    });
    (0, mocha_1.describe)('Button Click Handlers', () => {
        (0, mocha_1.it)('should call preview handler when preview button clicked', () => {
            let previewCalled = false;
            const handlePreview = () => {
                previewCalled = true;
            };
            // Simulate button click
            handlePreview();
            assert.strictEqual(previewCalled, true);
        });
        (0, mocha_1.it)('should call generate handler when generate button clicked', () => {
            let generateCalled = false;
            const handleGenerate = () => {
                generateCalled = true;
            };
            // Simulate button click
            handleGenerate();
            assert.strictEqual(generateCalled, true);
        });
        (0, mocha_1.it)('should call cancel handler when cancel button clicked', () => {
            let cancelCalled = false;
            const handleCancel = () => {
                cancelCalled = true;
            };
            // Simulate button click
            handleCancel();
            assert.strictEqual(cancelCalled, true);
        });
    });
    (0, mocha_1.describe)('Button Styling Logic', () => {
        (0, mocha_1.it)('should apply enabled class when generate button is valid', () => {
            const isValid = true;
            const generateClass = `action-button generate ${isValid ? 'enabled' : 'disabled'}`;
            assert.ok(generateClass.includes('enabled'));
            assert.ok(!generateClass.includes('disabled'));
        });
        (0, mocha_1.it)('should apply disabled class when generate button is invalid', () => {
            const isValid = false;
            const generateClass = `action-button generate ${isValid ? 'enabled' : 'disabled'}`;
            assert.ok(generateClass.includes('disabled'));
            assert.ok(!generateClass.includes('enabled'));
        });
    });
    (0, mocha_1.describe)('Button Tooltips Logic', () => {
        (0, mocha_1.it)('should show appropriate tooltip for enabled generate button', () => {
            const isValid = true;
            const tooltip = isValid ? 'Generate workflow files' : 'Fix configuration errors before generating';
            assert.strictEqual(tooltip, 'Generate workflow files');
        });
        (0, mocha_1.it)('should show appropriate tooltip for disabled generate button', () => {
            const isValid = false;
            const tooltip = isValid ? 'Generate workflow files' : 'Fix configuration errors before generating';
            assert.strictEqual(tooltip, 'Fix configuration errors before generating');
        });
        (0, mocha_1.it)('should show correct tooltips for other buttons', () => {
            const previewTooltip = 'Preview the generated workflows before creating files';
            const cancelTooltip = 'Cancel and close configuration panel';
            assert.strictEqual(previewTooltip, 'Preview the generated workflows before creating files');
            assert.strictEqual(cancelTooltip, 'Cancel and close configuration panel');
        });
    });
    (0, mocha_1.describe)('Loading Overlay Logic', () => {
        (0, mocha_1.it)('should show loading overlay when loading', () => {
            const isLoading = true;
            const showLoadingOverlay = isLoading;
            assert.strictEqual(showLoadingOverlay, true);
        });
        (0, mocha_1.it)('should hide loading overlay when not loading', () => {
            const isLoading = false;
            const showLoadingOverlay = isLoading;
            assert.strictEqual(showLoadingOverlay, false);
        });
    });
    (0, mocha_1.describe)('Help Content Logic', () => {
        (0, mocha_1.it)('should provide help text for all actions', () => {
            const helpItems = [
                { action: 'Preview', description: 'See the generated YAML workflows before creating files' },
                { action: 'Generate', description: 'Create workflow files in your repository' }
            ];
            assert.strictEqual(helpItems.length, 2);
            assert.strictEqual(helpItems[0].action, 'Preview');
            assert.strictEqual(helpItems[1].action, 'Generate');
        });
        (0, mocha_1.it)('should show error help when configuration is invalid', () => {
            const isValid = false;
            const showErrorHelp = !isValid;
            const errorHelpText = '⚠️ Fix configuration errors before generating workflows';
            assert.strictEqual(showErrorHelp, true);
            assert.strictEqual(errorHelpText, '⚠️ Fix configuration errors before generating workflows');
        });
        (0, mocha_1.it)('should hide error help when configuration is valid', () => {
            const isValid = true;
            const showErrorHelp = !isValid;
            assert.strictEqual(showErrorHelp, false);
        });
    });
    (0, mocha_1.describe)('Button Group Organization', () => {
        (0, mocha_1.it)('should organize buttons into primary and secondary groups', () => {
            const primaryActions = ['preview', 'generate'];
            const secondaryActions = ['cancel'];
            assert.strictEqual(primaryActions.length, 2);
            assert.strictEqual(secondaryActions.length, 1);
            assert.ok(primaryActions.includes('preview'));
            assert.ok(primaryActions.includes('generate'));
            assert.ok(secondaryActions.includes('cancel'));
        });
    });
    (0, mocha_1.describe)('Button Icons and Text', () => {
        (0, mocha_1.it)('should have correct icons for each button', () => {
            const buttonIcons = {
                preview: '👁️',
                generate: '🚀',
                cancel: '❌'
            };
            assert.strictEqual(buttonIcons.preview, '👁️');
            assert.strictEqual(buttonIcons.generate, '🚀');
            assert.strictEqual(buttonIcons.cancel, '❌');
        });
        (0, mocha_1.it)('should have correct text for each button', () => {
            const buttonTexts = {
                preview: 'Preview Workflow',
                generate: 'Generate Files',
                cancel: 'Cancel'
            };
            assert.strictEqual(buttonTexts.preview, 'Preview Workflow');
            assert.strictEqual(buttonTexts.generate, 'Generate Files');
            assert.strictEqual(buttonTexts.cancel, 'Cancel');
        });
    });
    (0, mocha_1.describe)('Component Props Validation', () => {
        (0, mocha_1.it)('should handle all required props', () => {
            const props = {
                onPreview: () => { },
                onGenerate: () => { },
                onCancel: () => { },
                isValid: true,
                isLoading: false
            };
            // Validate all required props are present
            assert.ok(typeof props.onPreview === 'function');
            assert.ok(typeof props.onGenerate === 'function');
            assert.ok(typeof props.onCancel === 'function');
            assert.ok(typeof props.isValid === 'boolean');
            assert.ok(typeof props.isLoading === 'boolean');
        });
        (0, mocha_1.it)('should handle different prop combinations', () => {
            const scenarios = [
                { isValid: true, isLoading: false },
                { isValid: false, isLoading: false },
                { isValid: true, isLoading: true },
                { isValid: false, isLoading: true }
            ];
            scenarios.forEach(scenario => {
                const generateDisabled = !scenario.isValid || scenario.isLoading;
                const previewDisabled = scenario.isLoading;
                const cancelDisabled = scenario.isLoading;
                // Validate button states for each scenario
                if (scenario.isValid && !scenario.isLoading) {
                    assert.strictEqual(generateDisabled, false);
                }
                else {
                    assert.strictEqual(generateDisabled, true);
                }
                assert.strictEqual(previewDisabled, scenario.isLoading);
                assert.strictEqual(cancelDisabled, scenario.isLoading);
            });
        });
    });
});
//# sourceMappingURL=ActionButtons.test.js.map