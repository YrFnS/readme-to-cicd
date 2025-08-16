# README to CI/CD - VS Code Extension

Generate GitHub Actions workflows from README files directly within Visual Studio Code.

## Features

- **Automatic Framework Detection**: Analyzes your README.md to detect technologies and frameworks
- **Visual Configuration**: Easy-to-use interface for customizing workflow generation
- **Real-time Preview**: See generated workflows before creating files
- **Integrated Validation**: YAML syntax and GitHub Actions schema validation
- **Contextual Help**: Tooltips and documentation for workflow options

## Usage

### Generate Workflow

1. Open a project with a README.md file
2. Right-click on README.md and select "Generate CI/CD Workflow"
3. Configure your workflow options in the configuration panel
4. Preview the generated workflows
5. Approve to create the workflow files

### Commands

- `README to CI/CD: Generate Workflow` - Generate workflows from README
- `README to CI/CD: Preview Workflow` - Preview workflows without creating files
- `README to CI/CD: Validate Workflow` - Validate existing workflow files
- `README to CI/CD: Open Configuration` - Open configuration panel
- `README to CI/CD: Refresh Detection` - Refresh framework detection

## Configuration

The extension supports both user and workspace-level configuration:

- `readme-to-cicd.defaultOutputDirectory` - Default directory for workflow files
- `readme-to-cicd.enableAutoGeneration` - Auto-generate on README changes
- `readme-to-cicd.showPreviewByDefault` - Show preview before generation
- `readme-to-cicd.enableInlineValidation` - Real-time validation
- `readme-to-cicd.notificationLevel` - Notification level (all/errors/none)

## Requirements

- Visual Studio Code 1.74.0 or higher
- Node.js project with README.md file

## Installation

Install from the VS Code Marketplace or build from source:

```bash
npm install
npm run compile
npm run package
```

## Contributing

See the main project repository for contribution guidelines.

## License

MIT License - see LICENSE file for details.