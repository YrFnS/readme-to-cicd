/**
 * Default Configuration for CLI Tool
 * 
 * Provides comprehensive sensible defaults for CLI configuration as specified in the design document.
 * Includes all configuration sections with production-ready defaults.
 */

import { CLIConfig } from './types';

export const DEFAULT_CONFIG: CLIConfig = {
  defaults: {
    outputDirectory: '.github/workflows',
    workflowTypes: ['ci', 'cd'],
    includeComments: true,
    optimizationLevel: 'standard'
  },
  templates: {
    templateOverrides: {}
  },
  organization: {
    requiredSecurityScans: false,
    mandatorySteps: [],
    allowedActions: ['actions/*'],
    enforceBranchProtection: false,
    requireCodeReview: false
  },
  output: {
    format: 'yaml',
    indentation: 2,
    includeMetadata: true,
    backupExisting: true
  },
  git: {
    autoCommit: false,
    commitMessage: 'feat: add automated CI/CD workflows',
    createPR: false
  },
  ui: {
    colorOutput: true,
    progressIndicators: true,
    verboseLogging: false,
    interactivePrompts: true
  }
};