/**
 * Authorization Service Implementation
 * 
 * Provides role-based access control (RBAC) with fine-grained permissions,
 * policy enforcement, and dynamic permission evaluation.
 */

import {
  User,
  Resource,
  Action,
  Role,
  Permission,
  PermissionCondition,
  AuthzConfig
} from '../types.js'

export class AuthorizationService {
  private config: AuthzConfig
  private permissionCache: Map<string, { permissions: boolean; expiresAt: Date }> = new Map()

  constructor(config: AuthzConfig) {
    this.config = config
    this.startCacheCleanup()
  }

  async authorize(user: User, resource: Resource, action: Action): Promise<boolean> {
    try {
      // Check cache first if enabled
      if (this.config.permissionCache.enabled) {
        const cacheKey = this.generateCacheKey(user.id, resource, action)
        const cached = this.permissionCache.get(cacheKey)
        
        if (cached && cached.expiresAt > new Date()) {
          return cached.permissions
        }
      }

      // Perform authorization check
      const authorized = await this.performAuthorizationCheck(user, resource, action)

      // Cache result if enabled
      if (this.config.permissionCache.enabled) {
        const cacheKey = this.generateCacheKey(user.id, resource, action)
        const expiresAt = new Date(Date.now() + this.config.permissionCache.ttl * 1000)
        this.permissionCache.set(cacheKey, { permissions: authorized, expiresAt })
      }

      return authorized
    } catch (error) {
      console.error('Authorization check failed:', error)
      return false
    }
  }

  private async performAuthorizationCheck(user: User, resource: Resource, action: Action): Promise<boolean> {
    // Check if user is active
    if (!user.isActive) {
      return false
    }

    // Check direct permissions first
    for (const permission of user.permissions) {
      if (await this.matchesPermission(permission, resource, action)) {
        return true
      }
    }

    // Check role-based permissions
    for (const role of user.roles) {
      for (const permission of role.permissions) {
        if (await this.matchesPermission(permission, resource, action)) {
          return true
        }
      }
    }

    // Check inherited roles
    for (const role of user.roles) {
      const inheritedRoles = await this.getInheritedRoles(role.name)
      for (const inheritedRole of inheritedRoles) {
        for (const permission of inheritedRole.permissions) {
          if (await this.matchesPermission(permission, resource, action)) {
            return true
          }
        }
      }
    }

    return false
  }

  private async matchesPermission(permission: Permission, resource: Resource, action: Action): Promise<boolean> {
    // Check resource match
    if (!this.matchesResource(permission.resource, resource)) {
      return false
    }

    // Check action match
    if (!this.matchesAction(permission.action, action)) {
      return false
    }

    // Check conditions if present
    if (permission.conditions && permission.conditions.length > 0) {
      return await this.evaluateConditions(permission.conditions, resource)
    }

    return true
  }

  private matchesResource(permissionResource: string, resource: Resource): boolean {
    // Wildcard match
    if (permissionResource === '*') {
      return true
    }

    // Exact match
    if (permissionResource === resource.type) {
      return true
    }

    // Pattern match (e.g., "user:*", "project:123")
    if (permissionResource.includes(':')) {
      const [type, id] = permissionResource.split(':')
      if (type === resource.type) {
        return id === '*' || id === resource.id
      }
    }

    return false
  }

  private matchesAction(permissionAction: string, action: Action): boolean {
    // Admin action grants all permissions
    if (permissionAction === 'admin') {
      return true
    }

    // Exact match
    if (permissionAction === action) {
      return true
    }

    // Hierarchical actions (read < update < delete < admin)
    const actionHierarchy: Record<string, string[]> = {
      'read': ['read'],
      'update': ['read', 'update'],
      'delete': ['read', 'update', 'delete'],
      'admin': ['read', 'update', 'delete', 'create', 'execute', 'admin']
    }

    const allowedActions = actionHierarchy[permissionAction] || [permissionAction]
    return allowedActions.includes(action)
  }

  private async evaluateConditions(conditions: PermissionCondition[], resource: Resource): Promise<boolean> {
    for (const condition of conditions) {
      if (!await this.evaluateCondition(condition, resource)) {
        return false
      }
    }
    return true
  }

