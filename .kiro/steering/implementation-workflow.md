---
inclusion: always
---

# Implementation Workflow

## Development Approach

**Spec-Driven Development**: Always start with component specifications in `.kiro/specs/`. Each component has requirements, design, and tasks that serve as the implementation contract.

**Incremental Implementation**: Build features in small, testable increments. Validate each increment before proceeding to maintain system stability.

## Component Implementation Order

Follow dependency hierarchy for optimal development flow:

1. **README Parser** (`src/parser/`) - Foundation component
2. **Framework Detection** (`src/detection/`) - Depends on parser output
3. **YAML Generator** (`src/generator/`) - Depends on detection results
4. **CLI Tool** (`src/cli/`) - Orchestrates core components
5. **VSCode Extension** (`src/extension/`) - UI layer over CLI
6. **Agent Hooks** (`src/hooks/`) - Automation layer
7. **Integration & Deployment** (`src/deployment/`) - System orchestration

## Feature Development Workflow

### 1. Specification Review
- Read component requirements, design, and tasks
- Identify dependencies and integration points
- Validate acceptance criteria understanding

### 2. Interface-First Development
- Define TypeScript interfaces and types first
- Create component contracts before implementation
- Ensure compatibility with dependent components

### 3. Test-Driven Implementation
- Write failing tests based on acceptance criteria
- Implement minimal code to pass tests
- Refactor while maintaining test coverage

### 4. Integration Validation
- Test component interactions early and often
- Validate data flow between components
- Ensure error handling across boundaries

## Testing Strategy

### Unit Testing
- Test individual functions and classes in isolation
- Mock external dependencies and file system operations
- Achieve >90% code coverage per component

### Integration Testing
- Test component interactions and data flow
- Validate end-to-end workflows (README → YAML)
- Test error propagation and recovery

### Validation Testing
- Test with real-world README files
- Validate generated YAML syntax and functionality
- Performance testing with large inputs

## Quality Gates

### Before Component Completion
- All acceptance criteria met
- Test coverage >90%
- No TypeScript errors or warnings
- Documentation updated

### Before Integration
- Component interfaces stable
- Integration tests passing
- Error handling implemented
- Performance benchmarks met

### Before Release
- End-to-end workflows validated
- Security scanning passed
- Documentation complete
- Deployment tested

## Development Patterns

### Error Handling
- Use Result pattern for operations that can fail
- Provide contextual error messages
- Implement graceful degradation where possible

### Async Operations
- Use async/await consistently
- Implement proper timeout handling
- Add retry logic for external operations

### Configuration Management
- Use environment-specific configurations
- Validate configuration at startup
- Provide sensible defaults

### Logging and Monitoring
- Use structured logging (JSON format)
- Log at appropriate levels (error, warn, info, debug)
- Include correlation IDs for request tracking
# Implementation Workflow

## Development Process
1. Start with Task Progress Tracker hook
2. Implement following the sequential order (README Parser → Framework Detection → etc.)
3. Use Test Automation hook on file saves
4. Validate with Implementation Validator before marking complete
5. Update documentation with Documentation Sync hook

## Quality Gates
- All tests must pass
- Code quality checks must pass
- Spec alignment must be validated
- Documentation must be updated

## Component Integration
- Use Integration Helper for interface validation
- Ensure TypeScript interfaces match between components
- Test data flow end-to-end
