/**
 * Performance Monitoring Service
 * 
 * Provides real-time performance monitoring and optimization suggestions
 * for GitHub Actions workflows within VS Code.
 */

import * as vscode from 'vscode';
import { PerformanceAnalyzer, PerformanceAnalysis } from './PerformanceAnalyzer';
import { ExtensionConfiguration } from './types';

export interface PerformanceMonitoringOptions {
  enableRealTimeAnalysis: boolean;
  analysisInterval: number; // in milliseconds
  enableNotifications: boolean;
  performanceThreshold: number; // minimum score to trigger suggestions
}

export interface PerformanceInsight {
  workflowPath: string;
  timestamp: Date;
  analysis: PerformanceAnalysis;
  actionableRecommendations: ActionableRecommendation[];
  urgency: 'low' | 'medium' | 'high';
}

export interface ActionableRecommendation {
  id: string;
  title: string;
  description: string;
  estimatedImpact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  quickFix?: vscode.CodeAction;
  documentationLink?: string;
}

export interface PerformanceMetrics {
  totalWorkflows: number;
  averageScore: number;
  totalOptimizationOpportunities: number;
  estimatedTimeSavings: number;
  mostCommonIssues: string[];
  trendsOverTime: PerformanceTrend[];
}

export interface PerformanceTrend {
  date: Date;
  averageScore: number;
  optimizationsApplied: number;
  timeSaved: number;
}

