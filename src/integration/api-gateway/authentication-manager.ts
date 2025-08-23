/**
 * Authentication Manager
 * 
 * Handles authentication for API requests using various methods
 * including OAuth2, JWT, API keys, and basic authentication.
 */

import type { RequestContext, AuthenticationConfig, User, OAuth2Config, JWTConfig } from './types';

export class AuthenticationManager {
  private config: AuthenticationConfig;

  constructor(config: AuthenticationConfig) {
    this.config = config;
  }

  /**
   * Authenticate a request and return user information
   */
  async authenticate(context: RequestContext): Promise<User | null> {
    if (!this.config.enabled) {
      return null;
    }

    // Try each authentication method in order
    for (const method of this.config.methods) {
      try {
        const user = await this.authenticateWithMethod(context, method);
        if (user) {
          return user;
        }
      } catch (error) {
        // Continue to next method if authentication fails
        console.warn(`Authentication failed with method ${method}:`, error.message);
      }
    }

    // No authentication method succeeded
    throw {
      code: 'AUTHENTICATION_FAILED',
      message: 'Authentication required',
      statusCode: 401,
      details: {
        supportedMethods: this.config.methods,
        headers: {
          'WWW-Authenticate': this.generateWWWAuthenticateHeader()
        }
      }
    };
  }

  /**
   * Authenticate using a specific method
   */
  private async authenticateWithMethod(context: RequestContext, method: string): Promise<User | null> {
    switch (method) {
      case 'oauth2':
        return this.authenticateOAuth2(context);
      
      case 'jwt':
        return this.authenticateJWT(context);
      
      case 'apikey':
        return this.authenticateAPIKey(context);
      
      case 'basic':
        return this.authenticateBasic(context);
      
      default:
        throw new Error(`Unsupported authentication method: ${method}`);
    }
  }

  /**
   * Authenticate using OAuth2 bearer token
   */
  private async authenticateOAuth2(context: RequestContext): Promise<User | null> {
    const authHeader = context.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    if (!token) {
      return null;
    }

    // Validate OAuth2 token
    const oauth2Config = this.config.oauth2;
    if (!oauth2Config) {
      throw new Error('OAuth2 configuration not found');
    }

    try {
      // In a real implementation, this would validate the token with the OAuth2 provider
      const tokenInfo = await this.validateOAuth2Token(token, oauth2Config);
      
      return {
        id: tokenInfo.sub,
        username: tokenInfo.username || tokenInfo.sub,
        email: tokenInfo.email,
        roles: tokenInfo.roles || [],
        permissions: tokenInfo.permissions || [],
        metadata: {
          authMethod: 'oauth2',
          tokenInfo
        }
      };
    } catch (error) {
      throw {
        code: 'INVALID_TOKEN',
        message: 'Invalid OAuth2 token',
        statusCode: 401
      };
    }
  }

  /**
   * Authenticate using JWT token
   */
  private async authenticateJWT(context: RequestContext): Promise<User | null> {
    const authHeader = context.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    if (!token) {
      return null;
    }

    const jwtConfig = this.config.jwt;
    if (!jwtConfig) {
      throw new Error('JWT configuration not found');
    }

    try {
      // In a real implementation, this would use a JWT library like jsonwebtoken
      const payload = await this.validateJWTToken(token, jwtConfig);
      
      return {
        id: payload.sub,
        username: payload.username || payload.sub,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        metadata: {
          authMethod: 'jwt',
          payload
        }
      };
    } catch (error) {
      throw {
        code: 'INVALID_TOKEN',
        message: 'Invalid JWT token',
        statusCode: 401
      };
    }
  }

