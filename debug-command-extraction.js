const { CommandExtractor } = require('./src/parser/analyzers/command-extractor.js');
const { MarkdownParser } = require('./src/parser/utils/markdown-parser.js');

async function debugCommandExtraction() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();
  
  const content = `
# Go Build

\`\`\`bash
go build
go build -o myapp
go install
\`\`\`
  `;

  console.log('Testing with content:', content);
  
  const parseResult = await parser.parseContent(content);
  console.log('Parse result success:', parseResult.success);
  
  if (parseResult.success) {
    console.log('AST structure:', JSON.stringify(parseResult.data.ast, null, 2));
    
    const result = await extractor.analyze(parseResult.data.ast, content);
    console.log('Extractor result success:', result.success);
    
    if (result.success) {
      console.log('Commands found:', result.data);
      console.log('Build commands:', result.data.build);
    } else {
      console.log('Extractor errors:', result.errors);
    }
  } else {
    console.log('Parse errors:', parseResult.error);
  }
}

debugCommandExtraction().catch(console.error);