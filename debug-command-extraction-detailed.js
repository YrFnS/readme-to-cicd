const { CommandExtractor } = require('./src/parser/analyzers/command-extractor.ts');

// Test the looksLikeCommand method directly
const extractor = new CommandExtractor();

// Test commands that should be recognized
const testCommands = [
  'make',
  'make all',
  'make build',
  'npm test',
  'cargo build',
  'go build',
  'python setup.py build'
];

console.log('Testing looksLikeCommand method:');
testCommands.forEach(cmd => {
  try {
    // We need to access the private method somehow
    console.log(`"${cmd}": ${extractor.looksLikeCommand ? extractor.looksLikeCommand(cmd) : 'method not accessible'}`);
  } catch (error) {
    console.log(`"${cmd}": Error - ${error.message}`);
  }
});

// Test the inferLanguageFromCommand method
console.log('\nTesting inferLanguageFromCommand method:');
testCommands.forEach(cmd => {
  try {
    console.log(`"${cmd}": ${extractor.inferLanguageFromCommand ? extractor.inferLanguageFromCommand(cmd) : 'method not accessible'}`);
  } catch (error) {
    console.log(`"${cmd}": Error - ${error.message}`);
  }
});