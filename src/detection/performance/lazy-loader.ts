import { LanguageAnalyzer } from '../interfaces/language-analyzer';
import { DetectionLogger, getLogger } from '../utils/logger';

/**
 * Lazy loading configuration
 */
export interface LazyLoadConfig {
  /** Enable preloading of common analyzers */
  enablePreloading: boolean;
  /** Analyzers to preload */
  preloadAnalyzers: string[];
  /** Cache loaded modules */
  enableModuleCache: boolean;
  /** Timeout for module loading in milliseconds */
  loadTimeout: number;
}

/**
 * Module loading result
 */
interface LoadResult<T> {
  success: boolean;
  module?: T;
  error?: Error;
  loadTime: number;
}

/**
 * Cached module entry
 */
interface CachedModule<T> {
  module: T;
  loadedAt: number;
  accessCount: number;
}

/**
 * Lazy loader for framework detection components
 */
export class LazyLoader {
  private moduleCache = new Map<string, CachedModule<any>>();
  private loadingPromises = new Map<string, Promise<any>>();
  private config: LazyLoadConfig;
  private logger: DetectionLogger;

  constructor(config: Partial<LazyLoadConfig> = {}) {
    this.config = {
      enablePreloading: config.enablePreloading ?? true,
      preloadAnalyzers: config.preloadAnalyzers || ['nodejs', 'python', 'frontend'],
      enableModuleCache: config.enableModuleCache ?? true,
      loadTimeout: config.loadTimeout || 5000
    };
    
    this.logger = getLogger();
    
    if (this.config.enablePreloading) {
      this.preloadCommonAnalyzers();
    }
  }

