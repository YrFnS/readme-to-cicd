/**
 * Multi-Cloud Infrastructure Management Interfaces
 * 
 * Defines interfaces for infrastructure management across multiple cloud providers
 * with Terraform integration and cross-cloud orchestration capabilities.
 */

import {
  CloudProvider,
  DeploymentEnvironment,
  InfrastructureStatus,
  FailoverStatus,
  CredentialConfig,
  NetworkConfig,
  SecurityConfig,
  MonitoringConfig,
  TerraformConfig,
  ReplicationConfig,
  FailoverConfig,
  HybridNetworkConfig,
  DataSyncConfig,
  InfrastructureMetrics,
  ValidationResult,
  DeploymentResult,
  InfrastructureEvent,
  DeployedResource
} from './types.js';

/**
 * Main infrastructure manager interface
 */
export interface InfrastructureManager {
  // Core infrastructure operations
  createInfrastructure(config: InfrastructureConfig): Promise<DeploymentResult>;
  updateInfrastructure(id: string, config: Partial<InfrastructureConfig>): Promise<DeploymentResult>;
  deleteInfrastructure(id: string): Promise<void>;
  getInfrastructureStatus(id: string): Promise<InfrastructureStatus>;
  
  // Multi-cloud orchestration
  orchestrateMultiCloud(config: MultiCloudConfig): Promise<DeploymentResult>;
  manageFailover(config: FailoverConfig): Promise<void>;
  syncData(config: DataSyncConfig): Promise<void>;
  
  // Monitoring and metrics
  getMetrics(id: string): Promise<InfrastructureMetrics>;
  validateConfiguration(config: InfrastructureConfig): Promise<ValidationResult>;
  
  // Event handling
  subscribeToEvents(callback: (event: InfrastructureEvent) => void): void;
  unsubscribeFromEvents(callback: (event: InfrastructureEvent) => void): void;
}

/**
 * Cloud-specific provider interfaces
 */
export interface CloudProviderManager {
  // Provider identification
  getProviderType(): CloudProvider;
  getSupportedRegions(): string[];
  getSupportedServices(): string[];
  
  // Infrastructure operations
  deployInfrastructure(config: ProviderInfrastructureConfig): Promise<DeploymentResult>;
  updateInfrastructure(id: string, config: Partial<ProviderInfrastructureConfig>): Promise<DeploymentResult>;
  destroyInfrastructure(id: string): Promise<void>;
  
  // Resource management
  listResources(filter?: ResourceFilter): Promise<DeployedResource[]>;
  getResource(id: string): Promise<DeployedResource>;
  scaleResource(id: string, scaling: ScalingConfig): Promise<void>;
  
  // Monitoring
  getProviderMetrics(resourceId?: string): Promise<InfrastructureMetrics>;
  validateProviderConfig(config: ProviderInfrastructureConfig): Promise<ValidationResult>;
}

/**
 * AWS-specific manager interface
 */
export interface AWSManager extends CloudProviderManager {
  // EKS operations
  createEKSCluster(config: EKSClusterConfig): Promise<DeploymentResult>;
  updateEKSCluster(clusterId: string, config: Partial<EKSClusterConfig>): Promise<DeploymentResult>;
  deleteEKSCluster(clusterId: string): Promise<void>;
  
  // Lambda operations
  deployLambdaFunction(config: LambdaFunctionConfig): Promise<DeploymentResult>;
  updateLambdaFunction(functionName: string, config: Partial<LambdaFunctionConfig>): Promise<DeploymentResult>;
  deleteLambdaFunction(functionName: string): Promise<void>;
  
  // RDS operations
  createRDSInstance(config: RDSInstanceConfig): Promise<DeploymentResult>;
  updateRDSInstance(instanceId: string, config: Partial<RDSInstanceConfig>): Promise<DeploymentResult>;
  deleteRDSInstance(instanceId: string): Promise<void>;
  
