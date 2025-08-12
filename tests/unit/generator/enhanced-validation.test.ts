/**
 * Tests for enhanced validation with detailed feedback
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EnhancedWorkflowValidator,
  EnhancedValidationConfig,
  DetailedValidationFeedback,
  PerformanceAnalysis,
  SecurityAnalysis,
  BestPracticeAnalysis,
  CompatibilityAnalysis,
  DetailedSuggestion
} from '../../../src/generator/validators/enhanced-validator';
import { DetectionResult } from '../../../src/generator/interfaces';

describe('EnhancedWorkflowValidator', () => {
  let validator: EnhancedWorkflowValidator;
  let mockDetectionResult: DetectionResult;

  beforeEach(() => {
    validator = new EnhancedWorkflowValidator();
    
    mockDetectionResult = {
      frameworks: [
        {
          name: 'react',
          version: '18.0.0',
          confidence: 0.9,
          evidence: ['package.json'],
          category: 'frontend'
        }
      ],
      languages: [
        {
          name: 'nodejs',
          version: '18.0.0',
          confidence: 0.95,
          primary: true
        }
      ],
      buildTools: [],
      packageManagers: [],
      testingFrameworks: [],
      deploymentTargets: [],
      projectMetadata: {
        name: 'test-project',
        description: 'Test project'
      }
    };
  });

  describe('Basic Validation', () => {
    it('should validate a simple workflow successfully', async () => {
      const yamlContent = `
name: Simple CI
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: echo "Building"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.validationResult.isValid).toBe(true);
      expect(feedback.validationResult.errors).toHaveLength(0);
      expect(feedback.improvementScore).toBeGreaterThan(0);
    });

    it('should detect validation errors', async () => {
      const yamlContent = `
name: Invalid CI
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Invalid step
        # Missing uses or run
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.validationResult.isValid).toBe(false);
      expect(feedback.validationResult.errors.length).toBeGreaterThan(0);
      expect(feedback.improvementScore).toBeLessThan(100);
    });

    it('should handle YAML parsing errors', async () => {
      const yamlContent = `
name: Invalid YAML
on:
  push:
    branches: [main
    # Missing closing bracket
jobs:
  build:
    runs-on: ubuntu-latest
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.validationResult.isValid).toBe(false);
      expect(feedback.validationResult.errors[0].type).toBe('syntax');
      expect(feedback.improvementScore).toBe(0);
    });
  });

  describe('Performance Analysis', () => {
    it('should identify parallelization opportunities', async () => {
      const yamlContent = `
name: Sequential Jobs
on:
  push:
    branches: [main]
jobs:
  job1:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Job 1"
  job2:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Job 2"
  job3:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Job 3"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.performanceAnalysis.parallelizationOpportunities.length).toBeGreaterThan(0);
      expect(feedback.performanceAnalysis.optimizationPotential).toBe('medium');
    });

    it('should identify caching opportunities', async () => {
      const yamlContent = `
name: No Caching
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.performanceAnalysis.cachingOpportunities.length).toBeGreaterThan(0);
      expect(feedback.performanceAnalysis.cachingOpportunities[0]).toContain('dependency caching');
    });

    it('should detect performance bottlenecks', async () => {
      const yamlContent = `
name: Long Job
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Step 1"
      - run: echo "Step 2"
      - run: echo "Step 3"
      - run: echo "Step 4"
      - run: echo "Step 5"
      - run: echo "Step 6"
      - run: echo "Step 7"
      - run: echo "Step 8"
      - run: echo "Step 9"
      - run: echo "Step 10"
      - run: echo "Step 11"
      - run: echo "Step 12"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.performanceAnalysis.bottlenecks.length).toBeGreaterThan(0);
      expect(feedback.performanceAnalysis.bottlenecks[0].type).toBe('sequential');
    });

    it('should estimate runtime', async () => {
      const yamlContent = `
name: Timed Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
      - run: npm test
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.performanceAnalysis.estimatedRuntime).toBeGreaterThan(0);
    });
  });

  describe('Security Analysis', () => {
    it('should detect missing permissions', async () => {
      const yamlContent = `
name: No Permissions
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Building"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.securityAnalysis.vulnerabilities.length).toBeGreaterThan(0);
      expect(feedback.securityAnalysis.vulnerabilities[0].type).toBe('permission');
    });

    it('should detect overly broad permissions', async () => {
      const yamlContent = `
name: Broad Permissions
on:
  push:
    branches: [main]
permissions: write-all
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Building"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.securityAnalysis.vulnerabilities.some(v => 
        v.type === 'permission' && v.severity === 'high'
      )).toBe(true);
    });

    it('should detect unpinned action versions', async () => {
      const yamlContent = `
name: Unpinned Actions
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - uses: actions/setup-node
      - run: echo "Building"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.securityAnalysis.vulnerabilities.some(v => 
        v.type === 'action-version' && v.severity === 'high'
      )).toBe(true);
    });

    it('should detect third-party actions', async () => {
      const yamlContent = `
name: Third Party Actions
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: some-user/custom-action@v1
      - run: echo "Building"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.securityAnalysis.vulnerabilities.some(v => 
        v.type === 'third-party'
      )).toBe(true);
    });

    it('should detect potential secret exposure', async () => {
      const yamlContent = `
name: Secret Exposure
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "API Key: \${{ secrets.API_KEY }}"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.securityAnalysis.vulnerabilities.some(v => 
        v.type === 'secret-exposure' && v.severity === 'critical'
      )).toBe(true);
    });

    it('should identify missing security features', async () => {
      const yamlContent = `
name: No Security
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run build
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.securityAnalysis.missingSecurityFeatures).toContain(
        'Static Application Security Testing (SAST)'
      );
      expect(feedback.securityAnalysis.missingSecurityFeatures).toContain(
        'Dependency vulnerability scanning'
      );
    });

    it('should calculate security score', async () => {
      const yamlContent = `
name: Secure Workflow
on:
  push:
    branches: [main]
permissions:
  contents: read
  security-events: write
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
      - uses: github/codeql-action/analyze@v3
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit
      - run: npm run build
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.securityAnalysis.securityScore).toBeGreaterThan(50);
    });
  });

  describe('Best Practice Analysis', () => {
    it('should analyze naming conventions', async () => {
      const yamlContent = `
name: ""
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Building"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.bestPracticeAnalysis.violations.some(v => 
        v.rule.includes('naming')
      )).toBe(true);
    });

    it('should analyze workflow structure', async () => {
      const yamlContent = `
name: Empty Workflow
on:
  push:
    branches: [main]
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.bestPracticeAnalysis.violations.some(v => 
        v.rule.includes('structure') && v.severity === 'error'
      )).toBe(true);
    });

    it('should analyze error handling', async () => {
      const yamlContent = `
name: No Error Handling
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Step 1"
      - run: echo "Step 2"
      - run: echo "Step 3"
      - run: echo "Step 4"
      - run: echo "Step 5"
      - run: echo "Step 6"
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.bestPracticeAnalysis.violations.some(v => 
        v.rule.includes('error-handling')
      )).toBe(true);
    });

    it('should calculate overall best practice score', async () => {
      const yamlContent = `
name: Well Structured Workflow
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
        continue-on-error: false
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.bestPracticeAnalysis.overallScore).toBeGreaterThan(70);
    });
  });

  describe('Compatibility Analysis', () => {
    it('should analyze runner compatibility', async () => {
      const yamlContent = `
name: Multiple Runners
on:
  push:
    branches: [main]
jobs:
  test-ubuntu:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
  test-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
  test-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
  test-custom:
    runs-on: custom-runner
    steps:
      - uses: actions/checkout@v4
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.compatibilityAnalysis.runnerCompatibility).toHaveLength(4);
      expect(feedback.compatibilityAnalysis.runnerCompatibility.some(r => 
        r.runner === 'custom-runner' && !r.compatible
      )).toBe(true);
    });

    it('should provide runner alternatives', async () => {
      const yamlContent = `
name: Incompatible Runner
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: old-ubuntu-runner
    steps:
      - uses: actions/checkout@v4
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      const incompatibleRunner = feedback.compatibilityAnalysis.runnerCompatibility.find(r => 
        !r.compatible
      );
      
      if (incompatibleRunner) {
        expect(incompatibleRunner.alternatives.length).toBeGreaterThan(0);
        expect(incompatibleRunner.alternatives).toContain('ubuntu-latest');
      }
    });
  });

  describe('Detailed Suggestions', () => {
    it('should generate performance suggestions', async () => {
      const yamlContent = `
name: Slow Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      const performanceSuggestions = feedback.suggestions.filter(s => 
        s.category === 'performance'
      );
      
      expect(performanceSuggestions.length).toBeGreaterThan(0);
      expect(performanceSuggestions[0]).toHaveProperty('implementation');
      expect(performanceSuggestions[0]).toHaveProperty('estimatedImpact');
    });

    it('should generate security suggestions', async () => {
      const yamlContent = `
name: Insecure Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - run: npm install
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      const securitySuggestions = feedback.suggestions.filter(s => 
        s.category === 'security'
      );
      
      expect(securitySuggestions.length).toBeGreaterThan(0);
      expect(securitySuggestions.some(s => s.priority === 'critical' || s.priority === 'high')).toBe(true);
    });

    it('should prioritize suggestions correctly', async () => {
      const yamlContent = `
name: Multiple Issues
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - run: echo "\${{ secrets.API_KEY }}"
      - run: npm install
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      const criticalSuggestions = feedback.suggestions.filter(s => s.priority === 'critical');
      const highSuggestions = feedback.suggestions.filter(s => s.priority === 'high');
      
      expect(criticalSuggestions.length).toBeGreaterThan(0);
      expect(feedback.suggestions[0].priority).toBe('critical');
    });

    it('should limit suggestions to maximum configured', async () => {
      const limitedValidator = new EnhancedWorkflowValidator({
        maxSuggestions: 5
      });

      const yamlContent = `
name: Many Issues
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - uses: some-user/action@main
      - run: echo "\${{ secrets.API_KEY }}"
      - run: npm install
      - run: npm run build
      - run: npm test
`;

      const feedback = await limitedValidator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Improvement Score Calculation', () => {
    it('should calculate improvement score based on all factors', async () => {
      const yamlContent = `
name: Average Workflow
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.improvementScore).toBeGreaterThan(0);
      expect(feedback.improvementScore).toBeLessThanOrEqual(100);
    });

    it('should penalize validation errors', async () => {
      const yamlContent = `
name: Error Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Invalid step
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.improvementScore).toBeLessThan(50);
    });
  });

  describe('Estimated Improvements', () => {
    it('should estimate runtime improvements', async () => {
      const yamlContent = `
name: Slow Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      const runtimeImprovement = feedback.estimatedImprovements.find(i => 
        i.metric === 'runtime'
      );
      
      if (runtimeImprovement) {
        expect(runtimeImprovement.improvedValue).toBeLessThan(runtimeImprovement.currentValue);
        expect(runtimeImprovement.confidence).toBeGreaterThan(0);
        expect(runtimeImprovement.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should estimate security improvements', async () => {
      const yamlContent = `
name: Insecure Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - run: npm install
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent);

      const securityImprovement = feedback.estimatedImprovements.find(i => 
        i.metric === 'security'
      );
      
      if (securityImprovement) {
        expect(securityImprovement.improvedValue).toBeGreaterThan(securityImprovement.currentValue);
        expect(securityImprovement.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('Configuration Options', () => {
    it('should disable analysis components when configured', async () => {
      const limitedValidator = new EnhancedWorkflowValidator({
        includePerformanceAnalysis: false,
        includeSecurityAnalysis: false,
        includeBestPracticeAnalysis: false,
        includeCompatibilityAnalysis: false,
        provideSuggestions: false
      });

      const yamlContent = `
name: Simple Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;

      const feedback = await limitedValidator.validateWithDetailedFeedback(yamlContent);

      expect(feedback.performanceAnalysis.parallelizationOpportunities).toHaveLength(0);
      expect(feedback.securityAnalysis.vulnerabilities).toHaveLength(0);
      expect(feedback.bestPracticeAnalysis.violations).toHaveLength(0);
      expect(feedback.compatibilityAnalysis.runnerCompatibility).toHaveLength(0);
      expect(feedback.suggestions).toHaveLength(0);
    });

    it('should use custom suggestion priorities', async () => {
      const customValidator = new EnhancedWorkflowValidator({
        suggestionPriority: ['high', 'medium', 'low']
      });

      const yamlContent = `
name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
`;

      const feedback = await customValidator.validateWithDetailedFeedback(yamlContent);

      // Should still generate suggestions but with different prioritization
      expect(feedback.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Detection Results', () => {
    it('should use detection results for context-aware analysis', async () => {
      const yamlContent = `
name: React Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
`;

      const feedback = await validator.validateWithDetailedFeedback(yamlContent, mockDetectionResult);

      // Should provide React-specific suggestions
      expect(feedback.suggestions.some(s => 
        s.description.toLowerCase().includes('react') || 
        s.implementation.toLowerCase().includes('react')
      )).toBe(true);
    });
  });
});