import { CommandExtractor } from './src/parser/analyzers/command-extractor';
import { MarkdownParser } from './src/parser/utils/markdown-parser';

async function debugTest() {
  const extractor = new CommandExtractor();
  const parser = new MarkdownParser();

  const content = `
# Commands without clear language indicators

\`\`\`bash
build-app
run-tests
deploy-service
\`\`\`
  `;

  // Set a parent context
  const parentContext = {
    language: 'Go',
    confidence: 0.8,
    sourceRange: { startLine: 0, endLine: 10, startColumn: 0, endColumn: 0 },
    evidence: [],
    metadata: { createdAt: new Date(), source: 'parent' }
  };

  const parseResult: any = await parser.parseContent(content);
  console.log('Parse result success:', parseResult.success);
  
  // Set language contexts and parent context
  extractor.setLanguageContexts([parentContext]);
  extractor.setParentContext(parentContext);
  
  if (parseResult.success && parseResult.data) {
    const result = await extractor.analyze(parseResult.data.ast, content);
    console.log('Analysis result success:', result.success);
    console.log('Analysis confidence:', result.confidence);
    
    if (result.success && result.data) {
      const commandInfo: any = result.data;
      console.log('Build commands:', commandInfo.build);
      console.log('Test commands:', commandInfo.test);
      console.log('Other commands:', commandInfo.other);
      
      // Look for specific commands
      const buildCmd = commandInfo.build.find((cmd: any) => cmd.command === 'build-app');
      const testCmd = commandInfo.test.find((cmd: any) => cmd.command === 'run-tests');
      const deployCmd = commandInfo.other.find((cmd: any) => cmd.command === 'deploy-service');
      
      console.log('build-app command:', buildCmd);
      console.log('run-tests command:', testCmd);
      console.log('deploy-service command:', deployCmd);
    }
  } else {
    console.log('Parse failed');
  }
}

debugTest().catch(console.error);