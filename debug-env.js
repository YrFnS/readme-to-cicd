const content = `
NODE_ENV=development
API_KEY=your_api_key_here
SECRET_KEY=
DEBUG=true
`;

const lines = content.split('\n').filter(line => line.trim());

for (const line of lines) {
  const varMatch = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (varMatch) {
    const [, varName, value] = varMatch;
    const trimmedValue = value ? value.trim() : '';
    const isEmpty = trimmedValue === '' || trimmedValue === '""' || trimmedValue === "''";
    console.log(`${varName}: value="${value}" trimmed="${trimmedValue}" isEmpty=${isEmpty} required=${isEmpty}`);
  }
}