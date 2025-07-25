/**
 * Test utilities for README parser validation and comparison
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { ProjectInfo, ParseResult, LanguageInfo, CommandInfo, DependencyInfo } from '../../src/parser/types';

export interface TestCase {
  name: string;
  file: string;
  expected: Partial<ProjectInfo>;
  description?: string;
}

export interface PerformanceMetrics {
  parseTime: number;
  memoryUsage: number;
  fileSize: number;
  linesCount: number;
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

/**
 * Load README file from fixtures directory
 */
export async function loadFixture(category: string, filename: string): Promise<string> {
  const filePath = join(__dirname, '..', 'fixtures', category, filename);
  return await readFile(filePath, 'utf-8');
}

/**
 * Load all fixture files from a category
 */
export async function loadFixtureCategory(category: string): Promise<Map<string, string>> {
  const { readdir } = await import('fs/promises');
  const categoryPath = join(__dirname, '..', 'fixtures', category);
  
  try {
    const files = await readdir(categoryPath);
    const fixtures = new Map<string, string>();
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await loadFixture(category, file);
        fixtures.set(file, content);
      }
    }
    
    return fixtures;
  } catch (error) {
    console.warn(`Could not load fixtures from ${category}:`, error);
    return new Map();
  }
}

/**
 * Validate parse result against expected values
 */
export function validateParseResult(
  result: ParseResult,
  expected: Partial<ProjectInfo>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 0;
  let totalChecks = 0;

  if (!result.success) {
    errors.push('Parse failed');
    return { passed: false, errors, warnings, score: 0 };
  }

  if (!result.data) {
    errors.push('No data in parse result');
    return { passed: false, errors, warnings, score: 0 };
  }

  const data = result.data;

  // Validate languages
  if (expected.languages) {
    totalChecks++;
    const expectedLangs = expected.languages.map(l => l.name.toLowerCase());
    const actualLangs = data.languages.map(l => l.name.toLowerCase());
    
    const missingLangs = expectedLangs.filter(lang => !actualLangs.includes(lang));
    const extraLangs = actualLangs.filter(lang => !expectedLangs.includes(lang));
    
    if (missingLangs.length === 0 && extraLangs.length === 0) {
      score++;
    } else {
      if (missingLangs.length > 0) {
        errors.push(`Missing languages: ${missingLangs.join(', ')}`);
      }
      if (extraLangs.length > 0) {
        warnings.push(`Extra languages detected: ${extraLangs.join(', ')}`);
      }
    }
  }

  // Validate commands
  if (expected.commands) {
    totalChecks++;
    const expectedCommands = expected.commands;
    const actualCommands = data.commands;
    
    let commandScore = 0;
    let commandChecks = 0;
    
    if (expectedCommands.build && expectedCommands.build.length > 0) {
      commandChecks++;
      if (actualCommands.build.length >= expectedCommands.build.length) {
        commandScore++;
      } else {
        warnings.push(`Expected ${expectedCommands.build.length} build commands, got ${actualCommands.build.length}`);
      }
    }
    
    if (expectedCommands.test && expectedCommands.test.length > 0) {
      commandChecks++;
      if (actualCommands.test.length >= expectedCommands.test.length) {
        commandScore++;
      } else {
        warnings.push(`Expected ${expectedCommands.test.length} test commands, got ${actualCommands.test.length}`);
      }
    }
    
    if (commandChecks > 0) {
      score += commandScore / commandChecks;
    } else {
      score++;
    }
  }

  // Validate dependencies
  if (expected.dependencies) {
    totalChecks++;
    const expectedDeps = expected.dependencies;
    const actualDeps = data.dependencies;
    
    if (expectedDeps.packageFiles && expectedDeps.packageFiles.length > 0) {
      const expectedFiles = expectedDeps.packageFiles.map(f => f.name);
      const actualFiles = actualDeps.packageFiles.map(f => f.name);
      const missingFiles = expectedFiles.filter(f => !actualFiles.includes(f));
      
      if (missingFiles.length === 0) {
        score++;
      } else {
        warnings.push(`Missing package files: ${missingFiles.join(', ')}`);
      }
    } else {
      score++;
    }
  }

  // Validate metadata
  if (expected.metadata) {
    totalChecks++;
    const expectedMeta = expected.metadata;
    const actualMeta = data.metadata;
    
    let metaScore = 0;
    let metaChecks = 0;
    
    if (expectedMeta.name) {
      metaChecks++;
      if (actualMeta.name && actualMeta.name.toLowerCase().includes(expectedMeta.name.toLowerCase())) {
        metaScore++;
      } else {
        warnings.push(`Expected project name to contain "${expectedMeta.name}", got "${actualMeta.name}"`);
      }
    }
    
    if (expectedMeta.description) {
      metaChecks++;
      if (actualMeta.description && actualMeta.description.length > 0) {
        metaScore++;
      } else {
        warnings.push('Expected project description');
      }
    }
    
    if (metaChecks > 0) {
      score += metaScore / metaChecks;
    } else {
      score++;
    }
  }

  const finalScore = totalChecks > 0 ? score / totalChecks : 1;
  const passed = errors.length === 0 && finalScore >= 0.7;

  return {
    passed,
    errors,
    warnings,
    score: finalScore
  };
}

/**
 * Compare two parse results for similarity
 */
export function compareParseResults(result1: ParseResult, result2: ParseResult): number {
  if (!result1.success || !result2.success || !result1.data || !result2.data) {
    return 0;
  }

  const data1 = result1.data;
  const data2 = result2.data;
  
  let similarity = 0;
  let comparisons = 0;

  // Compare languages
  const langs1 = new Set(data1.languages.map(l => l.name.toLowerCase()));
  const langs2 = new Set(data2.languages.map(l => l.name.toLowerCase()));
  const langIntersection = new Set([...langs1].filter(x => langs2.has(x)));
  const langUnion = new Set([...langs1, ...langs2]);
  
  if (langUnion.size > 0) {
    similarity += langIntersection.size / langUnion.size;
    comparisons++;
  }

  // Compare commands
  const commands1 = [...data1.commands.build, ...data1.commands.test, ...data1.commands.run];
  const commands2 = [...data2.commands.build, ...data2.commands.test, ...data2.commands.run];
  
  if (commands1.length > 0 || commands2.length > 0) {
    const cmdSimilarity = calculateCommandSimilarity(commands1, commands2);
    similarity += cmdSimilarity;
    comparisons++;
  }

  // Compare package files
  const files1 = new Set(data1.dependencies.packageFiles.map(f => f.name));
  const files2 = new Set(data2.dependencies.packageFiles.map(f => f.name));
  const fileIntersection = new Set([...files1].filter(x => files2.has(x)));
  const fileUnion = new Set([...files1, ...files2]);
  
  if (fileUnion.size > 0) {
    similarity += fileIntersection.size / fileUnion.size;
    comparisons++;
  }

  return comparisons > 0 ? similarity / comparisons : 0;
}

/**
 * Calculate similarity between command arrays
 */
function calculateCommandSimilarity(commands1: any[], commands2: any[]): number {
  if (commands1.length === 0 && commands2.length === 0) return 1;
  if (commands1.length === 0 || commands2.length === 0) return 0;

  const cmds1 = new Set(commands1.map(c => c.command || c));
  const cmds2 = new Set(commands2.map(c => c.command || c));
  
  const intersection = new Set([...cmds1].filter(x => cmds2.has(x)));
  const union = new Set([...cmds1, ...cmds2]);
  
  return intersection.size / union.size;
}

