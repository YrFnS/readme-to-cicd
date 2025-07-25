/**
 * Unit tests for TestingDetector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestingDetector } from '../../src/parser/analyzers/testing-detector';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { TestingInfo, TestingFramework, TestingTool } from '../../src/parser/types';

describe('TestingDetector', () => {
  let detector: TestingDetector;
  let markdownParser: MarkdownParser;

  beforeEach(() => {
    detector = new TestingDetector();
    markdownParser = new MarkdownParser();
  });

  describe('JavaScript/TypeScript Framework Detection', () => {
    it('should detect Jest framework', async () => {
      const content = `
# My Project

This project uses Jest for testing.

## Testing

Run tests with:

\`\`\`bash
npm test
\`\`\`

Configuration is in \`jest.config.js\`.

\`\`\`javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true
};
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0);
      
      const testingInfo = result.data as TestingInfo;
      const jestFramework = testingInfo.frameworks.find(f => f.name === 'Jest');
      
      expect(jestFramework).toBeDefined();
      expect(jestFramework!.language).toBe('JavaScript');
      expect(jestFramework!.confidence).toBeGreaterThan(0.7);
      expect(testingInfo.configFiles).toContain('jest.config.js');
    });

    it('should detect Mocha framework', async () => {
      const content = `
# Testing with Mocha

We use Mocha and Chai for testing.

\`\`\`bash
npm run test
mocha test/**/*.test.js
\`\`\`

Configuration in \`.mocharc.json\`:

\`\`\`json
{
  "reporter": "spec",
  "timeout": 5000
}
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const mochaFramework = testingInfo.frameworks.find(f => f.name === 'Mocha');
      expect(mochaFramework).toBeDefined();
      expect(mochaFramework!.language).toBe('JavaScript');
      expect(testingInfo.configFiles).toContain('.mocharc.json');
    });

    it('should detect Vitest framework', async () => {
      const content = `
# Modern Testing with Vitest

This project uses Vitest for fast unit testing.

\`\`\`bash
npm run test
vitest run
\`\`\`

See \`vitest.config.ts\` for configuration.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const vitestFramework = testingInfo.frameworks.find(f => f.name === 'Vitest');
      expect(vitestFramework).toBeDefined();
      expect(vitestFramework!.language).toBe('JavaScript');
      expect(testingInfo.configFiles).toContain('vitest.config.ts');
    });

    it('should detect Cypress for E2E testing', async () => {
      const content = `
# End-to-End Testing

We use Cypress for E2E testing.

\`\`\`bash
npm run cypress:open
npm run cypress:run
\`\`\`

Configuration is in \`cypress.config.js\`.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const cypressFramework = testingInfo.frameworks.find(f => f.name === 'Cypress');
      expect(cypressFramework).toBeDefined();
      expect(cypressFramework!.language).toBe('JavaScript');
      expect(testingInfo.configFiles).toContain('cypress.config.js');
    });

    it('should detect Playwright framework', async () => {
      const content = `
# Playwright Testing

This project uses Playwright for browser testing.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://example.com');
  expect(await page.title()).toBe('Example');
});
\`\`\`

Run with:
\`\`\`bash
npx playwright test
\`\`\`

Configuration in \`playwright.config.ts\`.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const playwrightFramework = testingInfo.frameworks.find(f => f.name === 'Playwright');
      expect(playwrightFramework).toBeDefined();
      expect(playwrightFramework!.language).toBe('JavaScript');
      expect(testingInfo.configFiles).toContain('playwright.config.ts');
    });
  });

  describe('Python Framework Detection', () => {
    it('should detect pytest framework', async () => {
      const content = `
# Python Testing

This project uses pytest for testing.

## Running Tests

\`\`\`bash
python -m pytest
pytest tests/
pip install pytest
\`\`\`

Configuration in \`pytest.ini\`:

\`\`\`ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const pytestFramework = testingInfo.frameworks.find(f => f.name === 'pytest');
      expect(pytestFramework).toBeDefined();
      expect(pytestFramework!.language).toBe('Python');
      expect(pytestFramework!.confidence).toBeGreaterThan(0.7);
      expect(testingInfo.configFiles).toContain('pytest.ini');
    });

    it('should detect unittest framework', async () => {
      const content = `
# Python Unit Testing

Using Python's built-in unittest framework.

\`\`\`python
import unittest

class TestExample(unittest.TestCase):
    def test_something(self):
        self.assertEqual(1 + 1, 2)

if __name__ == '__main__':
    unittest.main()
\`\`\`

Run tests:
\`\`\`bash
python -m unittest discover
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const unittestFramework = testingInfo.frameworks.find(f => f.name === 'unittest');
      expect(unittestFramework).toBeDefined();
      expect(unittestFramework!.language).toBe('Python');
    });
  });

  describe('Java Framework Detection', () => {
    it('should detect JUnit framework', async () => {
      const content = `
