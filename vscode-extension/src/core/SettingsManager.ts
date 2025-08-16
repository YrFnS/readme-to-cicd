import * as vscode from 'vscode';
import { EventEmitter } from 'events';

/**
 * Interface for workspace-level configuration
 */
export interface WorkspaceConfiguration {
  defaultOutputDirectory: string;
  enableAutoGeneration: boolean;
  preferredWorkflowTypes: WorkflowType[];
  customTemplates: string[];
  enableInlineValidation: boolean;
  gitIntegration: GitIntegrationSettings;
  organizationPolicies?: OrganizationPolicies;
}

/**
 * Interface for user-level configuration
 */
export interface UserConfiguration {
  showPreviewByDefault: boolean;
  notificationLevel: 'all' | 'errors' | 'none';
  preferredTheme: 'light' | 'dark' | 'auto';
  enableTelemetry: boolean;
  autoUpdateTemplates: boolean;
}

/**
 * Interface for organization policies
 */
export interface OrganizationPolicies {
  requiredWorkflowTypes: WorkflowType[];
  forbiddenActions: string[];
  requiredSecurityScanning: boolean;
  maxWorkflowComplexity: number;
  allowCustomTemplates: boolean;
  enforceNamingConventions: boolean;
  namingPattern?: string;
}

/**
 * Interface for Git integration settings
 */
export interface GitIntegrationSettings {
  autoCommit: boolean;
  commitMessage: string;
  createPR: boolean;
  branchName?: string;
}

/**
 * Workflow types
 */
export type WorkflowType = 'ci' | 'cd' | 'release' | 'security' | 'performance' | 'maintenance';

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: ConfigurationError[];
  warnings: ConfigurationWarning[];
}

/**
 * Configuration error
 */
export interface ConfigurationError {
  key: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

/**
 * Configuration warning
 */
export interface ConfigurationWarning {
  key: string;
  message: string;
  suggestion?: string;
}

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  scope: 'workspace' | 'user' | 'organization';
  changes: Record<string, any>;
  timestamp: Date;
}

/**
 * Interface for extension state
 */
export interface ExtensionState {
  lastGenerationTime?: number;
  recentWorkflows: string[];
  userPreferences: Record<string, any>;
}

/**
 * Manages extension settings and state with validation and policy enforcement
 */
export class SettingsManager extends EventEmitter {
  private static readonly EXTENSION_ID = 'readme-to-cicd';
  private static readonly ORGANIZATION_POLICIES_KEY = 'organizationPolicies';
  
  private configurationChangeListener: vscode.Disposable | undefined;
  private currentWorkspaceConfig: WorkspaceConfiguration | undefined;
  private currentUserConfig: UserConfiguration | undefined;
  private organizationPolicies: OrganizationPolicies | undefined;
  private defaultWorkspaceConfig: WorkspaceConfiguration;
  private defaultUserConfig: UserConfiguration;

  constructor(private context: vscode.ExtensionContext) {
    super();
    
    // Initialize default configurations
    this.defaultWorkspaceConfig = {
      defaultOutputDirectory: '.github/workflows',
      enableAutoGeneration: false,
      preferredWorkflowTypes: ['ci'],
      customTemplates: [],
      enableInlineValidation: true,
      gitIntegration: {
        autoCommit: false,
        commitMessage: 'chore: update CI/CD workflows',
        createPR: false
      }
    };

    this.defaultUserConfig = {
      showPreviewByDefault: true,
      notificationLevel: 'all',
      preferredTheme: 'auto',
      enableTelemetry: true,
      autoUpdateTemplates: false
    };
  }

