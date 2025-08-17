/**
 * Performance Monitoring Service Tests
 * 
 * Tests for the performance monitoring service that provides real-time insights.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { PerformanceMonitoringService, PerformanceMonitoringOptions } from '../../src/core/PerformanceMonitoringService';
import { ExtensionConfiguration } from '../../src/core/types';

// Mock VS Code API
vi.mock('vscode', () => ({
  workspace: {
    createFileSystemWatcher: vi.fn(() => ({
      onDidCreate: vi.fn(),
      onDidChange: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn()
    })),
    findFiles: vi.fn(),
    applyEdit: vi.fn(),
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }]
  },
  window: {
    createStatusBarItem: vi.fn(() => ({
      text: '',
      tooltip: '',
      command: '',
      backgroundColor: undefined,
      show: vi.fn(),
      dispose: vi.fn()
    })),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn(),
        postMessage: vi.fn()
      },
      dispose: vi.fn()
    }))
  },
  commands: {
    registerCommand: vi.fn()
  },
  StatusBarAlignment: {
    Right: 2
  },
  ViewColumn: {
    One: 1
  },
  RelativePattern: vi.fn(),
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path }))
  },
  Range: vi.fn(),
  WorkspaceEdit: vi.fn(() => ({
    replace: vi.fn()
  })),
  CodeAction: vi.fn(),
  CodeActionKind: {
    QuickFix: 'quickfix'
  },
  ThemeColor: vi.fn()
}));

// Mock PerformanceAnalyzer
vi.mock('../../src/core/PerformanceAnalyzer', () => ({
  PerformanceAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeWorkflowPerformance: vi.fn(),
    generateOptimizedWorkflow: vi.fn()
  }))
}));

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;
  let mockContext: vscode.ExtensionContext;
  let mockConfiguration: ExtensionConfiguration;
  let mockOptions: PerformanceMonitoringOptions;

  // Helper function to create proper mock recommendations
  const createMockRecommendation = (id: string, title: string, category: string, estimatedTimeSaving: number) => ({
    id,
    title,
    description: `Mock description for ${title}`,
    category,
    priority: 'high' as const,
    estimatedTimeSaving,
    implementation: {
      type: 'step-addition' as const,
      changes: [],
      example: '',
      documentation: 'https://docs.github.com'
    },
    applicableSteps: []
  });

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {} as any,
      globalState: {} as any,
      extensionPath: '/test/path'
    } as vscode.ExtensionContext;

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

    service = new PerformanceMonitoringService(mockContext, mockConfiguration, mockOptions);
  });

  afterEach(() => {
    service.dispose();
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeDefined();
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
      expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
      expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(3);
    });

    it('should register required commands', () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'readme-to-cicd.showPerformanceInsights',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'readme-to-cicd.analyzeWorkflowPerformance',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'readme-to-cicd.applyPerformanceOptimization',
        expect.any(Function)
      );
    });

    it('should set up status bar item', () => {
      const statusBarItem = vi.mocked(vscode.window.createStatusBarItem).mock.results[0].value;
      expect(statusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('workflow analysis', () => {
    it('should analyze workflow performance and generate insights', async () => {
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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);

      const insight = await service.analyzeWorkflowPerformance('/test/workflow.yml');

      expect(insight).toBeDefined();
      expect(insight.workflowPath).toBe('/test/workflow.yml');
      expect(insight.analysis).toEqual(mockAnalysis);
      expect(insight.actionableRecommendations).toHaveLength(1);
      expect(insight.urgency).toBe('medium'); // Score 65 should be medium urgency
    });

    it('should determine urgency correctly', async () => {
      const mockAnalyzer = service['analyzer'];
      
      // High urgency (score < 40)
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue({
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
      expect(lowScoreInsight.urgency).toBe('high');

      // Medium urgency (score 40-70)
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue({
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
      expect(mediumScoreInsight.urgency).toBe('medium');

      // Low urgency (score >= 70)
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue({
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
      expect(highScoreInsight.urgency).toBe('low');
    });

    it('should generate actionable recommendations with quick fixes', async () => {
      const mockAnalysis = {
        workflowPath: '/test/workflow.yml',
        overallScore: 60,
        recommendations: [
          createMockRecommendation('cache-deps', 'Add dependency caching', 'caching', 120),
          {
            ...createMockRecommendation('parallel-jobs', 'Parallelize jobs', 'parallelization', 180),
            implementation: {
              type: 'job-restructure' as const,
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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);

      const insight = await service.analyzeWorkflowPerformance('/test/workflow.yml');

      expect(insight.actionableRecommendations).toHaveLength(2);
      
      // Should be sorted by estimated impact (highest first)
      expect(insight.actionableRecommendations[0].estimatedImpact).toBe(180);
      expect(insight.actionableRecommendations[1].estimatedImpact).toBe(120);
      
      // Should have correct difficulty levels
      expect(insight.actionableRecommendations[0].difficulty).toBe('hard'); // job-restructure
      expect(insight.actionableRecommendations[1].difficulty).toBe('easy'); // step-addition
      
      // Should have quick fixes
      expect(insight.actionableRecommendations[0].quickFix).toBeDefined();
      expect(insight.actionableRecommendations[1].quickFix).toBeDefined();
    });
  });

  describe('notifications', () => {
    it('should show notification for low performance scores', async () => {
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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);

      await service.analyzeWorkflowPerformance('/test/low-performance.yml');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('has performance score 45/100'),
        'View Details',
        'Apply Quick Fix',
        'Dismiss'
      );
    });

    it('should not show notification for high performance scores', async () => {
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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);

      await service.analyzeWorkflowPerformance('/test/high-performance.yml');

      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });

    it('should not show notifications when disabled', async () => {
      // Create service with notifications disabled
      const optionsWithoutNotifications = { ...mockOptions, enableNotifications: false };
      const serviceWithoutNotifications = new PerformanceMonitoringService(
        mockContext,
        mockConfiguration,
        optionsWithoutNotifications
      );

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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);

      await serviceWithoutNotifications.analyzeWorkflowPerformance('/test/low-performance.yml');

      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();

      serviceWithoutNotifications.dispose();
    });
  });

  describe('metrics calculation', () => {
    it('should calculate metrics correctly', async () => {
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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance)
        .mockResolvedValueOnce(mockAnalyses[0])
        .mockResolvedValueOnce(mockAnalyses[1]);

      await service.analyzeWorkflowPerformance('/test/workflow1.yml');
      await service.analyzeWorkflowPerformance('/test/workflow2.yml');

      const metrics = service.getMetrics();

      expect(metrics.totalWorkflows).toBe(2);
      expect(metrics.averageScore).toBe(70); // (80 + 60) / 2
      expect(metrics.totalOptimizationOpportunities).toBe(3); // 2 + 1
      expect(metrics.estimatedTimeSavings).toBe(270); // 60 + 90 + 120
      expect(metrics.mostCommonIssues).toContain('caching');
    });

    it('should handle empty metrics correctly', () => {
      const metrics = service.getMetrics();

      expect(metrics.totalWorkflows).toBe(0);
      expect(metrics.averageScore).toBe(0);
      expect(metrics.totalOptimizationOpportunities).toBe(0);
      expect(metrics.estimatedTimeSavings).toBe(0);
      expect(metrics.mostCommonIssues).toEqual([]);
    });
  });

  describe('optimization application', () => {
    it('should apply optimization successfully', async () => {
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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
      vi.mocked(mockAnalyzer.generateOptimizedWorkflow).mockResolvedValue(mockOptimized);

      // Analyze workflow first to create insight
      await service.analyzeWorkflowPerformance('/test/workflow.yml');

      // Apply optimization
      await service['applyOptimization']('cache-deps');

      expect(vscode.workspace.applyEdit).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Applied optimization: Add dependency caching')
      );
    });

    it('should handle optimization failures gracefully', async () => {
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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);
      vi.mocked(mockAnalyzer.generateOptimizedWorkflow).mockResolvedValue(mockOptimized);

      await service.analyzeWorkflowPerformance('/test/workflow.yml');
      await service['applyOptimization']('cache-deps');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply optimization')
      );
    });

    it('should handle non-existent recommendations', async () => {
      await service['applyOptimization']('non-existent-id');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Recommendation not found');
    });
  });

  describe('status bar updates', () => {
    it('should update status bar with performance metrics', async () => {
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
      vi.mocked(mockAnalyzer.analyzeWorkflowPerformance).mockResolvedValue(mockAnalysis);

      await service.analyzeWorkflowPerformance('/test/workflow.yml');

      const statusBarItem = vi.mocked(vscode.window.createStatusBarItem).mock.results[0].value;
      expect(statusBarItem.text).toContain('Performance: 75/100');
      expect(statusBarItem.tooltip).toContain('Average workflow performance: 75/100');
      expect(statusBarItem.tooltip).toContain('1 optimization opportunities available');
    });
  });

  describe('disposal', () => {
    it('should dispose of resources correctly', () => {
      const fileWatcher = { dispose: vi.fn() };
      const statusBarItem = { dispose: vi.fn() };
      
      service['fileWatcher'] = fileWatcher as any;
      service['statusBarItem'] = statusBarItem as any;

      service.dispose();

      expect(fileWatcher.dispose).toHaveBeenCalled();
      expect(statusBarItem.dispose).toHaveBeenCalled();
    });
  });
});