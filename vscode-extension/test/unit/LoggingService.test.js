"use strict";
/**
 * Logging Service Tests
 *
 * Tests for logging and debugging capabilities
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
const vscode = __importStar(require("vscode"));
const sinon = __importStar(require("sinon"));
const fs = __importStar(require("fs"));
const LoggingService_1 = require("../../src/core/LoggingService");
suite('LoggingService Tests', () => {
    let loggingService;
    let mockContext;
    let mockConfiguration;
    let sandbox;
    setup(() => {
        sandbox = sinon.createSandbox();
        mockContext = {
            subscriptions: [],
            globalStorageUri: {
                fsPath: '/test/storage'
            },
            extension: {
                packageJSON: { version: '1.0.0' }
            }
        };
        mockConfiguration = {
            debugMode: true,
            logLevel: 'debug',
            enableFileLogging: false // Disable file logging for tests
        };
        // Mock VS Code APIs
        sandbox.stub(vscode.window, 'createOutputChannel').returns({
            appendLine: sandbox.stub(),
            clear: sandbox.stub(),
            show: sandbox.stub(),
            dispose: sandbox.stub()
        });
        // Mock file system operations
        sandbox.stub(fs, 'existsSync').returns(false);
        sandbox.stub(fs, 'mkdirSync');
        sandbox.stub(fs, 'appendFileSync');
        sandbox.stub(fs, 'readdirSync').returns([]);
        sandbox.stub(fs, 'statSync').returns({ mtime: new Date(), size: 1024 });
        sandbox.stub(fs, 'unlinkSync');
        loggingService = new LoggingService_1.LoggingService(mockContext, mockConfiguration);
    });
    teardown(() => {
        sandbox.restore();
        loggingService.dispose();
    });
    suite('Basic Logging', () => {
        test('should log error messages', () => {
            const options = {
                component: 'test-component',
                operation: 'test-operation'
            };
            loggingService.error('Test error message', options);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].level, LoggingService_1.LogLevel.ERROR);
            assert.strictEqual(logs[0].message, 'Test error message');
            assert.strictEqual(logs[0].component, 'test-component');
            assert.strictEqual(logs[0].operation, 'test-operation');
        });
        test('should log warning messages', () => {
            const options = {
                component: 'test-component',
                operation: 'test-operation'
            };
            loggingService.warn('Test warning message', options);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].level, LoggingService_1.LogLevel.WARN);
            assert.strictEqual(logs[0].message, 'Test warning message');
        });
        test('should log info messages', () => {
            const options = {
                component: 'test-component',
                operation: 'test-operation'
            };
            loggingService.info('Test info message', options);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].level, LoggingService_1.LogLevel.INFO);
            assert.strictEqual(logs[0].message, 'Test info message');
        });
        test('should log debug messages', () => {
            const options = {
                component: 'test-component',
                operation: 'test-operation'
            };
            loggingService.debug('Test debug message', options);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].level, LoggingService_1.LogLevel.DEBUG);
            assert.strictEqual(logs[0].message, 'Test debug message');
        });
        test('should log trace messages', () => {
            const options = {
                component: 'test-component',
                operation: 'test-operation'
            };
            loggingService.trace('Test trace message', options);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].level, LoggingService_1.LogLevel.TRACE);
            assert.strictEqual(logs[0].message, 'Test trace message');
        });
    });
    suite('Log Levels', () => {
        test('should respect log level configuration - ERROR only', () => {
            mockConfiguration.logLevel = 'error';
            const service = new LoggingService_1.LoggingService(mockContext, mockConfiguration);
            service.error('Error message', { component: 'test' });
            service.warn('Warning message', { component: 'test' });
            service.info('Info message', { component: 'test' });
            const logs = service.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].level, LoggingService_1.LogLevel.ERROR);
            service.dispose();
        });
        test('should respect log level configuration - WARN and above', () => {
            mockConfiguration.logLevel = 'warn';
            const service = new LoggingService_1.LoggingService(mockContext, mockConfiguration);
            service.error('Error message', { component: 'test' });
            service.warn('Warning message', { component: 'test' });
            service.info('Info message', { component: 'test' });
            service.debug('Debug message', { component: 'test' });
            const logs = service.getLogs();
            assert.strictEqual(logs.length, 2);
            assert.ok(logs.some(log => log.level === LoggingService_1.LogLevel.ERROR));
            assert.ok(logs.some(log => log.level === LoggingService_1.LogLevel.WARN));
            service.dispose();
        });
        test('should respect log level configuration - INFO and above', () => {
            mockConfiguration.logLevel = 'info';
            const service = new LoggingService_1.LoggingService(mockContext, mockConfiguration);
            service.error('Error message', { component: 'test' });
            service.warn('Warning message', { component: 'test' });
            service.info('Info message', { component: 'test' });
            service.debug('Debug message', { component: 'test' });
            const logs = service.getLogs();
            assert.strictEqual(logs.length, 3);
            assert.ok(!logs.some(log => log.level === LoggingService_1.LogLevel.DEBUG));
            service.dispose();
        });
    });
    suite('Operation Logging', () => {
        test('should start and end operations with correlation ID', () => {
            const correlationId = loggingService.startOperation('test-operation', 'test-component');
            assert.ok(correlationId);
            assert.ok(correlationId.startsWith('corr_'));
            loggingService.endOperation(correlationId, 'test-operation', 'test-component', true, 100);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 2);
            const startLog = logs.find(log => log.message.includes('Starting operation'));
            const endLog = logs.find(log => log.message.includes('completed'));
            assert.ok(startLog);
            assert.ok(endLog);
            assert.strictEqual(startLog.correlationId, correlationId);
            assert.strictEqual(endLog.correlationId, correlationId);
        });
        test('should handle operation failures', () => {
            const correlationId = loggingService.startOperation('failing-operation', 'test-component');
            const error = new Error('Operation failed');
            loggingService.endOperation(correlationId, 'failing-operation', 'test-component', false, 150, undefined, error);
            const logs = loggingService.getLogs();
            const endLog = logs.find(log => log.message.includes('failed'));
            assert.ok(endLog);
            assert.strictEqual(endLog.level, LoggingService_1.LogLevel.ERROR);
            assert.strictEqual(endLog.error, error);
        });
        test('should wrap operations with automatic logging', async () => {
            const testOperation = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'success';
            };
            const result = await loggingService.withOperation('wrapped-operation', 'test-component', testOperation);
            assert.strictEqual(result, 'success');
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 2);
            const startLog = logs.find(log => log.message.includes('Starting operation'));
            const endLog = logs.find(log => log.message.includes('completed'));
            assert.ok(startLog);
            assert.ok(endLog);
        });
        test('should handle wrapped operation failures', async () => {
            const testOperation = async () => {
                throw new Error('Wrapped operation failed');
            };
            try {
                await loggingService.withOperation('failing-wrapped-operation', 'test-component', testOperation);
                assert.fail('Should have thrown');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Wrapped operation failed');
            }
            const logs = loggingService.getLogs();
            const endLog = logs.find(log => log.message.includes('failed'));
            assert.ok(endLog);
            assert.strictEqual(endLog.level, LoggingService_1.LogLevel.ERROR);
        });
    });
    suite('Log Data and Context', () => {
        test('should include additional data in logs', () => {
            const testData = { key: 'value', number: 42 };
            const options = {
                component: 'test-component',
                operation: 'test-operation',
                data: testData
            };
            loggingService.info('Test message with data', options);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.deepStrictEqual(logs[0].data, testData);
        });
        test('should include correlation ID in logs', () => {
            const correlationId = 'test-correlation-id';
            const options = {
                component: 'test-component',
                operation: 'test-operation',
                correlationId
            };
            loggingService.info('Test message with correlation ID', options);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].correlationId, correlationId);
        });
        test('should include error objects in logs', () => {
            const testError = new Error('Test error');
            testError.stack = 'Test stack trace';
            const options = {
                component: 'test-component',
                operation: 'test-operation'
            };
            loggingService.error('Error occurred', options, testError);
            const logs = loggingService.getLogs();
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].error, testError);
        });
    });
    suite('Log Filtering', () => {
        setup(() => {
            // Add some test logs
            loggingService.error('Error 1', { component: 'comp1', operation: 'op1' });
            loggingService.warn('Warning 1', { component: 'comp1', operation: 'op2' });
            loggingService.info('Info 1', { component: 'comp2', operation: 'op1' });
            loggingService.debug('Debug 1', { component: 'comp2', operation: 'op3' });
        });
        test('should filter logs by level', () => {
            const errorLogs = loggingService.getLogs({ level: LoggingService_1.LogLevel.ERROR });
            assert.strictEqual(errorLogs.length, 1);
            assert.strictEqual(errorLogs[0].level, LoggingService_1.LogLevel.ERROR);
            const warnAndAbove = loggingService.getLogs({ level: LoggingService_1.LogLevel.WARN });
            assert.strictEqual(warnAndAbove.length, 2);
            assert.ok(warnAndAbove.every(log => log.level <= LoggingService_1.LogLevel.WARN));
        });
        test('should filter logs by component', () => {
            const comp1Logs = loggingService.getLogs({ component: 'comp1' });
            assert.strictEqual(comp1Logs.length, 2);
            assert.ok(comp1Logs.every(log => log.component === 'comp1'));
        });
        test('should filter logs by operation', () => {
            const op1Logs = loggingService.getLogs({ operation: 'op1' });
            assert.strictEqual(op1Logs.length, 2);
            assert.ok(op1Logs.every(log => log.operation === 'op1'));
        });
        test('should filter logs by time range', () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const recentLogs = loggingService.getLogs({
                timeRange: {
                    start: oneHourAgo,
                    end: now
                }
            });
            assert.ok(recentLogs.length > 0);
            assert.ok(recentLogs.every(log => log.timestamp >= oneHourAgo && log.timestamp <= now));
        });
        test('should filter logs by search text', () => {
            const searchLogs = loggingService.getLogs({ searchText: 'Error' });
            assert.strictEqual(searchLogs.length, 1);
            assert.ok(searchLogs[0].message.includes('Error'));
        });
        test('should combine multiple filters', () => {
            const filteredLogs = loggingService.getLogs({
                level: LoggingService_1.LogLevel.WARN,
                component: 'comp1'
            });
            assert.strictEqual(filteredLogs.length, 2);
            assert.ok(filteredLogs.every(log => log.level <= LoggingService_1.LogLevel.WARN && log.component === 'comp1'));
        });
    });
    suite('Operation Log Retrieval', () => {
        test('should get logs for specific operation', () => {
            const correlationId = loggingService.startOperation('test-operation', 'test-component');
            loggingService.info('Step 1', { component: 'test-component', correlationId });
            loggingService.info('Step 2', { component: 'test-component', correlationId });
            loggingService.endOperation(correlationId, 'test-operation', 'test-component', true, 100);
            const operationLogs = loggingService.getOperationLogs(correlationId);
            assert.strictEqual(operationLogs.length, 4); // start, step1, step2, end
            assert.ok(operationLogs.every(log => log.correlationId === correlationId));
            // Should be sorted by timestamp
            for (let i = 1; i < operationLogs.length; i++) {
                assert.ok(operationLogs[i].timestamp >= operationLogs[i - 1].timestamp);
            }
        });
    });
    suite('Log Display and Export', () => {
        test('should show logs in output channel', () => {
            const outputChannel = loggingService.outputChannel;
            const clearStub = sandbox.stub(outputChannel, 'clear');
            const appendLineStub = sandbox.stub(outputChannel, 'appendLine');
            const showStub = sandbox.stub(outputChannel, 'show');
            loggingService.info('Test log message', { component: 'test' });
            loggingService.showLogs();
            assert.ok(clearStub.calledOnce);
            assert.ok(appendLineStub.called);
            assert.ok(showStub.calledOnce);
        });
        test('should export logs to JSON', async () => {
            loggingService.info('Test log for export', { component: 'test' });
            const exportData = await loggingService.exportLogs();
            const parsed = JSON.parse(exportData);
            assert.ok(parsed.timestamp);
            assert.ok(parsed.sessionId);
            assert.ok(parsed.version);
            assert.ok(Array.isArray(parsed.logs));
            assert.strictEqual(parsed.logs.length, 1);
            assert.strictEqual(parsed.logs[0].message, 'Test log for export');
        });
        test('should export filtered logs', async () => {
            loggingService.error('Error log', { component: 'test' });
            loggingService.info('Info log', { component: 'test' });
            const exportData = await loggingService.exportLogs({ level: LoggingService_1.LogLevel.ERROR });
            const parsed = JSON.parse(exportData);
            assert.strictEqual(parsed.logs.length, 1);
            assert.strictEqual(parsed.logs[0].level, LoggingService_1.LogLevel.ERROR);
        });
    });
    suite('Log Management', () => {
        test('should clear old logs', () => {
            // Add some logs
            loggingService.info('Recent log', { component: 'test' });
            loggingService.info('Old log', { component: 'test' });
            // Mock old timestamp
            const logs = loggingService.logs;
            if (logs.length > 1) {
                logs[1].timestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
            }
            const cleared = loggingService.clearLogs(7);
            assert.strictEqual(cleared, 1);
            const remainingLogs = loggingService.getLogs();
            assert.strictEqual(remainingLogs.length, 1);
        });
        test('should limit memory logs to prevent memory leaks', () => {
            // Add many logs to trigger memory limit
            for (let i = 0; i < 12000; i++) {
                loggingService.info(`Log ${i}`, { component: 'test' });
            }
            const logs = loggingService.getLogs();
            assert.ok(logs.length <= 10000); // Should be limited
        });
    });
    suite('Statistics', () => {
        test('should provide logging statistics', () => {
            loggingService.error('Error 1', { component: 'comp1' });
            loggingService.warn('Warning 1', { component: 'comp1' });
            loggingService.info('Info 1', { component: 'comp2' });
            const stats = loggingService.getStatistics();
            assert.strictEqual(stats.totalLogs, 3);
            assert.strictEqual(stats.recentLogs, 3);
            assert.strictEqual(stats.byLevel.error, 1);
            assert.strictEqual(stats.byLevel.warn, 1);
            assert.strictEqual(stats.byLevel.info, 1);
            assert.strictEqual(stats.byComponent['comp1'], 2);
            assert.strictEqual(stats.byComponent['comp2'], 1);
            assert.ok(stats.sessionId);
        });
        test('should track operation statistics', () => {
            const correlationId1 = loggingService.startOperation('op1', 'comp1');
            const correlationId2 = loggingService.startOperation('op2', 'comp2');
            loggingService.endOperation(correlationId1, 'op1', 'comp1', true, 100);
            loggingService.endOperation(correlationId2, 'op2', 'comp2', true, 200);
            const stats = loggingService.getStatistics();
            assert.strictEqual(stats.operationCount, 2);
            assert.ok(stats.averageLogsPerOperation > 0);
        });
    });
    suite('Debug Package Creation', () => {
        test('should create debug package', async () => {
            loggingService.error('Debug error', { component: 'test' });
            loggingService.info('Debug info', { component: 'test' });
            const debugPackage = await loggingService.createDebugPackage();
            const parsed = JSON.parse(debugPackage);
            assert.ok(parsed.timestamp);
            assert.ok(parsed.sessionId);
            assert.ok(parsed.version);
            assert.ok(parsed.configuration);
            assert.ok(parsed.statistics);
            assert.ok(Array.isArray(parsed.recentLogs));
            assert.ok(parsed.systemInfo);
            assert.ok(parsed.systemInfo.platform);
            assert.ok(parsed.systemInfo.nodeVersion);
        });
        test('should sanitize configuration in debug package', async () => {
            mockConfiguration.apiKeys = 'secret-key';
            mockConfiguration.tokens = 'secret-token';
            const service = new LoggingService_1.LoggingService(mockContext, mockConfiguration);
            const debugPackage = await service.createDebugPackage();
            const parsed = JSON.parse(debugPackage);
            assert.ok(!parsed.configuration.apiKeys);
            assert.ok(!parsed.configuration.tokens);
            service.dispose();
        });
    });
    suite('Global Error Handlers', () => {
        test('should set up global error handlers', () => {
            const originalUncaughtHandlers = process.listeners('uncaughtException').length;
            const originalRejectionHandlers = process.listeners('unhandledRejection').length;
            const service = new LoggingService_1.LoggingService(mockContext, mockConfiguration);
            const newUncaughtHandlers = process.listeners('uncaughtException').length;
            const newRejectionHandlers = process.listeners('unhandledRejection').length;
            assert.ok(newUncaughtHandlers > originalUncaughtHandlers);
            assert.ok(newRejectionHandlers > originalRejectionHandlers);
            service.dispose();
        });
    });
    suite('Console and File Logging', () => {
        test('should write to console in debug mode', () => {
            const consoleErrorStub = sandbox.stub(console, 'error');
            const consoleWarnStub = sandbox.stub(console, 'warn');
            const consoleInfoStub = sandbox.stub(console, 'info');
            const consoleLogStub = sandbox.stub(console, 'log');
            loggingService.error('Console error', { component: 'test' });
            loggingService.warn('Console warning', { component: 'test' });
            loggingService.info('Console info', { component: 'test' });
            loggingService.debug('Console debug', { component: 'test' });
            assert.ok(consoleErrorStub.calledOnce);
            assert.ok(consoleWarnStub.calledOnce);
            assert.ok(consoleInfoStub.calledOnce);
            assert.ok(consoleLogStub.calledOnce);
        });
        test('should not write to console when debug mode is disabled', () => {
            mockConfiguration.debugMode = false;
            const service = new LoggingService_1.LoggingService(mockContext, mockConfiguration);
            const consoleErrorStub = sandbox.stub(console, 'error');
            service.error('Console error', { component: 'test' });
            assert.ok(consoleErrorStub.notCalled);
            service.dispose();
        });
    });
});
//# sourceMappingURL=LoggingService.test.js.map