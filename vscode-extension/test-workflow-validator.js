const { WorkflowValidator } = require('./out/src/core/WorkflowValidator.js');

async function testWorkflowValidator() {
  console.log('Testing WorkflowValidator...');
  
  const validator = new WorkflowValidator();
  
  const testWorkflow = {
    filename: 'test.yml',
    content: `
name: Test Workflow
on: [push]
permissions: write-all
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
    `,
    type: 'ci',
    relativePath: '.github/workflows/test.yml'
  };

  try {
    const result = await validator.validateWorkflow(testWorkflow);
    console.log('Validation completed successfully!');
    console.log('Overall Score:', result.overallScore);
    console.log('Security Vulnerabilities:', result.securityAnalysis.vulnerabilities.length);
    console.log('Performance Bottlenecks:', result.performanceAnalysis.bottlenecks.length);
    console.log('Optimization Suggestions:', result.optimizationSuggestions.length);
    
    const simulation = await validator.simulateWorkflow(testWorkflow);
    console.log('Simulation completed successfully!');
    console.log('Estimated Duration:', simulation.estimatedDuration, 'seconds');
    console.log('Execution Steps:', simulation.executionPlan.length);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    validator.dispose();
  }
}

testWorkflowValidator();