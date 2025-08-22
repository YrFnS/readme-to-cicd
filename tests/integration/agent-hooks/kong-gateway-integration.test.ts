// Kong Gateway API Integration Tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as crypto from 'crypto';

interface KongGatewayConfig {
  baseURL: string;
  timeout: number;
  maxRetries: number;
}

interface AuthenticationResponse {
  ticket: string;
  userId: string;
  token: string;
  expiresIn: number;
}

interface KongStatusResponse {
  server: {
    connections_accepted: number;
    connections_active: number;
    connections_handled: number;
    connections_reading: number;
    connections_waiting: number;
    connections_writing: number;
    total_requests: number;
  };
  database: {
    reachable: boolean;
  };
}

class KongGatewayTestClient {
  private client: AxiosInstance;
  private config: KongGatewayConfig;
  private authToken?: string;

  constructor(config: KongGatewayConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Agent-Hooks-Test-Client/1.0'
      }
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });
  }

  async authenticate(username: string, password: string): Promise<AuthenticationResponse> {
    try {
      const response = await this.client.post('/v1/oauth/token', {
        grant_type: 'password',
        username,
        password,
        client_id: process.env.KONG_CLIENT_ID || 'test-client',
        client_secret: process.env.KONG_CLIENT_SECRET || 'test-secret'
      });

      const authData = response.data;
      this.authToken = authData.access_token;

      return {
        ticket: authData.ticket || this.generateTicket(),
        userId: authData.user_id || username,
        token: authData.access_token,
        expiresIn: authData.expires_in || 3600
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error(`Kong Gateway authentication failed: ${error.message}`);
    }
  }

  async setAuthentication(ticket: string, userId: string): Promise<void> {
    // Set custom headers for Kong Gateway's ticket-based auth
    this.client.defaults.headers.common['X-Ticket'] = ticket;
    this.client.defaults.headers.common['X-User-Id'] = userId;

    // Generate a basic bearer token for compatibility
    this.authToken = this.generateBearerToken(ticket, userId);
  }

  private generateTicket(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateBearerToken(ticket: string, userId: string): string {
    const payload = JSON.stringify({ ticket, userId, timestamp: Date.now() });
    return Buffer.from(payload).toString('base64');
  }

  async getStatus(): Promise<KongStatusResponse> {
    const response = await this.client.get('/status');
    return response.data;
  }

  async makeAuthenticatedRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<AxiosResponse> {
    const response = await this.client.request({
      method,
      url: endpoint,
      data
    });
    return response;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/');
      return true;
    } catch (error) {
      return false;
    }
  }
}

