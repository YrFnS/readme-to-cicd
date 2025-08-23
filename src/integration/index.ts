/**
 * Integration & Deployment Layer
 * 
 * This module provides comprehensive integration capabilities for the README-to-CICD system,
 * including API management, webhook support, and deployment orchestration.
 */

// Core Integration Pipeline
export { ComponentOrchestrator } from '../cli/lib/component-orchestrator';
export { IntegrationPipeline, createIntegrationPipeline } from './integration-pipeline';

// API Gateway and Management
export { APIGateway } from './api-gateway/api-gateway';
export { Router } from './api-gateway/router';
export { RequestTransformer } from './api-gateway/request-transformer';
export { ResponseTransformer } from './api-gateway/response-transformer';
export { RateLimiter } from './api-gateway/rate-limiter';
export { AuthenticationManager } from './api-gateway/authentication-manager';
export { AuthorizationManager } from './api-gateway/authorization-manager';
export { RouteHandler, FunctionRouteHandler } from './api-gateway/route-handler';

// API Management
export { APIManager } from './api-management/api-manager';
export { OpenAPIGenerator } from './api-management/openapi-generator';
export { VersionManager } from './api-management/version-manager';
export { APIAnalytics } from './api-management/api-analytics';
export { DocumentationGenerator } from './api-management/documentation-generator';

// Webhook System
export { WebhookManager } from './webhooks/webhook-manager';
export { WebhookDelivery } from './webhooks/webhook-delivery';
export { RetryManager } from './webhooks/retry-manager';

// Type Exports
export type { ExecutionContext, OrchestrationOptions } from '../cli/lib/component-orchestrator';
export type { CLIOptions, CLIResult, CLIError, ExecutionSummary } from '../cli/lib/types';
export type { ParseResult } from '../parser';
export type { DetectionResult } from '../detection';
export type { WorkflowOutput } from '../generator';

// API Gateway Types
export type {
  APIGatewayConfig,
  Route,
  RouteConfig,
  RequestContext,
  ResponseContext,
  TransformationRule,
  MiddlewareFunction,
  User,
  APIResponse,
  APIError
} from './api-gateway/types';

// API Management Types
export type {
  APIManagerConfig,
  OpenAPISpec,
  APIVersion,
  VersionConfig,
  AnalyticsConfig,
  DocumentationConfig,
  APIMetrics,
  EndpointMetrics
} from './api-management/types';

// Webhook Types
export type {
  WebhookConfig,
  Webhook,
  WebhookEvent,
  WebhookDeliveryResult,
  RetryConfig,
  EventFilter,
  WebhookMetrics
} from './webhooks/types';

