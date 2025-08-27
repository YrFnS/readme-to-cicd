#!/usr/bin/env node

/**
 * CLI Dependencies Verification Script
 * Verifies that all required CLI dependencies are properly installed and functional
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

console.log('🔍 Verifying CLI Dependencies...\n');

async function verifyDependency(name, importPath, testFunction) {
  try {
    console.log(`📦 Testing ${name}...`);
    const module = await import(importPath);
    await testFunction(module);
    console.log(`✅ ${name} - OK\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} - FAILED: ${error.message}\n`);
    return false;
  }
}

async function main() {
  const results = [];

  // Test cosmiconfig
  results.push(await verifyDependency('cosmiconfig', 'cosmiconfig', async (module) => {
    const { cosmiconfigSync } = module;
    if (typeof cosmiconfigSync !== 'function') {
      throw new Error('cosmiconfigSync is not a function');
    }
    const explorer = cosmiconfigSync('test');
    if (!explorer || typeof explorer.search !== 'function') {
      throw new Error('Explorer does not have search method');
    }
  }));

  // Test commander
  results.push(await verifyDependency('commander', 'commander', async (module) => {
    const { Command } = module;
    if (typeof Command !== 'function') {
      throw new Error('Command is not a constructor');
    }
    const program = new Command();
    if (!program || typeof program.command !== 'function') {
      throw new Error('Program does not have command method');
    }
  }));

  // Test inquirer
  results.push(await verifyDependency('inquirer', 'inquirer', async (module) => {
    const inquirer = module.default;
    if (!inquirer || typeof inquirer.prompt !== 'function') {
      throw new Error('Inquirer does not have prompt method');
    }
  }));

  // Test ora
  results.push(await verifyDependency('ora', 'ora', async (module) => {
    const ora = module.default;
    if (typeof ora !== 'function') {
      throw new Error('Ora is not a function');
    }
    const spinner = ora('Test');
    if (!spinner || typeof spinner.start !== 'function' || typeof spinner.stop !== 'function') {
      throw new Error('Spinner does not have required methods');
    }
  }));

  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('📊 Summary:');
  console.log(`✅ Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All CLI dependencies are properly installed and functional!');
    process.exit(0);
  } else {
    console.log('❌ Some CLI dependencies failed verification');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Verification script failed:', error);
  process.exit(1);
});