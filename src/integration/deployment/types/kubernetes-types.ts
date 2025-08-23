/**
 * Kubernetes-specific deployment types and interfaces
 */

export interface KubernetesDeploymentConfig {
  metadata: KubernetesMetadata;
  spec: KubernetesDeploymentSpec;
  helmChart?: HelmChartConfig;
  customResources?: CustomResourceConfig[];
}

export interface KubernetesMetadata {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  generateName?: string;
  ownerReferences?: OwnerReference[];
  finalizers?: string[];
}

export interface OwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
}

export interface KubernetesDeploymentSpec {
  replicas?: number;
  selector: LabelSelector;
  template: PodTemplateSpec;
  strategy?: DeploymentStrategy;
  minReadySeconds?: number;
  revisionHistoryLimit?: number;
  paused?: boolean;
  progressDeadlineSeconds?: number;
}

export interface LabelSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: LabelSelectorRequirement[];
}

export interface LabelSelectorRequirement {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
}

export interface PodTemplateSpec {
  metadata?: KubernetesMetadata;
  spec: PodSpec;
}

export interface PodSpec {
  containers: Container[];
  initContainers?: Container[];
  restartPolicy?: 'Always' | 'OnFailure' | 'Never';
  terminationGracePeriodSeconds?: number;
  activeDeadlineSeconds?: number;
  dnsPolicy?: 'ClusterFirst' | 'ClusterFirstWithHostNet' | 'Default' | 'None';
  nodeSelector?: Record<string, string>;
  serviceAccountName?: string;
  serviceAccount?: string;
  automountServiceAccountToken?: boolean;
  nodeName?: string;
  hostNetwork?: boolean;
  hostPID?: boolean;
  hostIPC?: boolean;
  shareProcessNamespace?: boolean;
  securityContext?: PodSecurityContext;
  imagePullSecrets?: LocalObjectReference[];
  hostname?: string;
  subdomain?: string;
  affinity?: Affinity;
  tolerations?: Toleration[];
  hostAliases?: HostAlias[];
  priorityClassName?: string;
  priority?: number;
  dnsConfig?: PodDNSConfig;
  readinessGates?: PodReadinessGate[];
  runtimeClassName?: string;
  enableServiceLinks?: boolean;
  preemptionPolicy?: 'Never' | 'PreemptLowerPriority';
  overhead?: Record<string, string>;
  topologySpreadConstraints?: TopologySpreadConstraint[];
  volumes?: Volume[];
}

export interface Container {
  name: string;
  image: string;
  command?: string[];
  args?: string[];
  workingDir?: string;
  ports?: ContainerPort[];
  envFrom?: EnvFromSource[];
  env?: EnvVar[];
  resources?: ResourceRequirements;
  volumeMounts?: VolumeMount[];
  livenessProbe?: Probe;
  readinessProbe?: Probe;
  startupProbe?: Probe;
  lifecycle?: Lifecycle;
  terminationMessagePath?: string;
  terminationMessagePolicy?: 'File' | 'FallbackToLogsOnError';
  imagePullPolicy?: 'Always' | 'Never' | 'IfNotPresent';
  securityContext?: SecurityContext;
  stdin?: boolean;
  stdinOnce?: boolean;
  tty?: boolean;
}

export interface ContainerPort {
  name?: string;
  hostPort?: number;
  containerPort: number;
  protocol?: 'TCP' | 'UDP' | 'SCTP';
  hostIP?: string;
}

export interface EnvFromSource {
  prefix?: string;
  configMapRef?: ConfigMapEnvSource;
  secretRef?: SecretEnvSource;
}

export interface ConfigMapEnvSource {
  name?: string;
  optional?: boolean;
}

export interface SecretEnvSource {
  name?: string;
  optional?: boolean;
}

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: EnvVarSource;
}

