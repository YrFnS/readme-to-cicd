import {
  WebhookEvent,
  RepositoryChanges
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
      case 'workflow_run':
        return this.processWorkflowRunEvent(event);
      case 'repository':
        return this.processRepositoryEvent(event);
      case 'deployment':
        return this.processDeploymentEvent(event);
      case 'security_advisory':
        return this.processSecurityEvent(event);
      case 'issues':
        return this.processIssuesEvent(event);
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
  private async processPullRequestEvent(_event: WebhookEvent): Promise<RepositoryChanges> {
    const payload = _event.payload;

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
  private async processRepositoryEvent(_event: WebhookEvent): Promise<RepositoryChanges> {
    // Repository events typically don't include detailed file changes
    // Return empty changes for now
    return this.createEmptyChanges();
  }

  /**
   * Process workflow run events (failures, successes, timeouts)
   */
  private async processWorkflowRunEvent(event: WebhookEvent): Promise<RepositoryChanges> {
    const payload = event.payload;
    const changes: RepositoryChanges = {
      modifiedFiles: [],
      addedFiles: [],
      deletedFiles: [],
      configurationChanges: [],
      dependencyChanges: []
    };

    // Workflow run events are important for monitoring and automation
    // They indicate CI/CD pipeline status and can trigger optimizations
    if (payload.workflow_run) {
      const workflowRun = payload.workflow_run;

      // If workflow failed, we might want to analyze what went wrong
      if (workflowRun.conclusion === 'failure' || workflowRun.conclusion === 'timed_out') {
        // This could trigger automated PR creation for fixes
        // For now, just log the failure for analysis
        console.log(`Workflow ${workflowRun.name} failed:`, workflowRun.conclusion);
      }
    }

    return changes;
  }

  /**
   * Process deployment events
   */
  private async processDeploymentEvent(_event: WebhookEvent): Promise<RepositoryChanges> {
    // Deployment events indicate production releases
    // These are important for performance monitoring and optimization
    return this.createEmptyChanges();
  }

  /**
   * Process security advisory events
   */
  private async processSecurityEvent(event: WebhookEvent): Promise<RepositoryChanges> {
    // Security events require immediate attention and automated responses
    const payload = event.payload;

    if (payload.security_advisory) {
      // This should trigger security automation
      console.log('Security advisory received:', payload.security_advisory.summary);
    }

    return this.createEmptyChanges();
  }

  /**
   * Process issues events
   */
  private async processIssuesEvent(_event: WebhookEvent): Promise<RepositoryChanges> {
    // Issues events for tracking bug reports and feature requests
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