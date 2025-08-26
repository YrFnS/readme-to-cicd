const { PythonWorkflowGenerator } = require('./dist/generator/templates/python-generator.js');
const { TemplateManager } = require('./dist/generator/templates/template-manager.js');
const path = require('path');

async function debugExactTest() {
  console.log('=== DEBUG: Exact Test Replication ===');
  
  // Replicate the exact test setup
  const config = {
    baseTemplatesPath: path.resolve(process.cwd(), 'templates/frameworks'),
    cacheEnabled: true,
    reloadOnChange: false
  };
  const templateManager = new TemplateManager(config);
  const generator = new PythonWorkflowGenerator(templateManager);

  // Use the exact same data as the failing test
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

  console.log('Calling generator.generateWorkflow with exact test data...');

  try {
    const result = await generator.generateWorkflow(detectionResult);
    console.log('SUCCESS: Test would pass!');
    console.log('Result filename:', result.filename);
    console.log('Result type:', result.type);
    console.log('Content length:', result.content.length);
  } catch (error) {
    console.error('ERROR: Test would fail with:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugExactTest().catch(console.error);