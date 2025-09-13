import { CommandExtractor } from './src/parser/analyzers/command-extractor';
import { MarkdownParser } from './src/parser/utils/markdown-parser';

async function debugTest() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();

  const content = `# Unknown Project

\`\`\`bash
some-unknown-command
another-command --flag
\`\`\`
  `;

  const parseResult: any = await parser.parseContent(content);
  console.log('Parse result success:', parseResult.success);
  console.log('Parse result data:', parseResult.data);

  if (parseResult.success && parseResult.data) {
    const result = extractor.extractWithContext(parseResult.data.ast, content, []);
    console.log('Extract result:', result);

    result.commands.forEach((command: any, index: number) => {
      console.log(`Command ${index}:`, command.command);
      console.log(`  Language:`, command.languageContext?.language);
      console.log(`  Confidence:`, command.contextConfidence);
      console.log(`  Metadata source:`, command.languageContext?.metadata?.source);
    });
  } else {
    console.log('Parse failed:', parseResult.error);
  }
}

debugTest().catch(console.error);