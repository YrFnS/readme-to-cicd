const { CommandExtractor } = require('./dist/parser/analyzers/command-extractor.js');
const { MarkdownParser } = require('./dist/parser/utils/markdown-parser.js');

async function debugCommandExtractor() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();
  
  const content = `
# Test Project

\`\`\`bash
npm run build
npm test
cargo build
go test
\`\`\`
`;

  console.log('Testing CommandExtractor...');
  
  try {
    const parseResult = await parser.parseContent(content);
    console.log('Parse result:', parseResult.success);
    
    if (parseResult.success) {
      const result = await extractor.analyze(parseResult.data.ast, content);
      console.log('Analysis result:', result.success);
      console.log('Commands found:');
      
      if (result.success && result.data) {
        console.log('Build commands:', result.data.build.map(cmd => ({
          command: cmd.command,
          language: cmd.language,
          confidence: cmd.confidence
        })));
        
        console.log('Test commands:', result.data.test.map(cmd => ({
          command: cmd.command,
          language: cmd.language,
          confidence: cmd.confidence
        })));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCommandExtractor();