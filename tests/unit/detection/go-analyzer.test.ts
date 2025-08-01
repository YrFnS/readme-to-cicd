import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoAnalyzer } from '../../../src/detection/analyzers/go';
import { ProjectInfo } from '../../../src/detection/interfaces/language-analyzer';
import { FileSystemScanner } from '../../../src/detection/utils/file-scanner';

// Mock the FileSystemScanner
vi.mock('../../../src/detection/utils/file-scanner');

describe('GoAnalyzer', () => {
  let analyzer: GoAnalyzer;
  let mockFileScanner: vi.Mocked<FileSystemScanner>;

  beforeEach(() => {
    analyzer = new GoAnalyzer();
    mockFileScanner = vi.mocked(FileSystemScanner.prototype);
  });

  describe('canAnalyze', () => {
    it('should return true for Go projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Go'],
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

    it('should return true when go.mod is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when go.sum is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.sum'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when go commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['go build'],
        testCommands: ['go test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when golang dependency is mentioned', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: ['golang'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return false for non-Go projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: ['npm build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should detect Gin framework from go.mod', async () => {
      const projectInfo: ProjectInfo = {
        name: 'gin-app',
        languages: ['Go'],
        dependencies: ['gin'],
        buildCommands: ['go build'],
        testCommands: ['go test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Gin web application'
      };

      const mockGoMod = `module gin-app

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
)`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'go.mod') return Promise.resolve(true);
        if (file === 'go.sum') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const ginFramework = result.frameworks.find(f => f.name === 'Gin');
      expect(ginFramework).toBeDefined();
      expect(ginFramework?.name).toBe('Gin');
      expect(ginFramework?.type).toBe('web_framework');
      expect(ginFramework?.confidence).toBeGreaterThan(0.5);
      expect(ginFramework?.metadata?.goVersion).toBe('1.21');
      expect(ginFramework?.metadata?.moduleName).toBe('gin-app');
      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('go');
    });

    it('should detect Echo framework from go.mod', async () => {
      const projectInfo: ProjectInfo = {
        name: 'echo-api',
        languages: ['Go'],
        dependencies: ['echo'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'An Echo web API'
      };

      const mockGoMod = `module echo-api

go 1.20

require (
    github.com/labstack/echo v3.3.10+incompatible
)`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'go.mod') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const echoFramework = result.frameworks.find(f => f.name === 'Echo');
      expect(echoFramework).toBeDefined();
      expect(echoFramework?.name).toBe('Echo');
      expect(echoFramework?.type).toBe('web_framework');
      expect(echoFramework?.metadata?.goVersion).toBe('1.20');
      expect(result.recommendations).toContain('Echo provides built-in middleware. Consider using Echo\'s JWT and CORS middleware.');
    });

    it('should detect Fiber framework from go.mod', async () => {
      const projectInfo: ProjectInfo = {
        name: 'fiber-service',
        languages: ['Go'],
        dependencies: ['fiber'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Fiber web service'
      };

      const mockGoMod = `module fiber-service

go 1.19

require (
    github.com/gofiber/fiber v1.14.6
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const fiberFramework = result.frameworks.find(f => f.name === 'Fiber');
      expect(fiberFramework).toBeDefined();
      expect(fiberFramework?.name).toBe('Fiber');
      expect(fiberFramework?.type).toBe('web_framework');
      expect(result.recommendations).toContain('Fiber is Express-inspired. Consider using Fiber middleware for enhanced functionality.');
    });

    it('should detect Gorilla Mux framework from go.mod', async () => {
      const projectInfo: ProjectInfo = {
        name: 'mux-app',
        languages: ['Go'],
        dependencies: ['mux'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Gorilla Mux web application'
      };

      const mockGoMod = `module mux-app

go 1.21

require (
    github.com/gorilla/mux v1.8.0
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const muxFramework = result.frameworks.find(f => f.name === 'Gorilla Mux');
      expect(muxFramework).toBeDefined();
      expect(muxFramework?.name).toBe('Gorilla Mux');
      expect(muxFramework?.type).toBe('web_framework');
      expect(result.recommendations).toContain('Gorilla Mux is a powerful router. Consider adding Gorilla handlers for middleware support.');
    });

    it('should detect Chi framework from go.mod', async () => {
      const projectInfo: ProjectInfo = {
        name: 'chi-app',
        languages: ['Go'],
        dependencies: ['chi'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Chi web application'
      };

      const mockGoMod = `module chi-app

go 1.20

require (
    github.com/go-chi/chi v1.5.4
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const chiFramework = result.frameworks.find(f => f.name === 'Chi');
      expect(chiFramework).toBeDefined();
      expect(chiFramework?.name).toBe('Chi');
      expect(chiFramework?.type).toBe('web_framework');
    });

    it('should detect multiple frameworks in a project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'multi-framework-project',
        languages: ['Go'],
        dependencies: ['gin', 'echo'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A project with multiple web frameworks'
      };

      const mockGoMod = `module multi-framework-project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/labstack/echo v3.3.10+incompatible
    github.com/gofiber/fiber v1.14.6
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      const frameworkNames = result.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Gin');
      expect(frameworkNames).toContain('Echo');
      expect(frameworkNames).toContain('Fiber');
    });

    it('should detect workspace configuration', async () => {
      const projectInfo: ProjectInfo = {
        name: 'go-workspace',
        languages: ['Go'],
        dependencies: [],
        buildCommands: ['go build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Go workspace project'
      };

      const mockGoMod = `module go-workspace

go 1.21

use (
    ./service1
    ./service2
    ./web-api
)

require (
    github.com/gin-gonic/gin v1.9.1
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.patternsMatched).toContain('workspace_configuration');
      expect(result.recommendations).toContain('Detected Go workspace. Consider using workspace-level CI optimization for multi-module builds.');
      
      // Check that workspace metadata is added to frameworks
      const ginFramework = result.frameworks.find(f => f.name === 'Gin');
      expect(ginFramework?.metadata?.isWorkspace).toBe(true);
    });

    it('should handle go.sum for reproducible builds', async () => {
      const projectInfo: ProjectInfo = {
        name: 'locked-project',
        languages: ['Go'],
        dependencies: ['gin'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod', 'go.sum'],
        rawContent: 'A Go project with go.sum'
      };

      const mockGoMod = `module locked-project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
)`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'go.mod') return Promise.resolve(true);
        if (file === 'go.sum') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.filesAnalyzed).toContain('go.sum');
      expect(result.metadata.patternsMatched).toContain('go_sum_present');
      expect(result.recommendations).toContain('go.sum detected. Include this file in CI for reproducible builds.');
      expect(result.buildTools[0].confidence).toBe(0.95); // Higher confidence with sum file
    });

    it('should extract version information from dependencies', async () => {
      const projectInfo: ProjectInfo = {
        name: 'versioned-project',
        languages: ['Go'],
        dependencies: ['gin'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Go project with versioned dependencies'
      };

      const mockGoMod = `module versioned-project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      const ginFramework = result.frameworks.find(f => f.name === 'Gin');
      expect(ginFramework?.version).toBe('v1.9.1');
    });

    it('should handle indirect dependencies', async () => {
      const projectInfo: ProjectInfo = {
        name: 'indirect-deps-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Go project with indirect dependencies'
      };

      const mockGoMod = `module indirect-deps-project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1 // indirect
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const ginFramework = result.frameworks.find(f => f.name === 'Gin');
      expect(ginFramework).toBeDefined();
      // Indirect dependencies should have lower evidence weight
      expect(ginFramework?.evidence[0].weight).toBe(0.6);
    });

    it('should detect build constraints', async () => {
      const projectInfo: ProjectInfo = {
        name: 'build-constraints-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Go project with build constraints'
      };

      const mockGoMod = `module build-constraints-project

go 1.21`;

      const mockGoFile = `//go:build linux
// +build linux

package main

import "fmt"

func main() {
    fmt.Println("Hello, Linux!")
}`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockImplementation((path) => {
        if (path.includes('go.mod')) return Promise.resolve(mockGoMod);
        if (path.includes('.go')) return Promise.resolve(mockGoFile);
        return Promise.resolve('');
      });
      mockFileScanner.scanProjectFiles.mockResolvedValue(['/test/path/main.go']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.patternsMatched).toContain('build_constraints');
      expect(result.recommendations).toContain('Build constraints detected. Consider using appropriate build tags in CI for different environments.');
    });

    it('should generate appropriate go commands', async () => {
      const projectInfo: ProjectInfo = {
        name: 'go-commands-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: ['go build'],
        testCommands: ['go test -race'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A Go project with race detection'
      };

      const mockGoMod = `module go-commands-project

go 1.21`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools).toHaveLength(1);
      const goBuildTool = result.buildTools[0];
      expect(goBuildTool.name).toBe('go');
      
      const commandNames = goBuildTool.commands.map((cmd: any) => cmd.name);
      expect(commandNames).toContain('build');
      expect(commandNames).toContain('test');
      expect(commandNames).toContain('mod-download');
      expect(commandNames).toContain('mod-tidy');
      expect(commandNames).toContain('vet');
      expect(commandNames).toContain('fmt');
      expect(commandNames).toContain('test-race'); // Because -race was in test commands
    });

    it('should handle missing go.mod gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'no-gomod-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'A Go project without go.mod'
      };

      mockFileScanner.fileExists.mockResolvedValue(false);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks).toHaveLength(0);
      expect(result.buildTools).toHaveLength(0);
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.recommendations).toContain(
        'Add a go.mod file to define your Go module and dependencies.'
      );
    });

    it('should handle go.mod parsing errors', async () => {
      const projectInfo: ProjectInfo = {
        name: 'broken-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockRejectedValue(new Error('Invalid go.mod'));

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.warnings).toContain('Failed to parse go.mod: Invalid go.mod');
      expect(result.buildTools).toHaveLength(1); // Go is still detected from file existence
      expect(result.buildTools[0].name).toBe('go');
    });

    it('should provide appropriate recommendations', async () => {
      const projectInfo: ProjectInfo = {
        name: 'go-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A basic Go project'
      };

      const mockGoMod = `module go-project

go 1.21`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'go.mod') return Promise.resolve(true);
        if (file === 'go.sum') return Promise.resolve(false);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.recommendations).toContain('Run `go mod download` to generate go.sum for reproducible builds.');
      expect(result.recommendations).toContain('No specific Go frameworks detected. Consider adding web framework dependencies to go.mod.');
      expect(result.recommendations).toContain('Add `go vet` and `go fmt` to your CI pipeline for code quality.');
      expect(result.recommendations).toContain('Consider using `go test -race` for race condition detection.');
      expect(result.recommendations).toContain('Use `go mod tidy` to keep dependencies clean.');
    });

    it('should handle analysis errors gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'error-project',
        languages: ['Go'],
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
      expect(result.recommendations).toContain('Unable to complete Go analysis due to errors. Ensure go.mod is present and readable.');
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing project path', async () => {
      const projectInfo: ProjectInfo = {
        name: 'no-path-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      const result = await analyzer.analyze(projectInfo);

      expect(result.confidence).toBe(0.1);
      expect(result.metadata.warnings).toContain('No project path provided, skipping file system analysis');
    });
  });

  describe('go.mod parsing', () => {
    it('should parse simple go.mod correctly', async () => {
      const projectInfo: ProjectInfo = {
        name: 'simple-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: ''
      };

      const mockGoMod = `module simple-project

go 1.21

require github.com/gin-gonic/gin v1.9.1`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      const ginFramework = result.frameworks.find(f => f.name === 'Gin');
      expect(ginFramework).toBeDefined();
      expect(ginFramework?.metadata?.moduleName).toBe('simple-project');
      expect(ginFramework?.metadata?.goVersion).toBe('1.21');
    });

    it('should parse go.mod with require block', async () => {
      const projectInfo: ProjectInfo = {
        name: 'block-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: ''
      };

      const mockGoMod = `module block-project

go 1.20

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/labstack/echo v3.3.10+incompatible
    github.com/some/other v1.0.0 // indirect
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      const ginFramework = result.frameworks.find(f => f.name === 'Gin');
      const echoFramework = result.frameworks.find(f => f.name === 'Echo');
      expect(ginFramework).toBeDefined();
      expect(echoFramework).toBeDefined();
    });

    it('should handle go.mod with comments', async () => {
      const projectInfo: ProjectInfo = {
        name: 'commented-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: ''
      };

      const mockGoMod = `// This is a comment
module commented-project

// Go version comment
go 1.21

// Dependencies
require (
    github.com/gin-gonic/gin v1.9.1 // Web framework
    // github.com/commented/out v1.0.0
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      const ginFramework = result.frameworks.find(f => f.name === 'Gin');
      expect(ginFramework).toBeDefined();
      expect(ginFramework?.metadata?.moduleName).toBe('commented-project');
    });
  });

  describe('confidence calculation', () => {
    it('should return high confidence for well-defined projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'well-defined-project',
        languages: ['Go'],
        dependencies: ['gin'],
        buildCommands: ['go build'],
        testCommands: ['go test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod', 'go.sum'],
        rawContent: 'A well-defined Go web application'
      };

      const mockGoMod = `module well-defined-project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should return low confidence for minimal projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'minimal-project',
        languages: ['Go'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'A minimal Go project'
      };

      mockFileScanner.fileExists.mockResolvedValue(false);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should give bonus confidence for multiple frameworks', async () => {
      const projectInfo: ProjectInfo = {
        name: 'multi-framework-project',
        languages: ['Go'],
        dependencies: ['gin', 'echo'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['go.mod'],
        rawContent: 'A project with multiple frameworks'
      };

      const mockGoMod = `module multi-framework-project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/labstack/echo v3.3.10+incompatible
)`;

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
      mockFileScanner.scanProjectFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeGreaterThan(0.9); // Should get bonus for multiple frameworks
    });
  });
});