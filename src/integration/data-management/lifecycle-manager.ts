/**
 * Data lifecycle manager with archival policies and retention controls
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as cron from 'node-cron';
import { 
  LifecycleManager, 
  RetentionResult, 
  ArchivalResult, 
  CleanupResult, 
  LifecycleStatus 
} from './interfaces';
import { 
  DataLifecycleConfig, 
  RetentionPolicy, 
  ArchivalPolicy, 
  ArchivalRule, 
  CleanupPolicy,
  ArchivalStatus 
} from './types';

interface LifecycleJob {
  id: string;
  type: 'retention' | 'archival' | 'cleanup';
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export class LifecycleManagerImpl implements LifecycleManager {
  private config?: DataLifecycleConfig;
  private scheduledJobs: Map<string, any> = new Map(); // cron jobs
  private activeJobs: Map<string, LifecycleJob> = new Map();
  private jobHistory: LifecycleJob[] = [];
  private isInitialized = false;

  async initialize(config: DataLifecycleConfig): Promise<void> {
    this.config = config;
    
    try {
      // Validate configuration
      await this.validateConfiguration(config);
      
      // Initialize archival destination
      if (config.archival.enabled) {
        await fs.mkdir(config.archival.destination, { recursive: true });
      }
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize lifecycle manager: ${error.message}`);
    }
  }

  async executeRetentionPolicies(): Promise<RetentionResult> {
    this.ensureInitialized();
    
    const jobId = this.generateJobId('retention');
    const job: LifecycleJob = {
      id: jobId,
      type: 'retention',
      status: 'running',
      startTime: new Date()
    };
    
    this.activeJobs.set(jobId, job);
    
    try {
      let totalProcessed = 0;
      let totalDeleted = 0;
      let totalArchived = 0;
      const errors: string[] = [];
      const startTime = Date.now();

      for (const policy of this.config!.retention) {
        try {
          const result = await this.executeRetentionPolicy(policy);
          totalProcessed += result.recordsProcessed;
          totalDeleted += result.recordsDeleted;
          totalArchived += result.recordsArchived;
          errors.push(...result.errors);
        } catch (error) {
          errors.push(`Retention policy for ${policy.table} failed: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      job.status = errors.length === 0 ? 'completed' : 'failed';
      job.endTime = new Date();
      job.error = errors.length > 0 ? errors.join('; ') : undefined;

      return {
        success: errors.length === 0,
        recordsProcessed: totalProcessed,
        recordsDeleted: totalDeleted,
        recordsArchived: totalArchived,
        duration,
        errors
      };
    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.error = error.message;
      
      return {
        success: false,
        recordsProcessed: 0,
        recordsDeleted: 0,
        recordsArchived: 0,
        duration: Date.now() - job.startTime!.getTime(),
        errors: [error.message]
      };
    } finally {
      this.activeJobs.delete(jobId);
      this.jobHistory.push(job);
      this.trimJobHistory();
    }
  }

  async executeArchivalPolicies(): Promise<ArchivalResult> {
    this.ensureInitialized();
    
    if (!this.config!.archival.enabled) {
      return {
        success: true,
        recordsArchived: 0,
        archivedSize: 0,
        duration: 0,
        location: '',
        errors: []
      };
    }

    const jobId = this.generateJobId('archival');
    const job: LifecycleJob = {
      id: jobId,
      type: 'archival',
      status: 'running',
      startTime: new Date()
    };
    
    this.activeJobs.set(jobId, job);
    
    try {
      let totalArchived = 0;
      let totalSize = 0;
      const errors: string[] = [];
      const startTime = Date.now();
      const archivalLocation = this.config!.archival.destination;

      for (const rule of this.config!.archival.rules) {
        try {
          const result = await this.executeArchivalRule(rule);
          totalArchived += result.recordsArchived;
          totalSize += result.archivedSize;
          errors.push(...result.errors);
        } catch (error) {
          errors.push(`Archival rule for ${rule.table} failed: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      job.status = errors.length === 0 ? 'completed' : 'failed';
      job.endTime = new Date();
      job.error = errors.length > 0 ? errors.join('; ') : undefined;

      return {
        success: errors.length === 0,
        recordsArchived: totalArchived,
        archivedSize: totalSize,
        duration,
        location: archivalLocation,
        errors
      };
    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.error = error.message;
      
      return {
        success: false,
        recordsArchived: 0,
        archivedSize: 0,
        duration: Date.now() - job.startTime!.getTime(),
        location: '',
        errors: [error.message]
      };
    } finally {
      this.activeJobs.delete(jobId);
      this.jobHistory.push(job);
      this.trimJobHistory();
    }
  }

  async executeCleanupPolicies(): Promise<CleanupResult> {
    this.ensureInitialized();
    
    const jobId = this.generateJobId('cleanup');
    const job: LifecycleJob = {
      id: jobId,
      type: 'cleanup',
      status: 'running',
      startTime: new Date()
    };
    
    this.activeJobs.set(jobId, job);
    
    try {
      const policy = this.config!.cleanup;
      
      if (!policy.enabled) {
        return {
          success: true,
          recordsDeleted: 0,
          spaceReclaimed: 0,
          duration: 0,
          errors: []
        };
      }

      const startTime = Date.now();
      const maxExecutionTime = policy.maxExecutionTime * 60 * 1000; // Convert to milliseconds
      
      let totalDeleted = 0;
      let totalSpaceReclaimed = 0;
      const errors: string[] = [];

      // Execute cleanup in batches
      let batchCount = 0;
      while (Date.now() - startTime < maxExecutionTime) {
        try {
          const batchResult = await this.executeCleanupBatch(policy);
          
          if (batchResult.recordsDeleted === 0) {
            break; // No more records to clean up
          }
          
          totalDeleted += batchResult.recordsDeleted;
          totalSpaceReclaimed += batchResult.spaceReclaimed;
          batchCount++;
          
          // Small delay between batches to avoid overwhelming the system
          await this.sleep(100);
        } catch (error) {
          errors.push(`Cleanup batch ${batchCount + 1} failed: ${error.message}`);
          break;
        }
      }

      const duration = Date.now() - startTime;
      job.status = errors.length === 0 ? 'completed' : 'failed';
      job.endTime = new Date();
      job.error = errors.length > 0 ? errors.join('; ') : undefined;

      return {
        success: errors.length === 0,
        recordsDeleted: totalDeleted,
        spaceReclaimed: totalSpaceReclaimed,
        duration,
        errors
      };
    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.error = error.message;
      
      return {
        success: false,
        recordsDeleted: 0,
        spaceReclaimed: 0,
        duration: Date.now() - job.startTime!.getTime(),
        errors: [error.message]
      };
    } finally {
      this.activeJobs.delete(jobId);
      this.jobHistory.push(job);
      this.trimJobHistory();
    }
  }

  async scheduleLifecycleTasks(): Promise<void> {
    this.ensureInitialized();
    
    // Clear existing scheduled jobs
    for (const [jobId, cronJob] of this.scheduledJobs) {
      cronJob.stop();
    }
    this.scheduledJobs.clear();

    // Schedule retention policy execution
    if (this.config!.retention.length > 0) {
      const retentionJob = cron.schedule('0 2 * * *', async () => { // Daily at 2 AM
        try {
          await this.executeRetentionPolicies();
        } catch (error) {
          console.error('Scheduled retention execution failed:', error);
        }
      }, { scheduled: false });
      
      this.scheduledJobs.set('retention', retentionJob);
      retentionJob.start();
    }

    // Schedule archival policy execution
    if (this.config!.archival.enabled) {
      const archivalJob = cron.schedule('0 3 * * 0', async () => { // Weekly on Sunday at 3 AM
        try {
          await this.executeArchivalPolicies();
        } catch (error) {
          console.error('Scheduled archival execution failed:', error);
        }
      }, { scheduled: false });
      
      this.scheduledJobs.set('archival', archivalJob);
      archivalJob.start();
    }

    // Schedule cleanup policy execution
    if (this.config!.cleanup.enabled) {
      const cleanupJob = cron.schedule(this.config!.cleanup.schedule, async () => {
        try {
          await this.executeCleanupPolicies();
        } catch (error) {
          console.error('Scheduled cleanup execution failed:', error);
        }
      }, { scheduled: false });
      
      this.scheduledJobs.set('cleanup', cleanupJob);
      cleanupJob.start();
    }
  }

  async getLifecycleStatus(): Promise<LifecycleStatus> {
    this.ensureInitialized();
    
    const retentionJobs = this.jobHistory.filter(j => j.type === 'retention' && j.status === 'completed');
    const archivalJobs = this.jobHistory.filter(j => j.type === 'archival' && j.status === 'completed');
    const cleanupJobs = this.jobHistory.filter(j => j.type === 'cleanup' && j.status === 'completed');
    
    const lastRetentionRun = retentionJobs.length > 0 
      ? retentionJobs[retentionJobs.length - 1].endTime! 
      : new Date(0);
    
    const lastArchivalRun = archivalJobs.length > 0 
      ? archivalJobs[archivalJobs.length - 1].endTime! 
      : new Date(0);
    
    const lastCleanupRun = cleanupJobs.length > 0 
      ? cleanupJobs[cleanupJobs.length - 1].endTime! 
      : new Date(0);

    // Calculate next scheduled run (simplified)
    const nextScheduledRun = new Date();
    nextScheduledRun.setHours(2, 0, 0, 0); // Next 2 AM
    if (nextScheduledRun <= new Date()) {
      nextScheduledRun.setDate(nextScheduledRun.getDate() + 1);
    }

    const activeJobIds = Array.from(this.activeJobs.keys());
    const recentErrors = this.jobHistory
      .filter(j => j.status === 'failed' && j.error)
      .slice(-5)
      .map(j => j.error!);

    return {
      lastRetentionRun,
      lastArchivalRun,
      lastCleanupRun,
      nextScheduledRun,
      activeJobs: activeJobIds,
      errors: recentErrors
    };
  }

  private async executeRetentionPolicy(policy: RetentionPolicy): Promise<RetentionResult> {
    // This would implement the actual retention logic
    // For demonstration, we'll simulate the process
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
    
    // Mock implementation
    const recordsProcessed = Math.floor(Math.random() * 1000) + 100;
    let recordsDeleted = 0;
    let recordsArchived = 0;
    
    if (policy.action === 'delete') {
      recordsDeleted = Math.floor(recordsProcessed * 0.1);
    } else if (policy.action === 'archive') {
      recordsArchived = Math.floor(recordsProcessed * 0.1);
    }
    
    console.log(`Executed retention policy for ${policy.table}: processed ${recordsProcessed}, deleted ${recordsDeleted}, archived ${recordsArchived}`);
    
    return {
      success: true,
      recordsProcessed,
      recordsDeleted,
      recordsArchived,
      duration: Math.floor(Math.random() * 5000) + 1000,
      errors: []
    };
  }

  private async executeArchivalRule(rule: ArchivalRule): Promise<ArchivalResult> {
    // This would implement the actual archival logic
    // For demonstration, we'll simulate the process
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - rule.ageThreshold);
    
    // Mock implementation
    const recordsArchived = Math.floor(Math.random() * 500) + 50;
    const archivedSize = recordsArchived * 1024; // Assume 1KB per record
    
    // Create archival file
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const archiveFilename = `${rule.table}_${timestamp}.archive`;
    const archivePath = path.join(this.config!.archival.destination, archiveFilename);
    
    // Mock archival data
    const archiveData = {
      table: rule.table,
      timestamp: new Date().toISOString(),
      recordCount: recordsArchived,
      condition: rule.condition,
      ageThreshold: rule.ageThreshold
    };
    
    await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2));
    
    console.log(`Executed archival rule for ${rule.table}: archived ${recordsArchived} records (${archivedSize} bytes)`);
    
    return {
      success: true,
      recordsArchived,
      archivedSize,
      duration: Math.floor(Math.random() * 10000) + 2000,
      location: archivePath,
      errors: []
    };
  }

  private async executeCleanupBatch(policy: CleanupPolicy): Promise<CleanupResult> {
    // This would implement the actual cleanup logic
    // For demonstration, we'll simulate the process
    
    // Mock implementation
    const recordsDeleted = Math.min(policy.batchSize, Math.floor(Math.random() * policy.batchSize));
    const spaceReclaimed = recordsDeleted * 512; // Assume 512 bytes per record
    
    console.log(`Executed cleanup batch: deleted ${recordsDeleted} records, reclaimed ${spaceReclaimed} bytes`);
    
    return {
      success: true,
      recordsDeleted,
      spaceReclaimed,
      duration: Math.floor(Math.random() * 1000) + 500,
      errors: []
    };
  }

  private async validateConfiguration(config: DataLifecycleConfig): Promise<void> {
    // Validate retention policies
    for (const policy of config.retention) {
      if (!policy.table || policy.retentionDays <= 0) {
        throw new Error(`Invalid retention policy for table ${policy.table}`);
      }
    }

    // Validate archival policies
    if (config.archival.enabled) {
      if (!config.archival.destination) {
        throw new Error('Archival destination is required when archival is enabled');
      }
      
      for (const rule of config.archival.rules) {
        if (!rule.table || rule.ageThreshold <= 0) {
          throw new Error(`Invalid archival rule for table ${rule.table}`);
        }
      }
    }

    // Validate cleanup policy
    if (config.cleanup.enabled) {
      if (!config.cleanup.schedule || config.cleanup.batchSize <= 0) {
        throw new Error('Invalid cleanup policy configuration');
      }
    }
  }

  private generateJobId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${type}_${timestamp}_${random}`;
  }

  private trimJobHistory(): void {
    // Keep only the last 100 jobs
    if (this.jobHistory.length > 100) {
      this.jobHistory = this.jobHistory.slice(-100);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error('Lifecycle manager is not initialized');
    }
  }
}