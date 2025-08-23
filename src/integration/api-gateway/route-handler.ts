/**
 * Route Handler
 * 
 * Base route handler implementation with common functionality
 * for handling API requests and responses.
 */

import type { RequestContext, ResponseContext } from './types';

export abstract class RouteHandler {
  /**
   * Handle the request and return a response
   */
  abstract handle(context: RequestContext): Promise<ResponseContext>;

  /**
   * Create a successful response
   */
  protected success(data: any, statusCode: number = 200): ResponseContext {
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: data,
      metadata: {},
      endTime: new Date(),
      duration: 0
    };
  }

  /**
   * Create an error response
   */
  protected error(message: string, statusCode: number = 500, code?: string): ResponseContext {
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: {
          code: code || this.getErrorCodeFromStatus(statusCode),
          message
        }
      },
      metadata: { error: true },
      endTime: new Date(),
      duration: 0
    };
  }

  /**
   * Create a validation error response
   */
  protected validationError(errors: any[]): ResponseContext {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      },
      metadata: { error: true },
      endTime: new Date(),
      duration: 0
    };
  }

  /**
   * Create a not found response
   */
  protected notFound(resource?: string): ResponseContext {
    const message = resource ? `${resource} not found` : 'Resource not found';
    return this.error(message, 404, 'NOT_FOUND');
  }

  /**
   * Create an unauthorized response
   */
  protected unauthorized(message: string = 'Unauthorized'): ResponseContext {
    return this.error(message, 401, 'UNAUTHORIZED');
  }

  /**
   * Create a forbidden response
   */
  protected forbidden(message: string = 'Forbidden'): ResponseContext {
    return this.error(message, 403, 'FORBIDDEN');
  }

  /**
   * Get error code from HTTP status code
   */
  private getErrorCodeFromStatus(statusCode: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };

    return errorCodes[statusCode] || 'UNKNOWN_ERROR';
  }
}

/**
 * Simple function-based route handler
 */
export class FunctionRouteHandler extends RouteHandler {
  constructor(private handlerFunction: (context: RequestContext) => Promise<ResponseContext>) {
    super();
  }

  async handle(context: RequestContext): Promise<ResponseContext> {
    return this.handlerFunction(context);
  }
}