/**
 * Response Transformer
 * 
 * Handles response transformation, formatting, and post-processing
 * before sending responses to clients.
 */

import type {
  RequestContext,
  ResponseContext,
  TransformationRule,
  ValidationConfig
} from './types';

export class ResponseTransformer {
  /**
   * Transform a response context based on transformation rules
   */
  async transform(
    response: ResponseContext,
    request: RequestContext,
    rules?: TransformationRule[]
  ): Promise<ResponseContext> {
    let transformedResponse = { ...response };

    if (rules) {
      for (const rule of rules) {
        transformedResponse = await this.applyTransformationRule(transformedResponse, rule);
      }
    }

    // Apply default transformations
    transformedResponse = await this.applyDefaultTransformations(transformedResponse, request);

    return transformedResponse;
  }

  /**
   * Validate response context against validation config
   */
  async validate(response: ResponseContext, validation?: ValidationConfig): Promise<void> {
    if (!validation) {
      return;
    }

    // Validate response headers
    if (validation.response?.headers) {
      await this.validateObject(response.headers, validation.response.headers, 'headers');
    }

    // Validate response body
    if (validation.response?.body) {
      await this.validateObject(response.body, validation.response.body, 'body');
    }
  }

  /**
   * Apply a single transformation rule
   */
  private async applyTransformationRule(
    response: ResponseContext,
    rule: TransformationRule
  ): Promise<ResponseContext> {
    const transformedResponse = { ...response };

    switch (rule.type) {
      case 'map':
        return this.applyMapTransformation(transformedResponse, rule);
      
      case 'filter':
        return this.applyFilterTransformation(transformedResponse, rule);
      
      case 'transform':
        return this.applyCustomTransformation(transformedResponse, rule);
      
      case 'validate':
        await this.applyValidationTransformation(transformedResponse, rule);
        return transformedResponse;
      
      default:
        throw new Error(`Unknown transformation rule type: ${rule.type}`);
    }
  }

  /**
   * Apply default transformations to all responses
   */
  private async applyDefaultTransformations(
    response: ResponseContext,
    request: RequestContext
  ): Promise<ResponseContext> {
    const transformedResponse = { ...response };

    // Set default headers
    transformedResponse.headers = {
      'Content-Type': 'application/json',
      'X-Request-ID': request.id,
      'X-Response-Time': `${response.duration}ms`,
      'X-API-Version': '1.0.0',
      ...transformedResponse.headers
    };

    // Format response body based on content type
    const contentType = transformedResponse.headers['Content-Type'];
    if (contentType?.includes('application/json') && typeof transformedResponse.body !== 'string') {
      transformedResponse.body = JSON.stringify(transformedResponse.body, null, 2);
    }

    // Add response metadata
    transformedResponse.metadata = {
      ...transformedResponse.metadata,
      requestId: request.id,
      timestamp: new Date().toISOString(),
      contentType,
      size: transformedResponse.body ? Buffer.byteLength(transformedResponse.body.toString()) : 0
    };

    // Handle error responses
    if (response.statusCode >= 400) {
      return this.formatErrorResponse(transformedResponse, request);
    }

    return transformedResponse;
  }

  /**
   * Apply map transformation (rename/move fields)
   */
  private applyMapTransformation(
    response: ResponseContext,
    rule: TransformationRule
  ): ResponseContext {
    const transformedResponse = { ...response };
    
    if (rule.source && rule.target) {
      const sourceValue = this.getNestedValue(transformedResponse, rule.source);
      if (sourceValue !== undefined) {
        this.setNestedValue(transformedResponse, rule.target, sourceValue);
        this.deleteNestedValue(transformedResponse, rule.source);
      }
    }

    return transformedResponse;
  }

  /**
   * Apply filter transformation (remove fields)
   */
  private applyFilterTransformation(
    response: ResponseContext,
    rule: TransformationRule
  ): ResponseContext {
    const transformedResponse = { ...response };
    
    if (rule.source) {
      this.deleteNestedValue(transformedResponse, rule.source);
    }

    return transformedResponse;
  }

  /**
   * Apply custom transformation using a function
   */
  private applyCustomTransformation(
    response: ResponseContext,
    rule: TransformationRule
  ): ResponseContext {
    if (!rule.function) {
      throw new Error('Custom transformation requires a function');
    }

    // Implement common response transformations
    switch (rule.function) {
      case 'formatTimestamp':
        if (rule.source) {
          const value = this.getNestedValue(response, rule.source);
          if (value instanceof Date || typeof value === 'string') {
            const formatted = new Date(value).toISOString();
            this.setNestedValue(response, rule.target || rule.source, formatted);
          }
        }
        break;
      
      case 'addPagination':
        if (Array.isArray(response.body)) {
          const page = rule.parameters?.page || 1;
          const limit = rule.parameters?.limit || 10;
          const total = response.body.length;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          
          response.body = {
            data: response.body.slice(startIndex, endIndex),
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasNext: endIndex < total,
              hasPrev: page > 1
            }
          };
        }
        break;
      
      case 'wrapInEnvelope':
        response.body = {
          success: response.statusCode < 400,
          data: response.body,
          timestamp: new Date().toISOString(),
          ...(rule.parameters || {})
        };
        break;
      
      default:
        throw new Error(`Unknown transformation function: ${rule.function}`);
    }

    return response;
  }

  /**
   * Apply validation transformation
   */
  private async applyValidationTransformation(
    response: ResponseContext,
    rule: TransformationRule
  ): Promise<void> {
    if (!rule.parameters) {
      return;
    }

    const value = this.getNestedValue(response, rule.source);
    const validation = rule.parameters;

    // Type validation
    if (validation.type && typeof value !== validation.type) {
      throw new Error(`Response field ${rule.source} must be of type ${validation.type}`);
    }

    // Required validation
    if (validation.required && (value === undefined || value === null)) {
      throw new Error(`Response field ${rule.source} is required`);
    }
  }

  /**
   * Format error responses with consistent structure
   */
  private formatErrorResponse(
    response: ResponseContext,
    request: RequestContext
  ): ResponseContext {
    const transformedResponse = { ...response };

    // Ensure error response has consistent structure
    if (typeof transformedResponse.body !== 'object' || !transformedResponse.body.error) {
      const errorMessage = typeof transformedResponse.body === 'string' 
        ? transformedResponse.body 
        : 'An error occurred';

      transformedResponse.body = {
        error: {
          code: this.getErrorCodeFromStatus(response.statusCode),
          message: errorMessage,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          path: request.path,
          method: request.method
        }
      };
    }

    // Add error-specific headers
    transformedResponse.headers = {
      ...transformedResponse.headers,
      'X-Error-Code': transformedResponse.body.error?.code || 'UNKNOWN_ERROR',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    return transformedResponse;
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

  /**
   * Validate an object against a schema
   */
  private async validateObject(
    obj: any,
    schema: Record<string, any>,
    fieldName: string
  ): Promise<void> {
    for (const [key, rules] of Object.entries(schema)) {
      const value = obj[key];
      
      if (rules.required && (value === undefined || value === null)) {
        throw new Error(`Response ${fieldName}.${key} is required`);
      }
      
      if (value !== undefined && rules.type && typeof value !== rules.type) {
        throw new Error(`Response ${fieldName}.${key} must be of type ${rules.type}`);
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Delete nested value from object using dot notation
   */
  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);
    if (target) {
      delete target[lastKey];
    }
  }
}