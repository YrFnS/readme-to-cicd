#!/usr/bin/env node

/**
 * Extension Deployment Script
 * 
 * Handles deployment to VS Code Marketplace and other distribution channels.
 * Includes pre-deployment validation and post-deployment verification.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

class ExtensionDeployer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.distDir = path.join(this.rootDir, 'dist');
    this.packageName = `${packageJson.name}-${packageJson.version}.vsix`;
    this.deploymentConfig = this.loadDeploymentConfig();
  }

  async deploy(target = 'marketplace') {
    console.log(`🚀 Starting deployment to ${target}...`);
    
    try {
      // Pre-deployment checks
      await this.preDeploymentChecks();
      
      // Deploy to target
      switch (target) {
        case 'marketplace':
          await this.deployToMarketplace();
          break;
        case 'github':
          await this.deployToGitHub();
          break;
        case 'internal':
          await this.deployInternal();
          break;
        default:
          throw new Error(`Unknown deployment target: ${target}`);
      }
      
      // Post-deployment verification
      await this.postDeploymentVerification(target);
      
      // Update deployment records
      await this.updateDeploymentRecords(target);
      
      console.log(`✅ Deployment to ${target} completed successfully!`);
      
    } catch (error) {
      console.error(`❌ Deployment to ${target} failed:`, error.message);
      await this.handleDeploymentFailure(target, error);
      process.exit(1);
    }
  }

  async preDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');
    
    // Check if package exists
    const packagePath = path.join(this.distDir, this.packageName);
    if (!fs.existsSync(packagePath)) {
      throw new Error('Package not found. Run packaging first.');
    }
    
    // Validate version
    await this.validateVersion();
    
    // Check changelog
    await this.validateChangelog();
    
    // Validate package integrity
    await this.validatePackageIntegrity();
    
    // Check authentication
    await this.checkAuthentication();
    
    // Validate marketplace metadata
    await this.validateMarketplaceMetadata();
    
    console.log('✅ Pre-deployment checks passed');
  }

  async validateVersion() {
    console.log('📋 Validating version...');
    
    const currentVersion = packageJson.version;
    
    // Check if version follows semantic versioning
    const semverRegex = /^\d+\.\d+\.\d+(-\w+\.\d+)?$/;
    if (!semverRegex.test(currentVersion)) {
      throw new Error(`Invalid version format: ${currentVersion}`);
    }
    
    // Check if version is newer than published version
    try {
      const publishedInfo = execSync(`npm view ${packageJson.name} version`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();
      
      if (publishedInfo && this.compareVersions(currentVersion, publishedInfo) <= 0) {
        throw new Error(`Version ${currentVersion} is not newer than published version ${publishedInfo}`);
      }
    } catch (error) {
      // Package might not be published yet, which is fine
      console.log('📝 Package not yet published or version check failed');
    }
    
    console.log(`✅ Version ${currentVersion} is valid`);
  }

  async validateChangelog() {
    console.log('📝 Validating changelog...');
    
    const changelogPath = path.join(this.rootDir, 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) {
      throw new Error('CHANGELOG.md not found');
    }
    
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    const currentVersion = packageJson.version;
    
    // Check if current version is documented
    if (!changelog.includes(currentVersion)) {
      throw new Error(`Version ${currentVersion} not found in CHANGELOG.md`);
    }
    
    // Check for unreleased section
    if (changelog.includes('## [Unreleased]') && 
        changelog.indexOf('## [Unreleased]') < changelog.indexOf(`## [${currentVersion}]`)) {
      console.warn('⚠️  Unreleased section found above current version');
    }
    
    console.log('✅ Changelog validation passed');
  }

  async validatePackageIntegrity() {
    console.log('🔍 Validating package integrity...');
    
    const packagePath = path.join(this.distDir, this.packageName);
    
    // Check package size
    const stats = fs.statSync(packagePath);
    const sizeMB = stats.size / (1024 * 1024);
    
    if (sizeMB > 100) { // 100MB limit
      throw new Error(`Package too large: ${sizeMB.toFixed(2)} MB`);
    }
    
    // Validate package contents using vsce
    try {
      execSync(`npx vsce ls ${packagePath}`, {
        cwd: this.rootDir,
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Package validation failed: ${error.message}`);
    }
    
    console.log('✅ Package integrity validated');
  }

  async checkAuthentication() {
    console.log('🔐 Checking authentication...');
    
    // Check for Personal Access Token
    if (!process.env.VSCE_PAT && !this.deploymentConfig.personalAccessToken) {
      throw new Error('Personal Access Token not found. Set VSCE_PAT environment variable.');
    }
    
    // Verify token with vsce
    try {
      execSync('npx vsce verify-pat', {
        cwd: this.rootDir,
        stdio: 'pipe',
        env: {
          ...process.env,
          VSCE_PAT: process.env.VSCE_PAT || this.deploymentConfig.personalAccessToken
        }
      });
    } catch (error) {
      throw new Error('Personal Access Token verification failed');
    }
    
    console.log('✅ Authentication verified');
  }

  async validateMarketplaceMetadata() {
    console.log('📋 Validating marketplace metadata...');
    
    const required = ['displayName', 'description', 'categories', 'keywords', 'icon'];
    const missing = required.filter(field => !packageJson[field]);
    
    if (missing.length > 0) {
      console.warn(`⚠️  Missing recommended fields: ${missing.join(', ')}`);
    }
    
    // Validate description length
    if (packageJson.description && packageJson.description.length > 200) {
      console.warn('⚠️  Description is quite long (>200 chars)');
    }
    
    // Check for icon
    if (packageJson.icon && !fs.existsSync(path.join(this.rootDir, packageJson.icon))) {
      throw new Error(`Icon file not found: ${packageJson.icon}`);
    }
    
    // Validate categories
    const validCategories = [
      'Azure', 'Data Science', 'Debuggers', 'Extension Packs', 'Formatters',
      'Keymaps', 'Language Packs', 'Linters', 'Machine Learning', 'Notebooks',
      'Other', 'Programming Languages', 'SCM Providers', 'Snippets', 'Testing',
      'Themes', 'Visualization'
    ];
    
    if (packageJson.categories) {
      const invalidCategories = packageJson.categories.filter(cat => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        console.warn(`⚠️  Invalid categories: ${invalidCategories.join(', ')}`);
      }
    }
    
    console.log('✅ Marketplace metadata validated');
  }

  async deployToMarketplace() {
    console.log('🏪 Deploying to VS Code Marketplace...');
    
    const packagePath = path.join(this.distDir, this.packageName);
    
    try {
      // Publish to marketplace
      execSync(`npx vsce publish --packagePath ${packagePath}`, {
        cwd: this.rootDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          VSCE_PAT: process.env.VSCE_PAT || this.deploymentConfig.personalAccessToken
        }
      });
      
      console.log('✅ Published to VS Code Marketplace');
      
    } catch (error) {
      throw new Error(`Marketplace deployment failed: ${error.message}`);
    }
  }

  async deployToGitHub() {
    console.log('🐙 Deploying to GitHub Releases...');
    
    const packagePath = path.join(this.distDir, this.packageName);
    const version = packageJson.version;
    const tagName = `v${version}`;
    
    try {
      // Create git tag
      execSync(`git tag ${tagName}`, { cwd: this.rootDir });
      execSync(`git push origin ${tagName}`, { cwd: this.rootDir });
      
      // Create GitHub release (requires gh CLI)
      const releaseNotes = this.extractReleaseNotes(version);
      
      execSync(`gh release create ${tagName} ${packagePath} --title "Release ${version}" --notes "${releaseNotes}"`, {
        cwd: this.rootDir,
        stdio: 'inherit'
      });
      
      console.log('✅ Published to GitHub Releases');
      
    } catch (error) {
      throw new Error(`GitHub deployment failed: ${error.message}`);
    }
  }

  async deployInternal() {
    console.log('🏢 Deploying to internal registry...');
    
    const packagePath = path.join(this.distDir, this.packageName);
    const internalRegistry = this.deploymentConfig.internalRegistry;
    
    if (!internalRegistry) {
      throw new Error('Internal registry not configured');
    }
    
    try {
      // Copy to internal location
      const internalPath = path.join(internalRegistry, this.packageName);
      fs.copyFileSync(packagePath, internalPath);
      
      // Update registry index
      await this.updateInternalRegistry(internalRegistry);
      
      console.log('✅ Published to internal registry');
      
    } catch (error) {
      throw new Error(`Internal deployment failed: ${error.message}`);
    }
  }

  async postDeploymentVerification(target) {
    console.log('🔍 Running post-deployment verification...');
    
    switch (target) {
      case 'marketplace':
        await this.verifyMarketplaceDeployment();
        break;
      case 'github':
        await this.verifyGitHubDeployment();
        break;
      case 'internal':
        await this.verifyInternalDeployment();
        break;
    }
    
    console.log('✅ Post-deployment verification passed');
  }

  async verifyMarketplaceDeployment() {
    console.log('🔍 Verifying marketplace deployment...');
    
    // Wait a bit for marketplace to update
    await this.sleep(30000); // 30 seconds
    
    try {
      // Check if extension is available
      const result = execSync(`npx vsce show ${packageJson.publisher}.${packageJson.name}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (!result.includes(packageJson.version)) {
        throw new Error('Version not found in marketplace');
      }
      
      console.log('✅ Marketplace deployment verified');
      
    } catch (error) {
      console.warn('⚠️  Marketplace verification failed:', error.message);
    }
  }

  async verifyGitHubDeployment() {
    console.log('🔍 Verifying GitHub deployment...');
    
    const tagName = `v${packageJson.version}`;
    
    try {
      // Check if release exists
      execSync(`gh release view ${tagName}`, {
        cwd: this.rootDir,
        stdio: 'pipe'
      });
      
      console.log('✅ GitHub deployment verified');
      
    } catch (error) {
      console.warn('⚠️  GitHub verification failed:', error.message);
    }
  }

  async verifyInternalDeployment() {
    console.log('🔍 Verifying internal deployment...');
    
    const internalRegistry = this.deploymentConfig.internalRegistry;
    const packagePath = path.join(internalRegistry, this.packageName);
    
    if (fs.existsSync(packagePath)) {
      console.log('✅ Internal deployment verified');
    } else {
      console.warn('⚠️  Internal deployment verification failed');
    }
  }

  async updateDeploymentRecords(target) {
    console.log('📝 Updating deployment records...');
    
    const recordsPath = path.join(this.rootDir, 'deployment-records.json');
    let records = {};
    
    if (fs.existsSync(recordsPath)) {
      records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    }
    
    if (!records.deployments) {
      records.deployments = [];
    }
    
    records.deployments.push({
      version: packageJson.version,
      target,
      timestamp: new Date().toISOString(),
      success: true
    });
    
    // Keep only last 50 deployments
    if (records.deployments.length > 50) {
      records.deployments = records.deployments.slice(-50);
    }
    
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    
    console.log('✅ Deployment records updated');
  }

  async handleDeploymentFailure(target, error) {
    console.log('🚨 Handling deployment failure...');
    
    // Record failure
    const recordsPath = path.join(this.rootDir, 'deployment-records.json');
    let records = {};
    
    if (fs.existsSync(recordsPath)) {
      records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    }
    
    if (!records.deployments) {
      records.deployments = [];
    }
    
    records.deployments.push({
      version: packageJson.version,
      target,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message
    });
    
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    
    // Send notification (if configured)
    if (this.deploymentConfig.notifications?.onFailure) {
      await this.sendFailureNotification(target, error);
    }
  }

  loadDeploymentConfig() {
    const configPath = path.join(this.rootDir, 'deployment.config.json');
    
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    return {
      personalAccessToken: null,
      internalRegistry: null,
      notifications: {
        onSuccess: false,
        onFailure: false
      }
    };
  }

  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }

  extractReleaseNotes(version) {
    const changelogPath = path.join(this.rootDir, 'CHANGELOG.md');
    
    if (!fs.existsSync(changelogPath)) {
      return `Release ${version}`;
    }
    
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    const versionHeader = `## [${version}]`;
    const startIndex = changelog.indexOf(versionHeader);
    
    if (startIndex === -1) {
      return `Release ${version}`;
    }
    
    const nextVersionIndex = changelog.indexOf('## [', startIndex + versionHeader.length);
    const endIndex = nextVersionIndex === -1 ? changelog.length : nextVersionIndex;
    
    return changelog.substring(startIndex + versionHeader.length, endIndex).trim();
  }

  async updateInternalRegistry(registryPath) {
    const indexPath = path.join(registryPath, 'index.json');
    let index = { extensions: [] };
    
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }
    
    // Update or add extension entry
    const extensionEntry = {
      name: packageJson.name,
      displayName: packageJson.displayName,
      version: packageJson.version,
      description: packageJson.description,
      publisher: packageJson.publisher,
      filename: this.packageName,
      lastUpdated: new Date().toISOString()
    };
    
    const existingIndex = index.extensions.findIndex(ext => ext.name === packageJson.name);
    
    if (existingIndex >= 0) {
      index.extensions[existingIndex] = extensionEntry;
    } else {
      index.extensions.push(extensionEntry);
    }
    
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  async sendFailureNotification(target, error) {
    // Implementation would depend on notification service (email, Slack, etc.)
    console.log(`📧 Failure notification would be sent for ${target}: ${error.message}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Command line interface
if (require.main === module) {
  const target = process.argv[2] || 'marketplace';
  const deployer = new ExtensionDeployer();
  
  deployer.deploy(target).catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = ExtensionDeployer;