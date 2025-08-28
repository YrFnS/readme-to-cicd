/**
 * Simple debug script to test the parser
 */

async function debugParser() {
  console.log('🔍 Starting simple parser debug...');
  
  try {
    // Import the compiled JavaScript
    const { ReadmeParserImpl } = await import('./dist/parser/readme-parser.js');
    
    console.log('✅ Successfully imported ReadmeParserImpl');
    
    // Create parser without pipeline first
    const parser = new ReadmeParserImpl(undefined, { 
      enableCaching: false, 
      enablePerformanceMonitoring: false,
      useIntegrationPipeline: false
    });
    
    console.log('✅ Created parser instance');
    
    // Simple test content
    const testContent = `
# Test Project

A simple test project.

## Installation

\`\`\`bash
npm install
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
      console.log('Metadata name:', result.data.metadata?.name);
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

debugParser().catch(console.error);