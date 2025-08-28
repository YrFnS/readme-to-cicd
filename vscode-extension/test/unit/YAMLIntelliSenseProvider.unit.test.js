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
const vscode = __importStar(require("vscode"));
const sinon = __importStar(require("sinon"));
const YAMLIntelliSenseProvider_1 = require("../../src/providers/YAMLIntelliSenseProvider");
suite('YAMLIntelliSenseProvider Unit Tests', () => {
    let provider;
    let mockDocument;
    let mockPosition;
    let mockContext;
    setup(() => {
        provider = new YAMLIntelliSenseProvider_1.YAMLIntelliSenseProvider();
        mockDocument = {
            uri: vscode.Uri.file('/test/.github/workflows/test.yml'),
            fileName: '/test/.github/workflows/test.yml',
            isUntitled: false,
            languageId: 'yaml',
            version: 1,
            isDirty: false,
            isClosed: false,
            save: sinon.stub(),
            eol: vscode.EndOfLine.LF,
            lineCount: 10,
            getText: sinon.stub(),
            getWordRangeAtPosition: sinon.stub(),
            lineAt: sinon.stub(),
            offsetAt: sinon.stub(),
            positionAt: sinon.stub(),
            validateRange: sinon.stub(),
            validatePosition: sinon.stub()
        };
        mockPosition = new vscode.Position(5, 10);
        mockContext = {
            triggerKind: vscode.CompletionTriggerKind.Invoke,
            triggerCharacter: undefined
        };
    });
    teardown(() => {
        sinon.restore();
    });
    suite('provideCompletionItems', () => {
        test('should provide action completions for uses field', async () => {
            const mockLine = {
                text: '      - uses: ',
                range: new vscode.Range(5, 0, 5, 14),
                rangeIncludingLineBreak: new vscode.Range(5, 0, 6, 0),
                firstNonWhitespaceCharacterIndex: 8,
                isEmptyOrWhitespace: false
            };
            mockDocument.lineAt.returns(mockLine);
            const result = await provider.provideCompletionItems(mockDocument, mockPosition, {}, mockContext);
            assert.ok(Array.isArray(result));
            const completions = result;
            // Should include common actions
            assert.ok(completions.some(item => item.label.toString().includes('actions/checkout')));
            assert.ok(completions.some(item => item.label.toString().includes('actions/setup-node')));
            assert.ok(completions.some(item => item.label.toString().includes('actions/setup-python')));
        });
        test('should provide runner completions for runs-on field', async () => {
            const mockLine = {
                text: '    runs-on: ',
                range: new vscode.Range(3, 0, 3, 13),
                rangeIncludingLineBreak: new vscode.Range(3, 0, 4, 0),
                firstNonWhitespaceCharacterIndex: 4,
                isEmptyOrWhitespace: false
            };
            mockDocument.lineAt.returns(mockLine);
            const result = await provider.provideCompletionItems(mockDocument, mockPosition, {}, mockContext);
            assert.ok(Array.isArray(result));
            const completions = result;
            // Should include common runners
            assert.ok(completions.some(item => item.label === 'ubuntu-latest'));
            assert.ok(completions.some(item => item.label === 'windows-latest'));
            assert.ok(completions.some(item => item.label === 'macos-latest'));
        });
        test('should provide trigger completions for on field', async () => {
            const mockLine = {
                text: 'on: ',
                range: new vscode.Range(1, 0, 1, 4),
                rangeIncludingLineBreak: new vscode.Range(1, 0, 2, 0),
                firstNonWhitespaceCharacterIndex: 0,
                isEmptyOrWhitespace: false
            };
            mockDocument.lineAt.returns(mockLine);
            const result = await provider.provideCompletionItems(mockDocument, mockPosition, {}, mockContext);
            assert.ok(Array.isArray(result));
            const completions = result;
            // Should include common triggers
            assert.ok(completions.some(item => item.label === 'push'));
            assert.ok(completions.some(item => item.label === 'pull_request'));
            assert.ok(completions.some(item => item.label === 'schedule'));
        });
        test('should not provide completions for non-workflow files', async () => {
            const nonWorkflowDocument = {
                ...mockDocument,
                uri: vscode.Uri.file('/test/package.json'),
                fileName: '/test/package.json'
            };
            const result = await provider.provideCompletionItems(nonWorkflowDocument, mockPosition, {}, mockContext);
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 0);
        });
    });
    suite('provideHover', () => {
        test('should provide hover information for known actions', async () => {
            const mockLine = {
                text: '      - uses: actions/checkout@v4',
                range: new vscode.Range(5, 0, 5, 32),
                rangeIncludingLineBreak: new vscode.Range(5, 0, 6, 0),
                firstNonWhitespaceCharacterIndex: 8,
                isEmptyOrWhitespace: false
            };
            const mockRange = new vscode.Range(5, 14, 5, 30);
            mockDocument.lineAt.returns(mockLine);
            mockDocument.getWordRangeAtPosition.returns(mockRange);
            mockDocument.getText.withArgs(mockRange).returns('actions/checkout');
            const result = await provider.provideHover(mockDocument, mockPosition, {});
            assert.ok(result instanceof vscode.Hover);
            const hover = result;
            assert.ok(hover.contents.length > 0);
            const content = hover.contents[0];
            assert.ok(content.value.includes('actions/checkout'));
            assert.ok(content.value.includes('Check out a Git repository'));
        });
        test('should not provide hover for unknown actions', async () => {
            const mockLine = {
                text: '      - uses: unknown/action@v1',
                range: new vscode.Range(5, 0, 5, 28),
                rangeIncludingLineBreak: new vscode.Range(5, 0, 6, 0),
                firstNonWhitespaceCharacterIndex: 8,
                isEmptyOrWhitespace: false
            };
            const mockRange = new vscode.Range(5, 14, 5, 26);
            mockDocument.lineAt.returns(mockLine);
            mockDocument.getWordRangeAtPosition.returns(mockRange);
            mockDocument.getText.withArgs(mockRange).returns('unknown/action');
            const result = await provider.provideHover(mockDocument, mockPosition, {});
            assert.strictEqual(result, undefined);
        });
        test('should not provide hover for non-workflow files', async () => {
            const nonWorkflowDocument = {
                ...mockDocument,
                uri: vscode.Uri.file('/test/package.json'),
                fileName: '/test/package.json'
            };
            const result = await provider.provideHover(nonWorkflowDocument, mockPosition, {});
            assert.strictEqual(result, undefined);
        });
    });
    suite('provideCodeActions', () => {
        test('should provide fix for invalid action reference', async () => {
            const mockDiagnostic = new vscode.Diagnostic(new vscode.Range(5, 14, 5, 30), 'Invalid action reference: invalid-action', vscode.DiagnosticSeverity.Warning);
            mockDiagnostic.code = 'invalid-action-reference';
            mockDiagnostic.source = 'readme-to-cicd';
            const mockLine = {
                text: '      - uses: invalid-action',
                range: new vscode.Range(5, 0, 5, 26),
                rangeIncludingLineBreak: new vscode.Range(5, 0, 6, 0),
                firstNonWhitespaceCharacterIndex: 8,
                isEmptyOrWhitespace: false
            };
            mockDocument.lineAt.returns(mockLine);
            const mockContext = {
                diagnostics: [mockDiagnostic],
                only: undefined,
                triggerKind: vscode.CodeActionTriggerKind.Automatic
            };
            const result = await provider.provideCodeActions(mockDocument, new vscode.Range(5, 0, 5, 26), mockContext, {});
            assert.ok(Array.isArray(result));
            const actions = result;
            assert.ok(actions.length > 0);
            const fixAction = actions.find(action => action.title.includes('Fix action reference'));
            assert.ok(fixAction);
            assert.strictEqual(fixAction.kind, vscode.CodeActionKind.QuickFix);
        });
        test('should provide fix for schema validation errors', async () => {
            const mockDiagnostic = new vscode.Diagnostic(new vscode.Range(3, 0, 3, 10), 'Schema validation error: missing required property', vscode.DiagnosticSeverity.Error);
            mockDiagnostic.code = 'schema-validation-error';
            mockDiagnostic.source = 'readme-to-cicd';
            const mockContext = {
                diagnostics: [mockDiagnostic],
                only: undefined,
                triggerKind: vscode.CodeActionTriggerKind.Automatic
            };
            const result = await provider.provideCodeActions(mockDocument, new vscode.Range(3, 0, 3, 10), mockContext, {});
            assert.ok(Array.isArray(result));
            const actions = result;
            assert.ok(actions.length > 0);
            const fixAction = actions.find(action => action.title.includes('Fix schema validation'));
            assert.ok(fixAction);
            assert.strictEqual(fixAction.kind, vscode.CodeActionKind.QuickFix);
        });
        test('should not provide actions for non-readme-to-cicd diagnostics', async () => {
            const mockDiagnostic = new vscode.Diagnostic(new vscode.Range(3, 0, 3, 10), 'Some other error', vscode.DiagnosticSeverity.Error);
            mockDiagnostic.source = 'other-extension';
            const mockContext = {
                diagnostics: [mockDiagnostic],
                only: undefined,
                triggerKind: vscode.CodeActionTriggerKind.Automatic
            };
            const result = await provider.provideCodeActions(mockDocument, new vscode.Range(3, 0, 3, 10), mockContext, {});
            assert.ok(Array.isArray(result));
            const actions = result;
            assert.strictEqual(actions.length, 0);
        });
    });
    suite('Step Property Completions', () => {
        test('should provide step property completions in steps context', async () => {
            // Mock document content to simulate being in steps context
            const documentContent = `name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - `;
            mockDocument.getText
                .withArgs(sinon.match.any)
                .returns(documentContent);
            const mockLine = {
                text: '      - ',
                range: new vscode.Range(6, 0, 6, 8),
                rangeIncludingLineBreak: new vscode.Range(6, 0, 7, 0),
                firstNonWhitespaceCharacterIndex: 6,
                isEmptyOrWhitespace: false
            };
            mockDocument.lineAt.returns(mockLine);
            const result = await provider.provideCompletionItems(mockDocument, new vscode.Position(6, 8), {}, mockContext);
            assert.ok(Array.isArray(result));
            const completions = result;
            // Should include step properties
            assert.ok(completions.some(item => item.label === 'name'));
            assert.ok(completions.some(item => item.label === 'uses'));
            assert.ok(completions.some(item => item.label === 'run'));
            assert.ok(completions.some(item => item.label === 'with'));
        });
    });
});
//# sourceMappingURL=YAMLIntelliSenseProvider.unit.test.js.map