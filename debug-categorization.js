// Test command categorization
function categorizeCommand(command) {
  const cmd = command.toLowerCase();

  // Install patterns
  const installPatterns = {
    npm: [/npm\s+install/gi, /npm\s+i(?:\s|$)/gi, /npm\s+ci/gi],
    yarn: [/yarn\s+install/gi, /yarn(?:\s|$)/gi],
    pip: [/pip\s+install/gi, /pip3\s+install/gi, /python\s+-m\s+pip\s+install/gi],
    cargo: [/cargo\s+install/gi],
    go: [/go\s+get/gi, /go\s+mod\s+download/gi],
    maven: [/mvn\s+install/gi, /mvn\s+dependency:resolve/gi],
    gradle: [/gradle\s+dependencies/gi],
    composer: [/composer\s+install/gi],
    bundle: [/bundle\s+install/gi],
    dotnet: [/dotnet\s+restore/gi]
  };

  console.log('Categorizing command:', command);
  console.log('Lowercase command:', cmd);

  // Check install patterns
  for (const [key, patterns] of Object.entries(installPatterns)) {
    console.log(`Checking ${key} patterns:`, patterns.map(p => p.toString()));
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const matches = pattern.test(cmd);
      console.log(`  Pattern ${pattern} matches:`, matches);
      if (matches) {
        console.log(`  -> Categorized as install (${key})`);
        return 'install';
      }
    }
  }

  // Fallback to keyword-based detection
  if (cmd.includes('install') || cmd.includes('add') || cmd.includes('get') ||
    cmd.includes('restore') || cmd.includes('download')) {
    console.log('  -> Categorized as install (keyword fallback)');
    return 'install';
  }

  console.log('  -> Categorized as other');
  return 'other';
}

const testCommands = [
  'pip install -r requirements.txt',
  'pip3 install numpy',
  'python -m pip install flask'
];

testCommands.forEach(cmd => {
  console.log('='.repeat(50));
  const category = categorizeCommand(cmd);
  console.log('Final category:', category);
  console.log('');
});