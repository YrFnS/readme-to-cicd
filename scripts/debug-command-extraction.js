const { MarkdownParser } = require('./src/parser/utils/markdown-parser');
const { CommandExtractor } = require('./src/parser/analyzers/command-extractor');

async function debugCommandExtraction() {
  const parser = new MarkdownParser();
  const extractor = new CommandExtractor();
  
  const content = `
# Java Build with Gradle

\`\`\`bash
gradle build
./gradlew build
gradlew build
gradle assemble
\`\`\`

## Installation

\`\`\`bash
npm install
yarn install
\`\`\`
  `;

  console.log('=== DEBUG: Command Extraction ===');
  console.log('Content:', content);
  
  try {
    const parseResult = await parser.parseContent(content);
    console.log('Parse result success:', parseResult.success);
    
    if (parseResult.success) {
      console.log('AST type:', typeof parseResult.data?.ast);
      console.log('AST length:', Array.isArray(parseResult.data?.ast) ? parseResult.data.ast.length : 'not array');
      
      const result = await extractor.analyze(parseResult.data.ast, content);
      console.log('Extraction result success:', result.success);
      
      if (result.success) {
        const commandInfo = result.data;
        console.log('Build commands:', commandInfo.build);
        console.log('Install commands:', commandInfo.install);
        console.log('All commands:', {
          build: commandInfo.build.length,
          install: commandInfo.install.length,
          test: commandInfo.test.length,
          run: commandInfo.run.length,
          other: commandInfo.other.length
        });
      } else {
        console.log('Extraction errors:', result.errors);
      }
    } else {
      console.log('Parse errors:', parseResult.errors);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCommandExtraction();