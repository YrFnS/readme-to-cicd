/**
 * Example usage of CommandExtractor with other analyzers
 */

import { createReadmeParser } from '../src/parser';
import { LanguageDetector, DependencyExtractor, CommandExtractor } from '../src/parser/analyzers';

async function demonstrateCommandExtraction() {
  // Create parser instance
  const parser = createReadmeParser();

  // Register all analyzers
  parser.registerAnalyzer(new LanguageDetector());
  parser.registerAnalyzer(new DependencyExtractor());
  parser.registerAnalyzer(new CommandExtractor());

  // Example README content
  const readmeContent = `
# My Awesome Project

A modern web application built with Node.js and TypeScript.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

To start the development server:

\`\`\`bash
npm run dev
\`\`\`

## Building

Build the project for production:

\`\`\`bash
npm run build
npm run build:prod
\`\`\`

## Testing

Run the test suite:

\`\`\`bash
npm test
npm run test:coverage
\`\`\`

## Running

Start the application:

\`\`\`bash
npm start
\`\`\`

You can also run \`npm run dev\` for development mode.
  `;

  try {
    // Parse the README content
    const result = await parser.parseContent(readmeContent);

    if (result.success && result.data) {
      const { languages, dependencies, commands, confidence } = result.data;

      console.log('=== README Analysis Results ===\n');

      // Display detected languages
      console.log('🔤 Languages detected:');
      languages.forEach(lang => {
        console.log(`  - ${lang.name} (confidence: ${(lang.confidence * 100).toFixed(1)}%)`);
        if (lang.frameworks && lang.frameworks.length > 0) {
          console.log(`    Frameworks: ${lang.frameworks.join(', ')}`);
        }
      });

      // Display dependencies
      console.log('\n📦 Dependencies:');
      if (dependencies.packageFiles.length > 0) {
        console.log('  Package files:');
        dependencies.packageFiles.forEach(file => {
          console.log(`    - ${file.name} (${file.type})`);
        });
      }
      if (dependencies.installCommands.length > 0) {
        console.log('  Install commands:');
        dependencies.installCommands.forEach(cmd => {
          console.log(`    - ${cmd.command}`);
        });
      }

      // Display commands (the new CommandExtractor results)
      console.log('\n⚡ Commands extracted:');
      
      if (commands.build.length > 0) {
        console.log('  Build commands:');
        commands.build.forEach(cmd => {
          console.log(`    - ${cmd.command} (confidence: ${(cmd.confidence * 100).toFixed(1)}%)`);
          if (cmd.language) console.log(`      Language: ${cmd.language}`);
          if (cmd.context) console.log(`      Context: ${cmd.context}`);
        });
      }

      if (commands.test.length > 0) {
        console.log('  Test commands:');
        commands.test.forEach(cmd => {
          console.log(`    - ${cmd.command} (confidence: ${(cmd.confidence * 100).toFixed(1)}%)`);
          if (cmd.language) console.log(`      Language: ${cmd.language}`);
        });
      }

      if (commands.run.length > 0) {
        console.log('  Run commands:');
        commands.run.forEach(cmd => {
          console.log(`    - ${cmd.command} (confidence: ${(cmd.confidence * 100).toFixed(1)}%)`);
          if (cmd.language) console.log(`      Language: ${cmd.language}`);
        });
      }

      if (commands.install.length > 0) {
        console.log('  Install commands:');
        commands.install.forEach(cmd => {
          console.log(`    - ${cmd.command} (confidence: ${(cmd.confidence * 100).toFixed(1)}%)`);
          if (cmd.language) console.log(`      Language: ${cmd.language}`);
        });
      }

      if (commands.other.length > 0) {
        console.log('  Other commands:');
        commands.other.forEach(cmd => {
          console.log(`    - ${cmd.command} (confidence: ${(cmd.confidence * 100).toFixed(1)}%)`);
        });
      }

      // Display overall confidence
      console.log('\n📊 Overall Analysis Confidence:');
      console.log(`  - Overall: ${(confidence.overall * 100).toFixed(1)}%`);
      console.log(`  - Languages: ${(confidence.languages * 100).toFixed(1)}%`);
      console.log(`  - Dependencies: ${(confidence.dependencies * 100).toFixed(1)}%`);
      console.log(`  - Commands: ${(confidence.commands * 100).toFixed(1)}%`);

    } else {
      console.error('Failed to parse README:', result.errors);
    }

  } catch (error) {
    console.error('Error during parsing:', error);
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateCommandExtraction().catch(console.error);
}

export { demonstrateCommandExtraction };