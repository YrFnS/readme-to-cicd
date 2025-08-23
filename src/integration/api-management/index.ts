/**
 * API Management Module
 * 
 * Provides comprehensive API management features including
 * OpenAPI specification generation, API versioning, and analytics.
 */

export { APIManager } from './api-manager';
export { OpenAPIGenerator } from './openapi-generator';
export { VersionManager } from './version-manager';
export { APIAnalytics } from './api-analytics';
export { DocumentationGenerator } from './documentation-generator';

export type {
  APIManagerConfig,
  OpenAPISpec,
  APIVersion,
  VersionConfig,
  AnalyticsConfig,
  DocumentationConfig,
  APIMetrics,
  EndpointMetrics
} from './types';