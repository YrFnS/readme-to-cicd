/**
 * Serverless deployment types and interfaces
 */

export interface ServerlessManager {
  deployFunction(config: ServerlessFunctionConfig): Promise<ServerlessDeploymentResult>;
  updateFunction(functionId: string, config: ServerlessFunctionUpdateConfig): Promise<ServerlessDeploymentResult>;
  deleteFunction(functionId: string): Promise<void>;
  invokeFunction(functionId: string, payload?: any): Promise<ServerlessInvocationResult>;
  getFunctionStatus(functionId: string): Promise<ServerlessFunctionStatus>;
  getFunctionLogs(functionId: string, options?: ServerlessLogOptions): Promise<string[]>;
  getFunctionMetrics(functionId: string, timeRange?: TimeRange): Promise<ServerlessFunctionMetrics>;
  listFunctions(filters?: ServerlessFunctionFilters): Promise<ServerlessFunctionInfo[]>;
  createAlias(functionId: string, alias: ServerlessAliasConfig): Promise<ServerlessAliasResult>;
  updateAlias(functionId: string, aliasName: string, config: ServerlessAliasUpdateConfig): Promise<ServerlessAliasResult>;
  deleteAlias(functionId: string, aliasName: string): Promise<void>;
}

export interface ServerlessFunctionConfig {
  name: string;
  runtime: ServerlessRuntime;
  handler: string;
  code: ServerlessCodeConfig;
  environment: ServerlessEnvironment;
  timeout: number;
  memorySize: number;
  description?: string;
  tags?: Record<string, string>;
  vpc?: ServerlessVPCConfig;
  deadLetterQueue?: ServerlessDeadLetterConfig;
  tracing?: ServerlessTracingConfig;
  layers?: string[];
  fileSystemConfig?: ServerlessFileSystemConfig;
  imageConfig?: ServerlessImageConfig;
  ephemeralStorage?: ServerlessEphemeralStorageConfig;
  concurrency?: ServerlessConcurrencyConfig;
  security?: ServerlessSecurityConfig;
  monitoring?: ServerlessMonitoringConfig;
  scaling?: ServerlessScalingConfig;
  costOptimization?: ServerlessCostOptimizationConfig;
}

export interface ServerlessFunctionUpdateConfig {
  handler?: string;
  code?: ServerlessCodeConfig;
  environment?: ServerlessEnvironment;
  timeout?: number;
  memorySize?: number;
  description?: string;
  tags?: Record<string, string>;
  vpc?: ServerlessVPCConfig;
  deadLetterQueue?: ServerlessDeadLetterConfig;
  tracing?: ServerlessTracingConfig;
  layers?: string[];
  concurrency?: ServerlessConcurrencyConfig;
  scaling?: ServerlessScalingConfig;
}

export interface ServerlessDeploymentResult {
  success: boolean;
  functionId: string;
  functionArn: string;
  version: string;
  status: ServerlessFunctionStatus;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  deploymentPackage?: ServerlessDeploymentPackageInfo;
}

export interface ServerlessInvocationResult {
  success: boolean;
  statusCode: number;
  payload?: any;
  logs?: string[];
  duration: number;
  billedDuration: number;
  memoryUsed: number;
  maxMemoryUsed: number;
  requestId: string;
  timestamp: Date;
  error?: ServerlessInvocationError;
}

export interface ServerlessInvocationError {
  errorType: string;
  errorMessage: string;
  stackTrace?: string[];
}

export interface ServerlessFunctionStatus {
  state: 'Pending' | 'Active' | 'Inactive' | 'Failed' | 'Updating';
  stateReason?: string;
  stateReasonCode?: string;
  lastUpdateStatus: 'Successful' | 'Failed' | 'InProgress';
  lastUpdateStatusReason?: string;
  lastUpdateStatusReasonCode?: string;
  lastModified: Date;
  codeSize: number;
  codeSha256: string;
  version: string;
  masterArn?: string;
  revisionId: string;
}

export interface ServerlessFunctionInfo {
  functionName: string;
  functionArn: string;
  runtime: ServerlessRuntime;
  role: string;
  handler: string;
  codeSize: number;
  description?: string;
  timeout: number;
  memorySize: number;
  lastModified: Date;
  codeSha256: string;
  version: string;
  vpc?: ServerlessVPCConfig;
  deadLetterQueue?: ServerlessDeadLetterConfig;
  environment?: ServerlessEnvironment;
  kmsKeyArn?: string;
  tracingConfig?: ServerlessTracingConfig;
  masterArn?: string;
  revisionId: string;
  layers?: ServerlessLayerInfo[];
  state?: string;
  stateReason?: string;
  stateReasonCode?: string;
  lastUpdateStatus?: string;
  lastUpdateStatusReason?: string;
  lastUpdateStatusReasonCode?: string;
  fileSystemConfigs?: ServerlessFileSystemConfig[];
  packageType: 'Zip' | 'Image';
  imageConfigResponse?: ServerlessImageConfig;
  signingProfileVersionArn?: string;
  signingJobArn?: string;
  architectures?: string[];
  ephemeralStorage?: ServerlessEphemeralStorageConfig;
}

export type ServerlessRuntime = 
  // AWS Lambda
  | 'nodejs18.x' | 'nodejs16.x' | 'nodejs14.x'
  | 'python3.11' | 'python3.10' | 'python3.9' | 'python3.8'
  | 'java17' | 'java11' | 'java8.al2'
  | 'dotnet6' | 'dotnetcore3.1'
  | 'go1.x'
  | 'ruby3.2' | 'ruby2.7'
  | 'provided.al2' | 'provided'
  // Azure Functions
  | 'dotnet-isolated' | 'dotnet' | 'node' | 'python' | 'java' | 'powershell'
  // Google Cloud Functions
  | 'nodejs18' | 'nodejs16' | 'nodejs14'
  | 'python311' | 'python310' | 'python39' | 'python38'
  | 'go119' | 'go118' | 'go116'
  | 'java17' | 'java11'
  | 'dotnet6' | 'dotnet3'
  | 'ruby30' | 'ruby27';

export interface ServerlessCodeConfig {
  type: 'zip' | 'image' | 's3' | 'inline';
  source: string; // File path, S3 URI, image URI, or inline code
  s3Bucket?: string;
  s3Key?: string;
  s3ObjectVersion?: string;
  imageUri?: string;
  zipFile?: Buffer;
  dryRun?: boolean;
  publish?: boolean;
}

export interface ServerlessEnvironment {
  variables: Record<string, string>;
  kmsKeyArn?: string;
}

export interface ServerlessVPCConfig {
  subnetIds: string[];
  securityGroupIds: string[];
}

export interface ServerlessDeadLetterConfig {
  targetArn: string;
}

export interface ServerlessTracingConfig {
  mode: 'Active' | 'PassThrough';
}

export interface ServerlessFileSystemConfig {
  arn: string;
  localMountPath: string;
}

export interface ServerlessImageConfig {
  entryPoint?: string[];
  command?: string[];
  workingDirectory?: string;
}

export interface ServerlessEphemeralStorageConfig {
  size: number; // Size in MB (512-10240)
}

export interface ServerlessConcurrencyConfig {
  reservedConcurrency?: number;
  provisionedConcurrency?: number;
  maxConcurrency?: number;
  concurrencyMetrics?: ServerlessConcurrencyMetrics;
}

export interface ServerlessConcurrencyMetrics {
  currentConcurrency: number;
  averageConcurrency: number;
  peakConcurrency: number;
  throttles: number;
  coldStarts: number;
  warmStarts: number;
}

