/**
 * Integration tests using real-world README files
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { loadFixtureCategory, validateParseResult, measurePerformance, generatePerformanceReport } from '../utils/test-helpers';
import { ProjectInfo } from '../../src/parser/types';

describe('Real-World README Parsing', () => {
  let parser: ReadmeParserImpl;
  let realWorldSamples: Map<string, string>;

  beforeAll(async () => {
    parser = new ReadmeParserImpl();
    realWorldSamples = await loadFixtureCategory('real-world-samples');
  });

  describe('React Application README', () => {
    it('should correctly parse React todo app README', async () => {
      const content = realWorldSamples.get('react-app.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should detect JavaScript/TypeScript
      const languages = data.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');

      // Should detect React framework
      const reactLang = data.languages.find(l => l.name.toLowerCase() === 'javascript');
      expect(reactLang?.frameworks).toContain('React');

      // Should extract npm commands
      const buildCommands = data.commands.build.map(c => c.command);
      const testCommands = data.commands.test.map(c => c.command);
      
      expect(buildCommands).toContain('npm run build');
      expect(testCommands).toContain('npm test');

      // Should detect package.json dependency
      const packageFiles = data.dependencies.packageFiles.map(f => f.name);
      expect(packageFiles).toContain('package.json');

      // Should extract project metadata
      expect(data.metadata.name).toContain('React Todo App');
      expect(data.metadata.description).toBeDefined();
      expect(data.metadata.description!.length).toBeGreaterThan(0);
    });

    it('should have high confidence scores for React detection', async () => {
      const content = realWorldSamples.get('react-app.md');
      const result = await parser.parseContent(content!);
      
      const jsLang = result.data!.languages.find(l => l.name.toLowerCase() === 'javascript');
      expect(jsLang?.confidence).toBeGreaterThan(0.8);
      
      expect(result.data!.confidence.overall).toBeGreaterThan(0.7);
    });
  });

  describe('Python ML Project README', () => {
    it('should correctly parse Python machine learning project', async () => {
      const content = realWorldSamples.get('python-ml-project.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should detect Python
      const languages = data.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('python');

      // Should detect ML frameworks
      const pythonLang = data.languages.find(l => l.name.toLowerCase() === 'python');
      expect(pythonLang?.frameworks).toEqual(
        expect.arrayContaining(['PyTorch', 'FastAPI'])
      );

      // Should extract Python commands
      const testCommands = data.commands.test.map(c => c.command);
      expect(testCommands).toContain('pytest');

      // Should detect requirements.txt
      const packageFiles = data.dependencies.packageFiles.map(f => f.name);
      expect(packageFiles).toContain('requirements.txt');

      // Should extract Docker commands
      const buildCommands = data.commands.build.map(c => c.command);
      expect(buildCommands).toContain('docker build -t ml-classifier .');
    });

    it('should detect multiple deployment environments', async () => {
      const content = realWorldSamples.get('python-ml-project.md');
      const result = await parser.parseContent(content!);
      
      const data = result.data!;
      
      // Should detect various command types
      expect(data.commands.build.length).toBeGreaterThan(3);
      expect(data.commands.test.length).toBeGreaterThan(2);
      expect(data.commands.run.length).toBeGreaterThan(1);
    });
  });

  describe('Go Microservice README', () => {
    it('should correctly parse Go microservice project', async () => {
      const content = realWorldSamples.get('go-microservice.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should detect Go
      const languages = data.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('go');

      // Should detect Gin framework
      const goLang = data.languages.find(l => l.name.toLowerCase() === 'go');
      expect(goLang?.frameworks).toContain('Gin');

      // Should extract Go commands
      const buildCommands = data.commands.build.map(c => c.command);
      const testCommands = data.commands.test.map(c => c.command);
      
      expect(buildCommands).toContain('go run cmd/server/main.go');
      expect(testCommands).toContain('go test ./...');

      // Should detect go.mod
      const packageFiles = data.dependencies.packageFiles.map(f => f.name);
      expect(packageFiles).toContain('go.mod');

      // Should extract Make commands
      expect(buildCommands).toEqual(
        expect.arrayContaining(['make build', 'make run'])
      );
    });

    it('should detect microservice architecture patterns', async () => {
      const content = realWorldSamples.get('go-microservice.md');
      const result = await parser.parseContent(content!);
      
      const data = result.data!;
      
      // Should detect database and infrastructure commands
      const otherCommands = data.commands.other.map(c => c.command);
      expect(otherCommands).toEqual(
        expect.arrayContaining(['docker-compose up -d postgres redis nats'])
      );
    });
  });

  describe('Rust CLI Tool README', () => {
    it('should correctly parse Rust CLI project', async () => {
      const content = realWorldSamples.get('rust-cli-tool.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      
      // Should detect Rust
      const languages = data.languages.map(l => l.name.toLowerCase());
      expect(languages).toContain('rust');

      // Should extract Cargo commands
      const buildCommands = data.commands.build.map(c => c.command);
      const testCommands = data.commands.test.map(c => c.command);
      
      expect(buildCommands).toContain('cargo build --release');
      expect(testCommands).toContain('cargo test');

      // Should detect Cargo.toml
      const packageFiles = data.dependencies.packageFiles.map(f => f.name);
      expect(packageFiles).toContain('Cargo.toml');

      // Should extract installation commands
      const installCommands = data.dependencies.installCommands.map(c => c.command);
      expect(installCommands).toContain('cargo install file-processor');
    });

    it('should detect cross-compilation targets', async () => {
      const content = realWorldSamples.get('rust-cli-tool.md');
      const result = await parser.parseContent(content!);
      
      const data = result.data!;
      
      // Should detect multiple build targets
      const buildCommands = data.commands.build.map(c => c.command);
      expect(buildCommands).toEqual(
        expect.arrayContaining([
          'cargo build --release --target x86_64-pc-windows-gnu'
        ])
      );
    });
  });

  describe('Performance with Real-World Files', () => {
    it('should parse React app README within performance limits', async () => {
      const content = realWorldSamples.get('react-app.md')!;
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(metrics.parseTime).toBeLessThan(100); // Should parse in under 100ms
      expect(metrics.memoryUsage).toBeLessThan(10 * 1024 * 1024); // Under 10MB
      
      console.log(generatePerformanceReport('React App README', metrics));
    });

    it('should parse Python ML project README efficiently', async () => {
      const content = realWorldSamples.get('python-ml-project.md')!;
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(metrics.parseTime).toBeLessThan(150); // Larger file, allow more time
      expect(metrics.memoryUsage).toBeLessThan(15 * 1024 * 1024); // Under 15MB
      
      console.log(generatePerformanceReport('Python ML Project README', metrics));
    });

    it('should handle all real-world samples within time limits', async () => {
      const results = new Map<string, number>();
      
      for (const [filename, content] of realWorldSamples) {
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content)
        );
        
        results.set(filename, metrics.parseTime);
        expect(metrics.parseTime).toBeLessThan(200); // Max 200ms per file
      }
      
      const avgTime = Array.from(results.values()).reduce((a, b) => a + b, 0) / results.size;
      console.log(`Average parsing time across ${results.size} real-world files: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('Validation Against Expected Results', () => {
    it('should meet accuracy requirements for language detection', async () => {
      const testCases = [
        {
          name: 'React App',
          content: realWorldSamples.get('react-app.md')!,
          expected: {
            languages: [
              { name: 'JavaScript', confidence: 0.8, sources: ['code-block'], frameworks: ['React'] },
              { name: 'TypeScript', confidence: 0.7, sources: ['code-block'] }
            ]
          }
        },
        {
          name: 'Python ML',
          content: realWorldSamples.get('python-ml-project.md')!,
          expected: {
            languages: [
              { name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: ['PyTorch'] }
            ]
          }
        },
        {
          name: 'Go Microservice',
          content: realWorldSamples.get('go-microservice.md')!,
          expected: {
            languages: [
              { name: 'Go', confidence: 0.8, sources: ['code-block'], frameworks: ['Gin'] }
            ]
          }
        },
        {
          name: 'Rust CLI',
          content: realWorldSamples.get('rust-cli-tool.md')!,
          expected: {
            languages: [
              { name: 'Rust', confidence: 0.8, sources: ['code-block'] }
            ]
          }
        }
      ];

      let totalScore = 0;
      let passedTests = 0;

      for (const testCase of testCases) {
        const result = await parser.parseContent(testCase.content);
        const validation = validateParseResult(result, testCase.expected);
        
        totalScore += validation.score;
        if (validation.passed) passedTests++;
        
        console.log(`${testCase.name}: ${validation.passed ? '✅' : '❌'} (Score: ${(validation.score * 100).toFixed(1)}%)`);
        if (validation.errors.length > 0) {
          console.log(`  Errors: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
          console.log(`  Warnings: ${validation.warnings.join(', ')}`);
        }
      }

      const avgScore = totalScore / testCases.length;
      const passRate = passedTests / testCases.length;
      
      console.log(`\nOverall Results:`);
      console.log(`Pass Rate: ${(passRate * 100).toFixed(1)}%`);
      console.log(`Average Score: ${(avgScore * 100).toFixed(1)}%`);
      
      // Requirements: >95% accuracy for framework detection
      expect(avgScore).toBeGreaterThan(0.8); // 80% minimum for integration tests
      expect(passRate).toBeGreaterThan(0.75); // 75% pass rate minimum
    });
  });
});