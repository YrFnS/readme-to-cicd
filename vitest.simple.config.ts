import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [
      // Minimal setup - just basic mocking
      './tests/setup/minimal-setup.ts'
    ],

    // Simple configuration without complex memory management
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
        singleThread: false
      }
    },

    // Standard timeouts
    testTimeout: 10000,
    hookTimeout: 5000,

    // Simple isolation
    isolate: true,

    // No retries initially
    retry: 0,

    // Basic coverage
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/integration/**/*',
        'tests/setup/**/*'
      ]
    },

    // Basic reporter
    reporter: ['default'],

    // No bail
    bail: 0,

    // Minimal environment variables
    env: {
      NODE_ENV: 'test'
    }
  },

  esbuild: {
    target: 'node18',
    minify: false,
    sourcemap: false
  }
});
