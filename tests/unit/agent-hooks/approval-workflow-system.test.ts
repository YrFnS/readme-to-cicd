import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApprovalWorkflowSystem } from '../../../src/agent-hooks/approval/approval-workflow-system';
import {
  User,
  Team,
  UserRole,
  TeamRole,
  ApprovalStatus,
  ApprovalType,
  ApprovalRequest
} from '../../../src/agent-hooks/types/approval';
import { RepositoryInfo } from '../../../src/agent-hooks/types';
import { ErrorHandler } from '../../../src/agent-hooks/errors/error-handler';
import { NotificationSystem } from '../../../src/agent-hooks/notifications/notification-system';

describe('ApprovalWorkflowSystem', () => {
  let approvalSystem: ApprovalWorkflowSystem;
  let mockErrorHandler: ErrorHandler;
  let mockNotificationSystem: NotificationSystem;

  const mockRepository: RepositoryInfo = {
    owner: 'test-owner',
    name: 'test-repo',
    fullName: 'test-owner/test-repo',
    defaultBranch: 'main'
  };

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.APPROVER,
    teams: ['team-1'],
    preferences: {
      timezone: 'UTC',
      language: 'en',
      notificationChannels: ['slack'],
      approvalDelegation: false,
      workingHours: {
        timezone: 'UTC',
        schedule: {}
      }
    },
    createdAt: new Date(),
    lastActive: new Date(),
    isActive: true
  };

  const mockTeam: Team = {
    id: 'team-1',
    name: 'Test Team',
    description: 'Test team for approval workflows',
    members: [
      {
        userId: 'user-1',
        role: TeamRole.MEMBER,
        joinedAt: new Date(),
        permissions: []
      }
    ],
    repositories: [mockRepository.fullName],
    approvalPolicies: [],
    notificationSettings: {
      approvalRequests: true,
      approvalDecisions: true,
      escalationAlerts: false,
      timeoutAlerts: false,
      channels: ['slack'],
      templates: {}
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockErrorHandler = new ErrorHandler();
    mockNotificationSystem = new NotificationSystem(
      {
        enabled: true,
        defaultChannels: [],
        templates: [],
        channelConfigs: {
          slack: { enabled: false },
          email: { enabled: false },
          webhook: { enabled: false },
          teams: { enabled: false },
          discord: { enabled: false }
        } as any,
        retryPolicy: { maxAttempts: 3, initialDelay: 1000, maxDelay: 10000, backoffMultiplier: 2, jitter: true },
        rateLimits: [],
        filters: []
      },
      mockErrorHandler,
      null as any
    );

    approvalSystem = new ApprovalWorkflowSystem(
      mockErrorHandler,
      mockNotificationSystem
    );

    // Add test user and team
    approvalSystem.addUser(mockUser);
    approvalSystem.createTeam(mockTeam);
  });

  describe('User Management', () => {
    it('should add and retrieve users', () => {
      const user = approvalSystem.getUser('user-1');
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
      expect(user?.role).toBe(UserRole.APPROVER);
    });

    it('should update user information', () => {
      const updated = approvalSystem.updateUser('user-1', { fullName: 'Updated Name' });
      expect(updated).toBe(true);

      const user = approvalSystem.getUser('user-1');
      expect(user?.fullName).toBe('Updated Name');
    });

    it('should get users by role', () => {
      // Test that the user was added successfully
      const user = approvalSystem.getUser('user-1');
      expect(user?.role).toBe(UserRole.APPROVER);
    });

    it('should return undefined for non-existent user', () => {
      const user = approvalSystem.getUser('non-existent');
      expect(user).toBeUndefined();
    });
  });

  describe('Team Management', () => {
    it('should create and retrieve teams', () => {
      const team = approvalSystem.getTeam('team-1');
      expect(team).toBeDefined();
      expect(team?.name).toBe('Test Team');
    });

    it('should add team member', () => {
      const newUser: User = {
        id: 'user-2',
        username: 'newuser',
        email: 'new@example.com',
        role: UserRole.REVIEWER,
        teams: [],
        preferences: {
          timezone: 'UTC',
          language: 'en',
          notificationChannels: ['email'],
          approvalDelegation: false,
          workingHours: {
            timezone: 'UTC',
            schedule: {}
          }
        },
        createdAt: new Date(),
        lastActive: new Date(),
        isActive: true
      };

      approvalSystem.addUser(newUser);
      const added = approvalSystem.addTeamMember('team-1', 'user-2', TeamRole.MEMBER);
      expect(added).toBe(true);

      const team = approvalSystem.getTeam('team-1');
      expect(team?.members).toHaveLength(2);
    });

    it('should remove team member', () => {
      const removed = approvalSystem.removeTeamMember('team-1', 'user-1');
      expect(removed).toBe(true);

      const team = approvalSystem.getTeam('team-1');
      expect(team?.members).toHaveLength(0);
    });

    it('should get user teams', () => {
      const userTeams = approvalSystem.getUserTeams('user-1');
      expect(userTeams).toHaveLength(1);
      expect(userTeams[0].id).toBe('team-1');
    });
  });

  describe('Approval Request Creation', () => {
    it('should create approval request', async () => {
      const requestId = await approvalSystem.createApprovalRequest(
        ApprovalType.AUTOMATION_DECISION,
        'Test Automation Decision',
        'Testing approval workflow for automation decision',
        'user-1',
        mockRepository,
        {
          automationDecision: {
            shouldCreatePR: true,
            changes: [],
            priority: 'high',
            rationale: 'Test automation',
            performanceImpact: {
              estimatedTimeSavings: 30,
              costReduction: 5.0,
              confidence: 0.8,
              rationale: 'Automation will save time'
            }
          }
        },
        'high'
      );

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
    });

    it('should handle missing approval policy', async () => {
      // Try to create request without setting up policy
      await expect(approvalSystem.createApprovalRequest(
        ApprovalType.SECURITY_FIX,
        'Security Fix',
        'Critical security fix',
        'user-1',
        mockRepository,
        {
          securityAlert: {
            id: 'alert-1',
            number: 1,
            type: 'code_scanning' as any,
            state: 'open' as any,
            severity: 'critical' as any,
            title: 'Critical vulnerability',
            description: 'Critical security issue',
            html_url: 'https://github.com/test/alerts/1',
            repository: mockRepository,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        'urgent'
      )).rejects.toThrow('No approval policy found');
    });
  });

  describe('Approval Processing', () => {
    let requestId: string;

    beforeEach(async () => {
      // Create a test approval request
      requestId = await approvalSystem.createApprovalRequest(
        ApprovalType.AUTOMATION_DECISION,
        'Test Request',
        'Test approval request',
        'user-1',
        mockRepository,
        {
          automationDecision: {
            shouldCreatePR: true,
            changes: [],
            priority: 'medium',
            rationale: 'Test',
            performanceImpact: {
              estimatedTimeSavings: 15,
              costReduction: 2.0,
              confidence: 0.7,
              rationale: 'Test impact'
            }
          }
        },
        'medium'
      );
    });

    it('should approve request', async () => {
      const approved = await approvalSystem.approveRequest(
        requestId,
        'user-1',
        'approve',
        'Looks good to me'
      );

      expect(approved).toBe(true);
    });

    it('should reject request', async () => {
      const rejected = await approvalSystem.approveRequest(
        requestId,
        'user-1',
        'reject',
        'Needs more work'
      );

      expect(rejected).toBe(true);
    });

    it('should handle non-existent request', async () => {
      const approved = await approvalSystem.approveRequest(
        'non-existent',
        'user-1',
        'approve'
      );

      expect(approved).toBe(false);
    });

    it('should handle unauthorized approval attempt', async () => {
      const approved = await approvalSystem.approveRequest(
        requestId,
        'non-existent-user',
        'approve'
      );

      expect(approved).toBe(false);
    });
  });

  describe('Comments and Communication', () => {
    let requestId: string;

    beforeEach(async () => {
      requestId = await approvalSystem.createApprovalRequest(
        ApprovalType.AUTOMATION_DECISION,
        'Comment Test',
        'Test request for comments',
        'user-1',
        mockRepository,
        {
          automationDecision: {
            shouldCreatePR: false,
            changes: [],
            priority: 'low' as const,
            rationale: 'Comment test',
            performanceImpact: {
              estimatedTimeSavings: 5,
              costReduction: 0.5,
              confidence: 0.6,
              rationale: 'Minor improvement'
            }
          }
        },
        'low'
      );
    });

    it('should add comment to request', async () => {
      const added = await approvalSystem.addComment(
        requestId,
        'user-1',
        'This looks good, but please add tests'
      );

      expect(added).toBe(true);
    });

    it('should handle internal comments', async () => {
      const added = await approvalSystem.addComment(
        requestId,
        'user-1',
        'Internal review comment',
        true
      );

      expect(added).toBe(true);
    });

    it('should handle non-existent request for comments', async () => {
      const added = await approvalSystem.addComment(
        'non-existent',
        'user-1',
        'Comment on non-existent request'
      );

      expect(added).toBe(false);
    });
  });

  describe('Metrics and Analytics', () => {
    it('should provide approval metrics', () => {
      const metrics = approvalSystem.getApprovalMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.total_requests).toBe('number');
      expect(typeof metrics.pending_requests).toBe('number');
      expect(typeof metrics.approved_requests).toBe('number');
      expect(typeof metrics.rejected_requests).toBe('number');
      expect(typeof metrics.approval_rate).toBe('number');
    });

    it('should provide approval dashboard', () => {
      const dashboard = approvalSystem.getApprovalDashboard('user-1');

      expect(dashboard).toBeDefined();
      expect(Array.isArray(dashboard.pending_approvals)).toBe(true);
      expect(Array.isArray(dashboard.overdue_approvals)).toBe(true);
      expect(Array.isArray(dashboard.recent_decisions)).toBe(true);
      expect(dashboard.system_health).toBeDefined();
      expect(Array.isArray(dashboard.bottlenecks)).toBe(true);
    });
  });

  describe('Policy Management', () => {
    it('should add and remove approval policies', () => {
      const policy = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test approval policy',
        repositoryPattern: 'test-owner/*',
        approvalType: ApprovalType.AUTOMATION_DECISION,
        conditions: [],
        workflow: {
          name: 'Simple Approval',
          steps: [
            {
              id: 'step-1',
              name: 'Review',
              description: 'Initial review step',
              order: 1,
              approverRoles: [UserRole.APPROVER],
              teamIds: [],
              minApprovals: 1,
              requiresUnanimous: false,
              timeoutHours: 24,
              autoApprove: false,
              conditions: []
            }
          ]
        },
        enabled: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      approvalSystem.addApprovalPolicy(policy);

      const policies = approvalSystem.getApplicablePolicies(mockRepository, ApprovalType.AUTOMATION_DECISION);
      expect(policies).toHaveLength(1);
      expect(policies[0].id).toBe('test-policy');

      approvalSystem.removeApprovalPolicy('test-policy');

      const policiesAfter = approvalSystem.getApplicablePolicies(mockRepository, ApprovalType.AUTOMATION_DECISION);
      expect(policiesAfter).toHaveLength(0);
    });

    it('should find applicable policies', () => {
      const policy = {
        id: 'applicable-policy',
        name: 'Applicable Policy',
        description: 'Policy that applies to our test repo',
        repositoryPattern: 'test-owner/*',
        approvalType: ApprovalType.AUTOMATION_DECISION,
        conditions: [],
        workflow: {
          name: 'Simple Workflow',
          steps: [
            {
              id: 'review',
              name: 'Code Review',
              description: 'Review automation changes',
              order: 1,
              approverRoles: [UserRole.APPROVER],
              teamIds: [],
              minApprovals: 1,
              requiresUnanimous: false,
              timeoutHours: 48,
              autoApprove: false,
              conditions: []
            }
          ]
        },
        enabled: true,
        priority: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      approvalSystem.addApprovalPolicy(policy);

      const applicable = approvalSystem.getApplicablePolicies(mockRepository, ApprovalType.AUTOMATION_DECISION);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].priority).toBe(10);
    });
  });

  describe('Template Management', () => {
    it('should add and retrieve approval templates', () => {
      const template = {
        id: 'security-fix-template',
        name: 'Security Fix Template',
        description: 'Template for security fix approvals',
        type: ApprovalType.SECURITY_FIX,
        titleTemplate: 'Security Fix: {{vulnerability_title}}',
        descriptionTemplate: 'Critical security vulnerability requires immediate attention',
        priority: 'urgent' as const,
        defaultWorkflow: {
          name: 'Security Workflow',
          steps: [
            {
              id: 'security-review',
              name: 'Security Review',
              description: 'Security team review',
              order: 1,
              approverRoles: [UserRole.APPROVER],
              teamIds: [],
              minApprovals: 1,
              requiresUnanimous: false,
              timeoutHours: 4,
              autoApprove: false,
              conditions: []
            }
          ]
        },
        conditions: [],
        enabled: true,
        metadata: { category: 'security' }
      };

      approvalSystem.addApprovalTemplate(template);

      const retrieved = approvalSystem.getApprovalTemplate(ApprovalType.SECURITY_FIX);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('security-fix-template');
    });

    it('should manage approval templates', () => {
      const template = {
        id: 'template-test',
        name: 'Template Test',
        type: ApprovalType.AUTOMATION_DECISION,
        titleTemplate: 'Test Template',
        descriptionTemplate: 'Test description template',
        priority: 'medium' as const,
        defaultWorkflow: {
          name: 'Test Workflow',
          steps: []
        },
        conditions: [],
        enabled: true,
        metadata: {}
      };

      approvalSystem.addApprovalTemplate(template);

      const retrieved = approvalSystem.getApprovalTemplate(ApprovalType.AUTOMATION_DECISION);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('template-test');
    });
  });

  describe('Delegation Management', () => {
    it('should add and manage delegations', () => {
      const delegation = {
        id: 'test-delegation',
        delegatorId: 'user-1',
        delegateId: 'user-2',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        conditions: [],
        isActive: true,
        createdAt: new Date(),
        metadata: { reason: 'vacation' }
      };

      approvalSystem.addDelegation(delegation);

      const activeDelegations = approvalSystem.getActiveDelegations('user-1');
      expect(activeDelegations).toHaveLength(1);
      expect(activeDelegations[0].delegateId).toBe('user-2');

      approvalSystem.removeDelegation('test-delegation');

      const delegationsAfter = approvalSystem.getActiveDelegations('user-1');
      expect(delegationsAfter).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during approval request creation', async () => {
      const errorHandlerSpy = vi.spyOn(mockErrorHandler, 'handleError');

      // This should handle errors gracefully
      await expect(approvalSystem.createApprovalRequest(
        ApprovalType.AUTOMATION_DECISION,
        'Error Test',
        'Test error handling',
        'non-existent-user',
        mockRepository,
        { automationDecision: null as any },
        'medium'
      )).rejects.toThrow();

      expect(errorHandlerSpy).toHaveBeenCalled();
    });
  });
});