/**
 * Audit Service Implementation
 * 
 * Provides comprehensive audit logging with event tracking, compliance reporting,
 * and real-time security monitoring capabilities.
 */

import {
  AuditEvent,
  AuditQuery,
  AuditReport,
  AuditSummary,
  AuditConfig,
  AuditEventType
} from '../types.js'

export class AuditService {
  private config: AuditConfig
  private events: Map<string, AuditEvent> = new Map()
  private eventIndex: Map<string, Set<string>> = new Map() // For efficient querying

  constructor(config: AuditConfig) {
    this.config = config
    this.initializeStorage()
    this.startRetentionCleanup()
  }

  private initializeStorage(): void {
    // Initialize event indices for efficient querying
    const indexKeys = ['userId', 'eventType', 'resource', 'action', 'result']
    for (const key of indexKeys) {
      this.eventIndex.set(key, new Set())
    }
  }

  async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Validate event
      this.validateEvent(event)
      
      // Enrich event with additional metadata
      const enrichedEvent = this.enrichEvent(event)
      
      // Store event
      this.events.set(event.id, enrichedEvent)
      
      // Update indices
      this.updateIndices(enrichedEvent)
      
      // Real-time alerting if enabled
      if (this.config.realTimeAlerts) {
        await this.checkForAlerts(enrichedEvent)
      }
      
