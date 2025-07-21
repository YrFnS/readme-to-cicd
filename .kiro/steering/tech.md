# Technology Stack

## Core Technologies

**Primary Language**: TypeScript/Node.js
- Modern ES2022+ features
- Strict TypeScript configuration
- Node.js 18+ required

## Key Libraries & Frameworks

### Parsing & Processing
- **Unified**: Markdown parsing and AST manipulation
- **js-yaml**: YAML generation and validation
- **Handlebars**: Template engine for workflow generation

### CLI & User Interface
- **Commander.js**: Command-line interface framework
- **Inquirer.js**: Interactive command-line prompts
- **VSCode Extension API**: IDE integration

### Infrastructure & Deployment
- **Docker**: Containerization
- **Kubernetes**: Container orchestration
- **GitHub Actions**: CI/CD platform integration

## Databases

- **PostgreSQL**: Primary database for structured data
- **Redis**: Caching and session storage
- **MongoDB**: Configuration and document storage
- **Apache Kafka**: Message queuing for Agent Hooks

## Development Tools

### Code Quality
```bash
# Linting and formatting
npm run lint
npm run format
npm run type-check

# Testing
npm test
npm run test:coverage
npm run test:e2e

# Security
npm audit
npm run security:scan
```

### Build & Development
```bash
# Development
npm run dev
npm run watch

# Building
npm run build
npm run build:prod

# Documentation
npm run docs:generate
npm run docs:serve
```

## Architecture Patterns

- **Modular Design**: 7 independent components
- **Event-Driven**: Agent Hooks use event-based automation
- **Plugin Architecture**: Extensible framework detection
- **Template-Based**: YAML generation via templates
- **Microservices Ready**: Designed for distributed deployment

## Performance & Monitoring

- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards
- **ELK Stack**: Logging and analytics
- **Caching**: Redis for performance optimization

## Security Standards

- **OAuth 2.0**: Authentication
- **HashiCorp Vault**: Secret management
- **SAST/DAST**: Security scanning integration
- **Compliance**: SOC2, HIPAA, PCI-DSS support