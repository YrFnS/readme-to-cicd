/**
 * Container Orchestrator Tests
 * Comprehensive tests for container orchestration scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContainerOrchestrator, OrchestrationConfig } from '../../../src/integration/deployment/orchestration/container-orchestrator';
import { DeploymentConfig } from '../../../src/integration/deployment/types/deployment-types';

describe('ContainerOrchestrator', () => {
  let orchestrator: ContainerOrchestrator;
  let mockDockerManager: any;
  let mockKubernetesManager: any;

  beforeEach(() => {
    // Create mock deployment managers
    mockDockerManager = {
      deploy: vi.fn().mockResolvedValue({
        success: true,
        deploymentId: 'test-deployment',
        status: { phase: 'Running', replicas: { desired: 1, current: 1, ready: 1, available: 1, unavailable: 0 } },
        message: 'Deployment successful',
        timestamp: new Date()
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        deploymentId: 'test-deployment',
        status: { phase: 'Running', replicas: { desired: 1, current: 1, ready: 1, available: 1, unavailable: 0 } },
        message: 'Update successful',
        timestamp: new Date()
      }),
      scale: vi.fn().mockResolvedValue({
        success: true,
        deploymentId: 'test-deployment',
        status: { phase: 'Running', replicas: { desired: 2, current: 2, ready: 2, available: 2, unavailable: 0 } },
        message: 'Scaling successful',
        timestamp: new Date()
      }),
      getStatus: vi.fn().mockResolvedValue({
        phase: 'Running',
        replicas: { desired: 1, current: 1, ready: 1, available: 1, unavailable: 0 },
        conditions: [],
        lastUpdated: new Date(),
        readyReplicas: 1,
        availableReplicas: 1
      }),
      delete: vi.fn().mockResolvedValue(undefined)
    };

    mockKubernetesManager = {
      deploy: vi.fn().mockResolvedValue({
        success: true,
        deploymentId: 'test-deployment',
        status: { phase: 'Running', replicas: { desired: 1, current: 1, ready: 1, available: 1, unavailable: 0 } },
        message: 'Deployment successful',
        timestamp: new Date()
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        deploymentId: 'test-deployment',
        status: { phase: 'Running', replicas: { desired: 1, current: 1, ready: 1, available: 1, unavailable: 0 } },
        message: 'Update successful',
        timestamp: new Date()
      }),
      scale: vi.fn().mockResolvedValue({
        success: true,
        deploymentId: 'test-deployment',
        status: { phase: 'Running', replicas: { desired: 2, current: 2, ready: 2, available: 2, unavailable: 0 } },
        message: 'Scaling successful',
        timestamp: new Date()
      }),
      getStatus: vi.fn().mockResolvedValue({
        phase: 'Running',
        replicas: { desired: 1, current: 1, ready: 1, available: 1, unavailable: 0 },
        conditions: [],
        lastUpdated: new Date(),
        readyReplicas: 1,
        availableReplicas: 1
      }),
      delete: vi.fn().mockResolvedValue(undefined)
    };

    orchestrator = new ContainerOrchestrator();
    // Inject mock managers
    (orchestrator as any).dockerManager = mockDockerManager;
    (orchestrator as any).kubernetesManager = mockKubernetesManager;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('orchestrate', () => {
    it('should successfully orchestrate Docker deployments', async () => {
      const deployments: DeploymentConfig[] = [
        {
          id: 'web-app',
          name: 'web-app',
          image: 'nginx:latest',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 3 }
        },
        {
          id: 'api-app',
          name: 'api-app',
          image: 'node:16',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '200m', memory: '256Mi' },
            limits: { cpu: '1000m', memory: '1Gi' }
          },
          networking: {
            ports: [{ name: 'api', containerPort: 3000, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 5 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'docker',
        monitoring: {
          enabled: true,
          metrics: {
            prometheus: { enabled: true, retention: '7d', scrapeInterval: '15s', evaluationInterval: '15s' },
            customMetrics: []
          },
          logging: { driver: 'json-file' },
          tracing: { enabled: false, type: 'jaeger', endpoint: '', samplingRate: 0.1 },
          alerting: { enabled: true }
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(true);
      expect(result.deployments).toHaveLength(2);
      expect(result.deployments.every(d => d.success)).toBe(true);
      expect(result.monitoring).toBeDefined();
      expect(mockDockerManager.deploy).toHaveBeenCalledTimes(2);
    });

    it('should successfully orchestrate Kubernetes deployments', async () => {
      const deployments: DeploymentConfig[] = [
        {
          id: 'web-app',
          name: 'web-app',
          image: 'nginx:latest',
          version: '1.0.0',
          environment: 'production',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 3, maxReplicas: 10 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes',
        serviceMesh: {
          type: 'istio',
          enabled: true,
          mtls: true,
          tracing: true,
          metrics: true,
          policies: []
        },
        loadBalancer: {
          type: 'nginx',
          algorithm: 'round-robin',
          healthCheck: {
            enabled: true,
            path: '/health',
            interval: 30,
            timeout: 5,
            healthyThreshold: 2,
            unhealthyThreshold: 3
          }
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(true);
      expect(result.deployments).toHaveLength(1);
      expect(result.serviceMesh).toBeDefined();
      expect(result.serviceMesh?.installed).toBe(true);
      expect(result.serviceMesh?.version).toBe('1.18.0');
      expect(result.loadBalancer).toBeDefined();
      expect(mockKubernetesManager.deploy).toHaveBeenCalledTimes(1);
    });

    it('should handle orchestration with service mesh configuration', async () => {
      const deployments: DeploymentConfig[] = [
        {
          id: 'microservice-a',
          name: 'microservice-a',
          image: 'app-a:latest',
          version: '1.0.0',
          environment: 'production',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'grpc', containerPort: 9090, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 2, maxReplicas: 5 }
        },
        {
          id: 'microservice-b',
          name: 'microservice-b',
          image: 'app-b:latest',
          version: '1.0.0',
          environment: 'production',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '200m', memory: '256Mi' },
            limits: { cpu: '1000m', memory: '1Gi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 8080, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 2, maxReplicas: 8 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes',
        serviceMesh: {
          type: 'linkerd',
          enabled: true,
          mtls: true,
          tracing: true,
          metrics: true,
          policies: [
            {
              name: 'retry-policy',
              type: 'retry',
              rules: [
                {
                  match: [{ type: 'header', value: 'retry', operator: 'equals' }],
                  action: { type: 'retry', config: { attempts: 3, backoff: '1s' } }
                }
              ]
            }
          ]
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(true);
      expect(result.serviceMesh).toBeDefined();
      expect(result.serviceMesh?.type).toBe('linkerd');
      expect(result.serviceMesh?.policies).toContain('retry-policy');
      expect(result.serviceMesh?.metrics.services).toBe(2);
      expect(result.serviceMesh?.metrics.mtlsEnabled).toBe(true);
    });

    it('should handle orchestration failure', async () => {
      mockKubernetesManager.deploy.mockRejectedValue(new Error('Deployment failed'));

      const deployments: DeploymentConfig[] = [
        {
          id: 'failing-app',
          name: 'failing-app',
          image: 'invalid:image',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 1 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes'
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should validate orchestration configuration', async () => {
      const deployments: DeploymentConfig[] = [];

      const invalidConfig: OrchestrationConfig = {
        platform: 'invalid-platform' as any
      };

      const result = await orchestrator.orchestrate(deployments, invalidConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('Unsupported platform');
    });
  });

  describe('scaleOrchestration', () => {
    beforeEach(async () => {
      // Setup initial orchestration
      const deployments: DeploymentConfig[] = [
        {
          id: 'web-app',
          name: 'web-app',
          image: 'nginx:latest',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 5 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes'
      };

      await orchestrator.orchestrate(deployments, config);
      (orchestrator as any).orchestrations.set('test-orchestration', config);
    });

    it('should scale multiple deployments', async () => {
      const scalingConfig = {
        'web-app': 3,
        'api-app': 2
      };

      const result = await orchestrator.scaleOrchestration('test-orchestration', scalingConfig);

      expect(result.success).toBe(true);
      expect(result.deployments).toHaveLength(2);
      expect(mockKubernetesManager.scale).toHaveBeenCalledWith('web-app', 3);
      expect(mockKubernetesManager.scale).toHaveBeenCalledWith('api-app', 2);
    });

    it('should handle scaling failure', async () => {
      mockKubernetesManager.scale.mockRejectedValue(new Error('Scaling failed'));

      const scalingConfig = {
        'web-app': 3
      };

      const result = await orchestrator.scaleOrchestration('test-orchestration', scalingConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle non-existent orchestration', async () => {
      const scalingConfig = {
        'web-app': 3
      };

      const result = await orchestrator.scaleOrchestration('non-existent', scalingConfig);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Orchestration non-existent not found');
    });
  });

  describe('updateOrchestration', () => {
    beforeEach(async () => {
      // Setup initial orchestration
      const deployments: DeploymentConfig[] = [
        {
          id: 'web-app',
          name: 'web-app',
          image: 'nginx:1.0',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 5 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes'
      };

      await orchestrator.orchestrate(deployments, config);
      (orchestrator as any).orchestrations.set('test-orchestration', config);
    });

    it('should update multiple deployments', async () => {
      const updates = {
        'web-app': {
          image: 'nginx:2.0',
          version: '2.0.0'
        },
        'api-app': {
          image: 'node:18',
          version: '2.0.0'
        }
      };

      const result = await orchestrator.updateOrchestration('test-orchestration', updates);

      expect(result.success).toBe(true);
      expect(result.deployments).toHaveLength(2);
      expect(mockKubernetesManager.update).toHaveBeenCalledWith('web-app', updates['web-app']);
      expect(mockKubernetesManager.update).toHaveBeenCalledWith('api-app', updates['api-app']);
    });

    it('should handle update failure', async () => {
      mockKubernetesManager.update.mockRejectedValue(new Error('Update failed'));

      const updates = {
        'web-app': {
          image: 'nginx:2.0',
          version: '2.0.0'
        }
      };

      const result = await orchestrator.updateOrchestration('test-orchestration', updates);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('getOrchestrationStatus', () => {
    beforeEach(async () => {
      // Setup initial orchestration
      const deployments: DeploymentConfig[] = [
        {
          id: 'web-app',
          name: 'web-app',
          image: 'nginx:latest',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 5 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes'
      };

      await orchestrator.orchestrate(deployments, config);
      (orchestrator as any).orchestrations.set('test-orchestration', config);
    });

    it('should return orchestration status', async () => {
      const result = await orchestrator.getOrchestrationStatus('test-orchestration');

      expect(result.success).toBe(true);
      expect(result.deployments).toBeDefined();
    });

    it('should handle non-existent orchestration', async () => {
      const result = await orchestrator.getOrchestrationStatus('non-existent');

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Orchestration non-existent not found');
    });
  });

  describe('deleteOrchestration', () => {
    beforeEach(async () => {
      // Setup initial orchestration
      const deployments: DeploymentConfig[] = [
        {
          id: 'web-app',
          name: 'web-app',
          image: 'nginx:latest',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 5 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes'
      };

      await orchestrator.orchestrate(deployments, config);
      (orchestrator as any).orchestrations.set('test-orchestration', config);
    });

    it('should delete orchestration', async () => {
      await orchestrator.deleteOrchestration('test-orchestration');

      const orchestrations = (orchestrator as any).orchestrations;
      expect(orchestrations.has('test-orchestration')).toBe(false);
    });

    it('should handle deletion of non-existent orchestration', async () => {
      // Should not throw error
      await expect(orchestrator.deleteOrchestration('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('service mesh configuration', () => {
    it('should configure Istio service mesh', async () => {
      const deployments: DeploymentConfig[] = [
        {
          id: 'service-a',
          name: 'service-a',
          image: 'app:latest',
          version: '1.0.0',
          environment: 'production',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 8080, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 2, maxReplicas: 5 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes',
        serviceMesh: {
          type: 'istio',
          enabled: true,
          mtls: true,
          tracing: true,
          metrics: true,
          policies: [
            {
              name: 'circuit-breaker',
              type: 'circuit-breaker',
              rules: [
                {
                  match: [{ type: 'destination', value: 'service-a', operator: 'equals' }],
                  action: { type: 'circuit-breaker', config: { maxConnections: 100, maxRetries: 3 } }
                }
              ]
            }
          ]
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(true);
      expect(result.serviceMesh).toBeDefined();
      expect(result.serviceMesh?.type).toBe('istio');
      expect(result.serviceMesh?.metrics.mtlsEnabled).toBe(true);
      expect(result.serviceMesh?.policies).toContain('circuit-breaker');
    });

    it('should configure Linkerd service mesh', async () => {
      const deployments: DeploymentConfig[] = [
        {
          id: 'service-b',
          name: 'service-b',
          image: 'app:latest',
          version: '1.0.0',
          environment: 'production',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'grpc', containerPort: 9090, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 3 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes',
        serviceMesh: {
          type: 'linkerd',
          enabled: true,
          mtls: true,
          tracing: false,
          metrics: true,
          policies: []
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(true);
      expect(result.serviceMesh).toBeDefined();
      expect(result.serviceMesh?.type).toBe('linkerd');
      expect(result.serviceMesh?.version).toBe('2.14.0');
    });
  });

  describe('load balancer configuration', () => {
    it('should configure NGINX load balancer', async () => {
      const deployments: DeploymentConfig[] = [
        {
          id: 'web-service',
          name: 'web-service',
          image: 'nginx:latest',
          version: '1.0.0',
          environment: 'production',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 3, maxReplicas: 10 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes',
        loadBalancer: {
          type: 'nginx',
          algorithm: 'least-connections',
          healthCheck: {
            enabled: true,
            path: '/health',
            interval: 10,
            timeout: 3,
            healthyThreshold: 2,
            unhealthyThreshold: 3
          },
          stickySession: false,
          ssl: {
            enabled: true,
            protocols: ['TLSv1.2', 'TLSv1.3'],
            ciphers: ['ECDHE-RSA-AES256-GCM-SHA384']
          }
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(true);
      expect(result.loadBalancer).toBeDefined();
      expect(result.loadBalancer?.type).toBe('nginx');
      expect(result.loadBalancer?.endpoints).toHaveLength(1);
      expect(result.loadBalancer?.healthChecks).toHaveLength(1);
      expect(result.loadBalancer?.healthChecks[0].status).toBe('healthy');
    });
  });

  describe('monitoring configuration', () => {
    it('should setup comprehensive monitoring', async () => {
      const deployments: DeploymentConfig[] = [
        {
          id: 'monitored-app',
          name: 'monitored-app',
          image: 'app:latest',
          version: '1.0.0',
          environment: 'production',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 8080, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 2, maxReplicas: 5 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'kubernetes',
        monitoring: {
          enabled: true,
          metrics: {
            prometheus: {
              enabled: true,
              retention: '30d',
              scrapeInterval: '15s',
              evaluationInterval: '15s',
              rules: [
                {
                  name: 'high-cpu-usage',
                  expr: 'cpu_usage > 80',
                  for: '5m',
                  labels: { severity: 'warning' },
                  annotations: { summary: 'High CPU usage detected' }
                }
              ]
            },
            grafana: {
              enabled: true,
              dashboards: ['kubernetes-overview', 'application-metrics'],
              datasources: [
                {
                  name: 'prometheus',
                  type: 'prometheus',
                  url: 'http://prometheus:9090',
                  access: 'proxy'
                }
              ]
            },
            customMetrics: [
              {
                name: 'request_duration_seconds',
                type: 'histogram',
                help: 'Request duration in seconds',
                labels: ['method', 'endpoint']
              }
            ]
          },
          logging: {
            driver: 'json-file',
            centralized: {
              enabled: true,
              type: 'elk',
              endpoint: 'http://elasticsearch:9200'
            }
          },
          tracing: {
            enabled: true,
            type: 'jaeger',
            endpoint: 'http://jaeger:14268',
            samplingRate: 0.1
          },
          alerting: {
            enabled: true,
            alertmanager: {
              enabled: true,
              config: {
                global: {
                  smtp_smarthost: 'localhost:587'
                }
              }
            },
            notifications: [
              {
                type: 'slack',
                config: {
                  webhook_url: 'https://hooks.slack.com/services/...',
                  channel: '#alerts'
                }
              }
            ]
          }
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(true);
      expect(result.monitoring).toBeDefined();
      expect(result.monitoring?.prometheus).toBe(true);
      expect(result.monitoring?.grafana).toBe(true);
      expect(result.monitoring?.alertmanager).toBe(true);
      expect(result.monitoring?.dashboards).toContain('kubernetes-overview');
    });
  });

  describe('error handling and validation', () => {
    it('should validate service mesh configuration', async () => {
      const deployments: DeploymentConfig[] = [];

      const config: OrchestrationConfig = {
        platform: 'kubernetes',
        serviceMesh: {
          type: 'unsupported-mesh' as any,
          enabled: true
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Unsupported service mesh');
    });

    it('should validate load balancer configuration', async () => {
      const deployments: DeploymentConfig[] = [];

      const config: OrchestrationConfig = {
        platform: 'kubernetes',
        loadBalancer: {
          type: 'unsupported-lb' as any,
          algorithm: 'round-robin',
          healthCheck: {
            enabled: true,
            path: '/health',
            interval: 30,
            timeout: 5,
            healthyThreshold: 2,
            unhealthyThreshold: 3
          }
        }
      };

      const result = await orchestrator.orchestrate(deployments, config);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Unsupported load balancer');
    });

    it('should handle deployment manager selection', async () => {
      const deployments: DeploymentConfig[] = [
        {
          id: 'test-app',
          name: 'test-app',
          image: 'nginx:latest',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 1 }
        }
      ];

      // Test Docker platform
      let config: OrchestrationConfig = { platform: 'docker' };
      let result = await orchestrator.orchestrate(deployments, config);
      expect(result.success).toBe(true);
      expect(mockDockerManager.deploy).toHaveBeenCalled();

      // Reset mocks
      vi.clearAllMocks();

      // Test Kubernetes platform
      config = { platform: 'kubernetes' };
      result = await orchestrator.orchestrate(deployments, config);
      expect(result.success).toBe(true);
      expect(mockKubernetesManager.deploy).toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    it('should emit orchestration events', async () => {
      const orchestrationStartedSpy = vi.fn();
      const orchestrationCompletedSpy = vi.fn();

      orchestrator.on('orchestrationStarted', orchestrationStartedSpy);
      orchestrator.on('orchestrationCompleted', orchestrationCompletedSpy);

      const deployments: DeploymentConfig[] = [
        {
          id: 'test-app',
          name: 'test-app',
          image: 'nginx:latest',
          version: '1.0.0',
          environment: 'development',
          strategy: 'RollingUpdate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
          },
          healthCheck: {},
          scaling: { minReplicas: 1, maxReplicas: 1 }
        }
      ];

      const config: OrchestrationConfig = {
        platform: 'docker'
      };

      await orchestrator.orchestrate(deployments, config);

      expect(orchestrationStartedSpy).toHaveBeenCalledWith({
        deployments: 1,
        platform: 'docker'
      });
      expect(orchestrationCompletedSpy).toHaveBeenCalled();
    });
  });
});