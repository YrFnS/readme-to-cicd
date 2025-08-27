// Test the negative lookahead pattern
const command = 'python -m pip install flask';
const patterns = [
  /python\s+-m\s+\w+/gi,                    // Original pattern (matches everything)
  /python\s+-m\s+(?!pip\s+install)\w+/gi   // New pattern with negative lookahead
];

console.log('Testing command:', command);

patterns.forEach((pattern, index) => {
  pattern.lastIndex = 0;
  const matches = pattern.test(command);
  console.log(`Pattern ${index + 1} (${pattern}):`, matches);
});

// Test other python -m commands
const testCommands = [
  'python -m pip install flask',
  'python -m pytest',
  'python -m unittest',
  'python -m venv myenv',
  'python -m http.server'
];

console.log('\nTesting various python -m commands:');
testCommands.forEach(cmd => {
  console.log(`\nCommand: ${cmd}`);
  patterns.forEach((pattern, index) => {
    pattern.lastIndex = 0;
    const matches = pattern.test(cmd);
    console.log(`  Pattern ${index + 1}:`, matches);
  });
});