/**
 * Disaster Recovery Manager
 * 
 * Main orchestrator for disaster recovery operations, coordinating backup,
 * replication, failover, recovery testing, and business continuity.
 */

import { EventEmitter } from 'events';
import { BackupManager } from './backup-manager.js';
import { ReplicationManager } from './replication-manager.js';
import { FailoverManager } from './failover-manager.js';
import { RecoveryTester } from './recovery-tester.js';
import { BusinessContinuityManager } from './business-continuity-manager.js';
import { HealthMonitor } from './health-monitor.js';
import {
  DisasterRecoveryConfig,
  DisasterRecoveryStatus,
  BackupResult,
  RestoreResult,
  FailoverResult,
  RecoveryTestResult,
  HealthStatus
} from './types.js';

export class DisasterRecoveryManager extends EventEmitter {
  private config: DisasterRecoveryConfig;
  private isInitialized = false;
  
  private backupManager: BackupManager;
  private replicationManager: ReplicationManager;
  private failoverManager: FailoverManager;
  private recoveryTester: RecoveryTester;
  private businessContinuityManager: BusinessContinuityManager;
  private healthMonitor: HealthMonitor;

  constructor(config: DisasterRecoveryConfig) {
    super();
    this.config = config;
    
    // Initialize component managers
    this.backupManager = new BackupManager(config.backupStrategy);
    this.replicationManager = new ReplicationManager(config.replicationStrategy);
    this.failoverManager = new FailoverManager(config.failoverStrategy);
    this.recoveryTester = new RecoveryTester();
    this.businessContinuityManager = new BusinessContinuityManager(config.businessContinuity);
    this.healthMonitor = new HealthMonitor();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the disaster recovery manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.config.enabled) {
      console.log('Disaster recovery is disabled');
      return;
    }

