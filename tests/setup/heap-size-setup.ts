/**
 * Heap Size Setup for Test Environments
 * 
 * This setup file configures Node.js heap size limits based on the test environment
 * and validates that the configuration is applied correctly.
 */

import { 
  applyHeapConfig, 
  detectTestEnvironment, 
  getHeapConfig, 
  validateHeapConfig,
  getCurrentMemoryUsage,
  generateNodeOptions
} from '../../src/shared/heap-size-config';

/**
 * Initialize heap size configuration for tests
 */
function initializeHeapConfig(): void {
  try {
    // Detect current test environment
    const environment = detectTestEnvironment();
    const config = getHeapConfig(environment);
    
    // Validate configuration
    const validation = validateHeapConfig(config);
    if (!validation.valid) {
      console.warn('Heap configuration validation failed:', validation.errors);
    }
    
    // Apply configuration
    applyHeapConfig(environment);
    
    // Log configuration for debugging
    if (process.env.NODE_ENV === 'test' && process.env.DEBUG_HEAP_CONFIG) {
      console.log(`Heap configuration applied for ${environment}:`, {
        config,
        nodeOptions: generateNodeOptions(config),
        currentMemory: getCurrentMemoryUsage()
      });
    }
    
  } catch (error) {
    console.error('Failed to initialize heap configuration:', error);
    // Don't fail tests due to heap config issues
  }
}

/**
 * Setup heap monitoring for test execution
 */
function setupHeapMonitoring(): void {
  // Monitor heap usage during test execution
  if (process.env.MONITOR_HEAP_USAGE === 'true') {
    const originalExit = process.exit;
    
    process.exit = ((code?: number) => {
      const finalMemory = getCurrentMemoryUsage();
      console.log('Final memory usage:', {
        heapUsed: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(finalMemory.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(finalMemory.external / 1024 / 1024)}MB`,
        rss: `${Math.round(finalMemory.rss / 1024 / 1024)}MB`
      });
      
      return originalExit.call(process, code);
    }) as typeof process.exit;
  }
}

/**
 * Validate that heap limits are properly applied
 */
function validateHeapLimits(): void {
  const nodeOptions = process.env.NODE_OPTIONS || '';
  const environment = detectTestEnvironment();
  const expectedConfig = getHeapConfig(environment);
  
  // Check if max-old-space-size is set
  const hasMaxOldSpace = nodeOptions.includes('--max-old-space-size');
  const hasExposeGC = nodeOptions.includes('--expose-gc');
  
  if (!hasMaxOldSpace) {
    console.warn(`Warning: --max-old-space-size not found in NODE_OPTIONS for ${environment} environment`);
  }
  
  if (expectedConfig.exposeGC && !hasExposeGC) {
    console.warn(`Warning: --expose-gc not found in NODE_OPTIONS for ${environment} environment`);
  }
  
  // Validate that gc is available if expose-gc is enabled
  if (hasExposeGC && typeof global.gc !== 'function') {
    console.warn('Warning: global.gc is not available despite --expose-gc flag');
  }
}

// Initialize heap configuration immediately
initializeHeapConfig();
setupHeapMonitoring();
validateHeapLimits();

// Export utilities for use in tests
export {
  initializeHeapConfig,
  setupHeapMonitoring,
  validateHeapLimits
};