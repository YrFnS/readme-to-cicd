# API Documentation

## Overview

The README-to-CICD API provides comprehensive parsing capabilities for extracting structured information from README files. The API is designed with TypeScript-first approach, providing excellent type safety and developer experience.

## Core Interfaces

### ReadmeParser

The main interface for parsing README files.

```typescript
interface ReadmeParser {
  parseFile(filePath: string): Promise<ParseResult>;
  parseContent(content: string): Promise<ParseResult>;
}
```

#### Methods

##### `parseFile(filePath: string): Promise<ParseResult>`

Parses a README file from the filesystem.

**Parameters:**
- `filePath` (string): Absolute or relative path to the README file

**Returns:** Promise resolving to `ParseResult`

**Example:**
```typescript
const result = await parser.parseFile('./README.md');
if (result.success) {
  console.log('Project name:', result.data.metadata.name);
}
```

##### `parseContent(content: string): Promise<ParseResult>`

Parses README content directly from a string.

**Parameters:**
- `content` (string): Raw README content as markdown

**Returns:** Promise resolving to `ParseResult`

**Example:**
```typescript
const result = await parser.parseContent(readmeMarkdown);
```

### ParseResult

Result structure returned by parsing operations.

```typescript
interface ParseResult {
  success: boolean;
  data?: ProjectInfo;
  errors?: ParseError[];
  warnings?: string[];
}
```

#### Properties

- `success` (boolean): Whether the parsing operation succeeded
- `data` (ProjectInfo, optional): Extracted project information (only present if success is true)
- `errors` (ParseError[], optional): Array of errors encountered during parsing
- `warnings` (string[], optional): Array of warning messages

### ProjectInfo

Comprehensive project information extracted from README.

```typescript
interface ProjectInfo {
  metadata: ProjectMetadata;
  languages: LanguageInfo[];
  dependencies: DependencyInfo;
  commands: CommandInfo;
  testing: TestingInfo;
  confidence: ConfidenceScores;
}
```

#### Properties

##### `metadata: ProjectMetadata`

Project metadata including name, description, and structure.

```typescript
interface ProjectMetadata {
  name?: string;
  description?: string;
  structure?: string[];
  environment?: EnvironmentVariable[];
}
```

##### `languages: LanguageInfo[]`

Detected programming languages with confidence scores.

```typescript
interface LanguageInfo {
  name: string;
  confidence: number;
  sources: LanguageSource[];
  frameworks?: string[];
}

type LanguageSource = 'code-block' | 'text-mention' | 'file-reference' | 'pattern-match';
```

##### `dependencies: DependencyInfo`

Dependency information including package files and install commands.

```typescript
interface DependencyInfo {
  packageFiles: PackageFile[];
  installCommands: Command[];
  packages: Package[];
  dependencies: Dependency[];
  devDependencies: Dependency[];
}
```

##### `commands: CommandInfo`

Extracted commands categorized by type.

```typescript
interface CommandInfo {
  build: Command[];
  test: Command[];
  run: Command[];
  install: Command[];
  other: Command[];
  deploy?: Command[];
}
```

##### `testing: TestingInfo`

Testing framework and tool information.

```typescript
interface TestingInfo {
  frameworks: TestingFramework[];
  tools: TestingTool[];
  configFiles: string[];
  confidence: number;
  testFiles: string[];
  commands: Command[];
  coverage: CoverageInfo;
}
```

##### `confidence: ConfidenceScores`

Confidence scores for each analysis category.

```typescript
interface ConfidenceScores {
  overall: number;
  languages: number;
  dependencies: number;
  commands: number;
  testing: number;
  metadata: number;
}
```

## Implementation Classes

### ReadmeParserImpl

Main implementation of the ReadmeParser interface.

```typescript
class ReadmeParserImpl implements ReadmeParser {
  constructor(options?: {
    enableCaching?: boolean;
    enablePerformanceMonitoring?: boolean;
    cacheOptions?: any;
    performanceOptions?: any;
  });
}
```

#### Constructor Options

- `enableCaching` (boolean, default: true): Enable AST caching for improved performance
- `enablePerformanceMonitoring` (boolean, default: true): Enable performance monitoring
- `cacheOptions` (object, optional): Custom cache configuration
- `performanceOptions` (object, optional): Custom performance monitoring configuration

#### Additional Methods

##### `registerAnalyzer(analyzer: ContentAnalyzer): void`

Register a custom content analyzer.

##### `clearAnalyzers(): void`

Clear all registered analyzers (primarily for testing).

##### `parseContentWithAnalyzers(content: string, analyzerNames: string[]): Promise<ParseResult>`

