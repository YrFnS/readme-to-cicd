import { describe, it, expect, beforeEach } from 'vitest';
import { CommandExtractor } from './src/parser/analyzers/command-extractor';
import { MarkdownParser } from './src/parser/utils/markdown-parser';
import { LanguageDetector } from './src/parser/analyzers/language-detector';

describe('Debug Python Commands', () => {
  let parser: MarkdownParser;
  let extractor: CommandExtractor;
  let languageDetector: LanguageDetector;

  beforeEach(() => {
    parser = new MarkdownParser();
    extractor = new CommandExtractor();
    languageDetector = new LanguageDetector();
  });

  async function setupLanguageContexts(content: string, ast: any) {
    const detectionResult = languageDetector.detectWithContext(ast, content);
    const contexts = detectionResult.contexts;
    extractor.setLanguageContexts(contexts);
    return contexts;
  }

  it('should debug python build commands', async () => {
    const content = `
# Python Testing

\`\`\`bash
pytest
python -m pytest
python -m unittest
python test
\`\`\`
    `;

    console.log('=== DEBUGGING PYTHON COMMANDS ===');
    
    const parseResult = await parser.parseContent(content);
    console.log('Parse result success:', parseResult.success);
    
    if (!parseResult.success) {
      console.log('Parse errors:', parseResult.errors);
      return;
    }

    // Set up language contexts
    const contexts = await setupLanguageContexts(content, parseResult.data!.ast);
    console.log('Language contexts set up:', contexts.length);
    console.log('Detected languages:', contexts.map((l: any) => `${l.language} (${l.confidence})`));

    // Extract commands
    const result = await extractor.analyze(parseResult.data!.ast, content);
    console.log('Command extraction success:', result.success);
    
    if (!result.success) {
      console.log('Extraction errors:', result.errors);
      return;
    }

    const commandInfo = result.data as any;
    console.log('\n=== TEST COMMANDS ===');
    console.log('Test commands found:', commandInfo.test.length);
    commandInfo.test.forEach((cmd: any, i: number) => {
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
    allCommands.forEach((cmd: any, i: number) => {
      console.log(`${i + 1}. "${cmd.command}" (${cmd.language}) - confidence: ${cmd.confidence}`);
    });

    // Check specific commands
    console.log('\n=== SPECIFIC COMMAND CHECKS ===');
    const pytest = commandInfo.test.find((cmd: any) => cmd.command === 'pytest');
    const pytestModule = commandInfo.test.find((cmd: any) => cmd.command === 'python -m pytest');
    const unittest = commandInfo.test.find((cmd: any) => cmd.command === 'python -m unittest');
    const pythonTest = commandInfo.test.find((cmd: any) => cmd.command === 'python test');

    console.log('pytest found:', !!pytest);
    console.log('python -m pytest found:', !!pytestModule);
    console.log('python -m unittest found:', !!unittest);
    console.log('python test found:', !!pythonTest);

    // Check if they're in other categories
    const allPytest = allCommands.find((cmd: any) => cmd.command === 'pytest');
    const allUnittest = allCommands.find((cmd: any) => cmd.command === 'python -m unittest');
    console.log('pytest found in any category:', !!allPytest);
    console.log('python -m unittest found in any category:', !!allUnittest);
    
    if (allUnittest) {
      console.log('python -m unittest category: found in', 
        commandInfo.install.includes(allUnittest) ? 'install' :
        commandInfo.build.includes(allUnittest) ? 'build' :
        commandInfo.test.includes(allUnittest) ? 'test' :
        commandInfo.run.includes(allUnittest) ? 'run' : 'other'
      );
    }

    expect(true).toBe(true); // Just to make it a valid test
  });
});