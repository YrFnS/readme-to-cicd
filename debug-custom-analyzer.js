const { createEnhancedReadmeParser } = require('./dist/parser/component-factory.js');

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

console.log('Creating parser with custom analyzer...');
const parser = createEnhancedReadmeParser(config);

console.log('Getting analyzer info...');
const analyzerInfo = parser.getAnalyzerInfo();
const analyzerNames = analyzerInfo.map(info => info.name);

console.log('Registered analyzers:', analyzerNames);
console.log('Contains MockAnalyzer:', analyzerNames.includes('MockAnalyzer'));