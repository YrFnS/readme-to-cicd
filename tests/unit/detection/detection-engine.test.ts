import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DetectionEngine } from '../../../src/detection/detection-engine';
import { LanguageAnalyzer, LanguageDetectionResult } from '../../../src/detection/interfaces/language-analyzer';
import { ProjectInfo } from '../../../src/detection/interfaces/framework-detector';
import { FrameworkInfo } from '../../../src/detection/interfaces/framework-info';

// Mock analyzer for testing
class MockNodeJSAnalyzer implements LanguageAnalyzer {
  readonly name = 'MockNodeJS';
  readonly ecosystem = 'nodejs';

  canAnalyze(projectInfo: ProjectInfo): boolean {
    return projectInfo.languages.includes('JavaScript') || 
           projectInfo.languages.includes('TypeScript') ||
           projectInfo.dependencies.some(dep => dep.includes('npm') || dep.includes('node'));
  }

  async analyze(projectInfo: ProjectInfo): Promise<LanguageDetectionResult> {
    const frameworks: FrameworkInfo[] = [];
    
    // Detect React
    if (projectInfo.dependencies.includes('react') || projectInfo.rawContent.toLowerCase().includes('react')) {
      frameworks.push({
        name: 'React',
        type: 'frontend_framework',
        version: '18.0.0',
        confidence: 0.9,
        evidence: [
          { type: 'dependency', source: 'dependencies', value: 'react', weight: 0.8 },
          { type: 'text_mention', source: 'readme', value: 'react', weight: 0.3 }
        ],
        ecosystem: 'nodejs',
        buildTool: 'webpack',
        testFramework: 'jest'
      });
    }

    return {
      frameworks,
      buildTools: [],
      confidence: frameworks.length > 0 ? 0.8 : 0.2,
      recommendations: frameworks.length === 0 ? ['Add package.json with dependencies'] : [],
      metadata: {
        executionTime: 50,
        filesAnalyzed: ['package.json'],
        patternsMatched: ['react'],
        warnings: []
      }
    };
  }

  generateCISteps(): any[] {
    return [
      { name: 'Setup Node.js', uses: 'actions/setup-node@v3' },
      { name: 'Install dependencies', run: 'npm install' },
      { name: 'Build', run: 'npm run build' },
      { name: 'Test', run: 'npm test' }
    ];
  }
}

class MockPythonAnalyzer implements LanguageAnalyzer {
  readonly name = 'MockPython';
  readonly ecosystem = 'python';

  canAnalyze(projectInfo: ProjectInfo): boolean {
    return projectInfo.languages.includes('Python') ||
           projectInfo.configFiles.some(file => file.includes('requirements.txt'));
  }

  async analyze(projectInfo: ProjectInfo): Promise<LanguageDetectionResult> {
    const frameworks: FrameworkInfo[] = [];
    
    if (projectInfo.dependencies.includes('django') || projectInfo.rawContent.toLowerCase().includes('django')) {
      frameworks.push({
        name: 'Django',
        type: 'web_framework',
        version: '4.2.0',
        confidence: 0.85,
        evidence: [
          { type: 'dependency', source: 'requirements.txt', value: 'django', weight: 0.8 }
        ],
        ecosystem: 'python',
        buildTool: 'pip',
        testFramework: 'pytest'
      });
    }

    return {
      frameworks,
      buildTools: [],
      confidence: frameworks.length > 0 ? 0.85 : 0.1,
      recommendations: [],
      metadata: {
        executionTime: 30,
        filesAnalyzed: ['requirements.txt'],
        patternsMatched: ['django'],
        warnings: []
      }
    };
  }

  generateCISteps(): any[] {
    return [
      { name: 'Setup Python', uses: 'actions/setup-python@v4' },
      { name: 'Install dependencies', run: 'pip install -r requirements.txt' },
      { name: 'Test', run: 'python manage.py test' }
    ];
  }
}

