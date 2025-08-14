/**
 * Performance optimization and extensibility module
 * Main entry point for all performance-related functionality
 */

// Import classes for local use
import { TemplateCacheManager, PerformanceCache } from './cache-manager';
import { PluginManager } from './plugin-system';
import { StreamingWorkflowGenerator } from './streaming-generator';
import { PerformanceMonitor, BenchmarkResult } from './performance-monitor';

// Cache management
export {
  PerformanceCache,
  TemplateCacheManager,
  PerformanceCacheConfig,
  CacheMetrics
} from './cache-manager';

// Plugin system
export {
  Plugin,
  PluginManager,
  PluginHooks,
  PluginMetadata,
  TemplateProvider,
  GenerationContext,
  FileSystemTemplateProvider,
  HttpTemplateProvider
} from './plugin-system';

// Streaming generation
export {
  StreamingWorkflowGenerator,
  StreamingConfig,
  GenerationProgress,
  WorkflowChunk
} from './streaming-generator';

// Performance monitoring
export {
  PerformanceMonitor,
  WorkflowPerformanceMetrics,
  BenchmarkConfig,
  BenchmarkResult,
  performanceMonitor,
  timed,
  memoryTracked
} from './performance-monitor';

/**
 * Performance optimization configuration
 */
export interface PerformanceOptimizationConfig {
  caching: {
    enabled: boolean;
    maxSize: number;
    ttlMs: number;
    maxMemoryMB: number;
  };
  streaming: {
    enabled: boolean;
    chunkSize: number;
    maxConcurrency: number;
  };
  monitoring: {
    enabled: boolean;
    collectGC: boolean;
    collectMemory: boolean;
  };
  plugins: {
    enabled: boolean;
    autoLoad: boolean;
    pluginPaths: string[];
  };
}

/**
 * Default performance optimization configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceOptimizationConfig = {
  caching: {
    enabled: true,
    maxSize: 1000,
    ttlMs: 30 * 60 * 1000, // 30 minutes
    maxMemoryMB: 100
  },
  streaming: {
    enabled: true,
    chunkSize: 10,
    maxConcurrency: 4
  },
  monitoring: {
    enabled: true,
    collectGC: true,
    collectMemory: true
  },
  plugins: {
    enabled: true,
    autoLoad: false,
    pluginPaths: []
  }
};

/**
 * Performance optimization manager
 */
export class PerformanceOptimizationManager {
  private config: PerformanceOptimizationConfig;
  private cacheManager: TemplateCacheManager;
  private pluginManager: PluginManager;
  private streamingGenerator: StreamingWorkflowGenerator;
  private monitor: PerformanceMonitor;

  constructor(config?: Partial<PerformanceOptimizationConfig>) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    
    // Initialize components
    this.cacheManager = new TemplateCacheManager({
      maxSize: this.config.caching.maxSize,
      ttlMs: this.config.caching.ttlMs,
      maxMemoryMB: this.config.caching.maxMemoryMB,
      enableMetrics: this.config.monitoring.enabled
    });

    this.pluginManager = new PluginManager();
    
    this.streamingGenerator = new StreamingWorkflowGenerator({
      chunkSize: this.config.streaming.chunkSize,
      maxConcurrency: this.config.streaming.maxConcurrency,
      enableProgress: this.config.monitoring.enabled
    });

    this.monitor = new PerformanceMonitor();
    
