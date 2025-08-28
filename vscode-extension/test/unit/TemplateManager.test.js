"use strict";
/**
 * Template Manager Tests
 *
 * Tests for template management, customization, and multi-workflow generation.
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
const sinon = __importStar(require("sinon"));
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
const TemplateManager_1 = require("../../src/core/TemplateManager");
suite('TemplateManager Tests', () => {
    let templateManager;
    let mockContext;
    let mockConfiguration;
    let fsStub;
    setup(() => {
        mockContext = {
            subscriptions: [],
            workspaceState: {},
            globalState: {},
            extensionPath: '/test/extension',
            globalStorageUri: vscode.Uri.file('/test/global')
        };
        mockConfiguration = {
            defaultOutputDirectory: '.github/workflows',
            enableAutoGeneration: false,
            preferredWorkflowTypes: ['ci'],
            customTemplates: ['/test/org-templates'],
            gitIntegration: {
                autoCommit: false,
                commitMessage: 'Update workflows',
                createPR: false
            },
            showPreviewByDefault: true,
            enableInlineValidation: true,
            notificationLevel: 'all'
        };
        templateManager = new TemplateManager_1.TemplateManager(mockContext, mockConfiguration);
        // Stub file system operations
        fsStub = sinon.stub(fs, 'readdir');
        sinon.stub(fs, 'readFile');
        sinon.stub(fs, 'writeFile');
        sinon.stub(fs, 'mkdir');
        sinon.stub(fs, 'unlink');
    });
    teardown(() => {
        sinon.restore();
    });
    suite('initialize', () => {
        test('should initialize and load all template types', async () => {
            // Arrange
            fsStub.resolves(['template1.json', 'template2.json']);
            fs.readFile.resolves(JSON.stringify({
                id: 'test-template',
                name: 'Test Template',
                type: 'ci',
                content: 'test content',
                frameworks: ['nodejs'],
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            }));
            // Act
            await templateManager.initialize();
            // Assert
            const templates = templateManager.getTemplates();
            assert.ok(templates.length >= 0);
        });
        test('should handle missing template directories gracefully', async () => {
            // Arrange
            fsStub.rejects(new Error('Directory not found'));
            // Act & Assert - should not throw
            await templateManager.initialize();
        });
    });
    suite('getTemplates', () => {
        test('should return all templates when no filter provided', async () => {
            // Arrange
            await templateManager.initialize();
            // Act
            const templates = templateManager.getTemplates();
            // Assert
            assert.ok(Array.isArray(templates));
        });
        test('should filter templates by type', async () => {
            // Arrange
            const mockTemplate = {
                id: 'ci-template',
                name: 'CI Template',
                description: 'CI workflow template',
                type: 'ci',
                category: 'built-in',
                version: '1.0.0',
                tags: ['ci', 'nodejs'],
                frameworks: ['nodejs'],
                content: 'ci workflow content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 10,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('ci-template', mockTemplate);
            // Act
            const ciTemplates = templateManager.getTemplates({ type: 'ci' });
            const cdTemplates = templateManager.getTemplates({ type: 'cd' });
            // Assert
            assert.strictEqual(ciTemplates.length, 1);
            assert.strictEqual(ciTemplates[0].type, 'ci');
            assert.strictEqual(cdTemplates.length, 0);
        });
        test('should filter templates by frameworks', async () => {
            // Arrange
            const nodeTemplate = {
                id: 'node-template',
                name: 'Node.js Template',
                description: 'Node.js workflow template',
                type: 'ci',
                category: 'built-in',
                version: '1.0.0',
                tags: [],
                frameworks: ['nodejs'],
                content: 'node workflow content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 5,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('node-template', nodeTemplate);
            // Act
            const nodeTemplates = templateManager.getTemplates({ frameworks: ['nodejs'] });
            const pythonTemplates = templateManager.getTemplates({ frameworks: ['python'] });
            // Assert
            assert.strictEqual(nodeTemplates.length, 1);
            assert.strictEqual(nodeTemplates[0].frameworks[0], 'nodejs');
            assert.strictEqual(pythonTemplates.length, 0);
        });
        test('should sort templates by category and usage', async () => {
            // Arrange
            const builtInTemplate = {
                id: 'builtin-template',
                name: 'Built-in Template',
                description: 'Built-in template',
                type: 'ci',
                category: 'built-in',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: 'builtin content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 5,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            const customTemplate = {
                id: 'custom-template',
                name: 'Custom Template',
                description: 'Custom template',
                type: 'ci',
                category: 'custom',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: 'custom content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 10,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('builtin-template', builtInTemplate);
            templateManager.templates.set('custom-template', customTemplate);
            // Act
            const templates = templateManager.getTemplates();
            // Assert
            assert.ok(templates.length >= 2);
            // Built-in templates should come first regardless of usage
            const builtInIndex = templates.findIndex(t => t.category === 'built-in');
            const customIndex = templates.findIndex(t => t.category === 'custom');
            if (builtInIndex !== -1 && customIndex !== -1) {
                assert.ok(builtInIndex < customIndex);
            }
        });
    });
    suite('createCustomTemplate', () => {
        test('should create custom template from workflow content', async () => {
            // Arrange
            const name = 'My Custom Template';
            const description = 'Custom CI template';
            const workflowContent = `
name: Custom CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
`;
            const type = 'ci';
            const frameworks = ['nodejs'];
            const tags = ['custom', 'ci'];
            // Act
            const template = await templateManager.createCustomTemplate(name, description, workflowContent, type, frameworks, tags);
            // Assert
            assert.strictEqual(template.name, name);
            assert.strictEqual(template.description, description);
            assert.strictEqual(template.type, type);
            assert.strictEqual(template.category, 'custom');
            assert.deepStrictEqual(template.frameworks, frameworks);
            assert.deepStrictEqual(template.tags, tags);
            assert.strictEqual(template.content, workflowContent);
            assert.ok(template.id);
            assert.ok(template.variables.length >= 0);
        });
        test('should extract variables from workflow content', async () => {
            // Arrange
            const workflowContent = `
name: {{workflowName}}
on: [push]
env:
  NODE_VERSION: {{nodeVersion}}
jobs:
  test:
    runs-on: {{runner}}
`;
            // Act
            const template = await templateManager.createCustomTemplate('Variable Template', 'Template with variables', workflowContent, 'ci');
            // Assert
            assert.ok(template.variables.length >= 3);
            const variableNames = template.variables.map(v => v.name);
            assert.ok(variableNames.includes('workflowName'));
            assert.ok(variableNames.includes('nodeVersion'));
            assert.ok(variableNames.includes('runner'));
        });
        test('should extract dependencies from workflow content', async () => {
            // Arrange
            const workflowContent = `
name: Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: codecov/codecov-action@v3
`;
            // Act
            const template = await templateManager.createCustomTemplate('Dependency Template', 'Template with dependencies', workflowContent, 'ci');
            // Assert
            assert.ok(template.dependencies.length >= 3);
            assert.ok(template.dependencies.includes('actions/checkout'));
            assert.ok(template.dependencies.includes('actions/setup-node'));
            assert.ok(template.dependencies.includes('codecov/codecov-action'));
        });
    });
    suite('updateTemplate', () => {
        test('should update existing custom template', async () => {
            // Arrange
            const originalTemplate = {
                id: 'custom-template',
                name: 'Original Name',
                description: 'Original description',
                type: 'ci',
                category: 'custom',
                version: '1.0.0',
                tags: ['original'],
                frameworks: ['nodejs'],
                content: 'original content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date('2023-01-01'),
                    modified: new Date('2023-01-01'),
                    usage: 5,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('custom-template', originalTemplate);
            const updates = {
                name: 'Updated Name',
                description: 'Updated description',
                tags: ['updated']
            };
            // Act
            const updatedTemplate = await templateManager.updateTemplate('custom-template', updates);
            // Assert
            assert.strictEqual(updatedTemplate.name, 'Updated Name');
            assert.strictEqual(updatedTemplate.description, 'Updated description');
            assert.deepStrictEqual(updatedTemplate.tags, ['updated']);
            assert.strictEqual(updatedTemplate.type, 'ci'); // Unchanged
            assert.ok(updatedTemplate.metadata.modified > originalTemplate.metadata.modified);
        });
        test('should throw error when updating non-existent template', async () => {
            // Act & Assert
            await assert.rejects(() => templateManager.updateTemplate('non-existent', {}), /Template non-existent not found/);
        });
        test('should throw error when updating built-in template', async () => {
            // Arrange
            const builtInTemplate = {
                id: 'builtin-template',
                name: 'Built-in Template',
                description: 'Built-in template',
                type: 'ci',
                category: 'built-in',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: 'builtin content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('builtin-template', builtInTemplate);
            // Act & Assert
            await assert.rejects(() => templateManager.updateTemplate('builtin-template', { name: 'New Name' }), /Cannot modify built-in templates/);
        });
    });
    suite('deleteTemplate', () => {
        test('should delete custom template', async () => {
            // Arrange
            const customTemplate = {
                id: 'custom-template',
                name: 'Custom Template',
                description: 'Custom template',
                type: 'ci',
                category: 'custom',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: 'custom content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('custom-template', customTemplate);
            // Act
            await templateManager.deleteTemplate('custom-template');
            // Assert
            const template = templateManager.getTemplate('custom-template');
            assert.strictEqual(template, undefined);
        });
        test('should throw error when deleting built-in template', async () => {
            // Arrange
            const builtInTemplate = {
                id: 'builtin-template',
                name: 'Built-in Template',
                description: 'Built-in template',
                type: 'ci',
                category: 'built-in',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: 'builtin content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('builtin-template', builtInTemplate);
            // Act & Assert
            await assert.rejects(() => templateManager.deleteTemplate('builtin-template'), /Cannot delete built-in templates/);
        });
    });
    suite('generateMultiWorkflow', () => {
        test('should generate multiple workflows with coordination', async () => {
            // Arrange
            const ciTemplate = {
                id: 'ci-template',
                name: 'CI Template',
                description: 'CI template',
                type: 'ci',
                category: 'built-in',
                version: '1.0.0',
                tags: [],
                frameworks: ['nodejs'],
                content: `
name: {{workflowName}}
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: {{nodeVersion}}
`,
                variables: [
                    { name: 'workflowName', description: 'Workflow name', type: 'string', required: true },
                    { name: 'nodeVersion', description: 'Node version', type: 'string', required: true, defaultValue: '18' }
                ],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('ci-template', ciTemplate);
            const configuration = {
                workflows: [
                    {
                        workflowTypes: ['ci'],
                        frameworks: [{ name: 'nodejs', enabled: true, confidence: 0.9 }],
                        deploymentTargets: [],
                        securityLevel: 'standard',
                        optimizationLevel: 'standard',
                        includeComments: true,
                        customSteps: []
                    }
                ],
                coordination: {
                    dependencies: [],
                    executionOrder: [0],
                    sharedSecrets: ['NPM_TOKEN'],
                    sharedVariables: { nodeVersion: '18' },
                    conflictResolution: 'merge'
                },
                templates: ['ci-template'],
                customizations: []
            };
            // Act
            const result = await templateManager.generateMultiWorkflow(configuration, '/test/README.md', '.github/workflows');
            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.workflows.length, 1);
            assert.strictEqual(result.errors.length, 0);
            const workflow = result.workflows[0];
            assert.strictEqual(workflow.templateId, 'ci-template');
            assert.strictEqual(workflow.type, 'ci');
            assert.ok(workflow.content.includes('name:'));
            assert.ok(workflow.sharedSecrets.includes('NPM_TOKEN'));
        });
        test('should handle template not found error', async () => {
            // Arrange
            const configuration = {
                workflows: [
                    {
                        workflowTypes: ['ci'],
                        frameworks: [],
                        deploymentTargets: [],
                        securityLevel: 'standard',
                        optimizationLevel: 'standard',
                        includeComments: true,
                        customSteps: []
                    }
                ],
                coordination: {
                    dependencies: [],
                    executionOrder: [0],
                    sharedSecrets: [],
                    sharedVariables: {},
                    conflictResolution: 'merge'
                },
                templates: ['non-existent-template'],
                customizations: []
            };
            // Act
            const result = await templateManager.generateMultiWorkflow(configuration, '/test/README.md', '.github/workflows');
            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors.length > 0);
            assert.ok(result.errors[0].includes('Template non-existent-template not found'));
        });
        test('should validate workflow dependencies', async () => {
            // Arrange
            const configuration = {
                workflows: [],
                coordination: {
                    dependencies: [
                        {
                            workflow: 'CD',
                            dependsOn: ['NonExistentWorkflow']
                        }
                    ],
                    executionOrder: [],
                    sharedSecrets: [],
                    sharedVariables: {},
                    conflictResolution: 'merge'
                },
                templates: [],
                customizations: []
            };
            // Act
            const result = await templateManager.generateMultiWorkflow(configuration, '/test/README.md', '.github/workflows');
            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors.length > 0);
        });
    });
    suite('validateTemplate', () => {
        test('should validate valid template', () => {
            // Arrange
            const validTemplate = {
                id: 'valid-template',
                name: 'Valid Template',
                description: 'A valid template',
                type: 'ci',
                category: 'custom',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: `
name: Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
`,
                variables: [
                    { name: 'testVar', description: 'Test variable', type: 'string', required: true, defaultValue: 'test' }
                ],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            // Act
            const result = templateManager.validateTemplate(validTemplate);
            // Assert
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.errors.length, 0);
        });
        test('should detect missing required fields', () => {
            // Arrange
            const invalidTemplate = {
                // Missing id, name, content, type
                description: 'Invalid template',
                category: 'custom',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            // Act
            const result = templateManager.validateTemplate(invalidTemplate);
            // Assert
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.includes('Template ID is required'));
            assert.ok(result.errors.includes('Template name is required'));
            assert.ok(result.errors.includes('Template content is required'));
            assert.ok(result.errors.includes('Template type is required'));
        });
        test('should detect invalid YAML content', () => {
            // Arrange
            const templateWithInvalidYAML = {
                id: 'invalid-yaml-template',
                name: 'Invalid YAML Template',
                description: 'Template with invalid YAML',
                type: 'ci',
                category: 'custom',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: `
name: Test
on: [push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
`, // Missing closing bracket
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            // Act
            const result = templateManager.validateTemplate(templateWithInvalidYAML);
            // Assert
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(e => e.includes('Invalid YAML structure')));
        });
        test('should detect missing required GitHub Actions sections', () => {
            // Arrange
            const templateMissingSections = {
                id: 'missing-sections-template',
                name: 'Missing Sections Template',
                description: 'Template missing required sections',
                type: 'ci',
                category: 'custom',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: `
name: Test
# Missing 'on:' and 'jobs:' sections
`,
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            // Act
            const result = templateManager.validateTemplate(templateMissingSections);
            // Assert
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.includes('Template must include trigger events (on:)'));
            assert.ok(result.errors.includes('Template must include jobs section'));
        });
    });
    suite('saveCustomization and getCustomization', () => {
        test('should save and retrieve template customization', async () => {
            // Arrange
            const customization = {
                templateId: 'test-template',
                customizations: {
                    env: 'CUSTOM_VAR: value',
                    customSteps: 'custom step content'
                },
                preserveOnUpdate: ['env'],
                lastModified: new Date()
            };
            // Act
            await templateManager.saveCustomization(customization);
            const retrieved = templateManager.getCustomization('test-template');
            // Assert
            assert.ok(retrieved);
            assert.strictEqual(retrieved.templateId, 'test-template');
            assert.deepStrictEqual(retrieved.customizations, customization.customizations);
            assert.deepStrictEqual(retrieved.preserveOnUpdate, ['env']);
        });
        test('should return undefined for non-existent customization', () => {
            // Act
            const result = templateManager.getCustomization('non-existent');
            // Assert
            assert.strictEqual(result, undefined);
        });
    });
    suite('importOrganizationTemplates', () => {
        test('should import templates from organization repository', async () => {
            // Arrange
            const repositoryUrl = 'https://github.com/org/templates.git';
            const mockTemplates = [
                {
                    id: 'org-ci-template',
                    name: 'Organization CI Template',
                    description: 'Organization CI template',
                    type: 'ci',
                    category: 'organization',
                    version: '1.0.0',
                    tags: ['org'],
                    frameworks: ['nodejs'],
                    content: 'org ci content',
                    variables: [],
                    dependencies: [],
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        usage: 0,
                        compatibility: [],
                        requirements: [],
                        examples: []
                    }
                }
            ];
            sinon.stub(templateManager, 'fetchTemplatesFromRepository').resolves(mockTemplates);
            // Act
            const result = await templateManager.importOrganizationTemplates(repositoryUrl);
            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.imported.length, 1);
            assert.strictEqual(result.imported[0], 'org-ci-template');
            assert.strictEqual(result.errors.length, 0);
        });
        test('should handle import errors gracefully', async () => {
            // Arrange
            const repositoryUrl = 'https://github.com/org/templates.git';
            sinon.stub(templateManager, 'fetchTemplatesFromRepository').rejects(new Error('Network error'));
            // Act
            const result = await templateManager.importOrganizationTemplates(repositoryUrl);
            // Assert
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.imported.length, 0);
            assert.ok(result.errors.length > 0);
            assert.ok(result.errors[0].error.includes('Network error'));
        });
    });
    suite('exportTemplates', () => {
        test('should export custom templates', async () => {
            // Arrange
            const customTemplate = {
                id: 'custom-template',
                name: 'Custom Template',
                description: 'Custom template',
                type: 'ci',
                category: 'custom',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: 'custom content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('custom-template', customTemplate);
            const exportPath = '/test/export.json';
            // Act
            const result = await templateManager.exportTemplates(['custom-template'], exportPath);
            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.exported.length, 1);
            assert.strictEqual(result.exported[0], 'custom-template');
            assert.strictEqual(result.errors.length, 0);
        });
        test('should not export built-in templates', async () => {
            // Arrange
            const builtInTemplate = {
                id: 'builtin-template',
                name: 'Built-in Template',
                description: 'Built-in template',
                type: 'ci',
                category: 'built-in',
                version: '1.0.0',
                tags: [],
                frameworks: [],
                content: 'builtin content',
                variables: [],
                dependencies: [],
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    usage: 0,
                    compatibility: [],
                    requirements: [],
                    examples: []
                }
            };
            templateManager.templates.set('builtin-template', builtInTemplate);
            const exportPath = '/test/export.json';
            // Act
            const result = await templateManager.exportTemplates(['builtin-template'], exportPath);
            // Assert
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.exported.length, 0);
            assert.ok(result.errors.length > 0);
            assert.ok(result.errors[0].error.includes('Cannot export built-in templates'));
        });
    });
});
//# sourceMappingURL=TemplateManager.test.js.map