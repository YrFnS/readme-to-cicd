import { CommandExtractor } from './src/parser/analyzers/command-extractor';
import { MarkdownParser } from './src/parser/utils/markdown-parser';

async function debugTest() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();

  const content = `
# Node.js Project

\`\`\`bash
npm install express
npm run dev
\`\`\`
  `;

  const jsContext = {
    language: 'JavaScript',
    confidence: 0.9,
    sourceRange: { startLine: 2, endLine: 5, startColumn: 0, endColumn: 0 },
    evidence: [],
    metadata: { createdAt: new Date(), source: 'test' }
  };

  const parseResult: any = await parser.parseContent(content);
  console.log('Parse result success:', parseResult.success);
  
  if (parseResult.success && parseResult.data) {
    const result = extractor.extractWithContext(parseResult.data.ast, content, [jsContext]);
    console.log('Total commands:', result.commands.length);
    console.log('Extraction metadata:', result.extractionMetadata);
    
    result.commands.forEach((command: any, index: number) => {
      console.log(`Command ${index}:`, command.command);
      console.log(`  Language:`, command.languageContext?.language);
      console.log(`  Confidence:`, command.contextConfidence);
      console.log(`  Metadata source:`, command.languageContext?.metadata?.source);
    });
  } else {
    console.log('Parse failed');
  }
}

debugTest().catch(console.error);