  /**
   * Authenticate using API key
   */
  private async authenticateAPIKey(context: RequestContext): Promise<User | null> {
    // Check for API key in header
    let apiKey = context.headers['x-api-key'] || context.headers['api-key'];
    
    // Check for API key in query parameter
    if (!apiKey) {
      apiKey = context.query.apiKey || context.query.api_key;
    }

    if (!apiKey) {
      return null;
    }

    try {
      // Validate API key
      const keyInfo = await this.validateAPIKey(apiKey);
      
      return {
        id: keyInfo.userId,
        username: keyInfo.username,
        email: keyInfo.email,
        roles: keyInfo.roles || [],
        permissions: keyInfo.permissions || [],
        metadata: {
          authMethod: 'apikey',
          keyInfo: {
            id: keyInfo.id,
            name: keyInfo.name,
            scopes: keyInfo.scopes
          }
        }
      };
    } catch (error) {
      throw {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key',
        statusCode: 401
      };
    }
  }

  /**
   * Authenticate using basic authentication
   */
  private async authenticateBasic(context: RequestContext): Promise<User | null> {
    const authHeader = context.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return null;
    }

    const credentials = authHeader.substring(6);
    if (!credentials) {
      return null;
    }

    try {
      // Decode base64 credentials
      const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
      const [username, password] = decoded.split(':');
      
      if (!username || !password) {
        throw new Error('Invalid credentials format');
      }

      // Validate credentials
      const userInfo = await this.validateBasicCredentials(username, password);
      
      return {
        id: userInfo.id,
        username: userInfo.username,
        email: userInfo.email,
        roles: userInfo.roles || [],
        permissions: userInfo.permissions || [],
        metadata: {
          authMethod: 'basic'
        }
      };
    } catch (error) {
      throw {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
        statusCode: 401
      };
    }
  }

  /**
   * Validate OAuth2 token (mock implementation)
   */
  private async validateOAuth2Token(token: string, config: OAuth2Config): Promise<any> {
    // Mock implementation - in production, this would call the OAuth2 provider
    if (token === 'valid-oauth2-token') {
      return {
        sub: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read', 'write'],
        aud: config.audience,
        iss: config.issuer,
        exp: Date.now() / 1000 + 3600
      };
    }
    
    throw new Error('Invalid token');
  }

  /**
   * Validate JWT token (mock implementation)
   */
  private async validateJWTToken(token: string, config: JWTConfig): Promise<any> {
    // Mock implementation - in production, this would use a JWT library
    if (token === 'valid-jwt-token') {
      return {
        sub: 'user456',
        username: 'jwtuser',
        email: 'jwt@example.com',
        roles: ['admin'],
        permissions: ['read', 'write', 'admin'],
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600
      };
    }
    
    throw new Error('Invalid token');
  }

  /**
   * Validate API key (mock implementation)
   */
  private async validateAPIKey(apiKey: string): Promise<any> {
    // Mock implementation - in production, this would query a database
    if (apiKey === 'valid-api-key-123') {
      return {
        id: 'key123',
        name: 'Test API Key',
        userId: 'user789',
        username: 'apiuser',
        email: 'api@example.com',
        roles: ['service'],
        permissions: ['read'],
        scopes: ['api:read'],
        createdAt: new Date(),
        lastUsed: new Date()
      };
    }
    
    throw new Error('Invalid API key');
  }

  /**
   * Validate basic authentication credentials (mock implementation)
   */
  private async validateBasicCredentials(username: string, password: string): Promise<any> {
    // Mock implementation - in production, this would verify against a user store
    if (username === 'admin' && password === 'password') {
      return {
        id: 'admin123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['read', 'write', 'admin']
      };
    }
    
    throw new Error('Invalid credentials');
  }

  /**
   * Generate WWW-Authenticate header for 401 responses
   */
  private generateWWWAuthenticateHeader(): string {
    const challenges: string[] = [];
    
    if (this.config.methods.includes('oauth2') && this.config.oauth2) {
      challenges.push(`Bearer realm="${this.config.oauth2.audience}"`);
    }
    
    if (this.config.methods.includes('jwt')) {
      challenges.push('Bearer realm="JWT"');
    }
    
    if (this.config.methods.includes('basic')) {
      challenges.push('Basic realm="API"');
    }
    
    return challenges.join(', ');
  }
}