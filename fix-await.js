const fs = require('fs');

// Read the file
let content = fs.readFileSync('tests/unit/command-extractor.test.ts', 'utf8');

// Replace all instances of extractWithContext without await
content = content.replace(
  /(\s+)const result = extractor\.extractWithContext\(/g,
  '$1const result = await extractor.extractWithContext('
);

// Write back
fs.writeFileSync('tests/unit/command-extractor.test.ts', content);

console.log('Fixed all extractWithContext calls to include await');