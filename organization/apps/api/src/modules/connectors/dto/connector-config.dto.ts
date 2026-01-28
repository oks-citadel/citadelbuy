/**
 * Connector Configuration DTOs
 *
 * DTOs for connector configuration CRUD operations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  ValidateNested,
  IsUrl,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Connector type enum
 */
export enum ConnectorTypeEnum {
  SHOPIFY = 'SHOPIFY',
  WOOCOMMERCE = 'WOOCOMMERCE',
  REST_API = 'REST_API',
  CSV = 'CSV',
}

/**
 * Authentication type enum for REST connectors
 */
export enum AuthTypeEnum {
  NONE = 'none',
  API_KEY = 'api_key',
  BEARER = 'bearer',
  BASIC = 'basic',
  OAUTH2 = 'oauth2',
}

/**
 * Shopify credentials DTO
 */
export class ShopifyCredentialsDto {
  @ApiProperty({ description: 'Shopify shop domain (e.g., my-store.myshopify.com)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$|^[a-zA-Z0-9][a-zA-Z0-9-]*$/, {
    message: 'Invalid Shopify shop domain format',
  })
  shopDomain: string;

  @ApiProperty({ description: 'Shopify access token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({ description: 'Shopify API key (for OAuth apps)' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Shopify API secret key (for OAuth apps)' })
  @IsString()
  @IsOptional()
  apiSecretKey?: string;
}

/**
 * Shopify settings DTO
 */
export class ShopifySettingsDto {
  @ApiPropertyOptional({ description: 'Use GraphQL API instead of REST', default: true })
  @IsBoolean()
  @IsOptional()
  useGraphQL?: boolean = true;

  @ApiPropertyOptional({ description: 'Sync inventory levels', default: true })
  @IsBoolean()
  @IsOptional()
  syncInventory?: boolean = true;

  @ApiPropertyOptional({ description: 'Sync product images', default: true })
  @IsBoolean()
  @IsOptional()
  syncImages?: boolean = true;

  @ApiPropertyOptional({ description: 'Enable webhooks for real-time updates', default: true })
  @IsBoolean()
  @IsOptional()
  webhooksEnabled?: boolean = true;

  @ApiPropertyOptional({ description: 'Shopify API version', default: '2024-01' })
  @IsString()
  @IsOptional()
  apiVersion?: string = '2024-01';
}

/**
 * WooCommerce credentials DTO
 */
export class WooCommerceCredentialsDto {
  @ApiProperty({ description: 'WooCommerce site URL' })
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  siteUrl: string;

  @ApiProperty({ description: 'WooCommerce consumer key' })
  @IsString()
  @IsNotEmpty()
  consumerKey: string;

  @ApiProperty({ description: 'WooCommerce consumer secret' })
  @IsString()
  @IsNotEmpty()
  consumerSecret: string;
}

/**
 * WooCommerce settings DTO
 */
export class WooCommerceSettingsDto {
  @ApiPropertyOptional({ description: 'Sync inventory levels', default: true })
  @IsBoolean()
  @IsOptional()
  syncInventory?: boolean = true;

  @ApiPropertyOptional({ description: 'Sync product images', default: true })
  @IsBoolean()
  @IsOptional()
  syncImages?: boolean = true;

  @ApiPropertyOptional({ description: 'Enable webhooks for real-time updates', default: true })
  @IsBoolean()
  @IsOptional()
  webhooksEnabled?: boolean = true;

  @ApiPropertyOptional({ description: 'WooCommerce API version', default: 'wc/v3' })
  @IsString()
  @IsOptional()
  apiVersion?: string = 'wc/v3';
}

/**
 * OAuth2 configuration DTO
 */
export class OAuth2ConfigDto {
  @ApiProperty({ description: 'OAuth2 client ID' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: 'OAuth2 client secret' })
  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @ApiProperty({ description: 'OAuth2 token URL' })
  @IsUrl()
  @IsNotEmpty()
  tokenUrl: string;

  @ApiPropertyOptional({ description: 'OAuth2 scope' })
  @IsString()
  @IsOptional()
  scope?: string;
}

/**
 * REST API credentials DTO
 */
export class RestCredentialsDto {
  @ApiProperty({ description: 'Base URL for the REST API' })
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  baseUrl: string;

  @ApiProperty({ enum: AuthTypeEnum, description: 'Authentication type' })
  @IsEnum(AuthTypeEnum)
  authType: AuthTypeEnum;

