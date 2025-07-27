/**
 * Basic usage example for README-to-CICD parser
 */

import { createReadmeParser } from '../src/parser';

async function basicUsageExample() {
  // Create a parser instance
  const parser = createReadmeParser();

  // Example README content
  const readmeContent = `
# My Awesome Project

A Node.js application built with TypeScript and React.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
npm test
npm run build
\`\`\`

## Testing

We use Jest for testing:

\`\`\`bash
npm test
npm run test:coverage
\`\`\`

## Dependencies

This project uses:
- React 18
- TypeScript 5
- Jest for testing
- ESLint for linting

## Environment Variables

- \`NODE_ENV\` - Environment (development/production)
- \`PORT\` - Server port (default: 3000)
- \`DATABASE_URL\` - Database connection string
`;

  try {
    console.log('🔍 Parsing README content...\n');
    
    // Parse the content
    const result = await parser.parseContent(readmeContent);
    
    if (result.success && result.data) {
      const { data } = result;
      
      // Display extracted information
      console.log('📋 Project Metadata:');
      console.log(`  Name: ${data.metadata.name || 'Not detected'}`);
      console.log(`  Description: ${data.metadata.description || 'Not detected'}`);
      
      console.log('\n💻 Languages Detected:');
      data.languages.forEach(lang => {
        console.log(`  - ${lang.name} (confidence: ${(lang.confidence * 100).toFixed(1)}%)`);
        if (lang.frameworks && lang.frameworks.length > 0) {
          console.log(`    Frameworks: ${lang.frameworks.join(', ')}`);
        }
        console.log(`    Sources: ${lang.sources.join(', ')}`);
      });
      
      console.log('\n📦 Dependencies:');
      console.log(`  Package files: ${data.dependencies.packageFiles.map(pf => pf.name).join(', ') || 'None detected'}`);
      console.log(`  Install commands: ${data.dependencies.installCommands.length}`);
      data.dependencies.installCommands.forEach(cmd => {
        console.log(`    - ${cmd.command}`);
      });
      
      console.log('\n⚡ Commands:');
      const commandTypes = ['build', 'test', 'run', 'install'] as const;
      commandTypes.forEach(type => {
        const commands = data.commands[type];
        if (commands && commands.length > 0) {
          console.log(`  ${type.charAt(0).toUpperCase() + type.slice(1)}:`);
          commands.forEach(cmd => {
            console.log(`    - ${cmd.command} (confidence: ${(cmd.confidence * 100).toFixed(1)}%)`);
          });
        }
      });
      
      console.log('\n🧪 Testing:');
      console.log(`  Frameworks: ${data.testing.frameworks.map(f => f.name).join(', ') || 'None detected'}`);
      console.log(`  Tools: ${data.testing.tools.map(t => t.name).join(', ') || 'None detected'}`);
      console.log(`  Config files: ${data.testing.configFiles.join(', ') || 'None detected'}`);
      
      console.log('\n🎯 Confidence Scores:');
      console.log(`  Overall: ${(data.confidence.overall * 100).toFixed(1)}%`);
      console.log(`  Languages: ${(data.confidence.languages * 100).toFixed(1)}%`);
      console.log(`  Dependencies: ${(data.confidence.dependencies * 100).toFixed(1)}%`);
      console.log(`  Commands: ${(data.confidence.commands * 100).toFixed(1)}%`);
      console.log(`  Testing: ${(data.confidence.testing * 100).toFixed(1)}%`);
      console.log(`  Metadata: ${(data.confidence.metadata * 100).toFixed(1)}%`);
      
      // Show environment variables if detected
      if (data.metadata.environment && data.metadata.environment.length > 0) {
        console.log('\n🌍 Environment Variables:');
        data.metadata.environment.forEach(env => {
          console.log(`  - ${env.name}${env.required ? ' (required)' : ''}`);
          if (env.description) {
            console.log(`    ${env.description}`);
          }
          if (env.defaultValue) {
            console.log(`    Default: ${env.defaultValue}`);
          }
        });
      }
      
    } else {
      console.error('❌ Parsing failed:');
      if (result.errors) {
        result.errors.forEach(error => {
          console.error(`  - ${error.code}: ${error.message}`);
        });
      }
    }
    
    // Show warnings if any
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Example of parsing from file
async function parseFromFileExample() {
  const parser = createReadmeParser();
  
  try {
    console.log('\n📁 Parsing README.md from file...\n');
    
    const result = await parser.parseFile('./README.md');
    
    if (result.success && result.data) {
      console.log('✅ Successfully parsed README.md');
      console.log(`📊 Found ${result.data.languages.length} languages`);
      console.log(`📦 Found ${result.data.dependencies.packageFiles.length} package files`);
      console.log(`⚡ Found ${Object.values(result.data.commands).flat().length} commands`);
      console.log(`🧪 Found ${result.data.testing.frameworks.length} testing frameworks`);
    } else {
      console.error('❌ Failed to parse README.md');
      if (result.errors) {
        result.errors.forEach(error => {
          console.error(`  ${error.severity}: ${error.message}`);
        });
      }
    }
  } catch (error) {
    console.error('💥 Error reading file:', error);
  }
}

// Example of getting parser information
async function parserInfoExample() {
  const parser = createReadmeParser();
  
  console.log('\n🔧 Parser Information:\n');
  
  const info = parser.getParserInfo();
  console.log(`Version: ${info.version}`);
  console.log(`Analyzers registered: ${info.analyzersRegistered}`);
  console.log(`Analyzer names: ${info.analyzerNames.join(', ')}`);
  console.log(`Capabilities: ${info.capabilities.join(', ')}`);
  
  // Parse some content to generate performance stats
  await parser.parseContent('# Test\nA simple test project.');
  
  const perfStats = parser.getPerformanceStats();
  console.log('\n📈 Performance Stats:');
  console.log(`Operations: ${Object.keys(perfStats).length}`);
  
  const cacheStats = parser.getCacheStats();
  console.log('\n💾 Cache Stats:');
  console.log(`Entries: ${cacheStats.entries}`);
  console.log(`Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
  console.log(`Memory usage: ${parser.getMemoryUsage()}`);
}

// Run examples
async function runExamples() {
  console.log('🚀 README-to-CICD Basic Usage Examples\n');
  console.log('=' .repeat(50));
  
  await basicUsageExample();
  
  console.log('\n' + '=' .repeat(50));
  await parseFromFileExample();
  
  console.log('\n' + '=' .repeat(50));
  await parserInfoExample();
  
  console.log('\n✨ Examples completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export { basicUsageExample, parseFromFileExample, parserInfoExample };