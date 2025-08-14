/**
 * YAML Generator Import Test
 * Test to validate the generator can be imported and instantiated
 */

import { describe, it, expect } from 'vitest';

describe('YAML Generator Import Test', () => {
  it('should be able to import the generator', async () => {
    try {
      const { YAMLGeneratorImpl } = await import('../src/generator/yaml-generator');
      expect(YAMLGeneratorImpl).toBeDefined();
      console.log('✅ YAMLGeneratorImpl imported successfully');
    } catch (error) {
      console.error('❌ Failed to import YAMLGeneratorImpl:', error);
      throw error;
    }
  });

  it('should be able to import interfaces', async () => {
    try {
      const interfaces = await import('../src/generator/interfaces');
      expect(interfaces).toBeDefined();
      console.log('✅ Interfaces imported successfully');
    } catch (error) {
      console.error('❌ Failed to import interfaces:', error);
      throw error;
    }
  });

  it('should be able to create generator instance', async () => {
    try {
      const { YAMLGeneratorImpl } = await import('../src/generator/yaml-generator');
      const generator = new YAMLGeneratorImpl({
        cacheEnabled: true
      });
      expect(generator).toBeDefined();
      expect(generator.generateWorkflow).toBeDefined();
      expect(generator.validateWorkflow).toBeDefined();
      console.log('✅ Generator instance created successfully');
    } catch (error) {
      console.error('❌ Failed to create generator instance:', error);
      throw error;
    }
  });
});