export interface EnvVarSource {
  fieldRef?: ObjectFieldSelector;
  resourceFieldRef?: ResourceFieldSelector;
  configMapKeyRef?: ConfigMapKeySelector;
  secretKeyRef?: SecretKeySelector;
}

export interface ObjectFieldSelector {
  apiVersion?: string;
  fieldPath: string;
}

export interface ResourceFieldSelector {
  containerName?: string;
  resource: string;
  divisor?: string;
}

export interface ConfigMapKeySelector {
  name?: string;
  key: string;
  optional?: boolean;
}

export interface SecretKeySelector {
  name?: string;
  key: string;
  optional?: boolean;
}

export interface ResourceRequirements {
  limits?: Record<string, string>;
  requests?: Record<string, string>;
}

export interface VolumeMount {
  name: string;
  readOnly?: boolean;
  mountPath: string;
  subPath?: string;
  mountPropagation?: 'None' | 'HostToContainer' | 'Bidirectional';
  subPathExpr?: string;
}

export interface Probe {
  httpGet?: HTTPGetAction;
  exec?: ExecAction;
  tcpSocket?: TCPSocketAction;
  grpc?: GRPCAction;
  initialDelaySeconds?: number;
  timeoutSeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
  terminationGracePeriodSeconds?: number;
}

export interface HTTPGetAction {
  path?: string;
  port: number | string;
  host?: string;
  scheme?: 'HTTP' | 'HTTPS';
  httpHeaders?: HTTPHeader[];
}

export interface HTTPHeader {
  name: string;
  value: string;
}

export interface ExecAction {
  command?: string[];
}

export interface TCPSocketAction {
  port: number | string;
  host?: string;
}

export interface GRPCAction {
  port: number;
  service?: string;
}

export interface Lifecycle {
  postStart?: LifecycleHandler;
  preStop?: LifecycleHandler;
}

export interface LifecycleHandler {
  exec?: ExecAction;
  httpGet?: HTTPGetAction;
  tcpSocket?: TCPSocketAction;
}

export interface SecurityContext {
  capabilities?: Capabilities;
  privileged?: boolean;
  seLinuxOptions?: SELinuxOptions;
  windowsOptions?: WindowsSecurityContextOptions;
  runAsUser?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  readOnlyRootFilesystem?: boolean;
  allowPrivilegeEscalation?: boolean;
  procMount?: 'Default' | 'Unmasked';
  seccompProfile?: SeccompProfile;
}

export interface Capabilities {
  add?: string[];
  drop?: string[];
}

export interface SELinuxOptions {
  user?: string;
  role?: string;
  type?: string;
  level?: string;
}

export interface WindowsSecurityContextOptions {
  gmsaCredentialSpecName?: string;
  gmsaCredentialSpec?: string;
  runAsUserName?: string;
  hostProcess?: boolean;
}

export interface SeccompProfile {
  type: 'RuntimeDefault' | 'Unconfined' | 'Localhost';
  localhostProfile?: string;
}

export interface PodSecurityContext {
  seLinuxOptions?: SELinuxOptions;
  windowsOptions?: WindowsSecurityContextOptions;
  runAsUser?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  supplementalGroups?: number[];
  fsGroup?: number;
  sysctls?: Sysctl[];
  fsGroupChangePolicy?: 'Always' | 'OnRootMismatch';
  seccompProfile?: SeccompProfile;
}

export interface Sysctl {
  name: string;
  value: string;
}

export interface LocalObjectReference {
  name?: string;
}

export interface Affinity {
  nodeAffinity?: NodeAffinity;
  podAffinity?: PodAffinity;
  podAntiAffinity?: PodAntiAffinity;
}

export interface NodeAffinity {
  requiredDuringSchedulingIgnoredDuringExecution?: NodeSelector;
  preferredDuringSchedulingIgnoredDuringExecution?: PreferredSchedulingTerm[];
}

export interface NodeSelector {
  nodeSelectorTerms: NodeSelectorTerm[];
}

