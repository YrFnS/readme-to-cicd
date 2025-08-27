/**
 * Security Hardening and Compliance Validation Tests
 * Comprehensive test suite for the security management system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityManager } from '../../src/integration/security/security-manager';
import { ComplianceManager } from '../../src/integration/security/compliance-manager';
import { VulnerabilityScanner } from '../../src/integration/security/vulnerability-scanner';
import { SecurityMonitor } from '../../src/integration/security/security-monitor';
import { PolicyEngine } from '../../src/integration/security/policy-engine';
import { SecurityTraining } from '../../src/integration/security/security-training';
import { SecurityDocumentation } from '../../src/integration/security/security-documentation';
import { PenetrationTester } from '../../src/integration/security/penetration-tester';
import { IncidentResponse } from '../../src/integration/security/incident-response';
import { logger } from '../../src/shared/logging/central-logger';
import type {
  SecurityConfig,
  ComplianceFramework,
  VulnerabilityConfig,
  TrainingConfig,
  PenetrationTestConfig,
  IncidentResponseConfig
} from '../../src/integration/security/types';

describe('Security Hardening and Compliance Validation', () => {
  let securityManager: SecurityManager;
  let complianceManager: ComplianceManager;
  let vulnerabilityScanner: VulnerabilityScanner;
  let securityMonitor: SecurityMonitor;
  let policyEngine: PolicyEngine;
  let securityTraining: SecurityTraining;
  let securityDocumentation: SecurityDocumentation;
  let penetrationTester: PenetrationTester;
  let incidentResponse: IncidentResponse;

  const mockSecurityConfig: SecurityConfig = {
    authentication: {
      providers: [
        {
          type: 'oauth2',
          name: 'oauth-provider',
          config: { clientId: 'test', clientSecret: 'test' },
          enabled: true
        }
      ],
      sessionTimeout: 3600,
      mfaRequired: true,
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      tokenExpiry: 3600000
    },
    authorization: {
      rbac: {
        enabled: true,
        hierarchical: true,
        inheritance: true,
        defaultRole: 'user'
      },
      permissions: [
        {
          id: 'read-data',
          name: 'Read Data',
          description: 'Permission to read data',
          resource: 'data',
          actions: ['read']
        }
      ],
      roles: [
        {
          id: 'admin',
          name: 'Administrator',
          description: 'System administrator',
          permissions: ['read-data'],
          inherits: []
        }
      ],
      policies: [
        {
          id: 'admin-policy',
          name: 'Admin Policy',
          rules: [
            {
              resource: 'admin',
              action: 'access',
              condition: 'user.roles.includes("admin")'
            }
          ],
          effect: 'allow'
        }
      ]
    },
    encryption: {
      algorithms: [
        {
          name: 'AES-256-GCM',
          keySize: 256,
          mode: 'GCM',
          enabled: true
        }
      ],
      keyManagement: {
        provider: 'vault',
        rotationInterval: 90,
        backupEnabled: true
      },
      tls: {
        version: 'TLSv1.3',
        cipherSuites: ['TLS_AES_256_GCM_SHA384'],
        certificateValidation: true,
        hsts: true
      },
      dataEncryption: {
        atRest: true,
        inTransit: true,
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2'
      }
    },
    compliance: {
      frameworks: [
        {
          name: 'SOC2',
          version: '2017',
          controls: [
            {
              id: 'CC6.1',
              name: 'Logical and Physical Access Controls',
              description: 'Access controls implementation',
              requirements: ['MFA', 'RBAC', 'Access Review'],
              validation: [
                {
                  type: 'policy',
                  rule: 'mfa_enabled',
                  severity: 'high'
                }
              ],
              automated: true
            }
          ],
          enabled: true
        }
      ],
      reporting: {
        frequency: 'monthly',
        recipients: ['compliance@company.com'],
        format: 'pdf',
        automated: true
      },
      auditing: {
        enabled: true,
        retention: 2555, // 7 years
        encryption: true,
        immutable: true
      },
      validation: {
        continuous: true,
        scheduled: true,
        onDemand: true,
        threshold: 90
      }
    },
    audit: {
      enabled: true,
      events: [
        {
          type: 'authentication',
          category: 'security',
          severity: 'info',
          fields: ['timestamp', 'userId', 'result']
        }
      ],
      storage: {
        type: 'database',
        encryption: true,
        compression: true,
        replication: true
      },
      retention: {
        period: 2555,
        archival: true,
        deletion: false,
        compliance: ['SOC2', 'HIPAA']
      },
      alerting: {
        enabled: true,
        rules: [
          {
            id: 'failed-login-alert',
            condition: 'failed_logins > 5',
            severity: 'high',
            threshold: 5
          }
        ],
        channels: [
          {
            type: 'email',
            config: { recipients: ['security@company.com'] },
            enabled: true
          }
        ]
      }
    },
    monitoring: {
      realTime: true,
      threatDetection: {
        enabled: true,
        sources: [
          {
            type: 'logs',
            name: 'system-logs',
            config: { path: '/var/log' }
          }
        ],
        rules: [
          {
            id: 'malware-detection',
            name: 'Malware Detection',
            pattern: 'malware|virus|trojan',
            severity: 'critical',
            action: 'block'
          }
        ],
        intelligence: {
          feeds: [
            {
              name: 'threat-feed',
              url: 'https://threat-intel.example.com',
              format: 'json',
              updateInterval: 3600
            }
          ],
          correlation: true,
          enrichment: true
        }
      },
      anomalyDetection: {
        enabled: true,
        algorithms: [
          {
            name: 'statistical',
            type: 'statistical',
            config: { threshold: 2.0 }
          }
        ],
        baselines: [
          {
            metric: 'cpu_usage',
            period: 3600,
            threshold: 80,
            adaptive: true
          }
        ],
        sensitivity: 0.8
      },
      incidentResponse: {
        enabled: true,
        playbooks: [
          {
            id: 'security-incident',
            name: 'Security Incident Response',
            triggers: ['security_alert'],
            steps: [
              {
                id: '1',
                name: 'Containment',
                action: 'isolate_system',
                automated: true,
                timeout: 300
              }
            ],
            automation: true
          }
        ],
        escalation: {
          levels: [
            {
              level: 1,
              contacts: ['security-team@company.com'],
              actions: ['notify']
            }
          ],
          timeouts: [1800],
          notifications: ['email']
        },
        communication: {
          channels: [
            {
              type: 'email',
              config: { smtp: 'smtp.company.com' },
              priority: 1
            }
          ],
          templates: [
            {
              type: 'incident',
              subject: 'Security Incident Alert',
              body: 'Security incident detected',
              format: 'html'
            }
          ],
          automation: true
        }
      }
    },
    policies: {
      enforcement: {
        enabled: true,
        mode: 'enforcing',
        exceptions: []
      },
      validation: {
        continuous: true,
        scheduled: true,
        onDemand: true
      },
      management: {
        versioning: true,
        approval: true,
        testing: true,
        rollback: true
      }
    },
    training: {
      programs: [
        {
          id: 'security-awareness',
          name: 'Security Awareness Training',
          description: 'Basic security awareness',
          modules: [
            {
              id: 'passwords',
              name: 'Password Security',
              content: 'Password best practices',
              duration: 30,
              assessment: true
            }
          ],
          mandatory: true,
          frequency: 365
        }
      ],
      certification: {
        enabled: true,
        requirements: [
          {
            type: 'training',
            criteria: 'completion',
            weight: 1
          }
        ],
        validity: 365,
        renewal: true
      },
      awareness: {
        campaigns: [
          {
            id: 'phishing-awareness',
            name: 'Phishing Awareness',
            topic: 'phishing',
            duration: 30,
            audience: ['all-employees']
          }
        ],
        communications: [
          {
            type: 'email',
            frequency: 'monthly',
            content: 'Security tips'
          }
        ],
        metrics: [
          {
            name: 'completion-rate',
            target: 90,
            measurement: 'percentage'
          }
        ]
      },
      tracking: {
        completion: true,
        progress: true,
        assessment: true,
        certification: true
      }
    }
  };

  const mockComplianceFrameworks: ComplianceFramework[] = [
    {
      name: 'SOC2',
      version: '2017',
      controls: [
        {
          id: 'CC6.1',
          name: 'Logical and Physical Access Controls',
          description: 'Implementation of access controls',
          requirements: ['Multi-factor authentication', 'Role-based access control'],
          validation: [
            {
              type: 'policy',
              rule: 'mfa_enabled',
              severity: 'high'
            }
          ],
          automated: true
        }
      ],
      enabled: true
    }
  ];

  const mockVulnerabilityConfig: VulnerabilityConfig = {
    scanners: [
      {
        name: 'network-scanner',
        type: 'network',
        config: { timeout: 300 },
        enabled: true
      }
    ],
    schedules: [
      {
        id: 'daily-scan',
        name: 'Daily Vulnerability Scan',
        targets: [
          {
            type: 'network',
            identifier: '192.168.1.0/24'
          }
        ],
        frequency: 'daily',
        nextRun: new Date(),
        enabled: true
      }
    ],
    policies: [
      {
        id: 'critical-policy',
        name: 'Critical Vulnerability Policy',
        rules: [
          {
            condition: 'severity == "critical"',
            severity: 'critical',
            category: 'vulnerability'
          }
        ],
        actions: [
          {
            type: 'alert',
            config: { recipients: ['security@company.com'] }
          }
        ]
      }
    ],
    reporting: {
      dashboards: true,
      alerts: true,
      reports: true,
      integration: ['jira', 'slack']
    }
  };

  const mockTrainingConfig: TrainingConfig = {
    programs: [
      {
        id: 'security-basics',
        name: 'Security Basics',
        description: 'Fundamental security training',
        modules: [
          {
            id: 'intro',
            name: 'Introduction to Security',
            content: 'Security fundamentals',
            duration: 60,
            assessment: true
          }
        ],
        mandatory: true,
        frequency: 365
      }
    ],
    certification: {
      enabled: true,
      requirements: [
        {
          type: 'training',
          criteria: 'completion',
          weight: 1
        }
      ],
      validity: 365,
      renewal: true
    },
    awareness: {
      campaigns: [],
      communications: [],
      metrics: []
    },
    tracking: {
      completion: true,
      progress: true,
      assessment: true,
      certification: true
    }
  };

  const mockPenTestConfig: PenetrationTestConfig = {
    methodology: 'OWASP',
    scope: {
      internal: true,
      external: true,
      applications: ['web-app'],
      networks: ['internal'],
      social: false
    },
    rules: [
      {
        type: 'allowed',
        action: 'network-scan',
        condition: 'business-hours'
      }
    ],
    reporting: {
      executive: true,
      technical: true,
      remediation: true,
      timeline: 14
    }
  };

  const mockIncidentConfig: IncidentResponseConfig = {
    enabled: true,
    playbooks: [
      {
        id: 'data-breach',
        name: 'Data Breach Response',
        triggers: ['data-breach'],
        steps: [
          {
            id: '1',
            name: 'Containment',
            action: 'Contain the breach',
            automated: false,
            timeout: 60
          }
        ],
        automation: false
      }
    ],
    escalation: {
      levels: [
        {
          level: 1,
          contacts: ['security@company.com'],
          actions: ['notify']
        }
      ],
      timeouts: [3600],
      notifications: ['email']
    },
    communication: {
      channels: [
        {
          type: 'email',
          config: {},
          priority: 1
        }
      ],
      templates: [
        {
          type: 'incident',
          subject: 'Incident Alert',
          body: 'Incident detected',
          format: 'text'
        }
      ],
      automation: true
    }
  };

  beforeEach(() => {
    securityManager = new SecurityManager();
    complianceManager = new ComplianceManager();
    vulnerabilityScanner = new VulnerabilityScanner();
    securityMonitor = new SecurityMonitor();
    policyEngine = new PolicyEngine();
    securityTraining = new SecurityTraining();
    securityDocumentation = new SecurityDocumentation();
    penetrationTester = new PenetrationTester();
    incidentResponse = new IncidentResponse();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SecurityManager', () => {
    it('should initialize successfully with valid configuration', async () => {
      await expect(securityManager.initialize(mockSecurityConfig)).resolves.not.toThrow();
    });

    it('should authenticate users with valid credentials', async () => {
      await securityManager.initialize(mockSecurityConfig);
      
      const result = await securityManager.authenticate({
        type: 'password',
        identifier: 'testuser',
        secret: 'password123'
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should authorize users based on RBAC', async () => {
      await securityManager.initialize(mockSecurityConfig);
      
      const user = {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['admin'],
        permissions: ['read-data'],
        metadata: {}
      };

      const resource = {
        type: 'admin',
        id: 'admin-panel',
        attributes: {}
      };

      const action = {
        name: 'access'
      };

      const authorized = await securityManager.authorize(user, resource, action);
      expect(authorized).toBe(true);
    });

    it('should encrypt and decrypt data', async () => {
      await securityManager.initialize(mockSecurityConfig);
      
      const plaintext = 'sensitive data';
      const encrypted = await securityManager.encrypt(plaintext);
      const decrypted = await securityManager.decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('should perform security assessment', async () => {
      await securityManager.initialize(mockSecurityConfig);
      
      const assessment = await securityManager.assessSecurity();

      expect(assessment).toBeDefined();
      expect(assessment.id).toBeDefined();
      expect(assessment.type).toBe('vulnerability');
      expect(assessment.findings).toBeDefined();
      expect(assessment.recommendations).toBeDefined();
    });

    it('should provide security status', async () => {
      await securityManager.initialize(mockSecurityConfig);
      
      const status = await securityManager.getSecurityStatus();

      expect(status).toBeDefined();
      expect(status.overall).toMatch(/secure|warning|critical/);
      expect(status.components).toBeDefined();
      expect(status.metrics).toBeDefined();
    });
  });

  describe('ComplianceManager', () => {
    it('should initialize with compliance frameworks', async () => {
      await expect(complianceManager.initialize(mockComplianceFrameworks)).resolves.not.toThrow();
    });

    it('should validate compliance against framework', async () => {
      await complianceManager.initialize(mockComplianceFrameworks);
      
      const report = await complianceManager.validateCompliance('SOC2');

      expect(report).toBeDefined();
      expect(report.framework).toBe('SOC2');
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.status).toMatch(/compliant|non-compliant|partial/);
      expect(report.controls).toBeDefined();
    });

    it('should enforce policies', async () => {
      await complianceManager.initialize(mockComplianceFrameworks);
      
      const result = await complianceManager.enforcePolicy(mockSecurityConfig.policies);

      expect(result).toBeDefined();
      expect(result.policy).toBeDefined();
      expect(result.result).toMatch(/allow|deny|conditional/);
    });

    it('should generate audit reports', async () => {
      await complianceManager.initialize(mockComplianceFrameworks);
      
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const report = await complianceManager.generateAuditReport(timeRange);

      expect(report).toBeDefined();
      expect(report.period).toEqual(timeRange);
      expect(report.events).toBeDefined();
      expect(report.statistics).toBeDefined();
    });

    it('should track risk assessments', async () => {
      await complianceManager.initialize(mockComplianceFrameworks);
      
      const risk = {
        id: 'risk-1',
        asset: 'database',
        threat: 'data breach',
        vulnerability: 'weak encryption',
        impact: 8,
        likelihood: 6,
        risk: 0,
        mitigation: ['encrypt data', 'access controls']
      };

      await expect(complianceManager.trackRisk(risk)).resolves.not.toThrow();
    });

    it('should provide compliance status', async () => {
      await complianceManager.initialize(mockComplianceFrameworks);
      
      const status = await complianceManager.getComplianceStatus();

      expect(status).toBeDefined();
      expect(status.frameworks).toBeDefined();
      expect(status.overallScore).toBeGreaterThanOrEqual(0);
      expect(status.trends).toBeDefined();
    });
  });

  describe('VulnerabilityScanner', () => {
    it('should initialize with scanner configuration', async () => {
      await expect(vulnerabilityScanner.initialize(mockVulnerabilityConfig)).resolves.not.toThrow();
    });

    it('should scan systems for vulnerabilities', async () => {
      await vulnerabilityScanner.initialize(mockVulnerabilityConfig);
      
      const target = {
        type: 'network' as const,
        identifier: '192.168.1.100'
      };

      const result = await vulnerabilityScanner.scanSystem(target);

      expect(result).toBeDefined();
      expect(result.scanId).toBeDefined();
      expect(result.target).toEqual(target);
      expect(result.vulnerabilities).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should schedule vulnerability scans', async () => {
      await vulnerabilityScanner.initialize(mockVulnerabilityConfig);
      
      const schedule = {
        id: 'test-schedule',
        name: 'Test Schedule',
        targets: [
          {
            type: 'network' as const,
            identifier: '192.168.1.0/24'
          }
        ],
        frequency: 'weekly',
        nextRun: new Date(),
        enabled: true
      };

      const scheduleId = await vulnerabilityScanner.scheduleScan(schedule);
      expect(scheduleId).toBeDefined();
    });

    it('should retrieve vulnerabilities with filters', async () => {
      await vulnerabilityScanner.initialize(mockVulnerabilityConfig);
      
      const filter = {
        severity: ['critical', 'high'],
        category: ['network']
      };

      const vulnerabilities = await vulnerabilityScanner.getVulnerabilities(filter);
      expect(vulnerabilities).toBeDefined();
      expect(Array.isArray(vulnerabilities)).toBe(true);
    });

    it('should generate vulnerability reports', async () => {
      await vulnerabilityScanner.initialize(mockVulnerabilityConfig);
      
      const format = {
        type: 'json' as const
      };

      const report = await vulnerabilityScanner.generateReport(format);

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.format).toEqual(format);
      expect(report.content).toBeDefined();
    });
  });

  describe('SecurityMonitor', () => {
    it('should initialize monitoring system', async () => {
      await expect(securityMonitor.initialize(mockSecurityConfig)).resolves.not.toThrow();
    });

    it('should start and stop monitoring', async () => {
      await securityMonitor.initialize(mockSecurityConfig);
      
      await expect(securityMonitor.startMonitoring()).resolves.not.toThrow();
      await expect(securityMonitor.stopMonitoring()).resolves.not.toThrow();
    });

    it('should detect threats', async () => {
      await securityMonitor.initialize(mockSecurityConfig);
      
      const threats = await securityMonitor.detectThreats();

      expect(threats).toBeDefined();
      expect(Array.isArray(threats)).toBe(true);
    });

    it('should analyze anomalies', async () => {
      await securityMonitor.initialize(mockSecurityConfig);
      
      const anomalies = await securityMonitor.analyzeAnomalies();

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should provide security metrics', async () => {
      await securityMonitor.initialize(mockSecurityConfig);
      
      const metrics = await securityMonitor.getSecurityMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.vulnerabilities).toBeDefined();
      expect(metrics.threats).toBeDefined();
      expect(metrics.compliance).toBeDefined();
      expect(metrics.incidents).toBeDefined();
    });

    it('should generate security alerts', async () => {
      await securityMonitor.initialize(mockSecurityConfig);
      
      const alert = {
        id: '',
        type: 'threat',
        severity: 'high' as const,
        title: 'Test Alert',
        description: 'Test security alert',
        source: 'test',
        timestamp: new Date(),
        metadata: {}
      };

      await expect(securityMonitor.generateAlert(alert)).resolves.not.toThrow();
    });
  });

  describe('PolicyEngine', () => {
    it('should initialize with policy configuration', async () => {
      await expect(policyEngine.initialize(mockSecurityConfig.policies)).resolves.not.toThrow();
    });

    it('should evaluate policies', async () => {
      await policyEngine.initialize(mockSecurityConfig.policies);
      
      const context = {
        user: {
          id: 'user1',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['admin'],
          permissions: ['read-data'],
          metadata: {}
        },
        resource: {
          type: 'admin',
          id: 'admin-panel',
          attributes: {}
        },
        action: {
          name: 'access'
        },
        environment: {}
      };

      const result = await policyEngine.evaluatePolicy('admin-policy', context);

      expect(result).toBeDefined();
      expect(result.policy).toBe('admin-policy');
      expect(result.result).toMatch(/allow|deny|conditional/);
    });

    it('should enforce policies', async () => {
      await policyEngine.initialize(mockSecurityConfig.policies);
      
      const result = await policyEngine.enforcePolicy('admin-policy', 'admin-panel');

      expect(result).toBeDefined();
      expect(result.enforced).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.result).toMatch(/allowed|denied|modified/);
    });

    it('should validate policies', async () => {
      await policyEngine.initialize(mockSecurityConfig.policies);
      
      const result = await policyEngine.validatePolicies();

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should provide policy status', async () => {
      await policyEngine.initialize(mockSecurityConfig.policies);
      
      const status = await policyEngine.getPolicyStatus();

      expect(status).toBeDefined();
      expect(status.policies).toBeDefined();
      expect(status.enforcement).toBeDefined();
      expect(status.violations).toBeDefined();
    });
  });

  describe('SecurityTraining', () => {
    it('should initialize training system', async () => {
      await expect(securityTraining.initialize(mockTrainingConfig)).resolves.not.toThrow();
    });

    it('should create training programs', async () => {
      await securityTraining.initialize(mockTrainingConfig);
      
      const program = {
        id: 'test-program',
        name: 'Test Program',
        description: 'Test training program',
        modules: [
          {
            id: 'module1',
            name: 'Test Module',
            content: 'Test content',
            duration: 30,
            assessment: true
          }
        ],
        mandatory: false,
        frequency: 365
      };

      const programId = await securityTraining.createProgram(program);
      expect(programId).toBeDefined();
    });

    it('should enroll users in programs', async () => {
      await securityTraining.initialize(mockTrainingConfig);
      
      await expect(securityTraining.enrollUser('user1', 'security-basics')).resolves.not.toThrow();
    });

    it('should track training progress', async () => {
      await securityTraining.initialize(mockTrainingConfig);
      await securityTraining.enrollUser('user1', 'security-basics');
      
      const progress = await securityTraining.trackProgress('user1', 'security-basics');

      expect(progress).toBeDefined();
      expect(progress.userId).toBe('user1');
      expect(progress.programId).toBe('security-basics');
      expect(progress.progress).toBeGreaterThanOrEqual(0);
    });

    it('should provide training metrics', async () => {
      await securityTraining.initialize(mockTrainingConfig);
      
      const metrics = await securityTraining.getTrainingMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.enrollment).toBeGreaterThanOrEqual(0);
      expect(metrics.completion).toBeGreaterThanOrEqual(0);
      expect(metrics.certifications).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SecurityDocumentation', () => {
    it('should initialize documentation system', async () => {
      await expect(securityDocumentation.initialize()).resolves.not.toThrow();
    });

    it('should generate policy documents', async () => {
      await securityDocumentation.initialize();
      
      const document = await securityDocumentation.generatePolicyDocument('Information Security');

      expect(document).toBeDefined();
      expect(document.id).toBeDefined();
      expect(document.title).toContain('Information Security');
      expect(document.content).toBeDefined();
    });

    it('should generate procedure documents', async () => {
      await securityDocumentation.initialize();
      
      const document = await securityDocumentation.generateProcedureDocument('Incident Response');

      expect(document).toBeDefined();
      expect(document.id).toBeDefined();
      expect(document.title).toContain('Incident Response');
      expect(document.steps).toBeDefined();
    });

    it('should generate incident response plans', async () => {
      await securityDocumentation.initialize();
      
      const plan = await securityDocumentation.generateIncidentPlan('Data Breach');

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.scenario).toBe('Data Breach');
      expect(plan.playbooks).toBeDefined();
      expect(plan.contacts).toBeDefined();
    });

    it('should generate compliance guides', async () => {
      await securityDocumentation.initialize();
      
      const guide = await securityDocumentation.generateComplianceGuide('SOC2');

      expect(guide).toBeDefined();
      expect(guide.framework).toBe('SOC2');
      expect(guide.overview).toBeDefined();
      expect(guide.requirements).toBeDefined();
    });

    it('should generate training materials', async () => {
      await securityDocumentation.initialize();
      
      const material = await securityDocumentation.generateTrainingMaterial('Security Awareness');

      expect(material).toBeDefined();
      expect(material.id).toBeDefined();
      expect(material.topic).toBe('Security Awareness');
      expect(material.content).toBeDefined();
    });
  });

  describe('PenetrationTester', () => {
    it('should initialize penetration testing system', async () => {
      await expect(penetrationTester.initialize(mockPenTestConfig)).resolves.not.toThrow();
    });

    it('should plan penetration tests', async () => {
      await penetrationTester.initialize(mockPenTestConfig);
      
      const scope = {
        internal: true,
        external: false,
        applications: ['web-app'],
        networks: ['internal'],
        socialEngineering: false,
        physicalSecurity: false
      };

      const plan = await penetrationTester.planTest(scope);

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.scope).toEqual(scope);
      expect(plan.timeline).toBeDefined();
      expect(plan.team).toBeDefined();
    });

    it('should execute penetration tests', async () => {
      await penetrationTester.initialize(mockPenTestConfig);
      
      const scope = {
        internal: true,
        external: false,
        applications: ['web-app'],
        networks: ['internal'],
        socialEngineering: false,
        physicalSecurity: false
      };

      const plan = await penetrationTester.planTest(scope);
      const result = await penetrationTester.executeTest(plan.id);

      expect(result).toBeDefined();
      expect(result.planId).toBe(plan.id);
      expect(result.executionId).toBeDefined();
      expect(result.findings).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should generate penetration test reports', async () => {
      await penetrationTester.initialize(mockPenTestConfig);
      
      const scope = {
        internal: true,
        external: false,
        applications: ['web-app'],
        networks: ['internal'],
        socialEngineering: false,
        physicalSecurity: false
      };

      const plan = await penetrationTester.planTest(scope);
      const result = await penetrationTester.executeTest(plan.id);
      const report = await penetrationTester.generateReport(result.executionId);

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.type).toMatch(/executive|technical|remediation/);
      expect(report.content).toBeDefined();
    });
  });

  describe('IncidentResponse', () => {
    it('should initialize incident response system', async () => {
      await expect(incidentResponse.initialize(mockIncidentConfig)).resolves.not.toThrow();
    });

    it('should create security incidents', async () => {
      await incidentResponse.initialize(mockIncidentConfig);
      
      const incident = {
        title: 'Test Security Incident',
        description: 'Test incident for validation',
        severity: 'medium' as const,
        category: 'security',
        source: 'test',
        reporter: 'test-user',
        affected: ['system1']
      };

      const incidentId = await incidentResponse.createIncident(incident);
      expect(incidentId).toBeDefined();
      expect(incidentId).toMatch(/^INC-/);
    });

    it('should execute incident playbooks', async () => {
      await incidentResponse.initialize(mockIncidentConfig);
      
      const incident = {
        title: 'Data Breach Incident',
        description: 'Potential data breach detected',
        severity: 'high' as const,
        category: 'security',
        source: 'monitoring',
        reporter: 'security-team',
        affected: ['database']
      };

      const incidentId = await incidentResponse.createIncident(incident);
      const result = await incidentResponse.executePlaybook(incidentId, 'data-breach');

      expect(result).toBeDefined();
      expect(result.playbookId).toBe('data-breach');
      expect(result.executionId).toBeDefined();
      expect(result.steps).toBeDefined();
      expect(result.status).toMatch(/success|failure|partial/);
    });

    it('should escalate incidents', async () => {
      await incidentResponse.initialize(mockIncidentConfig);
      
      const incident = {
        title: 'Critical Security Incident',
        description: 'Critical security incident requiring escalation',
        severity: 'critical' as const,
        category: 'security',
        source: 'monitoring',
        reporter: 'security-team',
        affected: ['production-system']
      };

      const incidentId = await incidentResponse.createIncident(incident);
      
      await expect(incidentResponse.escalateIncident(incidentId, 1)).resolves.not.toThrow();
    });

    it('should update incidents', async () => {
      await incidentResponse.initialize(mockIncidentConfig);
      
      const incident = {
        title: 'Test Incident',
        description: 'Test incident for updates',
        severity: 'low' as const,
        category: 'security',
        source: 'test',
        reporter: 'test-user',
        affected: ['test-system']
      };

      const incidentId = await incidentResponse.createIncident(incident);
      
      const update = {
        status: 'investigating' as const,
        notes: 'Investigation started',
        assignee: 'security-analyst'
      };

      await expect(incidentResponse.updateIncident(incidentId, update)).resolves.not.toThrow();
    });

    it('should close incidents', async () => {
      await incidentResponse.initialize(mockIncidentConfig);
      
      const incident = {
        title: 'Resolved Incident',
        description: 'Incident to be resolved',
        severity: 'medium' as const,
        category: 'security',
        source: 'test',
        reporter: 'test-user',
        affected: ['test-system']
      };

      const incidentId = await incidentResponse.createIncident(incident);
      
      const resolution = {
        type: 'resolved' as const,
        description: 'Issue resolved by applying security patch',
        actions: ['Applied security patch', 'Verified system integrity'],
        lessons: ['Ensure timely patching', 'Improve monitoring']
      };

      await expect(incidentResponse.closeIncident(incidentId, resolution)).resolves.not.toThrow();
    });

    it('should generate incident reports', async () => {
      await incidentResponse.initialize(mockIncidentConfig);
      
      const incident = {
        title: 'Reportable Incident',
        description: 'Incident for report generation',
        severity: 'high' as const,
        category: 'security',
        source: 'monitoring',
        reporter: 'security-team',
        affected: ['critical-system']
      };

      const incidentId = await incidentResponse.createIncident(incident);
      
      const resolution = {
        type: 'resolved' as const,
        description: 'Successfully resolved',
        actions: ['Containment', 'Remediation'],
        lessons: ['Improve detection', 'Faster response']
      };

      await incidentResponse.closeIncident(incidentId, resolution);
      
      const report = await incidentResponse.generateIncidentReport(incidentId);

      expect(report).toBeDefined();
      expect(report.incidentId).toBe(incidentId);
      expect(report.timeline).toBeDefined();
      expect(report.impact).toBeDefined();
      expect(report.response).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should integrate security components for comprehensive security management', async () => {
      // Initialize all components
      await securityManager.initialize(mockSecurityConfig);
      await complianceManager.initialize(mockComplianceFrameworks);
      await vulnerabilityScanner.initialize(mockVulnerabilityConfig);
      await securityMonitor.initialize(mockSecurityConfig);
      await policyEngine.initialize(mockSecurityConfig.policies);
      await securityTraining.initialize(mockTrainingConfig);
      await securityDocumentation.initialize();
      await penetrationTester.initialize(mockPenTestConfig);
      await incidentResponse.initialize(mockIncidentConfig);

      // Test integrated workflow
      const securityStatus = await securityManager.getSecurityStatus();
      const complianceStatus = await complianceManager.getComplianceStatus();
      const securityMetrics = await securityMonitor.getSecurityMetrics();

      expect(securityStatus.overall).toMatch(/secure|warning|critical/);
      expect(complianceStatus.overallScore).toBeGreaterThanOrEqual(0);
      expect(securityMetrics).toBeDefined();
    });

    it('should handle security incident end-to-end workflow', async () => {
      // Initialize required components
      await securityMonitor.initialize(mockSecurityConfig);
      await incidentResponse.initialize(mockIncidentConfig);
      await vulnerabilityScanner.initialize(mockVulnerabilityConfig);

      // Simulate security incident detection
      const alert = {
        id: '',
        type: 'threat',
        severity: 'high' as const,
        title: 'Malware Detection',
        description: 'Malware detected on system',
        source: 'antivirus',
        timestamp: new Date(),
        metadata: { system: 'server-01' }
      };

      await securityMonitor.generateAlert(alert);

      // Create incident from alert
      const incident = {
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        category: 'security',
        source: alert.source,
        reporter: 'security-monitor',
        affected: ['server-01']
      };

      const incidentId = await incidentResponse.createIncident(incident);

      // Execute response playbook
      const playbookResult = await incidentResponse.executePlaybook(incidentId, 'malware-response');

      // Verify workflow completion
      expect(incidentId).toBeDefined();
      expect(playbookResult.status).toMatch(/success|failure|partial/);
    });

    it('should perform comprehensive compliance validation', async () => {
      // Initialize compliance and security components
      await complianceManager.initialize(mockComplianceFrameworks);
      await securityManager.initialize(mockSecurityConfig);
      await policyEngine.initialize(mockSecurityConfig.policies);

      // Perform compliance validation
      const complianceReport = await complianceManager.validateCompliance('SOC2');
      const securityAssessment = await securityManager.assessSecurity();
      const policyValidation = await policyEngine.validatePolicies();

      // Verify comprehensive validation
      expect(complianceReport.framework).toBe('SOC2');
      expect(complianceReport.score).toBeGreaterThanOrEqual(0);
      expect(securityAssessment.findings).toBeDefined();
      expect(policyValidation.valid).toBeDefined();
    });
  });
});