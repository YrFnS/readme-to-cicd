// Simple test without IntegrationPipeline
const { ReadmeParserImpl } = require('./dist/parser/readme-parser.js');

async function testSimpleParser() {
  try {
    console.log('Creating parser without pipeline...');
    const parser = new ReadmeParserImpl(); // No pipeline
    
    console.log('Reading test file content...');
    const fs = require('fs');
    const content = fs.readFileSync('./test-readme.md', 'utf8');
    
    console.log('Parsing content directly...');
    const result = await parser.parseContent(content);
    
    if (result.success) {
      console.log('✅ Simple Parser Working!');
      console.log('📊 Analysis Results:');
      console.log('- Languages detected:', result.data.languages?.length || 0);
      console.log('- Commands found:', Object.keys(result.data.commands || {}).length);
      console.log('- Dependencies found:', result.data.dependencies?.length || 0);
    } else {
      console.log('❌ Simple parser failed');
      console.log('Errors:', result.errors);
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testSimpleParser();