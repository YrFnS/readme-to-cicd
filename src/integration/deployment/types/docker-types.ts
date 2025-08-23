/**
 * Docker-specific deployment types and interfaces
 */

export interface DockerDeploymentConfig {
  image: DockerImageConfig;
  container: DockerContainerConfig;
  network?: DockerNetworkConfig;
  volumes?: DockerVolumeConfig[];
  build?: DockerBuildConfig;
  compose?: DockerComposeConfig;
}

export interface DockerImageConfig {
  name: string;
  tag: string;
  registry?: string;
  pullPolicy: 'Always' | 'IfNotPresent' | 'Never';
  pullSecrets?: string[];
  buildArgs?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface DockerContainerConfig {
  name: string;
  command?: string[];
  args?: string[];
  workingDir?: string;
  env?: EnvironmentVariable[];
  ports?: DockerPortMapping[];
  resources?: DockerResourceLimits;
  restartPolicy: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  healthCheck?: DockerHealthCheck;
  securityContext?: DockerSecurityContext;
  user?: string;
  privileged?: boolean;
  readOnlyRootFilesystem?: boolean;
}

export interface EnvironmentVariable {
  name: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: {
      name: string;
      key: string;
    };
    configMapKeyRef?: {
      name: string;
      key: string;
    };
    fieldRef?: {
      fieldPath: string;
    };
  };
}

export interface DockerPortMapping {
  containerPort: number;
  hostPort?: number;
  protocol: 'tcp' | 'udp';
  hostIP?: string;
}

export interface DockerResourceLimits {
  memory?: string;
  cpus?: string;
  memorySwap?: string;
  cpuShares?: number;
  cpuQuota?: number;
  cpuPeriod?: number;
  blkioWeight?: number;
  devices?: DockerDeviceMapping[];
}

export interface DockerDeviceMapping {
  pathOnHost: string;
  pathInContainer: string;
  cgroupPermissions: string;
}

export interface DockerHealthCheck {
  test: string[];
  interval?: string;
  timeout?: string;
  retries?: number;
  startPeriod?: string;
  disable?: boolean;
}

export interface DockerSecurityContext {
  runAsUser?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  capabilities?: {
    add?: string[];
    drop?: string[];
  };
  seLinuxOptions?: {
    level?: string;
    role?: string;
    type?: string;
    user?: string;
  };
  appArmorProfile?: {
    type: 'RuntimeDefault' | 'Localhost' | 'Unconfined';
    localhostProfile?: string;
  };
}

export interface DockerNetworkConfig {
  mode: 'bridge' | 'host' | 'none' | 'container' | 'custom';
  name?: string;
  aliases?: string[];
  ipv4Address?: string;
  ipv6Address?: string;
  links?: string[];
  externalLinks?: string[];
  dnsServers?: string[];
  dnsSearch?: string[];
  extraHosts?: string[];
}

export interface DockerVolumeConfig {
  type: 'bind' | 'volume' | 'tmpfs';
  source?: string;
  target: string;
  readOnly?: boolean;
  consistency?: 'consistent' | 'cached' | 'delegated';
  bindOptions?: {
    propagation?: 'rprivate' | 'private' | 'rshared' | 'shared' | 'rslave' | 'slave';
  };
  volumeOptions?: {
    noCopy?: boolean;
    labels?: Record<string, string>;
    driverConfig?: {
      name: string;
      options?: Record<string, string>;
    };
  };
  tmpfsOptions?: {
    sizeBytes?: number;
    mode?: number;
  };
}

export interface DockerBuildConfig {
  context: string;
  dockerfile?: string;
  args?: Record<string, string>;
  target?: string;
  labels?: Record<string, string>;
  cacheFrom?: string[];
  cacheTo?: string[];
  platforms?: string[];
  secrets?: DockerBuildSecret[];
  ssh?: string[];
  outputs?: DockerBuildOutput[];
  noCache?: boolean;
  pull?: boolean;
  squash?: boolean;
}

export interface DockerBuildSecret {
  id: string;
  src?: string;
  env?: string;
}

export interface DockerBuildOutput {
  type: 'local' | 'tar' | 'oci' | 'docker' | 'image' | 'registry';
  dest?: string;
  attrs?: Record<string, string>;
}

export interface DockerComposeConfig {
  version: string;
  services: Record<string, DockerComposeService>;
  networks?: Record<string, DockerComposeNetwork>;
  volumes?: Record<string, DockerComposeVolume>;
  secrets?: Record<string, DockerComposeSecret>;
  configs?: Record<string, DockerComposeConfig>;
}

export interface DockerComposeService {
  image?: string;
  build?: string | DockerComposeBuild;
  command?: string | string[];
  entrypoint?: string | string[];
  environment?: Record<string, string> | string[];
  ports?: (string | DockerComposePort)[];
  volumes?: (string | DockerComposeVolumeMount)[];
  networks?: string[] | Record<string, DockerComposeNetworkConfig>;
  depends_on?: string[] | Record<string, DockerComposeDependency>;
  restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  healthcheck?: DockerComposeHealthCheck;
  deploy?: DockerComposeDeploy;
  labels?: Record<string, string> | string[];
  logging?: DockerComposeLogging;
  secrets?: (string | DockerComposeSecretMount)[];
  configs?: (string | DockerComposeConfigMount)[];
}

export interface DockerComposeBuild {
  context: string;
  dockerfile?: string;
  args?: Record<string, string> | string[];
  labels?: Record<string, string> | string[];
  target?: string;
  cache_from?: string[];
  cache_to?: string[];
  extra_hosts?: string[];
  isolation?: string;
  network?: string;
  shm_size?: string;
}

