import { AnalysisQueue, AnalysisJob, JobResult } from './analysis-queue';
import { EventProcessor } from '../event/event-processor';
import { AutomationEngine } from '../automation/automation-engine';
import { RepositoryInfo, RepositoryChanges, WebhookEvent } from '../types';

export interface WorkerConfig {
  maxConcurrentJobs: number;
  jobTimeout: number; // milliseconds
  enableMetrics: boolean;
}

export class AnalysisWorker {
  private queue: AnalysisQueue;
  private eventProcessor: EventProcessor;
  private automationEngine?: AutomationEngine;
  private config: WorkerConfig;
  private isRunning: boolean = false;
  private metrics = {
    jobsProcessed: 0,
    jobsFailed: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0
  };

  constructor(
    queue: AnalysisQueue,
    eventProcessor: EventProcessor,
    automationEngine?: AutomationEngine,
    config: Partial<WorkerConfig> = {}
  ) {
    this.queue = queue;
    this.eventProcessor = eventProcessor;
    if (automationEngine) {
      this.automationEngine = automationEngine;
    }
    this.config = {
      maxConcurrentJobs: 3,
      jobTimeout: 300000,
      enableMetrics: true,
      ...config
    };
    this.config = {
      maxConcurrentJobs: 3,
      jobTimeout: 300000, // 5 minutes
      enableMetrics: true,
      ...config
    };

    this.setupEventListeners();
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('AnalysisWorker started');

    // Start processing jobs
    this.processJobsLoop();
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('AnalysisWorker stopped');
  }

  /**
   * Process jobs in a continuous loop
   */
  private async processJobsLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const pendingJobs = this.queue.getPendingJobsCount();

        if (pendingJobs > 0) {
          await this.queue.processJobs();
        }

        // Wait before checking for more jobs
        await this.sleep(1000); // 1 second

      } catch (error) {
        console.error('Error in job processing loop:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  /**
   * Setup event listeners for job lifecycle
   */
  private setupEventListeners(): void {
    this.queue.on('job-added', (job: AnalysisJob) => {
      console.log(`Worker received job: ${job.id} (${job.type})`);
    });

    this.queue.on('job-start', (job: AnalysisJob) => {
      if (this.config.enableMetrics) {
        console.log(`Worker started processing: ${job.id}`);
      }
    });

    this.queue.on('job-success', (job: AnalysisJob, result: JobResult) => {
      this.updateMetrics(true, result.processingTime);
      console.log(`Worker completed job: ${job.id} in ${result.processingTime}ms`);
    });

    this.queue.on('job-failed', (job: AnalysisJob, error: string) => {
      this.updateMetrics(false, 0);
      console.error(`Worker failed job: ${job.id} - ${error}`);
    });

    this.queue.on('job-retry', (job: AnalysisJob, error: string) => {
      console.log(`Worker retrying job: ${job.id} (attempt ${job.retryCount}/${job.maxRetries})`);
    });
  }

  /**
   * Update worker metrics
   */
  private updateMetrics(success: boolean, processingTime: number): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.metrics.jobsProcessed++;

    if (!success) {
      this.metrics.jobsFailed++;
    }

    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.jobsProcessed;
  }

  /**
   * Get worker metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Submit a webhook event for processing
   */
  async processWebhookEvent(event: WebhookEvent): Promise<string> {
    // Check if event should trigger analysis
    if (!this.eventProcessor.shouldTriggerAnalysis(event)) {
      throw new Error('Event should not trigger analysis');
    }

    // Get event priority
    const priority = this.eventProcessor.getEventPriority(event.type);

    // Add to queue
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
  async processRepositoryChanges(
    repository: RepositoryInfo,
    changes: RepositoryChanges,
    priority: number = 5
  ): Promise<string> {
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
    return this.queue.addJob({
      type,
      repository,
      priority,
      maxRetries: 2,
      data: {}
    });
  }
}