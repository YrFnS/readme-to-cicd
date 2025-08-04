// Debug command categorization
function categorizeCommand(commandText) {
  const cmd = commandText.toLowerCase();
  
  // Build commands
  if (/\b(build|compile|assemble|package|dist)\b/.test(cmd)) {
    return 'build';
  }
  
  // Test commands
  if (/\b(test|spec|check|verify|junit|pytest|rspec)\b/.test(cmd)) {
    return 'test';
  }
  
  // Install commands
  if (/\b(install|add|get|restore|dependencies)\b/.test(cmd) && 
      !/\bgo\s+install\b/.test(cmd)) { // go install is a build command
    return 'install';
  }
  
  // Deploy commands
  if (/\b(deploy|publish|release|docker|kubectl|helm)\b/.test(cmd)) {
    return 'deploy';
  }
  
  // Run commands
  if (/\b(start|run|serve|server|dev|development)\b/.test(cmd) ||
      /^(python|node|java|ruby|php)\s+\w+/.test(cmd)) {
    return 'run';
  }
  
  return 'other';
}

// Test commands that should be detected
const testCommands = [
  'go run cmd/server/main.go',
  'cargo build --release',
  'npm test',
  'docker-compose up -d postgres redis nats',
  'python -m pytest',
  'make build'
];

console.log('Command categorization test:');
testCommands.forEach(cmd => {
  console.log(`"${cmd}" -> ${categorizeCommand(cmd)}`);
});