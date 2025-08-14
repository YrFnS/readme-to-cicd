/**
 * Test utilities specifically for YAML Generator validation and testing
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { YAMLGeneratorImpl } from '../../src/generator/yaml-generator';
import { DetectionResult } from '../../src/generator/interfaces';
import * as yaml from 'js-yaml';

export interface WorkflowTestCase {
  name: string;
  detectionResult: DetectionResult;
  expectedWorkflowFeatures: ExpectedWorkflowFeatures;
  minValidationScore: number;
  description?: string;
}

export interface ExpectedWorkflowFeatures {
  nodeSetup?: boolean;
  pythonSetup?: boolean;
  goSetup?: boolean;
  rustSetup?: boolean;
  javaSetup?: boolean;
  typescriptSupport?: boolean;
  djangoSupport?: boolean;
  ginSupport?: boolean;
  springBootSupport?: boolean;
  cargoSupport?: boolean;
  buildSteps: string[];
  testSteps: string[];
  cacheStrategies: string[];
  securityScans: string[];
  deploymentSteps: string[];
}

export interface WorkflowValidationResult {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  workflowFeatures: WorkflowFeatures;
  performanceMetrics: WorkflowPerformanceMetrics;
}

export interface WorkflowFeatures {
  nodeSetup: boolean;
  pythonSetup: boolean;
  goSetup: boolean;
  rustSetup: boolean;
  javaSetup: boolean;
  typescriptSupport: boolean;
  djangoSupport: boolean;
  ginSupport: boolean;
  springBootSupport: boolean;
  cargoSupport: boolean;
  buildSteps: string[];
  testSteps: string[];
  cacheStrategies: string[];
  securityScans: string[];
  deploymentSteps: string[];
}

export interface WorkflowPerformanceMetrics {
  generationTime: number;
  memoryUsage: number;
  workflowSize: number;
  yamlComplexity: number;
  validationTime: number;
}

export interface RealWorldWorkflowProject {
  name: string;
  description: string;
  path: string;
  detectionResult: DetectionResult;
  expectedWorkflows: string[];
  complexity: 'simple' | 'medium' | 'complex';
}

export interface GitHubActionsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  actionVersions: string[];
  securityScore: number;
}

/**
 * Create a YAML generator instance for testing
 */
export function createTestYAMLGenerator(): YAMLGeneratorImpl {
  return new YAMLGeneratorImpl({
    baseTemplatesPath: join(__dirname, '../../templates'),
    cacheEnabled: true,
    agentHooksConfig: {
      enabled: true,
      webhookUrl: 'https://test-webhook.example.com',
      automationLevel: 'standard'
    },
    advancedPatternsEnabled: true
  });
}

/**
 * Validate workflow generation results against expected outcomes
 */
export async function validateWorkflowGeneration(
  generator: YAMLGeneratorImpl,
  testCase: WorkflowTestCase
): Promise<WorkflowValidationResult> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    // Generate workflow
    const workflow = await generator.generateWorkflow(testCase.detectionResult);
    
    const generationEndTime = Date.now();
    
    // Validate workflow
    const validationResult = generator.validateWorkflow(workflow.content);
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    // Extract workflow features
    const workflowFeatures = extractWorkflowFeatures(workflow.content);

    // Validate against expected features
    const featureValidation = validateExpectedFeatures(workflowFeatures, testCase.expectedWorkflowFeatures);

    // Calculate performance metrics
    const performanceMetrics: WorkflowPerformanceMetrics = {
      generationTime: generationEndTime - startTime,
      memoryUsage: Math.max(0, endMemory - startMemory),
      workflowSize: workflow.content.length,
      yamlComplexity: calculateYAMLComplexity(workflow.content),
      validationTime: endTime - generationEndTime
    };

    // Collect errors and warnings
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!validationResult.isValid) {
      errors.push(...validationResult.errors.map(e => e.message));
    }
    
    warnings.push(...validationResult.warnings.map(w => w.message));
    warnings.push(...workflow.metadata.warnings);

    // Add feature validation errors
    featureValidation.missingFeatures.forEach(feature => {
      errors.push(`Missing expected feature: ${feature}`);
    });

    featureValidation.unexpectedFeatures.forEach(feature => {
      warnings.push(`Unexpected feature found: ${feature}`);
    });

    // Calculate overall score
    const validationScore = validationResult.isValid ? 1 : 0;
    const featureScore = featureValidation.score;
    const performanceScore = calculatePerformanceScore(performanceMetrics);
    
    const overallScore = (validationScore * 0.4 + featureScore * 0.4 + performanceScore * 0.2);

    return {
      passed: errors.length === 0 && overallScore >= testCase.minValidationScore,
      score: overallScore,
      errors,
      warnings,
      workflowFeatures,
      performanceMetrics
    };

  } catch (error) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      passed: false,
      score: 0,
      errors: [`Workflow generation failed: ${error}`],
      warnings: [],
      workflowFeatures: createEmptyWorkflowFeatures(),
      performanceMetrics: {
        generationTime: endTime - startTime,
        memoryUsage: Math.max(0, endMemory - startMemory),
        workflowSize: 0,
        yamlComplexity: 0,
        validationTime: 0
      }
    };
  }
}

