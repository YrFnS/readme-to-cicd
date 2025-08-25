# Comprehensive Spec Tests

This directory contains comprehensive tests that validate every acceptance criteria in every spec.

## Test Structure

```
tests/comprehensive-spec-tests/
├── core-components/
│   ├── readme-parser-spec.test.ts      # 120+ tests for README Parser spec
│   ├── framework-detection-spec.test.ts # 90+ tests for Framework Detection spec
│   ├── yaml-generator-spec.test.ts     # 75+ tests for YAML Generator spec
│   └── integration-pipeline-spec.test.ts # Integration tests
├── user-interfaces/
│   ├── cli-tool-spec.test.ts           # 60+ tests for CLI Tool spec
│   └── vscode-extension-spec.test.ts   # 60+ tests for VSCode Extension spec
├── advanced-features/
│   ├── agent-hooks-spec.test.ts        # 45+ tests for Agent Hooks spec
│   ├── integration-deployment-spec.test.ts # 45+ tests for Integration Deployment spec
│   ├── analytics-system-spec.test.ts   # 60+ tests for Analytics System
│   ├── compliance-framework-spec.test.ts # 75+ tests for Compliance Framework
│   └── disaster-recovery-spec.test.ts  # 60+ tests for Disaster Recovery
├── end-to-end/
│   ├── complete-workflows.test.ts      # End-to-end workflow tests
│   ├── real-world-projects.test.ts     # Real project validation
│   └── performance-validation.test.ts  # Performance and scalability tests
├── fixtures/
│   ├── sample-readmes/                 # Test README files
│   ├── expected-outputs/               # Expected YAML outputs
│   └── mock-data/                      # Mock data for testing
└── utils/
    ├── spec-test-helpers.ts            # Utilities for spec testing
    ├── mock-factories.ts               # Mock object factories
    └── validation-helpers.ts           # Validation utilities
```

## Test Coverage Goals

- **Total Tests**: 790+ comprehensive tests
- **Spec Coverage**: 100% of all acceptance criteria
- **Code Coverage**: >90% across all components
- **Success Rate**: >95% test pass rate

## Running Tests

```bash
# Run all spec tests
npm run test:specs

# Run specific component tests
npm run test:specs:core
npm run test:specs:ui
npm run test:specs:advanced

# Run with coverage
npm run test:specs:coverage
```