---
inclusion: always
---

# Implementation Workflow

## Development Approach

**Spec-Driven Development**: Always start with component specifications in `.kiro/specs/`. Each component has requirements, design, and tasks that serve as the implementation contract.

**Incremental Implementation**: Build features in small, testable increments. Validate each increment before proceeding to maintain system stability.

## Component Implementation Status & Order

### ✅ Completed (with integration issues)
1. **README Parser** (`src/parser/`) - Foundation component
   - Core parsing complete with 5 content analyzers
   - **CRITICAL ISSUE**: Integration pipeline not connected
   - **CRITICAL ISSUE**: Command-language association broken

### 🚧 Partially Complete
2. **Framework Detection** (`src/detection/`) - Depends on parser output
   - Basic structure implemented
   - Needs integration with parser results

3. **YAML Generator** (`src/generator/`) - Depends on detection results
   - Template system implemented
   - Workflow specialization in progress

4. **CLI Tool** (`src/cli/`) - Orchestrates core components
   - Structure implemented
   - **BLOCKING**: Missing dependencies (cosmiconfig, commander, inquirer, ora)

### 📋 Planned
5. **VSCode Extension** - IDE integration (future)
6. **Agent Hooks** - Intelligent automation (future)
7. **Deployment System** - Production orchestration (future)

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

## Current Development Priority

### 🚨 CRITICAL FIXES NEEDED FIRST
1. **Install Missing Dependencies**: `npm install cosmiconfig commander inquirer ora`
2. **Fix Integration Pipeline**: Connect IntegrationPipeline to ReadmeParserImpl
3. **Fix Command-Language Association**: Commands must inherit language context
4. **Fix Confidence Scoring**: Language detection scores too low

### Development Process
1. Fix blocking integration issues before continuing with specs
2. Validate fixes with comprehensive test suite (target: <5% failure rate)
3. Use validation scripts: `npm run validate:integration`
4. Maintain >90% test coverage per component
5. Update documentation as components stabilize

## Quality Gates

### Before Continuing Development
- All critical integration issues resolved
- Test failure rate <5% (currently 11.9%)
- TypeScript compilation successful (currently 29 errors)
- Core data flow working (README → Parser → Detection → YAML)

### Before Component Completion
- All acceptance criteria met
- Test coverage >90%
- No TypeScript errors or warnings
- Integration tests passing

## Component Integration Strategy
- Fix IntegrationPipeline connection to ReadmeParserImpl
- Ensure proper data flow between analyzers
- Validate TypeScript interfaces match between components
- Test end-to-end workflows with real README files
