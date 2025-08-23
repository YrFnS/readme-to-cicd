/**
 * API Gateway Implementation
 * 
 * Main API Gateway class that provides RESTful API routing,
 * request/response transformation, and middleware support.
 */

import { EventEmitter } from 'events';
import { Router } from './router';
import { RequestTransformer } from './request-transformer';
import { ResponseTransformer } from './response-transformer';
import { RateLimiter } from './rate-limiter';
import { AuthenticationManager } from './authentication-manager';
import { AuthorizationManager } from './authorization-manager';
import type {
  APIGatewayConfig,
  Route,
  RequestContext,
  ResponseContext,
  MiddlewareFunction,
  APIResponse,
  APIError
} from './types';

export class APIGateway extends EventEmitter {
  private router: Router;
  private requestTransformer: RequestTransformer;
  private responseTransformer: ResponseTransformer;
  private rateLimiter: RateLimiter;
  private authManager: AuthenticationManager;
  private authzManager: AuthorizationManager;
  private config: APIGatewayConfig;
  private server: any;
  private isRunning: boolean = false;

  constructor(config: APIGatewayConfig) {
    super();
    this.config = config;
    this.router = new Router();
    this.requestTransformer = new RequestTransformer();
    this.responseTransformer = new ResponseTransformer();
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.authManager = new AuthenticationManager(config.security.authentication);
    this.authzManager = new AuthorizationManager(config.security.authorization);
    
    // Setup default routes immediately
    this.setupRoutes();
  }

  /**
   * Start the API Gateway server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('API Gateway is already running');
    }

    try {
      // Initialize server (using Express.js-like interface)
      this.server = await this.createServer();
      
      // Setup middleware pipeline
      this.setupMiddleware();
      
      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.config.port, this.config.host, (err: any) => {
          if (err) {
            reject(err);
          } else {
            this.isRunning = true;
            this.emit('started', { port: this.config.port, host: this.config.host });
            resolve();
          }
        });
      });

      console.log(`API Gateway started on ${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the API Gateway server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.server.close((err: any) => {
          if (err) {
            reject(err);
          } else {
            this.isRunning = false;
            this.emit('stopped');
            resolve();
          }
        });
      });

      console.log('API Gateway stopped');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Add a route to the API Gateway
   */
  addRoute(route: Route): void {
    this.router.addRoute(route);
  }

  /**
   * Add middleware to the API Gateway
   */
  addMiddleware(middleware: MiddlewareFunction): void {
    this.router.addMiddleware(middleware);
  }

  /**
   * Process an incoming request
   */
  async processRequest(rawRequest: any): Promise<APIResponse> {
    const requestId = this.generateRequestId();
    const startTime = new Date();

    try {
      // Create request context
      const context: RequestContext = {
        id: requestId,
        method: rawRequest.method,
        path: rawRequest.path,
        headers: rawRequest.headers || {},
        query: rawRequest.query || {},
        body: rawRequest.body,
        metadata: {},
        startTime
      };

      // Apply request transformation
      const transformedContext = await this.requestTransformer.transform(context);

      // Apply rate limiting
      await this.rateLimiter.checkLimit(transformedContext);

      // Find the route to check authentication requirements
      const route = this.router.findRoute(transformedContext.method, transformedContext.path);
      
      // Apply authentication only if required by route
      if (this.config.security.authentication.enabled && route?.config.authentication !== false) {
        transformedContext.user = await this.authManager.authenticate(transformedContext);
      }

      // Apply authorization only if required by route
      if (this.config.security.authorization.enabled && transformedContext.user && route?.config.authorization) {
        await this.authzManager.authorize(transformedContext);
      }

      // Route the request
      const response = await this.router.route(transformedContext);

      // Apply response transformation
      const transformedResponse = await this.responseTransformer.transform(response, transformedContext);

      // Create API response
      const apiResponse: APIResponse = {
        success: true,
        data: transformedResponse.body,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          duration: Date.now() - startTime.getTime()
        }
      };

      this.emit('request', { context: transformedContext, response: transformedResponse });
      return apiResponse;

    } catch (error) {
      const apiError: APIError = {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
        details: error.details,
        statusCode: error.statusCode || 500
      };

      const errorResponse: APIResponse = {
        success: false,
        error: apiError,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          duration: Date.now() - startTime.getTime()
        }
      };

