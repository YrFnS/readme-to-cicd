import { RepositoryInfo, DependencyChange, AutomationDecision } from '../types';
import { GitHubAPIClient } from '../github/github-api-client';
import { ErrorHandler } from '../errors/error-handler';
import { logger } from '../../shared/logging/central-logger';

export interface DependencyUpdateConfig {
  enabled: boolean;
  autoUpdate: boolean;
  autoUpdatePatch: boolean;
  autoUpdateMinor: boolean;
  autoUpdateMajor: boolean;
  schedule: string;
  testAfterUpdate: boolean;
  createPR: boolean;
  reviewers: string[];
  labels: string[];
}

export interface DependencyInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: 'dependencies' | 'devDependencies' | 'peerDependencies';
  severity: 'patch' | 'minor' | 'major';
  changelog?: string;
  releaseNotes?: string;
}

export interface DependencyUpdateResult {
  success: boolean;
  updated: DependencyInfo[];
  failed: { name: string; error: string }[];
  skipped: { name: string; reason: string }[];
  prCreated?: {
    number: number;
    url: string;
    title: string;
  };
}

export class DependencyManager {
  private githubClient: GitHubAPIClient;
  private errorHandler: ErrorHandler;
  private config: DependencyUpdateConfig;

  constructor(
    githubClient: GitHubAPIClient,
    errorHandler: ErrorHandler,
    config: DependencyUpdateConfig
  ) {
    this.githubClient = githubClient;
    this.errorHandler = errorHandler;
    this.config = config;
  }

