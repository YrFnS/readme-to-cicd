/**
 * Validation module exports
 * 
 * This module provides validation utilities for the README-to-CICD system,
 * including TypeScript compilation validation and interface validation.
 */

// Export CompilationValidator and related types
export {
  CompilationValidator,
  type TypeScriptError,
  type CompilationResult,
  type CompilationReport,
  type ResolutionAction,
  type ErrorResolutionStatus
} from './compilation-validator.js';

// Export existing validation utilities
export { ComponentInterfaceValidator } from './interface-validator.js';
export { IntegrationDiagnostics } from './integration-diagnostics.js';