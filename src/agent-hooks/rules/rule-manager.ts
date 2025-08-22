import {
  AutomationRule,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleConflict,
  RuleValidationResult,
  RuleTemplate,
  RuleExecutionHistory,
  RuleMetrics,
  RuleAlert
} from '../types/rules';
import { RuleEngine } from './rule-engine';
import { RepositoryInfo, WebhookEvent, RepositoryChanges } from '../types';

export class RuleManager {
  private ruleEngine: RuleEngine;
  private executionHistory: Map<string, RuleExecutionHistory[]> = new Map();
  private ruleMetrics: Map<string, RuleMetrics> = new Map();
  private alerts: RuleAlert[] = [];

  constructor() {
    this.ruleEngine = new RuleEngine();
  }

  /**
   * Create a new automation rule
   */
  createRule(ruleData: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): AutomationRule {
    const rule: AutomationRule = {
      ...ruleData,
      id: this.generateRuleId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate the rule
    const validation = this.validateRule(rule);
    if (!validation.valid) {
      throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
    }

    this.ruleEngine.addRule(rule);
    this.initializeRuleMetrics(rule.id);

    return rule;
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<AutomationRule>): AutomationRule | null {
    const existingRule = this.ruleEngine.getRule(ruleId);
    if (!existingRule) {
      return null;
    }

    const updatedRule: AutomationRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date()
    };

    // Validate the updated rule
    const validation = this.validateRule(updatedRule);
    if (!validation.valid) {
      throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
    }

    this.ruleEngine.addRule(updatedRule);
    return updatedRule;
  }

  /**
   * Delete a rule
   */
  deleteRule(ruleId: string): boolean {
    const removed = this.ruleEngine.removeRule(ruleId);
    if (removed) {
      this.executionHistory.delete(ruleId);
      this.ruleMetrics.delete(ruleId);
    }
    return removed;
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    return this.ruleEngine.setRuleEnabled(ruleId, enabled);
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AutomationRule | undefined {
    return this.ruleEngine.getRule(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): AutomationRule[] {
    return this.ruleEngine.getAllRules();
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): AutomationRule[] {
    return this.getAllRules().filter(rule =>
      rule.tags?.includes(category) ||
      rule.actions.some(action => action.type.includes(category))
    );
  }

  /**
   * Evaluate rules against context
   */
  async evaluateRules(context: RuleEvaluationContext): Promise<RuleEvaluationResult[]> {
    const results = await this.ruleEngine.evaluateRules(context);

    // Record execution history and metrics
    for (const result of results) {
      this.recordRuleExecution(result, context);
    }

    // Check for conflicts
    const conflicts = this.detectConflicts(results);
    if (conflicts.length > 0) {
      await this.handleConflicts(conflicts, results);
    }

    return results;
  }

  /**
   * Process webhook event through rules
   */
  async processWebhookEvent(event: WebhookEvent): Promise<RuleEvaluationResult[]> {
    const context: RuleEvaluationContext = {
      webhookEvent: event,
      repository: event.repository,
      timestamp: new Date(),
      rule: {} as AutomationRule // Will be filled by engine
    };

    return this.evaluateRules(context);
  }

  /**
   * Process repository changes through rules
   */
  async processRepositoryChanges(
    repository: RepositoryInfo,
    changes: RepositoryChanges
  ): Promise<RuleEvaluationResult[]> {
    const context: RuleEvaluationContext = {
      repository,
      changes,
      timestamp: new Date(),
      rule: {} as AutomationRule // Will be filled by engine
    };

    return this.evaluateRules(context);
  }

  /**
   * Create rule from template
   */
  createRuleFromTemplate(
    template: RuleTemplate,
    customizations: Partial<AutomationRule> = {}
  ): AutomationRule {
    const ruleData: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'> = {
      name: template.name,
      description: template.description,
      enabled: true,
      priority: 5,
      triggers: template.triggers,
      conditions: template.conditions,
      actions: template.actions,
      tags: template.tags,
      ...customizations
    };

    return this.createRule(ruleData);
  }

  /**
   * Get rule templates
   */
  getRuleTemplates(): RuleTemplate[] {
    return [
      this.getSecurityVulnerabilityTemplate(),
      this.getPerformanceOptimizationTemplate(),
      this.getDependencyUpdateTemplate(),
      this.getCodeQualityTemplate()
    ];
  }

  /**
   * Validate rule
   */
  validateRule(rule: AutomationRule): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.triggers.length) errors.push('At least one trigger is required');
    if (!rule.conditions.length) errors.push('At least one condition is required');
    if (!rule.actions.length) errors.push('At least one action is required');

