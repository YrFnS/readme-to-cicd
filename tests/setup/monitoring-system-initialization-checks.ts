/**
 * MonitoringSystem Initialization Checks
 * 
 * Centralized utilities for ensuring MonitoringSystem is properly initialized
 * before usage in test files. Provides consistent error handling and validation
 * across all test suites.
 */

import { Logger } from '../../src/cli/lib/logger.js';
import { MonitoringSystem } from '../../src/integration/monitoring/monitoring-system.js';
import { MonitoringSystem as AgentHooksMonitoringSystem } from '../../src/agent-hooks/monitoring/monitoring-system.js';

// Types for different MonitoringSystem implementations
export type AnyMonitoringSystem = MonitoringSystem | AgentHooksMonitoringSystem | any;

// Initialization check result
export interface InitializationCheckResult {
  isInitialized: boolean;
  error?: Error;
  systemType?: 'integration' | 'agent-hooks' | 'comprehensive' | 'unknown';
  retryCount?: number;
}

// Configuration for initialization checks
export interface InitializationCheckConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  strictMode: boolean;
  allowPartialInitialization: boolean;
}

// Default configuration
const DEFAULT_CHECK_CONFIG: InitializationCheckConfig = {
  maxRetries: 3,
  retryDelay: 100,
  timeoutMs: 5000,
  strictMode: true,
  allowPartialInitialization: false
};

// Global state tracking
let initializationCheckConfig = { ...DEFAULT_CHECK_CONFIG };
let lastCheckResults = new Map<string, InitializationCheckResult>();

/**
 * Configure initialization check behavior
 */
export function configureInitializationChecks(config: Partial<InitializationCheckConfig>): void {
  initializationCheckConfig = { ...initializationCheckConfig, ...config };
}

/**
 * Get current initialization check configuration
 */
export function getInitializationCheckConfig(): InitializationCheckConfig {
  return { ...initializationCheckConfig };
}

/**
 * Check if a MonitoringSystem instance is properly initialized
 */
export async function checkMonitoringSystemInitialization(
  system: AnyMonitoringSystem,
  systemId: string = 'default',
  config: Partial<InitializationCheckConfig> = {}
): Promise<InitializationCheckResult> {
  const checkConfig = { ...initializationCheckConfig, ...config };
  const startTime = Date.now();
  
  let lastError: Error | undefined;
  let retryCount = 0;

  // Retry loop
  for (let attempt = 0; attempt <= checkConfig.maxRetries; attempt++) {
    try {
      retryCount = attempt;
      
      // Check timeout
      if (Date.now() - startTime > checkConfig.timeoutMs) {
        throw new Error(`Initialization check timeout after ${checkConfig.timeoutMs}ms`);
      }

      // Perform the actual initialization check
      const result = await performInitializationCheck(system, checkConfig);
      
      // Cache successful result
      lastCheckResults.set(systemId, result);
      
      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last attempt, don't retry
      if (attempt >= checkConfig.maxRetries) {
        break;
      }
      
      // Wait before retry
      if (checkConfig.retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, checkConfig.retryDelay));
      }
    }
  }

  // All retries failed
  const failureResult: InitializationCheckResult = {
    isInitialized: false,
    error: lastError || new Error('Unknown initialization check failure'),
    retryCount
  };
  
  lastCheckResults.set(systemId, failureResult);
  return failureResult;
}

/**
 * Perform the actual initialization check logic
 */
