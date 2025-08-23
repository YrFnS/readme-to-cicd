/**
 * Security Management Framework - Main Export
 * 
 * Provides comprehensive security management including authentication,
 * authorization, encryption, audit logging, compliance, and security scanning.
 */

export { SecurityManager, type SecurityManagerConfig } from './security-manager.js'
export { AuthenticationService } from './authentication/authentication-service.js'
export { SessionManager, type Session, type SessionManagerConfig } from './authentication/session-manager.js'
export { OAuthProvider, type OAuthConfig } from './authentication/providers/oauth-provider.js'
export { SAMLProvider, type SAMLConfig } from './authentication/providers/saml-provider.js'
export { ApiKeyProvider, type ApiKeyConfig } from './authentication/providers/api-key-provider.js'
export { AuthorizationService } from './authorization/authorization-service.js'
export { EncryptionService } from './encryption/encryption-service.js'
export { AuditService } from './audit/audit-service.js'
export { ComplianceService } from './compliance/compliance-service.js'
export { SecurityScanningService } from './scanning/security-scanning-service.js'

// Export all types
export * from './types.js'

// Re-export commonly used types for convenience
export type {
  Credentials,
  AuthenticationResult,
  User,
  Resource,
  Action,
  AuditEvent,
  ComplianceFramework,
  SecurityScan,
  Vulnerability,
  Policy,
  SecurityConfig
} from './types.js'