export interface NodeSelectorTerm {
  matchExpressions?: NodeSelectorRequirement[];
  matchFields?: NodeSelectorRequirement[];
}

export interface NodeSelectorRequirement {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist' | 'Gt' | 'Lt';
  values?: string[];
}

export interface PreferredSchedulingTerm {
  weight: number;
  preference: NodeSelectorTerm;
}

export interface PodAffinity {
  requiredDuringSchedulingIgnoredDuringExecution?: PodAffinityTerm[];
  preferredDuringSchedulingIgnoredDuringExecution?: WeightedPodAffinityTerm[];
}

export interface PodAntiAffinity {
  requiredDuringSchedulingIgnoredDuringExecution?: PodAffinityTerm[];
  preferredDuringSchedulingIgnoredDuringExecution?: WeightedPodAffinityTerm[];
}

export interface PodAffinityTerm {
  labelSelector?: LabelSelector;
  namespaces?: string[];
  topologyKey: string;
  namespaceSelector?: LabelSelector;
}

export interface WeightedPodAffinityTerm {
  weight: number;
  podAffinityTerm: PodAffinityTerm;
}

export interface Toleration {
  key?: string;
  operator?: 'Exists' | 'Equal';
  value?: string;
  effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  tolerationSeconds?: number;
}

export interface HostAlias {
  ip: string;
  hostnames: string[];
}

export interface PodDNSConfig {
  nameservers?: string[];
  searches?: string[];
  options?: PodDNSConfigOption[];
}

export interface PodDNSConfigOption {
  name?: string;
  value?: string;
}

export interface PodReadinessGate {
  conditionType: string;
}

export interface TopologySpreadConstraint {
  maxSkew: number;
  topologyKey: string;
  whenUnsatisfiable: 'DoNotSchedule' | 'ScheduleAnyway';
  labelSelector?: LabelSelector;
  minDomains?: number;
}

export interface Volume {
  name: string;
  hostPath?: HostPathVolumeSource;
  emptyDir?: EmptyDirVolumeSource;
  gcePersistentDisk?: GCEPersistentDiskVolumeSource;
  awsElasticBlockStore?: AWSElasticBlockStoreVolumeSource;
  gitRepo?: GitRepoVolumeSource;
  secret?: SecretVolumeSource;
  nfs?: NFSVolumeSource;
  iscsi?: ISCSIVolumeSource;
  glusterfs?: GlusterfsVolumeSource;
  persistentVolumeClaim?: PersistentVolumeClaimVolumeSource;
  rbd?: RBDVolumeSource;
  flexVolume?: FlexVolumeSource;
  cinder?: CinderVolumeSource;
  cephfs?: CephFSVolumeSource;
  flocker?: FlockerVolumeSource;
  downwardAPI?: DownwardAPIVolumeSource;
  fc?: FCVolumeSource;
  azureFile?: AzureFileVolumeSource;
  configMap?: ConfigMapVolumeSource;
  vsphereVolume?: VsphereVirtualDiskVolumeSource;
  quobyte?: QuobyteVolumeSource;
  azureDisk?: AzureDiskVolumeSource;
  photonPersistentDisk?: PhotonPersistentDiskVolumeSource;
  projected?: ProjectedVolumeSource;
  portworxVolume?: PortworxVolumeSource;
  scaleIO?: ScaleIOVolumeSource;
  storageos?: StorageOSVolumeSource;
  csi?: CSIVolumeSource;
  ephemeral?: EphemeralVolumeSource;
}

export interface HostPathVolumeSource {
  path: string;
  type?: 'DirectoryOrCreate' | 'Directory' | 'FileOrCreate' | 'File' | 'Socket' | 'CharDevice' | 'BlockDevice';
}

export interface EmptyDirVolumeSource {
  medium?: 'Memory' | 'HugePages';
  sizeLimit?: string;
}