export interface DockerComposePort {
  target: number;
  published?: number;
  protocol?: 'tcp' | 'udp';
  mode?: 'host' | 'ingress';
}

export interface DockerComposeVolumeMount {
  type: 'volume' | 'bind' | 'tmpfs' | 'npipe';
  source?: string;
  target: string;
  read_only?: boolean;
  consistency?: 'consistent' | 'cached' | 'delegated';
  bind?: {
    propagation?: 'rprivate' | 'private' | 'rshared' | 'shared' | 'rslave' | 'slave';
  };
  volume?: {
    nocopy?: boolean;
  };
  tmpfs?: {
    size?: string;
  };
}

export interface DockerComposeNetworkConfig {
  aliases?: string[];
  ipv4_address?: string;
  ipv6_address?: string;
}

export interface DockerComposeDependency {
  condition: 'service_started' | 'service_healthy' | 'service_completed_successfully';
}

export interface DockerComposeHealthCheck {
  test: string | string[];
  interval?: string;
  timeout?: string;
  retries?: number;
  start_period?: string;
  disable?: boolean;
}

export interface DockerComposeDeploy {
  mode?: 'global' | 'replicated';
  replicas?: number;
  labels?: Record<string, string> | string[];
  update_config?: DockerComposeUpdateConfig;
  rollback_config?: DockerComposeRollbackConfig;
  restart_policy?: DockerComposeRestartPolicy;
  resources?: DockerComposeResources;
  placement?: DockerComposePlacement;
}

export interface DockerComposeUpdateConfig {
  parallelism?: number;
  delay?: string;
  failure_action?: 'continue' | 'rollback' | 'pause';
  monitor?: string;
  max_failure_ratio?: number;
  order?: 'stop-first' | 'start-first';
}

export interface DockerComposeRollbackConfig {
  parallelism?: number;
  delay?: string;
  failure_action?: 'continue' | 'pause';
  monitor?: string;
  max_failure_ratio?: number;
  order?: 'stop-first' | 'start-first';
}

export interface DockerComposeRestartPolicy {
  condition?: 'none' | 'on-failure' | 'any';
  delay?: string;
  max_attempts?: number;
  window?: string;
}

export interface DockerComposeResources {
  limits?: {
    cpus?: string;
    memory?: string;
    pids?: number;
  };
  reservations?: {
    cpus?: string;
    memory?: string;
    generic_resources?: DockerComposeGenericResource[];
  };
}

export interface DockerComposeGenericResource {
  discrete_resource_spec?: {
    kind: string;
    value: number;
  };
}

export interface DockerComposePlacement {
  constraints?: string[];
  preferences?: DockerComposePlacementPreference[];
  max_replicas_per_node?: number;
}

export interface DockerComposePlacementPreference {
  spread: string;
}

export interface DockerComposeLogging {
  driver?: string;
  options?: Record<string, string>;
}

export interface DockerComposeSecretMount {
  source: string;
  target?: string;
  uid?: string;
  gid?: string;
  mode?: number;
}

export interface DockerComposeConfigMount {
  source: string;
  target?: string;
  uid?: string;
  gid?: string;
  mode?: number;
}

export interface DockerComposeNetwork {
  driver?: string;
  driver_opts?: Record<string, string>;
  attachable?: boolean;
  enable_ipv6?: boolean;
  ipam?: {
    driver?: string;
    config?: {
      subnet?: string;
      ip_range?: string;
      gateway?: string;
      aux_addresses?: Record<string, string>;
    }[];
    options?: Record<string, string>;
  };
  internal?: boolean;
  labels?: Record<string, string> | string[];
  external?: boolean | { name: string };
}

export interface DockerComposeVolume {
  driver?: string;
  driver_opts?: Record<string, string>;
  labels?: Record<string, string> | string[];
  external?: boolean | { name: string };
}

export interface DockerComposeSecret {
  file?: string;
  external?: boolean | { name: string };
  labels?: Record<string, string> | string[];
}

export interface DockerContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'created' | 'running' | 'paused' | 'restarting' | 'removing' | 'exited' | 'dead';
  ports: DockerPortInfo[];
  networks: Record<string, DockerNetworkInfo>;
  mounts: DockerMountInfo[];
  labels: Record<string, string>;
  created: Date;
  started?: Date;
  finished?: Date;
  exitCode?: number;
  error?: string;
}

export interface DockerPortInfo {
  privatePort: number;
  publicPort?: number;
  type: 'tcp' | 'udp';
  ip?: string;
}

export interface DockerNetworkInfo {
  networkId: string;
  endpointId: string;
  gateway: string;
  ipAddress: string;
  ipPrefixLen: number;
  ipv6Gateway?: string;
  globalIPv6Address?: string;
  globalIPv6PrefixLen?: number;
  macAddress: string;
}

export interface DockerMountInfo {
  type: 'bind' | 'volume' | 'tmpfs';
  source?: string;
  destination: string;
  mode: string;
  rw: boolean;
  propagation?: string;
}

export interface DockerStats {
  containerId: string;
  name: string;
  cpu: {
    usage: number;
    systemUsage: number;
    onlineCpus: number;
    throttledTime: number;
  };
  memory: {
    usage: number;
    limit: number;
    cache: number;
    rss: number;
    swap?: number;
  };
  network: Record<string, {
    rxBytes: number;
    rxPackets: number;
    rxErrors: number;
    rxDropped: number;
    txBytes: number;
    txPackets: number;
    txErrors: number;
    txDropped: number;
  }>;
  blockIO: {
    read: number;
    write: number;
  };
  pids: number;
  timestamp: Date;
}