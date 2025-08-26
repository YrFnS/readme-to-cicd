const { PythonWorkflowGenerator } = require('./dist/generator/templates/python-generator.js');
const { TemplateManager } = require('./dist/generator/templates/template-manager.js');
const path = require('path');

async function debugTestData() {
  console.log('=== DEBUG: Test Data Generation ===');
  
  // Initialize template manager like the test does
  const config = {
    baseTemplatesPath: path.resolve(process.cwd(), 'templates/frameworks'),
    cacheEnabled: true,
    reloadOnChange: false
  };
  const templateManager = new TemplateManager(config);
  const generator = new PythonWorkflowGenerator(templateManager);
  
  // Debug template loading
  console.log('Template config:', config);
  console.log('Templates path exists:', require('fs').existsSync(config.baseTemplatesPath));
  
  // Use the same data format as the failing test
  const detectionResult = {
    languages: [{ 
      name: 'Python', 
      version: '3.11', 
      confidence: 0.9, 
      primary: true 
    }],
    frameworks: [
      { 
        name: 'python', 
        confidence: 0.8, 
        evidence: ['Python language detected'], 
        category: 'backend' 
      },
      { 
        name: 'django', 
        confidence: 0.9, 
        evidence: ['manage.py', 'settings.py'], 
        category: 'backend' 
      }
    ],
    packageManagers: [{ 
      name: 'pip', 
      lockFile: 'requirements.txt', 
      confidence: 0.8 
    }],
    testingFrameworks: [{ 
      name: 'pytest', 
      type: 'unit', 
      confidence: 0.8 
    }],
    buildTools: [
      { name: 'flake8', confidence: 0.7 },
      { name: 'mypy', confidence: 0.6 }
    ],
    deploymentTargets: [],
    projectMetadata: {
      name: 'Django Test Project',
      description: 'A test Django project',
      version: '1.0.0'
    }
  };

  console.log('Input detectionResult:', JSON.stringify(detectionResult, null, 2));

  try {
    // Call the same method that the test calls
    const result = await generator.generateWorkflow(detectionResult);
    console.log('SUCCESS: Generated workflow');
    console.log('Result keys:', Object.keys(result));
    console.log('Filename:', result.filename);
    console.log('Content length:', result.content.length);
    console.log('First 500 chars:', result.content.substring(0, 500));
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugTestData().catch(console.error);