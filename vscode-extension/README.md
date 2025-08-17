# README to CI/CD

[![Version](https://img.shields.io/visual-studio-marketplace/v/readme-to-cicd.readme-to-cicd)](https://marketplace.visualstudio.com/items?itemName=readme-to-cicd.readme-to-cicd)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/readme-to-cicd.readme-to-cicd)](https://marketplace.visualstudio.com/items?itemName=readme-to-cicd.readme-to-cicd)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/readme-to-cicd.readme-to-cicd)](https://marketplace.visualstudio.com/items?itemName=readme-to-cicd.readme-to-cicd)

Automatically generate optimized GitHub Actions CI/CD workflows from your README files. Transform project documentation into intelligent automation with zero YAML debugging required.

## ✨ Features

### 🚀 Intelligent Workflow Generation
- **Smart Framework Detection**: Automatically identifies technologies from your README
- **Production-Ready Workflows**: Generates optimized CI/CD pipelines with best practices
- **Multi-Workflow Support**: Create CI, CD, release, and maintenance workflows simultaneously

### 🎨 Visual Configuration
- **Interactive Setup**: Visual interface for configuring workflow options
- **Real-Time Preview**: See generated YAML before creating files
- **Template Management**: Custom and organization templates support

### 🔧 Developer Experience
- **Command Palette Integration**: Quick access to all features
- **Context Menu Actions**: Right-click README files for instant generation
- **IntelliSense Support**: Enhanced editing with validation and auto-completion

### 📊 Advanced Features
- **Performance Optimization**: Automatic caching strategies and build optimization
- **Git Integration**: Smart staging, commit messages, and branch management
- **Validation & Testing**: Real-time YAML validation and workflow testing
- **Error Recovery**: Intelligent error handling with actionable suggestions

## 🚀 Quick Start

1. **Install the Extension**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "README to CI/CD"
   - Click Install

2. **Generate Your First Workflow**
   - Open a project with a README.md file
   - Right-click on README.md → "Generate CI/CD Workflow"
   - Configure your options in the visual interface
   - Preview and approve the generated workflow

3. **Customize and Deploy**
   - Edit the generated workflow if needed
   - Commit and push to trigger your CI/CD pipeline

## 📖 Usage

### Command Palette Commands

- `README to CI/CD: Generate CI/CD Workflow` - Generate workflows from README
- `README to CI/CD: Preview Workflow` - Preview without creating files
- `README to CI/CD: Validate Workflow` - Validate existing workflows
- `README to CI/CD: Open Configuration` - Open settings panel
- `README to CI/CD: Manage Templates` - Manage workflow templates

### Context Menu Actions

Right-click on README.md files:
- **Generate CI/CD Workflow** - Quick workflow generation
- **Preview Workflow** - See what would be generated
- **Generate Multi-Workflow** - Create multiple workflow types

### Workflow Explorer

The Workflow Explorer in the sidebar shows:
- Detected frameworks and technologies
- Generated workflow files
- Validation status and issues
- Quick actions for each workflow

## ⚙️ Configuration

Configure the extension through VS Code settings:

```json
{
  "readme-to-cicd.defaultOutputDirectory": ".github/workflows",
  "readme-to-cicd.enableAutoGeneration": false,
  "readme-to-cicd.showPreviewByDefault": true,
  "readme-to-cicd.enableInlineValidation": true,
  "readme-to-cicd.notificationLevel": "all",
  "readme-to-cicd.preferredWorkflowTypes": ["ci", "cd"]
}
```

### Settings Reference

| Setting | Description | Default |
|---------|-------------|---------|
| `defaultOutputDirectory` | Directory for generated workflows | `.github/workflows` |
| `enableAutoGeneration` | Auto-generate on README changes | `false` |
| `showPreviewByDefault` | Show preview before generation | `true` |
| `enableInlineValidation` | Real-time YAML validation | `true` |
| `notificationLevel` | Notification verbosity | `all` |
| `preferredWorkflowTypes` | Default workflow types | `["ci"]` |

## 🎯 Supported Technologies

The extension automatically detects and configures workflows for:

### Languages & Runtimes
- **Node.js** - npm, yarn, pnpm support
- **Python** - pip, poetry, conda environments
- **Java** - Maven, Gradle build systems
- **Go** - Module and vendor support
- **Rust** - Cargo build system
- **PHP** - Composer dependency management
- **Ruby** - Bundler and gem support
- **C#/.NET** - MSBuild and dotnet CLI

### Frameworks & Tools
- **React** - Create React App, Next.js, Vite
- **Vue.js** - Vue CLI, Nuxt.js, Vite
- **Angular** - Angular CLI
- **Docker** - Multi-stage builds, registry push
- **Kubernetes** - Deployment manifests
- **Terraform** - Infrastructure as Code

### Testing Frameworks
- Jest, Mocha, Pytest, JUnit, Go Test, Cargo Test
- Code coverage reporting
- Integration and E2E testing

## 🔧 Advanced Usage

### Custom Templates

Create organization-specific templates:

1. Use `README to CI/CD: Manage Templates`
2. Create custom template from existing workflow
3. Share templates across your organization
4. Import/export template collections

### Multi-Workflow Coordination

Generate coordinated workflows:
- **CI Pipeline** - Build, test, and validate
- **CD Pipeline** - Deploy to staging/production
- **Release Pipeline** - Automated releases and changelogs
- **Maintenance** - Dependency updates and security scans

### Performance Optimization

The extension automatically optimizes workflows:
- **Smart Caching** - Framework-specific cache strategies
- **Parallel Jobs** - Optimal job ordering and dependencies
- **Matrix Builds** - Efficient multi-version testing
- **Resource Management** - Memory and CPU optimization

## 🐛 Troubleshooting

### Common Issues

**Extension not activating?**
- Ensure you have a README.md file in your workspace
- Check VS Code version compatibility (1.74.0+)

**Framework not detected?**
- Verify your README includes technology mentions
- Use `Refresh Framework Detection` command
- Check the Workflow Explorer for detection results

**Generated workflow failing?**
- Use `Validate Workflow` command
- Check the Problems panel for issues
- Review GitHub Actions logs for runtime errors

### Getting Help

- 📖 [Documentation](https://github.com/readme-to-cicd/vscode-extension/wiki)
- 🐛 [Report Issues](https://github.com/readme-to-cicd/vscode-extension/issues)
- 💬 [Discussions](https://github.com/readme-to-cicd/vscode-extension/discussions)

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/readme-to-cicd/vscode-extension.git
cd vscode-extension

# Install dependencies
npm install

# Start development
npm run build:watch

# Run tests
npm run test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- VS Code Extension API team for excellent documentation
- GitHub Actions team for the powerful CI/CD platform
- Open source community for inspiration and feedback

---

**Enjoy automated CI/CD! 🚀**