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
      const leadingSpacesMatch = line.match(/^(\s*)/);
      const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1] : '';
      const currentIndent = leadingSpaces ? leadingSpaces.length : 0;
      
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
      if (!line) {continue;} // Handle undefined case
      
      const trimmedLine = line.trim();
      
      processedLines.push(line);

      // Only add blank lines after top-level keys if the next line is not empty and not indented
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1];
        if (!nextLine) {continue;} // Handle undefined case
        
        const nextTrimmed = nextLine.trim();
        
        // Skip if next line is already empty or if we're in the middle of a structure
        if (!nextTrimmed || nextLine.startsWith(' ')) {
          continue;
        }
        
        // Add blank line after top-level keys
        if (trimmedLine.startsWith('name:') || 
            trimmedLine === 'on:' || 
            trimmedLine === 'permissions:' ||
            trimmedLine === 'concurrency:' ||
            trimmedLine === 'defaults:' ||
            trimmedLine === 'jobs:') {
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
      // First check for obvious syntax issues
      if (yamlContent.includes('\t')) {
        return {
          isValid: false,
          error: 'YAML cannot contain tab characters',
          line: yamlContent.split('\n').findIndex(line => line.includes('\t')) + 1
        };
      }

      // Check for malformed structure
      const lines = yamlContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) {continue;} // Handle undefined case
        if (line.trim() && !line.match(/^\s*(#|[\w-]+\s*:|[\w-]+\s*:\s*.+|-\s*.+|\s*.+)$/)) {
          return {
            isValid: false,
            error: 'Invalid YAML structure',
            line: i + 1
          };
        }
      }

      yaml.load(yamlContent, { 
        filename: 'workflow.yml',
        onWarning: (warning) => {
          console.warn('YAML Warning:', warning);
        }
      });
      return { isValid: true };
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        const result: { isValid: boolean; error?: string; line?: number; column?: number } = {
          isValid: false,
          error: error.message
        };
        if (error.mark?.line !== undefined) {
          result.line = error.mark.line + 1; // js-yaml uses 0-based line numbers
        }
        if (error.mark?.column !== undefined) {
          result.column = error.mark.column + 1; // js-yaml uses 0-based column numbers
        }
        return result;
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

      // Fix the "on" key quoting issue
      formatted = formatted.replace(/^"on":/gm, 'on:');
      formatted = formatted.replace(/^'on':/gm, 'on:');

      // Apply additional formatting
      formatted = this.normalizeIndentation(formatted, indent);
      
      if (addBlankLines) {
        formatted = this.addBlankLines(formatted);
      }
      
      formatted = this.removeExcessiveBlankLines(formatted);

      return formatted;
    } catch (error) {
      // Throw error for invalid YAML as expected by tests
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
      
      let result = yaml.dump(merged, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });

      // Fix the "on" key quoting issue (same as formatYAML)
      result = result.replace(/^"on":/gm, 'on:');
      result = result.replace(/^'on':/gm, 'on:');

      return result;
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
      if (!line) {continue;}
      const commentMatch = line.match(/^\s*#\s*(.+)$/);
      
      if (commentMatch && commentMatch[1]) {
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
      if (!line) {continue;}
      
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