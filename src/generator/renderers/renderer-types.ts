/**
 * Renderer-specific type definitions
 */

/**
 * YAML rendering configuration
 */
export interface YAMLRenderConfig {
  indent: number;
  lineWidth: number;
  noRefs: boolean;
  noCompatMode: boolean;
  condenseFlow: boolean;
  quotingType: '"' | "'" | 'auto';
  forceQuotes: boolean;
  sortKeys: boolean;
}

/**
 * Comment injection configuration
 */
export interface CommentConfig {
  enabled: boolean;
  includeGenerationInfo: boolean;
  includeStepDescriptions: boolean;
  includeOptimizationNotes: boolean;
  customComments: Record<string, string>;
}

/**
 * Formatting options
 */
export interface FormattingOptions {
  yamlConfig: YAMLRenderConfig;
  commentConfig: CommentConfig;
  preserveComments: boolean;
  addBlankLines: boolean;
}

/**
 * Rendering result
 */
export interface RenderingResult {
  yaml: string;
  metadata: RenderingMetadata;
  warnings: string[];
}

/**
 * Rendering metadata
 */
export interface RenderingMetadata {
  linesCount: number;
  charactersCount: number;
  renderingTime: number;
  optimizationsApplied: string[];
}