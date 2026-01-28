/**
 * Shopify Product DTOs
 *
 * These DTOs represent the structure of Shopify product data
 * as returned by the Shopify API.
 */

/**
 * Shopify product image
 */
export interface ShopifyImage {
  id: number;
  product_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  alt: string | null;
  width: number;
  height: number;
  src: string;
  variant_ids: number[];
}

/**
 * Shopify product option
 */
export interface ShopifyOption {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

/**
 * Shopify product variant
 */
export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string | null;
  position: number;
  inventory_policy: 'deny' | 'continue';
  compare_at_price: string | null;
  fulfillment_service: string;
  inventory_management: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  barcode: string | null;
  grams: number;
  image_id: number | null;
  weight: number;
  weight_unit: string;
  inventory_item_id: number;
  inventory_quantity: number;
  old_inventory_quantity: number;
  requires_shipping: boolean;
}

/**
 * Shopify product metafield
 */
export interface ShopifyMetafield {
  id: number;
  namespace: string;
  key: string;
  value: string;
  value_type: 'string' | 'integer' | 'json_string';
  description: string | null;
  owner_id: number;
  owner_resource: string;
  created_at: string;
  updated_at: string;
}

/**
 * Shopify product (REST API format)
 */
export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at: string | null;
  template_suffix: string | null;
  published_scope: string;
  tags: string;
  status: 'active' | 'archived' | 'draft';
  admin_graphql_api_id: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: ShopifyImage[];
  image: ShopifyImage | null;
  metafields?: ShopifyMetafield[];
}

/**
 * Shopify products list response
 */
export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

/**
 * Shopify single product response
 */
export interface ShopifyProductResponse {
  product: ShopifyProduct;
}

/**
 * Shopify inventory level
 */
export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at: string;
}

/**
 * Shopify location
 */
export interface ShopifyLocation {
  id: number;
  name: string;
  address1: string;
  address2: string | null;
  city: string;
  zip: string;
  province: string;
  country: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  country_code: string;
  country_name: string;
  province_code: string;
  legacy: boolean;
  active: boolean;
}

/**
 * Shopify GraphQL product edge (for pagination)
 */
export interface ShopifyGraphQLProductEdge {
  node: ShopifyGraphQLProduct;
  cursor: string;
}

/**
 * Shopify GraphQL product
 */
export interface ShopifyGraphQLProduct {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  productType: string;
  vendor: string;
  tags: string[];
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  variants: {
    edges: ShopifyGraphQLVariantEdge[];
  };
  images: {
    edges: ShopifyGraphQLImageEdge[];
  };
  featuredImage: ShopifyGraphQLImage | null;
  metafields: {
    edges: ShopifyGraphQLMetafieldEdge[];
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  compareAtPriceRange: {
    minVariantCompareAtPrice: {
      amount: string;
      currencyCode: string;
    } | null;
    maxVariantCompareAtPrice: {
      amount: string;
      currencyCode: string;
    } | null;
  };
  totalInventory: number;
}

/**
 * Shopify GraphQL variant edge
 */
export interface ShopifyGraphQLVariantEdge {
  node: ShopifyGraphQLVariant;
}

/**
 * Shopify GraphQL variant
 */
export interface ShopifyGraphQLVariant {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  barcode: string | null;
  weight: number | null;
  weightUnit: string;
  inventoryQuantity: number;
  selectedOptions: {
    name: string;
    value: string;
  }[];
  image: ShopifyGraphQLImage | null;
  inventoryItem: {
    id: string;
    tracked: boolean;
  };
}

/**
 * Shopify GraphQL image edge
 */
export interface ShopifyGraphQLImageEdge {
  node: ShopifyGraphQLImage;
}

/**
 * Shopify GraphQL image
 */
export interface ShopifyGraphQLImage {
  id: string;
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

/**
 * Shopify GraphQL metafield edge
 */
export interface ShopifyGraphQLMetafieldEdge {
  node: ShopifyGraphQLMetafield;
}

/**
 * Shopify GraphQL metafield
 */
export interface ShopifyGraphQLMetafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
}

/**
 * Shopify webhook topics
 */
export enum ShopifyWebhookTopic {
  PRODUCTS_CREATE = 'products/create',
  PRODUCTS_UPDATE = 'products/update',
  PRODUCTS_DELETE = 'products/delete',
  INVENTORY_LEVELS_UPDATE = 'inventory_levels/update',
  APP_UNINSTALLED = 'app/uninstalled',
}

/**
 * Shopify webhook payload
 */
export interface ShopifyWebhookPayload {
  id: number;
  title?: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  created_at?: string;
  handle?: string;
  updated_at?: string;
  published_at?: string | null;
  status?: 'active' | 'archived' | 'draft';
  variants?: ShopifyVariant[];
  images?: ShopifyImage[];
  // For inventory updates
  inventory_item_id?: number;
  location_id?: number;
  available?: number;
}

/**
 * Shopify webhook headers
 */
export interface ShopifyWebhookHeaders {
  'x-shopify-topic': string;
  'x-shopify-hmac-sha256': string;
  'x-shopify-shop-domain': string;
  'x-shopify-api-version': string;
  'x-shopify-webhook-id': string;
}

/**
 * Shopify OAuth callback parameters
 */
export interface ShopifyOAuthCallback {
  code: string;
  hmac: string;
  host: string;
  shop: string;
  state: string;
  timestamp: string;
}

/**
 * Shopify access token response
 */
export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
}

/**
 * Shopify shop info
 */
export interface ShopifyShop {
  id: number;
  name: string;
  email: string;
  domain: string;
  province: string;
  country: string;
  address1: string;
  zip: string;
  city: string;
  source: string;
  phone: string;
  latitude: number;
  longitude: number;
  primary_locale: string;
  currency: string;
  timezone: string;
  iana_timezone: string;
  shop_owner: string;
  money_format: string;
  plan_name: string;
  plan_display_name: string;
  has_discounts: boolean;
  has_gift_cards: boolean;
  myshopify_domain: string;
  google_apps_domain: string | null;
  weight_unit: string;
  created_at: string;
  updated_at: string;
}

/**
 * Shopify rate limit info
 */
export interface ShopifyRateLimitInfo {
  available: number;
  maximum: number;
  restoreRate: number;
  requestedQueryCost?: number;
  actualQueryCost?: number;
}