Parse content with specific analyzers only.

##### `validateContent(content: string): { valid: boolean; errors: string[] }`

Validate README content before parsing.

##### `getParserInfo(): ParserInfo`

Get parser statistics and health information.

##### `getPerformanceStats(): PerformanceStats`

Get performance statistics.

##### `getCacheStats(): CacheStats`

Get cache statistics.

##### `clearPerformanceData(): void`

Clear performance and cache data.

##### `getMemoryUsage(): string`

Get current memory usage formatted as string.

## Factory Functions

### `createReadmeParser(): ReadmeParserImpl`

Creates a new README parser instance with default configuration.

```typescript
import { createReadmeParser } from 'readme-to-cicd';

const parser = createReadmeParser();
```

### `createReadmeParserWithErrorHandling(logLevel?: LogLevel): ReadmeParserImpl`

Creates a new README parser instance with enhanced error handling.

```typescript
import { createReadmeParserWithErrorHandling } from 'readme-to-cicd';

const parser = createReadmeParserWithErrorHandling('debug');
```

## Content Analyzers

The parser uses a modular analyzer architecture. Each analyzer implements the `ContentAnalyzer` interface:

```typescript
interface ContentAnalyzer {
  readonly name: string;
  analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult>;
}
```

### Built-in Analyzers

1. **LanguageDetector** - Identifies programming languages from code blocks and text
2. **DependencyExtractor** - Extracts package files and installation commands
3. **CommandExtractor** - Identifies build, test, and run commands
4. **TestingDetector** - Detects testing frameworks and tools
5. **MetadataExtractor** - Extracts project metadata and structure

### Custom Analyzers

You can create custom analyzers by implementing the `ContentAnalyzer` interface:

```typescript
class CustomAnalyzer implements ContentAnalyzer {
  readonly name = 'CustomAnalyzer';
  
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    // Your analysis logic here
    return {
      data: { /* your extracted data */ },
      confidence: 0.8,
      sources: ['custom-analysis']
    };
  }
}

// Register the analyzer
parser.registerAnalyzer(new CustomAnalyzer());
```

## Error Handling

The API uses a Result pattern for error handling, providing structured error information:

```typescript
interface ParseError {
  code: string;
  message: string;
  component: string;
  severity: 'error' | 'warning' | 'info';
  details?: any;
  line?: number;
  column?: number;
}
```

### Common Error Codes

- `INVALID_INPUT` - Invalid input parameters
- `EMPTY_CONTENT` - Empty or whitespace-only content
- `FILE_NOT_FOUND` - README file not found
- `PARSE_ERROR` - Markdown parsing failed
- `ANALYZER_EXECUTION_ERROR` - Analyzer failed to execute
- `ALL_ANALYZERS_FAILED` - All analyzers failed to process content

## Performance Features

### AST Caching

The parser automatically caches parsed AST to improve performance when running multiple analyzers on the same content.

### Streaming Support

For large README files, the parser automatically uses streaming to reduce memory usage.

### Performance Monitoring

Built-in performance monitoring tracks:
- Parse times per operation
- Memory usage
- Cache hit rates
- Analyzer execution times

```typescript
const stats = parser.getPerformanceStats();
console.log('Average parse time:', stats.averageParseTime);
console.log('Cache hit rate:', stats.cacheHitRate);
```

## Best Practices

### Error Handling

Always check the `success` property before accessing `data`:

```typescript
const result = await parser.parseContent(content);
if (result.success) {
  // Safe to access result.data
  console.log(result.data.languages);
} else {
  // Handle errors
  console.error('Parse failed:', result.errors);
}
```

### Performance Optimization

1. **Enable Caching**: Keep caching enabled for repeated parsing operations
2. **Reuse Parser Instances**: Create one parser instance and reuse it
3. **Monitor Performance**: Use `getPerformanceStats()` to identify bottlenecks
4. **Validate Input**: Use `validateContent()` before parsing to catch issues early

### Custom Analyzers

When creating custom analyzers:

1. **Handle Errors Gracefully**: Return error results instead of throwing exceptions
2. **Provide Confidence Scores**: Include meaningful confidence scores (0-1)
3. **Document Sources**: Specify where information was extracted from
4. **Validate Input**: Check AST and content parameters before processing

## Examples

See the [examples directory](../examples/) for complete usage examples:

- [Basic Usage](../examples/basic-usage.ts)
- [Custom Analyzer](../examples/custom-analyzer.ts)
- [Performance Monitoring](../examples/performance-monitoring.ts)
- [Error Handling](../examples/error-handling.ts)