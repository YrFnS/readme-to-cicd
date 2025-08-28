/**
 * Simple Test Runner
 * 
 * A basic test runner that bypasses the complex Mocha setup issues
 * and directly runs our VSCode extension tests.
 */

const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
    console.log('Starting VSCode extension tests...');
    
    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, '../');

    // The path to the test runner
    const extensionTestsPath = path.resolve(__dirname, './simple-suite');

    console.log('Extension path:', extensionDevelopmentPath);
    console.log('Tests path:', extensionTestsPath);

    // Download VS Code, unzip it and run the integration test
    await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath,
      launchArgs: ['--disable-extensions']
    });
    
    console.log('Tests completed successfully!');
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();