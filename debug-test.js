// Simple test to debug the AnalysisContextFactory import issue
async function testImport() {
  try {
    console.log('Testing dynamic import...');
    const module = await import('./src/shared/types/analysis-context.js');
    console.log('Import successful:', Object.keys(module));
    
    if (module.AnalysisContextFactory) {
      console.log('AnalysisContextFactory found');
      const context = module.AnalysisContextFactory.create('test content');
      console.log('Context created:', context.sessionId);
    } else {
      console.log('AnalysisContextFactory not found in module');
    }
  } catch (error) {
    console.log('Import failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

testImport();