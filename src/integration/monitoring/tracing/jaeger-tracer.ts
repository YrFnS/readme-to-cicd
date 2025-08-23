/**
 * Jaeger distributed tracing implementation
 * Handles trace creation, span management, and request correlation
 */

import {
  DistributedTracer,
  Trace,
  Span,
  SpanLog,
  HealthStatus
} from '../types.js'
import { JaegerConfig } from '../monitoring-system.js'

export class JaegerDistributedTracer implements DistributedTracer {
  private config: JaegerConfig
  private isInitialized = false
  private activeTraces = new Map<string, Trace>()
  private spanFinishedCallbacks: Array<(span: Span) => void> = []
  private reporterInterval: NodeJS.Timeout | null = null

  constructor(config: JaegerConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Initialize Jaeger tracer
      await this.initializeTracer()
      
      // Start reporter
      this.startReporter()
      
      this.isInitialized = true
    } catch (error) {
      throw new JaegerError('Failed to initialize Jaeger tracer', { cause: error })
    }
  }

  startTrace(operationName: string, parentContext?: any): Trace {
    if (!this.isInitialized) {
      throw new JaegerError('Jaeger tracer not initialized')
    }

    const traceId = this.generateTraceId()
    const startTime = new Date()

    const trace: Trace = {
      traceId,
      spans: [],
      duration: 0,
      startTime,
      endTime: startTime
    }

    // Create root span
    const rootSpan = this.createSpan(trace, operationName)
    trace.spans.push(rootSpan)

    this.activeTraces.set(traceId, trace)

    return trace
  }

  async finishTrace(trace: Trace): Promise<void> {
    if (!this.isInitialized) {
      throw new JaegerError('Jaeger tracer not initialized')
    }

    try {
      // Finish all active spans
      for (const span of trace.spans) {
        if (!span.endTime) {
          this.finishSpan(span)
        }
      }

      // Calculate total trace duration
      trace.endTime = new Date()
      trace.duration = trace.endTime.getTime() - trace.startTime.getTime()

      // Report trace to Jaeger
      await this.reportTrace(trace)

      // Remove from active traces
      this.activeTraces.delete(trace.traceId)
    } catch (error) {
      throw new JaegerError(`Failed to finish trace ${trace.traceId}`, { cause: error })
    }
  }

  createSpan(trace: Trace, operationName: string, parentSpan?: Span): Span {
    const spanId = this.generateSpanId()
    const startTime = new Date()

    const span: Span = {
      spanId,
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime,
      endTime: startTime,
      duration: 0,
      tags: {
        'service.name': this.config.serviceName,
        'trace.id': trace.traceId
      },
      logs: []
    }

    // Add span to trace
    trace.spans.push(span)

    return span
  }

  finishSpan(span: Span): void {
    if (!span.endTime || span.endTime === span.startTime) {
      span.endTime = new Date()
      span.duration = span.endTime.getTime() - span.startTime.getTime()
    }

    // Notify callbacks
    this.spanFinishedCallbacks.forEach(callback => {
      try {
        callback(span)
      } catch (error) {
        console.error('Error in span finished callback:', error)
      }
    })
  }

  injectContext(span: Span): any {
    // Create context for propagation (e.g., HTTP headers)
    return {
      'uber-trace-id': `${span.traceId}:${span.spanId}:0:1`,
      'jaeger-debug-id': span.spanId,
      'jaeger-baggage': this.serializeBaggage(span.tags)
    }
  }

  extractContext(carrier: any): any {
    // Extract context from carrier (e.g., HTTP headers)
    const traceHeader = carrier['uber-trace-id'] || carrier['x-trace-id']
    if (!traceHeader) {
      return null
    }

    const parts = traceHeader.split(':')
    if (parts.length < 4) {
      return null
    }

    return {
      traceId: parts[0],
      spanId: parts[1],
      parentSpanId: parts[2],
      flags: parseInt(parts[3], 10)
    }
  }

  // Span manipulation methods
  setSpanTag(span: Span, key: string, value: any): void {
    span.tags[key] = value
  }

  logSpanEvent(span: Span, event: string, payload?: any): void {
    const log: SpanLog = {
      timestamp: new Date(),
      fields: {
        event,
        ...payload
      }
    }
    span.logs.push(log)
  }

  setSpanError(span: Span, error: Error): void {
    this.setSpanTag(span, 'error', true)
    this.setSpanTag(span, 'error.kind', error.name)
    this.setSpanTag(span, 'error.message', error.message)
    
    this.logSpanEvent(span, 'error', {
      'error.object': error.toString(),
      'error.stack': error.stack
    })
  }

  // Callback registration
  onSpanFinished(callback: (span: Span) => void): void {
    this.spanFinishedCallbacks.push(callback)
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      // Check Jaeger agent connectivity
      const response = await fetch(`${this.config.endpoint}/api/services`, {
        method: 'GET',
        timeout: 5000
      } as any)

      if (!response.ok) {
        throw new Error(`Jaeger health check failed: ${response.status}`)
      }

      return {
        status: 'healthy',
        checks: [{
          name: 'jaeger-connection',
          status: 'pass',
          duration: 0
        }],
        lastUpdated: new Date()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: [{
          name: 'jaeger-connection',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: 0
        }],
        lastUpdated: new Date()
      }
    }
  }

  private async initializeTracer(): Promise<void> {
    // In a real implementation, this would initialize the Jaeger tracer
    // with proper configuration for sampling, reporting, etc.
    console.debug(`Initializing Jaeger tracer for service: ${this.config.serviceName}`)
  }

  private startReporter(): void {
    // Start periodic reporting of traces
    this.reporterInterval = setInterval(async () => {
      await this.flushTraces()
    }, this.config.reporter.flushInterval)
  }

  private async flushTraces(): Promise<void> {
    const tracesToFlush = Array.from(this.activeTraces.values())
      .filter(trace => this.shouldFlushTrace(trace))

    for (const trace of tracesToFlush) {
      try {
        await this.reportTrace(trace)
        this.activeTraces.delete(trace.traceId)
      } catch (error) {
        console.error(`Failed to flush trace ${trace.traceId}:`, error)
      }
    }
  }

  private shouldFlushTrace(trace: Trace): boolean {
    // Flush traces that are older than 30 seconds or have finished spans
    const age = Date.now() - trace.startTime.getTime()
    const hasFinishedSpans = trace.spans.some(span => span.endTime !== span.startTime)
    
    return age > 30000 || hasFinishedSpans
  }

  private async reportTrace(trace: Trace): Promise<void> {
    try {
      const jaegerTrace = this.convertToJaegerFormat(trace)
      
      // In a real implementation, this would send the trace to Jaeger
      if (this.config.reporter.logSpans) {
        console.debug('Reporting trace to Jaeger:', {
          traceId: trace.traceId,
          spanCount: trace.spans.length,
          duration: trace.duration
        })
      }

      // Simulate sending to Jaeger endpoint
      await this.sendToJaeger(jaegerTrace)
    } catch (error) {
      throw new JaegerError(`Failed to report trace ${trace.traceId}`, { cause: error })
    }
  }

  private convertToJaegerFormat(trace: Trace): any {
    return {
      traceID: trace.traceId,
      spans: trace.spans.map(span => ({
        traceID: trace.traceId,
        spanID: span.spanId,
        parentSpanID: span.parentSpanId || '',
        operationName: span.operationName,
        startTime: span.startTime.getTime() * 1000, // microseconds
        duration: span.duration * 1000, // microseconds
        tags: Object.entries(span.tags).map(([key, value]) => ({
          key,
          type: typeof value === 'string' ? 'string' : 'number',
          value: value.toString()
        })),
        logs: span.logs.map(log => ({
          timestamp: log.timestamp.getTime() * 1000,
          fields: Object.entries(log.fields).map(([key, value]) => ({
            key,
            value: value.toString()
          }))
        })),
        process: {
          serviceName: this.config.serviceName,
          tags: []
        }
      }))
    }
  }

  private async sendToJaeger(trace: any): Promise<void> {
    // In a real implementation, this would send the trace to Jaeger
    // using the appropriate protocol (HTTP, UDP, gRPC)
    
    const endpoint = `${this.config.endpoint}/api/traces`
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trace)
      })

      if (!response.ok) {
        throw new Error(`Failed to send trace to Jaeger: ${response.status}`)
      }
    } catch (error) {
      // In case of network errors, we might want to queue for retry
      throw new JaegerError('Failed to send trace to Jaeger', { cause: error })
    }
  }

  private generateTraceId(): string {
    // Generate a 128-bit trace ID
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  private generateSpanId(): string {
    // Generate a 64-bit span ID
    return Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  private serializeBaggage(tags: Record<string, any>): string {
    // Serialize baggage for context propagation
    return Object.entries(tags)
      .filter(([key]) => key.startsWith('baggage.'))
      .map(([key, value]) => `${key.replace('baggage.', '')}=${encodeURIComponent(value)}`)
      .join(',')
  }

  async shutdown(): Promise<void> {
    if (this.reporterInterval) {
      clearInterval(this.reporterInterval)
      this.reporterInterval = null
    }

    // Flush all remaining traces
    await this.flushTraces()
    
    this.isInitialized = false
  }
}

// Utility functions for creating instrumented functions
export function instrumentFunction<T extends (...args: any[]) => any>(
  tracer: JaegerDistributedTracer,
  operationName: string,
  fn: T
): T {
  return ((...args: any[]) => {
    const trace = tracer.startTrace(operationName)
    const span = trace.spans[0]

    try {
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result
          .then(value => {
            tracer.finishSpan(span)
            tracer.finishTrace(trace)
            return value
          })
          .catch(error => {
            tracer.setSpanError(span, error)
            tracer.finishSpan(span)
            tracer.finishTrace(trace)
            throw error
          })
      } else {
        tracer.finishSpan(span)
        tracer.finishTrace(trace)
        return result
      }
    } catch (error) {
      tracer.setSpanError(span, error as Error)
      tracer.finishSpan(span)
      tracer.finishTrace(trace)
      throw error
    }
  }) as T
}

export function instrumentAsyncFunction<T extends (...args: any[]) => Promise<any>>(
  tracer: JaegerDistributedTracer,
  operationName: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const trace = tracer.startTrace(operationName)
    const span = trace.spans[0]

    try {
      const result = await fn(...args)
      tracer.finishSpan(span)
      await tracer.finishTrace(trace)
      return result
    } catch (error) {
      tracer.setSpanError(span, error as Error)
      tracer.finishSpan(span)
      await tracer.finishTrace(trace)
      throw error
    }
  }) as T
}

export class JaegerError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message)
    this.name = 'JaegerError'
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}