/**
 * Extract workflow features from generated YAML content
 */
function extractWorkflowFeatures(yamlContent: string): WorkflowFeatures {
  const content = yamlContent.toLowerCase();
  
  return {
    nodeSetup: content.includes('setup-node') || content.includes('actions/setup-node'),
    pythonSetup: content.includes('setup-python') || content.includes('actions/setup-python'),
    goSetup: content.includes('setup-go') || content.includes('actions/setup-go'),
    rustSetup: content.includes('rust-toolchain') || content.includes('dtolnay/rust-toolchain'),
    javaSetup: content.includes('setup-java') || content.includes('actions/setup-java'),
    typescriptSupport: content.includes('typescript') || content.includes('tsc') || content.includes('type-check'),
    djangoSupport: content.includes('django') || content.includes('manage.py'),
    ginSupport: content.includes('gin') || content.includes('go run'),
    springBootSupport: content.includes('spring') || content.includes('mvnw') || content.includes('gradlew'),
    cargoSupport: content.includes('cargo'),
    buildSteps: extractSteps(content, ['build', 'compile', 'package']),
    testSteps: extractSteps(content, ['test', 'spec', 'jest', 'pytest', 'go test']),
    cacheStrategies: extractCacheStrategies(content),
    securityScans: extractSecurityScans(content),
    deploymentSteps: extractSteps(content, ['deploy', 'publish', 'release', 'docker'])
  };
}

/**
 * Extract steps that match certain patterns
 */
function extractSteps(content: string, patterns: string[]): string[] {
  const steps: string[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    for (const pattern of patterns) {
      if (line.includes(pattern) && (line.includes('run:') || line.includes('name:'))) {
        const step = line.trim();
        if (step && !steps.includes(step)) {
          steps.push(step);
        }
      }
    }
  }
  
  return steps;
}

/**
 * Extract cache strategies from workflow content
 */
function extractCacheStrategies(content: string): string[] {
  const strategies: string[] = [];
  
  if (content.includes('cache: npm') || content.includes('cache: \'npm\'')) strategies.push('npm');
  if (content.includes('cache: yarn') || content.includes('cache: \'yarn\'')) strategies.push('yarn');
  if (content.includes('cache: pnpm') || content.includes('cache: \'pnpm\'')) strategies.push('pnpm');
  if (content.includes('cache: pip') || content.includes('~/.cache/pip')) strategies.push('pip');
  if (content.includes('cache: poetry') || content.includes('~/.cache/poetry')) strategies.push('poetry');
  if (content.includes('cache: cargo') || content.includes('~/.cargo')) strategies.push('cargo');
  if (content.includes('cache: go') || content.includes('~/go/pkg/mod')) strategies.push('go-modules');
  if (content.includes('cache: maven') || content.includes('~/.m2')) strategies.push('maven');
  if (content.includes('cache: gradle') || content.includes('~/.gradle')) strategies.push('gradle');
  
  return strategies;
}

/**
 * Extract security scans from workflow content
 */
