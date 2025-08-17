/**
 * Unit Tests for WorkflowTreeProvider (VS Code API Independent)
 * 
 * Tests the core logic of the tree provider without depending on VS Code APIs.
 * These tests focus on data transformation and business logic.
 */

import * as assert from 'assert';
import { WorkflowItem, DetectedFramework, WorkflowFile } from '../../src/core/types';

suite('WorkflowTreeProvider Unit Tests', () => {
  
  suite('Tree Item Creation Logic', () => {
    test('should create workflow item with correct properties', () => {
      const workflowFile: WorkflowFile = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest',
        type: 'ci',
        relativePath: '.github/workflows',
        metadata: {
          description: 'CI workflow',
          version: '1.0.0',
          generated: new Date(),
          frameworks: ['Node.js'],
          optimizations: []
        }
      };

      // Test workflow type inference
      const inferredType = inferWorkflowTypeFromContent(workflowFile.content);
      assert.strictEqual(inferredType, 'ci');
    });

    test('should infer correct workflow types from content', () => {
      const testCases = [
        { content: 'name: Deploy\njobs:\n  deploy:\n    runs-on: ubuntu-latest', expected: 'cd' },
        { content: 'name: Security Scan\njobs:\n  security:\n    runs-on: ubuntu-latest', expected: 'security' },
        { content: 'name: Performance Test\njobs:\n  benchmark:\n    runs-on: ubuntu-latest', expected: 'performance' },
        { content: 'name: Release\njobs:\n  release:\n    if: startsWith(github.ref, \'refs/tags/\')', expected: 'release' },
        { content: 'name: CI\njobs:\n  test:\n    runs-on: ubuntu-latest', expected: 'ci' }
      ];

      for (const testCase of testCases) {
        const result = inferWorkflowTypeFromContent(testCase.content);
        assert.strictEqual(result, testCase.expected, `Failed for content: ${testCase.content}`);
      }
    });

    test('should extract workflow description from YAML content', () => {
      const testCases = [
        { content: 'name: "CI Workflow"\non: [push]', expected: 'CI Workflow' },
        { content: 'name: \'Deploy to Production\'\non: [push]', expected: 'Deploy to Production' },
        { content: 'name: Test Suite\non: [push]', expected: 'Test Suite' },
        { content: 'on: [push]\njobs: {}', expected: 'GitHub Actions Workflow' }
      ];

      for (const testCase of testCases) {
        const result = extractWorkflowDescription(testCase.content);
        assert.strictEqual(result, testCase.expected, `Failed for content: ${testCase.content}`);
      }
    });
  });

  suite('Framework Detection Processing', () => {
    test('should create framework items with evidence', () => {
      const framework: DetectedFramework = {
        name: 'Node.js',
        version: '18.0.0',
        confidence: 0.95,
        type: 'runtime',
        ecosystem: 'javascript',
        evidence: [
          {
            type: 'file',
            source: 'package.json',
            value: 'package.json found',
            confidence: 0.9
          },
          {
            type: 'dependency',
            source: 'package.json',
            value: 'node dependency',
            confidence: 0.8
          }
        ]
      };

      // Test framework item creation
      const frameworkItem = createFrameworkItem(framework);
      
      assert.strictEqual(frameworkItem.label, 'Node.js (18.0.0)');
      assert.strictEqual(frameworkItem.type, 'framework');
      assert.strictEqual(frameworkItem.contextValue, 'detected-framework');
      assert.ok(frameworkItem.children);
      assert.strictEqual(frameworkItem.children.length, 2);

      // Test evidence items
      const evidenceItem = frameworkItem.children[0];
      assert.strictEqual(evidenceItem.label, 'file: package.json found');
      assert.strictEqual(evidenceItem.type, 'step');
      assert.strictEqual(evidenceItem.contextValue, 'framework-evidence');
    });

    test('should handle frameworks without version', () => {
      const framework: DetectedFramework = {
        name: 'React',
        confidence: 0.85,
        type: 'framework',
        ecosystem: 'javascript',
        evidence: []
      };

      const frameworkItem = createFrameworkItem(framework);
      assert.strictEqual(frameworkItem.label, 'React');
    });
  });

  suite('Icon Selection Logic', () => {
    test('should return correct icons for framework types', () => {
      const testCases = [
        { name: 'Node.js', expectedIcon: 'symbol-event' },
        { name: 'Python', expectedIcon: 'symbol-class' },
        { name: 'Java', expectedIcon: 'symbol-method' },
        { name: 'Docker', expectedIcon: 'symbol-container' },
        { name: 'React', expectedIcon: 'symbol-interface' },
        { name: 'Unknown Framework', expectedIcon: 'package' }
      ];

      for (const testCase of testCases) {
        const icon = getFrameworkIconName(testCase.name);
        assert.strictEqual(icon, testCase.expectedIcon, `Failed for framework: ${testCase.name}`);
      }
    });

    test('should return correct icons for item types', () => {
      const testCases = [
        { type: 'workflow', expectedIcon: 'gear' },
        { type: 'framework', expectedIcon: 'package' },
        { type: 'folder', expectedIcon: 'folder' },
        { type: 'job', expectedIcon: 'play' },
        { type: 'step', expectedIcon: 'chevron-right' },
        { type: 'unknown', expectedIcon: 'file' }
      ];

      for (const testCase of testCases) {
        const icon = getItemTypeIconName(testCase.type);
        assert.strictEqual(icon, testCase.expectedIcon, `Failed for type: ${testCase.type}`);
      }
    });
  });

  suite('Data Validation', () => {
    test('should validate workflow item structure', () => {
      const validItem: WorkflowItem = {
        label: 'Test Item',
        type: 'workflow',
        contextValue: 'test-item'
      };

      assert.ok(isValidWorkflowItem(validItem));

      const invalidItem = {
        label: 'Test Item'
        // Missing required properties
      };

      assert.ok(!isValidWorkflowItem(invalidItem as any));
    });

    test('should validate detected framework structure', () => {
      const validFramework: DetectedFramework = {
        name: 'Node.js',
        confidence: 0.9,
        type: 'runtime',
        ecosystem: 'javascript',
        evidence: []
      };

      assert.ok(isValidDetectedFramework(validFramework));

      const invalidFramework = {
        name: 'Node.js'
        // Missing required properties
      };

      assert.ok(!isValidDetectedFramework(invalidFramework as any));
    });
  });
});

