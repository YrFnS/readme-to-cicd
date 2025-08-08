// Quick debug script to test command extraction
const { ReadmeParserImpl } = require('./dist/parser/readme-parser.js');

async function debugCommandExtraction() {
  const parser = new ReadmeParserImpl();
  
  const testContent = `
# Test Project

## Build Commands

\`\`\`bash
make
make all
make build
\`\`\`
  `;
  
  console.log('Testing command extraction...');
  console.log('Content:', testContent);
  
  try {
    const result = await parser.parseContent(testContent);
    
    if (result.success) {
      console.log('Parse successful!');
      console.log('Commands found:', JSON.stringify(result.data.commands, null, 2));
      console.log('Build commands:', result.data.commands.build);
      console.log('Number of build commands:', result.data.commands.build.length);
    } else {
      console.log('Parse failed:', result.errors);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCommandExtraction();