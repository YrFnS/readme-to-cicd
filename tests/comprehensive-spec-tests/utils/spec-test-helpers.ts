/**
 * Spec Test Helpers
 * Utilities for comprehensive spec-based testing
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface SpecRequirement {
  id: string;
  title: string;
  userStory: string;
  acceptanceCriteria: AcceptanceCriteria[];
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
  type: 'WHEN_THEN' | 'IF_THEN' | 'GIVEN_WHEN_THEN';
  condition: string;
  expectedResult: string;
  priority: 'MUST' | 'SHOULD' | 'MAY';
}

export interface TestResult {
  requirementId: string;
  criteriaId: string;
  passed: boolean;
  actualResult?: any;
  expectedResult?: any;
  error?: Error;
  executionTime?: number;
}

/**
 * Load spec requirements from markdown files
 */
export function loadSpecRequirements(specPath: string): SpecRequirement[] {
  try {
    const requirementsPath = join(specPath, 'requirements.md');
    const content = readFileSync(requirementsPath, 'utf-8');
    return parseRequirementsFromMarkdown(content);
  } catch (error) {
    throw new Error(`Failed to load spec requirements from ${specPath}: ${error.message}`);
  }
}

/**
 * Parse requirements from markdown content
 */
function parseRequirementsFromMarkdown(content: string): SpecRequirement[] {
  const requirements: SpecRequirement[] = [];
  const lines = content.split('\n');
  
  let currentRequirement: Partial<SpecRequirement> | null = null;
  let currentCriteria: AcceptanceCriteria[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse requirement headers
    if (line.startsWith('### Requirement ')) {
      // Save previous requirement
      if (currentRequirement) {
        requirements.push({
          ...currentRequirement,
          acceptanceCriteria: currentCriteria
        } as SpecRequirement);
      }
      
      // Start new requirement
      const reqMatch = line.match(/### Requirement (\d+)/);
      if (reqMatch) {
        currentRequirement = {
          id: `req-${reqMatch[1]}`,
          title: line.replace('### Requirement ', '').trim()
        };
        currentCriteria = [];
      }
    }
    
    // Parse user stories
    if (line.startsWith('**User Story:**')) {
      if (currentRequirement) {
        currentRequirement.userStory = line.replace('**User Story:**', '').trim();
      }
    }
    
    // Parse acceptance criteria
    if (line.match(/^\d+\.\s+(WHEN|IF|GIVEN)/)) {
      const criteriaMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (criteriaMatch && currentRequirement) {
        const criteriaText = criteriaMatch[2];
        const criteria = parseAcceptanceCriteria(criteriaMatch[1], criteriaText);
        if (criteria) {
          currentCriteria.push(criteria);
        }
      }
    }
  }
  
  // Save last requirement
  if (currentRequirement) {
    requirements.push({
      ...currentRequirement,
      acceptanceCriteria: currentCriteria
    } as SpecRequirement);
  }
  
  return requirements;
}

/**
 * Parse individual acceptance criteria
 */
function parseAcceptanceCriteria(id: string, text: string): AcceptanceCriteria | null {
  // WHEN ... THEN ... pattern
  const whenThenMatch = text.match(/WHEN\s+(.+?)\s+THEN\s+(.+)/i);
  if (whenThenMatch) {
    return {
      id: `ac-${id}`,
      description: text,
      type: 'WHEN_THEN',
      condition: whenThenMatch[1].trim(),
      expectedResult: whenThenMatch[2].trim(),
      priority: text.includes('SHALL') ? 'MUST' : text.includes('SHOULD') ? 'SHOULD' : 'MAY'
    };
  }
  
  // IF ... THEN ... pattern
  const ifThenMatch = text.match(/IF\s+(.+?)\s+THEN\s+(.+)/i);
  if (ifThenMatch) {
    return {
      id: `ac-${id}`,
      description: text,
      type: 'IF_THEN',
      condition: ifThenMatch[1].trim(),
      expectedResult: ifThenMatch[2].trim(),
      priority: text.includes('SHALL') ? 'MUST' : text.includes('SHOULD') ? 'SHOULD' : 'MAY'
    };
  }
  
  // GIVEN ... WHEN ... THEN ... pattern
  const givenWhenThenMatch = text.match(/GIVEN\s+(.+?)\s+WHEN\s+(.+?)\s+THEN\s+(.+)/i);
  if (givenWhenThenMatch) {
    return {
      id: `ac-${id}`,
      description: text,
      type: 'GIVEN_WHEN_THEN',
      condition: `${givenWhenThenMatch[1].trim()} AND ${givenWhenThenMatch[2].trim()}`,
      expectedResult: givenWhenThenMatch[3].trim(),
      priority: text.includes('SHALL') ? 'MUST' : text.includes('SHOULD') ? 'SHOULD' : 'MAY'
    };
  }
  
  return null;
}

/**
 * Create test suite for a spec requirement
 */
export function createSpecTestSuite(
  requirement: SpecRequirement,
  testImplementations: Record<string, () => Promise<TestResult>>
) {
  return describe(`Requirement ${requirement.id}: ${requirement.title}`, () => {
    describe(`User Story: ${requirement.userStory}`, () => {
      requirement.acceptanceCriteria.forEach(criteria => {
        const testName = `${criteria.id}: ${criteria.description}`;
        const testImpl = testImplementations[criteria.id];
        
        if (testImpl) {
          it(testName, async () => {
            const result = await testImpl();
            expect(result.passed).toBe(true);
            if (!result.passed && result.error) {
              throw result.error;
            }
          });
        } else {
          it.skip(`${testName} - NOT IMPLEMENTED`, () => {
            // Test implementation missing
          });
        }
      });
    });
  });
}

/**
 * Validate test result against acceptance criteria
 */
export function validateTestResult(
  result: any,
  criteria: AcceptanceCriteria
): TestResult {
  const startTime = Date.now();
  
  try {
    // This is a generic validator - specific implementations should override
    const passed = result !== null && result !== undefined;
    
    return {
      requirementId: criteria.id.split('-')[0],
      criteriaId: criteria.id,
      passed,
      actualResult: result,
      expectedResult: criteria.expectedResult,
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      requirementId: criteria.id.split('-')[0],
      criteriaId: criteria.id,
      passed: false,
      error: error as Error,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Generate test report for spec coverage
 */
export function generateSpecTestReport(results: TestResult[]): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  requirementCoverage: Record<string, { total: number; passed: number }>;
} {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  
  const requirementCoverage: Record<string, { total: number; passed: number }> = {};
  
  results.forEach(result => {
    if (!requirementCoverage[result.requirementId]) {
      requirementCoverage[result.requirementId] = { total: 0, passed: 0 };
    }
    requirementCoverage[result.requirementId].total++;
    if (result.passed) {
      requirementCoverage[result.requirementId].passed++;
    }
  });
  
  return {
    totalTests,
    passedTests,
    failedTests,
    successRate,
    requirementCoverage
  };
}

/**
 * Load sample README files for testing
 */
export function loadSampleReadme(filename: string): string {
  const readmePath = join(__dirname, '../fixtures/sample-readmes', filename);
  return readFileSync(readmePath, 'utf-8');
}

/**
 * Load expected YAML output for testing
 */
export function loadExpectedYaml(filename: string): string {
  const yamlPath = join(__dirname, '../fixtures/expected-outputs', filename);
  return readFileSync(yamlPath, 'utf-8');
}

/**
 * Performance test helper
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  maxTimeMs: number = 2000
): Promise<{ result: T; executionTime: number; withinLimit: boolean }> {
  const startTime = Date.now();
  const result = await operation();
  const executionTime = Date.now() - startTime;
  const withinLimit = executionTime <= maxTimeMs;
  
  return { result, executionTime, withinLimit };
}

/**
 * Memory usage test helper
 */
export function measureMemoryUsage<T>(operation: () => T): {
  result: T;
  memoryUsed: number;
  memoryPeak: number;
} {
  const initialMemory = process.memoryUsage();
  const result = operation();
  const finalMemory = process.memoryUsage();
  
  return {
    result,
    memoryUsed: finalMemory.heapUsed - initialMemory.heapUsed,
    memoryPeak: finalMemory.heapUsed
  };
}