export interface GCEPersistentDiskVolumeSource {
  pdName: string;
  fsType?: string;
  partition?: number;
  readOnly?: boolean;
}

export interface AWSElasticBlockStoreVolumeSource {
  volumeID: string;
  fsType?: string;
  partition?: number;
  readOnly?: boolean;
}

export interface GitRepoVolumeSource {
  repository: string;
  revision?: string;
  directory?: string;
}

export interface SecretVolumeSource {
  secretName?: string;
  items?: KeyToPath[];
  defaultMode?: number;
  optional?: boolean;
}

export interface KeyToPath {
  key: string;
  path: string;
  mode?: number;
}

export interface NFSVolumeSource {
  server: string;
  path: string;
  readOnly?: boolean;
}

export interface ISCSIVolumeSource {
  targetPortal: string;
  iqn: string;
  lun: number;
  iscsiInterface?: string;
  fsType?: string;
  readOnly?: boolean;
  portals?: string[];
  chapAuthDiscovery?: boolean;
  chapAuthSession?: boolean;
  secretRef?: LocalObjectReference;
  initiatorName?: string;
}

export interface GlusterfsVolumeSource {
  endpoints: string;
  path: string;
  readOnly?: boolean;
}

export interface PersistentVolumeClaimVolumeSource {
  claimName: string;
  readOnly?: boolean;
}

export interface RBDVolumeSource {
  monitors: string[];
  image: string;
  fsType?: string;
  pool?: string;
  user?: string;
  keyring?: string;
  secretRef?: LocalObjectReference;
  readOnly?: boolean;
}

export interface FlexVolumeSource {
  driver: string;
  fsType?: string;
  secretRef?: LocalObjectReference;
  readOnly?: boolean;
  options?: Record<string, string>;
}

export interface CinderVolumeSource {
  volumeID: string;
  fsType?: string;
  readOnly?: boolean;
  secretRef?: LocalObjectReference;
}

export interface CephFSVolumeSource {
  monitors: string[];
  path?: string;
  user?: string;
  secretFile?: string;
  secretRef?: LocalObjectReference;
  readOnly?: boolean;
}

export interface FlockerVolumeSource {
  datasetName?: string;
  datasetUUID?: string;
}

export interface DownwardAPIVolumeSource {
  items?: DownwardAPIVolumeFile[];
  defaultMode?: number;
}

export interface DownwardAPIVolumeFile {
  path: string;
  fieldRef?: ObjectFieldSelector;
  resourceFieldRef?: ResourceFieldSelector;
  mode?: number;
}

export interface FCVolumeSource {
  targetWWNs?: string[];
  lun?: number;
  fsType?: string;
  readOnly?: boolean;
  wwids?: string[];
}

export interface AzureFileVolumeSource {
  secretName: string;
  shareName: string;
  readOnly?: boolean;
}

export interface ConfigMapVolumeSource {
  name?: string;
  items?: KeyToPath[];
  defaultMode?: number;
  optional?: boolean;
}

export interface VsphereVirtualDiskVolumeSource {
  volumePath: string;
  fsType?: string;
  storagePolicyName?: string;
  storagePolicyID?: string;
}

export interface QuobyteVolumeSource {
  registry: string;
  volume: string;
  readOnly?: boolean;
  user?: string;
  group?: string;
  tenant?: string;
}

export interface AzureDiskVolumeSource {
  diskName: string;
  diskURI: string;
  cachingMode?: 'None' | 'ReadOnly' | 'ReadWrite';
  fsType?: string;
  readOnly?: boolean;
  kind?: 'Shared' | 'Dedicated' | 'Managed';
}

export interface PhotonPersistentDiskVolumeSource {
  pdID: string;
  fsType?: string;
}

export interface ProjectedVolumeSource {
  sources: VolumeProjection[];
  defaultMode?: number;
}

