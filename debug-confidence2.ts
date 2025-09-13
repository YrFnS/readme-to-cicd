import { CommandExtractor } from './src/parser/analyzers/command-extractor';

const extractor = new CommandExtractor();

// Test 1: assignDefaultContext method directly
console.log('=== Test 1: assignDefaultContext method directly ===');
const commands = [
  {
    command: 'npm test',
    confidence: 0.8,
    language: 'JavaScript',
    description: 'Run tests'
  },
  {
    command: 'unknown-command',
    confidence: 0.5,
    description: 'Unknown command'
  }
];

const contexts = [
  {
    language: 'JavaScript',
    confidence: 0.9,
    sourceRange: { startLine: 0, endLine: 5, startColumn: 0, endColumn: 0 },
    evidence: [],
    metadata: { createdAt: new Date(), source: 'test' }
  }
];

const result = extractor.assignDefaultContext(commands, contexts);

console.log('Result length:', result.length);
console.log('First command language context:', result[0].languageContext?.language);
console.log('First command context confidence:', result[0].contextConfidence);
console.log('Second command language context:', result[1].languageContext?.language);
console.log('Second command context confidence:', result[1].contextConfidence);

// Test 2: assign default context with proper confidence tracking
console.log('\n=== Test 2: assign default context with proper confidence tracking ===');
const testCommands = [
  { command: 'npm install', confidence: 0.9, language: 'JavaScript' },
  { command: 'unknown-cmd', confidence: 0.3, language: 'unknown' },
  { command: 'python app.py', confidence: 0.8, language: 'Python' }
];

const testContexts = [
  {
    language: 'JavaScript',
    confidence: 0.9,
    sourceRange: { startLine: 0, endLine: 5, startColumn: 0, endColumn: 0 },
    evidence: [],
    metadata: { createdAt: new Date(), source: 'test' }
  },
  {
    language: 'Python',
    confidence: 0.8,
    sourceRange: { startLine: 5, endLine: 10, startColumn: 0, endColumn: 0 },
    evidence: [],
    metadata: { createdAt: new Date(), source: 'test' }
  }
];

const associatedCommands = extractor.assignDefaultContext(testCommands, testContexts);

console.log('Associated commands length:', associatedCommands.length);
const npmCmd = associatedCommands.find((cmd: any) => cmd.command === 'npm install');
console.log('npm install command language context:', npmCmd?.languageContext?.language);
console.log('npm install command context confidence:', npmCmd?.contextConfidence);