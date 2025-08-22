import { EventEmitter } from 'events';
import { 
  ComponentDefinition, 
  ComponentCommunication, 
  MessageQueueConfig, 
  EventBusConfig, 
  APIGatewayConfig, 
  ServiceDiscoveryConfig 
} from './types';

/**
 * Component communication manager handles inter-component communication setup
 */
export class ComponentCommunicationManager extends EventEmitter {
  private readonly communicationConfigs = new Map<string, ComponentCommunication>();
  private readonly messageQueues = new Map<string, MessageQueueConnection>();
  private readonly eventBuses = new Map<string, EventBusConnection>();
  private readonly apiGateways = new Map<string, APIGatewayConnection>();
  private readonly serviceDiscovery = new Map<string, ServiceDiscoveryConnection>();

  constructor() {
    super();
  }

  /**
   * Setup communication for a component
   */
  async setupComponent(component: ComponentDefinition): Promise<void> {
    // Create default communication configuration based on component type
    const communication = this.createDefaultCommunication(component);
    
    await this.setup(communication);
    this.communicationConfigs.set(component.id, communication);

    this.emit('componentCommunicationSetup', { componentId: component.id });
  }

  /**
   * Setup inter-component communication
   */
  async setup(communication: ComponentCommunication): Promise<void> {
    try {
      // Setup message queue
      if (communication.messageQueue) {
        await this.setupMessageQueue(communication.messageQueue);
      }

      // Setup event bus
      if (communication.eventBus) {
        await this.setupEventBus(communication.eventBus);
      }

      // Setup API gateway
      if (communication.apiGateway) {
        await this.setupAPIGateway(communication.apiGateway);
      }

      // Setup service discovery
      if (communication.serviceDiscovery) {
        await this.setupServiceDiscovery(communication.serviceDiscovery);
      }

      this.emit('communicationSetup', { communication });

    } catch (error) {
      this.emit('communicationSetupFailed', { 
        communication, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Get communication configuration for a component
   */
  async getConfiguration(componentId: string): Promise<ComponentCommunication | null> {
    return this.communicationConfigs.get(componentId) || null;
  }

  /**
   * Update communication configuration
   */
  async updateConfiguration(componentId: string, communication: ComponentCommunication): Promise<void> {
    const existing = this.communicationConfigs.get(componentId);
    if (existing) {
      await this.cleanup(existing);
    }

    await this.setup(communication);
    this.communicationConfigs.set(componentId, communication);

    this.emit('communicationUpdated', { componentId, communication });
  }

  /**
   * Cleanup communication for a component
   */
  async cleanupComponent(componentId: string): Promise<void> {
    const communication = this.communicationConfigs.get(componentId);
    if (communication) {
      await this.cleanup(communication);
      this.communicationConfigs.delete(componentId);
    }

    this.emit('componentCommunicationCleanup', { componentId });
  }

  /**
   * Send message through message queue
   */
  async sendMessage(queueName: string, message: any, options?: { priority?: number; delay?: number }): Promise<void> {
    const queue = this.messageQueues.get(queueName);
    if (!queue) {
      throw new Error(`Message queue not found: ${queueName}`);
    }

    await queue.send(message, options);
    this.emit('messageSent', { queueName, message });
  }

  /**
   * Subscribe to message queue
   */
  async subscribeToQueue(queueName: string, handler: (message: any) => Promise<void>): Promise<void> {
    const queue = this.messageQueues.get(queueName);
    if (!queue) {
      throw new Error(`Message queue not found: ${queueName}`);
    }

    await queue.subscribe(handler);
    this.emit('queueSubscribed', { queueName });
  }

  /**
   * Publish event to event bus
   */
  async publishEvent(subject: string, event: any): Promise<void> {
    for (const [busName, bus] of this.eventBuses) {
      if (bus.hasSubject(subject)) {
        await bus.publish(subject, event);
        this.emit('eventPublished', { busName, subject, event });
      }
    }
  }

  /**
   * Subscribe to event bus
   */
  async subscribeToEvents(subject: string, handler: (event: any) => Promise<void>): Promise<void> {
    for (const [busName, bus] of this.eventBuses) {
      if (bus.hasSubject(subject)) {
        await bus.subscribe(subject, handler);
        this.emit('eventSubscribed', { busName, subject });
      }
    }
  }

  /**
   * Register service in service discovery
   */
  async registerService(serviceName: string, serviceInfo: any): Promise<void> {
    for (const [discoveryName, discovery] of this.serviceDiscovery) {
      await discovery.register(serviceName, serviceInfo);
      this.emit('serviceRegistered', { discoveryName, serviceName, serviceInfo });
    }
  }

  /**
   * Discover service
   */
  async discoverService(serviceName: string): Promise<any[]> {
    const services: any[] = [];
    
    for (const [discoveryName, discovery] of this.serviceDiscovery) {
      const discoveredServices = await discovery.discover(serviceName);
      services.push(...discoveredServices);
    }

    return services;
  }

  /**
   * Setup message queue
   */
  private async setupMessageQueue(config: MessageQueueConfig): Promise<void> {
    const queueId = `${config.type}-${config.connection.host}:${config.connection.port}`;
    
    if (this.messageQueues.has(queueId)) {
      return; // Already setup
    }

    const queue = this.createMessageQueueConnection(config);
    await queue.connect();
    
    this.messageQueues.set(queueId, queue);
  }

  /**
   * Setup event bus
   */
  private async setupEventBus(config: EventBusConfig): Promise<void> {
    const busId = `${config.type}-${config.connection.host}:${config.connection.port}`;
    
    if (this.eventBuses.has(busId)) {
      return; // Already setup
    }

    const bus = this.createEventBusConnection(config);
    await bus.connect();
    
    this.eventBuses.set(busId, bus);
  }

  /**
   * Setup API gateway
   */
  private async setupAPIGateway(config: APIGatewayConfig): Promise<void> {
    const gatewayId = `${config.type}`;
    
    if (this.apiGateways.has(gatewayId)) {
      return; // Already setup
    }

    const gateway = this.createAPIGatewayConnection(config);
    await gateway.setup();
    
    this.apiGateways.set(gatewayId, gateway);
  }

  /**
   * Setup service discovery
   */
  private async setupServiceDiscovery(config: ServiceDiscoveryConfig): Promise<void> {
    const discoveryId = `${config.type}-${config.connection.host}:${config.connection.port}`;
    
    if (this.serviceDiscovery.has(discoveryId)) {
      return; // Already setup
    }

    const discovery = this.createServiceDiscoveryConnection(config);
    await discovery.connect();
    
    this.serviceDiscovery.set(discoveryId, discovery);
  }

  /**
   * Create default communication configuration
   */
  private createDefaultCommunication(component: ComponentDefinition): ComponentCommunication {
    return {
      messageQueue: {
        type: 'redis',
        connection: {
          host: 'localhost',
          port: 6379,
          timeout: 5000
        },
        topics: [{
          name: `${component.id}-queue`,
          partitions: 1,
          replicationFactor: 1
        }],
        deadLetterQueue: {
          name: `${component.id}-dlq`,
          maxRetries: 3,
          retryDelay: 5000
        }
      },
      eventBus: {
        type: 'redis',
        connection: {
          host: 'localhost',
          port: 6379,
          timeout: 5000
        },
        subjects: [`${component.id}.*`, 'system.*']
      },
      apiGateway: {
        type: 'nginx',
        routes: [{
          path: `/${component.id}/*`,
          method: 'ANY',
          upstream: `${component.id}-service`
        }],
        middleware: [
          { name: 'cors', config: { origins: ['*'] } },
          { name: 'rate-limit', config: { requests: 100, window: '1m' } }
        ]
      },
      serviceDiscovery: {
        type: 'dns',
        connection: {
          host: 'localhost',
          port: 53,
          timeout: 3000
        },
        healthCheckInterval: 30000
      }
    };
  }

  /**
   * Create message queue connection
   */
  private createMessageQueueConnection(config: MessageQueueConfig): MessageQueueConnection {
    switch (config.type) {
      case 'redis':
        return new RedisMessageQueue(config);
      case 'rabbitmq':
        return new RabbitMQMessageQueue(config);
      case 'kafka':
        return new KafkaMessageQueue(config);
      case 'sqs':
        return new SQSMessageQueue(config);
      default:
        throw new Error(`Unsupported message queue type: ${config.type}`);
    }
  }

  /**
   * Create event bus connection
   */
  private createEventBusConnection(config: EventBusConfig): EventBusConnection {
    switch (config.type) {
      case 'redis':
        return new RedisEventBus(config);
      case 'nats':
        return new NATSEventBus(config);
      case 'kafka':
        return new KafkaEventBus(config);
      case 'eventbridge':
        return new EventBridgeEventBus(config);
      default:
        throw new Error(`Unsupported event bus type: ${config.type}`);
    }
  }

  /**
   * Create API gateway connection
   */
  private createAPIGatewayConnection(config: APIGatewayConfig): APIGatewayConnection {
    switch (config.type) {
      case 'nginx':
        return new NginxAPIGateway(config);
      case 'kong':
        return new KongAPIGateway(config);
      case 'envoy':
        return new EnvoyAPIGateway(config);
      case 'aws-api-gateway':
        return new AWSAPIGateway(config);
      default:
        throw new Error(`Unsupported API gateway type: ${config.type}`);
    }
  }

  /**
   * Create service discovery connection
   */
  private createServiceDiscoveryConnection(config: ServiceDiscoveryConfig): ServiceDiscoveryConnection {
    switch (config.type) {
      case 'dns':
        return new DNSServiceDiscovery(config);
      case 'consul':
        return new ConsulServiceDiscovery(config);
      case 'etcd':
        return new EtcdServiceDiscovery(config);
      case 'kubernetes':
        return new KubernetesServiceDiscovery(config);
      default:
        throw new Error(`Unsupported service discovery type: ${config.type}`);
    }
  }

  /**
   * Cleanup communication resources
   */
  private async cleanup(communication: ComponentCommunication): Promise<void> {
    // Cleanup is handled by individual connection classes
    // In a real implementation, this would properly cleanup resources
  }

  /**
   * Shutdown communication manager
   */
  async shutdown(): Promise<void> {
    // Disconnect all connections
    for (const queue of this.messageQueues.values()) {
      await queue.disconnect();
    }

    for (const bus of this.eventBuses.values()) {
      await bus.disconnect();
    }

    for (const gateway of this.apiGateways.values()) {
      await gateway.shutdown();
    }

    for (const discovery of this.serviceDiscovery.values()) {
      await discovery.disconnect();
    }

    this.removeAllListeners();
  }
}

// Connection interfaces and implementations (simplified for demo)

interface MessageQueueConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: any, options?: any): Promise<void>;
  subscribe(handler: (message: any) => Promise<void>): Promise<void>;
}

interface EventBusConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(subject: string, event: any): Promise<void>;
  subscribe(subject: string, handler: (event: any) => Promise<void>): Promise<void>;
  hasSubject(subject: string): boolean;
}

interface APIGatewayConnection {
  setup(): Promise<void>;
  shutdown(): Promise<void>;
}

interface ServiceDiscoveryConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  register(serviceName: string, serviceInfo: any): Promise<void>;
  discover(serviceName: string): Promise<any[]>;
}

