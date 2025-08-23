/**
 * API Key Provider Implementation
 * 
 * Handles API key authentication including key validation, rate limiting,
 * and integration with API key management systems.
 */

import { User } from '../../types.js'

export interface ApiKeyConfig {
  keyLength: number
  secretLength: number
  hashAlgorithm: string
  rateLimiting: {
    enabled: boolean
    requestsPerMinute: number
    requestsPerHour: number
  }
}

export interface ApiKey {
  id: string
  key: string
  secretHash?: string
  userId: string
  name: string
  permissions: string[]
  isActive: boolean
  createdAt: Date
  expiresAt?: Date
  lastUsed?: Date
  usageCount: number
  rateLimitRemaining: number
  rateLimitReset: Date
}

export class ApiKeyProvider {
  private apiKeys: Map<string, ApiKey> = new Map()
  private config: ApiKeyConfig

  constructor(config: ApiKeyConfig) {
    this.config = config
    this.initializeMockKeys()
  }

  private initializeMockKeys(): void {
    // Initialize some mock API keys for testing
    const mockKeys: ApiKey[] = [
      {
        id: 'key_1',
        key: 'ak_test_1234567890abcdef',
        secretHash: this.hashSecret('sk_test_secret123'),
        userId: 'user_api_1',
        name: 'Test API Key',
        permissions: ['read', 'write'],
        isActive: true,
        createdAt: new Date(),
        usageCount: 0,
        rateLimitRemaining: this.config.rateLimiting.requestsPerMinute,
        rateLimitReset: new Date(Date.now() + 60000)
      },
      {
        id: 'key_2',
        key: 'ak_prod_abcdef1234567890',
        secretHash: this.hashSecret('sk_prod_secret456'),
        userId: 'user_api_admin',
        name: 'Production Admin Key',
        permissions: ['admin'],
        isActive: true,
        createdAt: new Date(),
        usageCount: 0,
        rateLimitRemaining: this.config.rateLimiting.requestsPerMinute,
        rateLimitReset: new Date(Date.now() + 60000)
      }
    ]

    for (const key of mockKeys) {
      this.apiKeys.set(key.key, key)
    }
  }

