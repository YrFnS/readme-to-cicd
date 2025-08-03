/**
 * Performance test generator for creating large, complex project scenarios
 * to test framework detection performance and scalability
 */

import { ProjectInfo } from '../../src/detection/interfaces/framework-detector';

export interface PerformanceTestScenario {
  name: string;
  description: string;
  projectInfo: ProjectInfo;
  expectedComplexity: 'low' | 'medium' | 'high' | 'extreme';
  expectedDetectionTime: number; // milliseconds
  expectedMemoryUsage: number; // bytes
}

export interface LargeProjectConfig {
  languageCount: number;
  configFileCount: number;
  dependencyFileCount: number;
  frameworkDiversity: 'low' | 'medium' | 'high';
  structureComplexity: 'flat' | 'nested' | 'deep';
}

/**
 * Generate a large, complex project for performance testing
 */
export function generateLargeProject(config: LargeProjectConfig): PerformanceTestScenario {
  const languages = generateLanguages(config.languageCount, config.frameworkDiversity);
  const configFiles = generateConfigFiles(config.configFileCount, config.structureComplexity);
  const dependencies = generateDependencyFiles(config.dependencyFileCount, languages);
  
  const complexity = determineComplexity(config);
  const expectedTimes = getExpectedPerformance(complexity);

  return {
    name: `Large Project - ${config.languageCount} langs, ${config.configFileCount} configs`,
    description: `Performance test with ${config.languageCount} languages, ${config.configFileCount} config files, ${config.frameworkDiversity} framework diversity`,
    projectInfo: {
      languages,
      configFiles,
      dependencies,
      metadata: {
        name: 'large-performance-test-project',
        description: 'Generated large project for performance testing',
        version: '1.0.0'
      }
    },
    expectedComplexity: complexity,
    expectedDetectionTime: expectedTimes.detectionTime,
    expectedMemoryUsage: expectedTimes.memoryUsage
  };
}

/**
 * Generate realistic language combinations
 */
function generateLanguages(count: number, diversity: 'low' | 'medium' | 'high'): string[] {
  const languageGroups = {
    low: ['JavaScript', 'TypeScript'],
    medium: ['JavaScript', 'TypeScript', 'Python', 'Go'],
    high: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Java', 'Rust', 'C#', 'PHP', 'Ruby', 'Kotlin']
  };

  const availableLanguages = languageGroups[diversity];
  const languages = [];

  // Always include JavaScript for web projects
  languages.push('JavaScript');

  // Add additional languages up to the count
  for (let i = 1; i < count && i < availableLanguages.length; i++) {
    languages.push(availableLanguages[i]);
  }

  // If we need more languages than available in the diversity level, cycle through
  while (languages.length < count) {
    const index = languages.length % availableLanguages.length;
    const lang = availableLanguages[index];
    if (!languages.includes(lang)) {
      languages.push(lang);
    } else {
      // Add variant or break if we can't add more unique languages
      break;
    }
  }

  return languages;
}

/**
 * Generate config files with realistic structure
 */
