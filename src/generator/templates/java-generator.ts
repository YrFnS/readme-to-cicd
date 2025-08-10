/**
 * Java/JVM Workflow Generator
 * Generates GitHub Actions workflows for Java projects and frameworks
 */

import { DetectionResult, WorkflowOutput, GenerationOptions } from '../interfaces';
import { WorkflowTemplate, StepTemplate } from '../types';
import { TemplateManager } from './template-manager';
import * as yaml from 'yaml';

/**
 * Java framework detection information
 */
interface JavaFramework {
  name: string;
  version?: string | undefined;
  buildTool: 'maven' | 'gradle';
  jdkVersion: string;
  hasPomXml: boolean;
  hasBuildGradle: boolean;
  hasGradleWrapper: boolean;
  hasMavenWrapper: boolean;
  hasSpringBoot: boolean;
  hasSpringBootActuator: boolean;
  hasSpringProfiles: boolean;
  hasJUnit: boolean;
  hasTestNG: boolean;
  hasSpotbugs: boolean;
  hasCheckstyle: boolean;
  hasPMD: boolean;
  hasJaCoCo: boolean;
  buildCommand?: string | undefined;
  testCommand?: string | undefined;
  lintCommand?: string | undefined;
  packageCommand?: string | undefined;
  cleanCommand?: string | undefined;
}

/**
 * Java Workflow Generator class
 */
