// Test the specific pattern matching
const command = 'python -m pip install flask';
const patterns = [
  /pip\s+install/gi,
  /pip3\s+install/gi,
  /python\s+-m\s+pip\s+install/gi
];

console.log('Testing command:', command);
console.log('Command lowercase:', command.toLowerCase());

patterns.forEach((pattern, index) => {
  pattern.lastIndex = 0; // Reset regex
  const matches = pattern.test(command.toLowerCase());
  console.log(`Pattern ${index + 1} (${pattern}):`, matches);
});

// Test the looksLikeCommand patterns
const commandPatterns = [
  /^(npm|yarn|pnpm|pip|pip3|cargo|go|mvn|gradle|make|cmake|dotnet|bundle|composer|gem)(\s+|$)/i,
  /^(python|python3|node|java|ruby|php|rustc|gcc|clang)(\s+|$)/i,
];

console.log('\nTesting looksLikeCommand patterns:');
commandPatterns.forEach((pattern, index) => {
  pattern.lastIndex = 0;
  const matches = pattern.test(command);
  console.log(`Command pattern ${index + 1} (${pattern}):`, matches);
});

// Test if it looks like a command
function looksLikeCommand(text) {
  const trimmed = text.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return false;

  // Skip very short commands (likely not real commands) - but allow "make"
  if (trimmed.length < 3 && trimmed !== 'make') return false;

  // Skip commands that start with flags (likely incomplete)
  if (trimmed.startsWith('-')) return false;

  // Check for common command patterns
  const commandPatterns = [
    // Package managers - allow commands with or without arguments
    /^(npm|yarn|pnpm|pip|pip3|cargo|go|mvn|gradle|make|cmake|dotnet|bundle|composer|gem)(\s+|$)/i,
    // Language executables - allow commands with or without arguments
    /^(python|python3|node|java|ruby|php|rustc|gcc|clang)(\s+|$)/i,
    // Container and deployment tools - allow commands with or without arguments
    /^(docker|kubectl|helm|podman)(\s+|$)/i,
    // Build tools - allow commands with or without arguments
    /^(webpack|vite|rollup|parcel|tsc|babel)(\s+|$)/i,
    // Testing tools - allow commands with or without arguments
    /^(pytest|rspec|phpunit|jest|mocha|jasmine)(\s+|$)/i,
    // Shell commands that are commonly used in READMEs - allow commands with or without arguments
    /^(curl|wget|git|cd|mkdir|cp|mv|rm|chmod|chown)(\s+|$)/i,
    // Executable patterns
    /^\.\/[\w\-\.]+/i, // ./executable
    /^[\w\-\.]+\s+[\w\-\.]+/i, // command with arguments
    // CRITICAL FIX: Add pattern for custom commands (like build-app, run-tests, deploy-service)
    /^[\w\-\.]+$/i, // Single word commands with letters, numbers, hyphens, dots (but not starting with -)
    // Common single-word build commands
    /^(make|cmake|ant|sbt|lein|mix)$/i
  ];

  return commandPatterns.some(pattern => pattern.test(trimmed));
}

console.log('\nTesting looksLikeCommand function:');
console.log('looksLikeCommand result:', looksLikeCommand(command));