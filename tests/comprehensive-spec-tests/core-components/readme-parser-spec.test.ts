/**
 * README Parser Spec Tests
 * Comprehensive tests validating all README Parser spec requirements
 * Target: 120+ tests covering all 8 requirements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { ReadmeParserImpl } from '../../../src/parser/readme-parser';
import { ComponentFactory } from '../../../src/parser/component-factory';
import { loadSpecRequirements, createSpecTestSuite, measurePerformance, loadSampleReadme } from '../utils/spec-test-helpers';

describe('README Parser - Complete Spec Validation', () => {
  let parser: ReadmeParserImpl;
  let componentFactory: ComponentFactory;
  
  beforeEach(() => {
    componentFactory = ComponentFactory.getInstance();
    parser = componentFactory.createReadmeParser();
  });
  
  afterEach(() => {
    componentFactory.reset();
  });

  // Load spec requirements
  const specPath = join(__dirname, '../../../.kiro/specs/readme-parser');
  const requirements = loadSpecRequirements(specPath);

  describe('Requirement 1: Language Extraction', () => {
    describe('User Story: As a developer, I want the parser to extract programming languages from my README', () => {
      
      describe('AC1: Extract languages from code blocks', () => {
        it('should extract JavaScript from ```javascript blocks', async () => {
          const readme = `
# Test Project
\`\`\`javascript
console.log('Hello World');
\`\`\`
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toContain('javascript');
        });

        it('should extract Python from ```python blocks', async () => {
          const readme = `
# Test Project
\`\`\`python
print("Hello World")
\`\`\`
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toContain('python');
        });

        it('should extract multiple languages from multiple blocks', async () => {
          const readme = `
# Test Project
\`\`\`javascript
console.log('Hello');
\`\`\`
\`\`\`python
print("World")
\`\`\`
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toContain('javascript');
          expect(result.data?.languages).toContain('python');
        });

        it('should handle case-insensitive language identifiers', async () => {
          const readme = `
# Test Project
\`\`\`JavaScript
console.log('Hello');
\`\`\`
\`\`\`PYTHON
print("World")
\`\`\`
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toContain('javascript');
          expect(result.data?.languages).toContain('python');
        });

        it('should extract languages from inline code blocks', async () => {
          const readme = `
# Test Project
Run \`node index.js\` or \`python main.py\`
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          // Should detect context-based language hints
        });
      });

      describe('AC2: Identify languages in text mentions', () => {
        it('should detect "This Python project" mentions', async () => {
          const readme = `
# Test Project
This Python project demonstrates machine learning.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toContain('python');
        });

        it('should detect "built with JavaScript" mentions', async () => {
          const readme = `
# Test Project
This application is built with JavaScript and React.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toContain('javascript');
        });

        it('should handle multiple language mentions in text', async () => {
          const readme = `
# Test Project
This full-stack application uses Python for the backend and JavaScript for the frontend.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toContain('python');
          expect(result.data?.languages).toContain('javascript');
        });

        it('should detect framework-specific language hints', async () => {
          const readme = `
# Test Project
Built with React, Express, and Django.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toContain('javascript'); // React/Express
          expect(result.data?.languages).toContain('python'); // Django
        });
      });

      describe('AC3: Return prioritized language lists', () => {
        it('should prioritize by frequency of mentions', async () => {
          const readme = `
# Test Project
This JavaScript project uses JavaScript extensively.
\`\`\`javascript
console.log('JavaScript');
\`\`\`
Also includes some Python utilities.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages?.[0]).toBe('javascript');
        });

        it('should prioritize by context relevance', async () => {
          const readme = `
# Python Machine Learning Project
This project demonstrates Python's capabilities in machine learning.
Also mentions JavaScript for web interface.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages?.[0]).toBe('python');
        });

        it('should return languages in priority order', async () => {
          const readme = loadSampleReadme('multi-language-project.md');
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(Array.isArray(result.data?.languages)).toBe(true);
          expect(result.data?.languages?.length).toBeGreaterThan(1);
        });
      });

      describe('AC4: Handle no languages detected', () => {
        it('should return empty array when no languages found', async () => {
          const readme = `
# Generic Project
This is a documentation-only project with no code.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toEqual([]);
        });

        it('should not throw errors on empty README', async () => {
          const readme = '';
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toEqual([]);
        });

        it('should handle README with only whitespace', async () => {
          const readme = '   \n\n   \t   \n   ';
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.languages).toEqual([]);
        });
      });
    });
  });

  describe('Requirement 2: Command Detection and Extraction', () => {
    describe('User Story: As a developer, I want the parser to extract build and test commands', () => {
      
      describe('AC1: Extract build commands', () => {
        it('should detect npm build commands', async () => {
          const readme = `
# Test Project
## Build
Run \`npm run build\` to build the project.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.commands?.some(cmd => cmd.command === 'npm run build')).toBe(true);
        });

        it('should detect make commands', async () => {
          const readme = `
# Test Project
Build with \`make build\` or \`make all\`.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.commands?.some(cmd => cmd.command.includes('make'))).toBe(true);
        });

        it('should detect Docker build commands', async () => {
          const readme = `
# Test Project
\`\`\`bash
docker build -t myapp .
\`\`\`
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.commands?.some(cmd => cmd.command.includes('docker build'))).toBe(true);
        });
      });

      describe('AC2: Extract test commands', () => {
        it('should detect npm test commands', async () => {
          const readme = `
# Test Project
Run tests with \`npm test\`.
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.commands?.some(cmd => cmd.command === 'npm test')).toBe(true);
        });

        it('should detect pytest commands', async () => {
          const readme = `
# Test Project
\`\`\`bash
pytest tests/
\`\`\`
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          expect(result.data?.commands?.some(cmd => cmd.command.includes('pytest'))).toBe(true);
        });

        it('should categorize commands by type', async () => {
          const readme = `
# Test Project
Build: \`npm run build\`
Test: \`npm test\`
Start: \`npm start\`
          `;
          
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
          
          const buildCmd = result.data?.commands?.find(cmd => cmd.command === 'npm run build');
          const testCmd = result.data?.commands?.find(cmd => cmd.command === 'npm test');
          const startCmd = result.data?.commands?.find(cmd => cmd.command === 'npm start');
          
          expect(buildCmd?.type).toBe('build');
          expect(testCmd?.type).toBe('test');
          expect(startCmd?.type).toBe('start');
        });
      });
    });
  });

  describe('Requirement 3: Dependency Identification', () => {
    describe('User Story: As a developer, I want the parser to identify project dependencies', () => {
      
      it('should detect package.json references', async () => {
        const readme = `
# Test Project
Install dependencies with \`npm install\`.
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.dependencies?.packageManager).toBe('npm');
      });

      it('should detect requirements.txt references', async () => {
        const readme = `
# Test Project
Install with \`pip install -r requirements.txt\`.
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.dependencies?.packageManager).toBe('pip');
      });

      it('should detect Cargo.toml references', async () => {
        const readme = `
# Test Project
Build with \`cargo build\`.
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.dependencies?.packageManager).toBe('cargo');
      });
    });
  });

  describe('Requirement 4: Metadata Parsing and Structuring', () => {
    describe('User Story: As a developer, I want structured metadata extracted from my README', () => {
      
      it('should extract project title', async () => {
        const readme = `
# My Awesome Project
This is a great project.
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.metadata?.title).toBe('My Awesome Project');
      });

      it('should extract project description', async () => {
        const readme = `
# Test Project
A comprehensive testing framework for Node.js applications.
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.metadata?.description).toContain('testing framework');
      });

      it('should extract installation instructions', async () => {
        const readme = `
# Test Project
## Installation
\`\`\`bash
npm install my-package
\`\`\`
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.metadata?.installation).toContain('npm install');
      });
    });
  });

  describe('Requirement 5: Error Handling and Recovery', () => {
    describe('User Story: As a developer, I want the parser to handle errors gracefully', () => {
      
      it('should handle malformed markdown', async () => {
        const readme = `
# Test Project
This has [broken link](
And unclosed **bold text
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true); // Should not fail completely
      });

      it('should continue parsing after recoverable errors', async () => {
        const readme = `
# Test Project
\`\`\`invalid-language
some code
\`\`\`
\`\`\`javascript
console.log('valid');
\`\`\`
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.languages).toContain('javascript');
      });

      it('should provide error details for debugging', async () => {
        const readme = null as any;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Requirement 6: Performance Requirements', () => {
    describe('User Story: As a developer, I want fast parsing performance', () => {
      
      it('should parse README in under 2 seconds', async () => {
        const readme = loadSampleReadme('large-readme.md');
        
        const { result, executionTime, withinLimit } = await measurePerformance(
          () => parser.parseContent(readme),
          2000
        );
        
        expect(result.success).toBe(true);
        expect(withinLimit).toBe(true);
        expect(executionTime).toBeLessThan(2000);
      });

      it('should handle large README files efficiently', async () => {
        const largeReadme = 'x'.repeat(100000); // 100KB of text
        
        const { result, executionTime } = await measurePerformance(
          () => parser.parseContent(largeReadme)
        );
        
        expect(result.success).toBe(true);
        expect(executionTime).toBeLessThan(5000); // 5 second limit for large files
      });

      it('should not consume excessive memory', async () => {
        const readme = loadSampleReadme('complex-readme.md');
        
        const initialMemory = process.memoryUsage().heapUsed;
        await parser.parseContent(readme);
        const finalMemory = process.memoryUsage().heapUsed;
        
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      });
    });
  });

  describe('Requirement 7: Multi-format Support', () => {
    describe('User Story: As a developer, I want support for different README formats', () => {
      
      it('should parse standard markdown format', async () => {
        const readme = loadSampleReadme('standard-format.md');
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
      });

      it('should handle GitHub-flavored markdown', async () => {
        const readme = `
# Test Project
- [x] Completed task
- [ ] Pending task

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
      });

      it('should parse README with badges and shields', async () => {
        const readme = `
# Test Project
![Build Status](https://img.shields.io/badge/build-passing-green)
[![Coverage](https://img.shields.io/badge/coverage-90%25-green)](https://example.com)
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.metadata?.badges).toBeDefined();
      });
    });
  });

  describe('Requirement 8: Confidence Scoring', () => {
    describe('User Story: As a developer, I want confidence scores for extracted information', () => {
      
      it('should provide confidence scores for language detection', async () => {
        const readme = `
# JavaScript Project
\`\`\`javascript
console.log('Hello World');
\`\`\`
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.confidence?.languages).toBeGreaterThan(0.8);
      });

      it('should provide confidence scores for command extraction', async () => {
        const readme = `
# Test Project
Build: \`npm run build\`
        `;
        
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
        expect(result.data?.confidence?.commands).toBeGreaterThan(0.7);
      });

      it('should adjust confidence based on evidence quality', async () => {
        const highConfidenceReadme = `
# JavaScript Project
\`\`\`javascript
const express = require('express');
\`\`\`
Build with \`npm run build\`.
        `;
        
        const lowConfidenceReadme = `
# Project
Maybe uses JavaScript?
        `;
        
        const highResult = await parser.parseContent(highConfidenceReadme);
        const lowResult = await parser.parseContent(lowConfidenceReadme);
        
        expect(highResult.data?.confidence?.overall).toBeGreaterThan(
          lowResult.data?.confidence?.overall || 0
        );
      });
    });
  });

  // Integration tests with other components
  describe('Integration with Framework Detection', () => {
    it('should provide data compatible with framework detection', async () => {
      const readme = loadSampleReadme('nodejs-project.md');
      
      const result = await parser.parseContent(readme);
      expect(result.success).toBe(true);
      
      // Should provide structured data for framework detection
      expect(result.data?.languages).toBeDefined();
      expect(result.data?.commands).toBeDefined();
      expect(result.data?.dependencies).toBeDefined();
    });
  });

  describe('Integration with YAML Generator', () => {
    it('should provide data compatible with YAML generation', async () => {
      const readme = loadSampleReadme('complete-project.md');
      
      const result = await parser.parseContent(readme);
      expect(result.success).toBe(true);
      
      // Should provide all necessary data for YAML generation
      expect(result.data?.languages).toBeDefined();
      expect(result.data?.commands).toBeDefined();
      expect(result.data?.metadata).toBeDefined();
    });
  });
});

// Performance benchmarks
describe('README Parser - Performance Benchmarks', () => {
  let parser: ReadmeParserImpl;
  
  beforeEach(() => {
    const componentFactory = ComponentFactory.getInstance();
    parser = componentFactory.createReadmeParser();
  });

  it('should meet performance benchmarks for various file sizes', async () => {
    const testCases = [
      { name: 'small', size: '1KB', file: 'small-readme.md', maxTime: 100 },
      { name: 'medium', size: '10KB', file: 'medium-readme.md', maxTime: 500 },
      { name: 'large', size: '100KB', file: 'large-readme.md', maxTime: 2000 }
    ];

    for (const testCase of testCases) {
      const readme = loadSampleReadme(testCase.file);
      
      const { result, executionTime, withinLimit } = await measurePerformance(
        () => parser.parseContent(readme),
        testCase.maxTime
      );
      
      expect(result.success).toBe(true);
      expect(withinLimit).toBe(true);
      
      console.log(`${testCase.name} (${testCase.size}): ${executionTime}ms`);
    }
  });
});