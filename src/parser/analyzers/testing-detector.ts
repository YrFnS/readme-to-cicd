import { AnalyzerResult, TestingInfo, TestingToolType } from '../types';
import { MarkdownAST, MarkdownNode, MarkdownUtils } from '../../shared/markdown-parser';
import { Analyzer } from './registry';
import { BaseAnalyzer } from './base-analyzer';

/**
 * Detects testing frameworks and configurations from README content
 */
export class TestingDetector extends BaseAnalyzer<TestingInfo> {
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

  async analyze(ast: MarkdownAST, content: string, context?: import('../../shared/types/analysis-context').AnalysisContext): Promise<AnalyzerResult<TestingInfo>> {
    try {
      // Set analysis context if provided
      if (context) {
        this.setAnalysisContext(context);
      }

      const testingInfo = this.extractTestingInfo(ast, content);
      const confidence = this.calculateTestingConfidence(testingInfo);
      
      // Share testing information with other analyzers
      if (context) {
        this.updateSharedData('testingInfo', testingInfo);
        this.updateSharedData('testingFrameworks', testingInfo.frameworks);
        
        // Validate data flow to potential consumers
        this.validateDataFlow('YamlGenerator', ['testingInfo', 'testingFrameworks']);
      }
      
      return {
        success: true,
        data: testingInfo,
        confidence,
        sources: ['content-analysis']
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
        confidence: 0,
        sources: []
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
    
    // Detect testing tools
    this.detectTestingTools(content, testingInfo);
    
    // Extract test files mentioned
    this.extractTestFiles(content, testingInfo);
    
    // Detect coverage tools
    this.detectCoverage(content, testingInfo);
    
    // Extract test commands
    this.extractTestCommands(ast, content, testingInfo);

    // Calculate and set confidence on the testingInfo object
    testingInfo.confidence = this.calculateTestingConfidence(testingInfo);

    return testingInfo;
  }

  private detectFrameworks(content: string, testingInfo: TestingInfo): void {
    // Detect frameworks by language
    const frameworks: any[] = [];
    frameworks.push(...this.detectJavaScriptFrameworks(content));
    frameworks.push(...this.detectPythonFrameworks(content));
    frameworks.push(...this.detectJavaFrameworks(content));
    frameworks.push(...this.detectOtherFrameworks(content));

    // Add detected frameworks to testingInfo
    testingInfo.frameworks.push(...frameworks);

    // Extract config files from detected frameworks
    for (const framework of frameworks) {
      if (framework.configFiles) {
        testingInfo.configFiles.push(...framework.configFiles);
      }
    }

    // Sort by confidence
    testingInfo.frameworks.sort((a, b) => b.confidence - a.confidence);
  }

  private detectJavaScriptFrameworks(content: string): any[] {
    const frameworks: any[] = [];
    const lowerContent = content.toLowerCase();

    // Jest detection
    if (lowerContent.includes('jest') || lowerContent.includes('jest.config') || 
        lowerContent.includes('setupTests') || lowerContent.includes('@testing-library/jest-dom')) {
      frameworks.push({
        name: 'Jest',
        language: 'JavaScript',
        confidence: 0.9,
        version: this.extractVersion(content, 'jest'),
        configFiles: ['jest.config.js', 'jest.config.ts', 'package.json'],
        testPatterns: ['**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts']
      });
    }

    // Mocha detection
    if (lowerContent.includes('mocha') || lowerContent.includes('.mocharc')) {
      frameworks.push({
        name: 'Mocha',
        language: 'JavaScript',
        confidence: 0.8,
        version: this.extractVersion(content, 'mocha'),
        configFiles: ['.mocharc.json', '.mocharc.js', 'mocha.opts'],
        testPatterns: ['test/**/*.js', 'spec/**/*.js']
      });
    }

    // Vitest detection
    if (lowerContent.includes('vitest') || lowerContent.includes('vitest.config')) {
      frameworks.push({
        name: 'Vitest',
        language: 'JavaScript',
        confidence: 0.8,
        version: this.extractVersion(content, 'vitest'),
        configFiles: ['vitest.config.ts', 'vitest.config.js'],
        testPatterns: ['**/*.test.ts', '**/*.spec.ts']
      });
    }

    // Cypress detection
    if (lowerContent.includes('cypress') || lowerContent.includes('cypress.config')) {
      frameworks.push({
        name: 'Cypress',
        language: 'JavaScript',
        confidence: 0.8,
        version: this.extractVersion(content, 'cypress'),
        configFiles: ['cypress.config.js', 'cypress.config.ts'],
        testPatterns: ['cypress/e2e/**/*.cy.js', 'cypress/integration/**/*.spec.js']
      });
    }

    // Playwright detection
    if (lowerContent.includes('playwright') || lowerContent.includes('playwright.config')) {
      frameworks.push({
        name: 'Playwright',
        language: 'JavaScript',
        confidence: 0.8,
        version: this.extractVersion(content, 'playwright'),
        configFiles: ['playwright.config.ts', 'playwright.config.js'],
        testPatterns: ['tests/**/*.spec.ts', 'e2e/**/*.spec.ts']
      });
    }

    return frameworks;
  }

  private detectPythonFrameworks(content: string): any[] {
    const frameworks: any[] = [];
    const lowerContent = content.toLowerCase();

    // pytest detection
    if (lowerContent.includes('pytest') || lowerContent.includes('pytest.ini') || 
        lowerContent.includes('conftest.py')) {
      frameworks.push({
        name: 'pytest',
        language: 'Python',
        confidence: 0.9,
        version: this.extractVersion(content, 'pytest'),
        configFiles: ['pytest.ini', 'pyproject.toml', 'conftest.py'],
        testPatterns: ['test_*.py', '*_test.py', 'tests/**/*.py']
      });
    }

    // unittest detection
    if (lowerContent.includes('unittest') || lowerContent.includes('import unittest')) {
      frameworks.push({
        name: 'unittest',
        language: 'Python',
        confidence: 0.7,
        version: 'built-in',
        configFiles: [],
        testPatterns: ['test_*.py', '*_test.py']
      });
    }

    return frameworks;
  }

  private detectJavaFrameworks(content: string): any[] {
    const frameworks: any[] = [];
    const lowerContent = content.toLowerCase();

    // JUnit detection
    if (lowerContent.includes('junit') || lowerContent.includes('@test') || 
        lowerContent.includes('org.junit')) {
      frameworks.push({
        name: 'JUnit',
        language: 'Java',
        confidence: 0.8,
        version: this.extractVersion(content, 'junit'),
        configFiles: ['pom.xml', 'build.gradle'],
        testPatterns: ['**/*Test.java', '**/*Tests.java']
      });
    }

    // TestNG detection
    if (lowerContent.includes('testng') || lowerContent.includes('testng.xml')) {
      frameworks.push({
        name: 'TestNG',
        language: 'Java',
        confidence: 0.8,
        version: this.extractVersion(content, 'testng'),
        configFiles: ['testng.xml', 'pom.xml', 'build.gradle'],
        testPatterns: ['**/*Test.java', '**/*Tests.java']
      });
    }

    return frameworks;
  }

  private detectOtherFrameworks(content: string): any[] {
    const frameworks: any[] = [];
    const lowerContent = content.toLowerCase();

    // RSpec (Ruby) detection
    if (lowerContent.includes('rspec') || lowerContent.includes('.rspec')) {
      frameworks.push({
        name: 'RSpec',
        language: 'Ruby',
        confidence: 0.8,
        version: this.extractVersion(content, 'rspec'),
        configFiles: ['.rspec', 'spec_helper.rb'],
        testPatterns: ['spec/**/*_spec.rb']
      });
    }

    // Go testing detection
    if (lowerContent.includes('go test') || lowerContent.includes('testing.T') || 
        lowerContent.includes('func Test')) {
      frameworks.push({
        name: 'Go Testing',
        language: 'Go',
        confidence: 0.8,
        version: 'built-in',
        configFiles: [],
        testPatterns: ['*_test.go']
      });
    }

    // Rust testing detection
    if (lowerContent.includes('cargo test') || lowerContent.includes('#[test]') || 
        lowerContent.includes('#[cfg(test)]')) {
      frameworks.push({
        name: 'Rust Testing',
        language: 'Rust',
        confidence: 0.8,
        version: 'built-in',
        configFiles: ['Cargo.toml'],
        testPatterns: ['src/**/*.rs', 'tests/**/*.rs']
      });
    }

    return frameworks;
  }

  private extractVersion(content: string, packageName: string): string | undefined {
    // Simple version extraction from package.json-like content
    const versionRegex = new RegExp(`"${packageName}"\\s*:\\s*"([^"]+)"`, 'i');
    const match = content.match(versionRegex);
    return match ? match[1] : undefined;
  }

  private detectTestingTools(content: string, testingInfo: TestingInfo): void {
    const tools: any[] = [];
    const lowerContent = content.toLowerCase();

    // Coverage tools
    if (lowerContent.includes('nyc') || lowerContent.includes('istanbul')) {
      tools.push({
        name: 'Istanbul/nyc',
        type: 'coverage',
        confidence: 0.8,
        configFiles: ['.nycrc', '.nycrc.json']
      });
    }

    if (lowerContent.includes('jest') && lowerContent.includes('coverage')) {
      tools.push({
        name: 'Jest Coverage',
        type: 'coverage',
        confidence: 0.7,
        configFiles: ['jest.config.js']
      });
    }

    if (lowerContent.includes('c8') || lowerContent.includes('c8 ')) {
      tools.push({
        name: 'c8',
        type: 'coverage',
        confidence: 0.8,
        configFiles: ['.c8rc.json']
      });
    }

    if (lowerContent.includes('codecov')) {
      tools.push({
        name: 'Codecov',
        type: 'coverage',
        confidence: 0.8,
        configFiles: []
      });
    }

    if (lowerContent.includes('.coveragerc')) {
      tools.push({
        name: 'Python Coverage',
        type: 'coverage',
        confidence: 0.7,
        configFiles: ['.coveragerc']
      });
    }

    // Mocking libraries
    if (lowerContent.includes('sinon')) {
      tools.push({
        name: 'Sinon',
        type: 'mock',
        confidence: 0.8,
        configFiles: []
      });
    }

    if (lowerContent.includes('jest.mock') || lowerContent.includes('jest.fn')) {
      tools.push({
        name: 'Jest Mocks',
        type: 'mock',
        confidence: 0.7,
        configFiles: []
      });
    }

    // Assertion libraries
    if (lowerContent.includes('chai')) {
      tools.push({
        name: 'Chai',
        type: 'assertion',
        confidence: 0.8,
        configFiles: []
      });
    }

    if (lowerContent.includes('expect') && lowerContent.includes('jest')) {
      tools.push({
        name: 'Jest Assertions',
        type: 'assertion',
        confidence: 0.7,
        configFiles: []
      });
    }

    // Test runners
    if (lowerContent.includes('karma')) {
      tools.push({
        name: 'Karma',
        type: 'runner',
        confidence: 0.8,
        configFiles: ['karma.conf.js', 'karma.config.js']
      });
    }

    if (lowerContent.includes('protractor')) {
      tools.push({
        name: 'Protractor',
        type: 'runner',
        confidence: 0.8,
        configFiles: ['protractor.conf.js']
      });
    }

    // Add detected tools to testingInfo
    testingInfo.tools.push(...tools);

    // Add config files from tools to main config files list
    for (const tool of tools) {
      if (tool.configFiles && tool.configFiles.length > 0) {
        testingInfo.configFiles.push(...tool.configFiles);
      }
    }
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

  private calculateTestingConfidence(testingInfo: TestingInfo): number {
    let confidence = 0;
    
    // Frameworks detected
    if (testingInfo.frameworks.length > 0) {
      const maxFrameworkConfidence = Math.max(...testingInfo.frameworks.map(f => f.confidence));
      confidence += maxFrameworkConfidence * 0.4;
    }
    
    // Tools detected
    if (testingInfo.tools.length > 0) {
      confidence += Math.min(testingInfo.tools.length * 0.15, 0.3);
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