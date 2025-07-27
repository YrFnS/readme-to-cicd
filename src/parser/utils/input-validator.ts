/**
 * Enhanced input validation utilities with comprehensive error handling
 */

import { ParseError } from '../types';
import { ErrorFactory, ParseErrorImpl } from './parse-error';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ParseErrorImpl[];
  warnings: ParseErrorImpl[];
  sanitizedValue?: any;
}

/**
 * Input validator class with comprehensive validation rules
 */
export class InputValidator {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5MB
  private static readonly SUPPORTED_ENCODINGS = ['utf8', 'utf-8', 'ascii', 'latin1'] as const;
  private static readonly DANGEROUS_PATH_PATTERNS = [
    /\.\./,           // Directory traversal
    /~/,              // Home directory reference
    /^\/dev\//,       // Device files
    /^\/proc\//,      // Process files
    /^\/sys\//,       // System files
    /\0/,             // Null bytes
    /[<>"|*?]/        // Invalid filename characters
  ];

  /**
   * Validate file path with security checks
   */
  static validateFilePath(filePath: string): ValidationResult {
    const errors: ParseErrorImpl[] = [];
    const warnings: ParseErrorImpl[] = [];

    // Basic type and presence validation
    if (!filePath || typeof filePath !== 'string') {
      errors.push(ErrorFactory.validation(
        'INVALID_PATH_TYPE',
        'File path must be a non-empty string',
        'InputValidator'
      ));
      return { isValid: false, errors, warnings };
    }

    const trimmedPath = filePath.trim();
    if (trimmedPath.length === 0) {
      errors.push(ErrorFactory.validation(
        'EMPTY_PATH',
        'File path cannot be empty or whitespace only',
        'InputValidator'
      ));
      return { isValid: false, errors, warnings };
    }

    // Length validation
    if (trimmedPath.length > 260) { // Windows MAX_PATH limit
      errors.push(ErrorFactory.validation(
        'PATH_TOO_LONG',
        `File path exceeds maximum length (260 characters): ${trimmedPath.length}`,
        'InputValidator',
        { pathLength: trimmedPath.length, maxLength: 260 }
      ));
    }

    // Security validation - check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATH_PATTERNS) {
      if (pattern.test(trimmedPath)) {
        errors.push(ErrorFactory.validation(
          'UNSAFE_PATH',
          `File path contains potentially unsafe pattern: ${pattern.source}`,
          'InputValidator',
          { path: trimmedPath, pattern: pattern.source }
        ));
      }
    }

    // Check for common README file patterns
    const isReadmeFile = /readme/i.test(trimmedPath) || /\.md$/i.test(trimmedPath);
    if (!isReadmeFile) {
      warnings.push(ErrorFactory.validation(
        'NON_README_FILE',
        'File does not appear to be a README file',
        'InputValidator',
        { path: trimmedPath }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: trimmedPath
    };
  }

  /**
   * Validate content string with encoding and format checks
   */
  static validateContent(content: string, encoding?: string): ValidationResult {
    const errors: ParseErrorImpl[] = [];
    const warnings: ParseErrorImpl[] = [];

    // Basic type validation
    if (typeof content !== 'string') {
      errors.push(ErrorFactory.validation(
        'INVALID_CONTENT_TYPE',
        `Content must be a string, received: ${typeof content}`,
        'InputValidator'
      ));
      return { isValid: false, errors, warnings };
    }

    // Empty content check
    if (content.length === 0) {
      warnings.push(ErrorFactory.validation(
        'EMPTY_CONTENT',
        'Content is empty',
        'InputValidator',
        'warning'
      ));
      return { isValid: true, errors, warnings, sanitizedValue: content };
    }

    // Size validation
    if (content.length > this.MAX_CONTENT_LENGTH) {
      errors.push(ErrorFactory.validation(
        'CONTENT_TOO_LARGE',
        `Content size (${content.length} bytes) exceeds maximum allowed size (${this.MAX_CONTENT_LENGTH} bytes)`,
        'InputValidator',
        { contentLength: content.length, maxLength: this.MAX_CONTENT_LENGTH }
      ));
    }

    // Encoding validation
    if (encoding && !this.SUPPORTED_ENCODINGS.includes(encoding as any)) {
      errors.push(ErrorFactory.validation(
        'UNSUPPORTED_ENCODING',
        `Encoding '${encoding}' is not supported. Supported encodings: ${this.SUPPORTED_ENCODINGS.join(', ')}`,
        'InputValidator',
        { encoding, supportedEncodings: this.SUPPORTED_ENCODINGS }
      ));
    }

    // Binary content detection
    if (content.includes('\0')) {
      errors.push(ErrorFactory.validation(
        'BINARY_CONTENT',
        'Content appears to contain binary data (null bytes detected)',
        'InputValidator'
      ));
      return { isValid: false, errors, warnings }; // Return early for binary content
    }

    // Control character detection
    const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
    if (controlCharRegex.test(content)) {
      warnings.push(ErrorFactory.validation(
        'CONTROL_CHARACTERS',
        'Content contains control characters that may cause parsing issues',
        'InputValidator',
        'warning'
      ));
    }

    // Markdown format validation
    const markdownValidation = this.validateMarkdownFormat(content);
    errors.push(...markdownValidation.errors);
    warnings.push(...markdownValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: this.sanitizeContent(content)
    };
  }  
/**
   * Validate markdown format and structure
   */
  private static validateMarkdownFormat(content: string): ValidationResult {
    const errors: ParseErrorImpl[] = [];
    const warnings: ParseErrorImpl[] = [];

    // Check for basic markdown indicators
    const hasHeaders = /^#+\s/m.test(content);
    const hasLists = /^[\s]*[-*+]\s/m.test(content);
    const hasCodeBlocks = /```/.test(content);
    const hasLinks = /\[.*\]\(.*\)/.test(content);

    if (!hasHeaders && !hasLists && !hasCodeBlocks && !hasLinks) {
      warnings.push(ErrorFactory.validation(
        'NO_MARKDOWN_FORMATTING',
        'Content does not appear to contain markdown formatting',
        'InputValidator',
        'warning'
      ));
    }

    // Check for malformed code blocks
    const codeBlockMatches = content.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      errors.push(ErrorFactory.parsing(
        'MALFORMED_CODE_BLOCKS',
        'Unmatched code block delimiters (```)',
        'InputValidator'
      ));
    }

    // Check for extremely long lines that might cause parsing issues
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 1000);
    if (longLines.length > 0) {
      warnings.push(ErrorFactory.validation(
        'LONG_LINES',
        `Found ${longLines.length} lines longer than 1000 characters`,
        'InputValidator',
        { longLineCount: longLines.length, maxLineLength: Math.max(...longLines.map(l => l.length)) }
      ));
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Sanitize content by removing or replacing problematic characters
   */
  private static sanitizeContent(content: string): string {
    return content
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive whitespace
      .replace(/[ \t]+$/gm, '') // Trailing whitespace
      .replace(/\n{4,}/g, '\n\n\n') // Excessive newlines
      // Remove control characters except tab and newline
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Validate analyzer configuration
   */
  static validateAnalyzerConfig(config: any): ValidationResult {
    const errors: ParseErrorImpl[] = [];
    const warnings: ParseErrorImpl[] = [];

    if (!config || typeof config !== 'object') {
      errors.push(ErrorFactory.configuration(
        'INVALID_ANALYZER_CONFIG',
        'Analyzer configuration must be an object',
        'InputValidator'
      ));
      return { isValid: false, errors, warnings };
    }

    // Validate timeout settings
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout <= 0) {
        errors.push(ErrorFactory.configuration(
          'INVALID_TIMEOUT',
          'Timeout must be a positive number',
          'InputValidator',
          { timeout: config.timeout }
        ));
      } else if (config.timeout > 60000) { // 60 seconds
        warnings.push(ErrorFactory.configuration(
          'HIGH_TIMEOUT',
          'Timeout value is very high and may cause performance issues',
          'InputValidator',
          { timeout: config.timeout }
        ));
      }
    }

    // Validate confidence thresholds
    if (config.confidenceThreshold !== undefined) {
      if (typeof config.confidenceThreshold !== 'number' || 
          config.confidenceThreshold < 0 || 
          config.confidenceThreshold > 1) {
        errors.push(ErrorFactory.configuration(
          'INVALID_CONFIDENCE_THRESHOLD',
          'Confidence threshold must be a number between 0 and 1',
          'InputValidator',
          { confidenceThreshold: config.confidenceThreshold }
        ));
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate project info structure
   */
  static validateProjectInfo(projectInfo: any): ValidationResult {
    const errors: ParseErrorImpl[] = [];
    const warnings: ParseErrorImpl[] = [];

    if (!projectInfo || typeof projectInfo !== 'object') {
      errors.push(ErrorFactory.validation(
        'INVALID_PROJECT_INFO',
        'Project info must be an object',
        'InputValidator'
      ));
      return { isValid: false, errors, warnings };
    }

    // Validate required properties
    const requiredProperties = ['metadata', 'languages', 'dependencies', 'commands', 'testing', 'confidence'];
    for (const prop of requiredProperties) {
      if (!(prop in projectInfo)) {
        errors.push(ErrorFactory.validation(
          'MISSING_REQUIRED_PROPERTY',
          `Missing required property: ${prop}`,
          'InputValidator',
          { property: prop }
        ));
      }
    }

    // Validate confidence scores
    if (projectInfo.confidence) {
      const confidenceValidation = this.validateConfidenceScores(projectInfo.confidence);
      errors.push(...confidenceValidation.errors);
      warnings.push(...confidenceValidation.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate confidence scores structure
   */
  private static validateConfidenceScores(confidence: any): ValidationResult {
    const errors: ParseErrorImpl[] = [];
    const warnings: ParseErrorImpl[] = [];

    if (!confidence || typeof confidence !== 'object') {
      errors.push(ErrorFactory.validation(
        'INVALID_CONFIDENCE_OBJECT',
        'Confidence must be an object',
        'InputValidator'
      ));
      return { isValid: false, errors, warnings };
    }

    const requiredScores = ['overall', 'languages', 'dependencies', 'commands', 'testing', 'metadata'];
    for (const score of requiredScores) {
      if (!(score in confidence)) {
        errors.push(ErrorFactory.validation(
          'MISSING_CONFIDENCE_SCORE',
          `Missing confidence score: ${score}`,
          'InputValidator',
          { score }
        ));
        continue;
      }

      const value = confidence[score];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        errors.push(ErrorFactory.validation(
          'INVALID_CONFIDENCE_VALUE',
          `Confidence score '${score}' must be a number between 0 and 1`,
          'InputValidator',
          { score, value }
        ));
      } else if (value < 0.1) {
        warnings.push(ErrorFactory.validation(
          'LOW_CONFIDENCE',
          `Very low confidence score for ${score}: ${value}`,
          'InputValidator',
          { score, value }
        ));
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}