export interface ServerlessSecurityConfig {
  role: string;
  kmsKeyArn?: string;
  signingProfileVersionArn?: string;
  codeSigningConfigArn?: string;
  permissions?: ServerlessPermissionConfig[];
  resourcePolicy?: ServerlessResourcePolicyConfig;
}

export interface ServerlessPermissionConfig {
  statementId: string;
  action: string;
  principal: string;
  sourceArn?: string;
  sourceAccount?: string;
  eventSourceToken?: string;
  qualifier?: string;
  revisionId?: string;
}

export interface ServerlessResourcePolicyConfig {
  policy: string;
  revisionId?: string;
}

export interface ServerlessMonitoringConfig {
  cloudWatch?: ServerlessCloudWatchConfig;
  xRay?: ServerlessXRayConfig;
  customMetrics?: ServerlessCustomMetricConfig[];
  alarms?: ServerlessAlarmConfig[];
  dashboards?: ServerlessDashboardConfig[];
}

export interface ServerlessCloudWatchConfig {
  logGroup?: string;
  logRetentionDays?: number;
  metricsEnabled: boolean;
  detailedMonitoring: boolean;
}

export interface ServerlessXRayConfig {
  tracingEnabled: boolean;
  samplingRate?: number;
  tracingMode?: 'Active' | 'PassThrough';
}

export interface ServerlessCustomMetricConfig {
  name: string;
  namespace: string;
  dimensions?: Record<string, string>;
  unit: string;
  value: number;
  timestamp?: Date;
}

export interface ServerlessAlarmConfig {
  name: string;
  description?: string;
  metricName: string;
  namespace: string;
  statistic: 'Average' | 'Sum' | 'Maximum' | 'Minimum' | 'SampleCount';
  dimensions?: Record<string, string>;
  period: number;
  evaluationPeriods: number;
  threshold: number;
  comparisonOperator: 'GreaterThanThreshold' | 'GreaterThanOrEqualToThreshold' | 'LessThanThreshold' | 'LessThanOrEqualToThreshold';
  treatMissingData?: 'breaching' | 'notBreaching' | 'ignore' | 'missing';
  alarmActions?: string[];
  okActions?: string[];
  insufficientDataActions?: string[];
}

export interface ServerlessDashboardConfig {
  name: string;
  widgets: ServerlessWidgetConfig[];
}

export interface ServerlessWidgetConfig {
  type: 'metric' | 'log' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
}

export interface ServerlessScalingConfig {
  autoScaling: boolean;
  minConcurrency?: number;
  maxConcurrency?: number;
  targetUtilization?: number;
  scaleUpCooldown?: number;
  scaleDownCooldown?: number;
  predictiveScaling?: ServerlessPredictiveScalingConfig;
}

export interface ServerlessPredictiveScalingConfig {
  enabled: boolean;
  mode: 'ForecastAndScale' | 'ForecastOnly';
  schedulingBufferTime?: number;
  maxCapacityBreachBehavior?: 'HonorMaxCapacity' | 'IncreaseMaxCapacity';
  maxCapacityBuffer?: number;
}

export interface ServerlessCostOptimizationConfig {
  rightSizing: boolean;
  scheduledScaling?: ServerlessScheduledScalingConfig[];
  costAlerts?: ServerlessCostAlertConfig[];
  budgets?: ServerlessBudgetConfig[];
}

export interface ServerlessScheduledScalingConfig {
  name: string;
  schedule: string; // Cron expression
  minConcurrency: number;
  maxConcurrency: number;
  timezone?: string;
}

export interface ServerlessCostAlertConfig {
  name: string;
  threshold: number;
  currency: string;
  period: 'Daily' | 'Weekly' | 'Monthly';
  notifications: string[];
}

export interface ServerlessBudgetConfig {
  name: string;
  amount: number;
  currency: string;
  period: 'Monthly' | 'Quarterly' | 'Annually';
  alerts: ServerlessBudgetAlertConfig[];
}

