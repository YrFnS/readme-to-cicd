/**
 * API Management Types and Interfaces
 */

export interface APIManagerConfig {
  versioning: VersionConfig;
  documentation: DocumentationConfig;
  analytics: AnalyticsConfig;
  deprecation: DeprecationConfig;
}

export interface VersionConfig {
  strategy: 'header' | 'path' | 'query';
  headerName?: string;
  queryParam?: string;
  pathPrefix?: string;
  defaultVersion: string;
  supportedVersions: string[];
  deprecationWarnings: boolean;
}

export interface DocumentationConfig {
  enabled: boolean;
  autoGenerate: boolean;
  outputPath: string;
  formats: ('openapi' | 'swagger' | 'postman' | 'insomnia')[];
  includeExamples: boolean;
  includeSchemas: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackRequests: boolean;
  trackResponses: boolean;
  trackErrors: boolean;
  trackPerformance: boolean;
  retentionDays: number;
}

export interface DeprecationConfig {
  warningHeader: string;
  sunsetHeader: string;
  noticeAdvanceDays: number;
  removalAdvanceDays: number;
}

export interface APIVersion {
  version: string;
  status: 'active' | 'deprecated' | 'sunset';
  releaseDate: Date;
  deprecationDate?: Date;
  sunsetDate?: Date;
  changelog: string[];
  breakingChanges: string[];
  routes: APIRoute[];
}

export interface APIRoute {
  path: string;
  method: string;
  summary: string;
  description?: string;
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses: APIResponse[];
  tags?: string[];
  deprecated?: boolean;
  version?: string;
}

export interface APIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required: boolean;
  schema: APISchema;
  description?: string;
  example?: any;
}

export interface APIRequestBody {
  description?: string;
  required: boolean;
  content: Record<string, APIMediaType>;
}

export interface APIResponse {
  statusCode: number;
  description: string;
  content?: Record<string, APIMediaType>;
  headers?: Record<string, APIHeader>;
}

export interface APIMediaType {
  schema: APISchema;
  example?: any;
  examples?: Record<string, APIExample>;
}

export interface APIHeader {
  description?: string;
  schema: APISchema;
  example?: any;
}

export interface APIExample {
  summary?: string;
  description?: string;
  value: any;
}

export interface APISchema {
  type: string;
  format?: string;
  properties?: Record<string, APISchema>;
  items?: APISchema;
  required?: string[];
  enum?: any[];
  example?: any;
  description?: string;
}

export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components: OpenAPIComponents;
  security?: OpenAPISecurityRequirement[];
  tags?: OpenAPITag[];
}

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: OpenAPIContact;
  license?: OpenAPILicense;
}

export interface OpenAPIContact {
  name?: string;
  email?: string;
  url?: string;
}

export interface OpenAPILicense {
  name: string;
  url?: string;
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  tags?: string[];
  security?: OpenAPISecurityRequirement[];
  deprecated?: boolean;
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema: OpenAPISchema;
  description?: string;
  example?: any;
}

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, OpenAPIMediaType>;
  headers?: Record<string, OpenAPIHeader>;
}

export interface OpenAPIMediaType {
  schema: OpenAPISchema;
  example?: any;
  examples?: Record<string, OpenAPIExample>;
}

export interface OpenAPIHeader {
  description?: string;
  schema: OpenAPISchema;
  example?: any;
}

export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value: any;
}

export interface OpenAPISchema {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  enum?: any[];
  example?: any;
  description?: string;
  $ref?: string;
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  responses?: Record<string, OpenAPIResponse>;
  parameters?: Record<string, OpenAPIParameter>;
  examples?: Record<string, OpenAPIExample>;
  requestBodies?: Record<string, OpenAPIRequestBody>;
  headers?: Record<string, OpenAPIHeader>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
}

export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OpenAPISecurityRequirement {
  [name: string]: string[];
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocs;
}

export interface OpenAPIExternalDocs {
  description?: string;
  url: string;
}

export interface APIMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  endpoints: Record<string, EndpointMetrics>;
  versions: Record<string, VersionMetrics>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface EndpointMetrics {
  path: string;
  method: string;
  requests: number;
  errors: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  statusCodes: Record<number, number>;
}

export interface VersionMetrics {
  version: string;
  requests: number;
  errors: number;
  averageResponseTime: number;
  uniqueUsers: number;
  endpoints: Record<string, EndpointMetrics>;
}