const { createReadmeParserWithPipeline } = require('./dist/parser/index.js');

async function testParser() {
  try {
    const parser = createReadmeParserWithPipeline();
    const result = await parser.parseFile('./test-readme.md');
    
    if (result.success) {
      console.log('✅ README Parser Working!');
      console.log('📊 Analysis Results:');
      console.log('- Languages detected:', result.data.languages?.length || 0);
      console.log('- Commands found:', Object.keys(result.data.commands || {}).length);
      console.log('- Dependencies found:', result.data.dependencies?.length || 0);
      console.log('- Overall confidence:', result.data.confidence?.overall || 'N/A');
      
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
      console.log('❌ Parser failed');
      if (result.errors) {
        console.log('Errors:', result.errors);
      }
      if (result.error) {
        console.log('Error:', result.error);
      }
      console.log('Full result:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testParser();