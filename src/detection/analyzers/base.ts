import { LanguageAnalyzer, LanguageDetectionResult, ProjectInfo } from '../interfaces/language-analyzer';
import { FrameworkInfo } from '../interfaces/framework-info';
import { CIStep } from '../interfaces/ci-pipeline';

/**
 * Base implementation for language analyzers
 */
export abstract class BaseLanguageAnalyzer implements LanguageAnalyzer {
  abstract readonly name: string;
  abstract readonly ecosystem: string;

  /**
   * Check if this analyzer can analyze the given project
   */
  abstract canAnalyze(projectInfo: ProjectInfo): boolean;

  /**
   * Analyze project and detect frameworks
   */
  abstract analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult>;

  /**
   * Generate CI/CD steps for detected frameworks
   */
  abstract generateCISteps(frameworks: FrameworkInfo[]): CIStep[];

  /**
   * Helper method to create framework info
   */
  protected createFrameworkInfo(
    name: string,
    type: any,
    confidence: number,
    evidence: any[] = [],
    version?: string
  ): FrameworkInfo {
    return {
      name,
      type,
      confidence,
      evidence,
      ecosystem: this.ecosystem,
      ...(version && { version }),
      metadata: {
        detectedBy: this.name,
        detectedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Helper method to create CI step
   */
  protected createCIStep(
    id: string,
    name: string,
    category: any,
    command?: string,
    uses?: string
  ): CIStep {
    return {
      id,
      name,
      category,
      ...(command && { command }),
      ...(uses && { uses })
    };
  }

  /**
   * Helper method to check if dependency exists in project
   */
  protected hasDependency(projectInfo: ProjectInfo, dependency: string): boolean {
    return projectInfo.dependencies.some(dep => 
      dep.toLowerCase().includes(dependency.toLowerCase())
    );
  }

  /**
   * Helper method to check if command exists in project
   */
  protected hasCommand(projectInfo: ProjectInfo, command: string): boolean {
    return [...projectInfo.buildCommands, ...projectInfo.testCommands]
      .some(cmd => cmd.toLowerCase().includes(command.toLowerCase()));
  }

  /**
   * Helper method to check if config file is mentioned
   */
  protected hasConfigFile(projectInfo: ProjectInfo, configFile: string): boolean {
    return projectInfo.configFiles.some(file => 
      file.toLowerCase().includes(configFile.toLowerCase())
    );
  }
}