/**
 * Simple integration test to verify our fixes
 */

const { ReadmeParserImpl } = require('./src/parser/readme-parser');

async function testIntegration() {
  console.log('Testing README Parser Integration...');
  
  const parser = new ReadmeParserImpl({
    useIntegrationPipeline: true,
    enableCaching: true,
    enablePerformanceMonitoring: true
  });
  
  const testContent = `
# My Node.js Project

A simple Node.js application with TypeScript.

## Installation

\`\`\`bash
npm install
npm run build
npm test
\`\`\`

## Development

\`\`\`bash
npm run dev
npm run lint
\`\`\`
`;

  try {
    console.log('Parsing content...');
    const result = await parser.parseContent(testContent);
    
    console.log('Result success:', result.success);
    console.log('Errors:', result.errors?.length || 0);
    console.log('Warnings:', result.warnings?.length || 0);
    
    if (result.success && result.data) {
      console.log('Languages detected:', result.data.languages?.length || 0);
      console.log('Commands found:', Object.keys(result.data.commands || {}).reduce((total, key) => total + (result.data.commands[key]?.length || 0), 0));
      console.log('Overall confidence:', result.data.confidence?.overall || 0);
      
      // Check if commands have language information
      const allCommands = Object.values(result.data.commands || {}).flat();
      const commandsWithLanguage = allCommands.filter(cmd => cmd.language);
      console.log('Commands with language info:', commandsWithLanguage.length, '/', allCommands.length);
      
      if (commandsWithLanguage.length > 0) {
        console.log('Sample command with language:', {
          command: commandsWithLanguage[0].command,
          language: commandsWithLanguage[0].language
        });
      }
    }
    
    console.log('Integration test completed successfully!');
    
  } catch (error) {
    console.error('Integration test failed:', error.message);
    console.error(error.stack);
  }
}

testIntegration();