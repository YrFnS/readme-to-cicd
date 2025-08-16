/**
 * Tests for ContextualHelpProvider
 * 
 * Test suite for contextual help functionality including
 * project analysis and framework-specific tips.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { ContextualHelpProvider } from '../../../src/cli/lib/contextual-help-provider';
import { FrameworkInfo } from '../../../src/cli/lib/types';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn()
  }
}));

describe('ContextualHelpProvider', () => {
  let provider: ContextualHelpProvider;
  const mockFs = fs as any;

  beforeEach(() => {
    provider = new ContextualHelpProvider();
    vi.clearAllMocks();
  });

  describe('getContextualTips', () => {
    it('should return generic tips when project analysis fails', async () => {
      // Mock fs.access to throw errors (simulating missing files)
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const tips = await provider.getContextualTips('/non-existent-path');

      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.includes('--dry-run'))).toBe(true);
    });

    it('should provide tips for projects without README', async () => {
      // Mock project without README
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('README')) {
          throw new Error('README not found');
        }
        if (path.includes('.git')) {
          return Promise.resolve(); // Has git
        }
        throw new Error('File not found');
      });

      const tips = await provider.getContextualTips('./test-project');

      expect(tips.some(tip => tip.includes('README'))).toBe(true);
    });

    it('should provide tips for projects without Git', async () => {
      // Mock project without Git
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('README.md')) {
          return Promise.resolve(); // Has README
        }
        if (path.includes('.git')) {
          throw new Error('Not a git repo');
        }
        throw new Error('File not found');
      });

      const tips = await provider.getContextualTips('./test-project');

      expect(tips.some(tip => tip.includes('Git'))).toBe(true);
    });

    it('should provide tips for Node.js projects', async () => {
      // Mock Node.js project
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('package.json') || path.includes('README.md')) {
          return Promise.resolve();
        }
        throw new Error('File not found');
      });

      const frameworks: FrameworkInfo[] = [
        { name: 'nodejs', confidence: 0.9, description: 'Node.js project' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.some(tip => tip.includes('Node.js') || tip.includes('package-lock'))).toBe(true);
    });

    it('should provide tips for React projects', async () => {
      const frameworks: FrameworkInfo[] = [
        { name: 'react', confidence: 0.9, description: 'React framework' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.some(tip => tip.includes('React') || tip.includes('build caching'))).toBe(true);
    });

    it('should provide tips for Docker projects', async () => {
      const frameworks: FrameworkInfo[] = [
        { name: 'docker', confidence: 0.9, description: 'Docker containerization' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.some(tip => tip.includes('Docker') || tip.includes('container'))).toBe(true);
    });

    it('should provide tips for TypeScript projects', async () => {
      const frameworks: FrameworkInfo[] = [
        { name: 'typescript', confidence: 0.9, description: 'TypeScript language' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.some(tip => tip.includes('TypeScript') || tip.includes('type checking'))).toBe(true);
    });

    it('should provide tips for testing frameworks', async () => {
      const testFrameworks = ['jest', 'mocha', 'vitest'];
      
      for (const framework of testFrameworks) {
        const frameworks: FrameworkInfo[] = [
          { name: framework, confidence: 0.9, description: `${framework} testing framework` }
        ];

        const tips = await provider.getContextualTips('./test-project', frameworks);

        expect(tips.some(tip => 
          tip.includes(framework) || 
          tip.includes('test') || 
          tip.includes('coverage')
        )).toBe(true);
      }
    });

    it('should provide tips for projects with existing workflows', async () => {
      // Mock project with existing workflows
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('README.md')) {
          return Promise.resolve();
        }
        throw new Error('File not found');
      });

      mockFs.readdir.mockImplementation((path: string) => {
        if (path.includes('workflows')) {
          return Promise.resolve(['ci.yml', 'cd.yaml']);
        }
        throw new Error('Directory not found');
      });

      const tips = await provider.getContextualTips('./test-project');

      expect(tips.some(tip => tip.includes('validate') || tip.includes('existing'))).toBe(true);
    });

    it('should provide configuration tips for complex projects', async () => {
      // Mock complex project
      const frameworks: FrameworkInfo[] = [
        { name: 'nodejs', confidence: 0.9, description: 'Node.js' },
        { name: 'react', confidence: 0.8, description: 'React' },
        { name: 'docker', confidence: 0.7, description: 'Docker' },
        { name: 'kubernetes', confidence: 0.6, description: 'Kubernetes' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.some(tip => 
        tip.includes('configuration') || 
        tip.includes('complex') ||
        tip.includes('enterprise')
      )).toBe(true);
    });

    it('should limit tips to maximum number', async () => {
      // Mock project that would generate many tips
      const frameworks: FrameworkInfo[] = [
        { name: 'nodejs', confidence: 0.9, description: 'Node.js' },
        { name: 'react', confidence: 0.8, description: 'React' },
        { name: 'docker', confidence: 0.7, description: 'Docker' },
        { name: 'typescript', confidence: 0.6, description: 'TypeScript' },
        { name: 'jest', confidence: 0.5, description: 'Jest' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.length).toBeLessThanOrEqual(5); // Should limit to 5 tips
    });

    it('should prioritize high-priority tips', async () => {
      // Mock project without README (high priority tip)
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('README')) {
          throw new Error('README not found');
        }
        return Promise.resolve();
      });

      const tips = await provider.getContextualTips('./test-project');

      // High priority tips should appear first
      expect(tips[0]).toContain('README');
    });
  });

  describe('project type detection', () => {
    it('should detect Node.js projects', async () => {
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('package.json')) {
          return Promise.resolve();
        }
        throw new Error('File not found');
      });

      const tips = await provider.getContextualTips('./test-project');

      expect(tips.some(tip => tip.includes('npm ci') || tip.includes('Node.js'))).toBe(true);
    });

    it('should detect Python projects', async () => {
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('requirements.txt')) {
          return Promise.resolve();
        }
        throw new Error('File not found');
      });

      const tips = await provider.getContextualTips('./test-project');

      expect(tips.some(tip => tip.includes('Python') || tip.includes('pip'))).toBe(true);
    });

    it('should detect Java projects', async () => {
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('pom.xml')) {
          return Promise.resolve();
        }
        throw new Error('File not found');
      });

      const tips = await provider.getContextualTips('./test-project');

      expect(tips.some(tip => tip.includes('Java') || tip.includes('Maven'))).toBe(true);
    });

    it('should detect Go projects', async () => {
      mockFs.access.mockImplementation((path: string) => {
        if (path.includes('go.mod')) {
          return Promise.resolve();
        }
        throw new Error('File not found');
      });

      const tips = await provider.getContextualTips('./test-project');

      expect(tips.some(tip => tip.includes('Go') || tip.includes('module'))).toBe(true);
    });
  });

  describe('complexity assessment', () => {
    it('should provide simple project tips', async () => {
      const frameworks: FrameworkInfo[] = [
        { name: 'nodejs', confidence: 0.9, description: 'Node.js' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.some(tip => tip.includes('simple') || tip.includes('basic'))).toBe(true);
    });

    it('should provide moderate complexity tips', async () => {
      const frameworks: FrameworkInfo[] = [
        { name: 'nodejs', confidence: 0.9, description: 'Node.js' },
        { name: 'react', confidence: 0.8, description: 'React' },
        { name: 'docker', confidence: 0.7, description: 'Docker' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.some(tip => 
        tip.includes('interactive') || 
        tip.includes('moderate') ||
        tip.includes('customize')
      )).toBe(true);
    });

    it('should provide complex project tips', async () => {
      const frameworks: FrameworkInfo[] = [
        { name: 'nodejs', confidence: 0.9, description: 'Node.js' },
        { name: 'react', confidence: 0.8, description: 'React' },
        { name: 'docker', confidence: 0.7, description: 'Docker' },
        { name: 'kubernetes', confidence: 0.6, description: 'Kubernetes' },
        { name: 'microservice', confidence: 0.5, description: 'Microservices' }
      ];

      const tips = await provider.getContextualTips('./test-project', frameworks);

      expect(tips.some(tip => 
        tip.includes('complex') || 
        tip.includes('enterprise') ||
        tip.includes('configuration file')
      )).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('Permission denied'));
      mockFs.readdir.mockRejectedValue(new Error('Cannot read directory'));

      const tips = await provider.getContextualTips('./test-project');

      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
    });

    it('should handle invalid project paths', async () => {
      const tips = await provider.getContextualTips('');

      expect(Array.isArray(tips)).toBe(true);
    });

    it('should handle undefined frameworks gracefully', async () => {
      const tips = await provider.getContextualTips('./test-project', undefined);

      expect(Array.isArray(tips)).toBe(true);
    });

    it('should handle empty frameworks array', async () => {
      const tips = await provider.getContextualTips('./test-project', []);

      expect(Array.isArray(tips)).toBe(true);
    });
  });
});