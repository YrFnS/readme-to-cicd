/**
 * Health Monitor Tests
 * 
 * Tests for system health monitoring and alerting.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HealthMonitor } from '../../../src/disaster-recovery/health-monitor.js';
import type { HealthCheckConfig } from '../../../src/disaster-recovery/types.js';

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    healthMonitor = new HealthMonitor();
  });

  afterEach(async () => {
    if (healthMonitor) {
      await healthMonitor.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(healthMonitor.initialize()).resolves.not.toThrow();
    });

    it('should emit initialization events', async () => {
      const initializedSpy = vi.fn();
      healthMonitor.on('initialized', initializedSpy);
      
      await healthMonitor.initialize();
      
      expect(initializedSpy).toHaveBeenCalled();
    });
  });

  describe('health check management', () => {
    beforeEach(async () => {
      await healthMonitor.initialize();
    });

    it('should add health check successfully', async () => {
      const config: HealthCheckConfig = {
        name: 'test-service',
        endpoint: 'http://localhost:8080/health',
        interval: 30,
        timeout: 5,
        retries: 3,
        expectedStatus: [200]
      };
      
      await expect(healthMonitor.addHealthCheck(config)).resolves.not.toThrow();
    });

    it('should remove health check successfully', async () => {
      const config: HealthCheckConfig = {
        name: 'test-service',
        endpoint: 'http://localhost:8080/health',
        interval: 30,
        timeout: 5,
        retries: 3,
        expectedStatus: [200]
      };
      
      await healthMonitor.addHealthCheck(config);
      await expect(healthMonitor.removeHealthCheck('test-service')).resolves.not.toThrow();
    });

    it('should emit health check events', async () => {
      const addedSpy = vi.fn();
      const removedSpy = vi.fn();
      
      healthMonitor.on('health-check-added', addedSpy);
      healthMonitor.on('health-check-removed', removedSpy);
      
      const config: HealthCheckConfig = {
        name: 'test-service',
        endpoint: 'http://localhost:8080/health',
        interval: 30,
        timeout: 5,
        retries: 3,
        expectedStatus: [200]
      };
      
      await healthMonitor.addHealthCheck(config);
      await healthMonitor.removeHealthCheck('test-service');
      
      expect(addedSpy).toHaveBeenCalledWith(config);
      expect(removedSpy).toHaveBeenCalledWith({ name: 'test-service' });
    });
  });

  describe('disaster recovery status', () => {
    beforeEach(async () => {
      await healthMonitor.initialize();
    });

    it('should get disaster recovery status', async () => {
      const status = await healthMonitor.getDisasterRecoveryStatus();
      
      expect(status).toBeDefined();
      expect(status.overall).toBeDefined();
      expect(status.components).toBeDefined();
      expect(status.lastBackup).toBeDefined();
      expect(status.replication).toBeDefined();
      expect(status.tests).toBeDefined();
      expect(status.incidents).toBeDefined();
    });

    it('should calculate overall health correctly', async () => {
      const status = await healthMonitor.getDisasterRecoveryStatus();
      
      expect(status.overall.status).toMatch(/healthy|degraded|critical|unknown/);
      expect(status.overall.score).toBeGreaterThanOrEqual(0);
      expect(status.overall.score).toBeLessThanOrEqual(100);
      expect(status.overall.lastCheck).toBeInstanceOf(Date);
      expect(Array.isArray(status.overall.issues)).toBe(true);
    });
  });

  describe('metrics', () => {
    beforeEach(async () => {
      await healthMonitor.initialize();
    });

    it('should get health metrics', async () => {
      const metrics = await healthMonitor.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalComponents).toBeDefined();
      expect(metrics.healthyComponents).toBeDefined();
      expect(metrics.degradedComponents).toBeDefined();
      expect(metrics.criticalComponents).toBeDefined();
      expect(metrics.averageHealthScore).toBeDefined();
      expect(metrics.healthCheckCount).toBeDefined();
      expect(metrics.isMonitoring).toBeDefined();
    });

    it('should track component counts correctly', async () => {
      const metrics = await healthMonitor.getMetrics();
      
      const totalComponents = metrics.healthyComponents + 
                            metrics.degradedComponents + 
                            metrics.criticalComponents;
      
      expect(totalComponents).toBeLessThanOrEqual(metrics.totalComponents);
    });
  });

  describe('health monitoring', () => {
    beforeEach(async () => {
      await healthMonitor.initialize();
    });

    it('should emit component status updates', async () => {
      const statusUpdatedSpy = vi.fn();
      healthMonitor.on('component-status-updated', statusUpdatedSpy);
      
      // Add a health check to trigger monitoring
      const config: HealthCheckConfig = {
        name: 'monitor-test',
        endpoint: 'http://localhost:9000/health',
        interval: 1, // Very short interval for testing
        timeout: 1,
        retries: 1,
        expectedStatus: [200]
      };
      
      await healthMonitor.addHealthCheck(config);
      
      // Wait a bit for monitoring to kick in
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should have received status updates
      expect(statusUpdatedSpy).toHaveBeenCalled();
    });

    it('should emit health alerts for critical components', async () => {
      const healthAlertSpy = vi.fn();
      healthMonitor.on('health-alert', healthAlertSpy);
      
      // Add a health check that will likely fail
      const config: HealthCheckConfig = {
        name: 'failing-service',
        endpoint: 'http://localhost:99999/health', // Invalid port
        interval: 1,
        timeout: 1,
        retries: 1,
        expectedStatus: [200]
      };
      
      await healthMonitor.addHealthCheck(config);
      
      // Wait for monitoring to detect the failure
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Should have received health alerts
      expect(healthAlertSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await healthMonitor.initialize();
    });

    it('should handle health check failures gracefully', async () => {
      const errorSpy = vi.fn();
      const healthCheckFailedSpy = vi.fn();
      
      healthMonitor.on('error', errorSpy);
      healthMonitor.on('health-check-failed', healthCheckFailedSpy);
      
      // Add a health check that will fail
      const config: HealthCheckConfig = {
        name: 'error-test',
        endpoint: 'http://invalid-host:8080/health',
        interval: 1,
        timeout: 1,
        retries: 1,
        expectedStatus: [200]
      };
      
      await healthMonitor.addHealthCheck(config);
      
      // Wait for the failure to be detected
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should handle the failure gracefully
      expect(healthCheckFailedSpy).toHaveBeenCalled();
    });

    it('should emit error events', async () => {
      const errorSpy = vi.fn();
      healthMonitor.on('error', errorSpy);
      
      // Trigger an error condition
      healthMonitor.emit('error', new Error('Test error'));
      
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await healthMonitor.initialize();
      await expect(healthMonitor.shutdown()).resolves.not.toThrow();
    });

    it('should emit shutdown events', async () => {
      await healthMonitor.initialize();
      
      const shutdownSpy = vi.fn();
      healthMonitor.on('shutdown', shutdownSpy);
      
      await healthMonitor.shutdown();
      
      expect(shutdownSpy).toHaveBeenCalled();
    });

    it('should stop monitoring after shutdown', async () => {
      await healthMonitor.initialize();
      
      // Verify monitoring is active
      let metrics = await healthMonitor.getMetrics();
      expect(metrics.isMonitoring).toBe(true);
      
      await healthMonitor.shutdown();
      
      // Verify monitoring is stopped
      metrics = await healthMonitor.getMetrics();
      expect(metrics.isMonitoring).toBe(false);
    });
  });
});