/**
 * Debug script to test parser functionality
 */

const { ReadmeParserImpl } = require('./dist/parser/readme-parser');

async function debugParser() {
  console.log('🔍 Starting parser debug...');
  
  try {
    // Create parser instance with same options as test
    const { IntegrationPipeline } = require('./dist/parser/integration-pipeline');
    const pipeline = new IntegrationPipeline();
    const parser = new ReadmeParserImpl(pipeline, { 
      enableCaching: false, 
      enablePerformanceMonitoring: false 
    });
    console.log('✅ Parser instance created with test options');
    
    // Test with exact same content as the test
    const testContent = `
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

    console.log('🔄 Testing parseContent...');
    const result = await parser.parseContent(testContent);
    
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
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugParser().then(() => {
  console.log('🏁 Debug completed');
}).catch(error => {
  console.error('💥 Debug script failed:', error);
});