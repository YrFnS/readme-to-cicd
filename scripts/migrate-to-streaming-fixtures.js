#!/usr/bin/env node

/**
 * Migration script to replace large test fixtures with streaming data
 * This script identifies large fixtures and replaces them with streaming data generators
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const LARGE_FILE_THRESHOLD = 10 * 1024; // 10KB
const FIXTURE_DIRECTORIES = [
  'tests/fixtures',
  'tests/performance',
  'tests/integration'
];

const STREAMING_REPLACEMENTS = {
  'large-readme.md': {
    type: 'readme',
    size: 'large',
    replacement: 'StreamingDataFactory.generateString({ type: "readme", size: "large" })'
  },
  'medium-readme.md': {
    type: 'readme',
    size: 'medium',
    replacement: 'StreamingDataFactory.generateString({ type: "readme", size: "medium" })'
  },
  'complex-package.json': {
    type: 'package-json',
    size: 'large',
    replacement: 'StreamingDataFactory.generateString({ type: "package-json", size: "large" })'
  }
};

class FixtureMigrator {
  constructor() {
    this.migratedFiles = [];
    this.updatedTests = [];
    this.errors = [];
    this.stats = {
      filesAnalyzed: 0,
      largeFilesFound: 0,
      filesReplaced: 0,
      testsUpdated: 0,
      spaceSaved: 0
    };
  }

  async run() {
    console.log('🔄 Starting fixture migration to streaming data...\n');

    try {
      // Step 1: Analyze existing fixtures
      await this.analyzeFixtures();

      // Step 2: Identify large fixtures
      const largeFixtures = await this.identifyLargeFixtures();

      // Step 3: Replace large fixtures with streaming data
      await this.replaceLargeFixtures(largeFixtures);

      // Step 4: Update test files to use streaming data
      await this.updateTestFiles();

      // Step 5: Clean up old fixtures
      await this.cleanupOldFixtures(largeFixtures);

      // Step 6: Generate migration report
      await this.generateMigrationReport();

      console.log('✅ Migration completed successfully!\n');
      this.printSummary();

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }

  async analyzeFixtures() {
    console.log('📊 Analyzing existing fixtures...');

    for (const dir of FIXTURE_DIRECTORIES) {
      try {
        await this.analyzeDirectory(dir);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.errors.push(`Failed to analyze ${dir}: ${error.message}`);
        }
      }
    }

    console.log(`   Analyzed ${this.stats.filesAnalyzed} files\n`);
  }

  async analyzeDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.analyzeDirectory(fullPath);
        } else if (entry.isFile()) {
          await this.analyzeFile(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist, skip silently
    }
  }

  async analyzeFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      this.stats.filesAnalyzed++;

      if (stats.size > LARGE_FILE_THRESHOLD) {
        this.stats.largeFilesFound++;
        console.log(`   📄 Large file: ${filePath} (${(stats.size / 1024).toFixed(1)}KB)`);
      }
    } catch (error) {
      this.errors.push(`Failed to analyze ${filePath}: ${error.message}`);
    }
  }

  async identifyLargeFixtures() {
    console.log('🔍 Identifying large fixtures for replacement...');

    const largeFixtures = [];

    for (const dir of FIXTURE_DIRECTORIES) {
      try {
        const fixtures = await this.findLargeFixturesInDirectory(dir);
        largeFixtures.push(...fixtures);
      } catch (error) {
        // Directory might not exist
      }
    }

    console.log(`   Found ${largeFixtures.length} large fixtures to replace\n`);
    return largeFixtures;
  }

  async findLargeFixturesInDirectory(dirPath) {
    const largeFixtures = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFixtures = await this.findLargeFixturesInDirectory(fullPath);
          largeFixtures.push(...subFixtures);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          
          if (stats.size > LARGE_FILE_THRESHOLD) {
            largeFixtures.push({
              path: fullPath,
              size: stats.size,
              name: entry.name,
              type: this.detectFixtureType(fullPath)
            });
          }
        }
      }
    } catch (error) {
      // Directory might not exist
    }

    return largeFixtures;
  }

  detectFixtureType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath, ext).toLowerCase();

    if (ext === '.md' || basename.includes('readme')) {
      return 'readme';
    } else if (ext === '.json' && basename.includes('package')) {
      return 'package-json';
    } else if (basename.includes('dockerfile')) {
      return 'dockerfile';
    } else if (ext === '.yml' || ext === '.yaml') {
      return 'yaml-config';
    }

    return 'unknown';
  }

  async replaceLargeFixtures(largeFixtures) {
    console.log('🔄 Replacing large fixtures with streaming data generators...');

    for (const fixture of largeFixtures) {
      try {
        await this.replaceFixture(fixture);
      } catch (error) {
        this.errors.push(`Failed to replace ${fixture.path}: ${error.message}`);
      }
    }

    console.log(`   Replaced ${this.stats.filesReplaced} fixtures\n`);
  }

  async replaceFixture(fixture) {
    if (fixture.type === 'unknown') {
      console.log(`   ⚠️  Skipping unknown fixture type: ${fixture.path}`);
      return;
    }

    // Create streaming data generator file
    const generatorPath = fixture.path.replace(/\.[^.]+$/, '.streaming.js');
    const generatorContent = this.generateStreamingDataFile(fixture);

    await fs.writeFile(generatorPath, generatorContent);

    // Create a small placeholder file explaining the migration
    const placeholderContent = this.generatePlaceholderFile(fixture, generatorPath);
    await fs.writeFile(fixture.path + '.migrated', placeholderContent);

    this.migratedFiles.push({
      original: fixture.path,
      generator: generatorPath,
      placeholder: fixture.path + '.migrated',
      sizeSaved: fixture.size
    });

    this.stats.filesReplaced++;
    this.stats.spaceSaved += fixture.size;

    console.log(`   ✅ ${fixture.path} → ${path.basename(generatorPath)}`);
  }

  generateStreamingDataFile(fixture) {
    const size = this.getSizeFromFixture(fixture);
    
    return `/**
 * Streaming data generator for ${fixture.name}
 * Replaces large static fixture with on-demand generation
 * Generated by migrate-to-streaming-fixtures.js
 */

const { StreamingDataFactory } = require('../../src/shared/streaming-test-data');

/**
 * Generate streaming ${fixture.type} data
 * @param {string} size - Size category: 'small', 'medium', 'large', 'xlarge'
 * @returns {Promise<{content: string, metrics: object}>}
 */
async function generate${fixture.type.replace(/-/g, '')}Data(size = '${size}') {
  const config = {
    type: '${fixture.type}',
    size: size,
    maxMemoryUsage: ${this.getMemoryLimitForSize(size)}
  };

  return await StreamingDataFactory.generateString(config);
}

/**
 * Generate streaming data with specific configuration
 * @param {object} config - Streaming data configuration
 * @returns {Promise<{content: string, metrics: object}>}
 */
async function generateWithConfig(config) {
  return await StreamingDataFactory.generateString({
    type: '${fixture.type}',
    size: 'medium',
    ...config
  });
}

module.exports = {
  generate${fixture.type.replace(/-/g, '')}Data,
  generateWithConfig,
  
  // Legacy compatibility
  getContent: () => generate${fixture.type.replace(/-/g, '')}Data('${size}').then(r => r.content),
  
  // Configuration helpers
  getSmallContent: () => generate${fixture.type.replace(/-/g, '')}Data('small').then(r => r.content),
  getMediumContent: () => generate${fixture.type.replace(/-/g, '')}Data('medium').then(r => r.content),
  getLargeContent: () => generate${fixture.type.replace(/-/g, '')}Data('large').then(r => r.content)
};
`;
  }

  generatePlaceholderFile(fixture, generatorPath) {
    return `# Migrated to Streaming Data

This fixture has been migrated to use streaming data generation.

## Original File
- **Path**: ${fixture.path}
- **Size**: ${(fixture.size / 1024).toFixed(1)}KB
- **Type**: ${fixture.type}

