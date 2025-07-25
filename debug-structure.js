const content = `
# My Project

The main application is in src/app.ts and components are in src/components/.
Configuration is handled by package.json and tsconfig.json.
`;

// Test the patterns
const filePatterns = [
  // Directory patterns with trailing slash
  /\b(?:src|source|lib|app|components?|pages?|routes?|controllers?|models?|views?|utils?|helpers?|services?|tests?|spec|docs?|public|assets?|static|build|dist|out|target)\/(?:[^\s`'")\]]+\/?)*/gi,
  // Specific file patterns
  /\b(?:package\.json|tsconfig\.json|webpack\.config\.js|babel\.config\.js|jest\.config\.js|\.env|\.gitignore|README\.md|LICENSE|Dockerfile|docker-compose\.yml)\b/gi,
  // File paths with extensions
  /\b(?:src|app|lib)\/[^\s`'")\]]*\.[a-zA-Z0-9]+/gi,
];

console.log('Content:', content);
console.log('\nMatches:');

filePatterns.forEach((pattern, i) => {
  console.log(`\nPattern ${i + 1}:`, pattern);
  const matches = content.match(pattern);
  if (matches) {
    matches.forEach(match => {
      const cleanMatch = match.trim().replace(/[`'"]/g, '');
      console.log(`  "${match}" -> "${cleanMatch}"`);
    });
  } else {
    console.log('  No matches');
  }
});