// Simplified implementations for demo purposes

class RedisMessageQueue implements MessageQueueConnection {
  constructor(private config: MessageQueueConfig) {}
  
  async connect(): Promise<void> {
    // Simulate connection
    await this.sleep(100);
  }
  
  async disconnect(): Promise<void> {
    await this.sleep(50);
  }
  
  async send(message: any, options?: any): Promise<void> {
    await this.sleep(10);
  }
  
  async subscribe(handler: (message: any) => Promise<void>): Promise<void> {
    await this.sleep(10);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class RabbitMQMessageQueue implements MessageQueueConnection {
  constructor(private config: MessageQueueConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async send(message: any, options?: any): Promise<void> { await this.sleep(10); }
  async subscribe(handler: (message: any) => Promise<void>): Promise<void> { await this.sleep(10); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class KafkaMessageQueue implements MessageQueueConnection {
  constructor(private config: MessageQueueConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async send(message: any, options?: any): Promise<void> { await this.sleep(10); }
  async subscribe(handler: (message: any) => Promise<void>): Promise<void> { await this.sleep(10); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class SQSMessageQueue implements MessageQueueConnection {
  constructor(private config: MessageQueueConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async send(message: any, options?: any): Promise<void> { await this.sleep(10); }
  async subscribe(handler: (message: any) => Promise<void>): Promise<void> { await this.sleep(10); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class RedisEventBus implements EventBusConnection {
  constructor(private config: EventBusConfig) {}
  
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async publish(subject: string, event: any): Promise<void> { await this.sleep(10); }
  async subscribe(subject: string, handler: (event: any) => Promise<void>): Promise<void> { await this.sleep(10); }
  
  hasSubject(subject: string): boolean {
    return this.config.subjects.some(s => this.matchSubject(s, subject));
  }
  
  private matchSubject(pattern: string, subject: string): boolean {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(subject);
  }
  
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class NATSEventBus implements EventBusConnection {
  constructor(private config: EventBusConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async publish(subject: string, event: any): Promise<void> { await this.sleep(10); }
  async subscribe(subject: string, handler: (event: any) => Promise<void>): Promise<void> { await this.sleep(10); }
  hasSubject(subject: string): boolean { return this.config.subjects.includes(subject); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class KafkaEventBus implements EventBusConnection {
  constructor(private config: EventBusConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async publish(subject: string, event: any): Promise<void> { await this.sleep(10); }
  async subscribe(subject: string, handler: (event: any) => Promise<void>): Promise<void> { await this.sleep(10); }
  hasSubject(subject: string): boolean { return this.config.subjects.includes(subject); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class EventBridgeEventBus implements EventBusConnection {
  constructor(private config: EventBusConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async publish(subject: string, event: any): Promise<void> { await this.sleep(10); }
  async subscribe(subject: string, handler: (event: any) => Promise<void>): Promise<void> { await this.sleep(10); }
  hasSubject(subject: string): boolean { return this.config.subjects.includes(subject); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class NginxAPIGateway implements APIGatewayConnection {
  constructor(private config: APIGatewayConfig) {}
  async setup(): Promise<void> { await this.sleep(200); }
  async shutdown(): Promise<void> { await this.sleep(100); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class KongAPIGateway implements APIGatewayConnection {
  constructor(private config: APIGatewayConfig) {}
  async setup(): Promise<void> { await this.sleep(200); }
  async shutdown(): Promise<void> { await this.sleep(100); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class EnvoyAPIGateway implements APIGatewayConnection {
  constructor(private config: APIGatewayConfig) {}
  async setup(): Promise<void> { await this.sleep(200); }
  async shutdown(): Promise<void> { await this.sleep(100); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class AWSAPIGateway implements APIGatewayConnection {
  constructor(private config: APIGatewayConfig) {}
  async setup(): Promise<void> { await this.sleep(200); }
  async shutdown(): Promise<void> { await this.sleep(100); }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class DNSServiceDiscovery implements ServiceDiscoveryConnection {
  constructor(private config: ServiceDiscoveryConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async register(serviceName: string, serviceInfo: any): Promise<void> { await this.sleep(50); }
  async discover(serviceName: string): Promise<any[]> { await this.sleep(30); return []; }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class ConsulServiceDiscovery implements ServiceDiscoveryConnection {
  constructor(private config: ServiceDiscoveryConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async register(serviceName: string, serviceInfo: any): Promise<void> { await this.sleep(50); }
  async discover(serviceName: string): Promise<any[]> { await this.sleep(30); return []; }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class EtcdServiceDiscovery implements ServiceDiscoveryConnection {
  constructor(private config: ServiceDiscoveryConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async register(serviceName: string, serviceInfo: any): Promise<void> { await this.sleep(50); }
  async discover(serviceName: string): Promise<any[]> { await this.sleep(30); return []; }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class KubernetesServiceDiscovery implements ServiceDiscoveryConnection {
  constructor(private config: ServiceDiscoveryConfig) {}
  async connect(): Promise<void> { await this.sleep(100); }
  async disconnect(): Promise<void> { await this.sleep(50); }
  async register(serviceName: string, serviceInfo: any): Promise<void> { await this.sleep(50); }
  async discover(serviceName: string): Promise<any[]> { await this.sleep(30); return []; }
  private sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}