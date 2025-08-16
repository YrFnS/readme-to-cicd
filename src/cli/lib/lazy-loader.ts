/**
 * Lazy Loader
 * 
 * Provides lazy loading capabilities for CLI components to reduce startup time
 * and memory usage by loading modules only when they are actually needed.
 */

import { Logger } from './logger';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Lazy loading configuration
 */
export interface LazyLoaderConfig {
  enableCaching: boolean;
  enableProfiling: boolean;
  preloadCritical: boolean;
  maxCacheSize: number;
}

/**
 * Module factory function
 */
export type ModuleFactory<T> = () => Promise<T> | T;

/**
 * Lazy loaded module wrapper
 */
export interface LazyModule<T> {
  load(): Promise<T>;
  isLoaded(): boolean;
  getInstance(): T | null;
  preload(): Promise<void>;
  unload(): void;
}

/**
 * Module metadata for tracking
 */
interface ModuleMetadata {
  name: string;
  loadTime?: number;
  lastAccessed?: number;
  accessCount: number;
  size?: number;
}

/**
 * Main lazy loader class
 */
export class LazyLoader {
  private modules = new Map<string, any>();
  private factories = new Map<string, ModuleFactory<any>>();
  private metadata = new Map<string, ModuleMetadata>();
  private config: LazyLoaderConfig;
  private logger: Logger;
  private performanceMonitor: PerformanceMonitor | undefined;

  constructor(
    logger: Logger,
    performanceMonitor?: PerformanceMonitor,
    config: Partial<LazyLoaderConfig> = {}
  ) {
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;
    this.config = {
      enableCaching: true,
      enableProfiling: true,
      preloadCritical: false,
      maxCacheSize: 50,
      ...config
    };

    this.logger.debug('LazyLoader initialized', {
      config: this.config
    });
  }

