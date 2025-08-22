import { Octokit } from '@octokit/rest';
import {
  GitHubAPIConfig,
  PullRequestData,
  PullRequestResult,
  WorkflowRunInfo,
  SecurityAlert,
  DependabotAlert,
  RepositoryInfo
} from '../types';

export class GitHubAPIClient {
  private octokit: Octokit;
  private config: GitHubAPIConfig;

  constructor(config: GitHubAPIConfig) {
    this.config = {
      token: config.token,
      baseUrl: config.baseUrl,
      userAgent: config.userAgent || 'readme-to-cicd-agent-hooks',
      requestTimeout: config.requestTimeout || 30000
    };

    const octokitOptions: any = {
      auth: this.config.token,
      request: {}
    };

    if (this.config.baseUrl) {
      octokitOptions.baseUrl = this.config.baseUrl;
    }

    if (this.config.userAgent) {
      octokitOptions.userAgent = this.config.userAgent;
    }

    if (this.config.requestTimeout) {
      octokitOptions.request.timeout = this.config.requestTimeout;
    }

    this.octokit = new Octokit(octokitOptions);
  }

  /**
   * Create a pull request with automated changes
   */
  async createPullRequest(
    owner: string,
    repo: string,
    data: PullRequestData
  ): Promise<PullRequestResult> {
    try {
      const params: any = {
        owner,
        repo,
        title: data.title,
        body: data.body,
        head: data.head,
        base: data.base
      };

      if (data.draft !== undefined) {
        params.draft = data.draft;
      }

      if (data.maintainer_can_modify !== undefined) {
        params.maintainer_can_modify = data.maintainer_can_modify;
      }

      const response = await this.octokit.pulls.create(params);

      return {
        success: true,
        prNumber: response.data.number,
        prUrl: response.data.html_url
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to create pull request: ${errorMessage}`
      };
    }
  }

  /**
   * Update an existing pull request
   */
  async updatePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    updates: Partial<PullRequestData>
  ): Promise<PullRequestResult> {
    try {
      const params: any = {
        owner,
        repo,
        pull_number: pullNumber
      };

      if (updates.title !== undefined) {
        params.title = updates.title;
      }

      if (updates.body !== undefined) {
        params.body = updates.body;
      }

      if (updates.base !== undefined) {
        params.base = updates.base;
      }

      if (updates.maintainer_can_modify !== undefined) {
        params.maintainer_can_modify = updates.maintainer_can_modify;
      }

      const response = await this.octokit.pulls.update(params);

      return {
        success: true,
        prNumber: response.data.number,
        prUrl: response.data.html_url
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to update pull request: ${errorMessage}`
      };
    }
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'
  ): Promise<{ success: boolean; error?: string; sha?: string }> {
    try {
      const response = await this.octokit.pulls.merge({
        owner,
        repo,
        pull_number: pullNumber,
        merge_method: mergeMethod
      });

      return {
        success: true,
        sha: response.data.sha
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to merge pull request: ${errorMessage}`
      };
    }
  }

  /**
   * List workflow runs for a repository
   */
  async listWorkflowRuns(
    owner: string,
    repo: string,
    options: {
      status?: 'queued' | 'in_progress' | 'completed';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<WorkflowRunInfo[]> {
    try {
      const response = await this.octokit.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        status: options.status,
        per_page: options.per_page || 30,
        page: options.page || 1
      });

      return response.data.workflow_runs.map(run => ({
        id: run.id,
        name: run.name || 'Unknown',
        status: run.status as WorkflowRunInfo['status'],
        conclusion: run.conclusion as WorkflowRunInfo['conclusion'],
        created_at: run.created_at,
        updated_at: run.updated_at,
        duration: run.updated_at && run.created_at
          ? new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()
          : undefined
      }));
    } catch (error) {
      console.error('Failed to list workflow runs:', error);
      return [];
    }
  }

  /**
   * Get workflow usage statistics
   */
  async getWorkflowUsage(
    owner: string,
    repo: string,
    workflowId: number
  ): Promise<{ success: boolean; usage?: any; error?: string }> {
    try {
      const response = await this.octokit.actions.getWorkflowUsage({
        owner,
        repo,
        workflow_id: workflowId
      });

      return {
        success: true,
        usage: response.data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to get workflow usage: ${errorMessage}`
      };
    }
  }

