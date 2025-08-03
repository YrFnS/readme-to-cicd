import { LanguageAnalyzer } from '../interfaces/language-analyzer';
import { DetectionLogger, getLogger } from '../utils/logger';
import { EventEmitter } from 'events';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  ecosystem: string;
  supportedFrameworks: string[];
  dependencies?: string[];
  homepage?: string;
  repository?: string;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  priority: number;
  settings?: Record<string, any>;
}

/**
 * Plugin registration info
 */
export interface PluginInfo {
  metadata: PluginMetadata;
  config: PluginConfig;
  analyzer: LanguageAnalyzer;
  registeredAt: Date;
  loadTime: number;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
}

/**
 * Plugin system events
 */
export interface PluginSystemEvents {
  'plugin:registered': (pluginInfo: PluginInfo) => void;
  'plugin:unregistered': (pluginName: string) => void;
  'plugin:enabled': (pluginName: string) => void;
  'plugin:disabled': (pluginName: string) => void;
  'plugin:error': (pluginName: string, error: Error) => void;
}

/**
 * Plugin validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Plugin system for extensible framework detection
 */
export class PluginSystem extends EventEmitter {
  private plugins = new Map<string, PluginInfo>();
  private pluginConfigs = new Map<string, PluginConfig>();
  private logger: DetectionLogger;

  constructor() {
    super();
    this.logger = getLogger();
    this.logger.info('PluginSystem', 'Plugin system initialized');
  }

  /**
   * Register a plugin
   */
  async registerPlugin(
    analyzer: LanguageAnalyzer,
    metadata: PluginMetadata,
    config: Partial<PluginConfig> = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Validate plugin
      const validation = this.validatePlugin(analyzer, metadata);
      if (!validation.valid) {
        this.logger.error('PluginSystem', 'Plugin validation failed', undefined, {
          pluginName: metadata.name,
          errors: validation.errors
        });
        return false;
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        this.logger.warn('PluginSystem', 'Plugin validation warnings', {
          plugin: metadata.name,
          warnings: validation.warnings
        });
      }

      // Check for conflicts
      if (this.plugins.has(metadata.name)) {
        this.logger.warn('PluginSystem', 'Plugin already registered, updating', {
          plugin: metadata.name
        });
      }

      // Merge config with defaults
      const finalConfig: PluginConfig = {
        enabled: true,
        priority: 100,
        ...config
      };

      // Create plugin info
      const pluginInfo: PluginInfo = {
        metadata,
        config: finalConfig,
        analyzer,
        registeredAt: new Date(),
        loadTime: Date.now() - startTime,
        status: finalConfig.enabled ? 'active' : 'inactive'
      };

      // Register the plugin
      this.plugins.set(metadata.name, pluginInfo);
      this.pluginConfigs.set(metadata.name, finalConfig);

      this.logger.info('PluginSystem', 'Plugin registered successfully', {
        plugin: metadata.name,
        version: metadata.version,
        ecosystem: metadata.ecosystem,
        frameworks: metadata.supportedFrameworks,
        loadTime: pluginInfo.loadTime,
        enabled: finalConfig.enabled
      });

      // Emit registration event
      this.emit('plugin:registered', pluginInfo);

      return true;

    } catch (error) {
      this.logger.error('PluginSystem', 'Failed to register plugin', error instanceof Error ? error : new Error(String(error)), {
        pluginName: metadata.name
      });

      // Store error info
      const errorInfo: PluginInfo = {
        metadata,
        config: { enabled: false, priority: 0 },
        analyzer,
        registeredAt: new Date(),
        loadTime: Date.now() - startTime,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error)
      };

      this.plugins.set(metadata.name, errorInfo);
      this.emit('plugin:error', metadata.name, error instanceof Error ? error : new Error(String(error)));

