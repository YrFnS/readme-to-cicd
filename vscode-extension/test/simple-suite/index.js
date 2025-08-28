/**
 * Simple Test Suite
 * 
 * A simplified test suite that runs basic VSCode extension tests
 * without complex Mocha configuration issues.
 */

const path = require('path');
const Mocha = require('mocha');

function run() {
  return new Promise((resolve, reject) => {
    console.log('Setting up simple test suite...');
    
    // Create the mocha test
    const mocha = new Mocha({
      ui: 'tdd',
      color: true,
      timeout: 10000,
      reporter: 'spec'
    });

    const testsRoot = path.resolve(__dirname, '..');
    console.log('Tests root:', testsRoot);

    // Add our basic test file
    const testFile = path.resolve(__dirname, '../../out/suite/extension-basic.test.js');
    console.log('Adding test file:', testFile);
    
    try {
      mocha.addFile(testFile);
      
      console.log('Running tests...');
      mocha.run(failures => {
        if (failures > 0) {
          console.error(`${failures} tests failed.`);
          reject(new Error(`${failures} tests failed.`));
        } else {
          console.log('All tests passed!');
          resolve();
        }
      });
    } catch (err) {
      console.error('Error setting up tests:', err);
      reject(err);
    }
  });
}

module.exports = { run };