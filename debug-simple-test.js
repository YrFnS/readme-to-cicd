// Simple test to debug command extraction
const fs = require('fs');

// Read the command extractor file to understand the structure
const commandExtractorPath = './src/parser/analyzers/command-extractor.ts';

if (fs.existsSync(commandExtractorPath)) {
  const content = fs.readFileSync(commandExtractorPath, 'utf8');
  
  // Look for the looksLikeCommand method
  const looksLikeCommandMatch = content.match(/looksLikeCommand\(([^)]+)\):\s*boolean\s*{([^}]+)}/s);
  if (looksLikeCommandMatch) {
    console.log('Found looksLikeCommand method:');
    console.log(looksLikeCommandMatch[0].substring(0, 500) + '...');
  }
  
  // Look for the regex patterns
  const regexMatches = content.match(/\/\^[^\/]+\/[gi]*/g);
  if (regexMatches) {
    console.log('\nFound regex patterns:');
    regexMatches.forEach((pattern, index) => {
      console.log(`${index + 1}: ${pattern}`);
    });
  }
  
  // Test if 'make' would match the patterns
  const testCommand = 'make';
  console.log(`\nTesting "${testCommand}" against patterns:`);
  
  // Manually test the patterns
  const patterns = [
    /^(npm|yarn|pnpm|pip|pip3|cargo|go|mvn|gradle|make|cmake|dotnet|bundle|composer|gem)(\s+|$)/i,
    /^(make|cmake|ant|sbt|lein|mix)$/i
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = pattern.test(testCommand);
    console.log(`Pattern ${index + 1}: ${matches ? 'MATCHES' : 'NO MATCH'} - ${pattern}`);
  });
  
} else {
  console.log('Command extractor file not found');
}