export interface ServerlessBudgetAlertConfig {
  threshold: number;
  type: 'Actual' | 'Forecasted';
  notifications: string[];
}

export interface ServerlessLogOptions {
  startTime?: Date;
  endTime?: Date;
  filter?: string;
  nextToken?: string;
  limit?: number;
  interleaved?: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ServerlessFunctionMetrics {
  invocations: ServerlessMetricData;
  duration: ServerlessMetricData;
  errors: ServerlessMetricData;
  throttles: ServerlessMetricData;
  deadLetterErrors: ServerlessMetricData;
  iteratorAge: ServerlessMetricData;
  concurrentExecutions: ServerlessMetricData;
  unreservedConcurrentExecutions: ServerlessMetricData;
  provisionedConcurrencyInvocations: ServerlessMetricData;
  provisionedConcurrencySpilloverInvocations: ServerlessMetricData;
  coldStarts: ServerlessMetricData;
  warmStarts: ServerlessMetricData;
  memoryUtilization: ServerlessMetricData;
  costMetrics: ServerlessCostMetrics;
}

export interface ServerlessMetricData {
  value: number;
  unit: string;
  timestamp: Date;
  statistics: ServerlessMetricStatistics;
  dataPoints: ServerlessMetricDataPoint[];
}

export interface ServerlessMetricStatistics {
  average: number;
  maximum: number;
  minimum: number;
  sum: number;
  sampleCount: number;
}

export interface ServerlessMetricDataPoint {
  timestamp: Date;
  value: number;
  unit: string;
}

export interface ServerlessCostMetrics {
  totalCost: number;
  requestCost: number;
  durationCost: number;
  memoryCost: number;
  storageCost: number;
  dataCost: number;
  currency: string;
  period: string;
  breakdown: ServerlessCostBreakdown[];
}

export interface ServerlessCostBreakdown {
  service: string;
  cost: number;
  percentage: number;
  details: Record<string, number>;
}

export interface ServerlessFunctionFilters {
  runtime?: ServerlessRuntime;
  state?: string;
  tags?: Record<string, string>;
  masterArn?: string;
  maxItems?: number;
  marker?: string;
}

export interface ServerlessAliasConfig {
  name: string;
  functionVersion: string;
  description?: string;
  routingConfig?: ServerlessRoutingConfig;
  revisionId?: string;
}

export interface ServerlessAliasUpdateConfig {
  functionVersion?: string;
  description?: string;
  routingConfig?: ServerlessRoutingConfig;
  revisionId?: string;
}

export interface ServerlessAliasResult {
  aliasArn: string;
  name: string;
  functionVersion: string;
  description?: string;
  routingConfig?: ServerlessRoutingConfig;
  revisionId: string;
}

export interface ServerlessRoutingConfig {
  additionalVersionWeights?: Record<string, number>;
}

export interface ServerlessLayerInfo {
  arn: string;
  codeSize: number;
  signingProfileVersionArn?: string;
  signingJobArn?: string;
}

export interface ServerlessDeploymentPackageInfo {
  type: 'zip' | 'image';
  size: number;
  sha256: string;
  location?: string;
  uploadUrl?: string;
  downloadUrl?: string;
}

// Cloud Provider Specific Types

export interface AWSLambdaConfig extends ServerlessFunctionConfig {
  provider: 'aws';
  region: string;
  accountId?: string;
  packageType?: 'Zip' | 'Image';
  architectures?: ('x86_64' | 'arm64')[];
  snapStart?: AWSSnapStartConfig;
}

export interface AWSSnapStartConfig {
  applyOn: 'PublishedVersions' | 'None';
  optimizationStatus?: 'On' | 'Off';
}

export interface AzureFunctionConfig extends ServerlessFunctionConfig {
  provider: 'azure';
  resourceGroup: string;
  functionApp: string;
  subscription?: string;
  plan?: AzureFunctionPlan;
  appSettings?: Record<string, string>;
  connectionStrings?: Record<string, AzureConnectionString>;
}

export interface AzureFunctionPlan {
  type: 'Consumption' | 'Premium' | 'Dedicated';
  sku?: string;
  tier?: string;
  size?: string;
  family?: string;
  capacity?: number;
}

export interface AzureConnectionString {
  value: string;
  type: 'SQLServer' | 'SQLAzure' | 'Custom' | 'NotificationHub' | 'ServiceBus' | 'EventHub' | 'ApiHub' | 'DocDb' | 'RedisCache' | 'PostgreSQL' | 'MySQL';
}

export interface GoogleCloudFunctionConfig extends ServerlessFunctionConfig {
  provider: 'gcp';
  project: string;
  region: string;
  httpsTrigger?: GoogleHttpsTriggerConfig;
  eventTrigger?: GoogleEventTriggerConfig;
  serviceAccountEmail?: string;
  availableMemoryMb?: number;
  maxInstances?: number;
  minInstances?: number;
  vpcConnector?: string;
  vpcConnectorEgressSettings?: 'PRIVATE_RANGES_ONLY' | 'ALL_TRAFFIC';
  ingressSettings?: 'ALLOW_ALL' | 'ALLOW_INTERNAL_ONLY' | 'ALLOW_INTERNAL_AND_GCLB';
  buildEnvironmentVariables?: Record<string, string>;
  secretEnvironmentVariables?: GoogleSecretEnvironmentVariable[];
  secretVolumes?: GoogleSecretVolume[];
}

export interface GoogleHttpsTriggerConfig {
  url?: string;
  securityLevel?: 'SECURE_ALWAYS' | 'SECURE_OPTIONAL';
}

export interface GoogleEventTriggerConfig {
  eventType: string;
  resource: string;
  service?: string;
  failurePolicy?: GoogleFailurePolicyConfig;
}

export interface GoogleFailurePolicyConfig {
  retry: boolean;
}

export interface GoogleSecretEnvironmentVariable {
  key: string;
  projectId: string;
  secret: string;
  version: string;
}

export interface GoogleSecretVolume {
  mountPath: string;
  projectId: string;
  secret: string;
  versions: GoogleSecretVersion[];
}

export interface GoogleSecretVersion {
  version: string;
  path: string;
}

// Multi-Cloud Serverless Configuration

export interface MultiCloudServerlessConfig {
  primary: ServerlessProviderConfig;
  secondary?: ServerlessProviderConfig[];
  failover?: ServerlessFailoverConfig;
  loadBalancing?: ServerlessLoadBalancingConfig;
  dataSync?: ServerlessDataSyncConfig;
}

export interface ServerlessProviderConfig {
  provider: 'aws' | 'azure' | 'gcp';
  config: AWSLambdaConfig | AzureFunctionConfig | GoogleCloudFunctionConfig;
  weight?: number;
  priority?: number;
}

export interface ServerlessFailoverConfig {
  enabled: boolean;
  healthCheck: ServerlessHealthCheckConfig;
  failoverThreshold: number;
  recoveryThreshold: number;
  failoverDelay: number;
  recoveryDelay: number;
}

export interface ServerlessHealthCheckConfig {
  endpoint?: string;
  method?: string;
  expectedStatusCode?: number;
  timeout: number;
  interval: number;
  retries: number;
}

export interface ServerlessLoadBalancingConfig {
  strategy: 'round-robin' | 'weighted' | 'least-connections' | 'geographic';
  healthCheck: ServerlessHealthCheckConfig;
  stickySession?: boolean;
  sessionTimeout?: number;
}

export interface ServerlessDataSyncConfig {
  enabled: boolean;
  strategy: 'eventual-consistency' | 'strong-consistency' | 'custom';
  syncInterval: number;
  conflictResolution: 'last-write-wins' | 'custom';
}