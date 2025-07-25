/**
 * Comprehensive integration tests for README parser with realistic expectations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { loadFixtureCategory, measurePerformance, generatePerformanceReport } from '../utils/test-helpers';

describe('Comprehensive README Parser Integration Tests', () => {
  let parser: ReadmeParserImpl;

  beforeAll(async () => {
    parser = new ReadmeParserImpl();
  });

  describe('Real-World Sample Processing', () => {
    it('should successfully parse all real-world samples', async () => {
      const realWorldSamples = await loadFixtureCategory('real-world-samples');
      
      let successCount = 0;
      let totalSamples = 0;
      
      for (const [filename, content] of realWorldSamples) {
        totalSamples++;
        
        const result = await parser.parseContent(content);
        
        if (result.success && result.data) {
          successCount++;
          
          // Basic validation - should have some extracted data
          expect(result.data.metadata).toBeDefined();
          expect(result.data.languages).toBeDefined();
          expect(result.data.commands).toBeDefined();
          expect(result.data.dependencies).toBeDefined();
          expect(result.data.confidence).toBeDefined();
          
          console.log(`✅ ${filename}: ${result.data.languages.length} languages, ${result.data.commands.build.length + result.data.commands.test.length + result.data.commands.run.length} commands`);
        } else {
          console.log(`❌ ${filename}: Parse failed`);
          if (result.errors) {
            console.log(`   Errors: ${result.errors.map(e => e.message).join(', ')}`);
          }
        }
      }
      
      const successRate = successCount / totalSamples;
      console.log(`\nSuccess Rate: ${(successRate * 100).toFixed(1)}% (${successCount}/${totalSamples})`);
      
      // Should successfully parse most real-world samples
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
    });

    it('should detect languages in real-world samples', async () => {
      const realWorldSamples = await loadFixtureCategory('real-world-samples');
      
      const languageDetectionTests = [
        { file: 'react-app.md', expectedLangs: ['javascript'] },
        { file: 'python-ml-project.md', expectedLangs: ['python'] },
        { file: 'go-microservice.md', expectedLangs: ['go'] },
        { file: 'rust-cli-tool.md', expectedLangs: ['rust'] }
      ];
      
      let correctDetections = 0;
      
      for (const test of languageDetectionTests) {
        const content = realWorldSamples.get(test.file);
        if (!content) continue;
        
        const result = await parser.parseContent(content);
        
        if (result.success && result.data) {
          const detectedLangs = result.data.languages.map(l => l.name.toLowerCase());
          const hasExpectedLangs = test.expectedLangs.every(lang => detectedLangs.includes(lang));
          
          if (hasExpectedLangs) {
            correctDetections++;
            console.log(`✅ ${test.file}: Detected ${detectedLangs.join(', ')}`);
          } else {
            console.log(`⚠️  ${test.file}: Expected ${test.expectedLangs.join(', ')}, got ${detectedLangs.join(', ')}`);
          }
        }
      }
      
      const accuracy = correctDetections / languageDetectionTests.length;
      console.log(`\nLanguage Detection Accuracy: ${(accuracy * 100).toFixed(1)}%`);
      
      // Should detect primary languages correctly
      expect(accuracy).toBeGreaterThan(0.75); // 75% accuracy
    });

    it('should extract commands from real-world samples', async () => {
      const realWorldSamples = await loadFixtureCategory('real-world-samples');
      
      let samplesWithCommands = 0;
      let totalSamples = 0;
      
      for (const [filename, content] of realWorldSamples) {
        totalSamples++;
        
        const result = await parser.parseContent(content);
        
        if (result.success && result.data) {
          const totalCommands = result.data.commands.build.length + 
                               result.data.commands.test.length + 
                               result.data.commands.run.length +
                               result.data.commands.other.length;
          
          if (totalCommands > 0) {
            samplesWithCommands++;
            console.log(`✅ ${filename}: ${totalCommands} commands extracted`);
          } else {
            console.log(`⚠️  ${filename}: No commands extracted`);
          }
        }
      }
      
      const commandExtractionRate = samplesWithCommands / totalSamples;
      console.log(`\nCommand Extraction Rate: ${(commandExtractionRate * 100).toFixed(1)}%`);
      
      // Should extract commands from most samples
      expect(commandExtractionRate).toBeGreaterThan(0.6); // 60% should have commands
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle all edge cases without crashing', async () => {
      const edgeCases = await loadFixtureCategory('edge-cases');
      
      let successCount = 0;
      let totalCases = 0;
      
      for (const [filename, content] of edgeCases) {
        totalCases++;
        
        try {
          const result = await parser.parseContent(content);
          
          // Should not crash, even if parsing fails
          expect(result).toBeDefined();
          expect(result.success).toBeDefined();
          
          if (result.success) {
            successCount++;
            console.log(`✅ ${filename}: Handled successfully`);
          } else {
            console.log(`⚠️  ${filename}: Parse failed gracefully`);
          }
        } catch (error) {
          console.log(`❌ ${filename}: Crashed with error: ${error}`);
          throw error; // Re-throw to fail the test
        }
      }
      
      const gracefulHandlingRate = successCount / totalCases;
      console.log(`\nGraceful Handling Rate: ${(gracefulHandlingRate * 100).toFixed(1)}%`);
      
      // Should handle edge cases gracefully (may not succeed but shouldn't crash)
      expect(gracefulHandlingRate).toBeGreaterThan(0.4); // 40% success rate for edge cases
    });

    it('should handle malformed markdown gracefully', async () => {
      const edgeCases = await loadFixtureCategory('edge-cases');
      const malformedContent = edgeCases.get('malformed-markdown.md');
      
      if (malformedContent) {
        const result = await parser.parseContent(malformedContent);
        
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
        
        // Should not crash on malformed content
        if (result.success && result.data) {
          expect(result.data.metadata.name).toBeDefined();
          console.log(`✅ Malformed markdown handled: ${result.data.languages.length} languages detected`);
        } else {
          console.log(`⚠️  Malformed markdown failed gracefully`);
        }
      }
    });

    it('should handle unicode content correctly', async () => {
      const edgeCases = await loadFixtureCategory('edge-cases');
      const unicodeContent = edgeCases.get('unicode-content.md');
      
      if (unicodeContent) {
        const result = await parser.parseContent(unicodeContent);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        
        // Should extract project name despite unicode
        expect(result.data!.metadata.name).toBeDefined();
        expect(result.data!.metadata.name!.length).toBeGreaterThan(0);
        
        console.log(`✅ Unicode content handled: "${result.data!.metadata.name}"`);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should meet performance requirements for various file sizes', async () => {
      const { generateLargeReadme } = require('../fixtures/performance/large-readme-generator.js');
      
      const performanceTests = [
        { name: 'Small (1K lines)', size: 'small', maxTime: 200 },
        { name: 'Medium (5K lines)', size: 'medium', maxTime: 500 },
        { name: 'Large (10K lines)', size: 'large', maxTime: 1000 }
      ];
      
      for (const test of performanceTests) {
        const content = generateLargeReadme(test.size);
        
        const { result, metrics } = await measurePerformance(
          () => parser.parseContent(content),
          3
        );
        
        metrics.fileSize = Buffer.byteLength(content, 'utf8');
        metrics.linesCount = content.split('\n').length;
        
        expect(result.success).toBe(true);
        expect(metrics.parseTime).toBeLessThan(test.maxTime);
        expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB
        
        console.log(generatePerformanceReport(test.name, metrics));
      }
    });

    it('should maintain reasonable throughput', async () => {
      const realWorldSamples = await loadFixtureCategory('real-world-samples');
      const throughputs: number[] = [];
      
      for (const [filename, content] of realWorldSamples) {
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          2
        );
        
        const fileSize = Buffer.byteLength(content, 'utf8');
        const throughput = fileSize / 1024 / (metrics.parseTime / 1000); // KB/s
        throughputs.push(throughput);
        
        expect(throughput).toBeGreaterThan(10); // Minimum 10 KB/s
      }
      
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
      console.log(`Average Throughput: ${avgThroughput.toFixed(2)} KB/s`);
      
      expect(avgThroughput).toBeGreaterThan(50); // Average 50 KB/s
    });
  });

  describe('Data Structure Validation', () => {
    it('should return consistent data structure across all samples', async () => {
      const realWorldSamples = await loadFixtureCategory('real-world-samples');
      
      for (const [filename, content] of realWorldSamples) {
        const result = await parser.parseContent(content);
        
        if (result.success && result.data) {
          const data = result.data;
          
          // Validate structure
          expect(data.metadata).toBeDefined();
          expect(data.languages).toBeInstanceOf(Array);
          expect(data.commands).toBeDefined();
          expect(data.commands.build).toBeInstanceOf(Array);
          expect(data.commands.test).toBeInstanceOf(Array);
          expect(data.commands.run).toBeInstanceOf(Array);
          expect(data.commands.other).toBeInstanceOf(Array);
          expect(data.dependencies).toBeDefined();
          expect(data.dependencies.packageFiles).toBeInstanceOf(Array);
          expect(data.dependencies.installCommands).toBeInstanceOf(Array);
          expect(data.dependencies.packages).toBeInstanceOf(Array);
          expect(data.confidence).toBeDefined();
          expect(typeof data.confidence.overall).toBe('number');
          
          // Validate confidence scores are in valid range
          expect(data.confidence.overall).toBeGreaterThanOrEqual(0);
          expect(data.confidence.overall).toBeLessThanOrEqual(1);
          
          // Validate language confidence scores
          data.languages.forEach(lang => {
            expect(lang.confidence).toBeGreaterThanOrEqual(0);
            expect(lang.confidence).toBeLessThanOrEqual(1);
            expect(lang.sources).toBeInstanceOf(Array);
          });
        }
      }
    });

    it('should provide meaningful confidence scores', async () => {
      const realWorldSamples = await loadFixtureCategory('real-world-samples');
      const confidenceScores: number[] = [];
      
      for (const [filename, content] of realWorldSamples) {
        const result = await parser.parseContent(content);
        
        if (result.success && result.data) {
          confidenceScores.push(result.data.confidence.overall);
          
          // Should have reasonable confidence for real-world samples
          expect(result.data.confidence.overall).toBeGreaterThan(0.1);
          
          console.log(`${filename}: ${(result.data.confidence.overall * 100).toFixed(1)}% confidence`);
        }
      }
      
      const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
      console.log(`Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
      
      expect(avgConfidence).toBeGreaterThan(0.3); // 30% average confidence
    });
  });
});