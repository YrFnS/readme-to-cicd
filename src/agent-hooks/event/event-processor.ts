import {
  WebhookEvent,
  RepositoryChanges,
  FileChange,
  ConfigChange,
  DependencyChange,
  FrameworkImpact,
  RepositoryInfo
} from '../types';
import { ChangeDetector } from './change-detector';

export class EventProcessor {
  private changeDetector: ChangeDetector;

  constructor() {
    this.changeDetector = new ChangeDetector();
  }

  /**
   * Process a webhook event and extract repository changes
   */
  async processEvent(event: WebhookEvent): Promise<RepositoryChanges> {
    switch (event.type) {
      case 'push':
        return this.processPushEvent(event);
      case 'pull_request':
        return this.processPullRequestEvent(event);
      case 'repository':
        return this.processRepositoryEvent(event);
      default:
        return this.createEmptyChanges();
    }
  }

  /**
   * Process push events to extract file changes
   */
  private async processPushEvent(event: WebhookEvent): Promise<RepositoryChanges> {
    const payload = event.payload;
    const changes: RepositoryChanges = {
      modifiedFiles: [],
      addedFiles: [],
      deletedFiles: [],
      configurationChanges: [],
      dependencyChanges: []
    };

    // Extract commits and their changes
    if (payload.commits && Array.isArray(payload.commits)) {
      for (const commit of payload.commits) {
        // Process added files
        if (commit.added && Array.isArray(commit.added)) {
          for (const filePath of commit.added) {
            const significance = this.changeDetector.analyzeFileSignificance(filePath);
            changes.addedFiles.push({
              path: filePath,
              type: 'added',
              significance
            });
          }
        }

        // Process modified files
        if (commit.modified && Array.isArray(commit.modified)) {
          for (const filePath of commit.modified) {
            const significance = this.changeDetector.analyzeFileSignificance(filePath);
            changes.modifiedFiles.push({
              path: filePath,
              type: 'modified',
              significance
            });
          }
        }

        // Process removed files
        if (commit.removed && Array.isArray(commit.removed)) {
          for (const filePath of commit.removed) {
            const significance = this.changeDetector.analyzeFileSignificance(filePath);
            changes.deletedFiles.push({
              path: filePath,
              type: 'deleted',
              significance
            });
          }
        }
      }
    }

    // Analyze dependency changes
    changes.dependencyChanges = await this.changeDetector.detectDependencyChanges(changes);

    // Analyze configuration changes
    changes.configurationChanges = this.changeDetector.detectConfigurationChanges(changes);

    return changes;
  }

  /**
   * Process pull request events
   */
  private async processPullRequestEvent(event: WebhookEvent): Promise<RepositoryChanges> {
    const payload = event.payload;

    // For PR events, we can analyze the PR diff
    if (payload.pull_request && payload.pull_request.changed_files) {
      const changes: RepositoryChanges = {
        modifiedFiles: [],
        addedFiles: [],
        deletedFiles: [],
        configurationChanges: [],
        dependencyChanges: []
      };

      // PR events may include file changes in the payload
      // For now, return empty changes as PR analysis would require API calls
      return changes;
    }

    return this.createEmptyChanges();
  }

  /**
   * Process repository events (like manifest changes)
   */
  private async processRepositoryEvent(event: WebhookEvent): Promise<RepositoryChanges> {
    // Repository events typically don't include detailed file changes
    // Return empty changes for now
    return this.createEmptyChanges();
  }

  /**
   * Create empty repository changes structure
   */
  private createEmptyChanges(): RepositoryChanges {
    return {
      modifiedFiles: [],
      addedFiles: [],
      deletedFiles: [],
      configurationChanges: [],
      dependencyChanges: []
    };
  }

  /**
   * Get event priority mapping
   */
  getEventPriority(eventType: string): number {
    switch (eventType) {
      case 'push':
        return 3; // Medium priority
      case 'pull_request':
        return 2; // High priority
      case 'workflow_run':
        return 1; // Critical priority
      case 'repository':
        return 4; // Low priority
      default:
        return 3; // Default medium priority
    }
  }

  /**
   * Check if an event should trigger analysis
   */
  shouldTriggerAnalysis(event: WebhookEvent): boolean {
    // Always analyze push events
    if (event.type === 'push') {
      return true;
    }

    // Analyze PR events for specific actions
    if (event.type === 'pull_request') {
      const actions = ['opened', 'synchronize', 'reopened'];
      return actions.includes(event.payload.action);
    }

    // Analyze workflow run events for failures
    if (event.type === 'workflow_run') {
      const conclusion = event.payload.workflow_run?.conclusion;
      return conclusion === 'failure' || conclusion === 'timed_out';
    }

    return false;
  }
}