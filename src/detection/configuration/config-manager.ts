import { DetectionLogger, getLogger } from '../utils/logger';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Detection rule configuration
 */
export interface DetectionRuleConfig {
  name: string;
  ecosystem: string;
  enabled: boolean;
  priority: number;
  confidence: {
    baseScore: number;
    evidenceWeights: Record<string, number>;
  };
  patterns: {
    dependencies?: string[];
    files?: string[];
    commands?: string[];
    textPatterns?: string[];
  };
  exclusions?: {
    dependencies?: string[];
    files?: string[];
  };
}

/**
 * CI template configuration
 */
export interface CITemplateConfig {
  name: string;
  framework: string;
  ecosystem: string;
  enabled: boolean;
  priority: number;
  template: {
    setup: CIStepTemplate[];
    build: CIStepTemplate[];
    test: CIStepTemplate[];
    security?: CIStepTemplate[];
    deploy?: CIStepTemplate[];
  };
  variables: Record<string, any>;
  conditions?: {
    requiredFrameworks?: string[];
    excludedFrameworks?: string[];
    minConfidence?: number;
  };
}

/**
 * CI step template
 */
export interface CIStepTemplate {
  name: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string>;
  if?: string;
  continueOnError?: boolean;
}

/**
 * Global configuration
 */
export interface GlobalConfig {
  detection: {
    enableCaching: boolean;
    cacheTimeout: number;
    enableLazyLoading: boolean;
    enablePlugins: boolean;
    confidenceThreshold: number;
    maxAnalyzers: number;
  };
  performance: {
    enableProfiling: boolean;
    enableMetrics: boolean;
    timeoutMs: number;
    maxConcurrency: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableStructuredLogging: boolean;
    enableCorrelationIds: boolean;
  };
}

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  type: 'rule' | 'template' | 'global';
  action: 'added' | 'updated' | 'removed';
  name: string;
  oldValue?: any;
  newValue?: any;
}

/**
 * Configuration manager for framework detection
 */
export class ConfigManager extends EventEmitter {
  private detectionRules = new Map<string, DetectionRuleConfig>();
  private ciTemplates = new Map<string, CITemplateConfig>();
  private globalConfig: GlobalConfig;
  private configPath: string;
  private logger: DetectionLogger;
  private watchMode = false;

  constructor(configPath: string = './config') {
    super();
    this.configPath = configPath;
    this.logger = getLogger();
    
    // Initialize with default global config
    this.globalConfig = this.getDefaultGlobalConfig();
    
    this.logger.info('ConfigManager', 'Configuration manager initialized', {
      configPath: this.configPath
    });
  }

  /**
   * Load configuration from files
   */
  async loadConfig(): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      
      // Load global configuration
      await this.loadGlobalConfig();
      
      // Load detection rules
      await this.loadDetectionRules();
      
      // Load CI templates
      await this.loadCITemplates();
      
