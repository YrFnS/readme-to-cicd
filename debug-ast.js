const { marked } = require('marked');

const content = `# My Project

This is a description.

## Structure

\`\`\`
src/
├── components/
└── utils/
\`\`\`
`;

const tokens = marked.lexer(content);
console.log('AST Structure:');
console.log(JSON.stringify(tokens, null, 2));