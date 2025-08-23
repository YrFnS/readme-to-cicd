/**
 * Container registry management types and interfaces
 */

export interface ContainerRegistryManager {
  authenticate(registry: string, credentials: RegistryCredentials): Promise<void>;
  pushImage(image: ImageReference, options?: PushOptions): Promise<PushResult>;
  pullImage(image: ImageReference, options?: PullOptions): Promise<PullResult>;
  deleteImage(image: ImageReference): Promise<void>;
  listImages(registry: string, repository?: string): Promise<ImageInfo[]>;
  getImageInfo(image: ImageReference): Promise<ImageInfo>;
  scanImage(image: ImageReference, options?: ScanOptions): Promise<ScanResult>;
  signImage(image: ImageReference, options: SigningOptions): Promise<SigningResult>;
  verifyImage(image: ImageReference, options?: VerificationOptions): Promise<VerificationResult>;
  createRepository(registry: string, repository: string, options?: RepositoryOptions): Promise<void>;
  deleteRepository(registry: string, repository: string): Promise<void>;
  getRepositoryInfo(registry: string, repository: string): Promise<RepositoryInfo>;
  listRepositories(registry: string): Promise<RepositoryInfo[]>;
  setImagePolicy(registry: string, repository: string, policy: ImagePolicy): Promise<void>;
  getImagePolicy(registry: string, repository: string): Promise<ImagePolicy>;
}

export interface RegistryCredentials {
  username: string;
  password: string;
  email?: string;
  serverAddress?: string;
  identityToken?: string;
  registryToken?: string;
}

export interface ImageReference {
  registry: string;
  namespace?: string;
  repository: string;
  tag?: string;
  digest?: string;
}

export interface PushOptions {
  force?: boolean;
  compress?: boolean;
  platform?: string[];
  buildArgs?: Record<string, string>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  progressCallback?: (progress: PushProgress) => void;
}

export interface PushProgress {
  id: string;
  status: 'preparing' | 'waiting' | 'pushing' | 'pushed' | 'complete' | 'error';
  current: number;
  total: number;
  detail?: string;
}

export interface PushResult {
  success: boolean;
  digest: string;
  size: number;
  layers: LayerInfo[];
  manifest: ManifestInfo;
  timestamp: Date;
  duration: number; // milliseconds
  error?: string;
}

export interface PullOptions {
  platform?: string;
  allTags?: boolean;
  quiet?: boolean;
  progressCallback?: (progress: PullProgress) => void;
}

export interface PullProgress {
  id: string;
  status: 'pulling' | 'downloading' | 'extracting' | 'complete' | 'error';
  current: number;
  total: number;
  detail?: string;
}

export interface PullResult {
  success: boolean;
  image: ImageInfo;
  layers: LayerInfo[];
  timestamp: Date;
  duration: number; // milliseconds
  error?: string;
}

export interface ImageInfo {
  id: string;
  reference: ImageReference;
  digest: string;
  mediaType: string;
  size: number;
  created: Date;
  updated: Date;
  architecture: string;
  os: string;
  variant?: string;
  config: ImageConfig;
  manifest: ManifestInfo;
  layers: LayerInfo[];
  labels: Record<string, string>;
  annotations: Record<string, string>;
  vulnerabilities?: VulnerabilityInfo[];
  signatures?: SignatureInfo[];
  attestations?: AttestationInfo[];
}

export interface ImageConfig {
  user?: string;
  exposedPorts?: Record<string, any>;
  env?: string[];
  entrypoint?: string[];
  cmd?: string[];
  volumes?: Record<string, any>;
  workingDir?: string;
  labels?: Record<string, string>;
  stopSignal?: string;
  stopTimeout?: number;
  shell?: string[];
  healthcheck?: HealthcheckConfig;
}

export interface HealthcheckConfig {
  test?: string[];
  interval?: string;
  timeout?: string;
  startPeriod?: string;
  retries?: number;
}

export interface ManifestInfo {
  mediaType: string;
  digest: string;
  size: number;
  platform?: PlatformInfo;
  annotations?: Record<string, string>;
  artifactType?: string;
  subject?: SubjectInfo;
}

export interface PlatformInfo {
  architecture: string;
  os: string;
  osVersion?: string;
  osFeatures?: string[];
  variant?: string;
  features?: string[];
}

export interface SubjectInfo {
  mediaType: string;
  digest: string;
  size: number;
}

export interface LayerInfo {
  digest: string;
  mediaType: string;
  size: number;
  urls?: string[];
  annotations?: Record<string, string>;
  platform?: PlatformInfo;
}

export interface ScanOptions {
  scanners?: string[];
  severity?: VulnerabilitySeverity[];
  format?: 'json' | 'xml' | 'sarif' | 'cyclonedx' | 'spdx';
  includeFixed?: boolean;
  includeDevDependencies?: boolean;
  timeout?: number; // seconds
}

