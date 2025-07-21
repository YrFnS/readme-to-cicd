---
inclusion: always
---

# Coding Standards

## TypeScript Configuration

- Use **strict TypeScript** with all strict flags enabled
- Target ES2022+ features for modern JavaScript support
- Enable `noImplicitAny`, `strictNullChecks`, and `noImplicitReturns`
- Use explicit return types for all public functions and methods
- Prefer `interface` over `type` for object definitions

## Code Style & Formatting

### Naming Conventions
- **Classes**: PascalCase (`ReadmeParser`, `FrameworkDetector`)
- **Functions/Methods**: camelCase (`parseReadme`, `detectFramework`)
- **Variables**: camelCase (`projectMetadata`, `workflowConfig`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_TIMEOUT`, `MAX_RETRIES`)
- **Files**: kebab-case (`readme-parser.ts`, `framework-detection.ts`)
- **Directories**: kebab-case (`src/parser/`, `tests/unit/`)

### Code Organization
- Maximum 100 characters per line
- Use 2 spaces for indentation
- Always use semicolons
- Prefer single quotes for strings
- Use trailing commas in multi-line objects/arrays

## Architecture Patterns

### Error Handling
- Use custom error classes extending `Error`
- Always provide meaningful error messages with context
- Use Result pattern for operations that can fail: `Result<T, E>`
- Log errors with structured logging (JSON format)

### Async Operations
- Prefer `async/await` over Promise chains
- Always handle Promise rejections
- Use timeout wrappers for external API calls
- Implement retry logic with exponential backoff

### Testing Standards
- Minimum 80% code coverage for all components
- Use descriptive test names: `should_detect_nodejs_framework_when_package_json_exists`
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies and file system operations
- Write integration tests for component interactions

## Security Guidelines

- Never log sensitive information (API keys, tokens)
- Validate all external inputs using schema validation
- Use parameterized queries for database operations
- Implement rate limiting for API endpoints
- Sanitize file paths to prevent directory traversal

## Performance Standards

- Cache expensive operations (framework detection results)
- Use streaming for large file processing
- Implement pagination for large datasets
- Set reasonable timeouts (2s for parsing, 5s for generation)
- Monitor memory usage and implement cleanup

## Documentation Requirements

- All public APIs must have JSDoc comments
- Include usage examples in complex function documentation
- Document error conditions and return types
- Maintain README files for each component
- Use inline comments for complex business logic only

## Git Workflow

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Keep commits atomic and focused
- Write descriptive commit messages explaining the "why"
- Use feature branches with descriptive names
- Squash commits before merging to main# Coding Standards

## TypeScript Standards
- Strict mode enabled
- No `any` types without explicit justification
- Comprehensive JSDoc for public APIs
- Consistent error handling patterns

## Testing Requirements
- >90% code coverage
- Unit tests for all business logic
- Integration tests for component interactions
- End-to-end tests for critical workflows

## Security Practices
- Input validation on all boundaries
- No hardcoded secrets or credentials
- Secure file operations
- Regular dependency audits