  /**
   * Initialize settings management with validation and policy loading
   */
  async initialize(): Promise<void> {
    console.log('Initializing settings manager...');

    try {
      // Load organization policies first
      await this.loadOrganizationPolicies();

      // Load and validate configuration
      await this.loadConfiguration();
      
      // Validate configuration against policies
      const validationResult = await this.validateConfiguration();
      if (!validationResult.isValid) {
        console.warn('Configuration validation issues found:', validationResult.errors);
        
        // Show validation errors to user if severe
        const severeErrors = validationResult.errors.filter(e => e.severity === 'error');
        if (severeErrors.length > 0) {
          const message = `Configuration validation failed: ${severeErrors[0].message}`;
          vscode.window.showErrorMessage(message);
        }
      }

      // Setup configuration change listener
      this.setupConfigurationChangeListener();

      console.log('Settings manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize settings manager:', error);
      vscode.window.showErrorMessage('Failed to initialize extension settings');
      throw error;
    }
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    if (this.configurationChangeListener) {
      this.configurationChangeListener.dispose();
      this.configurationChangeListener = undefined;
    }
  }

  /**
   * Load configuration from VS Code settings with validation and defaults
   */
  private async loadConfiguration(): Promise<void> {
    const config = vscode.workspace.getConfiguration(SettingsManager.EXTENSION_ID);

    // Load workspace configuration with defaults and validation
    this.currentWorkspaceConfig = {
      defaultOutputDirectory: this.validateAndGetString(
        config, 'defaultOutputDirectory', this.defaultWorkspaceConfig.defaultOutputDirectory
      ),
      enableAutoGeneration: config.get('enableAutoGeneration', this.defaultWorkspaceConfig.enableAutoGeneration),
      preferredWorkflowTypes: this.validateWorkflowTypes(
        config.get('preferredWorkflowTypes', this.defaultWorkspaceConfig.preferredWorkflowTypes)
      ),
      customTemplates: this.validateStringArray(
        config.get('customTemplates', this.defaultWorkspaceConfig.customTemplates)
      ),
      enableInlineValidation: config.get('enableInlineValidation', this.defaultWorkspaceConfig.enableInlineValidation),
      gitIntegration: this.loadGitIntegrationSettings(config),
      organizationPolicies: this.organizationPolicies
    };

    // Load user configuration with defaults and validation
    this.currentUserConfig = {
      showPreviewByDefault: config.get('showPreviewByDefault', this.defaultUserConfig.showPreviewByDefault),
      notificationLevel: this.validateNotificationLevel(
        config.get('notificationLevel', this.defaultUserConfig.notificationLevel)
      ),
      preferredTheme: this.validateTheme(
        config.get('preferredTheme', this.defaultUserConfig.preferredTheme)
      ),
      enableTelemetry: config.get('enableTelemetry', this.defaultUserConfig.enableTelemetry),
      autoUpdateTemplates: config.get('autoUpdateTemplates', this.defaultUserConfig.autoUpdateTemplates)
    };

    console.log('Configuration loaded and validated:', {
      workspace: this.currentWorkspaceConfig,
      user: this.currentUserConfig
    });
  }