    if (this.config.monitoring.enabled) {
      this.monitor.startMonitoring();
    }
  }

  /**
   * Get cache manager instance
   */
  getCacheManager(): TemplateCacheManager {
    return this.cacheManager;
  }

  /**
   * Get plugin manager instance
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get streaming generator instance
   */
  getStreamingGenerator(): StreamingWorkflowGenerator {
    return this.streamingGenerator;
  }

  /**
   * Get performance monitor instance
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.monitor;
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring if needed
    if (this.config.monitoring.enabled && !this.monitor['isMonitoring']) {
      this.monitor.startMonitoring();
    } else if (!this.config.monitoring.enabled && this.monitor['isMonitoring']) {
      this.monitor.stopMonitoring();
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStatistics(): {
    cache: any;
    plugins: any;
    monitoring: any;
    system: {
      memoryUsage: NodeJS.MemoryUsage;
      cpuUsage: NodeJS.CpuUsage;
      uptime: number;
    };
  } {
    return {
      cache: this.cacheManager.getMetrics(),
      plugins: this.pluginManager.getStatistics(),
      monitoring: this.monitor.getMetrics(),
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      }
    };
  }

  /**
   * Run performance benchmark suite
   */
  async runBenchmarkSuite(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Cache performance benchmark
    if (this.config.caching.enabled) {
      const cacheResult = await this.monitor.runBenchmark(
        'cache-performance',
        async () => {
          const cache = new PerformanceCache<string>();
          for (let i = 0; i < 100; i++) {
            await cache.set(`key-${i}`, `value-${i}`);
            await cache.get(`key-${i}`);
          }
        },
        { iterations: 10 }
      );
      results.push(cacheResult);
    }

    // Plugin system benchmark
    if (this.config.plugins.enabled) {
      const pluginResult = await this.monitor.runBenchmark(
        'plugin-system-performance',
        async () => {
          // Simulate plugin execution
          const context = {
            detectionResult: {} as any,
            options: {} as any,
            metadata: {
              pluginId: 'test',
              startTime: Date.now(),
              currentPhase: 'test',
              customData: {}
            }
          };
          await this.pluginManager.executeBeforeGeneration(context);
        },
        { iterations: 50 }
      );
      results.push(pluginResult);
    }

    // Streaming generation benchmark
    if (this.config.streaming.enabled) {
      const streamingResult = await this.monitor.runBenchmark(
        'streaming-generation-performance',
        async () => {
          const detectionResult = {
            frameworks: [{ name: 'React', confidence: 0.9, evidence: [], category: 'frontend' as const }],
            languages: [{ name: 'JavaScript', confidence: 0.9, primary: true }],
            buildTools: [],
            packageManagers: [],
            testingFrameworks: [],
            deploymentTargets: [],
            projectMetadata: { name: 'test' }
          };
          const options = {
            workflowType: 'ci' as const,
            optimizationLevel: 'standard' as const,
            includeComments: true,
            securityLevel: 'standard' as const
          };
          await this.streamingGenerator.generateWorkflowFromStream(detectionResult, options);
        },
        { iterations: 5 }
      );
      results.push(streamingResult);
    }

    return results;
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<string> {
    const statistics = this.getPerformanceStatistics();
    const benchmarks = await this.runBenchmarkSuite();
    
    let report = '# Performance Optimization Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // System information
    report += '## System Information\n\n';
    report += `- Memory Usage: ${(statistics.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- CPU Usage: ${(statistics.system.cpuUsage.user + statistics.system.cpuUsage.system).toFixed(2)}μs\n`;
    report += `- Uptime: ${statistics.system.uptime.toFixed(2)}s\n\n`;
    
    // Cache statistics
    if (this.config.caching.enabled) {
      report += '## Cache Performance\n\n';
      report += `- Total Memory Usage: ${statistics.cache.total.memoryUsageMB.toFixed(2)}MB\n`;
      report += `- Total Entries: ${statistics.cache.total.totalEntries}\n`;
      report += `- Overall Hit Rate: ${(statistics.cache.total.overallHitRate * 100).toFixed(2)}%\n`;
      report += `- Template Cache Entries: ${statistics.cache.templates.entryCount}\n`;
      report += `- Compiled Cache Entries: ${statistics.cache.compiled.entryCount}\n\n`;
    }
    
    // Plugin statistics
    if (this.config.plugins.enabled) {
      report += '## Plugin System\n\n';
      report += `- Total Plugins: ${statistics.plugins.totalPlugins}\n`;
      report += `- Enabled Plugins: ${statistics.plugins.enabledPlugins}\n`;
      report += `- Template Providers: ${statistics.plugins.templateProviders}\n\n`;
    }
    
    // Benchmark results
    if (benchmarks.length > 0) {
      report += '## Benchmark Results\n\n';
      report += this.monitor.generateReport(benchmarks);
    }
    
    return report;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.monitor.stopMonitoring();
    this.cacheManager.clearAll();
  }
}

/**
 * Global performance optimization manager instance
 */
export const performanceOptimization = new PerformanceOptimizationManager();