/**
 * Kubernetes Deployment Manager
 * Handles Kubernetes deployment with Helm charts and custom resources
 */

import { EventEmitter } from 'events';
import { 
  DeploymentManager, 
  DeploymentConfig, 
  DeploymentResult, 
  DeploymentStatus,
  DeploymentUpdateConfig,
  LogOptions
} from '../types/deployment-types';
import {
  KubernetesDeploymentConfig,
  KubernetesMetadata,
  KubernetesDeploymentSpec,
  HelmChartConfig,
  CustomResourceConfig,
  KubernetesResourceStatus,
  KubernetesEvent
} from '../types/kubernetes-types';

export class KubernetesDeploymentManager extends EventEmitter implements DeploymentManager {
  private deployments: Map<string, KubernetesDeploymentConfig> = new Map();
  private kubernetesClient: any;
  private helmClient: any;

  constructor(kubeConfig?: string) {
    super();
    this.initializeClients(kubeConfig);
  }

  private initializeClients(kubeConfig?: string): void {
    try {
      // In a real implementation, this would initialize the Kubernetes client
      // For now, we'll create mock clients for type safety
      this.kubernetesClient = {
        apps: {
          v1: {
            createNamespacedDeployment: async (namespace: string, body: any) => ({ metadata: { name: body.metadata.name } }),
            readNamespacedDeployment: async (name: string, namespace: string) => ({ 
              metadata: { name, namespace },
              status: { replicas: 1, readyReplicas: 1, availableReplicas: 1 }
            }),
            patchNamespacedDeployment: async (name: string, namespace: string, body: any) => ({ metadata: { name } }),
            deleteNamespacedDeployment: async (name: string, namespace: string) => ({}),
            listNamespacedDeployment: async (namespace: string) => ({ items: [] })
          }
        },
        core: {
          v1: {
            createNamespacedService: async (namespace: string, body: any) => ({ metadata: { name: body.metadata.name } }),
            createNamespacedConfigMap: async (namespace: string, body: any) => ({ metadata: { name: body.metadata.name } }),
            createNamespacedSecret: async (namespace: string, body: any) => ({ metadata: { name: body.metadata.name } }),
            readNamespacedPodLog: async (name: string, namespace: string, options: any) => 'mock logs'
          }
        },
        networking: {
          v1: {
            createNamespacedIngress: async (namespace: string, body: any) => ({ metadata: { name: body.metadata.name } })
          }
        },
        autoscaling: {
          v2: {
            createNamespacedHorizontalPodAutoscaler: async (namespace: string, body: any) => ({ metadata: { name: body.metadata.name } })
          }
        }
      };

      this.helmClient = {
        install: async (releaseName: string, chart: string, values: any, options: any) => ({ name: releaseName }),
        upgrade: async (releaseName: string, chart: string, values: any, options: any) => ({ name: releaseName }),
        uninstall: async (releaseName: string, options: any) => ({ name: releaseName }),
        status: async (releaseName: string) => ({ status: 'deployed' }),
        list: async (options: any) => ([])
      };

    } catch (error) {
      console.warn('Kubernetes client initialization failed:', error);
      // Continue with mock clients for development
    }
  }

  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      this.emit('deploymentStarted', { deploymentId: config.id });

      // Convert generic deployment config to Kubernetes config
      const k8sConfig = this.convertToKubernetesConfig(config);

      // Deploy using Helm if chart is specified
      if (k8sConfig.helmChart) {
        return await this.deployWithHelm(config.id, k8sConfig.helmChart, k8sConfig);
      }

