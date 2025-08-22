import { ReadmeParserImpl } from '../parser';
import { FrameworkDetectorImpl } from '../detection/framework-detector';
import { YAMLGeneratorImpl } from '../generator/yaml-generator';
import { Result } from '../shared/types/result';

export interface WorkflowRequest {
  readmePath: string;
  outputDir?: string;
  workflowTypes?: string[];
  dryRun?: boolean;
  interactive?: boolean;
}

export interface OrchestrationResult {
  success: boolean;
  generatedFiles: string[];
  detectedFrameworks: string[];
  errors?: string[];
  warnings?: string[];
}

/**
 * Main orchestration engine that coordinates all components
 * to provide end-to-end README-to-CI/CD workflow generation
 */
export class OrchestrationEngine {
  private readmeParser: ReadmeParserImpl;
  private frameworkDetector: FrameworkDetectorImpl;
  private yamlGenerator: YAMLGeneratorImpl;

  constructor() {
    this.readmeParser = new ReadmeParserImpl();
    this.frameworkDetector = new FrameworkDetectorImpl();
    this.yamlGenerator = new YAMLGeneratorImpl();
  }

  /**
   * Convert parser ProjectInfo to detector ProjectInfo format
   */
  private convertProjectInfo(parserProjectInfo: any): any {
    // Extract commands from the categorized structure
    const commands = parserProjectInfo.commands || {};
    const buildCommands = (commands.build || []).map((cmd: any) => cmd.command);
    const testCommands = (commands.test || []).map((cmd: any) => cmd.command);
    
    // Extract dependencies
    const dependencies = parserProjectInfo.dependencies?.packages || [];
    
    // Extract languages
    const languages = (parserProjectInfo.languages || []).map((lang: any) => lang.name);
    
    return {
      name: parserProjectInfo.metadata?.name || 'My Node.js Project',
      description: parserProjectInfo.metadata?.description || 'A sample Node.js application with React frontend.',
      languages,
      dependencies,
      buildCommands,
      testCommands,
      configFiles: parserProjectInfo.dependencies?.packageFiles || [],
      rawContent: 'sample-readme-content' // Add placeholder for cache key generation
    };
  }

  /**
   * Process a complete workflow request from README to generated CI/CD files
   */
  async processWorkflowRequest(request: WorkflowRequest): Promise<Result<OrchestrationResult, Error>> {
    try {
      // Step 1: Parse README file
      const parseResult = await this.readmeParser.parseFile(request.readmePath);
      if (!parseResult.success) {
        return {
          success: false,
          error: new Error(`README parsing failed: ${parseResult.errors?.[0]?.message || 'Unknown parsing error'}`)
        };
      }

      // Step 2: Convert parser output to detector input format
      const detectorProjectInfo = this.convertProjectInfo(parseResult.data);

      // Step 3: Detect frameworks
      console.log('Converted project info for detector:', JSON.stringify(detectorProjectInfo, null, 2));
      
      let detectionResult;
      try {
        detectionResult = await this.frameworkDetector.detectFrameworks(detectorProjectInfo);
        console.log('Detection result:', detectionResult);
        
        // The framework detector returns the detection result directly, not wrapped in a Result
        if (!detectionResult || !detectionResult.frameworks) {
          return {
            success: false,
            error: new Error('Framework detection failed: Invalid detection result')
          };
        }
      } catch (error) {
        console.error('Framework detection threw error:', error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Framework detection failed with unknown error')
        };
      }

      // Step 4: Generate YAML workflows
      const generationOptions = {
        outputDir: request.outputDir || '.github/workflows',
        workflowTypes: request.workflowTypes || ['ci', 'cd'],
        dryRun: request.dryRun || false
      };

      const yamlResult = await this.yamlGenerator.generateWorkflows(
        detectionResult,
        generationOptions
      );

      if (!yamlResult.success) {
        return {
          success: false,
          error: new Error(`YAML generation failed: ${yamlResult.error.message}`)
        };
      }

      // Return successful result
      return {
        success: true,
        data: {
          success: true,
          generatedFiles: yamlResult.data.files || [],
          detectedFrameworks: detectionResult.frameworks?.map(f => f.name) || [],
          warnings: yamlResult.data.warnings || []
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown orchestration error')
      };
    }
  }

  /**
   * Validate system health and component integration
   */
  async validateSystemHealth(): Promise<Result<boolean, Error>> {
    try {
      // Test each component individually
      const components = [
        { name: 'ReadmeParser', instance: this.readmeParser },
        { name: 'FrameworkDetector', instance: this.frameworkDetector },
        { name: 'YAMLGenerator', instance: this.yamlGenerator }
      ];

      for (const component of components) {
        if (!component.instance) {
          return {
            success: false,
            error: new Error(`Component ${component.name} is not initialized`)
          };
        }
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('System health check failed')
      };
    }
  }

  /**
   * Get system status and component information
   */
  getSystemStatus() {
    return {
      components: {
        readmeParser: !!this.readmeParser,
        frameworkDetector: !!this.frameworkDetector,
        yamlGenerator: !!this.yamlGenerator
      },
      version: '1.0.0',
      ready: !!(this.readmeParser && this.frameworkDetector && this.yamlGenerator)
    };
  }
}