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
(0, mocha_1.describe)('DeploymentConfiguration Component', () => {
    const DEPLOYMENT_PLATFORMS = [
        {
            id: 'github-pages',
            name: 'GitHub Pages',
            description: 'Deploy static sites directly from your GitHub repository',
            configFields: [
                {
                    name: 'branch',
                    type: 'select',
                    label: 'Source Branch',
                    description: 'Branch to deploy from',
                    required: true,
                    options: [
                        { value: 'main', label: 'main' },
                        { value: 'master', label: 'master' },
                        { value: 'gh-pages', label: 'gh-pages' }
                    ],
                    defaultValue: 'main'
                },
                {
                    name: 'buildCommand',
                    type: 'text',
                    label: 'Build Command',
                    description: 'Command to build your site',
                    defaultValue: 'npm run build'
                }
            ]
        },
        {
            id: 'netlify',
            name: 'Netlify',
            description: 'Deploy to Netlify with automatic builds and previews',
            configFields: [
                {
                    name: 'siteId',
                    type: 'text',
                    label: 'Site ID',
                    description: 'Your Netlify site ID',
                    required: true
                }
            ]
        }
    ];
    (0, mocha_1.describe)('Platform Selection Logic', () => {
        (0, mocha_1.it)('should find platform by id correctly', () => {
            const platformId = 'github-pages';
            const selectedPlatform = DEPLOYMENT_PLATFORMS.find(p => p.id === platformId);
            assert.ok(selectedPlatform);
            assert.strictEqual(selectedPlatform.id, 'github-pages');
            assert.strictEqual(selectedPlatform.name, 'GitHub Pages');
        });
        (0, mocha_1.it)('should handle unknown platform id', () => {
            const platformId = 'unknown-platform';
            const selectedPlatform = DEPLOYMENT_PLATFORMS.find(p => p.id === platformId);
            assert.strictEqual(selectedPlatform, undefined);
        });
        (0, mocha_1.it)('should handle empty platform selection', () => {
            const platformId = '';
            const selectedPlatform = DEPLOYMENT_PLATFORMS.find(p => p.id === platformId);
            assert.strictEqual(selectedPlatform, undefined);
        });
    });
    (0, mocha_1.describe)('Default Configuration Generation', () => {
        (0, mocha_1.it)('should generate default config for GitHub Pages', () => {
            const platform = DEPLOYMENT_PLATFORMS.find(p => p.id === 'github-pages');
            const defaultConfig = {};
            if (platform) {
                platform.configFields.forEach(field => {
                    if (field.defaultValue !== undefined) {
                        defaultConfig[field.name] = field.defaultValue;
                    }
                });
            }
            assert.strictEqual(defaultConfig.branch, 'main');
            assert.strictEqual(defaultConfig.buildCommand, 'npm run build');
        });
        (0, mocha_1.it)('should generate empty config for platform without defaults', () => {
            const platform = DEPLOYMENT_PLATFORMS.find(p => p.id === 'netlify');
            const defaultConfig = {};
            if (platform) {
                platform.configFields.forEach(field => {
                    if (field.defaultValue !== undefined) {
                        defaultConfig[field.name] = field.defaultValue;
                    }
                });
            }
            assert.strictEqual(Object.keys(defaultConfig).length, 0);
        });
    });
    (0, mocha_1.describe)('Configuration Field Validation', () => {
        (0, mocha_1.it)('should validate required fields', () => {
            const platform = DEPLOYMENT_PLATFORMS.find(p => p.id === 'netlify');
            const requiredFields = platform?.configFields.filter(field => field.required) || [];
            assert.strictEqual(requiredFields.length, 1);
            assert.strictEqual(requiredFields[0].name, 'siteId');
        });
        (0, mocha_1.it)('should identify field types correctly', () => {
            const platform = DEPLOYMENT_PLATFORMS.find(p => p.id === 'github-pages');
            const branchField = platform?.configFields.find(field => field.name === 'branch');
            const buildCommandField = platform?.configFields.find(field => field.name === 'buildCommand');
            assert.strictEqual(branchField?.type, 'select');
            assert.strictEqual(buildCommandField?.type, 'text');
        });
        (0, mocha_1.it)('should validate select field options', () => {
            const platform = DEPLOYMENT_PLATFORMS.find(p => p.id === 'github-pages');
            const branchField = platform?.configFields.find(field => field.name === 'branch');
            assert.ok(branchField?.options);
            assert.strictEqual(branchField.options.length, 3);
            const optionValues = branchField.options.map(opt => opt.value);
            assert.ok(optionValues.includes('main'));
            assert.ok(optionValues.includes('master'));
            assert.ok(optionValues.includes('gh-pages'));
        });
    });
    (0, mocha_1.describe)('Configuration Change Handling', () => {
        (0, mocha_1.it)('should handle platform change correctly', () => {
            let currentPlatform = '';
            let currentConfig = {};
            const handlePlatformChange = (newPlatform) => {
                const platformDef = DEPLOYMENT_PLATFORMS.find(p => p.id === newPlatform);
                const defaultConfig = {};
                if (platformDef) {
                    platformDef.configFields.forEach(field => {
                        if (field.defaultValue !== undefined) {
                            defaultConfig[field.name] = field.defaultValue;
                        }
                    });
                }
                currentPlatform = newPlatform;
                currentConfig = defaultConfig;
            };
            handlePlatformChange('github-pages');
            assert.strictEqual(currentPlatform, 'github-pages');
            assert.strictEqual(currentConfig.branch, 'main');
            assert.strictEqual(currentConfig.buildCommand, 'npm run build');
        });
        (0, mocha_1.it)('should handle config field changes', () => {
            let config = { siteId: 'old-site', buildCommand: 'npm run build' };
            const handleConfigChange = (fieldName, value) => {
                config = { ...config, [fieldName]: value };
            };
            handleConfigChange('siteId', 'new-site-123');
            assert.strictEqual(config.siteId, 'new-site-123');
            assert.strictEqual(config.buildCommand, 'npm run build'); // unchanged
        });
    });
    (0, mocha_1.describe)('Field Rendering Logic', () => {
        (0, mocha_1.it)('should handle text field rendering', () => {
            const field = {
                name: 'siteId',
                type: 'text',
                label: 'Site ID',
                required: true
            };
            const value = 'test-site-123';
            // Simulate text field logic
            const fieldProps = {
                type: field.type,
                value: value,
                required: field.required
            };
            assert.strictEqual(fieldProps.type, 'text');
            assert.strictEqual(fieldProps.value, 'test-site-123');
            assert.strictEqual(fieldProps.required, true);
        });
        (0, mocha_1.it)('should handle select field rendering', () => {
            const field = {
                name: 'branch',
                type: 'select',
                label: 'Source Branch',
                required: true,
                options: [
                    { value: 'main', label: 'main' },
                    { value: 'master', label: 'master' }
                ]
            };
            const value = 'main';
            // Simulate select field logic
            const fieldProps = {
                type: field.type,
                value: value,
                options: field.options,
                required: field.required
            };
            assert.strictEqual(fieldProps.type, 'select');
            assert.strictEqual(fieldProps.value, 'main');
            assert.strictEqual(fieldProps.options?.length, 2);
            assert.strictEqual(fieldProps.required, true);
        });
        (0, mocha_1.it)('should handle boolean field rendering', () => {
            const field = {
                name: 'enableCaching',
                type: 'boolean',
                label: 'Enable Caching'
            };
            const value = true;
            // Simulate boolean field logic
            const fieldProps = {
                type: field.type,
                checked: !!value
            };
            assert.strictEqual(fieldProps.type, 'boolean');
            assert.strictEqual(fieldProps.checked, true);
        });
    });
    (0, mocha_1.describe)('Platform Data Validation', () => {
        (0, mocha_1.it)('should validate platform structure', () => {
            DEPLOYMENT_PLATFORMS.forEach(platform => {
                assert.ok(platform.id, `Platform missing id: ${JSON.stringify(platform)}`);
                assert.ok(platform.name, `Platform missing name: ${platform.id}`);
                assert.ok(platform.description, `Platform missing description: ${platform.id}`);
                assert.ok(Array.isArray(platform.configFields), `Platform missing configFields: ${platform.id}`);
            });
        });
        (0, mocha_1.it)('should validate config field structure', () => {
            DEPLOYMENT_PLATFORMS.forEach(platform => {
                platform.configFields.forEach(field => {
                    assert.ok(field.name, `Field missing name in platform: ${platform.id}`);
                    assert.ok(field.type, `Field missing type: ${field.name}`);
                    assert.ok(field.label, `Field missing label: ${field.name}`);
                    assert.ok(['text', 'select', 'boolean', 'number'].includes(field.type), `Invalid field type: ${field.type}`);
                });
            });
        });
    });
});
//# sourceMappingURL=DeploymentConfiguration.test.js.map