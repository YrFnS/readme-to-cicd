const { ReadmeParserImpl } = require('./dist/parser/readme-parser');

async function testIntegration() {
  console.log('🔧 Testing README Parser Integration...');
  
  const parser = new ReadmeParserImpl({
    useIntegrationPipeline: true,
    enablePerformanceMonitoring: false,
    enableCaching: false
  });

  const testContent = `
# My Node.js Project

A simple Node.js application.

## Installation

\`\`\`bash
npm install
npm test
npm start
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
`;

  try {
    console.log('📝 Parsing test content...');
    const result = await parser.parseContent(testContent);
    
    console.log('✅ Parse result:', {
      success: result.success,
      hasData: !!result.data,
      errorCount: result.errors?.length || 0,
      warningCount: result.warnings?.length || 0
    });

    if (result.success && result.data) {
      console.log('📊 Languages detected:', result.data.languages?.length || 0);
      console.log('🔧 Commands found:', {
        install: result.data.commands?.install?.length || 0,
        test: result.data.commands?.test?.length || 0,
        build: result.data.commands?.build?.length || 0,
        run: result.data.commands?.run?.length || 0
      });
      
      // Check if commands have language associations
      const allCommands = [
        ...(result.data.commands?.install || []),
        ...(result.data.commands?.test || []),
        ...(result.data.commands?.build || []),
        ...(result.data.commands?.run || [])
      ];
      
      console.log('🏷️ Command language associations:');
      allCommands.forEach((cmd, i) => {
        console.log(`  ${i + 1}. "${cmd.command}" -> language: ${cmd.language || 'MISSING'}`);
      });
      
      if (allCommands.length > 0 && allCommands.every(cmd => cmd.language)) {
        console.log('✅ SUCCESS: All commands have language associations!');
      } else {
        console.log('❌ ISSUE: Some commands missing language associations');
      }
    }

    if (result.errors?.length > 0) {
      console.log('❌ Errors:', result.errors.map(e => e.message));
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
  }
}

testIntegration().catch(console.error);