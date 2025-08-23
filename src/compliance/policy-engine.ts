/**
 * PolicyEngine - Automated policy enforcement system
 * 
 * Implements and enforces organizational policies with automated
 * policy application and violation detection.
 */

import {
  Policy,
  PolicyRule,
  PolicyResult,
  PolicyException,
  AuditEvent
} from './types';
import { AuditTrailManager } from './audit-trail-manager';

export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();
  private auditManager: AuditTrailManager;
  private ruleEvaluators: Map<string, RuleEvaluator> = new Map();

  constructor(auditManager: AuditTrailManager) {
    this.auditManager = auditManager;
    this.initializeRuleEvaluators();
  }

  /**
   * Register a policy in the engine
   */
  async registerPolicy(policy: Policy): Promise<void> {
    // Validate policy structure
    this.validatePolicy(policy);
    
    // Store policy
    this.policies.set(policy.id, policy);
    
    // Log policy registration
    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: 'system',
      action: 'POLICY_REGISTERED',
      resource: policy.id,
      outcome: 'SUCCESS',
      details: {
        policyName: policy.name,
        version: policy.version,
        type: policy.type,
        rulesCount: policy.rules.length
      },
      ipAddress: 'localhost',
      userAgent: 'PolicyEngine',
      sessionId: 'system'
    });
  }

  /**
   * Enforce a policy against a request/context
   */
  async enforcePolicy(policy: Policy, context?: PolicyContext): Promise<PolicyResult> {
    try {
      // Check if policy is active
      if (policy.enforcement.mode === 'DISABLED') {
        return {
          policyId: policy.id,
          decision: 'ALLOW',
          reason: 'Policy is disabled',
          evidence: [],
          recommendations: []
        };
      }

      // Evaluate policy rules
      const ruleResults: RuleResult[] = [];
      
      for (const rule of policy.rules) {
        const result = await this.evaluateRule(rule, context);
        ruleResults.push(result);
        
        // If any rule denies, return deny (unless in permissive mode)
        if (result.decision === 'DENY' && policy.enforcement.mode === 'ENFORCING') {
          const policyResult: PolicyResult = {
            policyId: policy.id,
            decision: 'DENY',
            reason: result.reason,
            evidence: result.evidence,
            recommendations: this.generateRecommendations(policy, ruleResults)
          };

          await this.logPolicyEnforcement(policy, policyResult, context);
          return policyResult;
        }
      }

      // All rules passed or policy is in permissive mode
      const decision = policy.enforcement.mode === 'PERMISSIVE' ? 'WARN' : 'ALLOW';
      const policyResult: PolicyResult = {
        policyId: policy.id,
        decision,
        reason: 'All policy rules satisfied',
        evidence: ruleResults.flatMap(r => r.evidence),
        recommendations: this.generateRecommendations(policy, ruleResults)
      };

      await this.logPolicyEnforcement(policy, policyResult, context);
      return policyResult;

    } catch (error) {
      const policyResult: PolicyResult = {
        policyId: policy.id,
        decision: 'DENY',
        reason: `Policy evaluation failed: ${error.message}`,
        evidence: [],
        recommendations: ['Review policy configuration and system logs']
      };

      await this.logPolicyEnforcement(policy, policyResult, context, error);
      return policyResult;
    }
  }

  /**
   * Evaluate all applicable policies for a context
   */
  async evaluateAllPolicies(context: PolicyContext): Promise<PolicyResult[]> {
    const results: PolicyResult[] = [];
    
    for (const policy of this.policies.values()) {
      if (this.isPolicyApplicable(policy, context)) {
        const result = await this.enforcePolicy(policy, context);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * List all registered policies
   */
  listPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Update policy
   */
  async updatePolicy(policy: Policy): Promise<void> {
    this.validatePolicy(policy);
    
    const oldPolicy = this.policies.get(policy.id);
    this.policies.set(policy.id, policy);
    
    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: 'system',
      action: 'POLICY_UPDATED',
      resource: policy.id,
      outcome: 'SUCCESS',
      details: {
        oldVersion: oldPolicy?.version,
        newVersion: policy.version,
        changes: this.calculatePolicyChanges(oldPolicy, policy)
      },
      ipAddress: 'localhost',
      userAgent: 'PolicyEngine',
      sessionId: 'system'
    });
  }

  /**
   * Remove policy
   */
  async removePolicy(policyId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    if (policy) {
      this.policies.delete(policyId);
      
      await this.auditManager.logEvent({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        user: 'system',
        action: 'POLICY_REMOVED',
        resource: policyId,
        outcome: 'SUCCESS',
        details: {
          policyName: policy.name,
          version: policy.version
        },
        ipAddress: 'localhost',
        userAgent: 'PolicyEngine',
        sessionId: 'system'
      });
    }
  }

  /**
   * Check if policy exception applies
   */
  async checkPolicyException(
    policy: Policy,
    context: PolicyContext
  ): Promise<PolicyException | null> {
    for (const exception of policy.exceptions) {
      if (await this.isExceptionApplicable(exception, context)) {
        return exception;
      }
    }
    return null;
  }

  /**
   * Validate policy structure
   */
  private validatePolicy(policy: Policy): void {
    if (!policy.id || !policy.name || !policy.version) {
      throw new Error('Policy must have id, name, and version');
    }
    
    if (!policy.rules || policy.rules.length === 0) {
      throw new Error('Policy must have at least one rule');
    }
    
    for (const rule of policy.rules) {
      if (!rule.id || !rule.condition || !rule.action) {
        throw new Error('Policy rule must have id, condition, and action');
      }
    }
  }

  /**
   * Evaluate a single policy rule
   */
  private async evaluateRule(rule: PolicyRule, context?: PolicyContext): Promise<RuleResult> {
    try {
      const evaluator = this.ruleEvaluators.get(rule.condition) || this.ruleEvaluators.get('default');
      if (!evaluator) {
        throw new Error(`No evaluator found for condition: ${rule.condition}`);
      }

      const conditionMet = await evaluator.evaluate(rule, context);
      
      return {
        ruleId: rule.id,
        decision: conditionMet ? rule.action : 'ALLOW',
        reason: conditionMet ? `Rule ${rule.id} condition met` : `Rule ${rule.id} condition not met`,
        evidence: [`Rule evaluation: ${rule.condition} = ${conditionMet}`],
        conditionMet
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        decision: 'DENY',
        reason: `Rule evaluation failed: ${error.message}`,
        evidence: [`Error evaluating rule ${rule.id}: ${error.message}`],
        conditionMet: false
      };
    }
  }

  /**
   * Check if policy is applicable to context
   */
  private isPolicyApplicable(policy: Policy, context: PolicyContext): boolean {
    // Check scope
    if (policy.scope.components.length > 0 && context.component) {
      if (!policy.scope.components.includes(context.component)) {
        return false;
      }
    }
    
    if (policy.scope.environments.length > 0 && context.environment) {
      if (!policy.scope.environments.includes(context.environment)) {
        return false;
      }
    }
    
    if (policy.scope.users.length > 0 && context.user) {
      if (!policy.scope.users.includes(context.user)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if exception is applicable
   */
  private async isExceptionApplicable(
    exception: PolicyException,
    context: PolicyContext
  ): Promise<boolean> {
    // Check if exception is still valid
    if (exception.expiration && new Date() > exception.expiration) {
      return false;
    }
    
    // Evaluate exception conditions
    for (const condition of exception.conditions) {
      const evaluator = this.ruleEvaluators.get(condition) || this.ruleEvaluators.get('default');
      if (evaluator) {
        const conditionMet = await evaluator.evaluate({ 
          id: 'exception', 
          condition, 
          action: 'ALLOW', 
          parameters: {}, 
          exceptions: [] 
        }, context);
        if (!conditionMet) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Generate recommendations based on rule results
   */
  private generateRecommendations(policy: Policy, ruleResults: RuleResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedRules = ruleResults.filter(r => r.decision === 'DENY');
    
    for (const failedRule of failedRules) {
      recommendations.push(`Review and address rule violation: ${failedRule.ruleId}`);
    }
    
    if (failedRules.length > 0) {
      recommendations.push(`Consult policy documentation for ${policy.name}`);
      recommendations.push('Consider requesting policy exception if appropriate');
    }
    
    return recommendations;
  }

  /**
   * Log policy enforcement action
   */
  private async logPolicyEnforcement(
    policy: Policy,
    result: PolicyResult,
    context?: PolicyContext,
    error?: Error
  ): Promise<void> {
    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: context?.user || 'system',
      action: 'POLICY_ENFORCED',
      resource: policy.id,
      outcome: error ? 'ERROR' : 'SUCCESS',
      details: {
        policyName: policy.name,
        decision: result.decision,
        reason: result.reason,
        context: context ? {
          component: context.component,
          environment: context.environment,
          resource: context.resource,
          action: context.action
        } : undefined,
        error: error?.message
      },
      ipAddress: context?.ipAddress || 'localhost',
      userAgent: context?.userAgent || 'PolicyEngine',
      sessionId: context?.sessionId || 'system'
    });
  }

  /**
   * Calculate changes between policy versions
   */
  private calculatePolicyChanges(oldPolicy?: Policy, newPolicy?: Policy): string[] {
    const changes: string[] = [];
    
    if (!oldPolicy) {
      changes.push('New policy created');
      return changes;
    }
    
    if (oldPolicy.name !== newPolicy?.name) {
      changes.push(`Name changed from ${oldPolicy.name} to ${newPolicy?.name}`);
    }
    
    if (oldPolicy.rules.length !== newPolicy?.rules.length) {
      changes.push(`Rules count changed from ${oldPolicy.rules.length} to ${newPolicy?.rules.length}`);
    }
    
    if (oldPolicy.enforcement.mode !== newPolicy?.enforcement.mode) {
      changes.push(`Enforcement mode changed from ${oldPolicy.enforcement.mode} to ${newPolicy?.enforcement.mode}`);
    }
    
    return changes;
  }

  /**
   * Initialize rule evaluators
   */
  private initializeRuleEvaluators(): void {
    // Default evaluator
    this.ruleEvaluators.set('default', new DefaultRuleEvaluator());
    
    // Security evaluators
    this.ruleEvaluators.set('user_has_role', new UserRoleEvaluator());
    this.ruleEvaluators.set('resource_access_allowed', new ResourceAccessEvaluator());
    this.ruleEvaluators.set('time_window_check', new TimeWindowEvaluator());
    
    // Operational evaluators
    this.ruleEvaluators.set('environment_check', new EnvironmentEvaluator());
    this.ruleEvaluators.set('component_status', new ComponentStatusEvaluator());
    this.ruleEvaluators.set('rate_limit_check', new RateLimitEvaluator());
  }
}

/**
 * Rule evaluator interface
 */
interface RuleEvaluator {
  evaluate(rule: PolicyRule, context?: PolicyContext): Promise<boolean>;
}

/**
 * Policy context for rule evaluation
 */
interface PolicyContext {
  user?: string;
  component?: string;
  environment?: string;
  resource?: string;
  action?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

/**
 * Rule evaluation result
 */
interface RuleResult {
  ruleId: string;
  decision: 'ALLOW' | 'DENY' | 'WARN';
  reason: string;
  evidence: string[];
  conditionMet: boolean;
}

/**
 * Default rule evaluator
 */
class DefaultRuleEvaluator implements RuleEvaluator {
  async evaluate(rule: PolicyRule, context?: PolicyContext): Promise<boolean> {
    // Simple condition evaluation - in production, use a proper expression engine
    return true; // Placeholder
  }
}

/**
 * User role evaluator
 */
class UserRoleEvaluator implements RuleEvaluator {
  async evaluate(rule: PolicyRule, context?: PolicyContext): Promise<boolean> {
    const requiredRole = rule.parameters.role;
    const userRoles = context?.metadata?.userRoles || [];
    
    // For DENY actions, return true if user does NOT have the required role
    // For ALLOW actions, return true if user HAS the required role
    const hasRole = userRoles.includes(requiredRole);
    
    if (rule.action === 'DENY') {
      return !hasRole; // Condition met (should deny) if user doesn't have role
    } else {
      return hasRole; // Condition met (should allow) if user has role
    }
  }
}

/**
 * Resource access evaluator
 */
class ResourceAccessEvaluator implements RuleEvaluator {
  async evaluate(rule: PolicyRule, context?: PolicyContext): Promise<boolean> {
    const allowedResources = rule.parameters.resources || [];
    const requestedResource = context?.resource;
    return !requestedResource || allowedResources.includes(requestedResource);
  }
}

/**
 * Time window evaluator
 */
class TimeWindowEvaluator implements RuleEvaluator {
  async evaluate(rule: PolicyRule, context?: PolicyContext): Promise<boolean> {
    const startTime = rule.parameters.startTime;
    const endTime = rule.parameters.endTime;
    const currentTime = context?.timestamp || new Date();
    
    if (!startTime || !endTime) return true;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return currentTime >= start && currentTime <= end;
  }
}

/**
 * Environment evaluator
 */
class EnvironmentEvaluator implements RuleEvaluator {
  async evaluate(rule: PolicyRule, context?: PolicyContext): Promise<boolean> {
    const allowedEnvironments = rule.parameters.environments || [];
    const currentEnvironment = context?.environment;
    return !currentEnvironment || allowedEnvironments.includes(currentEnvironment);
  }
}

/**
 * Component status evaluator
 */
class ComponentStatusEvaluator implements RuleEvaluator {
  async evaluate(rule: PolicyRule, context?: PolicyContext): Promise<boolean> {
    const requiredStatus = rule.parameters.status;
    const componentStatus = context?.metadata?.componentStatus;
    return !requiredStatus || componentStatus === requiredStatus;
  }
}

/**
 * Rate limit evaluator
 */
class RateLimitEvaluator implements RuleEvaluator {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  async evaluate(rule: PolicyRule, context?: PolicyContext): Promise<boolean> {
    const limit = rule.parameters.limit || 100;
    const windowMs = rule.parameters.windowMs || 60000; // 1 minute
    const key = `${context?.user || 'anonymous'}-${context?.action || 'unknown'}`;
    
    const now = Date.now();
    const entry = this.requestCounts.get(key);
    
    if (!entry || now > entry.resetTime) {
      this.requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (entry.count >= limit) {
      return false;
    }
    
    entry.count++;
    return true;
  }
}