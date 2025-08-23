/**
 * Router Implementation
 * 
 * Handles route registration, matching, and request routing
 * with middleware support and path parameter extraction.
 */

import type {
  Route,
  RequestContext,
  ResponseContext,
  MiddlewareFunction,
  HTTPMethod
} from './types';

export class Router {
  private routes: Map<string, Route[]> = new Map();
  private middleware: MiddlewareFunction[] = [];

  /**
   * Add a route to the router
   */
  addRoute(route: Route): void {
    const methodRoutes = this.routes.get(route.method) || [];
    methodRoutes.push(route);
    this.routes.set(route.method, methodRoutes);
  }

  /**
   * Add middleware to the router
   */
  addMiddleware(middleware: MiddlewareFunction): void {
    this.middleware.push(middleware);
  }

  /**
   * Find a matching route for the given method and path (public method)
   */
  findRoute(method: HTTPMethod, path: string): Route | null {
    return this.findMatchingRoute(method, path);
  }

  /**
   * Route a request to the appropriate handler
   */
  async route(context: RequestContext): Promise<ResponseContext> {
    // Find matching route
    const route = this.findMatchingRoute(context.method, context.path);
    
    if (!route) {
      throw {
        code: 'ROUTE_NOT_FOUND',
        message: `Route not found: ${context.method} ${context.path}`,
        statusCode: 404
      };
    }

    // Extract path parameters
    const pathParams = this.extractPathParams(route.path, context.path);
    context.metadata.pathParams = pathParams;

    // Build middleware chain
    const middlewareChain = [
      ...this.middleware,
      ...(route.middleware || [])
    ];

    // Execute middleware chain and route handler
    return this.executeMiddlewareChain(middlewareChain, route.handler, context);
  }

  /**
   * Get the number of registered routes
   */
  getRouteCount(): number {
    let count = 0;
    for (const routes of this.routes.values()) {
      count += routes.length;
    }
    return count;
  }

  /**
   * Get the number of registered middleware
   */
  getMiddlewareCount(): number {
    return this.middleware.length;
  }

  /**
   * Get all routes for a specific method
   */
  getRoutes(method?: HTTPMethod): Route[] {
    if (method) {
      return this.routes.get(method) || [];
    }
    
    const allRoutes: Route[] = [];
    for (const routes of this.routes.values()) {
      allRoutes.push(...routes);
    }
    return allRoutes;
  }

  /**
   * Find a matching route for the given method and path (private implementation)
   */
  private findMatchingRoute(method: HTTPMethod, path: string): Route | null {
    const methodRoutes = this.routes.get(method) || [];
    
    for (const route of methodRoutes) {
      if (this.matchPath(route.path, path)) {
        return route;
      }
    }
    
    return null;
  }

  /**
   * Check if a route path matches the request path
   */
  private matchPath(routePath: string, requestPath: string): boolean {
    // Convert route path to regex pattern
    const pattern = this.pathToRegex(routePath);
    return pattern.test(requestPath);
  }

  /**
   * Convert a route path to a regex pattern
   */
  private pathToRegex(path: string): RegExp {
    // Replace path parameters with regex groups
    const regexPath = path
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, '([^\/]+)')
      .replace(/\*/g, '.*');
    
    return new RegExp(`^${regexPath}$`);
  }

  /**
   * Extract path parameters from the request path
   */
  private extractPathParams(routePath: string, requestPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    const routeSegments = routePath.split('/');
    const requestSegments = requestPath.split('/');
    
    if (routeSegments.length !== requestSegments.length) {
      return params;
    }
    
    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const requestSegment = requestSegments[i];
      
      if (routeSegment.startsWith(':')) {
        const paramName = routeSegment.slice(1);
        params[paramName] = decodeURIComponent(requestSegment);
      }
    }
    
    return params;
  }

  /**
   * Execute the middleware chain and route handler
   */
  private async executeMiddlewareChain(
    middlewareChain: MiddlewareFunction[],
    handler: (context: RequestContext) => Promise<ResponseContext>,
    context: RequestContext
  ): Promise<ResponseContext> {
    let index = 0;

    const next = async (): Promise<ResponseContext> => {
      if (index < middlewareChain.length) {
        const middleware = middlewareChain[index++];
        return middleware(context, next);
      } else {
        // Execute the final route handler
        return handler(context);
      }
    };

    return next();
  }
}