  // CloudFormation operations
  deployCloudFormationStack(config: CloudFormationStackConfig): Promise<DeploymentResult>;
  updateCloudFormationStack(stackName: string, config: Partial<CloudFormationStackConfig>): Promise<DeploymentResult>;
  deleteCloudFormationStack(stackName: string): Promise<void>;
}

/**
 * Azure-specific manager interface
 */
export interface AzureManager extends CloudProviderManager {
  // AKS operations
  createAKSCluster(config: AKSClusterConfig): Promise<DeploymentResult>;
  updateAKSCluster(clusterId: string, config: Partial<AKSClusterConfig>): Promise<DeploymentResult>;
  deleteAKSCluster(clusterId: string): Promise<void>;
  
  // Azure Functions operations
  deployAzureFunction(config: AzureFunctionConfig): Promise<DeploymentResult>;
  updateAzureFunction(functionName: string, config: Partial<AzureFunctionConfig>): Promise<DeploymentResult>;
  deleteAzureFunction(functionName: string): Promise<void>;
  
  // CosmosDB operations
  createCosmosDBAccount(config: CosmosDBConfig): Promise<DeploymentResult>;
  updateCosmosDBAccount(accountName: string, config: Partial<CosmosDBConfig>): Promise<DeploymentResult>;
  deleteCosmosDBAccount(accountName: string): Promise<void>;
  
  // ARM Template operations
  deployARMTemplate(config: ARMTemplateConfig): Promise<DeploymentResult>;
  updateARMTemplate(deploymentName: string, config: Partial<ARMTemplateConfig>): Promise<DeploymentResult>;
  deleteARMTemplate(deploymentName: string): Promise<void>;
}

/**
 * Google Cloud-specific manager interface
 */
export interface GCPManager extends CloudProviderManager {
  // GKE operations
  createGKECluster(config: GKEClusterConfig): Promise<DeploymentResult>;
  updateGKECluster(clusterId: string, config: Partial<GKEClusterConfig>): Promise<DeploymentResult>;
  deleteGKECluster(clusterId: string): Promise<void>;
  
  // Cloud Functions operations
  deployCloudFunction(config: CloudFunctionConfig): Promise<DeploymentResult>;
  updateCloudFunction(functionName: string, config: Partial<CloudFunctionConfig>): Promise<DeploymentResult>;
  deleteCloudFunction(functionName: string): Promise<void>;
  
  // Firestore operations
  createFirestoreDatabase(config: FirestoreConfig): Promise<DeploymentResult>;
  updateFirestoreDatabase(databaseId: string, config: Partial<FirestoreConfig>): Promise<DeploymentResult>;
  deleteFirestoreDatabase(databaseId: string): Promise<void>;
  
  // Deployment Manager operations
  deployDeploymentManager(config: DeploymentManagerConfig): Promise<DeploymentResult>;
  updateDeploymentManager(deploymentName: string, config: Partial<DeploymentManagerConfig>): Promise<DeploymentResult>;
  deleteDeploymentManager(deploymentName: string): Promise<void>;
}

/**
 * Terraform integration interface
 */
export interface TerraformManager {
  // Terraform operations
  initializeTerraform(config: TerraformConfig): Promise<void>;
  planInfrastructure(config: TerraformConfig): Promise<TerraformPlan>;
  applyInfrastructure(config: TerraformConfig): Promise<DeploymentResult>;
  destroyInfrastructure(config: TerraformConfig): Promise<void>;
  
  // State management
  getState(): Promise<TerraformState>;
  importResource(address: string, id: string): Promise<void>;
  refreshState(): Promise<void>;
  
  // Module management
  validateModule(module: string): Promise<ValidationResult>;
  downloadModules(): Promise<void>;
}

/**
 * Multi-cloud orchestration interface
 */
