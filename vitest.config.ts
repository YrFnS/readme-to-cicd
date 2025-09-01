import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [
      './tests/setup/vitest-setup.ts',
      './tests/setup/memory-setup.ts',
      './tests/setup/monitoring-system-setup.ts',
      './tests/setup/test-configuration.ts'
    ],
    
    // Memory-optimized pool configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        // Reduce concurrent threads to manage memory usage
        maxThreads: 2,
        minThreads: 1,
        // Use single thread for memory-intensive tests
        singleThread: false
      },
      forks: {
        // Fallback fork configuration with memory optimization
        singleFork: true
      }
    },
    
    // Increased timeouts for memory-intensive operations
    testTimeout: 30000,      // Increased from 10s to 30s
    hookTimeout: 15000,      // Increased from 10s to 15s
    teardownTimeout: 10000,  // Increased from 5s to 10s
    
    // Memory management specific timeouts
    slowTestThreshold: 5000,
    
    // Test isolation to prevent memory leaks between tests
    isolate: true,
    
    // Retry configuration for memory-related failures
    retry: 1,
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/integration/**/*',
        'tests/setup/**/*'
      ]
    },
    
    // Reporter configuration for better memory debugging
    reporter: [
      'default',
      'verbose'
    ],
    
    // Bail early on memory-related failures
    bail: 0,
    
    // Environment variables for memory optimization
    env: {
      NODE_OPTIONS: '--max-old-space-size=2048 --expose-gc',
      // Enable garbage collection
      NODE_ENV: 'test'
    }
  },
  
  // Esbuild configuration for memory optimization
  esbuild: {
    target: 'node18',
    // Optimize for memory usage over speed during tests
    minify: false,
    sourcemap: false
  }
});