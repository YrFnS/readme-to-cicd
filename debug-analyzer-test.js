const { ComponentFactory } = require('./dist/parser/component-factory.js');

// Create invalid analyzer (missing analyze method)
const invalidAnalyzer = {
  name: 'InvalidAnalyzer'
  // Missing analyze method
};

const analyzerConfig = {
  name: 'InvalidAnalyzer',
  analyzer: invalidAnalyzer,
  dependencies: [],
  priority: 1
};

console.log('Testing analyzer registration...');
console.log('Invalid analyzer:', JSON.stringify(invalidAnalyzer, null, 2));

const factory = ComponentFactory.getInstance();
factory.initialize();

console.log('Registering invalid analyzer...');
const registrationResults = factory.registerCustomAnalyzers([analyzerConfig]);

console.log('Registration results:', JSON.stringify(registrationResults, null, 2));
console.log('Success:', registrationResults[0].success);
console.log('Error:', registrationResults[0].error);