  /**
   * Register a module for lazy loading
   */
  register<T>(
    name: string,
    factory: ModuleFactory<T>,
    options: {
      critical?: boolean;
      preload?: boolean;
    } = {}
  ): LazyModule<T> {
    this.factories.set(name, factory);
    this.metadata.set(name, {
      name,
      accessCount: 0
    });

    this.logger.debug('Module registered for lazy loading', {
      name,
      critical: options.critical,
      preload: options.preload
    });

    // Preload if requested or if it's critical and preloading is enabled
    if (options.preload || (options.critical && this.config.preloadCritical)) {
      this.preloadModule(name).catch(error => {
        this.logger.warn('Failed to preload module', {
          name,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }

    return this.createLazyModule<T>(name);
  }

  /**
   * Load a module by name
   */
  async load<T>(name: string): Promise<T> {
    // Check if already loaded
    if (this.modules.has(name)) {
      this.updateAccessMetadata(name);
      return this.modules.get(name) as T;
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Module '${name}' not registered`);
    }

    const timerId = this.performanceMonitor?.startTimer(
      `lazy-load-${name}`,
      'other',
      { moduleName: name }
    );

    try {
      this.logger.debug('Loading module', { name });

      const startTime = Date.now();
      const module = await factory();
      const loadTime = Date.now() - startTime;

      // Cache the loaded module
      if (this.config.enableCaching) {
        this.ensureCacheCapacity();
        this.modules.set(name, module);
      }

      // Update metadata
      const metadata = this.metadata.get(name)!;
      metadata.loadTime = loadTime;
      metadata.lastAccessed = Date.now();
      metadata.accessCount++;

      this.logger.debug('Module loaded successfully', {
        name,
        loadTime: `${loadTime}ms`,
        cached: this.config.enableCaching
      });

      this.performanceMonitor?.endTimer(timerId!, {
        success: true,
        loadTime,
        cached: false
      });

      return module as T;

    } catch (error) {
      this.logger.error('Failed to load module', {
        name,
        error: error instanceof Error ? error.message : String(error)
      });

      this.performanceMonitor?.endTimer(timerId!, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Get loaded module instance without loading
   */
  getInstance<T>(name: string): T | null {
    return this.modules.get(name) as T || null;
  }

  /**
   * Preload a module
   */
  async preloadModule(name: string): Promise<void> {
    if (!this.isLoaded(name)) {
      await this.load(name);
    }
  }

  /**
   * Preload multiple modules
   */
  async preloadModules(names: string[]): Promise<void> {
    const preloadPromises = names.map(name => this.preloadModule(name));
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Unload a module from cache
   */
  unload(name: string): boolean {
    const wasLoaded = this.modules.has(name);
    this.modules.delete(name);
    
    if (wasLoaded) {
      this.logger.debug('Module unloaded', { name });
    }
    
    return wasLoaded;
  }

  /**
   * Clear all loaded modules
   */
  clear(): void {
    const moduleCount = this.modules.size;
    this.modules.clear();
    
    this.logger.debug('All modules cleared', { moduleCount });
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    registeredModules: number;
    loadedModules: number;
    totalLoadTime: number;
    averageLoadTime: number;
    mostAccessedModules: Array<{ name: string; accessCount: number }>;
    cacheHitRate: number;
  } {
    const registeredModules = this.factories.size;
    const loadedModules = this.modules.size;
    
    const metadataArray = Array.from(this.metadata.values());
    const totalLoadTime = metadataArray
      .filter(m => m.loadTime)
      .reduce((sum, m) => sum + (m.loadTime || 0), 0);
    
    const modulesWithLoadTime = metadataArray.filter(m => m.loadTime).length;
    const averageLoadTime = modulesWithLoadTime > 0 ? totalLoadTime / modulesWithLoadTime : 0;
    
    const mostAccessedModules = metadataArray
      .filter(m => m.accessCount > 0)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(m => ({ name: m.name, accessCount: m.accessCount }));

    const totalAccesses = metadataArray.reduce((sum, m) => sum + m.accessCount, 0);
    const cacheHits = metadataArray.reduce((sum, m) => sum + Math.max(0, m.accessCount - 1), 0);
    const cacheHitRate = totalAccesses > 0 ? cacheHits / totalAccesses : 0;

    return {
      registeredModules,
      loadedModules,
      totalLoadTime,
      averageLoadTime,
      mostAccessedModules,
      cacheHitRate
    };
  }

  /**
   * Create a lazy module wrapper
   */
  private createLazyModule<T>(name: string): LazyModule<T> {
    return {
      load: () => this.load<T>(name),
      isLoaded: () => this.isLoaded(name),
      getInstance: () => this.getInstance<T>(name),
      preload: () => this.preloadModule(name),
      unload: () => { this.unload(name); }
    };
  }

  /**
   * Update access metadata for a module
   */
  private updateAccessMetadata(name: string): void {
    const metadata = this.metadata.get(name);
    if (metadata) {
      metadata.lastAccessed = Date.now();
      metadata.accessCount++;
    }
  }

  /**
   * Ensure cache doesn't exceed maximum size
   */
  private ensureCacheCapacity(): void {
    if (this.modules.size >= this.config.maxCacheSize) {
      // Find least recently used module
      let lruModule: string | null = null;
      let oldestAccess = Date.now();

      for (const [name, metadata] of this.metadata.entries()) {
        if (this.modules.has(name) && 
            metadata.lastAccessed && 
            metadata.lastAccessed < oldestAccess) {
          oldestAccess = metadata.lastAccessed;
          lruModule = name;
        }
      }

      if (lruModule) {
        this.unload(lruModule);
        this.logger.debug('Evicted LRU module from cache', { 
          module: lruModule,
          lastAccessed: new Date(oldestAccess).toISOString()
        });
      }
    }
  }
}

/**
 * Lazy loading utilities for common CLI components
 */
export class CLILazyLoader extends LazyLoader {
  constructor(logger: Logger, performanceMonitor?: PerformanceMonitor) {
    super(logger, performanceMonitor, {
      enableCaching: true,
      enableProfiling: true,
      preloadCritical: true,
      maxCacheSize: 20
    });

    this.registerCLIComponents();
  }

  /**
   * Register common CLI components for lazy loading
   */
  private registerCLIComponents(): void {
    // Core components (critical)
    this.register(
      'readme-parser',
      () => import('../../parser/readme-parser'),
      { critical: true }
    );

    this.register(
      'framework-detection',
      () => import('../../detection/framework-detector'),
      { critical: true }
    );

    this.register(
      'yaml-generator',
      () => import('../../generator/yaml-generator'),
      { critical: true }
    );

    // CLI utilities (non-critical)
    this.register(
      'git-integration',
      () => import('./git-integration'),
      { critical: false }
    );

    this.register(
      'workflow-validator',
      () => import('./workflow-validator'),
      { critical: false }
    );

    this.register(
      'config-exporter',
      () => import('./config-exporter'),
      { critical: false }
    );

    // Interactive components (load on demand)
    this.register(
      'inquirer',
      () => import('inquirer'),
      { critical: false }
    );

    this.register(
      'ora',
      () => import('ora'),
      { critical: false }
    );

    // Heavy dependencies (load on demand)
    this.register(
      'handlebars',
      () => import('handlebars'),
      { critical: false }
    );

    this.register(
      'js-yaml',
      () => import('js-yaml'),
      { critical: false }
    );
  }

  /**
   * Get README parser with lazy loading
   */
  async getReadmeParser() {
    const module = await this.load('readme-parser') as any;
    return module.ReadmeParserImpl;
  }

  /**
   * Get framework detector with lazy loading
   */
  async getFrameworkDetector() {
    const module = await this.load('framework-detection') as any;
    return module.FrameworkDetector;
  }

  /**
   * Get YAML generator with lazy loading
   */
  async getYamlGenerator() {
    const module = await this.load('yaml-generator') as any;
    return module.YamlGenerator;
  }

  /**
   * Get interactive prompt library
   */
  async getInquirer() {
    return this.load('inquirer');
  }

  /**
   * Get spinner library
   */
  async getOra() {
    return this.load('ora');
  }

  /**
   * Get template engine
   */
  async getHandlebars() {
    return this.load('handlebars');
  }

  /**
   * Get YAML library
   */
  async getYamlLibrary() {
    return this.load('js-yaml');
  }
}