# Java Testing with JUnit

This project uses JUnit 5 for testing.

\`\`\`java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ExampleTest {
    @Test
    void testSomething() {
        assertEquals(2, 1 + 1);
    }
}
\`\`\`

Run tests:
\`\`\`bash
mvn test
gradle test
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const junitFramework = testingInfo.frameworks.find(f => f.name === 'JUnit');
      expect(junitFramework).toBeDefined();
      expect(junitFramework!.language).toBe('Java');
    });

    it('should detect TestNG framework', async () => {
      const content = `
# TestNG Testing

Using TestNG for Java testing.

\`\`\`xml
<!-- testng.xml -->
<suite name="TestSuite">
  <test name="Test">
    <classes>
      <class name="com.example.TestClass"/>
    </classes>
  </test>
</suite>
\`\`\`

Run with Maven:
\`\`\`bash
mvn test -Dtestng.xml=testng.xml
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const testngFramework = testingInfo.frameworks.find(f => f.name === 'TestNG');
      expect(testngFramework).toBeDefined();
      expect(testngFramework!.language).toBe('Java');
      expect(testingInfo.configFiles).toContain('testng.xml');
    });
  });

  describe('Other Language Framework Detection', () => {
    it('should detect RSpec for Ruby', async () => {
      const content = `
# Ruby Testing with RSpec

This Rails app uses RSpec for testing.

\`\`\`ruby
# spec/models/user_spec.rb
require 'rails_helper'

RSpec.describe User, type: :model do
  describe '#name' do
    it 'returns the full name' do
      user = User.new(first_name: 'John', last_name: 'Doe')
      expect(user.name).to eq('John Doe')
    end
  end
end
\`\`\`

Run tests:
\`\`\`bash
bundle exec rspec
rspec spec/
\`\`\`

Configuration in \`.rspec\` and \`spec_helper.rb\`.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const rspecFramework = testingInfo.frameworks.find(f => f.name === 'RSpec');
      expect(rspecFramework).toBeDefined();
      expect(rspecFramework!.language).toBe('Ruby');
      expect(testingInfo.configFiles).toContain('.rspec');
      expect(testingInfo.configFiles).toContain('spec_helper.rb');
    });

    it('should detect Go testing framework', async () => {
      const content = `
# Go Testing

Using Go's built-in testing package.

\`\`\`go
package main

import (
    "testing"
)

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    if result != 5 {
        t.Errorf("Expected 5, got %d", result)
    }
}
\`\`\`

Run tests:
\`\`\`bash
go test
go test ./...
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const goFramework = testingInfo.frameworks.find(f => f.name === 'Go Testing');
      expect(goFramework).toBeDefined();
      expect(goFramework!.language).toBe('Go');
    });

    it('should detect Rust testing framework', async () => {
      const content = `
# Rust Testing

Using Rust's built-in test framework.

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }
}
\`\`\`

Run tests:
\`\`\`bash
cargo test
cargo test --release
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const rustFramework = testingInfo.frameworks.find(f => f.name === 'Rust Testing');
      expect(rustFramework).toBeDefined();
      expect(rustFramework!.language).toBe('Rust');
    });
  });

  describe('Testing Tool Detection', () => {
    it('should detect coverage tools', async () => {
      const content = `
# Code Coverage

We use nyc for code coverage reporting.

\`\`\`bash
npm run test:coverage
nyc npm test
nyc report --reporter=html
\`\`\`

Coverage reports are uploaded to Codecov:

\`\`\`bash
codecov -f coverage/lcov.info
\`\`\`

Configuration in \`.coveragerc\` for Python coverage.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const nycTool = testingInfo.tools.find(t => t.name === 'Istanbul/nyc');
      expect(nycTool).toBeDefined();
      expect(nycTool!.type).toBe('coverage');

      const codecovTool = testingInfo.tools.find(t => t.name === 'Codecov');
      expect(codecovTool).toBeDefined();
      expect(codecovTool!.type).toBe('coverage');

      expect(testingInfo.configFiles).toContain('.coveragerc');
    });

    it('should detect assertion and mocking libraries', async () => {
      const content = `
# Testing Libraries

We use Chai for assertions and Sinon for mocking.

\`\`\`javascript
const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;

describe('Example', () => {
  it('should work with chai and sinon', () => {
    const stub = sinon.stub();
    stub.returns(42);
    
    expect(stub()).to.equal(42);
    expect(stub.calledOnce).to.be.true;
  });
});
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const chaiTool = testingInfo.tools.find(t => t.name === 'Chai');
      expect(chaiTool).toBeDefined();
      expect(chaiTool!.type).toBe('assertion');

      const sinonTool = testingInfo.tools.find(t => t.name === 'Sinon');
      expect(sinonTool).toBeDefined();
      expect(sinonTool!.type).toBe('mock');
    });

    it('should detect test runners', async () => {
      const content = `
