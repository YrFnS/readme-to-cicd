/**
 * Enterprise Integration System
 * 
 * Comprehensive integration hub for enterprise systems including:
 * - Identity providers (LDAP, Active Directory, SSO)
 * - Workflow systems (Jira, ServiceNow, Custom)
 * - Notification platforms (Slack, Teams, Email, Webhooks)
 * - CI/CD platforms (Jenkins, GitLab CI, GitHub Actions)
 * - Monitoring systems (Datadog, New Relic, Prometheus)
 */

// Core integration hub
export { IntegrationHub } from './hub/integration-hub.js';

// Type definitions
export * from './types.js';

// Integration managers
export { IdentityIntegrationManager } from './identity/identity-integration-manager.js';
export { WorkflowIntegrationManager } from './workflow/workflow-integration-manager.js';
export { NotificationIntegrationManager } from './notifications/notification-integration-manager.js';
export { CICDIntegrationManager } from './cicd/cicd-integration-manager.js';
export { MonitoringIntegrationManager } from './monitoring/monitoring-integration-manager.js';

// Identity providers
export { LDAPProvider } from './identity/ldap-provider.js';
export { ActiveDirectoryProvider } from './identity/active-directory-provider.js';
export { SSOProvider } from './identity/sso-provider.js';

// Workflow providers
export { JiraProvider } from './workflow/jira-provider.js';
export { ServiceNowProvider } from './workflow/servicenow-provider.js';
export { CustomWorkflowProvider } from './workflow/custom-workflow-provider.js';

// Notification providers
export { SlackProvider } from './notifications/slack-provider.js';
export { TeamsProvider } from './notifications/teams-provider.js';
export { EmailProvider } from './notifications/email-provider.js';
export { WebhookProvider } from './notifications/webhook-provider.js';

// CI/CD providers
export { JenkinsProvider } from './cicd/jenkins-provider.js';
export { GitLabCIProvider } from './cicd/gitlab-ci-provider.js';
export { GitHubActionsProvider } from './cicd/github-actions-provider.js';

// Monitoring providers
export { DatadogProvider } from './monitoring/datadog-provider.js';
export { NewRelicProvider } from './monitoring/newrelic-provider.js';
export { PrometheusProvider } from './monitoring/prometheus-provider.js';

/**
 * Create and configure a new IntegrationHub instance
 * 
 * @example
 * ```typescript
 * import { createIntegrationHub, IntegrationConfig } from './integration';
 * 
 * const hub = createIntegrationHub();
 * 
 * const ldapConfig: IntegrationConfig = {
 *   id: 'corporate-ldap',
 *   name: 'Corporate LDAP',
 *   type: 'identity',
 *   enabled: true,
 *   configuration: {
 *     type: 'ldap',
 *     endpoint: 'ldap://ldap.corp.com:389',
 *     configuration: {
 *       baseDN: 'dc=corp,dc=com',
 *       searchFilter: '(uid={username})'
 *     }
 *   },
 *   credentials: {
 *     type: 'basic-auth',
 *     data: {
 *       username: 'service-account',
 *       password: 'service-password'
 *     }
 *   }
 * };
 * 
 * await hub.registerIntegration(ldapConfig);
 * const syncResult = await hub.syncIntegration('corporate-ldap');
 * ```
 */
export function createIntegrationHub(): IntegrationHub {
  return new IntegrationHub();
}

/**
 * Utility function to validate integration configuration
 * 
 * @param config - Integration configuration to validate
 * @returns Promise that resolves if valid, rejects if invalid
 */
export async function validateIntegrationConfig(config: any): Promise<void> {
  if (!config.id || !config.name || !config.type) {
    throw new Error('Integration config must have id, name, and type');
  }

  const validTypes = ['identity', 'workflow', 'notification', 'cicd', 'monitoring'];
  if (!validTypes.includes(config.type)) {
    throw new Error(`Invalid integration type: ${config.type}`);
  }

  if (!config.configuration) {
    throw new Error('Integration config must have configuration object');
  }
}

/**
 * Utility function to create integration configuration templates
 */
export const IntegrationTemplates = {
  /**
   * Create LDAP identity integration template
   */
  ldap: (id: string, name: string, endpoint: string, baseDN: string) => ({
    id,
    name,
    type: 'identity' as const,
    enabled: true,
    configuration: {
      type: 'ldap',
      endpoint,
      configuration: {
        baseDN,
        searchFilter: '(uid={username})',
        attributes: ['uid', 'cn', 'mail', 'memberOf']
      }
    }
  }),

  /**
   * Create Slack notification integration template
   */
  slack: (id: string, name: string, webhookUrl: string, channel: string) => ({
    id,
    name,
    type: 'notification' as const,
    enabled: true,
    configuration: {
      type: 'slack',
      configuration: {
        webhookUrl,
        channel
      }
    }
  }),

  /**
   * Create Jira workflow integration template
   */
  jira: (id: string, name: string, baseUrl: string, projectKey: string) => ({
    id,
    name,
    type: 'workflow' as const,
    enabled: true,
    configuration: {
      type: 'jira',
      baseUrl,
      configuration: {
        projectKey,
        apiVersion: '3'
      }
    }
  }),

  /**
   * Create Jenkins CI/CD integration template
   */
  jenkins: (id: string, name: string, baseUrl: string) => ({
    id,
    name,
    type: 'cicd' as const,
    enabled: true,
    configuration: {
      type: 'jenkins',
      baseUrl,
      configuration: {
        defaultBranch: 'main'
      }
    }
  }),

  /**
   * Create Datadog monitoring integration template
   */
  datadog: (id: string, name: string, apiKey: string, region: string) => ({
    id,
    name,
    type: 'monitoring' as const,
    enabled: true,
    configuration: {
      type: 'datadog',
      configuration: {
        apiKey,
        region
      }
    }
  })
};

/**
 * Integration system constants
 */
export const IntegrationConstants = {
  DEFAULT_SYNC_INTERVAL: 300000, // 5 minutes
  DEFAULT_HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  
  SUPPORTED_IDENTITY_TYPES: ['ldap', 'active-directory', 'sso', 'oauth', 'saml'],
  SUPPORTED_WORKFLOW_TYPES: ['jira', 'servicenow', 'custom'],
  SUPPORTED_NOTIFICATION_TYPES: ['slack', 'teams', 'email', 'webhook'],
  SUPPORTED_CICD_TYPES: ['jenkins', 'gitlab-ci', 'github-actions', 'azure-devops'],
  SUPPORTED_MONITORING_TYPES: ['datadog', 'newrelic', 'prometheus', 'custom']
};