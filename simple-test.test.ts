/**
 * Simple test to verify parser functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Unmock fs for this test
vi.unmock('fs');
vi.unmock('fs/promises');
vi.unmock('path');

import { ReadmeParserImpl } from './src/parser/readme-parser';
import { IntegrationPipeline } from './src/parser/integration-pipeline';

describe('Simple Parser Test', () => {
  let parser: ReadmeParserImpl;
  let pipeline: IntegrationPipeline;

  beforeEach(() => {
    console.log('Creating parser...');
    try {
      // Try without IntegrationPipeline first
      parser = new ReadmeParserImpl(undefined, { 
        enableCaching: false, 
        enablePerformanceMonitoring: false,
        useIntegrationPipeline: false
      });
      console.log('Parser created successfully');
    } catch (error) {
      console.error('Failed to create parser:', error);
      throw error;
    }
  });

  afterEach(() => {
    // No cleanup needed without pipeline
  });

  it('should parse content successfully', async () => {
    try {
      const readmeContent = `
# Node.js Project

A TypeScript application with testing.

## Installation

\`\`\`bash
npm install
npm test
npm run build
\`\`\`

## Development

\`\`\`javascript
const app = require('./app');
app.listen(3000);
\`\`\`
      `;

      console.log('About to call parseContent...');
      const result = await parser.parseContent(readmeContent);
      console.log('parseContent returned');
      
      console.log('Test result:', {
        success: result.success,
        hasData: !!result.data,
        hasErrors: !!result.errors,
        errorCount: result.errors ? result.errors.length : 0
      });
      
      if (!result.success) {
        console.log('Parse failed!');
        if (result.errors) {
          console.log('Errors:', result.errors.map(e => `[${e.code}] ${e.message} (${e.component})`));
        } else {
          console.log('No error details available');
        }
      }
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    } catch (error) {
      console.error('Test threw error:', error);
      throw error;
    }
  });
});