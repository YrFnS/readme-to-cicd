# Basic Usage Examples

## File Reading Example

```typescript
import { FileReader } from '../src/parser/utils/file-reader';

const fileReader = new FileReader();

// Read a README file
const result = await fileReader.readFile('README.md');

if (result.success) {
  console.log(`File size: ${result.data.size} bytes`);
  console.log(`Content preview: ${result.data.content.substring(0, 100)}...`);
} else {
  console.error(`Error: ${result.error.message}`);
}
```

## Markdown Parsing Example

```typescript
import { MarkdownParser } from '../src/parser/utils/markdown-parser';

const parser = new MarkdownParser({
  gfm: true,        // GitHub Flavored Markdown
  breaks: false,    // Don't convert \n to <br>
  smartLists: true  // Use smarter list behavior
});

const content = `# My Project

This is a **Node.js** project.

\`\`\`javascript
console.log('Hello World');
\`\`\`

## Installation

\`\`\`bash
npm install
\`\`\`
`;

const result = await parser.parseContent(content);

if (result.success) {
  // Find all code blocks
  const codeBlocks = parser.findCodeBlocks(result.data.ast);
  console.log(`Found ${codeBlocks.length} code blocks`);
  
  // Find JavaScript code blocks specifically
  const jsBlocks = parser.findCodeBlocks(result.data.ast, 'javascript');
  console.log(`Found ${jsBlocks.length} JavaScript blocks`);
  
  // Extract all text content
  const textContent = parser.extractTextContent(result.data.ast);
  console.log(`Text content: ${textContent}`);
}
```

## Complete Parsing Example

```typescript
import { ReadmeParserImpl } from '../src/parser/readme-parser';
import { BaseAnalyzer } from '../src/parser/analyzers/base-analyzer';

// Example analyzer implementation
class SimpleLanguageAnalyzer extends BaseAnalyzer {
  readonly name = 'language';

  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    const codeBlocks = this.findCodeBlocks(ast);
    const languages = codeBlocks.map(block => ({
      name: block.lang || 'Unknown',
      confidence: 0.8,
      sources: ['code-block']
    }));

    return this.createResult(
      { languages },
      0.8,
      ['code-block']
    );
  }
}

const parser = new ReadmeParserImpl();

// Register analyzers
parser.registerAnalyzer(new SimpleLanguageAnalyzer());

// Parse a README file
const result = await parser.parseFile('README.md');

if (result.success) {
  const info = result.data!;
  
  console.log('Project Metadata:');
  console.log(`- Name: ${info.metadata.name || 'Unknown'}`);
  console.log(`- Description: ${info.metadata.description || 'No description'}`);
  
  console.log('\nDetected Languages:');
  info.languages.forEach(lang => {
    console.log(`- ${lang.name} (confidence: ${lang.confidence})`);
  });
  
  console.log('\nConfidence Scores:');
  console.log(`- Overall: ${info.confidence.overall}`);
  console.log(`- Languages: ${info.confidence.languages}`);
  console.log(`- Dependencies: ${info.confidence.dependencies}`);
} else {
  console.error('Parsing failed:');
  result.errors?.forEach(error => {
    console.error(`- ${error.code}: ${error.message}`);
  });
}
```

## Result Aggregation Example

```typescript
import { ResultAggregator } from '../src/parser/utils/result-aggregator';
import { AnalysisResult } from '../src/parser/types';

const aggregator = new ResultAggregator();

// Mock analyzer results
const results = new Map<string, AnalysisResult>([
  ['language', {
    data: {
      languages: [
        { name: 'TypeScript', confidence: 0.95, sources: ['code-block'] }
      ]
    },
    confidence: 0.95,
    sources: ['code-block']
  }],
  ['dependency', {
    data: {
      packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }],
      installCommands: [{ command: 'npm install', confidence: 0.9 }],
      packages: []
    },
    confidence: 0.9,
    sources: ['file-reference']
  }]
]);

// Aggregate results
const projectInfo = await aggregator.aggregate(results);

console.log('Aggregated Project Info:');
console.log(`- Languages: ${projectInfo.languages.length}`);
console.log(`- Package Files: ${projectInfo.dependencies.packageFiles.length}`);
console.log(`- Overall Confidence: ${projectInfo.confidence.overall}`);

// Check for errors and warnings
const errors = aggregator.getErrors();
const warnings = aggregator.getWarnings();

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(error => console.log(`- ${error.code}: ${error.message}`));
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  warnings.forEach(warning => console.log(`- ${warning.code}: ${warning.message}`));
}
```

## Error Handling Example

```typescript
import { FileReader } from '../src/parser/utils/file-reader';

const fileReader = new FileReader();

// Handle various error scenarios
const testFiles = [
  'README.md',           // Normal file
  'nonexistent.md',      // File not found
  '../../../etc/passwd', // Path traversal attempt
  ''                     // Empty path
];

for (const filePath of testFiles) {
  const result = await fileReader.readFile(filePath);
  
  if (result.success) {
    console.log(`✅ Successfully read ${filePath}`);
  } else {
    console.log(`❌ Failed to read ${filePath}:`);
    console.log(`   Code: ${result.error.code}`);
    console.log(`   Message: ${result.error.message}`);
    console.log(`   Component: ${result.error.component}`);
  }
}
```

## Integration Example

```typescript
import { FileReader } from '../src/parser/utils/file-reader';
import { MarkdownParser } from '../src/parser/utils/markdown-parser';

async function analyzeReadme(filePath: string) {
  const fileReader = new FileReader();
  const markdownParser = new MarkdownParser();
  
  // Step 1: Read the file
  const readResult = await fileReader.readFile(filePath);
  if (!readResult.success) {
    throw new Error(`Failed to read file: ${readResult.error.message}`);
  }
  
  // Step 2: Parse the markdown
  const parseResult = await markdownParser.parseContent(readResult.data.content);
  if (!parseResult.success) {
    throw new Error(`Failed to parse markdown: ${parseResult.error.message}`);
  }
  
  // Step 3: Analyze the content
  const { ast, rawContent, tokenCount, processingTime } = parseResult.data;
  
  return {
    fileInfo: {
      path: readResult.data.filePath,
      size: readResult.data.size,
      encoding: readResult.data.encoding
    },
    parseInfo: {
      tokenCount,
      processingTime,
      codeBlockCount: markdownParser.findCodeBlocks(ast).length,
      headingCount: markdownParser.extractTokensByType(ast, 'heading').length
    },
    content: {
      raw: rawContent,
      text: markdownParser.extractTextContent(ast)
    }
  };
}

// Usage
analyzeReadme('README.md')
  .then(analysis => {
    console.log('Analysis complete:', analysis);
  })
  .catch(error => {
    console.error('Analysis failed:', error.message);
  });
```