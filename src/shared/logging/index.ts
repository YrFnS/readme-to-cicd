/**
 * Central Logging Module
 * 
 * Provides Winston-based structured logging with correlation ID support
 * and graceful console fallback for the README-to-CICD system.
 */

export {
  ICentralLogger,
  LoggerConfig,
  CentralLogger,
  logger,
  createLogger,
  LoggerFactory
} from './central-logger';

// Re-export for convenience
export { logger as default } from './central-logger';