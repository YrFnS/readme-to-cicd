"use strict";
/**
 * Performance Monitoring Service Tests
 *
 * Tests for the performance monitoring service that provides real-time insights.
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
const vitest_1 = require("vitest");
const vscode = __importStar(require("vscode"));
const PerformanceMonitoringService_1 = require("../../src/core/PerformanceMonitoringService");
// Mock VS Code API
vitest_1.vi.mock('vscode', () => ({
    workspace: {
        createFileSystemWatcher: vitest_1.vi.fn(() => ({
            onDidCreate: vitest_1.vi.fn(),
            onDidChange: vitest_1.vi.fn(),
            onDidDelete: vitest_1.vi.fn(),
            dispose: vitest_1.vi.fn()
        })),
        findFiles: vitest_1.vi.fn(),
        applyEdit: vitest_1.vi.fn(),
        workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }]
    },
    window: {
        createStatusBarItem: vitest_1.vi.fn(() => ({
            text: '',
            tooltip: '',
            command: '',
            backgroundColor: undefined,
            show: vitest_1.vi.fn(),
            dispose: vitest_1.vi.fn()
        })),
        showWarningMessage: vitest_1.vi.fn(),
        showInformationMessage: vitest_1.vi.fn(),
        showErrorMessage: vitest_1.vi.fn(),
        createWebviewPanel: vitest_1.vi.fn(() => ({
            webview: {
                html: '',
                onDidReceiveMessage: vitest_1.vi.fn(),
                postMessage: vitest_1.vi.fn()
            },
            dispose: vitest_1.vi.fn()
        }))
    },
    commands: {
        registerCommand: vitest_1.vi.fn()
    },
    StatusBarAlignment: {
        Right: 2
    },
    ViewColumn: {
        One: 1
    },
    RelativePattern: vitest_1.vi.fn(),
    Uri: {
        file: vitest_1.vi.fn((path) => ({ fsPath: path }))
    },
    Range: vitest_1.vi.fn(),
    WorkspaceEdit: vitest_1.vi.fn(() => ({
        replace: vitest_1.vi.fn()
    })),
    CodeAction: vitest_1.vi.fn(),
    CodeActionKind: {
        QuickFix: 'quickfix'
    },
    ThemeColor: vitest_1.vi.fn()
}));
// Mock PerformanceAnalyzer
vitest_1.vi.mock('../../src/core/PerformanceAnalyzer', () => ({
    PerformanceAnalyzer: vitest_1.vi.fn().mockImplementation(() => ({
        analyzeWorkflowPerformance: vitest_1.vi.fn(),
        generateOptimizedWorkflow: vitest_1.vi.fn()
    }))
}));
(0, vitest_1.describe)('PerformanceMonitoringService', () => {
    let service;
    let mockContext;
    let mockConfiguration;
    let mockOptions;
    // Helper function to create proper mock recommendations
    const createMockRecommendation = (id, title, category, estimatedTimeSaving) => ({
        id,
        title,
        description: `Mock description for ${title}`,
        category,
        priority: 'high',
        estimatedTimeSaving,
        implementation: {
            type: 'step-addition',
            changes: [],
            example: '',
            documentation: 'https://docs.github.com'
        },
        applicableSteps: []
    });
    (0, vitest_1.beforeEach)(() => {
        mockContext = {
            subscriptions: [],
            workspaceState: {},
            globalState: {},
            extensionPath: '/test/path'
        };
        mockConfiguration = {
            defaultOutputDirectory: '.github/workflows',
            enableAutoGeneration: false,
            preferredWorkflowTypes: ['ci'],
            customTemplates: [],
            gitIntegration: {
                autoCommit: false,
                commitMessage: 'Update workflows',
                createPR: false
            },
            showPreviewByDefault: true,
            enableInlineValidation: true,
            notificationLevel: 'all'
        };
        mockOptions = {
            enableRealTimeAnalysis: true,
            analysisInterval: 30000, // 30 seconds
            enableNotifications: true,
            performanceThreshold: 70
        };
        service = new PerformanceMonitoringService_1.PerformanceMonitoringService(mockContext, mockConfiguration, mockOptions);
    });
    (0, vitest_1.afterEach)(() => {
        service.dispose();
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should initialize with correct configuration', () => {
            (0, vitest_1.expect)(service).toBeDefined();
            (0, vitest_1.expect)(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
            (0, vitest_1.expect)(vscode.window.createStatusBarItem).toHaveBeenCalled();
            (0, vitest_1.expect)(vscode.commands.registerCommand).toHaveBeenCalledTimes(3);
        });
        (0, vitest_1.it)('should register required commands', () => {
            (0, vitest_1.expect)(vscode.commands.registerCommand).toHaveBeenCalledWith('readme-to-cicd.showPerformanceInsights', vitest_1.expect.any(Function));
            (0, vitest_1.expect)(vscode.commands.registerCommand).toHaveBeenCalledWith('readme-to-cicd.analyzeWorkflowPerformance', vitest_1.expect.any(Function));
            (0, vitest_1.expect)(vscode.commands.registerCommand).toHaveBeenCalledWith('readme-to-cicd.applyPerformanceOptimization', vitest_1.expect.any(Function));
        });
        (0, vitest_1.it)('should set up status bar item', () => {
            const statusBarItem = vitest_1.vi.mocked(vscode.window.createStatusBarItem).mock.results[0].value;
            (0, vitest_1.expect)(statusBarItem.show).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('workflow analysis', () => {
        (0, vitest_1.it)('should analyze workflow performance and generate insights', async () => {
            const mockAnalysis = {
                workflowPath: '/test/workflow.yml',
                overallScore: 65,
                recommendations: [
                    createMockRecommendation('cache-deps', 'Add dependency caching', 'caching', 120)
                ],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            };
            const mockAnalyzer = service['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
            const insight = await service.analyzeWorkflowPerformance('/test/workflow.yml');
            (0, vitest_1.expect)(insight).toBeDefined();
            (0, vitest_1.expect)(insight.workflowPath).toBe('/test/workflow.yml');
            (0, vitest_1.expect)(insight.analysis).toEqual(mockAnalysis);
            (0, vitest_1.expect)(insight.actionableRecommendations).toHaveLength(1);
            (0, vitest_1.expect)(insight.urgency).toBe('medium'); // Score 65 should be medium urgency
        });
        (0, vitest_1.it)('should determine urgency correctly', async () => {
            const mockAnalyzer = service['analyzer'];
            // High urgency (score < 40)
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue({
                workflowPath: '/test/low-score.yml',
                overallScore: 30,
                recommendations: [],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            });
            const lowScoreInsight = await service.analyzeWorkflowPerformance('/test/low-score.yml');
            (0, vitest_1.expect)(lowScoreInsight.urgency).toBe('high');
            // Medium urgency (score 40-70)
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue({
                workflowPath: '/test/medium-score.yml',
                overallScore: 55,
                recommendations: [],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            });
            const mediumScoreInsight = await service.analyzeWorkflowPerformance('/test/medium-score.yml');
            (0, vitest_1.expect)(mediumScoreInsight.urgency).toBe('medium');
            // Low urgency (score >= 70)
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue({
                workflowPath: '/test/high-score.yml',
                overallScore: 85,
                recommendations: [],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            });
            const highScoreInsight = await service.analyzeWorkflowPerformance('/test/high-score.yml');
            (0, vitest_1.expect)(highScoreInsight.urgency).toBe('low');
        });
        (0, vitest_1.it)('should generate actionable recommendations with quick fixes', async () => {
            const mockAnalysis = {
                workflowPath: '/test/workflow.yml',
                overallScore: 60,
                recommendations: [
                    createMockRecommendation('cache-deps', 'Add dependency caching', 'caching', 120),
                    {
                        ...createMockRecommendation('parallel-jobs', 'Parallelize jobs', 'parallelization', 180),
                        implementation: {
                            type: 'job-restructure',
                            changes: [],
                            example: '',
                            documentation: 'https://docs.github.com/jobs'
                        }
                    }
                ],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            };
            const mockAnalyzer = service['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
            const insight = await service.analyzeWorkflowPerformance('/test/workflow.yml');
            (0, vitest_1.expect)(insight.actionableRecommendations).toHaveLength(2);
            // Should be sorted by estimated impact (highest first)
            (0, vitest_1.expect)(insight.actionableRecommendations[0].estimatedImpact).toBe(180);
            (0, vitest_1.expect)(insight.actionableRecommendations[1].estimatedImpact).toBe(120);
            // Should have correct difficulty levels
            (0, vitest_1.expect)(insight.actionableRecommendations[0].difficulty).toBe('hard'); // job-restructure
            (0, vitest_1.expect)(insight.actionableRecommendations[1].difficulty).toBe('easy'); // step-addition
            // Should have quick fixes
            (0, vitest_1.expect)(insight.actionableRecommendations[0].quickFix).toBeDefined();
            (0, vitest_1.expect)(insight.actionableRecommendations[1].quickFix).toBeDefined();
        });
    });
    (0, vitest_1.describe)('notifications', () => {
        (0, vitest_1.it)('should show notification for low performance scores', async () => {
            const mockAnalysis = {
                workflowPath: '/test/low-performance.yml',
                overallScore: 45, // Below threshold of 70
                recommendations: [
                    createMockRecommendation('cache-deps', 'Add dependency caching', 'caching', 120)
                ],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            };
            const mockAnalyzer = service['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
            await service.analyzeWorkflowPerformance('/test/low-performance.yml');
            (0, vitest_1.expect)(vscode.window.showWarningMessage).toHaveBeenCalledWith(vitest_1.expect.stringContaining('has performance score 45/100'), 'View Details', 'Apply Quick Fix', 'Dismiss');
        });
        (0, vitest_1.it)('should not show notification for high performance scores', async () => {
            const mockAnalysis = {
                workflowPath: '/test/high-performance.yml',
                overallScore: 85, // Above threshold of 70
                recommendations: [],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            };
            const mockAnalyzer = service['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
            await service.analyzeWorkflowPerformance('/test/high-performance.yml');
            (0, vitest_1.expect)(vscode.window.showWarningMessage).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should not show notifications when disabled', async () => {
            // Create service with notifications disabled
            const optionsWithoutNotifications = { ...mockOptions, enableNotifications: false };
            const serviceWithoutNotifications = new PerformanceMonitoringService_1.PerformanceMonitoringService(mockContext, mockConfiguration, optionsWithoutNotifications);
            const mockAnalysis = {
                workflowPath: '/test/low-performance.yml',
                overallScore: 45,
                recommendations: [],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            };
            const mockAnalyzer = serviceWithoutNotifications['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
            await serviceWithoutNotifications.analyzeWorkflowPerformance('/test/low-performance.yml');
            (0, vitest_1.expect)(vscode.window.showWarningMessage).not.toHaveBeenCalled();
            serviceWithoutNotifications.dispose();
        });
    });
    (0, vitest_1.describe)('metrics calculation', () => {
        (0, vitest_1.it)('should calculate metrics correctly', async () => {
            const mockAnalyses = [
                {
                    workflowPath: '/test/workflow1.yml',
                    overallScore: 80,
                    recommendations: [
                        createMockRecommendation('cache-1', 'Cache deps', 'caching', 60),
                        createMockRecommendation('parallel-1', 'Parallelize', 'parallelization', 90)
                    ],
                    cachingOpportunities: [],
                    parallelizationSuggestions: [],
                    resourceOptimizations: [],
                    bottlenecks: [],
                    estimatedImprovements: []
                },
                {
                    workflowPath: '/test/workflow2.yml',
                    overallScore: 60,
                    recommendations: [
                        createMockRecommendation('cache-2', 'Cache deps', 'caching', 120)
                    ],
                    cachingOpportunities: [],
                    parallelizationSuggestions: [],
                    resourceOptimizations: [],
                    bottlenecks: [],
                    estimatedImprovements: []
                }
            ];
            const mockAnalyzer = service['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance)
                .mockResolvedValueOnce(mockAnalyses[0])
                .mockResolvedValueOnce(mockAnalyses[1]);
            await service.analyzeWorkflowPerformance('/test/workflow1.yml');
            await service.analyzeWorkflowPerformance('/test/workflow2.yml');
            const metrics = service.getMetrics();
            (0, vitest_1.expect)(metrics.totalWorkflows).toBe(2);
            (0, vitest_1.expect)(metrics.averageScore).toBe(70); // (80 + 60) / 2
            (0, vitest_1.expect)(metrics.totalOptimizationOpportunities).toBe(3); // 2 + 1
            (0, vitest_1.expect)(metrics.estimatedTimeSavings).toBe(270); // 60 + 90 + 120
            (0, vitest_1.expect)(metrics.mostCommonIssues).toContain('caching');
        });
        (0, vitest_1.it)('should handle empty metrics correctly', () => {
            const metrics = service.getMetrics();
            (0, vitest_1.expect)(metrics.totalWorkflows).toBe(0);
            (0, vitest_1.expect)(metrics.averageScore).toBe(0);
            (0, vitest_1.expect)(metrics.totalOptimizationOpportunities).toBe(0);
            (0, vitest_1.expect)(metrics.estimatedTimeSavings).toBe(0);
            (0, vitest_1.expect)(metrics.mostCommonIssues).toEqual([]);
        });
    });
    (0, vitest_1.describe)('optimization application', () => {
        (0, vitest_1.it)('should apply optimization successfully', async () => {
            // First set up an insight with a recommendation
            const mockAnalysis = {
                workflowPath: '/test/workflow.yml',
                overallScore: 60,
                recommendations: [
                    createMockRecommendation('cache-deps', 'Add dependency caching', 'caching', 120)
                ],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            };
            const mockOptimized = {
                originalPath: '/test/workflow.yml',
                optimizedContent: 'optimized yaml content',
                appliedOptimizations: [
                    {
                        recommendationId: 'cache-deps',
                        title: 'Add dependency caching',
                        estimatedSaving: 120,
                        applied: true
                    }
                ],
                warnings: [],
                estimatedTimeSaving: 120,
                performanceScore: 80
            };
            const mockAnalyzer = service['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
            vitest_1.vi.mocked(mockAnalyzer.generateOptimizedWorkflow).mockResolvedValue(mockOptimized);
            // Analyze workflow first to create insight
            await service.analyzeWorkflowPerformance('/test/workflow.yml');
            // Apply optimization
            await service['applyOptimization']('cache-deps');
            (0, vitest_1.expect)(vscode.workspace.applyEdit).toHaveBeenCalled();
            (0, vitest_1.expect)(vscode.window.showInformationMessage).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Applied optimization: Add dependency caching'));
        });
        (0, vitest_1.it)('should handle optimization failures gracefully', async () => {
            const mockAnalysis = {
                workflowPath: '/test/workflow.yml',
                overallScore: 60,
                recommendations: [
                    {
                        id: 'cache-deps',
                        title: 'Add dependency caching',
                        description: 'Cache dependencies',
                        category: 'caching',
                        priority: 'high',
                        estimatedTimeSaving: 120,
                        implementation: { type: 'step-addition', documentation: '' }
                    }
                ],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            };
            const mockOptimized = {
                originalPath: '/test/workflow.yml',
                optimizedContent: 'content',
                appliedOptimizations: [
                    {
                        recommendationId: 'cache-deps',
                        title: 'Add dependency caching',
                        estimatedSaving: 0,
                        applied: false,
                        error: 'Failed to apply'
                    }
                ],
                warnings: ['Optimization failed'],
                estimatedTimeSaving: 0,
                performanceScore: 60
            };
            const mockAnalyzer = service['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
            vitest_1.vi.mocked(mockAnalyzer.generateOptimizedWorkflow).mockResolvedValue(mockOptimized);
            await service.analyzeWorkflowPerformance('/test/workflow.yml');
            await service['applyOptimization']('cache-deps');
            (0, vitest_1.expect)(vscode.window.showErrorMessage).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to apply optimization'));
        });
        (0, vitest_1.it)('should handle non-existent recommendations', async () => {
            await service['applyOptimization']('non-existent-id');
            (0, vitest_1.expect)(vscode.window.showErrorMessage).toHaveBeenCalledWith('Recommendation not found');
        });
    });
    (0, vitest_1.describe)('status bar updates', () => {
        (0, vitest_1.it)('should update status bar with performance metrics', async () => {
            const mockAnalysis = {
                workflowPath: '/test/workflow.yml',
                overallScore: 75,
                recommendations: [
                    { category: 'caching', estimatedTimeSaving: 60 }
                ],
                cachingOpportunities: [],
                parallelizationSuggestions: [],
                resourceOptimizations: [],
                bottlenecks: [],
                estimatedImprovements: []
            };
            const mockAnalyzer = service['analyzer'];
            vitest_1.vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
            await service.analyzeWorkflowPerformance('/test/workflow.yml');
            const statusBarItem = vitest_1.vi.mocked(vscode.window.createStatusBarItem).mock.results[0].value;
            (0, vitest_1.expect)(statusBarItem.text).toContain('Performance: 75/100');
            (0, vitest_1.expect)(statusBarItem.tooltip).toContain('Average workflow performance: 75/100');
            (0, vitest_1.expect)(statusBarItem.tooltip).toContain('1 optimization opportunities available');
        });
    });
    (0, vitest_1.describe)('disposal', () => {
        (0, vitest_1.it)('should dispose of resources correctly', () => {
            const fileWatcher = { dispose: vitest_1.vi.fn() };
            const statusBarItem = { dispose: vitest_1.vi.fn() };
            service['fileWatcher'] = fileWatcher;
            service['statusBarItem'] = statusBarItem;
            service.dispose();
            (0, vitest_1.expect)(fileWatcher.dispose).toHaveBeenCalled();
            (0, vitest_1.expect)(statusBarItem.dispose).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=PerformanceMonitoringService.test.js.map