export class PerformanceMonitoringService {
  private analyzer: PerformanceAnalyzer;
  private insights: Map<string, PerformanceInsight> = new Map();
  private metrics: PerformanceMetrics;
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private analysisTimer: NodeJS.Timeout | undefined;
  private statusBarItem: vscode.StatusBarItem;

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: ExtensionConfiguration,
    private options: PerformanceMonitoringOptions
  ) {
    this.analyzer = new PerformanceAnalyzer(context, configuration);
    this.metrics = this.initializeMetrics();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    this.initialize();
  }

  /**
   * Initialize the performance monitoring service
   */
  private initialize(): void {
    this.setupFileWatcher();
    this.setupStatusBar();
    
    if (this.options.enableRealTimeAnalysis) {
      this.startRealTimeAnalysis();
    }

    // Register commands
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.showPerformanceInsights', () => {
        this.showPerformanceInsights();
      }),
      vscode.commands.registerCommand('readme-to-cicd.analyzeWorkflowPerformance', (uri: vscode.Uri) => {
        this.analyzeWorkflowPerformance(uri.fsPath);
      }),
      vscode.commands.registerCommand('readme-to-cicd.applyPerformanceOptimization', (recommendationId: string) => {
        this.applyOptimization(recommendationId);
      })
    );
  }

  /**
   * Set up file system watcher for workflow files
   */
  private setupFileWatcher(): void {
    const workflowPattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders?.[0] || '',
      '**/.github/workflows/*.{yml,yaml}'
    );

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(workflowPattern);
    
    this.fileWatcher.onDidCreate(this.onWorkflowFileChanged.bind(this));
    this.fileWatcher.onDidChange(this.onWorkflowFileChanged.bind(this));
    this.fileWatcher.onDidDelete(this.onWorkflowFileDeleted.bind(this));

    this.context.subscriptions.push(this.fileWatcher);
  }

  /**
   * Set up status bar item for performance monitoring
   */
  private setupStatusBar(): void {
    this.statusBarItem.text = '$(pulse) Workflow Performance';
    this.statusBarItem.tooltip = 'Click to view workflow performance insights';
    this.statusBarItem.command = 'readme-to-cicd.showPerformanceInsights';
    this.statusBarItem.show();
    
    this.context.subscriptions.push(this.statusBarItem);
  }

  /**
   * Start real-time performance analysis
   */
  private startRealTimeAnalysis(): void {
    this.analysisTimer = setInterval(async () => {
      await this.performPeriodicAnalysis();
    }, this.options.analysisInterval);
  }

  /**
   * Handle workflow file changes
   */
  private async onWorkflowFileChanged(uri: vscode.Uri): Promise<void> {
    try {
      await this.analyzeWorkflowPerformance(uri.fsPath);
      this.updateMetrics();
      this.updateStatusBar();
    } catch (error) {
      console.error('Error analyzing workflow performance:', error);
    }
  }

  /**
   * Handle workflow file deletion
   */
  private onWorkflowFileDeleted(uri: vscode.Uri): void {
    this.insights.delete(uri.fsPath);
    this.updateMetrics();
    this.updateStatusBar();
  }

  /**
   * Analyze workflow performance and generate insights
   */
  public async analyzeWorkflowPerformance(workflowPath: string): Promise<PerformanceInsight> {
    try {
      const analysis = await this.analyzer.analyzeWorkflowPerformance(workflowPath);
      const actionableRecommendations = this.generateActionableRecommendations(analysis);
      const urgency = this.determineUrgency(analysis);

      const insight: PerformanceInsight = {
        workflowPath,
        timestamp: new Date(),
        analysis,
        actionableRecommendations,
        urgency
      };

      this.insights.set(workflowPath, insight);

      // Show notification if performance is below threshold
      if (analysis.overallScore < this.options.performanceThreshold && this.options.enableNotifications) {
        this.showPerformanceNotification(insight);
      }

      return insight;
    } catch (error) {
      throw new Error(`Failed to analyze workflow performance: ${error.message}`);
    }
  }

  /**
   * Generate actionable recommendations from performance analysis
   */
  private generateActionableRecommendations(analysis: PerformanceAnalysis): ActionableRecommendation[] {
    const actionable: ActionableRecommendation[] = [];

    for (const recommendation of analysis.recommendations) {
      const quickFix = this.generateQuickFix(recommendation, analysis.workflowPath);
      
      actionable.push({
        id: recommendation.id,
        title: recommendation.title,
        description: recommendation.description,
        estimatedImpact: recommendation.estimatedTimeSaving,
        difficulty: this.determineDifficulty(recommendation),
        quickFix,
        documentationLink: recommendation.implementation.documentation
      });
    }

    return actionable.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  }

  /**
   * Generate VS Code quick fix for a recommendation
   */
  private generateQuickFix(recommendation: any, workflowPath: string): vscode.CodeAction | undefined {
    try {
      const action = new vscode.CodeAction(
        `Apply: ${recommendation.title}`,
        vscode.CodeActionKind.QuickFix
      );

      action.command = {
        title: 'Apply Performance Optimization',
        command: 'readme-to-cicd.applyPerformanceOptimization',
        arguments: [recommendation.id, workflowPath]
      };

      return action;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Determine the difficulty of implementing a recommendation
   */
  private determineDifficulty(recommendation: any): 'easy' | 'medium' | 'hard' {
    switch (recommendation.implementation.type) {
      case 'step-addition':
        return 'easy';
      case 'yaml-modification':
        return 'medium';
      case 'job-restructure':
        return 'hard';
      case 'matrix-optimization':
        return 'medium';
      default:
        return 'medium';
    }
  }

  /**
   * Determine the urgency of performance issues
   */
  private determineUrgency(analysis: PerformanceAnalysis): 'low' | 'medium' | 'high' {
    if (analysis.overallScore < 40) return 'high';
    if (analysis.overallScore < 70) return 'medium';
    return 'low';
  }

  /**
   * Show performance notification to user
   */
  private async showPerformanceNotification(insight: PerformanceInsight): Promise<void> {
    const workflowName = insight.workflowPath.split('/').pop() || 'workflow';
    const score = insight.analysis.overallScore;
    const topRecommendation = insight.actionableRecommendations[0];

    const message = `Workflow "${workflowName}" has performance score ${score}/100. ${topRecommendation?.title || 'Consider optimizations'}.`;
    
    const action = await vscode.window.showWarningMessage(
      message,
      'View Details',
      'Apply Quick Fix',
      'Dismiss'
    );

    switch (action) {
      case 'View Details':
        this.showPerformanceInsights();
        break;
      case 'Apply Quick Fix':
        if (topRecommendation) {
          this.applyOptimization(topRecommendation.id);
        }
        break;
    }
  }

  /**
   * Show performance insights panel
   */
  private async showPerformanceInsights(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'performanceInsights',
      'Workflow Performance Insights',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.generateInsightsHTML();

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'applyOptimization':
          await this.applyOptimization(message.recommendationId);
          break;
        case 'refreshAnalysis':
          await this.performPeriodicAnalysis();
          panel.webview.html = this.generateInsightsHTML();
          break;
      }
    });
  }

  /**
   * Generate HTML for performance insights webview
   */
  private generateInsightsHTML(): string {
    const insights = Array.from(this.insights.values());
    const metrics = this.metrics;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Performance Insights</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 5px;
            border: 1px solid var(--vscode-panel-border);
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .metric-label {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 5px;
        }
        .insight-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .workflow-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .performance-score {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 15px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .score-high { background-color: #28a745; color: white; }
        .score-medium { background-color: #ffc107; color: black; }
        .score-low { background-color: #dc3545; color: white; }
        .recommendations {
            margin-top: 15px;
        }
        .recommendation {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            padding: 10px;
            margin-bottom: 10px;
        }
        .recommendation-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .recommendation-impact {
            color: var(--vscode-textLink-foreground);
            font-size: 12px;
        }
        .apply-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin-top: 5px;
        }
        .apply-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .refresh-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 10px 20px;
            border-radius: 3px;
            cursor: pointer;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <h1>Workflow Performance Insights</h1>
    
    <button class="refresh-button" onclick="refreshAnalysis()">Refresh Analysis</button>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value">${metrics.totalWorkflows}</div>
            <div class="metric-label">Total Workflows</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${Math.round(metrics.averageScore)}</div>
            <div class="metric-label">Average Score</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${metrics.totalOptimizationOpportunities}</div>
            <div class="metric-label">Optimization Opportunities</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${Math.round(metrics.estimatedTimeSavings / 60)}m</div>
            <div class="metric-label">Potential Time Savings</div>
        </div>
    </div>

    ${insights.map(insight => `
        <div class="insight-card">
            <div class="workflow-name">${insight.workflowPath.split('/').pop()}</div>
            <div class="performance-score score-${this.getScoreClass(insight.analysis.overallScore)}">
                Score: ${insight.analysis.overallScore}/100
            </div>
            
            <div class="recommendations">
                <h3>Top Recommendations:</h3>
                ${insight.actionableRecommendations.slice(0, 3).map(rec => `
                    <div class="recommendation">
                        <div class="recommendation-title">${rec.title}</div>
                        <div>${rec.description}</div>
                        <div class="recommendation-impact">
                            Estimated impact: ${rec.estimatedImpact}s savings (${rec.difficulty} to implement)
                        </div>
                        <button class="apply-button" onclick="applyOptimization('${rec.id}')">
                            Apply Quick Fix
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('')}

    <script>
        const vscode = acquireVsCodeApi();
        
        function applyOptimization(recommendationId) {
            vscode.postMessage({
                command: 'applyOptimization',
                recommendationId: recommendationId
            });
        }
        
        function refreshAnalysis() {
            vscode.postMessage({
                command: 'refreshAnalysis'
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Get CSS class for performance score
   */
  private getScoreClass(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  /**
   * Apply a performance optimization
   */
  private async applyOptimization(recommendationId: string): Promise<void> {
    try {
      // Find the recommendation across all insights
      let targetRecommendation: any = null;
      let targetWorkflowPath: string = '';

      for (const [workflowPath, insight] of this.insights) {
        const rec = insight.analysis.recommendations.find(r => r.id === recommendationId);
        if (rec) {
          targetRecommendation = rec;
          targetWorkflowPath = workflowPath;
          break;
        }
      }

      if (!targetRecommendation) {
        vscode.window.showErrorMessage('Recommendation not found');
        return;
      }

      // Generate optimized workflow
      const optimized = await this.analyzer.generateOptimizedWorkflow(
        targetWorkflowPath,
        [recommendationId]
      );

      if (optimized.appliedOptimizations[0]?.applied) {
        // Write the optimized content back to the file
        const uri = vscode.Uri.file(targetWorkflowPath);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          uri,
          new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE),
          optimized.optimizedContent
        );

        await vscode.workspace.applyEdit(edit);
        
        vscode.window.showInformationMessage(
          `Applied optimization: ${targetRecommendation.title}. Estimated time saving: ${optimized.estimatedTimeSaving}s`
        );

        // Re-analyze the workflow
        await this.analyzeWorkflowPerformance(targetWorkflowPath);
      } else {
        vscode.window.showErrorMessage(
          `Failed to apply optimization: ${optimized.warnings.join(', ')}`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error applying optimization: ${error.message}`);
    }
  }

  /**
   * Perform periodic analysis of all workflows
   */
  private async performPeriodicAnalysis(): Promise<void> {
    try {
      const workflowFiles = await vscode.workspace.findFiles(
        '**/.github/workflows/*.{yml,yaml}',
        '**/node_modules/**'
      );

      for (const file of workflowFiles) {
        await this.analyzeWorkflowPerformance(file.fsPath);
      }

      this.updateMetrics();
      this.updateStatusBar();
    } catch (error) {
      console.error('Error during periodic analysis:', error);
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const insights = Array.from(this.insights.values());
    
    this.metrics = {
      totalWorkflows: insights.length,
      averageScore: insights.length > 0 
        ? insights.reduce((sum, i) => sum + i.analysis.overallScore, 0) / insights.length 
        : 0,
      totalOptimizationOpportunities: insights.reduce((sum, i) => sum + i.analysis.recommendations.length, 0),
      estimatedTimeSavings: insights.reduce((sum, i) => 
        sum + i.analysis.recommendations.reduce((recSum, r) => recSum + r.estimatedTimeSaving, 0), 0
      ),
      mostCommonIssues: this.calculateMostCommonIssues(insights),
      trendsOverTime: this.calculateTrends(insights)
    };
  }

  /**
   * Calculate most common performance issues
   */
  private calculateMostCommonIssues(insights: PerformanceInsight[]): string[] {
    const issueCount = new Map<string, number>();
    
    for (const insight of insights) {
      for (const rec of insight.analysis.recommendations) {
        const count = issueCount.get(rec.category) || 0;
        issueCount.set(rec.category, count + 1);
      }
    }
    
    return Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }

  /**
   * Calculate performance trends over time
   */
  private calculateTrends(insights: PerformanceInsight[]): PerformanceTrend[] {
    // Simplified trend calculation - in practice, you'd store historical data
    const today = new Date();
    return [{
      date: today,
      averageScore: this.metrics.averageScore,
      optimizationsApplied: 0, // Would track from historical data
      timeSaved: 0 // Would track from historical data
    }];
  }

  /**
   * Update status bar with current metrics
   */
  private updateStatusBar(): void {
    const avgScore = Math.round(this.metrics.averageScore);
    const opportunities = this.metrics.totalOptimizationOpportunities;
    
    this.statusBarItem.text = `$(pulse) Performance: ${avgScore}/100`;
    this.statusBarItem.tooltip = `Average workflow performance: ${avgScore}/100\n${opportunities} optimization opportunities available`;
    
    // Change color based on performance
    if (avgScore >= 80) {
      this.statusBarItem.backgroundColor = undefined;
    } else if (avgScore >= 60) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      totalWorkflows: 0,
      averageScore: 0,
      totalOptimizationOpportunities: 0,
      estimatedTimeSavings: 0,
      mostCommonIssues: [],
      trendsOverTime: []
    };
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all current insights
   */
  public getInsights(): PerformanceInsight[] {
    return Array.from(this.insights.values());
  }

  /**
   * Dispose of the service and clean up resources
   */
  public dispose(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
    
    this.statusBarItem.dispose();
  }
}