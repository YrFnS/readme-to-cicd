/**
 * Formatting utilities for YAML generation
 */

/**
 * YAML formatting utilities
 */
export class FormattingUtils {
  /**
   * Generate workflow name from project metadata
   */
  static generateWorkflowName(projectName: string, workflowType: string): string {
    const cleanName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const capitalizedType = workflowType.charAt(0).toUpperCase() + workflowType.slice(1);
    return `${cleanName} ${capitalizedType}`;
  }

  /**
   * Generate job name from framework and action
   */
  static generateJobName(framework: string, action: string): string {
    const capitalizedFramework = framework.charAt(0).toUpperCase() + framework.slice(1);
    const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
    return `${capitalizedFramework} ${capitalizedAction}`;
  }

  /**
   * Generate step name from action description
   */
  static generateStepName(action: string, context?: string): string {
    const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
    return context ? `${capitalizedAction} (${context})` : capitalizedAction;
  }

  /**
   * Sanitize environment variable names
   */
  static sanitizeEnvVarName(name: string): string {
    return name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  }

  /**
   * Generate cache key from components
   */
  static generateCacheKey(components: string[]): string {
    return components.join('-');
  }

  /**
   * Format file paths for cross-platform compatibility
   */
  static formatPath(path: string): string {
    return path.replace(/\\/g, '/');
  }

  /**
   * Generate unique identifier for workflow elements
   */
  static generateId(prefix: string, suffix?: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const id = `${prefix}-${timestamp}-${random}`;
    return suffix ? `${id}-${suffix}` : id;
  }
}