/**
 * Measure parsing performance
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  iterations: number = 1
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = process.hrtime.bigint();
  
  let result: T;
  for (let i = 0; i < iterations; i++) {
    result = await operation();
  }
  
  const endTime = process.hrtime.bigint();
  const endMemory = process.memoryUsage().heapUsed;
  
  const parseTime = Number(endTime - startTime) / 1_000_000 / iterations; // Convert to ms
  const memoryUsage = Math.max(0, endMemory - startMemory);
  
  return {
    result: result!,
    metrics: {
      parseTime,
      memoryUsage,
      fileSize: 0, // To be set by caller
      linesCount: 0 // To be set by caller
    }
  };
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  testName: string,
  metrics: PerformanceMetrics,
  baseline?: PerformanceMetrics
): string {
  let report = `\n📊 Performance Report: ${testName}\n`;
  report += `${'='.repeat(50)}\n`;
  report += `⏱️  Parse Time: ${metrics.parseTime.toFixed(2)}ms\n`;
  report += `💾 Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
  report += `📄 File Size: ${(metrics.fileSize / 1024).toFixed(2)}KB\n`;
  report += `📝 Lines: ${metrics.linesCount}\n`;
  
  if (metrics.fileSize > 0) {
    const throughput = metrics.fileSize / 1024 / (metrics.parseTime / 1000);
    report += `🚀 Throughput: ${throughput.toFixed(2)}KB/s\n`;
  }
  
  if (baseline) {
    const timeRatio = metrics.parseTime / baseline.parseTime;
    const memoryRatio = metrics.memoryUsage / baseline.memoryUsage;
    
    report += `\n📈 Compared to baseline:\n`;
    report += `⏱️  Time: ${timeRatio > 1 ? '+' : ''}${((timeRatio - 1) * 100).toFixed(1)}%\n`;
    report += `💾 Memory: ${memoryRatio > 1 ? '+' : ''}${((memoryRatio - 1) * 100).toFixed(1)}%\n`;
  }
  
  return report;
}

/**
 * Create test case from README content and expected results
 */
export function createTestCase(
  name: string,
  content: string,
  expected: Partial<ProjectInfo>,
  description?: string
): TestCase & { content: string } {
  return {
    name,
    file: '', // Not used when content is provided directly
    content,
    expected,
    description
  };
}

/**
 * Batch validate multiple test cases
 */
export async function batchValidate(
  testCases: (TestCase & { content: string })[],
  parser: (content: string) => Promise<ParseResult>
): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>();
  
  for (const testCase of testCases) {
    try {
      const parseResult = await parser(testCase.content);
      const validation = validateParseResult(parseResult, testCase.expected);
      results.set(testCase.name, validation);
    } catch (error) {
      results.set(testCase.name, {
        passed: false,
        errors: [`Parse error: ${error}`],
        warnings: [],
        score: 0
      });
    }
  }
  
  return results;
}

/**
 * Generate test summary report
 */
export function generateTestSummary(results: Map<string, ValidationResult>): string {
  const total = results.size;
  const passed = Array.from(results.values()).filter(r => r.passed).length;
  const failed = total - passed;
  
  const avgScore = Array.from(results.values())
    .reduce((sum, r) => sum + r.score, 0) / total;
  
  let report = `\n📋 Test Summary\n`;
  report += `${'='.repeat(30)}\n`;
  report += `✅ Passed: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)\n`;
  report += `❌ Failed: ${failed}/${total} (${((failed / total) * 100).toFixed(1)}%)\n`;
  report += `📊 Average Score: ${(avgScore * 100).toFixed(1)}%\n\n`;
  
  // Show failed tests
  if (failed > 0) {
    report += `❌ Failed Tests:\n`;
    for (const [name, result] of results) {
      if (!result.passed) {
        report += `  • ${name}: ${result.errors.join(', ')}\n`;
      }
    }
    report += '\n';
  }
  
  // Show warnings
  const warnings = Array.from(results.values())
    .flatMap(r => r.warnings)
    .filter(w => w.length > 0);
    
  if (warnings.length > 0) {
    report += `⚠️  Warnings:\n`;
    warnings.slice(0, 10).forEach(warning => {
      report += `  • ${warning}\n`;
    });
    if (warnings.length > 10) {
      report += `  ... and ${warnings.length - 10} more\n`;
    }
  }
  
  return report;
}