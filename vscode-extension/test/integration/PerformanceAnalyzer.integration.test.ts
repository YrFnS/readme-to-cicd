/**
 * Performance Analyzer Integration Tests
 * 
 * Integration tests for performance analysis with real workflow files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PerformanceAnalyzer } from '../../src/core/PerformanceAnalyzer';
import { ExtensionConfiguration } from '../../src/core/types';

describe('PerformanceAnalyzer Integration', () => {
  let analyzer: PerformanceAnalyzer;
  let tempDir: string;
  let mockContext: vscode.ExtensionContext;
  let mockConfiguration: ExtensionConfiguration;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = path.join(__dirname, '..', 'temp', `test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    mockContext = {
      subscriptions: [],
      workspaceState: {} as any,
      globalState: {} as any,
      extensionPath: '/test/path'
    } as vscode.ExtensionContext;

    mockConfiguration = {
      defaultOutputDirectory: '.github/workflows',
      enableAutoGeneration: false,
      preferredWorkflowTypes: ['ci'],
      customTemplates: [],
      gitIntegration: {
        autoCommit: false,
        commitMessage: 'Update workflows',
        createPR: false
      },
      showPreviewByDefault: true,
      enableInlineValidation: true,
      notificationLevel: 'all'
    };

    analyzer = new PerformanceAnalyzer(mockContext, mockConfiguration);
  });

  afterEach(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Real workflow analysis', () => {
    it('should analyze a complete Node.js CI workflow', async () => {
      const workflowContent = `
name: Node.js CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Deploy
      run: npm run deploy
`;

      const workflowPath = path.join(tempDir, 'nodejs-ci.yml');
      await fs.writeFile(workflowPath, workflowContent);

      const result = await analyzer.analyzeWorkflowPerformance(workflowPath);

      expect(result).toBeDefined();
      expect(result.workflowPath).toBe(workflowPath);
      expect(result.overallScore).toBeGreaterThan(60); // Should have decent score due to matrix
      
      // Should identify caching opportunities for both jobs
      expect(result.cachingOpportunities).toHaveLength(2);
      expect(result.cachingOpportunities.every(opp => opp.framework === 'node')).toBe(true);
      
      // Should have recommendations for caching
      const cachingRecs = result.recommendations.filter(r => r.category === 'caching');
      expect(cachingRecs).toHaveLength(2);
      
      // Should identify the dependency between jobs
      expect(result.parallelizationSuggestions).toHaveLength(0); // Jobs are properly dependent
    });

    it('should analyze a Python workflow with multiple frameworks', async () => {
      const workflowContent = `
name: Python CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.8, 3.9, '3.10', 3.11]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python \${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: \${{ matrix.python-version }}
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    
    - name: Test with pytest
      run: pytest --cov=./ --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  docker:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker build -t myapp .
    
    - name: Test Docker image
      run: docker run --rm myapp python -m pytest
`;

      const workflowPath = path.join(tempDir, 'python-ci.yml');
      await fs.writeFile(workflowPath, workflowContent);

      const result = await analyzer.analyzeWorkflowPerformance(workflowPath);

      expect(result).toBeDefined();
      
      // Should identify both Python and Docker caching opportunities
      expect(result.cachingOpportunities).toHaveLength(2);
      expect(result.cachingOpportunities.some(opp => opp.framework === 'python')).toBe(true);
      expect(result.cachingOpportunities.some(opp => opp.framework === 'docker')).toBe(true);
      
      // Should suggest parallelization since jobs are independent
      expect(result.parallelizationSuggestions).toHaveLength(1);
      expect(result.parallelizationSuggestions[0].affectedJobs).toContain('test');
      expect(result.parallelizationSuggestions[0].affectedJobs).toContain('docker');
    });

    it('should analyze a complex multi-language workflow', async () => {
      const workflowContent = `
name: Multi-Language CI

on: [push]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install frontend deps
      run: |
        cd frontend
        npm install
    - name: Build frontend
      run: |
        cd frontend
        npm run build
    - name: Test frontend
      run: |
        cd frontend
        npm test

  backend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    - name: Install backend deps
      run: |
        cd backend
        pip install -r requirements.txt
    - name: Test backend
      run: |
        cd backend
        python -m pytest
    - name: Build backend
      run: |
        cd backend
        python setup.py build

  database:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
    - uses: actions/checkout@v3
    - name: Run migrations
      run: |
        cd database
        psql -h localhost -U postgres -d postgres -f migrations.sql
      env:
        PGPASSWORD: postgres

  integration:
    needs: [frontend, backend, database]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    - name: Install all deps
      run: |
        cd frontend && npm install
        cd ../backend && pip install -r requirements.txt
    - name: Run integration tests
      run: npm run test:integration
`;

      const workflowPath = path.join(tempDir, 'multi-language-ci.yml');
      await fs.writeFile(workflowPath, workflowContent);

      const result = await analyzer.analyzeWorkflowPerformance(workflowPath);

      expect(result).toBeDefined();
      
      // Should identify caching opportunities for both Node.js and Python
      expect(result.cachingOpportunities.length).toBeGreaterThanOrEqual(3);
      expect(result.cachingOpportunities.some(opp => opp.framework === 'node')).toBe(true);
      expect(result.cachingOpportunities.some(opp => opp.framework === 'python')).toBe(true);
      
      // Should suggest parallelization for frontend, backend, and database jobs
      expect(result.parallelizationSuggestions).toHaveLength(1);
      expect(result.parallelizationSuggestions[0].affectedJobs).toContain('frontend');
      expect(result.parallelizationSuggestions[0].affectedJobs).toContain('backend');
      expect(result.parallelizationSuggestions[0].affectedJobs).toContain('database');
      
      // Should identify bottlenecks in the integration job
      expect(result.bottlenecks.some(b => b.location.includes('integration'))).toBe(true);
    });

    it('should generate optimized workflow with applied recommendations', async () => {
      const workflowContent = `
name: Unoptimized CI

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Install dependencies
      run: npm install
    - name: Run tests
      run: npm test
    - name: Build
      run: npm run build
`;

      const workflowPath = path.join(tempDir, 'unoptimized.yml');
      await fs.writeFile(workflowPath, workflowContent);

      // First analyze to get recommendations
      const analysis = await analyzer.analyzeWorkflowPerformance(workflowPath);
      expect(analysis.recommendations).toHaveLength(1);
      
      const cachingRec = analysis.recommendations.find(r => r.category === 'caching');
      expect(cachingRec).toBeDefined();

      // Generate optimized workflow
      const optimized = await analyzer.generateOptimizedWorkflow(
        workflowPath,
        [cachingRec!.id]
      );

      expect(optimized.appliedOptimizations).toHaveLength(1);
      expect(optimized.appliedOptimizations[0].applied).toBe(true);
      expect(optimized.estimatedTimeSaving).toBeGreaterThan(0);
      
      // Verify the optimized content includes caching
      expect(optimized.optimizedContent).toContain('actions/cache');
      expect(optimized.optimizedContent).toContain('node_modules');
      expect(optimized.optimizedContent).toContain('package-lock.json');
    });
  });

  describe('Multi-workflow analysis', () => {
    it('should analyze multiple workflows and find shared optimizations', async () => {
      const workflow1Content = `
name: Frontend CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Install deps
      run: npm install
    - name: Test
      run: npm test
`;

      const workflow2Content = `
name: Backend CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Install deps
      run: npm install
    - name: Test
      run: npm test
`;

      const workflow1Path = path.join(tempDir, 'frontend-ci.yml');
      const workflow2Path = path.join(tempDir, 'backend-ci.yml');
      
      await fs.writeFile(workflow1Path, workflow1Content);
      await fs.writeFile(workflow2Path, workflow2Content);

      const result = await analyzer.analyzeMultipleWorkflows([
        workflow1Path,
        workflow2Path
      ]);

      expect(result.workflows).toHaveLength(2);
      
      // Should find shared caching opportunities
      expect(result.sharedCachingOpportunities).toHaveLength(1);
      expect(result.sharedCachingOpportunities[0].workflows).toContain(workflow1Path);
      expect(result.sharedCachingOpportunities[0].workflows).toContain(workflow2Path);
      
      // Should find cross-workflow optimizations
      expect(result.crossWorkflowOptimizations).toHaveLength(1);
      expect(result.crossWorkflowOptimizations[0].type).toBe('shared-caching');
      
      // Should provide overall recommendations
      expect(result.overallRecommendations).toHaveLength(1);
      expect(result.overallRecommendations[0].category).toBe('caching');
    });
  });

  describe('Performance edge cases', () => {
    it('should handle workflow with no optimization opportunities', async () => {
      const workflowContent = `
name: Perfect CI

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.npm
        key: node-\${{ hashFiles('**/package-lock.json') }}
    - name: Quick test
      run: echo "All good!"
