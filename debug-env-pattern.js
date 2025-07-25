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

const envCodeBlockPattern = /\.env[^`]*```[^`]*\n([\s\S]*?)```/gi;

console.log('Content:', content);
console.log('\nPattern:', envCodeBlockPattern);

const matches = [...content.matchAll(envCodeBlockPattern)];
console.log('\nMatches:', matches.length);

matches.forEach((match, i) => {
  console.log(`\nMatch ${i + 1}:`);
  console.log('Full match:', JSON.stringify(match[0]));
  console.log('Captured group:', JSON.stringify(match[1]));
  
  const codeContent = match[1];
  const lines = codeContent.split('\n').filter(line => line.trim());
  
  console.log('Lines:', lines);
  
  for (const line of lines) {
    const varMatch = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (varMatch) {
      const [, varName, value] = varMatch;
      const trimmedValue = value ? value.trim() : '';
      const isEmpty = trimmedValue === '' || trimmedValue === '""' || trimmedValue === "''";
      console.log(`  ${varName}: value="${value}" trimmed="${trimmedValue}" isEmpty=${isEmpty} required=${isEmpty}`);
    }
  }
});