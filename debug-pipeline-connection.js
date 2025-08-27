/**
 * Debug script to test pipeline connection
 */

const { ReadmeParserImpl } = require('./src/parser/readme-parser');
const { IntegrationPipeline } = require('./src/integration/integration-pipeline');

async function testPipelineConnection() {
  console.log('🔍 Testing pipeline connection...');
  
  try {
    // Test 1: Create parser without pipeline
    console.log('\n1. Testing parser without pipeline:');
    const parserWithoutPipeline = new ReadmeParserImpl();
    const analyzerInfo1 = parserWithoutPipeline.getAnalyzerInfo();
    console.log('Analyzer info:', analyzerInfo1);
    
    // Test 2: Create parser with pipeline
    console.log('\n2. Testing parser with pipeline:');
    const pipeline = new IntegrationPipeline();
    const parserWithPipeline = new ReadmeParserImpl(pipeline);
    const analyzerInfo2 = parserWithPipeline.getAnalyzerInfo();
    console.log('Analyzer info:', analyzerInfo2);
    
    // Test 3: Try parsing simple content
    console.log('\n3. Testing content parsing:');
    const testContent = `
# Test Project

A simple Node.js project.

## Installation
\`\`\`bash
npm install
npm test
\`\`\`
    `;
    
    console.log('Parsing with pipeline...');
    const result = await parserWithPipeline.parseContent(testContent);
    console.log('Parse result:', {
      success: result.success,
      hasData: !!result.data,
      errors: result.errors?.length || 0,
      warnings: result.warnings?.length || 0
    });
    
    if (result.errors && result.errors.length > 0) {
      console.log('Errors:', result.errors);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPipelineConnection().catch(console.error);