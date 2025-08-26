const { TemplateManager } = require('./dist/generator/templates/template-manager');
const { PythonWorkflowGenerator } = require('./dist/generator/templates/python-generator');
const path = require('path');

// Helper function to create a complete DetectionResult (same as in test)
function createDetectionResult(overrides = {}) {
  return {
    languages: [{ 
      name: 'Python', 
      version: '3.11', 
      confidence: 0.9, 
      primary: true 
    }],
    frameworks: [{ 
      name: 'python', 
      confidence: 0.8, 
      evidence: ['Python language detected'], 
      category: 'backend' 
    }],
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
      { name: 'flake8', confidence: 0.7 }
    ],
    deploymentTargets: [],
    projectMetadata: {
      name: 'Test Python Project',
      description: 'A test Python project',
      version: '1.0.0'
    },
    ...overrides
  };
}

async function debugTestEnvironment() {
  console.log('🔍 Debugging Test Environment\n');
  
  try {
    // Use EXACT same configuration as test
    const config = {
      baseTemplatesPath: path.resolve(process.cwd(), 'templates/frameworks'),
      cacheEnabled: true,
      reloadOnChange: false
    };
    
    console.log('Template config:', config);
    
    const templateManager = new TemplateManager(config);
    const generator = new PythonWorkflowGenerator(templateManager);
    
    console.log('✅ Components initialized\n');
    
    // Test Django workflow (same as failing test)
    console.log('1. Testing Django workflow generation...');
    
    const detectionResult = createDetectionResult({
      frameworks: [{ 
        name: 'django', 
        confidence: 0.9, 
        evidence: ['manage.py', 'settings.py'], 
        category: 'backend' 
      }],
      buildTools: [
        { name: 'flake8', confidence: 0.7 },
        { name: 'mypy', confidence: 0.6 }
      ],
      projectMetadata: {
        name: 'Django Test Project',
        description: 'A test Django project',
        version: '1.0.0'
      }
    });
    
    console.log('Detection result prepared:');
    console.log('- Framework:', detectionResult.frameworks[0].name);
    console.log('- Language:', detectionResult.languages[0].name);
    console.log('- Package manager:', detectionResult.packageManagers[0].name);
    
    // Test template loading first
    console.log('\n2. Testing template loading...');
    try {
      const template = await templateManager.loadTemplate('django-ci');
      console.log('✅ Django template loaded');
      console.log('- Template name:', template.name);
      console.log('- Jobs count:', template.jobs?.length || 0);
      
      if (template.jobs && template.jobs.length > 0) {
        console.log('- First job name:', template.jobs[0].name);
        console.log('- First job steps:', template.jobs[0].steps?.length || 0);
      }
    } catch (error) {
      console.log('❌ Template loading failed:', error.message);
      return;
    }
    
    // Test workflow generation
    console.log('\n3. Testing workflow generation...');
    try {
      const result = await generator.generateWorkflow(detectionResult);
      console.log('✅ Django workflow generated successfully');
      console.log('- Filename:', result.filename);
      console.log('- Content length:', result.content.length);
      console.log('- Type:', result.type);
      
      // Show first few lines
      const lines = result.content.split('\n').slice(0, 15);
      console.log('\n   Generated YAML (first 15 lines):');
      lines.forEach((line, i) => {
        console.log(`   ${i + 1}: ${line}`);
      });
      
    } catch (error) {
      console.log('❌ Workflow generation failed:', error.message);
      console.log('Stack trace:', error.stack);
      
      // Let's debug the template compilation step by step
      console.log('\n4. Debugging template compilation step by step...');
      
      try {
        // Extract Python info (same as generator does)
        const pythonLanguage = detectionResult.languages.find(lang => 
          lang.name.toLowerCase() === 'python'
        );
        console.log('- Python language found:', !!pythonLanguage);
        
        const pythonFrameworks = detectionResult.frameworks.filter(fw => 
          ['django', 'flask', 'fastapi', 'python'].includes(fw.name.toLowerCase())
        );
        console.log('- Python frameworks found:', pythonFrameworks.length);
        console.log('- Framework names:', pythonFrameworks.map(f => f.name));
        
        if (pythonFrameworks.length === 0) {
          pythonFrameworks.push({
            name: 'python',
            confidence: 0.8,
            evidence: ['Python language detected'],
            category: 'backend'
          });
          console.log('- Added default Python framework');
        }
        
        const primaryFramework = pythonFrameworks.reduce((prev, current) => 
          current.confidence > prev.confidence ? current : prev
        );
        console.log('- Primary framework:', primaryFramework.name);
        
        // Test template selection
        let templateName;
        switch (primaryFramework.name.toLowerCase()) {
          case 'django':
            templateName = 'django-ci';
            break;
          case 'flask':
            templateName = 'flask-ci';
            break;
          case 'fastapi':
            templateName = 'fastapi-ci';
            break;
          default:
            templateName = 'python-ci';
        }
        console.log('- Selected template:', templateName);
        
        // Test template data preparation
        const templateData = {
          name: detectionResult.projectMetadata.name,
          framework: primaryFramework.name.toLowerCase(),
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
          installCommand: 'python -m pip install --upgrade pip && pip install -r requirements.txt',
          buildCommand: 'python manage.py collectstatic --noinput',
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
            PYTHONDONTWRITEBYTECODE: '1',
            DJANGO_SETTINGS_MODULE: 'settings.test',
            SECRET_KEY: 'test-secret-key'
          },
          isDjango: true,
          hasManagePy: true,
          isFastAPI: false,
          hasAsyncSupport: false,
          isFlask: false,
          hasWSGI: true,
          projectName: 'testproject'
        };
        
        console.log('- Template data prepared');
        console.log('- isDjango:', templateData.isDjango);
        console.log('- buildCommand:', templateData.buildCommand);
        console.log('- projectName:', templateData.projectName);
        
        // Test template compilation
        console.log('\n5. Testing template compilation directly...');
        const compilationResult = await templateManager.compileTemplate(templateName, templateData);
        
        console.log('- Compilation errors:', compilationResult.errors.length);
        console.log('- Compilation warnings:', compilationResult.warnings.length);
        
        if (compilationResult.errors.length > 0) {
          console.log('- Error details:');
          compilationResult.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error}`);
          });
        }
        
        if (compilationResult.warnings.length > 0) {
          console.log('- Warning details:');
          compilationResult.warnings.forEach((warning, i) => {
            console.log(`  ${i + 1}. ${warning}`);
          });
        }
        
        console.log('- Compiled template jobs:', compilationResult.template.jobs?.length || 0);
        
        if (compilationResult.template.jobs && compilationResult.template.jobs.length > 0) {
          const firstJob = compilationResult.template.jobs[0];
          console.log('- First job name:', firstJob.name);
          console.log('- First job steps:', firstJob.steps?.length || 0);
          
          if (firstJob.steps && firstJob.steps.length > 0) {
            console.log('- First step name:', firstJob.steps[0].name);
            console.log('- First step uses/run:', firstJob.steps[0].uses || firstJob.steps[0].run);
          }
        }
        
      } catch (debugError) {
        console.log('❌ Debug failed:', debugError.message);
        console.log('Debug stack trace:', debugError.stack);
      }
    }
    
  } catch (error) {
    console.error('❌ Test environment debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugTestEnvironment();