/**
 * API Manager
 * 
 * Central API management system that coordinates OpenAPI generation,
 * version management, analytics, and documentation.
 */

import { EventEmitter } from 'events';
import { OpenAPIGenerator } from './openapi-generator';
import { VersionManager } from './version-manager';
import { APIAnalytics } from './api-analytics';
import { DocumentationGenerator } from './documentation-generator';
import type {
  APIManagerConfig,
  OpenAPISpec,
  APIVersion,
  APIMetrics,
  APIRoute
} from './types';
import type { Route } from '../api-gateway/types';

export class APIManager extends EventEmitter {
  private config: APIManagerConfig;
  private openApiGenerator: OpenAPIGenerator;
  private versionManager: VersionManager;
  private analytics: APIAnalytics;
  private documentationGenerator: DocumentationGenerator;

  constructor(config: APIManagerConfig) {
    super();
    this.config = config;
    
    this.openApiGenerator = new OpenAPIGenerator(
      {
        title: 'README-to-CICD API',
        version: config.versioning.defaultVersion,
        description: 'API for the README-to-CICD Integration & Deployment system'
      }
    );
    
    this.versionManager = new VersionManager(config.versioning);
    this.analytics = new APIAnalytics(config.analytics);
    this.documentationGenerator = new DocumentationGenerator(config.documentation);
  }

  /**
   * Register API routes and generate documentation
   */
  async registerRoutes(routes: Route[]): Promise<void> {
    // Generate OpenAPI specification
    const spec = this.openApiGenerator.generateSpec(routes);
    
    // Register with version manager
    await this.versionManager.registerVersion({
      version: this.config.versioning.defaultVersion,
      status: 'active',
      releaseDate: new Date(),
      changelog: ['Initial API version'],
      breakingChanges: [],
      routes: this.convertRoutesToAPIRoutes(routes)
    });

    // Generate documentation if enabled
    if (this.config.documentation.enabled && this.config.documentation.autoGenerate) {
      await this.documentationGenerator.generateDocumentation(spec);
    }

    this.emit('routesRegistered', { routes: routes.length, version: this.config.versioning.defaultVersion });
  }

  /**
   * Create a new API version
   */
  async createVersion(
    version: string,
    routes: Route[],
    changelog: string[] = [],
    breakingChanges: string[] = []
  ): Promise<void> {
    const apiVersion: APIVersion = {
      version,
      status: 'active',
      releaseDate: new Date(),
      changelog,
      breakingChanges,
      routes: this.convertRoutesToAPIRoutes(routes)
    };

    await this.versionManager.registerVersion(apiVersion);

    // Generate version-specific OpenAPI spec
    const spec = this.openApiGenerator.generateVersionSpec(apiVersion);
    
    // Generate documentation for new version
    if (this.config.documentation.enabled) {
      await this.documentationGenerator.generateVersionDocumentation(spec, version);
    }

    this.emit('versionCreated', { version, routes: routes.length });
  }

  /**
   * Deprecate an API version
   */
  async deprecateVersion(version: string, sunsetDate?: Date): Promise<void> {
    await this.versionManager.deprecateVersion(version, sunsetDate);
    this.emit('versionDeprecated', { version, sunsetDate });
  }

  /**
   * Remove a deprecated API version
   */
  async removeVersion(version: string): Promise<void> {
    await this.versionManager.removeVersion(version);
    this.emit('versionRemoved', { version });
  }

  /**
   * Get OpenAPI specification for a version
   */
  async getOpenAPISpec(version?: string): Promise<OpenAPISpec> {
    if (version) {
      const apiVersion = this.versionManager.getVersion(version);
      if (!apiVersion) {
        throw new Error(`Version not found: ${version}`);
      }
      return this.openApiGenerator.generateVersionSpec(apiVersion);
    }

    // Return spec for default version
    const routes = this.getCurrentRoutes();
    return this.openApiGenerator.generateSpec(routes);
  }

