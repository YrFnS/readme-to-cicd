/**
 * API Gateway Module
 * 
 * Provides RESTful API routing and request/response transformation
 * for the Integration & Deployment system.
 */

export { APIGateway } from './api-gateway';
export { Router } from './router';
export { RequestTransformer } from './request-transformer';
export { ResponseTransformer } from './response-transformer';
export { RouteHandler } from './route-handler';

export type {
  APIGatewayConfig,
  Route,
  RouteConfig,
  RequestContext,
  ResponseContext,
  TransformationRule,
  MiddlewareFunction
} from './types';