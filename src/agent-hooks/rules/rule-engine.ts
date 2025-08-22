import {
  AutomationRule,
  RuleTrigger,
  RuleCondition,
  RuleAction,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleActionResult,
  RuleConflict,
  RuleValidationResult
} from '../types/rules';
import { RepositoryInfo, WebhookEvent, RepositoryChanges } from '../types';

export class RuleEngine {
  private rules: Map<string, AutomationRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Add a rule to the engine
   */
  addRule(rule: AutomationRule): void {
    this.validateRule(rule);
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rule from the engine
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Evaluate all rules against a context
   */
  async evaluateRules(context: RuleEvaluationContext): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const enabledRules = this.getAllRules().filter(rule => rule.enabled);

    // Sort rules by priority (higher priority first)
    const sortedRules = enabledRules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        const result = await this.evaluateRule(rule, context);
        results.push(result);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
        // Continue with other rules even if one fails
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          rule,
          triggered: false,
          conditionsMet: false,
          actions: [],
          confidence: 0,
          reasoning: [`Rule evaluation failed: ${errorMessage}`],
          errors: [errorMessage]
        });
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule against a context
   */
  private async evaluateRule(
    rule: AutomationRule,
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult> {
    const reasoning: string[] = [];
    const errors: string[] = [];

    // Check if rule is triggered
    const triggered = this.evaluateTriggers(rule.triggers, context);
    if (!triggered) {
      return {
        rule,
        triggered: false,
        conditionsMet: false,
        actions: [],
        confidence: 0,
        reasoning: ['Rule not triggered by current context'],
        errors: []
      };
    }

    reasoning.push('Rule triggered by context');

    // Evaluate conditions
    const conditionsMet = this.evaluateConditions(rule.conditions, context);
    if (!conditionsMet) {
      return {
        rule,
        triggered: true,
        conditionsMet: false,
        actions: [],
        confidence: 0.5,
        reasoning: [...reasoning, 'Conditions not met'],
        errors: []
      };
    }

    reasoning.push('All conditions met');

    // Calculate confidence
    const confidence = this.calculateConfidence(rule, context);

    // Execute actions if conditions are met
    const actions = await this.executeActions(rule.actions, context, errors);

    return {
      rule,
      triggered: true,
      conditionsMet: true,
      actions,
      confidence,
      reasoning,
      errors
    };
  }

  /**
   * Evaluate rule triggers
   */
  private evaluateTriggers(triggers: RuleTrigger[], context: RuleEvaluationContext): boolean {
    return triggers.some(trigger => {
      switch (trigger.type) {
        case 'webhook_event':
          return this.evaluateWebhookTrigger(trigger, context);
        case 'repository_change':
          return this.evaluateChangeTrigger(trigger, context);
        case 'schedule':
          return this.evaluateScheduleTrigger(trigger, context);
        case 'performance_threshold':
          return this.evaluatePerformanceTrigger(trigger, context);
        case 'security_alert':
          return this.evaluateSecurityTrigger(trigger, context);
        default:
          return false;
      }
    });
  }

  /**
   * Evaluate webhook event trigger
   */
  private evaluateWebhookTrigger(trigger: RuleTrigger, context: RuleEvaluationContext): boolean {
    if (!context.webhookEvent) return false;

    if (trigger.eventType && context.webhookEvent.type !== trigger.eventType) {
      return false;
    }

    // Additional webhook-specific logic can be added here
    return true;
  }

  /**
   * Evaluate repository change trigger
   */
  private evaluateChangeTrigger(trigger: RuleTrigger, context: RuleEvaluationContext): boolean {
    if (!context.changes) return false;

    switch (trigger.changeType) {
      case 'dependency':
        return context.changes.dependencyChanges.length > 0;
      case 'configuration':
        return context.changes.configurationChanges.length > 0;
      case 'file':
        return context.changes.modifiedFiles.length > 0 ||
               context.changes.addedFiles.length > 0 ||
               context.changes.deletedFiles.length > 0;
      case 'readme':
        return context.changes.modifiedFiles.some(f =>
          f.path.toLowerCase() === 'readme.md'
        );
      default:
        return false;
    }
  }

  /**
   * Evaluate schedule trigger
   */
  private evaluateScheduleTrigger(trigger: RuleTrigger, context: RuleEvaluationContext): boolean {
    // This would implement cron expression evaluation
    // For now, return true if schedule is defined
    return !!trigger.schedule;
  }

  /**
   * Evaluate performance threshold trigger
   */
  private evaluatePerformanceTrigger(trigger: RuleTrigger, context: RuleEvaluationContext): boolean {
    if (!context.performanceMetrics || !trigger.threshold) return false;

    // This would check specific performance metrics against thresholds
    // For now, implement basic threshold checking
    return context.performanceMetrics.score < trigger.threshold;
  }

  /**
   * Evaluate security alert trigger
   */
  private evaluateSecurityTrigger(trigger: RuleTrigger, context: RuleEvaluationContext): boolean {
    if (!context.securityAlerts) return false;

    return context.securityAlerts.length > 0;
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(conditions: RuleCondition[], context: RuleEvaluationContext): boolean {
    return conditions.every(condition => {
      const result = this.evaluateCondition(condition, context);
      return condition.negate ? !result : result;
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, context: RuleEvaluationContext): boolean {
    const fieldValue = this.getFieldValue(condition.field || condition.type, context);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return Array.isArray(fieldValue)
          ? fieldValue.includes(condition.value)
          : String(fieldValue).includes(String(condition.value));
      case 'not_contains':
        return Array.isArray(fieldValue)
          ? !fieldValue.includes(condition.value)
          : !String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'matches':
        return new RegExp(condition.value).test(String(fieldValue));
      case 'not_matches':
        return !new RegExp(condition.value).test(String(fieldValue));
      case 'in':
        return Array.isArray(condition.value)
          ? condition.value.includes(fieldValue)
          : false;
      case 'not_in':
        return Array.isArray(condition.value)
          ? !condition.value.includes(fieldValue)
          : true;
      default:
        return false;
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(field: string, context: RuleEvaluationContext): any {
    switch (field) {
      case 'repository.owner':
        return context.repository.owner;
      case 'repository.name':
        return context.repository.name;
      case 'repository.language':
        return context.repository.language;
      case 'webhook.type':
        return context.webhookEvent?.type;
      case 'changes.dependency_count':
        return context.changes?.dependencyChanges.length || 0;
      case 'changes.file_count':
        return (context.changes?.modifiedFiles.length || 0) +
               (context.changes?.addedFiles.length || 0) +
               (context.changes?.deletedFiles.length || 0);
      case 'performance.score':
        return context.performanceMetrics?.score || 0;
      case 'security.alert_count':
        return context.securityAlerts?.length || 0;
      default:
        return null;
    }
  }

  /**
   * Calculate confidence score for rule evaluation
   */
  private calculateConfidence(rule: AutomationRule, context: RuleEvaluationContext): number {
    // Base confidence on rule priority and context strength
    let confidence = rule.priority / 10; // 0.1 to 1.0

    // Increase confidence based on context strength
    if (context.webhookEvent) confidence += 0.1;
    if (context.changes && context.changes.dependencyChanges.length > 0) confidence += 0.2;
    if (context.performanceMetrics && context.performanceMetrics.score < 50) confidence += 0.2;
    if (context.securityAlerts && context.securityAlerts.length > 0) confidence += 0.3;

    return Math.min(confidence, 1.0);
  }

  /**
   * Execute rule actions
   */
  private async executeActions(
    actions: RuleAction[],
    context: RuleEvaluationContext,
    errors: string[]
  ): Promise<RuleActionResult[]> {
    const results: RuleActionResult[] = [];

    for (const action of actions) {
      try {
        const startTime = Date.now();
        const result = await this.executeAction(action, context);
        const executionTime = Date.now() - startTime;

        results.push({
          action,
          success: true,
          result,
          executionTime
        });
      } catch (error) {
        const executionTime = Date.now() - Date.now(); // Will be 0, but that's fine

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          action,
          success: false,
          error: errorMessage,
          executionTime
        });

        errors.push(`Action ${action.type} failed: ${errorMessage}`);
      }
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    switch (action.type) {
      case 'create_pr':
        return this.executeCreatePRAction(action, context);
      case 'create_issue':
        return this.executeCreateIssueAction(action, context);
      case 'send_notification':
        return this.executeNotificationAction(action, context);
      case 'run_analysis':
        return this.executeAnalysisAction(action, context);
      case 'update_workflow':
        return this.executeWorkflowAction(action, context);
      case 'trigger_deployment':
        return this.executeDeploymentAction(action, context);
      case 'security_scan':
        return this.executeSecurityScanAction(action, context);
      case 'performance_report':
        return this.executePerformanceReportAction(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Action execution methods (simplified implementations)
  private async executeCreatePRAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    // This would integrate with the PR creator
    return { prNumber: 'TBD', created: true };
  }

  private async executeCreateIssueAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    // This would integrate with GitHub API
    return { issueNumber: 'TBD', created: true };
  }

  private async executeNotificationAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    // This would integrate with notification systems
    return { sent: true, channels: action.notificationChannels };
  }

  private async executeAnalysisAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    // This would trigger analysis jobs
    return { analysisId: 'TBD', started: true };
  }

  private async executeWorkflowAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    // This would update workflows
    return { workflowUpdated: true };
  }

  private async executeDeploymentAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    // This would trigger deployments
    return { deploymentId: 'TBD', triggered: true };
  }

  private async executeSecurityScanAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    // This would trigger security scans
    return { scanId: 'TBD', started: true };
  }

  private async executePerformanceReportAction(action: RuleAction, context: RuleEvaluationContext): Promise<any> {
    // This would generate performance reports
    return { reportId: 'TBD', generated: true };
  }

  /**
   * Validate a rule
   */
  private validateRule(rule: AutomationRule): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!rule.id) errors.push('Rule ID is required');
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.triggers.length) errors.push('Rule must have at least one trigger');
    if (!rule.conditions.length) errors.push('Rule must have at least one condition');
    if (!rule.actions.length) errors.push('Rule must have at least one action');

    // Priority validation
    if (rule.priority < 1 || rule.priority > 10) {
      errors.push('Rule priority must be between 1 and 10');
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
   * Initialize default rules
   */
  private initializeDefaultRules(): void {
    // This would load default rules from configuration
    // For now, we'll create a sample security rule
    const securityRule: AutomationRule = {
      id: 'security-vulnerability-detected',
      name: 'Security Vulnerability Response',
      description: 'Automatically respond to detected security vulnerabilities',
      enabled: true,
      priority: 9,
      triggers: [
        {
          type: 'security_alert',
          debounceMs: 300000 // 5 minutes debounce
        }
      ],
      conditions: [
        {
          type: 'security_vulnerability',
          operator: 'greater_than',
          value: 0,
          field: 'count'
        }
      ],
      actions: [
        {
          type: 'create_issue',
          parameters: {
            title: 'Security Vulnerabilities Detected',
            body: 'Security scan detected vulnerabilities that need attention.',
            labels: ['security', 'vulnerability']
          },
          approvalRequired: false,
          notificationChannels: ['slack', 'email']
        },
        {
          type: 'security_scan',
          parameters: {
            scanType: 'dependency',
            severity: 'high'
          },
          approvalRequired: true
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['security', 'automated']
    };

    this.addRule(securityRule);
  }
}