// Quick debug script to test command extraction
const { CommandExtractor } = require('./src/parser/analyzers/command-extractor.ts');
const { MarkdownParser } = require('./src/parser/utils/markdown-parser.ts');

async function testCommandExtraction() {
  const content = `# Commands without clear language indicators

\`\`\`bash
build-app
run-tests
deploy-service
\`\`\`
`;

  const parser = new MarkdownParser();
  const parseResult = await parser.parseContent(content);
  
  if (!parseResult.success) {
    console.error('Parse failed:', parseResult.errors);
    return;
  }

  const extractor = new CommandExtractor();
  
  // Set language context
  const parentContext = {
    language: 'Go',
    confidence: 0.8,
    sourceRange: { startLine: 0, endLine: 10, startColumn: 0, endColumn: 0 },
    evidence: [],
    metadata: { createdAt: new Date(), source: 'parent' }
  };
  
  extractor.setLanguageContexts([parentContext]);
  
  const result = await extractor.analyze(parseResult.data.ast, content);
  
  console.log('Extraction result:', JSON.stringify(result, null, 2));
  
  if (result.success && result.data) {
    console.log('Commands found:');
    console.log('Build:', result.data.build);
    console.log('Test:', result.data.test);
    console.log('Run:', result.data.run);
    console.log('Install:', result.data.install);
    console.log('Other:', result.data.other);
  }
}

testCommandExtraction().catch(console.error);