function extractSecurityScans(content: string): string[] {
  const scans: string[] = [];
  
  if (content.includes('npm audit') || content.includes('audit-ci')) scans.push('npm-audit');
  if (content.includes('safety') || content.includes('pip-audit')) scans.push('safety');
  if (content.includes('bandit')) scans.push('bandit');
  if (content.includes('gosec')) scans.push('gosec');
  if (content.includes('cargo audit') || content.includes('cargo-audit')) scans.push('cargo-audit');
  if (content.includes('snyk')) scans.push('snyk');
  if (content.includes('codeql') || content.includes('github/codeql')) scans.push('codeql');
  if (content.includes('dependency-check') || content.includes('owasp')) scans.push('dependency-check');
  if (content.includes('trivy')) scans.push('trivy');
  if (content.includes('semgrep')) scans.push('semgrep');
  
  return scans;
}

/**
 * Validate expected features against actual features
 */
function validateExpectedFeatures(
  actual: WorkflowFeatures,
  expected: ExpectedWorkflowFeatures
): {
  score: number;
  missingFeatures: string[];
  unexpectedFeatures: string[];
} {
  const missingFeatures: string[] = [];
  const unexpectedFeatures: string[] = [];
  let score = 0;
  let totalChecks = 0;

  // Check boolean features
  const booleanFeatures: (keyof ExpectedWorkflowFeatures)[] = [
    'nodeSetup', 'pythonSetup', 'goSetup', 'rustSetup', 'javaSetup',
    'typescriptSupport', 'djangoSupport', 'ginSupport', 'springBootSupport', 'cargoSupport'
  ];

  for (const feature of booleanFeatures) {
    if (expected[feature] !== undefined) {
      totalChecks++;
      const actualValue = actual[feature as keyof WorkflowFeatures] as boolean;
      if (expected[feature] === actualValue) {
        score++;
      } else if (expected[feature] && !actualValue) {
        missingFeatures.push(feature);
      } else if (!expected[feature] && actualValue) {
        unexpectedFeatures.push(feature);
      }
    }
  }

  // Check array features
  const arrayFeatures: (keyof ExpectedWorkflowFeatures)[] = [
    'buildSteps', 'testSteps', 'cacheStrategies', 'securityScans', 'deploymentSteps'
  ];

  for (const feature of arrayFeatures) {
    if (expected[feature] && Array.isArray(expected[feature])) {
      totalChecks++;
      const expectedItems = expected[feature] as string[];
      const actualItems = actual[feature as keyof WorkflowFeatures] as string[];
      
      const foundItems = expectedItems.filter(item =>
        actualItems.some(actualItem => 
          actualItem.toLowerCase().includes(item.toLowerCase())
        )
      );
      
      const featureScore = foundItems.length / expectedItems.length;
      score += featureScore;
      
      if (featureScore < 1) {
        const missingItems = expectedItems.filter(item =>
          !actualItems.some(actualItem => 
            actualItem.toLowerCase().includes(item.toLowerCase())
          )
        );
        missingFeatures.push(...missingItems.map(item => `${feature}: ${item}`));
      }
    }
  }

  return {
    score: totalChecks > 0 ? score / totalChecks : 1,
    missingFeatures,
    unexpectedFeatures
  };
}

/**
 * Calculate YAML complexity score
 */
function calculateYAMLComplexity(yamlContent: string): number {
  try {
    const parsed = yaml.load(yamlContent) as any;
    
    let complexity = 0;
    
    // Count jobs
    if (parsed.jobs) {
      complexity += Object.keys(parsed.jobs).length * 10;
    }
    
    // Count steps
    if (parsed.jobs) {
      for (const job of Object.values(parsed.jobs) as any[]) {
        if (job.steps) {
          complexity += job.steps.length * 2;
        }
        if (job.strategy?.matrix) {
          complexity += Object.keys(job.strategy.matrix).length * 5;
        }
      }
    }
    
    // Count triggers
    if (parsed.on) {
      if (typeof parsed.on === 'object') {
        complexity += Object.keys(parsed.on).length * 3;
      } else {
        complexity += 3;
      }
    }
    
    return complexity;
  } catch (error) {
    // If YAML parsing fails, use line count as complexity
    return yamlContent.split('\n').length;
  }
}

