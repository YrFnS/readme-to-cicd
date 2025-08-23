/**
 * Request Transformer
 * 
 * Handles request transformation, validation, and preprocessing
 * before routing to handlers.
 */

import type {
  RequestContext,
  TransformationRule,
  ValidationConfig
} from './types';

export class RequestTransformer {
  /**
   * Transform a request context based on transformation rules
   */
  async transform(context: RequestContext, rules?: TransformationRule[]): Promise<RequestContext> {
    let transformedContext = { ...context };

    if (rules) {
      for (const rule of rules) {
        transformedContext = await this.applyTransformationRule(transformedContext, rule);
      }
    }

    // Apply default transformations
    transformedContext = await this.applyDefaultTransformations(transformedContext);

    return transformedContext;
  }

  /**
   * Validate request context against validation config
   */
  async validate(context: RequestContext, validation?: ValidationConfig): Promise<void> {
    if (!validation) {
      return;
    }

    // Validate headers
    if (validation.request?.headers) {
      await this.validateObject(context.headers, validation.request.headers, 'headers');
    }

    // Validate query parameters
    if (validation.request?.query) {
      await this.validateObject(context.query, validation.request.query, 'query');
    }

    // Validate request body
    if (validation.request?.body) {
      await this.validateObject(context.body, validation.request.body, 'body');
    }
  }

  /**
   * Apply a single transformation rule
   */
  private async applyTransformationRule(
    context: RequestContext,
    rule: TransformationRule
  ): Promise<RequestContext> {
    const transformedContext = { ...context };

    switch (rule.type) {
      case 'map':
        return this.applyMapTransformation(transformedContext, rule);
      
      case 'filter':
        return this.applyFilterTransformation(transformedContext, rule);
      
      case 'transform':
        return this.applyCustomTransformation(transformedContext, rule);
      
      case 'validate':
        await this.applyValidationTransformation(transformedContext, rule);
        return transformedContext;
      
      default:
        throw new Error(`Unknown transformation rule type: ${rule.type}`);
    }
  }

  /**
   * Apply default transformations to all requests
   */
  private async applyDefaultTransformations(context: RequestContext): Promise<RequestContext> {
    const transformedContext = { ...context };

    // Normalize headers to lowercase
    const normalizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(context.headers)) {
      normalizedHeaders[key.toLowerCase()] = value;
    }
    transformedContext.headers = normalizedHeaders;

    // Parse JSON body if content-type is application/json
    const contentType = transformedContext.headers['content-type'];
    if (contentType?.includes('application/json') && typeof transformedContext.body === 'string') {
      try {
        transformedContext.body = JSON.parse(transformedContext.body);
      } catch (error) {
        throw {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          statusCode: 400,
          details: { error: error.message }
        };
      }
    }

    // Add request metadata
    transformedContext.metadata = {
      ...transformedContext.metadata,
      contentType,
      contentLength: transformedContext.headers['content-length'],
      userAgent: transformedContext.headers['user-agent'],
      remoteAddress: transformedContext.headers['x-forwarded-for'] || transformedContext.headers['x-real-ip']
    };

    return transformedContext;
  }

  /**
   * Apply map transformation (rename/move fields)
   */
  private applyMapTransformation(
    context: RequestContext,
    rule: TransformationRule
  ): RequestContext {
    const transformedContext = { ...context };
    
    if (rule.source && rule.target) {
      const sourceValue = this.getNestedValue(transformedContext, rule.source);
      if (sourceValue !== undefined) {
        this.setNestedValue(transformedContext, rule.target, sourceValue);
        this.deleteNestedValue(transformedContext, rule.source);
      }
    }

    return transformedContext;
  }

  /**
   * Apply filter transformation (remove fields)
   */
  private applyFilterTransformation(
    context: RequestContext,
    rule: TransformationRule
  ): RequestContext {
    const transformedContext = { ...context };
    
    if (rule.source) {
      this.deleteNestedValue(transformedContext, rule.source);
    }

    return transformedContext;
  }

  /**
   * Apply custom transformation using a function
   */
  private applyCustomTransformation(
    context: RequestContext,
    rule: TransformationRule
  ): RequestContext {
    if (!rule.function) {
      throw new Error('Custom transformation requires a function');
    }

    // This would typically load and execute a custom transformation function
    // For now, we'll implement some common transformations
    switch (rule.function) {
      case 'toLowerCase':
        if (rule.source) {
          const value = this.getNestedValue(context, rule.source);
          if (typeof value === 'string') {
            this.setNestedValue(context, rule.target || rule.source, value.toLowerCase());
          }
        }
        break;
      
      case 'toUpperCase':
        if (rule.source) {
          const value = this.getNestedValue(context, rule.source);
          if (typeof value === 'string') {
            this.setNestedValue(context, rule.target || rule.source, value.toUpperCase());
          }
        }
        break;
      
      case 'trim':
        if (rule.source) {
          const value = this.getNestedValue(context, rule.source);
          if (typeof value === 'string') {
            this.setNestedValue(context, rule.target || rule.source, value.trim());
          }
        }
        break;
      
      default:
        throw new Error(`Unknown transformation function: ${rule.function}`);
    }

    return context;
  }

  /**
   * Apply validation transformation
   */
  private async applyValidationTransformation(
    context: RequestContext,
    rule: TransformationRule
  ): Promise<void> {
    if (!rule.parameters) {
      return;
    }

    const value = this.getNestedValue(context, rule.source);
    const validation = rule.parameters;

    // Type validation
    if (validation.type && typeof value !== validation.type) {
      throw {
        code: 'VALIDATION_ERROR',
        message: `Field ${rule.source} must be of type ${validation.type}`,
        statusCode: 400
      };
    }

    // Required validation
    if (validation.required && (value === undefined || value === null)) {
      throw {
        code: 'VALIDATION_ERROR',
        message: `Field ${rule.source} is required`,
        statusCode: 400
      };
    }

    // String length validation
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        throw {
          code: 'VALIDATION_ERROR',
          message: `Field ${rule.source} must be at least ${validation.minLength} characters`,
          statusCode: 400
        };
      }
      
      if (validation.maxLength && value.length > validation.maxLength) {
        throw {
          code: 'VALIDATION_ERROR',
          message: `Field ${rule.source} must be at most ${validation.maxLength} characters`,
          statusCode: 400
        };
      }
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw {
          code: 'VALIDATION_ERROR',
          message: `Field ${rule.source} does not match required pattern`,
          statusCode: 400
        };
      }
    }
  }

  /**
   * Validate an object against a schema
   */
  private async validateObject(
    obj: any,
    schema: Record<string, any>,
    fieldName: string
  ): Promise<void> {
    // This is a simplified validation - in production, you'd use a library like Joi or AJV
    for (const [key, rules] of Object.entries(schema)) {
      const value = obj[key];
      
      if (rules.required && (value === undefined || value === null)) {
        throw {
          code: 'VALIDATION_ERROR',
          message: `${fieldName}.${key} is required`,
          statusCode: 400
        };
      }
      
      if (value !== undefined && rules.type && typeof value !== rules.type) {
        throw {
          code: 'VALIDATION_ERROR',
          message: `${fieldName}.${key} must be of type ${rules.type}`,
          statusCode: 400
        };
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