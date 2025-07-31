import { CITemplate, CIStepTemplate } from '../interfaces/detection-rules';

/**
 * CI/CD template definitions for different frameworks
 */
export class CITemplateRegistry {
  private templates: Map<string, CITemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Get CI template for a framework
   */
  getTemplate(frameworkName: string): CITemplate | undefined {
    return this.templates.get(frameworkName.toLowerCase());
  }

  /**
   * Register a new CI template
   */
  registerTemplate(frameworkName: string, template: CITemplate): void {
    this.templates.set(frameworkName.toLowerCase(), template);
  }

  /**
   * Get all available template names
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    // TODO: Add framework-specific templates
    // This will be implemented in task 11
    
    // Example template structure (will be expanded)
    this.registerTemplate('nodejs', {
      setup: [
        {
          id: 'setup-node',
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v3',
          with: {
            'node-version': '{{ nodeVersion }}',
            'cache': '{{ packageManager }}'
          },
          variables: ['nodeVersion', 'packageManager']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: '{{ packageManager }} install',
          variables: ['packageManager']
        }
      ],
      test: [
        {
          id: 'run-tests',
          name: 'Run tests',
          command: '{{ packageManager }} test',
          variables: ['packageManager']
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Node.js CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 5
      }
    });
  }
}