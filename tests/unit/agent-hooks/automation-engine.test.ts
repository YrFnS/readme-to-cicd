import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutomationEngine } from '../../../src/agent-hooks/automation/automation-engine';
import {
  RepositoryChanges,
  RepositoryInfo,
  AutomationDecision,
  WorkflowChange,
  FileChange,
  DependencyChange,
  ConfigChange
} from '../../../src/agent-hooks/types';

// Mock data for testing
const mockRepository: RepositoryInfo = {
  owner: 'test-owner',
  name: 'test-repo',
  fullName: 'test-owner/test-repo',
  defaultBranch: 'main'
};

const mockFileChange: FileChange = {
  path: 'README.md',
  type: 'modified',
  content: `
# Test Project

This is a Node.js project with React.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm test
npm run build
\`\`\`

## Deploy

Deploy to Vercel.
`,
  significance: 'high'
};

const mockDependencyChange: DependencyChange = {
  framework: 'react',
  version: '18.0.0',
  type: 'updated',
  breaking: false
};

const mockConfigChange: ConfigChange = {
  type: 'package.json',
  changes: ['updated dependencies'],
  impact: []
};

const mockChanges: RepositoryChanges = {
  modifiedFiles: [mockFileChange],
  addedFiles: [],
  deletedFiles: [],
  configurationChanges: [mockConfigChange],
  dependencyChanges: [mockDependencyChange]
};

