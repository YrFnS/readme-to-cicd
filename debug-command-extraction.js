const { MarkdownParser } = require('./dist/parser/utils/markdown-parser');
const { CommandExtractor } = require('./dist/parser/analyzers/command-extractor');
const { LanguageDetector } = require('./dist/parser/analyzers/language-detector');

const content = `
# Build Commands

\`\`\`bash
mvn compile
mvn package
mvn install
maven compile
\`\`\`
`;

async function debug() {
  console.log('=== Debugging Command Extraction ===');

  // Parse the markdown (use async like the test)
  const parser = new MarkdownParser();
  const parseResult = await parser.parseContent(content);
  console.log('Parse result:', JSON.stringify(parseResult, null, 2));

  if (parseResult.success) {
    console.log('\n=== AST Structure ===');
    console.log(JSON.stringify(parseResult.data.ast, null, 2));

    // Set up language contexts like the test does
    const languageDetector = new LanguageDetector();
    const detectionResult = languageDetector.detectWithContext(parseResult.data.ast, content);
    const contexts = detectionResult.contexts;

    console.log('\n=== Language Contexts ===');
    console.log('Contexts:', JSON.stringify(contexts, null, 2));

    // Extract commands
    const extractor = new CommandExtractor();
    extractor.setLanguageContexts(contexts);
    const result = await extractor.analyze(parseResult.data.ast, content);

    console.log('\n=== Command Extraction Result ===');
    console.log(JSON.stringify(result, null, 2));

    // Test the specific commands the test is looking for
    if (result.success) {
      const buildCommands = result.data.build;
      const installCommands = result.data.install;
      const otherCommands = result.data.other;

      console.log('\n=== Test-specific Command Checks ===');
      console.log('Build commands:', buildCommands);
      console.log('Install commands:', installCommands);
      console.log('Other commands:', otherCommands);

      const mvnCompile = buildCommands.find(cmd => cmd.command === 'mvn compile');
      const mvnPackage = buildCommands.find(cmd => cmd.command === 'mvn package');
      const mvnInstall = installCommands.find(cmd => cmd.command === 'mvn install');
      const mavenCompile = otherCommands.find(cmd => cmd.command === 'maven compile');

      console.log('mvnCompile:', mvnCompile);
      console.log('mvnPackage:', mvnPackage);
      console.log('mvnInstall:', mvnInstall);
      console.log('mavenCompile:', mavenCompile);
    }
  } else {
    console.log('Parse failed:', parseResult.error);
  }
}

debug().catch(console.error);