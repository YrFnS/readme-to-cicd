# Project Structure

## System Architecture

README-to-CICD follows a **7-component modular architecture** with clear separation of concerns:

```
README Parser → Framework Detection → YAML Generator
     ↓               ↓                    ↓
   CLI Tool ← VSCode Extension ← Agent Hooks
     ↓               ↓                    ↓
        Integration & Deployment
```

## Core Components

### 1. README Parser
- **Location**: `src/parser/`
- **Purpose**: Extract structured information from README files
- **Input**: README.md files
- **Output**: Structured project metadata

### 2. Framework Detection
- **Location**: `src/detection/`
- **Purpose**: Identify technologies and frameworks
- **Input**: Parsed README structure
- **Output**: Framework identification with confidence scores

### 3. YAML Generator
- **Location**: `src/generator/`
- **Purpose**: Generate GitHub Actions workflows
- **Input**: Framework detection results
- **Output**: Production-ready YAML files

### 4. CLI Tool
- **Location**: `src/cli/`
- **Purpose**: Command-line interface
- **Features**: Interactive mode, batch processing, configuration

### 5. VSCode Extension
- **Location**: `src/extension/`
- **Purpose**: IDE integration
- **Features**: Real-time preview, workflow validation

### 6. Agent Hooks
- **Location**: `src/hooks/`
- **Purpose**: Intelligent automation
- **Features**: GitHub webhooks, performance monitoring

### 7. Integration & Deployment
- **Location**: `src/deployment/`
- **Purpose**: System orchestration
- **Features**: Multi-cloud deployment, monitoring

## Directory Organization

```
├── .kiro/                    # Kiro configuration
│   ├── specs/               # Component specifications
│   │   ├── readme-parser/   # Parser requirements, design, tasks
│   │   ├── framework-detection/
│   │   ├── yaml-generator/
│   │   ├── cli-tool/
│   │   ├── vscode-extension/
│   │   ├── agent-hooks/
│   │   └── integration-deployment/
│   ├── hooks/               # Automation hooks
│   │   ├── code-quality-checker.md
│   │   ├── documentation-sync.md
│   │   ├── task-progress-tracker.md
│   │   └── integration-helper.md
│   └── steering/            # Project guidance
├── src/                     # Source code
├── tests/                   # Test suites
├── docs/                    # Documentation
├── templates/               # YAML templates
└── examples/                # Usage examples
```

## Spec Structure Pattern

Each component follows consistent spec organization:
- `requirements.md`: User stories and acceptance criteria
- `design.md`: Technical architecture and interfaces
- `tasks.md`: Implementation breakdown and progress

## Data Flow Architecture

1. **Input Processing**: README → Parser → Structured Data
2. **Intelligence Layer**: Structured Data → Detection → Framework Info
3. **Generation Layer**: Framework Info → Generator → YAML Workflows
4. **Interface Layer**: All components accessible via CLI/VSCode
5. **Automation Layer**: Agent Hooks monitor and optimize
6. **Deployment Layer**: Integration orchestrates the system

## Design Principles

- **Modularity**: Each component is independently deployable
- **Extensibility**: Plugin architecture for new frameworks
- **Testability**: Clear interfaces enable comprehensive testing
- **Observability**: Built-in monitoring and metrics
- **Security**: Security-first design with scanning integration

## File Naming Conventions

- **Components**: kebab-case directories (`readme-parser/`)
- **TypeScript**: PascalCase classes, camelCase functions
- **Configuration**: lowercase with extensions (`.kiro/`, `package.json`)
- **Documentation**: kebab-case with `.md` extension