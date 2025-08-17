/**
 * Performance Monitoring Provider
 * 
 * Provides webview interface for workflow performance analysis and optimization.
 * Displays performance metrics, recommendations, and optimization opportunities.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { 
  PerformanceAnalyzer, 
  PerformanceAnalysis,
  PerformanceRecommendation,
  OptimizedWorkflowResult 
} from '../core/PerformanceAnalyzer';
import { WebviewManager } from '../core/WebviewManager';
import { FileSystemManager } from '../core/FileSystemManager';
import { ExtensionConfiguration } from '../core/types';

export interface PerformanceMonitoringMessage {
  command: 'analyzeWorkflow' | 'analyzeMultipleWorkflows' | 'applyOptimizations' | 
           'exportAnalysis' | 'refreshAnalysis' | 'getRecommendationDetails';
  data?: any;
}

export interface WorkflowAnalysisRequest {
  workflowPath: string;
  includeRecommendations: boolean;
}

export interface MultiWorkflowAnalysisRequest {
  workflowPaths: string[];
  comparePerformance: boolean;
}

export interface OptimizationRequest {
  workflowPath: string;
  selectedRecommendations: string[];
  previewOnly: boolean;
}

export class PerformanceMonitoringProvider {
  private webviewPanel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];
  private currentAnalysis: PerformanceAnalysis | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private performanceAnalyzer: PerformanceAnalyzer,
    private webviewManager: WebviewManager,
    private fileSystemManager: FileSystemManager,
    private configuration: ExtensionConfiguration
  ) {}

  /**
   * Show performance monitoring interface
   */
  async showPerformanceMonitoring(workflowPath?: string): Promise<void> {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      if (workflowPath) {
        await this.analyzeWorkflow(workflowPath);
      }
      return;
    }

    this.webviewPanel = this.webviewManager.createWebview({
      viewType: 'performanceMonitoring',
      title: 'Workflow Performance Analysis',
      showOptions: vscode.ViewColumn.One,
      options: {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'webview-ui'))
        ]
      }
    });

    // Set up webview content
    this.webviewPanel.webview.html = await this.getWebviewContent();

    // Handle messages from webview
    this.webviewPanel.webview.onDidReceiveMessage(
      this.handleWebviewMessage.bind(this),
      undefined,
      this.disposables
    );

    // Clean up when panel is disposed
    this.webviewPanel.onDidDispose(
      () => {
        this.webviewPanel = undefined;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
      },
      undefined,
      this.disposables
    );

    // Analyze workflow if provided
    if (workflowPath) {
      await this.analyzeWorkflow(workflowPath);
    } else {
      await this.sendInitialData();
    }
  }

  /**
   * Handle messages from webview
   */
  private async handleWebviewMessage(message: PerformanceMonitoringMessage): Promise<void> {
    try {
      switch (message.command) {
        case 'analyzeWorkflow':
          await this.handleAnalyzeWorkflow(message.data);
          break;

        case 'analyzeMultipleWorkflows':
          await this.handleAnalyzeMultipleWorkflows(message.data);
          break;

        case 'applyOptimizations':
          await this.handleApplyOptimizations(message.data);
          break;

        case 'exportAnalysis':
          await this.handleExportAnalysis(message.data);
          break;

        case 'refreshAnalysis':
          await this.handleRefreshAnalysis(message.data);
          break;

        case 'getRecommendationDetails':
          await this.handleGetRecommendationDetails(message.data);
          break;

        default:
          console.warn(`Unknown performance monitoring command: ${message.command}`);
      }
    } catch (error) {
      await this.sendError(`Failed to handle command ${message.command}: ${error.message}`);
    }
  }

  /**
   * Analyze single workflow performance
   */
  private async analyzeWorkflow(workflowPath: string): Promise<void> {
    try {
      await this.sendMessage({
        command: 'analysisStarted',
        data: { workflowPath }
      });

      const analysis = await this.performanceAnalyzer.analyzeWorkflowPerformance(workflowPath);
      this.currentAnalysis = analysis;

      await this.sendMessage({
        command: 'analysisComplete',
        data: { analysis }
      });

    } catch (error) {
      await this.sendError(`Failed to analyze workflow: ${error.message}`);
    }
  }

  /**
   * Handle analyze workflow request
   */
  private async handleAnalyzeWorkflow(data: WorkflowAnalysisRequest): Promise<void> {
    await this.analyzeWorkflow(data.workflowPath);
  }

  /**
   * Handle analyze multiple workflows request
   */
  private async handleAnalyzeMultipleWorkflows(data: MultiWorkflowAnalysisRequest): Promise<void> {
    try {
      await this.sendMessage({
        command: 'multiAnalysisStarted',
        data: { workflowPaths: data.workflowPaths }
      });

      const multiAnalysis = await this.performanceAnalyzer.analyzeMultipleWorkflows(data.workflowPaths);

      await this.sendMessage({
        command: 'multiAnalysisComplete',
        data: { analysis: multiAnalysis }
      });

    } catch (error) {
      await this.sendError(`Failed to analyze multiple workflows: ${error.message}`);
    }
  }

  /**
   * Handle apply optimizations request
   */
  private async handleApplyOptimizations(data: OptimizationRequest): Promise<void> {
    try {
      const result = await this.performanceAnalyzer.generateOptimizedWorkflow(
        data.workflowPath,
        data.selectedRecommendations
      );

      if (data.previewOnly) {
        await this.sendMessage({
          command: 'optimizationPreview',
          data: { result }
        });
      } else {
        // Apply optimizations to the actual file
        await this.applyOptimizationsToFile(data.workflowPath, result);
        
        await this.sendMessage({
          command: 'optimizationsApplied',
          data: { result }
        });

        vscode.window.showInformationMessage(
          `Applied ${result.appliedOptimizations.filter(o => o.applied).length} optimizations. ` +
          `Estimated time saving: ${Math.round(result.estimatedTimeSaving / 60)} minutes.`
        );
      }

    } catch (error) {
      await this.sendError(`Failed to apply optimizations: ${error.message}`);
    }
  }

  /**
   * Handle export analysis request
   */
  private async handleExportAnalysis(data: { format: 'json' | 'csv' | 'pdf' }): Promise<void> {
    if (!this.currentAnalysis) {
      await this.sendError('No analysis data to export');
      return;
    }

    try {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`performance-analysis.${data.format}`),
        filters: this.getExportFilters(data.format)
      });

      if (uri) {
        await this.exportAnalysis(this.currentAnalysis, uri, data.format);
        vscode.window.showInformationMessage(`Analysis exported to ${uri.fsPath}`);
      }

    } catch (error) {
      await this.sendError(`Failed to export analysis: ${error.message}`);
    }
  }

  /**
   * Handle refresh analysis request
   */
  private async handleRefreshAnalysis(data: { workflowPath: string }): Promise<void> {
    await this.analyzeWorkflow(data.workflowPath);
  }

  /**
   * Handle get recommendation details request
   */
  private async handleGetRecommendationDetails(data: { recommendationId: string }): Promise<void> {
    if (!this.currentAnalysis) {
      await this.sendError('No analysis data available');
      return;
    }

    const recommendation = this.currentAnalysis.recommendations.find(r => r.id === data.recommendationId);
    if (!recommendation) {
      await this.sendError('Recommendation not found');
      return;
    }

    await this.sendMessage({
      command: 'recommendationDetails',
      data: { recommendation }
    });
  }

  /**
   * Send initial data to webview
   */
  private async sendInitialData(): Promise<void> {
    const workflowFiles = await this.findWorkflowFiles();
    
    await this.sendMessage({
      command: 'initialData',
      data: {
        workflowFiles,
        hasAnalysis: !!this.currentAnalysis,
        analysis: this.currentAnalysis
      }
    });
  }

  /**
   * Send message to webview
   */
  private async sendMessage(message: any): Promise<void> {
    if (this.webviewPanel) {
      await this.webviewPanel.webview.postMessage(message);
    }
  }

  /**
   * Send error message to webview
   */
  private async sendError(error: string): Promise<void> {
    await this.sendMessage({
      command: 'error',
      data: { error }
    });
    vscode.window.showErrorMessage(error);
  }

  /**
   * Find workflow files in workspace
   */
  private async findWorkflowFiles(): Promise<string[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return [];

    const workflowsPath = path.join(workspaceFolder.uri.fsPath, '.github', 'workflows');
    
    try {
      return await this.fileSystemManager.listWorkflowFiles(workflowsPath);
    } catch (error) {
      return [];
    }
  }

  /**
   * Apply optimizations to workflow file
   */
  private async applyOptimizationsToFile(
    workflowPath: string,
    result: OptimizedWorkflowResult
  ): Promise<void> {
    // Create backup
    const backupPath = `${workflowPath}.backup.${Date.now()}`;
    const originalContent = await vscode.workspace.fs.readFile(vscode.Uri.file(workflowPath));
    await vscode.workspace.fs.writeFile(vscode.Uri.file(backupPath), originalContent);

    // Write optimized content
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(workflowPath),
      Buffer.from(result.optimizedContent)
    );

    // Show diff in editor
    const originalUri = vscode.Uri.file(backupPath);
    const optimizedUri = vscode.Uri.file(workflowPath);
    
    await vscode.commands.executeCommand(
      'vscode.diff',
      originalUri,
      optimizedUri,
      `Performance Optimizations: ${path.basename(workflowPath)}`
    );
  }

  /**
   * Export analysis to file
   */
  private async exportAnalysis(
    analysis: PerformanceAnalysis,
    uri: vscode.Uri,
    format: 'json' | 'csv' | 'pdf'
  ): Promise<void> {
    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(analysis, null, 2);
        break;
      case 'csv':
        content = this.convertAnalysisToCSV(analysis);
        break;
      case 'pdf':
        content = this.convertAnalysisToPDF(analysis);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
  }

  /**
   * Convert analysis to CSV format
   */
  private convertAnalysisToCSV(analysis: PerformanceAnalysis): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Category,Title,Priority,Estimated Saving (seconds),Description');
    
    // Recommendations
    for (const rec of analysis.recommendations) {
      lines.push([
        rec.category,
        rec.title,
        rec.priority,
        rec.estimatedTimeSaving.toString(),
        rec.description.replace(/,/g, ';')
      ].join(','));
    }
    
    return lines.join('\n');
  }

  /**
   * Convert analysis to PDF format (simplified)
   */
  private convertAnalysisToPDF(analysis: PerformanceAnalysis): string {
    // This would typically use a PDF library
    // For now, return a formatted text representation
    const lines: string[] = [];
    
    lines.push('WORKFLOW PERFORMANCE ANALYSIS REPORT');
    lines.push('=====================================');
    lines.push('');
    lines.push(`Workflow: ${analysis.workflowPath}`);
    lines.push(`Overall Score: ${analysis.overallScore}/100`);
    lines.push('');
    
    lines.push('RECOMMENDATIONS:');
    lines.push('----------------');
    for (const rec of analysis.recommendations) {
      lines.push(`${rec.title} (${rec.priority} priority)`);
      lines.push(`  Estimated saving: ${rec.estimatedTimeSaving} seconds`);
      lines.push(`  ${rec.description}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Get export file filters
   */
  private getExportFilters(format: string): Record<string, string[]> {
    const filters: Record<string, Record<string, string[]>> = {
      json: { 'JSON Files': ['json'] },
      csv: { 'CSV Files': ['csv'] },
      pdf: { 'PDF Files': ['pdf'] }
    };
    
    return filters[format] || { 'All Files': ['*'] };
  }

  /**
   * Get webview HTML content
   */
  private async getWebviewContent(): Promise<string> {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Performance Analysis</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .workflow-selector {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .analysis-container {
            display: none;
        }
        
        .analysis-container.active {
            display: block;
        }
        
        .score-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .score-value {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .score-good { color: #4CAF50; }
        .score-medium { color: #FF9800; }
        .score-poor { color: #F44336; }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
        }
        
        .metric-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .metric-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .recommendations-section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .recommendation-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: border-color 0.2s;
        }
        
        .recommendation-card:hover {
            border-color: var(--vscode-focusBorder);
        }
        
        .recommendation-card.selected {
            border-color: var(--vscode-textLink-foreground);
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        
        .recommendation-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .recommendation-priority {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
            text-transform: uppercase;
        }
        
        .priority-high {
            background-color: #F44336;
            color: white;
        }
        
        .priority-medium {
            background-color: #FF9800;
            color: white;
        }
        
        .priority-low {
            background-color: #4CAF50;
            color: white;
        }
        
        .recommendation-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
            font-size: 13px;
        }
        
        .recommendation-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .time-saving {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        
        .optimization-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        select, input {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px 10px;
            border-radius: 3px;
        }
        
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        
        .loading::before {
            content: '';
            width: 20px;
            height: 20px;
            border: 2px solid var(--vscode-descriptionForeground);
            border-top: 2px solid var(--vscode-textLink-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 15px;
            border-radius: 3px;
            margin-bottom: 20px;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .empty-state h3 {
            margin-bottom: 10px;
        }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 20px;
        }
        
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: border-color 0.2s;
        }
        
        .tab:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .tab.active {
            border-bottom-color: var(--vscode-textLink-foreground);
            color: var(--vscode-textLink-foreground);
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .progress-bar {
            width: 100%;
            height: 4px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        
        .progress-fill {
            height: 100%;
            background-color: var(--vscode-textLink-foreground);
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Workflow Performance Analysis</h1>
        <div class="controls">
            <button id="exportBtn" class="secondary">Export Analysis</button>
            <button id="refreshBtn" class="secondary">Refresh</button>
        </div>
    </div>
    
    <div class="workflow-selector">
        <label for="workflowSelect">Analyze Workflow:</label>
        <select id="workflowSelect">
            <option value="">Select a workflow...</option>
        </select>
        <button id="analyzeBtn">Analyze</button>
        <button id="analyzeMultipleBtn" class="secondary">Analyze Multiple</button>
    </div>
    
    <div id="loadingContainer" class="loading" style="display: none;">
        Analyzing workflow performance...
    </div>
    
    <div id="errorContainer"></div>
    
    <div id="emptyState" class="empty-state">
        <h3>No Analysis Available</h3>
        <p>Select a workflow file to analyze its performance and get optimization recommendations.</p>
    </div>
    
    <div id="analysisContainer" class="analysis-container">
        <div class="score-card">
            <div id="overallScore" class="score-value">--</div>
            <div>Overall Performance Score</div>
        </div>
        
        <div class="tabs">
            <div class="tab active" data-tab="overview">Overview</div>
            <div class="tab" data-tab="recommendations">Recommendations</div>
            <div class="tab" data-tab="caching">Caching</div>
            <div class="tab" data-tab="parallelization">Parallelization</div>
            <div class="tab" data-tab="resources">Resources</div>
        </div>
        
        <div id="overviewTab" class="tab-content active">
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-title">Caching Opportunities</div>
                    <div id="cachingCount" class="metric-value">0</div>
                    <div class="metric-description">Potential time savings from caching</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Parallelization</div>
                    <div id="parallelizationCount" class="metric-value">0</div>
                    <div class="metric-description">Jobs that can run in parallel</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Resource Optimizations</div>
                    <div id="resourceCount" class="metric-value">0</div>
                    <div class="metric-description">Runner and resource improvements</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Estimated Savings</div>
                    <div id="totalSavings" class="metric-value">0 min</div>
                    <div class="metric-description">Total potential time savings</div>
                </div>
            </div>
        </div>
        
        <div id="recommendationsTab" class="tab-content">
            <div class="recommendations-section">
                <div class="section-title">Performance Recommendations</div>
                <div id="recommendationsList"></div>
                <div class="optimization-actions">
                    <button id="previewOptimizationsBtn">Preview Optimizations</button>
                    <button id="applyOptimizationsBtn">Apply Selected</button>
                    <button id="selectAllBtn" class="secondary">Select All</button>
                    <button id="selectNoneBtn" class="secondary">Select None</button>
                </div>
            </div>
        </div>
        
        <div id="cachingTab" class="tab-content">
            <div class="section-title">Caching Opportunities</div>
            <div id="cachingList"></div>
        </div>
        
        <div id="parallelizationTab" class="tab-content">
            <div class="section-title">Parallelization Suggestions</div>
            <div id="parallelizationList"></div>
        </div>
        
        <div id="resourcesTab" class="tab-content">
            <div class="section-title">Resource Optimizations</div>
            <div id="resourcesList"></div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let currentAnalysis = null;
        let selectedRecommendations = new Set();
        
        // DOM elements
        const workflowSelect = document.getElementById('workflowSelect');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const analyzeMultipleBtn = document.getElementById('analyzeMultipleBtn');
        const exportBtn = document.getElementById('exportBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const loadingContainer = document.getElementById('loadingContainer');
        const errorContainer = document.getElementById('errorContainer');
        const emptyState = document.getElementById('emptyState');
        const analysisContainer = document.getElementById('analysisContainer');
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();
            requestInitialData();
        });
        
        function setupEventListeners() {
            analyzeBtn.addEventListener('click', analyzeSelectedWorkflow);
            analyzeMultipleBtn.addEventListener('click', analyzeMultipleWorkflows);
            exportBtn.addEventListener('click', exportAnalysis);
            refreshBtn.addEventListener('click', refreshAnalysis);
            
            // Tab switching
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => switchTab(tab.dataset.tab));
            });
            
            // Optimization actions
            document.getElementById('previewOptimizationsBtn').addEventListener('click', previewOptimizations);
            document.getElementById('applyOptimizationsBtn').addEventListener('click', applyOptimizations);
            document.getElementById('selectAllBtn').addEventListener('click', selectAllRecommendations);
            document.getElementById('selectNoneBtn').addEventListener('click', selectNoRecommendations);
        }
        
        function requestInitialData() {
            vscode.postMessage({ command: 'getInitialData' });
        }
        
        function analyzeSelectedWorkflow() {
            const workflowPath = workflowSelect.value;
            if (!workflowPath) {
                showError('Please select a workflow to analyze');
                return;
            }
            
            vscode.postMessage({
                command: 'analyzeWorkflow',
                data: {
                    workflowPath,
                    includeRecommendations: true
                }
            });
        }
        
        function analyzeMultipleWorkflows() {
            const workflowPaths = Array.from(workflowSelect.options)
                .filter(option => option.value)
                .map(option => option.value);
            
            if (workflowPaths.length === 0) {
                showError('No workflows found to analyze');
                return;
            }
            
            vscode.postMessage({
                command: 'analyzeMultipleWorkflows',
                data: {
                    workflowPaths,
                    comparePerformance: true
                }
            });
        }
        
        function exportAnalysis() {
            if (!currentAnalysis) {
                showError('No analysis data to export');
                return;
            }
            
            vscode.postMessage({
                command: 'exportAnalysis',
                data: { format: 'json' }
            });
        }
        
        function refreshAnalysis() {
            const workflowPath = workflowSelect.value;
            if (workflowPath) {
                vscode.postMessage({
                    command: 'refreshAnalysis',
                    data: { workflowPath }
                });
            }
        }
        
        function previewOptimizations() {
            if (selectedRecommendations.size === 0) {
                showError('Please select at least one recommendation');
                return;
            }
            
            vscode.postMessage({
                command: 'applyOptimizations',
                data: {
                    workflowPath: workflowSelect.value,
                    selectedRecommendations: Array.from(selectedRecommendations),
                    previewOnly: true
                }
            });
        }
        
        function applyOptimizations() {
            if (selectedRecommendations.size === 0) {
                showError('Please select at least one recommendation');
                return;
            }
            
            vscode.postMessage({
                command: 'applyOptimizations',
                data: {
                    workflowPath: workflowSelect.value,
                    selectedRecommendations: Array.from(selectedRecommendations),
                    previewOnly: false
                }
            });
        }
        
        function selectAllRecommendations() {
            if (!currentAnalysis) return;
            
            selectedRecommendations.clear();
            currentAnalysis.recommendations.forEach(rec => {
                selectedRecommendations.add(rec.id);
            });
            
            updateRecommendationSelection();
        }
        
        function selectNoRecommendations() {
            selectedRecommendations.clear();
            updateRecommendationSelection();
        }
        
        function switchTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === tabName + 'Tab');
            });
        }
        
        function showLoading(show = true) {
            loadingContainer.style.display = show ? 'flex' : 'none';
            analysisContainer.style.display = show ? 'none' : 'block';
            emptyState.style.display = 'none';
        }
        
        function showError(message) {
            errorContainer.innerHTML = \`<div class="error">\${message}</div>\`;
            setTimeout(() => {
                errorContainer.innerHTML = '';
            }, 5000);
        }
        
        function showAnalysis(analysis) {
            currentAnalysis = analysis;
            
            // Update overall score
            const scoreElement = document.getElementById('overallScore');
            scoreElement.textContent = analysis.overallScore;
            scoreElement.className = 'score-value ' + getScoreClass(analysis.overallScore);
            
            // Update metrics
            document.getElementById('cachingCount').textContent = analysis.cachingOpportunities.length;
            document.getElementById('parallelizationCount').textContent = analysis.parallelizationSuggestions.length;
            document.getElementById('resourceCount').textContent = analysis.resourceOptimizations.length;
            
            const totalSavings = analysis.estimatedImprovements.reduce((sum, imp) => sum + imp.timeSaving, 0);
            document.getElementById('totalSavings').textContent = Math.round(totalSavings / 60) + ' min';
            
            // Render recommendations
            renderRecommendations(analysis.recommendations);
            renderCachingOpportunities(analysis.cachingOpportunities);
            renderParallelizationSuggestions(analysis.parallelizationSuggestions);
            renderResourceOptimizations(analysis.resourceOptimizations);
            
            // Show analysis container
            emptyState.style.display = 'none';
            analysisContainer.classList.add('active');
        }
        
        function getScoreClass(score) {
            if (score >= 80) return 'score-good';
            if (score >= 60) return 'score-medium';
            return 'score-poor';
        }
        
        function renderRecommendations(recommendations) {
            const container = document.getElementById('recommendationsList');
            container.innerHTML = '';
            
            if (recommendations.length === 0) {
                container.innerHTML = '<p>No recommendations available. Your workflow is already well optimized!</p>';
                return;
            }
            
            recommendations.forEach(rec => {
                const card = createRecommendationCard(rec);
                container.appendChild(card);
            });
        }
        
        function createRecommendationCard(recommendation) {
            const card = document.createElement('div');
            card.className = 'recommendation-card';
            card.dataset.id = recommendation.id;
            
            card.innerHTML = \`
                <div class="recommendation-header">
                    <div>
                        <div class="recommendation-title">\${recommendation.title}</div>
                        <div class="recommendation-description">\${recommendation.description}</div>
                    </div>
                    <div class="recommendation-priority priority-\${recommendation.priority}">
                        \${recommendation.priority}
                    </div>
                </div>
                <div class="recommendation-meta">
                    <span>Category: \${recommendation.category}</span>
                    <span class="time-saving">Saves ~\${Math.round(recommendation.estimatedTimeSaving / 60)} min</span>
                </div>
            \`;
            
            card.addEventListener('click', () => toggleRecommendationSelection(recommendation.id));
            
            return card;
        }
        
        function toggleRecommendationSelection(recommendationId) {
            if (selectedRecommendations.has(recommendationId)) {
                selectedRecommendations.delete(recommendationId);
            } else {
                selectedRecommendations.add(recommendationId);
            }
            
            updateRecommendationSelection();
        }
        
        function updateRecommendationSelection() {
            document.querySelectorAll('.recommendation-card').forEach(card => {
                const isSelected = selectedRecommendations.has(card.dataset.id);
                card.classList.toggle('selected', isSelected);
            });
            
            // Update action buttons
            const hasSelection = selectedRecommendations.size > 0;
            document.getElementById('previewOptimizationsBtn').disabled = !hasSelection;
            document.getElementById('applyOptimizationsBtn').disabled = !hasSelection;
        }
        
        function renderCachingOpportunities(opportunities) {
            const container = document.getElementById('cachingList');
            container.innerHTML = '';
            
            if (opportunities.length === 0) {
                container.innerHTML = '<p>No caching opportunities found.</p>';
                return;
            }
            
            opportunities.forEach(opp => {
                const card = document.createElement('div');
                card.className = 'metric-card';
                card.innerHTML = \`
                    <div class="metric-title">\${opp.stepName} (\${opp.framework})</div>
                    <div class="metric-value">~\${Math.round(opp.estimatedSaving / 60)} min</div>
                    <div class="metric-description">
                        Cache Type: \${opp.cacheType}<br>
                        Job: \${opp.jobName}
                    </div>
                \`;
                container.appendChild(card);
            });
        }
        
        function renderParallelizationSuggestions(suggestions) {
            const container = document.getElementById('parallelizationList');
            container.innerHTML = '';
            
            if (suggestions.length === 0) {
                container.innerHTML = '<p>No parallelization opportunities found.</p>';
                return;
            }
            
            suggestions.forEach(sugg => {
                const card = document.createElement('div');
                card.className = 'metric-card';
                card.innerHTML = \`
                    <div class="metric-title">\${sugg.suggestedStructure} Execution</div>
                    <div class="metric-value">~\${Math.round(sugg.estimatedReduction / 60)} min</div>
                    <div class="metric-description">
                        Current: \${sugg.currentStructure}<br>
                        Affected Jobs: \${sugg.affectedJobs.join(', ')}
                    </div>
                \`;
                container.appendChild(card);
            });
        }
        
        function renderResourceOptimizations(optimizations) {
            const container = document.getElementById('resourcesList');
            container.innerHTML = '';
            
            if (optimizations.length === 0) {
                container.innerHTML = '<p>No resource optimizations found.</p>';
                return;
            }
            
            optimizations.forEach(opt => {
                const card = document.createElement('div');
                card.className = 'metric-card';
                card.innerHTML = \`
                    <div class="metric-title">\${opt.resourceType} Optimization</div>
                    <div class="metric-value">\${opt.currentUsage} → \${opt.recommendedUsage}</div>
                    <div class="metric-description">
                        \${opt.reasoning}<br>
                        Cost Impact: \${opt.costImpact}
                    </div>
                \`;
                container.appendChild(card);
            });
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'initialData':
                    populateWorkflowSelect(message.data.workflowFiles);
                    if (message.data.hasAnalysis) {
                        showAnalysis(message.data.analysis);
                    }
                    break;
                    
                case 'analysisStarted':
                    showLoading(true);
                    break;
                    
                case 'analysisComplete':
                    showLoading(false);
                    showAnalysis(message.data.analysis);
                    break;
                    
                case 'optimizationsApplied':
                    showLoading(false);
                    // Refresh analysis after applying optimizations
                    refreshAnalysis();
                    break;
                    
                case 'error':
                    showLoading(false);
                    showError(message.data.error);
                    break;
            }
        });
        
        function populateWorkflowSelect(workflowFiles) {
            workflowSelect.innerHTML = '<option value="">Select a workflow...</option>';
            
            workflowFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file.split('/').pop();
                workflowSelect.appendChild(option);
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.webviewPanel?.dispose();
  }
}