export class JavaWorkflowGenerator {
  private templateManager: TemplateManager;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
  }

  /**
   * Generate Java workflow based on detected frameworks
   */
  async generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput> {
    const javaInfo = this.extractJavaInfo(detectionResult);
    
    if (!javaInfo) {
      throw new Error('No Java framework detected in detection results');
    }

    // Determine the appropriate template based on detected framework and build tool
    const templateName = this.selectTemplate(javaInfo);
    
    // Prepare template data
    const templateData = this.prepareTemplateData(javaInfo, options);
    
    // Compile the template
    const compilationResult = await this.templateManager.compileTemplate(templateName, templateData);
    
    if (compilationResult.errors.length > 0) {
      throw new Error(`Template compilation failed: ${compilationResult.errors.join(', ')}`);
    }

    // Convert to YAML
    const yamlContent = this.templateToYAML(compilationResult.template, templateData);
    
    // Generate filename
    const filename = this.generateFilename(javaInfo, options?.workflowType || 'ci');

    return {
      filename,
      content: yamlContent,
      type: options?.workflowType || 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: `Java ${javaInfo.name} project with ${javaInfo.buildTool}`,
        optimizations: this.getOptimizations(javaInfo),
        warnings: compilationResult.warnings
      }
    };
  }

  /**
   * Extract Java information from detection results
   */
  private extractJavaInfo(detectionResult: DetectionResult): JavaFramework | null {
    // Find Java language
    const javaLanguage = detectionResult.languages.find(lang => 
      lang.name.toLowerCase() === 'java'
    );

    if (!javaLanguage) {
      return null;
    }

    // Find Java frameworks
    const javaFrameworks = detectionResult.frameworks.filter(fw => 
      ['java', 'spring', 'spring-boot', 'micronaut', 'quarkus'].includes(fw.name.toLowerCase())
    );

    if (javaFrameworks.length === 0) {
      // If no specific framework detected, create a generic Java framework entry
      javaFrameworks.push({
        name: 'java',
        confidence: 0.8,
        evidence: ['Java language detected'],
        category: 'backend'
      });
    }

    // Get the primary framework (highest confidence)
    const primaryFramework = javaFrameworks.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    // Detect build tool and build files
    const buildToolInfo = this.detectBuildTool(detectionResult);
    
    // Detect testing frameworks
    const testingFrameworks = detectionResult.testingFrameworks || [];
    const hasJUnit = testingFrameworks.some(fw => 
      fw.name.toLowerCase().includes('junit')
    );
    const hasTestNG = testingFrameworks.some(fw => 
      fw.name.toLowerCase().includes('testng')
    );
    
    // Detect code quality tools
    const hasSpotbugs = detectionResult.buildTools.some(tool => 
      tool.name.toLowerCase().includes('spotbugs')
    );
    const hasCheckstyle = detectionResult.buildTools.some(tool => 
      tool.name.toLowerCase().includes('checkstyle')
    );
    const hasPMD = detectionResult.buildTools.some(tool => 
      tool.name.toLowerCase().includes('pmd')
    );
    const hasJaCoCo = detectionResult.buildTools.some(tool => 
      tool.name.toLowerCase().includes('jacoco')
    );

    // Detect Spring Boot specific features
    const hasSpringBoot = primaryFramework.name.toLowerCase().includes('spring');
    const hasSpringBootActuator = hasSpringBoot && detectionResult.buildTools.some(tool => 
      tool.name.toLowerCase().includes('actuator')
    );
    const hasSpringProfiles = hasSpringBoot;

    // Determine JDK version
    const jdkVersion = this.determineJdkVersion(javaLanguage.version, primaryFramework.name);

    return {
      name: primaryFramework.name.toLowerCase(),
      version: primaryFramework.version || javaLanguage.version,
      buildTool: buildToolInfo.buildTool,
      jdkVersion,
      hasPomXml: buildToolInfo.hasPomXml,
      hasBuildGradle: buildToolInfo.hasBuildGradle,
      hasGradleWrapper: buildToolInfo.hasGradleWrapper,
      hasMavenWrapper: buildToolInfo.hasMavenWrapper,
      hasSpringBoot,
      hasSpringBootActuator,
      hasSpringProfiles,
      hasJUnit,
      hasTestNG,
      hasSpotbugs,
      hasCheckstyle,
      hasPMD,
      hasJaCoCo,
      buildCommand: this.getBuildCommand(primaryFramework.name, buildToolInfo.buildTool),
      testCommand: this.getTestCommand(buildToolInfo.buildTool, hasJUnit, hasTestNG),
      lintCommand: this.getLintCommand(buildToolInfo.buildTool, hasCheckstyle, hasPMD),
      packageCommand: this.getPackageCommand(buildToolInfo.buildTool),
      cleanCommand: this.getCleanCommand(buildToolInfo.buildTool)
    };
  }  /**

   * Detect build tool from detection results
   */
  private detectBuildTool(detectionResult: DetectionResult): {
    buildTool: 'maven' | 'gradle';
    hasPomXml: boolean;
    hasBuildGradle: boolean;
    hasGradleWrapper: boolean;
    hasMavenWrapper: boolean;
  } {
    const buildTools = detectionResult.buildTools || [];
    const packageManagers = detectionResult.packageManagers || [];
    
    // Check for specific build tools and their files
    const hasPomXml = buildTools.some(bt => 
      bt.name.toLowerCase() === 'maven' || bt.configFile === 'pom.xml'
    ) || packageManagers.some(pm => 
      pm.name.toLowerCase() === 'maven' || pm.lockFile === 'pom.xml'
    );
    
    const hasBuildGradle = buildTools.some(bt => 
      bt.name.toLowerCase() === 'gradle' || bt.configFile?.includes('build.gradle')
    ) || packageManagers.some(pm => 
      pm.name.toLowerCase() === 'gradle' || pm.lockFile?.includes('build.gradle')
    );

    // Check for wrapper files
    const hasGradleWrapper = buildTools.some(bt => 
      bt.configFile?.includes('gradlew') || bt.configFile?.includes('gradle-wrapper')
    );
    
    const hasMavenWrapper = buildTools.some(bt => 
      bt.configFile?.includes('mvnw') || bt.configFile?.includes('maven-wrapper')
    );

    // Determine primary build tool - prefer Gradle if both are present
    let buildTool: 'maven' | 'gradle' = 'maven';
    
    if (hasBuildGradle) {
      buildTool = 'gradle';
    } else if (hasPomXml) {
      buildTool = 'maven';
    }

    return {
      buildTool,
      hasPomXml,
      hasBuildGradle,
      hasGradleWrapper,
      hasMavenWrapper
    };
  }

  /**
   * Determine JDK version based on language version and framework
   */
  private determineJdkVersion(languageVersion?: string, frameworkName?: string): string {
    // If explicit version is provided, use it
    if (languageVersion && languageVersion !== 'unknown') {
      return languageVersion;
    }

    // Framework-specific defaults
    switch (frameworkName?.toLowerCase()) {
      case 'spring-boot':
      case 'spring':
        return '17'; // Spring Boot 3.x requires Java 17+
      case 'quarkus':
        return '17'; // Quarkus prefers Java 17+
      case 'micronaut':
        return '17'; // Micronaut 4.x prefers Java 17+
      default:
        return '11'; // Safe default for most Java projects
    }
  }

  /**
   * Select appropriate template based on framework and build tool
   */
  private selectTemplate(javaInfo: JavaFramework): string {
    const framework = javaInfo.name.toLowerCase();
    const buildTool = javaInfo.buildTool;

    // Spring Boot templates
    if (framework.includes('spring') || javaInfo.hasSpringBoot) {
      return `spring-boot-${buildTool}-ci`;
    }

    // Micronaut templates
    if (framework === 'micronaut') {
      return `micronaut-${buildTool}-ci`;
    }

    // Quarkus templates
    if (framework === 'quarkus') {
      return `quarkus-${buildTool}-ci`;
    }

    // Generic Java templates
    return `java-${buildTool}-ci`;
  }

  /**
   * Prepare template data for compilation
   */
  private prepareTemplateData(javaInfo: JavaFramework, options?: GenerationOptions): any {
    const jdkVersion = javaInfo.jdkVersion || '11';
    
    return {
      // Framework info
      framework: javaInfo.name,
      jdkVersion,
      buildTool: javaInfo.buildTool,
      
      // Build tool feature flags
      hasPomXml: javaInfo.hasPomXml,
      hasBuildGradle: javaInfo.hasBuildGradle,
      hasGradleWrapper: javaInfo.hasGradleWrapper,
      hasMavenWrapper: javaInfo.hasMavenWrapper,
      
      // Framework feature flags
      hasSpringBoot: javaInfo.hasSpringBoot,
      hasSpringBootActuator: javaInfo.hasSpringBootActuator,
      hasSpringProfiles: javaInfo.hasSpringProfiles,
      
      // Testing feature flags
      hasJUnit: javaInfo.hasJUnit,
      hasTestNG: javaInfo.hasTestNG,
      
      // Code quality feature flags
      hasSpotbugs: javaInfo.hasSpotbugs,
      hasCheckstyle: javaInfo.hasCheckstyle,
      hasPMD: javaInfo.hasPMD,
      hasJaCoCo: javaInfo.hasJaCoCo,
      
      // Commands
      buildCommand: javaInfo.buildCommand,
      testCommand: javaInfo.testCommand,
      lintCommand: javaInfo.lintCommand,
      packageCommand: javaInfo.packageCommand,
      cleanCommand: javaInfo.cleanCommand,
      
      // Options
      includeComments: options?.includeComments ?? true,
      optimizationLevel: options?.optimizationLevel || 'standard',
      securityLevel: options?.securityLevel || 'standard',
      
      // Matrix strategy - convert array to YAML-compatible format
      jdkVersions: this.getJdkVersionMatrix(jdkVersion, options?.optimizationLevel),
      
      // Environment variables
      environmentVariables: this.getEnvironmentVariables(javaInfo, options),
      
      // Build tool specific flags
      isMaven: javaInfo.buildTool === 'maven',
      isGradle: javaInfo.buildTool === 'gradle',
      
      // Framework specific flags
      isSpringBoot: javaInfo.hasSpringBoot,
      isMicronaut: javaInfo.name === 'micronaut',
      isQuarkus: javaInfo.name === 'quarkus',
      isPlainJava: !javaInfo.hasSpringBoot && javaInfo.name === 'java'
    };
  }

  /**
   * Get build command for framework and build tool
   */
  private getBuildCommand(framework: string, buildTool: 'maven' | 'gradle'): string {
    const frameworkLower = framework.toLowerCase();
    
    if (buildTool === 'maven') {
      if (frameworkLower.includes('spring')) {
        return 'mvn clean compile spring-boot:build-info';
      }
      return 'mvn clean compile';
    } else {
      // Gradle
      if (frameworkLower.includes('spring')) {
        return './gradlew clean build -x test';
      }
      return './gradlew clean build -x test';
    }
  }

  /**
   * Get test command for build tool and testing frameworks
   */
  private getTestCommand(buildTool: 'maven' | 'gradle', hasJUnit: boolean, hasTestNG: boolean): string {
    if (buildTool === 'maven') {
      if (hasTestNG) {
        return 'mvn test -Dtest.framework=testng';
      }
      return 'mvn test';
    } else {
      // Gradle
      return './gradlew test';
    }
  }

  /**
   * Get lint command for build tool and linting tools
   */
  private getLintCommand(buildTool: 'maven' | 'gradle', hasCheckstyle: boolean, hasPMD: boolean): string {
    if (!hasCheckstyle && !hasPMD) {
      return 'echo "No linting tools configured"';
    }
    
    if (buildTool === 'maven') {
      const commands: string[] = [];
      if (hasCheckstyle) {
        commands.push('mvn checkstyle:check');
      }
      if (hasPMD) {
        commands.push('mvn pmd:check');
      }
      return commands.join(' && ');
    } else {
      // Gradle
      const commands: string[] = [];
      if (hasCheckstyle) {
        commands.push('./gradlew checkstyleMain checkstyleTest');
      }
      if (hasPMD) {
        commands.push('./gradlew pmdMain pmdTest');
      }
      return commands.join(' && ');
    }
  }

  /**
   * Get package command for build tool
   */
  private getPackageCommand(buildTool: 'maven' | 'gradle'): string {
    if (buildTool === 'maven') {
      return 'mvn package -DskipTests';
    } else {
      return './gradlew assemble';
    }
  }

  /**
   * Get clean command for build tool
   */
  private getCleanCommand(buildTool: 'maven' | 'gradle'): string {
    if (buildTool === 'maven') {
      return 'mvn clean';
    } else {
      return './gradlew clean';
    }
  }

  /**
   * Get JDK version matrix based on optimization level
   */
  private getJdkVersionMatrix(primaryVersion: string, optimizationLevel?: string): string[] {
    const primary = primaryVersion || '11';
    
    switch (optimizationLevel) {
      case 'basic':
        return [primary];
      case 'aggressive':
        return ['8', '11', '17', '21'];
      default: // standard
        // For modern frameworks, test current and one version back
        if (primary === '21') {
          return ['17', '21'];
        } else if (primary === '17') {
          return ['11', '17'];
        } else if (primary === '11') {
          return ['8', '11'];
        }
        return [primary];
    }
  }

  /**
   * Get environment variables for the workflow
   */
  private getEnvironmentVariables(javaInfo: JavaFramework, options?: GenerationOptions): Record<string, string> {
    const env: Record<string, string> = {};
    
    // Common Java environment variables
    env.JAVA_TOOL_OPTIONS = '-Xmx1024m';
    
    // Build tool specific environment variables
    if (javaInfo.buildTool === 'maven') {
      env.MAVEN_OPTS = '-Xmx1024m';
    } else {
      env.GRADLE_OPTS = '-Xmx1024m -Dorg.gradle.daemon=false';
    }
    
    // Spring Boot specific environment variables
    if (javaInfo.hasSpringBoot) {
      env.SPRING_PROFILES_ACTIVE = 'test';
    }
    
    // Framework-specific environment variables
    if (javaInfo.name === 'quarkus') {
      env.QUARKUS_TEST_PROFILE = 'test';
    }
    
    if (javaInfo.name === 'micronaut') {
      env.MICRONAUT_ENVIRONMENTS = 'test';
    }
    
    return env;
  }  /**
   
* Get optimizations applied to the workflow
   */
  private getOptimizations(javaInfo: JavaFramework): string[] {
    const optimizations: string[] = [];
    
    optimizations.push(`${javaInfo.buildTool} dependency caching enabled`);
    
    if (javaInfo.hasJaCoCo) {
      optimizations.push('Code coverage with JaCoCo enabled');
    }
    
    if (javaInfo.hasCheckstyle || javaInfo.hasPMD) {
      optimizations.push('Code quality checks with static analysis tools');
    }
    
    if (javaInfo.hasSpotbugs) {
      optimizations.push('Bug detection with SpotBugs included');
    }
    
    optimizations.push('Matrix strategy for multiple JDK versions');
    
    if (javaInfo.hasGradleWrapper || javaInfo.hasMavenWrapper) {
      optimizations.push('Build tool wrapper for consistent builds');
    }
    
    if (javaInfo.hasSpringBoot) {
      optimizations.push('Spring Boot optimizations and health checks');
    }
    
    if (javaInfo.buildTool === 'gradle') {
      optimizations.push('Gradle build cache and daemon optimizations');
    } else {
      optimizations.push('Maven local repository caching');
    }
    
    return optimizations;
  }

  /**
   * Convert template to YAML with proper formatting
   */
  private templateToYAML(template: WorkflowTemplate, templateData: any): string {
    // Convert template to GitHub Actions workflow format
    const workflow: any = {
      name: template.name,
      on: template.triggers,
      permissions: template.permissions || { contents: 'read' },
      jobs: {}
    };

    // Add defaults if present
    if (template.defaults) {
      workflow.defaults = template.defaults;
    }

    // Add concurrency if present
    if (template.concurrency) {
      workflow.concurrency = template.concurrency;
    }

    // Convert jobs
    template.jobs.forEach((job, index) => {
      const jobId = job.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      workflow.jobs[jobId] = {
        name: job.name,
        'runs-on': job.runsOn,
        steps: job.steps.map(step => this.processStep(step, templateData)).filter(step => step !== null)
      };

      // Add optional job properties
      if (job.strategy) {
        workflow.jobs[jobId].strategy = job.strategy;
      }
      if (job.needs) {
        workflow.jobs[jobId].needs = job.needs;
      }
      if (job.if) {
        workflow.jobs[jobId].if = job.if;
      }
      if (job.environment) {
        workflow.jobs[jobId].environment = job.environment;
      }
      if (job.permissions) {
        workflow.jobs[jobId].permissions = job.permissions;
      }
      if (job.timeout) {
        workflow.jobs[jobId]['timeout-minutes'] = job.timeout;
      }
    });

    // Convert to YAML with proper formatting
    return yaml.stringify(workflow, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0,
      doubleQuotedAsJSON: false
    });
  }

  /**
   * Process individual step with template data
   */
  private processStep(step: StepTemplate, templateData: any): any | null {
    // Check if step should be included based on conditions
    if (step.if) {
      const condition = this.processTemplate(step.if, templateData);
      // Simple condition evaluation - if it's a template variable that evaluates to false, skip the step
      if (condition === 'false' || condition === '' || condition === 'undefined' || condition === 'null' || condition === 'False') {
        return null;
      }
      // Handle complex conditions like "{{hasSpringBoot}} && {{buildCommand}}"
      if (condition.includes('false') || condition.includes('undefined') || condition.includes('null') || condition.includes(' && ')) {
        // For complex conditions, if any part is false/empty, skip the step
        const parts = condition.split('&&').map(p => p.trim());
        if (parts.some(part => part === 'false' || part === '' || part === 'undefined' || part === 'null')) {
          return null;
        }
      }
    }

    const processedStep: any = {
      name: step.name
    };

    // Add uses or run
    if (step.uses) {
      processedStep.uses = step.uses;
    }
    if (step.run) {
      const runCommand = this.processTemplate(step.run, templateData);
      // Skip step if run command is empty after template processing
      if (runCommand.trim() === '' || runCommand.trim() === "''") {
        return null;
      }
      processedStep.run = runCommand;
    }

    // Skip step if it has neither uses nor run
    if (!processedStep.uses && !processedStep.run) {
      return null;
    }

    // Add with parameters
    if (step.with) {
      processedStep.with = {};
      Object.entries(step.with).forEach(([key, value]) => {
        processedStep.with[key] = this.processTemplate(String(value), templateData);
      });
    }

    // Add environment variables
    if (step.env) {
      processedStep.env = {};
      Object.entries(step.env).forEach(([key, value]) => {
        processedStep.env[key] = this.processTemplate(String(value), templateData);
      });
    }

    // Add conditional (after processing)
    if (step.if) {
      const processedCondition = this.processTemplate(step.if, templateData);
      if (processedCondition !== 'false' && processedCondition !== '' && processedCondition !== 'undefined') {
        processedStep.if = processedCondition;
      }
    }

    // Add other properties
    if (step.continueOnError) {
      processedStep['continue-on-error'] = step.continueOnError;
    }
    if (step.timeout) {
      processedStep['timeout-minutes'] = step.timeout;
    }
    if (step.workingDirectory) {
      processedStep['working-directory'] = step.workingDirectory;
    }

    return processedStep;
  }

  /**
   * Process template strings with data substitution
   */
  private processTemplate(template: string, data: any): string {
    let result = template;
    
    // Simple template variable substitution
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (result.includes(placeholder)) {
        // Handle boolean values specially
        if (typeof value === 'boolean') {
          result = result.replace(new RegExp(placeholder, 'g'), value ? 'true' : 'false');
        } else if (Array.isArray(value)) {
          // Handle arrays by converting to YAML array format
          const yamlArray = '[' + value.map(v => `"${v}"`).join(', ') + ']';
          result = result.replace(new RegExp(placeholder, 'g'), yamlArray);
        } else {
          result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
        }
      }
    });

    return result;
  }

  /**
   * Generate appropriate filename for the workflow
   */
  private generateFilename(javaInfo: JavaFramework, workflowType: string): string {
    const framework = javaInfo.name;
    const buildTool = javaInfo.buildTool;
    const type = workflowType.toLowerCase();
    
    if (framework === 'java') {
      return `java-${buildTool}-${type}.yml`;
    }
    
    return `${framework}-${buildTool}-${type}.yml`;
  }
}