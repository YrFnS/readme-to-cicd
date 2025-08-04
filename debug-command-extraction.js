const content = `
# Go Build Commands

\`\`\`bash
go build
go build -o myapp
go install
\`\`\`
`;

console.log('Content to parse:');
console.log(content);
console.log('\nLooking for commands...');

// Simple regex test
const lines = content.split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('go ')) {
    console.log('Found go command:', trimmed);
  }
}

// Test the looksLikeCommand logic
function looksLikeCommand(text) {
  if (text.length < 2) return false;
  if (/^[^\w\s]*$/.test(text)) return false;
  
  const commandIndicators = [
    /^(npm|yarn|pip|pip3|cargo|go|mvn|gradle|make|cmake|docker|kubectl|helm)\s/,
    /^(python|python3|node|java|ruby|php)\s+\w+/,
    /^(dotnet|bundle|composer|rspec|pytest)\s+\w+/,
    /^\w+\s+(build|test|run|install|start|deploy|compile|package|add|get|restore)/,
    /^\.\/\w+/,
    /^\w+\.sh/,
    /^git\s+\w+/,
    /^docker(-compose)?\s+\w+/,
    /^java\s+-jar/,
    /^\.\/[^/\s]+$/,
    /^(make|pytest|rspec)$/,
    /^(cargo|go|mvn|gradle)\s+\w+(\s+--?\w+)*$/,
    /^python\s+-m\s+\w+/,
    /^(npm|yarn)\s+(i|install|add|test|build|start|run)(\s+\w+)*$/,
  ];
  
  return commandIndicators.some(pattern => pattern.test(text));
}

console.log('\nTesting looksLikeCommand:');
console.log('go build:', looksLikeCommand('go build'));
console.log('go install:', looksLikeCommand('go install'));
console.log('mvn install:', looksLikeCommand('mvn install'));