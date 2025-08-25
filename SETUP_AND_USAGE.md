# 🚀 README-to-CICD - Complete Setup & Usage Guide

**Transform your README files into production-ready CI/CD workflows automatically**

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Setup](#quick-setup)
3. [CLI Installation & Usage](#cli-installation--usage)
4. [VSCode Extension Setup](#vscode-extension-setup)
5. [API Integration](#api-integration)
6. [Configuration](#configuration)
7. [Examples](#examples)
8. [Development](#development)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

README-to-CICD is a powerful automation tool that analyzes your README.md files and generates optimized GitHub Actions CI/CD workflows. It supports multiple programming languages, frameworks, and deployment strategies.

### Key Features
- ✅ **Automatic Framework Detection** - Detects Node.js, Python, Rust, Go, Java, and more
- ✅ **Smart Command Extraction** - Finds install, test, build, and run commands
- ✅ **Multiple Workflow Types** - CI, CD, and Release workflows
- ✅ **Optimization Levels** - Basic, Standard, and Aggressive optimization
- ✅ **VSCode Integration** - Seamless IDE experience
- ✅ **CLI Tool** - Command-line interface for automation
- ✅ **API Integration** - Programmatic access for custom tools

---

## ⚡ Quick Setup

### Prerequisites
```bash
# Required
node -v    # 18+
npm -v     # 9+
git --version

# Optional (for development)
code -v    # VSCode 1.74+
```

### 1. Install CLI Tool
```bash
# Global installation (recommended)
npm install -g readme-to-cicd

# Verify installation
readme-to-cicd --version
```

### 2. Generate Your First Workflow
```bash
# Navigate to your project
cd your-project

# Generate CI/CD workflow
readme-to-cicd generate

# Check generated files
ls .github/workflows/
```

### 3. Install VSCode Extension (Optional)
1. Open VSCode
2. Extensions (Ctrl+Shift+X)
3. Search "README to CICD"
4. Install

---

## 💻 CLI Installation & Usage

### Installation Options

#### Global Installation
```bash
npm install -g readme-to-cicd
```

#### Local Installation
```bash
npm install readme-to-cicd
npx readme-to-cicd --help
```

#### Development Installation
```bash
git clone https://github.com/your-org/readme-to-cicd.git
cd readme-to-cicd
npm install
npm run build
npm link
```

### Basic Commands

#### Generate Workflows
```bash
# Basic generation
readme-to-cicd generate

# Specify README file
readme-to-cicd generate --input ./docs/README.md

# Choose workflow types
readme-to-cicd generate --type ci,cd,release

# Set optimization level
readme-to-cicd generate --optimization aggressive

# Custom output directory
readme-to-cicd generate --output .github/workflows/
```

#### Validate Workflows
```bash
# Validate all workflows
readme-to-cicd validate

# Validate specific file
readme-to-cicd validate --file .github/workflows/ci.yml
```

#### Initialize Configuration
```bash
# Create basic config
readme-to-cicd init

# Use template
readme-to-cicd init --template enterprise
```

### Advanced CLI Usage

#### Framework-Specific Generation
```bash
# Node.js project
readme-to-cicd generate --framework nodejs --optimization standard

# Python Django project
readme-to-cicd generate --framework python,django --type ci,cd

# Multi-language monorepo
readme-to-cicd generate --detect-all --optimization aggressive
```

#### Output Formats
```bash
# YAML output (default)
readme-to-cicd generate --format yaml

# JSON output
readme-to-cicd generate --format json

# Both formats
readme-to-cicd generate --format yaml,json
```

#### Dry Run & Debugging
```bash
# Preview without creating files
readme-to-cicd generate --dry-run

# Verbose output
readme-to-cicd generate --verbose

# Debug mode
DEBUG=readme-to-cicd:* readme-to-cicd generate
```

---

## 🎨 VSCode Extension Setup

### Installation

#### From Marketplace
1. Open VSCode
2. Extensions panel (Ctrl+Shift+X)
3. Search "README to CICD"
4. Click Install

#### Manual Installation
```bash
# Build extension
cd vscode-extension
npm install
npm run compile
npm run package

# Install .vsix file
code --install-extension readme-to-cicd-1.0.0.vsix
```

### Extension Features

#### Command Palette Integration
- `Ctrl+Shift+P` → "README to CICD: Generate Workflow"
- `Ctrl+Shift+P` → "README to CICD: Preview Workflow"
- `Ctrl+Shift+P` → "README to CICD: Validate Workflow"

#### Context Menu
- Right-click README.md → "Generate CI/CD Workflow"
- Right-click workflow files → "Validate Workflow"

#### Sidebar Panel
- View detected frameworks
- One-click workflow generation
- Manage existing workflows

#### Status Bar
- Shows detected frameworks
- Click for quick generation

### Extension Configuration
```json
{
  "readme-to-cicd.autoDetect": true,
  "readme-to-cicd.defaultOptimization": "standard",
  "readme-to-cicd.workflowTypes": ["ci", "cd"],
  "readme-to-cicd.outputDirectory": ".github/workflows",
  "readme-to-cicd.showStatusBar": true,
  "readme-to-cicd.enablePreview": true,
  "readme-to-cicd.autoCommit": false
}
```

---

## 🔧 API Integration

### Node.js Integration

```javascript
const { ComponentFactory } = require('readme-to-cicd');

async function generateWorkflow() {
  // Initialize components
  const factory = ComponentFactory.getInstance();
  const parser = factory.createReadmeParser();
  
  // Parse README
  const readmeContent = fs.readFileSync('README.md', 'utf8');
  const parseResult = await parser.parseContent(readmeContent);

  if (parseResult.success) {
    console.log('Detected frameworks:', parseResult.data.languages);
    console.log('Extracted commands:', parseResult.data.commands);
    
    // Generate workflow (simplified - actual implementation may vary)
    const workflowYAML = generateYAMLFromData(parseResult.data);
    fs.writeFileSync('.github/workflows/ci.yml', workflowYAML);
  }
}
```

### TypeScript Integration

```typescript
import { ComponentFactory, ReadmeParser } from 'readme-to-cicd';

class WorkflowService {
  private parser: ReadmeParser;

  constructor() {
    const factory = ComponentFactory.getInstance();
    this.parser = factory.createReadmeParser();
  }

  async analyzeProject(readmePath: string): Promise<any> {
    const content = await fs.readFile(readmePath, 'utf8');
    const result = await this.parser.parseContent(content);
    
    return {
      success: result.success,
      frameworks: result.data?.languages || [],
      commands: result.data?.commands || {},
      confidence: result.confidence
    };
  }
}
```

### REST API Integration

```javascript
// Express.js API endpoint
app.post('/api/generate-workflow', async (req, res) => {
  try {
    const { readmeContent, options } = req.body;
    
    const factory = ComponentFactory.getInstance();
    const parser = factory.createReadmeParser();
    
    const parseResult = await parser.parseContent(readmeContent);
    
    if (parseResult.success) {
      // Generate workflow based on parsed data
      const workflow = await generateWorkflow(parseResult.data, options);
      
      res.json({
        success: true,
        workflow,
        metadata: {
          frameworks: parseResult.data.languages,
          confidence: parseResult.confidence
        }
      });
    } else {
      res.status(400).json({
        success: false,
        errors: parseResult.errors
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
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
    "customFrameworks": [
      {
        "name": "CustomFramework",
        "patterns": ["custom-pattern"],
        "commands": ["custom-build", "custom-test"]
      }
    ]
  },
  "output": {
    "directory": ".github/workflows",
    "filenamePattern": "{type}.yml",
    "includeMetadata": true,
    "indentation": 2
  },
  "git": {
    "autoCommit": false,
    "commitMessage": "Add CI/CD workflows generated from README",
    "createPullRequest": false
  },
  "organization": {
    "requireApproval": false,
    "securityLevel": "standard",
    "complianceChecks": ["security-scan", "dependency-check"]
  },
  "templates": {
    "customTemplateDirectory": "./templates",
    "overrideDefaults": false
  }
}
```

### Environment Variables

```bash
# Core Configuration
export README_TO_CICD_CONFIG_PATH="/path/to/config.json"
export README_TO_CICD_TEMPLATES_DIR="/path/to/templates"
export README_TO_CICD_OUTPUT_DIR=".github/workflows"

# Behavior Configuration
export README_TO_CICD_AUTO_DETECT=true
export README_TO_CICD_OPTIMIZATION_LEVEL=standard
export README_TO_CICD_CONFIDENCE_THRESHOLD=0.75

# Debug Configuration
export DEBUG=readme-to-cicd:*
export README_TO_CICD_LOG_LEVEL=verbose
export README_TO_CICD_ENABLE_TELEMETRY=false
```

---

## 📚 Examples

### Example 1: React TypeScript Project

**README.md:**
```markdown
# My React App

Modern React application with TypeScript and testing.

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
npm run lint
```

**Command:**
```bash
readme-to-cicd generate --framework react --optimization aggressive
```

**Generated CI Workflow:**
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
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### Example 2: Python Django API

**README.md:**
```markdown
# Django REST API

Backend API built with Django and PostgreSQL.

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
readme-to-cicd generate --type ci,cd --framework python,django
```

### Example 3: Rust CLI Tool

**README.md:**
```markdown
# Rust CLI Tool

Fast command-line utility written in Rust.

## Build
```bash
cargo build --release
```

## Test
```bash
cargo test
cargo clippy
```

## Install
```bash
cargo install --path .
```

**Generated Workflow:** Includes Rust toolchain setup, caching, and cross-platform builds.

---

## 🛠️ Development

### Project Structure
```
readme-to-cicd/
├── src/                    # Core source code
│   ├── parser/            # README parsing logic
│   ├── detection/         # Framework detection
│   ├── generator/         # YAML generation
│   ├── cli/              # Command-line interface
│   └── shared/           # Shared utilities
├── vscode-extension/      # VSCode extension
├── templates/            # Workflow templates
├── tests/               # Test suites
├── docs/               # Documentation
└── examples/           # Usage examples
```

### Development Setup
```bash
# Clone repository
git clone https://github.com/your-org/readme-to-cicd.git
cd readme-to-cicd

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Start development
npm run dev
```

### Building Components

#### Core Library
```bash
npm run build:core
npm run test:core
```

#### CLI Tool
```bash
npm run build:cli
npm run test:cli
```

#### VSCode Extension
```bash
cd vscode-extension
npm install
npm run compile
npm run package
```

### Testing
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance

# Test with coverage
npm run test:coverage
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Command not found: readme-to-cicd"
```bash
# Solution: Install globally or use npx
npm install -g readme-to-cicd
# OR
npx readme-to-cicd generate
```

#### 2. "No README.md found"
```bash
# Solution: Specify README location
readme-to-cicd generate --input ./docs/README.md
```

#### 3. "Framework detection failed"
```bash
# Solution: Force framework detection
readme-to-cicd generate --framework nodejs,python
```

#### 4. "Permission denied writing workflows"
```bash
# Solution: Check directory permissions
chmod 755 .github/workflows/
mkdir -p .github/workflows/
```

#### 5. "Invalid YAML generated"
```bash
# Solution: Validate and debug
readme-to-cicd validate --file .github/workflows/ci.yml
readme-to-cicd generate --dry-run --verbose
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=readme-to-cicd:*
readme-to-cicd generate --verbose

# Check configuration
readme-to-cicd config --show

# Test framework detection only
readme-to-cicd detect --input README.md

# Validate system
readme-to-cicd doctor
```

### VSCode Extension Issues

#### Extension Not Loading
1. Check VSCode version (1.74.0+)
2. Reload window (Ctrl+Shift+P → "Reload Window")
3. Check extension logs (Help → Toggle Developer Tools)

#### Commands Not Working
1. Ensure README.md file exists
2. Check extension settings
3. Restart VSCode

### Getting Help

```bash
# CLI help
readme-to-cicd --help
readme-to-cicd generate --help

# Version information
readme-to-cicd --version

# System diagnostics
readme-to-cicd doctor
```

### Support Channels
- 📖 [Documentation](https://readme-to-cicd.com/docs)
- 🐛 [GitHub Issues](https://github.com/your-org/readme-to-cicd/issues)
- 💬 [Discussions](https://github.com/your-org/readme-to-cicd/discussions)
- 📧 [Email Support](mailto:support@readme-to-cicd.com)

---

## 🎯 Best Practices

### 1. README Structure
- Use clear section headers (## Installation, ## Usage, ## Testing)
- Include code blocks with proper language tags
- Specify framework versions and dependencies
- Document environment variables and configuration

### 2. Workflow Organization
- Use separate workflows for CI, CD, and releases
- Implement proper branch protection rules
- Include security scanning and dependency checks
- Set up proper secrets management

### 3. Configuration Management
- Commit `.readme-to-cicd.json` to version control
- Use environment-specific configurations
- Document custom templates and overrides
- Regular configuration reviews

### 4. Team Collaboration
- Set up approval workflows for production deployments
- Use consistent naming conventions
- Include workflow documentation in README
- Regular workflow maintenance and updates

---

## 🚀 Next Steps

1. **Install the CLI tool** and generate your first workflow
2. **Set up the VSCode extension** for seamless development
3. **Configure your project** with `.readme-to-cicd.json`
4. **Customize templates** for your organization's needs
5. **Integrate with your CI/CD pipeline** for automated updates
6. **Explore advanced features** like Agent Hooks and enterprise integrations

---

**Ready to automate your CI/CD workflows?** Start with `readme-to-cicd generate` and experience the magic! ✨

**Happy automating!** 🎉