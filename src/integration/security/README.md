# Security Management Framework

A comprehensive security management system providing authentication, authorization, encryption, audit logging, compliance validation, and security scanning capabilities for the readme-to-cicd integration platform.

## Overview

The Security Management Framework implements enterprise-grade security controls including:

- **Multi-Protocol Authentication**: OAuth 2.0, SAML, API keys, and basic authentication
- **Role-Based Access Control (RBAC)**: Fine-grained permissions with hierarchical roles
- **Data Encryption**: AES-256 for data at rest, TLS 1.3 for data in transit
- **Comprehensive Audit Logging**: Event tracking with real-time alerting
- **Compliance Validation**: SOC2, HIPAA, PCI-DSS, GDPR support
- **Security Scanning**: Vulnerability assessment and threat detection

## Architecture

```
SecurityManager
├── AuthenticationService
│   ├── OAuthProvider
│   ├── SAMLProvider
│   ├── ApiKeyProvider
│   └── SessionManager
├── AuthorizationService
├── EncryptionService
├── AuditService
├── ComplianceService
└── SecurityScanningService
```

## Quick Start

```typescript
import { SecurityManager } from './security/index.js'

const config = {
  security: {
    authentication: {
      providers: [
        {
          type: 'oauth',
          name: 'oauth-provider',
          config: {
            clientId: 'your-client-id',
            clientSecret: 'your-client-secret',
            authorizationUrl: 'https://auth.example.com/oauth/authorize',
            tokenUrl: 'https://auth.example.com/oauth/token',
            userInfoUrl: 'https://auth.example.com/oauth/userinfo',
            scope: ['read', 'write'],
            redirectUri: 'https://app.example.com/callback'
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
        days: 365
      },
      realTimeAlerts: true
    },
    compliance: {
      frameworks: ['soc2', 'hipaa'],
      assessmentSchedule: '0 0 1 * *',
      autoRemediation: false,
      reportingEmail: ['compliance@example.com']
    },
    scanning: {
      enabled: true,
      schedule: '0 2 * * 0',
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

const securityManager = new SecurityManager(config)
```

## Authentication

### OAuth 2.0 Authentication

```typescript
const credentials = {
  type: 'oauth',
  data: {
    accessToken: 'your-access-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    scope: ['read', 'write']
  }
}

const result = await securityManager.authenticate(credentials)
if (result.success) {
  console.log('User authenticated:', result.user)
  console.log('Session token:', result.token)
}
```

### SAML Authentication

```typescript
const credentials = {
  type: 'saml',
  data: {
    assertion: 'base64-encoded-saml-assertion',
    sessionIndex: 'session-123',
    nameId: 'user@company.com'
  }
}

const result = await securityManager.authenticate(credentials)
```

### API Key Authentication

```typescript
const credentials = {
  type: 'api-key',
  data: {
    key: 'ak_your_api_key',
    secret: 'sk_your_secret'
  }
}

const result = await securityManager.authenticate(credentials)
```

## Authorization

### Role-Based Access Control

```typescript
const user = await securityManager.validateToken(token)
const resource = {
  type: 'document',
  id: '123',
  attributes: { classification: 'confidential' }
}

const authorized = await securityManager.authorize(user, resource, 'read')
if (authorized) {
  // User can access the resource
}
```

### Permission Checking

```typescript
const hasPermission = await securityManager.checkPermission(user, 'admin:system')
const userRoles = await securityManager.getUserRoles(user.id)
```

## Encryption

### Data Encryption

```typescript
// Encrypt sensitive data
const plaintext = 'sensitive information'
const encrypted = await securityManager.encrypt(plaintext)

// Decrypt data
const decrypted = await securityManager.decrypt(encrypted)

// Encrypt with custom context
const context = {
  algorithm: 'AES-256-GCM',
  keyId: 'custom-key'
}
const encryptedWithContext = await securityManager.encrypt(plaintext, context)
```

### Key Management

```typescript
// Rotate encryption keys
await securityManager.rotateKeys()
```

## Audit Logging

### Event Logging

```typescript
const auditEvent = {
  id: 'event-123',
  timestamp: new Date(),
  userId: 'user-456',
  eventType: 'data-access',
  resource: 'customer-records',
  action: 'read',
  result: 'success',
  details: {
    recordCount: 10,
    query: 'SELECT * FROM customers WHERE active = true'
  }
}

await securityManager.auditLog(auditEvent)
```

### Audit Queries

```typescript
// Get recent events
const events = await securityManager.getAuditEvents({
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
  userId: 'user-456',
  limit: 100
})

// Generate audit report
const report = await securityManager.generateAuditReport({
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})
```

## Compliance

### Framework Validation

```typescript
// Get available frameworks
const frameworks = await securityManager.getComplianceFrameworks()

// Validate SOC2 compliance
const soc2Framework = frameworks.find(f => f.id === 'soc2')
const complianceReport = await securityManager.validateCompliance(soc2Framework)

console.log('Overall Score:', complianceReport.overallScore)
console.log('Recommendations:', complianceReport.recommendations)
```

### Policy Enforcement

```typescript
const policy = {
  id: 'data-access-policy',
  name: 'Data Access Control Policy',
  description: 'Controls access to sensitive data',
  type: 'security',
  rules: [
    {
      id: 'business-hours',
      condition: 'time.hour >= 8 && time.hour <= 18',
      action: 'allow',
      parameters: {}
    }
  ],
  enforcement: 'blocking',
  isActive: true
}

const result = await securityManager.enforcePolicy(policy)
```

