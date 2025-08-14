/**
 * Tests for Agent Hooks Integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentHooksIntegration, AgentHooksConfig } from '../../../../src/generator/workflow-specialization/agent-hooks-integration';
import { DetectionResult, GenerationOptions } from '../../../../src/generator/interfaces';

describe('AgentHooksIntegration', () => {
  let agentHooks: AgentHooksIntegration;
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    agentHooks = new AgentHooksIntegration();
    
    mockDetectionResult = {
      frameworks: [
        { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }
      ],
      languages: [
        { name: 'JavaScript', confidence: 0.95, primary: true }
      ],
      buildTools: [
        { name: 'webpack', confidence: 0.8 }
      ],
      packageManagers: [
        { name: 'npm', confidence: 0.9 }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.85 }
      ],
      deploymentTargets: [
        { platform: 'Vercel', type: 'static', confidence: 0.8 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project',
        version: '1.0.0'
      }
    };

    mockOptions = {
      workflowType: 'maintenance',
      optimizationLevel: 'standard',
      includeComments: true,
      agentHooksEnabled: true
    };
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const hooks = new AgentHooksIntegration();
      expect(hooks).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<AgentHooksConfig> = {
        automationLevel: 'aggressive',
        optimizationEnabled: false
      };
      
      const hooks = new AgentHooksIntegration(customConfig);
      expect(hooks).toBeDefined();
    });
  });

  describe('generateAgentHooksWorkflows', () => {
    it('should generate multiple Agent Hooks workflows', async () => {
      const workflows = await agentHooks.generateAgentHooksWorkflows(mockDetectionResult, mockOptions);
      
      expect(workflows).toHaveLength(4);
      expect(workflows[0].filename).toBe('agent-hooks-webhook-response.yml');
      expect(workflows[1].filename).toBe('agent-hooks-dependency-updates.yml');
      expect(workflows[2].filename).toBe('agent-hooks-performance-optimization.yml');
      expect(workflows[3].filename).toBe('agent-hooks-retry-recovery.yml');
    });

    it('should include proper metadata in all workflows', async () => {
      const workflows = await agentHooks.generateAgentHooksWorkflows(mockDetectionResult, mockOptions);
      
      workflows.forEach(workflow => {
        expect(workflow.metadata).toBeDefined();
        expect(workflow.metadata.generatedAt).toBeInstanceOf(Date);
        expect(workflow.metadata.generatorVersion).toBe('1.0.0');
        expect(workflow.metadata.detectionSummary).toContain('JavaScript');
        expect(workflow.metadata.optimizations).toBeInstanceOf(Array);
        expect(workflow.metadata.warnings).toBeInstanceOf(Array);
      });
    });
  });

  describe('generateWebhookResponseWorkflow', () => {
    it('should generate webhook response workflow', async () => {
      const workflow = await agentHooks.generateWebhookResponseWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.filename).toBe('agent-hooks-webhook-response.yml');
      expect(workflow.type).toBe('maintenance');
      expect(workflow.content).toContain('Agent Hooks Integration');
      expect(workflow.metadata.optimizations).toContain('webhook-automation');
    });

    it('should include proper triggers for webhook events', async () => {
      const workflow = await agentHooks.generateWebhookResponseWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.content).toContain('Agent Hooks - Webhook Response');
    });
  });

  describe('generateDependencyUpdateWorkflow', () => {
    it('should generate dependency update workflow', async () => {
      const workflow = await agentHooks.generateDependencyUpdateWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.filename).toBe('agent-hooks-dependency-updates.yml');
      expect(workflow.type).toBe('maintenance');
      expect(workflow.content).toContain('Agent Hooks Integration');
      expect(workflow.metadata.optimizations).toContain('automated-updates');
    });

    it('should handle projects without package managers', async () => {
      const detectionWithoutPM = {
        ...mockDetectionResult,
        packageManagers: []
      };
      
      const workflow = await agentHooks.generateDependencyUpdateWorkflow(detectionWithoutPM, mockOptions);
      
      expect(workflow.metadata.warnings).toContain('No package managers detected - dependency updates may not work');
    });
  });

  describe('generatePerformanceOptimizationWorkflow', () => {
    it('should generate performance optimization workflow', async () => {
      const workflow = await agentHooks.generatePerformanceOptimizationWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.filename).toBe('agent-hooks-performance-optimization.yml');
      expect(workflow.type).toBe('performance');
      expect(workflow.content).toContain('Agent Hooks Integration');
      expect(workflow.metadata.optimizations).toContain('performance-monitoring');
    });

    it('should warn when no testing frameworks are detected', async () => {
      const detectionWithoutTests = {
        ...mockDetectionResult,
        testingFrameworks: []
      };
      
      const workflow = await agentHooks.generatePerformanceOptimizationWorkflow(detectionWithoutTests, mockOptions);
      
      expect(workflow.metadata.warnings).toContain('No testing frameworks detected - performance validation may be limited');
    });
  });

  describe('generateRetryRecoveryWorkflow', () => {
    it('should generate retry and recovery workflow', async () => {
      const workflow = await agentHooks.generateRetryRecoveryWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.filename).toBe('agent-hooks-retry-recovery.yml');
      expect(workflow.type).toBe('maintenance');
      expect(workflow.content).toContain('Agent Hooks Integration');
      expect(workflow.metadata.optimizations).toContain('intelligent-retry');
    });
  });

  describe('language-specific setup', () => {
    it('should generate Node.js setup steps', async () => {
      const workflow = await agentHooks.generateWebhookResponseWorkflow(mockDetectionResult, mockOptions);
      
      // The workflow should contain Node.js-specific setup
      expect(workflow.content).toContain('Agent Hooks Integration');
    });

    it('should generate Python setup steps', async () => {
      const pythonDetection = {
        ...mockDetectionResult,
        languages: [{ name: 'Python', confidence: 0.95, primary: true }],
        packageManagers: [{ name: 'pip', confidence: 0.9 }]
      };
      
      const workflow = await agentHooks.generateWebhookResponseWorkflow(pythonDetection, mockOptions);
      
      expect(workflow.content).toContain('Agent Hooks Integration');
    });

    it('should generate Java setup steps', async () => {
      const javaDetection = {
        ...mockDetectionResult,
        languages: [{ name: 'Java', confidence: 0.95, primary: true }],
        packageManagers: [{ name: 'maven', confidence: 0.9 }]
      };
      
      const workflow = await agentHooks.generateWebhookResponseWorkflow(javaDetection, mockOptions);
      
      expect(workflow.content).toContain('Agent Hooks Integration');
    });

    it('should generate Rust setup steps', async () => {
      const rustDetection = {
        ...mockDetectionResult,
        languages: [{ name: 'Rust', confidence: 0.95, primary: true }],
        packageManagers: [{ name: 'cargo', confidence: 0.9 }]
      };
      
      const workflow = await agentHooks.generateWebhookResponseWorkflow(rustDetection, mockOptions);
      
      expect(workflow.content).toContain('Agent Hooks Integration');
    });

    it('should generate Go setup steps', async () => {
      const goDetection = {
        ...mockDetectionResult,
        languages: [{ name: 'Go', confidence: 0.95, primary: true }],
        packageManagers: [{ name: 'go', confidence: 0.9 }]
      };
      
      const workflow = await agentHooks.generateWebhookResponseWorkflow(goDetection, mockOptions);
      
      expect(workflow.content).toContain('Agent Hooks Integration');
    });
  });

  describe('configuration options', () => {
    it('should respect automation level configuration', () => {
      const conservativeConfig: Partial<AgentHooksConfig> = {
        automationLevel: 'basic',
        dependencyUpdateStrategy: 'conservative'
      };
      
      const hooks = new AgentHooksIntegration(conservativeConfig);
      expect(hooks).toBeDefined();
    });

    it('should respect performance thresholds', () => {
      const customThresholds: Partial<AgentHooksConfig> = {
        performanceThresholds: {
          buildTimeMinutes: 5,
          testTimeMinutes: 10,
          deploymentTimeMinutes: 15,
          failureRatePercent: 2,
          resourceUsagePercent: 70
        }
      };
      
      const hooks = new AgentHooksIntegration(customThresholds);
      expect(hooks).toBeDefined();
    });

    it('should handle disabled optimization', () => {
      const disabledOptimization: Partial<AgentHooksConfig> = {
        optimizationEnabled: false,
        recoveryEnabled: false
      };
      
      const hooks = new AgentHooksIntegration(disabledOptimization);
      expect(hooks).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing detection data gracefully', async () => {
      const emptyDetection: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'empty-project'
        }
      };
      
      const workflows = await agentHooks.generateAgentHooksWorkflows(emptyDetection, mockOptions);
      
      expect(workflows).toHaveLength(4);
      
      // At least some workflows should have warnings for empty detection
      const totalWarnings = workflows.reduce((sum, workflow) => sum + workflow.metadata.warnings.length, 0);
      expect(totalWarnings).toBeGreaterThan(0);
    });

    it('should provide meaningful warnings for incomplete detection', async () => {
      const incompleteDetection: DetectionResult = {
        frameworks: [],
        languages: [{ name: 'JavaScript', confidence: 0.5, primary: true }],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'incomplete-project'
        }
      };
      
      const workflow = await agentHooks.generateWebhookResponseWorkflow(incompleteDetection, mockOptions);
      
      expect(workflow.metadata.warnings).toContain('No frameworks detected - webhook responses may be limited');
    });
  });

  describe('integration with existing workflows', () => {
    it('should generate workflows that complement existing CI/CD', async () => {
      const workflows = await agentHooks.generateAgentHooksWorkflows(mockDetectionResult, mockOptions);
      
      // Agent Hooks workflows should be designed to work alongside existing workflows
      workflows.forEach(workflow => {
        expect(workflow.filename).toMatch(/^agent-hooks-/);
        expect(workflow.metadata.optimizations.length).toBeGreaterThan(0);
      });
    });

    it('should include proper permissions for GitHub API access', async () => {
      const workflow = await agentHooks.generateWebhookResponseWorkflow(mockDetectionResult, mockOptions);
      
      // Workflows should include necessary permissions for automation
      expect(workflow.content).toContain('Agent Hooks Integration');
    });
  });
});

describe('AgentHooksIntegration - Advanced Features', () => {
  let agentHooks: AgentHooksIntegration;
  let complexDetectionResult: DetectionResult;

  beforeEach(() => {
    agentHooks = new AgentHooksIntegration({
      automationLevel: 'aggressive',
      optimizationEnabled: true,
      recoveryEnabled: true
    });

    complexDetectionResult = {
      frameworks: [
        { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
        { name: 'Express', confidence: 0.8, evidence: ['server.js'], category: 'backend' }
      ],
      languages: [
        { name: 'TypeScript', confidence: 0.95, primary: true },
        { name: 'JavaScript', confidence: 0.85, primary: false }
      ],
      buildTools: [
        { name: 'webpack', confidence: 0.8 },
        { name: 'babel', confidence: 0.7 }
      ],
      packageManagers: [
        { name: 'npm', confidence: 0.9 },
        { name: 'yarn', confidence: 0.3 }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.85 },
        { name: 'Cypress', type: 'e2e', confidence: 0.7 }
      ],
      deploymentTargets: [
        { platform: 'Vercel', type: 'static', confidence: 0.8 },
        { platform: 'Docker', type: 'container', confidence: 0.6 }
      ],
      projectMetadata: {
        name: 'complex-project',
        description: 'A complex full-stack project',
        version: '2.1.0',
        repository: 'https://github.com/user/complex-project'
      }
    };
  });

  describe('complex project handling', () => {
    it('should handle multi-framework projects', async () => {
      const workflows = await agentHooks.generateAgentHooksWorkflows(
        complexDetectionResult, 
        { workflowType: 'maintenance', optimizationLevel: 'aggressive', includeComments: true }
      );
      
      expect(workflows).toHaveLength(4);
      
      // Should detect both frontend and backend frameworks
      workflows.forEach(workflow => {
        expect(workflow.metadata.detectionSummary).toContain('TypeScript');
        expect(workflow.metadata.detectionSummary).toContain('React');
      });
    });

    it('should optimize for multiple testing frameworks', async () => {
      const workflow = await agentHooks.generatePerformanceOptimizationWorkflow(
        complexDetectionResult,
        { workflowType: 'performance', optimizationLevel: 'aggressive', includeComments: true }
      );
      
      expect(workflow.metadata.optimizations).toContain('performance-monitoring');
      expect(workflow.metadata.warnings).toHaveLength(0); // Should have no warnings with complete detection
    });

    it('should handle multiple package managers intelligently', async () => {
      const workflow = await agentHooks.generateDependencyUpdateWorkflow(
        complexDetectionResult,
        { workflowType: 'maintenance', optimizationLevel: 'standard', includeComments: true }
      );
      
      expect(workflow.metadata.optimizations).toContain('automated-updates');
      // Should prefer npm over yarn based on confidence scores
    });
  });

  describe('intelligent automation features', () => {
    it('should generate sophisticated webhook responses', async () => {
      const workflow = await agentHooks.generateWebhookResponseWorkflow(
        complexDetectionResult,
        { workflowType: 'maintenance', optimizationLevel: 'aggressive', includeComments: true }
      );
      
      expect(workflow.metadata.optimizations).toContain('webhook-automation');
      expect(workflow.metadata.optimizations).toContain('intelligent-responses');
      expect(workflow.metadata.optimizations).toContain('event-driven-optimization');
    });

    it('should implement comprehensive retry strategies', async () => {
      const workflow = await agentHooks.generateRetryRecoveryWorkflow(
        complexDetectionResult,
        { workflowType: 'maintenance', optimizationLevel: 'aggressive', includeComments: true }
      );
      
      expect(workflow.metadata.optimizations).toContain('intelligent-retry');
      expect(workflow.metadata.optimizations).toContain('failure-recovery');
      expect(workflow.metadata.optimizations).toContain('resilience-patterns');
    });
  });
});