      // Deploy using native Kubernetes resources
      return await this.deployWithKubernetes(config.id, k8sConfig);

    } catch (error) {
      const result: DeploymentResult = {
        success: false,
        deploymentId: config.id,
        status: {
          phase: 'Failed',
          replicas: { desired: 0, current: 0, ready: 0, available: 0, unavailable: 1 },
          conditions: [{
            type: 'Available',
            status: 'False',
            reason: 'DeploymentFailed',
            message: error instanceof Error ? error.message : 'Unknown error',
            lastTransitionTime: new Date(),
            lastUpdateTime: new Date()
          }],
          lastUpdated: new Date(),
          readyReplicas: 0,
          availableReplicas: 0
        },
        message: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };

      this.emit('deploymentFailed', result);
      return result;
    }
  }

  async update(deploymentId: string, updateConfig: DeploymentUpdateConfig): Promise<DeploymentResult> {
    try {
      const existingConfig = this.deployments.get(deploymentId);
      if (!existingConfig) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      // Update the deployment
      const namespace = existingConfig.metadata.namespace || 'default';
      const deploymentName = existingConfig.metadata.name;

      // Prepare patch object
      const patchBody = {
        spec: {
          template: {
            spec: {
              containers: [{
                name: deploymentName,
                image: updateConfig.image || existingConfig.spec.template.spec.containers[0].image,
                resources: updateConfig.resources ? this.convertResources(updateConfig.resources) : undefined
              }]
            }
          }
        }
      };

      await this.kubernetesClient.apps.v1.patchNamespacedDeployment(
        deploymentName,
        namespace,
        patchBody,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
      );

      // Wait for rollout to complete
      await this.waitForRollout(deploymentName, namespace);

      const status = await this.getStatus(deploymentId);

      return {
        success: true,
        deploymentId,
        status,
        message: 'Update completed successfully',
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        deploymentId,
        status: await this.getStatus(deploymentId),
        message: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  async rollback(deploymentId: string, version?: string): Promise<DeploymentResult> {
    try {
      const config = this.deployments.get(deploymentId);
      if (!config) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      const namespace = config.metadata.namespace || 'default';
      const deploymentName = config.metadata.name;

      // If using Helm, rollback with Helm
      if (config.helmChart) {
        await this.helmClient.rollback(deploymentName, {
          revision: version ? parseInt(version) : undefined,
          namespace
        });
      } else {
        // Use kubectl rollout undo equivalent
        // In a real implementation, this would use the Kubernetes API to rollback
        const rollbackBody = {
          spec: {
            rollbackTo: {
              revision: version ? parseInt(version) : undefined
            }
          }
        };

        await this.kubernetesClient.apps.v1.patchNamespacedDeployment(
          deploymentName,
          namespace,
          rollbackBody
        );
      }

      // Wait for rollback to complete
      await this.waitForRollout(deploymentName, namespace);

      const status = await this.getStatus(deploymentId);

      return {
        success: true,
        deploymentId,
        status,
        message: `Rollback completed successfully`,
        timestamp: new Date(),
        rollbackInfo: {
          previousVersion: version || 'previous',
          rollbackReason: 'Manual rollback',
          rollbackTimestamp: new Date(),
          rollbackStrategy: 'gradual'
        }
      };

    } catch (error) {
      return {
        success: false,
        deploymentId,
        status: await this.getStatus(deploymentId),
        message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  async scale(deploymentId: string, replicas: number): Promise<DeploymentResult> {
    try {
      const config = this.deployments.get(deploymentId);
      if (!config) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      const namespace = config.metadata.namespace || 'default';
      const deploymentName = config.metadata.name;

      // Scale the deployment
      const scaleBody = {
        spec: {
          replicas
        }
      };

      await this.kubernetesClient.apps.v1.patchNamespacedDeployment(
        deploymentName,
        namespace,
        scaleBody
      );

      // Wait for scaling to complete
      await this.waitForRollout(deploymentName, namespace);

      const status = await this.getStatus(deploymentId);

      return {
        success: true,
        deploymentId,
        status,
        message: `Scaled to ${replicas} replicas successfully`,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        deploymentId,
        status: await this.getStatus(deploymentId),
        message: `Scaling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  async getStatus(deploymentId: string): Promise<DeploymentStatus> {
    try {
      const config = this.deployments.get(deploymentId);
      if (!config) {
        return {
          phase: 'Unknown',
          replicas: { desired: 0, current: 0, ready: 0, available: 0, unavailable: 0 },
          conditions: [],
          lastUpdated: new Date(),
          readyReplicas: 0,
          availableReplicas: 0
        };
      }

      const namespace = config.metadata.namespace || 'default';
      const deploymentName = config.metadata.name;

      const deployment = await this.kubernetesClient.apps.v1.readNamespacedDeployment(
        deploymentName,
        namespace
      );

      return this.convertKubernetesStatus(deployment.status);

    } catch (error) {
      return {
        phase: 'Unknown',
        replicas: { desired: 0, current: 0, ready: 0, available: 0, unavailable: 1 },
        conditions: [{
          type: 'Available',
          status: 'False',
          reason: 'StatusCheckFailed',
          message: error instanceof Error ? error.message : 'Unknown error',
          lastTransitionTime: new Date(),
          lastUpdateTime: new Date()
        }],
        lastUpdated: new Date(),
        readyReplicas: 0,
        availableReplicas: 0
      };
    }
  }

  async getLogs(deploymentId: string, options?: LogOptions): Promise<string[]> {
    try {
      const config = this.deployments.get(deploymentId);
      if (!config) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      const namespace = config.metadata.namespace || 'default';
      const deploymentName = config.metadata.name;

      // Get pods for the deployment
      const pods = await this.kubernetesClient.core.v1.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${deploymentName}`
      );

      const logs: string[] = [];

      // Get logs from all pods
      for (const pod of pods.items) {
        const podLogs = await this.kubernetesClient.core.v1.readNamespacedPodLog(
          pod.metadata.name,
          namespace,
          {
            container: options?.container,
            follow: options?.follow || false,
            previous: options?.previous || false,
            sinceSeconds: options?.sinceSeconds,
            sinceTime: options?.since?.toISOString(),
            timestamps: options?.timestamps || false,
            tailLines: options?.tailLines,
            limitBytes: options?.limitBytes
          }
        );

        logs.push(...podLogs.split('\n').filter((line: string) => line.trim()));
      }

      return logs;

    } catch (error) {
      throw new Error(`Failed to get logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(deploymentId: string): Promise<void> {
    try {
      const config = this.deployments.get(deploymentId);
      if (!config) {
        return; // Already deleted or never existed
      }

      const namespace = config.metadata.namespace || 'default';
      const deploymentName = config.metadata.name;

      // If using Helm, uninstall with Helm
      if (config.helmChart) {
        await this.helmClient.uninstall(deploymentName, { namespace });
      } else {
        // Delete Kubernetes resources
        await this.kubernetesClient.apps.v1.deleteNamespacedDeployment(
          deploymentName,
          namespace
        );

        // Delete associated resources (services, ingress, etc.)
        await this.deleteAssociatedResources(deploymentName, namespace);
      }

      // Remove from local storage
      this.deployments.delete(deploymentId);

      this.emit('deploymentDeleted', { deploymentId });

    } catch (error) {
      throw new Error(`Failed to delete deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Kubernetes-specific methods

  async deployWithHelm(deploymentId: string, helmConfig: HelmChartConfig, k8sConfig: KubernetesDeploymentConfig): Promise<DeploymentResult> {
    try {
      const releaseName = helmConfig.name || deploymentId;
      const namespace = helmConfig.namespace || 'default';

      // Install or upgrade Helm chart
      const existingRelease = await this.getHelmRelease(releaseName, namespace);
      
      if (existingRelease) {
        await this.helmClient.upgrade(releaseName, helmConfig.repository || helmConfig.name, helmConfig.values, {
          namespace,
          createNamespace: helmConfig.createNamespace,
          wait: helmConfig.wait,
          timeout: helmConfig.timeout,
          atomic: helmConfig.atomic,
          cleanupOnFail: helmConfig.cleanupOnFail,
          force: helmConfig.force,
          resetValues: helmConfig.resetValues,
          reuseValues: helmConfig.reuseValues
        });
      } else {
        await this.helmClient.install(releaseName, helmConfig.repository || helmConfig.name, helmConfig.values, {
          namespace,
          createNamespace: helmConfig.createNamespace,
          wait: helmConfig.wait,
          timeout: helmConfig.timeout,
          atomic: helmConfig.atomic,
          skipCrds: helmConfig.skipCrds,
          replace: helmConfig.replace,
          dependencyUpdate: helmConfig.dependencyUpdate
        });
      }

      // Store deployment configuration
      this.deployments.set(deploymentId, k8sConfig);

      const status = await this.getStatus(deploymentId);

      const result: DeploymentResult = {
        success: true,
        deploymentId,
        status,
        message: 'Helm deployment completed successfully',
        timestamp: new Date(),
        metadata: {
          releaseName,
          namespace,
          chart: helmConfig.name,
          version: helmConfig.version
        }
      };

      this.emit('deploymentCompleted', result);
      return result;

    } catch (error) {
      throw new Error(`Helm deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deployWithKubernetes(deploymentId: string, k8sConfig: KubernetesDeploymentConfig): Promise<DeploymentResult> {
    try {
      const namespace = k8sConfig.metadata.namespace || 'default';

      // Create namespace if it doesn't exist
      await this.ensureNamespace(namespace);

      // Create ConfigMaps and Secrets first
      await this.createConfigMaps(k8sConfig, namespace);
      await this.createSecrets(k8sConfig, namespace);

      // Create the deployment
      await this.kubernetesClient.apps.v1.createNamespacedDeployment(namespace, k8sConfig);

      // Create service if specified
      if (k8sConfig.spec.template.spec.containers[0].ports) {
        await this.createService(k8sConfig, namespace);
      }

      // Create ingress if specified
      await this.createIngress(k8sConfig, namespace);

      // Create HPA if scaling is configured
      await this.createHorizontalPodAutoscaler(k8sConfig, namespace);

      // Deploy custom resources if specified
      if (k8sConfig.customResources) {
        await this.deployCustomResources(k8sConfig.customResources, namespace);
      }

      // Store deployment configuration
      this.deployments.set(deploymentId, k8sConfig);

      // Wait for deployment to be ready
      await this.waitForRollout(k8sConfig.metadata.name, namespace);

      const status = await this.getStatus(deploymentId);

      const result: DeploymentResult = {
        success: true,
        deploymentId,
        status,
        message: 'Kubernetes deployment completed successfully',
        timestamp: new Date(),
        metadata: {
          namespace,
          deploymentName: k8sConfig.metadata.name
        }
      };

      this.emit('deploymentCompleted', result);
      return result;

    } catch (error) {
      throw new Error(`Kubernetes deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEvents(deploymentId: string): Promise<KubernetesEvent[]> {
    try {
      const config = this.deployments.get(deploymentId);
      if (!config) {
        return [];
      }

      const namespace = config.metadata.namespace || 'default';
      const deploymentName = config.metadata.name;

      // Get events related to the deployment
      const events = await this.kubernetesClient.core.v1.listNamespacedEvent(
        namespace,
        undefined,
        undefined,
        undefined,
        `involvedObject.name=${deploymentName}`
      );

      return events.items.map((event: any) => ({
        metadata: event.metadata,
        involvedObject: event.involvedObject,
        reason: event.reason,
        message: event.message,
        source: event.source,
        firstTimestamp: new Date(event.firstTimestamp),
        lastTimestamp: new Date(event.lastTimestamp),
        count: event.count,
        type: event.type
      }));

    } catch (error) {
      console.warn('Failed to get events:', error);
      return [];
    }
  }

  async getResourceStatus(deploymentId: string): Promise<KubernetesResourceStatus[]> {
    try {
      const config = this.deployments.get(deploymentId);
      if (!config) {
        return [];
      }

      const namespace = config.metadata.namespace || 'default';
      const deploymentName = config.metadata.name;

      const resources: KubernetesResourceStatus[] = [];

      // Get deployment status
      const deployment = await this.kubernetesClient.apps.v1.readNamespacedDeployment(
        deploymentName,
        namespace
      );
      resources.push({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: deployment.metadata,
        status: deployment.status
      });

      // Get service status if exists
      try {
        const service = await this.kubernetesClient.core.v1.readNamespacedService(
          deploymentName,
          namespace
        );
        resources.push({
          apiVersion: 'v1',
          kind: 'Service',
          metadata: service.metadata,
          status: service.status
        });
      } catch (error) {
        // Service might not exist
      }

      // Get ingress status if exists
      try {
        const ingress = await this.kubernetesClient.networking.v1.readNamespacedIngress(
          deploymentName,
          namespace
        );
        resources.push({
          apiVersion: 'networking.k8s.io/v1',
          kind: 'Ingress',
          metadata: ingress.metadata,
          status: ingress.status
        });
      } catch (error) {
        // Ingress might not exist
      }

      return resources;

    } catch (error) {
      console.warn('Failed to get resource status:', error);
      return [];
    }
  }

  // Private helper methods

  private convertToKubernetesConfig(config: DeploymentConfig): KubernetesDeploymentConfig {
    const metadata: KubernetesMetadata = {
      name: config.name,
      namespace: config.environment === 'production' ? 'production' : 'default',
      labels: {
        app: config.name,
        version: config.version,
        ...config.labels
      },
      annotations: config.annotations
    };

    const spec: KubernetesDeploymentSpec = {
      replicas: config.scaling.minReplicas,
      selector: {
        matchLabels: {
          app: config.name
        }
      },
      template: {
        metadata: {
          labels: {
            app: config.name,
            version: config.version
          }
        },
        spec: {
          containers: [{
            name: config.name,
            image: config.image,
            ports: config.networking.ports.map(port => ({
              containerPort: port.containerPort,
              protocol: port.protocol
            })),
            resources: this.convertResources(config.resources),
            env: this.convertEnvironmentVariables(config),
            livenessProbe: this.convertProbe(config.healthCheck.livenessProbe),
            readinessProbe: this.convertProbe(config.healthCheck.readinessProbe),
            startupProbe: this.convertProbe(config.healthCheck.startupProbe)
          }]
        }
      },
      strategy: {
        type: config.strategy === 'RollingUpdate' ? 'RollingUpdate' : 'Recreate',
        rollingUpdate: config.strategy === 'RollingUpdate' ? {
          maxUnavailable: '25%',
          maxSurge: '25%'
        } : undefined
      }
    };

    return {
      metadata,
      spec
    };
  }

  private convertResources(resources: any): any {
    return {
      requests: {
        cpu: resources.requests.cpu,
        memory: resources.requests.memory
      },
      limits: {
        cpu: resources.limits.cpu,
        memory: resources.limits.memory
      }
    };
  }

  private convertEnvironmentVariables(config: DeploymentConfig): any[] {
    // Convert environment variables from config
    return [];
  }

  private convertProbe(probe: any): any {
    if (!probe) return undefined;

    const k8sProbe: any = {
      initialDelaySeconds: probe.initialDelaySeconds,
      periodSeconds: probe.periodSeconds,
      timeoutSeconds: probe.timeoutSeconds,
      failureThreshold: probe.failureThreshold,
      successThreshold: probe.successThreshold
    };

    if (probe.type === 'http' && probe.httpGet) {
      k8sProbe.httpGet = {
        path: probe.httpGet.path,
        port: probe.httpGet.port,
        scheme: probe.httpGet.scheme || 'HTTP',
        httpHeaders: probe.httpGet.httpHeaders
      };
    } else if (probe.type === 'tcp' && probe.tcpSocket) {
      k8sProbe.tcpSocket = {
        port: probe.tcpSocket.port
      };
    } else if (probe.type === 'exec' && probe.exec) {
      k8sProbe.exec = {
        command: probe.exec.command
      };
    } else if (probe.type === 'grpc' && probe.grpc) {
      k8sProbe.grpc = {
        port: probe.grpc.port,
        service: probe.grpc.service
      };
    }

    return k8sProbe;
  }

  private convertKubernetesStatus(status: any): DeploymentStatus {
    const replicas = status.replicas || 0;
    const readyReplicas = status.readyReplicas || 0;
    const availableReplicas = status.availableReplicas || 0;
    const unavailableReplicas = status.unavailableReplicas || 0;

    let phase: DeploymentStatus['phase'] = 'Unknown';
    if (availableReplicas === replicas && replicas > 0) {
      phase = 'Running';
    } else if (replicas === 0) {
      phase = 'Succeeded';
    } else if (unavailableReplicas > 0) {
      phase = 'Pending';
    }

    return {
      phase,
      replicas: {
        desired: replicas,
        current: status.updatedReplicas || 0,
        ready: readyReplicas,
        available: availableReplicas,
        unavailable: unavailableReplicas
      },
      conditions: (status.conditions || []).map((condition: any) => ({
        type: condition.type,
        status: condition.status,
        reason: condition.reason,
        message: condition.message,
        lastTransitionTime: new Date(condition.lastTransitionTime),
        lastUpdateTime: new Date(condition.lastUpdateTime)
      })),
      lastUpdated: new Date(),
      readyReplicas,
      availableReplicas
    };
  }

  private async ensureNamespace(namespace: string): Promise<void> {
    try {
      await this.kubernetesClient.core.v1.readNamespace(namespace);
    } catch (error) {
      // Namespace doesn't exist, create it
      await this.kubernetesClient.core.v1.createNamespace({
        metadata: { name: namespace }
      });
    }
  }

  private async createConfigMaps(config: KubernetesDeploymentConfig, namespace: string): Promise<void> {
    // Create ConfigMaps if specified in the configuration
    // This would be implemented based on the specific configuration structure
  }

  private async createSecrets(config: KubernetesDeploymentConfig, namespace: string): Promise<void> {
    // Create Secrets if specified in the configuration
    // This would be implemented based on the specific configuration structure
  }

  private async createService(config: KubernetesDeploymentConfig, namespace: string): Promise<void> {
    const serviceSpec = {
      metadata: {
        name: config.metadata.name,
        namespace,
        labels: config.metadata.labels
      },
      spec: {
        selector: {
          app: config.metadata.name
        },
        ports: config.spec.template.spec.containers[0].ports?.map(port => ({
          name: `port-${port.containerPort}`,
          port: port.containerPort,
          targetPort: port.containerPort,
          protocol: port.protocol
        })) || [],
        type: 'ClusterIP'
      }
    };

    await this.kubernetesClient.core.v1.createNamespacedService(namespace, serviceSpec);
  }

  private async createIngress(config: KubernetesDeploymentConfig, namespace: string): Promise<void> {
    // Create Ingress if specified in the configuration
    // This would be implemented based on the specific ingress requirements
  }

  private async createHorizontalPodAutoscaler(config: KubernetesDeploymentConfig, namespace: string): Promise<void> {
    // Create HPA if scaling configuration is present
    // This would be implemented based on the scaling configuration
  }

  private async deployCustomResources(customResources: CustomResourceConfig[], namespace: string): Promise<void> {
    for (const resource of customResources) {
      // Deploy custom resources using the appropriate API
      // This would require dynamic client handling for different CRDs
    }
  }

  private async waitForRollout(deploymentName: string, namespace: string, timeoutSeconds: number = 300): Promise<void> {
    const startTime = Date.now();
    const timeout = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeout) {
      try {
        const deployment = await this.kubernetesClient.apps.v1.readNamespacedDeployment(
          deploymentName,
          namespace
        );

        const status = deployment.status;
        if (status.readyReplicas === status.replicas && status.replicas > 0) {
          return; // Rollout complete
        }

        // Check for failed conditions
        const failedCondition = status.conditions?.find((condition: any) => 
          condition.type === 'Progressing' && condition.status === 'False'
        );

        if (failedCondition) {
          throw new Error(`Rollout failed: ${failedCondition.message}`);
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw new Error(`Rollout timeout: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Continue waiting if not timeout
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    throw new Error('Rollout timeout');
  }

  private async getHelmRelease(releaseName: string, namespace: string): Promise<any> {
    try {
      return await this.helmClient.status(releaseName, { namespace });
    } catch (error) {
      return null; // Release doesn't exist
    }
  }

  private async deleteAssociatedResources(deploymentName: string, namespace: string): Promise<void> {
    try {
      // Delete service
      await this.kubernetesClient.core.v1.deleteNamespacedService(deploymentName, namespace);
    } catch (error) {
      // Service might not exist
    }

    try {
      // Delete ingress
      await this.kubernetesClient.networking.v1.deleteNamespacedIngress(deploymentName, namespace);
    } catch (error) {
      // Ingress might not exist
    }

    try {
      // Delete HPA
      await this.kubernetesClient.autoscaling.v2.deleteNamespacedHorizontalPodAutoscaler(deploymentName, namespace);
    } catch (error) {
      // HPA might not exist
    }
  }
}