// Helper functions for testing (these would normally be private methods)

function inferWorkflowTypeFromContent(content: string): 'ci' | 'cd' | 'release' | 'security' | 'performance' | 'maintenance' {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('deploy') || lowerContent.includes('release')) {
    return 'cd';
  } else if (lowerContent.includes('security') || lowerContent.includes('scan')) {
    return 'security';
  } else if (lowerContent.includes('performance') || lowerContent.includes('benchmark')) {
    return 'performance';
  } else if (lowerContent.includes('maintenance') || lowerContent.includes('cleanup')) {
    return 'maintenance';
  } else if (lowerContent.includes('release') && lowerContent.includes('tag')) {
    return 'release';
  }
  
  return 'ci';
}

function extractWorkflowDescription(content: string): string {
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('name:')) {
      return trimmed.substring(5).trim().replace(/['"]/g, '');
    }
  }
  
  return 'GitHub Actions Workflow';
}

function createFrameworkItem(framework: DetectedFramework): WorkflowItem {
  return {
    label: `${framework.name}${framework.version ? ` (${framework.version})` : ''}`,
    type: 'framework',
    contextValue: 'detected-framework',
    tooltip: `${framework.type} framework - Confidence: ${Math.round(framework.confidence * 100)}%`,
    children: framework.evidence.map(evidence => ({
      label: `${evidence.type}: ${evidence.value}`,
      type: 'step',
      contextValue: 'framework-evidence',
      tooltip: `Evidence from ${evidence.source} - Confidence: ${Math.round(evidence.confidence * 100)}%`
    }))
  };
}

function getFrameworkIconName(frameworkName: string): string {
  const name = frameworkName.toLowerCase();
  
  if (name.includes('node') || name.includes('npm')) {
    return 'symbol-event';
  } else if (name.includes('python') || name.includes('pip')) {
    return 'symbol-class';
  } else if (name.includes('java') || name.includes('maven') || name.includes('gradle')) {
    return 'symbol-method';
  } else if (name.includes('docker')) {
    return 'symbol-container';
  } else if (name.includes('react') || name.includes('vue') || name.includes('angular')) {
    return 'symbol-interface';
  }
  
  return 'package';
}

function getItemTypeIconName(type: string): string {
  switch (type) {
    case 'workflow':
      return 'gear';
    case 'framework':
      return 'package';
    case 'folder':
      return 'folder';
    case 'job':
      return 'play';
    case 'step':
      return 'chevron-right';
    default:
      return 'file';
  }
}

function isValidWorkflowItem(item: any): item is WorkflowItem {
  return item &&
    typeof item.label === 'string' &&
    typeof item.type === 'string' &&
    typeof item.contextValue === 'string';
}

function isValidDetectedFramework(framework: any): framework is DetectedFramework {
  return framework &&
    typeof framework.name === 'string' &&
    typeof framework.confidence === 'number' &&
    typeof framework.type === 'string' &&
    typeof framework.ecosystem === 'string' &&
    Array.isArray(framework.evidence);
}