# Test Runners

This project uses Karma for running tests in browsers.

\`\`\`javascript
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    browsers: ['Chrome'],
    files: ['test/**/*.js']
  });
};
\`\`\`

Run tests:
\`\`\`bash
karma start
npm run test:karma
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const karmaTool = testingInfo.tools.find(t => t.name === 'Karma');
      expect(karmaTool).toBeDefined();
      expect(karmaTool!.type).toBe('runner');
      expect(testingInfo.configFiles).toContain('karma.conf.js');
    });
  });

  describe('Multiple Framework Detection', () => {
    it('should detect multiple testing frameworks', async () => {
      const content = `
# Multi-Language Testing

This monorepo uses different testing frameworks:

## Frontend (JavaScript)
- Jest for unit tests
- Cypress for E2E tests

\`\`\`bash
npm run test:unit  # Jest
npm run test:e2e   # Cypress
\`\`\`

## Backend (Python)
- pytest for API tests
- unittest for unit tests

\`\`\`bash
python -m pytest api/
python -m unittest discover
\`\`\`

## Configuration Files
- \`jest.config.js\`
- \`cypress.config.js\`
- \`pytest.ini\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      expect(testingInfo.frameworks.length).toBeGreaterThanOrEqual(4);
      
      const frameworkNames = testingInfo.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Jest');
      expect(frameworkNames).toContain('Cypress');
      expect(frameworkNames).toContain('pytest');
      expect(frameworkNames).toContain('unittest');
      
      expect(testingInfo.configFiles).toContain('jest.config.js');
      expect(testingInfo.configFiles).toContain('cypress.config.js');
      expect(testingInfo.configFiles).toContain('pytest.ini');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty content gracefully', async () => {
      const content = '';

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(false);

      // Test with minimal content instead
      const minimalContent = '# Empty Project\n\nNo testing setup.';
      const minimalParseResult = markdownParser.parseContentSync(minimalContent);
      expect(minimalParseResult.success).toBe(true);

      const result = await detector.analyze(minimalParseResult.data!.ast, minimalContent);
      const testingInfo = result.data as TestingInfo;
      
      expect(testingInfo.frameworks).toHaveLength(0);
      expect(testingInfo.tools).toHaveLength(0);
      expect(testingInfo.configFiles).toHaveLength(0);
      expect(testingInfo.confidence).toBe(0);
    });

    it('should handle content with no testing information', async () => {
      const content = `
# My Project

This is a simple project with no testing setup.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      expect(testingInfo.frameworks).toHaveLength(0);
      expect(testingInfo.tools).toHaveLength(0);
      expect(testingInfo.confidence).toBe(0);
    });

    it('should deduplicate frameworks correctly', async () => {
      const content = `
# Testing with Jest

We use Jest for testing. Jest is great. Jest configuration is in jest.config.js.

\`\`\`bash
npm run test  # Uses Jest
jest --watch  # Jest in watch mode
\`\`\`

\`\`\`javascript
// Using Jest
const { test, expect } = require('@jest/globals');
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      const jestFrameworks = testingInfo.frameworks.filter(f => f.name === 'Jest');
      expect(jestFrameworks).toHaveLength(1);
      expect(jestFrameworks[0].confidence).toBeGreaterThan(0.8);
    });

    it('should calculate confidence correctly', async () => {
      const content = `
# Comprehensive Testing Setup

This project has a complete testing setup:

## Frameworks
- Jest for unit testing
- Cypress for E2E testing

## Tools
- nyc for coverage
- Codecov for coverage reporting

## Configuration
- \`jest.config.js\`
- \`cypress.config.js\`
- \`.coveragerc\`

\`\`\`bash
npm test
npm run test:coverage
npm run test:e2e
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const testingInfo = result.data as TestingInfo;
      
      expect(testingInfo.confidence).toBeGreaterThan(0.7);
      expect(testingInfo.frameworks.length).toBeGreaterThan(0);
      expect(testingInfo.tools.length).toBeGreaterThan(0);
      expect(testingInfo.configFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Analyzer Properties', () => {
    it('should have correct analyzer name', () => {
      expect(detector.name).toBe('TestingDetector');
    });

    it('should return analysis result with correct structure', async () => {
      const content = `
# Testing with Jest

\`\`\`bash
npm test
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('sources');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      const testingInfo = result.data as TestingInfo;
      expect(testingInfo).toHaveProperty('frameworks');
      expect(testingInfo).toHaveProperty('tools');
      expect(testingInfo).toHaveProperty('configFiles');
      expect(testingInfo).toHaveProperty('confidence');
    });
  });
});