/**
 * Serverless security manager with IAM roles and function-level permissions
 */

import {
  ServerlessManager,
  ServerlessSecurityConfig,
  ServerlessPermissionConfig,
  ServerlessResourcePolicyConfig
} from '../types/serverless-types';

export interface ServerlessSecurityManagerConfig {
  providers: ServerlessProviderSecurityConfig[];
  globalPolicies: ServerlessGlobalSecurityPolicy[];
  complianceFrameworks: ServerlessComplianceFramework[];
  auditConfig: ServerlessAuditConfig;
  encryptionConfig: ServerlessEncryptionConfig;
}

export interface ServerlessProviderSecurityConfig {
  provider: 'aws' | 'azure' | 'gcp';
  manager: ServerlessManager;
  iamConfig: ServerlessIAMConfig;
  networkSecurity: ServerlessNetworkSecurityConfig;
  dataProtection: ServerlessDataProtectionConfig;
}

export interface ServerlessIAMConfig {
  rolePrefix: string;
  defaultPolicies: string[];
  customPolicies: ServerlessCustomPolicy[];
  crossAccountAccess: ServerlessCrossAccountConfig[];
}

export interface ServerlessCustomPolicy {
  name: string;
  description: string;
  statements: ServerlessPolicyStatement[];
}

export interface ServerlessPolicyStatement {
  effect: 'Allow' | 'Deny';
  actions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface ServerlessCrossAccountConfig {
  accountId: string;
  roleName: string;
  permissions: string[];
  conditions?: Record<string, any>;
}

export interface ServerlessNetworkSecurityConfig {
  vpcConfig: ServerlessVPCSecurityConfig;
  apiGateway: ServerlessAPIGatewaySecurityConfig;
  loadBalancer: ServerlessLoadBalancerSecurityConfig;
}

export interface ServerlessVPCSecurityConfig {
  enabled: boolean;
  vpcId?: string;
  subnetIds: string[];
  securityGroupIds: string[];
  routeTableIds: string[];
}

export interface ServerlessAPIGatewaySecurityConfig {
  authorizationType: 'NONE' | 'AWS_IAM' | 'CUSTOM' | 'COGNITO_USER_POOLS';
  apiKeyRequired: boolean;
  corsEnabled: boolean;
  throttling: ServerlessThrottlingConfig;
  wafEnabled: boolean;
}

export interface ServerlessThrottlingConfig {
  rateLimit: number;
  burstLimit: number;
  quotaLimit?: number;
  quotaPeriod?: 'DAY' | 'WEEK' | 'MONTH';
}

export interface ServerlessLoadBalancerSecurityConfig {
  sslPolicy: string;
  certificateArn?: string;
  securityGroups: string[];
  accessLogsEnabled: boolean;
}

export interface ServerlessDataProtectionConfig {
  encryptionAtRest: ServerlessEncryptionAtRestConfig;
  encryptionInTransit: ServerlessEncryptionInTransitConfig;
  dataClassification: ServerlessDataClassificationConfig;
  backupEncryption: ServerlessBackupEncryptionConfig;
}

export interface ServerlessEncryptionAtRestConfig {
  enabled: boolean;
  kmsKeyId?: string;
  algorithm: 'AES256' | 'aws:kms' | 'aws:kms:dsse';
}

export interface ServerlessEncryptionInTransitConfig {
  enabled: boolean;
  tlsVersion: '1.2' | '1.3';
  cipherSuites: string[];
}

export interface ServerlessDataClassificationConfig {
  enabled: boolean;
  classifications: ServerlessDataClassification[];
  scanningEnabled: boolean;
}

export interface ServerlessDataClassification {
  type: 'public' | 'internal' | 'confidential' | 'restricted';
  patterns: string[];
  actions: ServerlessDataClassificationAction[];
}

export interface ServerlessDataClassificationAction {
  type: 'encrypt' | 'mask' | 'alert' | 'block';
  config: Record<string, any>;
}

export interface ServerlessBackupEncryptionConfig {
  enabled: boolean;
  kmsKeyId?: string;
  retentionPeriod: number; // in days
}

export interface ServerlessGlobalSecurityPolicy {
  name: string;
  description: string;
  rules: ServerlessSecurityRule[];
  enforcement: 'advisory' | 'mandatory';
  exceptions: ServerlessSecurityException[];
}

export interface ServerlessSecurityRule {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'authorization' | 'encryption' | 'network' | 'logging' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: ServerlessSecurityCondition;
  action: ServerlessSecurityAction;
}

export interface ServerlessSecurityCondition {
  type: 'function-property' | 'environment-variable' | 'iam-role' | 'network-config' | 'custom';
  property: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'regex' | 'exists' | 'not-exists';
  value: any;
}

export interface ServerlessSecurityAction {
  type: 'allow' | 'deny' | 'warn' | 'modify' | 'audit';
  config?: Record<string, any>;
}

export interface ServerlessSecurityException {
  functionId: string;
  provider: string;
  ruleId: string;
  reason: string;
  approvedBy: string;
  expiresAt?: Date;
}

export interface ServerlessComplianceFramework {
  name: string;
  version: string;
  controls: ServerlessComplianceControl[];
  assessmentSchedule: string; // cron expression
}

export interface ServerlessComplianceControl {
  id: string;
  name: string;
  description: string;
  category: string;
  requirements: string[];
  automatedChecks: ServerlessAutomatedCheck[];
  manualChecks: ServerlessManualCheck[];
}

export interface ServerlessAutomatedCheck {
  id: string;
  name: string;
  description: string;
  script: string;
  schedule: string; // cron expression
  remediation?: ServerlessRemediation;
}

export interface ServerlessManualCheck {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  assignee?: string;
}

export interface ServerlessRemediation {
  type: 'automatic' | 'semi-automatic' | 'manual';
  script?: string;
  instructions?: string[];
  approvalRequired: boolean;
}

export interface ServerlessAuditConfig {
  enabled: boolean;
  logDestination: ServerlessAuditLogDestination;
  events: ServerlessAuditEvent[];
  retention: ServerlessAuditRetention;
  alerting: ServerlessAuditAlerting;
}

export interface ServerlessAuditLogDestination {
  type: 'cloudwatch' | 'cloudtrail' | 's3' | 'elasticsearch' | 'custom';
  config: Record<string, any>;
}

export interface ServerlessAuditEvent {
  type: 'function-invocation' | 'function-deployment' | 'permission-change' | 'configuration-change' | 'security-violation';
  enabled: boolean;
  includePayload: boolean;
  includeResponse: boolean;
}

export interface ServerlessAuditRetention {
  period: number; // in days
  archiveAfter: number; // in days
  deleteAfter: number; // in days
}

export interface ServerlessAuditAlerting {
  enabled: boolean;
  channels: ServerlessAuditAlertChannel[];
  rules: ServerlessAuditAlertRule[];
}

export interface ServerlessAuditAlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
}