      this.logger.info('ConfigManager', 'Configuration loaded successfully', {
        rules: this.detectionRules.size,
        templates: this.ciTemplates.size,
        globalConfig: Object.keys(this.globalConfig).length
      });
      
    } catch (error) {
      this.logger.error('ConfigManager', 'Failed to load configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Save configuration to files
   */
  async saveConfig(): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      
      // Save global configuration
      await this.saveGlobalConfig();
      
      // Save detection rules
      await this.saveDetectionRules();
      
      // Save CI templates
      await this.saveCITemplates();
      
      this.logger.info('ConfigManager', 'Configuration saved successfully');
      
    } catch (error) {
      this.logger.error('ConfigManager', 'Failed to save configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get detection rule by name
   */
  getDetectionRule(name: string): DetectionRuleConfig | undefined {
    return this.detectionRules.get(name);
  }

  /**
   * Get all detection rules
   */
  getDetectionRules(): DetectionRuleConfig[] {
    return Array.from(this.detectionRules.values());
  }

  /**
   * Get detection rules by ecosystem
   */
  getDetectionRulesByEcosystem(ecosystem: string): DetectionRuleConfig[] {
    return Array.from(this.detectionRules.values())
      .filter(rule => rule.ecosystem === ecosystem && rule.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add or update detection rule
   */
  setDetectionRule(rule: DetectionRuleConfig): void {
    const oldRule = this.detectionRules.get(rule.name);
    this.detectionRules.set(rule.name, rule);
    
    this.logger.info('ConfigManager', 'Detection rule updated', {
      rule: rule.name,
      ecosystem: rule.ecosystem,
      enabled: rule.enabled,
      priority: rule.priority
    });
    
    this.emit('configChanged', {
      type: 'rule',
      action: oldRule ? 'updated' : 'added',
      name: rule.name,
      oldValue: oldRule,
      newValue: rule
    } as ConfigChangeEvent);
  }

  /**
   * Remove detection rule
   */
  removeDetectionRule(name: string): boolean {
    const rule = this.detectionRules.get(name);
    if (!rule) {
      return false;
    }
    
    this.detectionRules.delete(name);
    
    this.logger.info('ConfigManager', 'Detection rule removed', { rule: name });
    
    this.emit('configChanged', {
      type: 'rule',
      action: 'removed',
      name,
      oldValue: rule
    } as ConfigChangeEvent);
    
    return true;
  }

  /**
   * Get CI template by name
   */
  getCITemplate(name: string): CITemplateConfig | undefined {
    return this.ciTemplates.get(name);
  }

  /**
   * Get all CI templates
   */
  getCITemplates(): CITemplateConfig[] {
    return Array.from(this.ciTemplates.values());
  }

  /**
   * Get CI templates by framework
   */
  getCITemplatesByFramework(framework: string): CITemplateConfig[] {
    return Array.from(this.ciTemplates.values())
      .filter(template => template.framework === framework && template.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get CI templates by ecosystem
   */
  getCITemplatesByEcosystem(ecosystem: string): CITemplateConfig[] {
    return Array.from(this.ciTemplates.values())
      .filter(template => template.ecosystem === ecosystem && template.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add or update CI template
   */
  setCITemplate(template: CITemplateConfig): void {
    const oldTemplate = this.ciTemplates.get(template.name);
    this.ciTemplates.set(template.name, template);
    
    this.logger.info('ConfigManager', 'CI template updated', {
      template: template.name,
      framework: template.framework,
      ecosystem: template.ecosystem,
      enabled: template.enabled
    });
    
    this.emit('configChanged', {
      type: 'template',
      action: oldTemplate ? 'updated' : 'added',
      name: template.name,
      oldValue: oldTemplate,
      newValue: template
    } as ConfigChangeEvent);
  }

  /**
   * Remove CI template
   */
  removeCITemplate(name: string): boolean {
    const template = this.ciTemplates.get(name);
    if (!template) {
      return false;
    }
    
    this.ciTemplates.delete(name);
    
    this.logger.info('ConfigManager', 'CI template removed', { template: name });
    
    this.emit('configChanged', {
      type: 'template',
      action: 'removed',
      name,
      oldValue: template
    } as ConfigChangeEvent);
    
    return true;
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalConfig {
    return { ...this.globalConfig };
  }

  /**
   * Update global configuration
   */
  setGlobalConfig(config: Partial<GlobalConfig>): void {
    const oldConfig = { ...this.globalConfig };
    this.globalConfig = { ...this.globalConfig, ...config };
    
    this.logger.info('ConfigManager', 'Global configuration updated', {
      changes: Object.keys(config)
    });
    
    this.emit('configChanged', {
      type: 'global',
      action: 'updated',
      name: 'global',
      oldValue: oldConfig,
      newValue: this.globalConfig
    } as ConfigChangeEvent);
  }

  /**
   * Load global configuration from file
   */
  private async loadGlobalConfig(): Promise<void> {
    const configFile = path.join(this.configPath, 'global.json');
    
    try {
      const content = await fs.readFile(configFile, 'utf-8');
      const config = JSON.parse(content);
      this.globalConfig = { ...this.getDefaultGlobalConfig(), ...config };
      
      this.logger.debug('ConfigManager', 'Global config loaded', { configFile });
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        this.logger.warn('ConfigManager', 'Failed to load global config, using defaults', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      // Use default config if file doesn't exist or is invalid
    }
  }

  /**
   * Save global configuration to file
   */
  private async saveGlobalConfig(): Promise<void> {
    const configFile = path.join(this.configPath, 'global.json');
    const content = JSON.stringify(this.globalConfig, null, 2);
    
    await fs.writeFile(configFile, content, 'utf-8');
    this.logger.debug('ConfigManager', 'Global config saved', { configFile });
  }

  /**
   * Load detection rules from directory
   */
  private async loadDetectionRules(): Promise<void> {
    const rulesDir = path.join(this.configPath, 'rules');
    
    try {
      const files = await fs.readdir(rulesDir);
      const ruleFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of ruleFiles) {
        try {
          const filePath = path.join(rulesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const rules = JSON.parse(content);
          
          // Handle both single rule and array of rules
          const ruleArray = Array.isArray(rules) ? rules : [rules];
          
          for (const rule of ruleArray) {
            this.detectionRules.set(rule.name, rule);
          }
          
          this.logger.debug('ConfigManager', 'Detection rules loaded', {
            file,
            rulesCount: ruleArray.length
          });
        } catch (error) {
          this.logger.warn('ConfigManager', 'Failed to load rule file', {
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        this.logger.warn('ConfigManager', 'Failed to read rules directory', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Save detection rules to directory
   */
  private async saveDetectionRules(): Promise<void> {
    const rulesDir = path.join(this.configPath, 'rules');
    await fs.mkdir(rulesDir, { recursive: true });
    
    // Group rules by ecosystem
    const rulesByEcosystem = new Map<string, DetectionRuleConfig[]>();
    
    for (const rule of this.detectionRules.values()) {
      if (!rulesByEcosystem.has(rule.ecosystem)) {
        rulesByEcosystem.set(rule.ecosystem, []);
      }
      rulesByEcosystem.get(rule.ecosystem)!.push(rule);
    }
    
    // Save each ecosystem to its own file
    for (const [ecosystem, rules] of rulesByEcosystem.entries()) {
      const fileName = `${ecosystem}-rules.json`;
      const filePath = path.join(rulesDir, fileName);
      const content = JSON.stringify(rules, null, 2);
      
      await fs.writeFile(filePath, content, 'utf-8');
      this.logger.debug('ConfigManager', 'Rules saved', {
        ecosystem,
        file: fileName,
        rulesCount: rules.length
      });
    }
  }

  /**
   * Load CI templates from directory
   */
  private async loadCITemplates(): Promise<void> {
    const templatesDir = path.join(this.configPath, 'templates');
    
    try {
      const files = await fs.readdir(templatesDir);
      const templateFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of templateFiles) {
        try {
          const filePath = path.join(templatesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const templates = JSON.parse(content);
          
          // Handle both single template and array of templates
          const templateArray = Array.isArray(templates) ? templates : [templates];
          
          for (const template of templateArray) {
            this.ciTemplates.set(template.name, template);
          }
          
          this.logger.debug('ConfigManager', 'CI templates loaded', {
            file,
            templatesCount: templateArray.length
          });
        } catch (error) {
          this.logger.warn('ConfigManager', 'Failed to load template file', {
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        this.logger.warn('ConfigManager', 'Failed to read templates directory', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Save CI templates to directory
   */
  private async saveCITemplates(): Promise<void> {
    const templatesDir = path.join(this.configPath, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    
    // Group templates by ecosystem
    const templatesByEcosystem = new Map<string, CITemplateConfig[]>();
    
    for (const template of this.ciTemplates.values()) {
      if (!templatesByEcosystem.has(template.ecosystem)) {
        templatesByEcosystem.set(template.ecosystem, []);
      }
      templatesByEcosystem.get(template.ecosystem)!.push(template);
    }
    
    // Save each ecosystem to its own file
    for (const [ecosystem, templates] of templatesByEcosystem.entries()) {
      const fileName = `${ecosystem}-templates.json`;
      const filePath = path.join(templatesDir, fileName);
      const content = JSON.stringify(templates, null, 2);
      
      await fs.writeFile(filePath, content, 'utf-8');
      this.logger.debug('ConfigManager', 'Templates saved', {
        ecosystem,
        file: fileName,
        templatesCount: templates.length
      });
    }
  }

  /**
   * Ensure configuration directory exists
   */
  private async ensureConfigDirectory(): Promise<void> {
    await fs.mkdir(this.configPath, { recursive: true });
    await fs.mkdir(path.join(this.configPath, 'rules'), { recursive: true });
    await fs.mkdir(path.join(this.configPath, 'templates'), { recursive: true });
  }

  /**
   * Get default global configuration
   */
  private getDefaultGlobalConfig(): GlobalConfig {
    return {
      detection: {
        enableCaching: true,
        cacheTimeout: 30 * 60 * 1000, // 30 minutes
        enableLazyLoading: true,
        enablePlugins: true,
        confidenceThreshold: 0.5,
        maxAnalyzers: 10
      },
      performance: {
        enableProfiling: false,
        enableMetrics: true,
        timeoutMs: 30000, // 30 seconds
        maxConcurrency: 5
      },
      logging: {
        level: 'info',
        enableStructuredLogging: true,
        enableCorrelationIds: true
      }
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate detection rules
    for (const rule of this.detectionRules.values()) {
      if (!rule.name || rule.name.trim().length === 0) {
        errors.push(`Detection rule missing name: ${JSON.stringify(rule)}`);
      }
      
      if (!rule.ecosystem || rule.ecosystem.trim().length === 0) {
        errors.push(`Detection rule '${rule.name}' missing ecosystem`);
      }
      
      if (rule.priority < 0 || rule.priority > 1000) {
        warnings.push(`Detection rule '${rule.name}' has unusual priority: ${rule.priority}`);
      }
    }

    // Validate CI templates
    for (const template of this.ciTemplates.values()) {
      if (!template.name || template.name.trim().length === 0) {
        errors.push(`CI template missing name: ${JSON.stringify(template)}`);
      }
      
      if (!template.framework || template.framework.trim().length === 0) {
        errors.push(`CI template '${template.name}' missing framework`);
      }
      
      if (!template.template || Object.keys(template.template).length === 0) {
        errors.push(`CI template '${template.name}' missing template definition`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get configuration statistics
   */
  getStats(): {
    detectionRules: number;
    enabledRules: number;
    ciTemplates: number;
    enabledTemplates: number;
    ecosystems: string[];
    frameworks: string[];
  } {
    const rules = Array.from(this.detectionRules.values());
    const templates = Array.from(this.ciTemplates.values());
    
    const ecosystems = [...new Set([
      ...rules.map(r => r.ecosystem),
      ...templates.map(t => t.ecosystem)
    ])];
    
    const frameworks = [...new Set(templates.map(t => t.framework))];

    return {
      detectionRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      ciTemplates: templates.length,
      enabledTemplates: templates.filter(t => t.enabled).length,
      ecosystems,
      frameworks
    };
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.detectionRules.clear();
    this.ciTemplates.clear();
    this.globalConfig = this.getDefaultGlobalConfig();
    
    this.logger.info('ConfigManager', 'Configuration reset to defaults');
    
    this.emit('configChanged', {
      type: 'global',
      action: 'updated',
      name: 'reset',
      newValue: 'defaults'
    } as ConfigChangeEvent);
  }
}

// Singleton instance
let globalConfigManager: ConfigManager | null = null;

/**
 * Get global configuration manager instance
 */
export function getConfigManager(configPath?: string): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager(configPath);
  }
  return globalConfigManager;
}

/**
 * Reset global configuration manager (mainly for testing)
 */
export function resetConfigManager(): void {
  globalConfigManager = null;
}