      // Persist to storage based on configuration
      await this.persistEvent(enrichedEvent)
      
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging should not break application flow
    }
  }

  private validateEvent(event: AuditEvent): void {
    if (!event.id) {
      throw new Error('Audit event must have an ID')
    }
    if (!event.timestamp) {
      throw new Error('Audit event must have a timestamp')
    }
    if (!event.eventType) {
      throw new Error('Audit event must have an event type')
    }
    if (!event.resource) {
      throw new Error('Audit event must have a resource')
    }
    if (!event.action) {
      throw new Error('Audit event must have an action')
    }
    if (!event.result) {
      throw new Error('Audit event must have a result')
    }
  }

  private enrichEvent(event: AuditEvent): AuditEvent {
    return {
      ...event,
      timestamp: event.timestamp || new Date(),
      details: {
        ...event.details,
        auditVersion: '1.0',
        source: 'security-manager',
        enrichedAt: new Date().toISOString()
      }
    }
  }

  private updateIndices(event: AuditEvent): void {
    // Update user index
    if (event.userId) {
      const userIndex = this.eventIndex.get('userId') || new Set()
      userIndex.add(event.id)
      this.eventIndex.set('userId', userIndex)
    }

    // Update event type index
    const eventTypeIndex = this.eventIndex.get('eventType') || new Set()
    eventTypeIndex.add(event.id)
    this.eventIndex.set('eventType', eventTypeIndex)

    // Update resource index
    const resourceIndex = this.eventIndex.get('resource') || new Set()
    resourceIndex.add(event.id)
    this.eventIndex.set('resource', resourceIndex)

    // Update action index
    const actionIndex = this.eventIndex.get('action') || new Set()
    actionIndex.add(event.id)
    this.eventIndex.set('action', actionIndex)

    // Update result index
    const resultIndex = this.eventIndex.get('result') || new Set()
    resultIndex.add(event.id)
    this.eventIndex.set('result', resultIndex)
  }

  private async checkForAlerts(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    const alerts: string[] = []

    // Multiple failed authentication attempts
    if (event.eventType === 'authentication' && event.result === 'failure') {
      const recentFailures = await this.getRecentFailedLogins(event.userId, 5) // Last 5 minutes
      if (recentFailures.length >= 3) {
        alerts.push(`Multiple failed login attempts detected for user ${event.userId}`)
      }
    }

    // Privilege escalation attempts
    if (event.eventType === 'authorization' && event.result === 'failure' && 
        event.action === 'admin') {
      alerts.push(`Privilege escalation attempt detected for user ${event.userId}`)
    }

    // Unusual access patterns
    if (event.eventType === 'data-access' && event.result === 'success') {
      const isUnusualAccess = await this.detectUnusualAccess(event)
      if (isUnusualAccess) {
        alerts.push(`Unusual data access pattern detected for user ${event.userId}`)
      }
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert, event)
    }
  }

  private async getRecentFailedLogins(userId?: string, minutes: number = 5): Promise<AuditEvent[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    const events = await this.getEvents({
      startTime: cutoff,
      userId,
      eventType: 'authentication',
      action: 'login',
      result: 'failure'
    })
    return events
  }

  private async detectUnusualAccess(event: AuditEvent): Promise<boolean> {
    // Simple heuristic: check if user is accessing resources outside normal hours
    const hour = event.timestamp.getHours()
    const isOutsideBusinessHours = hour < 8 || hour > 18
    
    // Check if accessing sensitive resources
    const isSensitiveResource = event.resource.includes('admin') || 
                               event.resource.includes('config') ||
                               event.resource.includes('secret')
    
    return isOutsideBusinessHours && isSensitiveResource
  }

  private async sendAlert(message: string, event: AuditEvent): Promise<void> {
    // In a real implementation, would integrate with alerting systems
    console.warn(`SECURITY ALERT: ${message}`, {
      eventId: event.id,
      userId: event.userId,
      timestamp: event.timestamp,
      resource: event.resource,
      action: event.action
    })
  }

  private async persistEvent(event: AuditEvent): Promise<void> {
    // Based on storage configuration, persist to appropriate backend
    switch (this.config.storage.type) {
      case 'database':
        await this.persistToDatabase(event)
        break
      case 'file':
        await this.persistToFile(event)
        break
      case 'elasticsearch':
        await this.persistToElasticsearch(event)
        break
      default:
        // Default to in-memory storage (already done)
        break
    }
  }

  private async persistToDatabase(event: AuditEvent): Promise<void> {
    // Mock database persistence
    console.log('Persisting audit event to database:', event.id)
  }

  private async persistToFile(event: AuditEvent): Promise<void> {
    // Mock file persistence
    console.log('Persisting audit event to file:', event.id)
  }

  private async persistToElasticsearch(event: AuditEvent): Promise<void> {
    // Mock Elasticsearch persistence
    console.log('Persisting audit event to Elasticsearch:', event.id)
  }

  async getEvents(query: AuditQuery): Promise<AuditEvent[]> {
    let filteredEvents = Array.from(this.events.values())

    // Apply filters
    if (query.startTime) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= query.startTime!)
    }
    if (query.endTime) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= query.endTime!)
    }
    if (query.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === query.userId)
    }
    if (query.eventType) {
      filteredEvents = filteredEvents.filter(e => e.eventType === query.eventType)
    }
    if (query.resource) {
      filteredEvents = filteredEvents.filter(e => e.resource === query.resource)
    }
    if (query.action) {
      filteredEvents = filteredEvents.filter(e => e.action === query.action)
    }
    if (query.result) {
      filteredEvents = filteredEvents.filter(e => e.result === query.result)
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    const offset = query.offset || 0
    const limit = query.limit || 100
    return filteredEvents.slice(offset, offset + limit)
  }

  async generateReport(timeRange: { start: Date; end: Date }): Promise<AuditReport> {
    const events = await this.getEvents({
      startTime: timeRange.start,
      endTime: timeRange.end
    })

    const summary = this.generateSummary(events)

    return {
      events,
      totalCount: events.length,
      summary,
      generatedAt: new Date()
    }
  }

  private generateSummary(events: AuditEvent[]): AuditSummary {
    const summary: AuditSummary = {
      totalEvents: events.length,
      successfulEvents: 0,
      failedEvents: 0,
      errorEvents: 0,
      uniqueUsers: 0,
      topResources: [],
      topActions: []
    }

    const userSet = new Set<string>()
    const resourceCounts = new Map<string, number>()
    const actionCounts = new Map<string, number>()

    for (const event of events) {
      // Count results
      switch (event.result) {
        case 'success':
          summary.successfulEvents++
          break
        case 'failure':
          summary.failedEvents++
          break
        case 'error':
          summary.errorEvents++
          break
      }

      // Track unique users
      if (event.userId) {
        userSet.add(event.userId)
      }

      // Count resources
      const resourceCount = resourceCounts.get(event.resource) || 0
      resourceCounts.set(event.resource, resourceCount + 1)

      // Count actions
      const actionCount = actionCounts.get(event.action) || 0
      actionCounts.set(event.action, actionCount + 1)
    }

    summary.uniqueUsers = userSet.size

    // Get top resources
    summary.topResources = Array.from(resourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }))

    // Get top actions
    summary.topActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }))

    return summary
  }

  async getEventById(eventId: string): Promise<AuditEvent | null> {
    return this.events.get(eventId) || null
  }

  async searchEvents(searchTerm: string): Promise<AuditEvent[]> {
    const events = Array.from(this.events.values())
    const searchLower = searchTerm.toLowerCase()

    return events.filter(event => 
      event.resource.toLowerCase().includes(searchLower) ||
      event.action.toLowerCase().includes(searchLower) ||
      event.userId?.toLowerCase().includes(searchLower) ||
      JSON.stringify(event.details).toLowerCase().includes(searchLower)
    )
  }

  private startRetentionCleanup(): void {
    // Clean up old events based on retention policy
    setInterval(() => {
      this.cleanupOldEvents()
    }, 24 * 60 * 60 * 1000) // Run daily
  }

  private cleanupOldEvents(): void {
    const retentionDays = this.config.retention.days
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    for (const [eventId, event] of this.events.entries()) {
      if (event.timestamp < cutoff) {
        this.events.delete(eventId)
        // Also clean up indices
        this.removeFromIndices(event)
      }
    }
  }

  private removeFromIndices(event: AuditEvent): void {
    // Remove from all relevant indices
    const indices = ['userId', 'eventType', 'resource', 'action', 'result']
    for (const indexName of indices) {
      const index = this.eventIndex.get(indexName)
      if (index) {
        index.delete(event.id)
      }
    }
  }

  async getAuditStatistics(): Promise<any> {
    const totalEvents = this.events.size
    const last24Hours = await this.getEvents({
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000)
    })

    return {
      totalEvents,
      eventsLast24Hours: last24Hours.length,
      storageType: this.config.storage.type,
      retentionDays: this.config.retention.days,
      realTimeAlertsEnabled: this.config.realTimeAlerts,
      indexSize: Array.from(this.eventIndex.values()).reduce((sum, set) => sum + set.size, 0)
    }
  }
}