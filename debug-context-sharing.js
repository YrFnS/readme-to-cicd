/**
 * Debug script to test context sharing implementation
 */

const { ReadmeParserImpl } = require('./src/parser/readme-parser');
const { IntegrationPipeline } = require('./src/integration/integration-pipeline');

async function debugContextSharing() {
  console.log('🔍 Starting context sharing debug...');
  
  try {
    // Create pipeline and parser
    const pipeline = new IntegrationPipeline();
    const parser = new ReadmeParserImpl(pipeline, { 
      enableCaching: false, 
      enablePerformanceMonitoring: false 
    });
    
    console.log('✅ Created parser and pipeline');
    
    // Simple test content
    const testContent = `
# Test Project

A simple Node.js project for testing.

## Installation

\`\`\`bash
npm install
npm test
\`\`\`
    `;
    
    console.log('📝 Testing with simple content...');
    
    // Try to parse
    const result = await parser.parseContent(testContent);
    
    console.log('📊 Parse result:', {
      success: result.success,
      hasData: !!result.data,
      errorCount: result.errors?.length || 0,
      errors: result.errors?.map(e => ({ code: e.code, message: e.message })) || []
    });
    
    if (result.success && result.data) {
      console.log('✅ Parse successful!');
      console.log('Languages:', result.data.languages?.length || 0);
      console.log('Commands:', Object.keys(result.data.commands || {}));
    } else {
      console.log('❌ Parse failed');
      if (result.errors) {
        result.errors.forEach(error => {
          console.log(`  - ${error.code}: ${error.message}`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Debug script error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugContextSharing().catch(console.error);