function generateConfigFiles(count: number, complexity: 'flat' | 'nested' | 'deep'): Array<{
  name: string;
  path: string;
  type: string;
}> {
  const configFiles = [];
  const baseConfigs = [
    { name: 'package.json', type: 'npm' },
    { name: 'tsconfig.json', type: 'typescript' },
    { name: 'webpack.config.js', type: 'webpack' },
    { name: 'vite.config.js', type: 'vite' },
    { name: 'jest.config.js', type: 'jest' },
    { name: '.eslintrc.json', type: 'eslint' },
    { name: 'prettier.config.js', type: 'prettier' },
    { name: 'tailwind.config.js', type: 'tailwind' },
    { name: 'next.config.js', type: 'nextjs' },
    { name: 'vue.config.js', type: 'vue' },
    { name: 'angular.json', type: 'angular' },
    { name: 'rollup.config.js', type: 'rollup' },
    { name: 'parcel.config.js', type: 'parcel' },
    { name: 'babel.config.js', type: 'babel' },
    { name: 'postcss.config.js', type: 'postcss' }
  ];

  const pathPrefixes = {
    flat: [''],
    nested: ['', 'frontend/', 'backend/', 'shared/'],
    deep: ['', 'apps/web/', 'apps/mobile/', 'packages/ui/', 'packages/shared/', 'tools/build/', 'services/api/']
  };

  const prefixes = pathPrefixes[complexity];

  for (let i = 0; i < count; i++) {
    const configIndex = i % baseConfigs.length;
    const prefixIndex = i % prefixes.length;
    const config = baseConfigs[configIndex];
    const prefix = prefixes[prefixIndex];

    configFiles.push({
      name: config.name,
      path: `${prefix}${config.name}`,
      type: config.type
    });
  }

  return configFiles;
}

/**
 * Generate dependency files based on languages
 */
function generateDependencyFiles(count: number, languages: string[]): Array<{
  name: string;
  path: string;
  type: string;
}> {
  const dependencyFiles = [];
  const languageDependencies = {
    'JavaScript': [
      { name: 'package.json', type: 'npm' },
      { name: 'yarn.lock', type: 'yarn' },
      { name: 'package-lock.json', type: 'npm' }
    ],
    'TypeScript': [
      { name: 'package.json', type: 'npm' }
    ],
    'Python': [
      { name: 'requirements.txt', type: 'pip' },
      { name: 'setup.py', type: 'pip' },
      { name: 'pyproject.toml', type: 'pip' },
      { name: 'Pipfile', type: 'pipenv' }
    ],
    'Go': [
      { name: 'go.mod', type: 'go' },
      { name: 'go.sum', type: 'go' }
    ],
    'Java': [
      { name: 'pom.xml', type: 'maven' },
      { name: 'build.gradle', type: 'gradle' },
      { name: 'build.gradle.kts', type: 'gradle' }
    ],
    'Rust': [
      { name: 'Cargo.toml', type: 'cargo' },
      { name: 'Cargo.lock', type: 'cargo' }
    ],
    'C#': [
      { name: 'project.csproj', type: 'dotnet' },
      { name: 'packages.config', type: 'nuget' }
    ],
    'PHP': [
      { name: 'composer.json', type: 'composer' },
      { name: 'composer.lock', type: 'composer' }
    ],
    'Ruby': [
      { name: 'Gemfile', type: 'bundler' },
      { name: 'Gemfile.lock', type: 'bundler' }
    ]
  };

  let fileIndex = 0;
  for (let i = 0; i < count && fileIndex < 100; i++) {
    const language = languages[i % languages.length];
    const langDeps = languageDependencies[language] || [];
    
    if (langDeps.length > 0) {
      const depIndex = fileIndex % langDeps.length;
      const dep = langDeps[depIndex];
      
      dependencyFiles.push({
        name: dep.name,
        path: `/${dep.name}`,
        type: dep.type
      });
      
      fileIndex++;
    }
  }

  return dependencyFiles;
}

/**
 * Determine project complexity based on configuration
 */
function determineComplexity(config: LargeProjectConfig): 'low' | 'medium' | 'high' | 'extreme' {
  let complexityScore = 0;

  // Language count contribution
  if (config.languageCount <= 2) complexityScore += 1;
  else if (config.languageCount <= 5) complexityScore += 2;
  else if (config.languageCount <= 8) complexityScore += 3;
  else complexityScore += 4;

  // Config file count contribution
  if (config.configFileCount <= 10) complexityScore += 1;
  else if (config.configFileCount <= 25) complexityScore += 2;
  else if (config.configFileCount <= 50) complexityScore += 3;
  else complexityScore += 4;

  // Framework diversity contribution
  if (config.frameworkDiversity === 'low') complexityScore += 1;
  else if (config.frameworkDiversity === 'medium') complexityScore += 2;
  else complexityScore += 3;

  // Structure complexity contribution
  if (config.structureComplexity === 'flat') complexityScore += 1;
  else if (config.structureComplexity === 'nested') complexityScore += 2;
  else complexityScore += 3;

  // Determine final complexity
  if (complexityScore <= 4) return 'low';
  else if (complexityScore <= 8) return 'medium';
  else if (complexityScore <= 12) return 'high';
  else return 'extreme';
}

