/**
 * Template fallback system for missing framework templates
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkflowTemplate, JobTemplate, StepTemplate, FrameworkTemplate, LanguageTemplate } from '../types';
import { DetectionResult, FrameworkDetection, LanguageDetection } from '../interfaces';
import { TemplateLoadError, TemplateCompilationError, GenerationError } from '../errors/generation-errors';
import { GenerationResult, GenerationErrorRecovery } from '../errors/error-recovery';

/**
 * Template hierarchy levels for fallback
 */
export interface TemplateFallbackHierarchy {
  project: string[];
  framework: string[];
  language: string[];
  generic: string[];
}

/**
 * Template fallback configuration
 */
export interface TemplateFallbackConfig {
  enableFallback: boolean;
  templateDirectory: string;
  fallbackHierarchy: TemplateFallbackHierarchy;
  cacheTemplates: boolean;
  validateTemplates: boolean;
  customFallbackRules: FallbackRule[];
}

/**
 * Custom fallback rule
 */
export interface FallbackRule {
  name: string;
  condition: (detection: DetectionResult) => boolean;
  fallbackTemplate: string;
  priority: number;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  name: string;
  type: 'project' | 'framework' | 'language' | 'generic';
  frameworks: string[];
  languages: string[];
  description: string;
  version: string;
  lastModified: Date;
  dependencies: string[];
}

/**
 * Template cache entry
 */
interface TemplateCacheEntry {
  template: WorkflowTemplate;
  metadata: TemplateMetadata;
  compiledAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

/**
 * Default template fallback configuration
 */
const DEFAULT_FALLBACK_CONFIG: TemplateFallbackConfig = {
  enableFallback: true,
  templateDirectory: path.join(__dirname, '../../../templates'),
  fallbackHierarchy: {
    project: [],
    framework: [],
    language: ['nodejs', 'python', 'rust', 'go', 'java'],
    generic: ['ci-basic', 'ci-standard', 'ci-minimal']
  },
  cacheTemplates: true,
  validateTemplates: true,
  customFallbackRules: []
};

/**
 * Template fallback manager
 */
export class TemplateFallbackManager {
  private config: TemplateFallbackConfig;
  private templateCache: Map<string, TemplateCacheEntry> = new Map();
  private errorRecovery: GenerationErrorRecovery;
  private templateMetadataCache: Map<string, TemplateMetadata> = new Map();

