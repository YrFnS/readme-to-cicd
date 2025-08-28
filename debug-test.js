/**
 * Debug test to see what's happening in the test environment
 */

const { ReadmeParserImpl } = require('./dist/parser/readme-parser');
const { IntegrationPipeline } = require('./dist/parser/integration-pipeline');

async function debugTest() {
  console.log('🔍 Starting test environment debug...');
  
  try {
    // Create parser exactly like the test
    const pipeline = new IntegrationPipeline();
    const parser = new ReadmeParserImpl(pipeline, { 
      enableCaching: false, 
      enablePerformanceMonitoring: false 
    });
    console.log('✅ Parser instance created like test');
    
    // Use exact same content as test
    const readmeContent = `
# Node.js Project

A TypeScript application with testing.

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

    console.log('🔄 Testing parseContent with test content...');
    const result = await parser.parseContent(readmeContent);
    
    console.log('📊 Parse result:', {
      success: result.success,
      hasData: !!result.data,
      hasErrors: !!result.errors,
      errorCount: result.errors ? result.errors.length : 0
    });
    
    if (!result.success) {
      console.log('❌ Parse errors:');
      result.errors?.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.code}] ${error.message} (${error.component})`);
      });
    } else {
      console.log('✅ Parse successful!');
      console.log('📈 Confidence scores:', result.data?.confidence);
      console.log('🔤 Languages found:', result.data?.languages?.length || 0);
      console.log('📦 Dependencies found:', result.data?.dependencies?.packages?.length || 0);
      console.log('⚡ Commands found:', Object.keys(result.data?.commands || {}).length);
    }
    
    // Test cleanup like the test
    if (pipeline && typeof pipeline.cleanup === 'function') {
      pipeline.cleanup();
      console.log('🧹 Pipeline cleanup completed');
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugTest().then(() => {
  console.log('🏁 Debug completed');
}).catch(error => {
  console.error('💥 Debug script failed:', error);
});