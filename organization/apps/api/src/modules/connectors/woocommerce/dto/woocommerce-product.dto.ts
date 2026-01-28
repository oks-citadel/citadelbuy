/**
 * WooCommerce Product DTOs
 *
 * These DTOs represent the structure of WooCommerce product data
 * as returned by the WooCommerce REST API.
 */

/**
 * WooCommerce product image
 */
export interface WooCommerceImage {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  src: string;
  name: string;
  alt: string;
}

/**
 * WooCommerce product category
 */
export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
}

/**
 * WooCommerce product tag
 */
export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
}

/**
 * WooCommerce product attribute
 */
export interface WooCommerceAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

/**
 * WooCommerce product default attribute
 */
export interface WooCommerceDefaultAttribute {
  id: number;
  name: string;
  option: string;
}

/**
 * WooCommerce product dimensions
 */
export interface WooCommerceDimensions {
  length: string;
  width: string;
  height: string;
}

/**
 * WooCommerce product meta data
 */
export interface WooCommerceMetaData {
  id: number;
  key: string;
  value: any;
}

/**
 * WooCommerce product download
 */
export interface WooCommerceDownload {
  id: string;
  name: string;
  file: string;
}

/**
 * WooCommerce product (base type for simple products)
 */
export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: 'simple' | 'grouped' | 'external' | 'variable';
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured: boolean;
  catalog_visibility: 'visible' | 'catalog' | 'search' | 'hidden';
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: WooCommerceDownload[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: 'taxable' | 'shipping' | 'none';
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  backorders: 'no' | 'notify' | 'yes';
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: WooCommerceDimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: WooCommerceCategory[];
  tags: WooCommerceTag[];
  images: WooCommerceImage[];
  attributes: WooCommerceAttribute[];
  default_attributes: WooCommerceDefaultAttribute[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: WooCommerceMetaData[];
}

/**
 * WooCommerce product variation
 */
export interface WooCommerceVariation {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  on_sale: boolean;
  status: 'draft' | 'pending' | 'private' | 'publish';
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads: WooCommerceDownload[];
  download_limit: number;
  download_expiry: number;
  tax_status: 'taxable' | 'shipping' | 'none';
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  backorders: 'no' | 'notify' | 'yes';
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: WooCommerceDimensions;
  shipping_class: string;
  shipping_class_id: number;
  image: WooCommerceImage | null;
  attributes: {
    id: number;
    name: string;
    option: string;
  }[];
  menu_order: number;
  meta_data: WooCommerceMetaData[];
}

/**
 * WooCommerce products list response (with pagination headers)
 */
export interface WooCommerceProductsResponse {
  products: WooCommerceProduct[];
  totalPages: number;
  totalCount: number;
}

/**
 * WooCommerce webhook topic
 */
export enum WooCommerceWebhookTopic {
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  PRODUCT_RESTORED = 'product.restored',
}

/**
 * WooCommerce webhook payload
 */
export interface WooCommerceWebhookPayload {
  id: number;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number | null;
  stock_status?: string;
  categories?: WooCommerceCategory[];
  tags?: WooCommerceTag[];
  images?: WooCommerceImage[];
  attributes?: WooCommerceAttribute[];
  variations?: number[];
  // Full product data for create/update
  [key: string]: any;
}

/**
 * WooCommerce webhook headers
 */
export interface WooCommerceWebhookHeaders {
  'x-wc-webhook-topic': string;
  'x-wc-webhook-resource': string;
  'x-wc-webhook-event': string;
  'x-wc-webhook-signature': string;
  'x-wc-webhook-id': string;
  'x-wc-webhook-delivery-id': string;
  'x-wc-webhook-source': string;
}

/**
 * WooCommerce store info
 */
export interface WooCommerceStoreInfo {
  store_id: string;
  store_name: string;
  store_url: string;
  wc_version: string;
  currency: string;
  currency_symbol: string;
  currency_position: string;
  thousand_separator: string;
  decimal_separator: string;
  number_of_decimals: number;
  weight_unit: string;
  dimension_unit: string;
  timezone: string;
}

/**
 * WooCommerce API error response
 */
export interface WooCommerceErrorResponse {
  code: string;
  message: string;
  data: {
    status: number;
    params?: Record<string, string>;
  };
}
