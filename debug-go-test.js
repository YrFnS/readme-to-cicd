const { CommandExtractor } = require('./dist/parser/analyzers/command-extractor.js');
const { MarkdownParser } = require('./dist/parser/utils/markdown-parser.js');

async function debugGoTest() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();
  
  const content = `
# Go Build

\`\`\`bash
go build
go build -o myapp
go install
\`\`\`
  `;

  const parseResult = await parser.parseContent(content);
  const result = await extractor.analyze(parseResult.data.ast, content);
  const commandInfo = result.data;
  const buildCommands = commandInfo.build;

  console.log('Build commands:', buildCommands.map(cmd => ({ command: cmd.command, language: cmd.language })));
  
  const goBuild = buildCommands.find(cmd => cmd.command === 'go build');
  const goBuildOutput = buildCommands.find(cmd => cmd.command === 'go build -o myapp');
  const goInstall = buildCommands.find(cmd => cmd.command === 'go install');

  console.log('goBuild:', goBuild ? 'FOUND' : 'NOT FOUND');
  console.log('goBuildOutput:', goBuildOutput ? 'FOUND' : 'NOT FOUND');
  console.log('goInstall:', goInstall ? 'FOUND' : 'NOT FOUND');
  
  if (goInstall) {
    console.log('goInstall details:', goInstall);
  }
}

debugGoTest().catch(console.error);