  /**
   * Cancel a workflow run
   */
  async cancelWorkflowRun(
    owner: string,
    repo: string,
    runId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.octokit.actions.cancelWorkflowRun({
        owner,
        repo,
        run_id: runId
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to cancel workflow run: ${errorMessage}`
      };
    }
  }

  /**
   * Get repository file contents
   */
  async getFileContents(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<{ success: boolean; content?: string; sha?: string; error?: string }> {
    try {
      const params: any = {
        owner,
        repo,
        path
      };

      if (ref) {
        params.ref = ref;
      }

      const response = await this.octokit.repos.getContent(params);

      if (Array.isArray(response.data)) {
        return {
          success: false,
          error: 'Path points to a directory, not a file'
        };
      }

      if (response.data.type !== 'file') {
        return {
          success: false,
          error: 'Path does not point to a file'
        };
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf8');

      return {
        success: true,
        content,
        sha: response.data.sha
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to get file contents: ${errorMessage}`
      };
    }
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string // Required for updates
  ): Promise<{ success: boolean; sha: string | undefined; error?: string }> {
    try {
      const params: any = {
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      };

      if (sha) {
        params.sha = sha;
      }

      const response = await this.octokit.repos.createOrUpdateFileContents(params);

      return {
        success: true,
        sha: response.data.content?.sha
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        sha: undefined,
        error: `Failed to create/update file: ${errorMessage}`
      };
    }
  }

  /**
   * List commits for a repository
   */
  async listCommits(
    owner: string,
    repo: string,
    options: {
      sha?: string;
      path?: string;
      since?: string;
      until?: string;
      per_page?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const params: any = {
        owner,
        repo,
        per_page: options.per_page || 30
      };

      if (options.sha) {
        params.sha = options.sha;
      }

      if (options.path) {
        params.path = options.path;
      }

      if (options.since) {
        params.since = options.since;
      }

      if (options.until) {
        params.until = options.until;
      }

      const response = await this.octokit.repos.listCommits(params);

      return response.data;
    } catch (error) {
      console.error('Failed to list commits:', error);
      return [];
    }
  }

  /**
   * Get code scanning alerts
   */
  async getCodeScanningAlerts(
    owner: string,
    repo: string,
    state?: 'open' | 'closed' | 'dismissed' | 'fixed'
  ): Promise<SecurityAlert[]> {
    try {
      const params: any = { owner, repo };
      if (state && state !== 'closed') {
        params.state = state;
      } else if (state === 'closed') {
        // For closed alerts, we might need to handle this differently
        // For now, we'll omit the state parameter
      }

      const response = await this.octokit.codeScanning.listAlertsForRepo(params);

      return response.data.map(alert => ({
        number: alert.number,
        state: alert.state as SecurityAlert['state'],
        severity: alert.rule?.severity as SecurityAlert['severity'],
        description: alert.rule?.description || 'No description',
        html_url: alert.html_url,
        created_at: alert.created_at
      }));
    } catch (error) {
      console.error('Failed to get code scanning alerts:', error);
      return [];
    }
  }

  /**
   * Get secret scanning alerts
   */
  async getSecretScanningAlerts(
    owner: string,
    repo: string,
    state?: 'open' | 'resolved'
  ): Promise<any[]> {
    try {
      const response = await this.octokit.secretScanning.listAlertsForRepo({
        owner,
        repo,
        state
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get secret scanning alerts:', error);
      return [];
    }
  }

  /**
   * Get Dependabot alerts
   */
  async getDependabotAlerts(
    owner: string,
    repo: string,
    state?: 'open' | 'dismissed' | 'fixed'
  ): Promise<DependabotAlert[]> {
    try {
      const response = await this.octokit.dependabot.listAlertsForRepo({
        owner,
        repo,
        state
      });

      return response.data.map(alert => ({
        number: alert.number,
        state: alert.state as DependabotAlert['state'],
        severity: alert.security_advisory?.severity as DependabotAlert['severity'],
        package_name: alert.dependency?.package?.name || 'Unknown',
        vulnerable_version: alert.security_advisory?.vulnerabilities?.[0]?.vulnerable_version_range || 'Unknown',
        safe_version: alert.security_advisory?.vulnerabilities?.[0]?.first_patched_version?.identifier || 'Unknown',
        html_url: alert.html_url,
        created_at: alert.created_at
      }));
    } catch (error) {
      console.error('Failed to get Dependabot alerts:', error);
      return [];
    }
  }

  /**
   * Check if the API client is properly authenticated
   */
  async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await this.octokit.users.getAuthenticated();
      return {
        success: true,
        user: response.data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}`
      };
    }
  }
}