### Risk Management

```typescript
const risk = {
  id: 'risk-001',
  timestamp: new Date(),
  riskType: 'security',
  severity: 'high',
  description: 'Unpatched vulnerability detected',
  impact: 'Potential data breach',
  likelihood: 'Medium',
  mitigation: ['Apply security patch', 'Increase monitoring'],
  status: 'open'
}

await securityManager.trackRisk(risk)
```

## Security Scanning

### Vulnerability Scanning

```typescript
// Start vulnerability scan
const scan = await securityManager.startSecurityScan('vulnerability', 'web-application')

// Wait for completion and get results
const results = await securityManager.getScanResults(scan.id)
console.log('Vulnerabilities found:', results.results?.vulnerabilities.length)
console.log('Risk score:', results.results?.summary.riskScore)
```

### Compliance Scanning

```typescript
// Start compliance scan
const complianceScan = await securityManager.startSecurityScan('compliance', 'payment-system')

// Get vulnerabilities by severity
const criticalVulns = await securityManager.getVulnerabilities('critical')
const highVulns = await securityManager.getVulnerabilities('high')
```

## Threat Detection

### Real-time Monitoring

```typescript
// Enable threat detection
const threats = await securityManager.detectThreats()

// Get security status
const status = await securityManager.getSecurityStatus()
console.log('Security Status:', status.status)
console.log('Active Threats:', status.threats.count)
```

## Configuration

### Authentication Providers

Configure multiple authentication providers:

```typescript
const authConfig = {
  providers: [
    {
      type: 'oauth',
      name: 'google-oauth',
      config: { /* OAuth config */ },
      isEnabled: true
    },
    {
      type: 'saml',
      name: 'corporate-saml',
      config: { /* SAML config */ },
      isEnabled: true
    },
    {
      type: 'api-key',
      name: 'api-access',
      config: { /* API key config */ },
      isEnabled: true
    }
  ]
}
```

### Compliance Frameworks

Enable multiple compliance frameworks:

```typescript
const complianceConfig = {
  frameworks: ['soc2', 'hipaa', 'pci-dss', 'gdpr'],
  assessmentSchedule: '0 0 1 * *', // Monthly
  autoRemediation: false,
  reportingEmail: ['compliance@company.com']
}
```

## Security Best Practices

### Password Policy

```typescript
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90,
  historyCount: 5
}
```

### Session Management

```typescript
const sessionConfig = {
  sessionTimeout: 3600, // 1 hour
  maxLoginAttempts: 5,
  lockoutDuration: 900 // 15 minutes
}
```

### Encryption Standards

- **Data at Rest**: AES-256-GCM encryption
- **Data in Transit**: TLS 1.3 with strong cipher suites
- **Key Management**: Automatic key rotation every 24 hours
- **Hashing**: SHA-256 for data integrity

## Testing

Run the security tests:

```bash
npm test tests/integration/security/
```

### Test Coverage

- Authentication flow testing
- Authorization policy validation
- Encryption/decryption verification
- Audit logging functionality
- Compliance framework validation
- Security scanning capabilities
- Threat detection scenarios

## Monitoring and Alerting

### Real-time Alerts

The system provides real-time security alerts for:

- Multiple failed login attempts
- Privilege escalation attempts
- Unusual access patterns
- Critical vulnerabilities
- Compliance violations

### Metrics and Statistics

```typescript
// Get security statistics
const stats = await securityManager.getSecurityStatus()

// Get audit statistics
const auditStats = await securityManager.getAuditStatistics()

// Get compliance statistics
const complianceStats = await securityManager.getComplianceStatistics()

// Get scanning statistics
const scanStats = await securityManager.getScanningStatistics()
```

## Integration

### Enterprise Systems

The security framework integrates with:

- **Identity Providers**: LDAP, Active Directory, OAuth providers
- **SIEM Systems**: Splunk, ELK Stack, QRadar
- **Vulnerability Scanners**: Nessus, OpenVAS, Qualys
- **Compliance Tools**: GRC platforms, audit systems
- **Key Management**: HashiCorp Vault, AWS KMS, Azure Key Vault

### API Integration

All security functions are available via REST APIs with proper authentication and rate limiting.

## Compliance Frameworks Supported

- **SOC 2 Type II**: Security, availability, processing integrity
- **HIPAA**: Healthcare data protection requirements
- **PCI DSS**: Payment card industry standards
- **GDPR**: European data protection regulation
- **Custom Frameworks**: Extensible for organization-specific requirements

## Performance Considerations

- **Caching**: Permission caching with configurable TTL
- **Async Operations**: Non-blocking security operations
- **Rate Limiting**: API key and session rate limiting
- **Scalability**: Horizontal scaling support
- **Monitoring**: Performance metrics and alerting

## Security Architecture

The framework follows security-by-design principles:

- **Zero Trust**: Verify every request and user
- **Least Privilege**: Minimal required permissions
- **Defense in Depth**: Multiple security layers
- **Fail Secure**: Secure defaults and error handling
- **Audit Everything**: Comprehensive logging and monitoring

## License

This security management framework is part of the readme-to-cicd integration platform and follows the same licensing terms.