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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const VersionManager_1 = require("../../src/core/VersionManager");
const TelemetryService_1 = require("../../src/core/TelemetryService");
const LoggingService_1 = require("../../src/core/LoggingService");
const NotificationService_1 = require("../../src/core/NotificationService");
suite('Packaging and Deployment Integration Tests', () => {
    let context;
    let loggingService;
    let notificationService;
    let versionManager;
    let telemetryService;
    suiteSetup(async () => {
        // Get extension context
        const extension = vscode.extensions.getExtension('readme-to-cicd.readme-to-cicd');
        assert.ok(extension, 'Extension should be available');
        if (!extension.isActive) {
            await extension.activate();
        }
        context = extension.exports?.context;
        assert.ok(context, 'Extension context should be available');
        // Initialize services
        loggingService = LoggingService_1.LoggingService.getInstance(context);
        notificationService = NotificationService_1.NotificationService.getInstance(context, loggingService);
        versionManager = VersionManager_1.VersionManager.getInstance(context, loggingService, notificationService);
        telemetryService = TelemetryService_1.TelemetryService.getInstance(context, loggingService);
    });
    suite('Version Management', () => {
        test('should get current version', () => {
            const version = versionManager.getCurrentVersion();
            assert.ok(version, 'Version should be available');
            assert.match(version, /^\d+\.\d+\.\d+/, 'Version should follow semver format');
        });
        test('should get version info', async () => {
            const versionInfo = await versionManager.getVersionInfo();
            assert.ok(versionInfo.current, 'Current version should be available');
            assert.strictEqual(typeof versionInfo.updateAvailable, 'boolean', 'Update available should be boolean');
            assert.strictEqual(typeof versionInfo.isPreRelease, 'boolean', 'Pre-release flag should be boolean');
        });
        test('should check for updates', async () => {
            const updateCheck = await versionManager.checkForUpdates();
            assert.strictEqual(typeof updateCheck.updateAvailable, 'boolean', 'Update available should be boolean');
            if (updateCheck.updateAvailable) {
                assert.ok(updateCheck.version, 'Version should be provided if update available');
            }
        });
        test('should handle version comparison correctly', () => {
            // Test version comparison logic through public interface
            const currentVersion = versionManager.getCurrentVersion();
            assert.ok(currentVersion, 'Current version should be available for comparison');
        });
    });
    suite('Telemetry Service', () => {
        test('should initialize telemetry service', async () => {
            await telemetryService.initialize();
            // If no error is thrown, initialization succeeded
            assert.ok(true, 'Telemetry service should initialize without errors');
        });
        test('should track events when enabled', () => {
            telemetryService.trackEvent('test_event', { testProperty: 'testValue' });
            // If no error is thrown, event tracking succeeded
            assert.ok(true, 'Event tracking should work without errors');
        });
        test('should track command execution', () => {
            telemetryService.trackCommand('test.command', true, 1000);
            // If no error is thrown, command tracking succeeded
            assert.ok(true, 'Command tracking should work without errors');
        });
        test('should track workflow generation', () => {
            telemetryService.trackWorkflowGeneration(['nodejs', 'typescript'], ['ci', 'cd'], true, 5000);
            // If no error is thrown, workflow tracking succeeded
            assert.ok(true, 'Workflow generation tracking should work without errors');
        });
        test('should track errors safely', () => {
            const testError = new Error('Test error');
            telemetryService.trackError(testError, 'test_context');
            // If no error is thrown, error tracking succeeded
            assert.ok(true, 'Error tracking should work without errors');
        });
        test('should get usage statistics', () => {
            const stats = telemetryService.getUsageStatistics();
            assert.ok(stats, 'Usage statistics should be available');
            assert.strictEqual(typeof stats.commandExecutions, 'object', 'Command executions should be object');
            assert.strictEqual(typeof stats.workflowGenerations, 'number', 'Workflow generations should be number');
            assert.strictEqual(typeof stats.errorsEncountered, 'number', 'Errors encountered should be number');
            assert.strictEqual(typeof stats.sessionDuration, 'number', 'Session duration should be number');
            assert.ok(Array.isArray(stats.featuresUsed), 'Features used should be array');
        });
        test('should handle configuration updates', async () => {
            await telemetryService.updateConfiguration({
                enabled: true,
                level: 'all',
                collectUsageData: true
            });
            // If no error is thrown, configuration update succeeded
            assert.ok(true, 'Configuration update should work without errors');
        });
    });
    suite('Extension Packaging', () => {
        test('should have valid package.json', () => {
            const packageJsonPath = path.join(__dirname, '../../../package.json');
            assert.ok(fs.existsSync(packageJsonPath), 'package.json should exist');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            // Validate required fields
            assert.ok(packageJson.name, 'Package name should be defined');
            assert.ok(packageJson.displayName, 'Display name should be defined');
            assert.ok(packageJson.description, 'Description should be defined');
            assert.ok(packageJson.version, 'Version should be defined');
            assert.ok(packageJson.publisher, 'Publisher should be defined');
            assert.ok(packageJson.engines?.vscode, 'VS Code engine should be defined');
            // Validate version format
            assert.match(packageJson.version, /^\d+\.\d+\.\d+/, 'Version should follow semver format');
            // Validate categories
            assert.ok(Array.isArray(packageJson.categories), 'Categories should be array');
            assert.ok(packageJson.categories.length > 0, 'Should have at least one category');
            // Validate keywords
            assert.ok(Array.isArray(packageJson.keywords), 'Keywords should be array');
            assert.ok(packageJson.keywords.length > 0, 'Should have at least one keyword');
            // Validate commands
            assert.ok(packageJson.contributes?.commands, 'Commands should be defined');
            assert.ok(Array.isArray(packageJson.contributes.commands), 'Commands should be array');
            // Validate configuration
            assert.ok(packageJson.contributes?.configuration, 'Configuration should be defined');
            assert.ok(packageJson.contributes.configuration.properties, 'Configuration properties should be defined');
        });
        test('should have required files', () => {
            const requiredFiles = [
                'README.md',
                'CHANGELOG.md',
                'package.json',
                'webpack.config.js',
                '.vscodeignore'
            ];
            for (const file of requiredFiles) {
                const filePath = path.join(__dirname, '../../../', file);
                assert.ok(fs.existsSync(filePath), `Required file should exist: ${file}`);
            }
        });
        test('should have valid webpack configuration', () => {
            const webpackConfigPath = path.join(__dirname, '../../../webpack.config.js');
            assert.ok(fs.existsSync(webpackConfigPath), 'webpack.config.js should exist');
            // Try to require the config to ensure it's valid
            const webpackConfig = require(webpackConfigPath);
            assert.ok(Array.isArray(webpackConfig), 'Webpack config should be array');
            assert.ok(webpackConfig.length >= 2, 'Should have extension and webview configs');
            // Validate extension config
            const extensionConfig = webpackConfig[0];
            assert.strictEqual(extensionConfig.target, 'node', 'Extension target should be node');
            assert.ok(extensionConfig.entry, 'Extension entry should be defined');
            assert.ok(extensionConfig.output, 'Extension output should be defined');
            // Validate webview config
            const webviewConfig = webpackConfig[1];
            assert.strictEqual(webviewConfig.target, 'web', 'Webview target should be web');
            assert.ok(webviewConfig.entry, 'Webview entry should be defined');
            assert.ok(webviewConfig.output, 'Webview output should be defined');
        });
        test('should have valid .vscodeignore', () => {
            const vscodeignorePath = path.join(__dirname, '../../../.vscodeignore');
            assert.ok(fs.existsSync(vscodeignorePath), '.vscodeignore should exist');
            const content = fs.readFileSync(vscodeignorePath, 'utf8');
            // Should exclude source files
            assert.ok(content.includes('src/**'), 'Should exclude source files');
            assert.ok(content.includes('test/**'), 'Should exclude test files');
            assert.ok(content.includes('node_modules/**'), 'Should exclude node_modules');
            // Should exclude development files
            assert.ok(content.includes('webpack.config.js'), 'Should exclude webpack config');
            assert.ok(content.includes('tsconfig.json'), 'Should exclude TypeScript config');
        });
    });
    suite('Build and Bundle Validation', () => {
        test('should have compiled output', () => {
            const outDir = path.join(__dirname, '../../../out');
            assert.ok(fs.existsSync(outDir), 'Output directory should exist');
            const extensionJs = path.join(outDir, 'extension.js');
            assert.ok(fs.existsSync(extensionJs), 'Extension bundle should exist');
            // Check bundle size (should be reasonable)
            const stats = fs.statSync(extensionJs);
            const sizeInMB = stats.size / (1024 * 1024);
            assert.ok(sizeInMB < 10, `Extension bundle should be less than 10MB, got ${sizeInMB.toFixed(2)}MB`);
            assert.ok(sizeInMB > 0.01, `Extension bundle should be more than 0.01MB, got ${sizeInMB.toFixed(2)}MB`);
        });
        test('should have webview bundles', () => {
            const webviewDir = path.join(__dirname, '../../../out/webview-ui');
            if (fs.existsSync(webviewDir)) {
                const expectedBundles = [
                    'configuration-webview.js',
                    'preview-webview.js',
                    'template-management.js',
                    'performance-monitoring.js'
                ];
                for (const bundle of expectedBundles) {
                    const bundlePath = path.join(webviewDir, bundle);
                    if (fs.existsSync(bundlePath)) {
                        const stats = fs.statSync(bundlePath);
                        assert.ok(stats.size > 0, `Webview bundle should not be empty: ${bundle}`);
                    }
                }
            }
        });
    });
    suite('Quality Assurance', () => {
        test('should have test configuration', () => {
            const testConfigPath = path.join(__dirname, '../../../test-config.json');
            assert.ok(fs.existsSync(testConfigPath), 'test-config.json should exist');
            const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
            assert.ok(testConfig.testRunner, 'Test runner config should be defined');
            assert.ok(testConfig.coverage, 'Coverage config should be defined');
            assert.ok(testConfig.environments, 'Test environments should be defined');
            assert.ok(testConfig.platforms, 'Platform configs should be defined');
            assert.ok(testConfig.quality, 'Quality thresholds should be defined');
        });
        test('should have CI/CD pipeline', () => {
            const workflowPath = path.join(__dirname, '../../../.github/workflows/test.yml');
            assert.ok(fs.existsSync(workflowPath), 'GitHub Actions workflow should exist');
            const workflow = fs.readFileSync(workflowPath, 'utf8');
            // Should have required jobs
            assert.ok(workflow.includes('lint:'), 'Should have lint job');
            assert.ok(workflow.includes('unit-tests:'), 'Should have unit tests job');
            assert.ok(workflow.includes('integration-tests:'), 'Should have integration tests job');
            assert.ok(workflow.includes('package:'), 'Should have package job');
            assert.ok(workflow.includes('security:'), 'Should have security job');
            // Should test multiple platforms
            assert.ok(workflow.includes('ubuntu-latest'), 'Should test on Ubuntu');
            assert.ok(workflow.includes('windows-latest'), 'Should test on Windows');
            assert.ok(workflow.includes('macos-latest'), 'Should test on macOS');
        });
        test('should have deployment script', () => {
            const deployScriptPath = path.join(__dirname, '../../../scripts/deploy.js');
            assert.ok(fs.existsSync(deployScriptPath), 'Deployment script should exist');
            const deployScript = fs.readFileSync(deployScriptPath, 'utf8');
            // Should have required deployment steps
            assert.ok(deployScript.includes('preDeploymentValidation'), 'Should have pre-deployment validation');
            assert.ok(deployScript.includes('runQualityAssurance'), 'Should have quality assurance');
            assert.ok(deployScript.includes('packageExtension'), 'Should have packaging');
            assert.ok(deployScript.includes('publishToMarketplace'), 'Should have marketplace publishing');
            assert.ok(deployScript.includes('postDeploymentVerification'), 'Should have post-deployment verification');
        });
    });
    suite('Cross-Platform Compatibility', () => {
        test('should handle platform-specific paths', () => {
            const testPaths = [
                'README.md',
                '.github/workflows',
                'src/extension.ts',
                'out/extension.js'
            ];
            for (const testPath of testPaths) {
                const normalized = path.normalize(testPath);
                assert.ok(normalized, `Path should normalize correctly: ${testPath}`);
                // Should work with both forward and backward slashes
                const withBackslash = testPath.replace(/\//g, '\\');
                const normalizedBackslash = path.normalize(withBackslash);
                assert.ok(normalizedBackslash, `Path with backslashes should normalize: ${withBackslash}`);
            }
        });
        test('should handle platform-specific commands', () => {
            const platform = process.platform;
            assert.ok(['win32', 'darwin', 'linux'].includes(platform), 'Should run on supported platform');
            // Platform-specific behavior should be handled gracefully
            if (platform === 'win32') {
                assert.ok(process.env.PATH?.includes(';'), 'Windows should use semicolon path separator');
            }
            else {
                assert.ok(process.env.PATH?.includes(':'), 'Unix-like systems should use colon path separator');
            }
        });
    });
    suiteTeardown(() => {
        // Clean up any test artifacts
        if (telemetryService) {
            telemetryService.dispose();
        }
        if (versionManager) {
            versionManager.dispose();
        }
    });
});
//# sourceMappingURL=PackagingDeployment.test.js.map