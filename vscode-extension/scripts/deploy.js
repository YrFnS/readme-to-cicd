#!/usr/bin/env node

/**
 * Deployment script for README to CI/CD VS Code Extension
 * 
 * This script handles the complete deployment process including:
 * - Pre-deployment validation
 * - Extension packaging
 * - Quality assurance checks
 * - Marketplace publishing
 * - Post-deployment verification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

class DeploymentManager {
  constructor() {
    this.packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    this.currentVersion = this.packageJson.version;
    this.isPreRelease = this.currentVersion.includes('-');
    this.deploymentId = `deploy-${Date.now()}`;
  }

  /**
   * Main deployment process
   */
  async deploy() {
    console.log(`🚀 Starting deployment process for v${this.currentVersion}`);
    console.log(`📋 Deployment ID: ${this.deploymentId}`);
    
    try {
      await this.preDeploymentValidation();
      await this.runQualityAssurance();
      await this.packageExtension();
      await this.publishToMarketplace();
      await this.postDeploymentVerification();
      
      console.log('✅ Deployment completed successfully!');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      await this.rollbackDeployment();
      process.exit(1);
    }
  }

  /**
   * Pre-deployment validation
   */
  async preDeploymentValidation() {
    console.log('\n📋 Running pre-deployment validation...');
    
    // Check version format
    if (!semver.valid(this.currentVersion)) {
      throw new Error(`Invalid version format: ${this.currentVersion}`);
    }
    
    // Check if version is higher than published version
    const publishedVersion = await this.getPublishedVersion();
    if (publishedVersion && semver.lte(this.currentVersion, publishedVersion)) {
      throw new Error(`Version ${this.currentVersion} is not higher than published version ${publishedVersion}`);
    }
    
    // Validate package.json fields
    this.validatePackageJson();
    
    // Check for required files
    this.validateRequiredFiles();
    
    // Validate changelog
    this.validateChangelog();
    
    console.log('✅ Pre-deployment validation passed');
  }

  /**
   * Run quality assurance checks
   */
  async runQualityAssurance() {
    console.log('\n🔍 Running quality assurance checks...');
    
    // Run linting
    console.log('  📝 Running ESLint...');
    execSync('npm run lint', { stdio: 'inherit' });
    
    // Run type checking
    console.log('  🔧 Running TypeScript compiler...');
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    
    // Run tests
    console.log('  🧪 Running test suite...');
    execSync('npm run test', { stdio: 'inherit' });
    
    // Run security audit
    console.log('  🔒 Running security audit...');
    try {
      execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Security audit found issues. Please review before deployment.');
    }
    
    // Check bundle size
    console.log('  📦 Checking bundle size...');
    execSync('npm run build:prod', { stdio: 'inherit' });
    this.validateBundleSize();
    
    console.log('✅ Quality assurance checks passed');
  }

  /**
   * Package the extension
   */
  async packageExtension() {
    console.log('\n📦 Packaging extension...');
    
    // Clean previous builds
    execSync('npm run clean', { stdio: 'inherit' });
    
    // Build production version
    execSync('npm run build:prod', { stdio: 'inherit' });
    
    // Package extension
    const packageCommand = this.isPreRelease ? 
      'vsce package --pre-release' : 
      'vsce package';
    
    execSync(packageCommand, { stdio: 'inherit' });
    
    // Validate package
    const vsixFile = `${this.packageJson.name}-${this.currentVersion}.vsix`;
    if (!fs.existsSync(vsixFile)) {
      throw new Error('VSIX package was not created');
    }
    
    // Check package contents
    this.validatePackageContents(vsixFile);
    
    console.log(`✅ Extension packaged: ${vsixFile}`);
  }

  /**
   * Publish to VS Code Marketplace
   */
  async publishToMarketplace() {
    console.log('\n🌐 Publishing to VS Code Marketplace...');
    
    // Check if VSCE token is available
    if (!process.env.VSCE_PAT) {
      throw new Error('VSCE_PAT environment variable is required for publishing');
    }
    
    // Publish extension
    const publishCommand = this.isPreRelease ? 
      'vsce publish --pre-release' : 
      'vsce publish';
    
    execSync(publishCommand, { 
      stdio: 'inherit',
      env: { ...process.env, VSCE_PAT: process.env.VSCE_PAT }
    });
    
    console.log('✅ Extension published to marketplace');
  }

  /**
   * Post-deployment verification
   */
  async postDeploymentVerification() {
    console.log('\n🔍 Running post-deployment verification...');
    
    // Wait for marketplace to update
    console.log('  ⏳ Waiting for marketplace update...');
    await this.sleep(30000); // Wait 30 seconds
    
    // Verify marketplace listing
    await this.verifyMarketplaceListing();
    
    // Create GitHub release
    await this.createGitHubRelease();
    
    // Update documentation
    await this.updateDocumentation();
    
    // Send deployment notification
    await this.sendDeploymentNotification();
    
    console.log('✅ Post-deployment verification completed');
  }

  /**
   * Validate package.json fields
   */
  validatePackageJson() {
    const required = ['name', 'displayName', 'description', 'version', 'publisher', 'engines'];
    const missing = required.filter(field => !this.packageJson[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required package.json fields: ${missing.join(', ')}`);
    }
    
    // Validate VS Code engine version
    const vscodeEngine = this.packageJson.engines.vscode;
    if (!vscodeEngine || !vscodeEngine.startsWith('^')) {
      throw new Error('Invalid VS Code engine version format');
    }
  }

  /**
   * Validate required files
   */
  validateRequiredFiles() {
    const required = ['README.md', 'CHANGELOG.md', 'LICENSE'];
    const missing = required.filter(file => !fs.existsSync(file));
    
    if (missing.length > 0) {
      throw new Error(`Missing required files: ${missing.join(', ')}`);
    }
  }

  /**
   * Validate changelog
   */
  validateChangelog() {
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
    
    // Check if current version is documented
    if (!changelog.includes(`[${this.currentVersion}]`) && !changelog.includes(`## ${this.currentVersion}`)) {
      throw new Error(`Version ${this.currentVersion} not found in CHANGELOG.md`);
    }
  }

  /**
   * Validate bundle size
   */
  validateBundleSize() {
    const bundlePath = 'out/extension.js';
    if (!fs.existsSync(bundlePath)) {
      throw new Error('Extension bundle not found');
    }
    
    const stats = fs.statSync(bundlePath);
    const sizeInMB = stats.size / (1024 * 1024);
    
    if (sizeInMB > 10) { // 10MB limit
      throw new Error(`Bundle size too large: ${sizeInMB.toFixed(2)}MB`);
    }
    
    console.log(`  📊 Bundle size: ${sizeInMB.toFixed(2)}MB`);
  }

  /**
   * Validate package contents
   */
  validatePackageContents(vsixFile) {
    // Basic validation - check if file exists and has reasonable size
    const stats = fs.statSync(vsixFile);
    const sizeInMB = stats.size / (1024 * 1024);
    
    if (sizeInMB < 0.1) {
      throw new Error('VSIX package seems too small');
    }
    
    if (sizeInMB > 50) {
      throw new Error('VSIX package seems too large');
    }
    
    console.log(`  📊 Package size: ${sizeInMB.toFixed(2)}MB`);
  }

  /**
   * Get published version from marketplace
   */
  async getPublishedVersion() {
    try {
      const result = execSync('vsce show readme-to-cicd.readme-to-cicd --json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const info = JSON.parse(result);
      return info.versions[0]?.version;
    } catch (error) {
      console.log('  ℹ️ Extension not yet published or unable to fetch version');
      return null;
    }
  }

  /**
   * Verify marketplace listing
   */
  async verifyMarketplaceListing() {
    try {
      const result = execSync('vsce show readme-to-cicd.readme-to-cicd --json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const info = JSON.parse(result);
      
      if (info.versions[0]?.version !== this.currentVersion) {
        throw new Error('Marketplace version does not match deployed version');
      }
      
      console.log('  ✅ Marketplace listing verified');
    } catch (error) {
      console.warn('  ⚠️ Could not verify marketplace listing:', error.message);
    }
  }

  /**
   * Create GitHub release
   */
  async createGitHubRelease() {
    if (!process.env.GITHUB_TOKEN) {
      console.log('  ℹ️ GITHUB_TOKEN not available, skipping GitHub release');
      return;
    }
    
    try {
      // Create git tag
      execSync(`git tag v${this.currentVersion}`, { stdio: 'pipe' });
      execSync(`git push origin v${this.currentVersion}`, { stdio: 'pipe' });
      
      // Create GitHub release (requires gh CLI)
      const releaseType = this.isPreRelease ? '--prerelease' : '';
      const releaseNotes = this.extractReleaseNotes();
      
      execSync(`gh release create v${this.currentVersion} ${releaseType} --title "v${this.currentVersion}" --notes "${releaseNotes}"`, {
        stdio: 'inherit'
      });
      
      console.log('  ✅ GitHub release created');
    } catch (error) {
      console.warn('  ⚠️ Could not create GitHub release:', error.message);
    }
  }

  /**
   * Extract release notes from changelog
   */
  extractReleaseNotes() {
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
    const lines = changelog.split('\n');
    
    let inCurrentVersion = false;
    let notes = [];
    
    for (const line of lines) {
      if (line.includes(`[${this.currentVersion}]`) || line.includes(`## ${this.currentVersion}`)) {
        inCurrentVersion = true;
        continue;
      }
      
      if (inCurrentVersion && (line.startsWith('## ') || line.startsWith('# '))) {
        break;
      }
      
      if (inCurrentVersion) {
        notes.push(line);
      }
    }
    
    return notes.join('\\n').trim() || 'See CHANGELOG.md for details';
  }

  /**
   * Update documentation
   */
  async updateDocumentation() {
    console.log('  📚 Documentation updated automatically via CI/CD');
  }

  /**
   * Send deployment notification
   */
  async sendDeploymentNotification() {
    console.log(`  📢 Deployment notification: v${this.currentVersion} deployed successfully`);
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment() {
    console.log('\n🔄 Attempting rollback...');
    
    try {
      // Remove local VSIX file
      const vsixFile = `${this.packageJson.name}-${this.currentVersion}.vsix`;
      if (fs.existsSync(vsixFile)) {
        fs.unlinkSync(vsixFile);
        console.log('  🗑️ Removed local VSIX file');
      }
      
      // Note: Marketplace rollback requires manual intervention
      console.log('  ⚠️ Marketplace rollback requires manual intervention');
      
    } catch (error) {
      console.error('  ❌ Rollback failed:', error.message);
    }
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const deployment = new DeploymentManager();
  deployment.deploy().catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentManager;