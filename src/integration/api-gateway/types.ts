/**
 * API Gateway Types and Interfaces
 */

export interface APIGatewayConfig {
  port: number;
  host: string;
  basePath: string;
  cors: CORSConfig;
  security: SecurityConfig;
  rateLimit: RateLimitConfig;
  timeout: number;
  maxRequestSize: string;
}

export interface CORSConfig {
  enabled: boolean;
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
}

export interface SecurityConfig {
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  encryption: EncryptionConfig;
}

export interface AuthenticationConfig {
  enabled: boolean;
  methods: ('oauth2' | 'apikey' | 'jwt' | 'basic')[];
  oauth2?: OAuth2Config;
  jwt?: JWTConfig;
}

export interface OAuth2Config {
  issuer: string;
  audience: string;
  scopes: string[];
}

export interface JWTConfig {
  secret: string;
  algorithm: string;
  expiresIn: string;
}

export interface AuthorizationConfig {
  enabled: boolean;
  rbac: RBACConfig;
}

export interface RBACConfig {
  roles: Role[];
  permissions: Permission[];
}

export interface Role {
  name: string;
  permissions: string[];
  description?: string;
}

export interface Permission {
  name: string;
  resource: string;
  actions: string[];
  description?: string;
}

export interface EncryptionConfig {
  tls: TLSConfig;
  dataEncryption: DataEncryptionConfig;
}

export interface TLSConfig {
  enabled: boolean;
  version: string;
  certificatePath?: string;
  keyPath?: string;
}

export interface DataEncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyRotation: boolean;
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator?: (req: any) => string;
}

export interface Route {
  path: string;
  method: HTTPMethod;
  handler: RouteHandler;
  middleware?: MiddlewareFunction[];
  config: RouteConfig;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface RouteConfig {
  authentication?: boolean;
  authorization?: string[];
  rateLimit?: RateLimitConfig;
  timeout?: number;
  validation?: ValidationConfig;
  transformation?: TransformationConfig;
  caching?: CachingConfig;
}

export interface ValidationConfig {
  request?: {
    headers?: Record<string, any>;
    query?: Record<string, any>;
    body?: Record<string, any>;
  };
  response?: {
    headers?: Record<string, any>;
    body?: Record<string, any>;
  };
}

export interface TransformationConfig {
  request?: TransformationRule[];
  response?: TransformationRule[];
}

export interface TransformationRule {
  type: 'map' | 'filter' | 'transform' | 'validate';
  source: string;
  target?: string;
  function?: string;
  parameters?: Record<string, any>;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  keyGenerator?: (req: any) => string;
  conditions?: CacheCondition[];
}

export interface CacheCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin';
  value: any;
}

export interface RequestContext {
  id: string;
  method: HTTPMethod;
  path: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  user?: User;
  metadata: Record<string, any>;
  startTime: Date;
}

export interface ResponseContext {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  metadata: Record<string, any>;
  endTime: Date;
  duration: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, any>;
}

export type MiddlewareFunction = (
  context: RequestContext,
  next: () => Promise<ResponseContext>
) => Promise<ResponseContext>;

export type RouteHandler = (
  context: RequestContext
) => Promise<ResponseContext>;

export interface APIError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    requestId: string;
    timestamp: string;
    version: string;
    duration: number;
  };
}