export type VulnerabilitySeverity = 'unknown' | 'negligible' | 'low' | 'medium' | 'high' | 'critical';

export interface ScanResult {
  image: ImageReference;
  scanId: string;
  timestamp: Date;
  duration: number; // milliseconds
  status: 'completed' | 'failed' | 'timeout';
  summary: ScanSummary;
  vulnerabilities: VulnerabilityInfo[];
  secrets?: SecretInfo[];
  malware?: MalwareInfo[];
  licenses?: LicenseInfo[];
  compliance?: ComplianceInfo[];
  metadata: ScanMetadata;
}

export interface ScanSummary {
  totalVulnerabilities: number;
  severityCounts: Record<VulnerabilitySeverity, number>;
  fixableVulnerabilities: number;
  riskScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface VulnerabilityInfo {
  id: string;
  cve?: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  score?: number;
  vector?: string;
  references: string[];
  publishedDate?: Date;
  modifiedDate?: Date;
  package: PackageInfo;
  fixedVersion?: string;
  fixAvailable: boolean;
  exploitAvailable?: boolean;
  patchAvailable?: boolean;
  workaround?: string;
  layer?: LayerInfo;
}

export interface PackageInfo {
  name: string;
  version: string;
  type: 'os' | 'library' | 'application';
  language?: string;
  namespace?: string;
  location: string;
  licenses?: string[];
  cpe?: string;
  purl?: string;
}

export interface SecretInfo {
  id: string;
  type: 'api-key' | 'password' | 'token' | 'certificate' | 'private-key' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  line?: number;
  column?: number;
  match: string;
  entropy?: number;
  verified?: boolean;
}

export interface MalwareInfo {
  id: string;
  name: string;
  type: 'virus' | 'trojan' | 'worm' | 'rootkit' | 'spyware' | 'adware' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  signature: string;
  engine: string;
  engineVersion: string;
  detectedAt: Date;
}

export interface LicenseInfo {
  id: string;
  name: string;
  spdxId?: string;
  type: 'permissive' | 'copyleft' | 'proprietary' | 'unknown';
  riskLevel: 'low' | 'medium' | 'high';
  package: PackageInfo;
  text?: string;
  url?: string;
  obligations?: string[];
  restrictions?: string[];
}

export interface ComplianceInfo {
  framework: string;
  version: string;
  controls: ComplianceControl[];
  overallStatus: 'compliant' | 'non-compliant' | 'partial';
  score: number; // 0-100
  lastAssessed: Date;
}

export interface ComplianceControl {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediation?: string;
  references?: string[];
}

export interface ScanMetadata {
  scanner: ScannerInfo;
  image: ImageInfo;
  environment: EnvironmentInfo;
  policies: PolicyInfo[];
}

export interface ScannerInfo {
  name: string;
  version: string;
  vendor: string;
  database?: DatabaseInfo;
}

export interface DatabaseInfo {
  version: string;
  updatedAt: Date;
  records: number;
}

export interface EnvironmentInfo {
  platform: string;
  architecture: string;
  os: string;
  kernel?: string;
  runtime: string;
  runtimeVersion: string;
}

export interface PolicyInfo {
  id: string;
  name: string;
  version: string;
  type: 'security' | 'compliance' | 'quality' | 'custom';
  rules: PolicyRule[];
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block';
  condition: string;
}

export interface SigningOptions {
  key: string;
  keyType: 'rsa' | 'ecdsa' | 'ed25519';
  algorithm?: string;
  format?: 'cosign' | 'notary' | 'docker-content-trust';
  annotations?: Record<string, string>;
  recursive?: boolean;
}

export interface SigningResult {
  success: boolean;
  signature: SignatureInfo;
  timestamp: Date;
  error?: string;
}

export interface SignatureInfo {
  id: string;
  format: 'cosign' | 'notary' | 'docker-content-trust';
  algorithm: string;
  keyId: string;
  signature: string;
  certificate?: string;
  certificateChain?: string[];
  timestamp: Date;
  annotations: Record<string, string>;
  verified: boolean;
}

export interface VerificationOptions {
  publicKey?: string;
  certificate?: string;
  certificateChain?: string[];
  policy?: VerificationPolicy;
  trustStore?: string;
}

export interface VerificationPolicy {
  requireSignature: boolean;
  trustedSigners?: string[];
  allowedRegistries?: string[];
  blockedRegistries?: string[];
  maxAge?: number; // seconds
  requireAttestation?: boolean;
  attestationPolicies?: AttestationPolicy[];
}

export interface AttestationPolicy {
  type: string;
  required: boolean;
  policy: string;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  signatures: SignatureInfo[];
  attestations: AttestationInfo[];
  violations: PolicyViolation[];
  timestamp: Date;
  error?: string;
}

export interface AttestationInfo {
  id: string;
  type: 'slsa-provenance' | 'spdx' | 'cyclonedx' | 'vuln' | 'custom';
  predicate: any;
  predicateType: string;
  subject: SubjectInfo[];
  signature: SignatureInfo;
  timestamp: Date;
}

export interface PolicyViolation {
  id: string;
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  remediation?: string;
}

export interface RepositoryOptions {
  description?: string;
  public?: boolean;
  immutable?: boolean;
  scanOnPush?: boolean;
  trustEnabled?: boolean;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface RepositoryInfo {
  name: string;
  registry: string;
  namespace?: string;
  description?: string;
  public: boolean;
  immutable: boolean;
  scanOnPush: boolean;
  trustEnabled: boolean;
  created: Date;
  updated: Date;
  imageCount: number;
  size: number;
  downloadCount: number;
  starCount?: number;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  tags: TagInfo[];
  webhooks?: WebhookInfo[];
}

export interface TagInfo {
  name: string;
  digest: string;
  size: number;
  created: Date;
  updated: Date;
  signed: boolean;
  scanned: boolean;
  scanResult?: ScanSummary;
  platform?: PlatformInfo;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface WebhookInfo {
  id: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret?: string;
  sslVerification: boolean;
  created: Date;
  updated: Date;
  lastDelivery?: WebhookDelivery;
}

export type WebhookEvent = 
  | 'push'
  | 'pull'
  | 'delete'
  | 'scan_completed'
  | 'scan_failed'
  | 'vulnerability_found'
  | 'policy_violation';

export interface WebhookDelivery {
  id: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending';
  statusCode?: number;
  duration: number; // milliseconds
  request: WebhookRequest;
  response?: WebhookResponse;
  error?: string;
}

export interface WebhookRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

export interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ImagePolicy {
  id: string;
  name: string;
  description?: string;
  registry: string;
  repository: string;
  rules: ImagePolicyRule[];
  enforcement: 'advisory' | 'blocking';
  created: Date;
  updated: Date;
  active: boolean;
}

export interface ImagePolicyRule {
  id: string;
  name: string;
  description?: string;
  type: 'vulnerability' | 'malware' | 'secret' | 'license' | 'compliance' | 'signature' | 'custom';
  condition: PolicyCondition;
  action: 'allow' | 'warn' | 'block';
  severity: 'low' | 'medium' | 'high' | 'critical';
  exemptions?: PolicyExemption[];
}

export interface PolicyCondition {
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'regex';
  field: string;
  value: any;
  values?: any[];
}

export interface PolicyExemption {
  id: string;
  reason: string;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  conditions?: PolicyCondition[];
}

export interface RegistryConfig {
  name: string;
  type: 'docker-hub' | 'ecr' | 'gcr' | 'acr' | 'harbor' | 'quay' | 'artifactory' | 'nexus' | 'generic';
  url: string;
  credentials: RegistryCredentials;
  settings: RegistrySettings;
  features: RegistryFeatures;
}

export interface RegistrySettings {
  timeout: number; // seconds
  retries: number;
  concurrent: number;
  rateLimit?: RateLimitConfig;
  proxy?: ProxyConfig;
  tls?: TLSConfig;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  burst?: number;
}

export interface ProxyConfig {
  url: string;
  username?: string;
  password?: string;
  noProxy?: string[];
}

export interface TLSConfig {
  insecure: boolean;
  caFile?: string;
  certFile?: string;
  keyFile?: string;
  serverName?: string;
}

export interface RegistryFeatures {
  scanning: boolean;
  signing: boolean;
  attestation: boolean;
  replication: boolean;
  webhooks: boolean;
  rbac: boolean;
  quotas: boolean;
  retention: boolean;
  immutability: boolean;
}

export interface RegistryMetrics {
  registry: string;
  timestamp: Date;
  repositories: number;
  images: number;
  totalSize: number;
  pulls: number;
  pushes: number;
  scans: number;
  vulnerabilities: Record<VulnerabilitySeverity, number>;
  storage: StorageMetrics;
  bandwidth: BandwidthMetrics;
  errors: ErrorMetrics;
}

export interface StorageMetrics {
  used: number; // bytes
  available: number; // bytes
  total: number; // bytes
  utilization: number; // percentage
  growth: number; // bytes per day
}

export interface BandwidthMetrics {
  inbound: number; // bytes per second
  outbound: number; // bytes per second
  total: number; // bytes per second
  peak: number; // bytes per second
}

export interface ErrorMetrics {
  total: number;
  rate: number; // errors per second
  types: Record<string, number>;
  httpCodes: Record<string, number>;
}

export interface RegistryHealth {
  registry: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: RegistryHealthCheck[];
  metrics: RegistryMetrics;
  alerts: RegistryAlert[];
}

export interface RegistryHealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration: number; // milliseconds
  timestamp: Date;
}

export interface RegistryAlert {
  id: string;
  type: 'storage' | 'bandwidth' | 'error' | 'security' | 'performance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}