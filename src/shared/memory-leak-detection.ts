/**
 * Memory Leak Detection Utilities
 * 
 * Provides comprehensive memory leak detection capabilities for test suites,
 * including memory snapshot comparison, leak pattern analysis, and automated
 * leak detection with detailed reporting.
 */

import { TestWorkerMemoryUsage, TestWorkerMemoryEvent } from './test-worker-memory-monitor.js';

export interface MemorySnapshot {
  /** Unique identifier for the snapshot */
  id: string;
  /** Timestamp when snapshot was taken */
  timestamp: number;
  /** Memory usage at snapshot time */
  memoryUsage: TestWorkerMemoryUsage;
  /** Context information (test name, suite, etc.) */
  context: {
    testName?: string;
    suiteName?: string;
    phase: 'before' | 'after' | 'during';
    description?: string;
  };
  /** Heap objects count if available */
  heapObjectsCount?: number;
  /** Additional metadata */
  metadata: Record<string, any>;
}

export interface MemoryLeakPattern {
  /** Pattern type */
  type: 'linear_growth' | 'exponential_growth' | 'step_growth' | 'oscillating' | 'stable';
  /** Confidence level (0-1) */
  confidence: number;
  /** Growth rate in bytes per measurement */
  growthRate: number;
  /** Pattern description */
  description: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Recommended actions */
  recommendations: string[];
}

export interface MemoryLeakAnalysis {
  /** Whether a leak was detected */
  leakDetected: boolean;
  /** Overall confidence level (0-1) */
  confidence: number;
  /** Detected patterns */
  patterns: MemoryLeakPattern[];
  /** Memory growth statistics */
  statistics: {
    totalGrowth: number;
    averageGrowth: number;
    maxGrowth: number;
    minGrowth: number;
    growthVariance: number;
    measurementCount: number;
    timeSpan: number;
  };
  /** Suspicious snapshots */
  suspiciousSnapshots: Array<{
    snapshot: MemorySnapshot;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  /** Recommendations for fixing leaks */
  recommendations: string[];
  /** Detailed analysis report */
  report: string;
}

export interface MemoryLeakDetectionConfig {
  /** Minimum number of snapshots required for analysis */
  minSnapshots: number;
  /** Growth threshold in bytes to consider as potential leak */
  growthThreshold: number;
  /** Percentage growth threshold relative to initial memory */
  percentageGrowthThreshold: number;
  /** Time window for analysis in milliseconds */
  analysisTimeWindow: number;
  /** Enable detailed logging */
  enableDetailedLogging: boolean;
  /** Enable automatic snapshot cleanup */
  enableSnapshotCleanup: boolean;
  /** Maximum snapshots to keep in memory */
  maxSnapshots: number;
}

/**
 * Memory Leak Detector
 * 
 * Comprehensive memory leak detection system that analyzes memory usage patterns
 * and identifies potential memory leaks in test suites.
 */
export class MemoryLeakDetector {
  private readonly config: MemoryLeakDetectionConfig;
  private readonly snapshots: Map<string, MemorySnapshot> = new Map();
  private readonly snapshotHistory: MemorySnapshot[] = [];
  private snapshotCounter = 0;