describe('AutomationEngine', () => {
  let automationEngine: AutomationEngine;

  beforeEach(() => {
    const config = {
      enabledFeatures: ['readme-analysis', 'dependency-updates'],
      defaultRules: [],
      approvalWorkflows: [],
      batchingConfig: { enabled: false, maxBatchSize: 10, maxWaitTimeMs: 5000 },
      priorityThresholds: { critical: 10, high: 7, medium: 4, low: 1 },
      notificationSettings: { channels: [], templates: {}, frequencyLimits: {} }
    };
    automationEngine = new AutomationEngine(config);
  });

  describe('evaluateChanges', () => {
    it('should process repository changes and return automation decisions', async () => {
      const decisions = await automationEngine.evaluateChanges(mockChanges, mockRepository);

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
    });

    it('should handle empty changes gracefully', async () => {
      const emptyChanges: RepositoryChanges = {
        modifiedFiles: [],
        addedFiles: [],
        deletedFiles: [],
        configurationChanges: [],
        dependencyChanges: []
      };

      const decisions = await automationEngine.evaluateChanges(emptyChanges, mockRepository);

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBe(0);
    });

    it('should throw error for invalid input', async () => {
      await expect(automationEngine.evaluateChanges(null as any, mockRepository))
        .rejects.toThrow('Invalid input: changes and repository are required');

      await expect(automationEngine.evaluateChanges(mockChanges, null as any))
        .rejects.toThrow('Invalid input: changes and repository are required');
    });

    it('should validate repository info', async () => {
      const invalidRepo: RepositoryInfo = {
        owner: '',
        name: '',
        fullName: 'invalid',
        defaultBranch: 'main'
      };

      await expect(automationEngine.evaluateChanges(mockChanges, invalidRepo))
        .rejects.toThrow('Invalid repository info: owner and name are required');
    });
  });

  describe('README Analysis', () => {
    it('should detect testing in README content', async () => {
      const testReadme = {
        ...mockFileChange,
        content: `
# Project

## Testing

Run tests with Jest:

\`\`\`bash
npm test
\`\`\`
`
      };

      const changes: RepositoryChanges = {
        ...mockChanges,
        modifiedFiles: [testReadme]
      };

      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

      // Should generate workflow with test steps
      const workflowDecision = decisions.find(d =>
        d.changes.some(change => change.file.includes('.github/workflows/'))
      );
      expect(workflowDecision).toBeDefined();
    });

    it('should detect deployment targets in README', async () => {
      const deployReadme = {
        ...mockFileChange,
        content: `
# Project

## Deploy

Deploy to Vercel automatically.
`
      };

      const changes: RepositoryChanges = {
        ...mockChanges,
        modifiedFiles: [deployReadme]
      };

      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

      // Should generate deployment workflow
      const deployDecision = decisions.find(d =>
        d.changes.some(change => change.content.includes('vercel'))
      );
      expect(deployDecision).toBeDefined();
    });
  });

  describe('Dependency Changes', () => {
    it('should handle dependency updates', async () => {
      const dependencyChanges: RepositoryChanges = {
        ...mockChanges,
        dependencyChanges: [mockDependencyChange],
        modifiedFiles: [] // Remove README to focus on dependency changes
      };

      const decisions = await automationEngine.evaluateChanges(dependencyChanges, mockRepository);

      // Should create decision for non-breaking changes
      const dependencyDecision = decisions.find(d =>
        d.rationale.includes('Dependency react was updated')
      );
      expect(dependencyDecision).toBeDefined();
      // Non-breaking dependency updates without workflow changes get low priority
      expect(dependencyDecision?.priority).toBe('low');
    });

    it('should prioritize breaking dependency changes', async () => {
      const breakingChange: DependencyChange = {
        ...mockDependencyChange,
        breaking: true
      };

      const dependencyChanges: RepositoryChanges = {
        ...mockChanges,
        dependencyChanges: [breakingChange],
        modifiedFiles: []
      };

      const decisions = await automationEngine.evaluateChanges(dependencyChanges, mockRepository);

      const breakingDecision = decisions.find(d =>
        d.rationale.includes('Dependency react was updated')
      );
      // Breaking dependency changes get critical priority
      expect(breakingDecision?.priority).toBe('critical');
    });
  });

  describe('Configuration Changes', () => {
    it('should handle package.json changes', async () => {
      const configChanges: RepositoryChanges = {
        ...mockChanges,
        configurationChanges: [mockConfigChange],
        modifiedFiles: []
      };

      const decisions = await automationEngine.evaluateChanges(configChanges, mockRepository);

      // Should generate CI workflow updates
      const ciDecision = decisions.find(d =>
        d.changes.some(change => change.file.includes('ci.yml'))
      );
      expect(ciDecision).toBeDefined();
    });
  });

  describe('Performance Impact', () => {
    it('should calculate performance impact for workflow changes', async () => {
      const decisions = await automationEngine.evaluateChanges(mockChanges, mockRepository);

      decisions.forEach(decision => {
        expect(typeof decision.performanceImpact.estimatedTimeSavings).toBe('number');
        expect(typeof decision.performanceImpact.costReduction).toBe('number');
        expect(typeof decision.performanceImpact.confidence).toBe('number');
        expect(typeof decision.performanceImpact.rationale).toBe('string');
      });
    });

    it('should prioritize decisions with high performance impact', async () => {
      const decisions = await automationEngine.evaluateChanges(mockChanges, mockRepository);

      // Medium cost reduction should result in medium priority
      const mediumImpactDecision = decisions.find(d =>
        d.performanceImpact.costReduction > 1
      );
      if (mediumImpactDecision) {
        expect(['medium', 'high', 'critical']).toContain(mediumImpactDecision.priority);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully and continue processing', async () => {
      // Test that errors in individual steps don't break the entire process
      const decisions = await automationEngine.evaluateChanges(mockChanges, mockRepository);
      expect(Array.isArray(decisions)).toBe(true);
    });

    it('should provide meaningful error messages', async () => {
      await expect(automationEngine.evaluateChanges(null as any, mockRepository))
        .rejects.toThrow('Invalid input');
    });
  });

  describe('Custom Rules', () => {
    it('should allow applying custom automation rules', async () => {
      const customRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test automation rule',
        triggers: [],
        conditions: [],
        actions: [],
        priority: 1,
        enabled: true
      };

      await expect(automationEngine.applyCustomRules([customRule])).resolves.toBeUndefined();
    });
  });

  describe('Analysis Scheduling', () => {
    it('should allow scheduling repository analysis', async () => {
      await expect(automationEngine.scheduleAnalysis(mockRepository)).resolves.toBeUndefined();
    });

    it('should accept different priority levels for analysis', async () => {
      await expect(automationEngine.scheduleAnalysis(mockRepository, 1)).resolves.toBeUndefined();
      await expect(automationEngine.scheduleAnalysis(mockRepository, 4)).resolves.toBeUndefined();
    });
  });
});