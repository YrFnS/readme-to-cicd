/**
 * Input validation utilities
 */

import { ProjectInfo, ParseError } from '../types';

/**
 * Validate file path format and security
 */
export function validateFilePath(filePath: string): ParseError | null {
  if (!filePath || typeof filePath !== 'string') {
    return {
      code: 'INVALID_PATH',
      message: 'File path must be a non-empty string',
      component: 'Validation',
      severity: 'error'
    };
  }

  // Check for directory traversal attempts
  if (filePath.includes('..') || filePath.includes('~')) {
    return {
      code: 'UNSAFE_PATH',
      message: 'File path contains potentially unsafe characters',
      component: 'Validation',
      severity: 'error'
    };
  }

  return null;
}

/**
 * Validate content string
 */
export function validateContent(content: string): ParseError | null {
  if (typeof content !== 'string') {
    return {
      code: 'INVALID_CONTENT_TYPE',
      message: 'Content must be a string',
      component: 'Validation',
      severity: 'error'
    };
  }

  if (content.length === 0) {
    return {
      code: 'EMPTY_CONTENT',
      message: 'Content cannot be empty',
      component: 'Validation',
      severity: 'warning'
    };
  }

  // Check for extremely large content (>10MB)
  if (content.length > 10 * 1024 * 1024) {
    return {
      code: 'CONTENT_TOO_LARGE',
      message: 'Content exceeds maximum size limit (10MB)',
      component: 'Validation',
      severity: 'error'
    };
  }

  return null;
}

/**
 * Validate ProjectInfo structure
 */
export function validateProjectInfo(projectInfo: ProjectInfo): ParseError[] {
  const errors: ParseError[] = [];

  // Validate confidence scores are in 0-1 range
  const confidenceFields = Object.entries(projectInfo.confidence);
  for (const [field, score] of confidenceFields) {
    if (typeof score !== 'number' || score < 0 || score > 1) {
      errors.push({
        code: 'INVALID_CONFIDENCE',
        message: `Confidence score for ${field} must be between 0 and 1`,
        component: 'Validation',
        severity: 'error'
      });
    }
  }

  // Validate language info
  projectInfo.languages.forEach((lang, index) => {
    if (!lang.name || typeof lang.name !== 'string') {
      errors.push({
        code: 'INVALID_LANGUAGE_NAME',
        message: `Language at index ${index} must have a valid name`,
        component: 'Validation',
        severity: 'error'
      });
    }
  });

  return errors;
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim();
}

/**
 * Check if a string is a valid package name
 */
export function isValidPackageName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  
  // Basic package name validation (alphanumeric, hyphens, underscores, dots)
  const packageNameRegex = /^[a-zA-Z0-9._-]+$/;
  return packageNameRegex.test(name) && name.length <= 100;
}