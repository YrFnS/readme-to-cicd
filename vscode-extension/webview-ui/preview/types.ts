export interface WorkflowFile {
  name: string;
  path: string;
  content: string;
  language: 'yaml' | 'yml';
  size: number;
  lastModified?: Date;
}

export interface PreviewConfiguration {
  frameworks: string[];
  workflowTypes: string[];
  deploymentPlatform: string;
  deploymentConfig: Record<string, any>;
}

export interface PreviewState {
  isLoading: boolean;
  error: string | null;
  workflows: WorkflowFile[];
  selectedWorkflow: string | null;
  editMode: boolean;
  hasChanges: boolean;
}

export interface PreviewMessage {
  type: 'previewUpdate' | 'configurationChange' | 'generateRequest' | 'editRequest' | 'saveRequest' | 'cancelRequest';
  data?: any;
  requestId?: string;
}

export interface EditableContent {
  original: string;
  modified: string;
  isDirty: boolean;
  lineCount: number;
}

export interface SyntaxHighlightTheme {
  background: string;
  foreground: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
  operator: string;
}

export interface PreviewLayout {
  splitView: boolean;
  configurationWidth: number;
  previewWidth: number;
  orientation: 'horizontal' | 'vertical';
}

export interface ValidationIssue {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface WorkflowValidation {
  isValid: boolean;
  issues: ValidationIssue[];
  yamlSyntaxValid: boolean;
  githubActionsValid: boolean;
}