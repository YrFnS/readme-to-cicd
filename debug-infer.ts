import { CommandExtractor } from './src/parser/analyzers/command-extractor';

const extractor = new CommandExtractor();

console.log('Testing inferLanguageFromCommand method:');
console.log('some-unknown-command:', extractor['inferLanguageFromCommand']('some-unknown-command'));
console.log('another-command --flag:', extractor['inferLanguageFromCommand']('another-command --flag'));
console.log('docker build -t myapp .:', extractor['inferLanguageFromCommand']('docker build -t myapp .'));
console.log('git commit -m "update":', extractor['inferLanguageFromCommand']('git commit -m "update"'));