  async validateApiKey(key: string, secret?: string): Promise<User | null> {
    try {
      const apiKey = this.apiKeys.get(key)
      
      if (!apiKey) {
        return null
      }

      // Check if key is active
      if (!apiKey.isActive) {
        return null
      }

      // Check if key is expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return null
      }

      // Validate secret if provided
      if (secret && apiKey.secretHash) {
        const secretHash = this.hashSecret(secret)
        if (secretHash !== apiKey.secretHash) {
          return null
        }
      }

      // Check rate limiting
      if (this.config.rateLimiting.enabled) {
        const rateLimitResult = await this.checkRateLimit(apiKey)
        if (!rateLimitResult.allowed) {
          throw new Error(`Rate limit exceeded. Try again after ${rateLimitResult.resetTime}`)
        }
      }

      // Update usage statistics
      await this.updateUsageStats(apiKey)

      // Return user associated with the API key
      return this.getApiKeyUser(apiKey)
    } catch (error) {
      console.error('API key validation failed:', error)
      return null
    }
  }

  private async checkRateLimit(apiKey: ApiKey): Promise<{ allowed: boolean; resetTime?: Date }> {
    const now = new Date()
    
    // Reset rate limit if time window has passed
    if (apiKey.rateLimitReset < now) {
      apiKey.rateLimitRemaining = this.config.rateLimiting.requestsPerMinute
      apiKey.rateLimitReset = new Date(now.getTime() + 60000) // Next minute
    }

    if (apiKey.rateLimitRemaining <= 0) {
      return {
        allowed: false,
        resetTime: apiKey.rateLimitReset
      }
    }

    apiKey.rateLimitRemaining--
    return { allowed: true }
  }

  private async updateUsageStats(apiKey: ApiKey): Promise<void> {
    apiKey.lastUsed = new Date()
    apiKey.usageCount++
  }

  private getApiKeyUser(apiKey: ApiKey): User {
    // Mock user data based on API key
    const baseUser = {
      id: apiKey.userId,
      username: `api_user_${apiKey.id}`,
      email: `${apiKey.userId}@api.example.com`,
      attributes: {
        provider: 'api-key',
        keyId: apiKey.id,
        keyName: apiKey.name,
        permissions: apiKey.permissions
      },
      isActive: true,
      lastLogin: new Date()
    }

    // Map permissions to roles and permissions
    const { roles, permissions } = this.mapApiKeyPermissions(apiKey.permissions)
    
    return {
      ...baseUser,
      roles,
      permissions
    }
  }

  private mapApiKeyPermissions(keyPermissions: string[]): { roles: any[]; permissions: any[] } {
    const roles: any[] = []
    const permissions: any[] = []

    for (const permission of keyPermissions) {
      switch (permission) {
        case 'admin':
          roles.push({
            id: 'role_api_admin',
            name: 'API Administrator',
            description: 'Full API access',
            permissions: [
              { id: 'perm_api_admin', resource: '*', action: 'admin' }
            ]
          })
          permissions.push({ id: 'perm_api_admin', resource: '*', action: 'admin' })
          break
        case 'read':
          permissions.push({ id: 'perm_api_read', resource: '*', action: 'read' })
          break
        case 'write':
          permissions.push({ id: 'perm_api_write', resource: '*', action: 'update' })
          break
        case 'delete':
          permissions.push({ id: 'perm_api_delete', resource: '*', action: 'delete' })
          break
        default:
          permissions.push({ id: `perm_api_${permission}`, resource: permission, action: 'execute' })
      }
    }

    // Add default API user role if no admin role
    if (!roles.some(r => r.id === 'role_api_admin')) {
      roles.push({
        id: 'role_api_user',
        name: 'API User',
        description: 'Standard API access',
        permissions
      })
    }

    return { roles, permissions }
  }

  async createApiKey(userId: string, name: string, permissions: string[], expiresAt?: Date): Promise<ApiKey> {
    const key = this.generateApiKey()
    const secret = this.generateSecret()
    
    const apiKey: ApiKey = {
      id: `key_${Date.now()}`,
      key,
      secretHash: this.hashSecret(secret),
      userId,
      name,
      permissions,
      isActive: true,
      createdAt: new Date(),
      expiresAt,
      usageCount: 0,
      rateLimitRemaining: this.config.rateLimiting.requestsPerMinute,
      rateLimitReset: new Date(Date.now() + 60000)
    }

    this.apiKeys.set(key, apiKey)
    
    return {
      ...apiKey,
      secretHash: secret // Return the plain secret only during creation
    } as any
  }

  async revokeApiKey(key: string): Promise<boolean> {
    const apiKey = this.apiKeys.get(key)
    if (!apiKey) {
      return false
    }

    apiKey.isActive = false
    return true
  }

  async listApiKeys(userId: string): Promise<Omit<ApiKey, 'secretHash'>[]> {
    const userKeys: Omit<ApiKey, 'secretHash'>[] = []
    
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.userId === userId) {
        const { secretHash, ...keyWithoutSecret } = apiKey
        userKeys.push(keyWithoutSecret)
      }
    }

    return userKeys
  }

  async getApiKeyUsage(key: string): Promise<any> {
    const apiKey = this.apiKeys.get(key)
    if (!apiKey) {
      return null
    }

    return {
      keyId: apiKey.id,
      name: apiKey.name,
      usageCount: apiKey.usageCount,
      lastUsed: apiKey.lastUsed,
      rateLimitRemaining: apiKey.rateLimitRemaining,
      rateLimitReset: apiKey.rateLimitReset,
      isActive: apiKey.isActive,
      expiresAt: apiKey.expiresAt
    }
  }

  private generateApiKey(): string {
    const prefix = 'ak_'
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let key = prefix
    
    for (let i = 0; i < this.config.keyLength; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return key
  }

  private generateSecret(): string {
    const prefix = 'sk_'
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let secret = prefix
    
    for (let i = 0; i < this.config.secretLength; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return secret
  }

  private hashSecret(secret: string): string {
    // In a real implementation, would use a proper cryptographic hash function
    // like bcrypt, scrypt, or Argon2
    return Buffer.from(secret).toString('base64')
  }

  validateConfig(): boolean {
    return this.config.keyLength > 0 && 
           this.config.secretLength > 0 && 
           this.config.hashAlgorithm.length > 0
  }

  getProviderInfo(): any {
    return {
      type: 'api-key',
      keyLength: this.config.keyLength,
      rateLimiting: this.config.rateLimiting,
      totalKeys: this.apiKeys.size,
      activeKeys: Array.from(this.apiKeys.values()).filter(k => k.isActive).length
    }
  }
}