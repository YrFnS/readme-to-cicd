import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JavaAnalyzer } from '../../../src/detection/analyzers/java';
import { ProjectInfo } from '../../../src/detection/interfaces/language-analyzer';
import { FileSystemScanner } from '../../../src/detection/utils/file-scanner';

// Mock the FileSystemScanner
vi.mock('../../../src/detection/utils/file-scanner');

describe('JavaAnalyzer', () => {
  let analyzer: JavaAnalyzer;
  let mockFileScanner: any;

  beforeEach(() => {
    analyzer = new JavaAnalyzer();
    mockFileScanner = vi.mocked(FileSystemScanner.prototype);
  });

  describe('canAnalyze', () => {
    it('should return true for Java projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Java'],
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

    it('should return true for Kotlin projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Kotlin'],
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

    it('should return true for Scala projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Scala'],
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

    it('should return true when pom.xml is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when build.gradle is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['build.gradle'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when build.gradle.kts is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['build.gradle.kts'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when Maven commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['mvn clean compile'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when Gradle commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['./gradlew build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return false for non-Java projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: [],
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
    it('should detect Maven build tool', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Java'],
        dependencies: [],
        buildCommands: ['mvn clean compile'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: ''
      };

      mockFileScanner.fileExists = vi.fn().mockResolvedValue(false);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo);

      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('Maven');
      expect(result.buildTools[0].configFile).toBe('pom.xml');
      expect(result.buildTools[0].commands).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'compile', command: 'mvn compile' }),
          expect.objectContaining({ name: 'test', command: 'mvn test' }),
          expect.objectContaining({ name: 'package', command: 'mvn package' })
        ])
      );
    });

    it('should detect Gradle build tool', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Java'],
        dependencies: [],
        buildCommands: ['./gradlew build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['build.gradle'],
        rawContent: ''
      };

      mockFileScanner.fileExists = vi.fn().mockResolvedValue(false);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo);

      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('Gradle');
      expect(result.buildTools[0].configFile).toBe('build.gradle');
      expect(result.buildTools[0].commands).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'build', command: './gradlew build' }),
          expect.objectContaining({ name: 'test', command: './gradlew test' }),
          expect.objectContaining({ name: 'assemble', command: './gradlew assemble' })
        ])
      );
    });

    it('should detect Spring Boot framework from Maven POM', async () => {
      const projectInfo: ProjectInfo = {
        name: 'spring-boot-app',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: 'Spring Boot application'
      };

      const mockPom = {
        project: {
          parent: {
            groupId: 'org.springframework.boot',
            artifactId: 'spring-boot-starter-parent',
            version: '3.2.0'
          },
          dependencies: {
            dependency: [
              {
                groupId: 'org.springframework.boot',
                artifactId: 'spring-boot-starter-web',
                version: '3.2.0'
              }
            ]
          }
        }
      };

      mockFileScanner.fileExists = vi.fn()
        .mockImplementation((path: string, file: string) => {
          return Promise.resolve(file === 'pom.xml');
        });
      mockFileScanner.readConfigFile = vi.fn()
        .mockResolvedValue(mockPom);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].name).toBe('Spring Boot');
      expect(result.frameworks[0].type).toBe('backend_framework');
      expect(result.frameworks[0].version).toBe('3.2.0');
      expect(result.frameworks[0].confidence).toBeGreaterThan(0.3);
    });

    it('should detect Spring Boot framework from @SpringBootApplication annotation', async () => {
      const projectInfo: ProjectInfo = {
        name: 'spring-boot-app',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: '@SpringBootApplication\npublic class Application {\n  public static void main(String[] args) {\n    SpringApplication.run(Application.class, args);\n  }\n}'
      };

      mockFileScanner.fileExists = vi.fn().mockResolvedValue(false);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo);

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].name).toBe('Spring Boot');
      expect(result.frameworks[0].type).toBe('backend_framework');
      expect(result.frameworks[0].confidence).toBeGreaterThan(0.5);
    });

    it('should detect Quarkus framework from Maven dependencies', async () => {
      const projectInfo: ProjectInfo = {
        name: 'quarkus-app',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: 'Quarkus application'
      };

      const mockPom = {
        project: {
          dependencies: {
            dependency: [
              {
                groupId: 'io.quarkus',
                artifactId: 'quarkus-resteasy',
                version: '3.5.0'
              }
            ]
          }
        }
      };

      mockFileScanner.fileExists = vi.fn()
        .mockImplementation((path: string, file: string) => {
          return Promise.resolve(file === 'pom.xml');
        });
      mockFileScanner.readConfigFile = vi.fn()
        .mockResolvedValue(mockPom);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].name).toBe('Quarkus');
      expect(result.frameworks[0].type).toBe('backend_framework');
      expect(result.frameworks[0].confidence).toBeGreaterThan(0.3);
    });

    it('should detect Micronaut framework from Gradle build', async () => {
      const projectInfo: ProjectInfo = {
        name: 'micronaut-app',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['build.gradle'],
        rawContent: 'Micronaut application'
      };

      const mockGradleBuild = `
        dependencies {
          implementation 'io.micronaut:micronaut-http-server-netty'
          implementation 'io.micronaut:micronaut-inject'
        }
      `;

      mockFileScanner.fileExists = vi.fn()
        .mockImplementation((path: string, file: string) => {
          return Promise.resolve(file === 'build.gradle');
        });
      mockFileScanner.readConfigFile = vi.fn()
        .mockImplementation((filePath: string) => {
          if (filePath.includes('build.gradle')) {
            return Promise.resolve(mockGradleBuild);
          }
          return Promise.reject(new Error('File not found'));
        });
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].name).toBe('Micronaut');
      expect(result.frameworks[0].type).toBe('microservice_framework');
      expect(result.frameworks[0].confidence).toBeGreaterThan(0.3);
    });

    it('should detect multiple frameworks', async () => {
      const projectInfo: ProjectInfo = {
        name: 'multi-framework-app',
        languages: ['Java'],
        dependencies: ['spring-boot-starter', 'quarkus-core'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'Spring Boot and Quarkus application'
      };

      mockFileScanner.fileExists = vi.fn().mockResolvedValue(false);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo);

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const frameworkNames = result.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Spring Boot');
    });

    it('should handle Maven wrapper detection', async () => {
      const projectInfo: ProjectInfo = {
        name: 'maven-wrapper-project',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: ''
      };

      mockFileScanner.fileExists = vi.fn().mockResolvedValue(false);
      mockFileScanner.findConfigFiles = vi.fn()
        .mockImplementation((path: string, patterns: string[]) => {
          if (patterns.includes('mvnw')) {
            return Promise.resolve(['mvnw', 'mvnw.cmd']);
          }
          return Promise.resolve([]);
        });

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('Maven');
      expect(result.buildTools[0].confidence).toBeGreaterThan(0.5);
    });

    it('should handle Gradle wrapper detection', async () => {
      const projectInfo: ProjectInfo = {
        name: 'gradle-wrapper-project',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['build.gradle'],
        rawContent: ''
      };

      mockFileScanner.fileExists = vi.fn().mockResolvedValue(false);
      mockFileScanner.findConfigFiles = vi.fn()
        .mockImplementation((path: string, patterns: string[]) => {
          if (patterns.includes('gradlew')) {
            return Promise.resolve(['gradlew', 'gradlew.bat']);
          }
          if (patterns.includes('build.gradle')) {
            return Promise.resolve(['build.gradle']);
          }
          return Promise.resolve([]);
        });

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools.length).toBeGreaterThanOrEqual(1);
      const gradleTool = result.buildTools.find(tool => tool.name === 'Gradle');
      expect(gradleTool).toBeDefined();
      expect(gradleTool!.confidence).toBeGreaterThan(0.5);
    });

    it('should handle XML parsing errors gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'broken-pom-project',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: ''
      };

      mockFileScanner.fileExists = vi.fn()
        .mockImplementation((path: string, file: string) => {
          return Promise.resolve(file === 'pom.xml');
        });
      mockFileScanner.readConfigFile = vi.fn()
        .mockRejectedValue(new Error('Invalid XML'));
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.warnings.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0); // Should still detect build tools from project info
    });

    it('should generate appropriate recommendations', async () => {
      const projectInfo: ProjectInfo = {
        name: 'no-build-config',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      mockFileScanner.fileExists = vi.fn().mockResolvedValue(false);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo);

      expect(result.recommendations).toContain(
        'Add a build configuration file (pom.xml for Maven or build.gradle for Gradle) to define your Java project structure.'
      );
    });

    it('should recommend Spring Boot parent POM when missing', async () => {
      const projectInfo: ProjectInfo = {
        name: 'spring-boot-no-parent',
        languages: ['Java'],
        dependencies: ['spring-boot-starter'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: 'Spring Boot application'
      };

      const mockPom = {
        project: {
          dependencies: {
            dependency: [
              {
                groupId: 'org.springframework.boot',
                artifactId: 'spring-boot-starter-web'
              }
            ]
          }
        }
      };

      mockFileScanner.fileExists = vi.fn()
        .mockImplementation((path: string, file: string) => {
          return Promise.resolve(file === 'pom.xml');
        });
      mockFileScanner.readConfigFile = vi.fn()
        .mockResolvedValue(mockPom);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      // Should detect Spring Boot framework and recommend parent POM
      expect(result.frameworks.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => 
        rec.includes('spring-boot-starter-parent')
      )).toBe(true);
    });

    it('should calculate confidence correctly', async () => {
      const projectInfo: ProjectInfo = {
        name: 'high-confidence-project',
        languages: ['Java'],
        dependencies: [],
        buildCommands: ['mvn clean compile'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: '@SpringBootApplication'
      };

      mockFileScanner.fileExists = vi.fn().mockResolvedValue(false);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo);

      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle multi-module Maven projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'multi-module-project',
        languages: ['Java'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pom.xml'],
        rawContent: ''
      };

      const mockPom = {
        project: {
          modules: {
            module: ['module1', 'module2']
          }
        }
      };

      mockFileScanner.fileExists = vi.fn()
        .mockImplementation((path: string, file: string) => {
          return Promise.resolve(file === 'pom.xml');
        });
      mockFileScanner.readConfigFile = vi.fn()
        .mockResolvedValue(mockPom);
      mockFileScanner.findConfigFiles = vi.fn().mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.recommendations.some(rec => 
        rec.includes('Multi-module Maven project')
      )).toBe(true);
    });
  });

  describe('ecosystem and name', () => {
    it('should have correct ecosystem and name', () => {
      expect(analyzer.ecosystem).toBe('java');
      expect(analyzer.name).toBe('Java Analyzer');
    });
  });
});