  private async evaluateCondition(condition: PermissionCondition, resource: Resource): Promise<boolean> {
    const fieldValue = resource.attributes[condition.field]
    
    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value
      case 'ne':
        return fieldValue !== condition.value
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue)
      case 'gt':
        return fieldValue > condition.value
      case 'lt':
        return fieldValue < condition.value
      case 'gte':
        return fieldValue >= condition.value
      case 'lte':
        return fieldValue <= condition.value
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value)
      default:
        return false
    }
  }

  async checkPermission(user: User, permission: string): Promise<boolean> {
    // Parse permission string (e.g., "resource:action" or "resource:id:action")
    const parts = permission.split(':')
    if (parts.length < 2) {
      return false
    }

    const resource: Resource = {
      type: parts[0],
      id: parts.length === 3 ? parts[1] : '*',
      attributes: {}
    }
    const action = parts[parts.length - 1] as Action

    return this.authorize(user, resource, action)
  }

  async getUserRoles(userId: string): Promise<string[]> {
    // In a real implementation, this would query the user store
    // For now, return mock data
    const mockRoles: Record<string, string[]> = {
      'user_admin': ['Administrator', 'User'],
      'user_manager': ['Manager', 'User'],
      'user_developer': ['Developer', 'User'],
      'user_viewer': ['Viewer']
    }

    return mockRoles[userId] || ['User']
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const roles = await this.getUserRoles(userId)
    const permissions: Permission[] = []

    for (const roleName of roles) {
      const rolePermissions = await this.getRolePermissions(roleName)
      permissions.push(...rolePermissions)
    }

    // Remove duplicates
    const uniquePermissions = permissions.filter((permission, index, self) =>
      index === self.findIndex(p => p.id === permission.id)
    )

    return uniquePermissions
  }

  private async getRolePermissions(roleName: string): Promise<Permission[]> {
    const rolePermissions: Record<string, Permission[]> = {
      'Administrator': [
        { id: 'perm_admin_all', resource: '*', action: 'admin' }
      ],
      'Manager': [
        { id: 'perm_manage_team', resource: 'team', action: 'admin' },
        { id: 'perm_read_reports', resource: 'reports', action: 'read' },
        { id: 'perm_approve_requests', resource: 'requests', action: 'update' }
      ],
      'Developer': [
        { id: 'perm_read_code', resource: 'code', action: 'read' },
        { id: 'perm_write_code', resource: 'code', action: 'update' },
        { id: 'perm_deploy_dev', resource: 'deployment', action: 'execute', 
          conditions: [{ field: 'environment', operator: 'eq', value: 'development' }] }
      ],
      'User': [
        { id: 'perm_read_own', resource: 'user-data', action: 'read' },
        { id: 'perm_update_profile', resource: 'user-profile', action: 'update' }
      ],
      'Viewer': [
        { id: 'perm_read_public', resource: 'public-data', action: 'read' }
      ]
    }

    return rolePermissions[roleName] || []
  }

  private async getInheritedRoles(roleName: string): Promise<Role[]> {
    const inheritance = this.config.roleHierarchy[roleName] || []
    const inheritedRoles: Role[] = []

    for (const inheritedRoleName of inheritance) {
      const permissions = await this.getRolePermissions(inheritedRoleName)
      inheritedRoles.push({
        id: `role_${inheritedRoleName.toLowerCase()}`,
        name: inheritedRoleName,
        description: `Inherited role: ${inheritedRoleName}`,
        permissions
      })
    }

    return inheritedRoles
  }

  async createRole(role: Omit<Role, 'id'>): Promise<Role> {
    const newRole: Role = {
      id: `role_${Date.now()}`,
      ...role
    }

    // In a real implementation, would persist to database
    console.log('Created role:', newRole)
    return newRole
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<boolean> {
    // In a real implementation, would update in database
    console.log('Updated role:', roleId, updates)
    return true
  }

  async deleteRole(roleId: string): Promise<boolean> {
    // In a real implementation, would delete from database
    console.log('Deleted role:', roleId)
    return true
  }

  async assignRoleToUser(userId: string, roleName: string): Promise<boolean> {
    // In a real implementation, would update user-role mapping
    console.log('Assigned role to user:', userId, roleName)
    return true
  }

  async removeRoleFromUser(userId: string, roleName: string): Promise<boolean> {
    // In a real implementation, would remove user-role mapping
    console.log('Removed role from user:', userId, roleName)
    return true
  }

  async grantPermission(userId: string, permission: Permission): Promise<boolean> {
    // In a real implementation, would add permission to user
    console.log('Granted permission to user:', userId, permission)
    return true
  }

  async revokePermission(userId: string, permissionId: string): Promise<boolean> {
    // In a real implementation, would remove permission from user
    console.log('Revoked permission from user:', userId, permissionId)
    return true
  }

  private generateCacheKey(userId: string, resource: Resource, action: Action): string {
    return `${userId}:${resource.type}:${resource.id}:${action}`
  }

  private startCacheCleanup(): void {
    if (!this.config.permissionCache.enabled) {
      return
    }

    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = new Date()
      for (const [key, entry] of this.permissionCache.entries()) {
        if (entry.expiresAt < now) {
          this.permissionCache.delete(key)
        }
      }
    }, 5 * 60 * 1000)
  }

  async clearCache(userId?: string): Promise<void> {
    if (userId) {
      // Clear cache for specific user
      for (const key of this.permissionCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.permissionCache.delete(key)
        }
      }
    } else {
      // Clear all cache
      this.permissionCache.clear()
    }
  }

  async getAuthorizationStatistics(): Promise<any> {
    return {
      cacheSize: this.permissionCache.size,
      cacheEnabled: this.config.permissionCache.enabled,
      cacheTtl: this.config.permissionCache.ttl,
      defaultRole: this.config.defaultRole,
      roleHierarchy: this.config.roleHierarchy
    }
  }
}