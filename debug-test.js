const { ReadmeParserImpl } = require('./dist/src/parser/readme-parser.js');

async function debugTest() {
  const parser = new ReadmeParserImpl();
  
  const content = `
# Go Build

\`\`\`bash
go build
go build -o myapp
go install
\`\`\`
  `;

  console.log('Testing with content:', content);
  
  const result = await parser.parseContent(content);
  
  console.log('Parse result success:', result.success);
  if (result.success) {
    console.log('Commands found:', result.data.commands);
    console.log('Build commands:', result.data.commands.build);
    console.log('Languages detected:', result.data.languages);
  } else {
    console.log('Errors:', result.errors);
  }
}

debugTest().catch(console.error);