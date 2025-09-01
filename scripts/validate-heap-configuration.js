#!/usr/bin/env node

/**
 * Heap Size Configuration Validation Script
 * 
 * This script validates that Node.js heap size limits are properly configured
 * across all test environments and package.json scripts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

/**
 * Validate package.json scripts have proper heap configuration
 */
function validatePackageJsonScripts() {
  logHeader('Validating package.json Scripts');
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const testScripts = Object.entries(packageJson.scripts)
    .filter(([name]) => name.startsWith('test:'));
  
  const expectedHeapSizes = {
    'test:unit': '1024',
    'test:integration': '2048',
    'test:performance': '4096',
    'test:comprehensive': '3072',
    'test:coverage': '2048',
    'test:all': '3072'
  };
  
  let allValid = true;
  
  testScripts.forEach(([scriptName, scriptCommand]) => {
    const hasNodeOptions = scriptCommand.includes('NODE_OPTIONS=');
    const hasMaxOldSpace = scriptCommand.includes('--max-old-space-size=');
    const hasExposeGC = scriptCommand.includes('--expose-gc');
    
    if (!hasNodeOptions || !hasMaxOldSpace || !hasExposeGC) {
      logError(`${scriptName}: Missing heap configuration`);
      allValid = false;
    } else {
      const expectedSize = expectedHeapSizes[scriptName];
      if (expectedSize && !scriptCommand.includes(`--max-old-space-size=${expectedSize}`)) {
        logWarning(`${scriptName}: Unexpected heap size (expected ${expectedSize}MB)`);
      } else {
        logSuccess(`${scriptName}: Properly configured`);
      }
    }
  });
  
  return allValid;
}

/**
 * Validate vitest.config.ts includes heap setup
 */
function validateVitestConfig() {
  logHeader('Validating Vitest Configuration');
  
  const vitestConfigPath = path.join(__dirname, '..', 'vitest.config.ts');
  const vitestConfig = fs.readFileSync(vitestConfigPath, 'utf8');
  
  let allValid = true;
  
  if (!vitestConfig.includes('heap-size-setup.ts')) {
    logError('vitest.config.ts: Missing heap-size-setup.ts in setupFiles');
    allValid = false;
  } else {
    logSuccess('vitest.config.ts: Includes heap-size-setup.ts');
  }
  
  if (!vitestConfig.includes('NODE_OPTIONS')) {
    logWarning('vitest.config.ts: No NODE_OPTIONS in env configuration');
  } else {
    logSuccess('vitest.config.ts: Has NODE_OPTIONS configuration');
  }
  
  return allValid;
}

/**
 * Validate heap size configuration files exist
 */
function validateConfigurationFiles() {
  logHeader('Validating Configuration Files');
  
  const requiredFiles = [
    'src/shared/heap-size-config.ts',
    'tests/setup/heap-size-setup.ts',
    'tests/unit/shared/heap-size-config.test.ts',
    'tests/integration/heap-size-validation.test.ts'
  ];
  
  let allValid = true;
  
  requiredFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${filePath}: Exists`);
    } else {
      logError(`${filePath}: Missing`);
      allValid = false;
    }
  });
  
  return allValid;
}

/**
 * Test heap configuration by running a simple memory test
 */
function testHeapConfiguration() {
  logHeader('Testing Heap Configuration');
  
  try {
    // Test unit test configuration
    log('Testing unit test heap configuration...');
    execSync('NODE_OPTIONS="--max-old-space-size=1024 --expose-gc" node -e "console.log(\'Unit test heap config OK\')"', 
      { stdio: 'pipe' });
    logSuccess('Unit test heap configuration works');
    
    // Test integration test configuration
    log('Testing integration test heap configuration...');
    execSync('NODE_OPTIONS="--max-old-space-size=2048 --expose-gc" node -e "console.log(\'Integration test heap config OK\')"', 
      { stdio: 'pipe' });
    logSuccess('Integration test heap configuration works');
    
    // Test performance test configuration
    log('Testing performance test heap configuration...');
    execSync('NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" node -e "console.log(\'Performance test heap config OK\')"', 
      { stdio: 'pipe' });
    logSuccess('Performance test heap configuration works');
    
    // Test garbage collection availability
    log('Testing garbage collection availability...');
    const gcTest = execSync('NODE_OPTIONS="--expose-gc" node -e "console.log(typeof global.gc)"', 
      { encoding: 'utf8' });
    
    if (gcTest.trim() === 'function') {
      logSuccess('Garbage collection is available');
    } else {
      logError('Garbage collection is not available');
      return false;
    }
    
    return true;
    
  } catch (error) {
    logError(`Heap configuration test failed: ${error.message}`);
    return false;
  }
}

/**
 * Run heap configuration validation tests
 */
function runValidationTests() {
  logHeader('Running Heap Configuration Tests');
  
  try {
    // Run heap configuration unit tests
    log('Running heap configuration unit tests...');
    execSync('npm run test:unit -- tests/unit/shared/heap-size-config.test.ts --run', 
      { stdio: 'inherit' });
    logSuccess('Heap configuration unit tests passed');
    
    // Run heap configuration integration tests
    log('Running heap configuration integration tests...');
    execSync('npm run test:integration -- tests/integration/heap-size-validation.test.ts --run', 
      { stdio: 'inherit' });
    logSuccess('Heap configuration integration tests passed');
    
    return true;
    
  } catch (error) {
    logError(`Heap configuration tests failed: ${error.message}`);
    return false;
  }
}

/**
 * Generate heap configuration report
 */
function generateReport(results) {
  logHeader('Heap Configuration Validation Report');
  
  const allPassed = Object.values(results).every(result => result);
  
  log(`Package.json Scripts: ${results.packageJson ? 'PASS' : 'FAIL'}`, 
    results.packageJson ? 'green' : 'red');
  log(`Vitest Configuration: ${results.vitestConfig ? 'PASS' : 'FAIL'}`, 
    results.vitestConfig ? 'green' : 'red');
  log(`Configuration Files: ${results.configFiles ? 'PASS' : 'FAIL'}`, 
    results.configFiles ? 'green' : 'red');
  log(`Heap Configuration Test: ${results.heapTest ? 'PASS' : 'FAIL'}`, 
    results.heapTest ? 'green' : 'red');
  log(`Validation Tests: ${results.validationTests ? 'PASS' : 'FAIL'}`, 
    results.validationTests ? 'green' : 'red');
  
  log(`\nOverall Status: ${allPassed ? 'PASS' : 'FAIL'}`, 
    allPassed ? 'green' : 'red');
  
  if (allPassed) {
    log('\n🎉 All heap size configuration validations passed!', 'green');
    log('The system is properly configured with Node.js heap size limits.', 'green');
  } else {
    log('\n❌ Some heap size configuration validations failed.', 'red');
    log('Please review the errors above and fix the configuration issues.', 'red');
  }
  
  return allPassed;
}

/**
 * Main validation function
 */
function main() {
  log(`${colors.bold}Node.js Heap Size Configuration Validation${colors.reset}`);
  log('This script validates heap size limits across all test environments.\n');
  
  const results = {
    packageJson: validatePackageJsonScripts(),
    vitestConfig: validateVitestConfig(),
    configFiles: validateConfigurationFiles(),
    heapTest: testHeapConfiguration(),
    validationTests: runValidationTests()
  };
  
  const success = generateReport(results);
  process.exit(success ? 0 : 1);
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validatePackageJsonScripts,
  validateVitestConfig,
  validateConfigurationFiles,
  testHeapConfiguration,
  runValidationTests
};