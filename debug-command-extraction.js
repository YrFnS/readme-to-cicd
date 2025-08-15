// Quick debug script to test command extraction
const content = `
# Build Instructions

\`\`\`bash
make
make all
make build
\`\`\`
`;

console.log('Testing command extraction...');
console.log('Content:', content);

// Let's see what the markdown parser produces
const { marked } = require('marked');
const tokens = marked.lexer(content);
console.log('Tokens:', JSON.stringify(tokens, null, 2));