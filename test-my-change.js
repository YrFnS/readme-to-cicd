// Quick test to verify my new regex pattern works
const content = `
# Test Project

Set NODE_ENV and run the application.
Set DATABASE_URL then run the server.
`;

// Test the new regex pattern I added
const envVar = 'NODE_ENV';
const newPattern = new RegExp(`\\b${envVar}\\b.*(?:and run|then run)`, 'gi');
const matches = content.match(newPattern);

console.log('Testing new regex pattern for NODE_ENV:');
console.log('Content:', content);
console.log('Pattern:', newPattern);
console.log('Matches:', matches);

// Test DATABASE_URL too
const envVar2 = 'DATABASE_URL';
const newPattern2 = new RegExp(`\\b${envVar2}\\b.*(?:and run|then run)`, 'gi');
const matches2 = content.match(newPattern2);

console.log('\nTesting new regex pattern for DATABASE_URL:');
console.log('Pattern:', newPattern2);
console.log('Matches:', matches2);