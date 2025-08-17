import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { WorkflowValidator } from '../../src/core/WorkflowValidator';
import { 
  WorkflowFile, 
  DetectedFramework, 
  WorkflowType 
} from '../../src/core/types';

describe('WorkflowValidator Integration Tests', () => {
  let validator: WorkflowValidator;
  // let testWorkspaceUri: vscode.Uri;
  let testWorkflowsDir: string;

  beforeEach(async () => {
    validator = new WorkflowValidator();
    
    // Create temporary test workspace
    const tempDir = path.join(__dirname, '..', 'temp', 'workflow-validator-integration');
    testWorkflowsDir = path.join(tempDir, '.github', 'workflows');
    
    await fs.mkdir(testWorkflowsDir, { recursive: true });
    // testWorkspaceUri = vscode.Uri.file(tempDir);
  });

  afterEach(async () => {
    validator.dispose();
    
    // Clean up temporary files
    try {
      await fs.rm(path.dirname(testWorkflowsDir), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Real workflow validation', () => {
    it('should validate a complete Node.js CI workflow', async () => {
      const workflowContent = `
name: Node.js CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16, 18, 20]
        
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run tests
      run: npm test
      
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        token: \${{ secrets.CODECOV_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build
      
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-files
        path: dist/
        
    - name: Deploy to production
      run: echo "Deploying to production..."
      env:
        DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}
`;

      const workflowFile: WorkflowFile = {
        filename: 'nodejs-ci.yml',
        content: workflowContent,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/nodejs-ci.yml'
      };

      const detectedFrameworks: DetectedFramework[] = [{
        name: 'nodejs',
        version: '18',
        confidence: 0.95,
        type: 'runtime',
        ecosystem: 'javascript',
        evidence: [
          { type: 'file', source: 'package.json', value: 'found', confidence: 0.9 },
          { type: 'command', source: 'npm', value: 'detected', confidence: 0.8 }
        ]
      }];

      const context = {
        detectedFrameworks,
        projectSecrets: ['CODECOV_TOKEN', 'DEPLOY_TOKEN']
      };

      const result = await validator.validateWorkflow(workflowFile, context);

      // Should be a high-quality workflow
      expect(result.overallScore).toBeGreaterThan(80);
      expect(result.syntaxValidation.isValid).toBe(true);
      expect(result.actionValidation.isValid).toBe(true);
      expect(result.secretValidation.isValid).toBe(true);
      
      // Should have good performance score due to caching
      expect(result.performanceAnalysis.score).toBeGreaterThan(70);
      
      // Should have good security score
      expect(result.securityAnalysis.score).toBeGreaterThan(80);
      
      // Should suggest some optimizations
      expect(result.optimizationSuggestions.length).toBeGreaterThan(0);
    });

    it('should validate a Python CI/CD workflow with security issues', async () => {
      const workflowContent = `
name: Python CI/CD

on:
  pull_request_target:
    branches: [ main ]

permissions: write-all

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v2  # Outdated version
      
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
        
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        
    - name: Run tests with user input
      run: echo "Testing \${{ github.event.pull_request.title }}"
      
    - name: Deploy with hardcoded secret
      run: |
        export API_KEY="hardcoded-secret-123"
        python deploy.py
        
    - name: Unsafe third-party action
      uses: untrusted-org/dangerous-action@main
`;

      const workflowFile: WorkflowFile = {
        filename: 'python-unsafe.yml',
        content: workflowContent,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/python-unsafe.yml'
      };

      const result = await validator.validateWorkflow(workflowFile);

      // Should have low overall score due to security issues
      expect(result.overallScore).toBeLessThan(50);
      
      // Should detect multiple security vulnerabilities
      expect(result.securityAnalysis.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.securityAnalysis.vulnerabilities.some(v => v.type === 'excessive-permissions')).toBe(true);
      expect(result.securityAnalysis.vulnerabilities.some(v => v.type === 'pull-request-target')).toBe(true);
      expect(result.securityAnalysis.vulnerabilities.some(v => v.type === 'script-injection')).toBe(true);
      expect(result.securityAnalysis.vulnerabilities.some(v => v.type === 'untrusted-action')).toBe(true);
      
      // Should detect hardcoded secrets
      expect(result.secretValidation.errors.some(e => e.code === 'hardcoded-secret')).toBe(true);
      
      // Should suggest action version updates
      expect(result.actionValidation.warnings.some(w => w.code === 'outdated-action-version')).toBe(true);
      
      // Should provide quick fixes
      expect(result.quickFixes.length).toBeGreaterThan(0);
    });

    it('should simulate complex multi-job workflow execution', async () => {
      const workflowContent = `
name: Complex Multi-Job Workflow

on: [push]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
    - run: npm ci
    - run: npm test

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm run test:integration

  build:
    needs: [lint, unit-tests, integration-tests]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm run build

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
    - run: echo "Deploying to staging"

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
    - run: echo "Deploying to production"
`;

      const workflowFile: WorkflowFile = {
        filename: 'complex-workflow.yml',
        content: workflowContent,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/complex-workflow.yml'
      };

      const simulationResult = await validator.simulateWorkflow(workflowFile);

      expect(simulationResult.success).toBe(true);
      expect(simulationResult.executionPlan.length).toBeGreaterThan(10);
      
      // Should estimate reasonable execution time
      expect(simulationResult.estimatedDuration).toBeGreaterThan(300); // At least 5 minutes
      expect(simulationResult.estimatedDuration).toBeLessThan(3600); // Less than 1 hour
      
      // Should estimate resource usage
      expect(simulationResult.resourceUsage.cpu).toBeGreaterThan(0);
      expect(simulationResult.resourceUsage.memory).toBeGreaterThan(0);
      expect(simulationResult.resourceUsage.storage).toBeGreaterThan(0);
      
      // Should provide recommendations
      expect(simulationResult.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle workflow with missing secrets during simulation', async () => {
      const workflowContent = `
name: Workflow with Secrets

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Deploy
      run: echo "Deploying..."
      env:
        API_KEY: \${{ secrets.API_KEY }}
        DATABASE_URL: \${{ secrets.DATABASE_URL }}
        MISSING_SECRET: \${{ secrets.MISSING_SECRET }}
`;

      const workflowFile: WorkflowFile = {
        filename: 'secrets-workflow.yml',
        content: workflowContent,
        type: 'cd' as WorkflowType,
        relativePath: '.github/workflows/secrets-workflow.yml'
      };

      const simulationOptions = {
        availableSecrets: ['API_KEY', 'DATABASE_URL'] // MISSING_SECRET is not available
      };

      const simulationResult = await validator.simulateWorkflow(workflowFile, simulationOptions);

      expect(simulationResult.success).toBe(true);
      expect(simulationResult.potentialIssues.length).toBeGreaterThan(0);
      expect(simulationResult.potentialIssues.some(i => 
        i.type === 'missing-secret' && i.message.includes('MISSING_SECRET')
      )).toBe(true);
    });

    it('should provide framework-specific optimization suggestions', async () => {
      const workflowContent = `
name: Multi-Framework Project

on: [push]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm install
    - run: npm run build

  backend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v4
    - run: pip install -r requirements.txt
    - run: python -m pytest

  database:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-java@v3
    - run: mvn clean compile
    - run: mvn test
`;

      const workflowFile: WorkflowFile = {
        filename: 'multi-framework.yml',
        content: workflowContent,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/multi-framework.yml'
      };

      const detectedFrameworks: DetectedFramework[] = [
        {
          name: 'nodejs',
          confidence: 0.9,
          type: 'runtime',
          ecosystem: 'javascript',
          evidence: []
        },
        {
          name: 'python',
          confidence: 0.85,
          type: 'runtime',
          ecosystem: 'python',
          evidence: []
        },
        {
          name: 'java',
          confidence: 0.8,
          type: 'runtime',
          ecosystem: 'java',
          evidence: []
        }
      ];

      const result = await validator.validateWorkflow(workflowFile, { detectedFrameworks });

      // Should suggest caching for all three frameworks
      expect(result.optimizationSuggestions.filter(s => s.type === 'caching').length).toBe(3);
      expect(result.optimizationSuggestions.some(s => s.description.includes('Node.js'))).toBe(true);
      expect(result.optimizationSuggestions.some(s => s.description.includes('Python'))).toBe(true);
      expect(result.optimizationSuggestions.some(s => s.description.includes('Maven'))).toBe(true);
      
      // Should identify missing cache as performance bottleneck
      expect(result.performanceAnalysis.bottlenecks.some(b => b.type === 'missing-cache')).toBe(true);
    });
  });

  describe('File system integration', () => {
    it('should validate workflow files from disk', async () => {
      const workflowContent = `
name: File System Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: echo "Hello World"
`;

      const workflowPath = path.join(testWorkflowsDir, 'filesystem-test.yml');
      await fs.writeFile(workflowPath, workflowContent);

      const workflowFile: WorkflowFile = {
        filename: 'filesystem-test.yml',
        content: workflowContent,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/filesystem-test.yml'
      };

      const result = await validator.validateWorkflow(workflowFile);

      expect(result.syntaxValidation.isValid).toBe(true);
      expect(result.overallScore).toBeGreaterThan(70);
    });

    it('should handle file reading errors gracefully', async () => {
      const workflowFile: WorkflowFile = {
        filename: 'nonexistent.yml',
        content: '', // Empty content to simulate read error
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/nonexistent.yml'
      };

      const result = await validator.validateWorkflow(workflowFile);

      // Should handle empty content gracefully
      expect(result).toBeDefined();
      expect(result.syntaxValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance benchmarks', () => {
    it('should validate large workflows efficiently', async () => {
      // Generate a large workflow with many jobs and steps
      const jobs = Array.from({ length: 20 }, (_, i) => `
  job-${i}:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm test
    - run: npm run build
    - run: echo "Job ${i} complete"
`).join('');

      const workflowContent = `
name: Large Workflow Test
on: [push]
jobs:${jobs}
`;

      const workflowFile: WorkflowFile = {
        filename: 'large-workflow.yml',
        content: workflowContent,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/large-workflow.yml'
      };

      const startTime = Date.now();
      const result = await validator.validateWorkflow(workflowFile);
      const endTime = Date.now();

      // Should complete validation within reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it('should simulate complex workflows efficiently', async () => {
      const workflowContent = `
name: Complex Simulation Test
on: [push]
jobs:
  ${Array.from({ length: 10 }, (_, i) => `
  job-${i}:
    runs-on: ubuntu-latest
    needs: ${i > 0 ? `job-${i - 1}` : '[]'}
    strategy:
      matrix:
        version: [1, 2, 3]
    steps:
    - uses: actions/checkout@v4
    - run: echo "Step 1"
    - run: echo "Step 2"
    - run: echo "Step 3"
  `).join('')}
`;

      const workflowFile: WorkflowFile = {
        filename: 'complex-simulation.yml',
        content: workflowContent,
        type: 'ci' as WorkflowType,
        relativePath: '.github/workflows/complex-simulation.yml'
      };

      const startTime = Date.now();
      const result = await validator.simulateWorkflow(workflowFile);
      const endTime = Date.now();

      // Should complete simulation within reasonable time (< 3 seconds)
      expect(endTime - startTime).toBeLessThan(3000);
      expect(result.success).toBe(true);
      expect(result.executionPlan.length).toBeGreaterThan(20);
    });
  });
});