/**
 * Calculate performance score based on metrics
 */
function calculatePerformanceScore(metrics: WorkflowPerformanceMetrics): number {
  let score = 1;
  
  // Penalize slow generation (over 2 seconds)
  if (metrics.generationTime > 2000) {
    score -= 0.3;
  } else if (metrics.generationTime > 1000) {
    score -= 0.1;
  }
  
  // Penalize high memory usage (over 50MB)
  if (metrics.memoryUsage > 50 * 1024 * 1024) {
    score -= 0.2;
  } else if (metrics.memoryUsage > 20 * 1024 * 1024) {
    score -= 0.1;
  }
  
  // Penalize very large workflows (over 10KB)
  if (metrics.workflowSize > 10000) {
    score -= 0.1;
  }
  
  return Math.max(0, score);
}

/**
 * Create empty workflow features for error cases
 */
function createEmptyWorkflowFeatures(): WorkflowFeatures {
  return {
    nodeSetup: false,
    pythonSetup: false,
    goSetup: false,
    rustSetup: false,
    javaSetup: false,
    typescriptSupport: false,
    djangoSupport: false,
    ginSupport: false,
    springBootSupport: false,
    cargoSupport: false,
    buildSteps: [],
    testSteps: [],
    cacheStrategies: [],
    securityScans: [],
    deploymentSteps: []
  };
}

/**
 * Load real-world detection result from filesystem
 */
export async function loadRealWorldDetectionResult(projectPath: string): Promise<RealWorldWorkflowProject> {
  const projectName = projectPath.split('/').pop() || 'unknown';
  
  // Create a mock detection result based on project name
  // In a real implementation, this would analyze the actual project structure
  const detectionResult = createMockDetectionResult(projectName);
  
  return {
    name: projectName,
    description: `Real-world project: ${projectName}`,
    path: projectPath,
    detectionResult,
    expectedWorkflows: ['ci.yml', 'cd.yml'],
    complexity: determineComplexity(projectName)
  };
}

/**
 * Create mock detection result based on project name
 */
