/**
 * REST Connector Configuration DTOs
 *
 * DTOs for configuring generic REST API connections.
 */

/**
 * JSONPath mapping for extracting data
 */
export interface JsonPathMapping {
  path: string;
  defaultValue?: any;
  transform?: 'string' | 'number' | 'boolean' | 'array' | 'date';
  format?: string; // For date formatting
}

/**
 * REST API authentication methods
 */
export type RestAuthMethod = 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';

/**
 * OAuth2 grant types
 */
export type OAuth2GrantType = 'client_credentials' | 'authorization_code' | 'refresh_token';

/**
 * REST API response format
 */
export type ResponseFormat = 'json' | 'xml' | 'csv';

/**
 * Pagination configuration
 */
export interface RestPaginationConfig {
  type: 'offset' | 'cursor' | 'page' | 'link_header';
  limitParam: string;
  offsetParam?: string;
  pageParam?: string;
  cursorParam?: string;
  cursorPath?: string; // JSONPath to extract next cursor
  totalPath?: string; // JSONPath to extract total count
  hasMorePath?: string; // JSONPath to check if more pages exist
  nextLinkPath?: string; // JSONPath to extract next page URL
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 * Request configuration
 */
export interface RestRequestConfig {
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyTemplate?: string; // JSON template with placeholders
}

/**
 * Response data extraction
 */
export interface RestResponseConfig {
  format: ResponseFormat;
  dataPath: string; // JSONPath to array of products
  errorPath?: string; // JSONPath to error message
}

/**
 * Field transformation rule
 */
export interface RestFieldTransform {
  type: 'split' | 'join' | 'replace' | 'regex' | 'template' | 'lookup' | 'calculate';
  params: Record<string, any>;
}

/**
 * Complete field mapping configuration
 */
export interface RestFieldMapping {
  // Required fields
  externalId: JsonPathMapping;
  name: JsonPathMapping;
  price: JsonPathMapping;

  // Optional fields
  sku?: JsonPathMapping;
  description?: JsonPathMapping;
  shortDescription?: JsonPathMapping;
  currency?: JsonPathMapping;
  compareAtPrice?: JsonPathMapping;
  costPrice?: JsonPathMapping;
  images?: JsonPathMapping;
  featuredImage?: JsonPathMapping;
  categories?: JsonPathMapping;
  tags?: JsonPathMapping;
  quantity?: JsonPathMapping;
  trackInventory?: JsonPathMapping;
  status?: JsonPathMapping;
  vendor?: JsonPathMapping;
  brand?: JsonPathMapping;
  barcode?: JsonPathMapping;
  weight?: JsonPathMapping;
  dimensions?: {
    length?: JsonPathMapping;
    width?: JsonPathMapping;
    height?: JsonPathMapping;
    unit?: JsonPathMapping;
  };
  variants?: JsonPathMapping;
  variantMapping?: {
    externalId: JsonPathMapping;
    name: JsonPathMapping;
    sku?: JsonPathMapping;
    price: JsonPathMapping;
    quantity?: JsonPathMapping;
    attributes?: JsonPathMapping;
  };
  createdAt?: JsonPathMapping;
  updatedAt?: JsonPathMapping;

  // Custom metadata fields
  metadata?: Record<string, JsonPathMapping>;

  // Transformations to apply
  transformations?: Record<string, RestFieldTransform>;

  // Status mapping (source value -> normalized value)
  statusMapping?: Record<string, 'active' | 'draft' | 'archived' | 'inactive'>;
}

/**
 * Scheduled sync configuration
 */
export interface RestSyncSchedule {
  enabled: boolean;
  cronExpression?: string; // e.g., "0 */2 * * *" for every 2 hours
  intervalMinutes?: number;
  timezone?: string;
}

/**
 * Error handling configuration
 */
export interface RestErrorHandling {
  retryCount: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  ignoreHttpErrors?: number[]; // HTTP status codes to ignore
  continueOnProductError: boolean;
}

/**
 * Complete REST connector configuration
 */
export interface RestConnectorFullConfig {
  // Connection
  baseUrl: string;
  authMethod: RestAuthMethod;

  // Authentication
  apiKey?: string;
  apiKeyHeader?: string;
  apiKeyLocation?: 'header' | 'query';
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  oauth2?: {
    grantType: OAuth2GrantType;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
    audience?: string;
  };

  // Endpoints
  productsEndpoint: string;
  singleProductEndpoint?: string; // With {id} placeholder
  deltaEndpoint?: string; // For fetching changes

  // Request/Response
  request: RestRequestConfig;
  response: RestResponseConfig;
  pagination?: RestPaginationConfig;

  // Field Mapping
  fieldMapping: RestFieldMapping;

  // Scheduling
  syncSchedule?: RestSyncSchedule;

  // Error Handling
  errorHandling?: RestErrorHandling;

  // Rate Limiting
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit?: number;
  };

  // Timeout
  timeoutMs?: number;

  // SSL/TLS
  sslVerify?: boolean;
  customCaCert?: string;
}

/**
 * REST API product structure (generic)
 */
export interface RestApiProduct {
  [key: string]: any;
}

/**
 * REST API response (generic)
 */
export interface RestApiResponse {
  data?: any;
  items?: any[];
  products?: any[];
  results?: any[];
  [key: string]: any;
}

/**
 * OAuth2 token response
 */
export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * REST connector state
 */
export interface RestConnectorState {
  accessToken?: string;
  tokenExpiresAt?: Date;
  lastCursor?: string;
  lastSyncTimestamp?: Date;
}
