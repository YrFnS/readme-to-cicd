# 🚀 README-to-CICD - Complete Usage Guide

**Automatically generate optimized GitHub Actions CI/CD workflows from README files**

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [CLI Usage](#cli-usage)
4. [VSCode Extension](#vscode-extension)
5. [API Usage](#api-usage)
6. [Configuration](#configuration)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### 1. Install the CLI Tool
```bash
npm install -g readme-to-cicd
```

### 2. Generate Your First Workflow
```bash
# In your project directory with a README.md
readme-to-cicd generate

# Or specify a README file
readme-to-cicd generate --input ./docs/README.md
```

### 3. Your workflow is ready! 
Check `.github/workflows/` for your generated CI/CD pipeline.

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git repository with README.md

### Global Installation (Recommended)
```bash
npm install -g readme-to-cicd
```

### Local Installation
```bash
npm install readme-to-cicd
npx readme-to-cicd --help
```

### Development Installation
```bash
git clone https://github.com/your-org/readme-to-cicd.git
cd readme-to-cicd
npm install
npm run build
npm link
```

---

## 💻 CLI Usage

### Basic Commands

#### Generate Workflow
```bash
# Generate CI workflow from README.md
readme-to-cicd generate

# Generate specific workflow types
readme-to-cicd generate --type ci,cd,release

# Specify input and output
readme-to-cicd generate --input README.md --output .github/workflows/
```

#### Validate Existing Workflows
```bash
# Validate generated workflows
readme-to-cicd validate

# Validate specific workflow file
readme-to-cicd validate --file .github/workflows/ci.yml
```

#### Initialize Configuration
```bash
# Create configuration file
readme-to-cicd init

# Initialize with template
readme-to-cicd init --template enterprise
```

### Advanced Options

#### Optimization Levels
```bash
# Basic optimization (faster builds)
readme-to-cicd generate --optimization basic

# Standard optimization (balanced)
readme-to-cicd generate --optimization standard

# Aggressive optimization (maximum performance)
readme-to-cicd generate --optimization aggressive
```

#### Framework Detection
```bash
# Force specific framework detection
readme-to-cicd generate --framework nodejs,python

# Skip framework detection
readme-to-cicd generate --no-detection
```

#### Output Formats
```bash
# Generate YAML (default)
readme-to-cicd generate --format yaml

# Generate JSON workflow
readme-to-cicd generate --format json

# Generate both formats
readme-to-cicd generate --format yaml,json
```

### CLI Examples

```bash
# Complete React TypeScript project
readme-to-cicd generate --type ci,cd --optimization aggressive --framework react

# Python Django with Docker
readme-to-cicd generate --type ci,cd,release --framework python,django,docker

# Monorepo with multiple languages
readme-to-cicd generate --type ci --optimization standard --detect-all

# Dry run (preview without creating files)
readme-to-cicd generate --dry-run

# Verbose output for debugging
readme-to-cicd generate --verbose
```

---

## 🎨 VSCode Extension

### Installation

#### From VSCode Marketplace
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "README to CICD"
4. Click Install

#### Manual Installation
```bash
# Build the extension
cd vscode-extension
npm install
npm run compile
npm run package

# Install the .vsix file
code --install-extension readme-to-cicd-1.0.0.vsix
```

### Features

#### 1. **Command Palette Integration**
- `Ctrl+Shift+P` → "README to CICD: Generate Workflow"
- `Ctrl+Shift+P` → "README to CICD: Validate Workflow"
- `Ctrl+Shift+P` → "README to CICD: Initialize Config"

#### 2. **Right-Click Context Menu**
- Right-click on README.md → "Generate CI/CD Workflow"
- Right-click on workflow files → "Validate Workflow"

#### 3. **Status Bar Integration**
- Shows detected frameworks in status bar
- Click to generate workflows instantly

#### 4. **Sidebar Panel**
- View detected languages and frameworks
- Preview generated workflows
- One-click generation

### VSCode Extension Usage

#### Generate Workflow
1. Open your project in VSCode
2. Open README.md file
3. Press `Ctrl+Shift+P`
4. Type "README to CICD: Generate"
5. Select workflow types
6. Choose optimization level
7. Workflows generated in `.github/workflows/`

#### Live Preview
1. Open README.md
2. Open Command Palette
3. "README to CICD: Preview Workflow"
4. See live preview in side panel
5. Click "Generate" when satisfied

#### Settings Configuration
```json
{
  "readme-to-cicd.autoDetect": true,
  "readme-to-cicd.defaultOptimization": "standard",
  "readme-to-cicd.workflowTypes": ["ci", "cd"],
  "readme-to-cicd.outputDirectory": ".github/workflows",
  "readme-to-cicd.showStatusBar": true
}
```

---

## 🔧 API Usage

### Node.js Integration

```javascript
const { ComponentFactory } = require('readme-to-cicd');

async function generateWorkflow() {
  // Initialize components
  const factory = ComponentFactory.getInstance();
  const parser = factory.createReadmeParser();
  const generator = factory.createYAMLGenerator();

  // Parse README
  const readmeContent = fs.readFileSync('README.md', 'utf8');
  const parseResult = await parser.parseContent(readmeContent);

  if (parseResult.success) {
    // Generate workflow
    const workflowResult = await generator.generateWorkflow(
      parseResult.data,
      {
        workflowType: 'ci',
        optimizationLevel: 'standard'
      }
    );

    if (workflowResult.success) {
      fs.writeFileSync('.github/workflows/ci.yml', workflowResult.data);
      console.log('✅ Workflow generated successfully!');
    }
  }
}
```

### TypeScript Integration

```typescript
import { 
  ComponentFactory, 
  ReadmeParser, 
  YAMLGenerator,
  WorkflowOptions 
} from 'readme-to-cicd';

class WorkflowService {
  private parser: ReadmeParser;
  private generator: YAMLGenerator;

  constructor() {
    const factory = ComponentFactory.getInstance();
    this.parser = factory.createReadmeParser();
    this.generator = factory.createYAMLGenerator();
  }

  async generateFromReadme(
    content: string, 
    options: WorkflowOptions
  ): Promise<string> {
    const parseResult = await this.parser.parseContent(content);
    
    if (!parseResult.success) {
      throw new Error('Failed to parse README');
    }

    const workflowResult = await this.generator.generateWorkflow(
      parseResult.data,
      options
    );

    if (!workflowResult.success) {
      throw new Error('Failed to generate workflow');
    }

    return workflowResult.data;
  }
}
```

---

## ⚙️ Configuration

### Configuration File (.readme-to-cicd.json)

```json
{
  "defaults": {
    "workflowTypes": ["ci", "cd"],
    "optimizationLevel": "standard",
    "outputFormat": "yaml"
  },
  "detection": {
    "enableFrameworkDetection": true,
    "confidenceThreshold": 0.75,
    "customFrameworks": []
  },
  "output": {
    "directory": ".github/workflows",
    "filenamePattern": "{type}.yml",
    "includeMetadata": true,
    "indentation": 2
  },
  "git": {
    "autoCommit": false,
    "commitMessage": "Add CI/CD workflows generated from README"
  },
  "organization": {
    "requireApproval": false,
    "securityLevel": "standard",
    "complianceChecks": []
  },
  "templates": {
    "customTemplateDirectory": "./templates",
    "overrideDefaults": false
  }
}
```

### Environment Variables

```bash
# API Configuration
export README_TO_CICD_API_KEY="your-api-key"
export README_TO_CICD_ENDPOINT="https://api.readme-to-cicd.com"

# Behavior Configuration
export README_TO_CICD_AUTO_DETECT=true
export README_TO_CICD_OPTIMIZATION_LEVEL=standard
export README_TO_CICD_OUTPUT_DIR=.github/workflows

# Debug Configuration
export README_TO_CICD_DEBUG=true
export README_TO_CICD_LOG_LEVEL=verbose
```

---

## 📚 Examples

### Example 1: Node.js React Project

**README.md:**
```markdown
# My React App

A modern React application with TypeScript.

## Installation
```bash
npm install
```

## Development
```bash
npm start
npm test
```

## Build
```bash
npm run build
```

**Generated Workflow (.github/workflows/ci.yml):**
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run build
```

### Example 2: Python Django Project

**README.md:**
```markdown
# Django API

A REST API built with Django and PostgreSQL.

## Setup
```bash
pip install -r requirements.txt
python manage.py migrate
```

## Testing
```bash
pytest
python manage.py test
```

## Running
```bash
python manage.py runserver
```

**Command:**
```bash
readme-to-cicd generate --type ci,cd --optimization aggressive
```

### Example 3: Multi-Language Monorepo

**README.md:**
```markdown
# Monorepo Project

Contains Node.js frontend and Python backend.

## Frontend Setup
```bash
cd frontend
npm install
npm test
```

## Backend Setup
```bash
cd backend
pip install -r requirements.txt
pytest
```

**Generated:** Separate workflows for each language with proper path filtering.

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "No README.md found"
```bash
# Solution: Specify README location
readme-to-cicd generate --input ./docs/README.md
```

#### 2. "Framework detection failed"
```bash
# Solution: Force framework detection
readme-to-cicd generate --framework nodejs,python
```

#### 3. "Permission denied writing workflows"
```bash
# Solution: Check directory permissions
chmod 755 .github/workflows/
```

#### 4. "Invalid YAML generated"
```bash
# Solution: Validate and fix
readme-to-cicd validate --file .github/workflows/ci.yml
```

### Debug Mode

```bash
# Enable verbose logging
export DEBUG=readme-to-cicd:*
readme-to-cicd generate --verbose

# Check configuration
readme-to-cicd config --show

# Test framework detection
readme-to-cicd detect --input README.md
```

### Getting Help

```bash
# General help
readme-to-cicd --help

# Command-specific help
readme-to-cicd generate --help

# Version information
readme-to-cicd --version
```

---

## 🎯 Best Practices

### 1. **README Structure**
- Use clear section headers (## Installation, ## Usage, ## Testing)
- Include code blocks with proper language tags
- Specify framework versions and dependencies

### 2. **Workflow Organization**
- Use separate workflows for CI, CD, and releases
- Implement proper branch protection rules
- Include security scanning and dependency checks

### 3. **Configuration Management**
- Commit `.readme-to-cicd.json` to version control
- Use environment-specific configurations
- Document custom templates and overrides

### 4. **Team Collaboration**
- Set up approval workflows for production deployments
- Use consistent naming conventions
- Include workflow documentation in your README

---

## 🚀 Next Steps

1. **Generate your first workflow** with `readme-to-cicd generate`
2. **Install the VSCode extension** for seamless integration
3. **Customize configuration** for your team's needs
4. **Set up Agent Hooks** for automated workflow updates
5. **Explore advanced features** like multi-environment deployments

---

**Need help?** Check our [documentation](https://readme-to-cicd.com/docs) or [open an issue](https://github.com/your-org/readme-to-cicd/issues).

**Happy automating!** 🎉