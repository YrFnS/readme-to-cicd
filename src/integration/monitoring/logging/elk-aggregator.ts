/**
 * ELK Stack log aggregator implementation
 * Handles log collection, indexing, and querying via Elasticsearch, Logstash, and Kibana
 */

import {
  LogAggregator,
  LogEntry,
  LogQuery,
  LogLevel,
  SearchOptions,
  HealthStatus
} from '../types.js'
import { ELKConfig } from '../monitoring-system.js'

export class ELKLogAggregator implements LogAggregator {
  private config: ELKConfig
  private isInitialized = false
  private elasticsearchClient: ElasticsearchClient
  private logBuffer: LogEntry[] = []
  private bufferFlushInterval: NodeJS.Timeout | null = null

  constructor(config: ELKConfig) {
    this.config = config
    this.elasticsearchClient = new ElasticsearchClient(config.elasticsearch)
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Initialize Elasticsearch connection
      await this.elasticsearchClient.connect()
      
      // Create index template if it doesn't exist
      await this.createIndexTemplate()
      
      // Start log buffer flushing
      this.startBufferFlushing()
      
      this.isInitialized = true
    } catch (error) {
      throw new ELKError('Failed to initialize ELK aggregator', { cause: error })
    }
  }

  async collectLogs(source: string): Promise<LogEntry[]> {
    if (!this.isInitialized) {
      throw new ELKError('ELK aggregator not initialized')
    }

    try {
      // In a real implementation, this would collect logs from various sources
      // For now, we'll return recent logs from Elasticsearch
      const query: LogQuery = {
        timeRange: {
          start: new Date(Date.now() - 3600000), // Last hour
          end: new Date()
        }
      }

      return this.queryLogs(query)
    } catch (error) {
      throw new ELKError(`Failed to collect logs from ${source}`, { cause: error })
    }
  }

  async queryLogs(query: LogQuery): Promise<LogEntry[]> {
    if (!this.isInitialized) {
      throw new ELKError('ELK aggregator not initialized')
    }

    try {
      const elasticsearchQuery = this.buildElasticsearchQuery(query)
      const response = await this.elasticsearchClient.search(elasticsearchQuery)
      return this.parseSearchResponse(response)
    } catch (error) {
      throw new ELKError('Failed to query logs', { cause: error })
    }
  }

  async indexLogs(logs: LogEntry[]): Promise<void> {
    if (!this.isInitialized) {
      throw new ELKError('ELK aggregator not initialized')
    }

    try {
      // Add logs to buffer for batch processing
      this.logBuffer.push(...logs)
      
      // If buffer is getting large, flush immediately
      if (this.logBuffer.length > 1000) {
        await this.flushLogBuffer()
      }
    } catch (error) {
      throw new ELKError('Failed to index logs', { cause: error })
    }
  }

  async searchLogs(searchQuery: string, options: SearchOptions = {}): Promise<LogEntry[]> {
    if (!this.isInitialized) {
      throw new ELKError('ELK aggregator not initialized')
    }

    try {
      const elasticsearchQuery = this.buildSearchQuery(searchQuery, options)
      const response = await this.elasticsearchClient.search(elasticsearchQuery)
      return this.parseSearchResponse(response)
    } catch (error) {
      throw new ELKError(`Failed to search logs: ${searchQuery}`, { cause: error })
    }
  }

  async logEvent(event: Partial<LogEntry>): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: event.timestamp || new Date(),
      level: event.level || 'info',
      message: event.message || '',
      component: event.component || 'unknown',
      traceId: event.traceId,
      spanId: event.spanId,
      metadata: event.metadata || {}
    }

    await this.indexLogs([logEntry])
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const clusterHealth = await this.elasticsearchClient.getClusterHealth()
      
      const checks = [
        {
          name: 'elasticsearch-connection',
          status: clusterHealth.status === 'green' || clusterHealth.status === 'yellow' ? 'pass' as const : 'fail' as const,
          message: `Cluster status: ${clusterHealth.status}`,
          duration: 0
        }
      ]

      // Check Logstash if configured
      if (this.config.logstash) {
        try {
          await this.checkLogstashHealth()
          checks.push({
            name: 'logstash-connection',
            status: 'pass' as const,
            duration: 0
          })
        } catch (error) {
          checks.push({
            name: 'logstash-connection',
            status: 'fail' as const,
            message: error instanceof Error ? error.message : 'Unknown error',
            duration: 0
          })
        }
      }

      const overallStatus = checks.every(check => check.status === 'pass') 
        ? 'healthy' 
        : checks.some(check => check.status === 'pass')
          ? 'degraded'
          : 'unhealthy'

      return {
        status: overallStatus,
        checks,
        lastUpdated: new Date()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: [{
          name: 'elk-stack',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: 0
        }],
        lastUpdated: new Date()
      }
    }
  }

  private async createIndexTemplate(): Promise<void> {
    const template = {
      index_patterns: [this.config.indexPattern],
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          'index.lifecycle.name': 'logs-policy',
          'index.lifecycle.rollover_alias': 'logs'
        },
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            level: { type: 'keyword' },
            message: { type: 'text' },
            component: { type: 'keyword' },
            traceId: { type: 'keyword' },
            spanId: { type: 'keyword' },
            metadata: { type: 'object', dynamic: true }
          }
        }
      }
    }

    await this.elasticsearchClient.putIndexTemplate('logs-template', template)
  }

  private startBufferFlushing(): void {
    this.bufferFlushInterval = setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushLogBuffer()
      }
    }, 5000) // Flush every 5 seconds
  }

  private async flushLogBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return
    }

    try {
      const logsToFlush = [...this.logBuffer]
      this.logBuffer = []

      await this.elasticsearchClient.bulkIndex(logsToFlush, this.getIndexName())
    } catch (error) {
      // If flushing fails, put logs back in buffer
      this.logBuffer.unshift(...this.logBuffer)
      throw new ELKError('Failed to flush log buffer', { cause: error })
    }
  }

  private buildElasticsearchQuery(query: LogQuery): any {
    const esQuery: any = {
      index: this.getIndexName(),
      body: {
        query: {
          bool: {
            must: [],
            filter: []
          }
        },
        sort: [{ timestamp: { order: 'desc' } }],
        size: 1000
      }
    }

    // Add time range filter
    esQuery.body.query.bool.filter.push({
      range: {
        timestamp: {
          gte: query.timeRange.start.toISOString(),
          lte: query.timeRange.end.toISOString()
        }
      }
    })

    // Add level filter
    if (query.level) {
      esQuery.body.query.bool.filter.push({
        term: { level: query.level }
      })
    }

    // Add component filter
    if (query.component) {
      esQuery.body.query.bool.filter.push({
        term: { component: query.component }
      })
    }

    // Add trace ID filter
    if (query.traceId) {
      esQuery.body.query.bool.filter.push({
        term: { traceId: query.traceId }
      })
    }

    // Add text query
    if (query.query) {
      esQuery.body.query.bool.must.push({
        multi_match: {
          query: query.query,
          fields: ['message', 'component']
        }
      })
    }

    return esQuery
  }

  private buildSearchQuery(searchQuery: string, options: SearchOptions): any {
    const esQuery: any = {
      index: this.getIndexName(),
      body: {
        query: {
          multi_match: {
            query: searchQuery,
            fields: ['message', 'component', 'metadata.*']
          }
        },
        sort: [{ timestamp: { order: options.sortOrder || 'desc' } }],
        size: options.limit || 100,
        from: options.offset || 0
      }
    }

    // Add time range filter if provided
    if (options.timeRange) {
      esQuery.body.query = {
        bool: {
          must: [esQuery.body.query],
          filter: [{
            range: {
              timestamp: {
                gte: options.timeRange.start.toISOString(),
                lte: options.timeRange.end.toISOString()
              }
            }
          }]
        }
      }
    }

    return esQuery
  }

  private parseSearchResponse(response: any): LogEntry[] {
    return response.hits.hits.map((hit: any) => ({
      timestamp: new Date(hit._source.timestamp),
      level: hit._source.level,
      message: hit._source.message,
      component: hit._source.component,
      traceId: hit._source.traceId,
      spanId: hit._source.spanId,
      metadata: hit._source.metadata || {}
    }))
  }

  private getIndexName(): string {
    const date = new Date().toISOString().split('T')[0]
    return this.config.indexPattern.replace('*', date)
  }

  private async checkLogstashHealth(): Promise<void> {
    if (!this.config.logstash) {
      return
    }

    // Simple TCP connection check to Logstash
    const { host, port } = this.config.logstash
    
    // In a real implementation, this would make an actual connection check
    // For now, we'll simulate it
    console.debug(`Checking Logstash health at ${host}:${port}`)
  }

  async shutdown(): Promise<void> {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval)
      this.bufferFlushInterval = null
    }

    // Flush any remaining logs
    await this.flushLogBuffer()

    // Close Elasticsearch connection
    await this.elasticsearchClient.close()
    
    this.isInitialized = false
  }
}

