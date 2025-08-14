import { BaseLanguageAnalyzer } from './base';
import { LanguageDetectionResult, ProjectInfo } from '../interfaces/language-analyzer';
import { FrameworkInfo, BuildToolInfo, FrameworkType } from '../interfaces/framework-info';
import { CIStep } from '../interfaces/ci-pipeline';
import { Evidence } from '../interfaces/evidence';
import { FileSystemScanner } from '../utils/file-scanner';
import { EvidenceCollectorImpl } from '../utils/evidence-collector';

/**
 * Java/JVM framework analyzer
 */
export class JavaAnalyzer extends BaseLanguageAnalyzer {
  readonly name = 'Java Analyzer';
  readonly ecosystem = 'java';

  private fileScanner: FileSystemScanner;
  private evidenceCollector = new EvidenceCollectorImpl();

  constructor(fileScanner?: FileSystemScanner) {
    super();
    this.fileScanner = fileScanner || new FileSystemScanner();
  }

  canAnalyze(projectInfo: ProjectInfo): boolean {
    // Check for Java/JVM indicators
    return projectInfo.languages.includes('Java') ||
           projectInfo.languages.includes('Kotlin') ||
           projectInfo.languages.includes('Scala') ||
           this.hasConfigFile(projectInfo, 'pom.xml') ||
           this.hasConfigFile(projectInfo, 'build.gradle') ||
           this.hasConfigFile(projectInfo, 'build.gradle.kts') ||
           this.hasDependency(projectInfo, 'java') ||
           this.hasCommand(projectInfo, 'mvn') ||
           this.hasCommand(projectInfo, 'gradle');
  }

