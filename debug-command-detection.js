// Debug script to test command detection
const { CommandExtractor } = require('./dist/parser/analyzers/command-extractor.js');
const { MarkdownParser } = require('./dist/parser/utils/markdown-parser.js');

async function debugCommandDetection() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();
  
  const testContent = `
# Test Project

## Build Commands

\`\`\`bash
make
make all
make build
\`\`\`
  `;
  
  console.log('Testing command detection...');
  
  try {
    const parseResult = await parser.parseContent(testContent);
    
    if (parseResult.success) {
      console.log('Parse successful!');
      
      // Test the CommandExtractor directly
      const result = await extractor.analyze(parseResult.data.ast, testContent);
      
      console.log('CommandExtractor result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('Commands found:', result.data);
        console.log('Build commands:', result.data.build);
        console.log('Other commands:', result.data.other);
      } else {
        console.log('CommandExtractor failed:', result.error);
      }
    } else {
      console.log('Parse failed:', parseResult.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCommandDetection();