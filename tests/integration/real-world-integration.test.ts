/**
 * Real-world README integration test cases
 * Tests parsing accuracy and consistency with actual project README files
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { 
  loadFixtureCategory,
  validateParseResult,
  measurePerformance,
  generatePerformanceReport,
  createTestCase,
  batchValidate,
  generateTestSummary
} from '../utils/test-helpers';
import { ProjectInfo } from '../../src/parser/types';

describe('Real-World README Integration Tests', () => {
  let parser: ReadmeParserImpl;
  let realWorldSamples: Map<string, string>;

  beforeAll(async () => {
    parser = new ReadmeParserImpl({
      enableCaching: true,
      enablePerformanceMonitoring: true
    });
    realWorldSamples = await loadFixtureCategory('real-world-samples');
  });

  describe('Framework-Specific Integration Tests', () => {
    it('should accurately parse React application README', async () => {
      const content = realWorldSamples.get('react-app.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Verify React-specific detection
      const jsLang = data.languages.find(l => l.name.toLowerCase().includes('javascript'));
      expect(jsLang).toBeDefined();
      expect(jsLang!.frameworks).toContain('React');
      
      // Verify npm ecosystem detection
      const packageJson = data.dependencies.packageFiles.find(f => f.name === 'package.json');
      expect(packageJson).toBeDefined();
      expect(packageJson!.type).toBe('npm');
      
      // Verify React-specific commands
      const buildCommands = data.commands.build.map(c => c.command);
      expect(buildCommands).toContain('npm run build');
      
      const testCommands = data.commands.test.map(c => c.command);
      expect(testCommands).toContain('npm test');
      
      // Verify confidence scores
      expect(data.confidence.overall).toBeGreaterThan(0.7);
      expect(data.confidence.languages).toBeGreaterThan(0.6);
    });

    it('should accurately parse Python ML project README', async () => {
      const content = realWorldSamples.get('python-ml-project.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Verify Python detection
      const pythonLang = data.languages.find(l => l.name.toLowerCase() === 'python');
      expect(pythonLang).toBeDefined();
      expect(pythonLang!.confidence).toBeGreaterThan(0.7);
      
      // Verify ML frameworks
      expect(pythonLang!.frameworks).toEqual(
        expect.arrayContaining(['PyTorch', 'FastAPI'])
      );
      
      // Verify Python package management
      const requirementsTxt = data.dependencies.packageFiles.find(f => f.name === 'requirements.txt');
      expect(requirementsTxt).toBeDefined();
      expect(requirementsTxt!.type).toBe('pip');
      
      // Verify Python-specific commands
      const testCommands = data.commands.test.map(c => c.command);
      expect(testCommands).toContain('pytest');
      
      // Verify Docker integration
      const buildCommands = data.commands.build.map(c => c.command);
      expect(buildCommands.some(cmd => cmd.includes('docker'))).toBe(true);
    });

    it('should accurately parse Go microservice README', async () => {
      const content = realWorldSamples.get('go-microservice.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Verify Go detection
      const goLang = data.languages.find(l => l.name.toLowerCase() === 'go');
      expect(goLang).toBeDefined();
      expect(goLang!.confidence).toBeGreaterThan(0.7);
      
      // Verify Go frameworks
      expect(goLang!.frameworks).toContain('Gin');
      
      // Verify Go module system
      const goMod = data.dependencies.packageFiles.find(f => f.name === 'go.mod');
      expect(goMod).toBeDefined();
      expect(goMod!.type).toBe('go');
      
      // Verify Go commands
      const buildCommands = data.commands.build.map(c => c.command);
      expect(buildCommands).toEqual(
        expect.arrayContaining(['go run cmd/server/main.go', 'make build'])
      );
      
      const testCommands = data.commands.test.map(c => c.command);
      expect(testCommands).toContain('go test ./...');
    });

    it('should accurately parse Rust CLI tool README', async () => {
      const content = realWorldSamples.get('rust-cli-tool.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Verify Rust detection
      const rustLang = data.languages.find(l => l.name.toLowerCase() === 'rust');
      expect(rustLang).toBeDefined();
      expect(rustLang!.confidence).toBeGreaterThan(0.7);
      
      // Verify Cargo package management
      const cargoToml = data.dependencies.packageFiles.find(f => f.name === 'Cargo.toml');
      expect(cargoToml).toBeDefined();
      expect(cargoToml!.type).toBe('cargo');
      
      // Verify Cargo commands
      const buildCommands = data.commands.build.map(c => c.command);
      expect(buildCommands).toContain('cargo build --release');
      
      const testCommands = data.commands.test.map(c => c.command);
      expect(testCommands).toContain('cargo test');
      
      // Verify installation commands
      const installCommands = data.dependencies.installCommands.map(c => c.command);
      expect(installCommands).toContain('cargo install file-processor');
    });
  });

  describe('Cross-Platform Integration Tests', () => {
    it('should handle projects with multiple deployment targets', async () => {
      const content = realWorldSamples.get('rust-cli-tool.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Should detect cross-compilation commands
      const buildCommands = data.commands.build.map(c => c.command);
      const crossCompileCommands = buildCommands.filter(cmd => 
        cmd.includes('--target') && cmd.includes('windows')
      );
      
      expect(crossCompileCommands.length).toBeGreaterThan(0);
      
      // Should maintain high confidence for platform-specific commands
      const platformCommands = data.commands.build.filter(c => 
        c.command.includes('--target')
      );
      
      if (platformCommands.length > 0) {
        expect(platformCommands.every(c => c.confidence > 0.6)).toBe(true);
      }
    });

    it('should handle containerized applications', async () => {
      const dockerContent = `
# Containerized Application

## Development
\`\`\`bash
# Build image
docker build -t myapp .

# Run container
docker run -p 3000:3000 myapp

# Development with compose
docker-compose up --build
\`\`\`

## Production
\`\`\`bash
# Build production image
docker build -f Dockerfile.prod -t myapp:prod .

# Deploy with Kubernetes
kubectl apply -f k8s/
\`\`\`
      `.trim();

      const result = await parser.parseContent(dockerContent);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Should extract Docker commands
      const dockerCommands = [
        ...data.commands.build,
        ...data.commands.run,
        ...data.commands.other
      ].filter(c => c.command.includes('docker'));
      
      expect(dockerCommands.length).toBeGreaterThan(2);
      
      // Should detect Kubernetes commands
      const k8sCommands = data.commands.other.filter(c => 
        c.command.includes('kubectl')
      );
      
      expect(k8sCommands.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Project Structure Integration', () => {
    it('should handle monorepo structures', async () => {
      const monorepoContent = `
# Monorepo Project

## Structure
- \`packages/frontend/\` - React application
- \`packages/backend/\` - Node.js API
- \`packages/shared/\` - Shared utilities

## Setup
\`\`\`bash
# Install all dependencies
npm install

# Install workspace dependencies
npm run bootstrap

# Build all packages
npm run build:all
\`\`\`

## Development
\`\`\`bash
# Start frontend
npm run dev:frontend

# Start backend
npm run dev:backend

# Start all services
npm run dev
\`\`\`

## Testing
\`\`\`bash
# Test all packages
npm run test:all

# Test specific package
npm run test packages/frontend

# E2E tests
npm run test:e2e
\`\`\`
      `.trim();

      const result = await parser.parseContent(monorepoContent);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Should detect multiple languages/frameworks
      expect(data.languages.length).toBeGreaterThan(1);
      
      // Should extract comprehensive command set
      const totalCommands = data.commands.build.length + 
                           data.commands.test.length + 
                           data.commands.run.length;
      expect(totalCommands).toBeGreaterThan(5);
      
      // Should detect workspace-specific commands
      const workspaceCommands = [
        ...data.commands.build,
        ...data.commands.run,
        ...data.commands.test
      ].filter(c => c.command.includes(':all') || c.command.includes('bootstrap'));
      
      expect(workspaceCommands.length).toBeGreaterThan(0);
    });

    it('should handle microservices architecture', async () => {
      const content = realWorldSamples.get('go-microservice.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Should detect service-oriented commands
      const serviceCommands = data.commands.other.filter(c => 
        c.command.includes('docker-compose') || 
        c.command.includes('postgres') ||
        c.command.includes('redis')
      );
      
      expect(serviceCommands.length).toBeGreaterThan(0);
      
      // Should maintain reasonable confidence for infrastructure commands
      if (serviceCommands.length > 0) {
        expect(serviceCommands.every(c => c.confidence > 0.4)).toBe(true);
      }
    });
  });

  describe('Integration Accuracy Validation', () => {
    it('should meet accuracy requirements across all samples', async () => {
      const expectedResults = new Map([
        ['react-app.md', {
          languages: [
            { name: 'JavaScript', confidence: 0.7, sources: ['code-block'], frameworks: ['React'] },
            { name: 'TypeScript', confidence: 0.6, sources: ['code-block'] }
          ],
          commands: {
            build: [{ command: 'npm run build', confidence: 0.8 }],
            test: [{ command: 'npm test', confidence: 0.8 }]
          },
          dependencies: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }]
          }
        }],
        ['python-ml-project.md', {
          languages: [
            { name: 'Python', confidence: 0.8, sources: ['code-block'], frameworks: ['PyTorch'] }
          ],
          commands: {
            test: [{ command: 'pytest', confidence: 0.8 }]
          },
          dependencies: {
            packageFiles: [{ name: 'requirements.txt', type: 'pip', mentioned: true, confidence: 0.8 }]
          }
        }],
        ['go-microservice.md', {
          languages: [
            { name: 'Go', confidence: 0.7, sources: ['code-block'], frameworks: ['Gin'] }
          ],
          commands: {
            build: [{ command: 'go run cmd/server/main.go', confidence: 0.8 }],
            test: [{ command: 'go test ./...', confidence: 0.8 }]
          },
          dependencies: {
            packageFiles: [{ name: 'go.mod', type: 'go', mentioned: true, confidence: 0.8 }]
          }
        }],
        ['rust-cli-tool.md', {
          languages: [
            { name: 'Rust', confidence: 0.7, sources: ['code-block'] }
          ],
          commands: {
            build: [{ command: 'cargo build --release', confidence: 0.8 }],
            test: [{ command: 'cargo test', confidence: 0.8 }]
          },
          dependencies: {
            packageFiles: [{ name: 'Cargo.toml', type: 'cargo', mentioned: true, confidence: 0.8 }]
          }
        }]
      ]);

      const testCases = Array.from(expectedResults.entries()).map(([filename, expected]) => {
        const content = realWorldSamples.get(filename);
        expect(content).toBeDefined();
        return createTestCase(filename.replace('.md', ''), content!, expected);
      });

      const validationResults = await batchValidate(
        testCases,
        (content) => parser.parseContent(content)
      );

      // Generate comprehensive test report
      const summary = generateTestSummary(validationResults);
      console.log(summary);

      // Verify accuracy requirements
      const passedTests = Array.from(validationResults.values()).filter(r => r.passed).length;
      const totalTests = validationResults.size;
      const successRate = passedTests / totalTests;

      expect(successRate).toBeGreaterThan(0.8); // 80% success rate minimum

      // Verify average accuracy score
      const avgScore = Array.from(validationResults.values())
        .reduce((sum, r) => sum + r.score, 0) / totalTests;
      expect(avgScore).toBeGreaterThan(0.7); // 70% average accuracy

      // Log detailed results
      console.log(`\n📊 Integration Accuracy Results:`);
      console.log(`Success Rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`Average Score: ${(avgScore * 100).toFixed(1)}%`);
    });

    it('should maintain consistency across multiple parsing runs', async () => {
      const content = realWorldSamples.get('react-app.md')!;
      const runs = 5;
      const results = [];

      // Perform multiple parsing runs
      for (let i = 0; i < runs; i++) {
        const result = await parser.parseContent(content);
        expect(result.success).toBe(true);
        results.push(result.data!);
      }

      // Verify consistency across runs
      const firstResult = results[0];
      
      for (let i = 1; i < results.length; i++) {
        const currentResult = results[i];
        
        // Language detection should be consistent
        expect(currentResult.languages.length).toBe(firstResult.languages.length);
        
        // Primary language should be the same
        const firstPrimaryLang = firstResult.languages[0]?.name;
        const currentPrimaryLang = currentResult.languages[0]?.name;
        expect(currentPrimaryLang).toBe(firstPrimaryLang);
        
        // Command counts should be similar (allow ±1 variation)
        const firstCommandCount = firstResult.commands.build.length + firstResult.commands.test.length;
        const currentCommandCount = currentResult.commands.build.length + currentResult.commands.test.length;
        expect(Math.abs(currentCommandCount - firstCommandCount)).toBeLessThanOrEqual(1);
        
        // Overall confidence should be similar (within 5%)
        expect(Math.abs(currentResult.confidence.overall - firstResult.confidence.overall)).toBeLessThan(0.05);
      }
    });
  });

  describe('Performance Integration Validation', () => {
    it('should meet performance requirements for all real-world samples', async () => {
      const performanceResults = new Map<string, any>();
      
      for (const [filename, content] of realWorldSamples) {
        if (!filename.endsWith('.md') || filename === 'README.md') continue;
        
        const { result, metrics } = await measurePerformance(
          () => parser.parseContent(content),
          3
        );
        
        metrics.fileSize = Buffer.byteLength(content, 'utf8');
        metrics.linesCount = content.split('\n').length;
        
        expect(result.success).toBe(true);
        
        // Performance requirements
        expect(metrics.parseTime).toBeLessThan(500); // Under 500ms
        expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Under 50MB
        
        const throughput = metrics.fileSize / 1024 / (metrics.parseTime / 1000);
        expect(throughput).toBeGreaterThan(10); // At least 10 KB/s
        
        performanceResults.set(filename, {
          metrics,
          throughput,
          result: result.success
        });
        
        console.log(generatePerformanceReport(filename, metrics));
      }
      
      // Calculate overall performance statistics
      const allMetrics = Array.from(performanceResults.values()).map(r => r.metrics);
      const avgParseTime = allMetrics.reduce((sum, m) => sum + m.parseTime, 0) / allMetrics.length;
      const avgThroughput = Array.from(performanceResults.values())
        .reduce((sum, r) => sum + r.throughput, 0) / performanceResults.size;
      
      console.log(`\n📈 Overall Performance Summary:`);
      console.log(`Average Parse Time: ${avgParseTime.toFixed(2)}ms`);
      console.log(`Average Throughput: ${avgThroughput.toFixed(2)} KB/s`);
      console.log(`Files Processed: ${performanceResults.size}`);
      
      // Overall performance requirements
      expect(avgParseTime).toBeLessThan(300); // Average under 300ms
      expect(avgThroughput).toBeGreaterThan(25); // Average over 25 KB/s
    });

    it('should scale efficiently with file size', async () => {
      const samples = Array.from(realWorldSamples.entries())
        .filter(([filename]) => filename.endsWith('.md') && filename !== 'README.md')
        .sort(([, a], [, b]) => a.length - b.length); // Sort by content length
      
      const scalingResults = [];
      
      for (const [filename, content] of samples) {
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          2
        );
        
        metrics.fileSize = Buffer.byteLength(content, 'utf8');
        metrics.linesCount = content.split('\n').length;
        
        scalingResults.push({
          filename,
          fileSize: metrics.fileSize,
          parseTime: metrics.parseTime,
          efficiency: metrics.fileSize / metrics.parseTime // bytes per ms
        });
      }
      
      // Verify scaling efficiency doesn't degrade significantly
      const efficiencies = scalingResults.map(r => r.efficiency);
      const minEfficiency = Math.min(...efficiencies);
      const maxEfficiency = Math.max(...efficiencies);
      const efficiencyRatio = maxEfficiency / minEfficiency;
      
      // Efficiency shouldn't vary by more than 5x across file sizes
      expect(efficiencyRatio).toBeLessThan(5);
      
      console.log(`\n📏 Scaling Analysis:`);
      scalingResults.forEach(r => {
        console.log(`${r.filename}: ${(r.fileSize/1024).toFixed(1)}KB in ${r.parseTime.toFixed(1)}ms (${r.efficiency.toFixed(1)} B/ms)`);
      });
    });
  });
});