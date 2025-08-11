import { describe, it, expect } from 'vitest';
import * as yaml from 'yaml';
import { PythonWorkflowGenerator } from '../../../src/generator/templates/python-generator';
import { TemplateManager } from '../../../src/generator/templates/template-manager';
import { TemplateLoadConfig } from '../../../src/generator/templates/template-types';
import { DetectionResult } from '../../../src/generator/interfaces';

describe('PythonWorkflowGenerator Debug', () => {
  it('should debug template processing with no linting', async () => {
    const config: TemplateLoadConfig = {
      baseTemplatesPath: 'templates/frameworks',
      cacheEnabled: true,
      reloadOnChange: false
    };
    const templateManager = new TemplateManager(config);
    const generator = new PythonWorkflowGenerator(templateManager);

    const detectionResult: DetectionResult = {
      languages: [{ name: 'Python', version: '3.11', confidence: 0.9 }],
      frameworks: [{ 
        name: 'django', 
        confidence: 0.9, 
        evidence: ['manage.py'], 
        category: 'backend' 
      }],
      packageManagers: [{ 
        name: 'pip', 
        lockFile: 'requirements.txt', 
        confidence: 0.8 
      }],
      testingFrameworks: [{ name: 'pytest', confidence: 0.8 }],
      buildTools: [] // No build tools = no linting/type checking
    };

    console.log('Detection result:', JSON.stringify(detectionResult, null, 2));

    try {
      const result = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'aggressive' });
      console.log('Generated workflow:', result.content);
      
      // Parse and check matrix
      const workflow = yaml.parse(result.content);
      console.log('Matrix:', JSON.stringify(workflow.jobs.test.strategy.matrix, null, 2));
      
      expect(result).toBeDefined();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  });
});