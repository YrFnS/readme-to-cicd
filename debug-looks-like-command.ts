import { CommandExtractor } from './src/parser/analyzers/command-extractor';

const extractor = new CommandExtractor();

console.log('Testing looksLikeCommand method:');
console.log('build-app:', extractor['looksLikeCommand']('build-app'));
console.log('run-tests:', extractor['looksLikeCommand']('run-tests'));
console.log('deploy-service:', extractor['looksLikeCommand']('deploy-service'));
console.log('npm install:', extractor['looksLikeCommand']('npm install'));
console.log('make:', extractor['looksLikeCommand']('make'));