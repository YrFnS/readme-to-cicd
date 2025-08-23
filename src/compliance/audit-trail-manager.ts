/**
 * AuditTrailManager - Comprehensive audit logging and reporting system
 * 
 * Maintains detailed audit trails for all system activities with
 * secure storage, integrity verification, and compliance reporting.
 */

import {
  AuditEvent,
  AuditReport,
  AuditSummary,
  AuditFinding,
  ActionSummary,
  TimeRange
} from './types';

export class AuditTrailManager {
  private events: Map<string, AuditEvent> = new Map();
  private eventStore: AuditEventStore;
  private integrityChecker: AuditIntegrityChecker;
  private retentionPolicy: AuditRetentionPolicy;

  constructor(
    eventStore: AuditEventStore,
    integrityChecker: AuditIntegrityChecker,
    retentionPolicy: AuditRetentionPolicy
  ) {
    this.eventStore = eventStore;
    this.integrityChecker = integrityChecker;
    this.retentionPolicy = retentionPolicy;
  }

  /**
   * Log an audit event
   */
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Validate event structure
      this.validateEvent(event);

      // Add integrity hash
      const eventWithHash = await this.integrityChecker.addIntegrityHash(event);

      // Store event in memory cache
      this.events.set(event.id, eventWithHash);

      // Persist event to storage
      await this.eventStore.storeEvent(eventWithHash);

      // Check retention policy
      await this.applyRetentionPolicy();

    } catch (error) {
      // Log the error but don't throw to avoid breaking the calling system
      console.error('Failed to log audit event:', error);
      
      // Try to log the failure itself (if possible)
      try {
        const errorEvent: AuditEvent = {
          id: `audit-error-${Date.now()}`,
          timestamp: new Date(),
          user: 'system',
          action: 'AUDIT_LOG_FAILURE',
          resource: event.id,
          outcome: 'ERROR',
          details: {
            originalEvent: event,
            error: error.message
          },
          ipAddress: 'localhost',
          userAgent: 'AuditTrailManager',
          sessionId: 'system'
        };
        
        await this.eventStore.storeEvent(errorEvent);
      } catch (nestedError) {
        console.error('Failed to log audit error:', nestedError);
      }
    }
  }

  /**
   * Query audit events with filtering and pagination
   */
  async queryEvents(query: AuditQuery): Promise<AuditQueryResult> {
    const events = await this.eventStore.queryEvents(query);
    
    // Verify integrity of returned events
    const verifiedEvents: AuditEvent[] = [];
    const integrityViolations: string[] = [];
    
    for (const event of events) {
      const isValid = await this.integrityChecker.verifyIntegrity(event);
      if (isValid) {
        verifiedEvents.push(event);
      } else {
        integrityViolations.push(event.id);
      }
    }

    if (integrityViolations.length > 0) {
      // Log integrity violations
      await this.logEvent({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        user: 'system',
        action: 'AUDIT_INTEGRITY_VIOLATION',
        resource: 'audit-trail',
        outcome: 'ERROR',
        details: {
          violatedEvents: integrityViolations,
          queryParams: query
        },
        ipAddress: 'localhost',
        userAgent: 'AuditTrailManager',
        sessionId: 'system'
      });
    }

    return {
      events: verifiedEvents,
      totalCount: await this.eventStore.countEvents(query),
      integrityViolations,
      query
    };
  }

  /**
   * Generate comprehensive audit report
   */
  async generateReport(timeRange: TimeRange, scope?: string[]): Promise<AuditReport> {
    const query: AuditQuery = {
      startTime: timeRange.start,
      endTime: timeRange.end,
      resources: scope
    };

    const queryResult = await this.queryEvents(query);
    const events = queryResult.events;

    // Generate summary statistics
    const summary = this.generateSummary(events);

    // Identify audit findings
    const findings = await this.identifyFindings(events);

    // Generate recommendations
    const recommendations = this.generateRecommendations(events, findings);

    const report: AuditReport = {
      id: `audit-report-${Date.now()}`,
      title: `Audit Report - ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`,
      period: timeRange,
      scope: scope || ['all'],
      events,
      summary,
      findings,
      recommendations
    };

    // Log report generation
    await this.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: 'system',
      action: 'AUDIT_REPORT_GENERATED',
      resource: report.id,
      outcome: 'SUCCESS',
      details: {
        eventCount: events.length,
        findingsCount: findings.length,
        timeRange,
        scope
      },
      ipAddress: 'localhost',
      userAgent: 'AuditTrailManager',
      sessionId: 'system'
    });

    return report;
  }

  /**
   * Search audit events by text
   */
  async searchEvents(searchTerm: string, timeRange?: TimeRange): Promise<AuditEvent[]> {
    const query: AuditQuery = {
      searchTerm,
      startTime: timeRange?.start,
      endTime: timeRange?.end
    };

    const result = await this.queryEvents(query);
    return result.events;
  }

  /**
   * Get audit events for a specific user
   */
  async getUserActivity(userId: string, timeRange?: TimeRange): Promise<AuditEvent[]> {
    const query: AuditQuery = {
      users: [userId],
      startTime: timeRange?.start,
      endTime: timeRange?.end
    };

    const result = await this.queryEvents(query);
    return result.events;
  }

  /**
   * Get audit events for a specific resource
   */
  async getResourceActivity(resourceId: string, timeRange?: TimeRange): Promise<AuditEvent[]> {
    const query: AuditQuery = {
      resources: [resourceId],
      startTime: timeRange?.start,
      endTime: timeRange?.end
    };

    const result = await this.queryEvents(query);
    return result.events;
  }

  /**
   * Get failed audit events
   */
  async getFailedEvents(timeRange?: TimeRange): Promise<AuditEvent[]> {
    const query: AuditQuery = {
      outcomes: ['FAILURE', 'ERROR'],
      startTime: timeRange?.start,
      endTime: timeRange?.end
    };

    const result = await this.queryEvents(query);
    return result.events;
  }

  /**
   * Export audit events for compliance
   */
  async exportEvents(
    timeRange: TimeRange,
    format: 'JSON' | 'CSV' | 'XML' = 'JSON'
  ): Promise<string> {
    const query: AuditQuery = {
      startTime: timeRange.start,
      endTime: timeRange.end
    };

    const result = await this.queryEvents(query);
    const events = result.events;

    switch (format) {
      case 'JSON':
        return JSON.stringify(events, null, 2);
      case 'CSV':
        return this.convertToCSV(events);
      case 'XML':
        return this.convertToXML(events);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity(timeRange?: TimeRange): Promise<AuditIntegrityReport> {
    const query: AuditQuery = {
      startTime: timeRange?.start,
      endTime: timeRange?.end
    };

    const result = await this.queryEvents(query);
    const events = result.events;

    const integrityReport: AuditIntegrityReport = {
      totalEvents: events.length,
      verifiedEvents: 0,
      corruptedEvents: [],
      missingEvents: [],
      duplicateEvents: [],
      timestamp: new Date()
    };

    // Check each event's integrity
    for (const event of events) {
      const isValid = await this.integrityChecker.verifyIntegrity(event);
      if (isValid) {
        integrityReport.verifiedEvents++;
      } else {
        integrityReport.corruptedEvents.push(event.id);
      }
    }

    // Check for sequence gaps (missing events)
    const missingEvents = await this.detectMissingEvents(events);
    integrityReport.missingEvents = missingEvents;

    // Check for duplicates
    const duplicates = this.detectDuplicateEvents(events);
    integrityReport.duplicateEvents = duplicates;

    return integrityReport;
  }

  /**
   * Validate audit event structure
   */
  private validateEvent(event: AuditEvent): void {
    const requiredFields = ['id', 'timestamp', 'user', 'action', 'resource', 'outcome'];
    
    for (const field of requiredFields) {
      if (!event[field as keyof AuditEvent]) {
        throw new Error(`Missing required audit event field: ${field}`);
      }
    }

    if (!['SUCCESS', 'FAILURE', 'ERROR'].includes(event.outcome)) {
      throw new Error(`Invalid audit event outcome: ${event.outcome}`);
    }

    if (event.timestamp > new Date()) {
      throw new Error('Audit event timestamp cannot be in the future');
    }
  }

  /**
   * Generate audit summary statistics
   */
  private generateSummary(events: AuditEvent[]): AuditSummary {
    const summary: AuditSummary = {
      totalEvents: events.length,
      successfulEvents: events.filter(e => e.outcome === 'SUCCESS').length,
      failedEvents: events.filter(e => e.outcome === 'FAILURE').length,
      errorEvents: events.filter(e => e.outcome === 'ERROR').length,
      uniqueUsers: new Set(events.map(e => e.user)).size,
      topActions: this.calculateTopActions(events),
      riskEvents: this.identifyRiskEvents(events)
    };

    return summary;
  }

  /**
   * Calculate top actions by frequency
   */
  private calculateTopActions(events: AuditEvent[]): ActionSummary[] {
    const actionCounts = new Map<string, number>();
    
    for (const event of events) {
      const count = actionCounts.get(event.action) || 0;
      actionCounts.set(event.action, count + 1);
    }

    const totalEvents = events.length;
    const topActions: ActionSummary[] = [];

    for (const [action, count] of actionCounts.entries()) {
      topActions.push({
        action,
        count,
        percentage: Math.round((count / totalEvents) * 100)
      });
    }

    return topActions
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Identify high-risk audit events
   */
  private identifyRiskEvents(events: AuditEvent[]): AuditEvent[] {
    const riskActions = [
      'LOGIN_FAILED',
      'UNAUTHORIZED_ACCESS',
      'PRIVILEGE_ESCALATION',
      'DATA_BREACH',
      'SECURITY_VIOLATION',
      'POLICY_VIOLATION',
      'COMPLIANCE_VIOLATION'
    ];

    return events.filter(event => 
      riskActions.some(action => event.action.includes(action)) ||
      event.outcome === 'ERROR' ||
      (event.outcome === 'FAILURE' && event.action.includes('SECURITY'))
    );
  }

  /**
   * Identify audit findings
   */
  private async identifyFindings(events: AuditEvent[]): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Check for excessive failed logins
    const failedLogins = events.filter(e => 
      e.action === 'LOGIN_FAILED' || e.action === 'AUTHENTICATION_FAILED'
    );
    
    if (failedLogins.length > 10) {
      findings.push({
        id: `finding-failed-logins-${Date.now()}`,
        severity: 'HIGH',
        category: 'SECURITY',
        description: `Excessive failed login attempts detected (${failedLogins.length} attempts)`,
        evidence: failedLogins.slice(0, 5).map(e => e.id),
        recommendation: 'Review authentication logs and consider implementing account lockout policies'
      });
    }

    // Check for privilege escalation attempts
    const privilegeEscalation = events.filter(e => 
      e.action.includes('PRIVILEGE') || e.action.includes('ESCALATION')
    );
    
    if (privilegeEscalation.length > 0) {
      findings.push({
        id: `finding-privilege-escalation-${Date.now()}`,
        severity: 'CRITICAL',
        category: 'SECURITY',
        description: `Privilege escalation attempts detected (${privilegeEscalation.length} attempts)`,
        evidence: privilegeEscalation.map(e => e.id),
        recommendation: 'Investigate privilege escalation attempts and review access controls'
      });
    }

    // Check for unusual activity patterns
    const unusualActivity = this.detectUnusualActivity(events);
    if (unusualActivity.length > 0) {
      findings.push({
        id: `finding-unusual-activity-${Date.now()}`,
        severity: 'MEDIUM',
        category: 'OPERATIONAL',
        description: `Unusual activity patterns detected`,
        evidence: unusualActivity.map(e => e.id),
        recommendation: 'Review unusual activity patterns for potential security issues'
      });
    }

    return findings;
  }

  /**
   * Detect unusual activity patterns
   */
  private detectUnusualActivity(events: AuditEvent[]): AuditEvent[] {
    // Simple heuristic: events outside normal business hours
    const businessHourEvents = events.filter(event => {
      const hour = event.timestamp.getHours();
      return hour >= 9 && hour <= 17; // 9 AM to 5 PM
    });

    const afterHoursEvents = events.filter(event => {
      const hour = event.timestamp.getHours();
      return hour < 9 || hour > 17;
    });

    // If more than 20% of events are after hours, flag as unusual
    if (afterHoursEvents.length > events.length * 0.2) {
      return afterHoursEvents.slice(0, 10); // Return first 10 for evidence
    }

    return [];
  }

  /**
   * Generate recommendations based on events and findings
   */
  private generateRecommendations(events: AuditEvent[], findings: AuditFinding[]): string[] {
    const recommendations: string[] = [];

    // Security recommendations
    const securityFindings = findings.filter(f => f.category === 'SECURITY');
    if (securityFindings.length > 0) {
      recommendations.push('Implement enhanced security monitoring and alerting');
      recommendations.push('Review and strengthen authentication mechanisms');
      recommendations.push('Conduct security awareness training for users');
    }

    // Operational recommendations
    const errorEvents = events.filter(e => e.outcome === 'ERROR');
    if (errorEvents.length > events.length * 0.05) { // More than 5% errors
      recommendations.push('Investigate and resolve system errors to improve reliability');
      recommendations.push('Implement better error handling and monitoring');
    }

    // Compliance recommendations
    const complianceEvents = events.filter(e => 
      e.action.includes('COMPLIANCE') || e.action.includes('POLICY')
    );
    if (complianceEvents.length > 0) {
      recommendations.push('Review compliance policies and procedures');
      recommendations.push('Provide compliance training to relevant personnel');
    }

    // General recommendations
    if (events.length > 10000) {
      recommendations.push('Consider implementing audit log archiving and retention policies');
    }

    if (findings.length === 0) {
      recommendations.push('Continue monitoring audit logs for security and compliance issues');
    }

    return recommendations;
  }

  /**
   * Apply retention policy to audit events
   */
  private async applyRetentionPolicy(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicy.retentionDays);

    await this.eventStore.deleteEventsBefore(cutoffDate);
  }

  /**
   * Detect missing events in sequence
   */
  private async detectMissingEvents(events: AuditEvent[]): Promise<string[]> {
    // This is a simplified implementation
    // In practice, you might use sequence numbers or timestamps to detect gaps
    return [];
  }

  /**
   * Detect duplicate events
   */
  private detectDuplicateEvents(events: AuditEvent[]): string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const event of events) {
      if (seen.has(event.id)) {
        duplicates.push(event.id);
      } else {
        seen.add(event.id);
      }
    }

    return duplicates;
  }

  /**
   * Convert events to CSV format
   */
  private convertToCSV(events: AuditEvent[]): string {
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Resource', 'Outcome', 'IP Address'];
    const rows = events.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.user,
      event.action,
      event.resource,
      event.outcome,
      event.ipAddress
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Convert events to XML format
   */
  private convertToXML(events: AuditEvent[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditEvents>\n';
    
    for (const event of events) {
      xml += '  <event>\n';
      xml += `    <id>${this.escapeXML(event.id)}</id>\n`;
      xml += `    <timestamp>${event.timestamp.toISOString()}</timestamp>\n`;
      xml += `    <user>${this.escapeXML(event.user)}</user>\n`;
      xml += `    <action>${this.escapeXML(event.action)}</action>\n`;
      xml += `    <resource>${this.escapeXML(event.resource)}</resource>\n`;
      xml += `    <outcome>${event.outcome}</outcome>\n`;
      xml += `    <ipAddress>${this.escapeXML(event.ipAddress)}</ipAddress>\n`;
      xml += '  </event>\n';
    }
    
    xml += '</auditEvents>';
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Audit event store interface
 */
interface AuditEventStore {
  storeEvent(event: AuditEvent): Promise<void>;
  queryEvents(query: AuditQuery): Promise<AuditEvent[]>;
  countEvents(query: AuditQuery): Promise<number>;
  deleteEventsBefore(date: Date): Promise<void>;
}

/**
 * Audit integrity checker interface
 */
interface AuditIntegrityChecker {
  addIntegrityHash(event: AuditEvent): Promise<AuditEvent>;
  verifyIntegrity(event: AuditEvent): Promise<boolean>;
}

/**
 * Audit retention policy interface
 */
interface AuditRetentionPolicy {
  retentionDays: number;
}

/**
 * Audit query interface
 */
interface AuditQuery {
  startTime?: Date;
  endTime?: Date;
  users?: string[];
  actions?: string[];
  resources?: string[];
  outcomes?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit query result interface
 */
interface AuditQueryResult {
  events: AuditEvent[];
  totalCount: number;
  integrityViolations: string[];
  query: AuditQuery;
}

/**
 * Audit integrity report interface
 */
interface AuditIntegrityReport {
  totalEvents: number;
  verifiedEvents: number;
  corruptedEvents: string[];
  missingEvents: string[];
  duplicateEvents: string[];
  timestamp: Date;
}