## New Generator
- **Path**: ${generatorPath}
- **Type**: Streaming data generator
- **Memory Usage**: On-demand generation

## Usage

Instead of loading this static fixture, use the streaming generator:

\`\`\`javascript
const generator = require('${path.relative(path.dirname(fixture.path), generatorPath)}');

// Get content
const { content, metrics } = await generator.generate${fixture.type.replace(/-/g, '')}Data('medium');

// Or use legacy compatibility
const content = await generator.getContent();
\`\`\`

## Benefits

- ✅ Reduced memory usage
- ✅ Faster test execution
- ✅ Configurable content size
- ✅ No large files in repository

## Migration Date
${new Date().toISOString()}
`;
  }

  getSizeFromFixture(fixture) {
    if (fixture.size < 5 * 1024) return 'small';
    if (fixture.size < 50 * 1024) return 'medium';
    if (fixture.size < 200 * 1024) return 'large';
    return 'xlarge';
  }

  getMemoryLimitForSize(size) {
    const limits = {
      small: 1024 * 1024,      // 1MB
      medium: 5 * 1024 * 1024, // 5MB
      large: 20 * 1024 * 1024, // 20MB
      xlarge: 50 * 1024 * 1024 // 50MB
    };
    return limits[size] || limits.medium;
  }

  async updateTestFiles() {
    console.log('🔧 Updating test files to use streaming data...');

    const testFiles = await this.findTestFiles();

    for (const testFile of testFiles) {
      try {
        await this.updateTestFile(testFile);
      } catch (error) {
        this.errors.push(`Failed to update ${testFile}: ${error.message}`);
      }
    }

    console.log(`   Updated ${this.stats.testsUpdated} test files\n`);
  }

  async findTestFiles() {
    const testFiles = [];
    const testDirs = ['tests/unit', 'tests/integration', 'tests/performance'];

    for (const dir of testDirs) {
      try {
        const files = await this.findFilesRecursively(dir, /\.test\.(ts|js)$/);
        testFiles.push(...files);
      } catch (error) {
        // Directory might not exist
      }
    }

    return testFiles;
  }

  async findFilesRecursively(dirPath, pattern) {
    const files = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findFilesRecursively(fullPath, pattern);
          files.push(...subFiles);
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }

    return files;
  }

  async updateTestFile(testFilePath) {
    const content = await fs.readFile(testFilePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;

    // Look for large fixture imports or usage
    const fixturePatterns = [
      /require\(['"].*fixtures.*large.*['"]\)/g,
      /import.*from ['"].*fixtures.*large.*['"];/g,
      /readFileSync\(['"].*fixtures.*large.*['"]\)/g,
      /generateLargeReadme\(['"]large['"]\)/g
    ];

    for (const pattern of fixturePatterns) {
      if (pattern.test(content)) {
        // Add streaming data import if not present
        if (!content.includes('StreamingDataFactory')) {
          const importLine = testFilePath.endsWith('.ts') 
            ? "import { StreamingDataFactory } from '../../../src/shared/streaming-test-data';"
            : "const { StreamingDataFactory } = require('../../../src/shared/streaming-test-data');";
          
          updatedContent = importLine + '\\n' + updatedContent;
          hasChanges = true;
        }

        // Replace large fixture usage with streaming data
        updatedContent = updatedContent.replace(
          /const content = generateLargeReadme\(['"]([^'"]+)['"]\);/g,
          'const { content } = await StreamingDataFactory.generateString({ type: "readme", size: "$1" });'
        );

        updatedContent = updatedContent.replace(
          /readFileSync\(['"]([^'"]*fixtures[^'"]*large[^'"]*)['"]\)/g,
          'await StreamingDataFactory.generateString({ type: "readme", size: "large" }).then(r => r.content)'
        );

        hasChanges = true;
      }
    }

    if (hasChanges) {
      await fs.writeFile(testFilePath, updatedContent);
      this.updatedTests.push(testFilePath);
      this.stats.testsUpdated++;
      console.log(`   ✅ Updated ${testFilePath}`);
    }
  }

  async cleanupOldFixtures(largeFixtures) {
    console.log('🧹 Cleaning up old fixtures...');

    for (const fixture of largeFixtures) {
      try {
        // Move original file to backup
        const backupPath = fixture.path + '.backup';
        await fs.rename(fixture.path, backupPath);
        console.log(`   📦 Backed up ${fixture.path}`);
      } catch (error) {
        this.errors.push(`Failed to backup ${fixture.path}: ${error.message}`);
      }
    }

    console.log('   Old fixtures backed up with .backup extension\n');
  }

  async generateMigrationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      migratedFiles: this.migratedFiles,
      updatedTests: this.updatedTests,
      errors: this.errors,
      recommendations: this.generateRecommendations()
    };

    const reportPath = 'docs/streaming-fixtures-migration-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Also create a markdown report
    const markdownReport = this.generateMarkdownReport(report);
    await fs.writeFile('docs/streaming-fixtures-migration-report.md', markdownReport);

    console.log(`📋 Migration report saved to ${reportPath}\n`);
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.stats.largeFilesFound > this.stats.filesReplaced) {
      recommendations.push('Some large files were not replaced. Review them manually for streaming data opportunities.');
    }

    if (this.errors.length > 0) {
      recommendations.push('Review and fix migration errors before proceeding.');
    }

    if (this.stats.spaceSaved > 100 * 1024) {
      recommendations.push('Consider running git gc to reclaim disk space from removed large files.');
    }

    recommendations.push('Update CI/CD scripts to ensure streaming data generators work in all environments.');
    recommendations.push('Run the full test suite to verify all migrations work correctly.');

    return recommendations;
  }

  generateMarkdownReport(report) {
    return `# Streaming Fixtures Migration Report

Generated on: ${report.timestamp}

## Summary

- **Files Analyzed**: ${report.stats.filesAnalyzed}
- **Large Files Found**: ${report.stats.largeFilesFound}
- **Files Replaced**: ${report.stats.filesReplaced}
- **Tests Updated**: ${report.stats.testsUpdated}
- **Space Saved**: ${(report.stats.spaceSaved / 1024).toFixed(1)}KB

## Migrated Files

${report.migratedFiles.map(file => `
### ${path.basename(file.original)}
- **Original**: ${file.original}
- **Generator**: ${file.generator}
- **Size Saved**: ${(file.sizeSaved / 1024).toFixed(1)}KB
`).join('')}

## Updated Test Files

${report.updatedTests.map(test => `- ${test}`).join('\\n')}

## Errors

${report.errors.length > 0 ? report.errors.map(error => `- ❌ ${error}`).join('\\n') : 'No errors occurred during migration.'}

## Recommendations

${report.recommendations.map(rec => `- 📝 ${rec}`).join('\\n')}

## Next Steps

1. Run the test suite to verify migrations: \`npm test\`
2. Review any errors and fix them
3. Update documentation to reflect streaming data usage
4. Consider removing .backup files after verification
5. Update CI/CD configurations if needed

## Benefits Achieved

- ✅ Reduced repository size by ${(report.stats.spaceSaved / 1024).toFixed(1)}KB
- ✅ Improved test performance through streaming data
- ✅ Reduced memory usage during test execution
- ✅ More maintainable test fixtures
`;
  }

  printSummary() {
    console.log('📊 Migration Summary:');
    console.log(`   Files analyzed: ${this.stats.filesAnalyzed}`);
    console.log(`   Large files found: ${this.stats.largeFilesFound}`);
    console.log(`   Files replaced: ${this.stats.filesReplaced}`);
    console.log(`   Tests updated: ${this.stats.testsUpdated}`);
    console.log(`   Space saved: ${(this.stats.spaceSaved / 1024).toFixed(1)}KB`);
    
    if (this.errors.length > 0) {
      console.log(`   Errors: ${this.errors.length}`);
      console.log('\\n❌ Errors occurred:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    console.log('\\n🎉 Migration completed! Run tests to verify everything works.');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new FixtureMigrator();
  migrator.run().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = FixtureMigrator;