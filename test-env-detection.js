// Quick test to validate the environment variable detection change
const { MetadataExtractor } = require('./src/parser/analyzers/metadata-extractor');
const { MarkdownParser } = require('./src/parser/utils/markdown-parser');

async function testEnvDetection() {
  const extractor = new MetadataExtractor();
  const markdownParser = new MarkdownParser();

  // Test content with code block without language specification
  const content = `
# My Project

## Environment Setup

\`\`\`
export NODE_ENV=production
export DATABASE_URL=postgresql://localhost:5432/mydb
export API_KEY=your-api-key-here
\`\`\`

## Usage

Run the application with the environment variables set.
  `;

  console.log('Testing environment variable detection in code blocks without language specification...');
  
  const parseResult = markdownParser.parseContentSync(content);
  if (!parseResult.success) {
    console.error('Parse failed:', parseResult.error);
    return;
  }

  const result = await extractor.analyze(parseResult.data.ast, content);
  
  if (!result.success) {
    console.error('Analysis failed:', result.error);
    return;
  }

  const metadata = result.data;
  console.log('Environment variables found:', metadata.environment?.length || 0);
  
  if (metadata.environment) {
    metadata.environment.forEach(env => {
      console.log(`- ${env.name}: ${env.defaultValue || 'no default'} (${env.description || 'no description'})`);
    });
  }

  // Check if our expected variables were found
  const expectedVars = ['NODE_ENV', 'DATABASE_URL', 'API_KEY'];
  const foundVars = metadata.environment?.map(env => env.name) || [];
  
  console.log('\nValidation:');
  expectedVars.forEach(varName => {
    const found = foundVars.includes(varName);
    console.log(`${varName}: ${found ? '✅ Found' : '❌ Missing'}`);
  });
}

testEnvDetection().catch(console.error);