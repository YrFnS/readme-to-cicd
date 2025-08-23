/**
 * Business Continuity Manager
 * 
 * Handles business continuity planning, service degradation management,
 * and communication during disaster recovery scenarios.
 */

import { EventEmitter } from 'events';
import {
  BusinessContinuityConfig,
  DegradationLevel,
  FailoverResult,
  CommunicationPlan,
  EscalationMatrix,
  NotificationChannel,
  NotificationTemplate
} from './types.js';

export class BusinessContinuityManager extends EventEmitter {
  private config: BusinessContinuityConfig;
  private isInitialized = false;
  private currentDegradationLevel = 0;
  private activeIncidents: Map<string, IncidentRecord> = new Map();
  private communicationChannels: Map<string, NotificationChannel> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: BusinessContinuityConfig) {
    super();
    this.config = config;
    this.initializeCommunicationChannels();
  }

  /**
   * Initialize the business continuity manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test communication channels
      await this.testCommunicationChannels();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the business continuity manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Clear escalation timers
      for (const timer of this.escalationTimers.values()) {
        clearTimeout(timer);
      }
      this.escalationTimers.clear();

      this.isInitialized = false;
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Handle system degradation
   */
  async handleDegradation(level: number, reason: string): Promise<void> {
    try {
      const degradationLevel = this.config.degradationLevels.find(d => d.level === level);
      if (!degradationLevel) {
        throw new Error(`Degradation level ${level} not configured`);
      }

      this.currentDegradationLevel = level;
      this.emit('degradation-started', { level, reason });

      // Execute degradation actions
      await this.executeDegradationActions(degradationLevel, reason);

      // Send notifications
      await this.sendDegradationNotifications(degradationLevel, reason);

      // Start escalation if configured
      if (this.config.escalationMatrix.autoEscalation) {
        this.startEscalation(level, reason);
      }

      this.emit('degradation-handled', { level, reason });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Recover from degradation
   */
  async recoverFromDegradation(): Promise<void> {
    try {
      if (this.currentDegradationLevel === 0) {
        return; // Already at normal level
      }

      this.emit('recovery-started', { fromLevel: this.currentDegradationLevel });

      // Gradually restore services
      await this.restoreServices();

      // Send recovery notifications
      await this.sendRecoveryNotifications();

      // Clear escalation timers
      this.clearEscalationTimers();

      this.currentDegradationLevel = 0;
      this.emit('recovery-completed');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Handle failover event
   */
  async handleFailover(failoverResult: FailoverResult): Promise<void> {
    try {
      this.emit('failover-handling-started', failoverResult);

      if (failoverResult.success) {
        // Send failover success notifications
        await this.sendFailoverNotifications(failoverResult, 'success');
        
        // Update service status
        await this.updateServiceStatus('failover-active');
      } else {
        // Send failover failure notifications
        await this.sendFailoverNotifications(failoverResult, 'failure');
        
        // Escalate incident
        await this.escalateIncident('failover-failure', failoverResult.error || 'Unknown error');
      }

      this.emit('failover-handled', failoverResult);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: BusinessContinuityConfig): Promise<void> {
    try {
      this.config = newConfig;
      this.initializeCommunicationChannels();
      this.emit('config-updated', newConfig);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current status
   */
  getCurrentStatus(): Record<string, any> {
    return {
      degradationLevel: this.currentDegradationLevel,
      activeIncidents: this.activeIncidents.size,
      communicationChannels: this.communicationChannels.size,
      escalationActive: this.escalationTimers.size > 0
    };
  }

  /**
   * Initialize communication channels
   */
  private initializeCommunicationChannels(): void {
    this.communicationChannels.clear();
    
    for (const channel of this.config.communicationPlan.channels) {
      this.communicationChannels.set(channel.id, channel);
    }
  }

  /**
   * Test communication channels
   */
  private async testCommunicationChannels(): Promise<void> {
    const testPromises = Array.from(this.communicationChannels.values()).map(async (channel) => {
      try {
        await this.testChannel(channel);
        this.emit('channel-test-success', channel);
      } catch (error) {
        this.emit('channel-test-failed', { channel, error });
      }
    });

    await Promise.allSettled(testPromises);
  }

  /**
   * Test a single communication channel
   */
  private async testChannel(channel: NotificationChannel): Promise<void> {
    // Mock channel test - in production would send actual test messages
    console.log(`Testing communication channel: ${channel.type} - ${channel.id}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error(`Channel test failed: ${channel.id}`);
    }
  }

  /**
   * Execute degradation actions
   */
  private async executeDegradationActions(degradationLevel: DegradationLevel, reason: string): Promise<void> {
    for (const action of degradationLevel.actions) {
      try {
        await this.executeAction(action, reason);
        this.emit('action-executed', { action, reason });
      } catch (error) {
        this.emit('action-failed', { action, reason, error });
      }
    }
  }

  /**
   * Execute a single degradation action
   */
  private async executeAction(action: any, reason: string): Promise<void> {
    console.log(`Executing action: ${action.type} on ${action.target}`);
    
    switch (action.type) {
      case 'disable-feature':
        await this.disableFeature(action.target, action.parameters);
        break;
      case 'reduce-capacity':
        await this.reduceCapacity(action.target, action.parameters);
        break;
      case 'switch-mode':
        await this.switchMode(action.target, action.parameters);
        break;
      case 'notify':
        await this.sendNotification(action.target, action.parameters);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Disable a feature
   */
  private async disableFeature(target: string, parameters: Record<string, any>): Promise<void> {
    console.log(`Disabling feature: ${target}`, parameters);
    // Mock feature disabling
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Reduce capacity
   */
  private async reduceCapacity(target: string, parameters: Record<string, any>): Promise<void> {
    console.log(`Reducing capacity: ${target}`, parameters);
    // Mock capacity reduction
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Switch mode
   */
  private async switchMode(target: string, parameters: Record<string, any>): Promise<void> {
    console.log(`Switching mode: ${target}`, parameters);
    // Mock mode switching
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send degradation notifications
   */
  private async sendDegradationNotifications(degradationLevel: DegradationLevel, reason: string): Promise<void> {
    const template = this.findTemplate('degradation');
    if (!template) {
      console.warn('No degradation notification template found');
      return;
    }

    const message = this.formatMessage(template, {
      level: degradationLevel.level,
      name: degradationLevel.name,
      reason,
      timestamp: new Date().toISOString()
    });

    await this.sendToChannels(template.channels, message);
  }

  /**
   * Send recovery notifications
   */
  private async sendRecoveryNotifications(): Promise<void> {
    const template = this.findTemplate('recovery');
    if (!template) {
      console.warn('No recovery notification template found');
      return;
    }

    const message = this.formatMessage(template, {
      timestamp: new Date().toISOString()
    });

    await this.sendToChannels(template.channels, message);
  }

  /**
   * Send failover notifications
   */
  private async sendFailoverNotifications(failoverResult: FailoverResult, type: 'success' | 'failure'): Promise<void> {
    const template = this.findTemplate('incident');
    if (!template) {
      console.warn('No incident notification template found');
      return;
    }

    const message = this.formatMessage(template, {
      type: `failover-${type}`,
      failoverId: failoverResult.failoverId,
      duration: failoverResult.duration,
      newPrimary: failoverResult.newPrimary,
      oldPrimary: failoverResult.oldPrimary,
      error: failoverResult.error,
      timestamp: new Date().toISOString()
    });

    await this.sendToChannels(template.channels, message);
  }

  /**
   * Find notification template by type
   */
  private findTemplate(type: string): NotificationTemplate | undefined {
    return this.config.communicationPlan.templates.find(t => t.type === type);
  }

  /**
   * Format message with template variables
   */
  private formatMessage(template: NotificationTemplate, variables: Record<string, any>): string {
    let message = template.body;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return message;
  }

  /**
   * Send message to specified channels
   */
  private async sendToChannels(channelIds: string[], message: string): Promise<void> {
    const sendPromises = channelIds.map(async (channelId) => {
      const channel = this.communicationChannels.get(channelId);
      if (channel) {
        try {
          await this.sendNotification(channelId, { message });
          this.emit('notification-sent', { channelId, message });
        } catch (error) {
          this.emit('notification-failed', { channelId, message, error });
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send notification to a specific channel
   */
  private async sendNotification(channelId: string, parameters: Record<string, any>): Promise<void> {
    const channel = this.communicationChannels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    console.log(`Sending notification via ${channel.type}:`, parameters);
    
    // Mock notification sending
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate occasional failures
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error(`Failed to send notification via ${channel.type}`);
    }
  }

  /**
   * Start escalation process
   */
  private startEscalation(level: number, reason: string): void {
    const incidentId = this.generateIncidentId();
    const escalationLevel = this.config.escalationMatrix.levels.find(l => l.level === 1);
    
    if (!escalationLevel) {
      console.warn('No escalation level 1 configured');
      return;
    }

    const incident: IncidentRecord = {
      id: incidentId,
      level,
      reason,
      startTime: new Date(),
      currentEscalationLevel: 1,
      escalationHistory: []
    };

    this.activeIncidents.set(incidentId, incident);

    // Set timer for next escalation
    const timer = setTimeout(() => {
      this.escalateToNextLevel(incidentId);
    }, escalationLevel.timeout * 1000);

    this.escalationTimers.set(incidentId, timer);
    
    this.emit('escalation-started', { incidentId, level, reason });
  }

  /**
   * Escalate to next level
   */
  private escalateToNextLevel(incidentId: string): void {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) {
      return;
    }

    const nextLevel = incident.currentEscalationLevel + 1;
    const escalationLevel = this.config.escalationMatrix.levels.find(l => l.level === nextLevel);
    
    if (!escalationLevel || nextLevel > this.config.escalationMatrix.maxLevel) {
      // Max escalation reached
      this.emit('max-escalation-reached', { incidentId });
      return;
    }

    incident.currentEscalationLevel = nextLevel;
    incident.escalationHistory.push({
      level: nextLevel,
      timestamp: new Date()
    });

    // Send escalation notifications
    this.sendEscalationNotifications(incident, escalationLevel);

    // Set timer for next escalation
    const timer = setTimeout(() => {
      this.escalateToNextLevel(incidentId);
    }, escalationLevel.timeout * 1000);

    this.escalationTimers.set(incidentId, timer);
    
    this.emit('escalation-level-increased', { incidentId, level: nextLevel });
  }

  /**
   * Send escalation notifications
   */
  private async sendEscalationNotifications(incident: IncidentRecord, escalationLevel: any): Promise<void> {
    console.log(`Sending escalation notifications for incident ${incident.id} to level ${escalationLevel.level}`);
    
    // Mock escalation notifications
    for (const contact of escalationLevel.contacts) {
      console.log(`Notifying ${contact.name} (${contact.role}) at ${contact.email}`);
    }
  }

  /**
   * Clear escalation timers
   */
  private clearEscalationTimers(): void {
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
    this.activeIncidents.clear();
  }

  /**
   * Escalate incident
   */
  private async escalateIncident(type: string, reason: string): Promise<void> {
    console.log(`Escalating incident: ${type} - ${reason}`);
    this.startEscalation(5, `${type}: ${reason}`); // Max severity
  }

  /**
   * Restore services
   */
  private async restoreServices(): Promise<void> {
    console.log('Restoring services to normal operation');
    
    // Mock service restoration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.emit('services-restored');
  }

  /**
   * Update service status
   */
  private async updateServiceStatus(status: string): Promise<void> {
    console.log(`Updating service status to: ${status}`);
    
    // Mock status update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.emit('service-status-updated', { status });
  }

  /**
   * Generate unique incident ID
   */
  private generateIncidentId(): string {
    return `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface IncidentRecord {
  id: string;
  level: number;
  reason: string;
  startTime: Date;
  currentEscalationLevel: number;
  escalationHistory: EscalationRecord[];
}

interface EscalationRecord {
  level: number;
  timestamp: Date;
}