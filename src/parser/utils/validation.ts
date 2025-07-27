/**
 * Input validation utilities - Legacy compatibility layer
 * 
 * This module provides backward compatibility for existing validation functions
 * while integrating with the new enhanced error handling system.
 */

import { ProjectInfo, ParseError } from '../types';
import { InputValidator, ValidationResult } from './input-validator';
import { ErrorFactory, ParseErrorImpl } from './parse-error';
import { Logger, logger } from './logger';

/**
 * Validate file path format and security (legacy compatibility)
 */
export function validateFilePath(filePath: string): ParseError | null {
  const correlationId = Logger.generateCorrelationId();
  logger.debug('LegacyValidation', 'Validating file path', { filePath }, correlationId);

  const result = InputValidator.validateFilePath(filePath);
  
  if (!result.isValid && result.errors.length > 0) {
    const error = result.errors[0];
    if (error) {
      logger.logParseError(error, correlationId);
      return error.toJSON();
    }
  }

  // Log warnings if any
  result.warnings.forEach(warning => {
    logger.logParseError(warning, correlationId);
  });

  return null;
}

/**
 * Validate content string (legacy compatibility)
 */
export function validateContent(content: string): ParseError | null {
  const correlationId = Logger.generateCorrelationId();
  logger.debug('LegacyValidation', 'Validating content', { contentLength: content?.length }, correlationId);

  const result = InputValidator.validateContent(content);
  
  if (!result.isValid && result.errors.length > 0) {
    const error = result.errors[0];
    if (error) {
      logger.logParseError(error, correlationId);
      return error.toJSON();
    }
  }

  // Log warnings if any
  result.warnings.forEach(warning => {
    logger.logParseError(warning, correlationId);
  });

  return null;
}

/**
 * Validate ProjectInfo structure (legacy compatibility)
 */
export function validateProjectInfo(projectInfo: ProjectInfo): ParseError[] {
  const correlationId = Logger.generateCorrelationId();
  logger.debug('LegacyValidation', 'Validating project info structure', { projectInfo }, correlationId);

  const result = InputValidator.validateProjectInfo(projectInfo);
  
  const allErrors = [...result.errors, ...result.warnings];
  
  // Log all errors and warnings
  allErrors.forEach(error => {
    logger.logParseError(error, correlationId);
  });

  return allErrors.map(error => error.toJSON());
}

/**
 * Enhanced validation with full error context
 */
export function validateFilePathEnhanced(filePath: string): ValidationResult {
  const correlationId = Logger.generateCorrelationId();
  logger.debug('EnhancedValidation', 'Enhanced file path validation', { filePath }, correlationId);

  const result = InputValidator.validateFilePath(filePath);
  
  // Log all errors and warnings
  [...result.errors, ...result.warnings].forEach(error => {
    logger.logParseError(error, correlationId);
  });

  return result;
}

/**
 * Enhanced content validation with full error context
 */
export function validateContentEnhanced(content: string, encoding?: string): ValidationResult {
  const correlationId = Logger.generateCorrelationId();
  logger.debug('EnhancedValidation', 'Enhanced content validation', { 
    contentLength: content?.length, 
    encoding 
  }, correlationId);

  const result = InputValidator.validateContent(content, encoding);
  
  // Log all errors and warnings
  [...result.errors, ...result.warnings].forEach(error => {
    logger.logParseError(error, correlationId);
  });

  return result;
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    logger.warn('LegacyValidation', 'Invalid input type for sanitization', { 
      inputType: typeof input 
    });
    return '';
  }
  
  const sanitized = input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim();

  if (sanitized !== input) {
    logger.debug('LegacyValidation', 'String was sanitized', { 
      original: input.substring(0, 100), 
      sanitized: sanitized.substring(0, 100) 
    });
  }

  return sanitized;
}

/**
 * Check if a string is a valid package name
 */
export function isValidPackageName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    logger.debug('LegacyValidation', 'Invalid package name type', { 
      name, 
      type: typeof name 
    });
    return false;
  }
  
  // Basic package name validation (alphanumeric, hyphens, underscores, dots)
  const packageNameRegex = /^[a-zA-Z0-9._-]+$/;
  const isValid = packageNameRegex.test(name) && name.length <= 100;

  if (!isValid) {
    logger.debug('LegacyValidation', 'Package name validation failed', { 
      name, 
      length: name.length,
      regexMatch: packageNameRegex.test(name)
    });
  }

  return isValid;
}

/**
 * Comprehensive validation for all parser inputs
 */
export function validateParserInputs(
  filePath?: string,
  content?: string,
  encoding?: string
): {
  isValid: boolean;
  errors: ParseErrorImpl[];
  warnings: ParseErrorImpl[];
  sanitizedInputs?: {
    filePath?: string;
    content?: string;
  };
} {
  const correlationId = Logger.generateCorrelationId();
  const trackingId = logger.startPerformanceTracking('validateParserInputs', correlationId);

  logger.info('ComprehensiveValidation', 'Starting comprehensive input validation', {
    hasFilePath: !!filePath,
    hasContent: !!content,
    encoding
  }, correlationId);

  const allErrors: ParseErrorImpl[] = [];
  const allWarnings: ParseErrorImpl[] = [];
  const sanitizedInputs: any = {};

  // Validate file path if provided
  if (filePath) {
    const pathResult = InputValidator.validateFilePath(filePath);
    allErrors.push(...pathResult.errors);
    allWarnings.push(...pathResult.warnings);
    if (pathResult.sanitizedValue) {
      sanitizedInputs.filePath = pathResult.sanitizedValue;
    }
  }

  // Validate content if provided
  if (content) {
    const contentResult = InputValidator.validateContent(content, encoding);
    allErrors.push(...contentResult.errors);
    allWarnings.push(...contentResult.warnings);
    if (contentResult.sanitizedValue) {
      sanitizedInputs.content = contentResult.sanitizedValue;
    }
  }

  // Log all errors and warnings
  [...allErrors, ...allWarnings].forEach(error => {
    logger.logParseError(error, correlationId);
  });

  const isValid = allErrors.length === 0;
  
  logger.info('ComprehensiveValidation', 'Completed comprehensive input validation', {
    isValid,
    errorCount: allErrors.length,
    warningCount: allWarnings.length
  }, correlationId);

  logger.endPerformanceTracking(trackingId, correlationId);

  return {
    isValid,
    errors: allErrors,
    warnings: allWarnings,
    sanitizedInputs: Object.keys(sanitizedInputs).length > 0 ? sanitizedInputs : undefined
  };
}