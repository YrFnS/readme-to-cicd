const { CommandExtractor } = require('./dist/parser/analyzers/command-extractor.js');
const { MarkdownParser } = require('./dist/parser/utils/markdown-parser.js');

async function debugCommandDetection() {
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

  console.log('Testing content:', content);
  
  const parseResult = await parser.parseContent(content);
  console.log('Parse result success:', parseResult.success);
  
  if (parseResult.success) {
    console.log('AST structure:', JSON.stringify(parseResult.data.ast, null, 2));
    
    const result = await extractor.analyze(parseResult.data.ast, content);
    console.log('Analysis result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log('Build commands found:', result.data.build);
      console.log('All commands found:', {
        build: result.data.build.length,
        test: result.data.test.length,
        run: result.data.run.length,
        install: result.data.install.length,
        other: result.data.other.length
      });
    }
  }
}

debugCommandDetection().catch(console.error);