export interface ServerlessAuditAlertRule {
  name: string;
  condition: string; // query expression
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
  cooldown: number; // in milliseconds
}

export interface ServerlessEncryptionConfig {
  defaultAlgorithm: string;
  keyRotationEnabled: boolean;
  keyRotationInterval: number; // in days
  keyManagement: ServerlessKeyManagementConfig;
}

export interface ServerlessKeyManagementConfig {
  provider: 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault' | 'custom';
  config: Record<string, any>;
}

export interface ServerlessSecurityAssessment {
  timestamp: Date;
  functionId: string;
  provider: string;
  overallScore: number; // 0-100
  categories: ServerlessSecurityCategoryScore[];
  violations: ServerlessSecurityViolation[];
  recommendations: ServerlessSecurityRecommendation[];
  complianceStatus: ServerlessComplianceStatus[];
}

export interface ServerlessSecurityCategoryScore {
  category: string;
  score: number; // 0-100
  maxScore: number;
  issues: number;
  recommendations: number;
}

export interface ServerlessSecurityViolation {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  remediation: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'false-positive';
  detectedAt: Date;
  resolvedAt?: Date;
}

export interface ServerlessSecurityRecommendation {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  implementation: string[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ServerlessComplianceStatus {
  framework: string;
  version: string;
  overallCompliance: number; // percentage
  controls: ServerlessComplianceControlStatus[];
  lastAssessment: Date;
  nextAssessment: Date;
}

export interface ServerlessComplianceControlStatus {
  controlId: string;
  name: string;
  status: 'compliant' | 'non-compliant' | 'not-applicable' | 'not-assessed';
  score: number; // 0-100
  findings: string[];
  evidence: string[];
  lastChecked: Date;
}

export class ServerlessSecurityManager {
  private readonly config: ServerlessSecurityManagerConfig;
  private readonly assessmentCache: Map<string, ServerlessSecurityAssessment> = new Map();
  private readonly complianceSchedules: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ServerlessSecurityManagerConfig) {
    this.config = config;
    this.initializeComplianceSchedules();
  }

  async assessFunctionSecurity(functionId: string, provider: string): Promise<ServerlessSecurityAssessment> {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured for security assessment`);
    }

    // Get function information
    const functionInfo = await this.getFunctionSecurityInfo(functionId, provider);
    
    // Evaluate security rules
    const violations = await this.evaluateSecurityRules(functionId, provider, functionInfo);
    
    // Calculate scores
    const categoryScores = this.calculateCategoryScores(violations);
    const overallScore = this.calculateOverallScore(categoryScores);
    
    // Generate recommendations
    const recommendations = this.generateSecurityRecommendations(violations, functionInfo);
    
    // Check compliance
    const complianceStatus = await this.assessCompliance(functionId, provider, functionInfo);

    const assessment: ServerlessSecurityAssessment = {
      timestamp: new Date(),
      functionId,
      provider,
      overallScore,
      categories: categoryScores,
      violations,
      recommendations,
      complianceStatus
    };

    // Cache assessment
    const cacheKey = `${provider}:${functionId}`;
    this.assessmentCache.set(cacheKey, assessment);

    return assessment;
  }

  async configureIAMRole(functionId: string, provider: string, permissions: string[]): Promise<ServerlessIAMRoleResult> {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const roleName = this.generateRoleName(functionId, providerConfig.iamConfig.rolePrefix);
    const policyDocument = this.generatePolicyDocument(permissions, functionId);
    
    // Create or update IAM role
    const roleArn = await this.createOrUpdateIAMRole(provider, roleName, policyDocument);
    
    // Attach role to function
    await this.attachRoleToFunction(functionId, provider, roleArn);

    return {
      roleName,
      roleArn,
      permissions,
      policyDocument,
      attachedAt: new Date()
    };
  }

  async configureNetworkSecurity(functionId: string, provider: string, networkConfig: ServerlessNetworkSecurityConfig): Promise<void> {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    // Configure VPC settings
    if (networkConfig.vpcConfig.enabled) {
      await this.configureVPCSettings(functionId, provider, networkConfig.vpcConfig);
    }

    // Configure API Gateway security
    if (networkConfig.apiGateway) {
      await this.configureAPIGatewaySecurity(functionId, provider, networkConfig.apiGateway);
    }

    // Configure Load Balancer security
    if (networkConfig.loadBalancer) {
      await this.configureLoadBalancerSecurity(functionId, provider, networkConfig.loadBalancer);
    }
  }

  async enableEncryption(functionId: string, provider: string, encryptionConfig: ServerlessDataProtectionConfig): Promise<void> {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    // Enable encryption at rest
    if (encryptionConfig.encryptionAtRest.enabled) {
      await this.enableEncryptionAtRest(functionId, provider, encryptionConfig.encryptionAtRest);
    }

    // Enable encryption in transit
    if (encryptionConfig.encryptionInTransit.enabled) {
      await this.enableEncryptionInTransit(functionId, provider, encryptionConfig.encryptionInTransit);
    }

    // Configure backup encryption
    if (encryptionConfig.backupEncryption.enabled) {
      await this.enableBackupEncryption(functionId, provider, encryptionConfig.backupEncryption);
    }
  }

  async scanForVulnerabilities(functionId: string, provider: string): Promise<ServerlessVulnerabilityReport> {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    // Perform security scans
    const [
      dependencyVulnerabilities,
      codeVulnerabilities,
      configurationVulnerabilities,
      infrastructureVulnerabilities
    ] = await Promise.all([
      this.scanDependencies(functionId, provider),
      this.scanCode(functionId, provider),
      this.scanConfiguration(functionId, provider),
      this.scanInfrastructure(functionId, provider)
    ]);

    const allVulnerabilities = [
      ...dependencyVulnerabilities,
      ...codeVulnerabilities,
      ...configurationVulnerabilities,
      ...infrastructureVulnerabilities
    ];

    const criticalCount = allVulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = allVulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = allVulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = allVulnerabilities.filter(v => v.severity === 'low').length;

    return {
      functionId,
      provider,
      scanTimestamp: new Date(),
      vulnerabilities: allVulnerabilities,
      summary: {
        total: allVulnerabilities.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount
      },
      riskScore: this.calculateRiskScore(allVulnerabilities),
      recommendations: this.generateVulnerabilityRecommendations(allVulnerabilities)
    };
  }

  async generateComplianceReport(framework: string): Promise<ServerlessComplianceReport> {
    const complianceFramework = this.config.complianceFrameworks.find(f => f.name === framework);
    if (!complianceFramework) {
      throw new Error(`Compliance framework ${framework} not configured`);
    }

    const controlResults: ServerlessComplianceControlResult[] = [];

    for (const control of complianceFramework.controls) {
      const result = await this.assessComplianceControl(control);
      controlResults.push(result);
    }

    const overallCompliance = this.calculateOverallCompliance(controlResults);
    const findings = controlResults.flatMap(r => r.findings);
    const recommendations = this.generateComplianceRecommendations(controlResults);

    return {
      framework: complianceFramework.name,
      version: complianceFramework.version,
      assessmentDate: new Date(),
      overallCompliance,
      controlResults,
      findings,
      recommendations,
      nextAssessment: this.calculateNextAssessmentDate(complianceFramework.assessmentSchedule)
    };
  }

  dispose(): void {
    // Clear compliance schedules
    for (const schedule of this.complianceSchedules.values()) {
      clearTimeout(schedule);
    }
    this.complianceSchedules.clear();
  }

  // Private methods
  private getProviderConfig(provider: string): ServerlessProviderSecurityConfig | undefined {
    return this.config.providers.find(p => p.provider === provider);
  }

  private async getFunctionSecurityInfo(functionId: string, provider: string): Promise<any> {
    // Mock implementation - get function security information
    return {
      functionName: functionId,
      runtime: 'nodejs18.x',
      role: 'arn:aws:iam::123456789012:role/lambda-role',
      vpcConfig: null,
      environment: { variables: {} },
      kmsKeyArn: null,
      deadLetterConfig: null,
      tracingConfig: { mode: 'PassThrough' }
    };
  }

  private async evaluateSecurityRules(functionId: string, provider: string, functionInfo: any): Promise<ServerlessSecurityViolation[]> {
    const violations: ServerlessSecurityViolation[] = [];

    for (const policy of this.config.globalPolicies) {
      for (const rule of policy.rules) {
        const violates = await this.evaluateSecurityRule(rule, functionInfo);
        if (violates) {
          violations.push({
            id: `${rule.id}-${Date.now()}`,
            ruleId: rule.id,
            severity: rule.severity,
            title: rule.name,
            description: rule.description,
            remediation: this.generateRemediation(rule),
            status: 'open',
            detectedAt: new Date()
          });
        }
      }
    }

    return violations;
  }

  private async evaluateSecurityRule(rule: ServerlessSecurityRule, functionInfo: any): Promise<boolean> {
    // Mock implementation - evaluate security rule
    switch (rule.condition.type) {
      case 'function-property':
        return this.evaluatePropertyCondition(rule.condition, functionInfo);
      case 'environment-variable':
        return this.evaluateEnvironmentCondition(rule.condition, functionInfo);
      case 'iam-role':
        return this.evaluateIAMCondition(rule.condition, functionInfo);
      case 'network-config':
        return this.evaluateNetworkCondition(rule.condition, functionInfo);
      default:
        return false;
    }
  }

  private evaluatePropertyCondition(condition: ServerlessSecurityCondition, functionInfo: any): boolean {
    const value = this.getNestedProperty(functionInfo, condition.property);
    return this.evaluateCondition(condition.operator, value, condition.value);
  }

  private evaluateEnvironmentCondition(condition: ServerlessSecurityCondition, functionInfo: any): boolean {
    const envVars = functionInfo.environment?.variables || {};
    const value = envVars[condition.property];
    return this.evaluateCondition(condition.operator, value, condition.value);
  }

  private evaluateIAMCondition(condition: ServerlessSecurityCondition, functionInfo: any): boolean {
    const role = functionInfo.role;
    return this.evaluateCondition(condition.operator, role, condition.value);
  }

  private evaluateNetworkCondition(condition: ServerlessSecurityCondition, functionInfo: any): boolean {
    const vpcConfig = functionInfo.vpcConfig;
    return this.evaluateCondition(condition.operator, vpcConfig, condition.value);
  }

  private evaluateCondition(operator: string, actual: any, expected: any): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'not-equals': return actual !== expected;
      case 'contains': return actual && actual.includes && actual.includes(expected);
      case 'not-contains': return !actual || !actual.includes || !actual.includes(expected);
      case 'regex': return new RegExp(expected).test(actual);
      case 'exists': return actual !== undefined && actual !== null;
      case 'not-exists': return actual === undefined || actual === null;
      default: return false;
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateCategoryScores(violations: ServerlessSecurityViolation[]): ServerlessSecurityCategoryScore[] {
    const categories = ['authentication', 'authorization', 'encryption', 'network', 'logging', 'compliance'];
    
    return categories.map(category => {
      const categoryViolations = violations.filter(v => v.ruleId.includes(category));
      const criticalIssues = categoryViolations.filter(v => v.severity === 'critical').length;
      const highIssues = categoryViolations.filter(v => v.severity === 'high').length;
      const mediumIssues = categoryViolations.filter(v => v.severity === 'medium').length;
      const lowIssues = categoryViolations.filter(v => v.severity === 'low').length;
      
      const maxScore = 100;
      const deductions = (criticalIssues * 25) + (highIssues * 15) + (mediumIssues * 10) + (lowIssues * 5);
      const score = Math.max(0, maxScore - deductions);
      
      return {
        category,
        score,
        maxScore,
        issues: categoryViolations.length,
        recommendations: Math.min(categoryViolations.length, 5) // Max 5 recommendations per category
      };
    });
  }

  private calculateOverallScore(categoryScores: ServerlessSecurityCategoryScore[]): number {
    const totalScore = categoryScores.reduce((sum, category) => sum + category.score, 0);
    const maxTotalScore = categoryScores.reduce((sum, category) => sum + category.maxScore, 0);
    return maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;
  }

  private generateSecurityRecommendations(violations: ServerlessSecurityViolation[], functionInfo: any): ServerlessSecurityRecommendation[] {
    const recommendations: ServerlessSecurityRecommendation[] = [];

    // Group violations by category and generate recommendations
    const violationsByCategory = this.groupViolationsByCategory(violations);

    for (const [category, categoryViolations] of violationsByCategory.entries()) {
      if (categoryViolations.length > 0) {
        recommendations.push({
          id: `${category}-${Date.now()}`,
          category,
          priority: this.determinePriority(categoryViolations),
          title: `Improve ${category} security`,
          description: `Address ${categoryViolations.length} ${category} security issues`,
          implementation: this.generateImplementationSteps(category, categoryViolations),
          impact: this.describeSecurityImpact(category),
          effort: this.estimateEffort(categoryViolations)
        });
      }
    }

    return recommendations;
  }

  private groupViolationsByCategory(violations: ServerlessSecurityViolation[]): Map<string, ServerlessSecurityViolation[]> {
    const groups = new Map<string, ServerlessSecurityViolation[]>();
    
    for (const violation of violations) {
      const category = this.extractCategoryFromRuleId(violation.ruleId);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(violation);
    }
    
    return groups;
  }

  private extractCategoryFromRuleId(ruleId: string): string {
    // Extract category from rule ID (e.g., "authentication-rule-1" -> "authentication")
    return ruleId.split('-')[0] || 'general';
  }

  private determinePriority(violations: ServerlessSecurityViolation[]): 'low' | 'medium' | 'high' {
    const hasCritical = violations.some(v => v.severity === 'critical');
    const hasHigh = violations.some(v => v.severity === 'high');
    
    if (hasCritical) return 'high';
    if (hasHigh) return 'medium';
    return 'low';
  }

  private generateImplementationSteps(category: string, violations: ServerlessSecurityViolation[]): string[] {
    // Generate category-specific implementation steps
    const steps: string[] = [];
    
    switch (category) {
      case 'authentication':
        steps.push('Configure proper authentication mechanisms');
        steps.push('Implement multi-factor authentication where applicable');
        steps.push('Review and update authentication policies');
        break;
      case 'authorization':
        steps.push('Implement least privilege access controls');
        steps.push('Review and update IAM roles and policies');
        steps.push('Configure resource-based permissions');
        break;
      case 'encryption':
        steps.push('Enable encryption at rest for all data');
        steps.push('Configure encryption in transit');
        steps.push('Implement proper key management');
        break;
      case 'network':
        steps.push('Configure VPC settings for network isolation');
        steps.push('Implement proper security group rules');
        steps.push('Enable network monitoring and logging');
        break;
      case 'logging':
        steps.push('Enable comprehensive audit logging');
        steps.push('Configure log retention and archival');
        steps.push('Implement log monitoring and alerting');
        break;
      default:
        steps.push('Review and address security violations');
        steps.push('Implement security best practices');
        steps.push('Monitor and maintain security posture');
    }
    
    return steps;
  }

  private describeSecurityImpact(category: string): string {
    const impacts: Record<string, string> = {
      authentication: 'Improved access control and reduced unauthorized access risk',
      authorization: 'Better privilege management and reduced privilege escalation risk',
      encryption: 'Enhanced data protection and compliance with security standards',
      network: 'Improved network security and reduced attack surface',
      logging: 'Better visibility and incident response capabilities',
      compliance: 'Improved regulatory compliance and audit readiness'
    };
    
    return impacts[category] || 'Enhanced overall security posture';
  }

  private estimateEffort(violations: ServerlessSecurityViolation[]): 'low' | 'medium' | 'high' {
    const totalViolations = violations.length;
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    
    if (criticalCount > 3 || totalViolations > 10) return 'high';
    if (criticalCount > 1 || totalViolations > 5) return 'medium';
    return 'low';
  }

  private async assessCompliance(functionId: string, provider: string, functionInfo: any): Promise<ServerlessComplianceStatus[]> {
    const complianceStatuses: ServerlessComplianceStatus[] = [];

    for (const framework of this.config.complianceFrameworks) {
      const controlStatuses: ServerlessComplianceControlStatus[] = [];
      
      for (const control of framework.controls) {
        const status = await this.assessComplianceControl(control);
        controlStatuses.push({
          controlId: control.id,
          name: control.name,
          status: status.compliant ? 'compliant' : 'non-compliant',
          score: status.score,
          findings: status.findings,
          evidence: status.evidence,
          lastChecked: new Date()
        });
      }

      const overallCompliance = this.calculateOverallCompliance(controlStatuses.map(cs => ({ compliant: cs.status === 'compliant', score: cs.score, findings: cs.findings, evidence: cs.evidence })));

      complianceStatuses.push({
        framework: framework.name,
        version: framework.version,
        overallCompliance,
        controls: controlStatuses,
        lastAssessment: new Date(),
        nextAssessment: this.calculateNextAssessmentDate(framework.assessmentSchedule)
      });
    }

    return complianceStatuses;
  }

  private async assessComplianceControl(control: ServerlessComplianceControl): Promise<ServerlessComplianceControlResult> {
    // Mock implementation - assess compliance control
    const compliant = Math.random() > 0.3; // 70% compliance rate
    const score = compliant ? 100 : Math.floor(Math.random() * 70);
    const findings = compliant ? [] : [`Control ${control.id} is not fully compliant`];
    const evidence = [`Automated check performed on ${new Date().toISOString()}`];

    return {
      compliant,
      score,
      findings,
      evidence
    };
  }

  private calculateOverallCompliance(controlResults: ServerlessComplianceControlResult[]): number {
    if (controlResults.length === 0) return 0;
    
    const totalScore = controlResults.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / controlResults.length);
  }

  private generateRemediation(rule: ServerlessSecurityRule): string {
    // Generate remediation steps based on rule category
    const remediations: Record<string, string> = {
      authentication: 'Configure proper authentication mechanisms and review access controls',
      authorization: 'Implement least privilege access and review IAM policies',
      encryption: 'Enable encryption at rest and in transit with proper key management',
      network: 'Configure VPC settings and security groups for network isolation',
      logging: 'Enable comprehensive audit logging and monitoring',
      compliance: 'Review and implement compliance requirements'
    };
    
    return remediations[rule.category] || 'Review and address the security issue according to best practices';
  }

  private generateRoleName(functionId: string, prefix: string): string {
    return `${prefix}-${functionId}-${Date.now()}`;
  }

  private generatePolicyDocument(permissions: string[], functionId: string): any {
    // Mock implementation - generate IAM policy document
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: permissions,
          Resource: '*'
        }
      ]
    };
  }

  private async createOrUpdateIAMRole(provider: string, roleName: string, policyDocument: any): Promise<string> {
    // Mock implementation - create or update IAM role
    return `arn:aws:iam::123456789012:role/${roleName}`;
  }

  private async attachRoleToFunction(functionId: string, provider: string, roleArn: string): Promise<void> {
    // Mock implementation - attach role to function
  }

  private async configureVPCSettings(functionId: string, provider: string, vpcConfig: ServerlessVPCSecurityConfig): Promise<void> {
    // Mock implementation - configure VPC settings
  }

  private async configureAPIGatewaySecurity(functionId: string, provider: string, apiConfig: ServerlessAPIGatewaySecurityConfig): Promise<void> {
    // Mock implementation - configure API Gateway security
  }

  private async configureLoadBalancerSecurity(functionId: string, provider: string, lbConfig: ServerlessLoadBalancerSecurityConfig): Promise<void> {
    // Mock implementation - configure Load Balancer security
  }

  private async enableEncryptionAtRest(functionId: string, provider: string, config: ServerlessEncryptionAtRestConfig): Promise<void> {
    // Mock implementation - enable encryption at rest
  }

  private async enableEncryptionInTransit(functionId: string, provider: string, config: ServerlessEncryptionInTransitConfig): Promise<void> {
    // Mock implementation - enable encryption in transit
  }

  private async enableBackupEncryption(functionId: string, provider: string, config: ServerlessBackupEncryptionConfig): Promise<void> {
    // Mock implementation - enable backup encryption
  }

  private async scanDependencies(functionId: string, provider: string): Promise<ServerlessVulnerability[]> {
    // Mock implementation - scan dependencies for vulnerabilities
    return [];
  }

  private async scanCode(functionId: string, provider: string): Promise<ServerlessVulnerability[]> {
    // Mock implementation - scan code for vulnerabilities
    return [];
  }

  private async scanConfiguration(functionId: string, provider: string): Promise<ServerlessVulnerability[]> {
    // Mock implementation - scan configuration for vulnerabilities
    return [];
  }

  private async scanInfrastructure(functionId: string, provider: string): Promise<ServerlessVulnerability[]> {
    // Mock implementation - scan infrastructure for vulnerabilities
    return [];
  }

  private calculateRiskScore(vulnerabilities: ServerlessVulnerability[]): number {
    // Calculate risk score based on vulnerabilities
    const weights = { critical: 10, high: 7, medium: 4, low: 1 };
    const totalScore = vulnerabilities.reduce((sum, vuln) => sum + weights[vuln.severity], 0);
    return Math.min(100, totalScore); // Cap at 100
  }

  private generateVulnerabilityRecommendations(vulnerabilities: ServerlessVulnerability[]): string[] {
    const recommendations: string[] = [];
    
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical vulnerabilities immediately`);
    }
    
