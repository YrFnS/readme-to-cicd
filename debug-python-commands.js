const MarkdownParser = require('./dist/shared/markdown-parser').MarkdownParser;
const CommandExtractor = require('./dist/parser/analyzers/command-extractor').CommandExtractor;
const IntegrationPipeline = require('./dist/parser/integration-pipeline').IntegrationPipeline;

async function debugPythonCommands() {
  const content = `
# Python Build

\`\`\`bash
python setup.py build
python -m build
pip install .
\`\`\`
  `;

  const parser = new MarkdownParser();
  const extractor = new CommandExtractor();
  const pipeline = new IntegrationPipeline();

  console.log('=== DEBUGGING PYTHON COMMANDS ===');
  
  // Parse content
  const parseResult = await parser.parseContent(content);
  console.log('Parse result success:', parseResult.success);
  
  if (!parseResult.success) {
    console.log('Parse errors:', parseResult.errors);
    return;
  }

  // Set up language contexts
  const languageResult = await pipeline.setupLanguageContexts(content, parseResult.data.ast);
  console.log('Language setup success:', languageResult.success);
  console.log('Detected languages:', languageResult.data?.map(l => `${l.name} (${l.confidence})`));

  // Extract commands
  const result = await extractor.analyze(parseResult.data.ast, content);
  console.log('Command extraction success:', result.success);
  
  if (!result.success) {
    console.log('Extraction errors:', result.errors);
    return;
  }

  const commandInfo = result.data;
  console.log('\n=== BUILD COMMANDS ===');
  console.log('Build commands found:', commandInfo.build.length);
  commandInfo.build.forEach((cmd, i) => {
    console.log(`${i + 1}. "${cmd.command}" (${cmd.language}) - confidence: ${cmd.confidence}`);
  });

  console.log('\n=== ALL COMMANDS ===');
  const allCommands = [
    ...commandInfo.build,
    ...commandInfo.test,
    ...commandInfo.run,
    ...commandInfo.install,
    ...commandInfo.other
  ];
  console.log('Total commands found:', allCommands.length);
  allCommands.forEach((cmd, i) => {
    console.log(`${i + 1}. "${cmd.command}" (${cmd.language}) - confidence: ${cmd.confidence}`);
  });

  // Check specific commands
  console.log('\n=== SPECIFIC COMMAND CHECKS ===');
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
}

debugPythonCommands().catch(console.error);