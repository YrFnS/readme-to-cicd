/**
 * Test utilities specifically for framework detection validation
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { FrameworkDetectorImpl } from '../../src/detection/framework-detector';
import { DetectionResult } from '../../src/detection/interfaces/detection-result';
import { FrameworkInfo } from '../../src/detection/interfaces/framework-info';
import { ProjectInfo } from '../../src/detection/interfaces/framework-detector';
import { CIPipeline } from '../../src/detection/interfaces/ci-pipeline';

export interface FrameworkTestCase {
  name: string;
  projectPath: string;
  projectInfo: ProjectInfo;
  expectedFrameworks: ExpectedFramework[];
  expectedBuildTools: ExpectedBuildTool[];
  expectedContainers: ExpectedContainer[];
  minConfidence: number;
  description?: string;
}

export interface ExpectedFramework {
  name: string;
  ecosystem: string;
  type?: string;
  version?: string;
  minConfidence: number;
}

export interface ExpectedBuildTool {
  name: string;
  configFile: string;
  minConfidence: number;
}

export interface ExpectedContainer {
  type: 'docker' | 'kubernetes' | 'helm' | 'compose';
  configFiles: string[];
}

export interface DetectionValidationResult {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  frameworkResults: FrameworkValidationResult[];
  buildToolResults: BuildToolValidationResult[];
  containerResults: ContainerValidationResult[];
  confidenceScore: number;
  performanceMetrics: DetectionPerformanceMetrics;
}

export interface FrameworkValidationResult {
  expected: ExpectedFramework;
  actual?: FrameworkInfo;
  matched: boolean;
  confidenceMet: boolean;
  score: number;
}

export interface BuildToolValidationResult {
  expected: ExpectedBuildTool;
  actual?: any;
  matched: boolean;
  confidenceMet: boolean;
  score: number;
}

export interface ContainerValidationResult {
  expected: ExpectedContainer;
  actual?: any;
  matched: boolean;
  score: number;
}

export interface DetectionPerformanceMetrics {
  detectionTime: number;
  memoryUsage: number;
  frameworkCount: number;
  buildToolCount: number;
  containerCount: number;
}

export interface RealWorldProject {
  name: string;
  description: string;
  path: string;
  structure: ProjectStructure;
  expectedDetection: FrameworkTestCase;
  githubUrl?: string;
  complexity: 'simple' | 'medium' | 'complex';
  languages: string[];
  frameworks: string[];
}

export interface ProjectStructure {
  files: string[];
  directories: string[];
  packageFiles: string[];
  configFiles: string[];
  dockerFiles: string[];
}

/**
 * Create a framework detector instance for testing
 */
export function createTestFrameworkDetector(): FrameworkDetectorImpl {
  return new FrameworkDetectorImpl();
}

/**
 * Validate framework detection results against expected outcomes
 */
export async function validateFrameworkDetection(
  detector: FrameworkDetectorImpl,
  testCase: FrameworkTestCase
): Promise<DetectionValidationResult> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    // Perform framework detection
    const detectionResult = await detector.detectFrameworks(
      testCase.projectInfo,
      testCase.projectPath
    );

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    // Validate frameworks
    const frameworkResults = validateFrameworks(
      detectionResult.frameworks,
      testCase.expectedFrameworks
    );

    // Validate build tools
    const buildToolResults = validateBuildTools(
      detectionResult.buildTools,
      testCase.expectedBuildTools
    );

    // Validate containers
    const containerResults = validateContainers(
      detectionResult.containers,
      testCase.expectedContainers
    );

    // Calculate overall scores
    const frameworkScore = calculateFrameworkScore(frameworkResults);
    const buildToolScore = calculateBuildToolScore(buildToolResults);
    const containerScore = calculateContainerScore(containerResults);
    const overallScore = (frameworkScore + buildToolScore + containerScore) / 3;

    // Check confidence requirements
    const confidenceMet = detectionResult.confidence.score >= testCase.minConfidence;
    const confidenceScore = confidenceMet ? 1 : detectionResult.confidence.score / testCase.minConfidence;

    // Collect errors and warnings
    const errors: string[] = [];
    const warnings: string[] = [];

    frameworkResults.forEach(result => {
      if (!result.matched) {
        errors.push(`Missing framework: ${result.expected.name}`);
      } else if (!result.confidenceMet) {
        warnings.push(`Low confidence for ${result.expected.name}: ${result.actual?.confidence}`);
      }
    });

    buildToolResults.forEach(result => {
      if (!result.matched) {
        errors.push(`Missing build tool: ${result.expected.name}`);
      } else if (!result.confidenceMet) {
        warnings.push(`Low confidence for ${result.expected.name}: ${result.actual?.confidence}`);
      }
    });

    containerResults.forEach(result => {
      if (!result.matched) {
        errors.push(`Missing container: ${result.expected.type}`);
      }
    });

    if (!confidenceMet) {
      warnings.push(`Overall confidence below threshold: ${detectionResult.confidence.score} < ${testCase.minConfidence}`);
    }

    // Add detection warnings
    detectionResult.warnings.forEach(warning => {
      warnings.push(`Detection warning: ${warning.message}`);
    });

    const performanceMetrics: DetectionPerformanceMetrics = {
      detectionTime: endTime - startTime,
      memoryUsage: Math.max(0, endMemory - startMemory),
      frameworkCount: detectionResult.frameworks.length,
      buildToolCount: detectionResult.buildTools.length,
      containerCount: detectionResult.containers.length
    };

    return {
      passed: errors.length === 0 && overallScore >= 0.7,
      score: Math.min(overallScore, confidenceScore),
      errors,
      warnings,
      frameworkResults,
      buildToolResults,
      containerResults,
      confidenceScore,
      performanceMetrics
    };

  } catch (error) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      passed: false,
      score: 0,
      errors: [`Detection failed: ${error}`],
      warnings: [],
      frameworkResults: [],
      buildToolResults: [],
      containerResults: [],
      confidenceScore: 0,
      performanceMetrics: {
        detectionTime: endTime - startTime,
        memoryUsage: Math.max(0, endMemory - startMemory),
        frameworkCount: 0,
        buildToolCount: 0,
        containerCount: 0
      }
    };
  }
}

/**
 * Validate detected frameworks against expected frameworks
 */
function validateFrameworks(
  actualFrameworks: FrameworkInfo[],
  expectedFrameworks: ExpectedFramework[]
): FrameworkValidationResult[] {
  return expectedFrameworks.map(expected => {
    const actual = actualFrameworks.find(f => 
      f.name.toLowerCase() === expected.name.toLowerCase() &&
      f.ecosystem === expected.ecosystem
    );

    const matched = !!actual;
    const confidenceMet = actual ? actual.confidence >= expected.minConfidence : false;
    
    let score = 0;
    if (matched) {
      score += 0.5; // Base score for matching
      if (confidenceMet) score += 0.3; // Confidence bonus
      if (expected.type && actual?.type === expected.type) score += 0.1; // Type bonus
      if (expected.version && actual?.version === expected.version) score += 0.1; // Version bonus
    }

    return {
      expected,
      actual,
      matched,
      confidenceMet,
      score
    };
  });
}

/**
 * Validate detected build tools against expected build tools
 */
function validateBuildTools(
  actualBuildTools: any[],
  expectedBuildTools: ExpectedBuildTool[]
): BuildToolValidationResult[] {
  return expectedBuildTools.map(expected => {
    const actual = actualBuildTools.find(bt => 
      bt.name.toLowerCase() === expected.name.toLowerCase()
    );

    const matched = !!actual;
    const confidenceMet = actual ? actual.confidence >= expected.minConfidence : false;
    
    let score = 0;
    if (matched) {
      score += 0.6; // Base score for matching
      if (confidenceMet) score += 0.4; // Confidence bonus
    }

    return {
      expected,
      actual,
      matched,
      confidenceMet,
      score
    };
  });
}

/**
 * Validate detected containers against expected containers
 */
function validateContainers(
  actualContainers: any[],
  expectedContainers: ExpectedContainer[]
): ContainerValidationResult[] {
  return expectedContainers.map(expected => {
    const actual = actualContainers.find(c => c.type === expected.type);
    const matched = !!actual;
    
    let score = 0;
    if (matched) {
      score += 0.7; // Base score for matching
      
      // Check config files
      if (expected.configFiles.length > 0 && actual?.configFiles) {
        const matchedFiles = expected.configFiles.filter(file =>
          actual.configFiles.some((actualFile: string) => 
            actualFile.includes(file) || file.includes(actualFile)
          )
        );
        score += (matchedFiles.length / expected.configFiles.length) * 0.3;
      } else {
        score += 0.3; // Full bonus if no specific files expected
      }
    }

    return {
      expected,
      actual,
      matched,
      score
    };
  });
}

/**
 * Calculate framework validation score
 */
function calculateFrameworkScore(results: FrameworkValidationResult[]): number {
  if (results.length === 0) return 1;
  return results.reduce((sum, result) => sum + result.score, 0) / results.length;
}

/**
 * Calculate build tool validation score
 */
function calculateBuildToolScore(results: BuildToolValidationResult[]): number {
  if (results.length === 0) return 1;
  return results.reduce((sum, result) => sum + result.score, 0) / results.length;
}

/**
 * Calculate container validation score
 */
function calculateContainerScore(results: ContainerValidationResult[]): number {
  if (results.length === 0) return 1;
  return results.reduce((sum, result) => sum + result.score, 0) / results.length;
}

/**
 * Load real-world project structure from filesystem
 */
export async function loadRealWorldProject(projectPath: string): Promise<RealWorldProject> {
  const projectName = projectPath.split('/').pop() || 'unknown';
  
  // Scan project structure
  const structure = await scanProjectStructure(projectPath);
  
  // Determine complexity based on structure
  const complexity = determineProjectComplexity(structure);
  
  // Extract languages and frameworks from structure
  const languages = extractLanguagesFromStructure(structure);
  const frameworks = extractFrameworksFromStructure(structure);
  
  // Load README if exists
  let description = '';
  const readmePath = join(projectPath, 'README.md');
  try {
    description = await readFile(readmePath, 'utf-8');
  } catch {
    // README not found, use default description
    description = `Real-world project: ${projectName}`;
  }

  return {
    name: projectName,
    description,
    path: projectPath,
    structure,
    expectedDetection: await generateExpectedDetection(projectPath, structure),
    complexity,
    languages,
    frameworks
  };
}

/**
 * Scan project directory structure
 */
async function scanProjectStructure(projectPath: string): Promise<ProjectStructure> {
  const files: string[] = [];
  const directories: string[] = [];
  const packageFiles: string[] = [];
  const configFiles: string[] = [];
  const dockerFiles: string[] = [];

  const packageFileNames = [
    'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml',
    'build.gradle', 'build.gradle.kts', 'Pipfile', 'pyproject.toml', 'setup.py'
  ];

  const configFileNames = [
    'webpack.config.js', 'vite.config.js', 'next.config.js', 'vue.config.js',
    'angular.json', 'tsconfig.json', '.eslintrc.json', 'jest.config.js',
    'tailwind.config.js', 'rollup.config.js', 'parcel.config.js'
  ];

  const dockerFileNames = [
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    'Chart.yaml', 'values.yaml', 'kustomization.yaml'
  ];

  async function scanDirectory(dirPath: string, relativePath: string = ''): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const relativeEntryPath = relativePath ? join(relativePath, entry) : entry;
        
        // Skip node_modules and other common ignore patterns
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') {
          continue;
        }

        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          directories.push(relativeEntryPath);
          await scanDirectory(fullPath, relativeEntryPath);
        } else {
          files.push(relativeEntryPath);
          
          // Categorize files
          if (packageFileNames.includes(entry)) {
            packageFiles.push(relativeEntryPath);
          }
          
          if (configFileNames.includes(entry)) {
            configFiles.push(relativeEntryPath);
          }
          
          if (dockerFileNames.includes(entry) || entry.startsWith('Dockerfile')) {
            dockerFiles.push(relativeEntryPath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors and continue
    }
  }

  await scanDirectory(projectPath);

  return {
    files,
    directories,
    packageFiles,
    configFiles,
    dockerFiles
  };
}

/**
 * Determine project complexity based on structure
 */
function determineProjectComplexity(structure: ProjectStructure): 'simple' | 'medium' | 'complex' {
  const { files, directories, packageFiles } = structure;
  
  // Simple: Few files, single package file
  if (files.length < 20 && directories.length < 5 && packageFiles.length <= 1) {
    return 'simple';
  }
  
  // Complex: Many files, multiple package files, complex directory structure
  if (files.length > 100 || directories.length > 20 || packageFiles.length > 3) {
    return 'complex';
  }
  
  // Medium: Everything else
  return 'medium';
}

/**
 * Extract languages from project structure
 */
function extractLanguagesFromStructure(structure: ProjectStructure): string[] {
  const languages = new Set<string>();
  
  structure.files.forEach(file => {
    const ext = file.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'mjs':
        languages.add('JavaScript');
        break;
      case 'ts':
      case 'tsx':
        languages.add('TypeScript');
        break;
      case 'py':
        languages.add('Python');
        break;
      case 'rs':
        languages.add('Rust');
        break;
      case 'go':
        languages.add('Go');
        break;
      case 'java':
        languages.add('Java');
        break;
      case 'kt':
        languages.add('Kotlin');
        break;
      case 'scala':
        languages.add('Scala');
        break;
      case 'cpp':
      case 'cc':
      case 'cxx':
        languages.add('C++');
        break;
      case 'c':
        languages.add('C');
        break;
      case 'cs':
        languages.add('C#');
        break;
      case 'php':
        languages.add('PHP');
        break;
      case 'rb':
        languages.add('Ruby');
        break;
    }
  });
  
  return Array.from(languages);
}

/**
 * Extract frameworks from project structure
 */
function extractFrameworksFromStructure(structure: ProjectStructure): string[] {
  const frameworks = new Set<string>();
  
  // Check package files for framework indicators
  structure.packageFiles.forEach(file => {
    if (file === 'package.json') {
      frameworks.add('Node.js');
    } else if (file === 'requirements.txt' || file === 'setup.py' || file === 'pyproject.toml') {
      frameworks.add('Python');
    } else if (file === 'Cargo.toml') {
      frameworks.add('Rust');
    } else if (file === 'go.mod') {
      frameworks.add('Go');
    } else if (file === 'pom.xml' || file.includes('build.gradle')) {
      frameworks.add('Java');
    }
  });
  
  // Check config files for specific frameworks
  structure.configFiles.forEach(file => {
    if (file.includes('webpack')) frameworks.add('Webpack');
    if (file.includes('vite')) frameworks.add('Vite');
    if (file.includes('next')) frameworks.add('Next.js');
    if (file.includes('vue')) frameworks.add('Vue.js');
    if (file.includes('angular')) frameworks.add('Angular');
  });
  
  // Check for Docker
  if (structure.dockerFiles.length > 0) {
    frameworks.add('Docker');
  }
  
  return Array.from(frameworks);
}

/**
 * Generate expected detection results for a project
 */
async function generateExpectedDetection(
  projectPath: string,
  structure: ProjectStructure
): Promise<FrameworkTestCase> {
  const projectName = projectPath.split('/').pop() || 'unknown';
  
  // Create basic project info
  const projectInfo: ProjectInfo = {
    name: projectName,
    description: `Real-world project: ${projectName}`,
    languages: extractLanguagesFromStructure(structure),
    dependencies: extractDependenciesFromStructure(structure),
    buildCommands: extractBuildCommandsFromStructure(structure),
    testCommands: extractTestCommandsFromStructure(structure),
    installationSteps: extractInstallationStepsFromStructure(structure),
    usageExamples: extractUsageExamplesFromStructure(structure),
    configFiles: structure.configFiles,
    deploymentInfo: extractDeploymentInfoFromStructure(structure),
    rawContent: `Real-world project: ${projectName}`
  };

  // Generate expected frameworks based on structure analysis
  const expectedFrameworks: ExpectedFramework[] = [];
  const expectedBuildTools: ExpectedBuildTool[] = [];
  const expectedContainers: ExpectedContainer[] = [];

  // Analyze package files for frameworks
  for (const packageFile of structure.packageFiles) {
    if (packageFile === 'package.json') {
      expectedFrameworks.push({
        name: 'Node.js',
        ecosystem: 'nodejs',
        minConfidence: 0.8
      });
      expectedBuildTools.push({
        name: 'npm',
        configFile: packageFile,
        minConfidence: 0.8
      });
    } else if (packageFile === 'Cargo.toml') {
      expectedFrameworks.push({
        name: 'Rust',
        ecosystem: 'rust',
        minConfidence: 0.8
      });
      expectedBuildTools.push({
        name: 'cargo',
        configFile: packageFile,
        minConfidence: 0.8
      });
    } else if (packageFile === 'go.mod') {
      expectedFrameworks.push({
        name: 'Go',
        ecosystem: 'go',
        minConfidence: 0.8
      });
      expectedBuildTools.push({
        name: 'go',
        configFile: packageFile,
        minConfidence: 0.8
      });
    }
  }

  // Analyze Docker files
  if (structure.dockerFiles.length > 0) {
    expectedContainers.push({
      type: 'docker',
      configFiles: structure.dockerFiles
    });
  }

  return {
    name: projectName,
    projectPath,
    projectInfo,
    expectedFrameworks,
    expectedBuildTools,
    expectedContainers,
    minConfidence: 0.6,
    description: `Real-world project test case for ${projectName}`
  };
}

