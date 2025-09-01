/**
 * Node.js Heap Size Configuration for Test Environments
 * 
 * This module provides utilities for configuring and validating Node.js heap size limits
 * across different test environments to prevent memory exhaustion during test execution.
 */

export interface HeapSizeConfig {
  /** Maximum old space size in MB */
  maxOldSpaceSize: number;
  /** Maximum semi space size in MB */
  maxSemiSpaceSize?: number;
  /** Enable garbage collection exposure */
  exposeGC: boolean;
  /** Additional Node.js options */
  additionalOptions?: string[];
}

export interface TestEnvironmentConfig {
  /** Configuration for unit tests */
  unit: HeapSizeConfig;
  /** Configuration for integration tests */
  integration: HeapSizeConfig;
  /** Configuration for performance tests */
  performance: HeapSizeConfig;
  /** Configuration for comprehensive test suites */
  comprehensive: HeapSizeConfig;
  /** Default configuration */
  default: HeapSizeConfig;
}

/**
 * Default heap size configurations for different test environments
 */
export const DEFAULT_HEAP_CONFIGS: TestEnvironmentConfig = {
  unit: {
    maxOldSpaceSize: 1024, // 1GB for unit tests
    maxSemiSpaceSize: 64,  // 64MB semi space
    exposeGC: true,
    additionalOptions: ['--optimize-for-size']
  },
  
  integration: {
    maxOldSpaceSize: 2048, // 2GB for integration tests
    maxSemiSpaceSize: 128, // 128MB semi space
    exposeGC: true,
    additionalOptions: ['--max-http-header-size=16384']
  },
  
  performance: {
    maxOldSpaceSize: 4096, // 4GB for performance tests
    maxSemiSpaceSize: 256, // 256MB semi space
    exposeGC: true,
    additionalOptions: ['--max-http-header-size=32768']
  },
  
  comprehensive: {
    maxOldSpaceSize: 3072, // 3GB for comprehensive tests
    maxSemiSpaceSize: 192, // 192MB semi space
    exposeGC: true,
    additionalOptions: ['--max-http-header-size=24576']
  },
  
  default: {
    maxOldSpaceSize: 1536, // 1.5GB default
    maxSemiSpaceSize: 96,  // 96MB semi space
    exposeGC: true,
    additionalOptions: []
  }
};

/**
 * Get heap size configuration for a specific test environment
 */
export function getHeapConfig(environment: keyof TestEnvironmentConfig): HeapSizeConfig {
  return DEFAULT_HEAP_CONFIGS[environment] || DEFAULT_HEAP_CONFIGS.default;
}

/**
 * Generate NODE_OPTIONS string from heap configuration
 */
export function generateNodeOptions(config: HeapSizeConfig): string {
  const options: string[] = [];
  
  // Add max old space size
  options.push(`--max-old-space-size=${config.maxOldSpaceSize}`);
  
  // Add max semi space size if specified
  if (config.maxSemiSpaceSize) {
    options.push(`--max-semi-space-size=${config.maxSemiSpaceSize}`);
  }
  
  // Add garbage collection exposure
  if (config.exposeGC) {
    options.push('--expose-gc');
  }
  
  // Add additional options
  if (config.additionalOptions) {
    options.push(...config.additionalOptions);
  }
  
  return options.join(' ');
}

/**
 * Get current Node.js memory usage
 */
export function getCurrentMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

/**
 * Check if current heap usage exceeds threshold
 */
export function isHeapUsageExcessive(thresholdPercent: number = 80): boolean {
  const usage = getCurrentMemoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;
  return usagePercent > thresholdPercent;
}

/**
 * Validate heap size configuration
 */
export function validateHeapConfig(config: HeapSizeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check minimum heap size
  if (config.maxOldSpaceSize < 512) {
    errors.push('maxOldSpaceSize must be at least 512MB');
  }
  
  // Check maximum reasonable heap size (16GB)
  if (config.maxOldSpaceSize > 16384) {
    errors.push('maxOldSpaceSize should not exceed 16GB (16384MB)');
  }
  
  // Check semi space size relationship
  if (config.maxSemiSpaceSize && config.maxSemiSpaceSize > config.maxOldSpaceSize / 8) {
    errors.push('maxSemiSpaceSize should not exceed 1/8 of maxOldSpaceSize');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get recommended heap size based on available system memory
 */
export function getRecommendedHeapSize(): number {
  const totalMemoryMB = require('os').totalmem() / 1024 / 1024;
  
  // Use 50% of available memory, with reasonable bounds
  const recommendedMB = Math.floor(totalMemoryMB * 0.5);
  
  // Ensure minimum 1GB and maximum 8GB
  return Math.max(1024, Math.min(8192, recommendedMB));
}

/**
 * Environment detection utilities
 */
export function detectTestEnvironment(): keyof TestEnvironmentConfig {
  const testFile = process.env.VITEST_POOL_ID || '';
  const testCommand = process.argv.join(' ');
  
  if (testFile.includes('performance') || testCommand.includes('test:performance')) {
    return 'performance';
  }
  
  if (testFile.includes('integration') || testCommand.includes('test:integration')) {
    return 'integration';
  }
  
  if (testCommand.includes('test:comprehensive') || testCommand.includes('test:all')) {
    return 'comprehensive';
  }
  
  if (testFile.includes('unit') || testCommand.includes('test:unit')) {
    return 'unit';
  }
  
  return 'default';
}

/**
 * Apply heap configuration to current process
 */
export function applyHeapConfig(environment?: keyof TestEnvironmentConfig): void {
  const env = environment || detectTestEnvironment();
  const config = getHeapConfig(env);
  const nodeOptions = generateNodeOptions(config);
  
  // Set NODE_OPTIONS if not already set
  if (!process.env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS = nodeOptions;
  } else {
    // Merge with existing options
    const existing = process.env.NODE_OPTIONS;
    const merged = `${existing} ${nodeOptions}`;
    process.env.NODE_OPTIONS = merged;
  }
}