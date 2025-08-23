/**
 * Security Manager Implementation
 * 
 * Provides comprehensive security management including authentication,
 * authorization, encryption, audit logging, and compliance validation.
 */

import {
  Credentials,
  AuthenticationResult,
  User,
  Resource,
  Action,
  AuditEvent,
  EncryptionContext,
  SecurityConfig,
  ComplianceFramework,
  ComplianceReport,
  SecurityScan,
  Policy,
  PolicyResult,
  RiskAssessment
} from './types.js'
import { AuthenticationService } from './authentication/authentication-service.js'
import { AuthorizationService } from './authorization/authorization-service.js'
import { EncryptionService } from './encryption/encryption-service.js'
import { AuditService } from './audit/audit-service.js'
import { ComplianceService } from './compliance/compliance-service.js'
import { SecurityScanningService } from './scanning/security-scanning-service.js'

export interface SecurityManagerConfig {
  security: SecurityConfig
  enableRealTimeMonitoring: boolean
  enableThreatDetection: boolean
  enableAutoRemediation: boolean
}

export class SecurityManager {
  private authService: AuthenticationService
  private authzService: AuthorizationService
  private encryptionService: EncryptionService
  private auditService: AuditService
  private complianceService: ComplianceService
  private scanningService: SecurityScanningService
  private config: SecurityManagerConfig

  constructor(config: SecurityManagerConfig) {
    this.config = config
    this.initializeServices()
  }

  private initializeServices(): void {
    this.authService = new AuthenticationService(this.config.security.authentication)
    this.authzService = new AuthorizationService(this.config.security.authorization)
    this.encryptionService = new EncryptionService(this.config.security.encryption)
    this.auditService = new AuditService(this.config.security.audit)
    this.complianceService = new ComplianceService(this.config.security.compliance)
    this.scanningService = new SecurityScanningService(this.config.security.scanning)
  }

