import * as path from 'path';
import { glob } from 'glob';
import { setupTestGlobals, cleanupTestGlobals } from '../setup/test-globals';

// Import Mocha using require for compatibility
const Mocha = require('mocha');

export function run(): Promise<void> {
  // Setup global test environment
  setupTestGlobals();
  
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 15000,
    reporter: 'spec'
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise(async (c, e) => {
    try {
      // Use async glob
      const files = await glob('**/**.test.js', { cwd: testsRoot });
      
      // Add files to the test suite
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run(failures => {
          // Cleanup after tests
          cleanupTestGlobals();
          
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        console.error('Error running tests:', err);
        cleanupTestGlobals();
        e(err);
      }
    } catch (err) {
      console.error('Error finding test files:', err);
      cleanupTestGlobals();
      e(err);
    }
  });
}