// Test executable patterns
const patterns = [/^\.\/[\w\-\.\/]+(\s+.*)?$/gi, /^[\w\-\.\/]+\.exe(\s+.*)?$/gi, /^[\w\-\.\/]+\.sh(\s+.*)?$/gi];

const testCommands = [
  './myapp',
  './build/myapp --config config.json',
  'python -m pip install flask'
];

testCommands.forEach(cmd => {
  console.log(`Testing: "${cmd}"`);
  patterns.forEach((pattern, i) => {
    const match = pattern.test(cmd);
    console.log(`  Pattern ${i}: ${match}`);
    pattern.lastIndex = 0; // Reset regex state
  });
  console.log('');
});