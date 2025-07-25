/**
 * TestingDetector - Analyzes README content to detect testing frameworks and tools
 */

import { BaseAnalyzer } from './base-analyzer';
import { AnalysisResult, TestingInfo, TestingFramework, TestingTool, TestingToolType, MarkdownAST } from '../types';

/**
 * Testing framework detection patterns
 */
interface TestingFrameworkPattern {
  name: string;
  language: string;
  patterns: RegExp[];
  confidence: number;
  configFiles?: string[];
  keywords?: string[];
}

/**
 * Testing tool detection patterns
 */
interface TestingToolPattern {
  name: string;
  type: TestingToolType;
  patterns: RegExp[];
  confidence: number;
  keywords?: string[];
  configFiles?: string[];
}

/**
 * TestingDetector class implementing ContentAnalyzer interface
 * Detects testing frameworks, tools, and configuration files from README content
 */
export class TestingDetector extends BaseAnalyzer {
  readonly name = 'TestingDetector';

  // Testing framework patterns for different languages
  private readonly frameworkPatterns: TestingFrameworkPattern[] = [
    // JavaScript/TypeScript frameworks
    {
      name: 'Jest',
      language: 'JavaScript',
      patterns: [
        /\bjest\b/gi,
        /jest\.config\.(js|ts|json)/gi,
        /npm\s+run\s+test.*jest/gi,
        /yarn\s+test.*jest/gi,
        /@testing-library\/jest/gi
      ],
      confidence: 0.9,
      configFiles: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
      keywords: ['jest', 'testing-library']
    },
    {
      name: 'Mocha',
      language: 'JavaScript',
      patterns: [
        /\bmocha\b/gi,
        /\.mocharc\.(js|json|yaml|yml)/gi,
        /mocha\.opts/gi,
        /npm\s+run\s+test.*mocha/gi,
        /describe\s*\(/gi,
        /it\s*\(/gi
      ],
      confidence: 0.8,
      configFiles: ['.mocharc.js', '.mocharc.json', '.mocharc.yaml', 'mocha.opts'],
      keywords: ['mocha', 'describe', 'it']
    },
    {
      name: 'Jasmine',
      language: 'JavaScript',
      patterns: [
        /\bjasmine\b/gi,
        /jasmine\.json/gi,
        /npm\s+run\s+test.*jasmine/gi,
        /describe\s*\(/gi,
        /it\s*\(/gi
      ],
      confidence: 0.8,
      configFiles: ['jasmine.json'],
      keywords: ['jasmine']
    },
    {
      name: 'Vitest',
      language: 'JavaScript',
      patterns: [
        /\bvitest\b/gi,
        /vitest\.config\.(js|ts)/gi,
        /npm\s+run\s+test.*vitest/gi,
        /yarn\s+test.*vitest/gi
      ],
      confidence: 0.9,
      configFiles: ['vitest.config.js', 'vitest.config.ts'],
      keywords: ['vitest']
    },
    {
      name: 'Cypress',
      language: 'JavaScript',
      patterns: [
        /\bcypress\b/gi,
        /cypress\.json/gi,
        /cypress\.config\.(js|ts)/gi,
        /npm\s+run\s+cypress/gi,
        /e2e.*cypress/gi
      ],
      confidence: 0.9,
      configFiles: ['cypress.json', 'cypress.config.js', 'cypress.config.ts'],
      keywords: ['cypress', 'e2e']
    },
    {
      name: 'Playwright',
      language: 'JavaScript',
      patterns: [
        /\bplaywright\b/gi,
        /playwright\.config\.(js|ts)/gi,
        /npm\s+run\s+test.*playwright/gi,
        /@playwright\/test/gi
      ],
      confidence: 0.9,
      configFiles: ['playwright.config.js', 'playwright.config.ts'],
      keywords: ['playwright']
    },

    // Python frameworks
    {
      name: 'pytest',
      language: 'Python',
      patterns: [
        /\bpytest\b/gi,
        /pytest\.ini/gi,
        /pyproject\.toml.*pytest/gi,
        /python\s+-m\s+pytest/gi,
        /pip\s+install.*pytest/gi
      ],
      confidence: 0.9,
      configFiles: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
      keywords: ['pytest']
    },
    {
      name: 'unittest',
      language: 'Python',
      patterns: [
        /\bunittest\b/gi,
        /python\s+-m\s+unittest/gi,
        /import\s+unittest/gi,
        /from\s+unittest/gi
      ],
      confidence: 0.8,
      keywords: ['unittest']
    },
    {
      name: 'nose2',
      language: 'Python',
      patterns: [
        /\bnose2\b/gi,
        /nose2\.cfg/gi,
        /python\s+-m\s+nose2/gi
      ],
      confidence: 0.8,
      configFiles: ['nose2.cfg'],
      keywords: ['nose2']
    },

    // Java frameworks
    {
      name: 'JUnit',
      language: 'Java',
      patterns: [
        /\bjunit\b/gi,
        /junit\.jupiter/gi,
        /junit\.vintage/gi,
        /@Test/gi,
        /mvn\s+test.*junit/gi,
        /gradle.*junit/gi
      ],
      confidence: 0.9,
      keywords: ['junit', '@Test']
    },
    {
      name: 'TestNG',
      language: 'Java',
      patterns: [
        /\btestng\b/gi,
        /testng\.xml/gi,
        /@Test.*testng/gi,
        /mvn\s+test.*testng/gi
      ],
      confidence: 0.8,
      configFiles: ['testng.xml'],
      keywords: ['testng']
    },

    // C# frameworks
    {
      name: 'NUnit',
      language: 'C#',
      patterns: [
        /\bnunit\b/gi,
        /NUnit\.Framework/gi,
        /@Test.*nunit/gi,
        /dotnet\s+test.*nunit/gi
      ],
      confidence: 0.9,
      keywords: ['nunit']
    },
    {
      name: 'xUnit',
      language: 'C#',
      patterns: [
        /\bxunit\b/gi,
        /Xunit\.Framework/gi,
        /dotnet\s+test.*xunit/gi,
        /@Fact/gi,
        /@Theory/gi
      ],
      confidence: 0.9,
      keywords: ['xunit', '@Fact', '@Theory']
    },
    {
      name: 'MSTest',
      language: 'C#',
      patterns: [
        /\bmstest\b/gi,
        /Microsoft\.VisualStudio\.TestTools/gi,
        /@TestMethod/gi,
        /dotnet\s+test.*mstest/gi
      ],
      confidence: 0.8,
      keywords: ['mstest', '@TestMethod']
    },

    // Ruby frameworks
    {
      name: 'RSpec',
      language: 'Ruby',
      patterns: [
        /\brspec\b/gi,
        /\.rspec/gi,
        /spec_helper\.rb/gi,
        /bundle\s+exec\s+rspec/gi,
        /describe\s+.*do/gi
      ],
      confidence: 0.9,
      configFiles: ['.rspec', 'spec_helper.rb'],
      keywords: ['rspec', 'describe']
    },
    {
      name: 'Minitest',
      language: 'Ruby',
      patterns: [
        /\bminitest\b/gi,
        /require.*minitest/gi,
        /rake\s+test/gi,
        /test_helper\.rb/gi
      ],
      confidence: 0.8,
      configFiles: ['test_helper.rb'],
      keywords: ['minitest']
    },

    // Go frameworks
    {
      name: 'Go Testing',
      language: 'Go',
      patterns: [
        /go\s+test/gi,
        /testing\.T/gi,
        /func\s+Test\w+/gi,
        /\*testing\.T/gi
      ],
      confidence: 0.9,
      keywords: ['go test', 'testing.T']
    },
    {
      name: 'Testify',
      language: 'Go',
      patterns: [
        /\btestify\b/gi,
        /github\.com\/stretchr\/testify/gi,
        /assert\./gi,
        /suite\./gi
      ],
      confidence: 0.8,
      keywords: ['testify', 'assert']
    },

    // Rust frameworks
    {
      name: 'Rust Testing',
      language: 'Rust',
      patterns: [
        /cargo\s+test/gi,
        /#\[test\]/gi,
        /#\[cfg\(test\)\]/gi,
        /mod\s+tests/gi
      ],
      confidence: 0.9,
      keywords: ['cargo test', '#[test]']
    },

    // PHP frameworks
    {
      name: 'PHPUnit',
      language: 'PHP',
      patterns: [
        /\bphpunit\b/gi,
        /phpunit\.xml/gi,
        /composer.*phpunit/gi,
        /extends\s+TestCase/gi
      ],
      confidence: 0.9,
      configFiles: ['phpunit.xml', 'phpunit.xml.dist'],
      keywords: ['phpunit']
    }
  ];

  // Testing tool patterns
  private readonly toolPatterns: TestingToolPattern[] = [
    // Coverage tools
    {
      name: 'Istanbul/nyc',
      type: 'coverage',
      patterns: [
        /\bnyc\b/gi,
        /\bistanbul\b/gi,
        /npm\s+run.*coverage/gi,
        /\.nyc_output/gi
      ],
      confidence: 0.8,
      keywords: ['nyc', 'istanbul', 'coverage']
    },
    {
      name: 'Jest Coverage',
      type: 'coverage',
      patterns: [
        /jest.*coverage/gi,
        /--coverage/gi,
        /collectCoverage/gi
      ],
      confidence: 0.8,
      keywords: ['jest coverage']
    },
    {
      name: 'Coverage.py',
      type: 'coverage',
      patterns: [
        /\bcoverage\b.*py/gi,
        /python\s+-m\s+coverage/gi,
        /pip\s+install.*coverage/gi,
        /\.coveragerc/gi
      ],
      confidence: 0.8,
      configFiles: ['.coveragerc'],
      keywords: ['coverage.py']
    },
    {
      name: 'Codecov',
      type: 'coverage',
      patterns: [
        /\bcodecov\b/gi,
        /codecov\.io/gi,
        /codecov\.yml/gi,
        /upload.*codecov/gi
      ],
      confidence: 0.9,
      configFiles: ['codecov.yml', '.codecov.yml'],
      keywords: ['codecov']
    },
    {
      name: 'Coveralls',
      type: 'coverage',
      patterns: [
        /\bcoveralls\b/gi,
        /coveralls\.io/gi,
        /\.coveralls\.yml/gi
      ],
      confidence: 0.8,
      configFiles: ['.coveralls.yml'],
      keywords: ['coveralls']
    },

    // Test runners
    {
      name: 'Karma',
      type: 'runner',
      patterns: [
        /\bkarma\b/gi,
        /karma\.conf\.(js|ts)/gi,
        /npm\s+run.*karma/gi
      ],
      confidence: 0.8,
      configFiles: ['karma.conf.js', 'karma.conf.ts'],
      keywords: ['karma']
    },
    {
      name: 'Protractor',
      type: 'runner',
      patterns: [
        /\bprotractor\b/gi,
        /protractor\.conf\.(js|ts)/gi,
        /npm\s+run.*protractor/gi
      ],
      confidence: 0.8,
      configFiles: ['protractor.conf.js', 'protractor.conf.ts'],
      keywords: ['protractor']
    },

    // Assertion libraries
    {
      name: 'Chai',
      type: 'assertion',
      patterns: [
        /\bchai\b/gi,
        /expect\(.*\)\.to\./gi,
        /should\./gi,
        /assert\./gi
      ],
      confidence: 0.7,
      keywords: ['chai', 'expect', 'should']
    },
    {
      name: 'Sinon',
      type: 'mock',
      patterns: [
        /\bsinon\b/gi,
        /sinon\.stub/gi,
        /sinon\.spy/gi,
        /sinon\.mock/gi
      ],
      confidence: 0.8,
      keywords: ['sinon', 'stub', 'spy', 'mock']
    },

    // Reporters
    {
      name: 'Mochawesome',
      type: 'reporter',
      patterns: [
        /\bmochawesome\b/gi,
        /--reporter.*mochawesome/gi
      ],
      confidence: 0.7,
      keywords: ['mochawesome']
    },
    {
      name: 'Allure',
      type: 'reporter',
      patterns: [
        /\ballure\b/gi,
        /allure-results/gi,
        /allure-report/gi
      ],
      confidence: 0.8,
      keywords: ['allure']
    }
  ];

  /**
   * Analyze markdown content to detect testing frameworks and tools
   */
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    try {
      const frameworks: TestingFramework[] = [];
      const tools: TestingTool[] = [];
      const configFiles: string[] = [];

      // 1. Detect testing frameworks
      this.detectFrameworks(ast, rawContent, frameworks);

      // 2. Detect testing tools
      this.detectTools(rawContent, tools);

      // 3. Detect configuration files
      this.detectConfigFiles(rawContent, configFiles);

      // 4. Remove duplicates and sort by confidence
      this.deduplicateAndSort(frameworks, tools, configFiles);

      // 5. Calculate overall confidence
      const confidence = this.calculateOverallConfidence(frameworks, tools, configFiles);

      const testingInfo: TestingInfo = {
        frameworks,
        tools,
        configFiles,
        confidence
      };

      return this.createResult(
        testingInfo,
        confidence,
        this.extractSources(frameworks, tools)
      );

    } catch (error) {
      const parseError = this.createError(
        'TESTING_DETECTION_ERROR',
        `Failed to detect testing frameworks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : error }
      );

      return this.createResult({
        frameworks: [],
        tools: [],
        configFiles: [],
        confidence: 0
      }, 0, [], [parseError]);
    }
  }

  /**
   * Detect testing frameworks from content
   */
  private detectFrameworks(ast: MarkdownAST, content: string, frameworks: TestingFramework[]): void {
    for (const pattern of this.frameworkPatterns) {
      let matchCount = 0;
      let highestConfidence = 0;

      // Check patterns against content
      for (const regex of pattern.patterns) {
        const matches = content.match(regex);
        if (matches) {
          matchCount += matches.length;
          highestConfidence = Math.max(highestConfidence, pattern.confidence);
        }
      }

      // Check for code blocks with specific language
      const codeBlocks = ast.filter(token => token.type === 'code');
      for (const block of codeBlocks) {
        const codeToken = block as any;
        const codeContent = codeToken.text || '';
        
        for (const regex of pattern.patterns) {
          const matches = codeContent.match(regex);
          if (matches) {
            matchCount += matches.length * 1.2; // Boost for code block matches
            highestConfidence = Math.max(highestConfidence, pattern.confidence * 1.1);
          }
        }
      }

      if (matchCount > 0) {
        // Calculate confidence based on match count and pattern confidence
        const confidence = Math.min(
          highestConfidence * Math.min(matchCount / 3, 1.0),
          1.0
        );

        const framework: TestingFramework = {
          name: pattern.name,
          language: pattern.language,
          confidence
        };

        // Add config files if detected
        if (pattern.configFiles) {
          const detectedConfigFiles = pattern.configFiles.filter(file => 
            content.toLowerCase().includes(file.toLowerCase())
          );
          if (detectedConfigFiles.length > 0) {
            framework.configFiles = detectedConfigFiles;
          }
        }

        frameworks.push(framework);
      }
    }
  }

  /**
   * Detect testing tools from content
   */
  private detectTools(content: string, tools: TestingTool[]): void {
    for (const pattern of this.toolPatterns) {
      let matchCount = 0;

      for (const regex of pattern.patterns) {
        const matches = content.match(regex);
        if (matches) {
          matchCount += matches.length;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(
          pattern.confidence * Math.min(matchCount / 2, 1.0),
          1.0
        );

        tools.push({
          name: pattern.name,
          type: pattern.type,
          confidence
        });
      }
    }
  }

  /**
   * Detect configuration files mentioned in content
   */
  private detectConfigFiles(content: string, configFiles: string[]): void {
    const commonConfigFiles = [
      'jest.config.js', 'jest.config.ts', 'jest.config.json',
      '.mocharc.js', '.mocharc.json', '.mocharc.yaml', 'mocha.opts',
      'jasmine.json',
      'vitest.config.js', 'vitest.config.ts',
      'cypress.json', 'cypress.config.js', 'cypress.config.ts',
      'playwright.config.js', 'playwright.config.ts',
      'pytest.ini', 'pyproject.toml', 'setup.cfg',
      'nose2.cfg',
      'testng.xml',
      '.rspec', 'spec_helper.rb', 'test_helper.rb',
      'phpunit.xml', 'phpunit.xml.dist',
      'karma.conf.js', 'karma.conf.ts',
      'protractor.conf.js', 'protractor.conf.ts',
      '.coveragerc', 'codecov.yml', '.codecov.yml', '.coveralls.yml'
    ];

    for (const configFile of commonConfigFiles) {
      // Escape special regex characters and create pattern
      const escapedFile = configFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // For files starting with dot, don't require word boundary at start
      const pattern = configFile.startsWith('.') 
        ? `${escapedFile}\\b`
        : `\\b${escapedFile}\\b`;
      const regex = new RegExp(pattern, 'gi');
      if (regex.test(content)) {
        configFiles.push(configFile);
      }
    }
  }

  /**
   * Remove duplicates and sort by confidence
   */
  private deduplicateAndSort(
    frameworks: TestingFramework[], 
    tools: TestingTool[], 
    configFiles: string[]
  ): void {
    // Deduplicate frameworks by name
    const uniqueFrameworks = new Map<string, TestingFramework>();
    for (const framework of frameworks) {
      const existing = uniqueFrameworks.get(framework.name);
      if (!existing || framework.confidence > existing.confidence) {
        uniqueFrameworks.set(framework.name, framework);
      }
    }
    frameworks.splice(0, frameworks.length, ...Array.from(uniqueFrameworks.values()));

    // Deduplicate tools by name
    const uniqueTools = new Map<string, TestingTool>();
    for (const tool of tools) {
      const existing = uniqueTools.get(tool.name);
      if (!existing || tool.confidence > existing.confidence) {
        uniqueTools.set(tool.name, tool);
      }
    }
    tools.splice(0, tools.length, ...Array.from(uniqueTools.values()));

    // Deduplicate config files
    const uniqueConfigFiles = Array.from(new Set(configFiles));
    configFiles.splice(0, configFiles.length, ...uniqueConfigFiles);

    // Sort by confidence
    frameworks.sort((a, b) => b.confidence - a.confidence);
    tools.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate overall confidence for testing detection
   */
  private calculateOverallConfidence(
    frameworks: TestingFramework[], 
    tools: TestingTool[], 
    configFiles: string[]
  ): number {
    if (frameworks.length === 0 && tools.length === 0 && configFiles.length === 0) {
      return 0;
    }

    let totalWeight = 0;
    let weightedSum = 0;

    // Weight frameworks more heavily
    for (const framework of frameworks) {
      const weight = 0.6; // 60% weight for frameworks
      totalWeight += weight;
      weightedSum += framework.confidence * weight;
    }

    // Weight tools moderately
    for (const tool of tools) {
      const weight = 0.3; // 30% weight for tools
      totalWeight += weight;
      weightedSum += tool.confidence * weight;
    }

    // Weight config files lightly
    const configWeight = configFiles.length * 0.1; // 10% weight per config file
    totalWeight += configWeight;
    weightedSum += configWeight * 0.8; // Assume 80% confidence for config files

    if (totalWeight === 0) {
      return 0;
    }

    const baseConfidence = weightedSum / totalWeight;

    // Bonus for having multiple types of evidence
    let evidenceBonus = 0;
    if (frameworks.length > 0) evidenceBonus += 0.05;
    if (tools.length > 0) evidenceBonus += 0.03;
    if (configFiles.length > 0) evidenceBonus += 0.02;

    return Math.min(baseConfidence + evidenceBonus, 1.0);
  }

  /**
   * Extract sources from detected frameworks and tools
   */
  private extractSources(frameworks: TestingFramework[], tools: TestingTool[]): string[] {
    const sources = new Set<string>();

    if (frameworks.length > 0) {
      sources.add('framework-detection');
    }
    if (tools.length > 0) {
      sources.add('tool-detection');
    }

    return Array.from(sources);
  }
}