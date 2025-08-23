/**
 * Documentation Generator
 * 
 * Generates comprehensive API documentation from OpenAPI specifications
 * with automatic updates and multiple output formats.
 */

import { EventEmitter } from 'events';
import type { DocumentationConfig, OpenAPISpec } from './types';

export class DocumentationGenerator extends EventEmitter {
  private config: DocumentationConfig;

  constructor(config: DocumentationConfig) {
    super();
    this.config = config;
  }

  /**
   * Generate documentation from OpenAPI specification
   */
  async generateDocumentation(spec: OpenAPISpec): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    for (const format of this.config.formats) {
      await this.generateFormat(spec, format);
    }

    this.emit('documentationGenerated', { 
      version: spec.info.version,
      formats: this.config.formats 
    });
  }

  /**
   * Generate version-specific documentation
   */
  async generateVersionDocumentation(spec: OpenAPISpec, version: string): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    for (const format of this.config.formats) {
      await this.generateVersionFormat(spec, version, format);
    }

    this.emit('versionDocumentationGenerated', { version, formats: this.config.formats });
  }

  /**
   * Generate documentation in a specific format
   */
  private async generateFormat(spec: OpenAPISpec, format: string): Promise<void> {
    switch (format) {
      case 'openapi':
        await this.generateOpenAPIDoc(spec);
        break;
      
      case 'swagger':
        await this.generateSwaggerDoc(spec);
        break;
      
      case 'postman':
        await this.generatePostmanCollection(spec);
        break;
      
      case 'insomnia':
        await this.generateInsomniaCollection(spec);
        break;
      
      default:
        console.warn(`Unsupported documentation format: ${format}`);
    }
  }

  /**
   * Generate version-specific documentation format
   */
  private async generateVersionFormat(spec: OpenAPISpec, version: string, format: string): Promise<void> {
    const versionedSpec = {
      ...spec,
      info: {
        ...spec.info,
        version
      }
    };

    await this.generateFormat(versionedSpec, format);
  }

  /**
   * Generate OpenAPI documentation
   */
  private async generateOpenAPIDoc(spec: OpenAPISpec): Promise<void> {
    const content = this.generateOpenAPIContent(spec);
    await this.writeDocumentation('openapi.json', content);
  }

  /**
   * Generate Swagger documentation
   */
  private async generateSwaggerDoc(spec: OpenAPISpec): Promise<void> {
    const swaggerSpec = this.convertToSwagger2(spec);
    const content = JSON.stringify(swaggerSpec, null, 2);
    await this.writeDocumentation('swagger.json', content);
  }

  /**
   * Generate Postman collection
   */
  private async generatePostmanCollection(spec: OpenAPISpec): Promise<void> {
    const collection = this.convertToPostmanCollection(spec);
    const content = JSON.stringify(collection, null, 2);
    await this.writeDocumentation('postman-collection.json', content);
  }

  /**
   * Generate Insomnia collection
   */
  private async generateInsomniaCollection(spec: OpenAPISpec): Promise<void> {
    const collection = this.convertToInsomniaCollection(spec);
    const content = JSON.stringify(collection, null, 2);
    await this.writeDocumentation('insomnia-collection.json', content);
  }

  /**
   * Generate OpenAPI content with examples and schemas
   */
  private generateOpenAPIContent(spec: OpenAPISpec): string {
    const enhancedSpec = { ...spec };

    if (this.config.includeExamples) {
      enhancedSpec.paths = this.addExamplesToPaths(spec.paths);
    }

    if (this.config.includeSchemas) {
      enhancedSpec.components = this.enhanceSchemas(spec.components || {});
    }

    return JSON.stringify(enhancedSpec, null, 2);
  }

  /**
   * Add examples to API paths
   */
  private addExamplesToPaths(paths: Record<string, any>): Record<string, any> {
    const enhancedPaths = { ...paths };

    for (const [path, methods] of Object.entries(enhancedPaths)) {
      for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
        if (operation.responses) {
          for (const [statusCode, response] of Object.entries(operation.responses)) {
            if (response.content) {
              for (const [mediaType, mediaTypeObj] of Object.entries(response.content)) {
                if (!mediaTypeObj.example && !mediaTypeObj.examples) {
                  mediaTypeObj.example = this.generateExampleForSchema(mediaTypeObj.schema);
                }
              }
            }
          }
        }

        if (operation.requestBody?.content) {
          for (const [mediaType, mediaTypeObj] of Object.entries(operation.requestBody.content)) {
            if (!mediaTypeObj.example && !mediaTypeObj.examples) {
              mediaTypeObj.example = this.generateExampleForSchema(mediaTypeObj.schema);
            }
          }
        }
      }
    }

    return enhancedPaths;
  }

  /**
   * Enhance schemas with additional information
   */
  private enhanceSchemas(components: any): any {
    const enhanced = { ...components };

    if (enhanced.schemas) {
      for (const [schemaName, schema] of Object.entries(enhanced.schemas)) {
        if (!schema.example) {
          schema.example = this.generateExampleForSchema(schema);
        }
      }
    }

    return enhanced;
  }

  /**
   * Generate example data for a schema
   */
  private generateExampleForSchema(schema: any): any {
    if (!schema) {
      return null;
    }

    if (schema.example) {
      return schema.example;
    }

    switch (schema.type) {
      case 'string':
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'date') return '2023-01-01';
        if (schema.format === 'date-time') return '2023-01-01T00:00:00Z';
        if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        return schema.enum ? schema.enum[0] : 'string';
      
      case 'number':
      case 'integer':
        return schema.enum ? schema.enum[0] : 42;
      
      case 'boolean':
        return true;
      
      case 'array':
        const itemExample = this.generateExampleForSchema(schema.items);
        return [itemExample];
      
      case 'object':
        if (schema.properties) {
          const example: any = {};
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            example[propName] = this.generateExampleForSchema(propSchema);
          }
          return example;
        }
        return {};
      
      default:
        return null;
    }
  }

  /**
   * Convert OpenAPI 3.0 to Swagger 2.0
   */
  private convertToSwagger2(spec: OpenAPISpec): any {
    return {
      swagger: '2.0',
      info: spec.info,
      host: spec.servers?.[0]?.url?.replace(/^https?:\/\//, '')?.split('/')[0] || 'localhost',
      basePath: '/',
      schemes: ['https', 'http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      paths: this.convertPathsToSwagger2(spec.paths),
      definitions: spec.components?.schemas || {},
      securityDefinitions: this.convertSecurityToSwagger2(spec.components?.securitySchemes || {})
    };
  }

  /**
   * Convert paths to Swagger 2.0 format
   */
  private convertPathsToSwagger2(paths: Record<string, any>): Record<string, any> {
    const swagger2Paths: Record<string, any> = {};

    for (const [path, methods] of Object.entries(paths)) {
      swagger2Paths[path] = {};
      
      for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
        swagger2Paths[path][method] = {
          ...operation,
          produces: ['application/json'],
          consumes: ['application/json']
        };
      }
    }

    return swagger2Paths;
  }

  /**
   * Convert security schemes to Swagger 2.0 format
   */
  private convertSecurityToSwagger2(securitySchemes: Record<string, any>): Record<string, any> {
    const swagger2Security: Record<string, any> = {};

    for (const [name, scheme] of Object.entries(securitySchemes)) {
      if (scheme.type === 'http' && scheme.scheme === 'bearer') {
        swagger2Security[name] = {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        };
      } else if (scheme.type === 'apiKey') {
        swagger2Security[name] = scheme;
      }
    }

    return swagger2Security;
  }

  /**
   * Convert to Postman collection format
   */
  private convertToPostmanCollection(spec: OpenAPISpec): any {
    const collection = {
      info: {
        name: spec.info.title,
        description: spec.info.description,
        version: spec.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [] as any[]
    };

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
        const item = {
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            url: {
              raw: `{{baseUrl}}${path}`,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter(Boolean)
            }
          },
          response: []
        };

        collection.item.push(item);
      }
    }

    return collection;
  }

  /**
   * Convert to Insomnia collection format
   */
  private convertToInsomniaCollection(spec: OpenAPISpec): any {
    return {
      _type: 'export',
      __export_format: 4,
      __export_date: new Date().toISOString(),
      __export_source: 'readme-to-cicd',
      resources: [
        {
          _id: 'wrk_1',
          _type: 'workspace',
          name: spec.info.title,
          description: spec.info.description
        }
      ]
    };
  }

  /**
   * Write documentation to file
   */
  private async writeDocumentation(filename: string, content: string): Promise<void> {
    // Mock file writing - in production, this would write to the actual file system
    console.log(`Writing documentation to ${this.config.outputPath}/${filename}`);
    console.log(`Content length: ${content.length} characters`);
    
    // Simulate async file operation
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DocumentationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get documentation status
   */
  getStatus(): {
    enabled: boolean;
    formats: string[];
    outputPath: string;
    autoGenerate: boolean;
    includeExamples: boolean;
    includeSchemas: boolean;
  } {
    return {
      enabled: this.config.enabled,
      formats: this.config.formats,
      outputPath: this.config.outputPath,
      autoGenerate: this.config.autoGenerate,
      includeExamples: this.config.includeExamples,
      includeSchemas: this.config.includeSchemas
    };
  }
}