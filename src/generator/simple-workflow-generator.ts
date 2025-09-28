/**
 * Simple Workflow Generator
 * 
 * A minimal implementation that creates basic CI/CD workflows
 * when the full generator system has issues. This ensures users
 * can still get functional workflows.
 */

import { WorkflowOutput, WorkflowType } from './interfaces';

export interface SimpleDetectionResult {
  frameworks?: Array<{ name: string; version?: string; confidence?: number }>;
  languages?: Array<{ name: string; primary?: boolean }>;
  buildTools?: Array<{ name: string }>;
  projectMetadata?: { name?: string };
}

export class SimpleWorkflowGenerator {
  /**
   * Generate a basic CI workflow
   */
  generateBasicCI(detectionResult: SimpleDetectionResult): WorkflowOutput {
    const frameworks = detectionResult.frameworks || [];
    const languages = detectionResult.languages || [];
    const projectName = detectionResult.projectMetadata?.name || 'project';
    
    // Determine primary language
    const primaryLang = languages.find(l => l.primary)?.name || 
                       languages[0]?.name || 
                       frameworks[0]?.name || 
                       'nodejs';

    const content = this.generateCIContent(primaryLang.toLowerCase(), projectName);

    return {
      filename: 'ci.yml',
      content,
      type: 'ci' as WorkflowType,
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0-simple',
        detectionSummary: `Primary: ${primaryLang}, Frameworks: ${frameworks.length}, Confidence: 80%`,
        optimizations: ['Basic CI pipeline', 'Dependency caching enabled'],
        warnings: frameworks.length === 0 ? ['No frameworks detected - using generic workflow'] : []
      }
    };
  }

  /**
   * Generate a basic CD workflow
   */
  generateBasicCD(detectionResult: SimpleDetectionResult): WorkflowOutput {
    const frameworks = detectionResult.frameworks || [];
    const languages = detectionResult.languages || [];
    const projectName = detectionResult.projectMetadata?.name || 'project';
    
    const primaryLang = languages.find(l => l.primary)?.name || 
                       languages[0]?.name || 
                       frameworks[0]?.name || 
                       'nodejs';

    const content = this.generateCDContent(primaryLang.toLowerCase(), projectName);

    return {
      filename: 'cd.yml',
      content,
      type: 'cd' as WorkflowType,
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0-simple',
        detectionSummary: `Primary: ${primaryLang}, Frameworks: ${frameworks.length}, Confidence: 80%`,
        optimizations: ['Basic CD pipeline', 'Automatic deployment on main branch'],
        warnings: frameworks.length === 0 ? ['No frameworks detected - using generic workflow'] : []
      }
    };
  }

  /**
   * Generate recommended workflows based on detection
   */
  generateRecommended(detectionResult: SimpleDetectionResult): WorkflowOutput[] {
    const workflows: WorkflowOutput[] = [];
    
    // Always generate CI
    workflows.push(this.generateBasicCI(detectionResult));
    
    // Generate CD if we have enough confidence or frameworks
    const frameworks = detectionResult.frameworks || [];
    if (frameworks.length > 0) {
      workflows.push(this.generateBasicCD(detectionResult));
    }

    return workflows;
  }

  private generateCIContent(language: string, projectName: string): string {
    const templates = {
      nodejs: this.getNodeJSCITemplate(),
      javascript: this.getNodeJSCITemplate(),
      typescript: this.getNodeJSCITemplate(),
      python: this.getPythonCITemplate(),
      java: this.getJavaCITemplate(),
      default: this.getGenericCITemplate()
    };

    const template = templates[language as keyof typeof templates] || templates.default;
    return template.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
  }

  private generateCDContent(language: string, projectName: string): string {
    const templates = {
      nodejs: this.getNodeJSCDTemplate(),
      javascript: this.getNodeJSCDTemplate(),
      typescript: this.getNodeJSCDTemplate(),
      python: this.getPythonCDTemplate(),
      java: this.getJavaCDTemplate(),
      default: this.getGenericCDTemplate()
    };

    const template = templates[language as keyof typeof templates] || templates.default;
    return template.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
  }

  private getNodeJSCITemplate(): string {
    return `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js $\{{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: $\{{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint --if-present
    
    - name: Run tests
      run: npm test
    
    - name: Build project
      run: npm run build --if-present
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      if: matrix.node-version == '20.x'
`;
  }

  private getPythonCITemplate(): string {
    return `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python $\{{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: $\{{ matrix.python-version }}
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run linter
      run: |
        pip install flake8
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    
    - name: Run tests
      run: |
        pip install pytest
        pytest
`;
  }

  private getJavaCITemplate(): string {
    return `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Cache Maven packages
      uses: actions/cache@v3
      with:
        path: ~/.m2
        key: $\{{ runner.os }}-m2-$\{{ hashFiles('**/pom.xml') }}
        restore-keys: $\{{ runner.os }}-m2
    
    - name: Run tests
      run: mvn clean test
    
    - name: Build with Maven
      run: mvn clean compile
`;
  }

  private getGenericCITemplate(): string {
    return `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup environment
      run: |
        echo "Setting up build environment"
        # Add your setup commands here
    
    - name: Build
      run: |
        echo "Add your build commands here"
        # Example: make build
    
    - name: Test
      run: |
        echo "Add your test commands here"
        # Example: make test
`;
  }

  private getNodeJSCDTemplate(): string {
    return `name: CD

on:
  push:
    branches: [ main ]
  release:
    types: [ published ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Deploy
      run: |
        echo "Add your deployment commands here"
        # Example: npm run deploy
`;
  }

  private getPythonCDTemplate(): string {
    return `name: CD

on:
  push:
    branches: [ main ]
  release:
    types: [ published ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Build
      run: |
        python setup.py build
    
    - name: Deploy
      run: |
        echo "Add your deployment commands here"
        # Example: python deploy.py
`;
  }

  private getJavaCDTemplate(): string {
    return `name: CD

on:
  push:
    branches: [ main ]
  release:
    types: [ published ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Build with Maven
      run: mvn clean package
    
    - name: Deploy
      run: |
        echo "Add your deployment commands here"
        # Example: mvn deploy
`;
  }

  private getGenericCDTemplate(): string {
    return `name: CD

on:
  push:
    branches: [ main ]
  release:
    types: [ published ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build
      run: |
        echo "Add your build commands here"
        # Example: make build
    
    - name: Deploy
      run: |
        echo "Add your deployment commands here"
        # Example: make deploy
`;
  }
}