/**
 * Streaming workflow generation for large workflows
 * Implements performance optimization requirements 10.3, 10.4
 */

import { Readable, Transform, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { WorkflowTemplate, WorkflowType, JobTemplate, StepTemplate } from '../types';
import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';

/**
 * Streaming generation configuration
 */
export interface StreamingConfig {
  chunkSize: number;
  maxConcurrency: number;
  bufferSize: number;
  enableCompression: boolean;
  enableProgress: boolean;
}

/**
 * Generation progress information
 */
export interface GenerationProgress {
  phase: 'parsing' | 'template-loading' | 'job-generation' | 'step-generation' | 'rendering' | 'validation';
  completed: number;
  total: number;
  percentage: number;
  currentItem?: string;
  estimatedTimeRemaining?: number;
}

/**
 * Streaming generation context
 */
export interface StreamingContext {
  detectionResult: DetectionResult;
  options: GenerationOptions;
  config: StreamingConfig;
  startTime: number;
  progressCallback?: (progress: GenerationProgress) => void;
}

/**
 * Workflow chunk for streaming processing
 */
export interface WorkflowChunk {
  type: 'job' | 'step' | 'metadata' | 'validation';
  data: any;
  index: number;
  total: number;
  dependencies?: string[];
}

/**
 * Streaming workflow generator
 */
export class StreamingWorkflowGenerator {
  private config: StreamingConfig;

  constructor(config?: Partial<StreamingConfig>) {
    this.config = {
      chunkSize: config?.chunkSize || 10,
      maxConcurrency: config?.maxConcurrency || 4,
      bufferSize: config?.bufferSize || 1024 * 1024, // 1MB
      enableCompression: config?.enableCompression ?? true,
      enableProgress: config?.enableProgress ?? true,
      ...config
    };
  }

  /**
   * Generate workflow using streaming approach
   */
  async generateWorkflowStream(
    detectionResult: DetectionResult,
    options: GenerationOptions,
    progressCallback?: (progress: GenerationProgress) => void
  ): Promise<AsyncIterable<WorkflowChunk>> {
    const context: StreamingContext = {
      detectionResult,
      options,
      config: this.config,
      startTime: Date.now(),
      ...(progressCallback && { progressCallback })
    };

    return this.createGenerationStream(context);
  }

  /**
   * Generate complete workflow from stream
   */
  async generateWorkflowFromStream(
    detectionResult: DetectionResult,
    options: GenerationOptions,
    progressCallback?: (progress: GenerationProgress) => void
  ): Promise<WorkflowOutput> {
    const chunks: WorkflowChunk[] = [];
    const stream = await this.generateWorkflowStream(detectionResult, options, progressCallback);

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return this.assembleWorkflowFromChunks(chunks, detectionResult, options);
  }

  /**
   * Generate multiple workflows using streaming
   */
  async generateMultipleWorkflowsStream(
    detectionResult: DetectionResult,
    workflowTypes: WorkflowType[],
    progressCallback?: (progress: GenerationProgress) => void
  ): Promise<AsyncIterable<{ workflowType: WorkflowType; chunk: WorkflowChunk }>> {
    return this.createMultipleWorkflowStream(detectionResult, workflowTypes, progressCallback);
  }

  /**
   * Create generation stream
   */
  private async *createGenerationStream(context: StreamingContext): AsyncIterable<WorkflowChunk> {
    const { detectionResult, options, progressCallback } = context;

    // Phase 1: Parse and prepare
    if (progressCallback) {
      progressCallback({
        phase: 'parsing',
        completed: 0,
        total: 100,
        percentage: 0,
        currentItem: 'Analyzing detection results'
      });
    }

    const workflowPlan = await this.createWorkflowPlan(detectionResult, options);
    
    if (progressCallback) {
      progressCallback({
        phase: 'parsing',
        completed: 100,
        total: 100,
        percentage: 100
      });
    }

    // Phase 2: Load templates
    if (progressCallback) {
      progressCallback({
        phase: 'template-loading',
        completed: 0,
        total: workflowPlan.templates.length,
        percentage: 0
      });
    }

    const templates = new Map<string, WorkflowTemplate>();
    for (let i = 0; i < workflowPlan.templates.length; i++) {
      const templateName = workflowPlan.templates[i];
      if (!templateName) continue;
      
      const template = await this.loadTemplate(templateName, context);
      templates.set(templateName, template);

      if (progressCallback) {
        progressCallback({
          phase: 'template-loading',
          completed: i + 1,
          total: workflowPlan.templates.length,
          percentage: ((i + 1) / workflowPlan.templates.length) * 100,
          currentItem: templateName || 'unknown'
        });
      }
    }

    // Phase 3: Generate jobs in chunks
    if (progressCallback) {
      progressCallback({
        phase: 'job-generation',
        completed: 0,
        total: workflowPlan.jobs.length,
        percentage: 0
      });
    }

    const jobChunks = this.chunkArray(workflowPlan.jobs, this.config.chunkSize);
    let jobIndex = 0;

    for (const chunk of jobChunks) {
      const jobs = await this.generateJobChunk(chunk, templates, context);
      
      for (const job of jobs) {
        yield {
          type: 'job',
          data: job,
          index: jobIndex++,
          total: workflowPlan.jobs.length
        };

        if (progressCallback) {
          progressCallback({
            phase: 'job-generation',
            completed: jobIndex,
            total: workflowPlan.jobs.length,
            percentage: (jobIndex / workflowPlan.jobs.length) * 100,
            currentItem: job.name
          });
        }
      }
    }

    // Phase 4: Generate steps for each job
    if (progressCallback) {
      progressCallback({
        phase: 'step-generation',
        completed: 0,
        total: workflowPlan.totalSteps,
        percentage: 0
      });
    }

    let stepIndex = 0;
    for (const jobPlan of workflowPlan.jobs) {
      const stepChunks = this.chunkArray(jobPlan.steps, this.config.chunkSize);
      
      for (const chunk of stepChunks) {
        const steps = await this.generateStepChunk(chunk, jobPlan, templates, context);
        
        for (const step of steps) {
          yield {
            type: 'step',
            data: { jobName: jobPlan.name, step },
            index: stepIndex++,
            total: workflowPlan.totalSteps
          };

          if (progressCallback) {
            progressCallback({
              phase: 'step-generation',
              completed: stepIndex,
              total: workflowPlan.totalSteps,
              percentage: (stepIndex / workflowPlan.totalSteps) * 100,
              currentItem: step.name
            });
          }
        }
      }
    }

    // Phase 5: Generate metadata
    yield {
      type: 'metadata',
      data: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: this.createDetectionSummary(detectionResult),
        optimizations: ['Streaming generation', 'Chunked processing'],
        warnings: []
      },
      index: 0,
      total: 1
    };

    if (progressCallback) {
      progressCallback({
        phase: 'rendering',
        completed: 100,
        total: 100,
        percentage: 100
      });
    }
  }

  /**
   * Create multiple workflow stream
   */
  private async *createMultipleWorkflowStream(
    detectionResult: DetectionResult,
    workflowTypes: WorkflowType[],
    progressCallback?: (progress: GenerationProgress) => void
  ): AsyncIterable<{ workflowType: WorkflowType; chunk: WorkflowChunk }> {
    const totalWorkflows = workflowTypes.length;
    
    for (let i = 0; i < workflowTypes.length; i++) {
      const workflowType = workflowTypes[i];
      if (!workflowType) continue;
      
      const options: GenerationOptions = {
        workflowType,
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard'
      };

      const workflowProgressCallback = progressCallback ? (progress: GenerationProgress) => {
        const overallProgress = {
          ...progress,
          completed: (i * 100 + progress.percentage) / totalWorkflows,
          total: 100,
          percentage: (i * 100 + progress.percentage) / totalWorkflows,
          currentItem: `${workflowType}: ${progress.currentItem || progress.phase}`
        };
        progressCallback(overallProgress);
      } : undefined;

      const stream = await this.generateWorkflowStream(detectionResult, options, workflowProgressCallback);
      
      for await (const chunk of stream) {
        yield { workflowType, chunk };
      }
    }
  }

  /**
   * Create workflow plan for streaming generation
   */
  private async createWorkflowPlan(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<{
    templates: string[];
    jobs: Array<{ name: string; template: string; steps: Array<{ name: string; template: string }> }>;
    totalSteps: number;
  }> {
    const templates = new Set<string>();
    const jobs: Array<{ name: string; template: string; steps: Array<{ name: string; template: string }> }> = [];
    let totalSteps = 0;

    // Determine required templates based on detection results
    for (const framework of detectionResult.frameworks) {
      templates.add(`${framework.name.toLowerCase()}-${options.workflowType}`);
    }

    for (const language of detectionResult.languages) {
      templates.add(`${language.name.toLowerCase()}-base`);
    }

    // Plan jobs based on workflow type
    switch (options.workflowType) {
      case 'ci':
        jobs.push(
          {
            name: 'test',
            template: 'test-job',
            steps: [
              { name: 'checkout', template: 'checkout-step' },
              { name: 'setup', template: 'setup-step' },
              { name: 'install', template: 'install-step' },
              { name: 'test', template: 'test-step' }
            ]
          },
          {
            name: 'build',
            template: 'build-job',
            steps: [
              { name: 'checkout', template: 'checkout-step' },
              { name: 'setup', template: 'setup-step' },
              { name: 'build', template: 'build-step' }
            ]
          }
        );
        break;

      case 'cd':
        jobs.push(
          {
            name: 'deploy',
            template: 'deploy-job',
            steps: [
              { name: 'checkout', template: 'checkout-step' },
              { name: 'setup', template: 'setup-step' },
              { name: 'build', template: 'build-step' },
              { name: 'deploy', template: 'deploy-step' }
            ]
          }
        );
        break;

      default:
        jobs.push({
          name: 'default',
          template: 'default-job',
          steps: [
            { name: 'checkout', template: 'checkout-step' }
          ]
        });
    }

    // Add security jobs if required
    if (options.securityLevel !== 'basic') {
      jobs.push({
        name: 'security',
        template: 'security-job',
        steps: [
          { name: 'checkout', template: 'checkout-step' },
          { name: 'security-scan', template: 'security-scan-step' }
        ]
      });
    }

    // Calculate total steps
    totalSteps = jobs.reduce((sum, job) => sum + job.steps.length, 0);

    // Add all step templates
    for (const job of jobs) {
      templates.add(job.template);
      for (const step of job.steps) {
        templates.add(step.template);
      }
    }

    return {
      templates: Array.from(templates),
      jobs,
      totalSteps
    };
  }

  /**
   * Load template (placeholder implementation)
   */
  private async loadTemplate(templateName: string, context: StreamingContext): Promise<WorkflowTemplate> {
    // Simulate template loading delay
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      name: templateName,
      type: context.options.workflowType,
      triggers: {},
      jobs: []
    };
  }

  /**
   * Generate job chunk
   */
  private async generateJobChunk(
    jobPlans: Array<{ name: string; template: string; steps: Array<{ name: string; template: string }> }>,
    templates: Map<string, WorkflowTemplate>,
    context: StreamingContext
  ): Promise<JobTemplate[]> {
    const jobs: JobTemplate[] = [];

    for (const jobPlan of jobPlans) {
      const job: JobTemplate = {
        name: jobPlan.name,
        runsOn: 'ubuntu-latest',
        steps: [] // Steps will be generated separately
      };

      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Generate step chunk
   */
  private async generateStepChunk(
    stepPlans: Array<{ name: string; template: string }>,
    jobPlan: { name: string; template: string; steps: Array<{ name: string; template: string }> },
    templates: Map<string, WorkflowTemplate>,
    context: StreamingContext
  ): Promise<StepTemplate[]> {
    const steps: StepTemplate[] = [];

    for (const stepPlan of stepPlans) {
      const stepParameters = this.getStepParameters(stepPlan.name, context);
      const stepAction = this.getStepAction(stepPlan.name);
      const step: StepTemplate = {
        name: stepPlan.name,
        ...(stepAction && { uses: stepAction }),
        ...(stepParameters && { with: stepParameters })
      };

      steps.push(step);
    }

    return steps;
  }

  /**
   * Get step action based on step name
   */
  private getStepAction(stepName: string): string | undefined {
    const actionMap: Record<string, string | undefined> = {
      'checkout': 'actions/checkout@v4',
      'setup': 'actions/setup-node@v4',
      'install': undefined, // Will use run command
      'test': undefined, // Will use run command
      'build': undefined, // Will use run command
      'deploy': undefined, // Will use run command
      'security-scan': 'github/codeql-action/analyze@v3'
    };

    return actionMap[stepName] || 'actions/checkout@v4';
  }

  /**
   * Get step parameters based on step name and context
   */
  private getStepParameters(stepName: string, context: StreamingContext): Record<string, any> | undefined {
    switch (stepName) {
      case 'setup':
        const nodeLanguage = context.detectionResult.languages.find(l => l.name.toLowerCase() === 'javascript' || l.name.toLowerCase() === 'typescript');
        return nodeLanguage ? {
          'node-version': nodeLanguage.version || '18',
          'cache': 'npm'
        } : undefined;

      case 'security-scan':
        return {
          'language': context.detectionResult.languages[0]?.name.toLowerCase() || 'javascript'
        };

      default:
        return undefined;
    }
  }

  /**
   * Assemble workflow from chunks
   */
  private async assembleWorkflowFromChunks(
    chunks: WorkflowChunk[],
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    const jobs: JobTemplate[] = [];
    const jobSteps = new Map<string, StepTemplate[]>();
    let metadata: any = {};

    // Process chunks
    for (const chunk of chunks) {
      switch (chunk.type) {
        case 'job':
          jobs.push(chunk.data);
          jobSteps.set(chunk.data.name, []);
          break;

        case 'step':
          const { jobName, step } = chunk.data;
          if (!jobSteps.has(jobName)) {
            jobSteps.set(jobName, []);
          }
          jobSteps.get(jobName)!.push(step);
          break;

        case 'metadata':
          metadata = chunk.data;
          break;
      }
    }

    // Assign steps to jobs
    for (const job of jobs) {
      job.steps = jobSteps.get(job.name) || [];
    }

    // Create workflow template
    const workflow: WorkflowTemplate = {
      name: `${options.workflowType.toUpperCase()} Pipeline`,
      type: options.workflowType,
      triggers: this.createTriggers(options.workflowType),
      jobs
    };

    // Convert to YAML
    const yaml = await import('js-yaml');
    const content = yaml.dump(workflow, { indent: 2, lineWidth: 120 });

    return {
      filename: `${options.workflowType}.yml`,
      content,
      type: options.workflowType,
      metadata: {
        generatedAt: metadata.generatedAt || new Date(),
        generatorVersion: metadata.generatorVersion || '1.0.0',
        detectionSummary: metadata.detectionSummary || '',
        optimizations: metadata.optimizations || [],
        warnings: metadata.warnings || []
      }
    };
  }

  /**
   * Create triggers for workflow type
   */
  private createTriggers(workflowType: WorkflowType): any {
    switch (workflowType) {
      case 'ci':
        return {
          push: { branches: ['main', 'develop'] },
          pull_request: { branches: ['main'] }
        };

      case 'cd':
        return {
          push: { branches: ['main'] },
          workflow_run: {
            workflows: ['CI'],
            types: ['completed'],
            branches: ['main']
          }
        };

      case 'release':
        return {
          push: { tags: ['v*'] }
        };

      default:
        return {
          push: { branches: ['main'] }
        };
    }
  }

  /**
   * Create detection summary
   */
  private createDetectionSummary(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks.map(f => f.name).join(', ');
    const languages = detectionResult.languages.map(l => l.name).join(', ');
    return `Detected frameworks: ${frameworks}. Languages: ${languages}`;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Create readable stream from workflow generation
   */
  createReadableStream(
    detectionResult: DetectionResult,
    options: GenerationOptions,
    progressCallback?: (progress: GenerationProgress) => void
  ): Readable {
    let generator: AsyncIterator<WorkflowChunk>;
    let initialized = false;

    const self = this;
    return new Readable({
      objectMode: true,
      async read() {
        try {
          if (!initialized) {
            const asyncIterable = await self.generateWorkflowStream(detectionResult, options, progressCallback);
            generator = asyncIterable[Symbol.asyncIterator]();
            initialized = true;
          }

          const { value, done } = await generator.next();
          
          if (done) {
            this.push(null); // End of stream
          } else {
            this.push(value);
          }
        } catch (error) {
          this.destroy(error as Error);
        }
      }
    });
  }

  /**
   * Create transform stream for processing chunks
   */
  createTransformStream(
    processor: (chunk: WorkflowChunk) => Promise<WorkflowChunk>
  ): Transform {
    return new Transform({
      objectMode: true,
      async transform(chunk: WorkflowChunk, encoding, callback) {
        try {
          const processed = await processor(chunk);
          callback(null, processed);
        } catch (error) {
          callback(error as Error);
        }
      }
    });
  }

  /**
   * Create writable stream for collecting results
   */
  createWritableStream(
    collector: (chunk: WorkflowChunk) => Promise<void>
  ): Writable {
    return new Writable({
      objectMode: true,
      async write(chunk: WorkflowChunk, encoding, callback) {
        try {
          await collector(chunk);
          callback();
        } catch (error) {
          callback(error as Error);
        }
      }
    });
  }

  /**
   * Process workflow using streaming pipeline
   */
  async processWorkflowStream(
    detectionResult: DetectionResult,
    options: GenerationOptions,
    processors: Array<(chunk: WorkflowChunk) => Promise<WorkflowChunk>>,
    collector: (chunk: WorkflowChunk) => Promise<void>,
    progressCallback?: (progress: GenerationProgress) => void
  ): Promise<void> {
    const readable = this.createReadableStream(detectionResult, options, progressCallback);
    
    const transforms = processors.map(processor => this.createTransformStream(processor));
    const writable = this.createWritableStream(collector);

    const streams = [readable, ...transforms, writable];
    
    await pipeline(streams);
  }
}