    if (highCount > 0) {
      recommendations.push(`Prioritize fixing ${highCount} high-severity vulnerabilities`);
    }
    
    recommendations.push('Implement automated vulnerability scanning in CI/CD pipeline');
    recommendations.push('Establish regular security review processes');
    
    return recommendations;
  }

  private generateComplianceRecommendations(controlResults: ServerlessComplianceControlResult[]): string[] {
    const recommendations: string[] = [];
    
    const nonCompliantCount = controlResults.filter(r => !r.compliant).length;
    
    if (nonCompliantCount > 0) {
      recommendations.push(`Address ${nonCompliantCount} non-compliant controls`);
    }
    
    recommendations.push('Implement automated compliance monitoring');
    recommendations.push('Establish regular compliance assessments');
    recommendations.push('Document compliance procedures and evidence');
    
    return recommendations;
  }

  private calculateNextAssessmentDate(schedule: string): Date {
    // Mock implementation - calculate next assessment date based on cron schedule
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1); // Monthly by default
    return nextDate;
  }

  private initializeComplianceSchedules(): void {
    for (const framework of this.config.complianceFrameworks) {
      // Mock implementation - schedule compliance assessments
      const scheduleId = setTimeout(() => {
        this.generateComplianceReport(framework.name);
      }, 24 * 60 * 60 * 1000); // Daily
      
      this.complianceSchedules.set(framework.name, scheduleId);
    }
  }
}

// Additional interfaces
export interface ServerlessIAMRoleResult {
  roleName: string;
  roleArn: string;
  permissions: string[];
  policyDocument: any;
  attachedAt: Date;
}

export interface ServerlessVulnerabilityReport {
  functionId: string;
  provider: string;
  scanTimestamp: Date;
  vulnerabilities: ServerlessVulnerability[];
  summary: ServerlessVulnerabilitySummary;
  riskScore: number;
  recommendations: string[];
}

export interface ServerlessVulnerability {
  id: string;
  type: 'dependency' | 'code' | 'configuration' | 'infrastructure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  cve?: string;
  cvss?: number;
  remediation: string;
  references: string[];
}

export interface ServerlessVulnerabilitySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ServerlessComplianceReport {
  framework: string;
  version: string;
  assessmentDate: Date;
  overallCompliance: number;
  controlResults: ServerlessComplianceControlResult[];
  findings: string[];
  recommendations: string[];
  nextAssessment: Date;
}

export interface ServerlessComplianceControlResult {
  compliant: boolean;
  score: number;
  findings: string[];
  evidence: string[];
}