const { MarkdownParser } = require('./src/shared/markdown-parser');
const { LanguageDetector } = require('./src/parser/analyzers/language-detector');

async function debugLanguageDetection() {
  const parser = new MarkdownParser();
  const detector = new LanguageDetector();
  
  const content = `
# Test Project

\`\`\`js
const app = require('express')();
\`\`\`
  `;
  
  console.log('Content:', content);
  
  const parseResult = parser.parseContentSync(content);
  console.log('Parse success:', parseResult.success);
  
  if (parseResult.success) {
    console.log('AST:', JSON.stringify(parseResult.data.ast, null, 2));
    
    const result = await detector.analyze(parseResult.data.ast, content);
    console.log('Detection result:', JSON.stringify(result, null, 2));
  }
}

debugLanguageDetection().catch(console.error);