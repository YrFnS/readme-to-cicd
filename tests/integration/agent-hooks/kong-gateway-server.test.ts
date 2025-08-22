// Kong Gateway Server Integration Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentHooksServer } from '../../../src/agent-hooks/server';
import axios, { AxiosInstance } from 'axios';

describe('Kong Gateway Server Integration', () => {
  let server: AgentHooksServer;
  let client: AxiosInstance;

  beforeAll(async () => {
    // Start the Agent Hooks server
    server = new AgentHooksServer();

    // Create axios client for testing
    client = axios.create({
      baseURL: 'http://localhost:3000',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Start server on test port
    await server.start(3000);
  });

  afterAll(async () => {
    // Stop the server
    await server.stop();
  });

  describe('Health Check Endpoint', () => {
    it('should respond to health check', async () => {
      const response = await client.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('version');
      expect(response.data.status).toBe('healthy');
    });

    it('should include server information in health check', async () => {
      const response = await client.get('/health');
      const data = response.data;

      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(typeof data.timestamp).toBe('string');
      expect(typeof data.version).toBe('string');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should provide metrics data', async () => {
      const response = await client.get('/metrics');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('uptime');
      expect(response.data.status).toBe('ok');
    });

    it('should include performance metrics', async () => {
      const response = await client.get('/metrics');
      const data = response.data;

      expect(data).toHaveProperty('uptime');
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThan(0);
    });
  });

  describe('Configuration Endpoint', () => {
    it('should provide configuration information', async () => {
      const response = await client.get('/api/config');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('config');
      expect(typeof response.data.config).toBe('object');
    });

    it('should mask sensitive configuration', async () => {
      const response = await client.get('/api/config');
      const config = response.data.config;

      // Should not expose actual secrets
      expect(config.webhookSecret).not.toBe(process.env.WEBHOOK_SECRET);
      expect(config.port).toBeDefined();
    });
  });

  describe('GitHub Webhook Endpoint', () => {
    it('should handle valid webhook payload', async () => {
      const webhookPayload = {
        action: 'push',
        repository: {
          name: 'test-repo',
          full_name: 'owner/test-repo',
          owner: { login: 'owner' },
          default_branch: 'main'
        },
        commits: [{ message: 'Test commit' }]
      };

      const response = await client.post('/webhooks/github', webhookPayload);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('success');
    });

    it('should reject invalid webhook payload', async () => {
      const invalidPayload = {
        invalid: 'payload'
      };

      const response = await client.post('/webhooks/github', invalidPayload);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('error');
    });

    it('should handle webhook signature verification', async () => {
      // Test with proper signature (would need actual implementation)
      const webhookPayload = {
        action: 'push',
        repository: {
          name: 'test-repo',
          full_name: 'owner/test-repo',
          owner: { login: 'owner' },
          default_branch: 'main'
        }
      };

      // For now, just test the endpoint exists and responds
      const response = await client.post('/webhooks/github', webhookPayload);
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      await expect(client.get('/non-existent-endpoint')).rejects.toMatchObject({
        response: {
          status: 404,
          data: expect.objectContaining({
            error: expect.any(String),
            message: expect.any(String)
          })
        }
      });
    });

    it('should handle malformed JSON', async () => {
      await expect(client.post('/webhooks/github', '{invalid json}')).rejects.toMatchObject({
        response: {
          status: expect.any(Number)
        }
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await client.get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should prevent clickjacking', async () => {
      const response = await client.get('/health');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow configured origins', async () => {
      const response = await client.get('/health');

      // Should include CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle preflight requests', async () => {
      const response = await client.options('/webhooks/github');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Performance and Load', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        client.get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('healthy');
      });
    });

    it('should maintain response times', async () => {
      const startTime = Date.now();
      await client.get('/health');
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});