  constructor(config: Partial<MemoryLeakDetectionConfig> = {}) {
    this.config = {
      minSnapshots: 5,
      growthThreshold: 10 * 1024 * 1024, // 10MB
      percentageGrowthThreshold: 20, // 20%
      analysisTimeWindow: 60 * 1000, // 60 seconds
      enableDetailedLogging: false,
      enableSnapshotCleanup: true,
      maxSnapshots: 1000,
      ...config
    };

    if (this.config.enableDetailedLogging) {
      console.log('🔍 MemoryLeakDetector initialized with config:', this.config);
    }
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(
    memoryUsage: TestWorkerMemoryUsage,
    context: MemorySnapshot['context'],
    metadata: Record<string, any> = {}
  ): MemorySnapshot {
    const id = `snapshot-${++this.snapshotCounter}-${Date.now()}`;
    
    const snapshot: MemorySnapshot = {
      id,
      timestamp: memoryUsage.timestamp || Date.now(),
      memoryUsage,
      context,
      metadata
    };

    // Add heap objects count if available
    if (global.gc && typeof (global as any).getHeapStatistics === 'function') {
      try {
        const heapStats = (global as any).getHeapStatistics();
        snapshot.heapObjectsCount = heapStats.number_of_native_contexts + heapStats.number_of_detached_contexts;
      } catch (error) {
        // Ignore errors getting heap statistics
      }
    }

    this.snapshots.set(id, snapshot);
    this.snapshotHistory.push(snapshot);

    if (this.config.enableDetailedLogging) {
      console.log(`📸 Memory snapshot taken: ${id} (${snapshot.memoryUsage.formattedHeapUsed})`);
    }

    // Cleanup old snapshots if needed
    if (this.config.enableSnapshotCleanup && this.snapshotHistory.length > this.config.maxSnapshots) {
      const toRemove = this.snapshotHistory.splice(0, this.snapshotHistory.length - this.config.maxSnapshots);
      toRemove.forEach(s => this.snapshots.delete(s.id));
    }

    return snapshot;
  }

  /**
   * Compare two memory snapshots
   */
  compareSnapshots(snapshot1: MemorySnapshot, snapshot2: MemorySnapshot): {
    memoryGrowth: number;
    percentageGrowth: number;
    timeDifference: number;
    growthRate: number;
    analysis: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const memoryGrowth = snapshot2.memoryUsage.heapUsed - snapshot1.memoryUsage.heapUsed;
    const percentageGrowth = (memoryGrowth / snapshot1.memoryUsage.heapUsed) * 100;
    const timeDifference = snapshot2.timestamp - snapshot1.timestamp;
    const growthRate = timeDifference > 0 ? memoryGrowth / (timeDifference / 1000) : 0; // bytes per second

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let analysis = '';

    if (memoryGrowth > 100 * 1024 * 1024) { // > 100MB
      severity = 'critical';
      analysis = 'Extremely high memory growth detected';
    } else if (memoryGrowth > 50 * 1024 * 1024) { // > 50MB
      severity = 'high';
      analysis = 'High memory growth detected';
    } else if (memoryGrowth > 20 * 1024 * 1024) { // > 20MB
      severity = 'medium';
      analysis = 'Moderate memory growth detected';
    } else if (memoryGrowth > 5 * 1024 * 1024) { // > 5MB
      severity = 'low';
      analysis = 'Low memory growth detected';
    } else {
      analysis = 'Normal memory usage';
    }

    if (percentageGrowth > 50) {
      severity = Math.max(severity === 'low' ? 1 : severity === 'medium' ? 2 : severity === 'high' ? 3 : 4, 3) === 3 ? 'high' : 'critical';
      analysis += ` (${percentageGrowth.toFixed(1)}% increase)`;
    }

    return {
      memoryGrowth,
      percentageGrowth,
      timeDifference,
      growthRate,
      analysis,
      severity
    };
  }

  /**
   * Analyze memory usage patterns for leak detection
   */
  analyzeMemoryLeaks(timeWindow?: number): MemoryLeakAnalysis {
    const analysisWindow = timeWindow || this.config.analysisTimeWindow;
    const cutoffTime = Date.now() - analysisWindow;
    
    // Filter snapshots within the analysis window
    const relevantSnapshots = this.snapshotHistory
      .filter(s => s.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (relevantSnapshots.length < this.config.minSnapshots) {
      return {
        leakDetected: false,
        confidence: 0,
        patterns: [],
        statistics: {
          totalGrowth: 0,
          averageGrowth: 0,
          maxGrowth: 0,
          minGrowth: 0,
          growthVariance: 0,
          measurementCount: relevantSnapshots.length,
          timeSpan: 0
        },
        suspiciousSnapshots: [],
        recommendations: ['Need more snapshots for reliable analysis'],
        report: 'Insufficient data for memory leak analysis'
      };
    }

    // Calculate memory growth statistics
    const memoryValues = relevantSnapshots.map(s => s.memoryUsage.heapUsed);
    const firstMemory = memoryValues[0];
    const lastMemory = memoryValues[memoryValues.length - 1];
    const totalGrowth = lastMemory - firstMemory;
    const timeSpan = relevantSnapshots[relevantSnapshots.length - 1].timestamp - relevantSnapshots[0].timestamp;

    const growthValues = [];
    for (let i = 1; i < memoryValues.length; i++) {
      growthValues.push(memoryValues[i] - memoryValues[i - 1]);
    }

    const averageGrowth = growthValues.length > 0 ? growthValues.reduce((sum, g) => sum + g, 0) / growthValues.length : 0;
    const maxGrowth = growthValues.length > 0 ? Math.max(...growthValues) : 0;
    const minGrowth = growthValues.length > 0 ? Math.min(...growthValues) : 0;
    const growthVariance = this.calculateVariance(growthValues);

    const statistics = {
      totalGrowth,
      averageGrowth,
      maxGrowth,
      minGrowth,
      growthVariance,
      measurementCount: relevantSnapshots.length,
      timeSpan
    };

    // Detect patterns
    const patterns = this.detectMemoryPatterns(relevantSnapshots);

    // Find suspicious snapshots
    const suspiciousSnapshots = this.findSuspiciousSnapshots(relevantSnapshots);

    // Determine if leak is detected
    const leakDetected = this.determineLeakDetection(statistics, patterns, suspiciousSnapshots);

    // Calculate overall confidence
    const confidence = this.calculateLeakConfidence(statistics, patterns, suspiciousSnapshots);

    // Generate recommendations
    const recommendations = this.generateRecommendations(statistics, patterns, suspiciousSnapshots);

    // Generate detailed report
    const report = this.generateAnalysisReport(statistics, patterns, suspiciousSnapshots, relevantSnapshots);

    return {
      leakDetected,
      confidence,
      patterns,
      statistics,
      suspiciousSnapshots,
      recommendations,
      report
    };
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): MemorySnapshot[] {
    return [...this.snapshotHistory];
  }

  /**
   * Get snapshots within a time window
   */
  getSnapshotsInWindow(timeWindow: number): MemorySnapshot[] {
    const cutoffTime = Date.now() - timeWindow;
    return this.snapshotHistory.filter(s => s.timestamp >= cutoffTime);
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear();
    this.snapshotHistory.length = 0;
    this.snapshotCounter = 0;

    if (this.config.enableDetailedLogging) {
      console.log('🧹 All memory snapshots cleared');
    }
  }

  /**
   * Get memory leak detection summary
   */
  getLeakDetectionSummary(): string {
    const analysis = this.analyzeMemoryLeaks();
    
    let summary = '\n🔍 Memory Leak Detection Summary\n';
    summary += '='.repeat(40) + '\n';
    summary += `Leak Detected: ${analysis.leakDetected ? '🚨 YES' : '✅ NO'}\n`;
    summary += `Confidence: ${(analysis.confidence * 100).toFixed(1)}%\n`;
    summary += `Total Growth: ${this.formatBytes(analysis.statistics.totalGrowth)}\n`;
    summary += `Average Growth: ${this.formatBytes(analysis.statistics.averageGrowth)}\n`;
    summary += `Snapshots Analyzed: ${analysis.statistics.measurementCount}\n`;
    summary += `Time Span: ${(analysis.statistics.timeSpan / 1000).toFixed(1)}s\n`;

    if (analysis.patterns.length > 0) {
      summary += '\n📊 Detected Patterns:\n';
      analysis.patterns.forEach(pattern => {
        summary += `  - ${pattern.type}: ${pattern.description} (${pattern.severity})\n`;
      });
    }

    if (analysis.suspiciousSnapshots.length > 0) {
      summary += '\n🚨 Suspicious Snapshots:\n';
      analysis.suspiciousSnapshots.slice(0, 5).forEach(sus => {
        summary += `  - ${sus.snapshot.context.testName || sus.snapshot.id}: ${sus.reason} (${sus.severity})\n`;
      });
    }

    if (analysis.recommendations.length > 0) {
      summary += '\n💡 Recommendations:\n';
      analysis.recommendations.forEach(rec => {
        summary += `  - ${rec}\n`;
      });
    }

    return summary;
  }

  /**
   * Detect memory usage patterns
   */
  private detectMemoryPatterns(snapshots: MemorySnapshot[]): MemoryLeakPattern[] {
    const patterns: MemoryLeakPattern[] = [];
    const memoryValues = snapshots.map(s => s.memoryUsage.heapUsed);

    if (memoryValues.length < 3) {
      return patterns;
    }

    // Detect linear growth pattern
    const linearPattern = this.detectLinearGrowthPattern(memoryValues);
    if (linearPattern) {
      patterns.push(linearPattern);
    }

    // Detect exponential growth pattern
    const exponentialPattern = this.detectExponentialGrowthPattern(memoryValues);
    if (exponentialPattern) {
      patterns.push(exponentialPattern);
    }

    // Detect step growth pattern
    const stepPattern = this.detectStepGrowthPattern(memoryValues);
    if (stepPattern) {
      patterns.push(stepPattern);
    }

    // Detect oscillating pattern
    const oscillatingPattern = this.detectOscillatingPattern(memoryValues);
    if (oscillatingPattern) {
      patterns.push(oscillatingPattern);
    }

    return patterns;
  }

  /**
   * Detect linear growth pattern
   */
  private detectLinearGrowthPattern(memoryValues: number[]): MemoryLeakPattern | null {
    const growthValues = [];
    for (let i = 1; i < memoryValues.length; i++) {
      growthValues.push(memoryValues[i] - memoryValues[i - 1]);
    }

    const averageGrowth = growthValues.reduce((sum, g) => sum + g, 0) / growthValues.length;
    const variance = this.calculateVariance(growthValues);
    const coefficient = variance / (Math.abs(averageGrowth) + 1);

    // Linear pattern if growth is consistent and positive
    if (averageGrowth > this.config.growthThreshold / 10 && coefficient < 2) {
      const confidence = Math.min(1, Math.max(0, 1 - coefficient / 2));
      const severity = this.determineSeverity(averageGrowth);

      return {
        type: 'linear_growth',
        confidence,
        growthRate: averageGrowth,
        description: `Consistent linear memory growth of ${this.formatBytes(averageGrowth)} per measurement`,
        severity,
        recommendations: [
          'Check for objects that are not being garbage collected',
          'Review event listeners and ensure they are properly removed',
          'Look for growing arrays or maps that are not being cleared'
        ]
      };
    }

    return null;
  }

  /**
   * Detect exponential growth pattern
   */
  private detectExponentialGrowthPattern(memoryValues: number[]): MemoryLeakPattern | null {
    if (memoryValues.length < 4) return null;

    const ratios = [];
    for (let i = 2; i < memoryValues.length; i++) {
      const currentGrowth = memoryValues[i] - memoryValues[i - 1];
      const previousGrowth = memoryValues[i - 1] - memoryValues[i - 2];
      if (previousGrowth > 0) {
        ratios.push(currentGrowth / previousGrowth);
      }
    }

    if (ratios.length < 2) return null;

    const averageRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    const ratioVariance = this.calculateVariance(ratios);

    // Exponential pattern if ratio > 1.2 and consistent
    if (averageRatio > 1.2 && ratioVariance < 0.5) {
      const confidence = Math.min(1, Math.max(0, (averageRatio - 1) / 2));
      const totalGrowth = memoryValues[memoryValues.length - 1] - memoryValues[0];
      const severity = this.determineSeverity(totalGrowth);

      return {
        type: 'exponential_growth',
        confidence,
        growthRate: totalGrowth / memoryValues.length,
        description: `Exponential memory growth with ratio ${averageRatio.toFixed(2)}`,
        severity: Math.max(severity === 'low' ? 1 : severity === 'medium' ? 2 : severity === 'high' ? 3 : 4, 2) === 2 ? 'medium' : severity === 'high' ? 'high' : 'critical',
        recommendations: [
          'URGENT: Investigate recursive operations or nested object creation',
          'Check for memory leaks in loops or recursive functions',
          'Review data structures that might be growing exponentially'
        ]
      };
    }

    return null;
  }

  /**
   * Detect step growth pattern
   */
  private detectStepGrowthPattern(memoryValues: number[]): MemoryLeakPattern | null {
    const growthValues = [];
    for (let i = 1; i < memoryValues.length; i++) {
      growthValues.push(memoryValues[i] - memoryValues[i - 1]);
    }

    // Find significant jumps (more than 2x average)
    const averageGrowth = growthValues.reduce((sum, g) => sum + g, 0) / growthValues.length;
    const significantJumps = growthValues.filter(g => g > Math.max(averageGrowth * 2, this.config.growthThreshold / 5));

    if (significantJumps.length >= 2) {
      const confidence = Math.min(1, significantJumps.length / growthValues.length);
      const averageJump = significantJumps.reduce((sum, j) => sum + j, 0) / significantJumps.length;
      const severity = this.determineSeverity(averageJump);

      return {
        type: 'step_growth',
        confidence,
        growthRate: averageJump,
        description: `Step-wise memory growth with ${significantJumps.length} significant jumps`,
        severity,
        recommendations: [
          'Identify operations that cause sudden memory spikes',
          'Check for batch operations or large data loading',
          'Consider implementing memory cleanup after large operations'
        ]
      };
    }

    return null;
  }

  /**
   * Detect oscillating pattern
   */
  private detectOscillatingPattern(memoryValues: number[]): MemoryLeakPattern | null {
    if (memoryValues.length < 6) return null;

    const growthValues = [];
    for (let i = 1; i < memoryValues.length; i++) {
      growthValues.push(memoryValues[i] - memoryValues[i - 1]);
    }

    // Count sign changes
    let signChanges = 0;
    for (let i = 1; i < growthValues.length; i++) {
      if ((growthValues[i] > 0) !== (growthValues[i - 1] > 0)) {
        signChanges++;
      }
    }

    const oscillationRatio = signChanges / (growthValues.length - 1);

    // Oscillating pattern if more than 40% sign changes
    if (oscillationRatio > 0.4) {
      const confidence = Math.min(1, oscillationRatio);
      const totalGrowth = memoryValues[memoryValues.length - 1] - memoryValues[0];
      const severity = totalGrowth > this.config.growthThreshold ? 'medium' : 'low';

      return {
        type: 'oscillating',
        confidence,
        growthRate: totalGrowth / memoryValues.length,
        description: `Oscillating memory usage with ${(oscillationRatio * 100).toFixed(1)}% fluctuation`,
        severity,
        recommendations: [
          'Memory usage is fluctuating - this might be normal GC behavior',
          'Monitor for overall upward trend despite oscillations',
          'Consider the timing of garbage collection cycles'
        ]
      };
    }

    return null;
  }

  /**
   * Find suspicious snapshots
   */
  private findSuspiciousSnapshots(snapshots: MemorySnapshot[]): Array<{
    snapshot: MemorySnapshot;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const suspicious = [];

    for (let i = 1; i < snapshots.length; i++) {
      const current = snapshots[i];
      const previous = snapshots[i - 1];
      const comparison = this.compareSnapshots(previous, current);

      if (comparison.memoryGrowth > this.config.growthThreshold) {
        suspicious.push({
          snapshot: current,
          reason: `Large memory growth: ${this.formatBytes(comparison.memoryGrowth)} (${comparison.percentageGrowth.toFixed(1)}%)`,
          severity: comparison.severity
        });
      }

      // Check for sudden spikes
      if (i > 1) {
        const previousGrowth = snapshots[i - 1].memoryUsage.heapUsed - snapshots[i - 2].memoryUsage.heapUsed;
        if (comparison.memoryGrowth > previousGrowth * 3 && comparison.memoryGrowth > 5 * 1024 * 1024) {
          suspicious.push({
            snapshot: current,
            reason: `Memory spike: ${this.formatBytes(comparison.memoryGrowth)} (3x previous growth)`,
            severity: 'high'
          });
        }
      }
    }

    return suspicious.sort((a, b) => {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Determine if leak is detected based on analysis
   */
  private determineLeakDetection(
    statistics: MemoryLeakAnalysis['statistics'],
    patterns: MemoryLeakPattern[],
    suspiciousSnapshots: MemoryLeakAnalysis['suspiciousSnapshots']
  ): boolean {
    // Leak detected if:
    // 1. Total growth exceeds threshold
    if (statistics.totalGrowth > this.config.growthThreshold) {
      return true;
    }

    // 2. Average growth is significant
    if (statistics.averageGrowth > this.config.growthThreshold / 5) {
      return true;
    }

    // 3. High-confidence patterns detected
    const highConfidencePatterns = patterns.filter(p => p.confidence > 0.7 && p.type !== 'oscillating');
    if (highConfidencePatterns.length > 0) {
      return true;
    }

    // 4. Multiple suspicious snapshots
    const criticalSuspicious = suspiciousSnapshots.filter(s => s.severity === 'critical' || s.severity === 'high');
    if (criticalSuspicious.length >= 2) {
      return true;
    }

    return false;
  }

  /**
   * Calculate leak detection confidence
   */
  private calculateLeakConfidence(
    statistics: MemoryLeakAnalysis['statistics'],
    patterns: MemoryLeakPattern[],
    suspiciousSnapshots: MemoryLeakAnalysis['suspiciousSnapshots']
  ): number {
    let confidence = 0;

    // Growth-based confidence
    if (statistics.totalGrowth > this.config.growthThreshold * 2) {
      confidence += 0.4;
    } else if (statistics.totalGrowth > this.config.growthThreshold) {
      confidence += 0.2;
    }

    // Pattern-based confidence
    const maxPatternConfidence = Math.max(0, ...patterns.map(p => p.confidence));
    confidence += maxPatternConfidence * 0.3;

    // Suspicious snapshots confidence
    const criticalCount = suspiciousSnapshots.filter(s => s.severity === 'critical').length;
    const highCount = suspiciousSnapshots.filter(s => s.severity === 'high').length;
    confidence += Math.min(0.3, (criticalCount * 0.15) + (highCount * 0.1));

    return Math.min(1, confidence);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    statistics: MemoryLeakAnalysis['statistics'],
    patterns: MemoryLeakPattern[],
    suspiciousSnapshots: MemoryLeakAnalysis['suspiciousSnapshots']
  ): string[] {
    const recommendations = new Set<string>();

    // General recommendations
    if (statistics.totalGrowth > this.config.growthThreshold) {
      recommendations.add('Enable garbage collection with --expose-gc flag');
      recommendations.add('Add memory cleanup in test teardown methods');
      recommendations.add('Use memory profiling tools to identify specific leak sources');
    }

    // Pattern-specific recommendations
    patterns.forEach(pattern => {
      pattern.recommendations.forEach(rec => recommendations.add(rec));
    });

    // Suspicious snapshot recommendations
    if (suspiciousSnapshots.length > 0) {
      recommendations.add('Investigate tests with highest memory growth');
      recommendations.add('Consider reducing test data size or using streaming');
    }

    // Data-driven recommendations
    if (statistics.measurementCount < 10) {
      recommendations.add('Collect more memory snapshots for better analysis');
    }

    if (statistics.growthVariance > statistics.averageGrowth * 2) {
      recommendations.add('Memory usage is highly variable - investigate inconsistent behavior');
    }

    return Array.from(recommendations);
  }

  /**
   * Generate detailed analysis report
   */
  private generateAnalysisReport(
    statistics: MemoryLeakAnalysis['statistics'],
    patterns: MemoryLeakPattern[],
    suspiciousSnapshots: MemoryLeakAnalysis['suspiciousSnapshots'],
    snapshots: MemorySnapshot[]
  ): string {
    let report = '\n🔍 Detailed Memory Leak Analysis Report\n';
    report += '='.repeat(50) + '\n\n';

    // Statistics section
    report += '📊 Memory Usage Statistics:\n';
    report += `  Total Growth: ${this.formatBytes(statistics.totalGrowth)}\n`;
    report += `  Average Growth: ${this.formatBytes(statistics.averageGrowth)}\n`;
    report += `  Max Single Growth: ${this.formatBytes(statistics.maxGrowth)}\n`;
    report += `  Min Single Growth: ${this.formatBytes(statistics.minGrowth)}\n`;
    report += `  Growth Variance: ${this.formatBytes(statistics.growthVariance)}\n`;
    report += `  Measurements: ${statistics.measurementCount}\n`;
    report += `  Time Span: ${(statistics.timeSpan / 1000).toFixed(1)} seconds\n\n`;

    // Patterns section
    if (patterns.length > 0) {
      report += '📈 Detected Patterns:\n';
      patterns.forEach((pattern, index) => {
        report += `  ${index + 1}. ${pattern.type.toUpperCase()} (${pattern.severity})\n`;
        report += `     Confidence: ${(pattern.confidence * 100).toFixed(1)}%\n`;
        report += `     Growth Rate: ${this.formatBytes(pattern.growthRate)}\n`;
        report += `     Description: ${pattern.description}\n\n`;
      });
    }

    // Suspicious snapshots section
    if (suspiciousSnapshots.length > 0) {
      report += '🚨 Suspicious Snapshots:\n';
      suspiciousSnapshots.slice(0, 10).forEach((sus, index) => {
        report += `  ${index + 1}. ${sus.snapshot.context.testName || sus.snapshot.id}\n`;
        report += `     Memory: ${sus.snapshot.memoryUsage.formattedHeapUsed}\n`;
        report += `     Reason: ${sus.reason}\n`;
        report += `     Severity: ${sus.severity.toUpperCase()}\n`;
        report += `     Context: ${sus.snapshot.context.phase} ${sus.snapshot.context.suiteName || ''}\n\n`;
      });
    }

    // Memory timeline section
    report += '📅 Memory Usage Timeline:\n';
    const timelineSnapshots = snapshots.slice(-10); // Last 10 snapshots
    timelineSnapshots.forEach((snapshot, index) => {
      const time = new Date(snapshot.timestamp).toLocaleTimeString();
      const context = snapshot.context.testName || snapshot.context.description || 'Unknown';
      report += `  ${time}: ${snapshot.memoryUsage.formattedHeapUsed} (${context})\n`;
    });

    return report;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Determine severity based on memory growth
   */
  private determineSeverity(growth: number): 'low' | 'medium' | 'high' | 'critical' {
    if (growth > 100 * 1024 * 1024) return 'critical'; // > 100MB
    if (growth > 50 * 1024 * 1024) return 'high';      // > 50MB
    if (growth > 20 * 1024 * 1024) return 'medium';    // > 20MB
    return 'low';
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

/**
 * Memory Snapshot Comparator
 * 
 * Utility class for comparing memory snapshots and detecting differences.
 */
export class MemorySnapshotComparator {
  /**
   * Compare multiple snapshots and generate comparison report
   */
  static compareMultipleSnapshots(snapshots: MemorySnapshot[]): {
    totalGrowth: number;
    averageGrowth: number;
    maxGrowth: number;
    minGrowth: number;
    comparisons: Array<{
      from: MemorySnapshot;
      to: MemorySnapshot;
      growth: number;
      percentageGrowth: number;
      timeDifference: number;
    }>;
    report: string;
  } {
    if (snapshots.length < 2) {
      return {
        totalGrowth: 0,
        averageGrowth: 0,
        maxGrowth: 0,
        minGrowth: 0,
        comparisons: [],
        report: 'Need at least 2 snapshots for comparison'
      };
    }

    const sortedSnapshots = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
    const comparisons = [];
    const growthValues = [];

    for (let i = 1; i < sortedSnapshots.length; i++) {
      const from = sortedSnapshots[i - 1];
      const to = sortedSnapshots[i];
      const growth = to.memoryUsage.heapUsed - from.memoryUsage.heapUsed;
      const percentageGrowth = (growth / from.memoryUsage.heapUsed) * 100;
      const timeDifference = to.timestamp - from.timestamp;

      comparisons.push({
        from,
        to,
        growth,
        percentageGrowth,
        timeDifference
      });

      growthValues.push(growth);
    }

    const totalGrowth = sortedSnapshots[sortedSnapshots.length - 1].memoryUsage.heapUsed - sortedSnapshots[0].memoryUsage.heapUsed;
    const averageGrowth = growthValues.reduce((sum, g) => sum + g, 0) / growthValues.length;
    const maxGrowth = Math.max(...growthValues);
    const minGrowth = Math.min(...growthValues);

    // Generate report
    let report = '\n📊 Memory Snapshot Comparison Report\n';
    report += '='.repeat(40) + '\n';
    report += `Total Snapshots: ${snapshots.length}\n`;
    report += `Total Growth: ${this.formatBytes(totalGrowth)}\n`;
    report += `Average Growth: ${this.formatBytes(averageGrowth)}\n`;
    report += `Max Growth: ${this.formatBytes(maxGrowth)}\n`;
    report += `Min Growth: ${this.formatBytes(minGrowth)}\n\n`;

    report += 'Individual Comparisons:\n';
    comparisons.forEach((comp, index) => {
      const fromContext = comp.from.context.testName || comp.from.context.description || 'Unknown';
      const toContext = comp.to.context.testName || comp.to.context.description || 'Unknown';
      report += `  ${index + 1}. ${fromContext} → ${toContext}\n`;
      report += `     Growth: ${this.formatBytes(comp.growth)} (${comp.percentageGrowth.toFixed(1)}%)\n`;
      report += `     Time: ${(comp.timeDifference / 1000).toFixed(1)}s\n\n`;
    });

    return {
      totalGrowth,
      averageGrowth,
      maxGrowth,
      minGrowth,
      comparisons,
      report
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

/**
 * Global memory leak detector instance
 */
let globalMemoryLeakDetector: MemoryLeakDetector | null = null;

/**
 * Get or create global memory leak detector
 */
export function getMemoryLeakDetector(config?: Partial<MemoryLeakDetectionConfig>): MemoryLeakDetector {
  if (!globalMemoryLeakDetector) {
    globalMemoryLeakDetector = new MemoryLeakDetector(config);
  }
  return globalMemoryLeakDetector;
}

/**
 * Initialize memory leak detection
 */
export function initializeMemoryLeakDetection(config?: Partial<MemoryLeakDetectionConfig>): MemoryLeakDetector {
  globalMemoryLeakDetector = new MemoryLeakDetector(config);
  return globalMemoryLeakDetector;
}

/**
 * Cleanup memory leak detection
 */
export function cleanupMemoryLeakDetection(): void {
  if (globalMemoryLeakDetector) {
    globalMemoryLeakDetector.clearSnapshots();
    globalMemoryLeakDetector = null;
  }
}

/**
 * Utility function to take a memory snapshot
 */
export function takeMemorySnapshot(
  context: MemorySnapshot['context'],
  metadata: Record<string, any> = {}
): MemorySnapshot | null {
  if (!globalMemoryLeakDetector) {
    return null;
  }

  const memoryUsage = process.memoryUsage();
  const testWorkerMemoryUsage = {
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    rss: memoryUsage.rss,
    external: memoryUsage.external,
    timestamp: Date.now(),
    formattedHeapUsed: formatBytes(memoryUsage.heapUsed),
    formattedHeapTotal: formatBytes(memoryUsage.heapTotal),
    usagePercentage: 0,
    isWarning: false,
    isCritical: false,
    isOverLimit: false
  };

  return globalMemoryLeakDetector.takeSnapshot(testWorkerMemoryUsage, context, metadata);
}

/**
 * Utility function to analyze memory leaks
 */
export function analyzeMemoryLeaks(timeWindow?: number): MemoryLeakAnalysis | null {
  if (!globalMemoryLeakDetector) {
    return null;
  }
  return globalMemoryLeakDetector.analyzeMemoryLeaks(timeWindow);
}

/**
 * Utility function to get leak detection summary
 */
export function getMemoryLeakSummary(): string {
  if (!globalMemoryLeakDetector) {
    return 'Memory leak detection not initialized';
  }
  return globalMemoryLeakDetector.getLeakDetectionSummary();
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}