# Changelog

All notable changes to the "README to CI/CD" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Extension packaging and deployment system
- Comprehensive marketplace metadata
- Telemetry and usage analytics with user consent
- Cross-platform testing pipeline
- Version management and update mechanism

## [0.1.0] - 2024-01-15

### Added
- Initial release of README to CI/CD extension
- Automatic framework detection from README files
- Visual configuration interface for workflow generation
- Real-time workflow preview with syntax highlighting
- YAML validation and IntelliSense support
- Command Palette integration with comprehensive commands
- Context menu actions for README files
- Workflow Explorer tree view
- Git integration with smart staging and commit messages
- Multi-workflow support (CI, CD, release, maintenance)
- Template management system
- Performance optimization suggestions
- Error handling with actionable suggestions
- Contextual help and documentation system

### Features
- **Framework Detection**: Supports Node.js, Python, Java, Go, Rust, PHP, Ruby, C#/.NET
- **Workflow Types**: CI, CD, release, and maintenance workflows
- **Visual Interface**: React-based configuration and preview panels
- **Validation**: Real-time YAML syntax and GitHub Actions schema validation
- **Templates**: Custom and organization template support
- **Performance**: Automatic caching strategies and build optimization
- **Git Integration**: Branch management, conflict resolution, commit message generation
- **Help System**: Tooltips, hover providers, and contextual assistance

### Configuration
- Workspace and user-level settings support
- Organization policy enforcement
- Configurable output directories and workflow types
- Notification level controls
- Auto-generation options

### Commands
- Generate CI/CD Workflow
- Preview Workflow
- Validate Workflow
- Open Configuration
- Refresh Framework Detection
- Manage Templates
- Create Custom Template
- Generate Multi-Workflow
- Stage Workflow Files
- Commit Workflow Changes
- Create Workflow Branch
- Resolve Merge Conflicts
- Import/Export Organization Templates

### Requirements
- Visual Studio Code 1.74.0 or higher
- Node.js project with README.md file
- Git repository (optional, for Git integration features)

### Known Issues
- Large README files (>1MB) may cause slower framework detection
- Some complex monorepo structures may require manual configuration
- Template synchronization requires manual refresh in some cases

### Technical Details
- Built with TypeScript and React
- Uses webpack for optimized bundling
- Implements VS Code's webview API for custom UI
- Integrates with VS Code's file system, Git, and editor APIs
- Supports both CommonJS and ES modules
- Includes comprehensive test suite with unit and integration tests

## [0.0.1] - 2023-12-01

### Added
- Initial project setup
- Basic extension structure
- Core TypeScript configuration
- Webpack bundling setup
- Test framework integration

---

## Release Notes

### Version 0.1.0

This is the initial release of the README to CI/CD extension, bringing intelligent workflow generation directly to your VS Code environment.

**Key Highlights:**
- 🚀 **Zero Configuration**: Works out of the box with any README file
- 🎨 **Visual Interface**: No need to memorize YAML syntax
- 🔧 **Smart Detection**: Automatically identifies your tech stack
- 📊 **Performance Optimized**: Generates efficient, production-ready workflows
- 🤝 **Team Friendly**: Organization templates and policy enforcement

**Getting Started:**
1. Install the extension from the VS Code Marketplace
2. Open any project with a README.md file
3. Right-click on README.md → "Generate CI/CD Workflow"
4. Configure, preview, and generate your workflows

**Feedback Welcome:**
This is our first release, and we'd love to hear from you! Please report issues, suggest features, or share your success stories on our [GitHub repository](https://github.com/readme-to-cicd/vscode-extension).

---

For more information about releases, see our [GitHub Releases](https://github.com/readme-to-cicd/vscode-extension/releases) page.