export interface VolumeProjection {
  secret?: SecretProjection;
  downwardAPI?: DownwardAPIProjection;
  configMap?: ConfigMapProjection;
  serviceAccountToken?: ServiceAccountTokenProjection;
}

export interface SecretProjection {
  name?: string;
  items?: KeyToPath[];
  optional?: boolean;
}

export interface DownwardAPIProjection {
  items?: DownwardAPIVolumeFile[];
}

export interface ConfigMapProjection {
  name?: string;
  items?: KeyToPath[];
  optional?: boolean;
}

export interface ServiceAccountTokenProjection {
  audience?: string;
  expirationSeconds?: number;
  path: string;
}

export interface PortworxVolumeSource {
  volumeID: string;
  fsType?: string;
  readOnly?: boolean;
}

export interface ScaleIOVolumeSource {
  gateway: string;
  system: string;
  secretRef: LocalObjectReference;
  sslEnabled?: boolean;
  protectionDomain?: string;
  storagePool?: string;
  storageMode?: string;
  volumeName?: string;
  fsType?: string;
  readOnly?: boolean;
}

export interface StorageOSVolumeSource {
  volumeName?: string;
  volumeNamespace?: string;
  fsType?: string;
  readOnly?: boolean;
  secretRef?: LocalObjectReference;
}

export interface CSIVolumeSource {
  driver: string;
  readOnly?: boolean;
  fsType?: string;
  volumeAttributes?: Record<string, string>;
  nodePublishSecretRef?: LocalObjectReference;
}

export interface EphemeralVolumeSource {
  volumeClaimTemplate?: PersistentVolumeClaimTemplate;
}

export interface PersistentVolumeClaimTemplate {
  metadata?: KubernetesMetadata;
  spec: PersistentVolumeClaimSpec;
}

export interface PersistentVolumeClaimSpec {
  accessModes?: ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany' | 'ReadWriteOncePod')[];
  selector?: LabelSelector;
  resources?: ResourceRequirements;
  volumeName?: string;
  storageClassName?: string;
  volumeMode?: 'Filesystem' | 'Block';
  dataSource?: TypedLocalObjectReference;
  dataSourceRef?: TypedObjectReference;
}

export interface TypedLocalObjectReference {
  apiGroup?: string;
  kind: string;
  name: string;
}

