/**
 * API Analytics
 * 
 * Tracks and analyzes API usage, performance metrics,
 * and provides insights for optimization.
 */

import { EventEmitter } from 'events';
import type { AnalyticsConfig, APIMetrics, EndpointMetrics, VersionMetrics } from './types';

interface RequestRecord {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  version: string;
  userId?: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export class APIAnalytics extends EventEmitter {
  private config: AnalyticsConfig;
  private requests: RequestRecord[] = [];
  private metrics: APIMetrics;

  constructor(config: AnalyticsConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
    
    if (config.enabled) {
      this.startCleanupInterval();
    }
  }

  /**
   * Track an API request
   */
  async trackRequest(request: {
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    version: string;
    userId?: string;
    userAgent?: string;
    ip?: string;
  }): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const record: RequestRecord = {
      id: this.generateRequestId(),
      ...request,
      timestamp: new Date()
    };

    this.requests.push(record);
    this.updateMetrics(record);
    this.emit('requestTracked', record);
  }

  /**
   * Get API metrics for a time range
   */
  getMetrics(timeRange?: { start: Date; end: Date }): APIMetrics {
    if (!timeRange) {
      return { ...this.metrics };
    }

    // Filter requests by time range
    const filteredRequests = this.requests.filter(req => 
      req.timestamp >= timeRange.start && req.timestamp <= timeRange.end
    );

    return this.calculateMetrics(filteredRequests, timeRange);
  }

  /**
   * Get endpoint-specific metrics
   */
  getEndpointMetrics(method: string, path: string, timeRange?: { start: Date; end: Date }): EndpointMetrics | undefined {
    const requests = this.getFilteredRequests(timeRange);
    const endpointRequests = requests.filter(req => req.method === method && req.path === path);
    
    if (endpointRequests.length === 0) {
      return undefined;
    }

    return this.calculateEndpointMetrics(method, path, endpointRequests);
  }

  /**
   * Get version-specific metrics
   */
  getVersionMetrics(version: string, timeRange?: { start: Date; end: Date }): VersionMetrics | undefined {
    const requests = this.getFilteredRequests(timeRange);
    const versionRequests = requests.filter(req => req.version === version);
    
    if (versionRequests.length === 0) {
      return undefined;
    }

    return this.calculateVersionMetrics(version, versionRequests);
  }

