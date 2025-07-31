import { FrameworkRule, DetectionCriteria } from '../interfaces/detection-rules';

/**
 * Framework detection rules registry
 */
export class FrameworkRulesRegistry {
  private rules: Map<string, FrameworkRule> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Get rule for a framework
   */
  getRule(frameworkName: string): FrameworkRule | undefined {
    return this.rules.get(frameworkName.toLowerCase());
  }

  /**
   * Get all rules for an ecosystem
   */
  getRulesForEcosystem(ecosystem: string): FrameworkRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.ecosystem === ecosystem);
  }

  /**
   * Register a new framework rule
   */
  registerRule(rule: FrameworkRule): void {
    this.rules.set(rule.name.toLowerCase(), rule);
  }

  /**
   * Get all available framework names
   */
  getAvailableFrameworks(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Initialize default framework rules
   */
  private initializeRules(): void {
    // TODO: Add comprehensive framework rules
    // This will be implemented in tasks 4-10
    
    // Example rule structure (will be expanded)
    this.registerRule({
      name: 'React',
      ecosystem: 'nodejs',
      detectionCriteria: {
        dependencies: [
          { packageName: 'react', weight: 0.8, dependencyType: 'dependencies' },
          { packageName: 'react-dom', weight: 0.7, dependencyType: 'dependencies' }
        ],
        packageFiles: [
          { fileName: 'package.json', requiredFields: ['dependencies'], weight: 0.9 }
        ],
        textPatterns: [
          { pattern: 'react', weight: 0.3, context: 'any' }
        ],
        minimumConfidence: 0.5
      },
      ciTemplate: {
        setup: [
          {
            id: 'setup-node',
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v3',
            with: { 'node-version': '{{ nodeVersion }}' },
            variables: ['nodeVersion']
          }
        ],
        build: [
          {
            id: 'build-react',
            name: 'Build React app',
            command: '{{ packageManager }} run build',
            variables: ['packageManager']
          }
        ],
        test: [
          {
            id: 'test-react',
            name: 'Run React tests',
            command: '{{ packageManager }} test',
            variables: ['packageManager']
          }
        ],
        metadata: {
          version: '1.0.0',
          description: 'React framework CI template',
          requiredSecrets: [],
          estimatedDuration: 5
        }
      },
      priority: 100,
      metadata: {
        version: '1.0.0',
        description: 'React framework detection rule',
        lastUpdated: new Date(),
        tags: ['frontend', 'javascript', 'react']
      }
    });
  }
}