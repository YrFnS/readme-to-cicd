# README to CICD - VSCode Extension

Generate CI/CD workflows from README files automatically with this powerful VSCode extension.

## Features

- **🚀 One-Click Generation**: Generate CI/CD workflows directly from README files
- **🔍 Smart Detection**: Automatically detects frameworks and languages
- **⚡ Live Preview**: Preview workflows before generation
- **🎯 Multiple Workflow Types**: Support for CI, CD, and Release workflows
- **⚙️ Customizable**: Configurable optimization levels and output options
- **📊 Status Bar Integration**: See detected frameworks at a glance

## Quick Start

1. Open a project with a README.md file
2. Right-click on README.md → "Generate CI/CD Workflow"
3. Choose your workflow options
4. Your workflows are generated in `.github/workflows/`

## Commands

- `README to CICD: Generate Workflow` - Generate workflows from README
- `README to CICD: Preview Workflow` - Preview before generation
- `README to CICD: Validate Workflow` - Validate existing workflows
- `README to CICD: Initialize Configuration` - Set up project configuration

## Configuration

Configure the extension through VSCode settings:

```json
{
  "readme-to-cicd.autoDetect": true,
  "readme-to-cicd.defaultOptimization": "standard",
  "readme-to-cicd.workflowTypes": ["ci", "cd"],
  "readme-to-cicd.outputDirectory": ".github/workflows",
  "readme-to-cicd.showStatusBar": true
}
```

## Supported Frameworks

- Node.js / JavaScript / TypeScript
- Python (Django, Flask, FastAPI)
- Rust (Cargo projects)
- Go (Go modules)
- Java (Maven, Gradle)
- And many more...

## Requirements

- VSCode 1.74.0 or higher
- A project with README.md file

## Installation

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "README to CICD"
4. Click Install

## Usage

### Generate Workflow

1. **From Command Palette**: 
   - Press `Ctrl+Shift+P`
   - Type "README to CICD: Generate"
   - Follow the prompts

2. **From Context Menu**:
   - Right-click on README.md
   - Select "Generate CI/CD Workflow"

3. **From Sidebar**:
   - Open Explorer panel
   - Find "README to CICD" section
   - Click "Generate New Workflow"

### Preview Workflow

Before generating, you can preview the workflow:
- Command Palette → "README to CICD: Preview Workflow"
- View the generated YAML in a preview panel

### Validate Workflows

Check existing workflows for issues:
- Command Palette → "README to CICD: Validate Workflow"
- Get feedback on workflow structure and best practices

## Extension Settings

This extension contributes the following settings:

- `readme-to-cicd.autoDetect`: Enable automatic framework detection
- `readme-to-cicd.defaultOptimization`: Default optimization level (basic/standard/aggressive)
- `readme-to-cicd.workflowTypes`: Default workflow types to generate
- `readme-to-cicd.outputDirectory`: Directory for generated workflows
- `readme-to-cicd.showStatusBar`: Show framework detection in status bar
- `readme-to-cicd.enablePreview`: Enable workflow preview feature
- `readme-to-cicd.autoCommit`: Automatically commit generated workflows
- `readme-to-cicd.commitMessage`: Commit message for auto-committed workflows

## Known Issues

- Large README files may take longer to process
- Some complex project structures may require manual configuration

## Release Notes

### 1.0.0

Initial release of README to CICD extension:
- Basic workflow generation from README files
- Framework detection for popular languages
- VSCode integration with commands and sidebar
- Configurable workflow options

## Contributing

Found a bug or want to contribute? Visit our [GitHub repository](https://github.com/your-org/readme-to-cicd).

## License

This extension is licensed under the MIT License.

---

**Enjoy automating your CI/CD workflows!** 🚀