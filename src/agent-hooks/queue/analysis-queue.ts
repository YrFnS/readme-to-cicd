import { EventEmitter } from 'events';
import {
  RepositoryInfo,
  RepositoryChanges,
  AutomationDecision,
  WebhookEvent
} from '../types';

export interface AnalysisJob {
  id: string;
  type: 'readme-analysis' | 'framework-detection' | 'yaml-generation' | 'automation-analysis';
  repository: RepositoryInfo;
  changes?: RepositoryChanges;
  webhookEvent?: WebhookEvent;
  priority: number;
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
  data: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
}

export class AnalysisQueue {
  private jobs: Map<string, AnalysisJob> = new Map();
  private eventEmitter = new EventEmitter();
  private isProcessing: boolean = false;
  private maxConcurrentJobs: number = 3;

  constructor(maxConcurrentJobs: number = 3) {
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  /**
   * Add a job to the queue
   */
  async addJob(job: Omit<AnalysisJob, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const jobId = this.generateJobId();
    const fullJob: AnalysisJob = {
      ...job,
      id: jobId,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: job.type === 'automation-analysis' ? 3 : 2
    };

    this.jobs.set(jobId, fullJob);
    this.eventEmitter.emit('job-added', fullJob);

    console.log(`Added job ${jobId} of type ${job.type} for ${job.repository.fullName}`);
    return jobId;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): AnalysisJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Remove job from queue
   */
  removeJob(jobId: string): boolean {
    const removed = this.jobs.delete(jobId);
    if (removed) {
      this.eventEmitter.emit('job-removed', jobId);
    }
    return removed;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): AnalysisJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get pending jobs count
   */
  getPendingJobsCount(): number {
    return this.jobs.size;
  }

  /**
   * Process jobs in the queue
   */
  async processJobs(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const jobs = this.getPrioritizedJobs();

      // Process jobs up to max concurrent limit
      const processingPromises = jobs
        .slice(0, this.maxConcurrentJobs)
        .map(job => this.processJob(job));

      await Promise.allSettled(processingPromises);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get jobs prioritized by importance
   */
  private getPrioritizedJobs(): AnalysisJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => {
        // Higher priority first
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Older jobs first
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  /**
   * Process a single job
   */
  private async processJob(job: AnalysisJob): Promise<void> {
    const startTime = Date.now();

    try {
      this.eventEmitter.emit('job-start', job);
      console.log(`Processing job ${job.id} (${job.type}) for ${job.repository.fullName}`);

      const result = await this.executeJob(job);

      if (result.success) {
        this.eventEmitter.emit('job-success', job, result);
        console.log(`Job ${job.id} completed successfully in ${result.processingTime}ms`);
        this.removeJob(job.id);
      } else {
        await this.handleJobFailure(job, result.error || 'Unknown error');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handleJobFailure(job, errorMessage);
    }
  }

  /**
   * Execute the actual job based on type
   */
  private async executeJob(job: AnalysisJob): Promise<JobResult> {
    const startTime = Date.now();

    try {
      switch (job.type) {
        case 'readme-analysis':
          return await this.executeReadmeAnalysis(job);
        case 'framework-detection':
          return await this.executeFrameworkDetection(job);
        case 'yaml-generation':
          return await this.executeYamlGeneration(job);
        case 'automation-analysis':
          return await this.executeAutomationAnalysis(job);
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Job execution failed: ${errorMessage}`);
    } finally {
      const processingTime = Date.now() - startTime;
      // Processing time will be set in the result
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: AnalysisJob, error: string): Promise<void> {
    console.error(`Job ${job.id} failed: ${error}`);

    if (job.retryCount < job.maxRetries) {
      // Retry the job
      const updatedJob = {
        ...job,
        retryCount: job.retryCount + 1
      };

      this.jobs.set(job.id, updatedJob);
      this.eventEmitter.emit('job-retry', updatedJob, error);

      console.log(`Retrying job ${job.id} (attempt ${updatedJob.retryCount}/${updatedJob.maxRetries})`);

      // Add delay for retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, job.retryCount), 30000);
      setTimeout(() => this.processJob(updatedJob), delay);
    } else {
      // Max retries exceeded
      this.eventEmitter.emit('job-failed', job, error);
      console.error(`Job ${job.id} failed permanently after ${job.maxRetries} retries`);
      this.removeJob(job.id);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Job execution methods (simplified implementations)

  private async executeReadmeAnalysis(job: AnalysisJob): Promise<JobResult> {
    // This would integrate with the CLI readme parser
    const processingTime = Date.now() - job.createdAt.getTime();

    return {
      success: true,
      data: {
        hasTests: true,
        hasLinting: true,
        frameworks: ['react', 'typescript'],
        languages: ['typescript', 'javascript']
      },
      processingTime
    };
  }

  private async executeFrameworkDetection(job: AnalysisJob): Promise<JobResult> {
    // This would integrate with the CLI framework detection
    const processingTime = Date.now() - job.createdAt.getTime();

    return {
      success: true,
      data: {
        frameworks: ['react', 'nextjs'],
        confidence: 0.9,
        evidence: ['package.json', 'next.config.js']
      },
      processingTime
    };
  }

  private async executeYamlGeneration(job: AnalysisJob): Promise<JobResult> {
    // This would integrate with the CLI YAML generator
    const processingTime = Date.now() - job.createdAt.getTime();

    return {
      success: true,
      data: {
        workflows: ['ci.yml', 'cd.yml'],
        content: '# Generated CI workflow'
      },
      processingTime
    };
  }

  private async executeAutomationAnalysis(job: AnalysisJob): Promise<JobResult> {
    // This would run the full automation analysis pipeline
    const processingTime = Date.now() - job.createdAt.getTime();

    return {
      success: true,
      data: {
        decisions: [] as AutomationDecision[],
        recommendations: ['Optimize caching', 'Add security scanning']
      },
      processingTime
    };
  }

  // Event subscription methods

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}