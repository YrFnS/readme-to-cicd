# Technology Stack

## Core Technologies

**Primary Language**: TypeScript/Node.js
- Modern ES2022+ features
- Strict TypeScript configuration
- Node.js 18+ required

## Key Libraries & Frameworks

### Parsing & Processing
- **marked**: Markdown parsing and AST manipulation
- **js-yaml**: YAML generation and validation  
- **yaml**: Alternative YAML processing
- **Handlebars**: Template engine for workflow generation
- **xml2js**: XML parsing for project files
- **@iarna/toml**: TOML file parsing

### CLI & User Interface
- **Commander.js**: Command-line interface framework
- **Inquirer.js**: Interactive command-line prompts
- **ora**: Terminal spinners and progress indicators
- **chalk**: Terminal string styling
- **boxen**: Terminal box drawing

### Validation & Configuration
- **ajv**: JSON schema validation
- **ajv-formats**: Additional validation formats
- **cosmiconfig**: Configuration file discovery

### Development & Testing
- **Vitest**: Fast unit testing framework
- **@vitest/coverage-v8**: Code coverage reporting
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting
- **TypeScript**: Static type checking

## Development Tools

### Code Quality
```bash
# Linting and formatting
npm run lint
npm run format
npm run type-check

# Testing
npm run test
npm run test:watch
npm run test:coverage
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:all

# Validation
npm run validate:interfaces
npm run validate:integration
npm run validate:build

# Build
npm run build
npm run build:fast
npm run dev
```

## Architecture Patterns

- **Result Pattern**: Error handling without exceptions
- **Analyzer Pattern**: Pluggable content analysis
- **Factory Pattern**: Component instantiation
- **Pipeline Pattern**: Sequential data processing
- **Template-Based**: YAML generation via Handlebars
- **Interface-First**: TypeScript contracts define boundaries

## Current Implementation Status

### ✅ Completed
- **README Parser**: Core parsing with 5 content analyzers
- **Framework Detection**: Partial implementation with extensible rules
- **YAML Generator**: Template-based workflow generation
- **CLI Tool**: Command-line interface structure
- **Validation**: Interface and integration validation

### 🚧 In Progress
- **Integration Pipeline**: Connecting components properly
- **Command-Language Association**: Fixing analyzer integration
- **Confidence Scoring**: Improving detection accuracy

### 📋 Planned
- **VSCode Extension**: IDE integration
- **Agent Hooks**: Intelligent automation
- **Deployment**: Production orchestration