function createMockDetectionResult(projectName: string): DetectionResult {
  const baseResult: DetectionResult = {
    languages: [],
    frameworks: [],
    buildTools: [],
    containers: [],
    deploymentTargets: [],
    confidence: { score: 0.8, factors: [] },
    warnings: []
  };

  if (projectName.includes('react') || projectName.includes('typescript')) {
    baseResult.languages.push(
      { name: 'JavaScript', confidence: 0.9, sources: ['package.json'] },
      { name: 'TypeScript', confidence: 0.8, sources: ['tsconfig.json'] }
    );
    baseResult.frameworks.push(
      { name: 'React', ecosystem: 'nodejs', confidence: 0.8, type: 'frontend_framework' }
    );
    baseResult.buildTools.push(
      { name: 'npm', confidence: 0.9, configFile: 'package.json' },
      { name: 'vite', confidence: 0.8, configFile: 'vite.config.ts' }
    );
    baseResult.deploymentTargets.push('vercel', 'netlify');
  }

  if (projectName.includes('django') || projectName.includes('python')) {
    baseResult.languages.push(
      { name: 'Python', confidence: 0.9, sources: ['requirements.txt'] }
    );
    baseResult.frameworks.push(
      { name: 'Django', ecosystem: 'python', confidence: 0.8, type: 'web_framework' }
    );
    baseResult.buildTools.push(
      { name: 'pip', confidence: 0.9, configFile: 'requirements.txt' }
    );
    baseResult.containers.push(
      { type: 'docker', configFiles: ['Dockerfile'] }
    );
    baseResult.deploymentTargets.push('aws', 'heroku');
  }

  if (projectName.includes('go') || projectName.includes('gin')) {
    baseResult.languages.push(
      { name: 'Go', confidence: 0.9, sources: ['go.mod'] }
    );
    baseResult.frameworks.push(
      { name: 'Gin', ecosystem: 'go', confidence: 0.8, type: 'web_framework' }
    );
    baseResult.buildTools.push(
      { name: 'go', confidence: 0.9, configFile: 'go.mod' }
    );
    baseResult.deploymentTargets.push('docker', 'kubernetes');
  }

  if (projectName.includes('rust') || projectName.includes('cli')) {
    baseResult.languages.push(
      { name: 'Rust', confidence: 0.9, sources: ['Cargo.toml'] }
    );
    baseResult.frameworks.push(
      { name: 'Clap', ecosystem: 'rust', confidence: 0.7, type: 'cli_framework' }
    );
    baseResult.buildTools.push(
      { name: 'cargo', confidence: 0.9, configFile: 'Cargo.toml' }
    );
    baseResult.deploymentTargets.push('github-releases');
  }

  if (projectName.includes('java') || projectName.includes('spring')) {
    baseResult.languages.push(
      { name: 'Java', confidence: 0.9, sources: ['pom.xml'] }
    );
    baseResult.frameworks.push(
      { name: 'Spring Boot', ecosystem: 'java', confidence: 0.8, type: 'web_framework' }
    );
    baseResult.buildTools.push(
      { name: 'maven', confidence: 0.9, configFile: 'pom.xml' }
    );
    baseResult.deploymentTargets.push('aws', 'docker');
  }

  if (projectName.includes('vue')) {
    baseResult.languages.push(
      { name: 'JavaScript', confidence: 0.9, sources: ['package.json'] }
    );
    baseResult.frameworks.push(
      { name: 'Vue', ecosystem: 'nodejs', confidence: 0.8, type: 'frontend_framework' }
    );
    baseResult.buildTools.push(
      { name: 'npm', confidence: 0.9, configFile: 'package.json' },
      { name: 'vite', confidence: 0.8, configFile: 'vite.config.js' }
    );
    baseResult.deploymentTargets.push('netlify', 'vercel');
  }

  if (projectName.includes('express') || projectName.includes('nodejs')) {
    baseResult.languages.push(
      { name: 'JavaScript', confidence: 0.9, sources: ['package.json'] }
    );
    baseResult.frameworks.push(
      { name: 'Express', ecosystem: 'nodejs', confidence: 0.8, type: 'backend_framework' }
    );
    baseResult.buildTools.push(
      { name: 'npm', confidence: 0.9, configFile: 'package.json' }
    );
    baseResult.deploymentTargets.push('heroku', 'aws');
  }

  if (projectName.includes('dotnet')) {
    baseResult.languages.push(
      { name: 'C#', confidence: 0.9, sources: ['*.csproj'] }
    );
    baseResult.frameworks.push(
      { name: 'ASP.NET Core', ecosystem: 'dotnet', confidence: 0.8, type: 'web_framework' }
    );
    baseResult.buildTools.push(
      { name: 'dotnet', confidence: 0.9, configFile: '*.csproj' }
    );
    baseResult.deploymentTargets.push('azure', 'docker');
  }

  if (projectName.includes('flutter')) {
    baseResult.languages.push(
      { name: 'Dart', confidence: 0.9, sources: ['pubspec.yaml'] }
    );
    baseResult.frameworks.push(
      { name: 'Flutter', ecosystem: 'dart', confidence: 0.8, type: 'mobile_framework' }
    );
    baseResult.buildTools.push(
      { name: 'flutter', confidence: 0.9, configFile: 'pubspec.yaml' }
    );
    baseResult.deploymentTargets.push('google-play', 'app-store');
  }

  return baseResult;
}

/**
 * Determine project complexity based on name
 */
function determineComplexity(projectName: string): 'simple' | 'medium' | 'complex' {
  if (projectName.includes('microservice') || projectName.includes('monorepo')) {
    return 'complex';
  }
  if (projectName.includes('api') || projectName.includes('full-stack')) {
    return 'medium';
  }
  return 'simple';
}

/**
 * Generate workflow performance report
 */