export interface TypedObjectReference {
  apiGroup?: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface DeploymentStrategy {
  type?: 'Recreate' | 'RollingUpdate';
  rollingUpdate?: RollingUpdateDeployment;
}

export interface RollingUpdateDeployment {
  maxUnavailable?: number | string;
  maxSurge?: number | string;
}

// Helm Chart Configuration
export interface HelmChartConfig {
  name: string;
  version?: string;
  repository?: string;
  values?: Record<string, any>;
  valuesFiles?: string[];
  namespace?: string;
  createNamespace?: boolean;
  wait?: boolean;
  timeout?: string;
  atomic?: boolean;
  cleanupOnFail?: boolean;
  dryRun?: boolean;
  replace?: boolean;
  force?: boolean;
  resetValues?: boolean;
  reuseValues?: boolean;
  recreatePods?: boolean;
  maxHistory?: number;
  historyMax?: number;
  verify?: boolean;
  keyring?: string;
  postRenderer?: string;
  postRendererArgs?: string[];
  skipCrds?: boolean;
  renderSubchartNotes?: boolean;
  description?: string;
  dependencyUpdate?: boolean;
}

// Custom Resource Configuration
export interface CustomResourceConfig {
  apiVersion: string;
  kind: string;
  metadata: KubernetesMetadata;
  spec?: Record<string, any>;
  status?: Record<string, any>;
}

// Kubernetes Service Configuration
export interface KubernetesServiceConfig {
  metadata: KubernetesMetadata;
  spec: ServiceSpec;
}

export interface ServiceSpec {
  ports?: ServicePort[];
  selector?: Record<string, string>;
  clusterIP?: string;
  clusterIPs?: string[];
  type?: 'ExternalName' | 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  externalIPs?: string[];
  sessionAffinity?: 'ClientIP' | 'None';
  loadBalancerIP?: string;
  loadBalancerSourceRanges?: string[];
  externalName?: string;
  externalTrafficPolicy?: 'Cluster' | 'Local';
  healthCheckNodePort?: number;
  publishNotReadyAddresses?: boolean;
  sessionAffinityConfig?: SessionAffinityConfig;
  ipFamilies?: ('IPv4' | 'IPv6')[];
  ipFamilyPolicy?: 'SingleStack' | 'PreferDualStack' | 'RequireDualStack';
  allocateLoadBalancerNodePorts?: boolean;
  loadBalancerClass?: string;
  internalTrafficPolicy?: 'Cluster' | 'Local';
}

export interface ServicePort {
  name?: string;
  protocol?: 'TCP' | 'UDP' | 'SCTP';
  appProtocol?: string;
  port: number;
  targetPort?: number | string;
  nodePort?: number;
}

export interface SessionAffinityConfig {
  clientIP?: ClientIPConfig;
}

export interface ClientIPConfig {
  timeoutSeconds?: number;
}

// Kubernetes Ingress Configuration
export interface KubernetesIngressConfig {
  metadata: KubernetesMetadata;
  spec: IngressSpec;
}

export interface IngressSpec {
  ingressClassName?: string;
  defaultBackend?: IngressBackend;
  tls?: IngressTLS[];
  rules?: IngressRule[];
}

export interface IngressBackend {
  service?: IngressServiceBackend;
  resource?: TypedLocalObjectReference;
}

export interface IngressServiceBackend {
  name: string;
  port?: ServiceBackendPort;
}

export interface ServiceBackendPort {
  name?: string;
  number?: number;
}

export interface IngressTLS {
  hosts?: string[];
  secretName?: string;
}

export interface IngressRule {
  host?: string;
  http?: HTTPIngressRuleValue;
}

export interface HTTPIngressRuleValue {
  paths: HTTPIngressPath[];
}

export interface HTTPIngressPath {
  path?: string;
  pathType: 'Exact' | 'Prefix' | 'ImplementationSpecific';
  backend: IngressBackend;
}

// Kubernetes ConfigMap Configuration
export interface KubernetesConfigMapConfig {
  metadata: KubernetesMetadata;
  data?: Record<string, string>;
  binaryData?: Record<string, string>;
  immutable?: boolean;
}

// Kubernetes Secret Configuration
export interface KubernetesSecretConfig {
  metadata: KubernetesMetadata;
  type?: string;
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  immutable?: boolean;
}

// Kubernetes Status Information
export interface KubernetesResourceStatus {
  apiVersion: string;
  kind: string;
  metadata: KubernetesMetadata;
  status?: Record<string, any>;
  conditions?: KubernetesCondition[];
}

export interface KubernetesCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastTransitionTime?: Date;
  lastUpdateTime?: Date;
  reason?: string;
  message?: string;
}

// Kubernetes Events
export interface KubernetesEvent {
  metadata: KubernetesMetadata;
  involvedObject: ObjectReference;
  reason?: string;
  message?: string;
  source?: EventSource;
  firstTimestamp?: Date;
  lastTimestamp?: Date;
  count?: number;
  type?: 'Normal' | 'Warning';
  eventTime?: Date;
  series?: EventSeries;
  action?: string;
  related?: ObjectReference;
  reportingController?: string;
  reportingInstance?: string;
}

export interface ObjectReference {
  kind?: string;
  namespace?: string;
  name?: string;
  uid?: string;
  apiVersion?: string;
  resourceVersion?: string;
  fieldPath?: string;
}

export interface EventSource {
  component?: string;
  host?: string;
}

export interface EventSeries {
  count?: number;
  lastObservedTime?: Date;
}