  /**
   * Lazy load a language analyzer
   */
  async loadAnalyzer(analyzerName: string): Promise<LoadResult<LanguageAnalyzer>> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.enableModuleCache && this.moduleCache.has(analyzerName)) {
        const cached = this.moduleCache.get(analyzerName)!;
        cached.accessCount++;
        
        this.logger.debug('LazyLoader', 'Analyzer loaded from cache', {
          analyzer: analyzerName,
          accessCount: cached.accessCount,
          cacheAge: Date.now() - cached.loadedAt
        });
        
        return {
          success: true,
          module: cached.module,
          loadTime: Date.now() - startTime
        };
      }

      // Check if already loading
      if (this.loadingPromises.has(analyzerName)) {
        const module = await this.loadingPromises.get(analyzerName)!;
        return {
          success: true,
          module,
          loadTime: Date.now() - startTime
        };
      }

      // Start loading
      const loadPromise = this.loadAnalyzerModule(analyzerName);
      this.loadingPromises.set(analyzerName, loadPromise);

      const module = await Promise.race([
        loadPromise,
        this.createTimeoutPromise(this.config.loadTimeout)
      ]);

      // Cache the loaded module
      if (this.config.enableModuleCache) {
        this.moduleCache.set(analyzerName, {
          module,
          loadedAt: Date.now(),
          accessCount: 1
        });
      }

      // Clean up loading promise
      this.loadingPromises.delete(analyzerName);

      this.logger.info('LazyLoader', 'Analyzer loaded successfully', {
        analyzer: analyzerName,
        loadTime: Date.now() - startTime,
        cached: this.config.enableModuleCache
      });

      return {
        success: true,
        module,
        loadTime: Date.now() - startTime
      };

    } catch (error) {
      this.loadingPromises.delete(analyzerName);
      
      this.logger.error('LazyLoader', 'Failed to load analyzer', error instanceof Error ? error : new Error(String(error)), {
        analyzerName: analyzerName,
        loadTime: Date.now() - startTime
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        loadTime: Date.now() - startTime
      };
    }
  }

  /**
   * Load analyzer module dynamically
   */
  private async loadAnalyzerModule(analyzerName: string): Promise<LanguageAnalyzer> {
    const moduleMap: Record<string, string> = {
      'nodejs': '../analyzers/nodejs',
      'python': '../analyzers/python',
      'rust': '../analyzers/rust',
      'go': '../analyzers/go',
      'java': '../analyzers/java',
      'container': '../analyzers/container',
      'frontend': '../analyzers/frontend'
    };

    const modulePath = moduleMap[analyzerName];
    if (!modulePath) {
      throw new Error(`Unknown analyzer: ${analyzerName}`);
    }

    const module = await import(modulePath);
    
    // Get the analyzer class from the module
    const analyzerClasses: Record<string, string> = {
      'nodejs': 'NodeJSAnalyzer',
      'python': 'PythonAnalyzer',
      'rust': 'RustAnalyzer',
      'go': 'GoAnalyzer',
      'java': 'JavaAnalyzer',
      'container': 'ContainerAnalyzer',
      'frontend': 'FrontendAnalyzer'
    };

    const className = analyzerClasses[analyzerName];
    const AnalyzerClass = module[className as keyof typeof module];
    
    if (!AnalyzerClass) {
      throw new Error(`Analyzer class ${className} not found in module ${modulePath}`);
    }

    return new AnalyzerClass();
  }

  /**
   * Load framework rules lazily
   */
  async loadFrameworkRules(ecosystem: string): Promise<LoadResult<any>> {
    const startTime = Date.now();
    const cacheKey = `rules:${ecosystem}`;
    
    try {
      // Check cache
      if (this.config.enableModuleCache && this.moduleCache.has(cacheKey)) {
        const cached = this.moduleCache.get(cacheKey)!;
        cached.accessCount++;
        
        return {
          success: true,
          module: cached.module,
          loadTime: Date.now() - startTime
        };
      }

      // Load rules dynamically
      const rules = await this.loadRulesModule(ecosystem);
      
      // Cache the rules
      if (this.config.enableModuleCache) {
        this.moduleCache.set(cacheKey, {
          module: rules,
          loadedAt: Date.now(),
          accessCount: 1
        });
      }

      this.logger.debug('LazyLoader', 'Framework rules loaded', {
        ecosystem,
        rulesCount: Object.keys(rules).length,
        loadTime: Date.now() - startTime
      });

      return {
        success: true,
        module: rules,
        loadTime: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error('LazyLoader', 'Failed to load framework rules', error instanceof Error ? error : new Error(String(error)), {
        ecosystem
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        loadTime: Date.now() - startTime
      };
    }
  }

  /**
   * Load CI templates lazily
   */
  async loadCITemplates(framework: string): Promise<LoadResult<any>> {
    const startTime = Date.now();
    const cacheKey = `templates:${framework}`;
    
    try {
      // Check cache
      if (this.config.enableModuleCache && this.moduleCache.has(cacheKey)) {
        const cached = this.moduleCache.get(cacheKey)!;
        cached.accessCount++;
        
        return {
          success: true,
          module: cached.module,
          loadTime: Date.now() - startTime
        };
      }

      // Load templates dynamically
      const templates = await this.loadTemplatesModule(framework);
      
      // Cache the templates
      if (this.config.enableModuleCache) {
        this.moduleCache.set(cacheKey, {
          module: templates,
          loadedAt: Date.now(),
          accessCount: 1
        });
      }

      this.logger.debug('LazyLoader', 'CI templates loaded', {
        framework,
        templatesCount: Object.keys(templates).length,
        loadTime: Date.now() - startTime
      });

      return {
        success: true,
        module: templates,
        loadTime: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error('LazyLoader', 'Failed to load CI templates', error instanceof Error ? error : new Error(String(error)), {
        framework
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        loadTime: Date.now() - startTime
      };
    }
  }

  /**
   * Load rules module for specific ecosystem
   */
  private async loadRulesModule(ecosystem: string): Promise<any> {
    const rulesPath = `../rules/${ecosystem}-rules`;
    
    try {
      const module = await import(rulesPath);
      return module.default || module;
    } catch (error) {
      // Fallback to generic rules if specific rules don't exist
      this.logger.warn('LazyLoader', 'Specific rules not found, using generic', {
        ecosystem,
        error: error instanceof Error ? error.message : String(error)
      });
      
      const genericModule = await import('../rules/generic-rules');
      return genericModule.default || genericModule;
    }
  }

  /**
   * Load templates module for specific framework
   */
  private async loadTemplatesModule(framework: string): Promise<any> {
    const templatesPath = `../templates/${framework}-templates`;
    
    try {
      const module = await import(templatesPath);
      return module.default || module;
    } catch (error) {
      // Fallback to generic templates if specific templates don't exist
      this.logger.warn('LazyLoader', 'Specific templates not found, using generic', {
        framework,
        error: error instanceof Error ? error.message : String(error)
      });
      
      const genericModule = await import('../templates/generic-templates');
      return genericModule.default || genericModule;
    }
  }

  /**
   * Preload common analyzers
   */
  private async preloadCommonAnalyzers(): Promise<void> {
    this.logger.info('LazyLoader', 'Starting preload of common analyzers', {
      analyzers: this.config.preloadAnalyzers
    });

    const preloadPromises = this.config.preloadAnalyzers.map(async (analyzerName) => {
      try {
        await this.loadAnalyzer(analyzerName);
        this.logger.debug('LazyLoader', 'Preloaded analyzer', { analyzer: analyzerName });
      } catch (error) {
        this.logger.warn('LazyLoader', 'Failed to preload analyzer', {
          analyzer: analyzerName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.allSettled(preloadPromises);
    
    this.logger.info('LazyLoader', 'Preloading completed', {
      cachedModules: this.moduleCache.size
    });
  }

  /**
   * Create timeout promise for loading operations
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Module loading timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedModules: number;
    totalAccesses: number;
    averageAccessCount: number;
    oldestModule: number;
    newestModule: number;
  } {
    const modules = Array.from(this.moduleCache.values());
    const totalAccesses = modules.reduce((sum, m) => sum + m.accessCount, 0);
    const averageAccessCount = modules.length > 0 ? totalAccesses / modules.length : 0;
    
    const timestamps = modules.map(m => m.loadedAt);
    const oldestModule = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestModule = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      cachedModules: this.moduleCache.size,
      totalAccesses,
      averageAccessCount,
      oldestModule,
      newestModule
    };
  }

  /**
   * Clear module cache
   */
  clearCache(): void {
    const clearedCount = this.moduleCache.size;
    this.moduleCache.clear();
    this.loadingPromises.clear();
    
    this.logger.info('LazyLoader', 'Module cache cleared', { clearedModules: clearedCount });
  }

  /**
   * Warm up cache with specific modules
   */
  async warmupCache(modules: string[]): Promise<void> {
    this.logger.info('LazyLoader', 'Starting cache warmup', { modules });

    const warmupPromises = modules.map(async (moduleName) => {
      try {
        if (moduleName.startsWith('rules:')) {
          const ecosystem = moduleName.replace('rules:', '');
          await this.loadFrameworkRules(ecosystem);
        } else if (moduleName.startsWith('templates:')) {
          const framework = moduleName.replace('templates:', '');
          await this.loadCITemplates(framework);
        } else {
          await this.loadAnalyzer(moduleName);
        }
      } catch (error) {
        this.logger.warn('LazyLoader', 'Failed to warmup module', {
          module: moduleName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.allSettled(warmupPromises);
    
    this.logger.info('LazyLoader', 'Cache warmup completed', {
      cachedModules: this.moduleCache.size
    });
  }
}

// Singleton instance
let globalLazyLoader: LazyLoader | null = null;

/**
 * Get global lazy loader instance
 */
export function getLazyLoader(config?: Partial<LazyLoadConfig>): LazyLoader {
  if (!globalLazyLoader) {
    globalLazyLoader = new LazyLoader(config);
  }
  return globalLazyLoader;
}

/**
 * Reset global lazy loader (mainly for testing)
 */
export function resetLazyLoader(): void {
  if (globalLazyLoader) {
    globalLazyLoader.clearCache();
    globalLazyLoader = null;
  }
}