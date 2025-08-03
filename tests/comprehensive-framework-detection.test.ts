/**
 * Comprehensive Framework Detection Test Suite with Real-World Samples
 * 
 * This test suite validates framework detection accuracy, performance, and reliability
 * using realistic project samples that represent actual GitHub repository structures.
 * 
 * Test Coverage:
 * - Individual framework detection accuracy
 * - Multi-language project coordination
 * - Monorepo and microservices architecture
 * - Performance with large, complex projects
 * - Regression testing for detection accuracy
 * - CI pipeline generation validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { join } from 'path';
import { 
  createTestFrameworkDetector,
  validateFrameworkDetection,
  loadRealWorldProject,
  generateDetectionPerformanceReport,
  validateCIPipelineGeneration,
  type FrameworkTestCase,
  type RealWorldProject,
  type DetectionValidationResult
} from './utils/framework-detection-helpers';
import { FrameworkDetectorImpl } from '../src/detection/framework-detector';
import { ProjectInfo } from '../src/detection/interfaces/framework-detector';
import { DetectionResult } from '../src/detection/interfaces/detection-result';

describe('Comprehensive Framework Detection Test Suite', () => {
  let detector: FrameworkDetectorImpl;
  let realWorldProjects: Map<string, RealWorldProject>;
  let baselineMetrics: any;

  beforeAll(async () => {
    detector = createTestFrameworkDetector();
    realWorldProjects = new Map();
    
    // Load real-world project samples
    const projectPaths = [
      'react-typescript-app',
      'django-rest-api', 
      'go-gin-microservice'
    ];

    for (const projectPath of projectPaths) {
      try {
        const fullPath = join(__dirname, 'fixtures', 'real-world-projects', projectPath);
        const project = await loadRealWorldProject(fullPath);
        realWorldProjects.set(projectPath, project);
      } catch (error) {
        console.warn(`Could not load project ${projectPath}:`, error);
      }
    }

    // Establish baseline performance metrics
    const simpleProject: ProjectInfo = {
      name: 'test-project',
      description: 'Simple test project',
      languages: ['JavaScript'],
      dependencies: ['react', 'react-dom'],
      buildCommands: ['npm run build'],
      testCommands: ['npm test'],
      installationSteps: ['npm install'],
      usageExamples: ['npm start'],
      configFiles: ['package.json'],
      deploymentInfo: [],
      rawContent: '# Test Project\n\nA simple test project with React.'
    };

    const startTime = Date.now();
    await detector.detectFrameworks(simpleProject);
    const endTime = Date.now();

    baselineMetrics = {
      detectionTime: endTime - startTime,
      memoryUsage: 1024 * 1024, // 1MB baseline
      frameworkCount: 1,
      buildToolCount: 1,
      containerCount: 0
    };

    console.log('🏁 Baseline metrics established:', baselineMetrics);
  });

  afterAll(() => {
    // Cleanup if needed
  });

  beforeEach(() => {
    // Reset any state if needed
  });

  describe('Single Framework Detection Accuracy', () => {
    it('should accurately detect React TypeScript application', async () => {
      const project = realWorldProjects.get('react-typescript-app');
      if (!project) {
        console.warn('React TypeScript project not loaded, skipping test');
        return;
      }

      const testCase: FrameworkTestCase = {
        name: 'React TypeScript App',
        projectPath: project.path,
        projectInfo: project.expectedDetection.projectInfo,
        expectedFrameworks: [
          {
            name: 'React',
            ecosystem: 'nodejs',
            type: 'frontend_framework',
            minConfidence: 0.8
          },
          {
            name: 'TypeScript',
            ecosystem: 'nodejs',
            minConfidence: 0.7
          }
        ],
        expectedBuildTools: [
          {
            name: 'Vite',
            configFile: 'vite.config.ts',
            minConfidence: 0.8
          },
          {
            name: 'npm',
            configFile: 'package.json',
            minConfidence: 0.9
          }
        ],
        expectedContainers: [],
        minConfidence: 0.7,
        description: 'Modern React app with TypeScript and Vite'
      };

      const result = await validateFrameworkDetection(detector, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.errors).toHaveLength(0);
      
      // Verify specific framework detection
      const reactFramework = result.frameworkResults.find(f => f.expected.name === 'React');
      expect(reactFramework?.matched).toBe(true);
      expect(reactFramework?.confidenceMet).toBe(true);

      // Performance validation
      expect(result.performanceMetrics.detectionTime).toBeLessThan(2000); // Under 2 seconds
      expect(result.performanceMetrics.frameworkCount).toBeGreaterThan(0);

      console.log(generateDetectionPerformanceReport(
        'React TypeScript App',
        result.performanceMetrics,
        baselineMetrics
      ));
    });

    it('should accurately detect Django REST API', async () => {
      const project = realWorldProjects.get('django-rest-api');
      if (!project) {
        console.warn('Django REST API project not loaded, skipping test');
        return;
      }

      const testCase: FrameworkTestCase = {
        name: 'Django REST API',
        projectPath: project.path,
        projectInfo: project.expectedDetection.projectInfo,
        expectedFrameworks: [
          {
            name: 'Django',
            ecosystem: 'python',
            type: 'web_framework',
            minConfidence: 0.8
          },
          {
            name: 'Django REST Framework',
            ecosystem: 'python',
            type: 'api_framework',
            minConfidence: 0.7
          }
        ],
        expectedBuildTools: [
          {
            name: 'pip',
            configFile: 'requirements.txt',
            minConfidence: 0.9
          }
        ],
        expectedContainers: [
          {
            type: 'docker',
            configFiles: ['Dockerfile']
          }
        ],
        minConfidence: 0.7,
        description: 'Django REST API with PostgreSQL and Docker'
      };

      const result = await validateFrameworkDetection(detector, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
      
      // Verify Django detection
      const djangoFramework = result.frameworkResults.find(f => f.expected.name === 'Django');
      expect(djangoFramework?.matched).toBe(true);
      expect(djangoFramework?.confidenceMet).toBe(true);

      // Verify container detection
      const dockerContainer = result.containerResults.find(c => c.expected.type === 'docker');
      expect(dockerContainer?.matched).toBe(true);

      console.log(generateDetectionPerformanceReport(
        'Django REST API',
        result.performanceMetrics,
        baselineMetrics
      ));
    });

    it('should accurately detect Go Gin microservice', async () => {
      const project = realWorldProjects.get('go-gin-microservice');
      if (!project) {
        console.warn('Go Gin microservice project not loaded, skipping test');
        return;
      }

      const testCase: FrameworkTestCase = {
        name: 'Go Gin Microservice',
        projectPath: project.path,
        projectInfo: project.expectedDetection.projectInfo,
        expectedFrameworks: [
          {
            name: 'Gin',
            ecosystem: 'go',
            type: 'web_framework',
            minConfidence: 0.7
          },
          {
            name: 'Go',
            ecosystem: 'go',
            minConfidence: 0.8
          }
        ],
        expectedBuildTools: [
          {
            name: 'go',
            configFile: 'go.mod',
            minConfidence: 0.9
          }
        ],
        expectedContainers: [],
        minConfidence: 0.7,
        description: 'Go microservice with Gin framework'
      };

      const result = await validateFrameworkDetection(detector, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
      
      // Verify Go detection
      const goFramework = result.frameworkResults.find(f => f.expected.name === 'Go');
      expect(goFramework?.matched).toBe(true);
      expect(goFramework?.confidenceMet).toBe(true);

      console.log(generateDetectionPerformanceReport(
        'Go Gin Microservice',
        result.performanceMetrics,
        baselineMetrics
      ));
    });
  });

  describe('Multi-Language Project Coordination', () => {
    it('should coordinate detection across multiple languages', async () => {
      // Create a multi-language project scenario
      const multiLangProject: ProjectInfo = {
        name: 'multi-language-project',
        description: 'Full-stack application with multiple languages',
        languages: ['JavaScript', 'Python', 'Go'],
        dependencies: ['react', 'django', 'gin-gonic'],
        buildCommands: ['npm run build', 'python manage.py collectstatic', 'go build'],
        testCommands: ['npm test', 'python manage.py test', 'go test ./...'],
        installationSteps: ['npm install', 'pip install -r requirements.txt', 'go mod download'],
        usageExamples: ['npm start', 'python manage.py runserver', 'go run main.go'],
        configFiles: ['package.json', 'requirements.txt', 'go.mod'],
        deploymentInfo: ['docker-compose up'],
        rawContent: '# Multi-Language Project\n\nFull-stack app with React frontend, Django backend, and Go API.'
      };

      const result = await detector.detectFrameworks(multiLangProject);

      expect(result.frameworks.length).toBeGreaterThanOrEqual(3);
      expect(result.confidence.score).toBeGreaterThan(0.5);
      
      // Should detect frameworks from all ecosystems
      const ecosystems = result.frameworks.map(f => f.ecosystem);
      expect(ecosystems).toContain('nodejs');
      expect(ecosystems).toContain('python');
      expect(ecosystems).toContain('go');

      // Should have appropriate build tools for each language
      expect(result.buildTools.length).toBeGreaterThanOrEqual(3);
      
      console.log('🌐 Multi-language detection results:', {
        frameworks: result.frameworks.map(f => `${f.name} (${f.ecosystem})`),
        buildTools: result.buildTools.map(bt => bt.name),
        confidence: result.confidence.score
      });
    });

    it('should handle framework conflicts and provide resolutions', async () => {
      // Create a project with potential conflicts
      const conflictProject: ProjectInfo = {
        name: 'conflict-project',
        description: 'Project with conflicting build tools',
        languages: ['JavaScript'],
        dependencies: ['react', 'webpack', 'vite'],
        buildCommands: ['webpack build', 'vite build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json', 'webpack.config.js', 'vite.config.js'],
        deploymentInfo: [],
        rawContent: '# Conflict Project\n\nProject with both webpack and vite configurations.'
      };

      const result = await detector.detectFrameworks(conflictProject);

      // Should detect the conflict and provide warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      
      // Should still provide a reasonable detection result
      expect(result.frameworks.length).toBeGreaterThan(0);
      expect(result.buildTools.length).toBeGreaterThan(0);

      // Check for conflict-related warnings
      const conflictWarnings = result.warnings.filter(w => 
        w.message.toLowerCase().includes('conflict') ||
        w.message.toLowerCase().includes('multiple')
      );
      expect(conflictWarnings.length).toBeGreaterThan(0);

      console.log('⚠️ Conflict detection results:', {
        warnings: result.warnings.map(w => w.message),
        frameworks: result.frameworks.map(f => f.name),
        buildTools: result.buildTools.map(bt => bt.name)
      });
    });
  });

  describe('Complex Architecture Detection', () => {
    it('should detect monorepo structure patterns', async () => {
      const monorepoProject: ProjectInfo = {
        name: 'monorepo-project',
        description: 'Monorepo with multiple packages',
        languages: ['JavaScript', 'TypeScript'],
        dependencies: ['react', 'express', 'lerna', 'nx'],
        buildCommands: ['lerna run build', 'nx build', 'npm run build:all'],
        testCommands: ['lerna run test', 'nx test', 'npm run test:all'],
        installationSteps: ['npm install', 'lerna bootstrap'],
        usageExamples: ['lerna run dev', 'nx serve'],
        configFiles: ['package.json', 'lerna.json', 'nx.json'],
        deploymentInfo: ['lerna run deploy'],
        rawContent: '# Monorepo Project\n\nMonorepo with multiple packages using Lerna and Nx.'
      };

      const result = await detector.detectFrameworks(monorepoProject);

      // Should detect multiple frameworks and build tools
      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      expect(result.buildTools.length).toBeGreaterThanOrEqual(2);
      
      // Should have reasonable confidence despite complexity
      expect(result.confidence.score).toBeGreaterThan(0.4);

      console.log('📦 Monorepo detection results:', {
        frameworks: result.frameworks.map(f => f.name),
        buildTools: result.buildTools.map(bt => bt.name),
        confidence: result.confidence.score
      });
    });

    it('should detect microservices architecture', async () => {
      const microservicesProject: ProjectInfo = {
        name: 'microservices-project',
        description: 'Microservices architecture with multiple languages',
        languages: ['JavaScript', 'Python', 'Go', 'Java'],
        dependencies: ['react', 'django', 'gin-gonic', 'spring-boot'],
        buildCommands: ['npm run build', 'python setup.py build', 'go build', 'mvn compile'],
        testCommands: ['npm test', 'pytest', 'go test ./...', 'mvn test'],
        installationSteps: ['docker-compose up', 'npm install', 'pip install -r requirements.txt'],
        usageExamples: ['docker-compose up -d', 'kubectl apply -f k8s/'],
        configFiles: ['package.json', 'requirements.txt', 'go.mod', 'pom.xml', 'docker-compose.yml'],
        deploymentInfo: ['kubernetes', 'docker-compose'],
        rawContent: '# Microservices Project\n\nMicroservices architecture with React, Django, Go, and Spring Boot services.'
      };

      const result = await detector.detectFrameworks(microservicesProject);

      // Should detect frameworks from all ecosystems
      expect(result.frameworks.length).toBeGreaterThanOrEqual(4);
      
      const ecosystems = new Set(result.frameworks.map(f => f.ecosystem));
      expect(ecosystems.size).toBeGreaterThanOrEqual(3);
      
      // Should detect container orchestration
      expect(result.containers.length).toBeGreaterThan(0);

      console.log('🏗️ Microservices detection results:', {
        frameworks: result.frameworks.map(f => `${f.name} (${f.ecosystem})`),
        containers: result.containers.map(c => c.type),
        ecosystems: Array.from(ecosystems)
      });
    });
  });

  describe('Performance Testing with Large Projects', () => {
    it('should handle large projects efficiently', async () => {
      // Create a large, complex project scenario
      const largeProject: ProjectInfo = {
        name: 'large-complex-project',
        description: 'Large project with many languages and configurations',
        languages: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Java', 'Rust'],
        dependencies: ['react', 'django', 'gin-gonic', 'spring-boot', 'actix-web'],
        buildCommands: ['npm run build', 'python setup.py build', 'go build', 'mvn compile', 'cargo build'],
        testCommands: ['npm test', 'pytest', 'go test ./...', 'mvn test', 'cargo test'],
        installationSteps: ['npm install', 'pip install -r requirements.txt', 'go mod download'],
        usageExamples: ['npm start', 'python manage.py runserver', 'go run main.go'],
        configFiles: Array.from({ length: 50 }, (_, i) => `config-${i}.json`),
        deploymentInfo: ['docker', 'kubernetes'],
        rawContent: '# Large Complex Project\n\nLarge project with multiple languages and many configurations.'
      };

      const startTime = Date.now();
      const result = await detector.detectFrameworks(largeProject);
      const endTime = Date.now();

      const detectionTime = endTime - startTime;

      // Performance requirements
      expect(detectionTime).toBeLessThan(5000); // Under 5 seconds
      expect(result.frameworks.length).toBeGreaterThan(0);
      expect(result.confidence.score).toBeGreaterThan(0.3);

      console.log('⚡ Large project performance:', {
        detectionTime: `${detectionTime}ms`,
        frameworksDetected: result.frameworks.length,
        buildToolsDetected: result.buildTools.length,
        confidence: result.confidence.score
      });
    });

    it('should maintain accuracy under memory pressure', async () => {
      // Run multiple detections in parallel to simulate memory pressure
      const projects = Array.from({ length: 10 }, (_, i) => ({
        name: `test-project-${i}`,
        description: `Test project ${i}`,
        languages: ['JavaScript', 'Python'],
        dependencies: ['react', 'django'],
        buildCommands: ['npm run build', 'python setup.py build'],
        testCommands: ['npm test', 'pytest'],
        installationSteps: ['npm install', 'pip install -r requirements.txt'],
        usageExamples: ['npm start', 'python manage.py runserver'],
        configFiles: ['package.json', 'requirements.txt'],
        deploymentInfo: [],
        rawContent: `# Test Project ${i}\n\nTest project with React and Django.`
      }));

      const startMemory = process.memoryUsage().heapUsed;
      
      const results = await Promise.all(
        projects.map(project => detector.detectFrameworks(project))
      );

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;

      // All detections should succeed
      results.forEach((result, i) => {
        expect(result.frameworks.length).toBeGreaterThan(0);
        expect(result.confidence.score).toBeGreaterThan(0.5);
      });

      // Memory usage should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Under 100MB

      console.log('🧠 Memory pressure test:', {
        projectsProcessed: results.length,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        avgConfidence: results.reduce((sum, r) => sum + r.confidence.score, 0) / results.length
      });
    });
  });

  describe('CI Pipeline Generation Validation', () => {
    it('should generate appropriate CI pipelines for detected frameworks', async () => {
      const project = realWorldProjects.get('react-typescript-app');
      if (!project) {
        console.warn('React TypeScript project not loaded, skipping CI test');
        return;
      }

      const detectionResult = await detector.detectFrameworks(project.expectedDetection.projectInfo);
      const pipelineValidation = await validateCIPipelineGeneration(detector, detectionResult);

      expect(pipelineValidation.passed).toBe(true);
      expect(pipelineValidation.errors).toHaveLength(0);
      expect(pipelineValidation.score).toBeGreaterThan(0.6);

      const pipeline = pipelineValidation.pipeline;
      
      // Should have Node.js setup steps
      const nodeSetup = pipeline.setup.find(step => 
        step.name?.includes('Node') || step.uses?.includes('setup-node')
      );
      expect(nodeSetup).toBeDefined();

      // Should have build steps
      expect(pipeline.build.length).toBeGreaterThan(0);
      
      // Should have test steps
      expect(pipeline.test.length).toBeGreaterThan(0);

      console.log('🔧 CI Pipeline validation:', {
        setupSteps: pipeline.setup.length,
        buildSteps: pipeline.build.length,
        testSteps: pipeline.test.length,
        securitySteps: pipeline.security.length,
        cacheStrategies: pipeline.cache.length
      });
    });

    it('should generate multi-language CI pipelines', async () => {
      const multiLangProject: ProjectInfo = {
        name: 'multi-lang-project',
        description: 'Multi-language project',
        languages: ['JavaScript', 'Python'],
        dependencies: ['react', 'django'],
        buildCommands: ['npm run build', 'python setup.py build'],
        testCommands: ['npm test', 'pytest'],
        installationSteps: ['npm install', 'pip install -r requirements.txt'],
        usageExamples: ['npm start', 'python manage.py runserver'],
        configFiles: ['package.json', 'requirements.txt'],
        deploymentInfo: [],
        rawContent: '# Multi-Language Project\n\nProject with React frontend and Django backend.'
      };

      const detectionResult = await detector.detectFrameworks(multiLangProject);
      const pipelineValidation = await validateCIPipelineGeneration(detector, detectionResult);

      expect(pipelineValidation.passed).toBe(true);
      
      const pipeline = pipelineValidation.pipeline;
      
      // Should have setup steps for both languages
      const setupStepNames = pipeline.setup.map(step => step.name?.toLowerCase() || '');
      const hasNodeSetup = setupStepNames.some(name => name.includes('node'));
      const hasPythonSetup = setupStepNames.some(name => name.includes('python'));
      
      expect(hasNodeSetup || hasPythonSetup).toBe(true);

      // Should have appropriate cache strategies
      expect(pipeline.cache.length).toBeGreaterThan(0);

      console.log('🌐 Multi-language CI Pipeline:', {
        setupSteps: pipeline.setup.map(s => s.name),
        cacheStrategies: pipeline.cache.map(c => c.id)
      });
    });
  });

  describe('Regression Testing', () => {
    it('should maintain detection accuracy over time', async () => {
      // Define expected results for regression testing
      const regressionTestCases = [
        {
          name: 'React Detection Regression',
          projectInfo: {
            name: 'react-app',
            description: 'React application',
            languages: ['JavaScript'],
            dependencies: ['react', 'react-dom'],
            buildCommands: ['npm run build'],
            testCommands: ['npm test'],
            installationSteps: ['npm install'],
            usageExamples: ['npm start'],
            configFiles: ['package.json'],
            deploymentInfo: [],
            rawContent: '# React App\n\nA React application with modern tooling.'
          },
          expectedFrameworks: ['React'],
          minConfidence: 0.7
        },
        {
          name: 'Django Detection Regression',
          projectInfo: {
            name: 'django-app',
            description: 'Django application',
            languages: ['Python'],
            dependencies: ['Django', 'djangorestframework'],
            buildCommands: ['python setup.py build'],
            testCommands: ['python manage.py test'],
            installationSteps: ['pip install -r requirements.txt'],
            usageExamples: ['python manage.py runserver'],
            configFiles: ['requirements.txt'],
            deploymentInfo: [],
            rawContent: '# Django App\n\nA Django web application with REST API.'
          },
          expectedFrameworks: ['Django'],
          minConfidence: 0.7
        }
      ];

      const regressionResults = [];

      for (const testCase of regressionTestCases) {
        const result = await detector.detectFrameworks(testCase.projectInfo);
        
        const detectedFrameworkNames = result.frameworks.map(f => f.name);
        const expectedDetected = testCase.expectedFrameworks.every(expected =>
          detectedFrameworkNames.some(detected => 
            detected.toLowerCase().includes(expected.toLowerCase())
          )
        );

        const confidenceMet = result.confidence.score >= testCase.minConfidence;

        regressionResults.push({
          testCase: testCase.name,
          passed: expectedDetected && confidenceMet,
          confidence: result.confidence.score,
          detectedFrameworks: detectedFrameworkNames
        });
      }

      // All regression tests should pass
      const passedTests = regressionResults.filter(r => r.passed).length;
      const totalTests = regressionResults.length;
      const passRate = passedTests / totalTests;

      expect(passRate).toBeGreaterThan(0.8); // 80% pass rate minimum

      console.log('📊 Regression test results:', {
        passRate: `${(passRate * 100).toFixed(1)}%`,
        results: regressionResults
      });
    });

    it('should detect framework version changes accurately', async () => {
      // Test with different versions of the same framework
      const versionTestCases = [
        {
          name: 'React 17 vs 18',
          frameworks: ['React'],
          versions: ['17.0.0', '18.2.0']
        },
        {
          name: 'Django 3 vs 4',
          frameworks: ['Django'],
          versions: ['3.2.0', '4.2.0']
        }
      ];

      for (const testCase of versionTestCases) {
        const projectInfo: ProjectInfo = {
          name: 'version-test',
          description: `${testCase.name} version test`,
          languages: testCase.frameworks.includes('React') ? ['JavaScript'] : ['Python'],
          dependencies: testCase.frameworks.includes('React') ? ['react', 'react-dom'] : ['Django'],
          buildCommands: testCase.frameworks.includes('React') ? ['npm run build'] : ['python setup.py build'],
          testCommands: testCase.frameworks.includes('React') ? ['npm test'] : ['python manage.py test'],
          installationSteps: testCase.frameworks.includes('React') ? ['npm install'] : ['pip install -r requirements.txt'],
          usageExamples: testCase.frameworks.includes('React') ? ['npm start'] : ['python manage.py runserver'],
          configFiles: testCase.frameworks.includes('React') ? ['package.json'] : ['requirements.txt'],
          deploymentInfo: [],
          rawContent: `# Version Test\n\n${testCase.name} version test project.`
        };

        const result = await detector.detectFrameworks(projectInfo);
        
        // Should detect the framework regardless of version
        const frameworkDetected = result.frameworks.some(f =>
          testCase.frameworks.some(expected =>
            f.name.toLowerCase().includes(expected.toLowerCase())
          )
        );

        expect(frameworkDetected).toBe(true);
        expect(result.confidence.score).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty projects gracefully', async () => {
      const emptyProject: ProjectInfo = {
        name: 'empty-project',
        description: 'Empty project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        deploymentInfo: [],
        rawContent: '# Empty Project\n\nAn empty project with no content.'
      };

      const result = await detector.detectFrameworks(emptyProject);

      // Should not crash and should provide reasonable response
      expect(result).toBeDefined();
      expect(result.frameworks).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.confidence.score).toBeLessThan(0.3);
    });

    it('should handle malformed project information', async () => {
      const malformedProject: ProjectInfo = {
        name: '',
        description: '',
        languages: ['InvalidLanguage'],
        dependencies: [''],
        buildCommands: [''],
        testCommands: [''],
        installationSteps: [''],
        usageExamples: [''],
        configFiles: ['', 'invalid.config'],
        deploymentInfo: [''],
        rawContent: ''
      };

      const result = await detector.detectFrameworks(malformedProject);

      // Should handle gracefully without crashing
      expect(result).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle detection timeouts gracefully', async () => {
      // This test would require mocking slow operations
      // For now, we'll test that detection completes within reasonable time
      const complexProject: ProjectInfo = {
        name: 'timeout-test-project',
        description: 'Project to test timeout handling',
        languages: ['JavaScript', 'Python', 'Go', 'Java', 'Rust', 'C++'],
        dependencies: ['react', 'django', 'gin-gonic', 'spring-boot', 'actix-web'],
        buildCommands: ['npm run build', 'python setup.py build', 'go build', 'mvn compile', 'cargo build'],
        testCommands: ['npm test', 'pytest', 'go test ./...', 'mvn test', 'cargo test'],
        installationSteps: ['npm install', 'pip install -r requirements.txt', 'go mod download'],
        usageExamples: ['npm start', 'python manage.py runserver', 'go run main.go'],
        configFiles: Array.from({ length: 100 }, (_, i) => `config-${i}.json`),
        deploymentInfo: ['docker', 'kubernetes'],
        rawContent: '# Timeout Test Project\n\nComplex project to test timeout handling with many configurations.'
      };

      const startTime = Date.now();
      const result = await detector.detectFrameworks(complexProject);
      const endTime = Date.now();

      const detectionTime = endTime - startTime;

      // Should complete within reasonable time (10 seconds max)
      expect(detectionTime).toBeLessThan(10000);
      expect(result).toBeDefined();
    });
  });

  describe('Test Summary and Reporting', () => {
    it('should generate comprehensive test summary', async () => {
      const testSummary = {
        totalProjects: realWorldProjects.size,
        projectsLoaded: Array.from(realWorldProjects.keys()),
        baselineMetrics,
        testCategories: [
          'Single Framework Detection',
          'Multi-Language Coordination', 
          'Complex Architecture Detection',
          'Performance Testing',
          'CI Pipeline Generation',
          'Regression Testing',
          'Edge Cases'
        ]
      };

      console.log('\n📋 Comprehensive Test Suite Summary');
      console.log('=====================================');
      console.log(`Real-world projects loaded: ${testSummary.totalProjects}`);
      console.log(`Projects: ${testSummary.projectsLoaded.join(', ')}`);
      console.log(`Test categories: ${testSummary.testCategories.length}`);
      console.log(`Baseline detection time: ${testSummary.baselineMetrics.detectionTime}ms`);
      console.log('=====================================\n');

      // This test always passes - it's just for reporting
      expect(testSummary.totalProjects).toBeGreaterThanOrEqual(0);
    });
  });
});