    // Priority validation
    if (rule.priority < 1 || rule.priority > 10) {
      errors.push('Priority must be between 1 and 10');
    }

    // Trigger validation
    for (const trigger of rule.triggers) {
      if (!trigger.type) {
        errors.push('Trigger type is required');
      }
    }

    // Condition validation
    for (const condition of rule.conditions) {
      if (!condition.type || !condition.operator) {
        errors.push('Condition type and operator are required');
      }
    }

    // Action validation
    for (const action of rule.actions) {
      if (!action.type) {
        errors.push('Action type is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get rule metrics
   */
  getRuleMetrics(ruleId: string): RuleMetrics | undefined {
    return this.ruleMetrics.get(ruleId);
  }

  /**
   * Get all rule metrics
   */
  getAllRuleMetrics(): RuleMetrics[] {
    return Array.from(this.ruleMetrics.values());
  }

  /**
   * Get execution history for rule
   */
  getRuleExecutionHistory(ruleId: string): RuleExecutionHistory[] {
    return this.executionHistory.get(ruleId) || [];
  }

  /**
   * Get alerts
   */
  getAlerts(severity?: 'low' | 'medium' | 'high' | 'critical'): RuleAlert[] {
    if (!severity) return this.alerts;
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, user: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = user;
      alert.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }

  // Private methods

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeRuleMetrics(ruleId: string): void {
    this.ruleMetrics.set(ruleId, {
      ruleId,
      executions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      triggers: 0,
      falsePositives: 0,
      truePositives: 0,
      precision: 0,
      recall: 0
    });
  }

  private recordRuleExecution(result: RuleEvaluationResult, context: RuleEvaluationContext): void {
    const history: RuleExecutionHistory = {
      ruleId: result.rule.id,
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      context,
      result,
      duration: 0, // Would be calculated from actual execution time
      success: result.triggered && result.conditionsMet && result.actions.every(a => a.success)
    };

    // Add to history
    if (!this.executionHistory.has(result.rule.id)) {
      this.executionHistory.set(result.rule.id, []);
    }
    this.executionHistory.get(result.rule.id)!.push(history);

    // Update metrics
    this.updateRuleMetrics(result.rule.id, history);
  }

  private updateRuleMetrics(ruleId: string, history: RuleExecutionHistory): void {
    const metrics = this.ruleMetrics.get(ruleId);
    if (!metrics) return;

    metrics.executions++;
    if (history.success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    metrics.lastExecuted = history.timestamp;

    // Calculate average execution time
    const totalTime = metrics.averageExecutionTime * (metrics.executions - 1) + history.duration;
    metrics.averageExecutionTime = totalTime / metrics.executions;
  }

  private detectConflicts(results: RuleEvaluationResult[]): RuleConflict[] {
    const conflicts: RuleConflict[] = [];
    const triggeredRules = results.filter(r => r.triggered);

    // Check for conflicting actions
    const actionConflicts = this.detectActionConflicts(triggeredRules);
    conflicts.push(...actionConflicts);

    // Check for priority conflicts
    const priorityConflicts = this.detectPriorityConflicts(triggeredRules);
    conflicts.push(...priorityConflicts);

    return conflicts;
  }

  private detectActionConflicts(triggeredRules: RuleEvaluationResult[]): RuleConflict[] {
    const conflicts: RuleConflict[] = [];
    const actionsByType = new Map<string, RuleEvaluationResult[]>();

    // Group rules by action types
    for (const result of triggeredRules) {
      for (const action of result.actions) {
        const key = action.action.type;
        if (!actionsByType.has(key)) {
          actionsByType.set(key, []);
        }
        actionsByType.get(key)!.push(result);
      }
    }

    // Check for conflicts in each action type
    for (const [actionType, rules] of actionsByType.entries()) {
      if (rules.length > 1 && this.isConflictingActionType(actionType)) {
        conflicts.push({
          conflictingRules: rules.map(r => r.rule),
          conflictType: 'action',
          resolution: 'highest_priority',
          description: `Multiple rules want to execute ${actionType} action`
        });
      }
    }

    return conflicts;
  }

  private detectPriorityConflicts(triggeredRules: RuleEvaluationResult[]): RuleConflict[] {
    // Simple priority-based conflict detection
    const highPriorityRules = triggeredRules.filter(r => r.rule.priority >= 8);
    if (highPriorityRules.length > 1) {
      return [{
        conflictingRules: highPriorityRules.map(r => r.rule),
        conflictType: 'priority',
        resolution: 'highest_priority',
        description: 'Multiple high-priority rules triggered'
      }];
    }
    return [];
  }

  private isConflictingActionType(actionType: string): boolean {
    // Define which action types can conflict
    const conflictingTypes = ['create_pr', 'trigger_deployment', 'security_scan'];
    return conflictingTypes.includes(actionType);
  }

  private async handleConflicts(conflicts: RuleConflict[], results: RuleEvaluationResult[]): Promise<void> {
    for (const conflict of conflicts) {
      console.warn(`Rule conflict detected: ${conflict.description}`);

      // For now, just log conflicts
      // In a full implementation, this would apply the resolution strategy
      await this.createConflictAlert(conflict);
    }
  }

  private async createConflictAlert(conflict: RuleConflict): Promise<void> {
    const firstRule = conflict.conflictingRules[0];
    if (!firstRule) return;

    const alert: RuleAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: firstRule.id,
      severity: 'medium',
      message: `Rule conflict: ${conflict.description}`,
      context: {} as RuleEvaluationContext, // Would contain relevant context
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
  }

  // Template methods

  private getSecurityVulnerabilityTemplate(): RuleTemplate {
    return {
      id: 'security-vulnerability',
      name: 'Security Vulnerability Response',
      description: 'Automatically respond to security vulnerabilities',
      category: 'security',
      tags: ['security', 'automated'],
      triggers: [
        { type: 'security_alert', debounceMs: 300000 }
      ],
      conditions: [
        { type: 'security_vulnerability', operator: 'greater_than', value: 0 }
      ],
      actions: [
        {
          type: 'create_issue',
          parameters: {
            title: 'Security Vulnerabilities Detected',
            body: 'Security scan detected vulnerabilities requiring attention.'
          },
          approvalRequired: false,
          notificationChannels: ['slack']
        }
      ]
    };
  }

  private getPerformanceOptimizationTemplate(): RuleTemplate {
    return {
      id: 'performance-optimization',
      name: 'Performance Optimization',
      description: 'Trigger optimizations when performance degrades',
      category: 'performance',
      tags: ['performance', 'optimization'],
      triggers: [
        { type: 'performance_threshold', threshold: 50 }
      ],
      conditions: [
        { type: 'performance_metric', operator: 'less_than', value: 50, field: 'score' }
      ],
      actions: [
        {
          type: 'run_analysis',
          parameters: { analysisType: 'performance' },
          approvalRequired: true
        }
      ]
    };
  }

  private getDependencyUpdateTemplate(): RuleTemplate {
    return {
      id: 'dependency-update',
      name: 'Dependency Update Response',
      description: 'Handle dependency updates and breaking changes',
      category: 'quality',
      tags: ['dependencies', 'maintenance'],
      triggers: [
        { type: 'repository_change', changeType: 'dependency' }
      ],
      conditions: [
        { type: 'dependency_version', operator: 'contains', value: 'breaking' }
      ],
      actions: [
        {
          type: 'create_pr',
          parameters: {
            title: 'Dependency Updates',
            body: 'Breaking dependency changes detected.'
          },
          approvalRequired: true
        }
      ]
    };
  }

  private getCodeQualityTemplate(): RuleTemplate {
    return {
      id: 'code-quality',
      name: 'Code Quality Enforcement',
      description: 'Enforce code quality standards',
      category: 'quality',
      tags: ['quality', 'testing'],
      triggers: [
        { type: 'webhook_event', eventType: 'push' }
      ],
      conditions: [
        { type: 'file_contains', operator: 'contains', value: '.js', field: 'path' }
      ],
      actions: [
        {
          type: 'run_analysis',
          parameters: { analysisType: 'linting' },
          approvalRequired: false
        }
      ]
    };
  }
}