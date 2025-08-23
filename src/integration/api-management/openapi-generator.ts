/**
 * OpenAPI Specification Generator
 * 
 * Automatically generates OpenAPI specifications from API routes
 * with support for multiple versions and automatic documentation updates.
 */

import type {
  OpenAPISpec,
  OpenAPIInfo,
  OpenAPIServer,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
  OpenAPISchema,
  OpenAPIComponents,
  APIRoute,
  APIVersion
} from './types';
import type { Route } from '../api-gateway/types';

export class OpenAPIGenerator {
  private baseInfo: OpenAPIInfo;
  private servers: OpenAPIServer[];
  private components: OpenAPIComponents;

  constructor(
    info: OpenAPIInfo,
    servers: OpenAPIServer[] = [],
    components: OpenAPIComponents = {}
  ) {
    this.baseInfo = info;
    this.servers = servers;
    this.components = components;
  }

  /**
   * Generate OpenAPI specification from routes
   */
  generateSpec(routes: Route[], version?: string): OpenAPISpec {
    const spec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        ...this.baseInfo,
        version: version || this.baseInfo.version
      },
      servers: this.servers,
      paths: {},
      components: { ...this.components },
      tags: this.generateTags(routes)
    };

    // Generate paths from routes
    for (const route of routes) {
      this.addRouteToSpec(spec, route);
    }

    // Add security schemes if not present
    if (!spec.components.securitySchemes) {
      spec.components.securitySchemes = this.generateSecuritySchemes();
    }

    return spec;
  }

  /**
   * Generate OpenAPI specification for a specific API version
   */
  generateVersionSpec(apiVersion: APIVersion): OpenAPISpec {
    const spec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        ...this.baseInfo,
        version: apiVersion.version,
        description: `${this.baseInfo.description || ''}\n\nVersion: ${apiVersion.version}\nStatus: ${apiVersion.status}`
      },
      servers: this.servers,
      paths: {},
      components: { ...this.components },
      tags: []
    };

    // Add deprecation notice if applicable
    if (apiVersion.status === 'deprecated' && apiVersion.deprecationDate) {
      spec.info.description += `\n\n**DEPRECATED**: This version is deprecated as of ${apiVersion.deprecationDate.toISOString().split('T')[0]}`;
    }

    if (apiVersion.status === 'sunset' && apiVersion.sunsetDate) {
      spec.info.description += `\n\n**SUNSET**: This version will be removed on ${apiVersion.sunsetDate.toISOString().split('T')[0]}`;
    }

    // Generate paths from API routes
    for (const apiRoute of apiVersion.routes) {
      this.addAPIRouteToSpec(spec, apiRoute);
    }

    return spec;
  }

  /**
   * Generate multiple format specifications
   */
  generateMultipleFormats(routes: Route[], formats: string[]): Record<string, any> {
    const results: Record<string, any> = {};
    const openApiSpec = this.generateSpec(routes);

    for (const format of formats) {
      switch (format) {
        case 'openapi':
          results[format] = openApiSpec;
          break;
        
        case 'swagger':
          results[format] = this.convertToSwagger2(openApiSpec);
          break;
        
        case 'postman':
          results[format] = this.convertToPostman(openApiSpec);
          break;
        
        case 'insomnia':
          results[format] = this.convertToInsomnia(openApiSpec);
          break;
        
        default:
          console.warn(`Unsupported format: ${format}`);
      }
    }

    return results;
  }

  /**
   * Update specification with new routes
   */
  updateSpec(existingSpec: OpenAPISpec, newRoutes: Route[]): OpenAPISpec {
    const updatedSpec = { ...existingSpec };

    for (const route of newRoutes) {
      this.addRouteToSpec(updatedSpec, route);
    }

    // Update tags
    updatedSpec.tags = this.generateTags(newRoutes);

    return updatedSpec;
  }

  /**
   * Add a route to the OpenAPI specification
   */
  private addRouteToSpec(spec: OpenAPISpec, route: Route): void {
    const path = this.normalizePath(route.path);
    const method = route.method.toLowerCase();

    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    const operation: OpenAPIOperation = {
      summary: this.generateSummary(route),
      description: this.generateDescription(route),
      operationId: this.generateOperationId(route),
      parameters: this.generateParameters(route),
      responses: this.generateResponses(route),
      tags: this.generateOperationTags(route)
    };

    // Add request body if applicable
    if (['post', 'put', 'patch'].includes(method)) {
      operation.requestBody = this.generateRequestBody(route);
    }

    // Add security requirements
    if (route.config.authentication) {
      operation.security = this.generateSecurityRequirements(route);
    }

    // Mark as deprecated if configured
    if (route.config.validation?.deprecated) {
      operation.deprecated = true;
    }

    spec.paths[path][method] = operation;
  }

  /**
   * Add an API route to the OpenAPI specification
   */
  private addAPIRouteToSpec(spec: OpenAPISpec, apiRoute: APIRoute): void {
    const path = this.normalizePath(apiRoute.path);
    const method = apiRoute.method.toLowerCase();

    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    const operation: OpenAPIOperation = {
      summary: apiRoute.summary,
      description: apiRoute.description,
      operationId: this.generateOperationIdFromAPIRoute(apiRoute),
      parameters: this.convertAPIParameters(apiRoute.parameters || []),
      responses: this.convertAPIResponses(apiRoute.responses),
      tags: apiRoute.tags || []
    };

    // Add request body if present
    if (apiRoute.requestBody) {
      operation.requestBody = this.convertAPIRequestBody(apiRoute.requestBody);
    }

    // Mark as deprecated if configured
    if (apiRoute.deprecated) {
      operation.deprecated = true;
    }

    spec.paths[path][method] = operation;
  }

  /**
   * Generate operation summary from route
   */
  private generateSummary(route: Route): string {
    const action = this.getActionFromMethod(route.method);
    const resource = this.getResourceFromPath(route.path);
    return `${action} ${resource}`;
  }

  /**
   * Generate operation description from route
   */
  private generateDescription(route: Route): string {
    return `${route.method} ${route.path}`;
  }

  /**
   * Generate operation ID from route
   */
  private generateOperationId(route: Route): string {
    const method = route.method.toLowerCase();
    const pathSegments = route.path.split('/').filter(Boolean);
    const cleanSegments = pathSegments.map(segment => 
      segment.startsWith(':') ? segment.slice(1) : segment
    );
    return `${method}${cleanSegments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
  }

  /**
   * Generate operation ID from API route
   */
  private generateOperationIdFromAPIRoute(apiRoute: APIRoute): string {
    const method = apiRoute.method.toLowerCase();
    const pathSegments = apiRoute.path.split('/').filter(Boolean);
    const cleanSegments = pathSegments.map(segment => 
      segment.startsWith(':') ? segment.slice(1) : segment
    );
    return `${method}${cleanSegments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
  }

  /**
   * Generate parameters from route
   */
  private generateParameters(route: Route): OpenAPIParameter[] {
    const parameters: OpenAPIParameter[] = [];

    // Extract path parameters
    const pathParams = this.extractPathParameters(route.path);
    for (const param of pathParams) {
      parameters.push({
        name: param,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${param} parameter`
      });
    }

    // Add common query parameters
    if (route.method === 'GET') {
      parameters.push(
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          description: 'Number of items to return'
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 0, default: 0 },
          description: 'Number of items to skip'
        }
      );
    }

    return parameters;
  }

  /**
   * Generate request body from route
   */
  private generateRequestBody(route: Route): OpenAPIRequestBody {
    return {
      description: 'Request body',
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: {}
        }
      }
    };
  }

  /**
   * Generate responses from route
   */
  private generateResponses(route: Route): Record<string, OpenAPIResponse> {
    const responses: Record<string, OpenAPIResponse> = {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: { success: true }
          }
        }
      },
      '400': {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: this.getErrorSchema(),
            example: {
              error: {
                code: 'BAD_REQUEST',
                message: 'Invalid request'
              }
            }
          }
        }
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: this.getErrorSchema(),
            example: {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error'
              }
            }
          }
        }
      }
    };

    // Add authentication responses if required
    if (route.config.authentication) {
      responses['401'] = {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: this.getErrorSchema(),
            example: {
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
              }
            }
          }
        }
      };

      responses['403'] = {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: this.getErrorSchema(),
            example: {
              error: {
                code: 'FORBIDDEN',
                message: 'Insufficient permissions'
              }
            }
          }
        }
      };
    }

    return responses;
  }

  /**
   * Generate security requirements from route
   */
  private generateSecurityRequirements(route: Route): any[] {
    return [
      { bearerAuth: [] },
      { apiKey: [] }
    ];
  }

  /**
   * Generate operation tags from route
   */
  private generateOperationTags(route: Route): string[] {
    const resource = this.getResourceFromPath(route.path);
    return [resource];
  }

  /**
   * Generate tags from all routes
   */
  private generateTags(routes: Route[]): any[] {
    const tagSet = new Set<string>();
    
    for (const route of routes) {
      const resource = this.getResourceFromPath(route.path);
      tagSet.add(resource);
    }

    return Array.from(tagSet).map(tag => ({
      name: tag,
      description: `${tag} operations`
    }));
  }

  /**
   * Generate security schemes
   */
  private generateSecuritySchemes(): Record<string, any> {
    return {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      },
      oauth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: '/oauth/authorize',
            tokenUrl: '/oauth/token',
            scopes: {
              read: 'Read access',
              write: 'Write access',
              admin: 'Admin access'
            }
          }
        }
      }
    };
  }

  /**
   * Get error schema
   */
  private getErrorSchema(): OpenAPISchema {
    return {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' }
          },
          required: ['code', 'message']
        }
      },
      required: ['error']
    };
  }

  /**
   * Convert API parameters to OpenAPI parameters
   */
  private convertAPIParameters(parameters: any[]): OpenAPIParameter[] {
    return parameters.map(param => ({
      name: param.name,
      in: param.in,
      required: param.required,
      schema: param.schema,
      description: param.description,
      example: param.example
    }));
  }

  /**
   * Convert API request body to OpenAPI request body
   */
  private convertAPIRequestBody(requestBody: any): OpenAPIRequestBody {
    return {
      description: requestBody.description,
      required: requestBody.required,
      content: requestBody.content
    };
  }

  /**
   * Convert API responses to OpenAPI responses
   */
  private convertAPIResponses(responses: any[]): Record<string, OpenAPIResponse> {
    const result: Record<string, OpenAPIResponse> = {};
    
    for (const response of responses) {
      result[response.statusCode.toString()] = {
        description: response.description,
        content: response.content,
        headers: response.headers
      };
    }
    
    return result;
  }

  /**
   * Utility methods
   */
  private normalizePath(path: string): string {
    return path.replace(/:([^/]+)/g, '{$1}');
  }

  private extractPathParameters(path: string): string[] {
    const matches = path.match(/:([^/]+)/g);
    return matches ? matches.map(match => match.slice(1)) : [];
  }

  private getActionFromMethod(method: string): string {
    const actions: Record<string, string> = {
      'GET': 'Get',
      'POST': 'Create',
      'PUT': 'Update',
      'PATCH': 'Update',
      'DELETE': 'Delete'
    };
    return actions[method] || method;
  }

  private getResourceFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[0] || 'root';
  }

  /**
   * Convert OpenAPI 3.0 to Swagger 2.0 (simplified)
   */
  private convertToSwagger2(spec: OpenAPISpec): any {
    // Simplified conversion - in production, use a proper converter
    return {
      swagger: '2.0',
      info: spec.info,
      host: spec.servers[0]?.url.replace(/^https?:\/\//, '').split('/')[0],
      basePath: '/',
      schemes: ['https', 'http'],
      paths: spec.paths,
      definitions: spec.components.schemas
    };
  }

  /**
   * Convert to Postman collection (simplified)
   */
  private convertToPostman(spec: OpenAPISpec): any {
    return {
      info: {
        name: spec.info.title,
        description: spec.info.description,
        version: spec.info.version
      },
      item: [] // Would contain converted requests
    };
  }

  /**
   * Convert to Insomnia collection (simplified)
   */
  private convertToInsomnia(spec: OpenAPISpec): any {
    return {
      _type: 'export',
      __export_format: 4,
      resources: [] // Would contain converted requests
    };
  }
}