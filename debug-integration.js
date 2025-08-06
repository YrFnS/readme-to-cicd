const { IntegrationPipeline } = require('./dist/parser/integration-pipeline.js');

async function debugIntegration() {
  const pipeline = new IntegrationPipeline({
    enableLogging: true,
    logLevel: 'debug'
  });
  
  const content = `
# Go Build

\`\`\`bash
go build
go build -o myapp
go install
\`\`\`
  `;

  console.log('Testing integration pipeline with content:', content);
  
  try {
    const result = await pipeline.execute(content);
    console.log('Pipeline result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Pipeline error:', error);
  }
}

debugIntegration().catch(console.error);