const { ReadmeParserImpl } = require('./src/parser/readme-parser');

async function testIntegration() {
  console.log('Testing ReadmeParser integration...');
  
  const parser = new ReadmeParserImpl();
  
  const content = `
# Test Project

This is a Python project.

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Testing

\`\`\`bash
pytest
python -m unittest
\`\`\`
`;

  try {
    const result = await parser.parseContent(content);
    
    console.log('Parse result success:', result.success);
    
    if (result.success) {
      console.log('Languages detected:', result.data.languages.length);
      console.log('Commands found:', {
        install: result.data.commands.install.length,
        test: result.data.commands.test.length,
        build: result.data.commands.build.length,
        run: result.data.commands.run.length,
        other: result.data.commands.other.length
      });
      
      // Check if commands have language associations
      const allCommands = [
        ...result.data.commands.install,
        ...result.data.commands.test,
        ...result.data.commands.build,
        ...result.data.commands.run,
        ...result.data.commands.other
      ];
      
      console.log('Command language associations:');
      allCommands.forEach(cmd => {
        console.log(`  ${cmd.command} -> ${cmd.language || 'undefined'}`);
      });
      
    } else {
      console.log('Parse failed with errors:', result.errors);
    }
    
  } catch (error) {
    console.error('Test failed with exception:', error);
  }
}

testIntegration();