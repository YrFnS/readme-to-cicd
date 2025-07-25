/**
 * Unit tests for LanguageDetector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageDetector } from '../../src/parser/analyzers/language-detector';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { LanguageInfo, LanguageSource } from '../../src/parser/types';

describe('LanguageDetector', () => {
  let detector: LanguageDetector;
  let markdownParser: MarkdownParser;

  beforeEach(() => {
    detector = new LanguageDetector();
    markdownParser = new MarkdownParser();
  });

  describe('Code Block Detection', () => {
    it('should detect JavaScript from code blocks', async () => {
      const content = `
# My Project

Here's some JavaScript code:

\`\`\`javascript
function hello() {
  console.log('Hello, world!');
}
\`\`\`

\`\`\`js
const app = require('express')();
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0);
      
      const languages = result.data as LanguageInfo[];
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      
      expect(jsLang).toBeDefined();
      expect(jsLang!.confidence).toBeGreaterThan(0.8);
      expect(jsLang!.sources).toContain('code-block');
    });

    it('should detect TypeScript from code blocks', async () => {
      const content = `
# TypeScript Project

\`\`\`typescript
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\`

\`\`\`ts
type ApiResponse<T> = {
  data: T;
  status: number;
};
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      const tsLang = languages.find(lang => lang.name === 'TypeScript');
      
      expect(tsLang).toBeDefined();
      expect(tsLang!.confidence).toBeGreaterThan(0.8);
      expect(tsLang!.sources).toContain('code-block');
    });

    it('should detect Python from code blocks', async () => {
      const content = `
# Python Project

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

class Calculator:
    def add(self, a, b):
        return a + b
\`\`\`

\`\`\`py
import numpy as np
print("Hello, Python!")
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      const pyLang = languages.find(lang => lang.name === 'Python');
      
      expect(pyLang).toBeDefined();
      expect(pyLang!.confidence).toBeGreaterThan(0.8);
      expect(pyLang!.sources).toContain('code-block');
    });

    it('should detect multiple languages from different code blocks', async () => {
      const content = `
# Multi-Language Project

JavaScript:
\`\`\`js
console.log('Hello from JS');
\`\`\`

Python:
\`\`\`python
print("Hello from Python")
\`\`\`

Go:
\`\`\`go
package main
import "fmt"
func main() {
    fmt.Println("Hello from Go")
}
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      expect(languages.length).toBeGreaterThanOrEqual(3);
      expect(languages.some(lang => lang.name === 'JavaScript')).toBe(true);
      expect(languages.some(lang => lang.name === 'Python')).toBe(true);
      expect(languages.some(lang => lang.name === 'Go')).toBe(true);
    });
  });

  describe('Pattern Matching Detection', () => {
    it('should detect JavaScript from syntax patterns', async () => {
      const content = `
# JavaScript Project

This project uses modern JavaScript features:

- Uses \`const\` and \`let\` for variable declarations
- Implements \`async/await\` for asynchronous operations
- Utilizes \`require()\` for module imports
- Logs output with \`console.log()\`

Example usage:
const app = require('express');
async function getData() {
  const response = await fetch('/api/data');
  return response.json();
}
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      
      expect(jsLang).toBeDefined();
      expect(jsLang!.sources).toContain('pattern-match');
      expect(jsLang!.confidence).toBeGreaterThan(0);
    });

    it('should detect Python from syntax patterns', async () => {
      const content = `
# Python Application

The application includes:

- Function definitions using \`def\`
- Class definitions with proper inheritance
- Import statements for external modules
- Print statements for debugging

def process_data(data):
    for item in data:
        print(f"Processing: {item}")
        
class DataProcessor:
    def __init__(self, config):
        self.config = config
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      const pyLang = languages.find(lang => lang.name === 'Python');
      
      expect(pyLang).toBeDefined();
      expect(pyLang!.sources).toContain('pattern-match');
    });

    it('should detect Java from syntax patterns', async () => {
      const content = `
# Java Application

This is a Java application with:

- Public class definitions
- Main method implementation
- System.out.println for output
- Import statements for Java libraries

public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}

import java.util.List;
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      const javaLang = languages.find(lang => lang.name === 'Java');
      
      expect(javaLang).toBeDefined();
      expect(javaLang!.sources).toContain('pattern-match');
    });
  });

  describe('Text Mention Detection', () => {
    it('should detect languages mentioned in prose text', async () => {
      const content = `
# Multi-Technology Project

This Python project integrates with a JavaScript frontend and uses Go microservices.
The backend is built with Python using Django framework, while the frontend 
utilizes modern JavaScript with React. Our microservices are written in Go 
for high performance.

We also have some Ruby scripts for automation and PHP for legacy system integration.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      const languageNames = languages.map(lang => lang.name);
      expect(languageNames).toContain('Python');
      expect(languageNames).toContain('JavaScript');
      expect(languageNames).toContain('Go');
      expect(languageNames).toContain('Ruby');
      expect(languageNames).toContain('PHP');

      // Check that text-mention source is included
      languages.forEach(lang => {
        expect(lang.sources).toContain('text-mention');
      });
    });

    it('should handle case-insensitive language mentions', async () => {
      const content = `
# Project Description

This project is built with JAVASCRIPT and uses PYTHON for data processing.
We also integrate with Java services and C++ libraries.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      const languageNames = languages.map(lang => lang.name);
      expect(languageNames).toContain('JavaScript');
      expect(languageNames).toContain('Python');
      expect(languageNames).toContain('Java');
      expect(languageNames).toContain('C++');
    });
  });

  describe('File Reference Detection', () => {
    it('should detect languages from file extensions', async () => {
      const content = `
# Project Structure

The project includes the following files:

- \`src/main.js\` - Main JavaScript file
- \`src/utils.ts\` - TypeScript utilities
- \`scripts/deploy.py\` - Python deployment script
- \`src/Main.java\` - Java main class
- \`lib/parser.cpp\` - C++ parser implementation
- \`cmd/server.go\` - Go server implementation
- \`app/models.rb\` - Ruby models
- \`web/index.php\` - PHP web interface
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      const languageNames = languages.map(lang => lang.name);
      expect(languageNames).toContain('JavaScript');
      expect(languageNames).toContain('TypeScript');
      expect(languageNames).toContain('Python');
      expect(languageNames).toContain('Java');
      expect(languageNames).toContain('C++');
      expect(languageNames).toContain('Go');
      expect(languageNames).toContain('Ruby');
      expect(languageNames).toContain('PHP');

      // Check that at least some languages have file-reference source
      const fileRefLanguages = languages.filter(lang => lang.sources.includes('file-reference'));
      expect(fileRefLanguages.length).toBeGreaterThan(0);
      
      // Specifically check that languages with clear file extensions are detected
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      const tsLang = languages.find(lang => lang.name === 'TypeScript');
      const pyLang = languages.find(lang => lang.name === 'Python');
      
      expect(jsLang?.sources).toContain('file-reference');
      expect(tsLang?.sources).toContain('file-reference');
      expect(pyLang?.sources).toContain('file-reference');
    });

    it('should detect languages from configuration files', async () => {
      const content = `
# Setup Instructions

1. Install dependencies from \`package.json\` (Node.js)
2. Configure TypeScript with \`tsconfig.json\`
3. Install Python packages from \`requirements.txt\`
4. Build Java project with \`pom.xml\`
5. Compile Rust project using \`Cargo.toml\`
6. Install Go modules from \`go.mod\`
7. Install PHP dependencies with \`composer.json\`
8. Install Ruby gems from \`Gemfile\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      const languageNames = languages.map(lang => lang.name);
      expect(languageNames).toContain('JavaScript'); // from package.json
      expect(languageNames).toContain('TypeScript'); // from tsconfig.json
      expect(languageNames).toContain('Python'); // from requirements.txt
      expect(languageNames).toContain('Java'); // from pom.xml
      expect(languageNames).toContain('Rust'); // from Cargo.toml
      expect(languageNames).toContain('Go'); // from go.mod
      expect(languageNames).toContain('PHP'); // from composer.json
      expect(languageNames).toContain('Ruby'); // from Gemfile
    });
  });

  describe('Multiple Detection Sources', () => {
    it('should combine results from multiple detection sources', async () => {
      const content = `
# JavaScript Project

This is a JavaScript project built with Node.js and TypeScript.

\`\`\`javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' });
});
\`\`\`

## Project Structure

- \`src/app.js\` - Main application file
- \`src/utils.ts\` - TypeScript utilities
- \`package.json\` - Node.js dependencies
- \`tsconfig.json\` - TypeScript configuration

## Installation

Run \`npm install\` to install dependencies.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      const tsLang = languages.find(lang => lang.name === 'TypeScript');
      
      expect(jsLang).toBeDefined();
      expect(tsLang).toBeDefined();
      
      // JavaScript should have multiple sources
      expect(jsLang!.sources.length).toBeGreaterThan(1);
      expect(jsLang!.sources).toContain('code-block');
      expect(jsLang!.sources).toContain('text-mention');
      expect(jsLang!.sources).toContain('file-reference');
      
      // TypeScript should have multiple sources
      expect(tsLang!.sources.length).toBeGreaterThan(1);
      expect(tsLang!.sources).toContain('text-mention');
      expect(tsLang!.sources).toContain('file-reference');
      
      // Confidence should be higher due to multiple sources
      expect(jsLang!.confidence).toBeGreaterThan(0.8);
    });

    it('should prioritize languages by confidence score', async () => {
      const content = `
# Multi-Language Project

This project primarily uses Python with some JavaScript utilities.

\`\`\`python
def main():
    print("This is the main Python application")
    
class DataProcessor:
    def process(self, data):
        return [item.upper() for item in data]
\`\`\`

\`\`\`javascript
// Small utility function
function formatDate(date) {
  return date.toISOString();
}
\`\`\`

The core application is written in Python and uses requirements.txt for dependencies.
There's also a small JavaScript helper in utils.js.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      // Languages should be sorted by confidence (highest first)
      expect(languages.length).toBeGreaterThanOrEqual(2);
      
      for (let i = 0; i < languages.length - 1; i++) {
        expect(languages[i].confidence).toBeGreaterThanOrEqual(languages[i + 1].confidence);
      }
      
      // Python should likely have higher confidence due to more evidence
      const pyLang = languages.find(lang => lang.name === 'Python');
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      
      expect(pyLang).toBeDefined();
      expect(jsLang).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty content gracefully', async () => {
      const content = '';
      const parseResult = markdownParser.parseContentSync(content);
      
      if (parseResult.success) {
        const result = await detector.analyze(parseResult.data!.ast, content);
        expect(result.confidence).toBe(0);
        expect(result.data).toEqual([]);
      }
    });

    it('should handle content with no language indicators', async () => {
      const content = `
# Generic Project

This is a project description without any specific programming language mentions.
It talks about general software development concepts and methodologies.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

Download and install the software.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should handle malformed code blocks', async () => {
      const content = `
# Project with Malformed Code

\`\`\`
// Code block without language identifier
function test() {
  return true;
}
\`\`\`

\`\`\`unknown-language
// Code block with unknown language
some code here
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      // Should not crash and may detect some patterns
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle very long content efficiently', async () => {
      // Create a large content string
      const baseContent = `
# Large Project

This JavaScript project has many files:

\`\`\`javascript
function example() {
  console.log('Hello, World!');
}
\`\`\`

`;
      const largeContent = baseContent.repeat(100); // Repeat to make it large

      const parseResult = markdownParser.parseContentSync(largeContent);
      expect(parseResult.success).toBe(true);

      const startTime = Date.now();
      const result = await detector.analyze(parseResult.data!.ast, largeContent);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result).toBeDefined();
      
      const languages = result.data as LanguageInfo[];
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      expect(jsLang).toBeDefined();
    });
  });

  describe('Language Normalization', () => {
    it('should normalize common language aliases', async () => {
      const content = `
# Multi-Language Code Blocks

\`\`\`js
console.log('JavaScript');
\`\`\`

\`\`\`jsx
const Component = () => <div>React</div>;
\`\`\`

\`\`\`ts
interface User { name: string; }
\`\`\`

\`\`\`tsx
const App: React.FC = () => <div>TypeScript React</div>;
\`\`\`

\`\`\`py
print("Python")
\`\`\`

\`\`\`python3
print("Python 3")
\`\`\`

\`\`\`cpp
#include <iostream>
\`\`\`

\`\`\`c++
std::cout << "C++";
\`\`\`

\`\`\`golang
package main
\`\`\`

\`\`\`rs
fn main() {}
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      const languageNames = languages.map(lang => lang.name);
      
      // Should normalize aliases to standard names
      expect(languageNames).toContain('JavaScript'); // from js, jsx
      expect(languageNames).toContain('TypeScript'); // from ts, tsx
      expect(languageNames).toContain('Python'); // from py, python3
      expect(languageNames).toContain('C++'); // from cpp, c++
      expect(languageNames).toContain('Go'); // from golang
      expect(languageNames).toContain('Rust'); // from rs
      
      // Should not contain the aliases themselves
      expect(languageNames).not.toContain('js');
      expect(languageNames).not.toContain('jsx');
      expect(languageNames).not.toContain('ts');
      expect(languageNames).not.toContain('tsx');
      expect(languageNames).not.toContain('py');
      expect(languageNames).not.toContain('cpp');
      expect(languageNames).not.toContain('golang');
      expect(languageNames).not.toContain('rs');
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate appropriate confidence scores', async () => {
      const content = `
# High Confidence JavaScript Project

\`\`\`javascript
const express = require('express');
function createServer() {
  const app = express();
  return app;
}
\`\`\`

This JavaScript project uses Node.js and has the following files:
- package.json
- src/app.js
- src/utils.js

Run \`npm install\` and \`npm start\` to get started.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      
      expect(jsLang).toBeDefined();
      // Should have high confidence due to multiple strong indicators
      expect(jsLang!.confidence).toBeGreaterThan(0.8);
      
      // Overall confidence should also be high
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should have lower confidence for weak indicators', async () => {
      const content = `
# Project Description

This project might use JavaScript or Python, we're not sure yet.
There could be some Java components as well.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      // Should detect languages but with lower confidence
      languages.forEach(lang => {
        expect(lang.confidence).toBeLessThan(0.7);
      });
      
      expect(result.confidence).toBeLessThan(0.6);
    });
  });
});