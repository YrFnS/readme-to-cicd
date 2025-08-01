import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DetectionEngine } from '../../src/detection/detection-engine';
import { GoAnalyzer } from '../../src/detection/analyzers/go';
import { ProjectInfo } from '../../src/detection/interfaces/language-analyzer';
import { FileSystemScanner } from '../../src/detection/utils/file-scanner';

// Mock the FileSystemScanner
vi.mock('../../src/detection/utils/file-scanner');

describe('Go Analyzer Integration', () => {
  let detectionEngine: DetectionEngine;
  let goAnalyzer: GoAnalyzer;
  let mockFileScanner: vi.Mocked<FileSystemScanner>;

  beforeEach(() => {
    detectionEngine = new DetectionEngine();
    goAnalyzer = new GoAnalyzer();
    detectionEngine.registerAnalyzer(goAnalyzer);
    mockFileScanner = vi.mocked(FileSystemScanner.prototype);
  });

  it('should detect Go frameworks through detection engine', async () => {
    const projectInfo: ProjectInfo = {
      name: 'gin-web-app',
      languages: ['Go'],
      dependencies: ['github.com/gin-gonic/gin'],
      buildCommands: ['go build'],
      testCommands: ['go test'],
      installationSteps: ['go mod download'],
      usageExamples: ['go run main.go'],
      configFiles: ['go.mod', 'go.sum'],
      rawContent: 'A Gin web application built with Go'
    };

    // Mock file system for Go analyzer
    const mockGoMod = `module gin-web-app

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

    const result = await detectionEngine.analyze(projectInfo, '/test/path');

    expect(result.frameworks.length).toBeGreaterThan(0);
    expect(result.buildTools.length).toBeGreaterThan(0);
    expect(result.confidence.score).toBeGreaterThan(0.5);
    
    // Should detect Gin framework
    const ginFramework = result.frameworks.find(f => 
      f.name === 'Gin' && f.ecosystem === 'go'
    );
    expect(ginFramework).toBeDefined();
  });

  it('should handle Go projects with multiple frameworks', async () => {
    const projectInfo: ProjectInfo = {
      name: 'multi-framework-go-app',
      languages: ['Go'],
      dependencies: ['github.com/gin-gonic/gin', 'github.com/labstack/echo'],
      buildCommands: ['go build ./...'],
      testCommands: ['go test ./...'],
      installationSteps: ['go mod tidy'],
      usageExamples: [],
      configFiles: ['go.mod'],
      rawContent: 'A Go application using both Gin and Echo frameworks'
    };

    // Mock file system for multi-framework project
    const mockGoMod = `module multi-framework-go-app

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/labstack/echo v3.3.10+incompatible
)`;

    mockFileScanner.fileExists.mockResolvedValue(true);
    mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
    mockFileScanner.scanProjectFiles.mockResolvedValue([]);

    const result = await detectionEngine.analyze(projectInfo, '/test/path');

    expect(result.frameworks.length).toBeGreaterThan(1);
    expect(result.confidence.score).toBeGreaterThan(0.6);
    
    // Should detect both frameworks
    const frameworkNames = result.frameworks.map(f => f.name);
    expect(frameworkNames).toContain('Gin');
    expect(frameworkNames).toContain('Echo');
  });

  it('should provide appropriate recommendations for Go projects', async () => {
    const projectInfo: ProjectInfo = {
      name: 'basic-go-project',
      languages: ['Go'],
      dependencies: [],
      buildCommands: [],
      testCommands: [],
      installationSteps: [],
      usageExamples: [],
      configFiles: ['go.mod'],
      rawContent: 'A basic Go project'
    };

    // Mock file system for basic project
    const mockGoMod = `module basic-go-project

go 1.21`;

    mockFileScanner.fileExists.mockImplementation((path, file) => {
      if (file === 'go.mod') return Promise.resolve(true);
      return Promise.resolve(false);
    });
    mockFileScanner.readConfigFile.mockResolvedValue(mockGoMod);
    mockFileScanner.scanProjectFiles.mockResolvedValue([]);

    const result = await detectionEngine.analyze(projectInfo, '/test/path');

    // Should have build tools detected even if no frameworks
    expect(result.buildTools.length).toBeGreaterThan(0);
    expect(result.buildTools[0].name).toBe('go');
    
    // Should have reasonable confidence for basic Go project
    expect(result.confidence.score).toBeGreaterThan(0.3);
  });

  it('should handle Go projects without go.mod gracefully', async () => {
    const projectInfo: ProjectInfo = {
      name: 'legacy-go-project',
      languages: ['Go'],
      dependencies: [],
      buildCommands: ['go build'],
      testCommands: [],
      installationSteps: [],
      usageExamples: [],
      configFiles: [],
      rawContent: 'A legacy Go project without modules'
    };

    const result = await detectionEngine.analyze(projectInfo);

    // Should still complete analysis without errors
    expect(result).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.frameworks).toBeDefined();
    expect(result.buildTools).toBeDefined();
  });

  it('should register Go analyzer correctly', () => {
    const registeredAnalyzers = detectionEngine.getRegisteredAnalyzers();
    
    expect(registeredAnalyzers.length).toBeGreaterThan(0);
    const goAnalyzerRegistered = registeredAnalyzers.find(a => a.name === 'Go Analyzer');
    expect(goAnalyzerRegistered).toBeDefined();
    expect(goAnalyzerRegistered?.ecosystem).toBe('go');
  });
});