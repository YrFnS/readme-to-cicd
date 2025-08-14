/**
 * Integration tests for Agent Hooks Integration with YAML Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentHooksIntegration } from '../../src/generator/workflow-specialization/agent-hooks-integration';
import { DetectionResult, GenerationOptions } from '../../src/generator/interfaces';

describe('Agent Hooks Integration - Integration Tests', () => {
  let agentHooks: AgentHooksIntegration;
  let realWorldDetectionResult: DetectionResult;

  beforeEach(() => {
    agentHooks = new AgentHooksIntegration({
      automationLevel: 'standard',
      optimizationEnabled: true,
      recoveryEnabled: true,
      dependencyUpdateStrategy: 'moderate'
    });

    // Simulate a real-world detection result
    realWorldDetectionResult = {
      frameworks: [
        { name: 'Next.js', confidence: 0.95, evidence: ['next.config.js', 'package.json'], category: 'fullstack' },
        { name: 'React', confidence: 0.9, evidence: ['package.json', 'src/components'], category: 'frontend' },
        { name: 'Tailwind CSS', confidence: 0.8, evidence: ['tailwind.config.js'], category: 'frontend' }
      ],
      languages: [
        { name: 'TypeScript', confidence: 0.95, primary: true },
        { name: 'JavaScript', confidence: 0.7, primary: false }
      ],
      buildTools: [
        { name: 'webpack', confidence: 0.9 },
        { name: 'babel', confidence: 0.8 },
        { name: 'postcss', confidence: 0.7 }
      ],
      packageManagers: [
        { name: 'npm', confidence: 0.95, lockFile: 'package-lock.json' }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.9 },
        { name: 'React Testing Library', type: 'unit', confidence: 0.85 },
        { name: 'Playwright', type: 'e2e', confidence: 0.8 }
      ],
      deploymentTargets: [
        { platform: 'Vercel', type: 'static', confidence: 0.9 },
        { platform: 'Docker', type: 'container', confidence: 0.6 }
      ],
      projectMetadata: {
        name: 'modern-web-app',
        description: 'A modern web application with Next.js and TypeScript',
        version: '1.2.3',
        repository: 'https://github.com/company/modern-web-app',
        homepage: 'https://modern-web-app.vercel.app',
        author: 'Development Team',
        keywords: ['nextjs', 'react', 'typescript', 'tailwind']
      }
    };
  });

  describe('end-to-end workflow generation', () => {
    it('should generate complete Agent Hooks workflow suite', async () => {
      const options: GenerationOptions = {
        workflowType: 'maintenance',
        optimizationLevel: 'aggressive',
        includeComments: true,
        agentHooksEnabled: true,
        securityLevel: 'enterprise',
        testingStrategy: {
          unitTests: true,
          integrationTests: true,
          e2eTests: true,
          performanceTests: true,
          securityTests: true,
          contractTests: false,
          chaosEngineering: false
        }
      };

      const workflows = await agentHooks.generateAgentHooksWorkflows(realWorldDetectionResult, options);

      // Verify all expected workflows are generated
      expect(workflows).toHaveLength(4);
      
      const workflowNames = workflows.map(w => w.filename);
      expect(workflowNames).toContain('agent-hooks-webhook-response.yml');
      expect(workflowNames).toContain('agent-hooks-dependency-updates.yml');
      expect(workflowNames).toContain('agent-hooks-performance-optimization.yml');
      expect(workflowNames).toContain('agent-hooks-retry-recovery.yml');

      // Verify each workflow has proper structure
      workflows.forEach(workflow => {
        expect(workflow.content).toContain('Agent Hooks');
        expect(workflow.metadata.generatedAt).toBeInstanceOf(Date);
        expect(workflow.metadata.detectionSummary).toContain('TypeScript');
        expect(workflow.metadata.detectionSummary).toContain('Next.js');
        expect(workflow.metadata.optimizations.length).toBeGreaterThan(0);
      });
    });

    it('should handle complex multi-framework projects', async () => {
      const complexDetection: DetectionResult = {
        ...realWorldDetectionResult,
        frameworks: [
          { name: 'Next.js', confidence: 0.95, evidence: ['next.config.js'], category: 'fullstack' },
          { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
          { name: 'Express', confidence: 0.8, evidence: ['server.js'], category: 'backend' },
          { name: 'Prisma', confidence: 0.85, evidence: ['prisma/schema.prisma'], category: 'backend' },
          { name: 'Tailwind CSS', confidence: 0.8, evidence: ['tailwind.config.js'], category: 'frontend' }
        ],
        languages: [
          { name: 'TypeScript', confidence: 0.95, primary: true },
          { name: 'JavaScript', confidence: 0.7, primary: false },
          { name: 'SQL', confidence: 0.6, primary: false }
        ]
      };

      const workflows = await agentHooks.generateAgentHooksWorkflows(complexDetection, {
        workflowType: 'maintenance',
        optimizationLevel: 'standard',
        includeComments: true
      });

      expect(workflows).toHaveLength(4);
      
      // Should handle multiple frameworks intelligently
      workflows.forEach(workflow => {
        expect(workflow.metadata.detectionSummary).toContain('Next.js');
        expect(workflow.metadata.detectionSummary).toContain('React');
        expect(workflow.metadata.warnings.length).toBe(0); // No warnings for complete detection
      });
    });

    it('should generate workflows with proper GitHub Actions syntax', async () => {
      const workflows = await agentHooks.generateAgentHooksWorkflows(realWorldDetectionResult, {
        workflowType: 'maintenance',
        optimizationLevel: 'standard',
        includeComments: true
      });

      workflows.forEach(workflow => {
        // Basic YAML structure validation
        expect(workflow.content).toContain('Agent Hooks');
        
        // Should not contain obvious syntax errors
        expect(workflow.content).not.toContain('undefined');
        expect(workflow.content).not.toContain('[object Object]');
        expect(workflow.content).not.toContain('null');
        
        // Should contain proper workflow structure indicators
        expect(workflow.content.length).toBeGreaterThan(50); // Non-empty content
      });
    });
  });

  describe('webhook response workflows', () => {
    it('should generate comprehensive webhook response workflow', async () => {
      const workflow = await agentHooks.generateWebhookResponseWorkflow(realWorldDetectionResult, {
        workflowType: 'maintenance',
        optimizationLevel: 'aggressive',
        includeComments: true
      });

      expect(workflow.filename).toBe('agent-hooks-webhook-response.yml');
      expect(workflow.type).toBe('maintenance');
      expect(workflow.content).toContain('Agent Hooks - Webhook Response');
      
      // Should include optimizations for webhook automation
      expect(workflow.metadata.optimizations).toContain('webhook-automation');
      expect(workflow.metadata.optimizations).toContain('intelligent-responses');
      expect(workflow.metadata.optimizations).toContain('event-driven-optimization');
    });

    it('should adapt to different project types', async () => {
      const backendDetection: DetectionResult = {
        ...realWorldDetectionResult,
        frameworks: [
          { name: 'Express', confidence: 0.95, evidence: ['server.js'], category: 'backend' },
          { name: 'MongoDB', confidence: 0.8, evidence: ['mongoose'], category: 'backend' }
        ],
        languages: [
          { name: 'JavaScript', confidence: 0.95, primary: true }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.95 }
        ]
      };

      const workflow = await agentHooks.generateWebhookResponseWorkflow(backendDetection, {
        workflowType: 'maintenance',
        optimizationLevel: 'standard',
        includeComments: true
      });

      expect(workflow.metadata.detectionSummary).toContain('Express');
      expect(workflow.metadata.detectionSummary).toContain('JavaScript');
    });
  });

  describe('dependency update workflows', () => {
    it('should generate intelligent dependency update workflow', async () => {
      const workflow = await agentHooks.generateDependencyUpdateWorkflow(realWorldDetectionResult, {
        workflowType: 'maintenance',
        optimizationLevel: 'standard',
        includeComments: true
      });

      expect(workflow.filename).toBe('agent-hooks-dependency-updates.yml');
      expect(workflow.type).toBe('maintenance');
      expect(workflow.content).toContain('Agent Hooks - Intelligent Dependency Updates');
      
      // Should include dependency update optimizations
      expect(workflow.metadata.optimizations).toContain('automated-updates');
      expect(workflow.metadata.optimizations).toContain('intelligent-testing');
      expect(workflow.metadata.optimizations).toContain('risk-assessment');
    });

    it('should handle multiple package managers', async () => {
      const multiPMDetection: DetectionResult = {
        ...realWorldDetectionResult,
        packageManagers: [
          { name: 'npm', confidence: 0.8, lockFile: 'package-lock.json' },
          { name: 'yarn', confidence: 0.6, lockFile: 'yarn.lock' }
        ]
      };

      const workflow = await agentHooks.generateDependencyUpdateWorkflow(multiPMDetection, {
        workflowType: 'maintenance',
        optimizationLevel: 'standard',
        includeComments: true
      });

      // Should prefer npm based on higher confidence
      expect(workflow.metadata.warnings.length).toBe(0);
    });
  });

  describe('performance optimization workflows', () => {
    it('should generate performance optimization workflow', async () => {
      const workflow = await agentHooks.generatePerformanceOptimizationWorkflow(realWorldDetectionResult, {
        workflowType: 'performance',
        optimizationLevel: 'aggressive',
        includeComments: true
      });

      expect(workflow.filename).toBe('agent-hooks-performance-optimization.yml');
      expect(workflow.type).toBe('performance');
      expect(workflow.content).toContain('Agent Hooks - Performance Optimization');
      
      // Should include performance optimizations
      expect(workflow.metadata.optimizations).toContain('performance-monitoring');
      expect(workflow.metadata.optimizations).toContain('bottleneck-detection');
      expect(workflow.metadata.optimizations).toContain('auto-optimization');
    });
  });

  describe('retry and recovery workflows', () => {
    it('should generate intelligent retry and recovery workflow', async () => {
      const workflow = await agentHooks.generateRetryRecoveryWorkflow(realWorldDetectionResult, {
        workflowType: 'maintenance',
        optimizationLevel: 'standard',
        includeComments: true
      });

      expect(workflow.filename).toBe('agent-hooks-retry-recovery.yml');
      expect(workflow.type).toBe('maintenance');
      expect(workflow.content).toContain('Agent Hooks - Intelligent Retry & Recovery');
      
      // Should include recovery optimizations
      expect(workflow.metadata.optimizations).toContain('intelligent-retry');
      expect(workflow.metadata.optimizations).toContain('failure-recovery');
      expect(workflow.metadata.optimizations).toContain('resilience-patterns');
    });
  });

  describe('configuration and customization', () => {
    it('should respect different automation levels', async () => {
      const basicConfig = new AgentHooksIntegration({
        automationLevel: 'basic',
        optimizationEnabled: false
      });

      const aggressiveConfig = new AgentHooksIntegration({
        automationLevel: 'aggressive',
        optimizationEnabled: true
      });

      const basicWorkflows = await basicConfig.generateAgentHooksWorkflows(realWorldDetectionResult, {
        workflowType: 'maintenance',
        optimizationLevel: 'basic',
        includeComments: true
      });

      const aggressiveWorkflows = await aggressiveConfig.generateAgentHooksWorkflows(realWorldDetectionResult, {
        workflowType: 'maintenance',
        optimizationLevel: 'aggressive',
        includeComments: true
      });

      expect(basicWorkflows).toHaveLength(4);
      expect(aggressiveWorkflows).toHaveLength(4);
      
      // Both should generate workflows but with different optimization levels
      basicWorkflows.forEach(workflow => {
        expect(workflow.metadata.optimizations.length).toBeGreaterThan(0);
      });

      aggressiveWorkflows.forEach(workflow => {
        expect(workflow.metadata.optimizations.length).toBeGreaterThan(0);
      });
    });

    it('should handle custom performance thresholds', async () => {
      const customThresholds = new AgentHooksIntegration({
        performanceThresholds: {
          buildTimeMinutes: 5,
          testTimeMinutes: 8,
          deploymentTimeMinutes: 12,
          failureRatePercent: 3,
          resourceUsagePercent: 75
        }
      });

      const workflows = await customThresholds.generateAgentHooksWorkflows(realWorldDetectionResult, {
        workflowType: 'performance',
        optimizationLevel: 'standard',
        includeComments: true
      });

      expect(workflows).toHaveLength(4);
      
      const performanceWorkflow = workflows.find(w => w.type === 'performance');
      expect(performanceWorkflow).toBeDefined();
      expect(performanceWorkflow!.metadata.optimizations).toContain('performance-monitoring');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle minimal detection results', async () => {
      const minimalDetection: DetectionResult = {
        frameworks: [],
        languages: [{ name: 'JavaScript', confidence: 0.5, primary: true }],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'minimal-project'
        }
      };

      const workflows = await agentHooks.generateAgentHooksWorkflows(minimalDetection, {
        workflowType: 'maintenance',
        optimizationLevel: 'basic',
        includeComments: true
      });

      expect(workflows).toHaveLength(4);
      
      // Should generate warnings for missing components
      const totalWarnings = workflows.reduce((sum, w) => sum + w.metadata.warnings.length, 0);
      expect(totalWarnings).toBeGreaterThan(0);
    });

    it('should handle unknown languages gracefully', async () => {
      const unknownLanguageDetection: DetectionResult = {
        ...realWorldDetectionResult,
        languages: [
          { name: 'UnknownLang', confidence: 0.8, primary: true }
        ]
      };

      const workflows = await agentHooks.generateAgentHooksWorkflows(unknownLanguageDetection, {
        workflowType: 'maintenance',
        optimizationLevel: 'standard',
        includeComments: true
      });

      expect(workflows).toHaveLength(4);
      
      // Should still generate workflows even with unknown languages
      workflows.forEach(workflow => {
        expect(workflow.content).toContain('Agent Hooks');
        expect(workflow.metadata.detectionSummary).toContain('UnknownLang');
      });
    });
  });
});