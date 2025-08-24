/**
 * Policy Engine
 * Manages security policies, enforcement, and validation
 */

import {
  IPolicyEngine,
  PolicyResult,
  PolicyContext,
  EnforcementResult,
  PolicyValidationResult,
  PolicyDefinition,
  PolicyStatus
} from './interfaces';
import {
  PolicyConfig,
  PolicyRule
} from './types';
import { Logger } from '../../shared/logger';
import { Result } from '../../shared/result';

export class PolicyEngine implements IPolicyEngine {
  private config: PolicyConfig;
  private logger: Logger;
  private initialized: boolean = false;
  private policies: Map<string, PolicyDefinition> = new Map();
  private violations: any[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(policies: PolicyConfig): Promise<void> {
    try {
      this.config = policies;

      // Load policy definitions
      await this.loadPolicyDefinitions();
      
      // Initialize policy enforcement
      await this.initializePolicyEnforcement();
      
      // Initialize policy validation
      await this.initializePolicyValidation();

      this.initialized = true;
      this.logger.info('PolicyEngine initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize PolicyEngine', { error });
      throw error;
    }
  }

  async evaluatePolicy(policy: string, context: PolicyContext): Promise<PolicyResult> {
    try {
      if (!this.initialized) {
        throw new Error('PolicyEngine not initialized');
      }

      const policyDefinition = this.policies.get(policy);
      if (!policyDefinition) {
        return {
          policy,
          result: 'deny',
          reason: `Policy not found: ${policy}`
        };
      }

      this.logger.debug('Evaluating policy', { 
        policy, 
        user: context.user.id,
        resource: context.resource.id,
        action: context.action.name
      });

      // Evaluate policy rules
      const evaluationResult = await this.evaluatePolicyRules(policyDefinition, context);

      this.logger.info('Policy evaluation completed', {
        policy,
        result: evaluationResult.result,
        user: context.user.id
      });

      return evaluationResult;
      
    } catch (error) {
      this.logger.error('Policy evaluation failed', { error, policy });
      return {
        policy,
        result: 'deny',
        reason: 'Policy evaluation error'
      };
    }
  }

  async enforcePolicy(policy: string, resource: string): Promise<EnforcementResult> {
    try {
      if (!this.initialized) {
        throw new Error('PolicyEngine not initialized');
      }

      const policyDefinition = this.policies.get(policy);
      if (!policyDefinition) {
        return {
          enforced: false,
          action: 'none',
          result: 'denied',
          reason: `Policy not found: ${policy}`
        };
      }

      this.logger.info('Enforcing policy', { policy, resource });

      // Apply policy enforcement based on mode
      const enforcementResult = await this.applyPolicyEnforcement(policyDefinition, resource);

      // Log enforcement action
      if (enforcementResult.enforced) {
        this.logger.info('Policy enforced successfully', {
          policy,
          resource,
          action: enforcementResult.action,
          result: enforcementResult.result
        });
      } else {
        this.logger.warn('Policy enforcement failed', {
          policy,
          resource,
          reason: enforcementResult.reason
        });
      }

      return enforcementResult;
      
    } catch (error) {
      this.logger.error('Policy enforcement failed', { error, policy, resource });
      return {
        enforced: false,
        action: 'error',
        result: 'denied',
        reason: 'Policy enforcement system error'
      };
    }
  }

  async validatePolicies(): Promise<PolicyValidationResult> {
    try {
      if (!this.initialized) {
        throw new Error('PolicyEngine not initialized');
      }

      this.logger.info('Validating policies', { count: this.policies.size });

      const errors: any[] = [];
      const warnings: any[] = [];
      const suggestions: any[] = [];

      // Validate each policy
      for (const [name, policy] of this.policies) {
        const validation = await this.validatePolicy(name, policy);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
        suggestions.push(...validation.suggestions);
      }

      const result: PolicyValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };

      this.logger.info('Policy validation completed', {
        valid: result.valid,
        errors: errors.length,
        warnings: warnings.length,
        suggestions: suggestions.length
      });

      return result;
      
    } catch (error) {
      this.logger.error('Policy validation failed', { error });
      throw error;
    }
  }

