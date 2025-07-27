import { AnalyzerResult, TestingInfo } from '../types';
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
      keywords: ['jest', 'jest.config'],
      configFiles: ['jest.config.js', 'jest.config.json'],
      testPatterns: ['*.test.js', '*.spec.js', '__tests__']
    },
    {
      name: 'Mocha',
      language: 'JavaScript',
      keywords: ['mocha', 'mocha.opts'],
      configFiles: ['.mocharc.json', 'mocha.opts'],
      testPatterns: ['*.test.js', '*.spec.js']
    },
    {
      name: 'Pytest',
      language: 'Python',
      keywords: ['pytest', 'pytest.ini'],
      configFiles: ['pytest.ini', 'pyproject.toml'],
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
      keywords: ['junit', 'junit5'],
      configFiles: ['pom.xml', 'build.gradle'],
      testPatterns: ['*Test.java']
    }
  ];

  private coverageTools = [
    'coverage',
    'nyc',
    'istanbul',
    'codecov',
    'coveralls',
    'jacoco',
    'simplecov'
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
      return {
        success: false,
        confidence: 0,
        errors: [{
          code: 'TESTING_DETECTION_ERROR',
          message: `Failed to detect testing info: ${(error as Error).message}`,
          component: 'TestingDetector',
          severity: 'error',
          category: 'analysis',
          isRecoverable: true
        }]
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
      
      // Check keywords
      for (const keyword of framework.keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          confidence += 0.3;
          foundKeywords.push(keyword);
        }
      }
      
      // Check config files
      for (const configFile of framework.configFiles) {
        if (content.includes(configFile)) {
          confidence += 0.4;
          foundConfigFiles.push(configFile);
        }
      }
      
      // Check test patterns
      for (const pattern of framework.testPatterns) {
        const regex = new RegExp(pattern.replace('*', '[^\\s]*'), 'gi');
        if (regex.test(content)) {
          confidence += 0.2;
          foundTestPatterns.push(pattern);
        }
      }
      
      if (confidence > 0) {
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
    
    for (const tool of this.coverageTools) {
      if (lowerContent.includes(tool)) {
        foundTools.push(tool);
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