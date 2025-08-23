/**
 * Authorization Manager
 * 
 * Handles authorization for API requests using role-based access control (RBAC)
 * and permission-based authorization.
 */

import type { RequestContext, AuthorizationConfig, User, Role, Permission } from './types';

export class AuthorizationManager {
  private config: AuthorizationConfig;

  constructor(config: AuthorizationConfig) {
    this.config = config;
  }

  /**
   * Authorize a request based on user roles and permissions
   */
  async authorize(context: RequestContext): Promise<void> {
    if (!this.config.enabled || !context.user) {
      return;
    }

    const user = context.user;
    const resource = this.extractResource(context);
    const action = this.extractAction(context);

    // Check if user has required permissions
    const hasPermission = await this.checkPermission(user, resource, action);
    
    if (!hasPermission) {
      throw {
        code: 'AUTHORIZATION_FAILED',
        message: 'Insufficient permissions',
        statusCode: 403,
        details: {
          resource,
          action,
          requiredPermissions: this.getRequiredPermissions(resource, action),
          userPermissions: user.permissions
        }
      };
    }

    // Add authorization metadata to context
    context.metadata.authorization = {
      authorized: true,
      resource,
      action,
      permissions: user.permissions,
      roles: user.roles
    };
  }

  /**
   * Check if user has permission for a specific resource and action
   */
  async checkPermission(user: User, resource: string, action: string): Promise<boolean> {
    // Check direct permissions
    const hasDirectPermission = this.hasDirectPermission(user, resource, action);
    if (hasDirectPermission) {
      return true;
    }

    // Check role-based permissions
    const hasRolePermission = await this.hasRolePermission(user, resource, action);
    if (hasRolePermission) {
      return true;
    }

    return false;
  }

  /**
   * Get all permissions for a user (direct + role-based)
   */
  async getUserPermissions(user: User): Promise<string[]> {
    const permissions = new Set<string>(user.permissions || []);

    // Add permissions from roles
    for (const roleName of user.roles || []) {
      const role = this.findRole(roleName);
      if (role) {
        for (const permission of role.permissions) {
          permissions.add(permission);
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Check if user can access a specific route
   */
  async canAccessRoute(user: User, method: string, path: string): Promise<boolean> {
    const resource = this.pathToResource(path);
    const action = this.methodToAction(method);
    
    return this.checkPermission(user, resource, action);
  }

  /**
   * Get required permissions for a resource and action
   */
  getRequiredPermissions(resource: string, action: string): string[] {
    const permissions: string[] = [];
    
    // General permission patterns
    permissions.push(`${resource}:${action}`);
    permissions.push(`${resource}:*`);
    permissions.push(`*:${action}`);
    permissions.push('*:*');
    
    // Admin permissions
    if (action === 'delete' || action === 'admin') {
      permissions.push('admin');
    }
    
    return permissions;
  }

  /**
   * Add a new role
   */
  addRole(role: Role): void {
    if (!this.config.rbac) {
      this.config.rbac = { roles: [], permissions: [] };
    }
    
    const existingIndex = this.config.rbac.roles.findIndex(r => r.name === role.name);
    if (existingIndex >= 0) {
      this.config.rbac.roles[existingIndex] = role;
    } else {
      this.config.rbac.roles.push(role);
    }
  }

  /**
   * Add a new permission
   */
  addPermission(permission: Permission): void {
    if (!this.config.rbac) {
      this.config.rbac = { roles: [], permissions: [] };
    }
    
    const existingIndex = this.config.rbac.permissions.findIndex(p => p.name === permission.name);
    if (existingIndex >= 0) {
      this.config.rbac.permissions[existingIndex] = permission;
    } else {
      this.config.rbac.permissions.push(permission);
    }
  }

  /**
   * Remove a role
   */
  removeRole(roleName: string): void {
    if (!this.config.rbac) {
      return;
    }
    
    this.config.rbac.roles = this.config.rbac.roles.filter(r => r.name !== roleName);
  }

  /**
   * Remove a permission
   */
  removePermission(permissionName: string): void {
    if (!this.config.rbac) {
      return;
    }
    
    this.config.rbac.permissions = this.config.rbac.permissions.filter(p => p.name !== permissionName);
  }

  /**
   * Get all roles
   */
  getRoles(): Role[] {
    return this.config.rbac?.roles || [];
  }

  /**
   * Get all permissions
   */
  getPermissions(): Permission[] {
    return this.config.rbac?.permissions || [];
  }

  /**
   * Check if user has direct permission
   */
  private hasDirectPermission(user: User, resource: string, action: string): boolean {
    const userPermissions = user.permissions || [];
    const requiredPermissions = this.getRequiredPermissions(resource, action);
    
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has role-based permission
   */
  private async hasRolePermission(user: User, resource: string, action: string): Promise<boolean> {
    const userRoles = user.roles || [];
    const requiredPermissions = this.getRequiredPermissions(resource, action);
    
    for (const roleName of userRoles) {
      const role = this.findRole(roleName);
      if (role) {
        const hasPermission = requiredPermissions.some(permission => 
          role.permissions.includes(permission)
        );
        if (hasPermission) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Find a role by name
   */
  private findRole(roleName: string): Role | undefined {
    return this.config.rbac?.roles.find(role => role.name === roleName);
  }

  /**
   * Extract resource from request context
   */
  private extractResource(context: RequestContext): string {
    return this.pathToResource(context.path);
  }

  /**
   * Extract action from request context
   */
  private extractAction(context: RequestContext): string {
    return this.methodToAction(context.method);
  }

  /**
   * Convert path to resource name
   */
  private pathToResource(path: string): string {
    // Remove leading slash and extract first segment
    const segments = path.replace(/^\//, '').split('/');
    const resource = segments[0] || 'root';
    
    // Handle API versioning
    if (resource.startsWith('v') && /^v\d+$/.test(resource)) {
      return segments[1] || 'root';
    }
    
    return resource;
  }

  /**
   * Convert HTTP method to action
   */
  private methodToAction(method: string): string {
    const methodActionMap: Record<string, string> = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete',
      'HEAD': 'read',
      'OPTIONS': 'read'
    };
    
    return methodActionMap[method.toUpperCase()] || 'unknown';
  }
}