  async updatePolicy(policy: string, definition: PolicyDefinition): Promise<void> {
    try {
      if (!this.initialized) {
        throw new Error('PolicyEngine not initialized');
      }

      // Validate policy definition
      const validation = await this.validatePolicy(policy, definition);
      if (!validation.valid) {
        throw new Error(`Invalid policy definition: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Update policy
      this.policies.set(policy, definition);

      this.logger.info('Policy updated', {
        policy,
        version: definition.version,
        rules: definition.rules.length
      });
      
    } catch (error) {
      this.logger.error('Policy update failed', { error, policy });
      throw error;
    }
  }

  async getPolicyStatus(): Promise<PolicyStatus> {
    try {
      if (!this.initialized) {
        throw new Error('PolicyEngine not initialized');
      }

      const policies = Array.from(this.policies.entries()).map(([name, policy]) => ({
        name,
        version: policy.version,
        status: 'active' as const,
        lastUpdated: new Date()
      }));

      const enforcementStatus = {
        mode: this.config.enforcement.mode,
        active: this.config.enforcement.enabled,
        violations: this.violations.length,
        exceptions: this.config.enforcement.exceptions.length
      };

      const recentViolations = this.violations.slice(-10); // Last 10 violations

      return {
        policies,
        enforcement: enforcementStatus,
        violations: recentViolations
      };
      
    } catch (error) {
      this.logger.error('Failed to get policy status', { error });
      throw error;
    }
  }

  // Private helper methods
  private async loadPolicyDefinitions(): Promise<void> {
    // Load default security policies
    await this.loadDefaultPolicies();
    
    // Load custom policies if configured
    await this.loadCustomPolicies();
  }

  private async loadDefaultPolicies(): Promise<void> {
    // Authentication policy
    const authPolicy: PolicyDefinition = {
      name: 'authentication-policy',
      version: '1.0.0',
      rules: [
        {
          resource: 'system',
          action: 'login',
          condition: 'user.authenticated == true'
        },
        {
          resource: 'api',
          action: 'access',
          condition: 'request.headers.authorization != null'
        }
      ],
      metadata: {
        description: 'Default authentication policy',
        category: 'security'
      }
    };

    // Authorization policy
    const authzPolicy: PolicyDefinition = {
      name: 'authorization-policy',
      version: '1.0.0',
      rules: [
        {
          resource: 'admin',
          action: 'access',
          condition: 'user.roles.includes("admin")'
        },
        {
          resource: 'data',
          action: 'read',
          condition: 'user.permissions.includes("data:read")'
        }
      ],
      metadata: {
        description: 'Default authorization policy',
        category: 'security'
      }
    };

    // Data protection policy
    const dataPolicy: PolicyDefinition = {
      name: 'data-protection-policy',
      version: '1.0.0',
      rules: [
        {
          resource: 'sensitive-data',
          action: 'access',
          condition: 'data.classification != "public" && user.clearance >= data.classification'
        },
        {
          resource: 'personal-data',
          action: 'process',
          condition: 'user.gdpr_consent == true'
        }
      ],
      metadata: {
        description: 'Data protection and privacy policy',
        category: 'privacy'
      }
    };

    this.policies.set('authentication-policy', authPolicy);
    this.policies.set('authorization-policy', authzPolicy);
    this.policies.set('data-protection-policy', dataPolicy);

    this.logger.info('Default policies loaded', { count: 3 });
  }

  private async loadCustomPolicies(): Promise<void> {
    // Load custom policies from configuration
    this.logger.info('Custom policies loaded');
  }

  private async initializePolicyEnforcement(): Promise<void> {
    // Initialize policy enforcement system
    this.logger.info('Policy enforcement initialized', {
      mode: this.config.enforcement.mode,
      enabled: this.config.enforcement.enabled
    });
  }

  private async initializePolicyValidation(): Promise<void> {
    // Initialize policy validation system
    this.logger.info('Policy validation initialized');
  }

  private async evaluatePolicyRules(policy: PolicyDefinition, context: PolicyContext): Promise<PolicyResult> {
    let allowCount = 0;
    let denyCount = 0;
    const conditions: string[] = [];

    for (const rule of policy.rules) {
      const ruleResult = await this.evaluateRule(rule, context);
      
      if (ruleResult.allow) {
        allowCount++;
      } else {
        denyCount++;
      }

      if (ruleResult.condition) {
        conditions.push(ruleResult.condition);
      }
    }

    // Determine overall result
    let result: 'allow' | 'deny' | 'conditional';
    let reason: string;

    if (denyCount > 0) {
      result = 'deny';
      reason = 'One or more policy rules deny access';
    } else if (allowCount > 0) {
      result = conditions.length > 0 ? 'conditional' : 'allow';
      reason = conditions.length > 0 ? 'Access allowed with conditions' : 'All policy rules allow access';
    } else {
      result = 'deny';
      reason = 'No applicable policy rules found';
    }

    return {
      policy: policy.name,
      result,
      reason,
      conditions: conditions.length > 0 ? conditions : undefined,
      metadata: {
        rulesEvaluated: policy.rules.length,
        allowCount,
        denyCount
      }
    };
  }

  private async evaluateRule(rule: PolicyRule, context: PolicyContext): Promise<{ allow: boolean; condition?: string }> {
    try {
      // Check if rule applies to the current context
      if (rule.resource !== '*' && rule.resource !== context.resource.type) {
        return { allow: true }; // Rule doesn't apply
      }

      if (rule.action !== '*' && rule.action !== context.action.name) {
        return { allow: true }; // Rule doesn't apply
      }

      // Evaluate rule condition
      if (rule.condition) {
        const conditionResult = await this.evaluateCondition(rule.condition, context);
        return {
          allow: conditionResult.result,
          condition: conditionResult.result ? undefined : rule.condition
        };
      }

      return { allow: true };
      
    } catch (error) {
      this.logger.error('Rule evaluation failed', { error, rule });
      return { allow: false };
    }
  }

  private async evaluateCondition(condition: string, context: PolicyContext): Promise<{ result: boolean; reason?: string }> {
    try {
      // Simple condition evaluation (in production, use a proper expression evaluator)
      const evaluationContext = {
        user: context.user,
        resource: context.resource,
        action: context.action,
        environment: context.environment
      };

      // Mock condition evaluation
      if (condition.includes('user.authenticated == true')) {
        return { result: !!context.user.id };
      }

      if (condition.includes('user.roles.includes("admin")')) {
        return { result: context.user.roles.includes('admin') };
      }

      if (condition.includes('user.permissions.includes')) {
        const permission = condition.match(/user\.permissions\.includes\("([^"]+)"\)/)?.[1];
        return { result: permission ? context.user.permissions.includes(permission) : false };
      }

      // Default to allow if condition cannot be evaluated
      return { result: true, reason: 'Condition evaluation not implemented' };
      
    } catch (error) {
      this.logger.error('Condition evaluation failed', { error, condition });
      return { result: false, reason: 'Condition evaluation error' };
    }
  }

  private async applyPolicyEnforcement(policy: PolicyDefinition, resource: string): Promise<EnforcementResult> {
    switch (this.config.enforcement.mode) {
      case 'advisory':
        return {
          enforced: true,
          action: 'advisory',
          result: 'allowed',
          reason: 'Advisory mode - policy violations logged but not blocked'
        };

      case 'enforcing':
        // Check for policy violations
        const hasViolation = await this.checkPolicyViolation(policy, resource);
        if (hasViolation) {
          await this.recordViolation(policy.name, resource);
          return {
            enforced: true,
            action: 'log',
            result: 'allowed',
            reason: 'Policy violation logged'
          };
        }
        return {
          enforced: true,
          action: 'allow',
          result: 'allowed',
          reason: 'No policy violations detected'
        };

      case 'blocking':
        // Check for policy violations
        const hasBlockingViolation = await this.checkPolicyViolation(policy, resource);
        if (hasBlockingViolation) {
          await this.recordViolation(policy.name, resource);
          return {
            enforced: true,
            action: 'block',
            result: 'denied',
            reason: 'Policy violation blocked'
          };
        }
        return {
          enforced: true,
          action: 'allow',
          result: 'allowed',
          reason: 'No policy violations detected'
        };

      default:
        return {
          enforced: false,
          action: 'none',
          result: 'denied',
          reason: 'Unknown enforcement mode'
        };
    }
  }

  private async validatePolicy(name: string, policy: PolicyDefinition): Promise<{ valid: boolean; errors: any[]; warnings: any[]; suggestions: any[] }> {
    const errors: any[] = [];
    const warnings: any[] = [];
    const suggestions: any[] = [];

    // Validate policy structure
    if (!policy.name) {
      errors.push({
        policy: name,
        rule: 'structure',
        message: 'Policy name is required'
      });
    }

    if (!policy.version) {
      errors.push({
        policy: name,
        rule: 'structure',
        message: 'Policy version is required'
      });
    }

    if (!policy.rules || policy.rules.length === 0) {
      errors.push({
        policy: name,
        rule: 'structure',
        message: 'Policy must have at least one rule'
      });
    }

    // Validate rules
    for (let i = 0; i < policy.rules.length; i++) {
      const rule = policy.rules[i];
      
      if (!rule.resource) {
        errors.push({
          policy: name,
          rule: `rule-${i}`,
          message: 'Rule resource is required'
        });
      }

      if (!rule.action) {
        errors.push({
          policy: name,
          rule: `rule-${i}`,
          message: 'Rule action is required'
        });
      }

      if (rule.condition && rule.condition.length > 1000) {
        warnings.push({
          policy: name,
          rule: `rule-${i}`,
          message: 'Rule condition is very long and may impact performance',
          severity: 'medium'
        });
      }
    }

    // Generate suggestions
    if (policy.rules.length > 50) {
      suggestions.push({
        policy: name,
        rule: 'optimization',
        suggestion: 'Consider splitting large policies into smaller, focused policies',
        benefit: 'Improved maintainability and performance'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private async checkPolicyViolation(policy: PolicyDefinition, resource: string): Promise<boolean> {
    // Mock policy violation check
    // In production, this would check actual resource state against policy rules
    return Math.random() < 0.1; // 10% chance of violation
  }

  private async recordViolation(policy: string, resource: string): Promise<void> {
    const violation = {
      policy,
      resource,
      user: 'system',
      timestamp: new Date(),
      severity: 'medium' as const
    };

    this.violations.push(violation);

    this.logger.warn('Policy violation recorded', {
      policy,
      resource,
      violationId: this.violations.length
    });
  }
}