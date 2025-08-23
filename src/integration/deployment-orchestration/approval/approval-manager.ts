/**
 * @fileoverview Approval manager implementation
 * Provides approval workflow management for deployment gates
 */

import {
  IApprovalManager,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalStatus
} from '../interfaces.js';
import { ApprovalResult } from '../types.js';

/**
 * Approval manager
 * Handles approval requests, decisions, and workflow management
 */
export class ApprovalManager implements IApprovalManager {
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private approvalResults: Map<string, ApprovalResult[]> = new Map();

  /**
   * Request approval for deployment stage
   */
  async requestApproval(deploymentId: string, stage: string): Promise<ApprovalRequest> {
    const requestId = this.generateRequestId(deploymentId, stage);
    
    const request: ApprovalRequest = {
      id: requestId,
      deploymentId,
      stage,
      requester: 'system', // In real implementation, would be actual user
      approvers: this.getApproversForStage(stage),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      context: {
        deploymentId,
        stage,
        timestamp: new Date().toISOString()
      }
    };

    this.approvalRequests.set(requestId, request);
    
    console.log(`Approval requested for ${deploymentId} stage ${stage} (ID: ${requestId})`);
    console.log(`Approvers: ${request.approvers.join(', ')}`);
    
    return request;
  }

  /**
   * Submit approval decision
   */
  async submitApproval(requestId: string, decision: ApprovalDecision): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    // Validate approver
    if (!request.approvers.includes(decision.approver)) {
      throw new Error(`User ${decision.approver} is not authorized to approve this request`);
    }

    // Check if already decided by this approver
    const existingResults = this.approvalResults.get(request.deploymentId) || [];
    const existingDecision = existingResults.find(r => 
      r.stage === request.stage && r.approver === decision.approver
    );

    if (existingDecision) {
      throw new Error(`Approver ${decision.approver} has already submitted a decision for this stage`);
    }

    // Record the approval result
    const result: ApprovalResult = {
      stage: request.stage,
      approved: decision.approved,
      approver: decision.approver,
      timestamp: decision.timestamp,
      comments: decision.comments
    };

    const results = this.approvalResults.get(request.deploymentId) || [];
    results.push(result);
    this.approvalResults.set(request.deploymentId, results);

    console.log(`Approval ${decision.approved ? 'granted' : 'denied'} by ${decision.approver} for ${request.deploymentId} stage ${request.stage}`);
    if (decision.comments) {
      console.log(`Comments: ${decision.comments}`);
    }
  }

  /**
   * Get approval status
   */
  async getApprovalStatus(deploymentId: string): Promise<ApprovalStatus> {
    const pendingRequests = Array.from(this.approvalRequests.values())
      .filter(req => req.deploymentId === deploymentId);
    
    const completedResults = this.approvalResults.get(deploymentId) || [];

    // Determine overall status
    let overallStatus: 'pending' | 'approved' | 'rejected' | 'expired' = 'pending';
    
    if (pendingRequests.length === 0 && completedResults.length > 0) {
      // Check if any approvals were rejected
      const hasRejection = completedResults.some(r => !r.approved);
      overallStatus = hasRejection ? 'rejected' : 'approved';
    } else if (pendingRequests.some(req => new Date() > req.deadline)) {
      overallStatus = 'expired';
    }

    return {
      pending: pendingRequests,
      completed: completedResults,
      overallStatus
    };
  }

  /**
   * Cancel approval request
   */
  async cancelApprovalRequest(requestId: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    this.approvalRequests.delete(requestId);
    console.log(`Approval request cancelled: ${requestId}`);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(deploymentId: string, stage: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${deploymentId}-${stage}-${timestamp}-${random}`;
  }

  /**
   * Get approvers for stage
   */
  private getApproversForStage(stage: string): string[] {
    // In real implementation, this would be configured per environment/stage
    const approverConfig: Record<string, string[]> = {
      'development': ['dev-lead'],
      'staging': ['dev-lead', 'qa-lead'],
      'production': ['dev-lead', 'ops-lead', 'security-lead'],
      'pre-deployment': ['dev-lead'],
      'post-deployment': ['ops-lead'],
      'rollback': ['ops-lead', 'dev-lead']
    };

    return approverConfig[stage] || ['admin'];
  }
}