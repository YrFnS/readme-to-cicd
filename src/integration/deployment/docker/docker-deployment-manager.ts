/**
 * Docker Deployment Manager
 * Handles Docker container deployment with multi-stage builds and optimization
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
  DockerDeploymentConfig,
  DockerContainerInfo,
  DockerStats,
  DockerComposeConfig
} from '../types/docker-types';

export class DockerDeploymentManager extends EventEmitter implements DeploymentManager {
  private containers: Map<string, DockerContainerInfo> = new Map();
  private deployments: Map<string, DeploymentConfig> = new Map();

  constructor(private dockerClient?: any) {
    super();
    // Initialize Docker client if not provided
    if (!this.dockerClient) {
      this.initializeDockerClient();
    }
  }

  private initializeDockerClient(): void {
    try {
      // In a real implementation, this would initialize the Docker client
      // For now, we'll create a mock client for type safety
      this.dockerClient = {
        createContainer: async (options: any) => ({ id: 'mock-container-id' }),
        getContainer: (id: string) => ({
          start: async () => {},
          stop: async () => {},
          remove: async () => {},
          inspect: async () => ({ Id: id, State: { Status: 'running' } }),
          logs: async () => 'mock logs',
          stats: async () => ({ cpu_stats: {}, memory_stats: {} })
        }),
        listContainers: async () => [],
        buildImage: async () => 'mock-image-id',
        getImage: (name: string) => ({
          inspect: async () => ({ Id: 'mock-image-id' }),
          remove: async () => {}
        })
      };
    } catch (error) {
      console.warn('Docker client initialization failed:', error);
      // Continue with mock client for development
    }
  }

  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      this.emit('deploymentStarted', { deploymentId: config.id });

      // Validate configuration
      await this.validateDeploymentConfig(config);

      // Build image if build configuration is provided
      let imageId: string;
      const dockerConfig = config as DeploymentConfig & { docker?: DockerDeploymentConfig };
      
      if (dockerConfig.docker?.build) {
        imageId = await this.buildImage(config.id, dockerConfig.docker.build);
      } else {
        imageId = config.image;
      }

      // Create and start container
      const containerInfo = await this.createContainer(config, imageId);
      await this.startContainer(containerInfo.id);

      // Store deployment information
      this.deployments.set(config.id, config);
      this.containers.set(config.id, containerInfo);

      const result: DeploymentResult = {
        success: true,
        deploymentId: config.id,
        status: await this.getContainerStatus(containerInfo.id),
        message: 'Deployment completed successfully',
        timestamp: new Date(),
        metadata: {
          containerId: containerInfo.id,
          imageId,
          strategy: config.strategy
        }
      };

      this.emit('deploymentCompleted', result);
      return result;

    } catch (error) {
      const result: DeploymentResult = {
        success: false,
        deploymentId: config.id,
        status: {
          phase: 'Failed',
          replicas: { desired: 1, current: 0, ready: 0, available: 0, unavailable: 1 },
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

      // Merge update configuration with existing configuration
      const updatedConfig: DeploymentConfig = {
        ...existingConfig,
        ...updateConfig,
        version: updateConfig.version || existingConfig.version
      };

      // Perform rolling update based on strategy
      switch (existingConfig.strategy) {
        case 'RollingUpdate':
          return await this.performRollingUpdate(deploymentId, updatedConfig);
        case 'Recreate':
          return await this.performRecreateUpdate(deploymentId, updatedConfig);
        case 'BlueGreen':
          return await this.performBlueGreenUpdate(deploymentId, updatedConfig);
        default:
          return await this.performRecreateUpdate(deploymentId, updatedConfig);
      }

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
      const container = this.containers.get(deploymentId);
      if (!container) {
        throw new Error(`Container for deployment ${deploymentId} not found`);
      }

      // Stop current container
      await this.dockerClient.getContainer(container.id).stop();

      // Get previous version or specified version
      const rollbackVersion = version || await this.getPreviousVersion(deploymentId);
      
      // Create new container with rollback version
      const config = this.deployments.get(deploymentId);
      if (!config) {
        throw new Error(`Deployment configuration for ${deploymentId} not found`);
      }

      const rollbackConfig = { ...config, version: rollbackVersion };
      const newContainer = await this.createContainer(rollbackConfig, rollbackConfig.image);
      await this.startContainer(newContainer.id);

      // Update container reference
      this.containers.set(deploymentId, newContainer);

      // Remove old container
      await this.dockerClient.getContainer(container.id).remove();

      return {
        success: true,
        deploymentId,
        status: await this.getContainerStatus(newContainer.id),
        message: `Rollback to version ${rollbackVersion} completed successfully`,
        timestamp: new Date(),
        rollbackInfo: {
          previousVersion: container.image,
          rollbackReason: 'Manual rollback',
          rollbackTimestamp: new Date(),
          rollbackStrategy: 'immediate'
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

      // For Docker (non-swarm), scaling means creating/removing containers
      const currentContainer = this.containers.get(deploymentId);
      
      if (replicas === 0 && currentContainer) {
        // Scale down to 0 - stop and remove container
        await this.dockerClient.getContainer(currentContainer.id).stop();
        await this.dockerClient.getContainer(currentContainer.id).remove();
        this.containers.delete(deploymentId);
      } else if (replicas === 1 && !currentContainer) {
        // Scale up to 1 - create and start container
        const newContainer = await this.createContainer(config, config.image);
        await this.startContainer(newContainer.id);
        this.containers.set(deploymentId, newContainer);
      } else if (replicas > 1) {
        // For multiple replicas, would need Docker Swarm or Compose
        throw new Error('Multiple replicas require Docker Swarm mode or Docker Compose');
      }

      return {
        success: true,
        deploymentId,
        status: await this.getStatus(deploymentId),
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
      const container = this.containers.get(deploymentId);
      if (!container) {
        return {
          phase: 'Unknown',
          replicas: { desired: 0, current: 0, ready: 0, available: 0, unavailable: 0 },
          conditions: [],
          lastUpdated: new Date(),
          readyReplicas: 0,
          availableReplicas: 0
        };
      }

      return await this.getContainerStatus(container.id);

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
      const container = this.containers.get(deploymentId);
      if (!container) {
        throw new Error(`Container for deployment ${deploymentId} not found`);
      }

      const logOptions = {
        follow: options?.follow || false,
        stdout: true,
        stderr: true,
        timestamps: options?.timestamps || false,
        tail: options?.tailLines || 100,
        since: options?.since?.getTime() || 0
      };

      const logs = await this.dockerClient.getContainer(container.id).logs(logOptions);
      return logs.toString().split('\n').filter((line: string) => line.trim());

    } catch (error) {
      throw new Error(`Failed to get logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(deploymentId: string): Promise<void> {
    try {
      const container = this.containers.get(deploymentId);
      if (container) {
        // Stop and remove container
        try {
          await this.dockerClient.getContainer(container.id).stop();
        } catch (error) {
          // Container might already be stopped
          console.warn(`Failed to stop container ${container.id}:`, error);
        }

        await this.dockerClient.getContainer(container.id).remove();
        this.containers.delete(deploymentId);
      }

      // Remove deployment configuration
      this.deployments.delete(deploymentId);

      this.emit('deploymentDeleted', { deploymentId });

    } catch (error) {
      throw new Error(`Failed to delete deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Docker-specific methods

  async buildImage(deploymentId: string, buildConfig: any): Promise<string> {
    try {
      const buildOptions = {
        context: buildConfig.context,
        dockerfile: buildConfig.dockerfile || 'Dockerfile',
        buildargs: buildConfig.args || {},
        labels: buildConfig.labels || {},
        target: buildConfig.target,
        cachefrom: buildConfig.cacheFrom || [],
        platform: buildConfig.platforms?.[0] // Use first platform if multiple
      };

      const stream = await this.dockerClient.buildImage(buildOptions);
      
      // In a real implementation, you would parse the stream for the image ID
      // For now, return a mock image ID
      return `${deploymentId}-image:latest`;

    } catch (error) {
      throw new Error(`Image build failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getContainerStats(deploymentId: string): Promise<DockerStats> {
    try {
      const container = this.containers.get(deploymentId);
      if (!container) {
        throw new Error(`Container for deployment ${deploymentId} not found`);
      }

      const stats = await this.dockerClient.getContainer(container.id).stats({ stream: false });
      
      return {
        containerId: container.id,
        name: container.name,
        cpu: {
          usage: this.calculateCpuUsage(stats),
          systemUsage: stats.cpu_stats?.system_cpu_usage || 0,
          onlineCpus: stats.cpu_stats?.online_cpus || 1,
          throttledTime: stats.cpu_stats?.throttling_data?.throttled_time || 0
        },
        memory: {
          usage: stats.memory_stats?.usage || 0,
          limit: stats.memory_stats?.limit || 0,
          cache: stats.memory_stats?.stats?.cache || 0,
          rss: stats.memory_stats?.stats?.rss || 0,
          swap: stats.memory_stats?.stats?.swap
        },
        network: this.extractNetworkStats(stats),
        blockIO: {
          read: this.calculateBlockIORead(stats),
          write: this.calculateBlockIOWrite(stats)
        },
        pids: stats.pids_stats?.current || 0,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to get container stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deployWithCompose(composeConfig: DockerComposeConfig, projectName: string): Promise<DeploymentResult[]> {
    try {
      // In a real implementation, this would use docker-compose
      // For now, return mock results
      const results: DeploymentResult[] = [];
      
      for (const [serviceName, serviceConfig] of Object.entries(composeConfig.services)) {
        const deploymentId = `${projectName}-${serviceName}`;
        
        // Create deployment config from compose service
        const deploymentConfig: DeploymentConfig = {
          id: deploymentId,
          name: serviceName,
          image: serviceConfig.image || `${projectName}-${serviceName}:latest`,
          version: 'latest',
          environment: 'development',
          strategy: 'Recreate',
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' }
          },
          networking: {
            ports: (serviceConfig.ports || []).map((port, index) => ({
              name: `port-${index}`,
              containerPort: typeof port === 'string' ? parseInt(port.split(':')[1] || port) : port.target,
              protocol: 'TCP'
            }))
          },
          healthCheck: {
            livenessProbe: serviceConfig.healthcheck ? {
              type: 'exec',
              exec: { command: Array.isArray(serviceConfig.healthcheck.test) ? serviceConfig.healthcheck.test : [serviceConfig.healthcheck.test] },
              initialDelaySeconds: 30,
              periodSeconds: 10,
              timeoutSeconds: 5,
              failureThreshold: 3,
              successThreshold: 1
            } : undefined
          },
          scaling: { minReplicas: 1, maxReplicas: 1 }
        };

        const result = await this.deploy(deploymentConfig);
        results.push(result);
      }

      return results;

    } catch (error) {
      throw new Error(`Compose deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private async validateDeploymentConfig(config: DeploymentConfig): Promise<void> {
    if (!config.id) {
      throw new Error('Deployment ID is required');
    }
    if (!config.name) {
      throw new Error('Deployment name is required');
    }
    if (!config.image) {
      throw new Error('Container image is required');
    }
  }

  private async createContainer(config: DeploymentConfig, imageId: string): Promise<DockerContainerInfo> {
    const containerOptions = {
      Image: imageId,
      name: `${config.name}-${config.version}`,
      Env: this.buildEnvironmentVariables(config),
      ExposedPorts: this.buildExposedPorts(config),
      HostConfig: {
        PortBindings: this.buildPortBindings(config),
        Memory: this.parseMemoryLimit(config.resources.limits.memory),
        CpuShares: this.parseCpuShares(config.resources.limits.cpu),
        RestartPolicy: { Name: 'unless-stopped' }
      },
      Labels: config.labels || {},
      Healthcheck: this.buildHealthcheck(config)
    };

    const container = await this.dockerClient.createContainer(containerOptions);
    
    return {
      id: container.id,
      name: containerOptions.name,
      image: imageId,
      status: 'created',
      state: 'created',
      ports: [],
      networks: {},
      mounts: [],
      labels: config.labels || {},
      created: new Date()
    };
  }

  private async startContainer(containerId: string): Promise<void> {
    await this.dockerClient.getContainer(containerId).start();
  }

  private async getContainerStatus(containerId: string): Promise<DeploymentStatus> {
    try {
      const containerInfo = await this.dockerClient.getContainer(containerId).inspect();
      const isRunning = containerInfo.State.Status === 'running';
      const isHealthy = containerInfo.State.Health?.Status === 'healthy' || !containerInfo.State.Health;

      return {
        phase: isRunning ? (isHealthy ? 'Running' : 'Running') : 'Failed',
        replicas: {
          desired: 1,
          current: isRunning ? 1 : 0,
          ready: isRunning && isHealthy ? 1 : 0,
          available: isRunning && isHealthy ? 1 : 0,
          unavailable: isRunning && isHealthy ? 0 : 1
        },
        conditions: [{
          type: 'Available',
          status: isRunning && isHealthy ? 'True' : 'False',
          reason: isRunning ? (isHealthy ? 'ContainerRunning' : 'ContainerUnhealthy') : 'ContainerStopped',
          message: `Container is ${containerInfo.State.Status}`,
          lastTransitionTime: new Date(containerInfo.State.StartedAt),
          lastUpdateTime: new Date()
        }],
        lastUpdated: new Date(),
        readyReplicas: isRunning && isHealthy ? 1 : 0,
        availableReplicas: isRunning && isHealthy ? 1 : 0
      };

    } catch (error) {
      return {
        phase: 'Unknown',
        replicas: { desired: 1, current: 0, ready: 0, available: 0, unavailable: 1 },
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

  private async performRollingUpdate(deploymentId: string, config: DeploymentConfig): Promise<DeploymentResult> {
    // For Docker standalone, rolling update is essentially recreate
    return await this.performRecreateUpdate(deploymentId, config);
  }

  private async performRecreateUpdate(deploymentId: string, config: DeploymentConfig): Promise<DeploymentResult> {
    // Stop and remove old container, create new one
    await this.delete(deploymentId);
    return await this.deploy(config);
  }

  private async performBlueGreenUpdate(deploymentId: string, config: DeploymentConfig): Promise<DeploymentResult> {
    // Create new container alongside old one, then switch
    const newConfig = { ...config, id: `${deploymentId}-green` };
    const result = await this.deploy(newConfig);
    
    if (result.success) {
      // Switch traffic (in real implementation, this would involve load balancer)
      await this.delete(deploymentId);
      
      // Rename green deployment to original
      this.deployments.set(deploymentId, config);
      this.deployments.delete(`${deploymentId}-green`);
      
      const greenContainer = this.containers.get(`${deploymentId}-green`);
      if (greenContainer) {
        this.containers.set(deploymentId, greenContainer);
        this.containers.delete(`${deploymentId}-green`);
      }
    }
    
    return { ...result, deploymentId };
  }

  private async getPreviousVersion(deploymentId: string): Promise<string> {
    // In a real implementation, this would track version history
    return 'previous';
  }

  private buildEnvironmentVariables(config: DeploymentConfig): string[] {
    // Build environment variables from config
    return [];
  }

  private buildExposedPorts(config: DeploymentConfig): Record<string, {}> {
    const exposedPorts: Record<string, {}> = {};
    config.networking.ports.forEach(port => {
      exposedPorts[`${port.containerPort}/${port.protocol.toLowerCase()}`] = {};
    });
    return exposedPorts;
  }

  private buildPortBindings(config: DeploymentConfig): Record<string, any[]> {
    const portBindings: Record<string, any[]> = {};
    config.networking.ports.forEach(port => {
      const key = `${port.containerPort}/${port.protocol.toLowerCase()}`;
      portBindings[key] = [{ HostPort: port.hostPort?.toString() || '' }];
    });
    return portBindings;
  }

  private parseMemoryLimit(memory: string): number {
    // Parse memory string like "512Mi" to bytes
    const match = memory.match(/^(\d+)([KMGT]?i?)$/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers: Record<string, number> = {
      '': 1,
      'Ki': 1024,
      'Mi': 1024 * 1024,
      'Gi': 1024 * 1024 * 1024,
      'Ti': 1024 * 1024 * 1024 * 1024
    };
    
    return value * (multipliers[unit] || 1);
  }

  private parseCpuShares(cpu: string): number {
    // Parse CPU string like "500m" to CPU shares
    if (cpu.endsWith('m')) {
      return parseInt(cpu.slice(0, -1));
    }
    return parseInt(cpu) * 1000;
  }

  private buildHealthcheck(config: DeploymentConfig): any {
    const healthCheck = config.healthCheck?.livenessProbe;
    if (!healthCheck) return undefined;

    if (healthCheck.type === 'http' && healthCheck.httpGet) {
      return {
        Test: ['CMD-SHELL', `curl -f http://localhost:${healthCheck.httpGet.port}${healthCheck.httpGet.path} || exit 1`],
        Interval: healthCheck.periodSeconds * 1000000000, // nanoseconds
        Timeout: healthCheck.timeoutSeconds * 1000000000,
        Retries: healthCheck.failureThreshold,
        StartPeriod: healthCheck.initialDelaySeconds * 1000000000
      };
    }

    if (healthCheck.type === 'exec' && healthCheck.exec) {
      return {
        Test: ['CMD-SHELL', ...healthCheck.exec.command],
        Interval: healthCheck.periodSeconds * 1000000000,
        Timeout: healthCheck.timeoutSeconds * 1000000000,
        Retries: healthCheck.failureThreshold,
        StartPeriod: healthCheck.initialDelaySeconds * 1000000000
      };
    }

    return undefined;
  }

  private calculateCpuUsage(stats: any): number {
    // Calculate CPU usage percentage from Docker stats
    const cpuDelta = stats.cpu_stats?.cpu_usage?.total_usage - stats.precpu_stats?.cpu_usage?.total_usage;
    const systemDelta = stats.cpu_stats?.system_cpu_usage - stats.precpu_stats?.system_cpu_usage;
    const onlineCpus = stats.cpu_stats?.online_cpus || 1;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * onlineCpus * 100;
    }
    return 0;
  }

  private extractNetworkStats(stats: any): Record<string, any> {
    const networks: Record<string, any> = {};
    
    if (stats.networks) {
      for (const [name, netStats] of Object.entries(stats.networks as any)) {
        networks[name] = {
          rxBytes: netStats.rx_bytes || 0,
          txBytes: netStats.tx_bytes || 0,
          rxPackets: netStats.rx_packets || 0,
          txPackets: netStats.tx_packets || 0,
          rxErrors: netStats.rx_errors || 0,
          txErrors: netStats.tx_errors || 0,
          rxDropped: netStats.rx_dropped || 0,
          txDropped: netStats.tx_dropped || 0
        };
      }
    }
    
    return networks;
  }

  private calculateBlockIORead(stats: any): number {
    return stats.blkio_stats?.io_service_bytes_recursive?.reduce((total: number, item: any) => {
      return item.op === 'Read' ? total + item.value : total;
    }, 0) || 0;
  }

  private calculateBlockIOWrite(stats: any): number {
    return stats.blkio_stats?.io_service_bytes_recursive?.reduce((total: number, item: any) => {
      return item.op === 'Write' ? total + item.value : total;
    }, 0) || 0;
  }
}