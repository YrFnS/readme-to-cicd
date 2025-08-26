const { TemplateManager } = require('./dist/generator/templates/template-manager');
const { PythonWorkflowGenerator } = require('./dist/generator/templates/python-generator');
const path = require('path');

async function debugTemplateCompilation() {
  console.log('🔍 Debugging Template Compilation\n');
  
  try {
    // Initialize template manager
    const templateConfig = {
      baseTemplatesPath: path.join(__dirname, 'templates'),
      customTemplatesPath: null,
      cacheEnabled: false
    };
    
    const templateManager = new TemplateManager(templateConfig);
    console.log('✅ Template manager initialized\n');
    
    // Test loading a template
    console.log('1. Testing template loading...');
    try {
      const template = await templateManager.loadTemplate('python-ci');
      console.log('✅ Template loaded successfully');
      console.log('   Template name:', template.name);
      console.log('   Template type:', template.type);
      console.log('   Jobs count:', template.jobs?.length || 0);
      
      if (template.jobs && template.jobs.length > 0) {
        console.log('   First job:', template.jobs[0].name);
        console.log('   First job steps:', template.jobs[0].steps?.length || 0);
      }
    } catch (error) {
      console.log('❌ Template loading failed:', error.message);
      return;
    }
    
    console.log('\n2. Testing template compilation...');
    
    // Create mock detection result for Python
    const mockDetectionResult = {
      languages: [
        {
          name: 'Python',
          confidence: 0.9,
          version: '3.11',
          sources: ['file-extension']
        }
      ],
      frameworks: [
        {
          name: 'python',
          confidence: 0.8,
          evidence: ['Python language detected'],
          category: 'backend'
        }
      ],
      packageManagers: [
        {
          name: 'pip',
          lockFile: 'requirements.txt'
        }
      ],
      testingFrameworks: [
        {
          name: 'pytest',
          confidence: 0.8
        }
      ],
      buildTools: [
        {
          name: 'flake8',
          confidence: 0.7
        }
      ]
    };
    
    // Create template data
    const templateData = {
      name: 'Test Project',
      framework: 'python',
      pythonVersion: '3.11',
      packageManager: 'pip',
      hasRequirementsTxt: true,
      hasPoetryLock: false,
      hasPipfileLock: false,
      hasCondaYml: false,
      hasLinting: true,
      hasTesting: true,
      hasCoverage: false,
      hasTypeChecking: false,
      installCommand: 'pip install -r requirements.txt',
      buildCommand: '',
      testCommand: 'python -m pytest',
      lintCommand: 'python -m flake8',
      typeCheckCommand: 'echo "Type checking not configured"',
      virtualEnvSetup: 'python -m venv venv && source venv/bin/activate',
      includeComments: true,
      optimizationLevel: 'standard',
      securityLevel: 'standard',
      pythonVersions: ['3.10', '3.11'],
      environmentVariables: {
        PYTHONPATH: '.',
        PYTHONDONTWRITEBYTECODE: '1'
      },
      isDjango: false,
      hasManagePy: false,
      isFastAPI: false,
      hasAsyncSupport: false,
      isFlask: false,
      hasWSGI: false
    };
    
    console.log('   Template data prepared');
    console.log('   Framework:', templateData.framework);
    console.log('   Python version:', templateData.pythonVersion);
    console.log('   Has linting:', templateData.hasLinting);
    console.log('   Has testing:', templateData.hasTesting);
    
    // Test compilation with Django template
    console.log('   Testing Django template compilation...');
    const djangoTemplateData = {
      ...templateData,
      framework: 'django',
      isDjango: true,
      hasManagePy: true,
      projectName: 'testproject',
      buildCommand: 'python manage.py collectstatic --noinput'
    };
    
    const compilationResult = await templateManager.compileTemplate('django-ci', djangoTemplateData);
    
    console.log('\n   Compilation result:');
    console.log('   Errors:', compilationResult.errors.length);
    console.log('   Warnings:', compilationResult.warnings.length);
    
    if (compilationResult.errors.length > 0) {
      console.log('   Error details:');
      compilationResult.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    if (compilationResult.warnings.length > 0) {
      console.log('   Warning details:');
      compilationResult.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
    
    console.log('   Compiled template jobs:', compilationResult.template.jobs?.length || 0);
    
    if (compilationResult.template.jobs && compilationResult.template.jobs.length > 0) {
      const firstJob = compilationResult.template.jobs[0];
      console.log('   First job name:', firstJob.name);
      console.log('   First job steps:', firstJob.steps?.length || 0);
      
      if (firstJob.steps && firstJob.steps.length > 0) {
        console.log('   First step:', firstJob.steps[0].name);
      }
    }
    
    console.log('\n3. Testing Python generator...');
    
    // Test the Python generator
    const pythonGenerator = new PythonWorkflowGenerator(templateManager);
    
    try {
      const workflowOutput = await pythonGenerator.generateWorkflow(mockDetectionResult);
      console.log('✅ Python generator succeeded');
      console.log('   Generated filename:', workflowOutput.filename);
      console.log('   Content length:', workflowOutput.content.length);
      console.log('   Workflow type:', workflowOutput.type);
      
      // Show first few lines of generated content
      const lines = workflowOutput.content.split('\n').slice(0, 10);
      console.log('\n   Generated YAML (first 10 lines):');
      lines.forEach((line, i) => {
        console.log(`   ${i + 1}: ${line}`);
      });
      
    } catch (error) {
      console.log('❌ Python generator failed:', error.message);
      console.log('   Stack trace:', error.stack);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('   Stack trace:', error.stack);
  }
}

debugTemplateCompilation();