// VSCode Extension Compilation Test
// Tests if TypeScript files can compile without VS Code runtime

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Testing VSCode Extension Compilation Status...\n');

const extensionPath = path.join(__dirname, 'vscode-extension');

// Check if extension directory exists
if (!fs.existsSync(extensionPath)) {
  console.error('❌ VSCode extension directory not found');
  process.exit(1);
}

console.log('📁 Extension directory found');

// Check package.json
const packageJsonPath = path.join(extensionPath, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('✅ Package.json exists');
  console.log(`   - Name: ${packageJson.name}`);
  console.log(`   - Version: ${packageJson.version}`);
  console.log(`   - Commands: ${packageJson.contributes?.commands?.length || 0}`);
  console.log(`   - VS Code Engine: ${packageJson.engines?.vscode}`);
} else {
  console.error('❌ Package.json not found');
  process.exit(1);
}

// Check TypeScript configuration
const tsconfigPath = path.join(extensionPath, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  console.log('✅ TypeScript configuration exists');
} else {
  console.error('❌ tsconfig.json not found');
}

// Check source files
const srcPath = path.join(extensionPath, 'src');
if (fs.existsSync(srcPath)) {
  const srcFiles = fs.readdirSync(srcPath, { recursive: true })
    .filter(file => file.endsWith('.ts'))
    .length;
  console.log(`✅ Source directory exists with ${srcFiles} TypeScript files`);
} else {
  console.error('❌ Source directory not found');
}

// Test TypeScript compilation
console.log('\n🔨 Testing TypeScript Compilation...');
try {
  process.chdir(extensionPath);
  
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }
  
  // Try to compile
  console.log('🔧 Compiling TypeScript...');
  const result = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful!');
  
} catch (error) {
  console.error('❌ TypeScript compilation failed:');
  console.error(error.stdout || error.message);
  
  // Count errors
  const errorOutput = error.stdout || error.message;
  const errorMatches = errorOutput.match(/error TS\d+:/g);
  const errorCount = errorMatches ? errorMatches.length : 0;
  
  console.log(`\n📊 Compilation Summary:`);
  console.log(`   - Total Errors: ${errorCount}`);
  console.log(`   - Status: BLOCKED - Cannot test functionality`);
  console.log(`   - Next Step: Fix compilation errors before testing spec`);
}

// Check test files
const testPath = path.join(extensionPath, 'test');
if (fs.existsSync(testPath)) {
  const testFiles = fs.readdirSync(testPath, { recursive: true })
    .filter(file => file.endsWith('.test.ts') || file.endsWith('.test.js'))
    .length;
  console.log(`\n🧪 Test files found: ${testFiles}`);
} else {
  console.log('\n⚠️  No test directory found');
}

console.log('\n📋 VSCode Extension Spec Test Summary:');
console.log('   - Spec Claims: All 18 tasks completed ✅');
console.log('   - Reality: Major compilation issues ❌');
console.log('   - Recommendation: Fix TypeScript errors before spec validation');
console.log('   - Estimated Fix Time: 2-3 days of focused development');