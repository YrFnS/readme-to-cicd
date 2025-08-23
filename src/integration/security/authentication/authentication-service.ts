/**
 * Authentication Service Implementation
 * 
 * Provides multi-protocol authentication support including OAuth 2.0, SAML,
 * and API key authentication with session management and token validation.
 */

import {
  Credentials,
  AuthenticationResult,
  User,
  AuthConfig,
  OAuthCredentials,
  SAMLCredentials,
  ApiKeyCredentials,
  BasicCredentials
} from '../types.js'
import { OAuthProvider } from './providers/oauth-provider.js'
import { SAMLProvider } from './providers/saml-provider.js'
import { ApiKeyProvider } from './providers/api-key-provider.js'
import { SessionManager } from './session-manager.js'

export class AuthenticationService {
  private oauthProvider: OAuthProvider
  private samlProvider: SAMLProvider
  private apiKeyProvider: ApiKeyProvider
  private sessionManager: SessionManager
  private config: AuthConfig

  constructor(config: AuthConfig) {
    this.config = config
    this.initializeProviders()
  }

  private initializeProviders(): void {
    this.oauthProvider = new OAuthProvider(this.getProviderConfig('oauth'))
    this.samlProvider = new SAMLProvider(this.getProviderConfig('saml'))
    this.apiKeyProvider = new ApiKeyProvider(this.getProviderConfig('api-key'))
    this.sessionManager = new SessionManager({
      sessionTimeout: this.config.sessionTimeout,
      maxLoginAttempts: this.config.maxLoginAttempts,
      lockoutDuration: this.config.lockoutDuration
    })
  }

  private getProviderConfig(type: string): any {
    const provider = this.config.providers.find(p => p.type === type && p.isEnabled)
    return provider?.config || {}
  }

  async authenticate(credentials: Credentials): Promise<AuthenticationResult> {
    try {
      // Check for account lockout
      if (credentials.type !== 'api-key') {
        const isLocked = await this.sessionManager.isAccountLocked(this.extractUserId(credentials))
        if (isLocked) {
          return {
            success: false,
            error: 'Account is temporarily locked due to multiple failed attempts'
          }
        }
      }

      let result: AuthenticationResult

      switch (credentials.type) {
        case 'oauth':
          result = await this.authenticateOAuth(credentials.data as OAuthCredentials)
          break
        case 'saml':
          result = await this.authenticateSAML(credentials.data as SAMLCredentials)
          break
        case 'api-key':
          result = await this.authenticateApiKey(credentials.data as ApiKeyCredentials)
          break
        case 'basic':
          result = await this.authenticateBasic(credentials.data as BasicCredentials)
          break
        default:
          return {
            success: false,
            error: `Unsupported authentication type: ${credentials.type}`
          }
      }

      // Handle authentication result
      if (result.success && result.user) {
        // Create session
        const session = await this.sessionManager.createSession(result.user)
        result.token = session.token
        result.expiresAt = session.expiresAt

        // Reset failed attempts on successful login
        await this.sessionManager.resetFailedAttempts(result.user.id)
      } else if (!result.success && credentials.type !== 'api-key') {
        // Track failed attempt
        const userId = this.extractUserId(credentials)
        await this.sessionManager.recordFailedAttempt(userId)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }
    }
  }

  private async authenticateOAuth(credentials: OAuthCredentials): Promise<AuthenticationResult> {
    try {
      const user = await this.oauthProvider.validateToken(credentials.accessToken)
      if (!user) {
        return { success: false, error: 'Invalid OAuth token' }
      }

      return {
        success: true,
        user,
        metadata: {
          tokenType: credentials.tokenType,
          scope: credentials.scope,
          expiresIn: credentials.expiresIn
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth authentication failed'
      }
    }
  }

  private async authenticateSAML(credentials: SAMLCredentials): Promise<AuthenticationResult> {
    try {
      const user = await this.samlProvider.validateAssertion(credentials.assertion)
      if (!user) {
        return { success: false, error: 'Invalid SAML assertion' }
      }

      return {
        success: true,
        user,
        metadata: {
          sessionIndex: credentials.sessionIndex,
          nameId: credentials.nameId,
          attributes: credentials.attributes
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SAML authentication failed'
      }
    }
  }

  private async authenticateApiKey(credentials: ApiKeyCredentials): Promise<AuthenticationResult> {
    try {
      const user = await this.apiKeyProvider.validateApiKey(credentials.key, credentials.secret)
      if (!user) {
        return { success: false, error: 'Invalid API key' }
      }

      return {
        success: true,
        user,
        metadata: {
          keyId: credentials.key.substring(0, 8) + '...',
          algorithm: credentials.algorithm
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API key authentication failed'
      }
    }
  }

  private async authenticateBasic(credentials: BasicCredentials): Promise<AuthenticationResult> {
    try {
      // Validate password policy
      if (!this.validatePassword(credentials.password)) {
        return { success: false, error: 'Password does not meet policy requirements' }
      }

      // Mock basic authentication - in real implementation, would check against user store
      const user = await this.validateBasicCredentials(credentials.username, credentials.password)
      if (!user) {
        return { success: false, error: 'Invalid username or password' }
      }

      return {
        success: true,
        user
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Basic authentication failed'
      }
    }
  }

  private validatePassword(password: string): boolean {
    const policy = this.config.passwordPolicy
    
    if (password.length < policy.minLength) return false
    if (policy.requireUppercase && !/[A-Z]/.test(password)) return false
    if (policy.requireLowercase && !/[a-z]/.test(password)) return false
    if (policy.requireNumbers && !/\d/.test(password)) return false
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false

    return true
  }

  private async validateBasicCredentials(username: string, password: string): Promise<User | null> {
    // Mock implementation - would integrate with actual user store
    if (username === 'admin' && password === 'Admin123!') {
      return {
        id: 'user_admin',
        username: 'admin',
        email: 'admin@example.com',
        roles: [
          {
            id: 'role_admin',
            name: 'Administrator',
            description: 'Full system access',
            permissions: [
              { id: 'perm_all', resource: '*', action: 'admin' }
            ]
          }
        ],
        permissions: [
          { id: 'perm_all', resource: '*', action: 'admin' }
        ],
        attributes: {},
        isActive: true
      }
    }
    return null
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const session = await this.sessionManager.getSession(token)
      if (!session || session.expiresAt < new Date()) {
        return null
      }

      return session.user
    } catch (error) {
      return null
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthenticationResult> {
    try {
      // Mock implementation - would validate refresh token and issue new access token
      const session = await this.sessionManager.refreshSession(refreshToken)
      if (!session) {
        return { success: false, error: 'Invalid refresh token' }
      }

      return {
        success: true,
        user: session.user,
        token: session.token,
        expiresAt: session.expiresAt
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      }
    }
  }

  async logout(token: string): Promise<void> {
    await this.sessionManager.destroySession(token)
  }

  private extractUserId(credentials: Credentials): string {
    switch (credentials.type) {
      case 'basic':
        return (credentials.data as BasicCredentials).username
      case 'oauth':
        return 'oauth_user' // Would extract from token in real implementation
      case 'saml':
        return (credentials.data as SAMLCredentials).nameId
      case 'api-key':
        return (credentials.data as ApiKeyCredentials).key
      default:
        return 'unknown'
    }
  }

  async getAuthenticationMethods(): Promise<string[]> {
    return this.config.providers
      .filter(p => p.isEnabled)
      .map(p => p.type)
  }

  async getPasswordPolicy(): Promise<any> {
    return this.config.passwordPolicy
  }
}