    try {
      this.emit('initialization-started');

      // Initialize all components in order
      await this.healthMonitor.initialize();
      await this.backupManager.initialize();
      await this.replicationManager.initialize();
      await this.failoverManager.initialize();
      await this.recoveryTester.initialize();
      await this.businessContinuityManager.initialize();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the disaster recovery manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.emit('shutdown-started');

      // Shutdown all components in reverse order
      await this.businessContinuityManager.shutdown();
      await this.recoveryTester.shutdown();
      await this.failoverManager.shutdown();
      await this.replicationManager.shutdown();
      await this.backupManager.shutdown();
      await this.healthMonitor.shutdown();

      this.isInitialized = false;
      this.emit('shutdown-completed');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Perform backup operation
   */
  async performBackup(type: 'full' | 'incremental' | 'differential' = 'incremental'): Promise<BackupResult> {
    this.ensureInitialized();
    
    try {
      this.emit('backup-requested', { type });
      const result = await this.backupManager.performBackup(type);
      this.emit('backup-result', result);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string, targetEnvironment?: string): Promise<RestoreResult> {
    this.ensureInitialized();
    
    try {
      this.emit('restore-requested', { backupId, targetEnvironment });
      const result = await this.backupManager.restoreFromBackup(backupId, targetEnvironment);
      this.emit('restore-result', result);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Perform failover
   */
  async performFailover(targetRegion?: string): Promise<FailoverResult> {
    this.ensureInitialized();
    
    try {
      this.emit('failover-requested', { targetRegion });
      
      // Check if failover is possible
      const canFailover = await this.failoverManager.canFailover();
      if (!canFailover) {
        throw new Error('Failover not possible at this time');
      }

      const result = await this.failoverManager.performFailover(targetRegion);
      
      // Handle business continuity aspects
      await this.businessContinuityManager.handleFailover(result);
      
      this.emit('failover-result', result);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Run recovery test
   */
  async runRecoveryTest(testId: string): Promise<RecoveryTestResult> {
    this.ensureInitialized();
    
    try {
      this.emit('recovery-test-requested', { testId });
      const result = await this.recoveryTester.runTest(testId);
      this.emit('recovery-test-result', result);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Handle system degradation
   */
  async handleDegradation(level: number, reason: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.emit('degradation-detected', { level, reason });
      await this.businessContinuityManager.handleDegradation(level, reason);
      this.emit('degradation-handled', { level, reason });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get comprehensive disaster recovery status
   */
  async getStatus(): Promise<DisasterRecoveryStatus> {
    this.ensureInitialized();
    
    try {
      return await this.healthMonitor.getDisasterRecoveryStatus();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get disaster recovery metrics
   */
  async getMetrics(): Promise<Record<string, any>> {
    this.ensureInitialized();
    
    try {
      const [
        backupMetrics,
        replicationMetrics,
        failoverMetrics,
        testMetrics,
        healthMetrics
      ] = await Promise.all([
        this.backupManager.getMetrics(),
        this.replicationManager.getMetrics(),
        this.failoverManager.getMetrics(),
        this.recoveryTester.getMetrics(),
        this.healthMonitor.getMetrics()
      ]);

      return {
        backup: backupMetrics,
        replication: replicationMetrics,
        failover: failoverMetrics,
        testing: testMetrics,
        health: healthMetrics,
        businessContinuity: this.businessContinuityManager.getCurrentStatus()
      };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: DisasterRecoveryConfig): Promise<void> {
    try {
      this.config = newConfig;
      
      // Update component configurations
      await this.backupManager.updateConfig(newConfig.backupStrategy);
      await this.replicationManager.updateConfig(newConfig.replicationStrategy);
      await this.failoverManager.updateConfig(newConfig.failoverStrategy);
      await this.businessContinuityManager.updateConfig(newConfig.businessContinuity);
      
      this.emit('config-updated', newConfig);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Force synchronization across all replication targets
   */
  async forceSynchronization(): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.emit('sync-requested');
      await this.replicationManager.forceSynchronization();
      this.emit('sync-completed');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Test all disaster recovery procedures
   */
  async testAllProcedures(): Promise<Record<string, any>> {
    this.ensureInitialized();
    
    try {
      this.emit('comprehensive-test-started');
      
      const results = {
        backup: await this.testBackupProcedure(),
        replication: await this.testReplicationProcedure(),
        failover: await this.testFailoverProcedure(),
        recovery: await this.testRecoveryProcedure()
      };
      
      this.emit('comprehensive-test-completed', results);
      return results;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Setup event handlers between components
   */
  private setupEventHandlers(): void {
    // Health monitor events
    this.healthMonitor.on('health-alert', async (alert) => {
      this.emit('health-alert', alert);
      
      // Check if automatic failover should be triggered
      if (this.config.failoverStrategy.type === 'automatic') {
        const shouldFailover = await this.failoverManager.shouldTriggerFailover(
          alert.component, 
          { status: alert.status, score: alert.score, lastCheck: new Date(), issues: alert.issues }
        );
        
        if (shouldFailover) {
          try {
            await this.performFailover();
          } catch (error) {
            this.emit('automatic-failover-failed', error);
          }
        }
      }
    });

    // Backup manager events
    this.backupManager.on('backup-failed', (result) => {
      this.emit('backup-failed', result);
    });

    // Replication manager events
    this.replicationManager.on('replication-lag', (lag) => {
      this.emit('replication-lag', lag);
    });

    // Failover manager events
    this.failoverManager.on('failover-completed', (result) => {
      this.emit('failover-completed', result);
    });

    // Recovery tester events
    this.recoveryTester.on('test-failed', (result) => {
      this.emit('recovery-test-failed', result);
    });

    // Business continuity events
    this.businessContinuityManager.on('degradation-handled', (event) => {
      this.emit('business-continuity-action', event);
    });
  }

  /**
   * Test backup procedure
   */
  private async testBackupProcedure(): Promise<any> {
    try {
      const backupResult = await this.performBackup('incremental');
      return {
        success: backupResult.success,
        duration: backupResult.duration,
        size: backupResult.size
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test replication procedure
   */
  private async testReplicationProcedure(): Promise<any> {
    try {
      const status = await this.replicationManager.getStatus();
      return {
        success: status.targets.every(t => t.status === 'active'),
        lag: status.lag,
        targetCount: status.targets.length
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test failover procedure
   */
  private async testFailoverProcedure(): Promise<any> {
    try {
      const canFailover = await this.failoverManager.canFailover();
      return {
        success: canFailover,
        ready: canFailover
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test recovery procedure
   */
  private async testRecoveryProcedure(): Promise<any> {
    try {
      const testStatuses = await this.recoveryTester.getTestStatuses();
      const activeTests = testStatuses.filter(t => t.status === 'running').length;
      const scheduledTests = testStatuses.filter(t => t.status === 'scheduled').length;
      
      return {
        success: true,
        activeTests,
        scheduledTests,
        totalTests: testStatuses.length
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('DisasterRecoveryManager not initialized');
    }
  }
}