  /**
   * Setup configuration change listener with validation
   */
  private setupConfigurationChangeListener(): void {
    this.configurationChangeListener = vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration(SettingsManager.EXTENSION_ID)) {
        console.log('Extension configuration changed');
        
        const previousConfig = { ...this.currentWorkspaceConfig };
        await this.loadConfiguration();
        
        // Validate new configuration
        const validationResult = await this.validateConfiguration();
        if (!validationResult.isValid) {
          console.warn('Configuration validation failed after change:', validationResult.errors);
          
          // Show validation errors for severe issues
          const severeErrors = validationResult.errors.filter(e => e.severity === 'error');
          if (severeErrors.length > 0) {
            vscode.window.showWarningMessage(
              `Configuration issue: ${severeErrors[0].message}`,
              'Fix Now', 'Ignore'
            ).then(selection => {
              if (selection === 'Fix Now') {
                this.showConfigurationHelp(severeErrors[0]);
              }
            });
          }
        }
        
        // Emit configuration change event
        this.onConfigurationChanged(previousConfig);
      }
    });

    this.context.subscriptions.push(this.configurationChangeListener);
  }

  /**
   * Handle configuration changes with event emission
   */
  private onConfigurationChanged(previousConfig?: WorkspaceConfiguration): void {
    // Show notification if enabled
    if (this.currentUserConfig?.notificationLevel === 'all') {
      vscode.window.showInformationMessage('README to CI/CD configuration updated');
    }

    // Determine what changed
    const changes: Record<string, any> = {};
    if (previousConfig && this.currentWorkspaceConfig) {
      for (const [key, value] of Object.entries(this.currentWorkspaceConfig)) {
        if (JSON.stringify(value) !== JSON.stringify(previousConfig[key as keyof WorkspaceConfiguration])) {
          changes[key] = value;
        }
      }
    }

    // Emit configuration change event
    const changeEvent: ConfigurationChangeEvent = {
      scope: 'workspace',
      changes,
      timestamp: new Date()
    };

    this.emit('configurationChanged', changeEvent);
    console.log('Configuration change processed:', changeEvent);
  }

  /**
   * Get workspace configuration
   */
  getWorkspaceConfiguration(): WorkspaceConfiguration {
    if (!this.currentWorkspaceConfig) {
      throw new Error('Settings manager not initialized');
    }
    return { ...this.currentWorkspaceConfig };
  }

  /**
   * Get user configuration
   */
  getUserConfiguration(): UserConfiguration {
    if (!this.currentUserConfig) {
      throw new Error('Settings manager not initialized');
    }
    return { ...this.currentUserConfig };
  }

  /**
   * Update workspace configuration
   */
  async updateWorkspaceConfiguration(updates: Partial<WorkspaceConfiguration>): Promise<void> {
    const config = vscode.workspace.getConfiguration(SettingsManager.EXTENSION_ID);

    for (const [key, value] of Object.entries(updates)) {
      await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }

    // Reload configuration
    await this.loadConfiguration();
  }

  /**
   * Update user configuration
   */
  async updateUserConfiguration(updates: Partial<UserConfiguration>): Promise<void> {
    const config = vscode.workspace.getConfiguration(SettingsManager.EXTENSION_ID);

    for (const [key, value] of Object.entries(updates)) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    // Reload configuration
    await this.loadConfiguration();
  }

  /**
   * Get extension state from workspace storage
   */
  getExtensionState(): ExtensionState {
    const state = this.context.workspaceState.get<ExtensionState>('extensionState', {
      recentWorkflows: [],
      userPreferences: {}
    });

    return state;
  }

  /**
   * Update extension state in workspace storage
   */
  async updateExtensionState(updates: Partial<ExtensionState>): Promise<void> {
    const currentState = this.getExtensionState();
    const newState = { ...currentState, ...updates };
    
    await this.context.workspaceState.update('extensionState', newState);
    console.log('Extension state updated:', updates);
  }

  /**
   * Get global extension state from global storage
   */
  getGlobalState(): Record<string, any> {
    return this.context.globalState.get('globalState', {});
  }

  /**
   * Update global extension state
   */
  async updateGlobalState(key: string, value: any): Promise<void> {
    const currentState = this.getGlobalState();
    currentState[key] = value;
    
    await this.context.globalState.update('globalState', currentState);
    console.log(`Global state updated: ${key} = ${value}`);
  }

  /**
   * Clear workspace state
   */
  async clearWorkspaceState(): Promise<void> {
    await this.context.workspaceState.update('extensionState', undefined);
    console.log('Workspace state cleared');
  }

  /**
   * Clear global state
   */
  async clearGlobalState(): Promise<void> {
    await this.context.globalState.update('globalState', undefined);
    console.log('Global state cleared');
  }

  /**
   * Get configuration value with fallback
   */
  getConfigurationValue<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration(SettingsManager.EXTENSION_ID);
    return config.get(key, defaultValue);
  }

  /**
   * Check if auto-generation is enabled
   */
  isAutoGenerationEnabled(): boolean {
    return this.currentWorkspaceConfig?.enableAutoGeneration ?? false;
  }

  /**
   * Check if preview should be shown by default
   */
  shouldShowPreviewByDefault(): boolean {
    return this.currentUserConfig?.showPreviewByDefault ?? true;
  }

  /**
   * Check if inline validation is enabled
   */
  isInlineValidationEnabled(): boolean {
    return this.currentWorkspaceConfig?.enableInlineValidation ?? true;
  }

  /**
   * Get notification level
   */
  getNotificationLevel(): 'all' | 'errors' | 'none' {
    return this.currentUserConfig?.notificationLevel ?? 'all';
  }

  /**
   * Add recent workflow to state
   */
  async addRecentWorkflow(workflowPath: string): Promise<void> {
    const state = this.getExtensionState();
    const recentWorkflows = state.recentWorkflows || [];
    
    // Add to beginning and limit to 10 items
    const updatedWorkflows = [workflowPath, ...recentWorkflows.filter(w => w !== workflowPath)].slice(0, 10);
    
    await this.updateExtensionState({
      recentWorkflows: updatedWorkflows,
      lastGenerationTime: Date.now()
    });
  }

  /**
   * Get recent workflows
   */
  getRecentWorkflows(): string[] {
    const state = this.getExtensionState();
    return state.recentWorkflows || [];
  }

  // Configuration Validation Methods

  /**
   * Validate current configuration against organization policies
   */
  async validateConfiguration(): Promise<ConfigurationValidationResult> {
    const errors: ConfigurationError[] = [];
    const warnings: ConfigurationWarning[] = [];

    if (!this.currentWorkspaceConfig || !this.currentUserConfig) {
      errors.push({
        key: 'initialization',
        message: 'Configuration not properly initialized',
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate workspace configuration
    this.validateWorkspaceConfig(this.currentWorkspaceConfig, errors, warnings);

    // Validate user configuration
    this.validateUserConfig(this.currentUserConfig, errors, warnings);

    // Validate against organization policies
    if (this.organizationPolicies) {
      this.validateAgainstPolicies(this.currentWorkspaceConfig, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate workspace configuration
   */
  private validateWorkspaceConfig(
    config: WorkspaceConfiguration, 
    errors: ConfigurationError[], 
    warnings: ConfigurationWarning[]
  ): void {
    // Validate output directory
    if (!config.defaultOutputDirectory || config.defaultOutputDirectory.trim() === '') {
      errors.push({
        key: 'defaultOutputDirectory',
        message: 'Default output directory cannot be empty',
        severity: 'error',
        suggestion: 'Set to ".github/workflows" or another valid path'
      });
    }

    // Validate workflow types
    if (!config.preferredWorkflowTypes || config.preferredWorkflowTypes.length === 0) {
      warnings.push({
        key: 'preferredWorkflowTypes',
        message: 'No preferred workflow types configured',
        suggestion: 'Consider adding at least "ci" workflow type'
      });
    }

    // Validate custom templates
    if (config.customTemplates) {
      for (const template of config.customTemplates) {
        if (!template || template.trim() === '') {
          warnings.push({
            key: 'customTemplates',
            message: 'Empty custom template path found',
            suggestion: 'Remove empty template paths or provide valid paths'
          });
        }
      }
    }

    // Validate Git integration settings
    if (config.gitIntegration) {
      if (config.gitIntegration.autoCommit && !config.gitIntegration.commitMessage) {
        errors.push({
          key: 'gitIntegration.commitMessage',
          message: 'Commit message required when auto-commit is enabled',
          severity: 'error',
          suggestion: 'Provide a commit message template'
        });
      }

      if (config.gitIntegration.createPR && !config.gitIntegration.branchName) {
        warnings.push({
          key: 'gitIntegration.branchName',
          message: 'Branch name recommended when creating PRs',
          suggestion: 'Specify a branch naming pattern'
        });
      }
    }
  }

  /**
   * Validate user configuration
   */
  private validateUserConfig(
    config: UserConfiguration, 
    errors: ConfigurationError[], 
    warnings: ConfigurationWarning[]
  ): void {
    // Validate notification level
    const validNotificationLevels = ['all', 'errors', 'none'];
    if (!validNotificationLevels.includes(config.notificationLevel)) {
      errors.push({
        key: 'notificationLevel',
        message: `Invalid notification level: ${config.notificationLevel}`,
        severity: 'error',
        suggestion: `Must be one of: ${validNotificationLevels.join(', ')}`
      });
    }

    // Validate theme
    const validThemes = ['light', 'dark', 'auto'];
    if (!validThemes.includes(config.preferredTheme)) {
      errors.push({
        key: 'preferredTheme',
        message: `Invalid theme: ${config.preferredTheme}`,
        severity: 'error',
        suggestion: `Must be one of: ${validThemes.join(', ')}`
      });
    }
  }

  /**
   * Validate configuration against organization policies
   */
  private validateAgainstPolicies(
    config: WorkspaceConfiguration, 
    errors: ConfigurationError[], 
    warnings: ConfigurationWarning[]
  ): void {
    if (!this.organizationPolicies) return;

    const policies = this.organizationPolicies;

    // Check required workflow types
    if (policies.requiredWorkflowTypes && policies.requiredWorkflowTypes.length > 0) {
      const missingTypes = policies.requiredWorkflowTypes.filter(
        type => !config.preferredWorkflowTypes.includes(type)
      );
      
      if (missingTypes.length > 0) {
        errors.push({
          key: 'preferredWorkflowTypes',
          message: `Organization requires workflow types: ${missingTypes.join(', ')}`,
          severity: 'error',
          suggestion: 'Add required workflow types to your configuration'
        });
      }
    }

    // Check custom templates policy
    if (!policies.allowCustomTemplates && config.customTemplates.length > 0) {
      errors.push({
        key: 'customTemplates',
        message: 'Organization policy prohibits custom templates',
        severity: 'error',
        suggestion: 'Remove custom templates or contact your administrator'
      });
    }

    // Check security scanning requirement
    if (policies.requiredSecurityScanning && !config.preferredWorkflowTypes.includes('security')) {
      warnings.push({
        key: 'preferredWorkflowTypes',
        message: 'Organization recommends including security workflows',
        suggestion: 'Add "security" to your preferred workflow types'
      });
    }

    // Check naming conventions
    if (policies.enforceNamingConventions && policies.namingPattern) {
      // This would be validated during workflow generation
      // For now, just add a warning if the pattern exists
      warnings.push({
        key: 'namingConventions',
        message: `Organization enforces naming pattern: ${policies.namingPattern}`,
        suggestion: 'Ensure generated workflows follow the naming convention'
      });
    }
  }

  // Organization Policy Methods

  /**
   * Load organization policies from workspace or global settings
   */
  private async loadOrganizationPolicies(): Promise<void> {
    try {
      // First try to load from workspace settings
      const workspaceConfig = vscode.workspace.getConfiguration(SettingsManager.EXTENSION_ID);
      let policies = workspaceConfig.get<OrganizationPolicies>(SettingsManager.ORGANIZATION_POLICIES_KEY);

      // If not found in workspace, try global settings
      if (!policies) {
        const globalConfig = vscode.workspace.getConfiguration(SettingsManager.EXTENSION_ID, null);
        policies = globalConfig.get<OrganizationPolicies>(SettingsManager.ORGANIZATION_POLICIES_KEY);
      }

      // If still not found, try to load from a .vscode/settings.json file
      if (!policies) {
        policies = await this.loadPoliciesFromFile();
      }

      this.organizationPolicies = policies;
      
      if (policies) {
        console.log('Organization policies loaded:', policies);
      } else {
        console.log('No organization policies found');
      }
    } catch (error) {
      console.warn('Failed to load organization policies:', error);
      // Don't throw - policies are optional
    }
  }

  /**
   * Load policies from .vscode/settings.json or similar configuration files
   */
  private async loadPoliciesFromFile(): Promise<OrganizationPolicies | undefined> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
      }

      const settingsUri = vscode.Uri.joinPath(workspaceFolders[0].uri, '.vscode', 'settings.json');
      
      try {
        const settingsContent = await vscode.workspace.fs.readFile(settingsUri);
        const settingsText = Buffer.from(settingsContent).toString('utf8');
        const settings = JSON.parse(settingsText);
        
        const policyKey = `${SettingsManager.EXTENSION_ID}.${SettingsManager.ORGANIZATION_POLICIES_KEY}`;
        return settings[policyKey];
      } catch (fileError) {
        // File doesn't exist or can't be read - this is normal
        return undefined;
      }
    } catch (error) {
      console.warn('Error loading policies from file:', error);
      return undefined;
    }
  }

  /**
   * Get organization policies
   */
  getOrganizationPolicies(): OrganizationPolicies | undefined {
    return this.organizationPolicies ? { ...this.organizationPolicies } : undefined;
  }

  /**
   * Check if organization policies are enforced
   */
  hasOrganizationPolicies(): boolean {
    return this.organizationPolicies !== undefined;
  }

  /**
   * Validate a configuration change against organization policies
   */
  async validateConfigurationChange(
    key: string, 
    value: any, 
    scope: 'workspace' | 'user'
  ): Promise<ConfigurationValidationResult> {
    const errors: ConfigurationError[] = [];
    const warnings: ConfigurationWarning[] = [];

    // Create a temporary configuration with the change
    const tempConfig = scope === 'workspace' 
      ? { ...this.currentWorkspaceConfig!, [key]: value }
      : this.currentWorkspaceConfig!;

    // Validate against policies if they exist
    if (this.organizationPolicies && scope === 'workspace') {
      this.validateAgainstPolicies(tempConfig, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Configuration Validation Helper Methods

  /**
   * Validate and get string configuration value
   */
  private validateAndGetString(config: vscode.WorkspaceConfiguration, key: string, defaultValue: string): string {
    const value = config.get<string>(key, defaultValue);
    return typeof value === 'string' ? value.trim() : defaultValue;
  }

  /**
   * Validate workflow types array
   */
  private validateWorkflowTypes(types: any): WorkflowType[] {
    if (!Array.isArray(types)) {
      return this.defaultWorkspaceConfig.preferredWorkflowTypes;
    }

    const validTypes: WorkflowType[] = ['ci', 'cd', 'release', 'security', 'performance', 'maintenance'];
    const filteredTypes = types.filter((type: any) => 
      typeof type === 'string' && validTypes.includes(type as WorkflowType)
    ) as WorkflowType[];

    return filteredTypes.length > 0 ? filteredTypes : this.defaultWorkspaceConfig.preferredWorkflowTypes;
  }

  /**
   * Validate string array
   */
  private validateStringArray(arr: any): string[] {
    if (!Array.isArray(arr)) {
      return [];
    }

    return arr.filter((item: any) => typeof item === 'string' && item.trim() !== '');
  }

  /**
   * Validate notification level
   */
  private validateNotificationLevel(level: any): 'all' | 'errors' | 'none' {
    const validLevels = ['all', 'errors', 'none'];
    return validLevels.includes(level) ? level : this.defaultUserConfig.notificationLevel;
  }

  /**
   * Validate theme
   */
  private validateTheme(theme: any): 'light' | 'dark' | 'auto' {
    const validThemes = ['light', 'dark', 'auto'];
    return validThemes.includes(theme) ? theme : this.defaultUserConfig.preferredTheme;
  }

  /**
   * Load Git integration settings with validation
   */
  private loadGitIntegrationSettings(config: vscode.WorkspaceConfiguration): GitIntegrationSettings {
    const gitConfig = config.get<any>('gitIntegration', {});
    
    return {
      autoCommit: typeof gitConfig.autoCommit === 'boolean' 
        ? gitConfig.autoCommit 
        : this.defaultWorkspaceConfig.gitIntegration.autoCommit,
      commitMessage: typeof gitConfig.commitMessage === 'string' 
        ? gitConfig.commitMessage 
        : this.defaultWorkspaceConfig.gitIntegration.commitMessage,
      createPR: typeof gitConfig.createPR === 'boolean' 
        ? gitConfig.createPR 
        : this.defaultWorkspaceConfig.gitIntegration.createPR,
      branchName: typeof gitConfig.branchName === 'string' 
        ? gitConfig.branchName 
        : undefined
    };
  }

  /**
   * Show configuration help for validation errors
   */
  private async showConfigurationHelp(error: ConfigurationError): Promise<void> {
    const message = `Configuration Issue: ${error.message}`;
    const suggestion = error.suggestion ? `\n\nSuggestion: ${error.suggestion}` : '';
    
    const action = await vscode.window.showInformationMessage(
      message + suggestion,
      'Open Settings',
      'Dismiss'
    );

    if (action === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${SettingsManager.EXTENSION_ID}`);
    }
  }

  // Enhanced Configuration Methods

  /**
   * Get configuration with validation
   */
  async getValidatedConfiguration(): Promise<{
    workspace: WorkspaceConfiguration;
    user: UserConfiguration;
    validation: ConfigurationValidationResult;
  }> {
    const validation = await this.validateConfiguration();
    
    return {
      workspace: this.getWorkspaceConfiguration(),
      user: this.getUserConfiguration(),
      validation
    };
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(scope: 'workspace' | 'user' | 'both' = 'both'): Promise<void> {
    const config = vscode.workspace.getConfiguration(SettingsManager.EXTENSION_ID);

    if (scope === 'workspace' || scope === 'both') {
      for (const [key, value] of Object.entries(this.defaultWorkspaceConfig)) {
        await config.update(key, value, vscode.ConfigurationTarget.Workspace);
      }
    }

    if (scope === 'user' || scope === 'both') {
      for (const [key, value] of Object.entries(this.defaultUserConfig)) {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
    }

    await this.loadConfiguration();
    console.log(`Configuration reset to defaults (scope: ${scope})`);
  }

  /**
   * Export configuration for sharing
   */
  exportConfiguration(): {
    workspace: WorkspaceConfiguration;
    user: UserConfiguration;
    exportedAt: Date;
  } {
    return {
      workspace: this.getWorkspaceConfiguration(),
      user: this.getUserConfiguration(),
      exportedAt: new Date()
    };
  }

  /**
   * Import configuration from exported data
   */
  async importConfiguration(
    configData: { workspace?: Partial<WorkspaceConfiguration>; user?: Partial<UserConfiguration> },
    scope: 'workspace' | 'user' | 'both' = 'both'
  ): Promise<ConfigurationValidationResult> {
    // Validate imported configuration first
    const tempWorkspaceConfig = { ...this.currentWorkspaceConfig!, ...configData.workspace };
    const tempUserConfig = { ...this.currentUserConfig!, ...configData.user };

    const errors: ConfigurationError[] = [];
    const warnings: ConfigurationWarning[] = [];

    if (scope === 'workspace' || scope === 'both') {
      this.validateWorkspaceConfig(tempWorkspaceConfig, errors, warnings);
      if (this.organizationPolicies) {
        this.validateAgainstPolicies(tempWorkspaceConfig, errors, warnings);
      }
    }

    if (scope === 'user' || scope === 'both') {
      this.validateUserConfig(tempUserConfig, errors, warnings);
    }

    // If validation passes, apply the configuration
    if (errors.length === 0) {
      if (configData.workspace && (scope === 'workspace' || scope === 'both')) {
        await this.updateWorkspaceConfiguration(configData.workspace);
      }

      if (configData.user && (scope === 'user' || scope === 'both')) {
        await this.updateUserConfiguration(configData.user);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}