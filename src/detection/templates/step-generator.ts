import { CIStep, CIPipeline } from '../interfaces/ci-pipeline';
import { FrameworkInfo } from '../interfaces/framework-info';
import { DetectionResult } from '../interfaces/detection-result';
import { CITemplateRegistry } from './ci-templates';

/**
 * CI step generation from framework detection results
 */
export class CIStepGenerator {
  private templateRegistry: CITemplateRegistry;

  constructor() {
    this.templateRegistry = new CITemplateRegistry();
  }

  /**
   * Generate complete CI pipeline from detection results
   */
  async generatePipeline(detectionResult: DetectionResult): Promise<CIPipeline> {
    const setup: CIStep[] = [];
    const build: CIStep[] = [];
    const test: CIStep[] = [];
    const security: CIStep[] = [];
    const deploy: CIStep[] = [];
    const cache: any[] = [];

    // Generate steps for each detected framework
    for (const framework of detectionResult.frameworks) {
      const frameworkSteps = this.generateFrameworkSteps(framework);
      
      setup.push(...frameworkSteps.setup);
      build.push(...frameworkSteps.build);
      test.push(...frameworkSteps.test);
      security.push(...frameworkSteps.security);
      deploy.push(...frameworkSteps.deploy);
    }

    // Add container steps if containers are detected
    if (detectionResult.containers.length > 0) {
      const containerSteps = this.generateContainerSteps(detectionResult.containers);
      build.push(...containerSteps.build);
      deploy.push(...containerSteps.deploy);
    }

    return {
      setup: this.deduplicateSteps(setup),
      build: this.deduplicateSteps(build),
      test: this.deduplicateSteps(test),
      security: this.deduplicateSteps(security),
      deploy: this.deduplicateSteps(deploy),
      cache,
      metadata: {
        name: 'Generated CI Pipeline',
        description: 'Automatically generated from framework detection',
        triggers: [
          { type: 'push', branches: ['main', 'master'] },
          { type: 'pull_request', branches: ['main', 'master'] }
        ],
        environments: ['development', 'staging', 'production'],
        secrets: this.extractRequiredSecrets(detectionResult),
        variables: {}
      }
    };
  }

  /**
   * Generate steps for a specific framework
   */
  private generateFrameworkSteps(framework: FrameworkInfo): {
    setup: CIStep[];
    build: CIStep[];
    test: CIStep[];
    security: CIStep[];
    deploy: CIStep[];
  } {
    // TODO: Implement framework-specific step generation
    // This will be implemented in task 11
    
    return {
      setup: [],
      build: [],
      test: [],
      security: [],
      deploy: []
    };
  }

  /**
   * Generate container-related steps
   */
  private generateContainerSteps(containers: any[]): {
    build: CIStep[];
    deploy: CIStep[];
  } {
    // TODO: Implement container step generation
    // This will be implemented in task 11
    
    return {
      build: [],
      deploy: []
    };
  }

  /**
   * Remove duplicate steps based on ID
   */
  private deduplicateSteps(steps: CIStep[]): CIStep[] {
    const stepMap = new Map<string, CIStep>();
    
    steps.forEach(step => {
      if (!stepMap.has(step.id)) {
        stepMap.set(step.id, step);
      }
    });
    
    return Array.from(stepMap.values());
  }

  /**
   * Extract required secrets from detection results
   */
  private extractRequiredSecrets(detectionResult: DetectionResult): string[] {
    const secrets: string[] = [];
    
    // Add common secrets based on detected frameworks
    if (detectionResult.containers.length > 0) {
      secrets.push('DOCKER_USERNAME', 'DOCKER_PASSWORD');
    }
    
    // TODO: Add framework-specific secrets
    
    return Array.from(new Set(secrets));
  }
}