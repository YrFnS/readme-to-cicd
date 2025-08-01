import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeJSAnalyzer } from '../../../src/detection/analyzers/nodejs';
import { ProjectInfo } from '../../../src/detection/interfaces/language-analyzer';
import { FileSystemScanner } from '../../../src/detection/utils/file-scanner';

// Mock the FileSystemScanner
vi.mock('../../../src/detection/utils/file-scanner');

describe('NodeJSAnalyzer', () => {
  let analyzer: NodeJSAnalyzer;
  let mockFileScanner: vi.Mocked<FileSystemScanner>;

  beforeEach(() => {
    analyzer = new NodeJSAnalyzer();
    mockFileScanner = vi.mocked(FileSystemScanner.prototype);
  });

  describe('canAnalyze', () => {
    it('should return true for JavaScript projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true for TypeScript projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['TypeScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when package.json is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when npm commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when yarn commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['yarn build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return false for non-Node.js projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: ['python setup.py build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should detect React framework from package.json dependencies', async () => {
      const projectInfo: ProjectInfo = {
        name: 'react-app',
        languages: ['JavaScript'],
        dependencies: ['react', 'react-dom'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: 'A React application'
      };

      const mockPackageJson = {
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        scripts: {
          start: 'react-scripts start',
          build: 'react-scripts build'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const reactFramework = result.frameworks.find(f => f.name === 'React');
      expect(reactFramework).toBeDefined();
      expect(reactFramework?.name).toBe('React');
      expect(result.frameworks[0].type).toBe('frontend_framework');
      expect(result.frameworks[0].confidence).toBeGreaterThan(0.5);
      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('npm');
    });

    it('should detect Vue.js framework', async () => {
      const projectInfo: ProjectInfo = {
        name: 'vue-app',
        languages: ['JavaScript'],
        dependencies: ['vue'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: 'A Vue.js application'
      };

      const mockPackageJson = {
        dependencies: {
          vue: '^3.0.0'
        },
        devDependencies: {
          '@vue/cli-service': '^5.0.0'
        }
      };

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'package.json') return Promise.resolve(true);
        if (file === 'vue.config.js') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['yarn.lock']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const vueFramework = result.frameworks.find(f => f.name === 'Vue.js');
      expect(vueFramework).toBeDefined();
      expect(vueFramework?.name).toBe('Vue.js');
      expect(result.frameworks[0].type).toBe('frontend_framework');
      expect(result.buildTools[0].name).toBe('yarn');
    });

    it('should detect Angular framework', async () => {
      const projectInfo: ProjectInfo = {
        name: 'angular-app',
        languages: ['TypeScript'],
        dependencies: ['@angular/core'],
        buildCommands: ['ng build'],
        testCommands: ['ng test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json', 'angular.json'],
        rawContent: 'An Angular application'
      };

      const mockPackageJson = {
        dependencies: {
          '@angular/core': '^15.0.0',
          '@angular/common': '^15.0.0'
        },
        devDependencies: {
          '@angular/cli': '^15.0.0'
        },
        scripts: {
          build: 'ng build',
          test: 'ng test',
          serve: 'ng serve'
        }
      };

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'package.json') return Promise.resolve(true);
        if (file === 'angular.json') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const angularFramework = result.frameworks.find(f => f.name === 'Angular');
      expect(angularFramework).toBeDefined();
      expect(angularFramework?.name).toBe('Angular');
      expect(result.frameworks[0].type).toBe('frontend_framework');
      expect(result.frameworks[0].confidence).toBeGreaterThan(0.7);
    });

    it('should detect Next.js framework', async () => {
      const projectInfo: ProjectInfo = {
        name: 'nextjs-app',
        languages: ['JavaScript', 'TypeScript'],
        dependencies: ['next', 'react'],
        buildCommands: ['next build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: 'A Next.js application'
      };

      const mockPackageJson = {
        dependencies: {
          next: '^13.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['next.config.js', 'package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2); // Next.js and React
      const nextFramework = result.frameworks.find(f => f.name === 'Next.js');
      expect(nextFramework).toBeDefined();
      expect(nextFramework?.type).toBe('fullstack_framework');
    });

    it('should detect Express framework', async () => {
      const projectInfo: ProjectInfo = {
        name: 'express-api',
        languages: ['JavaScript'],
        dependencies: ['express'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: 'An Express.js API server'
      };

      const mockPackageJson = {
        dependencies: {
          express: '^4.18.0'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const expressFramework = result.frameworks.find(f => f.name === 'Express');
      expect(expressFramework).toBeDefined();
      expect(expressFramework?.name).toBe('Express');
      expect(expressFramework?.type).toBe('backend_framework');
    });

    it('should detect NestJS framework', async () => {
      const projectInfo: ProjectInfo = {
        name: 'nestjs-api',
        languages: ['TypeScript'],
        dependencies: ['@nestjs/core'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: 'A NestJS application'
      };

      const mockPackageJson = {
        dependencies: {
          '@nestjs/core': '^9.0.0',
          '@nestjs/common': '^9.0.0'
        },
        devDependencies: {
          '@nestjs/cli': '^9.0.0'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const nestFramework = result.frameworks.find(f => f.name === 'NestJS');
      expect(nestFramework).toBeDefined();
      expect(nestFramework?.name).toBe('NestJS');
      expect(nestFramework?.type).toBe('backend_framework');
    });

    it('should detect multiple frameworks in a monorepo', async () => {
      const projectInfo: ProjectInfo = {
        name: 'fullstack-app',
        languages: ['JavaScript', 'TypeScript'],
        dependencies: ['react', 'express', 'next'],
        buildCommands: ['npm run build:client', 'npm run build:server'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: 'A full-stack application with React frontend and Express backend'
      };

      const mockPackageJson = {
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
          express: '^4.18.0',
          next: '^13.0.0'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      const frameworkNames = result.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('React');
      expect(frameworkNames).toContain('Express');
      expect(frameworkNames).toContain('Next.js');
    });

    it('should handle missing package.json gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'js-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'A JavaScript project without package.json'
      };

      mockFileScanner.fileExists.mockResolvedValue(false);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks).toHaveLength(0);
      expect(result.confidence).toBeLessThan(0.7); // Adjusted for build tool confidence
      expect(result.recommendations).toContain(
        'Add a package.json file to better define your Node.js project structure and dependencies.'
      );
    });

    it('should handle package.json parsing errors', async () => {
      const projectInfo: ProjectInfo = {
        name: 'broken-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockRejectedValue(new Error('Invalid JSON'));

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.warnings).toContain('Failed to parse package.json: Invalid JSON');
      expect(result.frameworks).toHaveLength(0);
    });

    it('should detect package managers correctly', async () => {
      const projectInfo: ProjectInfo = {
        name: 'yarn-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: ['yarn build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json', 'yarn.lock'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue({});
      mockFileScanner.findConfigFiles.mockResolvedValue(['yarn.lock']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('yarn');
      expect(result.buildTools[0].configFile).toBe('yarn.lock');
    });

    it('should provide appropriate recommendations', async () => {
      const projectInfo: ProjectInfo = {
        name: 'react-project',
        languages: ['JavaScript'],
        dependencies: ['react'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: 'A React application'
      };

      const mockPackageJson = {
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        }
        // Missing scripts
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.recommendations).toContain('Add a build script to package.json for consistent build processes.');
      expect(result.recommendations).toContain('Add test scripts to package.json to enable automated testing.');
      expect(result.recommendations).toContain('Consider using Next.js for server-side rendering and better performance with React.');
    });

    it('should handle analysis errors gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'error-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockRejectedValue(new Error('File system error'));

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBe(0.1);
      expect(result.recommendations).toContain('Unable to complete Node.js analysis due to errors');
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('package manager detection', () => {
    it('should prioritize yarn when yarn.lock is present', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json', 'yarn.lock', 'package-lock.json'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue({});
      mockFileScanner.findConfigFiles.mockResolvedValue(['yarn.lock', 'package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools[0].name).toBe('yarn');
    });

    it('should detect pnpm when pnpm-lock.yaml is present', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: ['pnpm build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue({});
      mockFileScanner.findConfigFiles.mockResolvedValue(['pnpm-lock.yaml']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools[0].name).toBe('pnpm');
    });
  });

  describe('confidence calculation', () => {
    it('should return high confidence for well-defined projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'well-defined-project',
        languages: ['TypeScript'],
        dependencies: ['react', 'react-dom'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: 'A well-defined React TypeScript project'
      };

      const mockPackageJson = {
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        scripts: {
          build: 'react-scripts build',
          test: 'react-scripts test'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockPackageJson);
      mockFileScanner.findConfigFiles.mockResolvedValue(['package-lock.json']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should return low confidence for minimal projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'minimal-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'A minimal JavaScript project'
      };

      mockFileScanner.fileExists.mockResolvedValue(false);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeLessThan(0.7); // Adjusted for build tool confidence
    });
  });
});