// Elasticsearch client wrapper
class ElasticsearchClient {
  private config: any
  private isConnected = false

  constructor(config: any) {
    this.config = config
  }

  async connect(): Promise<void> {
    try {
      // In a real implementation, this would establish connection to Elasticsearch
      // For now, we'll simulate the connection
      console.debug(`Connecting to Elasticsearch at ${this.config.hosts.join(', ')}`)
      this.isConnected = true
    } catch (error) {
      throw new ELKError('Failed to connect to Elasticsearch', { cause: error })
    }
  }

  async search(query: any): Promise<any> {
    if (!this.isConnected) {
      throw new ELKError('Elasticsearch client not connected')
    }

    // Simulate search response
    return {
      hits: {
        hits: [
          {
            _source: {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'Sample log message',
              component: 'monitoring-system',
              metadata: {}
            }
          }
        ]
      }
    }
  }

  async bulkIndex(logs: LogEntry[], indexName: string): Promise<void> {
    if (!this.isConnected) {
      throw new ELKError('Elasticsearch client not connected')
    }

    // In a real implementation, this would perform bulk indexing
    console.debug(`Bulk indexing ${logs.length} logs to ${indexName}`)
  }

  async putIndexTemplate(name: string, template: any): Promise<void> {
    if (!this.isConnected) {
      throw new ELKError('Elasticsearch client not connected')
    }

    // In a real implementation, this would create the index template
    console.debug(`Creating index template: ${name}`)
  }

  async getClusterHealth(): Promise<any> {
    if (!this.isConnected) {
      throw new ELKError('Elasticsearch client not connected')
    }

    // Simulate cluster health response
    return {
      status: 'green',
      number_of_nodes: 1,
      active_primary_shards: 5,
      active_shards: 5
    }
  }

  async close(): Promise<void> {
    this.isConnected = false
    console.debug('Elasticsearch connection closed')
  }
}

export class ELKError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message)
    this.name = 'ELKError'
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}