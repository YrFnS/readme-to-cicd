#!/usr/bin/env node

/**
 * Streaming generator for large README files to test parser performance
 * Replaces static large fixtures with on-demand streaming data generation
 * Usage: node large-readme-generator.js [size] [output-file]
 */

const fs = require('fs');
const path = require('path');

// Import streaming data factory
const { StreamingDataFactory } = require('../../../src/shared/streaming-test-data');

// Configuration for backward compatibility
const DEFAULT_SIZE = 'medium'; // small, medium, large, xlarge
const DEFAULT_OUTPUT = 'large-readme.md';

// Legacy size configuration (now handled by StreamingDataFactory)
const SIZES = {
  small: { sections: 50, codeBlocks: 100, lines: 1000 },
  medium: { sections: 200, codeBlocks: 500, lines: 5000 },
  large: { sections: 500, codeBlocks: 1000, lines: 10000 },
  xlarge: { sections: 1000, codeBlocks: 2000, lines: 20000 }
};

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'cpp', 'csharp',
  'php', 'ruby', 'swift', 'kotlin', 'scala', 'clojure', 'haskell', 'erlang'
];

const FRAMEWORKS = [
  'React', 'Vue', 'Angular', 'Express', 'Django', 'Flask', 'Spring Boot',
  'Rails', 'Laravel', 'ASP.NET', 'Gin', 'Actix', 'Rocket', 'Axum'
];

const COMMANDS = [
  'npm install', 'yarn install', 'pip install', 'cargo build', 'go build',
  'mvn compile', 'gradle build', 'make', 'cmake', 'docker build'
];

const TEST_COMMANDS = [
  'npm test', 'yarn test', 'pytest', 'cargo test', 'go test',
  'mvn test', 'gradle test', 'jest', 'vitest', 'mocha'
];

function generateRandomContent(lines) {
  const content = [];
  const loremWords = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
    'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
    'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam'
  ];

  for (let i = 0; i < lines; i++) {
    const wordCount = Math.floor(Math.random() * 15) + 5;
    const words = [];
    for (let j = 0; j < wordCount; j++) {
      words.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
    }
    content.push(words.join(' ') + '.');
  }
  
  return content.join(' ');
}

function generateCodeBlock(language) {
  const codeExamples = {
    javascript: `
function processData(data) {
  return data.map(item => ({
    ...item,
    processed: true,
    timestamp: Date.now()
  }));
}

const result = processData(inputData);
console.log('Processing complete:', result.length);`,
    
    python: `
def process_data(data):
    """Process input data and return results."""
    processed = []
    for item in data:
        item['processed'] = True
        item['timestamp'] = time.time()
        processed.append(item)
    return processed

result = process_data(input_data)
print(f"Processing complete: {len(result)} items")`,
    
    go: `
func processData(data []Item) []Item {
    processed := make([]Item, len(data))
    for i, item := range data {
        item.Processed = true
        item.Timestamp = time.Now().Unix()
        processed[i] = item
    }
    return processed
}

result := processData(inputData)
fmt.Printf("Processing complete: %d items\\n", len(result))`,
    
    rust: `
fn process_data(data: Vec<Item>) -> Vec<Item> {
    data.into_iter()
        .map(|mut item| {
            item.processed = true;
            item.timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            item
        })
        .collect()
}

let result = process_data(input_data);
println!("Processing complete: {} items", result.len());`
  };

  return codeExamples[language] || codeExamples.javascript;
}

function generateSection(index, config) {
  const sectionTypes = ['installation', 'usage', 'configuration', 'api', 'examples', 'deployment'];
  const sectionType = sectionTypes[index % sectionTypes.length];
  const language = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
  const framework = FRAMEWORKS[Math.floor(Math.random() * FRAMEWORKS.length)];
  
  let content = `## ${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} ${index + 1}\n\n`;
  
  // Add description
  content += generateRandomContent(Math.floor(Math.random() * 5) + 2) + '\n\n';
  
  // Add framework mention
  content += `This section covers ${framework} integration with ${language}.\n\n`;
  
  // Add code block
  if (Math.random() > 0.3) {
    content += `\`\`\`${language}\n${generateCodeBlock(language)}\n\`\`\`\n\n`;
  }
  
  // Add command examples
  if (Math.random() > 0.5) {
    const command = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    const testCommand = TEST_COMMANDS[Math.floor(Math.random() * TEST_COMMANDS.length)];
    
    content += `### Commands\n\n`;
    content += `\`\`\`bash\n# Install dependencies\n${command}\n\n# Run tests\n${testCommand}\n\`\`\`\n\n`;
  }
  
  // Add more content
  content += generateRandomContent(Math.floor(Math.random() * 10) + 3) + '\n\n';
  
  return content;
}

/**
 * Generate large README using streaming data (new implementation)
 * @param {string} size - Size category: 'small', 'medium', 'large', 'xlarge'
 * @returns {Promise<string>} Generated README content
 */
