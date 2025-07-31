import { AnalyzerResult, TestingInfo, TestingToolType } from '../types';
import { MarkdownAST, MarkdownNode, MarkdownUtils } from '../../shared/markdown-parser';
import { Analyzer } from './registry';

/**
 * Detects testing frameworks and configurations from README content
 */
export class TestingDetector implements Analyzer<TestingInfo> {
  readonly name = 'TestingDetector';

  private testingFrameworks = [
    {
      name: 'Jest',
      language: 'JavaScript',
      keywords: ['jest', 'jest.config', 'jest.setup'],
      configFiles: ['jest.config.js', 'jest.config.json', 'jest.config.ts'],
      testPatterns: ['*.test.js', '*.spec.js', '__tests__', '*.test.ts', '*.spec.ts']
    },
    {
      name: 'Mocha',
      language: 'JavaScript',
      keywords: ['mocha', 'mocha.opts', '.mocharc'],
      configFiles: ['.mocharc.json', 'mocha.opts', '.mocharc.js'],
      testPatterns: ['*.test.js', '*.spec.js', '*.test.ts', '*.spec.ts']
    },
    {
      name: 'Vitest',
      language: 'JavaScript',
      keywords: ['vitest', 'vitest.config'],
      configFiles: ['vitest.config.js', 'vitest.config.ts'],
      testPatterns: ['*.test.js', '*.spec.js', '*.test.ts', '*.spec.ts']
    },
    {
      name: 'Cypress',
      language: 'JavaScript',
      keywords: ['cypress', 'cypress.config'],
      configFiles: ['cypress.config.js', 'cypress.config.ts', 'cypress.json'],
      testPatterns: ['*.cy.js', '*.cy.ts', 'cypress/e2e/*']
    },
    {
      name: 'Playwright',
      language: 'JavaScript',
      keywords: ['playwright', 'playwright.config'],
      configFiles: ['playwright.config.js', 'playwright.config.ts'],
      testPatterns: ['*.spec.js', '*.spec.ts', 'tests/*']
    },
    {
      name: 'pytest',
      language: 'Python',
      keywords: ['pytest', 'pytest.ini', 'py.test'],
      configFiles: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
      testPatterns: ['test_*.py', '*_test.py', 'tests/*.py']
    },
    {
      name: 'unittest',
      language: 'Python',
      keywords: ['unittest', 'python -m unittest'],
      configFiles: [],
      testPatterns: ['test_*.py', '*_test.py']
    },
    {
      name: 'PHPUnit',
      language: 'PHP',
      keywords: ['phpunit', 'phpunit.xml'],
      configFiles: ['phpunit.xml', 'phpunit.xml.dist'],
      testPatterns: ['*Test.php']
    },
    {
      name: 'RSpec',
      language: 'Ruby',
      keywords: ['rspec', 'spec_helper'],
      configFiles: ['.rspec', 'spec_helper.rb'],
      testPatterns: ['*_spec.rb']
    },
    {
      name: 'Cargo Test',
      language: 'Rust',
      keywords: ['cargo test', 'rust test'],
      configFiles: ['Cargo.toml'],
      testPatterns: ['tests/*.rs']
    },
    {
      name: 'Go Test',
      language: 'Go',
      keywords: ['go test', 'testing'],
      configFiles: ['go.mod'],
      testPatterns: ['*_test.go']
    },
    {
      name: 'JUnit',
      language: 'Java',
      keywords: ['junit', 'junit5', '@Test'],
      configFiles: ['pom.xml', 'build.gradle'],
      testPatterns: ['*Test.java', '*Tests.java']
    },
    {
      name: 'TestNG',
      language: 'Java',
      keywords: ['testng', '@Test'],
      configFiles: ['testng.xml', 'pom.xml'],
      testPatterns: ['*Test.java', '*Tests.java']
    },
    {
      name: 'Go Testing',
      language: 'Go',
      keywords: ['go test', 'testing.T', 'func Test'],
      configFiles: ['go.mod'],
      testPatterns: ['*_test.go']
    },
    {
      name: 'Rust Testing',
      language: 'Rust',
      keywords: ['cargo test', '#[test]', '#[cfg(test)]'],
      configFiles: ['Cargo.toml'],
      testPatterns: ['tests/*.rs', 'src/**/tests.rs']
    }
  ];

