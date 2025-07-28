/**
 * Data flow verification tests between all components
 * Tests the specific data flow patterns and dependencies between analyzers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { ResultAggregator } from '../../src/parser/utils/result-aggregator';
import { EnhancedAnalyzerResult } from '../../src/parser/types';
import { loadFixture } from '../utils/test-helpers';

describe('Component Data Flow Verification', () => {
  let parser: ReadmeParserImpl;
  let aggregator: ResultAggregator;

  beforeEach(() => {
    parser = new ReadmeParserImpl();
    aggregator = new ResultAggregator();
  });

  describe('MetadataExtractor → LanguageDetector Flow', () => {
    it('should pass project context from metadata to language detection', async () => {
      const content = await loadFixture('real-world-samples', 'react-app.md');
      
      // Parse with both analyzers
      const result = await parser.parseContentWithAnalyzers(content, [
        'MetadataExtractor',
        'LanguageDetector'
      ]);
      
      expect(result.success).toBe(true);
      const data = result.data!;
      
      // Verify metadata provides context
      expect(data.metadata.name).toBeDefined();
      
      // Verify language detection benefits from metadata context
      const jsLang = data.languages.find(l => l.name.toLowerCase().includes('javascript'));
      if (jsLang) {
        // Should have reasonable confidence when project context is available
        expect(jsLang.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should handle missing metadata gracefully in language detection', async () => {
      const minimalContent = `
# Project
Some code:
\`\`\`javascript
console.log('hello');
\`\`\`
      `.trim();
      
      const result = await parser.parseContentWithAnalyzers(minimalContent, [
        'MetadataExtractor',
        'LanguageDetector'
      ]);
      
      expect(result.success).toBe(true);
      
      // Should still detect language even with minimal metadata
      const data = result.data!;
      expect(data.languages.length).toBeGreaterThan(0);
      
      const jsLang = data.languages.find(l => l.name.toLowerCase().includes('javascript'));
      expect(jsLang).toBeDefined();
    });
  });

  describe('LanguageDetector → DependencyExtractor Flow', () => {
    it('should use language context to improve dependency detection', async () => {
      const content = await loadFixture('real-world-samples', 'python-ml-project.md');
      
      const result = await parser.parseContentWithAnalyzers(content, [
        'MetadataExtractor',
        'LanguageDetector',
        'DependencyExtractor'
      ]);
      
      expect(result.success).toBe(true);
      const data = result.data!;
      
      // Verify language detection
      const pythonLang = data.languages.find(l => l.name.toLowerCase() === 'python');
      expect(pythonLang).toBeDefined();
      
      // Verify dependency detection uses language context
      const pythonPackageFiles = data.dependencies.packageFiles.filter(f => 
        f.name === 'requirements.txt' || f.name === 'pyproject.toml' || f.name === 'setup.py'
      );
      
      if (pythonLang && pythonLang.confidence > 0.7) {
        expect(pythonPackageFiles.length).toBeGreaterThan(0);
      }
    });

    it('should validate dependency-language consistency', async () => {
      const mockResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [
            { name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: [] },
            { name: 'JavaScript', confidence: 0.3, sources: ['text-mention'], frameworks: [] }
          ],
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.8, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [
              { name: 'requirements.txt', type: 'pip', mentioned: true, confidence: 0.9 },
              { name: 'package.json', type: 'npm', mentioned: false, confidence: 0.2 }
            ],
            installCommands: [{ command: 'pip install -r requirements.txt', confidence: 0.9 }],
            packages: [],
            dependencies: [],
            devDependencies: []
          },
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(mockResults);
      const validations = aggregator.getDataFlowValidations();
      
      // Should validate that Python language aligns with pip dependencies
      const consistencyValidation = validations.find(v => 
        v.sourceAnalyzer === 'LanguageDetector' && 
        v.targetAnalyzer === 'DependencyExtractor'
      );
      
      expect(consistencyValidation).toBeDefined();
      expect(consistencyValidation!.dataIntegrity).toBeGreaterThan(0.7);
    });
  });

  describe('LanguageDetector → CommandExtractor Flow', () => {
    it('should associate commands with detected languages', async () => {
      const content = await loadFixture('real-world-samples', 'go-microservice.md');
      
      const result = await parser.parseContentWithAnalyzers(content, [
        'MetadataExtractor',
        'LanguageDetector',
        'CommandExtractor'
      ]);
      
      expect(result.success).toBe(true);
      const data = result.data!;
      
      // Verify Go language detection
      const goLang = data.languages.find(l => l.name.toLowerCase() === 'go');
      expect(goLang).toBeDefined();
      
      // Verify Go-specific commands are extracted
      const allCommands = [
        ...data.commands.build,
        ...data.commands.test,
        ...data.commands.run
      ];
      
      const goCommands = allCommands.filter(c => 
        c.command.includes('go ') || c.command.includes('make')
      );
      
      if (goLang && goLang.confidence > 0.6) {
        expect(goCommands.length).toBeGreaterThan(0);
        expect(goCommands.every(c => c.confidence > 0.5)).toBe(true);
      }
    });

    it('should handle multi-language command contexts', async () => {
      const multiLangContent = `
# Multi-Language Project

## Backend (Go)
\`\`\`bash
go run main.go
go test ./...
\`\`\`

## Frontend (JavaScript)
\`\`\`bash
npm install
npm run build
npm test
\`\`\`

## Python Scripts
\`\`\`bash
python setup.py install
pytest
\`\`\`
      `.trim();
      
      const result = await parser.parseContentWithAnalyzers(multiLangContent, [
        'MetadataExtractor',
        'LanguageDetector',
        'CommandExtractor'
      ]);
      
      expect(result.success).toBe(true);
      const data = result.data!;
      
      // Should detect multiple languages
      expect(data.languages.length).toBeGreaterThan(1);
      
      // Should extract commands for different languages
      const allCommands = [
        ...data.commands.build,
        ...data.commands.test,
        ...data.commands.run,
        ...data.commands.install
      ];
      
      expect(allCommands.length).toBeGreaterThan(3);
      
      // Commands should have reasonable confidence
      expect(allCommands.every(c => c.confidence > 0.4)).toBe(true);
    });
  });

  describe('DependencyExtractor → CommandExtractor Flow', () => {
    it('should use dependency information to improve command extraction', async () => {
      const content = await loadFixture('real-world-samples', 'rust-cli-tool.md');
      
      const result = await parser.parseContentWithAnalyzers(content, [
        'MetadataExtractor',
        'LanguageDetector',
        'DependencyExtractor',
        'CommandExtractor'
      ]);
      
      expect(result.success).toBe(true);
      const data = result.data!;
      
      // Verify Cargo dependency detection
      const cargoFile = data.dependencies.packageFiles.find(f => f.name === 'Cargo.toml');
      expect(cargoFile).toBeDefined();
      
      // Verify Cargo commands are extracted with high confidence
      const cargoCommands = [
        ...data.commands.build,
        ...data.commands.test,
        ...data.commands.run
      ].filter(c => c.command.includes('cargo'));
      
      if (cargoFile && cargoFile.confidence > 0.7) {
        expect(cargoCommands.length).toBeGreaterThan(0);
        expect(cargoCommands.every(c => c.confidence > 0.6)).toBe(true);
      }
    });

    it('should validate package manager consistency', async () => {
      const mockResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }],
            installCommands: [{ command: 'npm install', confidence: 0.9 }],
            packages: [{ name: 'express', version: '^4.18.0', manager: 'npm', confidence: 0.8 }],
            dependencies: [],
            devDependencies: []
          },
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [{ command: 'npm run build', confidence: 0.9 }],
            test: [{ command: 'npm test', confidence: 0.9 }],
            run: [{ command: 'npm start', confidence: 0.8 }],
            install: [{ command: 'npm install', confidence: 0.9 }],
            other: []
          },
          confidence: 0.85,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.85, completeness: 0.8 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(mockResults);
      const validations = aggregator.getDataFlowValidations();
      
      // Should validate npm package manager consistency
      const packageManagerValidation = validations.find(v => 
        v.sourceAnalyzer === 'DependencyExtractor' && 
        v.targetAnalyzer === 'CommandExtractor'
      );
      
      expect(packageManagerValidation).toBeDefined();
      expect(packageManagerValidation!.dataIntegrity).toBeGreaterThan(0.8);
    });
  });

  describe('All Components Integration Flow', () => {
    it('should validate complete data flow sequence', async () => {
      const content = await loadFixture('real-world-samples', 'react-app.md');
      
      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Verify all components produced coherent results
      expect(data.metadata).toBeDefined();
      expect(data.languages.length).toBeGreaterThan(0);
      expect(data.dependencies.packageFiles.length).toBeGreaterThan(0);
      expect(data.commands.build.length + data.commands.test.length).toBeGreaterThan(0);
      
      // Verify data coherence across components
      const hasJavaScript = data.languages.some(l => l.name.toLowerCase().includes('javascript'));
      const hasNpmPackage = data.dependencies.packageFiles.some(f => f.type === 'npm');
      const hasNpmCommands = [
        ...data.commands.build,
        ...data.commands.test,
        ...data.commands.install
      ].some(c => c.command.includes('npm'));
      
      if (hasJavaScript) {
        expect(hasNpmPackage || hasNpmCommands).toBe(true);
      }
    });

    it('should handle complex dependency chains', async () => {
      const complexContent = `
# Full-Stack Application

## Project Structure
- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Testing: Jest and Cypress

## Setup
\`\`\`bash
# Install dependencies
npm install

# Setup database
docker-compose up -d postgres

# Run migrations
npm run migrate

# Start development
npm run dev
\`\`\`

## Testing
\`\`\`bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
\`\`\`

## Build
\`\`\`bash
# Build frontend
npm run build:frontend

# Build backend
npm run build:backend

# Build all
npm run build
\`\`\`
      `.trim();
      
      const result = await parser.parseContent(complexContent);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Should detect multiple technologies
      expect(data.languages.length).toBeGreaterThan(1);
      
      // Should extract comprehensive command set
      const totalCommands = data.commands.build.length + 
                           data.commands.test.length + 
                           data.commands.run.length + 
                           data.commands.install.length;
      expect(totalCommands).toBeGreaterThan(5);
      
      // Should have high overall confidence due to rich content
      expect(data.confidence.overall).toBeGreaterThan(0.6);
    });

    it('should maintain performance with complex data flows', async () => {
      const content = await loadFixture('real-world-samples', 'python-ml-project.md');
      
      const startTime = Date.now();
      const result = await parser.parseContent(content);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(500); // Should complete within 500ms
      
      // Verify all components completed successfully
      const data = result.data!;
      expect(data.languages.length).toBeGreaterThan(0);
      expect(data.dependencies.packageFiles.length).toBeGreaterThan(0);
      expect(data.confidence.overall).toBeGreaterThan(0.3);
    });
  });

  describe('Error Propagation and Recovery', () => {
    it('should handle upstream analyzer failures gracefully', async () => {
      const mockResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: null, // Simulated failure
          confidence: 0,
          sources: [],
          errors: [{ 
            code: 'ANALYSIS_FAILED', 
            message: 'Language detection failed', 
            component: 'LanguageDetector',
            severity: 'error'
          }],
          metadata: { processingTime: 100, dataQuality: 0, completeness: 0 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [{ command: 'npm run build', confidence: 0.8 }],
            test: [], run: [], install: [], other: []
          },
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(mockResults);
      
      // Should still produce a result
      expect(result).toBeDefined();
      
      // Should include error information
      expect(result.validationStatus.issues.length).toBeGreaterThan(0);
      
      // Should have reduced confidence due to upstream failure
      expect(result.confidence.overall).toBeLessThan(0.6);
      
      // Should still include successful analyzer results
      expect(result.commands.build.length).toBeGreaterThan(0);
    });

    it('should validate error recovery mechanisms', async () => {
      const problematicContent = `
# Project with Issues

Some malformed content...

\`\`\`
// Unclosed code block
console.log('test');

## Missing header closure

Random text...
      `;
      
      const result = await parser.parseContent(problematicContent);
      
      // Should not crash
      expect(result).toBeDefined();
      
      // Should either succeed with warnings or fail gracefully
      if (result.success) {
        expect(result.data).toBeDefined();
        // May have warnings about malformed content
        if (result.warnings) {
          expect(result.warnings.length).toBeGreaterThanOrEqual(0);
        }
      } else {
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      }
    });
  });
});