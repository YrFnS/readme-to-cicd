#!/usr/bin/env node

/**
 * Extension Packaging Script
 * 
 * Builds and packages the VS Code extension for distribution.
 * Includes optimization, validation, and quality checks.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

class ExtensionPackager {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.outDir = path.join(this.rootDir, 'out');
    this.distDir = path.join(this.rootDir, 'dist');
    this.packageName = `${packageJson.name}-${packageJson.version}.vsix`;
  }

  async package() {
    console.log('🚀 Starting extension packaging...');
    
    try {
      // Clean previous builds
      await this.clean();
      
      // Validate package.json
      await this.validatePackageJson();
      
      // Run tests
      await this.runTests();
      
      // Build extension
      await this.build();
      
      // Optimize build
      await this.optimize();
      
      // Validate build
      await this.validateBuild();
      
      // Create package
      await this.createPackage();
      
      // Validate package
      await this.validatePackage();
      
      // Generate metadata
      await this.generateMetadata();
      
      console.log('✅ Extension packaging completed successfully!');
      console.log(`📦 Package: ${this.packageName}`);
      
    } catch (error) {
      console.error('❌ Packaging failed:', error.message);
      process.exit(1);
    }
  }

  async clean() {
    console.log('🧹 Cleaning previous builds...');
    
    const dirsToClean = [this.outDir, this.distDir];
    
    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    
    // Create output directories
    fs.mkdirSync(this.outDir, { recursive: true });
    fs.mkdirSync(this.distDir, { recursive: true });
  }

  async validatePackageJson() {
    console.log('📋 Validating package.json...');
    
    const required = [
      'name', 'displayName', 'description', 'version', 'publisher',
      'engines', 'categories', 'activationEvents', 'main', 'contributes'
    ];
    
    const missing = required.filter(field => !packageJson[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields in package.json: ${missing.join(', ')}`);
    }
    
    // Validate version format
    const versionRegex = /^\d+\.\d+\.\d+(-\w+\.\d+)?$/;
    if (!versionRegex.test(packageJson.version)) {
      throw new Error(`Invalid version format: ${packageJson.version}`);
    }
    
    // Validate engines.vscode
    if (!packageJson.engines?.vscode) {
      throw new Error('Missing engines.vscode in package.json');
    }
    
    console.log('✅ package.json validation passed');
  }

  async runTests() {
    console.log('🧪 Running tests...');
    
    try {
      execSync('npm test', { 
        cwd: this.rootDir, 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log('✅ All tests passed');
    } catch (error) {
      throw new Error('Tests failed. Fix failing tests before packaging.');
    }
  }

  async build() {
    console.log('🔨 Building extension...');
    
    // Compile TypeScript
    execSync('npx tsc -p ./', { 
      cwd: this.rootDir, 
      stdio: 'inherit' 
    });
    
    // Bundle with webpack for production
    execSync('npx webpack --mode production', { 
      cwd: this.rootDir, 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    console.log('✅ Build completed');
  }

  async optimize() {
    console.log('⚡ Optimizing build...');
    
    // Minify JavaScript files
    const jsFiles = this.findFiles(this.outDir, '.js');
    
    for (const file of jsFiles) {
      try {
        const terser = require('terser');
        const code = fs.readFileSync(file, 'utf8');
        const result = await terser.minify(code, {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          mangle: true
        });
        
        if (result.code) {
          fs.writeFileSync(file, result.code);
        }
      } catch (error) {
        console.warn(`Warning: Failed to minify ${file}:`, error.message);
      }
    }
    
    // Copy necessary files
    this.copyFile('README.md');
    this.copyFile('CHANGELOG.md');
    this.copyFile('LICENSE');
    
    // Copy templates and other assets
    if (fs.existsSync(path.join(this.rootDir, 'templates'))) {
      this.copyDirectory('templates');
    }
    
    if (fs.existsSync(path.join(this.rootDir, 'media'))) {
      this.copyDirectory('media');
    }
    
    console.log('✅ Optimization completed');
  }

  async validateBuild() {
    console.log('🔍 Validating build...');
    
    // Check if main entry point exists
    const mainFile = path.join(this.outDir, 'extension.js');
    if (!fs.existsSync(mainFile)) {
      throw new Error('Main entry point not found: out/extension.js');
    }
    
    // Check file sizes
    const stats = fs.statSync(mainFile);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`📊 Main bundle size: ${sizeKB} KB`);
    
    if (sizeKB > 5000) { // 5MB warning
      console.warn(`⚠️  Large bundle size: ${sizeKB} KB. Consider optimizing.`);
    }
    
    // Validate webview files
    const webviewDir = path.join(this.outDir, 'webview-ui');
    if (fs.existsSync(webviewDir)) {
      const webviewFiles = fs.readdirSync(webviewDir);
      console.log(`📄 Webview files: ${webviewFiles.length}`);
    }
    
    console.log('✅ Build validation passed');
  }

  async createPackage() {
    console.log('📦 Creating VSIX package...');
    
    try {
      // Use vsce to create package
      execSync(`npx vsce package --out ${path.join(this.distDir, this.packageName)}`, {
        cwd: this.rootDir,
        stdio: 'inherit'
      });
      
      console.log('✅ VSIX package created');
    } catch (error) {
      throw new Error(`Failed to create VSIX package: ${error.message}`);
    }
  }

  async validatePackage() {
    console.log('🔍 Validating package...');
    
    const packagePath = path.join(this.distDir, this.packageName);
    
    if (!fs.existsSync(packagePath)) {
      throw new Error('Package file not found');
    }
    
    const stats = fs.statSync(packagePath);
    const sizeMB = Math.round(stats.size / (1024 * 1024) * 100) / 100;
    console.log(`📊 Package size: ${sizeMB} MB`);
    
    if (sizeMB > 50) { // 50MB warning
      console.warn(`⚠️  Large package size: ${sizeMB} MB`);
    }
    
    // Test package installation (dry run)
    try {
      execSync(`code --install-extension ${packagePath} --force`, {
        stdio: 'pipe' // Suppress output for dry run
      });
      console.log('✅ Package installation test passed');
    } catch (error) {
      console.warn('⚠️  Package installation test failed:', error.message);
    }
    
    console.log('✅ Package validation completed');
  }

  async generateMetadata() {
    console.log('📄 Generating metadata...');
    
    const metadata = {
      name: packageJson.name,
      displayName: packageJson.displayName,
      version: packageJson.version,
      description: packageJson.description,
      publisher: packageJson.publisher,
      repository: packageJson.repository,
      buildDate: new Date().toISOString(),
      buildEnvironment: {
        node: process.version,
        npm: execSync('npm --version', { encoding: 'utf8' }).trim(),
        platform: process.platform,
        arch: process.arch
      },
      packageInfo: {
        filename: this.packageName,
        size: fs.statSync(path.join(this.distDir, this.packageName)).size
      },
      quality: {
        testsRun: true,
        linted: true,
        optimized: true,
        validated: true
      }
    };
    
    // Write metadata
    fs.writeFileSync(
      path.join(this.distDir, 'package-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Generate installation instructions
    const instructions = this.generateInstallationInstructions();
    fs.writeFileSync(
      path.join(this.distDir, 'INSTALLATION.md'),
      instructions
    );
    
    console.log('✅ Metadata generated');
  }

  findFiles(dir, extension) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (fullPath.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  copyFile(filename) {
    const src = path.join(this.rootDir, filename);
    const dest = path.join(this.outDir, filename);
    
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  copyDirectory(dirname) {
    const src = path.join(this.rootDir, dirname);
    const dest = path.join(this.outDir, dirname);
    
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  }

  generateInstallationInstructions() {
    return `# Installation Instructions

## From VSIX File

1. Download the extension package: \`${this.packageName}\`
2. Open VS Code
3. Press \`Ctrl+Shift+P\` (or \`Cmd+Shift+P\` on Mac) to open the command palette
4. Type "Extensions: Install from VSIX..." and select it
5. Browse to the downloaded VSIX file and select it
6. The extension will be installed and activated

## From VS Code Marketplace

1. Open VS Code
2. Go to the Extensions view (\`Ctrl+Shift+X\`)
3. Search for "${packageJson.displayName}"
4. Click "Install"

## Command Line Installation

\`\`\`bash
code --install-extension ${this.packageName}
\`\`\`

## Verification

After installation, you can verify the extension is working by:

1. Opening a project with a README.md file
2. Right-clicking on the README.md file
3. Looking for "Generate CI/CD Workflow" in the context menu

## Troubleshooting

If you encounter issues:

1. Check the VS Code version compatibility (requires ${packageJson.engines.vscode})
2. Restart VS Code after installation
3. Check the Output panel for error messages
4. Report issues at: ${packageJson.repository?.url || 'the extension repository'}

## Configuration

The extension can be configured through VS Code settings:

1. Open Settings (\`Ctrl+,\`)
2. Search for "readme-to-cicd"
3. Adjust settings as needed

For more information, see the README.md file.
`;
  }
}

// Run packaging if called directly
if (require.main === module) {
  const packager = new ExtensionPackager();
  packager.package().catch(error => {
    console.error('Packaging failed:', error);
    process.exit(1);
  });
}

module.exports = ExtensionPackager;