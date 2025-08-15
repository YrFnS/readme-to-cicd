/**
 * PromptHandler Unit Tests
 * 
 * Comprehensive tests for interactive prompt flows and user input validation.
 * Tests all prompt types: framework confirmation, conflict resolution, 
 * workflow type selection, and deployment configuration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PromptHandler } from '../../../src/cli/prompts/prompt-handler';
import { 
  FrameworkInfo, 
  FrameworkConflict, 
  DeploymentOption,
  WorkflowType 
} from '../../../src/cli/lib/types';

// Mock inquirer module
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

// Import inquirer after mocking
import inquirer from 'inquirer';
const mockPrompt = vi.mocked(inquirer.prompt);

// Mock console methods to avoid test output noise
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('PromptHandler', () => {
  let promptHandler: PromptHandler;

  beforeEach(() => {
    promptHandler = new PromptHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('confirmFrameworks', () => {
    it('should return empty array when no frameworks detected', async () => {
      const result = await promptHandler.confirmFrameworks([]);
      
      expect(result).toEqual([]);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No frameworks detected')
      );
    });

    it('should display frameworks with confidence scores and allow selection', async () => {
      const frameworks: FrameworkInfo[] = [
        {
          name: 'React',
          version: '18.0.0',
          description: 'JavaScript library for building user interfaces',
          confidence: 95,
          selected: false
        },
        {
          name: 'Node.js',
          version: '18.16.0',
          description: 'JavaScript runtime built on Chrome V8 engine',
          confidence: 85,
          selected: false
        }
      ];

      mockPrompt.mockResolvedValue({
        selectedFrameworks: [frameworks[0]]
      });

      const result = await promptHandler.confirmFrameworks(frameworks);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('React');
      expect(result[0].selected).toBe(true);
      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedFrameworks',
          message: 'Select frameworks to include in workflow generation:',
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringContaining('React'),
              value: frameworks[0],
              checked: true // High confidence should be auto-selected
            })
          ])
        })
      ]);
    });

    it('should auto-select high confidence frameworks (>=80%)', async () => {
      const frameworks: FrameworkInfo[] = [
        {
          name: 'React',
          version: '18.0.0',
          description: 'JavaScript library',
          confidence: 95,
          selected: false
        },
        {
          name: 'Express',
          version: '4.18.0',
          description: 'Web framework',
          confidence: 70,
          selected: false
        }
      ];

      mockPrompt.mockResolvedValue({
        selectedFrameworks: frameworks
      });

      await promptHandler.confirmFrameworks(frameworks);

      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              checked: true // React should be auto-selected
            }),
            expect.objectContaining({
              checked: false // Express should not be auto-selected
            })
          ])
        })
      ]);
    });

    it('should validate that at least one framework is selected', async () => {
      const frameworks: FrameworkInfo[] = [
        {
          name: 'React',
          version: '18.0.0',
          description: 'JavaScript library',
          confidence: 95,
          selected: false
        }
      ];

      mockPrompt.mockResolvedValue({
        selectedFrameworks: []
      });

      await promptHandler.confirmFrameworks(frameworks);

      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          validate: expect.any(Function)
        })
      ]);

      // Test validation function
      const call = mockPrompt.mock.calls[0][0] as any;
      const validateFn = call[0].validate;
      
      expect(validateFn([])).toBe('Please select at least one framework or press Ctrl+C to exit.');
      expect(validateFn([frameworks[0]])).toBe(true);
    });
  });

  describe('resolveConflicts', () => {
    it('should return empty array when no conflicts exist', async () => {
      const result = await promptHandler.resolveConflicts([]);
      
      expect(result).toEqual([]);
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    it('should handle framework conflicts with resolution options', async () => {
      const conflicts: FrameworkConflict[] = [
        {
          id: 'conflict_1',
          type: 'version-mismatch',
          message: 'Multiple React versions detected',
          frameworks: [
            {
              name: 'React',
              version: '17.0.0',
              description: 'JavaScript library',
              confidence: 90,
              selected: false
            },
            {
              name: 'React',
              version: '18.0.0',
              description: 'JavaScript library',
              confidence: 85,
              selected: false
            }
          ],
          suggestions: ['Consider upgrading to React 18 for better performance']
        }
      ];

      mockPrompt
        .mockResolvedValueOnce({ resolution: 'select-primary' })
        .mockResolvedValueOnce({ primaryFramework: conflicts[0].frameworks[1] });

      const result = await promptHandler.resolveConflicts(conflicts);

      expect(result).toHaveLength(1);
      expect(result[0].conflictId).toBe('conflict_0');
      expect(result[0].resolution).toBe('select-primary');
      expect(result[0].primaryFramework).toEqual(conflicts[0].frameworks[1]);
    });

    it('should handle keep-all resolution strategy', async () => {
      const conflicts: FrameworkConflict[] = [
        {
          id: 'conflict_1',
          type: 'compatibility',
          message: 'Framework compatibility issue',
          frameworks: [
            {
              name: 'React',
              version: '18.0.0',
              description: 'JavaScript library',
              confidence: 90,
              selected: false
            },
            {
              name: 'Vue',
              version: '3.0.0',
              description: 'Progressive framework',
              confidence: 85,
              selected: false
            }
          ],
          suggestions: []
        }
      ];

      mockPrompt.mockResolvedValue({ resolution: 'keep-all' });

      const result = await promptHandler.resolveConflicts(conflicts);

      expect(result[0].resolution).toBe('keep-all');
      expect(result[0].selectedFrameworks).toEqual(conflicts[0].frameworks);
    });
  });

  describe('selectWorkflowTypes', () => {
    it('should display workflow types with recommendations and complexity', async () => {
      mockPrompt.mockResolvedValue({
        selectedWorkflows: ['ci', 'security']
      });

      const result = await promptHandler.selectWorkflowTypes();

      expect(result).toEqual(['ci', 'security']);
      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedWorkflows',
          message: 'Select workflow types to generate:',
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringContaining('Continuous Integration'),
              value: 'ci',
              checked: true // Should be recommended
            }),
            expect.objectContaining({
              name: expect.stringContaining('Security Scanning'),
              value: 'security',
              checked: true // Should be recommended
            })
          ])
        })
      ]);
    });

    it('should validate workflow dependencies', async () => {
      mockPrompt.mockResolvedValue({
        selectedWorkflows: ['cd'] // CD without CI
      });

      await promptHandler.selectWorkflowTypes();

      const call = mockPrompt.mock.calls[0][0] as any;
      const validateFn = call[0].validate;

      expect(validateFn([])).toBe('Please select at least one workflow type.');
      expect(validateFn(['cd'])).toBe('CD workflow requires CI workflow. Please select CI or deselect CD.');
      expect(validateFn(['ci', 'cd'])).toBe(true);
    });

    it('should auto-select recommended workflow types', async () => {
      mockPrompt.mockResolvedValue({
        selectedWorkflows: ['ci', 'cd', 'security']
      });

      await promptHandler.selectWorkflowTypes();

      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              value: 'ci',
              checked: true // CI is recommended
            }),
            expect.objectContaining({
              value: 'cd',
              checked: true // CD is recommended
            }),
            expect.objectContaining({
              value: 'security',
              checked: true // Security is recommended
            }),
            expect.objectContaining({
              value: 'release',
              checked: false // Release is not recommended
            })
          ])
        })
      ]);
    });
  });

  describe('configureDeployment', () => {
    it('should return none configuration when no options available', async () => {
      const result = await promptHandler.configureDeployment([]);

      expect(result).toEqual({
        platform: 'none',
        environment: 'none',
        configuration: {},
        secrets: []
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No deployment options available')
      );
    });

    it('should handle manual configuration when no supported platforms', async () => {
      const options: DeploymentOption[] = [
        {
          name: 'Custom Platform',
          platform: 'custom',
          description: 'Custom deployment platform',
          supported: false,
          requirements: []
        }
      ];

      const result = await promptHandler.configureDeployment(options);

      expect(result).toEqual({
        platform: 'manual',
        environment: 'production',
        configuration: {},
        secrets: []
      });
    });

    it('should configure Vercel deployment', async () => {
      const options: DeploymentOption[] = [
        {
          name: 'Vercel',
          platform: 'vercel',
          description: 'Deploy to Vercel platform',
          supported: true,
          requirements: ['Node.js']
        }
      ];

      mockPrompt
        .mockResolvedValueOnce({ selectedPlatform: options[0] })
        .mockResolvedValueOnce({ environment: 'production' })
        .mockResolvedValueOnce({
          projectName: 'my-project',
          buildCommand: 'npm run build',
          outputDirectory: 'dist'
        });

      const result = await promptHandler.configureDeployment(options);

      expect(result).toEqual({
        platform: 'vercel',
        environment: 'production',
        configuration: {
          projectName: 'my-project',
          buildCommand: 'npm run build',
          outputDirectory: 'dist'
        },
        secrets: ['VERCEL_TOKEN']
      });
    });

    it('should configure AWS deployment with service selection', async () => {
      const options: DeploymentOption[] = [
        {
          name: 'AWS',
          platform: 'aws',
          description: 'Deploy to Amazon Web Services',
          supported: true,
          requirements: ['AWS CLI']
        }
      ];

      mockPrompt
        .mockResolvedValueOnce({ selectedPlatform: options[0] })
        .mockResolvedValueOnce({ environment: 'production' })
        .mockResolvedValueOnce({ service: 's3-cloudfront' })
        .mockResolvedValueOnce({ region: 'us-west-2' });

      const result = await promptHandler.configureDeployment(options);

      expect(result).toEqual({
        platform: 'aws',
        environment: 'production',
        configuration: {
          service: 's3-cloudfront',
          region: 'us-west-2'
        },
        secrets: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
      });
    });

    it('should allow skipping deployment configuration', async () => {
      const options: DeploymentOption[] = [
        {
          name: 'Vercel',
          platform: 'vercel',
          description: 'Deploy to Vercel platform',
          supported: true,
          requirements: []
        }
      ];

      mockPrompt.mockResolvedValue({ selectedPlatform: null });

      const result = await promptHandler.configureDeployment(options);

      expect(result).toEqual({
        platform: 'none',
        environment: 'none',
        configuration: {},
        secrets: []
      });
    });

    it('should validate required inputs for platform configuration', async () => {
      const options: DeploymentOption[] = [
        {
          name: 'Azure',
          platform: 'azure',
          description: 'Deploy to Microsoft Azure',
          supported: true,
          requirements: ['Azure CLI']
        }
      ];

      mockPrompt
        .mockResolvedValueOnce({ selectedPlatform: options[0] })
        .mockResolvedValueOnce({ environment: 'production' })
        .mockResolvedValueOnce({
          subscriptionId: 'test-subscription-id',
          resourceGroup: 'test-resource-group'
        });

      await promptHandler.configureDeployment(options);

      // Check that validation functions were called
      const azurePromptCall = mockPrompt.mock.calls[2][0] as any;
      const subscriptionValidate = azurePromptCall[0].validate;
      const resourceGroupValidate = azurePromptCall[1].validate;

      expect(subscriptionValidate('')).toBe('Subscription ID is required');
      expect(subscriptionValidate('valid-id')).toBe(true);
      expect(resourceGroupValidate('')).toBe('Resource group is required');
      expect(resourceGroupValidate('valid-group')).toBe(true);
    });
  });

  describe('helper methods', () => {
    it('should create confidence bars with correct visualization', () => {
      // Access private method through type assertion for testing
      const handler = promptHandler as any;
      
      expect(handler.createConfidenceBar(100)).toContain('█'.repeat(20));
      expect(handler.createConfidenceBar(50)).toContain('█'.repeat(10));
      expect(handler.createConfidenceBar(0)).toContain('░'.repeat(20));
    });

    it('should return appropriate colors for confidence levels', () => {
      const handler = promptHandler as any;
      
      // Test confidence color mapping
      expect(handler.getConfidenceColor(95)).toBeDefined();
      expect(handler.getConfidenceColor(75)).toBeDefined();
      expect(handler.getConfidenceColor(50)).toBeDefined();
    });

    it('should return appropriate colors for complexity levels', () => {
      const handler = promptHandler as any;
      
      expect(handler.getComplexityColor('low')).toBeDefined();
      expect(handler.getComplexityColor('medium')).toBeDefined();
      expect(handler.getComplexityColor('high')).toBeDefined();
    });
  });
});