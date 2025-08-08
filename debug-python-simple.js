/**
 * Simple debug script to check Python command detection
 */

const { execSync } = require('child_process');

// Create a simple test to debug Python commands
const testCode = `
const { describe, it, expect, beforeEach } = require('vitest');
const { MarkdownUtils } = require('../dist/shared/markdown-parser');
const { CommandExtractor } = require('../dist/parser/analyzers/command-extractor');
const { IntegrationPipeline } = require('../dist/parser/integration-pipeline');

describe('Debug Python Commands', () => {
  let parser;
  let extractor;
  let pipeline;

  beforeEach(() => {
    parser = { parseContent: MarkdownUtils.parseMarkdown };
    extractor = new CommandExtractor();
    pipeline = new IntegrationPipeline();
  });

  async function setupLanguageContexts(content, ast) {
    const result = await pipeline.setupLanguageContexts(content, ast);
    return result;
  }

  it('should debug python build commands', async () => {
    const content = \`
# Python Build

\\\`\\\`\\\`bash
python setup.py build
python -m build
pip install .
\\\`\\\`\\\`
    \`;

    console.log('=== DEBUGGING PYTHON COMMANDS ===');
    
    const parseResult = await parser.parseContent(content);
    console.log('Parse result success:', parseResult.success);
    
    if (!parseResult.success) {
      console.log('Parse errors:', parseResult.errors);
      return;
    }

    // Set up language contexts
    const languageResult = await setupLanguageContexts(content, parseResult.data.ast);
    console.log('Language setup success:', languageResult.success);
    console.log('Detected languages:', languageResult.data?.map(l => \`\${l.name} (\${l.confidence})\`));

    // Extract commands
    const result = await extractor.analyze(parseResult.data.ast, content);
    console.log('Command extraction success:', result.success);
    
    if (!result.success) {
      console.log('Extraction errors:', result.errors);
      return;
    }

    const commandInfo = result.data;
    console.log('\\n=== BUILD COMMANDS ===');
    console.log('Build commands found:', commandInfo.build.length);
    commandInfo.build.forEach((cmd, i) => {
      console.log(\`\${i + 1}. "\${cmd.command}" (\${cmd.language}) - confidence: \${cmd.confidence}\`);
    });

    console.log('\\n=== ALL COMMANDS ===');
    const allCommands = [
      ...commandInfo.build,
      ...commandInfo.test,
      ...commandInfo.run,
      ...commandInfo.install,
      ...commandInfo.other
    ];
    console.log('Total commands found:', allCommands.length);
    allCommands.forEach((cmd, i) => {
      console.log(\`\${i + 1}. "\${cmd.command}" (\${cmd.language}) - confidence: \${cmd.confidence}\`);
    });

    // Check specific commands
    console.log('\\n=== SPECIFIC COMMAND CHECKS ===');
    const setupBuild = commandInfo.build.find(cmd => cmd.command === 'python setup.py build');
    const pythonBuild = commandInfo.build.find(cmd => cmd.command === 'python -m build');
    const pipInstall = commandInfo.build.find(cmd => cmd.command === 'pip install .');

    console.log('python setup.py build found:', !!setupBuild);
    console.log('python -m build found:', !!pythonBuild);
    console.log('pip install . found:', !!pipInstall);

    // Check if they're in other categories
    const allPipInstall = allCommands.find(cmd => cmd.command === 'pip install .');
    console.log('pip install . found in any category:', !!allPipInstall);
    if (allPipInstall) {
      console.log('pip install . category: found in', 
        commandInfo.install.includes(allPipInstall) ? 'install' :
        commandInfo.build.includes(allPipInstall) ? 'build' :
        commandInfo.test.includes(allPipInstall) ? 'test' :
        commandInfo.run.includes(allPipInstall) ? 'run' : 'other'
      );
    }

    expect(true).toBe(true); // Just to make it a valid test
  });
});
`;

// Write the test file
require('fs').writeFileSync('debug-python-test.js', testCode);

// Run the test
try {
  const result = execSync('npm test -- debug-python-test.js', { encoding: 'utf8', stdio: 'pipe' });
  console.log(result);
} catch (error) {
  console.log(error.stdout);
  console.error(error.stderr);
}

// Clean up
require('fs').unlinkSync('debug-python-test.js');