export function generateWorkflowPerformanceReport(
  testName: string,
  metrics: WorkflowPerformanceMetrics,
  baseline?: any
): string {
  let report = `\n🔧 Workflow Generation Performance: ${testName}\n`;
  report += `${'='.repeat(60)}\n`;
  report += `⏱️  Generation Time: ${metrics.generationTime}ms\n`;
  report += `💾 Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
  report += `📄 Workflow Size: ${(metrics.workflowSize / 1024).toFixed(2)}KB\n`;
  report += `🔍 YAML Complexity: ${metrics.yamlComplexity}\n`;
  report += `✅ Validation Time: ${metrics.validationTime}ms\n`;
  
  if (baseline) {
    const timeRatio = metrics.generationTime / baseline.generationTime;
    const memoryRatio = metrics.memoryUsage / baseline.memoryUsage;
    
    report += `\n📈 Compared to baseline:\n`;
    report += `⏱️  Time: ${timeRatio > 1 ? '+' : ''}${((timeRatio - 1) * 100).toFixed(1)}%\n`;
    report += `💾 Memory: ${memoryRatio > 1 ? '+' : ''}${((memoryRatio - 1) * 100).toFixed(1)}%\n`;
  }
  
  return report;
}

/**
 * Validate GitHub Actions execution compatibility
 */
export async function validateGitHubActionsExecution(yamlContent: string): Promise<GitHubActionsValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const actionVersions: string[] = [];
  let securityScore = 1.0;

  try {
    // Parse YAML
    const workflow = yaml.load(yamlContent) as any;
    
    if (!workflow) {
      errors.push('Invalid YAML structure');
      return { isValid: false, errors, warnings, actionVersions, securityScore: 0 };
    }

    // Validate required fields
    if (!workflow.name) {
      errors.push('Missing workflow name');
    }
    
    if (!workflow.on) {
      errors.push('Missing workflow triggers');
    }
    
    if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
      errors.push('Missing workflow jobs');
    }

    // Extract and validate actions
    if (workflow.jobs) {
      for (const [jobName, job] of Object.entries(workflow.jobs) as [string, any][]) {
        if (!job.steps || !Array.isArray(job.steps)) {
          warnings.push(`Job ${jobName} has no steps`);
          continue;
        }

        for (const step of job.steps) {
          if (step.uses) {
            actionVersions.push(step.uses);
            
            // Check for pinned versions
            if (!step.uses.includes('@v') && !step.uses.includes('@main') && !step.uses.includes('@master')) {
              warnings.push(`Action ${step.uses} is not pinned to a version`);
              securityScore -= 0.1;
            }
            
            // Check for known secure actions
            if (step.uses.startsWith('actions/')) {
              // Official GitHub actions are generally secure
            } else {
              warnings.push(`Third-party action detected: ${step.uses}`);
              securityScore -= 0.05;
            }
          }
        }
      }
    }

    // Check for security best practices
    if (!workflow.permissions) {
      warnings.push('No explicit permissions set');
      securityScore -= 0.2;
    } else if (workflow.permissions === 'write-all') {
      warnings.push('Overly broad permissions granted');
      securityScore -= 0.3;
    }

    // Check for secrets handling
    const yamlString = yamlContent.toLowerCase();
    if (yamlString.includes('${{ secrets.') && !yamlString.includes('permissions:')) {
      warnings.push('Using secrets without explicit permissions');
      securityScore -= 0.1;
    }

    securityScore = Math.max(0, securityScore);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      actionVersions,
      securityScore
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [`YAML parsing failed: ${error}`],
      warnings: [],
      actionVersions: [],
      securityScore: 0
    };
  }
}

/**
 * Create multi-framework detection result for testing
 */
export function createMultiFrameworkDetectionResult(frameworks: Array<{name: string, frameworks: string[]}>): DetectionResult {
  const languages = frameworks.map(f => ({
    name: f.name,
    confidence: 0.8,
    sources: ['config-file']
  }));

  const detectedFrameworks = frameworks.flatMap(f => 
    f.frameworks.map(framework => ({
      name: framework,
      ecosystem: f.name.toLowerCase() === 'javascript' ? 'nodejs' : f.name.toLowerCase(),
      confidence: 0.7,
      type: 'framework' as const
    }))
  );

  const buildTools = frameworks.map(f => {
    if (f.name === 'JavaScript') return { name: 'npm', confidence: 0.9, configFile: 'package.json' };
    if (f.name === 'Python') return { name: 'pip', confidence: 0.9, configFile: 'requirements.txt' };
    if (f.name === 'Go') return { name: 'go', confidence: 0.9, configFile: 'go.mod' };
    return { name: 'build-tool', confidence: 0.7, configFile: 'config' };
  });

  return {
    languages,
    frameworks: detectedFrameworks,
    buildTools,
    containers: [],
    deploymentTargets: ['docker', 'kubernetes'],
    confidence: { score: 0.7, factors: ['Multi-language project detected'] },
    warnings: [{ message: 'Complex multi-framework project', severity: 'info' }]
  };
}

/**
 * Create monorepo detection result for testing
 */
export function createMonorepoDetectionResult(config: {
  packages: string[];
  languages: string[];
  frameworks: string[];
  buildTools: string[];
}): DetectionResult {
  return {
    languages: config.languages.map(lang => ({
      name: lang,
      confidence: 0.8,
      sources: ['package-config']
    })),
    frameworks: config.frameworks.map(framework => ({
      name: framework,
      ecosystem: 'nodejs',
      confidence: 0.7,
      type: 'framework' as const
    })),
    buildTools: config.buildTools.map(tool => ({
      name: tool,
      confidence: 0.8,
      configFile: `${tool}.json`
    })),
    containers: [{ type: 'docker', configFiles: ['Dockerfile'] }],
    deploymentTargets: ['kubernetes', 'docker'],
    confidence: { score: 0.8, factors: ['Monorepo structure detected', 'Multiple packages found'] },
    warnings: [
      { message: 'Monorepo detected - consider path-based triggers', severity: 'info' },
      { message: 'Multiple build tools may require coordination', severity: 'warning' }
    ]
  };
}

/**
 * Create microservices detection result for testing
 */
export function createMicroservicesDetectionResult(config: {
  services: Array<{name: string, language: string, framework: string}>;
  orchestration: string;
  monitoring: boolean;
}): DetectionResult {
  const languages = [...new Set(config.services.map(s => s.language))].map(lang => ({
    name: lang,
    confidence: 0.8,
    sources: ['service-config']
  }));

  const frameworks = config.services.map(service => ({
    name: service.framework,
    ecosystem: service.language.toLowerCase() === 'javascript' ? 'nodejs' : service.language.toLowerCase(),
    confidence: 0.7,
    type: 'framework' as const
  }));

  return {
    languages,
    frameworks,
    buildTools: [
      { name: 'docker', confidence: 0.9, configFile: 'Dockerfile' },
      { name: 'kubernetes', confidence: 0.8, configFile: 'k8s/deployment.yaml' }
    ],
    containers: [
      { type: 'docker', configFiles: ['Dockerfile'] },
      { type: 'kubernetes', configFiles: ['k8s/'] }
    ],
    deploymentTargets: ['kubernetes', 'docker-swarm'],
    confidence: { score: 0.8, factors: ['Microservices architecture detected', 'Container orchestration found'] },
    warnings: [
      { message: 'Microservices require service coordination', severity: 'info' },
      { message: 'Consider health checks and monitoring', severity: 'warning' }
    ]
  };
}

/**
 * Create canary deployment detection result for testing
 */
export function createCanaryDeploymentDetectionResult(config: {
  application: string;
  language: string;
  framework: string;
  deploymentTarget: string;
  monitoringEnabled: boolean;
}): DetectionResult {
  return {
    languages: [{ name: config.language, confidence: 0.9, sources: ['app-config'] }],
    frameworks: [{
      name: config.framework,
      ecosystem: config.language.toLowerCase() === 'javascript' ? 'nodejs' : config.language.toLowerCase(),
      confidence: 0.8,
      type: 'framework' as const
    }],
    buildTools: [{ name: 'docker', confidence: 0.9, configFile: 'Dockerfile' }],
    containers: [{ type: 'docker', configFiles: ['Dockerfile'] }],
    deploymentTargets: [config.deploymentTarget, 'monitoring'],
    confidence: { score: 0.8, factors: ['Production application detected', 'Monitoring capabilities found'] },
    warnings: [
      { message: 'Canary deployment requires monitoring integration', severity: 'info' },
      { message: 'Consider rollback strategies', severity: 'warning' }
    ]
  };
}