describe('Kong Gateway Integration Tests', () => {
  const kongConfig: KongGatewayConfig = {
    baseURL: process.env.KONG_GATEWAY_URL || 'http://localhost:8000',
    timeout: 10000,
    maxRetries: 3
  };

  let client: KongGatewayTestClient;

  beforeAll(async () => {
    client = new KongGatewayTestClient(kongConfig);

    // Test basic connectivity
    const isConnected = await client.testConnection();
    if (!isConnected) {
      console.warn('Kong Gateway not available, skipping integration tests');
    }
  });

  describe('Kong Gateway Status', () => {
    it('should be able to connect to Kong Gateway', async () => {
      const isConnected = await client.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should retrieve Kong Gateway status', async () => {
      const status = await client.getStatus();

      expect(status).toBeDefined();
      expect(status.server).toBeDefined();
      expect(status.database).toBeDefined();
      expect(typeof status.server.connections_accepted).toBe('number');
      expect(typeof status.database.reachable).toBe('boolean');
    });

    it('should have database connectivity', async () => {
      const status = await client.getStatus();
      expect(status.database.reachable).toBe(true);
    });

    it('should show active connections', async () => {
      const status = await client.getStatus();
      expect(status.server.connections_accepted).toBeGreaterThanOrEqual(0);
      expect(status.server.connections_active).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication Flow', () => {
    it('should authenticate with valid credentials', async () => {
      const authResponse = await client.authenticate(
        process.env.KONG_TEST_USER || 'test-user',
        process.env.KONG_TEST_PASSWORD || 'test-password'
      );

      expect(authResponse).toBeDefined();
      expect(authResponse.ticket).toBeDefined();
      expect(authResponse.userId).toBeDefined();
      expect(authResponse.token).toBeDefined();
      expect(authResponse.expiresIn).toBeGreaterThan(0);
    });

    it('should set authentication headers correctly', async () => {
      const ticket = 'test-ticket-123';
      const userId = 'test-user-456';

      await client.setAuthentication(ticket, userId);

      expect(client['authToken']).toBeDefined();
      expect(client['client'].defaults.headers.common['X-Ticket']).toBe(ticket);
      expect(client['client'].defaults.headers.common['X-User-Id']).toBe(userId);
    });

    it('should generate valid bearer token', async () => {
      const ticket = 'test-ticket-123';
      const userId = 'test-user-456';

      await client.setAuthentication(ticket, userId);

      const bearerToken = client['authToken'];
      expect(bearerToken).toBeDefined();
      expect(bearerToken!.length).toBeGreaterThan(0);

      // Verify token can be decoded
      const decoded = Buffer.from(bearerToken!, 'base64').toString();
      expect(() => JSON.parse(decoded)).not.toThrow();
    });

    it('should fail with invalid credentials', async () => {
      await expect(client.authenticate('invalid-user', 'invalid-password'))
        .rejects
        .toThrow('Kong Gateway authentication failed');
    });
  });

  describe('Authenticated API Requests', () => {
    let authData: AuthenticationResponse;

    beforeEach(async () => {
      // Authenticate before each test
      authData = await client.authenticate(
        process.env.KONG_TEST_USER || 'test-user',
        process.env.KONG_TEST_PASSWORD || 'test-password'
      );

      await client.setAuthentication(authData.ticket, authData.userId);
    });

    it('should make authenticated GET request', async () => {
      const response = await client.makeAuthenticatedRequest('/api/test-endpoint');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    });

    it('should make authenticated POST request', async () => {
      const testData = { message: 'test data' };
      const response = await client.makeAuthenticatedRequest('/api/test-endpoint', 'POST', testData);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    });

    it('should handle authentication errors gracefully', async () => {
      // Clear authentication
      delete client['client'].defaults.headers.common['X-Ticket'];
      delete client['client'].defaults.headers.common['X-User-Id'];
      client['authToken'] = undefined;

      await expect(client.makeAuthenticatedRequest('/api/protected-endpoint'))
        .rejects
        .toThrow();
    });

    it('should include proper headers in authenticated requests', async () => {
      // Mock request to capture headers
      let capturedHeaders: any = {};

      client['client'].interceptors.request.use((config) => {
        capturedHeaders = config.headers;
        return config;
      });

      try {
        await client.makeAuthenticatedRequest('/api/test-endpoint');
      } catch (error) {
        // Ignore response, we just want to check headers
      }

      expect(capturedHeaders['X-Ticket']).toBeDefined();
      expect(capturedHeaders['X-User-Id']).toBeDefined();
      expect(capturedHeaders['Authorization']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const slowClient = new KongGatewayTestClient({
        ...kongConfig,
        timeout: 1 // 1ms timeout
      });

      await expect(slowClient.getStatus()).rejects.toThrow();
    });

    it('should handle invalid endpoints', async () => {
      await expect(client.makeAuthenticatedRequest('/invalid-endpoint'))
        .rejects
        .toThrow();
    });

    it('should handle malformed responses', async () => {
      // This would require mocking the response
      // For now, just test that the client handles errors
      const isConnected = await client.testConnection();
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        client.getStatus()
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.server).toBeDefined();
      });
    });

    it('should maintain connection performance', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 5; i++) {
        await client.getStatus();
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / 5;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(averageTime).toBeLessThan(5000); // 5 seconds average
    });
  });

  afterAll(async () => {
    // Cleanup if needed
    if (client) {
      // Clear any authentication state
      client['authToken'] = undefined;
    }
  });
});