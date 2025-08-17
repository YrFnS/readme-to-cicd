import * as vscode from 'vscode';
import { LoggingService } from './LoggingService';
import { NotificationService } from './NotificationService';

export interface VersionInfo {
  current: string;
  latest?: string;
  releaseNotes?: string;
  updateAvailable: boolean;
  isPreRelease: boolean;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  isBreaking?: boolean;
}

export class VersionManager {
  private static instance: VersionManager;
  private readonly context: vscode.ExtensionContext;
  private readonly logger: LoggingService;
  private readonly notifications: NotificationService;
  private readonly currentVersion: string;
  private readonly updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours

  private constructor(
    context: vscode.ExtensionContext,
    logger: LoggingService,
    notifications: NotificationService
  ) {
    this.context = context;
    this.logger = logger;
    this.notifications = notifications;
    this.currentVersion = this.getExtensionVersion();
  }

  public static getInstance(
    context: vscode.ExtensionContext,
    logger: LoggingService,
    notifications: NotificationService
  ): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager(context, logger, notifications);
    }
    return VersionManager.instance;
  }

  /**
   * Initialize version management
   */
  public async initialize(): Promise<void> {
    try {
      await this.handleFirstRun();
      await this.handleVersionUpgrade();
      this.scheduleUpdateCheck();
      
      this.logger.info('Version manager initialized', {
        currentVersion: this.currentVersion
      });
    } catch (error) {
      this.logger.error('Failed to initialize version manager', { error });
    }
  }

  /**
   * Get current extension version
   */
  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Get version information
   */
  public async getVersionInfo(): Promise<VersionInfo> {
    const updateCheck = await this.checkForUpdates();
    
    return {
      current: this.currentVersion,
      latest: updateCheck.version,
      releaseNotes: updateCheck.releaseNotes,
      updateAvailable: updateCheck.updateAvailable,
      isPreRelease: this.isPreReleaseVersion(this.currentVersion)
    };
  }

  /**
   * Check for available updates
   */
  public async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      const response = await this.fetchLatestVersion();
      const latestVersion = response.version;
      
      if (!latestVersion) {
        return { updateAvailable: false };
      }

      const updateAvailable = this.compareVersions(latestVersion, this.currentVersion) > 0;
      
      if (updateAvailable) {
        this.logger.info('Update available', {
          current: this.currentVersion,
          latest: latestVersion
        });
      }

      return {
        updateAvailable,
        version: latestVersion,
        releaseNotes: response.releaseNotes,
        downloadUrl: response.downloadUrl,
        isBreaking: response.isBreaking
      };
    } catch (error) {
      this.logger.error('Failed to check for updates', { error });
      return { updateAvailable: false };
    }
  }

  /**
   * Show update notification
   */
  public async showUpdateNotification(updateInfo: UpdateCheckResult): Promise<void> {
    if (!updateInfo.updateAvailable || !updateInfo.version) {
      return;
    }

    const message = `README to CI/CD v${updateInfo.version} is available!`;
    const actions = ['Update Now', 'View Release Notes', 'Remind Later', 'Skip This Version'];

    const selection = await vscode.window.showInformationMessage(message, ...actions);

    switch (selection) {
      case 'Update Now':
        await this.initiateUpdate(updateInfo);
        break;
      case 'View Release Notes':
        await this.showReleaseNotes(updateInfo);
        break;
      case 'Remind Later':
        this.scheduleUpdateReminder();
        break;
      case 'Skip This Version':
        await this.skipVersion(updateInfo.version);
        break;
    }
  }

  /**
   * Handle first run experience
   */
  private async handleFirstRun(): Promise<void> {
    const isFirstRun = !this.context.globalState.get('hasRun', false);
    
    if (isFirstRun) {
      await this.context.globalState.update('hasRun', true);
      await this.context.globalState.update('installedVersion', this.currentVersion);
      
      this.logger.info('First run detected', { version: this.currentVersion });
      
      // Show welcome message
      const message = 'Welcome to README to CI/CD! Generate your first workflow from any README file.';
      const action = 'Get Started';
      
      const selection = await vscode.window.showInformationMessage(message, action);
      if (selection === action) {
        await vscode.commands.executeCommand('readme-to-cicd.openConfiguration');
      }
    }
  }

  /**
   * Handle version upgrade
   */
  private async handleVersionUpgrade(): Promise<void> {
    const previousVersion = this.context.globalState.get<string>('installedVersion');
    
    if (previousVersion && previousVersion !== this.currentVersion) {
      await this.context.globalState.update('installedVersion', this.currentVersion);
      
      this.logger.info('Version upgrade detected', {
        from: previousVersion,
        to: this.currentVersion
      });

      // Show upgrade notification
      await this.showUpgradeNotification(previousVersion, this.currentVersion);
      
      // Run migration if needed
      await this.runMigration(previousVersion, this.currentVersion);
    }
  }

  /**
   * Show upgrade notification
   */
  private async showUpgradeNotification(from: string, to: string): Promise<void> {
    const message = `README to CI/CD updated to v${to}`;
    const actions = ['What\'s New', 'Dismiss'];
    
    const selection = await vscode.window.showInformationMessage(message, ...actions);
    
    if (selection === 'What\'s New') {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/readme-to-cicd/vscode-extension/releases')
      );
    }
  }

  /**
   * Run migration between versions
   */
  private async runMigration(from: string, to: string): Promise<void> {
    try {
      // Example migration logic
      if (this.compareVersions(from, '0.1.0') < 0) {
        // Migrate settings from old format
        await this.migrateSettings();
      }
      
      this.logger.info('Migration completed', { from, to });
    } catch (error) {
      this.logger.error('Migration failed', { error, from, to });
    }
  }

  /**
   * Migrate settings between versions
   */
  private async migrateSettings(): Promise<void> {
    // Implementation for settings migration
    this.logger.info('Settings migration completed');
  }

  /**
   * Schedule automatic update check
   */
  private scheduleUpdateCheck(): void {
    const lastCheck = this.context.globalState.get<number>('lastUpdateCheck', 0);
    const now = Date.now();
    
    if (now - lastCheck > this.updateCheckInterval) {
      // Check immediately if it's been more than 24 hours
      this.performUpdateCheck();
    }
    
    // Schedule next check
    setTimeout(() => {
      this.performUpdateCheck();
    }, this.updateCheckInterval);
  }

  /**
   * Perform update check
   */
  private async performUpdateCheck(): Promise<void> {
    try {
      await this.context.globalState.update('lastUpdateCheck', Date.now());
      
      const updateInfo = await this.checkForUpdates();
      
      if (updateInfo.updateAvailable && !this.isVersionSkipped(updateInfo.version!)) {
        await this.showUpdateNotification(updateInfo);
      }
    } catch (error) {
      this.logger.error('Automatic update check failed', { error });
    }
  }

  /**
   * Schedule update reminder
   */
  private scheduleUpdateReminder(): void {
    const reminderDelay = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    setTimeout(async () => {
      const updateInfo = await this.checkForUpdates();
      if (updateInfo.updateAvailable) {
        await this.showUpdateNotification(updateInfo);
      }
    }, reminderDelay);
  }

  /**
   * Skip a specific version
   */
  private async skipVersion(version: string): Promise<void> {
    const skippedVersions = this.context.globalState.get<string[]>('skippedVersions', []);
    skippedVersions.push(version);
    await this.context.globalState.update('skippedVersions', skippedVersions);
    
    this.logger.info('Version skipped', { version });
  }

  /**
   * Check if version is skipped
   */
  private isVersionSkipped(version: string): boolean {
    const skippedVersions = this.context.globalState.get<string[]>('skippedVersions', []);
    return skippedVersions.includes(version);
  }

  /**
   * Initiate extension update
   */
  private async initiateUpdate(updateInfo: UpdateCheckResult): Promise<void> {
    try {
      // Open VS Code marketplace page for the extension
      const marketplaceUrl = 'https://marketplace.visualstudio.com/items?itemName=readme-to-cicd.readme-to-cicd';
      await vscode.env.openExternal(vscode.Uri.parse(marketplaceUrl));
      
      // Show instructions
      const message = 'Please update the extension from the Extensions view or reload VS Code if auto-update is enabled.';
      await vscode.window.showInformationMessage(message);
      
    } catch (error) {
      this.logger.error('Failed to initiate update', { error });
      this.notifications.showError('Failed to open update page. Please update manually from the Extensions view.');
    }
  }

  /**
   * Show release notes
   */
  private async showReleaseNotes(updateInfo: UpdateCheckResult): Promise<void> {
    if (updateInfo.releaseNotes) {
      // Create and show release notes in a new document
      const doc = await vscode.workspace.openTextDocument({
        content: updateInfo.releaseNotes,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);
    } else {
      // Open GitHub releases page
      const releasesUrl = 'https://github.com/readme-to-cicd/vscode-extension/releases';
      await vscode.env.openExternal(vscode.Uri.parse(releasesUrl));
    }
  }

  /**
   * Get extension version from package.json
   */
  private getExtensionVersion(): string {
    try {
      const extension = vscode.extensions.getExtension('readme-to-cicd.readme-to-cicd');
      return extension?.packageJSON?.version || '0.0.0';
    } catch (error) {
      this.logger.error('Failed to get extension version', { error });
      return '0.0.0';
    }
  }

  /**
   * Check if version is pre-release
   */
  private isPreReleaseVersion(version: string): boolean {
    return version.includes('-') || version.includes('beta') || version.includes('alpha');
  }

  /**
   * Compare two version strings
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (version: string) => {
      return version.split('.').map(part => {
        const num = parseInt(part.split('-')[0], 10);
        return isNaN(num) ? 0 : num;
      });
    };

    const versionA = parseVersion(a);
    const versionB = parseVersion(b);

    for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
      const partA = versionA[i] || 0;
      const partB = versionB[i] || 0;

      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }

    return 0;
  }

  /**
   * Fetch latest version information
   */
  private async fetchLatestVersion(): Promise<{
    version?: string;
    releaseNotes?: string;
    downloadUrl?: string;
    isBreaking?: boolean;
  }> {
    try {
      // In a real implementation, this would fetch from VS Code Marketplace API
      // For now, return mock data
      return {
        version: '0.1.1',
        releaseNotes: 'Bug fixes and performance improvements',
        downloadUrl: 'https://marketplace.visualstudio.com/items?itemName=readme-to-cicd.readme-to-cicd',
        isBreaking: false
      };
    } catch (error) {
      this.logger.error('Failed to fetch latest version', { error });
      return {};
    }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clean up any resources
  }
}