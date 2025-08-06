const { ReadmeParserImpl } = require('./dist/parser/readme-parser.js');

async function testIntegration() {
  console.log('Testing integration fixes...');
  
  const parser = new ReadmeParserImpl({
    useIntegrationPipeline: true,
    enableLogging: true
  });
  
  const content = `# Test Project

This is a Node.js project with TypeScript.

## Installation
\`\`\`bash
npm install
npm test
npm run build
\`\`\`

## Development
\`\`\`javascript
const app = require('./app');
app.listen(3000);
\`\`\`
`;

  try {
    const result = await parser.parseContent(content);
    
    console.log('Parse result success:', result.success);
    
    if (result.success && result.data) {
      console.log('Languages detected:', result.data.languages.length);
      result.data.languages.forEach(lang => {
        console.log(`  - ${lang.name}: confidence ${lang.confidence.toFixed(2)}`);
      });
      
      console.log('Commands extracted:');
      console.log('  Install:', result.data.commands.install.length);
      console.log('  Test:', result.data.commands.test.length);
      console.log('  Build:', result.data.commands.build.length);
      
      // Check if commands have language property
      const allCommands = [
        ...result.data.commands.install,
        ...result.data.commands.test,
        ...result.data.commands.build
      ];
      
      console.log('Command language inheritance:');
      allCommands.forEach(cmd => {
        console.log(`  "${cmd.command}" -> language: ${cmd.language || 'MISSING'}`);
      });
    }
    
    if (result.errors) {
      console.log('Errors:', result.errors.length);
      result.errors.forEach(err => console.log(`  - ${err.message}`));
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testIntegration();