/**
 * Get expected performance metrics based on complexity
 */
function getExpectedPerformance(complexity: 'low' | 'medium' | 'high' | 'extreme'): {
  detectionTime: number;
  memoryUsage: number;
} {
  const performanceMap = {
    low: { detectionTime: 500, memoryUsage: 10 * 1024 * 1024 }, // 500ms, 10MB
    medium: { detectionTime: 1500, memoryUsage: 25 * 1024 * 1024 }, // 1.5s, 25MB
    high: { detectionTime: 3000, memoryUsage: 50 * 1024 * 1024 }, // 3s, 50MB
    extreme: { detectionTime: 5000, memoryUsage: 100 * 1024 * 1024 } // 5s, 100MB
  };

  return performanceMap[complexity];
}

/**
 * Generate predefined performance test scenarios
 */
export function generatePerformanceTestSuite(): PerformanceTestScenario[] {
  return [
    // Small project scenarios
    generateLargeProject({
      languageCount: 2,
      configFileCount: 5,
      dependencyFileCount: 3,
      frameworkDiversity: 'low',
      structureComplexity: 'flat'
    }),

    // Medium project scenarios
    generateLargeProject({
      languageCount: 4,
      configFileCount: 15,
      dependencyFileCount: 8,
      frameworkDiversity: 'medium',
      structureComplexity: 'nested'
    }),

    // Large project scenarios
    generateLargeProject({
      languageCount: 6,
      configFileCount: 30,
      dependencyFileCount: 15,
      frameworkDiversity: 'high',
      structureComplexity: 'deep'
    }),

    // Extreme project scenarios
    generateLargeProject({
      languageCount: 10,
      configFileCount: 50,
      dependencyFileCount: 25,
      frameworkDiversity: 'high',
      structureComplexity: 'deep'
    }),

    // Edge case scenarios
    {
      name: 'Config File Heavy Project',
      description: 'Project with many config files but few languages',
      projectInfo: {
        languages: ['JavaScript'],
        configFiles: Array.from({ length: 100 }, (_, i) => ({
          name: `config-${i}.json`,
          path: `/configs/config-${i}.json`,
          type: 'config'
        })),
        dependencies: [
          { name: 'package.json', path: '/package.json', type: 'npm' }
        ],
        metadata: {
          name: 'config-heavy-project',
          description: 'Project with many configuration files',
          version: '1.0.0'
        }
      },
      expectedComplexity: 'high',
      expectedDetectionTime: 2000,
      expectedMemoryUsage: 30 * 1024 * 1024
    },

    {
      name: 'Multi-Language Minimal Config',
      description: 'Many languages but minimal configuration',
      projectInfo: {
        languages: ['JavaScript', 'Python', 'Go', 'Java', 'Rust', 'C#', 'PHP', 'Ruby'],
        configFiles: [
          { name: 'package.json', path: '/package.json', type: 'npm' },
          { name: 'requirements.txt', path: '/requirements.txt', type: 'pip' }
        ],
        dependencies: [
          { name: 'package.json', path: '/package.json', type: 'npm' },
          { name: 'requirements.txt', path: '/requirements.txt', type: 'pip' },
          { name: 'go.mod', path: '/go.mod', type: 'go' },
          { name: 'pom.xml', path: '/pom.xml', type: 'maven' },
          { name: 'Cargo.toml', path: '/Cargo.toml', type: 'cargo' }
        ],
        metadata: {
          name: 'multi-language-minimal',
          description: 'Multi-language project with minimal configuration',
          version: '1.0.0'
        }
      },
      expectedComplexity: 'medium',
      expectedDetectionTime: 1000,
      expectedMemoryUsage: 20 * 1024 * 1024
    }
  ];
}

/**
 * Generate stress test scenarios for extreme performance testing
 */
export function generateStressTestScenarios(): PerformanceTestScenario[] {
  return [
    {
      name: 'Massive Monorepo Simulation',
      description: 'Simulates a massive monorepo with hundreds of packages',
      projectInfo: {
        languages: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Java', 'Rust'],
        configFiles: Array.from({ length: 200 }, (_, i) => ({
          name: i % 10 === 0 ? 'package.json' : `config-${i}.json`,
          path: `/packages/package-${Math.floor(i / 10)}/config-${i}.json`,
          type: i % 10 === 0 ? 'npm' : 'config'
        })),
        dependencies: Array.from({ length: 50 }, (_, i) => ({
          name: 'package.json',
          path: `/packages/package-${i}/package.json`,
          type: 'npm'
        })),
        metadata: {
          name: 'massive-monorepo',
          description: 'Massive monorepo with hundreds of packages',
          version: '1.0.0'
        }
      },
      expectedComplexity: 'extreme',
      expectedDetectionTime: 8000,
      expectedMemoryUsage: 150 * 1024 * 1024
    },

    {
      name: 'Deep Nested Structure',
      description: 'Project with extremely deep directory nesting',
      projectInfo: {
        languages: ['JavaScript', 'Python'],
        configFiles: Array.from({ length: 50 }, (_, i) => ({
          name: 'config.json',
          path: `/level1/level2/level3/level4/level5/level6/level7/level8/level9/level10/config-${i}.json`,
          type: 'config'
        })),
        dependencies: [
          { name: 'package.json', path: '/level1/level2/level3/package.json', type: 'npm' },
          { name: 'requirements.txt', path: '/level1/level2/level3/level4/requirements.txt', type: 'pip' }
        ],
        metadata: {
          name: 'deep-nested-project',
          description: 'Project with extremely deep nesting',
          version: '1.0.0'
        }
      },
      expectedComplexity: 'high',
      expectedDetectionTime: 3000,
      expectedMemoryUsage: 40 * 1024 * 1024
    }
  ];
}

/**
 * Validate performance test results
 */
export function validatePerformanceResults(
  scenario: PerformanceTestScenario,
  actualTime: number,
  actualMemory: number
): {
  passed: boolean;
  timeWithinExpected: boolean;
  memoryWithinExpected: boolean;
  timeRatio: number;
  memoryRatio: number;
  warnings: string[];
} {
  const timeRatio = actualTime / scenario.expectedDetectionTime;
  const memoryRatio = actualMemory / scenario.expectedMemoryUsage;
  
  const timeWithinExpected = timeRatio <= 1.5; // Allow 50% over expected
  const memoryWithinExpected = memoryRatio <= 2.0; // Allow 100% over expected
  
  const warnings: string[] = [];
  
  if (!timeWithinExpected) {
    warnings.push(`Detection time exceeded expected by ${((timeRatio - 1) * 100).toFixed(1)}%`);
  }
  
  if (!memoryWithinExpected) {
    warnings.push(`Memory usage exceeded expected by ${((memoryRatio - 1) * 100).toFixed(1)}%`);
  }
  
  if (timeRatio > 3) {
    warnings.push('Detection time is critically slow');
  }
  
  if (memoryRatio > 5) {
    warnings.push('Memory usage is critically high');
  }

  return {
    passed: timeWithinExpected && memoryWithinExpected,
    timeWithinExpected,
    memoryWithinExpected,
    timeRatio,
    memoryRatio,
    warnings
  };
}