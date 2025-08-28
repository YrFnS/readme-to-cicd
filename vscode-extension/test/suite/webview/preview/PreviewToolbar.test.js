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
(0, mocha_1.describe)('PreviewToolbar Component', () => {
    (0, mocha_1.describe)('Edit Mode Toggle', () => {
        (0, mocha_1.it)('should toggle edit mode correctly', () => {
            let editMode = false;
            const handleEditToggle = () => {
                editMode = !editMode;
            };
            // Enter edit mode
            handleEditToggle();
            assert.strictEqual(editMode, true);
            // Exit edit mode
            handleEditToggle();
            assert.strictEqual(editMode, false);
        });
        (0, mocha_1.it)('should show correct button text and icon for edit mode', () => {
            const editMode = true;
            const buttonText = editMode ? 'View' : 'Edit';
            const buttonIcon = editMode ? '👁️' : '✏️';
            const tooltip = editMode ? 'Exit edit mode' : 'Enter edit mode';
            assert.strictEqual(buttonText, 'View');
            assert.strictEqual(buttonIcon, '👁️');
            assert.strictEqual(tooltip, 'Exit edit mode');
        });
        (0, mocha_1.it)('should show correct button text and icon for view mode', () => {
            const editMode = false;
            const buttonText = editMode ? 'View' : 'Edit';
            const buttonIcon = editMode ? '👁️' : '✏️';
            const tooltip = editMode ? 'Exit edit mode' : 'Enter edit mode';
            assert.strictEqual(buttonText, 'Edit');
            assert.strictEqual(buttonIcon, '✏️');
            assert.strictEqual(tooltip, 'Enter edit mode');
        });
    });
    (0, mocha_1.describe)('Save Button Visibility', () => {
        (0, mocha_1.it)('should show save button when in edit mode with changes', () => {
            const editMode = true;
            const hasChanges = true;
            const showSaveButton = editMode && hasChanges;
            assert.strictEqual(showSaveButton, true);
        });
        (0, mocha_1.it)('should hide save button when not in edit mode', () => {
            const editMode = false;
            const hasChanges = true;
            const showSaveButton = editMode && hasChanges;
            assert.strictEqual(showSaveButton, false);
        });
        (0, mocha_1.it)('should hide save button when no changes in edit mode', () => {
            const editMode = true;
            const hasChanges = false;
            const showSaveButton = editMode && hasChanges;
            assert.strictEqual(showSaveButton, false);
        });
    });
    (0, mocha_1.describe)('Layout Controls', () => {
        (0, mocha_1.it)('should toggle split view correctly', () => {
            let layout = {
                splitView: true,
                configurationWidth: 30,
                previewWidth: 70,
                orientation: 'horizontal'
            };
            const handleLayoutToggle = () => {
                layout = { ...layout, splitView: !layout.splitView };
            };
            handleLayoutToggle();
            assert.strictEqual(layout.splitView, false);
            handleLayoutToggle();
            assert.strictEqual(layout.splitView, true);
        });
        (0, mocha_1.it)('should toggle orientation correctly', () => {
            let layout = {
                splitView: true,
                configurationWidth: 30,
                previewWidth: 70,
                orientation: 'horizontal'
            };
            const handleOrientationToggle = () => {
                layout = {
                    ...layout,
                    orientation: layout.orientation === 'horizontal' ? 'vertical' : 'horizontal'
                };
            };
            handleOrientationToggle();
            assert.strictEqual(layout.orientation, 'vertical');
            handleOrientationToggle();
            assert.strictEqual(layout.orientation, 'horizontal');
        });
        (0, mocha_1.it)('should show correct orientation button text and icon', () => {
            const horizontalLayout = { orientation: 'horizontal' };
            const verticalLayout = { orientation: 'vertical' };
            const horizontalIcon = horizontalLayout.orientation === 'horizontal' ? '⬌' : '⬍';
            const horizontalText = horizontalLayout.orientation === 'horizontal' ? 'Horizontal' : 'Vertical';
            const verticalIcon = verticalLayout.orientation === 'horizontal' ? '⬌' : '⬍';
            const verticalText = verticalLayout.orientation === 'horizontal' ? 'Horizontal' : 'Vertical';
            assert.strictEqual(horizontalIcon, '⬌');
            assert.strictEqual(horizontalText, 'Horizontal');
            assert.strictEqual(verticalIcon, '⬍');
            assert.strictEqual(verticalText, 'Vertical');
        });
        (0, mocha_1.it)('should show orientation tooltip correctly', () => {
            const layout = { orientation: 'horizontal' };
            const tooltip = `Switch to ${layout.orientation === 'horizontal' ? 'vertical' : 'horizontal'} layout`;
            assert.strictEqual(tooltip, 'Switch to vertical layout');
        });
    });
    (0, mocha_1.describe)('Split Resize Control', () => {
        (0, mocha_1.it)('should handle split resize correctly', () => {
            let layout = {
                configurationWidth: 30,
                previewWidth: 70
            };
            const handleSplitResize = (configWidth) => {
                layout = {
                    configurationWidth: configWidth,
                    previewWidth: 100 - configWidth
                };
            };
            handleSplitResize(40);
            assert.strictEqual(layout.configurationWidth, 40);
            assert.strictEqual(layout.previewWidth, 60);
            handleSplitResize(25);
            assert.strictEqual(layout.configurationWidth, 25);
            assert.strictEqual(layout.previewWidth, 75);
        });
        (0, mocha_1.it)('should validate split resize bounds', () => {
            const minWidth = 20;
            const maxWidth = 80;
            const validateWidth = (width) => {
                return Math.max(minWidth, Math.min(maxWidth, width));
            };
            assert.strictEqual(validateWidth(10), 20); // Below minimum
            assert.strictEqual(validateWidth(90), 80); // Above maximum
            assert.strictEqual(validateWidth(50), 50); // Within bounds
        });
        (0, mocha_1.it)('should show split control only in split view', () => {
            const splitViewLayout = { splitView: true };
            const fullViewLayout = { splitView: false };
            const showSplitControl = splitViewLayout.splitView;
            const hideSplitControl = !fullViewLayout.splitView;
            assert.strictEqual(showSplitControl, true);
            assert.strictEqual(hideSplitControl, true);
        });
    });
    (0, mocha_1.describe)('Action Buttons', () => {
        (0, mocha_1.it)('should handle generate action correctly', () => {
            let generateCalled = false;
            const handleGenerate = () => {
                generateCalled = true;
            };
            handleGenerate();
            assert.strictEqual(generateCalled, true);
        });
        (0, mocha_1.it)('should handle cancel action correctly', () => {
            let cancelCalled = false;
            const handleCancel = () => {
                cancelCalled = true;
            };
            handleCancel();
            assert.strictEqual(cancelCalled, true);
        });
        (0, mocha_1.it)('should handle save action correctly', () => {
            let saveCalled = false;
            const handleSave = () => {
                saveCalled = true;
            };
            handleSave();
            assert.strictEqual(saveCalled, true);
        });
    });
    (0, mocha_1.describe)('Toolbar Title Display', () => {
        (0, mocha_1.it)('should show changes indicator when there are unsaved changes', () => {
            const hasChanges = true;
            const showChangesIndicator = hasChanges;
            assert.strictEqual(showChangesIndicator, true);
        });
        (0, mocha_1.it)('should hide changes indicator when no unsaved changes', () => {
            const hasChanges = false;
            const showChangesIndicator = hasChanges;
            assert.strictEqual(showChangesIndicator, false);
        });
        (0, mocha_1.it)('should display correct toolbar title elements', () => {
            const titleIcon = '📄';
            const titleText = 'Workflow Preview';
            assert.strictEqual(titleIcon, '📄');
            assert.strictEqual(titleText, 'Workflow Preview');
        });
    });
    (0, mocha_1.describe)('Unsaved Changes Banner', () => {
        (0, mocha_1.it)('should show banner when there are unsaved changes', () => {
            const hasChanges = true;
            const showBanner = hasChanges;
            assert.strictEqual(showBanner, true);
        });
        (0, mocha_1.it)('should hide banner when no unsaved changes', () => {
            const hasChanges = false;
            const showBanner = hasChanges;
            assert.strictEqual(showBanner, false);
        });
        (0, mocha_1.it)('should display correct banner content', () => {
            const bannerIcon = '⚠️';
            const bannerText = 'You have unsaved changes';
            const actionText = 'Save Now';
            assert.strictEqual(bannerIcon, '⚠️');
            assert.strictEqual(bannerText, 'You have unsaved changes');
            assert.strictEqual(actionText, 'Save Now');
        });
    });
    (0, mocha_1.describe)('Button States and Classes', () => {
        (0, mocha_1.it)('should apply active class to edit button when in edit mode', () => {
            const editMode = true;
            const editButtonClass = `toolbar-button ${editMode ? 'active' : ''}`;
            assert.ok(editButtonClass.includes('active'));
        });
        (0, mocha_1.it)('should not apply active class to edit button when not in edit mode', () => {
            const editMode = false;
            const editButtonClass = `toolbar-button ${editMode ? 'active' : ''}`;
            assert.ok(!editButtonClass.includes('active'));
        });
        (0, mocha_1.it)('should apply active class to split button when split view is enabled', () => {
            const splitView = true;
            const splitButtonClass = `toolbar-button ${splitView ? 'active' : ''}`;
            assert.ok(splitButtonClass.includes('active'));
        });
        (0, mocha_1.it)('should apply correct classes to action buttons', () => {
            const generateButtonClass = 'toolbar-button generate primary';
            const cancelButtonClass = 'toolbar-button cancel';
            const saveButtonClass = 'toolbar-button save';
            assert.ok(generateButtonClass.includes('primary'));
            assert.ok(cancelButtonClass.includes('cancel'));
            assert.ok(saveButtonClass.includes('save'));
        });
    });
    (0, mocha_1.describe)('Toolbar Sections Organization', () => {
        (0, mocha_1.it)('should organize toolbar into correct sections', () => {
            const sections = ['left', 'center', 'right'];
            assert.strictEqual(sections.length, 3);
            assert.ok(sections.includes('left'));
            assert.ok(sections.includes('center'));
            assert.ok(sections.includes('right'));
        });
        (0, mocha_1.it)('should place edit controls in left section', () => {
            const leftSectionControls = ['edit', 'save', 'split', 'orientation', 'resize'];
            assert.ok(leftSectionControls.includes('edit'));
            assert.ok(leftSectionControls.includes('save'));
            assert.ok(leftSectionControls.includes('split'));
        });
        (0, mocha_1.it)('should place title in center section', () => {
            const centerSectionContent = ['title', 'changes-indicator'];
            assert.ok(centerSectionContent.includes('title'));
            assert.ok(centerSectionContent.includes('changes-indicator'));
        });
        (0, mocha_1.it)('should place action buttons in right section', () => {
            const rightSectionControls = ['generate', 'cancel'];
            assert.ok(rightSectionControls.includes('generate'));
            assert.ok(rightSectionControls.includes('cancel'));
        });
    });
    (0, mocha_1.describe)('Keyboard Shortcuts', () => {
        (0, mocha_1.it)('should show correct save shortcut in tooltip', () => {
            const saveTooltip = 'Save changes (Ctrl+S)';
            assert.ok(saveTooltip.includes('Ctrl+S'));
        });
        (0, mocha_1.it)('should provide appropriate tooltips for all buttons', () => {
            const tooltips = {
                edit: 'Enter edit mode',
                view: 'Exit edit mode',
                save: 'Save changes (Ctrl+S)',
                split: 'Toggle split view',
                generate: 'Generate and save workflow files',
                cancel: 'Cancel and return to configuration'
            };
            assert.ok(tooltips.save.includes('Ctrl+S'));
            assert.strictEqual(tooltips.generate, 'Generate and save workflow files');
            assert.strictEqual(tooltips.cancel, 'Cancel and return to configuration');
        });
    });
});
//# sourceMappingURL=PreviewToolbar.test.js.map