  /**
   * Get top endpoints by request count
   */
  getTopEndpoints(limit: number = 10, timeRange?: { start: Date; end: Date }): EndpointMetrics[] {
    const requests = this.getFilteredRequests(timeRange);
    const endpointMap = new Map<string, RequestRecord[]>();

    // Group requests by endpoint
    for (const request of requests) {
      const key = `${request.method}:${request.path}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(request);
    }

    // Calculate metrics for each endpoint
    const endpointMetrics: EndpointMetrics[] = [];
    for (const [key, endpointRequests] of endpointMap.entries()) {
      const [method, path] = key.split(':');
      const metrics = this.calculateEndpointMetrics(method, path, endpointRequests);
      endpointMetrics.push(metrics);
    }

    // Sort by request count and return top N
    return endpointMetrics
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);
  }

  /**
   * Get error rate for a time period
   */
  getErrorRate(timeRange?: { start: Date; end: Date }): number {
    const requests = this.getFilteredRequests(timeRange);
    if (requests.length === 0) {
      return 0;
    }

    const errorRequests = requests.filter(req => req.statusCode >= 400);
    return errorRequests.length / requests.length;
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(timeRange?: { start: Date; end: Date }): number {
    const requests = this.getFilteredRequests(timeRange);
    if (requests.length === 0) {
      return 0;
    }

    const totalTime = requests.reduce((sum, req) => sum + req.responseTime, 0);
    return totalTime / requests.length;
  }

  /**
   * Get requests per second
   */
  getRequestsPerSecond(timeRange?: { start: Date; end: Date }): number {
    const requests = this.getFilteredRequests(timeRange);
    if (requests.length === 0) {
      return 0;
    }

    const range = timeRange || {
      start: new Date(Math.min(...requests.map(r => r.timestamp.getTime()))),
      end: new Date(Math.max(...requests.map(r => r.timestamp.getTime())))
    };

    const durationSeconds = (range.end.getTime() - range.start.getTime()) / 1000;
    return durationSeconds > 0 ? requests.length / durationSeconds : 0;
  }

  /**
   * Get unique users count
   */
  getUniqueUsersCount(timeRange?: { start: Date; end: Date }): number {
    const requests = this.getFilteredRequests(timeRange);
    const uniqueUsers = new Set(requests.map(req => req.userId).filter(Boolean));
    return uniqueUsers.size;
  }

  /**
   * Get status code distribution
   */
  getStatusCodeDistribution(timeRange?: { start: Date; end: Date }): Record<number, number> {
    const requests = this.getFilteredRequests(timeRange);
    const distribution: Record<number, number> = {};

    for (const request of requests) {
      distribution[request.statusCode] = (distribution[request.statusCode] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Export analytics data
   */
  exportData(format: 'json' | 'csv' = 'json', timeRange?: { start: Date; end: Date }): string {
    const requests = this.getFilteredRequests(timeRange);

    if (format === 'csv') {
      const headers = ['id', 'method', 'path', 'statusCode', 'responseTime', 'version', 'userId', 'timestamp'];
      const rows = requests.map(req => [
        req.id,
        req.method,
        req.path,
        req.statusCode,
        req.responseTime,
        req.version,
        req.userId || '',
        req.timestamp.toISOString()
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(requests, null, 2);
  }

  /**
   * Clear analytics data
   */
  clearData(olderThan?: Date): void {
    if (olderThan) {
      this.requests = this.requests.filter(req => req.timestamp > olderThan);
    } else {
      this.requests = [];
    }

    this.metrics = this.initializeMetrics();
    this.recalculateMetrics();
    this.emit('dataCleared', { olderThan });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get analytics statistics
   */
  getStats(): {
    totalRequests: number;
    dataRetentionDays: number;
    oldestRecord?: Date;
    newestRecord?: Date;
    memoryUsage: number;
  } {
    const sortedRequests = this.requests.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return {
      totalRequests: this.requests.length,
      dataRetentionDays: this.config.retentionDays,
      oldestRecord: sortedRequests[0]?.timestamp,
      newestRecord: sortedRequests[sortedRequests.length - 1]?.timestamp,
      memoryUsage: JSON.stringify(this.requests).length // Rough estimate
    };
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): APIMetrics {
    return {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      endpoints: {},
      versions: {},
      timeRange: {
        start: new Date(),
        end: new Date()
      }
    };
  }

  /**
   * Update metrics with new request
   */
  private updateMetrics(request: RequestRecord): void {
    this.metrics.totalRequests++;
    
    if (request.statusCode >= 400) {
      this.metrics.totalErrors++;
    }

    this.metrics.errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.totalErrors / this.metrics.totalRequests 
      : 0;

    // Update endpoint metrics
    const endpointKey = `${request.method}:${request.path}`;
    if (!this.metrics.endpoints[endpointKey]) {
      this.metrics.endpoints[endpointKey] = {
        path: request.path,
        method: request.method,
        requests: 0,
        errors: 0,
        averageResponseTime: 0,
        minResponseTime: request.responseTime,
        maxResponseTime: request.responseTime,
        statusCodes: {}
      };
    }

    const endpoint = this.metrics.endpoints[endpointKey];
    endpoint.requests++;
    
    if (request.statusCode >= 400) {
      endpoint.errors++;
    }

    endpoint.averageResponseTime = 
      (endpoint.averageResponseTime * (endpoint.requests - 1) + request.responseTime) / endpoint.requests;
    
    endpoint.minResponseTime = Math.min(endpoint.minResponseTime, request.responseTime);
    endpoint.maxResponseTime = Math.max(endpoint.maxResponseTime, request.responseTime);
    
    endpoint.statusCodes[request.statusCode] = (endpoint.statusCodes[request.statusCode] || 0) + 1;

    // Update version metrics
    if (!this.metrics.versions[request.version]) {
      this.metrics.versions[request.version] = {
        version: request.version,
        requests: 0,
        errors: 0,
        averageResponseTime: 0,
        uniqueUsers: 0,
        endpoints: {}
      };
    }

    const version = this.metrics.versions[request.version];
    version.requests++;
    
    if (request.statusCode >= 400) {
      version.errors++;
    }

    version.averageResponseTime = 
      (version.averageResponseTime * (version.requests - 1) + request.responseTime) / version.requests;
  }

  /**
   * Calculate metrics for filtered requests
   */
  private calculateMetrics(requests: RequestRecord[], timeRange: { start: Date; end: Date }): APIMetrics {
    const metrics: APIMetrics = {
      totalRequests: requests.length,
      totalErrors: requests.filter(req => req.statusCode >= 400).length,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      endpoints: {},
      versions: {},
      timeRange
    };

    if (requests.length === 0) {
      return metrics;
    }

    // Calculate averages
    metrics.averageResponseTime = requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length;
    metrics.errorRate = metrics.totalErrors / metrics.totalRequests;
    
    const durationSeconds = (timeRange.end.getTime() - timeRange.start.getTime()) / 1000;
    metrics.requestsPerSecond = durationSeconds > 0 ? requests.length / durationSeconds : 0;

    // Group by endpoints and versions
    const endpointGroups = new Map<string, RequestRecord[]>();
    const versionGroups = new Map<string, RequestRecord[]>();

    for (const request of requests) {
      const endpointKey = `${request.method}:${request.path}`;
      
      if (!endpointGroups.has(endpointKey)) {
        endpointGroups.set(endpointKey, []);
      }
      endpointGroups.get(endpointKey)!.push(request);

      if (!versionGroups.has(request.version)) {
        versionGroups.set(request.version, []);
      }
      versionGroups.get(request.version)!.push(request);
    }

    // Calculate endpoint metrics
    for (const [key, endpointRequests] of endpointGroups.entries()) {
      const [method, path] = key.split(':');
      metrics.endpoints[key] = this.calculateEndpointMetrics(method, path, endpointRequests);
    }

    // Calculate version metrics
    for (const [version, versionRequests] of versionGroups.entries()) {
      metrics.versions[version] = this.calculateVersionMetrics(version, versionRequests);
    }

    return metrics;
  }

  /**
   * Calculate endpoint-specific metrics
   */
  private calculateEndpointMetrics(method: string, path: string, requests: RequestRecord[]): EndpointMetrics {
    const errors = requests.filter(req => req.statusCode >= 400);
    const responseTimes = requests.map(req => req.responseTime);
    const statusCodes: Record<number, number> = {};

    for (const request of requests) {
      statusCodes[request.statusCode] = (statusCodes[request.statusCode] || 0) + 1;
    }

    return {
      path,
      method,
      requests: requests.length,
      errors: errors.length,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      statusCodes
    };
  }

  /**
   * Calculate version-specific metrics
   */
  private calculateVersionMetrics(version: string, requests: RequestRecord[]): VersionMetrics {
    const errors = requests.filter(req => req.statusCode >= 400);
    const uniqueUsers = new Set(requests.map(req => req.userId).filter(Boolean));
    const endpointGroups = new Map<string, RequestRecord[]>();

    for (const request of requests) {
      const endpointKey = `${request.method}:${request.path}`;
      if (!endpointGroups.has(endpointKey)) {
        endpointGroups.set(endpointKey, []);
      }
      endpointGroups.get(endpointKey)!.push(request);
    }

    const endpoints: Record<string, EndpointMetrics> = {};
    for (const [key, endpointRequests] of endpointGroups.entries()) {
      const [method, path] = key.split(':');
      endpoints[key] = this.calculateEndpointMetrics(method, path, endpointRequests);
    }

    return {
      version,
      requests: requests.length,
      errors: errors.length,
      averageResponseTime: requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length,
      uniqueUsers: uniqueUsers.size,
      endpoints
    };
  }

  /**
   * Get filtered requests by time range
   */
  private getFilteredRequests(timeRange?: { start: Date; end: Date }): RequestRecord[] {
    if (!timeRange) {
      return this.requests;
    }

    return this.requests.filter(req => 
      req.timestamp >= timeRange.start && req.timestamp <= timeRange.end
    );
  }

  /**
   * Recalculate all metrics
   */
  private recalculateMetrics(): void {
    this.metrics = this.initializeMetrics();
    for (const request of this.requests) {
      this.updateMetrics(request);
    }
  }

  /**
   * Start cleanup interval for old data
   */
  private startCleanupInterval(): void {
    // Clean up old data every hour
    setInterval(() => {
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      this.clearData(cutoffDate);
    }, 60 * 60 * 1000);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}