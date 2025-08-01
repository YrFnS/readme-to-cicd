import { LanguageDetector } from './src/parser/analyzers/language-detector';
import { MarkdownParser } from './src/parser/utils/markdown-parser';

async function testLanguageDetection() {
  const detector = new LanguageDetector();
  const parser = new MarkdownParser();
  
  const content = `
# JavaScript Project

This is a Node.js application built with TypeScript.

## Installation

\`\`\`bash
npm install
npm run build
npm test
\`\`\`

## Dependencies

- express
- typescript
- jest

The project uses package.json for dependency management.
  `;
  
  const parseResult = await parser.parseContent(content);
  if (!parseResult.success) {
    console.error('Parse failed:', parseResult.error);
    return;
  }
  
  const result = await detector.analyze(parseResult.data.ast, content);
  
  console.log('Detection result:', JSON.stringify(result, null, 2));
  
  if (result.success && result.data) {
    console.log('\nLanguages detected:');
    result.data.forEach(lang => {
      console.log(`- ${lang.name}: confidence=${lang.confidence}, sources=${lang.sources.join(', ')}`);
    });
  }
}

testLanguageDetection().catch(console.error);