      this.emit('error', { context: { id: requestId }, error });
      return errorResponse;
    }
  }

  /**
   * Get API Gateway status
   */
  getStatus(): {
    running: boolean;
    uptime: number;
    config: APIGatewayConfig;
    stats: any;
  } {
    return {
      running: this.isRunning,
      uptime: this.isRunning ? Date.now() - (this.server?.startTime || 0) : 0,
      config: this.config,
      stats: {
        routes: this.router.getRouteCount(),
        middleware: this.router.getMiddlewareCount()
      }
    };
  }

  /**
   * Create the underlying server
   */
  private async createServer(): Promise<any> {
    // This would typically use Express.js or similar framework
    // For now, we'll create a mock server interface
    return {
      listen: (port: number, host: string, callback: (err?: any) => void) => {
        // Mock server implementation
        setTimeout(() => callback(), 100);
      },
      close: (callback: (err?: any) => void) => {
        setTimeout(() => callback(), 100);
      },
      startTime: Date.now()
    };
  }

  /**
   * Setup middleware pipeline
   */
  private setupMiddleware(): void {
    // CORS middleware
    if (this.config.cors.enabled) {
      this.addMiddleware(this.createCORSMiddleware());
    }

    // Security headers middleware
    this.addMiddleware(this.createSecurityHeadersMiddleware());

    // Request logging middleware
    this.addMiddleware(this.createLoggingMiddleware());

    // Error handling middleware
    this.addMiddleware(this.createErrorHandlingMiddleware());
  }

  /**
   * Setup default routes
   */
  private setupRoutes(): void {
    // Health check route
    this.addRoute({
      path: '/health',
      method: 'GET',
      handler: async (context: RequestContext): Promise<ResponseContext> => ({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { status: 'healthy', timestamp: new Date().toISOString() },
        metadata: {},
        endTime: new Date(),
        duration: 0
      }),
      config: {
        authentication: false,
        rateLimit: { ...this.config.rateLimit, maxRequests: 1000 }
      }
    });

    // API info route
    this.addRoute({
      path: '/api/info',
      method: 'GET',
      handler: async (context: RequestContext): Promise<ResponseContext> => ({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          name: 'README-to-CICD API Gateway',
          version: '1.0.0',
          description: 'API Gateway for Integration & Deployment system'
        },
        metadata: {},
        endTime: new Date(),
        duration: 0
      }),
      config: {
        authentication: false
      }
    });
  }

  /**
   * Create CORS middleware
   */
  private createCORSMiddleware(): MiddlewareFunction {
    return async (context: RequestContext, next: () => Promise<ResponseContext>): Promise<ResponseContext> => {
      const response = await next();
      
      if (this.config.cors.enabled) {
        response.headers['Access-Control-Allow-Origin'] = this.config.cors.origins.join(',');
        response.headers['Access-Control-Allow-Methods'] = this.config.cors.methods.join(',');
        response.headers['Access-Control-Allow-Headers'] = this.config.cors.headers.join(',');
        
        if (this.config.cors.credentials) {
          response.headers['Access-Control-Allow-Credentials'] = 'true';
        }
      }
      
      return response;
    };
  }

  /**
   * Create security headers middleware
   */
  private createSecurityHeadersMiddleware(): MiddlewareFunction {
    return async (context: RequestContext, next: () => Promise<ResponseContext>): Promise<ResponseContext> => {
      const response = await next();
      
      response.headers['X-Content-Type-Options'] = 'nosniff';
      response.headers['X-Frame-Options'] = 'DENY';
      response.headers['X-XSS-Protection'] = '1; mode=block';
      response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
      
      return response;
    };
  }

  /**
   * Create logging middleware
   */
  private createLoggingMiddleware(): MiddlewareFunction {
    return async (context: RequestContext, next: () => Promise<ResponseContext>): Promise<ResponseContext> => {
      const startTime = Date.now();
      const response = await next();
      const duration = Date.now() - startTime;
      
      console.log(`${context.method} ${context.path} - ${response.statusCode} - ${duration}ms`);
      
      return response;
    };
  }

  /**
   * Create error handling middleware
   */
  private createErrorHandlingMiddleware(): MiddlewareFunction {
    return async (context: RequestContext, next: () => Promise<ResponseContext>): Promise<ResponseContext> => {
      try {
        return await next();
      } catch (error) {
        console.error('API Gateway error:', error);
        
        return {
          statusCode: error.statusCode || 500,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: {
              code: error.code || 'INTERNAL_ERROR',
              message: error.message || 'Internal server error'
            }
          },
          metadata: { error: true },
          endTime: new Date(),
          duration: Date.now() - context.startTime.getTime()
        };
      }
    };
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}