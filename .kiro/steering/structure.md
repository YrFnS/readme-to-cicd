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

### 5. Shared Utilities
- **Location**: `src/shared/`
- **Purpose**: Common utilities and types
- **Features**: Markdown parsing, shared interfaces

### 6. Validation System
- **Location**: `src/validation/`
- **Purpose**: Interface and integration validation
- **Features**: Component compatibility checking, diagnostics

### 7. Future Extensions
- **VSCode Extension**: IDE integration (planned)
- **Agent Hooks**: Intelligent automation (planned)
- **Deployment**: Production orchestration (planned)

## Directory Organization

```
├── .kiro/                    # Kiro configuration
│   ├── specs/               # Component specifications
│   │   ├── readme-parser/   # Parser requirements, design, tasks
│   │   ├── framework-detection/
│   │   ├── yaml-generator/
│   │   └── cli-tool/
│   ├── hooks/               # Automation hooks
│   └── steering/            # Project guidance
├── src/                     # Source code
│   ├── parser/              # README parsing and analysis
│   ├── detection/           # Framework detection system
│   ├── generator/           # YAML workflow generation
│   ├── cli/                 # Command-line interface
│   ├── shared/              # Common utilities
│   └── validation/          # System validation
├── tests/                   # Test suites
│   ├── unit/                # Component unit tests
│   ├── integration/         # Cross-component tests
│   ├── performance/         # Performance benchmarks
│   └── fixtures/            # Test data and samples
├── docs/                    # Documentation
├── templates/               # YAML workflow templates
├── examples/                # Usage examples
└── scripts/                 # Build and validation scripts
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