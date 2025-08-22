import { AnalysisQueue } from './analysis-queue';
import { AnalysisWorker } from './worker';
import { EventProcessor } from '../event/event-processor';
import { AutomationEngine } from '../automation/automation-engine';
import { RepositoryInfo, RepositoryChanges, WebhookEvent } from '../types';

export interface QueueManagerConfig {
  maxConcurrentJobs: number;
  jobTimeout: number;
  enableMetrics: boolean;
  enableWorker: boolean;
}

export class QueueManager {
  private queue: AnalysisQueue;
  private worker?: AnalysisWorker;
  private eventProcessor: EventProcessor;
  private automationEngine?: AutomationEngine;
  private config: QueueManagerConfig;

  constructor(
    eventProcessor: EventProcessor,
    automationEngine?: AutomationEngine,
    config: Partial<QueueManagerConfig> = {}
  ) {
    this.eventProcessor = eventProcessor;
    if (automationEngine) {
      this.automationEngine = automationEngine;
    }
    this.config = {
      maxConcurrentJobs: 3,
      jobTimeout: 300000,
      enableMetrics: true,
      enableWorker: true,
      ...config
    };
    this.config = {
      maxConcurrentJobs: 3,
      jobTimeout: 300000,
      enableMetrics: true,
      enableWorker: true,
      ...config
    };

    this.queue = new AnalysisQueue(this.config.maxConcurrentJobs);

    if (this.config.enableWorker) {
      this.worker = new AnalysisWorker(
        this.queue,
        this.eventProcessor,
        this.automationEngine,
        {
          maxConcurrentJobs: this.config.maxConcurrentJobs,
          jobTimeout: this.config.jobTimeout,
          enableMetrics: this.config.enableMetrics
        }
      );
    }
  }

  /**
   * Initialize the queue manager
   */
  async initialize(): Promise<void> {
    console.log('Initializing Queue Manager...');

    if (this.worker) {
      await this.worker.start();
      console.log('Analysis worker started');
    }

    console.log('Queue Manager initialized successfully');
  }

  /**
   * Shutdown the queue manager
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Queue Manager...');

    if (this.worker) {
      await this.worker.stop();
    }

    console.log('Queue Manager shutdown complete');
  }

  /**
   * Submit a webhook event for analysis
   */
  async submitWebhookEvent(event: WebhookEvent): Promise<string> {
    if (this.worker) {
      return this.worker.processWebhookEvent(event);
    }

    // Fallback if no worker
    const priority = this.eventProcessor.getEventPriority(event.type);
    return this.queue.addJob({
      type: 'automation-analysis',
      repository: event.repository,
      webhookEvent: event,
      priority,
      maxRetries: 3,
      data: { event }
    });
  }

  /**
   * Submit repository changes for analysis
   */
  async submitRepositoryChanges(
    repository: RepositoryInfo,
    changes: RepositoryChanges,
    priority: number = 5
  ): Promise<string> {
    if (this.worker) {
      return this.worker.processRepositoryChanges(repository, changes, priority);
    }

    // Fallback if no worker
    return this.queue.addJob({
      type: 'automation-analysis',
      repository,
      changes,
      priority,
      maxRetries: 2,
      data: { changes }
    });
  }

  /**
   * Submit individual analysis tasks
   */
  async submitAnalysisTask(
    type: 'readme-analysis' | 'framework-detection' | 'yaml-generation',
    repository: RepositoryInfo,
    priority: number = 3
  ): Promise<string> {
    if (this.worker) {
      return this.worker.submitAnalysisTask(type, repository, priority);
    }

    // Fallback if no worker
    return this.queue.addJob({
      type,
      repository,
      priority,
      maxRetries: 2,
      data: {}
    });
  }

  /**
   * Process all pending jobs manually (for testing or when worker is disabled)
   */
  async processPendingJobs(): Promise<void> {
    await this.queue.processJobs();
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pendingJobs: number;
    workerMetrics?: any;
  } {
    return {
      pendingJobs: this.queue.getPendingJobsCount(),
      workerMetrics: this.worker?.getMetrics()
    };
  }

  /**
   * Get all pending jobs
   */
  getPendingJobs(): any[] {
    return this.queue.getAllJobs();
  }

  /**
   * Clear all pending jobs
   */
  clearPendingJobs(): void {
    const jobs = this.queue.getAllJobs();
    jobs.forEach(job => this.queue.removeJob(job.id));
  }

  /**
   * Set job priority
   */
  async setJobPriority(jobId: string, newPriority: number): Promise<boolean> {
    const job = this.queue.getJob(jobId);
    if (!job) {
      return false;
    }

    // Remove and re-add with new priority
    this.queue.removeJob(jobId);
    const jobData: any = {
      type: job.type,
      repository: job.repository,
      priority: newPriority,
      maxRetries: job.maxRetries,
      data: job.data
    };

    if (job.changes) {
      jobData.changes = job.changes;
    }

    if (job.webhookEvent) {
      jobData.webhookEvent = job.webhookEvent;
    }

    await this.queue.addJob(jobData);

    return true;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): any {
    return this.queue.getJob(jobId);
  }

  /**
   * Remove job by ID
   */
  removeJob(jobId: string): boolean {
    return this.queue.removeJob(jobId);
  }

  /**
   * Subscribe to queue events
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.queue.on(event, listener);
  }

  /**
   * Unsubscribe from queue events
   */
  off(event: string, listener: (...args: any[]) => void): void {
    this.queue.off(event, listener);
  }
}