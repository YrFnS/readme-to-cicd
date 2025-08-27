const { CommandExtractor } = require('./dist/parser/analyzers/command-extractor.js');
const { MarkdownParser } = require('./dist/parser/utils/markdown-parser.js');
const { LanguageDetector } = require('./dist/parser/analyzers/language-detector.js');

async function debugCommandExtraction() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();
  const languageDetector = new LanguageDetector();

  const content = `
# Python Installation

\`\`\`bash
pip install -r requirements.txt
pip3 install numpy
python -m pip install flask
\`\`\`
  `;

  console.log('Content:', content);

  const parseResult = await parser.parseContent(content);
  console.log('Parse result success:', parseResult.success);
  
  if (parseResult.success) {
    const ast = parseResult.data.ast;
    console.log('AST length:', ast.length);
    
    // Set up language contexts
    const detectionResult = languageDetector.detectWithContext(ast, content);
    const contexts = detectionResult.contexts;
    console.log('Language contexts:', contexts.length);
    contexts.forEach(ctx => console.log('  -', ctx.language, ctx.confidence));
    
    extractor.setLanguageContexts(contexts);
    
    // Extract commands
    const result = await extractor.analyze(ast, content);
    console.log('Extraction success:', result.success);
    
    if (result.success) {
      const commandInfo = result.data;
      
      // Show ALL commands extracted
      console.log('All commands extracted:');
      console.log('  Build commands:', commandInfo.build.length);
      commandInfo.build.forEach(cmd => console.log('    -', cmd.command, '(', cmd.language, ')'));
      console.log('  Test commands:', commandInfo.test.length);
      commandInfo.test.forEach(cmd => console.log('    -', cmd.command, '(', cmd.language, ')'));
      console.log('  Run commands:', commandInfo.run.length);
      commandInfo.run.forEach(cmd => console.log('    -', cmd.command, '(', cmd.language, ')'));
      console.log('  Install commands:', commandInfo.install.length);
      commandInfo.install.forEach(cmd => console.log('    -', cmd.command, '(', cmd.language, ')'));
      console.log('  Other commands:', commandInfo.other.length);
      commandInfo.other.forEach(cmd => console.log('    -', cmd.command, '(', cmd.language, ')'));
      
      const pipInstall = commandInfo.install.find(cmd => cmd.command === 'pip install -r requirements.txt');
      const pip3Install = commandInfo.install.find(cmd => cmd.command === 'pip3 install numpy');
      const pythonPip = commandInfo.install.find(cmd => cmd.command === 'python -m pip install flask');
      
      console.log('pipInstall found:', !!pipInstall);
      console.log('pip3Install found:', !!pip3Install);
      console.log('pythonPip found:', !!pythonPip);
    } else {
      console.log('Extraction errors:', result.errors);
    }
  } else {
    console.log('Parse errors:', parseResult.errors);
  }
}

debugCommandExtraction().catch(console.error);