  constructor(
    config: Partial<TemplateFallbackConfig> = {},
    errorRecovery?: GenerationErrorRecovery
  ) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };
    this.errorRecovery = errorRecovery || new GenerationErrorRecovery();
  }

  /**
   * Get template with fallback support
   */
  async getTemplateWithFallback(
    detectionResult: DetectionResult,
    templateType: 'workflow' | 'job' | 'step',
    preferredTemplate?: string
  ): Promise<GenerationResult<WorkflowTemplate, GenerationError>> {
    if (!this.config.enableFallback) {
      return this.loadSingleTemplate(preferredTemplate || 'generic');
    }

    // Build fallback hierarchy based on detection results
    const fallbackHierarchy = this.buildFallbackHierarchy(detectionResult, preferredTemplate);

    // Try each template in the hierarchy
    return this.errorRecovery.withTemplateFallback(
      async (templateName: string) => {
        const result = await this.loadTemplate(templateName);
        if (!result.success) {
          throw result.error;
        }
        return result.data;
      },
      fallbackHierarchy,
      'template-loading',
      { detectionResult, templateType }
    );
  }

  /**
   * Get framework-specific template with fallback
   */
  async getFrameworkTemplate(
    framework: FrameworkDetection,
    language: LanguageDetection
  ): Promise<GenerationResult<FrameworkTemplate, GenerationError>> {
    const templateNames = [
      `${framework.name}-${language.name}`,
      `${framework.name}-generic`,
      `${language.name}-${framework.category}`,
      `${language.name}-generic`,
      `${framework.category}-generic`,
      'generic-framework'
    ];

    for (const templateName of templateNames) {
      const result = await this.loadFrameworkTemplate(templateName);
      if (result.success) {
        return result;
      }
    }

    return {
      success: false,
      error: new TemplateLoadError(
        `${framework.name}-${language.name}`,
        'framework-templates',
        undefined,
        { framework: framework.name, language: language.name }
      )
    };
  }

  /**
   * Get language-specific template with fallback
   */
  async getLanguageTemplate(
    language: LanguageDetection
  ): Promise<GenerationResult<LanguageTemplate, GenerationError>> {
    const templateNames = [
      `${language.name}-${language.version}`,
      `${language.name}-latest`,
      `${language.name}-generic`,
      'generic-language'
    ];

    for (const templateName of templateNames) {
      const result = await this.loadLanguageTemplate(templateName);
      if (result.success) {
        return result;
      }
    }

    return {
      success: false,
      error: new TemplateLoadError(
        language.name,
        'language-templates',
        undefined,
        { language: language.name, version: language.version }
      )
    };
  }

  /**
   * Get generic template as last resort
   */
  async getGenericTemplate(
    templateType: 'minimal' | 'basic' | 'standard' | 'comprehensive' = 'basic'
  ): Promise<GenerationResult<WorkflowTemplate, GenerationError>> {
    const genericTemplates = {
      minimal: this.createMinimalTemplate(),
      basic: this.createBasicTemplate(),
      standard: this.createStandardTemplate(),
      comprehensive: this.createComprehensiveTemplate()
    };

    try {
      const template = genericTemplates[templateType];
      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: new TemplateCompilationError(
          `generic-${templateType}`,
          error instanceof Error ? error.message : 'Unknown error'
        )
      };
    }
  }

  /**
   * Load template from file system
   */
  private async loadTemplate(templateName: string): Promise<GenerationResult<WorkflowTemplate, GenerationError>> {
    // Check cache first
    if (this.config.cacheTemplates && this.templateCache.has(templateName)) {
      const cached = this.templateCache.get(templateName)!;
      cached.accessCount++;
      cached.lastAccessed = new Date();
      return { success: true, data: cached.template };
    }

    try {
      const templatePath = path.join(this.config.templateDirectory, `${templateName}.yaml`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Parse and validate template
      const template = await this.parseTemplate(templateContent, templateName);
      
      if (this.config.validateTemplates) {
        const validationResult = await this.validateTemplate(template);
        if (!validationResult.success) {
          throw validationResult.error;
        }
      }

      // Cache template if caching is enabled
      if (this.config.cacheTemplates) {
        const metadata = await this.loadTemplateMetadata(templateName);
        this.templateCache.set(templateName, {
          template,
          metadata,
          compiledAt: new Date(),
          accessCount: 1,
          lastAccessed: new Date()
        });
      }

      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: new TemplateLoadError(
          templateName,
          this.config.templateDirectory,
          error instanceof Error ? error : undefined
        )
      };
    }
  }

  /**
   * Load single template without fallback
   */
  private async loadSingleTemplate(templateName: string): Promise<GenerationResult<WorkflowTemplate, GenerationError>> {
    return this.loadTemplate(templateName);
  }

  /**
   * Load framework-specific template
   */
  private async loadFrameworkTemplate(templateName: string): Promise<GenerationResult<FrameworkTemplate, GenerationError>> {
    try {
      const templatePath = path.join(this.config.templateDirectory, 'frameworks', `${templateName}.yaml`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = await this.parseFrameworkTemplate(templateContent, templateName);
      
      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: new TemplateLoadError(
          templateName,
          path.join(this.config.templateDirectory, 'frameworks'),
          error instanceof Error ? error : undefined
        )
      };
    }
  }

  /**
   * Load language-specific template
   */
  private async loadLanguageTemplate(templateName: string): Promise<GenerationResult<LanguageTemplate, GenerationError>> {
    try {
      const templatePath = path.join(this.config.templateDirectory, 'languages', `${templateName}.yaml`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = await this.parseLanguageTemplate(templateContent, templateName);
      
      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: new TemplateLoadError(
          templateName,
          path.join(this.config.templateDirectory, 'languages'),
          error instanceof Error ? error : undefined
        )
      };
    }
  }

  /**
   * Build fallback hierarchy based on detection results
   */
  private buildFallbackHierarchy(
    detectionResult: DetectionResult,
    preferredTemplate?: string
  ): string[] {
    const hierarchy: string[] = [];

    // Add preferred template first
    if (preferredTemplate) {
      hierarchy.push(preferredTemplate);
    }

    // Apply custom fallback rules
    this.config.customFallbackRules
      .filter(rule => rule.condition(detectionResult))
      .sort((a, b) => b.priority - a.priority)
      .forEach(rule => {
        if (!hierarchy.includes(rule.fallbackTemplate)) {
          hierarchy.push(rule.fallbackTemplate);
        }
      });

    // Add framework-specific templates
    detectionResult.frameworks
      .sort((a, b) => b.confidence - a.confidence)
      .forEach(framework => {
        const frameworkTemplates = [
          `${framework.name}-${framework.version}`,
          `${framework.name}-latest`,
          `${framework.name}-generic`
        ];
        frameworkTemplates.forEach(template => {
          if (!hierarchy.includes(template)) {
            hierarchy.push(template);
          }
        });
      });

    // Add language-specific templates
    detectionResult.languages
      .filter(lang => lang.primary)
      .forEach(language => {
        const languageTemplates = [
          `${language.name}-${language.version}`,
          `${language.name}-latest`,
          `${language.name}-generic`
        ];
        languageTemplates.forEach(template => {
          if (!hierarchy.includes(template)) {
            hierarchy.push(template);
          }
        });
      });

    // Add configured fallback hierarchy
    [...this.config.fallbackHierarchy.framework, 
     ...this.config.fallbackHierarchy.language, 
     ...this.config.fallbackHierarchy.generic].forEach(template => {
      if (!hierarchy.includes(template)) {
        hierarchy.push(template);
      }
    });

    return hierarchy;
  }

  /**
   * Parse template content
   */
  private async parseTemplate(content: string, templateName: string): Promise<WorkflowTemplate> {
    try {
      // This would typically use a YAML parser and template engine
      // For now, return a basic structure
      return JSON.parse(content) as WorkflowTemplate;
    } catch (error) {
      throw new TemplateCompilationError(
        templateName,
        error instanceof Error ? error.message : 'Unknown parsing error'
      );
    }
  }

  /**
   * Parse framework template content
   */
  private async parseFrameworkTemplate(content: string, templateName: string): Promise<FrameworkTemplate> {
    try {
      return JSON.parse(content) as FrameworkTemplate;
    } catch (error) {
      throw new TemplateCompilationError(
        templateName,
        error instanceof Error ? error.message : 'Unknown parsing error'
      );
    }
  }

  /**
   * Parse language template content
   */
  private async parseLanguageTemplate(content: string, templateName: string): Promise<LanguageTemplate> {
    try {
      return JSON.parse(content) as LanguageTemplate;
    } catch (error) {
      throw new TemplateCompilationError(
        templateName,
        error instanceof Error ? error.message : 'Unknown parsing error'
      );
    }
  }

  /**
   * Validate template structure
   */
  private async validateTemplate(template: WorkflowTemplate): Promise<GenerationResult<void, GenerationError>> {
    try {
      // Basic validation - ensure required fields exist
      if (!template.name || !template.jobs || template.jobs.length === 0) {
        throw new Error('Template missing required fields: name, jobs');
      }

      // Validate each job
      for (const job of template.jobs) {
        if (!job.name || !job.runsOn || !job.steps || job.steps.length === 0) {
          throw new Error(`Job '${job.name}' missing required fields: name, runsOn, steps`);
        }

        // Validate each step
        for (const step of job.steps) {
          if (!step.name || (!step.uses && !step.run)) {
            throw new Error(`Step '${step.name}' must have either 'uses' or 'run' field`);
          }
        }
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new TemplateCompilationError(
          template.name,
          error instanceof Error ? error.message : 'Unknown validation error'
        )
      };
    }
  }

  /**
   * Load template metadata
   */
  private async loadTemplateMetadata(templateName: string): Promise<TemplateMetadata> {
    if (this.templateMetadataCache.has(templateName)) {
      return this.templateMetadataCache.get(templateName)!;
    }

    try {
      const metadataPath = path.join(this.config.templateDirectory, 'metadata', `${templateName}.json`);
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent) as TemplateMetadata;
      
      this.templateMetadataCache.set(templateName, metadata);
      return metadata;
    } catch {
      // Return default metadata if file doesn't exist
      const defaultMetadata: TemplateMetadata = {
        name: templateName,
        type: 'generic',
        frameworks: [],
        languages: [],
        description: `Template for ${templateName}`,
        version: '1.0.0',
        lastModified: new Date(),
        dependencies: []
      };
      
      this.templateMetadataCache.set(templateName, defaultMetadata);
      return defaultMetadata;
    }
  }

  /**
   * Create minimal template as last resort
   */
  private createMinimalTemplate(): WorkflowTemplate {
    return {
      name: 'Minimal CI',
      type: 'ci',
      triggers: {
        push: { branches: ['main'] },
        pullRequest: { branches: ['main'] }
      },
      jobs: [{
        name: 'build',
        runsOn: 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4'
          },
          {
            name: 'Build project',
            run: 'echo "Add your build commands here"'
          }
        ]
      }]
    };
  }

  /**
   * Create basic template
   */
  private createBasicTemplate(): WorkflowTemplate {
    return {
      name: 'Basic CI',
      type: 'ci',
      triggers: {
        push: { branches: ['main', 'develop'] },
        pullRequest: { branches: ['main'] }
      },
      permissions: {
        contents: 'read'
      },
      jobs: [{
        name: 'build-and-test',
        runsOn: 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4'
          },
          {
            name: 'Setup environment',
            run: 'echo "Setup your environment here"'
          },
          {
            name: 'Install dependencies',
            run: 'echo "Install dependencies here"'
          },
          {
            name: 'Build project',
            run: 'echo "Build your project here"'
          },
          {
            name: 'Run tests',
            run: 'echo "Run your tests here"'
          }
        ]
      }]
    };
  }

  /**
   * Create standard template
   */
  private createStandardTemplate(): WorkflowTemplate {
    return {
      name: 'Standard CI/CD',
      type: 'ci',
      triggers: {
        push: { branches: ['main', 'develop'] },
        pullRequest: { branches: ['main'] }
      },
      permissions: {
        contents: 'read',
        securityEvents: 'write'
      },
      jobs: [
        {
          name: 'test',
          runsOn: 'ubuntu-latest',
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup environment',
              run: 'echo "Setup your environment here"'
            },
            {
              name: 'Install dependencies',
              run: 'echo "Install dependencies here"'
            },
            {
              name: 'Run linting',
              run: 'echo "Run linting here"'
            },
            {
              name: 'Run tests',
              run: 'echo "Run tests here"'
            },
            {
              name: 'Upload coverage',
              uses: 'codecov/codecov-action@v4',
              if: 'always()'
            }
          ]
        },
        {
          name: 'security',
          runsOn: 'ubuntu-latest',
          needs: ['test'],
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Run security scan',
              run: 'echo "Run security scanning here"'
            }
          ]
        }
      ]
    };
  }

  /**
   * Create comprehensive template
   */
  private createComprehensiveTemplate(): WorkflowTemplate {
    return {
      name: 'Comprehensive CI/CD',
      type: 'ci',
      triggers: {
        push: { branches: ['main', 'develop'] },
        pullRequest: { branches: ['main'] },
        schedule: [{ cron: '0 2 * * 1' }]
      },
      permissions: {
        contents: 'read',
        securityEvents: 'write',
        packages: 'write'
      },
      jobs: [
        {
          name: 'test',
          runsOn: 'ubuntu-latest',
          strategy: {
            matrix: {
              'node-version': ['18', '20'],
              os: ['ubuntu-latest', 'windows-latest']
            }
          },
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup environment',
              run: 'echo "Setup your environment here"'
            },
            {
              name: 'Cache dependencies',
              uses: 'actions/cache@v4',
              with: {
                path: '~/.cache',
                key: 'deps-${{ hashFiles(\'**/package-lock.json\') }}'
              }
            },
            {
              name: 'Install dependencies',
              run: 'echo "Install dependencies here"'
            },
            {
              name: 'Run linting',
              run: 'echo "Run linting here"'
            },
            {
              name: 'Run tests',
              run: 'echo "Run tests here"'
            },
            {
              name: 'Upload coverage',
              uses: 'codecov/codecov-action@v4',
              if: 'always()'
            }
          ]
        },
        {
          name: 'security',
          runsOn: 'ubuntu-latest',
          needs: ['test'],
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Run security scan',
              run: 'echo "Run security scanning here"'
            },
            {
              name: 'Run dependency audit',
              run: 'echo "Run dependency audit here"'
            }
          ]
        },
        {
          name: 'build',
          runsOn: 'ubuntu-latest',
          needs: ['test', 'security'],
          if: 'github.ref == \'refs/heads/main\'',
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Build application',
              run: 'echo "Build application here"'
            },
            {
              name: 'Upload artifacts',
              uses: 'actions/upload-artifact@v4',
              with: {
                name: 'build-artifacts',
                path: 'dist/'
              }
            }
          ]
        }
      ]
    };
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.templateMetadataCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    templateCount: number;
    totalAccesses: number;
    averageAccessCount: number;
    cacheHitRate: number;
  } {
    const entries = Array.from(this.templateCache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      templateCount: entries.length,
      totalAccesses,
      averageAccessCount: entries.length > 0 ? totalAccesses / entries.length : 0,
      cacheHitRate: entries.length > 0 ? totalAccesses / entries.length : 0
    };
  }

  /**
   * Add custom fallback rule
   */
  addFallbackRule(rule: FallbackRule): void {
    this.config.customFallbackRules.push(rule);
    // Sort by priority
    this.config.customFallbackRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TemplateFallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}