export interface MultiCloudOrchestrator {
  // Cross-cloud operations
  orchestrateDeployment(config: MultiCloudConfig): Promise<DeploymentResult>;
  manageFailover(primary: CloudProvider, secondary: CloudProvider): Promise<void>;
  syncDataAcrossClouds(config: DataSyncConfig): Promise<void>;
  
  // Network management
  establishCrossCloudConnectivity(config: HybridNetworkConfig): Promise<void>;
  manageCrossCloudNetworking(config: NetworkConfig): Promise<void>;
  
  // Monitoring and alerting
  monitorMultiCloudHealth(): Promise<MultiCloudHealthStatus>;
  handleCrossCloudAlerts(alert: CrossCloudAlert): Promise<void>;
}

/**
 * Configuration interfaces
 */
export interface InfrastructureConfig {
  id: string;
  name: string;
  environment: DeploymentEnvironment;
  provider: CloudProvider;
  region: string[];
  terraform: TerraformConfig;
  networking: NetworkConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  resources: ResourceConfig[];
  tags: Record<string, string>;
}

export interface MultiCloudConfig {
  primary: CloudProviderConfig;
  secondary: CloudProviderConfig[];
  failover: FailoverConfig;
  dataReplication: ReplicationConfig;
  networkConnectivity: HybridNetworkConfig;
  loadBalancing: CrossCloudLoadBalancingConfig;
}

export interface CloudProviderConfig {
  provider: CloudProvider;
  regions: string[];
  credentials: CredentialConfig;
  infrastructure: InfrastructureConfig;
  services: CloudServiceConfig[];
}

export interface CloudServiceConfig {
  type: string;
  name: string;
  configuration: Record<string, any>;
  dependencies: string[];
}

