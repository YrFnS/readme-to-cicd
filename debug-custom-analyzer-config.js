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

console.log('Factory config after initialization:', JSON.stringify(factory.getConfig(), null, 2));

console.log('Creating README parser...');
const parser = factory.createReadmeParser();

console.log('Getting analyzer info...');
const analyzerInfo = parser.getAnalyzerInfo();
const analyzerNames = analyzerInfo.map(info => info.name);

console.log('Registered analyzers:', analyzerNames);
console.log('Contains MockAnalyzer:', analyzerNames.includes('MockAnalyzer'));