async function generateLargeReadme(size) {
  try {
    const config = {
      type: 'readme',
      size: size || DEFAULT_SIZE,
      maxMemoryUsage: getMemoryLimitForSize(size || DEFAULT_SIZE)
    };

    const { content, metrics } = await StreamingDataFactory.generateString(config);
    
    // Log performance metrics for backward compatibility
    console.log(`Generated ${size} README:`);
    console.log(`  Content size: ${(metrics.bytesGenerated / 1024).toFixed(1)}KB`);
    console.log(`  Generation time: ${metrics.generationTime}ms`);
    console.log(`  Peak memory: ${(metrics.peakMemoryUsage / 1024).toFixed(1)}KB`);
    console.log(`  Chunks: ${metrics.chunksGenerated}`);
    
    return content;
  } catch (error) {
    console.error('Failed to generate streaming README:', error.message);
    // Fallback to legacy generation for compatibility
    return generateLargeReadmeLegacy(size);
  }
}

/**
 * Get memory limit for size category
 * @param {string} size - Size category
 * @returns {number} Memory limit in bytes
 */
function getMemoryLimitForSize(size) {
  const limits = {
    small: 2 * 1024 * 1024,      // 2MB
    medium: 10 * 1024 * 1024,    // 10MB
    large: 50 * 1024 * 1024,     // 50MB
    xlarge: 100 * 1024 * 1024    // 100MB
  };
  return limits[size] || limits.medium;
}

/**
 * Legacy README generation (fallback)
 * @param {string} size - Size category
 * @returns {string} Generated README content
 */
function generateLargeReadmeLegacy(size) {
  const config = SIZES[size];
  let content = '';
  
  // Header
  content += `# Large README Performance Test (${size})\n\n`;
  content += `This is a generated README file for performance testing with ${config.sections} sections, `;
  content += `${config.codeBlocks} code blocks, and approximately ${config.lines} lines.\n\n`;
  
  // Table of contents
  content += `## Table of Contents\n\n`;
  for (let i = 0; i < Math.min(config.sections, 50); i++) {
    const sectionTypes = ['installation', 'usage', 'configuration', 'api', 'examples', 'deployment'];
    const sectionType = sectionTypes[i % sectionTypes.length];
    content += `- [${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} ${i + 1}](#${sectionType}-${i + 1})\n`;
  }
  content += '\n';
  
  // Overview
  content += `## Overview\n\n`;
  content += generateRandomContent(20) + '\n\n';
  
  // Features list
  content += `## Features\n\n`;
  for (let i = 0; i < 20; i++) {
    const feature = FRAMEWORKS[Math.floor(Math.random() * FRAMEWORKS.length)];
    const lang = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
    content += `- ✅ ${feature} integration with ${lang}\n`;
  }
  content += '\n';
  
  // Tech stack
  content += `## Tech Stack\n\n`;
  content += `### Languages\n`;
  LANGUAGES.forEach(lang => {
    content += `- **${lang.charAt(0).toUpperCase() + lang.slice(1)}**: ${generateRandomContent(1)}\n`;
  });
  content += '\n';
  
  content += `### Frameworks\n`;
  FRAMEWORKS.forEach(framework => {
    content += `- **${framework}**: ${generateRandomContent(1)}\n`;
  });
  content += '\n';
  
  // Generate sections
  for (let i = 0; i < config.sections; i++) {
    content += generateSection(i, config);
    
    // Add progress indicator
    if (i % 100 === 0 && i > 0) {
      console.log(`Generated ${i}/${config.sections} sections...`);
    }
  }
  
  // Performance metrics
  content += `## Performance Metrics\n\n`;
  content += `| Metric | Value |\n`;
  content += `|--------|-------|\n`;
  content += `| Sections | ${config.sections} |\n`;
  content += `| Code Blocks | ${config.codeBlocks} |\n`;
  content += `| Estimated Lines | ${config.lines} |\n`;
  content += `| File Size | ~${Math.round(content.length / 1024)}KB |\n\n`;
  
  return content;
}

/**
 * Main function for CLI usage
 */
async function main() {
  const args = process.argv.slice(2);
  const size = args[0] || DEFAULT_SIZE;
  const outputFile = args[1] || DEFAULT_OUTPUT;
  
  if (!SIZES[size]) {
    console.error(`Invalid size: ${size}. Available sizes: ${Object.keys(SIZES).join(', ')}`);
    process.exit(1);
  }
  
  console.log(`Generating ${size} README file using streaming data...`);
  const startTime = Date.now();
  
  try {
    const content = await generateLargeReadme(size);
    const outputPath = path.join(__dirname, outputFile);
    
    fs.writeFileSync(outputPath, content, 'utf8');
    
    const endTime = Date.now();
    const fileSize = fs.statSync(outputPath).size;
    
    console.log(`✅ Generated ${outputFile}`);
    console.log(`📊 File size: ${Math.round(fileSize / 1024)}KB`);
    console.log(`⏱️  Generation time: ${endTime - startTime}ms`);
    console.log(`📝 Lines: ${content.split('\n').length}`);
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// Export both streaming and legacy functions for compatibility
module.exports = { 
  generateLargeReadme, 
  generateLargeReadmeLegacy,
  SIZES,
  
  // Convenience functions for different sizes
  generateSmallReadme: () => generateLargeReadme('small'),
  generateMediumReadme: () => generateLargeReadme('medium'),
  generateLargeReadmeContent: () => generateLargeReadme('large'),
  generateXLargeReadme: () => generateLargeReadme('xlarge'),
  
  // Streaming data factory access
  StreamingDataFactory
};