async function performInitializationCheck(
  system: AnyMonitoringSystem,
  config: InitializationCheckConfig
): Promise<InitializationCheckResult> {
  if (!system) {
    throw new Error('MonitoringSystem instance is null or undefined');
  }

  // Determine system type
  const systemType = determineSystemType(system);
  
  // Check if system has required methods
  validateSystemInterface(system, systemType, config);
  
  // Check initialization status with timeout
  const initializationStatus = await Promise.race([
    checkInitializationStatus(system, systemType, config),
    new Promise<{ isInitialized: boolean; error: Error }>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Initialization check timeout after ${config.timeoutMs}ms`));
      }, config.timeoutMs);
    })
  ]);
  
  return {
    isInitialized: initializationStatus.isInitialized,
    systemType,
    error: initializationStatus.error
  };
}

/**
 * Determine the type of MonitoringSystem
 */
function determineSystemType(system: AnyMonitoringSystem): 'integration' | 'agent-hooks' | 'comprehensive' | 'unknown' {
  if (!system) {
    return 'unknown';
  }

  // Check for integration MonitoringSystem methods
  if (typeof system.getStatus === 'function' && 
      typeof system.recordMetric === 'function' &&
      typeof system.getSystemHealth === 'function') {
    return 'integration';
  }

  // Check for agent-hooks MonitoringSystem methods
  if (typeof system.start === 'function' && 
      typeof system.stop === 'function' &&
      typeof system.recordMetric === 'function') {
    return 'agent-hooks';
  }

  // Check for comprehensive MonitoringSystem methods
  if (typeof system.initialize === 'function' && 
      typeof system.collectMetrics === 'function' &&
      typeof system.queryMetrics === 'function') {
    return 'comprehensive';
  }

  return 'unknown';
}

/**
 * Validate that the system has the required interface
 */
function validateSystemInterface(
  system: AnyMonitoringSystem,
  systemType: string,
  config: InitializationCheckConfig
): void {
  const requiredMethods = getRequiredMethodsForSystemType(systemType);
  const missingMethods: string[] = [];

  for (const method of requiredMethods) {
    if (typeof system[method] !== 'function') {
      missingMethods.push(method);
    }
  }

  if (missingMethods.length > 0) {
    if (config.strictMode && !config.allowPartialInitialization) {
      throw new Error(
        `MonitoringSystem (${systemType}) missing required methods: ${missingMethods.join(', ')}`
      );
    }
  }
}

/**
 * Get required methods for each system type
 */
function getRequiredMethodsForSystemType(systemType: string): string[] {
  switch (systemType) {
    case 'integration':
      return ['getStatus', 'recordMetric', 'getSystemHealth', 'initialize'];
    case 'agent-hooks':
      return ['start', 'stop', 'recordMetric', 'getSystemHealth'];
    case 'comprehensive':
      return ['initialize', 'collectMetrics', 'queryMetrics', 'getHealthStatus'];
    default:
      return ['recordMetric']; // Minimal requirement
  }
}

/**
 * Check the actual initialization status of the system
 */
async function checkInitializationStatus(
  system: AnyMonitoringSystem,
  systemType: string,
  config: InitializationCheckConfig
): Promise<{ isInitialized: boolean; error?: Error }> {
  try {
    switch (systemType) {
      case 'integration':
        return await checkIntegrationSystemStatus(system);
      case 'agent-hooks':
        return await checkAgentHooksSystemStatus(system);
      case 'comprehensive':
        return await checkComprehensiveSystemStatus(system);
      default:
        return await checkGenericSystemStatus(system);
    }
  } catch (error) {
    return {
      isInitialized: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Check integration MonitoringSystem status
 */
async function checkIntegrationSystemStatus(system: any): Promise<{ isInitialized: boolean; error?: Error }> {
  try {
    const status = await system.getStatus();
    
    if (!status || typeof status.initialized !== 'boolean') {
      throw new Error('Invalid status response from MonitoringSystem');
    }
    
    return { isInitialized: status.initialized };
  } catch (error) {
    return {
      isInitialized: false,
      error: error instanceof Error ? error : new Error('Failed to get system status')
    };
  }
}

/**
 * Check agent-hooks MonitoringSystem status
 */
async function checkAgentHooksSystemStatus(system: any): Promise<{ isInitialized: boolean; error?: Error }> {
  try {
    // For agent-hooks system, we check if it can perform basic operations
    const health = await system.getSystemHealth();
    
    if (!health) {
      throw new Error('System health check failed');
    }
    
    return { isInitialized: true };
  } catch (error) {
    return {
      isInitialized: false,
      error: error instanceof Error ? error : new Error('Agent-hooks system not initialized')
    };
  }
}

/**
 * Check comprehensive MonitoringSystem status
 */
async function checkComprehensiveSystemStatus(system: any): Promise<{ isInitialized: boolean; error?: Error }> {
  try {
    const health = await system.getHealthStatus();
    
    if (!health || !health.status) {
      throw new Error('Invalid health status response');
    }
    
    return { isInitialized: health.status !== 'unhealthy' };
  } catch (error) {
    return {
      isInitialized: false,
      error: error instanceof Error ? error : new Error('Comprehensive system not initialized')
    };
  }
}

/**
 * Check generic MonitoringSystem status
 */
async function checkGenericSystemStatus(system: any): Promise<{ isInitialized: boolean; error?: Error }> {
  try {
    // For unknown systems, try basic operations
    if (typeof system.recordMetric === 'function') {
      // Try to record a test metric - but don't fail if it throws
      try {
        await system.recordMetric('initialization_check', 1, { test: 'true' });
      } catch (metricError) {
        // If recordMetric fails, the system might not be initialized
        return {
          isInitialized: false,
          error: metricError instanceof Error ? metricError : new Error('Failed to record test metric')
        };
      }
      return { isInitialized: true };
    }
    
    throw new Error('Unable to verify system initialization');
  } catch (error) {
    return {
      isInitialized: false,
      error: error instanceof Error ? error : new Error('Generic system check failed')
    };
  }
}

/**
 * Ensure MonitoringSystem is initialized before proceeding
 * Throws an error if not initialized
 */
export async function ensureMonitoringSystemInitialized(
  system: AnyMonitoringSystem,
  systemId: string = 'default',
  config: Partial<InitializationCheckConfig> = {}
): Promise<void> {
  const result = await checkMonitoringSystemInitialization(system, systemId, config);
  
  if (!result.isInitialized) {
    const errorMessage = result.error 
      ? `MonitoringSystem (${systemId}) not initialized: ${result.error.message}`
      : `MonitoringSystem (${systemId}) not initialized`;
    
    throw new Error(errorMessage);
  }
}

/**
 * Get the last check result for a system
 */
export function getLastCheckResult(systemId: string): InitializationCheckResult | undefined {
  return lastCheckResults.get(systemId);
}

/**
 * Clear cached check results
 */
export function clearCheckResults(): void {
  lastCheckResults.clear();
}

/**
 * Validate MonitoringSystem before test execution
 * This is a convenience function for use in beforeEach hooks
 */
export async function validateMonitoringSystemForTest(
  system: AnyMonitoringSystem,
  testName: string,
  config: Partial<InitializationCheckConfig> = {}
): Promise<InitializationCheckResult> {
  const systemId = `test-${testName}`;
  
  try {
    const result = await checkMonitoringSystemInitialization(system, systemId, {
      ...config,
      strictMode: true, // Always use strict mode for tests
      allowPartialInitialization: false // Don't allow partial initialization in tests
    });
    
    if (!result.isInitialized) {
      throw new Error(
        `Test '${testName}' cannot proceed: MonitoringSystem not initialized. ` +
        `Error: ${result.error?.message || 'Unknown error'}`
      );
    }
    
    return result;
  } catch (error) {
    const failureResult: InitializationCheckResult = {
      isInitialized: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
    
    lastCheckResults.set(systemId, failureResult);
    throw error;
  }
}

/**
 * Create a MonitoringSystem initialization guard
 * Returns a function that checks initialization before each call
 */
export function createInitializationGuard<T extends AnyMonitoringSystem>(
  system: T,
  systemId: string = 'guarded',
  config: Partial<InitializationCheckConfig> = {}
): T {
  const guardedSystem = new Proxy(system, {
    get(target, prop, receiver) {
      const originalValue = Reflect.get(target, prop, receiver);
      
      // If it's a function, wrap it with initialization check
      if (typeof originalValue === 'function') {
        return async function(...args: any[]) {
          await ensureMonitoringSystemInitialized(system, systemId, config);
          return originalValue.apply(target, args);
        };
      }
      
      return originalValue;
    }
  });
  
  return guardedSystem;
}

/**
 * Utility to create a test-safe MonitoringSystem instance
 * Automatically handles initialization and provides clear error messages
 */
export async function createTestSafeMonitoringSystem<T extends AnyMonitoringSystem>(
  systemFactory: () => T | Promise<T>,
  systemId: string,
  config: Partial<InitializationCheckConfig> = {}
): Promise<T> {
  try {
    const system = await systemFactory();
    
    // Validate the created system
    await ensureMonitoringSystemInitialized(system, systemId, {
      ...config,
      strictMode: true
    });
    
    return createInitializationGuard(system, systemId, config);
  } catch (error) {
    throw new Error(
      `Failed to create test-safe MonitoringSystem '${systemId}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Export initialization check utilities for easy import
 */
export const MonitoringSystemInitializationChecks = {
  check: checkMonitoringSystemInitialization,
  ensure: ensureMonitoringSystemInitialized,
  validate: validateMonitoringSystemForTest,
  guard: createInitializationGuard,
  createTestSafe: createTestSafeMonitoringSystem,
  configure: configureInitializationChecks,
  getConfig: getInitializationCheckConfig,
  getLastResult: getLastCheckResult,
  clearResults: clearCheckResults
};