describe('DetectionEngine', () => {
  let detectionEngine: DetectionEngine;
  let mockNodeAnalyzer: MockNodeJSAnalyzer;
  let mockPythonAnalyzer: MockPythonAnalyzer;

  beforeEach(() => {
    detectionEngine = new DetectionEngine();
    mockNodeAnalyzer = new MockNodeJSAnalyzer();
    mockPythonAnalyzer = new MockPythonAnalyzer();
  });

  describe('analyzer registration', () => {
    it('should register analyzers successfully', () => {
      detectionEngine.registerAnalyzer(mockNodeAnalyzer);
      detectionEngine.registerAnalyzer(mockPythonAnalyzer);

      const registered = detectionEngine.getRegisteredAnalyzers();
      expect(registered).toHaveLength(2);
      expect(registered.map(a => a.name)).toContain('MockNodeJS');
      expect(registered.map(a => a.name)).toContain('MockPython');
    });

    it('should not register duplicate analyzers', () => {
      detectionEngine.registerAnalyzer(mockNodeAnalyzer);
      detectionEngine.registerAnalyzer(mockNodeAnalyzer); // Duplicate

      const registered = detectionEngine.getRegisteredAnalyzers();
      expect(registered).toHaveLength(1);
    });
  });

  describe('framework detection', () => {
    beforeEach(() => {
      detectionEngine.registerAnalyzer(mockNodeAnalyzer);
      detectionEngine.registerAnalyzer(mockPythonAnalyzer);
    });

    it('should detect React framework from Node.js project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-react-app',
        description: 'A React application',
        languages: ['JavaScript'],
        dependencies: ['react', 'react-dom'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json'],
        rawContent: 'This is a React application with modern features.'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].name).toBe('React');
      expect(result.frameworks[0].confidence).toBe(0.9);
      expect(result.frameworks[0].ecosystem).toBe('nodejs');
      expect(result.confidence.score).toBeGreaterThan(0.5);
    });

    it('should detect Django framework from Python project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-django-app',
        description: 'A Django web application',
        languages: ['Python'],
        dependencies: ['django', 'psycopg2'],
        buildCommands: [],
        testCommands: ['python manage.py test'],
        installationSteps: ['pip install -r requirements.txt'],
        usageExamples: ['python manage.py runserver'],
        configFiles: ['requirements.txt', 'manage.py'],
        rawContent: 'This Django application provides a REST API.'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].name).toBe('Django');
      expect(result.frameworks[0].confidence).toBe(0.85);
      expect(result.frameworks[0].ecosystem).toBe('python');
    });

    it('should detect multiple frameworks in multi-language project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'fullstack-app',
        description: 'Full-stack application with React frontend and Django backend',
        languages: ['JavaScript', 'Python'],
        dependencies: ['react', 'django'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test', 'python manage.py test'],
        installationSteps: ['npm install', 'pip install -r requirements.txt'],
        usageExamples: ['npm start', 'python manage.py runserver'],
        configFiles: ['package.json', 'requirements.txt'],
        rawContent: 'Full-stack app using React for frontend and Django for backend API.'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks).toHaveLength(2);
      const frameworkNames = result.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('React');
      expect(frameworkNames).toContain('Django');
    });

    it('should handle projects with no detectable frameworks', async () => {
      const projectInfo: ProjectInfo = {
        name: 'simple-script',
        description: 'A simple utility script',
        languages: ['Shell'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: ['./script.sh'],
        configFiles: [],
        rawContent: 'Simple bash script for file processing.'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.frameworks).toHaveLength(0);
      expect(result.confidence.score).toBeLessThan(0.3);
      expect(result.confidence.level).toBe('none');
    });

    it('should generate alternatives for low-confidence detections', async () => {
      const projectInfo: ProjectInfo = {
        name: 'unclear-project',
        description: 'Project with unclear framework',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'This project might use Vue.js or Angular for the frontend.'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.alternatives.length).toBeGreaterThan(0);
      const alternativeNames = result.alternatives.map(a => a.name);
      expect(alternativeNames).toContain('vue');
    });

    it('should generate warnings for failed analyzers', async () => {
      // Create a failing analyzer
      const failingAnalyzer: LanguageAnalyzer = {
        name: 'FailingAnalyzer',
        ecosystem: 'failing',
        canAnalyze: () => true,
        analyze: async () => {
          throw new Error('Analyzer failed');
        },
        generateCISteps: () => []
      };

      detectionEngine.registerAnalyzer(failingAnalyzer);

      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'Test project'
      };

      const result = await detectionEngine.analyze(projectInfo);

      expect(result.warnings.some(w => w.type === 'incomplete')).toBe(true);
    });
  });

  describe('CI pipeline generation', () => {
    beforeEach(() => {
      detectionEngine.registerAnalyzer(mockNodeAnalyzer);
    });

    it('should generate basic CI pipeline structure', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-app',
        languages: ['JavaScript'],
        dependencies: ['react'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'React app'
      };

      const detectionResult = await detectionEngine.analyze(projectInfo);
      const pipeline = await detectionEngine.generateCIPipeline(detectionResult);

      expect(pipeline).toHaveProperty('setup');
      expect(pipeline).toHaveProperty('build');
      expect(pipeline).toHaveProperty('test');
      expect(pipeline).toHaveProperty('security');
      expect(pipeline).toHaveProperty('deploy');
      expect(pipeline).toHaveProperty('cache');
      expect(pipeline).toHaveProperty('metadata');
      expect(pipeline.metadata.name).toBe('Generated CI Pipeline');
    });
  });

  describe('performance and error handling', () => {
    it('should complete analysis within reasonable time', async () => {
      detectionEngine.registerAnalyzer(mockNodeAnalyzer);
      detectionEngine.registerAnalyzer(mockPythonAnalyzer);

      const projectInfo: ProjectInfo = {
        name: 'performance-test',
        languages: ['JavaScript', 'Python'],
        dependencies: ['react', 'django'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'Performance test project'
      };

      const startTime = Date.now();
      const result = await detectionEngine.analyze(projectInfo);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.frameworks).toHaveLength(2);
    });

    it('should handle analyzer errors gracefully', async () => {
      const errorAnalyzer: LanguageAnalyzer = {
        name: 'ErrorAnalyzer',
        ecosystem: 'error',
        canAnalyze: () => true,
        analyze: async () => {
          throw new Error('Simulated analyzer error');
        },
        generateCISteps: () => []
      };

      detectionEngine.registerAnalyzer(errorAnalyzer);
      detectionEngine.registerAnalyzer(mockNodeAnalyzer);

      const projectInfo: ProjectInfo = {
        name: 'error-test',
        languages: ['JavaScript'],
        dependencies: ['react'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'Error test project'
      };

      // Should not throw, but handle error gracefully
      const result = await detectionEngine.analyze(projectInfo);
      
      expect(result.frameworks).toHaveLength(1); // Should still detect React
      expect(result.frameworks[0].name).toBe('React');
    });
  });
});