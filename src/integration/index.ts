/**
 * Integration & Deployment Service Entry Point
 * Main orchestration service for the readme-to-cicd system
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { register as promRegister } from 'prom-client';

// Import core components
import { OrchestrationEngine } from './orchestration/orchestration-engine';
import { ComponentManager } from './components/component-manager';
// import { DeploymentManager } from './deployment/deployment-manager.js';
// import { ConfigurationManager } from './configuration/configuration-manager.js';
// import { MonitoringSystem } from './monitoring/monitoring-system.js';

const app = express();
const PORT = process.env.PORT || 8080;
const METRICS_PORT = process.env.METRICS_PORT || 9091;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'integration-deployment',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  // TODO: Add actual readiness checks for dependencies
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    dependencies: {
      redis: 'connected',
      postgres: 'connected',
      vault: 'connected'
    }
  });
});

// API routes (to be implemented)
app.use('/api/v1/orchestration', (req, res) => {
  res.status(501).json({ message: 'Orchestration API not yet implemented' });
});

app.use('/api/v1/components', (req, res) => {
  res.status(501).json({ message: 'Component Management API not yet implemented' });
});

app.use('/api/v1/deployments', (req, res) => {
  res.status(501).json({ message: 'Deployment API not yet implemented' });
});

app.use('/api/v1/configuration', (req, res) => {
  res.status(501).json({ message: 'Configuration API not yet implemented' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Metrics server for Prometheus
const metricsApp = express();
metricsApp.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promRegister.contentType);
    res.end(await promRegister.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Start servers
const server = createServer(app);
const metricsServer = createServer(metricsApp);

server.listen(PORT, () => {
  console.log(`Integration & Deployment Service listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

metricsServer.listen(METRICS_PORT, () => {
  console.log(`Metrics server listening on port ${METRICS_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    metricsServer.close(() => {
      console.log('Metrics server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    metricsServer.close(() => {
      console.log('Metrics server closed');
      process.exit(0);
    });
  });
});

export { app, server, metricsServer };