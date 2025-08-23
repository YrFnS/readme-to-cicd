/**
 * OAuth 2.0 Provider Implementation
 * 
 * Handles OAuth 2.0 authentication flow including token validation,
 * user profile retrieval, and integration with various OAuth providers.
 */

import { User } from '../../types.js'

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  scope: string[]
  redirectUri: string
}

export class OAuthProvider {
  private config: OAuthConfig

  constructor(config: OAuthConfig) {
    this.config = config
  }

  async validateToken(accessToken: string): Promise<User | null> {
    try {
      // In a real implementation, this would make an HTTP request to the OAuth provider
      // to validate the token and retrieve user information
      const userInfo = await this.fetchUserInfo(accessToken)
      
      if (!userInfo) {
        return null
      }

      return this.mapUserInfo(userInfo)
    } catch (error) {
      console.error('OAuth token validation failed:', error)
      return null
    }
  }

  private async fetchUserInfo(accessToken: string): Promise<any> {
    // Mock implementation - in real scenario, would make HTTP request
    // to the OAuth provider's user info endpoint
    
    // Simulate different token scenarios
    if (accessToken === 'valid_oauth_token') {
      return {
        id: 'oauth_123456',
        email: 'user@example.com',
        name: 'OAuth User',
        username: 'oauth_user',
        roles: ['user'],
        verified: true
      }
    } else if (accessToken === 'admin_oauth_token') {
      return {
        id: 'oauth_admin',
        email: 'admin@example.com',
        name: 'OAuth Admin',
        username: 'oauth_admin',
        roles: ['admin', 'user'],
        verified: true
      }
    }

    return null
  }

  private mapUserInfo(userInfo: any): User {
    return {
      id: `oauth_${userInfo.id}`,
      username: userInfo.username || userInfo.email,
      email: userInfo.email,
      roles: this.mapRoles(userInfo.roles || ['user']),
      permissions: this.mapPermissions(userInfo.roles || ['user']),
      attributes: {
        provider: 'oauth',
        verified: userInfo.verified || false,
        name: userInfo.name,
        oauthId: userInfo.id
      },
      isActive: true,
      lastLogin: new Date()
    }
  }

  private mapRoles(roleNames: string[]): any[] {
    return roleNames.map(roleName => ({
      id: `role_${roleName}`,
      name: roleName,
      description: `${roleName} role from OAuth provider`,
      permissions: this.getRolePermissions(roleName)
    }))
  }

  private mapPermissions(roleNames: string[]): any[] {
    const permissions: any[] = []
    
    for (const roleName of roleNames) {
      permissions.push(...this.getRolePermissions(roleName))
    }

    return permissions
  }

  private getRolePermissions(roleName: string): any[] {
    const permissionMap: Record<string, any[]> = {
      admin: [
        { id: 'perm_admin_all', resource: '*', action: 'admin' },
        { id: 'perm_read_all', resource: '*', action: 'read' },
        { id: 'perm_write_all', resource: '*', action: 'update' },
        { id: 'perm_delete_all', resource: '*', action: 'delete' }
      ],
      user: [
        { id: 'perm_read_own', resource: 'user-data', action: 'read' },
        { id: 'perm_update_own', resource: 'user-data', action: 'update' }
      ],
      viewer: [
        { id: 'perm_read_public', resource: 'public-data', action: 'read' }
      ]
    }

    return permissionMap[roleName] || permissionMap.user
  }

  async getAuthorizationUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope.join(' '),
      response_type: 'code',
      ...(state && { state })
    })

    return `${this.config.authorizationUrl}?${params.toString()}`
  }

  async exchangeCodeForToken(code: string, state?: string): Promise<any> {
    // Mock implementation - in real scenario, would make HTTP POST request
    // to exchange authorization code for access token
    
    if (code === 'valid_auth_code') {
      return {
        access_token: 'valid_oauth_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token_123',
        scope: this.config.scope.join(' ')
      }
    }

    throw new Error('Invalid authorization code')
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    // Mock implementation - in real scenario, would make HTTP POST request
    // to refresh the access token
    
    if (refreshToken === 'refresh_token_123') {
      return {
        access_token: 'new_valid_oauth_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new_refresh_token_123',
        scope: this.config.scope.join(' ')
      }
    }

    throw new Error('Invalid refresh token')
  }

  async revokeToken(token: string): Promise<void> {
    // Mock implementation - in real scenario, would make HTTP POST request
    // to revoke the token at the OAuth provider
    console.log(`Revoking OAuth token: ${token.substring(0, 8)}...`)
  }

  validateConfig(): boolean {
    const required = ['clientId', 'clientSecret', 'authorizationUrl', 'tokenUrl', 'userInfoUrl']
    return required.every(field => this.config[field as keyof OAuthConfig])
  }

  getProviderInfo(): any {
    return {
      type: 'oauth',
      authorizationUrl: this.config.authorizationUrl,
      scope: this.config.scope,
      redirectUri: this.config.redirectUri
    }
  }
}