export interface ProviderInfrastructureConfig {
  provider: CloudProvider;
  region: string;
  credentials: CredentialConfig;
  resources: ResourceConfig[];
  networking: NetworkConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export interface ResourceConfig {
  type: string;
  name: string;
  properties: Record<string, any>;
  dependencies: string[];
  tags: Record<string, string>;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetUtilization: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
}

export interface ResourceFilter {
  provider?: CloudProvider;
  region?: string;
  type?: string;
  status?: InfrastructureStatus;
  tags?: Record<string, string>;
}

/**
 * AWS-specific configuration interfaces
 */
export interface EKSClusterConfig {
  name: string;
  version: string;
  roleArn: string;
  subnetIds: string[];
  securityGroupIds: string[];
  nodeGroups: EKSNodeGroupConfig[];
  addons: EKSAddonConfig[];
}

export interface EKSNodeGroupConfig {
  name: string;
  instanceTypes: string[];
  amiType: string;
  capacityType: 'ON_DEMAND' | 'SPOT';
  scalingConfig: ScalingConfig;
  subnetIds: string[];
}

export interface EKSAddonConfig {
  name: string;
  version: string;
  configuration: Record<string, any>;
}

export interface LambdaFunctionConfig {
  functionName: string;
  runtime: string;
  handler: string;
  code: LambdaCodeConfig;
  environment: Record<string, string>;
  timeout: number;
  memorySize: number;
  role: string;
}

export interface LambdaCodeConfig {
  s3Bucket?: string;
  s3Key?: string;
  zipFile?: Buffer;
  imageUri?: string;
}

export interface RDSInstanceConfig {
  dbInstanceIdentifier: string;
  dbInstanceClass: string;
  engine: string;
  engineVersion: string;
  allocatedStorage: number;
  storageType: string;
  masterUsername: string;
  masterUserPassword: string;
  vpcSecurityGroupIds: string[];
  dbSubnetGroupName: string;
}

export interface CloudFormationStackConfig {
  stackName: string;
  templateBody?: string;
  templateURL?: string;
  parameters: CloudFormationParameter[];
  capabilities: string[];
  tags: Record<string, string>;
}

export interface CloudFormationParameter {
  parameterKey: string;
  parameterValue: string;
}

/**
 * Azure-specific configuration interfaces
 */
export interface AKSClusterConfig {
  name: string;
  resourceGroup: string;
  location: string;
  kubernetesVersion: string;
  dnsPrefix: string;
  agentPools: AKSAgentPoolConfig[];
  servicePrincipal: AKSServicePrincipalConfig;
  networkProfile: AKSNetworkProfileConfig;
}

export interface AKSAgentPoolConfig {
  name: string;
  count: number;
  vmSize: string;
  osDiskSizeGB: number;
  osType: 'Linux' | 'Windows';
  mode: 'System' | 'User';
}

export interface AKSServicePrincipalConfig {
  clientId: string;
  clientSecret: string;
}

export interface AKSNetworkProfileConfig {
  networkPlugin: 'azure' | 'kubenet';
  serviceCidr: string;
  dnsServiceIP: string;
  dockerBridgeCidr: string;
}

export interface AzureFunctionConfig {
  name: string;
  resourceGroup: string;
  location: string;
  runtime: string;
  version: string;
  storageAccount: string;
  appServicePlan: string;
  applicationSettings: Record<string, string>;
}

export interface CosmosDBConfig {
  accountName: string;
  resourceGroup: string;
  location: string;
  kind: 'GlobalDocumentDB' | 'MongoDB' | 'Parse';
  consistencyLevel: 'BoundedStaleness' | 'Eventual' | 'Session' | 'Strong' | 'ConsistentPrefix';
  databases: CosmosDBDatabaseConfig[];
}

export interface CosmosDBDatabaseConfig {
  name: string;
  throughput: number;
  containers: CosmosDBContainerConfig[];
}

export interface CosmosDBContainerConfig {
  name: string;
  partitionKey: string;
  throughput: number;
}

export interface ARMTemplateConfig {
  deploymentName: string;
  resourceGroup: string;
  template: Record<string, any>;
  parameters: Record<string, any>;
  mode: 'Incremental' | 'Complete';
}

/**
 * GCP-specific configuration interfaces
 */
export interface GKEClusterConfig {
  name: string;
  location: string;
  initialNodeCount: number;
  nodeConfig: GKENodeConfig;
  masterAuth: GKEMasterAuthConfig;
  networkPolicy: GKENetworkPolicyConfig;
  addonsConfig: GKEAddonsConfig;
}

export interface GKENodeConfig {
  machineType: string;
  diskSizeGb: number;
  diskType: string;
  imageType: string;
  oauthScopes: string[];
  serviceAccount: string;
}

export interface GKEMasterAuthConfig {
  username: string;
  password: string;
  clientCertificateConfig: GKEClientCertificateConfig;
}

export interface GKEClientCertificateConfig {
  issueClientCertificate: boolean;
}

export interface GKENetworkPolicyConfig {
  enabled: boolean;
  provider: 'CALICO' | 'CILIUM';
}

export interface GKEAddonsConfig {
  httpLoadBalancing: boolean;
  horizontalPodAutoscaling: boolean;
  kubernetesDashboard: boolean;
  networkPolicyConfig: boolean;
}

export interface CloudFunctionConfig {
  name: string;
  sourceArchiveUrl?: string;
  sourceRepository?: GCPSourceRepositoryConfig;
  entryPoint: string;
  runtime: string;
  timeout: string;
  availableMemoryMb: number;
  environmentVariables: Record<string, string>;
  trigger: GCPFunctionTriggerConfig;
}

export interface GCPSourceRepositoryConfig {
  url: string;
  deployedUrl: string;
}

export interface GCPFunctionTriggerConfig {
  httpsTrigger?: Record<string, any>;
  eventTrigger?: GCPEventTriggerConfig;
}

export interface GCPEventTriggerConfig {
  eventType: string;
  resource: string;
  service: string;
}

export interface FirestoreConfig {
  databaseId: string;
  locationId: string;
  type: 'FIRESTORE_NATIVE' | 'DATASTORE_MODE';
  concurrencyMode: 'OPTIMISTIC' | 'PESSIMISTIC' | 'OPTIMISTIC_WITH_ENTITY_GROUPS';
  appEngineIntegrationMode: 'ENABLED' | 'DISABLED';
}

export interface DeploymentManagerConfig {
  deploymentName: string;
  template: Record<string, any>;
  imports: GCPImportConfig[];
  properties: Record<string, any>;
}

export interface GCPImportConfig {
  path: string;
  name: string;
}

/**
 * Terraform-specific interfaces
 */
export interface TerraformPlan {
  resourceChanges: TerraformResourceChange[];
  outputChanges: Record<string, TerraformOutputChange>;
  priorState: TerraformState;
  configuration: TerraformConfiguration;
}

export interface TerraformResourceChange {
  address: string;
  mode: 'managed' | 'data';
  type: string;
  name: string;
  change: TerraformChange;
}

export interface TerraformChange {
  actions: ('no-op' | 'create' | 'read' | 'update' | 'delete')[];
  before: Record<string, any>;
  after: Record<string, any>;
  afterUnknown: Record<string, boolean>;
}

export interface TerraformOutputChange {
  actions: ('no-op' | 'create' | 'update' | 'delete')[];
  before: any;
  after: any;
  afterUnknown: boolean;
}

export interface TerraformState {
  version: number;
  terraformVersion: string;
  serial: number;
  lineage: string;
  outputs: Record<string, TerraformOutput>;
  resources: TerraformResource[];
}

export interface TerraformOutput {
  value: any;
  type: string;
  sensitive: boolean;
}

export interface TerraformResource {
  mode: 'managed' | 'data';
  type: string;
  name: string;
  provider: string;
  instances: TerraformInstance[];
}

export interface TerraformInstance {
  schemaVersion: number;
  attributes: Record<string, any>;
  dependencies: string[];
}

export interface TerraformConfiguration {
  providerConfigs: Record<string, TerraformProviderConfig>;
  rootModule: TerraformModule;
}

export interface TerraformProviderConfig {
  name: string;
  versionConstraint: string;
  moduleAddress: string;
}

/**
 * Multi-cloud specific interfaces
 */
export interface CrossCloudLoadBalancingConfig {
  strategy: 'round-robin' | 'weighted' | 'latency-based' | 'geolocation';
  healthCheck: HealthCheckConfig;
  failover: FailoverConfig;
  weights: Record<CloudProvider, number>;
}

export interface MultiCloudHealthStatus {
  overall: FailoverStatus;
  providers: Record<CloudProvider, ProviderHealthStatus>;
  connectivity: ConnectivityStatus;
  dataSync: DataSyncStatus;
}

export interface ProviderHealthStatus {
  status: FailoverStatus;
  regions: Record<string, RegionHealthStatus>;
  services: Record<string, ServiceHealthStatus>;
  lastCheck: Date;
}

export interface RegionHealthStatus {
  status: FailoverStatus;
  latency: number;
  availability: number;
  errorRate: number;
}

export interface ServiceHealthStatus {
  status: FailoverStatus;
  responseTime: number;
  throughput: number;
  errorRate: number;
}

export interface ConnectivityStatus {
  vpnConnections: Record<string, ConnectionStatus>;
  directConnections: Record<string, ConnectionStatus>;
  peeringConnections: Record<string, ConnectionStatus>;
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'degraded';
  latency: number;
  bandwidth: number;
  lastCheck: Date;
}

export interface DataSyncStatus {
  status: 'synced' | 'syncing' | 'error' | 'stopped';
  lastSync: Date;
  lag: number;
  errors: string[];
}

export interface CrossCloudAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'connectivity' | 'performance' | 'security' | 'cost' | 'compliance';
  provider: CloudProvider;
  region: string;
  service: string;
  message: string;
  details: Record<string, any>;
}