/**
 * Debug script to test integration pipeline context inheritance
 */

const { IntegrationPipeline } = require('./dist/parser/integration-pipeline');

async function debugIntegration() {
  console.log('🔍 Testing Integration Pipeline Context Inheritance...\n');

  const pipeline = new IntegrationPipeline({
    enableLogging: true,
    logLevel: 'debug'
  });

  const testContent = `
# Python Build

\`\`\`bash
python setup.py build
python -m build
pip install .
\`\`\`

\`\`\`javascript
npm install
npm test
npm run build
\`\`\`
  `;

  try {
    console.log('📝 Test Content:');
    console.log(testContent);
    console.log('\n🚀 Executing pipeline...\n');

    const result = await pipeline.execute(testContent);

    console.log('\n📊 Pipeline Result:');
    console.log('Success:', result.success);
    
    if (result.success && result.data) {
      console.log('\n🎯 Commands found:');
      if (result.data.commands) {
        console.log('Build commands:', result.data.commands.build?.length || 0);
        console.log('Test commands:', result.data.commands.test?.length || 0);
        console.log('Install commands:', result.data.commands.install?.length || 0);
        
        // Show first few commands with their languages
        const allCommands = [
          ...(result.data.commands.build || []),
          ...(result.data.commands.test || []),
          ...(result.data.commands.install || [])
        ];
        
        console.log('\n📋 Command Details:');
        allCommands.slice(0, 5).forEach((cmd, i) => {
          console.log(`${i + 1}. "${cmd.command}" - Language: ${cmd.language} - Confidence: ${cmd.confidence}`);
        });
      }
      
      if (result.data.languages) {
        console.log('\n🌐 Languages detected:');
        result.data.languages.forEach(lang => {
          console.log(`- ${lang.name}: ${lang.confidence.toFixed(2)} confidence`);
        });
      }
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => {
        console.log(`- ${error.code}: ${error.message}`);
      });
    }

    if (result.pipelineMetadata) {
      console.log('\n⚙️ Pipeline Metadata:');
      console.log('Completed stages:', result.pipelineMetadata.completedStages);
      console.log('Failed stages:', result.pipelineMetadata.failedStages);
      console.log('Execution time:', result.pipelineMetadata.executionTime, 'ms');
    }

  } catch (error) {
    console.error('💥 Pipeline execution failed:', error.message);
    console.error(error.stack);
  }
}

// Run the debug
debugIntegration().catch(console.error);