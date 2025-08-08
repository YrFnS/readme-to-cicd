const { CommandExtractor } = require('./src/parser/analyzers/command-extractor');
const { MarkdownParser } = require('./src/parser/utils/markdown-parser');

async function debugCommandExtractor() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();
  
  const content = `
# Build Instructions

\`\`\`bash
npm run build
npm run build:prod
yarn build
yarn run build
\`\`\`
  `;

  console.log('Content:', content);
  
  const parseResult = await parser.parseContent(content);
  console.log('Parse result success:', parseResult.success);
  console.log('AST structure:', JSON.stringify(parseResult.data?.ast, null, 2));
  
  const result = await extractor.analyze(parseResult.data.ast, content);
  console.log('Extraction result:', JSON.stringify(result, null, 2));
}

debugCommandExtractor().catch(console.error);