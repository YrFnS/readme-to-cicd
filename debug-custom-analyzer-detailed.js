const { ComponentFactory } = require('./dist/parser/component-factory.js');

const mockAnalyzer = {
  name: 'MockAnalyzer',
  analyze: async () => ({
    data: { mock: true },
    confidence: 0.5,
    sources: ['mock']
  })
};

const config = {
  customAnalyzers: [mockAnalyzer]
};

console.log('Creating factory and initializing with config...');
const factory = ComponentFactory.getInstance();
factory.reset(); // Ensure clean state
factory.initialize(config);

console.log('Creating README parser...');
const parser = factory.createReadmeParser();

console.log('Getting analyzer info...');
const analyzerInfo = parser.getAnalyzerInfo();
const analyzerNames = analyzerInfo.map(info => info.name);

console.log('Registered analyzers:', analyzerNames);
console.log('Contains MockAnalyzer:', analyzerNames.includes('MockAnalyzer'));

// Let's also check if the config has the custom analyzers
console.log('Factory config has customAnalyzers:', factory.config && factory.config.customAnalyzers ? factory.config.customAnalyzers.length : 'undefined');