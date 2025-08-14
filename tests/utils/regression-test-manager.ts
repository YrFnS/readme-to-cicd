/**
 * Regression Test Manager for tracking workflow generation quality over time
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { DetectionResult } from '../../src/generator/interfaces';

export interface BaselineResult {
  name: string;
  detectionResult: DetectionResult;
  expectedScore: number;
  expectedFeatures: string[];
  timestamp: string;
  version: string;
}

export interface QualityComparison {
  overallDegradation: number;
  criticalRegressions: RegressionIssue[];
  improvements: QualityImprovement[];
  stableTests: string[];
}

export interface RegressionIssue {
  testName: string;
  previousScore: number;
  currentScore: number;
  degradation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface QualityImprovement {
  testName: string;
  previousScore: number;
  currentScore: number;
  improvement: number;
  description: string;
}

export interface CurrentResult {
  name: string;
  score: number;
  workflowSize: number;
  optimizations: number;
  warnings: number;
}

export class RegressionTestManager {
  private baselinePath: string;
  private version: string = '2.0.0';

  constructor(baselinePath?: string) {
    this.baselinePath = baselinePath || join(__dirname, '..', 'fixtures', 'regression-baselines');
  }

  /**
   * Get baseline results for regression testing
   */
  async getBaselineResults(): Promise<BaselineResult[]> {
    try {
      const baselineFile = join(this.baselinePath, 'baseline-results.json');
      const content = await readFile(baselineFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // If no baseline exists, create default baseline
      return this.createDefaultBaseline();
    }
  }

  /**
   * Save baseline results
   */
  async saveBaselineResults(results: BaselineResult[]): Promise<void> {
    try {
      await mkdir(this.baselinePath, { recursive: true });
      const baselineFile = join(this.baselinePath, 'baseline-results.json');
      await writeFile(baselineFile, JSON.stringify(results, null, 2));
    } catch (error) {
      console.warn('Failed to save baseline results:', error);
    }
  }

  /**
   * Compare current results with baseline
   */
  compareWithBaseline(currentResults: CurrentResult[], baselineResults: BaselineResult[]): QualityComparison {
    const criticalRegressions: RegressionIssue[] = [];
    const improvements: QualityImprovement[] = [];
    const stableTests: string[] = [];
    
    let totalDegradation = 0;
    let comparisonCount = 0;

    for (const baseline of baselineResults) {
      const current = currentResults.find(r => r.name === baseline.name);
      
      if (!current) {
        criticalRegressions.push({
          testName: baseline.name,
          previousScore: baseline.expectedScore,
          currentScore: 0,
          degradation: baseline.expectedScore,
          severity: 'critical',
          description: 'Test case no longer exists or fails to execute'
        });
        continue;
      }

      const scoreDifference = current.score - baseline.expectedScore;
      comparisonCount++;

      if (scoreDifference < -0.2) {
        // Significant degradation (>20%)
        criticalRegressions.push({
          testName: baseline.name,
          previousScore: baseline.expectedScore,
          currentScore: current.score,
          degradation: Math.abs(scoreDifference),
          severity: this.calculateSeverity(Math.abs(scoreDifference)),
          description: `Quality score dropped by ${(Math.abs(scoreDifference) * 100).toFixed(1)}%`
        });
        totalDegradation += Math.abs(scoreDifference);
      } else if (scoreDifference > 0.1) {
        // Significant improvement (>10%)
        improvements.push({
          testName: baseline.name,
          previousScore: baseline.expectedScore,
          currentScore: current.score,
          improvement: scoreDifference,
          description: `Quality score improved by ${(scoreDifference * 100).toFixed(1)}%`
        });
      } else {
        // Stable performance
        stableTests.push(baseline.name);
      }
    }

    const overallDegradation = comparisonCount > 0 ? totalDegradation / comparisonCount : 0;

    return {
      overallDegradation,
      criticalRegressions,
      improvements,
      stableTests
    };
  }

  /**
   * Update baseline with current results
   */
  async updateBaseline(currentResults: CurrentResult[]): Promise<void> {
    const baselineResults: BaselineResult[] = currentResults.map(result => ({
      name: result.name,
      detectionResult: this.createDetectionResultForBaseline(result.name),
      expectedScore: result.score,
      expectedFeatures: this.getExpectedFeaturesForTest(result.name),
      timestamp: new Date().toISOString(),
      version: this.version
    }));

    await this.saveBaselineResults(baselineResults);
  }

  /**
   * Generate regression test report
   */
  generateRegressionReport(comparison: QualityComparison): string {
    let report = '\n' + '='.repeat(80) + '\n';
    report += '📊 REGRESSION TEST REPORT\n';
    report += '='.repeat(80) + '\n';

    // Overall summary
    report += `\n📈 Overall Quality Change: ${(comparison.overallDegradation * 100).toFixed(1)}% degradation\n`;
    report += `✅ Stable Tests: ${comparison.stableTests.length}\n`;
    report += `📈 Improvements: ${comparison.improvements.length}\n`;
    report += `⚠️  Regressions: ${comparison.criticalRegressions.length}\n`;

    // Critical regressions
    if (comparison.criticalRegressions.length > 0) {
      report += '\n❌ CRITICAL REGRESSIONS:\n';
      report += '-'.repeat(40) + '\n';
      
      comparison.criticalRegressions.forEach(regression => {
        report += `• ${regression.testName} (${regression.severity.toUpperCase()})\n`;
        report += `  Previous: ${(regression.previousScore * 100).toFixed(1)}% → Current: ${(regression.currentScore * 100).toFixed(1)}%\n`;
        report += `  Degradation: ${(regression.degradation * 100).toFixed(1)}%\n`;
        report += `  Issue: ${regression.description}\n\n`;
      });
    }

    // Improvements
    if (comparison.improvements.length > 0) {
      report += '\n✅ IMPROVEMENTS:\n';
      report += '-'.repeat(40) + '\n';
      
      comparison.improvements.forEach(improvement => {
        report += `• ${improvement.testName}\n`;
        report += `  Previous: ${(improvement.previousScore * 100).toFixed(1)}% → Current: ${(improvement.currentScore * 100).toFixed(1)}%\n`;
        report += `  Improvement: ${(improvement.improvement * 100).toFixed(1)}%\n`;
        report += `  Details: ${improvement.description}\n\n`;
      });
    }

    // Stable tests
    if (comparison.stableTests.length > 0) {
      report += '\n🔄 STABLE TESTS:\n';
      report += '-'.repeat(40) + '\n';
      comparison.stableTests.forEach(test => {
        report += `• ${test}\n`;
      });
    }

    // Recommendations
    report += '\n💡 RECOMMENDATIONS:\n';
    report += '-'.repeat(40) + '\n';
    
    if (comparison.criticalRegressions.length > 0) {
      report += '• Investigate critical regressions immediately\n';
      report += '• Review recent changes that may have affected workflow generation\n';
      report += '• Consider rolling back problematic changes\n';
    }
    
    if (comparison.overallDegradation > 0.1) {
      report += '• Overall quality has degraded significantly\n';
      report += '• Review and update baseline expectations if intentional\n';
    }
    
    if (comparison.improvements.length > comparison.criticalRegressions.length) {
      report += '• More improvements than regressions - good progress!\n';
      report += '• Consider updating baseline to reflect improvements\n';
    }

    report += '\n' + '='.repeat(80) + '\n';
    
    return report;
  }

  /**
   * Calculate severity of regression
   */
  private calculateSeverity(degradation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (degradation >= 0.5) return 'critical';
    if (degradation >= 0.3) return 'high';
    if (degradation >= 0.2) return 'medium';
    return 'low';
  }

  /**
   * Create default baseline for initial setup
   */
  private createDefaultBaseline(): BaselineResult[] {
    return [
      {
        name: 'React App Regression',
        detectionResult: {
          languages: [{ name: 'JavaScript', confidence: 0.9, sources: ['package.json'] }],
          frameworks: [{ name: 'React', ecosystem: 'nodejs', confidence: 0.8, type: 'frontend_framework' }],
          buildTools: [{ name: 'npm', confidence: 0.9, configFile: 'package.json' }],
          containers: [],
          deploymentTargets: ['vercel'],
          confidence: { score: 0.8, factors: ['React project detected'] },
          warnings: []
        },
        expectedScore: 0.85,
        expectedFeatures: ['setup-node', 'npm ci', 'npm run build', 'npm test'],
        timestamp: new Date().toISOString(),
        version: this.version
      },
      {
        name: 'Python Django Regression',
        detectionResult: {
          languages: [{ name: 'Python', confidence: 0.9, sources: ['requirements.txt'] }],
          frameworks: [{ name: 'Django', ecosystem: 'python', confidence: 0.8, type: 'web_framework' }],
          buildTools: [{ name: 'pip', confidence: 0.9, configFile: 'requirements.txt' }],
          containers: [{ type: 'docker', configFiles: ['Dockerfile'] }],
          deploymentTargets: ['aws'],
          confidence: { score: 0.8, factors: ['Django project detected'] },
          warnings: []
        },
        expectedScore: 0.82,
        expectedFeatures: ['setup-python', 'pip install', 'python manage.py test', 'collectstatic'],
        timestamp: new Date().toISOString(),
        version: this.version
      },
      {
        name: 'Go Microservice Regression',
        detectionResult: {
          languages: [{ name: 'Go', confidence: 0.9, sources: ['go.mod'] }],
          frameworks: [{ name: 'Gin', ecosystem: 'go', confidence: 0.8, type: 'web_framework' }],
          buildTools: [{ name: 'go', confidence: 0.9, configFile: 'go.mod' }],
          containers: [{ type: 'docker', configFiles: ['Dockerfile'] }],
          deploymentTargets: ['kubernetes'],
          confidence: { score: 0.8, factors: ['Go microservice detected'] },
          warnings: []
        },
        expectedScore: 0.80,
        expectedFeatures: ['setup-go', 'go build', 'go test ./...', 'docker build'],
        timestamp: new Date().toISOString(),
        version: this.version
      },
      {
        name: 'Rust CLI Tool Regression',
        detectionResult: {
          languages: [{ name: 'Rust', confidence: 0.9, sources: ['Cargo.toml'] }],
          frameworks: [{ name: 'Clap', ecosystem: 'rust', confidence: 0.7, type: 'cli_framework' }],
          buildTools: [{ name: 'cargo', confidence: 0.9, configFile: 'Cargo.toml' }],
          containers: [],
          deploymentTargets: ['github-releases'],
          confidence: { score: 0.8, factors: ['Rust CLI tool detected'] },
          warnings: []
        },
        expectedScore: 0.78,
        expectedFeatures: ['rust-toolchain', 'cargo build', 'cargo test', 'cargo clippy'],
        timestamp: new Date().toISOString(),
        version: this.version
      },
      {
        name: 'Java Spring Boot Regression',
        detectionResult: {
          languages: [{ name: 'Java', confidence: 0.9, sources: ['pom.xml'] }],
          frameworks: [{ name: 'Spring Boot', ecosystem: 'java', confidence: 0.8, type: 'web_framework' }],
          buildTools: [{ name: 'maven', confidence: 0.9, configFile: 'pom.xml' }],
          containers: [{ type: 'docker', configFiles: ['Dockerfile'] }],
          deploymentTargets: ['aws'],
          confidence: { score: 0.8, factors: ['Spring Boot application detected'] },
          warnings: []
        },
        expectedScore: 0.83,
        expectedFeatures: ['setup-java', './mvnw compile', './mvnw test', 'docker build'],
        timestamp: new Date().toISOString(),
        version: this.version
      }
    ];
  }

  /**
   * Create detection result for baseline (simplified)
   */
  private createDetectionResultForBaseline(testName: string): DetectionResult {
    // This is a simplified version - in practice, you'd store the actual detection results
    const baseResult: DetectionResult = {
      languages: [],
      frameworks: [],
      buildTools: [],
      containers: [],
      deploymentTargets: [],
      confidence: { score: 0.8, factors: [] },
      warnings: []
    };

    if (testName.includes('React')) {
      baseResult.languages.push({ name: 'JavaScript', confidence: 0.9, sources: ['package.json'] });
      baseResult.frameworks.push({ name: 'React', ecosystem: 'nodejs', confidence: 0.8, type: 'frontend_framework' });
      baseResult.buildTools.push({ name: 'npm', confidence: 0.9, configFile: 'package.json' });
    }

    if (testName.includes('Django')) {
      baseResult.languages.push({ name: 'Python', confidence: 0.9, sources: ['requirements.txt'] });
      baseResult.frameworks.push({ name: 'Django', ecosystem: 'python', confidence: 0.8, type: 'web_framework' });
      baseResult.buildTools.push({ name: 'pip', confidence: 0.9, configFile: 'requirements.txt' });
    }

    if (testName.includes('Go')) {
      baseResult.languages.push({ name: 'Go', confidence: 0.9, sources: ['go.mod'] });
      baseResult.frameworks.push({ name: 'Gin', ecosystem: 'go', confidence: 0.8, type: 'web_framework' });
      baseResult.buildTools.push({ name: 'go', confidence: 0.9, configFile: 'go.mod' });
    }

    if (testName.includes('Rust')) {
      baseResult.languages.push({ name: 'Rust', confidence: 0.9, sources: ['Cargo.toml'] });
      baseResult.frameworks.push({ name: 'Clap', ecosystem: 'rust', confidence: 0.7, type: 'cli_framework' });
      baseResult.buildTools.push({ name: 'cargo', confidence: 0.9, configFile: 'Cargo.toml' });
    }

    if (testName.includes('Java')) {
      baseResult.languages.push({ name: 'Java', confidence: 0.9, sources: ['pom.xml'] });
      baseResult.frameworks.push({ name: 'Spring Boot', ecosystem: 'java', confidence: 0.8, type: 'web_framework' });
      baseResult.buildTools.push({ name: 'maven', confidence: 0.9, configFile: 'pom.xml' });
    }

    return baseResult;
  }

  /**
   * Get expected features for a test
   */
  private getExpectedFeaturesForTest(testName: string): string[] {
    if (testName.includes('React')) {
      return ['setup-node', 'npm ci', 'npm run build', 'npm test'];
    }
    
    if (testName.includes('Django')) {
      return ['setup-python', 'pip install', 'python manage.py test', 'collectstatic'];
    }
    
    if (testName.includes('Go')) {
      return ['setup-go', 'go build', 'go test ./...', 'docker build'];
    }
    
    if (testName.includes('Rust')) {
      return ['rust-toolchain', 'cargo build', 'cargo test', 'cargo clippy'];
    }
    
    if (testName.includes('Java')) {
      return ['setup-java', './mvnw compile', './mvnw test', 'docker build'];
    }
    
    return [];
  }

  /**
   * Check if baseline needs updating
   */
  async shouldUpdateBaseline(): Promise<boolean> {
    try {
      const baseline = await this.getBaselineResults();
      
      if (baseline.length === 0) {
        return true; // No baseline exists
      }

      // Check if baseline is old (more than 30 days)
      const oldestBaseline = baseline.reduce((oldest, current) => {
        const currentDate = new Date(current.timestamp);
        const oldestDate = new Date(oldest.timestamp);
        return currentDate < oldestDate ? current : oldest;
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return new Date(oldestBaseline.timestamp) < thirtyDaysAgo;
    } catch (error) {
      return true; // Error reading baseline, should update
    }
  }

  /**
   * Archive old baseline
   */
  async archiveBaseline(): Promise<void> {
    try {
      const baseline = await this.getBaselineResults();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveFile = join(this.baselinePath, `baseline-archive-${timestamp}.json`);
      
      await mkdir(this.baselinePath, { recursive: true });
      await writeFile(archiveFile, JSON.stringify(baseline, null, 2));
    } catch (error) {
      console.warn('Failed to archive baseline:', error);
    }
  }
}