  private coverageTools = [
    { name: 'Istanbul/nyc', type: 'coverage', keywords: ['nyc', 'istanbul'] },
    { name: 'Jest Coverage', type: 'coverage', keywords: ['jest --coverage', 'collectCoverage'] },
    { name: 'Codecov', type: 'coverage', keywords: ['codecov'] },
    { name: 'Coveralls', type: 'coverage', keywords: ['coveralls'] },
    { name: 'JaCoCo', type: 'coverage', keywords: ['jacoco'] },
    { name: 'SimpleCov', type: 'coverage', keywords: ['simplecov'] },
    { name: 'Chai', type: 'assertion', keywords: ['chai', 'expect(', 'should'] },
    { name: 'Sinon', type: 'mocking', keywords: ['sinon', 'stub', 'spy'] },
    { name: 'Karma', type: 'runner', keywords: ['karma', 'karma.conf'] }
  ];

  async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult<TestingInfo>> {
    try {
      const testingInfo = this.extractTestingInfo(ast, content);
      const confidence = this.calculateConfidence(testingInfo);
      
      return {
        success: true,
        data: testingInfo,
        confidence
      };
    } catch (error) {
      // Return empty testing info with error logged but still successful
      const emptyTestingInfo: TestingInfo = {
        frameworks: [],
        tools: [],
        configFiles: [],
        confidence: 0,
        testFiles: [],
        coverage: { enabled: false, tools: [] },
        commands: []
      };
      
      return {
        success: true,
        data: emptyTestingInfo,
        confidence: 0
      };
    }
  }

  private extractTestingInfo(ast: MarkdownAST, content: string): TestingInfo {
    const testingInfo: TestingInfo = {
      frameworks: [],
      tools: [],
      configFiles: [],
      confidence: 0,
      testFiles: [],
      coverage: { enabled: false, tools: [] },
      commands: []
    };

    // Detect testing frameworks
    this.detectFrameworks(content, testingInfo);
    
    // Extract test files mentioned
    this.extractTestFiles(content, testingInfo);
    
    // Detect coverage tools
    this.detectCoverage(content, testingInfo);
    
    // Extract test commands
    this.extractTestCommands(ast, content, testingInfo);

    return testingInfo;
  }

  private detectFrameworks(content: string, testingInfo: TestingInfo): void {
    const lowerContent = content.toLowerCase();
    
    for (const framework of this.testingFrameworks) {
      let confidence = 0;
      const foundKeywords: string[] = [];
      const foundConfigFiles: string[] = [];
      const foundTestPatterns: string[] = [];
      
      // Check keywords with higher confidence
      for (const keyword of framework.keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          confidence += 0.8; // Increased for stronger detection
          foundKeywords.push(keyword);
        }
      }
      
      // Check config files with higher confidence
      for (const configFile of framework.configFiles) {
        if (content.includes(configFile)) {
          confidence += 0.9; // Increased for stronger detection
          foundConfigFiles.push(configFile);
          testingInfo.configFiles.push(configFile);
        }
      }
      
      // Check test patterns with higher confidence
      for (const pattern of framework.testPatterns) {
        const regex = new RegExp(pattern.replace('*', '[^\\s]*'), 'gi');
        if (regex.test(content)) {
          confidence += 0.7; // Increased for stronger detection
          foundTestPatterns.push(pattern);
        }
      }
      
      // Lower the threshold for detection
      if (confidence > 0.3) {
        testingInfo.frameworks.push({
          name: framework.name,
          language: framework.language || 'unknown',
          confidence: Math.min(confidence, 1.0),
          configFiles: foundConfigFiles,
          testPatterns: foundTestPatterns
        });
      }
    }
    
    // Sort by confidence
    testingInfo.frameworks.sort((a, b) => b.confidence - a.confidence);
  }

  private extractTestFiles(content: string, testingInfo: TestingInfo): void {
    const testFilePatterns = [
      /\b[\w-]+\.test\.\w+/g,
      /\b[\w-]+\.spec\.\w+/g,
      /\btest_[\w-]+\.\w+/g,
      /\b[\w-]+_test\.\w+/g,
      /\b[\w-]+Test\.\w+/g
    ];
    
    for (const pattern of testFilePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const testFile = match[0];
        if (!testingInfo.testFiles.includes(testFile)) {
          testingInfo.testFiles.push(testFile);
        }
      }
      pattern.lastIndex = 0; // Reset regex state
    }
  }

  private detectCoverage(content: string, testingInfo: TestingInfo): void {
    const lowerContent = content.toLowerCase();
    const foundTools: string[] = [];
    let threshold: number | undefined;
    
    // Detect coverage and testing tools
    for (const tool of this.coverageTools) {
      for (const keyword of tool.keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          foundTools.push(tool.name);
          testingInfo.tools.push({
            name: tool.name,
            type: tool.type as TestingToolType,
            confidence: 0.8
          });
          break; // Only add once per tool
        }
      }
    }
    
    // Look for coverage threshold
    const thresholdMatch = content.match(/coverage.*?(\d+)%/i);
    if (thresholdMatch && thresholdMatch[1]) {
      threshold = parseInt(thresholdMatch[1]);
    }
    
    testingInfo.coverage = {
      enabled: foundTools.length > 0,
      tools: foundTools,
      ...(threshold !== undefined && { threshold })
    };
  }

  private extractTestCommands(ast: MarkdownAST, content: string, testingInfo: TestingInfo): void {
    const testCommandPatterns = [
      /npm test/gi,
      /yarn test/gi,
      /npm run test/gi,
      /yarn run test/gi,
      /pytest/gi,
      /python -m pytest/gi,
      /cargo test/gi,
      /go test/gi,
      /mvn test/gi,
      /gradle test/gi,
      /phpunit/gi,
      /rspec/gi
    ];
    
    // Extract from code blocks
    this.traverseAST(ast, (node) => {
      if (node.type === 'code') {
        const codeValue = MarkdownUtils.getCodeValue(node);
        if (codeValue) {
          this.extractCommandsFromText(codeValue, testCommandPatterns, testingInfo, 'code block');
        }
      }
    });
    
    // Extract from inline code and text
    this.extractCommandsFromText(content, testCommandPatterns, testingInfo, 'content');
  }

  private extractCommandsFromText(
    text: string,
    patterns: RegExp[],
    testingInfo: TestingInfo,
    context: string
  ): void {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const command = match[0];
        const exists = testingInfo.commands.some(cmd => cmd.command === command);
        
        if (!exists) {
          testingInfo.commands.push({
            command,
            description: this.generateTestCommandDescription(command),
            context,
            confidence: 0.8
          });
        }
      }
      pattern.lastIndex = 0; // Reset regex state
    }
  }

  private generateTestCommandDescription(command: string): string {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('npm') || lowerCommand.includes('yarn')) {
      return 'Run JavaScript/TypeScript tests';
    }
    if (lowerCommand.includes('pytest')) {
      return 'Run Python tests with pytest';
    }
    if (lowerCommand.includes('cargo test')) {
      return 'Run Rust tests';
    }
    if (lowerCommand.includes('go test')) {
      return 'Run Go tests';
    }
    if (lowerCommand.includes('mvn test')) {
      return 'Run Java tests with Maven';
    }
    if (lowerCommand.includes('gradle test')) {
      return 'Run Java tests with Gradle';
    }
    if (lowerCommand.includes('phpunit')) {
      return 'Run PHP tests with PHPUnit';
    }
    if (lowerCommand.includes('rspec')) {
      return 'Run Ruby tests with RSpec';
    }
    
    return 'Run tests';
  }

  private traverseAST(node: MarkdownAST | MarkdownNode, callback: (node: MarkdownNode) => void): void {
    if ('children' in node && node.children) {
      for (const child of node.children) {
        callback(child);
        this.traverseAST(child, callback);
      }
    }
  }

  private calculateConfidence(testingInfo: TestingInfo): number {
    let confidence = 0;
    
    // Frameworks detected
    if (testingInfo.frameworks.length > 0) {
      const maxFrameworkConfidence = Math.max(...testingInfo.frameworks.map(f => f.confidence));
      confidence += maxFrameworkConfidence * 0.4;
    }
    
    // Test files found
    confidence += Math.min(testingInfo.testFiles.length * 0.1, 0.3);
    
    // Coverage tools detected
    if (testingInfo.coverage.enabled) {
      confidence += 0.2;
    }
    
    // Test commands found
    confidence += Math.min(testingInfo.commands.length * 0.05, 0.1);
    
    return Math.min(confidence, 1.0);
  }
}