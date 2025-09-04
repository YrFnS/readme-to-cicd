// Test if require works for AnalysisContextFactory
try {
  console.log('Testing require...');
  const module = require('./dist/shared/types/analysis-context.js');
  console.log('Module keys:', Object.keys(module));
  
  if (module.AnalysisContextFactory) {
    console.log('✅ AnalysisContextFactory found');
    console.log('create method type:', typeof module.AnalysisContextFactory.create);
    
    if (typeof module.AnalysisContextFactory.create === 'function') {
      const context = module.AnalysisContextFactory.create('test content');
      console.log('✅ Context created successfully:', context.sessionId);
    } else {
      console.log('❌ create is not a function');
    }
  } else {
    console.log('❌ AnalysisContextFactory not found');
  }
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('Stack:', error.stack);
}