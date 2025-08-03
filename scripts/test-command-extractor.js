// Simple test to check if CommandExtractor can be imported
try {
  const { CommandExtractor } = require('./src/parser/analyzers/command-extractor.ts');
  console.log('CommandExtractor imported successfully:', typeof CommandExtractor);
  console.log('Is it a constructor?', typeof CommandExtractor === 'function');
  
  if (typeof CommandExtractor === 'function') {
    const instance = new CommandExtractor();
    console.log('Instance created successfully:', instance.name);
  }
} catch (error) {
  console.error('Error importing CommandExtractor:', error.message);
}