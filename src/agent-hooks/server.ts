// Agent Hooks Microservice Server
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';
import { WebhookHandler } from './webhook/webhook-handler';
import { AnalysisQueue } from './queue/analysis-queue';
import { ErrorHandler } from './errors/error-handler';

export class AgentHooksServer {
  private app: express.Application;
  private webhookHandler?: WebhookHandler;
  private analysisQueue?: AnalysisQueue;
  private errorHandler: ErrorHandler;

  constructor() {
    this.app = express();
    this.errorHandler = new ErrorHandler();
    this.initializeComponents();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeComponents() {
    try {
      // Initialize webhook handler with basic config
      const webhookConfig = {
        webhookSecret: process.env.WEBHOOK_SECRET || 'default-secret',
        trustedIPs: process.env.TRUSTED_IPS?.split(',') || [],
        maxBodySize: 1024 * 1024, // 1MB
        signatureTolerance: 300000 // 5 minutes
      };
      this.webhookHandler = new WebhookHandler(webhookConfig);

      // Initialize analysis queue
      this.analysisQueue = new AnalysisQueue();

      console.log('Agent Hooks components initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Agent Hooks components:', error);
      throw error;
    }
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      xFrameOptions: { action: 'deny' }, // Fix: Set to DENY instead of SAMEORIGIN
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration - Fix: Ensure CORS headers are properly set
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Signature-256', 'X-GitHub-Delivery'],
      exposedHeaders: ['Access-Control-Allow-Origin'],
      optionsSuccessStatus: 200 // Fix: Return 200 for preflight instead of 204
    }));

    // Body parsing middleware
    this.app.use(json({ limit: '10mb' }));
    this.app.use(urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
      next();
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Webhook endpoints
    this.app.post('/webhooks/github', async (req: Request, res: Response) => {
      try {
        if (!this.webhookHandler) {
          return res.status(500).json({ error: 'Webhook handler not initialized' });
        }

        // Extract raw body for signature verification
        const rawBody = Buffer.from(JSON.stringify(req.body));

        const result = await this.webhookHandler.handleWebhook(
          req.headers as Record<string, string | string[]>,
          JSON.stringify(req.body),
          rawBody,
          req.ip
        );

        if (result.isValid) {
          res.json({
            status: 'success',
            message: 'Webhook processed successfully',
            eventType: result.eventType,
            repository: result.repository
          });
        } else {
          res.status(400).json({
            status: 'error',
            message: result.error || 'Invalid webhook'
          });
        }
      } catch (error) {
        console.error('Webhook handling error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    });

    // API routes for configuration
    this.app.get('/api/config', (req: Request, res: Response) => {
      res.json({
        config: {
          webhookSecret: process.env.WEBHOOK_SECRET ? '[CONFIGURED]' : '[NOT SET]',
          environment: process.env.NODE_ENV || 'development',
          port: process.env.PORT || 3000
        }
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      });
    });
  }

  private setupErrorHandling() {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  public async start(port: number = 3000): Promise<void> {
    try {
      // Basic configuration validation
      if (!process.env.WEBHOOK_SECRET) {
        console.warn('Warning: WEBHOOK_SECRET environment variable not set');
      }

      this.app.listen(port, () => {
        console.log(`Agent Hooks server started on port ${port}`, {
          port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      console.error('Failed to start Agent Hooks server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      console.log('Agent Hooks server stopped successfully');
    } catch (error) {
      console.error('Error stopping Agent Hooks server:', error);
      throw error;
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Export for use in other modules
export default AgentHooksServer;