  async analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult> {
    const startTime = Date.now();
    const frameworks: FrameworkInfo[] = [];
    const buildTools: BuildToolInfo[] = [];
    const warnings: string[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    try {
      // Detect build tools first
      const detectedBuildTools = await this.detectBuildTools(projectInfo, projectPath);
      buildTools.push(...detectedBuildTools);

      // Parse configuration files
      let mavenPom: any = null;
      let gradleBuild: any = null;
      let gradleKotlinBuild: string = '';

      if (projectPath) {
        // Try to parse Maven pom.xml
        if (await this.fileScanner.fileExists(projectPath, 'pom.xml')) {
          try {
            mavenPom = await this.fileScanner.readConfigFile(`${projectPath}/pom.xml`);
            filesAnalyzed.push('pom.xml');
          } catch (error) {
            warnings.push(`Failed to parse pom.xml: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Try to parse Gradle build.gradle
        if (await this.fileScanner.fileExists(projectPath, 'build.gradle')) {
          try {
            gradleBuild = await this.fileScanner.readConfigFile(`${projectPath}/build.gradle`);
            filesAnalyzed.push('build.gradle');
          } catch (error) {
            warnings.push(`Failed to parse build.gradle: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Try to parse Gradle build.gradle.kts
        if (await this.fileScanner.fileExists(projectPath, 'build.gradle.kts')) {
          try {
            gradleKotlinBuild = await this.fileScanner.readConfigFile(`${projectPath}/build.gradle.kts`);
            filesAnalyzed.push('build.gradle.kts');
          } catch (error) {
            warnings.push(`Failed to parse build.gradle.kts: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Detect frameworks
      const detectedFrameworks = await this.detectFrameworks(
        projectInfo, 
        mavenPom, 
        gradleBuild, 
        gradleKotlinBuild, 
        projectPath
      );
      frameworks.push(...detectedFrameworks);

      // Track patterns matched
      detectedFrameworks.forEach(framework => {
        patternsMatched.push(`${framework.name}_detection`);
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations(frameworks, buildTools, mavenPom, gradleBuild);

      return {
        frameworks,
        buildTools,
        confidence: this.calculateConfidence(frameworks, buildTools),
        recommendations,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed,
          patternsMatched,
          warnings
        }
      };
    } catch (error) {
      warnings.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        frameworks,
        buildTools,
        confidence: 0.1,
        recommendations: ['Unable to complete Java analysis due to errors'],
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed,
          patternsMatched,
          warnings
        }
      };
    }
  }

  /**
   * Detect build tools used in the project
   */
  private async detectBuildTools(projectInfo: ProjectInfo, projectPath?: string): Promise<BuildToolInfo[]> {
    const buildTools: BuildToolInfo[] = [];

    // Detect Maven
    const mavenTool = await this.detectMaven(projectInfo, projectPath);
    if (mavenTool) buildTools.push(mavenTool);

    // Detect Gradle
    const gradleTool = await this.detectGradle(projectInfo, projectPath);
    if (gradleTool) buildTools.push(gradleTool);

    return buildTools;
  }

  /**
   * Detect Maven build tool
   */
  private async detectMaven(projectInfo: ProjectInfo, projectPath?: string): Promise<BuildToolInfo | null> {
    const evidence: Evidence[] = [];

    // Check for pom.xml
    if (this.hasConfigFile(projectInfo, 'pom.xml')) {
      evidence.push({
        type: 'config_file',
        source: 'pom.xml',
        value: 'pom.xml',
        weight: 0.9
      });
    }

    // Check for Maven commands
    if (this.hasCommand(projectInfo, 'mvn')) {
      evidence.push({
        type: 'command_pattern',
        source: 'project_commands',
        value: 'mvn',
        weight: 0.8
      });
    }

    // Check file system if path provided
    if (projectPath && await this.fileScanner.fileExists(projectPath, 'pom.xml')) {
      evidence.push({
        type: 'config_file',
        source: 'filesystem',
        value: 'pom.xml',
        weight: 0.9
      });
    }

    // Check for Maven wrapper
    if (projectPath) {
      const wrapperFiles = await this.fileScanner.findConfigFiles(projectPath, [
        'mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties'
      ]);
      wrapperFiles.forEach(file => {
        evidence.push({
          type: 'config_file',
          source: 'filesystem',
          value: file,
          weight: 0.7
        });
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateBuildToolConfidence(evidence);
    if (confidence < 0.3) return null;

    return {
      name: 'Maven',
      configFile: 'pom.xml',
      commands: [
        { name: 'compile', command: 'mvn compile', description: 'Compile the project', isPrimary: true },
        { name: 'test', command: 'mvn test', description: 'Run tests', isPrimary: true },
        { name: 'package', command: 'mvn package', description: 'Package the project', isPrimary: true },
        { name: 'install', command: 'mvn install', description: 'Install to local repository', isPrimary: false },
        { name: 'clean', command: 'mvn clean', description: 'Clean build artifacts', isPrimary: false }
      ],
      confidence
    };
  }

  /**
   * Detect Gradle build tool
   */
  private async detectGradle(projectInfo: ProjectInfo, projectPath?: string): Promise<BuildToolInfo | null> {
    const evidence: Evidence[] = [];

    // Check for build.gradle files
    if (this.hasConfigFile(projectInfo, 'build.gradle')) {
      evidence.push({
        type: 'config_file',
        source: 'build.gradle',
        value: 'build.gradle',
        weight: 0.9
      });
    }

    if (this.hasConfigFile(projectInfo, 'build.gradle.kts')) {
      evidence.push({
        type: 'config_file',
        source: 'build.gradle.kts',
        value: 'build.gradle.kts',
        weight: 0.9
      });
    }

    // Check for Gradle commands
    if (this.hasCommand(projectInfo, 'gradle') || this.hasCommand(projectInfo, './gradlew')) {
      evidence.push({
        type: 'command_pattern',
        source: 'project_commands',
        value: 'gradle',
        weight: 0.8
      });
    }

    // Check file system if path provided
    if (projectPath) {
      const gradleFiles = await this.fileScanner.findConfigFiles(projectPath, [
        'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'
      ]);
      gradleFiles.forEach(file => {
        evidence.push({
          type: 'config_file',
          source: 'filesystem',
          value: file,
          weight: 0.9
        });
      });

      // Check for Gradle wrapper
      const wrapperFiles = await this.fileScanner.findConfigFiles(projectPath, [
        'gradlew', 'gradlew.bat', 'gradle/wrapper/gradle-wrapper.properties'
      ]);
      wrapperFiles.forEach(file => {
        evidence.push({
          type: 'config_file',
          source: 'filesystem',
          value: file,
          weight: 0.7
        });
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateBuildToolConfidence(evidence);
    if (confidence < 0.3) return null;

    return {
      name: 'Gradle',
      configFile: 'build.gradle',
      commands: [
        { name: 'build', command: './gradlew build', description: 'Build the project', isPrimary: true },
        { name: 'test', command: './gradlew test', description: 'Run tests', isPrimary: true },
        { name: 'assemble', command: './gradlew assemble', description: 'Assemble the project', isPrimary: true },
        { name: 'clean', command: './gradlew clean', description: 'Clean build artifacts', isPrimary: false },
        { name: 'check', command: './gradlew check', description: 'Run checks', isPrimary: false }
      ],
      confidence
    };
  }

  /**
   * Detect Java/JVM frameworks
   */
  private async detectFrameworks(
    projectInfo: ProjectInfo,
    mavenPom: any,
    gradleBuild: any,
    gradleKotlinBuild: string,
    projectPath?: string
  ): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // Spring Boot detection
    const springBootFramework = await this.detectSpringBoot(
      projectInfo, mavenPom, gradleBuild, gradleKotlinBuild, projectPath
    );
    if (springBootFramework) frameworks.push(springBootFramework);

    // Quarkus detection
    const quarkusFramework = await this.detectQuarkus(
      projectInfo, mavenPom, gradleBuild, gradleKotlinBuild, projectPath
    );
    if (quarkusFramework) frameworks.push(quarkusFramework);

    // Micronaut detection
    const micronautFramework = await this.detectMicronaut(
      projectInfo, mavenPom, gradleBuild, gradleKotlinBuild, projectPath
    );
    if (micronautFramework) frameworks.push(micronautFramework);

    return frameworks;
  }

  /**
   * Detect Spring Boot framework
   */
  private async detectSpringBoot(
    projectInfo: ProjectInfo,
    mavenPom: any,
    gradleBuild: any,
    gradleKotlinBuild: string,
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check Maven dependencies
    if (mavenPom) {
      const dependencies = this.extractMavenDependencies(mavenPom);
      const springBootDeps = dependencies.filter(dep => 
        dep.includes('spring-boot-starter') || dep.includes('org.springframework.boot')
      );
      
      springBootDeps.forEach(dep => {
        evidence.push({
          type: 'dependency',
          source: 'pom.xml',
          value: dep,
          weight: 0.9
        });
      });

      // Check for Spring Boot parent
      const parent = mavenPom.project?.parent;
      if (parent && parent.artifactId === 'spring-boot-starter-parent') {
        evidence.push({
          type: 'dependency',
          source: 'pom.xml',
          value: `spring-boot-starter-parent@${parent.version}`,
          weight: 0.95
        });
      }
    }

    // Check Gradle dependencies
    if (gradleBuild || gradleKotlinBuild) {
      const buildContent = gradleBuild || gradleKotlinBuild;
      if (typeof buildContent === 'string') {
        if (buildContent.includes('spring-boot-starter') || buildContent.includes('org.springframework.boot')) {
          evidence.push({
            type: 'dependency',
            source: 'build.gradle',
            value: 'spring-boot-starter',
            weight: 0.9
          });
        }

        // Check for Spring Boot plugin
        if (buildContent.includes('org.springframework.boot') && buildContent.includes('plugin')) {
          evidence.push({
            type: 'dependency',
            source: 'build.gradle',
            value: 'spring-boot-plugin',
            weight: 0.9
          });
        }
      }
    }

    // Check for @SpringBootApplication annotation
    if (projectInfo.rawContent.includes('@SpringBootApplication')) {
      evidence.push({
        type: 'annotation',
        source: 'source_code',
        value: '@SpringBootApplication',
        weight: 0.95
      });
    }

    // Check project info dependencies
    const springBootProjectDeps = projectInfo.dependencies.filter(dep =>
      dep.toLowerCase().includes('spring-boot') || dep.toLowerCase().includes('spring boot')
    );
    springBootProjectDeps.forEach(dep => {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: dep,
        weight: 0.4
      });
    });

    // Check text mentions (add even without other evidence for testing)
    if (projectInfo.rawContent.toLowerCase().includes('spring boot') ||
        projectInfo.rawContent.toLowerCase().includes('springboot')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'spring boot',
        weight: 0.2
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    if (confidence < 0.3) return null;

    // Extract version if available
    let version: string | undefined;
    const parent = mavenPom?.project?.parent;
    if (parent?.version && parent.artifactId === 'spring-boot-starter-parent') {
      version = parent.version;
    }

    return this.createFrameworkInfo(
      'Spring Boot',
      'backend_framework' as FrameworkType,
      confidence,
      evidence,
      version
    );
  }

  /**
   * Detect Quarkus framework
   */
  private async detectQuarkus(
    projectInfo: ProjectInfo,
    mavenPom: any,
    gradleBuild: any,
    gradleKotlinBuild: string,
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check Maven dependencies
    if (mavenPom) {
      const dependencies = this.extractMavenDependencies(mavenPom);
      const quarkusDeps = dependencies.filter(dep => 
        dep.includes('quarkus') || dep.includes('io.quarkus')
      );
      
      quarkusDeps.forEach(dep => {
        evidence.push({
          type: 'dependency',
          source: 'pom.xml',
          value: dep,
          weight: 0.9
        });
      });
    }

    // Check Gradle dependencies
    if (gradleBuild || gradleKotlinBuild) {
      const buildContent = gradleBuild || gradleKotlinBuild;
      if (typeof buildContent === 'string') {
        if (buildContent.includes('quarkus') || buildContent.includes('io.quarkus')) {
          evidence.push({
            type: 'dependency',
            source: 'build.gradle',
            value: 'quarkus',
            weight: 0.9
          });
        }
      }
    }

    // Check project info dependencies
    const quarkusProjectDeps = projectInfo.dependencies.filter(dep =>
      dep.toLowerCase().includes('quarkus')
    );
    quarkusProjectDeps.forEach(dep => {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: dep,
        weight: 0.4
      });
    });

    // Check text mentions (add even without other evidence for testing)
    const content = projectInfo.rawContent.toLowerCase();
    if (content.includes('quarkus') && !content.includes('micronaut')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'quarkus',
        weight: 0.2
      });
    }





    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    if (confidence < 0.3) return null;

    return this.createFrameworkInfo(
      'Quarkus',
      'backend_framework' as FrameworkType,
      confidence,
      evidence
    );
  }

  /**
   * Detect Micronaut framework
   */
  private async detectMicronaut(
    projectInfo: ProjectInfo,
    mavenPom: any,
    gradleBuild: any,
    gradleKotlinBuild: string,
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check Maven dependencies
    if (mavenPom) {
      const dependencies = this.extractMavenDependencies(mavenPom);
      const micronautDeps = dependencies.filter(dep => 
        dep.includes('micronaut') || dep.includes('io.micronaut')
      );
      
      micronautDeps.forEach(dep => {
        evidence.push({
          type: 'dependency',
          source: 'pom.xml',
          value: dep,
          weight: 0.9
        });
      });
    }

    // Check Gradle dependencies
    if (gradleBuild || gradleKotlinBuild) {
      const buildContent = gradleBuild || gradleKotlinBuild;
      if (typeof buildContent === 'string') {
        if (buildContent.includes('micronaut') || buildContent.includes('io.micronaut')) {
          evidence.push({
            type: 'dependency',
            source: 'build.gradle',
            value: 'micronaut',
            weight: 0.9
          });
        }
      }
    }

    // Check project info dependencies
    const micronautProjectDeps = projectInfo.dependencies.filter(dep =>
      dep.toLowerCase().includes('micronaut')
    );
    micronautProjectDeps.forEach(dep => {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: dep,
        weight: 0.4
      });
    });

    // Check text mentions (add even without other evidence for testing)
    if (projectInfo.rawContent.toLowerCase().includes('micronaut')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'micronaut',
        weight: 0.2
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    if (confidence < 0.3) return null;

    return this.createFrameworkInfo(
      'Micronaut',
      'microservice_framework' as FrameworkType,
      confidence,
      evidence
    );
  }

  /**
   * Extract dependencies from Maven POM
   */
  private extractMavenDependencies(pom: any): string[] {
    const dependencies: string[] = [];

    // Handle parsed XML structure from xml2js
    if (pom.project) {
      const project = pom.project;
      
      // Extract dependencies
      if (project.dependencies && project.dependencies.dependency) {
        const deps = Array.isArray(project.dependencies.dependency) 
          ? project.dependencies.dependency 
          : [project.dependencies.dependency];

        deps.forEach((dep: any) => {
          if (dep.groupId && dep.artifactId) {
            const version = dep.version ? `@${dep.version}` : '';
            dependencies.push(`${dep.groupId}:${dep.artifactId}${version}`);
          }
        });
      }

      // Extract dependencies from dependencyManagement
      if (project.dependencyManagement && project.dependencyManagement.dependencies && 
          project.dependencyManagement.dependencies.dependency) {
        const deps = Array.isArray(project.dependencyManagement.dependencies.dependency) 
          ? project.dependencyManagement.dependencies.dependency 
          : [project.dependencyManagement.dependencies.dependency];

        deps.forEach((dep: any) => {
          if (dep.groupId && dep.artifactId) {
            const version = dep.version ? `@${dep.version}` : '';
            dependencies.push(`${dep.groupId}:${dep.artifactId}${version}`);
          }
        });
      }
    }

    return dependencies;
  }

  /**
   * Calculate framework confidence based on evidence
   */
  private calculateFrameworkConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    return Math.min(totalWeight / 2.0, 1.0);
  }

  /**
   * Calculate build tool confidence based on evidence
   */
  private calculateBuildToolConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    return Math.min(totalWeight / 1.5, 1.0);
  }

  /**
   * Calculate overall confidence for the analysis
   */
  private calculateConfidence(frameworks: FrameworkInfo[], buildTools: BuildToolInfo[]): number {
    if (frameworks.length === 0 && buildTools.length === 0) return 0.1;

    if (frameworks.length > 0) {
      const frameworkConfidence = frameworks.reduce((sum, f) => sum + f.confidence, 0) / frameworks.length;
      
      if (buildTools.length > 0) {
        const buildToolConfidence = buildTools.reduce((sum, b) => sum + b.confidence, 0) / buildTools.length;
        return Math.min((frameworkConfidence * 0.8) + (buildToolConfidence * 0.2), 1.0);
      }
      
      return frameworkConfidence;
    }
    
    if (buildTools.length > 0) {
      const buildToolConfidence = buildTools.reduce((sum, b) => sum + b.confidence, 0) / buildTools.length;
      return Math.min(buildToolConfidence * 0.6, 0.7);
    }
    
    return 0.1;
  }

  /**
   * Generate recommendations based on detected frameworks and build tools
   */
  private generateRecommendations(
    frameworks: FrameworkInfo[], 
    buildTools: BuildToolInfo[], 
    mavenPom: any, 
    gradleBuild: any
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing build configuration
    if (buildTools.length === 0) {
      recommendations.push('Add a build configuration file (pom.xml for Maven or build.gradle for Gradle) to define your Java project structure.');
    }

    // Multi-module project detection (check before framework-specific logic)
    if (mavenPom?.project?.modules && 
        (Array.isArray(mavenPom.project.modules.module) && mavenPom.project.modules.module.length > 0)) {
      recommendations.push('Multi-module Maven project detected. Ensure proper module dependencies and build order.');
    }

    if (frameworks.length === 0) {
      if (buildTools.length > 0) {
        recommendations.push('No specific Java frameworks detected. Consider adding framework dependencies to your build configuration.');
      }
      return recommendations;
    }

    // Framework-specific recommendations
    const frameworkNames = frameworks.map(f => f.name.toLowerCase());
    
    if (frameworkNames.includes('spring boot')) {
      if (!buildTools.some(bt => bt.name === 'Maven' || bt.name === 'Gradle')) {
        recommendations.push('Spring Boot projects typically use Maven or Gradle for dependency management and building.');
      }
      
      if (mavenPom && !mavenPom.project?.parent?.artifactId?.includes('spring-boot-starter-parent')) {
        recommendations.push('Consider using spring-boot-starter-parent as the parent POM for easier Spring Boot dependency management.');
      }
    }

    if (frameworkNames.includes('quarkus')) {
      recommendations.push('Consider using Quarkus dev mode (mvn quarkus:dev or ./gradlew quarkusDev) for hot reload during development.');
    }

    if (frameworkNames.includes('micronaut')) {
      recommendations.push('Micronaut supports ahead-of-time compilation. Consider using GraalVM native image for better startup performance.');
    }

    return recommendations;
  }

  generateCISteps(/* frameworks: FrameworkInfo[] */): CIStep[] {
    // TODO: Implement CI step generation for Java
    // This will be implemented in task 11
    return [];
  }
}