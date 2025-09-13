import { CommandExtractor } from './src/parser/analyzers/command-extractor';

const extractor = new CommandExtractor();

console.log('Testing inferLanguageFromCommand method:');
console.log('npm install:', extractor['inferLanguageFromCommand']('npm install'));
console.log('python app.py:', extractor['inferLanguageFromCommand']('python app.py'));

// Test context confidence calculation
const jsContext = {
  language: 'JavaScript',
  confidence: 0.9,
  sourceRange: { startLine: 0, endLine: 5, startColumn: 0, endColumn: 0 },
  evidence: [],
  metadata: { createdAt: new Date(), source: 'test' }
};

const pythonContext = {
  language: 'Python',
  confidence: 0.9,
  sourceRange: { startLine: 5, endLine: 10, startColumn: 0, endColumn: 0 },
  evidence: [],
  metadata: { createdAt: new Date(), source: 'test' }
};

const npmCommand = { command: 'npm install', confidence: 0.9, language: 'JavaScript' };
const pythonCommand = { command: 'python app.py', confidence: 0.8, language: 'Python' };

console.log('npm install context confidence:', extractor['calculateContextConfidence'](npmCommand, jsContext));
console.log('python app.py context confidence:', extractor['calculateContextConfidence'](pythonCommand, pythonContext));