/**
 * Security Manager Integration Tests
 * 
 * Comprehensive tests for the security management framework including
 * authentication, authorization, encryption, audit logging, and compliance.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SecurityManager, type SecurityManagerConfig } from '../../../src/integration/security/index.js'

describe('SecurityManager Integration Tests', () => {
  let securityManager: SecurityManager
  let config: SecurityManagerConfig

  beforeEach(() => {
    config = {
      security: {
        authentication: {
          providers: [
            {
              type: 'oauth',
              name: 'test-oauth',
              config: {
                clientId: 'test-client',
                clientSecret: 'test-secret',
                authorizationUrl: 'https://auth.example.com/oauth/authorize',
                tokenUrl: 'https://auth.example.com/oauth/token',
                userInfoUrl: 'https://auth.example.com/oauth/userinfo',
                scope: ['read', 'write'],
                redirectUri: 'https://app.example.com/callback'
              },
              isEnabled: true
            },
            {
              type: 'api-key',
              name: 'test-api-key',
              config: {
                keyLength: 32,
                secretLength: 64,
                hashAlgorithm: 'SHA-256',
                rateLimiting: {
                  enabled: true,
                  requestsPerMinute: 100,
                  requestsPerHour: 1000
                }
              },
              isEnabled: true
            }
          ],
          sessionTimeout: 3600,
          maxLoginAttempts: 5,
          lockoutDuration: 900,
          passwordPolicy: {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            maxAge: 90,
            historyCount: 5
          }
        },
        authorization: {
          defaultRole: 'user',
          roleHierarchy: {
            'admin': ['manager', 'user'],
            'manager': ['user']
          },
          permissionCache: {
            enabled: true,
            ttl: 300
          }
        },
        encryption: {
          defaultAlgorithm: 'AES-256-GCM',
          keyRotationInterval: 86400,
          keyManagement: {
            provider: 'local',
            config: {}
          }
        },
        audit: {
          enabled: true,
          storage: {
            type: 'database',
            config: {}
          },
          retention: {
            days: 365,
            archiveAfterDays: 90
          },
          realTimeAlerts: true
        },
        compliance: {
          frameworks: ['soc2', 'hipaa'],
          assessmentSchedule: '0 0 1 * *', // Monthly
          autoRemediation: false,
          reportingEmail: ['compliance@example.com']
        },
        scanning: {
          enabled: true,
          schedule: '0 2 * * 0', // Weekly
          scanTypes: ['vulnerability', 'compliance'],
          integrations: {
            vulnerabilityDb: 'nvd',
            scanners: ['custom']
          }
        }
      },
      enableRealTimeMonitoring: true,
      enableThreatDetection: true,
      enableAutoRemediation: false
    }

    securityManager = new SecurityManager(config)
  })

  afterEach(() => {
    // Cleanup if needed
  })

  describe('Authentication', () => {
    it('should authenticate with valid OAuth credentials', async () => {
      const credentials = {
        type: 'oauth' as const,
        data: {
          accessToken: 'valid_oauth_token',
          tokenType: 'Bearer',
          expiresIn: 3600,
          scope: ['read', 'write']
        }
      }

      const result = await securityManager.authenticate(credentials)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.token).toBeDefined()
      expect(result.user?.id).toBe('oauth_oauth_123456')
    })

    it('should fail authentication with invalid OAuth token', async () => {
      const credentials = {
        type: 'oauth' as const,
        data: {
          accessToken: 'invalid_token',
          tokenType: 'Bearer',
          expiresIn: 3600,
          scope: ['read']
        }
      }

      const result = await securityManager.authenticate(credentials)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should authenticate with valid API key', async () => {
      const credentials = {
        type: 'api-key' as const,
        data: {
          key: 'ak_test_1234567890abcdef',
          secret: 'sk_test_secret123'
        }
      }

      const result = await securityManager.authenticate(credentials)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.attributes.provider).toBe('api-key')
    })

    it('should authenticate with basic credentials', async () => {
      const credentials = {
        type: 'basic' as const,
        data: {
          username: 'admin',
          password: 'Admin123!'
        }
      }

      const result = await securityManager.authenticate(credentials)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.username).toBe('admin')
    })

    it('should validate tokens correctly', async () => {
      // First authenticate to get a token
      const credentials = {
        type: 'basic' as const,
        data: {
          username: 'admin',
          password: 'Admin123!'
        }
      }

      const authResult = await securityManager.authenticate(credentials)
      expect(authResult.success).toBe(true)
      expect(authResult.token).toBeDefined()

      // Then validate the token
      const user = await securityManager.validateToken(authResult.token!)
      expect(user).toBeDefined()
      expect(user?.username).toBe('admin')
    })
  })

  describe('Authorization', () => {
    let adminUser: any

    beforeEach(async () => {
      // Create admin user for testing
      const credentials = {
        type: 'basic' as const,
        data: {
          username: 'admin',
          password: 'Admin123!'
        }
      }

      const result = await securityManager.authenticate(credentials)
      adminUser = result.user
    })

    it('should authorize admin user for all resources', async () => {
      const resource = {
        type: 'test-resource',
        id: '123',
        attributes: {}
      }

      const authorized = await securityManager.authorize(adminUser, resource, 'read')
      expect(authorized).toBe(true)
    })

    it('should authorize admin user for admin actions', async () => {
      const resource = {
        type: 'system',
        id: 'config',
        attributes: {}
      }

      const authorized = await securityManager.authorize(adminUser, resource, 'admin')
      expect(authorized).toBe(true)
    })

    it('should check specific permissions', async () => {
      const hasPermission = await securityManager.checkPermission(adminUser, 'system:admin')
      expect(hasPermission).toBe(true)
    })

    it('should get user roles', async () => {
      const roles = await securityManager.getUserRoles(adminUser.id)
      expect(roles).toContain('Administrator')
    })
  })

  describe('Encryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const plaintext = 'sensitive data that needs encryption'
      
      const encrypted = await securityManager.encrypt(plaintext)
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plaintext)

      const decrypted = await securityManager.decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should encrypt with custom context', async () => {
      const plaintext = 'data with context'
      const context = {
        algorithm: 'AES-256-GCM' as const,
        keyId: 'test-key'
      }

      const encrypted = await securityManager.encrypt(plaintext, context)
      expect(encrypted).toBeDefined()

      const decrypted = await securityManager.decrypt(encrypted, context)
      expect(decrypted).toBe(plaintext)
    })

    it('should handle key rotation', async () => {
      await expect(securityManager.rotateKeys()).resolves.not.toThrow()
    })
  })

  describe('Audit Logging', () => {
    it('should log audit events', async () => {
      const event = {
        id: 'test-event-1',
        timestamp: new Date(),
        userId: 'test-user',
        eventType: 'data-access' as const,
        resource: 'test-resource',
        action: 'read',
        result: 'success' as const,
        details: {
          description: 'Test audit event'
        }
      }

      await expect(securityManager.auditLog(event)).resolves.not.toThrow()
    })

    it('should retrieve audit events', async () => {
      // Log a test event first
      const event = {
        id: 'test-event-2',
        timestamp: new Date(),
        userId: 'test-user',
        eventType: 'authentication' as const,
        resource: 'auth-service',
        action: 'login',
        result: 'success' as const,
        details: {}
      }

      await securityManager.auditLog(event)

      const events = await securityManager.getAuditEvents({
        userId: 'test-user',
        limit: 10
      })

      expect(events).toBeDefined()
      expect(Array.isArray(events)).toBe(true)
    })

    it('should generate audit reports', async () => {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        end: new Date()
      }

      const report = await securityManager.generateAuditReport(timeRange)
      expect(report).toBeDefined()
      expect(report.generatedAt).toBeDefined()
    })
  })

  describe('Compliance', () => {
    it('should validate SOC2 compliance', async () => {
      const frameworks = await securityManager.getComplianceFrameworks()
      const soc2Framework = frameworks.find(f => f.id === 'soc2')
      
      expect(soc2Framework).toBeDefined()

      if (soc2Framework) {
        const report = await securityManager.validateCompliance(soc2Framework)
        expect(report).toBeDefined()
        expect(report.frameworkId).toBe('soc2')
        expect(report.overallScore).toBeGreaterThan(0)
        expect(Array.isArray(report.controlResults)).toBe(true)
      }
    })

    it('should enforce policies', async () => {
      const policy = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test policy for validation',
        type: 'security' as const,
        rules: [
          {
            id: 'test-rule',
            condition: 'true',
            action: 'allow' as const,
            parameters: {}
          }
        ],
        enforcement: 'blocking' as const,
        isActive: true
      }

      const result = await securityManager.enforcePolicy(policy)
      expect(result).toBeDefined()
      expect(result.policyId).toBe('test-policy')
    })

    it('should track risk assessments', async () => {
      const risk = {
        id: 'risk-001',
        timestamp: new Date(),
        riskType: 'security' as const,
        severity: 'medium' as const,
        description: 'Test security risk',
        impact: 'Medium impact on system security',
        likelihood: 'Low likelihood of occurrence',
        mitigation: ['Implement additional monitoring'],
        status: 'open' as const
      }

      await expect(securityManager.trackRisk(risk)).resolves.not.toThrow()
    })
  })

  describe('Security Scanning', () => {
    it('should start vulnerability scan', async () => {
      const scan = await securityManager.startSecurityScan('vulnerability', 'test-system')
      
      expect(scan).toBeDefined()
      expect(scan.id).toBeDefined()
      expect(scan.type).toBe('vulnerability')
      expect(scan.target).toBe('test-system')
      expect(scan.status).toBe('pending')
    })

    it('should get scan results', async () => {
      const scan = await securityManager.startSecurityScan('compliance', 'test-app')
      
      // Wait a moment for scan to complete (mocked)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const results = await securityManager.getScanResults(scan.id)
      expect(results).toBeDefined()
      expect(results.id).toBe(scan.id)
    })

    it('should get vulnerabilities by severity', async () => {
      const highVulns = await securityManager.getVulnerabilities('high')
      expect(Array.isArray(highVulns)).toBe(true)
      
      if (highVulns.length > 0) {
        expect(highVulns[0].severity).toBe('high')
      }
    })
  })

  describe('Threat Detection', () => {
    it('should detect threats', async () => {
      const threats = await securityManager.detectThreats()
      expect(Array.isArray(threats)).toBe(true)
    })

    it('should get security status', async () => {
      const status = await securityManager.getSecurityStatus()
      
      expect(status).toBeDefined()
      expect(status.timestamp).toBeDefined()
      expect(status.threats).toBeDefined()
      expect(status.compliance).toBeDefined()
      expect(status.sessions).toBeDefined()
      expect(status.vulnerabilities).toBeDefined()
      expect(status.status).toBeDefined()
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete authentication and authorization flow', async () => {
      // 1. Authenticate user
      const credentials = {
        type: 'basic' as const,
        data: {
          username: 'admin',
          password: 'Admin123!'
        }
      }

      const authResult = await securityManager.authenticate(credentials)
      expect(authResult.success).toBe(true)

      // 2. Validate token
      const user = await securityManager.validateToken(authResult.token!)
      expect(user).toBeDefined()

      // 3. Check authorization
      const resource = {
        type: 'sensitive-data',
        id: 'user-records',
        attributes: { classification: 'confidential' }
      }

      const authorized = await securityManager.authorize(user!, resource, 'read')
      expect(authorized).toBe(true)

      // 4. Logout
      await securityManager.logout(authResult.token!)
      
      // 5. Verify token is invalid after logout
      const invalidUser = await securityManager.validateToken(authResult.token!)
      expect(invalidUser).toBeNull()
    })

    it('should handle security incident workflow', async () => {
      // 1. Log security event
      const securityEvent = {
        id: 'incident-001',
        timestamp: new Date(),
        userId: 'attacker',
        eventType: 'security-event' as const,
        resource: 'admin-panel',
        action: 'unauthorized-access',
        result: 'failure' as const,
        details: {
          ipAddress: '192.168.1.100',
          userAgent: 'Malicious Bot',
          attemptedResource: '/admin/users'
        }
      }

      await securityManager.auditLog(securityEvent)

      // 2. Detect threats
      const threats = await securityManager.detectThreats()
      expect(Array.isArray(threats)).toBe(true)

      // 3. Track risk
      const risk = {
        id: 'risk-incident-001',
        timestamp: new Date(),
        riskType: 'security' as const,
        severity: 'high' as const,
        description: 'Unauthorized access attempt detected',
        impact: 'Potential data breach',
        likelihood: 'Medium',
        mitigation: ['Block IP address', 'Increase monitoring'],
        status: 'open' as const
      }

      await securityManager.trackRisk(risk)

      // 4. Start security scan
      const scan = await securityManager.startSecurityScan('penetration', 'admin-panel')
      expect(scan).toBeDefined()
    })
  })
})