  /**
   * Get API metrics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): APIMetrics {
    return this.analytics.getMetrics(timeRange);
  }

  /**
   * Track API request for analytics
   */
  async trackRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    version?: string,
    userId?: string
  ): Promise<void> {
    await this.analytics.trackRequest({
      method,
      path,
      statusCode,
      responseTime,
      version: version || this.config.versioning.defaultVersion,
      userId,
      timestamp: new Date()
    });
  }

  /**
   * Get all supported versions
   */
  getSupportedVersions(): string[] {
    return this.versionManager.getSupportedVersions();
  }

  /**
   * Get version information
   */
  getVersionInfo(version: string): APIVersion | undefined {
    return this.versionManager.getVersion(version);
  }

  /**
   * Check if version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    return this.versionManager.isDeprecated(version);
  }

  /**
   * Get deprecation info for version
   */
  getDeprecationInfo(version: string): { deprecated: boolean; sunsetDate?: Date } {
    const versionInfo = this.versionManager.getVersion(version);
    if (!versionInfo) {
      return { deprecated: false };
    }

    return {
      deprecated: versionInfo.status === 'deprecated' || versionInfo.status === 'sunset',
      sunsetDate: versionInfo.sunsetDate
    };
  }

  /**
   * Generate documentation for all versions
   */
  async generateAllDocumentation(): Promise<void> {
    const versions = this.versionManager.getAllVersions();
    
    for (const version of versions) {
      const spec = this.openApiGenerator.generateVersionSpec(version);
      await this.documentationGenerator.generateVersionDocumentation(spec, version.version);
    }

    this.emit('documentationGenerated', { versions: versions.length });
  }

  /**
   * Export API specifications in multiple formats
   */
  async exportSpecifications(formats: string[]): Promise<Record<string, any>> {
    const routes = this.getCurrentRoutes();
    return this.openApiGenerator.generateMultipleFormats(routes, formats);
  }

  /**
   * Update API manager configuration
   */
  updateConfig(newConfig: Partial<APIManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.versioning) {
      this.versionManager.updateConfig(newConfig.versioning);
    }
    
    if (newConfig.analytics) {
      this.analytics.updateConfig(newConfig.analytics);
    }
    
    if (newConfig.documentation) {
      this.documentationGenerator.updateConfig(newConfig.documentation);
    }

    this.emit('configUpdated', newConfig);
  }

  /**
   * Get API manager status
   */
  getStatus(): {
    versions: number;
    activeVersions: number;
    deprecatedVersions: number;
    totalRequests: number;
    documentationEnabled: boolean;
    analyticsEnabled: boolean;
  } {
    const versions = this.versionManager.getAllVersions();
    const metrics = this.analytics.getMetrics();

    return {
      versions: versions.length,
      activeVersions: versions.filter(v => v.status === 'active').length,
      deprecatedVersions: versions.filter(v => v.status === 'deprecated').length,
      totalRequests: metrics.totalRequests,
      documentationEnabled: this.config.documentation.enabled,
      analyticsEnabled: this.config.analytics.enabled
    };
  }

  /**
   * Convert Route objects to APIRoute objects
   */
  private convertRoutesToAPIRoutes(routes: Route[]): APIRoute[] {
    return routes.map(route => ({
      path: route.path,
      method: route.method,
      summary: this.generateSummary(route),
      description: this.generateDescription(route),
      parameters: [],
      responses: [],
      deprecated: route.config.validation?.deprecated || false
    }));
  }

  /**
   * Generate summary for route
   */
  private generateSummary(route: Route): string {
    const action = this.getActionFromMethod(route.method);
    const resource = this.getResourceFromPath(route.path);
    return `${action} ${resource}`;
  }

  /**
   * Generate description for route
   */
  private generateDescription(route: Route): string {
    return `${route.method} ${route.path}`;
  }

  /**
   * Get action from HTTP method
   */
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

  /**
   * Get resource from path
   */
  private getResourceFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[0] || 'root';
  }

  /**
   * Get current routes (mock implementation)
   */
  private getCurrentRoutes(): Route[] {
    // In a real implementation, this would return the currently registered routes
    return [];
  }
}