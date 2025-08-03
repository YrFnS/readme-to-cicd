/**
 * YAML utility functions for formatting and validation
 */

import * as yaml from 'js-yaml';

/**
 * YAML formatting utilities
 */
export class YAMLUtils {
  /**
   * Normalize YAML indentation
   */
  static normalizeIndentation(yamlContent: string, indentSize: number = 2): string {
    const lines = yamlContent.split('\n');
    const normalizedLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === '') {
        normalizedLines.push('');
        continue;
      }

      // Calculate current indentation level
      const leadingSpaces = line.match(/^(\s*)/)?.[1] || '';
      const currentIndent = leadingSpaces.length;
      
      // Normalize to specified indent size
      const indentLevel = Math.floor(currentIndent / 2); // Assuming original was 2-space
      const normalizedIndent = ' '.repeat(indentLevel * indentSize);
      
      normalizedLines.push(normalizedIndent + line.trim());
    }

    return normalizedLines.join('\n');
  }

  /**
   * Add blank lines for better readability
   */
  static addBlankLines(yamlContent: string): string {
    const lines = yamlContent.split('\n');
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      processedLines.push(line);

      // Add blank line after top-level keys (except the last one)
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1]?.trim();
        
        // Add blank line after workflow metadata
        if (trimmedLine.startsWith('name:') || 
            trimmedLine === 'on:' || 
            trimmedLine === 'permissions:' ||
            trimmedLine === 'concurrency:' ||
            trimmedLine === 'defaults:') {
          processedLines.push('');
        }
        
        // Add blank line between jobs
        if (trimmedLine === 'jobs:' || 
            (trimmedLine.endsWith(':') && !trimmedLine.includes(' ') && 
             nextLine && !nextLine.startsWith(' '))) {
          processedLines.push('');
        }
      }
    }

    return processedLines.join('\n');
  }

  /**
   * Remove excessive blank lines
   */
  static removeExcessiveBlankLines(yamlContent: string): string {
    return yamlContent
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple blank lines with single
      .replace(/^\n+/, '') // Remove leading blank lines
      .replace(/\n+$/, '\n'); // Ensure single trailing newline
  }

  /**
   * Validate YAML syntax and structure
   */
  static validateSyntax(yamlContent: string): {
    isValid: boolean;
    error?: string;
    line?: number;
    column?: number;
  } {
    try {
      yaml.load(yamlContent, { 
        filename: 'workflow.yml',
        onWarning: (warning) => {
          console.warn('YAML Warning:', warning);
        }
      });
      return { isValid: true };
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        return {
          isValid: false,
          error: error.message,
          line: error.mark?.line,
          column: error.mark?.column
        };
      }
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown YAML error'
      };
    }
  }

  /**
   * Format YAML with consistent style
   */
  static formatYAML(yamlContent: string, options: {
    indent?: number;
    lineWidth?: number;
    addBlankLines?: boolean;
    sortKeys?: boolean;
  } = {}): string {
    const {
      indent = 2,
      lineWidth = 120,
      addBlankLines = true,
      sortKeys = false
    } = options;

    try {
      // Parse and re-dump to ensure consistent formatting
      const parsed = yaml.load(yamlContent);
      let formatted = yaml.dump(parsed, {
        indent,
        lineWidth,
        noRefs: true,
        sortKeys,
        quotingType: '"',
        forceQuotes: false
      });

      // Apply additional formatting
      formatted = this.normalizeIndentation(formatted, indent);
      
      if (addBlankLines) {
        formatted = this.addBlankLines(formatted);
      }
      
      formatted = this.removeExcessiveBlankLines(formatted);

      return formatted;
    } catch (error) {
      throw new Error(`YAML formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract YAML structure information
   */
  static analyzeStructure(yamlContent: string): {
    topLevelKeys: string[];
    jobCount: number;
    stepCount: number;
    hasMatrix: boolean;
    hasCaching: boolean;
    hasSecrets: boolean;
  } {
    try {
      const parsed = yaml.load(yamlContent) as any;
      
      const topLevelKeys = Object.keys(parsed || {});
      const jobs = parsed?.jobs || {};
      const jobCount = Object.keys(jobs).length;
      
      let stepCount = 0;
      let hasMatrix = false;
      let hasCaching = false;
      let hasSecrets = false;

      // Analyze jobs
      for (const job of Object.values(jobs) as any[]) {
        if (job.steps) {
          stepCount += job.steps.length;
        }
        
        if (job.strategy?.matrix) {
          hasMatrix = true;
        }

        // Check for caching
        if (job.steps) {
          for (const step of job.steps) {
            if (step.uses?.includes('actions/cache')) {
              hasCaching = true;
            }
            if (step.env || step.with) {
              const envVars = { ...step.env, ...step.with };
              for (const value of Object.values(envVars) as string[]) {
                if (typeof value === 'string' && value.includes('secrets.')) {
                  hasSecrets = true;
                }
              }
            }
          }
        }
      }

      return {
        topLevelKeys,
        jobCount,
        stepCount,
        hasMatrix,
        hasCaching,
        hasSecrets
      };
    } catch (error) {
      throw new Error(`YAML analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Merge YAML configurations
   */
  static mergeYAMLConfigs(base: string, override: string): string {
    try {
      const baseConfig = yaml.load(base) as any;
      const overrideConfig = yaml.load(override) as any;
      
      const merged = this.deepMerge(baseConfig, overrideConfig);
      
      return yaml.dump(merged, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });
    } catch (error) {
      throw new Error(`YAML merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deep merge objects
   */
  private static deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }

    if (Array.isArray(source)) {
      return source;
    }

    if (typeof source !== 'object') {
      return source;
    }

    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Extract comments from YAML content
   */
  static extractComments(yamlContent: string): Map<number, string> {
    const comments = new Map<number, string>();
    const lines = yamlContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const commentMatch = line.match(/^\s*#\s*(.+)$/);
      
      if (commentMatch) {
        comments.set(i + 1, commentMatch[1]);
      }
    }

    return comments;
  }

  /**
   * Preserve comments during YAML transformation
   */
  static preserveComments(originalYaml: string, transformedYaml: string): string {
    const originalComments = this.extractComments(originalYaml);
    const transformedLines = transformedYaml.split('\n');
    const result: string[] = [];

    let commentOffset = 0;

    for (let i = 0; i < transformedLines.length; i++) {
      const line = transformedLines[i];
      
      // Check if there's a comment for this line in the original
      const originalLineNumber = i + 1 + commentOffset;
      const comment = originalComments.get(originalLineNumber);
      
      if (comment) {
        const indent = line.match(/^(\s*)/)?.[1] || '';
        result.push(`${indent}# ${comment}`);
        commentOffset++;
      }
      
      result.push(line);
    }

    return result.join('\n');
  }
}