/**
 * Determine config file type
 */
function determineConfigFileType(filename: string): string {
  if (filename.includes('webpack')) return 'webpack';
  if (filename.includes('vite')) return 'vite';
  if (filename.includes('next')) return 'nextjs';
  if (filename.includes('vue')) return 'vue';
  if (filename.includes('angular')) return 'angular';
  if (filename.includes('jest')) return 'jest';
  if (filename.includes('eslint')) return 'eslint';
  if (filename.includes('typescript') || filename === 'tsconfig.json') return 'typescript';
  return 'config';
}

/**
 * Determine package file type
 */
function determinePackageFileType(filename: string): string {
  if (filename === 'package.json') return 'npm';
  if (filename === 'requirements.txt' || filename === 'setup.py' || filename === 'pyproject.toml') return 'pip';
  if (filename === 'Cargo.toml') return 'cargo';
  if (filename === 'go.mod') return 'go';
  if (filename === 'pom.xml') return 'maven';
  if (filename.includes('build.gradle')) return 'gradle';
  return 'package';
}

/**
 * Extract dependencies from project structure
 */
function extractDependenciesFromStructure(structure: ProjectStructure): string[] {
  const dependencies: string[] = [];
  
  // Infer dependencies from package files
  structure.packageFiles.forEach(file => {
    if (file === 'package.json') {
      dependencies.push('react', 'express', 'typescript');
    } else if (file === 'requirements.txt' || file === 'setup.py') {
      dependencies.push('django', 'flask', 'fastapi');
    } else if (file === 'Cargo.toml') {
      dependencies.push('actix-web', 'serde');
    } else if (file === 'go.mod') {
      dependencies.push('gin-gonic', 'gorilla/mux');
    } else if (file === 'pom.xml' || file.includes('build.gradle')) {
      dependencies.push('spring-boot', 'junit');
    }
  });
  
  return dependencies;
}

/**
 * Extract build commands from project structure
 */
function extractBuildCommandsFromStructure(structure: ProjectStructure): string[] {
  const commands: string[] = [];
  
  structure.packageFiles.forEach(file => {
    if (file === 'package.json') {
      commands.push('npm run build', 'npm run compile');
    } else if (file === 'requirements.txt' || file === 'setup.py') {
      commands.push('python setup.py build', 'pip install -e .');
    } else if (file === 'Cargo.toml') {
      commands.push('cargo build', 'cargo build --release');
    } else if (file === 'go.mod') {
      commands.push('go build', 'go build ./...');
    } else if (file === 'pom.xml') {
      commands.push('mvn compile', 'mvn package');
    } else if (file.includes('build.gradle')) {
      commands.push('./gradlew build', './gradlew assemble');
    }
  });
  
  return commands;
}

/**
 * Extract test commands from project structure
 */
function extractTestCommandsFromStructure(structure: ProjectStructure): string[] {
  const commands: string[] = [];
  
  structure.packageFiles.forEach(file => {
    if (file === 'package.json') {
      commands.push('npm test', 'npm run test:coverage');
    } else if (file === 'requirements.txt' || file === 'setup.py') {
      commands.push('pytest', 'python -m unittest');
    } else if (file === 'Cargo.toml') {
      commands.push('cargo test');
    } else if (file === 'go.mod') {
      commands.push('go test ./...');
    } else if (file === 'pom.xml') {
      commands.push('mvn test');
    } else if (file.includes('build.gradle')) {
      commands.push('./gradlew test');
    }
  });
  
  return commands;
}

/**
 * Extract installation steps from project structure
 */
function extractInstallationStepsFromStructure(structure: ProjectStructure): string[] {
  const steps: string[] = [];
  
  structure.packageFiles.forEach(file => {
    if (file === 'package.json') {
      steps.push('npm install');
    } else if (file === 'requirements.txt') {
      steps.push('pip install -r requirements.txt');
    } else if (file === 'setup.py') {
      steps.push('pip install -e .');
    } else if (file === 'Cargo.toml') {
      steps.push('cargo build');
    } else if (file === 'go.mod') {
      steps.push('go mod download');
    } else if (file === 'pom.xml') {
      steps.push('mvn install');
    } else if (file.includes('build.gradle')) {
      steps.push('./gradlew build');
    }
  });
  
  return steps;
}