`;

      const workflowPath = path.join(tempDir, 'perfect-ci.yml');
      await fs.writeFile(workflowPath, workflowContent);

      const result = await analyzer.analyzeWorkflowPerformance(workflowPath);

      expect(result.overallScore).toBeGreaterThan(90); // Should have high score
      expect(result.cachingOpportunities).toHaveLength(0); // Already has caching
      expect(result.recommendations).toHaveLength(0); // No recommendations needed
      expect(result.bottlenecks).toHaveLength(0); // No bottlenecks
    });

    it('should handle workflow with complex matrix builds', async () => {
      const workflowContent = `
name: Complex Matrix

on: [push]

jobs:
  test:
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
        include:
          - os: ubuntu-latest
            node-version: 21
        exclude:
          - os: windows-latest
            node-version: 16
    
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.npm
        key: \${{ runner.os }}-node-\${{ matrix.node-version }}-\${{ hashFiles('**/package-lock.json') }}
    - name: Install
      run: npm ci
    - name: Test
      run: npm test
`;

      const workflowPath = path.join(tempDir, 'complex-matrix.yml');
      await fs.writeFile(workflowPath, workflowContent);

      const result = await analyzer.analyzeWorkflowPerformance(workflowPath);

      expect(result.overallScore).toBeGreaterThan(80); // Should have good score
      expect(result.cachingOpportunities).toHaveLength(0); // Already optimized
      expect(result.parallelizationSuggestions).toHaveLength(0); // Matrix is already parallel
    });
  });
});