/**
 * Regression test manager for tracking framework detection accuracy over time
 * and preventing detection accuracy degradation
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { DetectionResult } from '../../src/detection/interfaces/detection-result';
import { FrameworkInfo } from '../../src/detection/interfaces/framework-info';
import { ProjectInfo } from '../../src/detection/interfaces/framework-detector';

export interface RegressionTestCase {
  id: string;
  name: string;
  description: string;
  projectInfo: ProjectInfo;
  expectedResults: ExpectedDetectionResults;
  createdAt: string;
  lastUpdated: string;
  version: string;
}

export interface ExpectedDetectionResults {
  frameworks: ExpectedFramework[];
  buildTools: ExpectedBuildTool[];
  containers: ExpectedContainer[];
  minOverallConfidence: number;
  maxWarnings: number;
  tags: string[];
}

export interface ExpectedFramework {
  name: string;
  ecosystem: string;
  type?: string;
  minConfidence: number;
  required: boolean;
}

export interface ExpectedBuildTool {
  name: string;
  minConfidence: number;
  required: boolean;
}

export interface ExpectedContainer {
  type: string;
  required: boolean;
}

export interface RegressionTestResult {
  testCaseId: string;
  testName: string;
  passed: boolean;
  score: number;
  actualResults: DetectionResult;
  frameworkMatches: FrameworkMatchResult[];
  buildToolMatches: BuildToolMatchResult[];
  containerMatches: ContainerMatchResult[];
  confidenceCheck: ConfidenceCheckResult;
  warningCheck: WarningCheckResult;
  executionTime: number;
  memoryUsage: number;
  timestamp: string;
}

export interface FrameworkMatchResult {
  expected: ExpectedFramework;
  actual?: FrameworkInfo;
  matched: boolean;
  confidenceMet: boolean;
  score: number;
  issues: string[];
}

export interface BuildToolMatchResult {
  expected: ExpectedBuildTool;
  actual?: any;
  matched: boolean;
  confidenceMet: boolean;
  score: number;
  issues: string[];
}

export interface ContainerMatchResult {
  expected: ExpectedContainer;
  actual?: any;
  matched: boolean;
  score: number;
  issues: string[];
}

export interface ConfidenceCheckResult {
  expected: number;
  actual: number;
  passed: boolean;
  score: number;
}

export interface WarningCheckResult {
  maxExpected: number;
  actual: number;
  passed: boolean;
  score: number;
  warnings: string[];
}

export interface RegressionReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageScore: number;
  averageExecutionTime: number;
  averageMemoryUsage: number;
  frameworkAccuracy: number;
  buildToolAccuracy: number;
  containerAccuracy: number;
  confidenceAccuracy: number;
  regressions: RegressionIssue[];
  improvements: ImprovementNote[];
  timestamp: string;
}

export interface RegressionIssue {
  testCaseId: string;
  testName: string;
  issueType: 'framework_missing' | 'confidence_low' | 'performance_degraded' | 'new_warnings';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  previousScore?: number;
  currentScore: number;
}

export interface ImprovementNote {
  testCaseId: string;
  testName: string;
  improvementType: 'accuracy_improved' | 'performance_improved' | 'warnings_reduced';
  description: string;
  previousScore?: number;
  currentScore: number;
}

export class RegressionTestManager {
  private testCasesPath: string;
  private resultsPath: string;
  private reportsPath: string;

  constructor(baseDir: string = join(__dirname, '..', 'regression-data')) {
    this.testCasesPath = join(baseDir, 'test-cases');
    this.resultsPath = join(baseDir, 'results');
    this.reportsPath = join(baseDir, 'reports');
  }

  /**
   * Initialize regression test directories
   */
  async initialize(): Promise<void> {
    await mkdir(this.testCasesPath, { recursive: true });
    await mkdir(this.resultsPath, { recursive: true });
    await mkdir(this.reportsPath, { recursive: true });
  }

  /**
   * Create a new regression test case
   */
  async createTestCase(testCase: Omit<RegressionTestCase, 'createdAt' | 'lastUpdated' | 'version'>): Promise<void> {
    const fullTestCase: RegressionTestCase = {
      ...testCase,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };

    const filePath = join(this.testCasesPath, `${testCase.id}.json`);
    await writeFile(filePath, JSON.stringify(fullTestCase, null, 2));
  }

  /**
   * Load all regression test cases
   */
  async loadTestCases(): Promise<RegressionTestCase[]> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(this.testCasesPath);
      const testCases: RegressionTestCase[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.testCasesPath, file);
          const content = await readFile(filePath, 'utf-8');
          const testCase = JSON.parse(content) as RegressionTestCase;
          testCases.push(testCase);
        }
      }

      return testCases.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.warn('Could not load regression test cases:', error);
      return [];
    }
  }

  /**
   * Validate detection results against expected results
   */
  validateResults(
    testCase: RegressionTestCase,
    actualResults: DetectionResult,
    executionTime: number,
    memoryUsage: number
  ): RegressionTestResult {
    const frameworkMatches = this.validateFrameworks(
      testCase.expectedResults.frameworks,
      actualResults.frameworks
    );

    const buildToolMatches = this.validateBuildTools(
      testCase.expectedResults.buildTools,
      actualResults.buildTools
    );

    const containerMatches = this.validateContainers(
      testCase.expectedResults.containers,
      actualResults.containers
    );

    const confidenceCheck = this.validateConfidence(
      testCase.expectedResults.minOverallConfidence,
      actualResults.confidence.score
    );

    const warningCheck = this.validateWarnings(
      testCase.expectedResults.maxWarnings,
      actualResults.warnings
    );

    // Calculate overall score
    const frameworkScore = frameworkMatches.reduce((sum, match) => sum + match.score, 0) / Math.max(frameworkMatches.length, 1);
    const buildToolScore = buildToolMatches.reduce((sum, match) => sum + match.score, 0) / Math.max(buildToolMatches.length, 1);
    const containerScore = containerMatches.reduce((sum, match) => sum + match.score, 0) / Math.max(containerMatches.length, 1);
    
    const overallScore = (
      frameworkScore * 0.4 +
      buildToolScore * 0.3 +
      containerScore * 0.1 +
      confidenceCheck.score * 0.15 +
      warningCheck.score * 0.05
    );

    const passed = overallScore >= 0.7 && 
                  frameworkMatches.every(m => !m.expected.required || m.matched) &&
                  buildToolMatches.every(m => !m.expected.required || m.matched) &&
                  containerMatches.every(m => !m.expected.required || m.matched) &&
                  confidenceCheck.passed &&
                  warningCheck.passed;

    return {
      testCaseId: testCase.id,
      testName: testCase.name,
      passed,
      score: overallScore,
      actualResults,
      frameworkMatches,
      buildToolMatches,
      containerMatches,
      confidenceCheck,
      warningCheck,
      executionTime,
      memoryUsage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate framework detection results
   */
  private validateFrameworks(
    expected: ExpectedFramework[],
    actual: FrameworkInfo[]
  ): FrameworkMatchResult[] {
    return expected.map(expectedFramework => {
      const actualFramework = actual.find(f =>
        f.name.toLowerCase() === expectedFramework.name.toLowerCase() &&
        f.ecosystem === expectedFramework.ecosystem
      );

      const matched = !!actualFramework;
      const confidenceMet = actualFramework ? actualFramework.confidence >= expectedFramework.minConfidence : false;
      
      const issues: string[] = [];
      if (!matched && expectedFramework.required) {
        issues.push(`Required framework ${expectedFramework.name} not detected`);
      }
      if (matched && !confidenceMet) {
        issues.push(`Framework ${expectedFramework.name} confidence too low: ${actualFramework?.confidence} < ${expectedFramework.minConfidence}`);
      }
      if (matched && expectedFramework.type && actualFramework?.type !== expectedFramework.type) {
        issues.push(`Framework ${expectedFramework.name} type mismatch: expected ${expectedFramework.type}, got ${actualFramework?.type}`);
      }

      let score = 0;
      if (matched) {
        score += 0.5; // Base score for detection
        if (confidenceMet) score += 0.3; // Confidence bonus
        if (!expectedFramework.type || actualFramework?.type === expectedFramework.type) score += 0.2; // Type bonus
      }

      return {
        expected: expectedFramework,
        actual: actualFramework,
        matched,
        confidenceMet,
        score,
        issues
      };
    });
  }

  /**
   * Validate build tool detection results
   */
  private validateBuildTools(
    expected: ExpectedBuildTool[],
    actual: any[]
  ): BuildToolMatchResult[] {
    return expected.map(expectedTool => {
      const actualTool = actual.find(bt =>
        bt.name.toLowerCase() === expectedTool.name.toLowerCase()
      );

      const matched = !!actualTool;
      const confidenceMet = actualTool ? actualTool.confidence >= expectedTool.minConfidence : false;
      
      const issues: string[] = [];
      if (!matched && expectedTool.required) {
        issues.push(`Required build tool ${expectedTool.name} not detected`);
      }
      if (matched && !confidenceMet) {
        issues.push(`Build tool ${expectedTool.name} confidence too low: ${actualTool?.confidence} < ${expectedTool.minConfidence}`);
      }

      let score = 0;
      if (matched) {
        score += 0.6; // Base score for detection
        if (confidenceMet) score += 0.4; // Confidence bonus
      }

      return {
        expected: expectedTool,
        actual: actualTool,
        matched,
        confidenceMet,
        score,
        issues
      };
    });
  }

  /**
   * Validate container detection results
   */
  private validateContainers(
    expected: ExpectedContainer[],
    actual: any[]
  ): ContainerMatchResult[] {
    return expected.map(expectedContainer => {
      const actualContainer = actual.find(c => c.type === expectedContainer.type);
      const matched = !!actualContainer;
      
      const issues: string[] = [];
      if (!matched && expectedContainer.required) {
        issues.push(`Required container ${expectedContainer.type} not detected`);
      }

      const score = matched ? 1.0 : 0.0;

      return {
        expected: expectedContainer,
        actual: actualContainer,
        matched,
        score,
        issues
      };
    });
  }

  /**
   * Validate overall confidence score
   */
  private validateConfidence(expected: number, actual: number): ConfidenceCheckResult {
    const passed = actual >= expected;
    const score = passed ? 1.0 : actual / expected;

    return {
      expected,
      actual,
      passed,
      score
    };
  }

  /**
   * Validate warning count
   */
  private validateWarnings(maxExpected: number, actualWarnings: any[]): WarningCheckResult {
    const actual = actualWarnings.length;
    const passed = actual <= maxExpected;
    const score = passed ? 1.0 : Math.max(0, 1 - (actual - maxExpected) * 0.1);

    return {
      maxExpected,
      actual,
      passed,
      score,
      warnings: actualWarnings.map(w => w.message || w.toString())
    };
  }

  /**
   * Save regression test results
   */
  async saveResults(results: RegressionTestResult[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = join(this.resultsPath, `results-${timestamp}.json`);
    await writeFile(filePath, JSON.stringify(results, null, 2));
  }

  /**
   * Generate regression report
   */
  generateReport(results: RegressionTestResult[], previousResults?: RegressionTestResult[]): RegressionReport {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;
    const averageMemoryUsage = results.reduce((sum, r) => sum + r.memoryUsage, 0) / totalTests;

    // Calculate accuracy metrics
    const frameworkAccuracy = this.calculateFrameworkAccuracy(results);
    const buildToolAccuracy = this.calculateBuildToolAccuracy(results);
    const containerAccuracy = this.calculateContainerAccuracy(results);
    const confidenceAccuracy = results.filter(r => r.confidenceCheck.passed).length / totalTests;

    // Identify regressions and improvements
    const regressions = this.identifyRegressions(results, previousResults);
    const improvements = this.identifyImprovements(results, previousResults);

    return {
      totalTests,
      passedTests,
      failedTests,
      averageScore,
      averageExecutionTime,
      averageMemoryUsage,
      frameworkAccuracy,
      buildToolAccuracy,
      containerAccuracy,
      confidenceAccuracy,
      regressions,
      improvements,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate framework detection accuracy
   */
  private calculateFrameworkAccuracy(results: RegressionTestResult[]): number {
    const totalFrameworks = results.reduce((sum, r) => sum + r.frameworkMatches.length, 0);
    const matchedFrameworks = results.reduce((sum, r) => 
      sum + r.frameworkMatches.filter(m => m.matched).length, 0
    );
    return totalFrameworks > 0 ? matchedFrameworks / totalFrameworks : 1;
  }

  /**
   * Calculate build tool detection accuracy
   */
  private calculateBuildToolAccuracy(results: RegressionTestResult[]): number {
    const totalBuildTools = results.reduce((sum, r) => sum + r.buildToolMatches.length, 0);
    const matchedBuildTools = results.reduce((sum, r) => 
      sum + r.buildToolMatches.filter(m => m.matched).length, 0
    );
    return totalBuildTools > 0 ? matchedBuildTools / totalBuildTools : 1;
  }

  /**
   * Calculate container detection accuracy
   */
  private calculateContainerAccuracy(results: RegressionTestResult[]): number {
    const totalContainers = results.reduce((sum, r) => sum + r.containerMatches.length, 0);
    const matchedContainers = results.reduce((sum, r) => 
      sum + r.containerMatches.filter(m => m.matched).length, 0
    );
    return totalContainers > 0 ? matchedContainers / totalContainers : 1;
  }

  /**
   * Identify regressions compared to previous results
   */
  private identifyRegressions(
    currentResults: RegressionTestResult[],
    previousResults?: RegressionTestResult[]
  ): RegressionIssue[] {
    if (!previousResults) return [];

    const regressions: RegressionIssue[] = [];

    for (const current of currentResults) {
      const previous = previousResults.find(p => p.testCaseId === current.testCaseId);
      if (!previous) continue;

      // Check for score regression
      if (current.score < previous.score - 0.1) {
        regressions.push({
          testCaseId: current.testCaseId,
          testName: current.testName,
          issueType: 'framework_missing',
          description: `Overall score decreased from ${previous.score.toFixed(3)} to ${current.score.toFixed(3)}`,
          severity: current.score < 0.5 ? 'critical' : current.score < 0.7 ? 'high' : 'medium',
          previousScore: previous.score,
          currentScore: current.score
        });
      }

      // Check for performance regression
      if (current.executionTime > previous.executionTime * 1.5) {
        regressions.push({
          testCaseId: current.testCaseId,
          testName: current.testName,
          issueType: 'performance_degraded',
          description: `Execution time increased from ${previous.executionTime}ms to ${current.executionTime}ms`,
          severity: current.executionTime > previous.executionTime * 2 ? 'high' : 'medium',
          previousScore: previous.executionTime,
          currentScore: current.executionTime
        });
      }

      // Check for new warnings
      if (current.warningCheck.actual > previous.warningCheck.actual) {
        regressions.push({
          testCaseId: current.testCaseId,
          testName: current.testName,
          issueType: 'new_warnings',
          description: `Warning count increased from ${previous.warningCheck.actual} to ${current.warningCheck.actual}`,
          severity: 'low',
          previousScore: previous.warningCheck.actual,
          currentScore: current.warningCheck.actual
        });
      }
    }

    return regressions;
  }

  /**
   * Identify improvements compared to previous results
   */
  private identifyImprovements(
    currentResults: RegressionTestResult[],
    previousResults?: RegressionTestResult[]
  ): ImprovementNote[] {
    if (!previousResults) return [];

    const improvements: ImprovementNote[] = [];

    for (const current of currentResults) {
      const previous = previousResults.find(p => p.testCaseId === current.testCaseId);
      if (!previous) continue;

      // Check for accuracy improvement
      if (current.score > previous.score + 0.05) {
        improvements.push({
          testCaseId: current.testCaseId,
          testName: current.testName,
          improvementType: 'accuracy_improved',
          description: `Overall score improved from ${previous.score.toFixed(3)} to ${current.score.toFixed(3)}`,
          previousScore: previous.score,
          currentScore: current.score
        });
      }

      // Check for performance improvement
      if (current.executionTime < previous.executionTime * 0.8) {
        improvements.push({
          testCaseId: current.testCaseId,
          testName: current.testName,
          improvementType: 'performance_improved',
          description: `Execution time improved from ${previous.executionTime}ms to ${current.executionTime}ms`,
          previousScore: previous.executionTime,
          currentScore: current.executionTime
        });
      }

      // Check for warning reduction
      if (current.warningCheck.actual < previous.warningCheck.actual) {
        improvements.push({
          testCaseId: current.testCaseId,
          testName: current.testName,
          improvementType: 'warnings_reduced',
          description: `Warning count reduced from ${previous.warningCheck.actual} to ${current.warningCheck.actual}`,
          previousScore: previous.warningCheck.actual,
          currentScore: current.warningCheck.actual
        });
      }
    }

    return improvements;
  }

  /**
   * Save regression report
   */
  async saveReport(report: RegressionReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = join(this.reportsPath, `report-${timestamp}.json`);
    await writeFile(filePath, JSON.stringify(report, null, 2));
  }

  /**
   * Generate default regression test cases
   */
  async createDefaultTestCases(): Promise<void> {
    const defaultTestCases: Omit<RegressionTestCase, 'createdAt' | 'lastUpdated' | 'version'>[] = [
      {
        id: 'react-typescript-basic',
        name: 'React TypeScript Basic Detection',
        description: 'Basic React application with TypeScript',
        projectInfo: {
          languages: ['JavaScript', 'TypeScript'],
          configFiles: [
            { name: 'package.json', path: '/package.json', type: 'npm' },
            { name: 'tsconfig.json', path: '/tsconfig.json', type: 'typescript' }
          ],
          dependencies: [
            { name: 'package.json', path: '/package.json', type: 'npm' }
          ],
          metadata: {
            name: 'react-typescript-app',
            description: 'React TypeScript application',
            version: '1.0.0'
          }
        },
        expectedResults: {
          frameworks: [
            { name: 'React', ecosystem: 'nodejs', type: 'frontend_framework', minConfidence: 0.8, required: true },
            { name: 'TypeScript', ecosystem: 'nodejs', minConfidence: 0.7, required: true }
          ],
          buildTools: [
            { name: 'npm', minConfidence: 0.9, required: true }
          ],
          containers: [],
          minOverallConfidence: 0.7,
          maxWarnings: 2,
          tags: ['react', 'typescript', 'frontend']
        }
      },

      {
        id: 'django-python-api',
        name: 'Django Python API Detection',
        description: 'Django REST API with Python',
        projectInfo: {
          languages: ['Python'],
          configFiles: [
            { name: 'requirements.txt', path: '/requirements.txt', type: 'pip' }
          ],
          dependencies: [
            { name: 'requirements.txt', path: '/requirements.txt', type: 'pip' }
          ],
          metadata: {
            name: 'django-api',
            description: 'Django REST API',
            version: '1.0.0'
          }
        },
        expectedResults: {
          frameworks: [
            { name: 'Django', ecosystem: 'python', type: 'web_framework', minConfidence: 0.8, required: true }
          ],
          buildTools: [
            { name: 'pip', minConfidence: 0.9, required: true }
          ],
          containers: [],
          minOverallConfidence: 0.7,
          maxWarnings: 1,
          tags: ['django', 'python', 'api']
        }
      },

      {
        id: 'go-gin-microservice',
        name: 'Go Gin Microservice Detection',
        description: 'Go microservice with Gin framework',
        projectInfo: {
          languages: ['Go'],
          configFiles: [
            { name: 'go.mod', path: '/go.mod', type: 'go' }
          ],
          dependencies: [
            { name: 'go.mod', path: '/go.mod', type: 'go' }
          ],
          metadata: {
            name: 'go-gin-service',
            description: 'Go Gin microservice',
            version: '1.0.0'
          }
        },
        expectedResults: {
          frameworks: [
            { name: 'Gin', ecosystem: 'go', type: 'web_framework', minConfidence: 0.7, required: true }
          ],
          buildTools: [
            { name: 'go', minConfidence: 0.9, required: true }
          ],
          containers: [],
          minOverallConfidence: 0.7,
          maxWarnings: 1,
          tags: ['go', 'gin', 'microservice']
        }
      }
    ];

    for (const testCase of defaultTestCases) {
      await this.createTestCase(testCase);
    }
  }
}