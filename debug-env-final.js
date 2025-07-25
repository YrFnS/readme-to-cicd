const content = `
# Environment Setup

Create a .env file:

\`\`\`
NODE_ENV=development
API_KEY=your_api_key_here
SECRET_KEY=
DEBUG=true
\`\`\`
`;

console.log('Raw content:');
console.log(JSON.stringify(content));

// Try different patterns
const patterns = [
  /```[^`]*\n([\s\S]*?)```/g,
  /```[^`]*\n([\s\S]*?)\n```/g,
  /```\n([\s\S]*?)\n```/g,
  /```\s*\n([\s\S]*?)\n```/g,
];

patterns.forEach((pattern, i) => {
  console.log(`\nPattern ${i + 1}:`, pattern);
  const matches = [...content.matchAll(pattern)];
  console.log('Matches:', matches.length);
  
  matches.forEach((match, j) => {
    console.log(`  Match ${j + 1}:`, JSON.stringify(match[1]));
  });
});