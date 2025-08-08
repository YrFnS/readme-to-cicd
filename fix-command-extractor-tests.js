/**
 * Script to automatically fix CommandExtractor tests by adding language context setup
 */

const fs = require('fs');
const path = require('path');

const testFile = 'tests/unit/command-extractor.test.ts';

// Read the test file
let content = fs.readFileSync(testFile, 'utf8');

// Pattern to match test functions that need fixing
const testPattern = /it\('should extract [^']+', async \(\) => \{[\s\S]*?const parseResult = await parser\.parseContent\(content\);[\s\S]*?const result = await extractor\.analyze\(parseResult\.data!\.ast, content\);/g;

// Tests that should be fixed (those that expect specific language assignments)
const testsToFix = [
  'should extract executable run commands',
  'should extract docker commands',
  'should inherit from parent context when no specific context found',
  'should use most common language for unclassified commands',
  'should handle commands with enhanced pattern inference'
];

// Function to add language context setup to a test
function addLanguageContextSetup(testMatch) {
  // Check if it already has the setup
  if (testMatch.includes('await setupLanguageContexts')) {
    return testMatch;
  }
  
  // Find the position after parseResult declaration
  const parseResultLine = 'const parseResult = await parser.parseContent(content);';
  const setupLine = `
      // Set up language contexts for context-aware extraction
      await setupLanguageContexts(content, parseResult.data!.ast);
      `;
  
  return testMatch.replace(
    parseResultLine,
    parseResultLine + setupLine
  );
}

// Apply fixes to all matching tests
let matches = content.match(testPattern);
if (matches) {
  matches.forEach(match => {
    const fixedMatch = addLanguageContextSetup(match);
    content = content.replace(match, fixedMatch);
  });
}

// Also fix specific test patterns that might not match the general pattern
testsToFix.forEach(testName => {
  const testRegex = new RegExp(
    `it\\('${testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}', async \\(\\) => \\{[\\s\\S]*?const parseResult = await parser\\.parseContent\\(content\\);[\\s\\S]*?const result = await extractor\\.analyze\\(parseResult\\.data!\\.ast, content\\);`,
    'g'
  );
  
  content = content.replace(testRegex, (match) => {
    if (match.includes('await setupLanguageContexts')) {
      return match;
    }
    
    const parseResultLine = 'const parseResult = await parser.parseContent(content);';
    const setupLine = `
      // Set up language contexts for context-aware extraction
      await setupLanguageContexts(content, parseResult.data!.ast);
      `;
    
    return match.replace(parseResultLine, parseResultLine + setupLine);
  });
});

// Write the fixed content back
fs.writeFileSync(testFile, content, 'utf8');

console.log('✅ Fixed CommandExtractor tests with language context setup');
console.log('📝 Updated file:', testFile);