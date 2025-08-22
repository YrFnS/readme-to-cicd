import { OrchestrationEngine } from './orchestration-engine';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Simple integration test to verify the orchestration engine works
 */
async function runIntegrationTest() {
  console.log('🚀 Starting Integration Test...');

  // Create test directory
  const testDir = join(process.cwd(), 'temp', 'integration-test');
  mkdirSync(testDir, { recursive: true });

  // Create a sample README file
  const sampleReadme = `# My Node.js Project

A sample Node.js application with React frontend.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Dependencies

- React 18.x
- Node.js 18+
- TypeScript
`;

  const readmePath = join(testDir, 'README.md');
  writeFileSync(readmePath, sampleReadme);

  // Initialize orchestration engine
  const engine = new OrchestrationEngine();

  try {
    // Test 1: System health check
    console.log('📋 Testing system health...');
    const healthResult = await engine.validateSystemHealth();
    if (!healthResult.success) {
      throw new Error(`Health check failed: ${healthResult.error.message}`);
    }
    console.log('✅ System health check passed');

    // Test 2: Get system status
    console.log('📊 Checking system status...');
    const status = engine.getSystemStatus();
    console.log('System Status:', JSON.stringify(status, null, 2));

    if (!status.ready) {
      throw new Error('System is not ready');
    }
    console.log('✅ System status check passed');

    // Test 3: Process workflow request
    console.log('⚙️ Processing workflow request...');
    const workflowResult = await engine.processWorkflowRequest({
      readmePath,
      outputDir: join(testDir, '.github', 'workflows'),
      workflowTypes: ['ci'],
      dryRun: true
    });

    if (!workflowResult.success) {
      throw new Error(`Workflow processing failed: ${workflowResult.error.message}`);
    }

    console.log('✅ Workflow processing completed');
    console.log('Generated files:', workflowResult.data.generatedFiles);
    console.log('Detected frameworks:', workflowResult.data.detectedFrameworks);

    console.log('🎉 Integration test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runIntegrationTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runIntegrationTest };