/**
 * API Management System Tests
 * 
 * Comprehensive tests for API Gateway, OpenAPI generation,
 * rate limiting, authentication, authorization, and webhooks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { APIGateway } from '../../src/integration/api-gateway/api-gateway';
import { OpenAPIGenerator } from '../../src/integration/api-management/openapi-generator';
import { WebhookManager } from '../../src/integration/webhooks/webhook-manager';
import type {
  APIGatewayConfig,
  Route,
  RequestContext,
  ResponseContext
} from '../../src/integration/api-gateway/types';
import type { WebhookConfig, WebhookEvent } from '../../src/integration/webhooks/types';

describe('API Management System', () => {
  let apiGateway: APIGateway;
  let openApiGenerator: OpenAPIGenerator;
  let webhookManager: WebhookManager;
  let config: APIGatewayConfig;

  beforeEach(() => {
    config = {
      port: 3000,
      host: 'localhost',
      basePath: '/api',
      cors: {
        enabled: true,
        origins: ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        headers: ['Content-Type', 'Authorization'],
        credentials: false
      },
      security: {
        authentication: {
          enabled: true,
          methods: ['jwt', 'apikey'],
          jwt: {
            secret: 'test-secret',
            algorithm: 'HS256',
            expiresIn: '1h'
          }
        },
        authorization: {
          enabled: true,
          rbac: {
            roles: [
              {
                name: 'admin',
                permissions: ['*:*'],
                description: 'Administrator role'
              },
              {
                name: 'user',
                permissions: ['read:*'],
                description: 'User role'
              }
            ],
            permissions: [
              {
                name: 'read:*',
                resource: '*',
                actions: ['read'],
                description: 'Read access to all resources'
              }
            ]
          }
        },
        encryption: {
          tls: {
            enabled: true,
            version: '1.3'
          },
          dataEncryption: {
            enabled: true,
            algorithm: 'AES-256-GCM',
            keyRotation: true
          }
        }
      },
      rateLimit: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      timeout: 30000,
      maxRequestSize: '10mb'
    };

    apiGateway = new APIGateway(config);
    
    openApiGenerator = new OpenAPIGenerator(
      {
        title: 'README-to-CICD API',
        version: '1.0.0',
        description: 'API for the README-to-CICD system'
      },
      [
        {
          url: 'https://api.example.com',
          description: 'Production server'
        }
      ]
    );

    const webhookConfig: WebhookConfig = {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 5000,
      batchSize: 10,
      deliveryTracking: true,
      signatureSecret: 'webhook-secret'
    };

    webhookManager = new WebhookManager(webhookConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API Gateway', () => {
    it('should create API Gateway with configuration', () => {
      expect(apiGateway).toBeDefined();
      expect(apiGateway.getStatus().config).toEqual(config);
    });

    it('should add routes to the gateway', () => {
      const route: Route = {
        path: '/test',
        method: 'GET',
        handler: async (context: RequestContext): Promise<ResponseContext> => ({
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { message: 'test' },
          metadata: {},
          endTime: new Date(),
          duration: 0
        }),
        config: {
          authentication: false
        }
      };

      apiGateway.addRoute(route);
      expect(apiGateway.getStatus().stats.routes).toBe(3); // Including default routes
    });

    it('should process requests through middleware pipeline', async () => {
      const mockRequest = {
        method: 'GET',
        path: '/health',
        headers: { 'content-type': 'application/json' },
        query: {},
        body: null
      };

      const response = await apiGateway.processRequest(mockRequest);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        status: 'healthy',
        timestamp: expect.any(String)
      });
      expect(response.metadata?.requestId).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      const route: Route = {
        path: '/protected',
        method: 'GET',
        handler: async (): Promise<ResponseContext> => ({
          statusCode: 200,
          headers: {},
          body: { message: 'protected' },
          metadata: {},
          endTime: new Date(),
          duration: 0
        }),
        config: {
          authentication: true
        }
      };

      apiGateway.addRoute(route);

      const mockRequest = {
        method: 'GET',
        path: '/protected',
        headers: {},
        query: {},
        body: null
      };

      const response = await apiGateway.processRequest(mockRequest);
      
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('AUTHENTICATION_FAILED');
      expect(response.error?.statusCode).toBe(401);
    });

    it('should handle rate limiting', async () => {
      const mockRequest = {
        method: 'GET',
        path: '/health',
        headers: {},
        query: {},
        body: null
      };

      // Make requests up to the limit
      for (let i = 0; i < 100; i++) {
        const response = await apiGateway.processRequest(mockRequest);
        expect(response.success).toBe(true);
      }

      // Next request should be rate limited
      const response = await apiGateway.processRequest(mockRequest);
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.error?.statusCode).toBe(429);
    });
  });

  describe('OpenAPI Generator', () => {
    it('should generate OpenAPI specification from routes', () => {
      const routes: Route[] = [
        {
          path: '/users',
          method: 'GET',
          handler: async (): Promise<ResponseContext> => ({
            statusCode: 200,
            headers: {},
            body: [],
            metadata: {},
            endTime: new Date(),
            duration: 0
          }),
          config: {}
        },
        {
          path: '/users/:id',
          method: 'GET',
          handler: async (): Promise<ResponseContext> => ({
            statusCode: 200,
            headers: {},
            body: {},
            metadata: {},
            endTime: new Date(),
            duration: 0
          }),
          config: {}
        },
        {
          path: '/users',
          method: 'POST',
          handler: async (): Promise<ResponseContext> => ({
            statusCode: 201,
            headers: {},
            body: {},
            metadata: {},
            endTime: new Date(),
            duration: 0
          }),
          config: {}
        }
      ];

      const spec = openApiGenerator.generateSpec(routes);

      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toBe('README-to-CICD API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.paths).toBeDefined();
      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/users/{id}']).toBeDefined();
      expect(spec.paths['/users'].get).toBeDefined();
      expect(spec.paths['/users'].post).toBeDefined();
      expect(spec.paths['/users/{id}'].get).toBeDefined();
    });

    it('should generate security schemes', () => {
      const routes: Route[] = [];
      const spec = openApiGenerator.generateSpec(routes);

      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes?.apiKey).toBeDefined();
      expect(spec.components.securitySchemes?.oauth2).toBeDefined();
    });

    it('should generate parameters for path variables', () => {
      const routes: Route[] = [
        {
          path: '/users/:id/posts/:postId',
          method: 'GET',
          handler: async (): Promise<ResponseContext> => ({
            statusCode: 200,
            headers: {},
            body: {},
            metadata: {},
            endTime: new Date(),
            duration: 0
          }),
          config: {}
        }
      ];

      const spec = openApiGenerator.generateSpec(routes);
      const operation = spec.paths['/users/{id}/posts/{postId}'].get;

      expect(operation.parameters).toBeDefined();
      expect(operation.parameters?.length).toBe(4); // id, postId, limit, offset
      
      const pathParams = operation.parameters?.filter(p => p.in === 'path');
      expect(pathParams?.length).toBe(2);
      expect(pathParams?.find(p => p.name === 'id')).toBeDefined();
      expect(pathParams?.find(p => p.name === 'postId')).toBeDefined();
    });

    it('should generate multiple format specifications', () => {
      const routes: Route[] = [
        {
          path: '/test',
          method: 'GET',
          handler: async (): Promise<ResponseContext> => ({
            statusCode: 200,
            headers: {},
            body: {},
            metadata: {},
            endTime: new Date(),
            duration: 0
          }),
          config: {}
        }
      ];

      const formats = openApiGenerator.generateMultipleFormats(routes, ['openapi', 'swagger']);

      expect(formats.openapi).toBeDefined();
      expect(formats.openapi.openapi).toBe('3.0.3');
      expect(formats.swagger).toBeDefined();
      expect(formats.swagger.swagger).toBe('2.0');
    });
  });

  describe('Webhook Manager', () => {
    it('should register webhooks', async () => {
      const webhookId = await webhookManager.registerWebhook({
        url: 'https://example.com/webhook',
        events: ['user.created', 'user.updated'],
        active: true,
        secret: 'webhook-secret'
      });

      expect(webhookId).toBeDefined();
      expect(webhookId).toMatch(/^webhook_/);

      const webhook = webhookManager.getWebhook(webhookId);
      expect(webhook).toBeDefined();
      expect(webhook?.url).toBe('https://example.com/webhook');
      expect(webhook?.events).toEqual(['user.created', 'user.updated']);
    });

    it('should update webhooks', async () => {
      const webhookId = await webhookManager.registerWebhook({
        url: 'https://example.com/webhook',
        events: ['user.created'],
        active: true
      });

      await webhookManager.updateWebhook(webhookId, {
        url: 'https://example.com/new-webhook',
        events: ['user.created', 'user.deleted'],
        active: false
      });

      const webhook = webhookManager.getWebhook(webhookId);
      expect(webhook?.url).toBe('https://example.com/new-webhook');
      expect(webhook?.events).toEqual(['user.created', 'user.deleted']);
      expect(webhook?.active).toBe(false);
    });

    it('should delete webhooks', async () => {
      const webhookId = await webhookManager.registerWebhook({
        url: 'https://example.com/webhook',
        events: ['user.created'],
        active: true
      });

      await webhookManager.deleteWebhook(webhookId);

      const webhook = webhookManager.getWebhook(webhookId);
      expect(webhook).toBeUndefined();
    });

    it('should emit events to subscribed webhooks', async () => {
      const deliveryPromise = new Promise((resolve) => {
        webhookManager.on('delivery', resolve);
      });

      await webhookManager.registerWebhook({
        url: 'https://httpbin.org/post',
        events: ['test.event'],
        active: true
      });

      const event: WebhookEvent = {
        id: 'test-event-1',
        type: 'test.event',
        data: { message: 'test event' },
        timestamp: new Date(),
        source: 'test',
        version: '1.0.0'
      };

      await webhookManager.emitEvent(event);

      // Wait for delivery attempt
      const result = await Promise.race([
        deliveryPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);

      expect(result).toBeDefined();
    });

    it('should track webhook metrics', async () => {
      await webhookManager.registerWebhook({
        url: 'https://example.com/webhook1',
        events: ['test.event'],
        active: true
      });

      await webhookManager.registerWebhook({
        url: 'https://example.com/webhook2',
        events: ['test.event'],
        active: false
      });

      const metrics = webhookManager.getMetrics();
      expect(metrics.totalWebhooks).toBe(2);
      expect(metrics.activeWebhooks).toBe(1);
    });

    it('should test webhook delivery', async () => {
      const webhookId = await webhookManager.registerWebhook({
        url: 'https://httpbin.org/post',
        events: ['test.event'],
        active: true
      });

      const result = await webhookManager.testWebhook(webhookId);
      
      expect(result.webhookId).toBe(webhookId);
      expect(result.eventId).toBeDefined();
      expect(result.attempt).toBe(1);
      expect(result.deliveredAt).toBeDefined();
    });

    it('should handle webhook filters', async () => {
      const eventEmittedPromise = new Promise((resolve) => {
        webhookManager.on('eventEmitted', resolve);
      });

      await webhookManager.registerWebhook({
        url: 'https://example.com/webhook',
        events: ['user.created'],
        active: true,
        filters: [
          {
            field: 'data.type',
            operator: 'eq',
            value: 'premium'
          }
        ]
      });

      // Event that matches filter
      const matchingEvent: WebhookEvent = {
        id: 'test-1',
        type: 'user.created',
        data: { type: 'premium', name: 'John' },
        timestamp: new Date(),
        source: 'test',
        version: '1.0.0'
      };

      await webhookManager.emitEvent(matchingEvent);

      const result = await eventEmittedPromise as any;
      expect(result.webhookCount).toBe(1);

      // Event that doesn't match filter
      const nonMatchingEvent: WebhookEvent = {
        id: 'test-2',
        type: 'user.created',
        data: { type: 'basic', name: 'Jane' },
        timestamp: new Date(),
        source: 'test',
        version: '1.0.0'
      };

      const eventEmittedPromise2 = new Promise((resolve) => {
        webhookManager.on('eventEmitted', resolve);
      });

      await webhookManager.emitEvent(nonMatchingEvent);

      const result2 = await eventEmittedPromise2 as any;
      expect(result2.webhookCount).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate API Gateway with OpenAPI generation', () => {
      const route: Route = {
        path: '/integration-test',
        method: 'POST',
        handler: async (context: RequestContext): Promise<ResponseContext> => ({
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: { id: 1, message: 'created' },
          metadata: {},
          endTime: new Date(),
          duration: 0
        }),
        config: {
          authentication: true,
          authorization: ['admin']
        }
      };

      apiGateway.addRoute(route);
      const routes = [route];
      const spec = openApiGenerator.generateSpec(routes);

      expect(spec.paths['/integration-test']).toBeDefined();
      expect(spec.paths['/integration-test'].post).toBeDefined();
      expect(spec.paths['/integration-test'].post.security).toBeDefined();
    });

    it('should integrate API Gateway with Webhook Manager', async () => {
      const webhookEventPromise = new Promise((resolve) => {
        webhookManager.on('eventEmitted', resolve);
      });

      // Register webhook for API events
      await webhookManager.registerWebhook({
        url: 'https://httpbin.org/post',
        events: ['api.request'],
        active: true
      });

      // Add middleware to emit events
      apiGateway.addMiddleware(async (context, next) => {
        const response = await next();
        
        const event: WebhookEvent = {
          id: `api-${context.id}`,
          type: 'api.request',
          data: {
            method: context.method,
            path: context.path,
            statusCode: response.statusCode,
            duration: response.duration
          },
          timestamp: new Date(),
          source: 'api-gateway',
          version: '1.0.0'
        };

        await webhookManager.emitEvent(event);
        return response;
      });

      // Make API request
      const mockRequest = {
        method: 'GET',
        path: '/health',
        headers: {},
        query: {},
        body: null
      };

      await apiGateway.processRequest(mockRequest);

      // Verify webhook event was emitted
      const result = await webhookEventPromise as any;
      expect(result.event.type).toBe('api.request');
      expect(result.webhookCount).toBe(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const mockRequest = {
        method: 'GET',
        path: '/health',
        headers: {},
        query: {},
        body: null
      };

      const startTime = Date.now();
      const promises = Array(concurrentRequests).fill(null).map(() =>
        apiGateway.processRequest(mockRequest)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.length).toBe(concurrentRequests);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle webhook delivery batching', async () => {
      const webhookId = await webhookManager.registerWebhook({
        url: 'https://httpbin.org/post',
        events: ['batch.test'],
        active: true
      });

      const events: WebhookEvent[] = Array(25).fill(null).map((_, i) => ({
        id: `batch-event-${i}`,
        type: 'batch.test',
        data: { index: i },
        timestamp: new Date(),
        source: 'test',
        version: '1.0.0'
      }));

      const startTime = Date.now();
      
      // Emit all events
      for (const event of events) {
        await webhookManager.emitEvent(event);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete quickly due to batching
    });
  });
});