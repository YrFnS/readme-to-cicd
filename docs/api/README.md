# README Parser API Documentation

## Core Classes

### FileReader

Handles async file reading with comprehensive error handling.

```typescript
class FileReader {
  async readFile(filePath: string, encoding?: BufferEncoding): Promise<Result<FileReadResult, ParseError>>
}

interface FileReadResult {
  content: string;
  filePath: string;
  size: number;
  encoding: string;
}
```

**Features:**
- Input validation and sanitization
- File size limits (10MB max)
- Binary content detection
- Path traversal protection
- Comprehensive error handling

### MarkdownParser

Wrapper around marked library for AST generation.

```typescript
class MarkdownParser {
  async parseContent(content: string): Promise<Result<MarkdownParseResult, ParseError>>
  parseContentSync(content: string): Result<MarkdownParseResult, ParseError>
  
  // Utility methods
  extractTokensByType(ast: Token[], tokenType: string): Token[]
  findCodeBlocks(ast: Token[], language?: string): Token[]
  extractTextContent(ast: Token[]): string
}

interface MarkdownParseResult {
  ast: MarkdownAST;
  rawContent: string;
  tokenCount: number;
  processingTime: number;
}
```

**Features:**
- GitHub Flavored Markdown support
- Content normalization
- AST validation
- Utility methods for content extraction
- Performance monitoring

### BaseAnalyzer

Abstract base class for content analyzers with standardized error handling.

```typescript
abstract class BaseAnalyzer implements ContentAnalyzer {
  abstract readonly name: string;
  abstract analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult>;
  
  // Protected utility methods
  protected createError(code: string, message: string, details?: any, line?: number): ParseError
  protected createWarning(code: string, message: string, details?: any, line?: number): ParseError
  protected createResult(data: any, confidence: number, sources?: string[], errors?: ParseError[]): AnalysisResult
}
```

**Features:**
- Standardized error and warning creation
- Confidence score normalization
- Consistent result formatting
- Component-specific error tracking

### ResultAggregator

Combines multiple analyzer outputs into unified ProjectInfo structure.

```typescript
class ResultAggregator {
  async aggregate(results: Map<string, AnalysisResult>): Promise<ProjectInfo>
  getErrors(): ParseError[]
  getWarnings(): ParseError[]
}
```

**Features:**
- Multi-analyzer result combination
- Confidence score calculation with weighted averages
- Error and warning collection
- Graceful handling of partial failures
- Data normalization and validation

### ReadmeParserImpl

Main orchestration class for README parsing.

```typescript
class ReadmeParserImpl implements ReadmeParser {
  async parseFile(filePath: string): Promise<ParseResult>
  async parseContent(content: string): Promise<ParseResult>
  registerAnalyzer(analyzer: ContentAnalyzer): void
}

interface ParseResult {
  success: boolean;
  data?: ProjectInfo;
  errors?: ParseError[];
  warnings?: string[];
}
```

**Features:**
- Analyzer orchestration
- Parallel analysis execution
- Result aggregation via ResultAggregator
- Error collection and handling

## Error Handling

All operations use the Result pattern for consistent error handling:

```typescript
type Result<T, E = ParseError> = 
  | { success: true; data: T }
  | { success: false; error: E };

interface ParseError {
  code: string;
  message: string;
  component: string;
  severity: ErrorSeverity;
  details?: any;
  line?: number;
  column?: number;
}
```

## Usage Examples

### Basic File Parsing

```typescript
import { ReadmeParserImpl } from './parser/readme-parser';

const parser = new ReadmeParserImpl();
const result = await parser.parseFile('README.md');

if (result.success) {
  console.log('Project info:', result.data);
} else {
  console.error('Parse errors:', result.errors);
}
```

### Content Analysis

```typescript
import { MarkdownParser } from './parser/utils/markdown-parser';

const parser = new MarkdownParser();
const result = await parser.parseContent(readmeContent);

if (result.success) {
  const codeBlocks = parser.findCodeBlocks(result.data.ast, 'javascript');
  const textContent = parser.extractTextContent(result.data.ast);
}
```