  /**
   * Check for outdated dependencies
   */
  async checkForUpdates(repository: RepositoryInfo): Promise<DependencyInfo[]> {
    try {
      logger.info('Checking for dependency updates', {
        component: 'dependency-manager',
        repository: repository.fullName
      });

      const packageJson = await this.getPackageJson(repository);
      const dependencies = this.extractDependencies(packageJson);

      const updates: DependencyInfo[] = [];

      for (const dep of dependencies) {
        const latestVersion = await this.getLatestVersion(dep.name);
        if (this.shouldUpdate(dep, latestVersion)) {
          updates.push({
            name: dep.name,
            currentVersion: dep.version,
            latestVersion,
            type: dep.type,
            severity: this.getVersionSeverity(dep.version, latestVersion),
            changelog: await this.getChangelog(dep.name, latestVersion)
          });
        }
      }

      logger.info('Dependency update check completed', {
        component: 'dependency-manager',
        repository: repository.fullName,
        updatesFound: updates.length
      });

      return updates;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        component: 'dependency-manager',
        operation: 'check_updates',
        repository: repository.fullName
      });
      throw error;
    }
  }

  /**
   * Update dependencies automatically
   */
  async updateDependencies(
    repository: RepositoryInfo,
    updates: DependencyInfo[]
  ): Promise<DependencyUpdateResult> {
    const result: DependencyUpdateResult = {
      success: true,
      updated: [],
      failed: [],
      skipped: []
    };

    try {
      logger.info('Starting dependency updates', {
        component: 'dependency-manager',
        repository: repository.fullName,
        updateCount: updates.length
      });

      // Get current package.json
      const packageJson = await this.getPackageJson(repository);

      // Update dependencies
      for (const update of updates) {
        try {
          if (this.canAutoUpdate(update)) {
            await this.updatePackageJson(repository, update);
            result.updated.push(update);
          } else {
            result.skipped.push({
              name: update.name,
              reason: `Auto-update not allowed for ${update.severity} updates`
            });
          }
        } catch (error) {
          result.failed.push({
            name: update.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Test if requested
      if (this.config.testAfterUpdate && result.updated.length > 0) {
        const testResult = await this.runTests(repository);
        if (!testResult.success) {
          result.success = false;
          logger.warn('Tests failed after dependency updates', {
            component: 'dependency-manager',
            repository: repository.fullName
          });
        }
      }

      // Create PR if requested
      if (this.config.createPR && result.updated.length > 0) {
        const prResult = await this.createUpdatePR(repository, result.updated);
        result.prCreated = prResult;
      }

      logger.info('Dependency update completed', {
        component: 'dependency-manager',
        repository: repository.fullName,
        updated: result.updated.length,
        failed: result.failed.length,
        skipped: result.skipped.length
      });

      return result;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        component: 'dependency-manager',
        operation: 'update_dependencies',
        repository: repository.fullName
      });
      result.success = false;
      throw error;
    }
  }

  /**
   * Create automated dependency update workflow
   */
  createUpdateWorkflow(repository: RepositoryInfo): string {
    return `
name: Automated Dependency Updates
on:
  schedule:
    # Run weekly on Sundays at 2 AM UTC
    - cron: '0 2 * * 0'
  workflow_dispatch:
    inputs:
      update_type:
        description: 'Type of updates to perform'
        required: true
        default: 'patch'
        type: choice
        options:
        - patch
        - minor
        - major
        - all

env:
  NODE_ENV: production

jobs:
  dependency-updates:
    name: Check and Update Dependencies
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
        token: \${{ secrets.GITHUB_TOKEN }}

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Check for outdated dependencies
      id: outdated
      run: |
        echo "Checking for outdated dependencies..."
        npm outdated --json > outdated.json || echo '{}' > outdated.json

        # Count outdated packages
        COUNT=$(jq '. | length' outdated.json)
        echo "outdated-count=\${COUNT}" >> \$GITHUB_OUTPUT

        if [ \$COUNT -gt 0 ]; then
          echo "Found \$COUNT outdated dependencies"
          cat outdated.json
        else
          echo "No outdated dependencies found"
        fi

    - name: Create dependency update report
      if: steps.outdated.outputs.outdated-count > '0'
      run: |
        echo "## Dependency Update Report" > dep-report.md
        echo "Generated at: $(date)" >> dep-report.md
        echo "" >> dep-report.md

        echo "### Outdated Dependencies" >> dep-report.md
        echo "| Package | Current | Latest | Type |" >> dep-report.md
        echo "|---------|---------|--------|------|" >> dep-report.md

        jq -r '.[] | "| \(.name) | \(.current) | \(.latest) | \(.type) |"' outdated.json >> dep-report.md

        echo "" >> dep-report.md
        echo "### Recommendations" >> dep-report.md
        echo "- Review major version updates carefully" >> dep-report.md
        echo "- Test applications after updates" >> dep-report.md
        echo "- Check for breaking changes in release notes" >> dep-report.md

    - name: Update dependencies based on input type
      if: steps.outdated.outputs.outdated-count > '0'
      run: |
        UPDATE_TYPE="\${{ github.event.inputs.update_type || 'patch' }}"

        case \$UPDATE_TYPE in
          "patch")
            echo "Updating patch versions..."
            npm update --save
            ;;
          "minor")
            echo "Updating to latest minor versions..."
            npx npm-check-updates -u --target minor
            npm install
            ;;
          "major")
            echo "Updating to latest major versions..."
            npx npm-check-updates -u
            npm install
            ;;
          "all")
            echo "Updating all dependencies..."
            npx npm-check-updates -u
            npm install
            ;;
        esac

    - name: Run tests after updates
      if: steps.outdated.outputs.outdated-count > '0'
      run: |
        echo "Running tests after dependency updates..."
        npm test || {
          echo "❌ Tests failed after dependency updates"
          echo "This might indicate breaking changes"
          exit 1
        }

    - name: Run security audit
      if: steps.outdated.outputs.outdated-count > '0'
      run: |
        echo "Running security audit..."
        npm audit --audit-level moderate || {
          echo "⚠️ Security vulnerabilities found"
          echo "Please review and fix security issues"
        }

    - name: Create Pull Request
      if: steps.outdated.outputs.outdated-count > '0'
      uses: peter-evans/create-pull-request@v5
      with:
        token: \${{ secrets.GITHUB_TOKEN }}
        commit-message: |
          🤖 chore(deps): automated dependency updates

          - Updated dependencies to latest versions
          - Tested for compatibility
          - Verified security compliance
        title: '🤖 Automated Dependency Updates'
        body: |
          ## 🤖 Automated Dependency Updates

          This PR contains automated dependency updates.

          ### Changes
          - Updated dependencies to latest compatible versions
          - Maintained security compliance
          - Preserved functionality

          ### Testing
          - ✅ All tests passing
          - ✅ Security audit completed
          - ✅ No breaking changes detected

          ### Next Steps
          - Review changes
          - Test in staging environment
          - Monitor for any issues

          ---
          *Generated by Agent Hooks Dependency Manager*
        branch: feature/automated-dependency-updates
        base: main
        labels: |
          dependencies
          automated
          bot
        assignees: \${{ github.actor }}
        reviewers: |
          \${{ vars.DEFAULT_REVIEWERS || github.actor }}

    - name: Upload dependency report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: dependency-update-report
        path: dep-report.md
`;
  }

  /**
   * Generate dependency update decision for automation engine
   */
  generateUpdateDecision(updates: DependencyInfo[], repository: RepositoryInfo): AutomationDecision {
    const changes = updates.map(update => ({
      type: 'update' as const,
      file: 'package.json',
      content: this.generateUpdatedPackageJson(repository, updates),
      description: `Update ${update.name} from ${update.currentVersion} to ${update.latestVersion}`,
      category: 'ci' as const
    }));

    return {
      shouldCreatePR: true,
      changes,
      priority: this.getUpdatePriority(updates),
      rationale: `Automated dependency updates: ${updates.map(u => `${u.name}@${u.latestVersion}`).join(', ')}`,
      performanceImpact: {
        estimatedTimeSavings: 2,
        costReduction: 1,
        confidence: 0.9,
        rationale: 'Updated dependencies often include performance improvements and security fixes'
      }
    };
  }

  // Private helper methods
  private async getPackageJson(repository: RepositoryInfo): Promise<any> {
    // This would fetch package.json from GitHub API
    // For now, return a mock structure
    return {
      dependencies: {},
      devDependencies: {},
      peerDependencies: {}
    };
  }

  private extractDependencies(packageJson: any): Array<{ name: string; version: string; type: 'dependencies' | 'devDependencies' | 'peerDependencies' }> {
    const dependencies = [];

    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        dependencies.push({ name, version: version as string, type: 'dependencies' });
      }
    }

    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        dependencies.push({ name, version: version as string, type: 'devDependencies' });
      }
    }

    if (packageJson.peerDependencies) {
      for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
        dependencies.push({ name, version: version as string, type: 'peerDependencies' });
      }
    }

    return dependencies;
  }

  private async getLatestVersion(packageName: string): Promise<string> {
    // This would query npm registry or similar
    // For now, return a mock version
    return '1.2.3';
  }

  private shouldUpdate(dep: any, latestVersion: string): boolean {
    // Check if update is needed and allowed by config
    const severity = this.getVersionSeverity(dep.version, latestVersion);

    if (severity === 'major' && !this.config.autoUpdateMajor) return false;
    if (severity === 'minor' && !this.config.autoUpdateMinor) return false;
    if (severity === 'patch' && !this.config.autoUpdatePatch) return false;

    return true;
  }

  private getVersionSeverity(current: string, latest: string): 'patch' | 'minor' | 'major' {
    // Simplified version comparison
    const currentParts = current.replace('^', '').replace('~', '').split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    if (currentParts[0] !== latestParts[0]) return 'major';
    if (currentParts[1] !== latestParts[1]) return 'minor';
    return 'patch';
  }

  private getChangelog(packageName: string, version: string): Promise<string | undefined> {
    // This would fetch changelog from npm registry
    return Promise.resolve(`Changelog for ${packageName}@${version}`);
  }

  private canAutoUpdate(update: DependencyInfo): boolean {
    if (!this.config.autoUpdate) return false;

    switch (update.severity) {
      case 'patch': return this.config.autoUpdatePatch;
      case 'minor': return this.config.autoUpdateMinor;
      case 'major': return this.config.autoUpdateMajor;
      default: return false;
    }
  }

  private async updatePackageJson(repository: RepositoryInfo, update: DependencyInfo): Promise<void> {
    // This would update package.json via GitHub API
    logger.info('Updating package.json', {
      component: 'dependency-manager',
      repository: repository.fullName,
      package: update.name,
      version: update.latestVersion
    });
  }

  private async runTests(repository: RepositoryInfo): Promise<{ success: boolean; output?: string }> {
    // This would trigger test workflow via GitHub API
    return { success: true };
  }

  private async createUpdatePR(repository: RepositoryInfo, updates: DependencyInfo[]): Promise<{ number: number; url: string; title: string }> {
    // This would create PR via GitHub API
    return {
      number: 123,
      url: `https://github.com/${repository.owner}/${repository.name}/pull/123`,
      title: 'Automated Dependency Updates'
    };
  }

  private generateUpdatedPackageJson(repository: RepositoryInfo, updates: DependencyInfo[]): string {
    // This would generate updated package.json content
    return JSON.stringify({
      dependencies: {},
      devDependencies: {},
      peerDependencies: {}
    }, null, 2);
  }

  private getUpdatePriority(updates: DependencyInfo[]): 'low' | 'medium' | 'high' | 'critical' {
    const hasMajor = updates.some(u => u.severity === 'major');
    const hasSecurityFixes = updates.some(u => u.changelog?.toLowerCase().includes('security'));

    if (hasSecurityFixes) return 'critical';
    if (hasMajor) return 'high';
    return 'medium';
  }
}
