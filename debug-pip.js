// Test pip patterns
const patterns = [
  /pip\s+install/gi, 
  /pip3\s+install/gi, 
  /python\s+-m\s+pip\s+install/gi
];

const testCommand = 'python -m pip install flask';

console.log(`Testing: "${testCommand}"`);
patterns.forEach((pattern, i) => {
  const match = pattern.test(testCommand);
  console.log(`  Pattern ${i}: ${match} (${pattern})`);
  pattern.lastIndex = 0; // Reset regex state
});