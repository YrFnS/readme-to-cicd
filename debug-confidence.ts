import { CommandExtractor } from './src/parser/analyzers/command-extractor';

const extractor = new CommandExtractor();

// Test the specific commands from the failing test
console.log('Testing confidence calculation:');
console.log('npm install express:', extractor['inferLanguageFromCommand']('npm install express'));
console.log('npm run dev:', extractor['inferLanguageFromCommand']('npm run dev'));

// Test context confidence calculation
const mockContext = {
  language: 'JavaScript',
  confidence: 0.9,
  sourceRange: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
  evidence: [],
  metadata: { createdAt: new Date(), source: 'test' }
};

const command1 = { command: 'npm install express', confidence: 0.9, language: 'JavaScript' };
const command2 = { command: 'npm run dev', confidence: 0.9, language: 'JavaScript' };

console.log('Context confidence for npm install express:', extractor['calculateContextConfidence'](command1, mockContext));
console.log('Context confidence for npm run dev:', extractor['calculateContextConfidence'](command2, mockContext));