      return false;
    }
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn('PluginSystem', 'Plugin not found for unregistration', { plugin: pluginName });
      return false;
    }

    this.plugins.delete(pluginName);
    this.pluginConfigs.delete(pluginName);

    this.logger.info('PluginSystem', 'Plugin unregistered', { plugin: pluginName });
    this.emit('plugin:unregistered', pluginName);

    return true;
  }

  /**
   * Enable a plugin
   */
  enablePlugin(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn('PluginSystem', 'Plugin not found for enabling', { plugin: pluginName });
      return false;
    }

    if (plugin.status === 'error') {
      this.logger.warn('PluginSystem', 'Cannot enable plugin with errors', {
        plugin: pluginName,
        error: plugin.errorMessage
      });
      return false;
    }

    plugin.config.enabled = true;
    plugin.status = 'active';
    this.pluginConfigs.set(pluginName, plugin.config);

    this.logger.info('PluginSystem', 'Plugin enabled', { plugin: pluginName });
    this.emit('plugin:enabled', pluginName);

    return true;
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn('PluginSystem', 'Plugin not found for disabling', { plugin: pluginName });
      return false;
    }

    plugin.config.enabled = false;
    plugin.status = 'inactive';
    this.pluginConfigs.set(pluginName, plugin.config);

    this.logger.info('PluginSystem', 'Plugin disabled', { plugin: pluginName });
    this.emit('plugin:disabled', pluginName);

    return true;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get active analyzers from enabled plugins
   */
  getActiveAnalyzers(): LanguageAnalyzer[] {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.config.enabled && plugin.status === 'active')
      .sort((a, b) => b.config.priority - a.config.priority) // Higher priority first
      .map(plugin => plugin.analyzer);
  }

  /**
   * Get plugin by name
   */
  getPlugin(pluginName: string): PluginInfo | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get plugins by ecosystem
   */
  getPluginsByEcosystem(ecosystem: string): PluginInfo[] {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.metadata.ecosystem === ecosystem);
  }

  /**
   * Get plugins supporting a specific framework
   */
  getPluginsByFramework(framework: string): PluginInfo[] {
    return Array.from(this.plugins.values())
      .filter(plugin => 
        plugin.metadata.supportedFrameworks.some(f => 
          f.toLowerCase().includes(framework.toLowerCase())
        )
      );
  }

  /**
   * Update plugin configuration
   */
  updatePluginConfig(pluginName: string, config: Partial<PluginConfig>): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn('PluginSystem', 'Plugin not found for config update', { plugin: pluginName });
      return false;
    }

    const oldEnabled = plugin.config.enabled;
    plugin.config = { ...plugin.config, ...config };
    this.pluginConfigs.set(pluginName, plugin.config);

    // Update status based on enabled flag
    if (plugin.status !== 'error') {
      plugin.status = plugin.config.enabled ? 'active' : 'inactive';
    }

    this.logger.info('PluginSystem', 'Plugin configuration updated', {
      plugin: pluginName,
      config: plugin.config
    });

    // Emit events if enabled status changed
    if (oldEnabled !== plugin.config.enabled) {
      if (plugin.config.enabled) {
        this.emit('plugin:enabled', pluginName);
      } else {
        this.emit('plugin:disabled', pluginName);
      }
    }

    return true;
  }

  /**
   * Validate plugin before registration
   */
  private validatePlugin(analyzer: LanguageAnalyzer, metadata: PluginMetadata): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate metadata
    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Plugin name is required');
    }

    if (!metadata.version || metadata.version.trim().length === 0) {
      errors.push('Plugin version is required');
    }

    if (!metadata.ecosystem || metadata.ecosystem.trim().length === 0) {
      errors.push('Plugin ecosystem is required');
    }

    if (!metadata.supportedFrameworks || metadata.supportedFrameworks.length === 0) {
      errors.push('Plugin must support at least one framework');
    }

    // Validate analyzer interface
    if (!analyzer.name || typeof analyzer.name !== 'string') {
      errors.push('Analyzer must have a valid name property');
    }

    if (!analyzer.ecosystem || typeof analyzer.ecosystem !== 'string') {
      errors.push('Analyzer must have a valid ecosystem property');
    }

    if (typeof analyzer.canAnalyze !== 'function') {
      errors.push('Analyzer must implement canAnalyze method');
    }

    if (typeof analyzer.analyze !== 'function') {
      errors.push('Analyzer must implement analyze method');
    }

    // Check for naming conflicts
    if (this.plugins.has(metadata.name)) {
      warnings.push(`Plugin with name '${metadata.name}' already exists and will be replaced`);
    }

    // Check ecosystem consistency
    if (analyzer.ecosystem !== metadata.ecosystem) {
      warnings.push(`Analyzer ecosystem '${analyzer.ecosystem}' differs from metadata ecosystem '${metadata.ecosystem}'`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Load plugins from configuration
   */
  async loadPluginsFromConfig(pluginConfigs: Record<string, any>): Promise<void> {
    this.logger.info('PluginSystem', 'Loading plugins from configuration', {
      pluginCount: Object.keys(pluginConfigs).length
    });

    const loadPromises = Object.entries(pluginConfigs).map(async ([pluginName, config]) => {
      try {
        await this.loadPluginFromConfig(pluginName, config);
      } catch (error) {
        this.logger.error('PluginSystem', 'Failed to load plugin from config', error instanceof Error ? error : new Error(String(error)), {
          pluginName: pluginName
        });
      }
    });

    await Promise.allSettled(loadPromises);

    this.logger.info('PluginSystem', 'Plugin loading completed', {
      totalPlugins: this.plugins.size,
      activePlugins: this.getActiveAnalyzers().length
    });
  }

  /**
   * Load a single plugin from configuration
   */
  private async loadPluginFromConfig(pluginName: string, config: any): Promise<void> {
    if (!config.module) {
      throw new Error(`Plugin ${pluginName} missing module path`);
    }

    // Dynamic import of plugin module
    const pluginModule = await import(config.module);
    
    if (!pluginModule.default && !pluginModule[pluginName]) {
      throw new Error(`Plugin ${pluginName} does not export default or named export`);
    }

    const PluginClass = pluginModule.default || pluginModule[pluginName];
    const analyzer = new PluginClass(config.settings || {});

    const metadata: PluginMetadata = {
      name: pluginName,
      version: config.version || '1.0.0',
      description: config.description || '',
      author: config.author || 'Unknown',
      ecosystem: config.ecosystem || analyzer.ecosystem,
      supportedFrameworks: config.supportedFrameworks || [],
      dependencies: config.dependencies,
      homepage: config.homepage,
      repository: config.repository
    };

    const pluginConfig: PluginConfig = {
      enabled: config.enabled !== false,
      priority: config.priority || 100,
      settings: config.settings
    };

    await this.registerPlugin(analyzer, metadata, pluginConfig);
  }

  /**
   * Get plugin system statistics
   */
  getStats(): {
    totalPlugins: number;
    activePlugins: number;
    inactivePlugins: number;
    errorPlugins: number;
    ecosystems: string[];
    frameworks: string[];
  } {
    const plugins = Array.from(this.plugins.values());
    
    const ecosystems = [...new Set(plugins.map(p => p.metadata.ecosystem))];
    const frameworks = [...new Set(plugins.flatMap(p => p.metadata.supportedFrameworks))];

    return {
      totalPlugins: plugins.length,
      activePlugins: plugins.filter(p => p.status === 'active').length,
      inactivePlugins: plugins.filter(p => p.status === 'inactive').length,
      errorPlugins: plugins.filter(p => p.status === 'error').length,
      ecosystems,
      frameworks
    };
  }

  /**
   * Export plugin configurations
   */
  exportConfigs(): Record<string, any> {
    const configs: Record<string, any> = {};
    
    for (const [name, plugin] of this.plugins.entries()) {
      configs[name] = {
        enabled: plugin.config.enabled,
        priority: plugin.config.priority,
        settings: plugin.config.settings,
        metadata: plugin.metadata
      };
    }
    
    return configs;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    const pluginCount = this.plugins.size;
    this.plugins.clear();
    this.pluginConfigs.clear();
    
    this.logger.info('PluginSystem', 'All plugins cleared', { clearedPlugins: pluginCount });
  }
}

// Singleton instance
let globalPluginSystem: PluginSystem | null = null;

/**
 * Get global plugin system instance
 */
export function getPluginSystem(): PluginSystem {
  if (!globalPluginSystem) {
    globalPluginSystem = new PluginSystem();
  }
  return globalPluginSystem;
}

/**
 * Reset global plugin system (mainly for testing)
 */
export function resetPluginSystem(): void {
  if (globalPluginSystem) {
    globalPluginSystem.clear();
    globalPluginSystem = null;
  }
}