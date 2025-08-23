/**
 * Tests for PolicyEngine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolicyEngine } from '../../../src/compliance/policy-engine';
import { AuditTrailManager } from '../../../src/compliance/audit-trail-manager';

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;
  let mockAuditManager: AuditTrailManager;

  beforeEach(() => {
    mockAuditManager = {
      logEvent: vi.fn()
    } as any;

    policyEngine = new PolicyEngine(mockAuditManager);
  });

  describe('registerPolicy', () => {
    it('should register a valid policy', async () => {
      // Arrange
      const policy = {
        id: 'test-policy',
        name: 'Test Policy',
        version: '1.0',
        description: 'Test policy description',
        type: 'SECURITY' as const,
        scope: {
          components: ['component1'],
          environments: ['production'],
          users: ['user1'],
          resources: ['resource1']
        },
        rules: [
          {
            id: 'rule1',
            condition: 'user_has_role',
            action: 'ALLOW' as const,
            parameters: { role: 'admin' },
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      // Act
      await policyEngine.registerPolicy(policy);

      // Assert
      const retrievedPolicy = policyEngine.getPolicy(policy.id);
      expect(retrievedPolicy).toEqual(policy);
      expect(mockAuditManager.logEvent).toHaveBeenCalled();
    });

    it('should reject invalid policy', async () => {
      // Arrange
      const invalidPolicy = {
        id: '',
        name: '',
        version: '',
        description: '',
        type: 'SECURITY' as const,
        scope: {
          components: [],
          environments: [],
          users: [],
          resources: []
        },
        rules: [],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      // Act & Assert
      await expect(policyEngine.registerPolicy(invalidPolicy))
        .rejects.toThrow('Policy must have id, name, and version');
    });
  });

  describe('enforcePolicy', () => {
    it('should allow when policy is disabled', async () => {
      // Arrange
      const policy = {
        id: 'disabled-policy',
        name: 'Disabled Policy',
        version: '1.0',
        description: 'Disabled policy',
        type: 'SECURITY' as const,
        scope: {
          components: [],
          environments: [],
          users: [],
          resources: []
        },
        rules: [
          {
            id: 'rule1',
            condition: 'always_deny',
            action: 'DENY' as const,
            parameters: {},
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'DISABLED' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      // Act
      const result = await policyEngine.enforcePolicy(policy);

      // Assert
      expect(result.decision).toBe('ALLOW');
      expect(result.reason).toBe('Policy is disabled');
    });

    it('should deny when rule fails in enforcing mode', async () => {
      // Arrange
      const policy = {
        id: 'enforcing-policy',
        name: 'Enforcing Policy',
        version: '1.0',
        description: 'Enforcing policy',
        type: 'SECURITY' as const,
        scope: {
          components: [],
          environments: [],
          users: [],
          resources: []
        },
        rules: [
          {
            id: 'rule1',
            condition: 'user_has_role',
            action: 'DENY' as const,
            parameters: { role: 'admin' },
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      const context = {
        user: 'testuser',
        component: 'testcomponent',
        environment: 'production',
        resource: 'testresource',
        action: 'read',
        metadata: { userRoles: ['user'] } // Not admin
      };

      // Act
      const result = await policyEngine.enforcePolicy(policy, context);

      // Assert
      expect(result.decision).toBe('DENY');
    });

    it('should warn in permissive mode', async () => {
      // Arrange
      const policy = {
        id: 'permissive-policy',
        name: 'Permissive Policy',
        version: '1.0',
        description: 'Permissive policy',
        type: 'SECURITY' as const,
        scope: {
          components: [],
          environments: [],
          users: [],
          resources: []
        },
        rules: [
          {
            id: 'rule1',
            condition: 'user_has_role',
            action: 'DENY' as const,
            parameters: { role: 'admin' },
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'PERMISSIVE' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      const context = {
        user: 'testuser',
        metadata: { userRoles: ['user'] }
      };

      // Act
      const result = await policyEngine.enforcePolicy(policy, context);

      // Assert
      expect(result.decision).toBe('WARN');
    });
  });

  describe('evaluateAllPolicies', () => {
    it('should evaluate all applicable policies', async () => {
      // Arrange
      const policy1 = {
        id: 'policy1',
        name: 'Policy 1',
        version: '1.0',
        description: 'First policy',
        type: 'SECURITY' as const,
        scope: {
          components: ['component1'],
          environments: [],
          users: [],
          resources: []
        },
        rules: [
          {
            id: 'rule1',
            condition: 'default',
            action: 'ALLOW' as const,
            parameters: {},
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      const policy2 = {
        id: 'policy2',
        name: 'Policy 2',
        version: '1.0',
        description: 'Second policy',
        type: 'OPERATIONAL' as const,
        scope: {
          components: ['component2'],
          environments: [],
          users: [],
          resources: []
        },
        rules: [
          {
            id: 'rule2',
            condition: 'default',
            action: 'ALLOW' as const,
            parameters: {},
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      await policyEngine.registerPolicy(policy1);
      await policyEngine.registerPolicy(policy2);

      const context = {
        component: 'component1'
      };

      // Act
      const results = await policyEngine.evaluateAllPolicies(context);

      // Assert
      expect(results).toHaveLength(1); // Only policy1 should be applicable
      expect(results[0].policyId).toBe('policy1');
    });
  });

  describe('policy management', () => {
    it('should list all policies', () => {
      // Arrange
      const policy = {
        id: 'list-policy',
        name: 'List Policy',
        version: '1.0',
        description: 'Policy for listing test',
        type: 'SECURITY' as const,
        scope: {
          components: [],
          environments: [],
          users: [],
          resources: []
        },
        rules: [
          {
            id: 'rule1',
            condition: 'default',
            action: 'ALLOW' as const,
            parameters: {},
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      // Act
      policyEngine.registerPolicy(policy);
      const policies = policyEngine.listPolicies();

      // Assert
      expect(policies).toContain(policy);
    });

    it('should update existing policy', async () => {
      // Arrange
      const originalPolicy = {
        id: 'update-policy',
        name: 'Original Policy',
        version: '1.0',
        description: 'Original policy',
        type: 'SECURITY' as const,
        scope: {
          components: [],
          environments: [],
          users: [],
          resources: []
        },
        rules: [
          {
            id: 'rule1',
            condition: 'default',
            action: 'ALLOW' as const,
            parameters: {},
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      const updatedPolicy = {
        ...originalPolicy,
        name: 'Updated Policy',
        version: '2.0'
      };

      await policyEngine.registerPolicy(originalPolicy);

      // Act
      await policyEngine.updatePolicy(updatedPolicy);

      // Assert
      const retrievedPolicy = policyEngine.getPolicy(originalPolicy.id);
      expect(retrievedPolicy?.name).toBe('Updated Policy');
      expect(retrievedPolicy?.version).toBe('2.0');
    });

    it('should remove policy', async () => {
      // Arrange
      const policy = {
        id: 'remove-policy',
        name: 'Remove Policy',
        version: '1.0',
        description: 'Policy to be removed',
        type: 'SECURITY' as const,
        scope: {
          components: [],
          environments: [],
          users: [],
          resources: []
        },
        rules: [
          {
            id: 'rule1',
            condition: 'default',
            action: 'ALLOW' as const,
            parameters: {},
            exceptions: []
          }
        ],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      await policyEngine.registerPolicy(policy);

      // Act
      await policyEngine.removePolicy(policy.id);

      // Assert
      const retrievedPolicy = policyEngine.getPolicy(policy.id);
      expect(retrievedPolicy).toBeUndefined();
    });
  });
});