  // Authentication Methods
  async authenticate(credentials: Credentials): Promise<AuthenticationResult> {
    try {
      const result = await this.authService.authenticate(credentials)
      
      // Log authentication attempt
      await this.auditService.logEvent({
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: 'authentication',
        resource: 'auth-service',
        action: 'login',
        result: result.success ? 'success' : 'failure',
        details: {
          credentialType: credentials.type,
          userId: result.user?.id,
          error: result.error
        }
      })

      return result
    } catch (error) {
      await this.auditService.logEvent({
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: 'authentication',
        resource: 'auth-service',
        action: 'login',
        result: 'error',
        details: {
          credentialType: credentials.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  async validateToken(token: string): Promise<User | null> {
    return this.authService.validateToken(token)
  }

  async refreshToken(refreshToken: string): Promise<AuthenticationResult> {
    return this.authService.refreshToken(refreshToken)
  }

  async logout(token: string): Promise<void> {
    const user = await this.validateToken(token)
    await this.authService.logout(token)
    
    if (user) {
      await this.auditService.logEvent({
        id: this.generateEventId(),
        timestamp: new Date(),
        userId: user.id,
        eventType: 'authentication',
        resource: 'auth-service',
        action: 'logout',
        result: 'success',
        details: { userId: user.id }
      })
    }
  }

  // Authorization Methods
  async authorize(user: User, resource: Resource, action: Action): Promise<boolean> {
    try {
      const authorized = await this.authzService.authorize(user, resource, action)
      
      // Log authorization attempt
      await this.auditService.logEvent({
        id: this.generateEventId(),
        timestamp: new Date(),
        userId: user.id,
        eventType: 'authorization',
        resource: `${resource.type}:${resource.id}`,
        action,
        result: authorized ? 'success' : 'failure',
        details: {
          userId: user.id,
          resourceType: resource.type,
          resourceId: resource.id,
          action,
          authorized
        }
      })

      return authorized
    } catch (error) {
      await this.auditService.logEvent({
        id: this.generateEventId(),
        timestamp: new Date(),
        userId: user.id,
        eventType: 'authorization',
        resource: `${resource.type}:${resource.id}`,
        action,
        result: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  async checkPermission(user: User, permission: string): Promise<boolean> {
    return this.authzService.checkPermission(user, permission)
  }

  async getUserRoles(userId: string): Promise<string[]> {
    return this.authzService.getUserRoles(userId)
  }

  // Encryption Methods
  async encrypt(data: string, context?: EncryptionContext): Promise<string> {
    const result = await this.encryptionService.encrypt(data, context)
    
    // Log encryption operation (without sensitive data)
    await this.auditService.logEvent({
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'security-event',
      resource: 'encryption-service',
      action: 'encrypt',
      result: 'success',
      details: {
        algorithm: context?.algorithm || 'default',
        keyId: context?.keyId,
        dataLength: data.length
      }
    })

    return result
  }

  async decrypt(encryptedData: string, context?: EncryptionContext): Promise<string> {
    const result = await this.encryptionService.decrypt(encryptedData, context)
    
    // Log decryption operation (without sensitive data)
    await this.auditService.logEvent({
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'security-event',
      resource: 'encryption-service',
      action: 'decrypt',
      result: 'success',
      details: {
        algorithm: context?.algorithm || 'default',
        keyId: context?.keyId,
        dataLength: encryptedData.length
      }
    })

    return result
  }

  async rotateKeys(): Promise<void> {
    await this.encryptionService.rotateKeys()
    
    await this.auditService.logEvent({
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'security-event',
      resource: 'encryption-service',
      action: 'key-rotation',
      result: 'success',
      details: { timestamp: new Date().toISOString() }
    })
  }

  // Audit Methods
  async auditLog(event: AuditEvent): Promise<void> {
    return this.auditService.logEvent(event)
  }

  async getAuditEvents(query: any): Promise<AuditEvent[]> {
    return this.auditService.getEvents(query)
  }

  async generateAuditReport(timeRange: { start: Date; end: Date }): Promise<any> {
    return this.auditService.generateReport(timeRange)
  }

  // Compliance Methods
  async validateCompliance(framework: ComplianceFramework): Promise<ComplianceReport> {
    const report = await this.complianceService.validateCompliance(framework)
    
    await this.auditService.logEvent({
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'compliance-check',
      resource: 'compliance-service',
      action: 'validate',
      result: 'success',
      details: {
        frameworkId: framework.id,
        overallScore: report.overallScore,
        controlsChecked: report.controlResults.length
      }
    })

    return report
  }

  async enforcePolicy(policy: Policy): Promise<PolicyResult> {
    return this.complianceService.enforcePolicy(policy)
  }

  async trackRisk(risk: RiskAssessment): Promise<void> {
    await this.complianceService.trackRisk(risk)
    
    await this.auditService.logEvent({
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'security-event',
      resource: 'risk-management',
      action: 'track-risk',
      result: 'success',
      details: {
        riskId: risk.id,
        riskType: risk.riskType,
        severity: risk.severity,
        status: risk.status
      }
    })
  }

  // Security Scanning Methods
  async startSecurityScan(type: string, target: string): Promise<SecurityScan> {
    const scan = await this.scanningService.startScan(type, target)
    
    await this.auditService.logEvent({
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'security-event',
      resource: 'security-scanner',
      action: 'start-scan',
      result: 'success',
      details: {
        scanId: scan.id,
        scanType: type,
        target
      }
    })

    return scan
  }

  async getScanResults(scanId: string): Promise<SecurityScan> {
    return this.scanningService.getScanResults(scanId)
  }

  async getVulnerabilities(severity?: string): Promise<any[]> {
    return this.scanningService.getVulnerabilities(severity)
  }

  // Threat Detection Methods
  async detectThreats(): Promise<any[]> {
    if (!this.config.enableThreatDetection) {
      return []
    }

    // Implement threat detection logic
    const threats = await this.analyzeSecurityEvents()
    
    if (threats.length > 0) {
      await this.auditService.logEvent({
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: 'security-event',
        resource: 'threat-detection',
        action: 'detect-threats',
        result: 'success',
        details: {
          threatsDetected: threats.length,
          threatTypes: threats.map(t => t.type)
        }
      })
    }

    return threats
  }

  private async analyzeSecurityEvents(): Promise<any[]> {
    // Analyze recent audit events for suspicious patterns
    const recentEvents = await this.auditService.getEvents({
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit: 1000
    })

    const threats: any[] = []

    // Check for multiple failed login attempts
    const failedLogins = recentEvents.filter(e => 
      e.eventType === 'authentication' && 
      e.action === 'login' && 
      e.result === 'failure'
    )

    if (failedLogins.length > 10) {
      threats.push({
        type: 'brute-force-attack',
        severity: 'high',
        description: `${failedLogins.length} failed login attempts detected`,
        events: failedLogins.slice(0, 5) // Include first 5 events as evidence
      })
    }

    // Check for unusual access patterns
    const accessEvents = recentEvents.filter(e => e.eventType === 'authorization')
    const uniqueUsers = new Set(accessEvents.map(e => e.userId)).size
    const uniqueResources = new Set(accessEvents.map(e => e.resource)).size

    if (uniqueUsers > 0 && uniqueResources / uniqueUsers > 50) {
      threats.push({
        type: 'unusual-access-pattern',
        severity: 'medium',
        description: 'Unusual resource access patterns detected',
        details: { uniqueUsers, uniqueResources, ratio: uniqueResources / uniqueUsers }
      })
    }

    return threats
  }

  // Utility Methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async getSecurityStatus(): Promise<any> {
    const [
      recentThreats,
      complianceStatus,
      activeSessions,
      recentVulnerabilities
    ] = await Promise.all([
      this.detectThreats(),
      this.getComplianceStatus(),
      this.getActiveSessions(),
      this.getVulnerabilities('high')
    ])

    return {
      timestamp: new Date(),
      threats: {
        count: recentThreats.length,
        highSeverity: recentThreats.filter(t => t.severity === 'high').length
      },
      compliance: complianceStatus,
      sessions: {
        active: activeSessions.length
      },
      vulnerabilities: {
        high: recentVulnerabilities.length
      },
      status: this.calculateOverallSecurityStatus(recentThreats, recentVulnerabilities)
    }
  }

  private async getComplianceStatus(): Promise<any> {
    // Return mock compliance status - would integrate with actual compliance service
    return {
      overallScore: 85,
      frameworks: ['SOC2', 'HIPAA'],
      lastAssessment: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  }

  private async getActiveSessions(): Promise<any[]> {
    // Return mock active sessions - would integrate with session management
    return []
  }

  private calculateOverallSecurityStatus(threats: any[], vulnerabilities: any[]): string {
    const highThreats = threats.filter(t => t.severity === 'high').length
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length

    if (highThreats > 0 || criticalVulns > 0) {
      return 'critical'
    } else if (threats.length > 0 || vulnerabilities.length > 0) {
      return 'warning'
    } else {
      return 'healthy'
    }
  }
}