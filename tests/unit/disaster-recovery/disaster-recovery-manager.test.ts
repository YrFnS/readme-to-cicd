/**
 * Disaster Recovery Manager Tests
 * 
 * Tests for the main disaster recovery orchestrator.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DisasterRecoveryManager } from '../../../src/disaster-recovery/disaster-recovery-manager.js';
import type { DisasterRecoveryConfig } from '../../../src/disaster-recovery/types.js';

describe('DisasterRecoveryManager', () => {
  let manager: DisasterRecoveryManager;
  let config: DisasterRecoveryConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      backupStrategy: {
        type: 'incremental',
        frequency: {
          full: '0 2 * * 0',
          incremental: '0 */6 * * *'
        },
        retention: {
          daily: 7,
          weekly: 4,
          monthly: 12,
          yearly: 3
        },
        encryption: {
          enabled: true,
          algorithm: 'AES-256',
          keyRotation: true,
          keyRotationInterval: 90
        },
        compression: true,
        verification: true
      },
      replicationStrategy: {
        type: 'asynchronous',
        targets: [
          {
            id: 'secondary-1',
            region: 'us-west-2',
            endpoint: 'https://secondary-1.example.com',
            priority: 2,
            lag: 60
          }
        ],
        consistency: 'eventual',
        conflictResolution: 'last-write-wins'
      },
      failoverStrategy: {
        type: 'automatic',
        triggers: [
          {
            type: 'health-check',
            threshold: 50,
            duration: 300,
            cooldown: 600
          }
        ],
        healthChecks: [
          {
            name: 'api-health',
            endpoint: 'http://localhost:3000/health',
            interval: 30,
            timeout: 5,
            retries: 3,
            expectedStatus: [200]
          }
        ],
        rollbackPolicy: {
          automatic: true,
          conditions: [
            {
              type: 'health-check-failure',
              threshold: 3,
              duration: 180
            }
          ],
          timeout: 300
        }
      },
      recoveryObjectives: {
        rto: 300, // 5 minutes
        rpo: 60,  // 1 minute
        mtd: 3600 // 1 hour
      },
      businessContinuity: {
        degradationLevels: [
          {
            level: 1,
            name: 'Minor Degradation',
            description: 'Non-critical features disabled',
            triggers: [
              {
                type: 'response-time',
                metric: 'api.response_time',
                threshold: 1000,
                duration: 300
              }
            ],
            actions: [
              {
                type: 'disable-feature',
                target: 'analytics',
                parameters: { graceful: true }
              }
            ]
          }
        ],
        essentialServices: ['api', 'database'],
        communicationPlan: {
          channels: [
            {
              id: 'email-ops',
              type: 'email',
              config: { recipients: ['ops@example.com'] },
              priority: 1
            }
          ],
          templates: [
            {
              id: 'incident-template',
              type: 'incident',
              subject: 'System Incident: {{type}}',
              body: 'An incident has occurred: {{description}}',
              channels: ['email-ops']
            }
          ],
          escalationRules: [
            {
              level: 1,
              duration: 300,
              recipients: ['ops-team'],
              channels: ['email-ops']
            }
          ]
        },
        escalationMatrix: {
          levels: [
            {
              level: 1,
              name: 'Level 1 Support',
              contacts: [
                {
                  id: 'ops-1',
                  name: 'Operations Team',
                  role: 'Operations',
                  email: 'ops@example.com',
                  availability: [
                    {
                      dayOfWeek: 1,
                      startTime: '09:00',
                      endTime: '17:00',
                      timezone: 'UTC'
                    }
                  ]
                }
              ],
              timeout: 300
            }
          ],
          autoEscalation: true,
          maxLevel: 3
        }
      }
    };

    manager = new DisasterRecoveryManager(config);
  });

  afterEach(async () => {
    if (manager) {
      await manager.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should not initialize when disabled', async () => {
      const disabledConfig = { ...config, enabled: false };
      const disabledManager = new DisasterRecoveryManager(disabledConfig);
      
      await disabledManager.initialize();
      // Should not throw but should not be fully initialized
      expect(() => disabledManager.getStatus()).rejects.toThrow();
    });

    it('should emit initialization events', async () => {
      const initStartedSpy = vi.fn();
      const initializedSpy = vi.fn();
      
      manager.on('initialization-started', initStartedSpy);
      manager.on('initialized', initializedSpy);
      
      await manager.initialize();
      
      expect(initStartedSpy).toHaveBeenCalled();
      expect(initializedSpy).toHaveBeenCalled();
    });
  });

  describe('backup operations', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform backup successfully', async () => {
      const result = await manager.performBackup('incremental');
      
      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should restore from backup successfully', async () => {
      // First create a backup
      const backupResult = await manager.performBackup('full');
      expect(backupResult.success).toBe(true);
      
      // Then restore from it
      const restoreResult = await manager.restoreFromBackup(backupResult.backupId);
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoreId).toBeDefined();
      expect(restoreResult.dataIntegrity).toBe(true);
    });

    it('should emit backup events', async () => {
      const backupRequestedSpy = vi.fn();
      const backupResultSpy = vi.fn();
      
      manager.on('backup-requested', backupRequestedSpy);
      manager.on('backup-result', backupResultSpy);
      
      await manager.performBackup('incremental');
      
      expect(backupRequestedSpy).toHaveBeenCalledWith({ type: 'incremental' });
      expect(backupResultSpy).toHaveBeenCalled();
    });
  });

  describe('failover operations', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform failover successfully', async () => {
      const result = await manager.performFailover('us-west-2');
      
      expect(result.success).toBe(true);
      expect(result.failoverId).toBeDefined();
      expect(result.newPrimary).toBe('us-west-2');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should emit failover events', async () => {
      const failoverRequestedSpy = vi.fn();
      const failoverResultSpy = vi.fn();
      
      manager.on('failover-requested', failoverRequestedSpy);
      manager.on('failover-result', failoverResultSpy);
      
      await manager.performFailover();
      
      expect(failoverRequestedSpy).toHaveBeenCalled();
      expect(failoverResultSpy).toHaveBeenCalled();
    });
  });

  describe('recovery testing', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should run recovery test successfully', async () => {
      const result = await manager.runRecoveryTest('backup-restore-test');
      
      expect(result.testId).toBe('backup-restore-test');
      expect(result.results).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should emit recovery test events', async () => {
      const testRequestedSpy = vi.fn();
      const testResultSpy = vi.fn();
      
      manager.on('recovery-test-requested', testRequestedSpy);
      manager.on('recovery-test-result', testResultSpy);
      
      await manager.runRecoveryTest('failover-test');
      
      expect(testRequestedSpy).toHaveBeenCalledWith({ testId: 'failover-test' });
      expect(testResultSpy).toHaveBeenCalled();
    });
  });

  describe('degradation handling', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should handle degradation successfully', async () => {
      await expect(manager.handleDegradation(1, 'High CPU usage')).resolves.not.toThrow();
    });

    it('should emit degradation events', async () => {
      const degradationDetectedSpy = vi.fn();
      const degradationHandledSpy = vi.fn();
      
      manager.on('degradation-detected', degradationDetectedSpy);
      manager.on('degradation-handled', degradationHandledSpy);
      
      await manager.handleDegradation(2, 'Memory pressure');
      
      expect(degradationDetectedSpy).toHaveBeenCalledWith({ level: 2, reason: 'Memory pressure' });
      expect(degradationHandledSpy).toHaveBeenCalledWith({ level: 2, reason: 'Memory pressure' });
    });
  });

  describe('status and metrics', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should get comprehensive status', async () => {
      const status = await manager.getStatus();
      
      expect(status.overall).toBeDefined();
      expect(status.components).toBeDefined();
      expect(status.lastBackup).toBeDefined();
      expect(status.replication).toBeDefined();
    });

    it('should get comprehensive metrics', async () => {
      const metrics = await manager.getMetrics();
      
      expect(metrics.backup).toBeDefined();
      expect(metrics.replication).toBeDefined();
      expect(metrics.failover).toBeDefined();
      expect(metrics.testing).toBeDefined();
      expect(metrics.health).toBeDefined();
      expect(metrics.businessContinuity).toBeDefined();
    });
  });

  describe('configuration management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should update configuration successfully', async () => {
      const newConfig = {
        ...config,
        recoveryObjectives: {
          rto: 600, // 10 minutes
          rpo: 120, // 2 minutes
          mtd: 7200 // 2 hours
        }
      };
      
      await expect(manager.updateConfig(newConfig)).resolves.not.toThrow();
    });

    it('should emit config update events', async () => {
      const configUpdatedSpy = vi.fn();
      manager.on('config-updated', configUpdatedSpy);
      
      const newConfig = { ...config };
      await manager.updateConfig(newConfig);
      
      expect(configUpdatedSpy).toHaveBeenCalledWith(newConfig);
    });
  });

  describe('comprehensive testing', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should test all procedures successfully', async () => {
      const results = await manager.testAllProcedures();
      
      expect(results.backup).toBeDefined();
      expect(results.replication).toBeDefined();
      expect(results.failover).toBeDefined();
      expect(results.recovery).toBeDefined();
    });

    it('should emit comprehensive test events', async () => {
      const testStartedSpy = vi.fn();
      const testCompletedSpy = vi.fn();
      
      manager.on('comprehensive-test-started', testStartedSpy);
      manager.on('comprehensive-test-completed', testCompletedSpy);
      
      await manager.testAllProcedures();
      
      expect(testStartedSpy).toHaveBeenCalled();
      expect(testCompletedSpy).toHaveBeenCalled();
    });
  });

  describe('synchronization', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should force synchronization successfully', async () => {
      await expect(manager.forceSynchronization()).resolves.not.toThrow();
    });

    it('should emit synchronization events', async () => {
      const syncRequestedSpy = vi.fn();
      const syncCompletedSpy = vi.fn();
      
      manager.on('sync-requested', syncRequestedSpy);
      manager.on('sync-completed', syncCompletedSpy);
      
      await manager.forceSynchronization();
      
      expect(syncRequestedSpy).toHaveBeenCalled();
      expect(syncCompletedSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error when not initialized', async () => {
      await expect(manager.getStatus()).rejects.toThrow('DisasterRecoveryManager not initialized');
    });

    it('should handle component errors gracefully', async () => {
      await manager.initialize();
      
      // Mock a component error
      const errorSpy = vi.fn();
      manager.on('error', errorSpy);
      
      // This should not crash the manager
      manager.emit('error', new Error('Test error'));
      
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await manager.initialize();
      await expect(manager.shutdown()).resolves.not.toThrow();
    });

    it('should emit shutdown events', async () => {
      await manager.initialize();
      
      const shutdownStartedSpy = vi.fn();
      const shutdownCompletedSpy = vi.fn();
      
      manager.on('shutdown-started', shutdownStartedSpy);
      manager.on('shutdown-completed', shutdownCompletedSpy);
      
      await manager.shutdown();
      
      expect(shutdownStartedSpy).toHaveBeenCalled();
      expect(shutdownCompletedSpy).toHaveBeenCalled();
    });
  });
});