  @ApiPropertyOptional({ description: 'API key for authentication' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Header name for API key', default: 'X-API-Key' })
  @IsString()
  @IsOptional()
  apiKeyHeader?: string = 'X-API-Key';

  @ApiPropertyOptional({ description: 'Bearer token for authentication' })
  @IsString()
  @IsOptional()
  bearerToken?: string;

  @ApiPropertyOptional({ description: 'Username for basic auth' })
  @IsString()
  @IsOptional()
  basicUsername?: string;

  @ApiPropertyOptional({ description: 'Password for basic auth' })
  @IsString()
  @IsOptional()
  basicPassword?: string;

  @ApiPropertyOptional({ description: 'OAuth2 configuration' })
  @ValidateNested()
  @Type(() => OAuth2ConfigDto)
  @IsOptional()
  oauth2Config?: OAuth2ConfigDto;
}

/**
 * Pagination configuration DTO
 */
export class PaginationConfigDto {
  @ApiProperty({
    enum: ['offset', 'cursor', 'page'],
    description: 'Pagination type',
  })
  @IsEnum(['offset', 'cursor', 'page'])
  type: 'offset' | 'cursor' | 'page';

  @ApiProperty({ description: 'Parameter name for limit' })
  @IsString()
  @IsNotEmpty()
  limitParam: string;

  @ApiPropertyOptional({ description: 'Parameter name for offset' })
  @IsString()
  @IsOptional()
  offsetParam?: string;

  @ApiPropertyOptional({ description: 'Parameter name for cursor' })
  @IsString()
  @IsOptional()
  cursorParam?: string;

  @ApiPropertyOptional({ description: 'Parameter name for page' })
  @IsString()
  @IsOptional()
  pageParam?: string;
}

/**
 * Field transformation DTO
 */
export class FieldTransformationDto {
  @ApiProperty({ description: 'Field to transform' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    enum: ['prefix', 'suffix', 'replace', 'extract', 'default', 'template', 'number', 'boolean'],
    description: 'Transformation type',
  })
  @IsEnum(['prefix', 'suffix', 'replace', 'extract', 'default', 'template', 'number', 'boolean'])
  type: 'prefix' | 'suffix' | 'replace' | 'extract' | 'default' | 'template' | 'number' | 'boolean';

  @ApiPropertyOptional({ description: 'Value for transformation' })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({ description: 'Pattern for extraction/replacement' })
  @IsString()
  @IsOptional()
  pattern?: string;

  @ApiPropertyOptional({ description: 'Replacement string' })
  @IsString()
  @IsOptional()
  replacement?: string;
}

/**
 * Field mapping DTO
 */
export class FieldMappingDto {
  @ApiProperty({ description: 'JSONPath or field name for external ID' })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiPropertyOptional({ description: 'JSONPath or field name for SKU' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ description: 'JSONPath or field name for product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'JSONPath or field name for description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'JSONPath or field name for price' })
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiPropertyOptional({ description: 'JSONPath or field name for currency' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'JSONPath or field name for images' })
  @IsString()
  @IsOptional()
  images?: string;

  @ApiPropertyOptional({ description: 'JSONPath or field name for categories' })
  @IsString()
  @IsOptional()
  categories?: string;

  @ApiPropertyOptional({ description: 'JSONPath or field name for quantity' })
  @IsString()
  @IsOptional()
  quantity?: string;

  @ApiPropertyOptional({ description: 'JSONPath or field name for variants' })
  @IsString()
  @IsOptional()
  variants?: string;

  @ApiPropertyOptional({ description: 'Additional metadata field mappings' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Field transformations', type: [FieldTransformationDto] })
  @ValidateNested({ each: true })
  @Type(() => FieldTransformationDto)
  @IsArray()
  @IsOptional()
  transformations?: FieldTransformationDto[];
}

/**
 * REST API settings DTO
 */
export class RestSettingsDto {
  @ApiProperty({ description: 'Endpoint path for fetching products' })
  @IsString()
  @IsNotEmpty()
  productsEndpoint: string;

  @ApiPropertyOptional({ description: 'Endpoint path for fetching a single product' })
  @IsString()
  @IsOptional()
  singleProductEndpoint?: string;

  @ApiProperty({ description: 'Field mapping configuration' })
  @ValidateNested()
  @Type(() => FieldMappingDto)
  fieldMapping: FieldMappingDto;

  @ApiPropertyOptional({ description: 'Pagination configuration' })
  @ValidateNested()
  @Type(() => PaginationConfigDto)
  @IsOptional()
  pagination?: PaginationConfigDto;

  @ApiPropertyOptional({ description: 'Additional headers' })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Polling interval in minutes', default: 60 })
  @IsNumber()
  @Min(5)
  @Max(1440)
  @IsOptional()
  pollingInterval?: number = 60;
}

/**
 * CSV validation rule DTO
 */
export class CsvValidationRuleDto {
  @ApiProperty({ description: 'Field to validate' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    enum: ['required', 'regex', 'min', 'max', 'enum', 'unique'],
    description: 'Validation rule type',
  })
  @IsEnum(['required', 'regex', 'min', 'max', 'enum', 'unique'])
  type: 'required' | 'regex' | 'min' | 'max' | 'enum' | 'unique';

  @ApiPropertyOptional({ description: 'Value for validation' })
  @IsOptional()
  value?: string | number | string[];

  @ApiPropertyOptional({ description: 'Custom error message' })
  @IsString()
  @IsOptional()
  message?: string;
}

/**
 * CSV credentials DTO
 */
export class CsvCredentialsDto {
  @ApiProperty({
    enum: ['local', 's3', 'url'],
    description: 'Storage type for CSV files',
  })
  @IsEnum(['local', 's3', 'url'])
  storageType: 'local' | 's3' | 'url';

  @ApiPropertyOptional({ description: 'S3 bucket name' })
  @IsString()
  @IsOptional()
  s3Bucket?: string;

  @ApiPropertyOptional({ description: 'S3 region' })
  @IsString()
  @IsOptional()
  s3Region?: string;

  @ApiPropertyOptional({ description: 'S3 access key' })
  @IsString()
  @IsOptional()
  s3AccessKey?: string;

  @ApiPropertyOptional({ description: 'S3 secret key' })
  @IsString()
  @IsOptional()
  s3SecretKey?: string;

  @ApiPropertyOptional({ description: 'URL for remote CSV file' })
  @IsUrl()
  @IsOptional()
  fileUrl?: string;
}

/**
 * CSV settings DTO
 */
export class CsvSettingsDto {
  @ApiProperty({ description: 'Field mapping configuration' })
  @ValidateNested()
  @Type(() => FieldMappingDto)
  fieldMapping: FieldMappingDto;

  @ApiPropertyOptional({ description: 'CSV delimiter', default: ',' })
  @IsString()
  @IsOptional()
  delimiter?: string = ',';

  @ApiPropertyOptional({ description: 'Whether CSV has a header row', default: true })
  @IsBoolean()
  @IsOptional()
  hasHeader?: boolean = true;

  @ApiPropertyOptional({ description: 'File encoding', default: 'utf-8' })
  @IsString()
  @IsOptional()
  encoding?: string = 'utf-8';

  @ApiPropertyOptional({ description: 'Number of rows to skip at the beginning', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  skipRows?: number = 0;

  @ApiPropertyOptional({ description: 'Validation rules', type: [CsvValidationRuleDto] })
  @ValidateNested({ each: true })
  @Type(() => CsvValidationRuleDto)
  @IsArray()
  @IsOptional()
  validationRules?: CsvValidationRuleDto[];
}

/**
 * Create connector DTO
 */
export class CreateConnectorDto {
  @ApiProperty({ enum: ConnectorTypeEnum, description: 'Type of connector' })
  @IsEnum(ConnectorTypeEnum)
  type: ConnectorTypeEnum;

  @ApiProperty({ description: 'Connector name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Whether the connector is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ description: 'Connector credentials (type-specific)' })
  @IsObject()
  @IsNotEmpty()
  credentials: ShopifyCredentialsDto | WooCommerceCredentialsDto | RestCredentialsDto | CsvCredentialsDto;

  @ApiPropertyOptional({ description: 'Connector settings (type-specific)' })
  @IsObject()
  @IsOptional()
  settings?: ShopifySettingsDto | WooCommerceSettingsDto | RestSettingsDto | CsvSettingsDto;
}

/**
 * Update connector DTO
 */
export class UpdateConnectorDto {
  @ApiPropertyOptional({ description: 'Connector name' })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Whether the connector is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Connector credentials (type-specific)' })
  @IsObject()
  @IsOptional()
  credentials?: Partial<ShopifyCredentialsDto | WooCommerceCredentialsDto | RestCredentialsDto | CsvCredentialsDto>;

  @ApiPropertyOptional({ description: 'Connector settings (type-specific)' })
  @IsObject()
  @IsOptional()
  settings?: Partial<ShopifySettingsDto | WooCommerceSettingsDto | RestSettingsDto | CsvSettingsDto>;
}

/**
 * Connector response DTO
 */
export class ConnectorResponseDto {
  @ApiProperty({ description: 'Connector ID' })
  id: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ enum: ConnectorTypeEnum, description: 'Connector type' })
  type: ConnectorTypeEnum;

  @ApiProperty({ description: 'Connector name' })
  name: string;

  @ApiProperty({ description: 'Whether the connector is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last sync timestamp' })
  lastSyncAt?: Date;

  @ApiPropertyOptional({ description: 'Last sync status' })
  lastSyncStatus?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Test connection response DTO
 */
export class TestConnectionResponseDto {
  @ApiProperty({ description: 'Whether the connection test succeeded' })
  success: boolean;

  @ApiProperty({ description: 'Test result message' })
  message: string;

  @ApiPropertyOptional({ description: 'Additional details' })
  details?: {
    latency?: number;
    apiVersion?: string;
    permissions?: string[];
    productCount?: number;
  };

  @ApiPropertyOptional({ description: 'Error details if test failed' })
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Connector list query DTO
 */
export class ConnectorListQueryDto {
  @ApiPropertyOptional({ enum: ConnectorTypeEnum, description: 'Filter by connector type' })
  @IsEnum(ConnectorTypeEnum)
  @IsOptional()
  type?: ConnectorTypeEnum;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