/**
 * Extract usage examples from project structure
 */
function extractUsageExamplesFromStructure(structure: ProjectStructure): string[] {
  const examples: string[] = [];
  
  structure.packageFiles.forEach(file => {
    if (file === 'package.json') {
      examples.push('npm start', 'npm run dev');
    } else if (file === 'requirements.txt' || file === 'setup.py') {
      examples.push('python manage.py runserver', 'python app.py');
    } else if (file === 'Cargo.toml') {
      examples.push('cargo run');
    } else if (file === 'go.mod') {
      examples.push('go run main.go');
    } else if (file === 'pom.xml') {
      examples.push('mvn spring-boot:run');
    } else if (file.includes('build.gradle')) {
      examples.push('./gradlew bootRun');
    }
  });
  
  return examples;
}

/**
 * Extract deployment info from project structure
 */
function extractDeploymentInfoFromStructure(structure: ProjectStructure): string[] {
  const deploymentInfo: string[] = [];
  
  if (structure.dockerFiles.length > 0) {
    deploymentInfo.push('docker', 'docker-compose');
  }
  
  if (structure.configFiles.some(f => f.includes('k8s') || f.includes('kubernetes'))) {
    deploymentInfo.push('kubernetes');
  }
  
  if (structure.configFiles.some(f => f.includes('helm'))) {
    deploymentInfo.push('helm');
  }
  
  return deploymentInfo;
}

/**
 * Generate performance report for framework detection
 */
export function generateDetectionPerformanceReport(
  testName: string,
  metrics: DetectionPerformanceMetrics,
  baseline?: DetectionPerformanceMetrics
): string {
  let report = `\n🔍 Framework Detection Performance: ${testName}\n`;
  report += `${'='.repeat(60)}\n`;
  report += `⏱️  Detection Time: ${metrics.detectionTime}ms\n`;
  report += `💾 Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
  report += `🏗️  Frameworks Detected: ${metrics.frameworkCount}\n`;
  report += `🔧 Build Tools Detected: ${metrics.buildToolCount}\n`;
  report += `🐳 Containers Detected: ${metrics.containerCount}\n`;
  
  if (baseline) {
    const timeRatio = metrics.detectionTime / baseline.detectionTime;
    const memoryRatio = metrics.memoryUsage / baseline.memoryUsage;
    
    report += `\n📈 Compared to baseline:\n`;
    report += `⏱️  Time: ${timeRatio > 1 ? '+' : ''}${((timeRatio - 1) * 100).toFixed(1)}%\n`;
    report += `💾 Memory: ${memoryRatio > 1 ? '+' : ''}${((memoryRatio - 1) * 100).toFixed(1)}%\n`;
  }
  
  return report;
}

/**
 * Validate CI pipeline generation
 */
export async function validateCIPipelineGeneration(
  detector: FrameworkDetectorImpl,
  detectionResult: DetectionResult
): Promise<{
  passed: boolean;
  pipeline: CIPipeline;
  errors: string[];
  warnings: string[];
  score: number;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  try {
    const pipeline = await detector.suggestCISteps(detectionResult);
    
    // Validate pipeline structure
    if (!pipeline.setup || pipeline.setup.length === 0) {
      errors.push('Missing setup steps');
    } else {
      score += 0.2;
    }
    
    if (!pipeline.build || pipeline.build.length === 0) {
      errors.push('Missing build steps');
    } else {
      score += 0.2;
    }
    
    if (!pipeline.test || pipeline.test.length === 0) {
      warnings.push('No test steps generated');
    } else {
      score += 0.2;
    }
    
    if (!pipeline.security || pipeline.security.length === 0) {
      warnings.push('No security steps generated');
    } else {
      score += 0.2;
    }
    
    if (!pipeline.cache || pipeline.cache.length === 0) {
      warnings.push('No cache strategies generated');
    } else {
      score += 0.2;
    }
    
    return {
      passed: errors.length === 0 && score >= 0.4,
      pipeline,
      errors,
      warnings,
      score
    };
    
  } catch (error) {
    return {
      passed: false,
      pipeline: {} as CIPipeline,
      errors: [`CI pipeline generation failed: ${error}`],
      warnings: [],
      score: 0
    };
  }
}