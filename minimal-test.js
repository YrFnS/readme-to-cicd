// Minimal test that bypasses IntegrationPipeline completely
const { ReadmeParserImpl } = require('./dist/parser/readme-parser.js');

async function testMinimalParser() {
  try {
    console.log('Creating parser with useIntegrationPipeline = false...');
    
    // Create parser without IntegrationPipeline
    const parser = new ReadmeParserImpl();
    
    // Disable integration pipeline
    parser.useIntegrationPipeline = false;
    
    console.log('Reading test file content...');
    const fs = require('fs');
    const content = fs.readFileSync('./test-readme.md', 'utf8');
    
    console.log('Parsing content with manual analysis...');
    const result = await parser.parseContent(content);
    
    if (result.success) {
      console.log('✅ Minimal Parser Working!');
      console.log('📊 Analysis Results:');
      console.log('- Languages detected:', result.data.languages?.length || 0);
      console.log('- Commands found:', Object.keys(result.data.commands || {}).length);
      console.log('- Dependencies found:', result.data.dependencies?.length || 0);
      
      if (result.data.languages?.length > 0) {
        console.log('🔍 Detected Languages:');
        result.data.languages.forEach(lang => {
          console.log(`  - ${lang.name} (confidence: ${lang.confidence})`);
        });
      }
      
      if (Object.keys(result.data.commands || {}).length > 0) {
        console.log('⚡ Found Commands:');
        Object.entries(result.data.commands).forEach(([cmd, info]) => {
          console.log(`  - ${cmd}: ${info.description || 'No description'}`);
        });
      }
    } else {
      console.log('❌ Minimal parser failed');
      console.log('Errors:', result.errors);
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testMinimalParser();