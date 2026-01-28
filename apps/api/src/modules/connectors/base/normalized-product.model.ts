/**
 * Normalized Product Model
 *
 * This file contains the NormalizedProduct class implementation
 * with utility methods for validation and transformation.
 */

import {
  NormalizedProduct,
  NormalizedVariant,
  NormalizedInventory,
  NormalizedAttribute,
  ConnectorSource,
} from './connector.interface';

/**
 * NormalizedProductBuilder - Builder pattern for creating NormalizedProduct objects
 */
export class NormalizedProductBuilder {
  private product: Partial<NormalizedProduct> = {
    images: [],
    categories: [],
    tags: [],
    attributes: [],
    status: 'active',
    currency: 'USD',
  };

  setExternalId(id: string): this {
    this.product.externalId = id;
    return this;
  }

  setSource(source: ConnectorSource): this {
    this.product.source = source;
    return this;
  }

  setSku(sku: string): this {
    this.product.sku = sku;
    return this;
  }

  setName(name: string): this {
    this.product.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.product.description = description;
    return this;
  }

  setShortDescription(shortDescription: string): this {
    this.product.shortDescription = shortDescription;
    return this;
  }

  setPrice(price: number): this {
    this.product.price = price;
    return this;
  }

  setCompareAtPrice(price: number): this {
    this.product.compareAtPrice = price;
    return this;
  }

  setCostPrice(price: number): this {
    this.product.costPrice = price;
    return this;
  }

  setCurrency(currency: string): this {
    this.product.currency = currency;
    return this;
  }

  addImage(url: string): this {
    if (url && !this.product.images?.includes(url)) {
      this.product.images?.push(url);
    }
    return this;
  }

  setImages(images: string[]): this {
    this.product.images = images.filter((img) => img);
    return this;
  }

  setFeaturedImage(url: string): this {
    this.product.featuredImage = url;
    return this;
  }

  addCategory(category: string): this {
    if (category && !this.product.categories?.includes(category)) {
      this.product.categories?.push(category);
    }
    return this;
  }

  setCategories(categories: string[]): this {
    this.product.categories = categories.filter((cat) => cat);
    return this;
  }

  addTag(tag: string): this {
    if (tag && !this.product.tags?.includes(tag)) {
      this.product.tags?.push(tag);
    }
    return this;
  }

  setTags(tags: string[]): this {
    this.product.tags = tags.filter((tag) => tag);
    return this;
  }

  setVariants(variants: NormalizedVariant[]): this {
    this.product.variants = variants;
    return this;
  }

  setInventory(inventory: NormalizedInventory): this {
    this.product.inventory = inventory;
    return this;
  }

  addAttribute(attribute: NormalizedAttribute): this {
    this.product.attributes?.push(attribute);
    return this;
  }

  setAttributes(attributes: NormalizedAttribute[]): this {
    this.product.attributes = attributes;
    return this;
  }

  setSeo(seo: NormalizedProduct['seo']): this {
    this.product.seo = seo;
    return this;
  }

  setDimensions(dimensions: NormalizedProduct['dimensions']): this {
    this.product.dimensions = dimensions;
    return this;
  }

  setStatus(status: NormalizedProduct['status']): this {
    this.product.status = status;
    return this;
  }

  setVisibility(visibility: NormalizedProduct['visibility']): this {
    this.product.visibility = visibility;
    return this;
  }

  setProductType(productType: NormalizedProduct['productType']): this {
    this.product.productType = productType;
    return this;
  }

  setVendor(vendor: string): this {
    this.product.vendor = vendor;
    return this;
  }

  setBrand(brand: string): this {
    this.product.brand = brand;
    return this;
  }

  setBarcode(barcode: string): this {
    this.product.barcode = barcode;
    return this;
  }

  setCreatedAt(date: Date): this {
    this.product.createdAt = date;
    return this;
  }

  setUpdatedAt(date: Date): this {
    this.product.updatedAt = date;
    return this;
  }

  setMetadata(metadata: Record<string, any>): this {
    this.product.metadata = metadata;
    return this;
  }

  setRawData(rawData: any): this {
    this.product.rawData = rawData;
    return this;
  }

  /**
   * Build the NormalizedProduct object
   */
  build(): NormalizedProduct {
    // Validate required fields
    if (!this.product.externalId) {
      throw new Error('NormalizedProduct requires externalId');
    }
    if (!this.product.source) {
      throw new Error('NormalizedProduct requires source');
    }
    if (!this.product.sku) {
      throw new Error('NormalizedProduct requires sku');
    }
    if (!this.product.name) {
      throw new Error('NormalizedProduct requires name');
    }
    if (this.product.price === undefined || this.product.price === null) {
      throw new Error('NormalizedProduct requires price');
    }

    // Set featured image if not set
    if (!this.product.featuredImage && this.product.images && this.product.images.length > 0) {
      this.product.featuredImage = this.product.images[0];
    }

    return this.product as NormalizedProduct;
  }
}

/**
 * Product validation utilities
 */
export class ProductValidator {
  /**
   * Validate a normalized product
   */
  static validate(product: NormalizedProduct): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!product.externalId) {
      errors.push('externalId is required');
    }
    if (!product.source) {
      errors.push('source is required');
    }
    if (!product.sku) {
      errors.push('sku is required');
    }
    if (!product.name) {
      errors.push('name is required');
    }
    if (product.price === undefined || product.price === null) {
      errors.push('price is required');
    }
    if (!product.currency) {
      errors.push('currency is required');
    }

    // Validate price
    if (typeof product.price === 'number' && product.price < 0) {
      errors.push('price must be non-negative');
    }

    // Validate compare at price
    if (
      product.compareAtPrice !== undefined &&
      typeof product.compareAtPrice === 'number' &&
      product.compareAtPrice < 0
    ) {
      errors.push('compareAtPrice must be non-negative');
    }

    // Validate inventory
    if (product.inventory) {
      if (typeof product.inventory.quantity === 'number' && product.inventory.quantity < 0) {
        errors.push('inventory quantity must be non-negative');
      }
    }

    // Validate variants
    if (product.variants) {
      product.variants.forEach((variant, index) => {
        if (!variant.externalId) {
          errors.push(`variant[${index}] externalId is required`);
        }
        if (!variant.name) {
          errors.push(`variant[${index}] name is required`);
        }
        if (variant.price === undefined || variant.price === null) {
          errors.push(`variant[${index}] price is required`);
        }
        if (typeof variant.price === 'number' && variant.price < 0) {
          errors.push(`variant[${index}] price must be non-negative`);
        }
      });
    }

    // Validate images
    if (product.images) {
      product.images.forEach((img, index) => {
        if (!img || typeof img !== 'string') {
          errors.push(`images[${index}] must be a valid URL string`);
        }
      });
    }

    // Validate status
    const validStatuses = ['active', 'draft', 'archived', 'inactive'];
    if (product.status && !validStatuses.includes(product.status)) {
      errors.push(`status must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate source
    const validSources = ['shopify', 'woocommerce', 'rest', 'csv'];
    if (product.source && !validSources.includes(product.source)) {
      errors.push(`source must be one of: ${validSources.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize a normalized product
   */
  static sanitize(product: NormalizedProduct): NormalizedProduct {
    return {
      ...product,
      name: product.name?.trim(),
      description: product.description?.trim() || '',
      shortDescription: product.shortDescription?.trim(),
      sku: product.sku?.trim(),
      price: Math.max(0, Number(product.price) || 0),
      compareAtPrice:
        product.compareAtPrice !== undefined ? Math.max(0, Number(product.compareAtPrice) || 0) : undefined,
      costPrice: product.costPrice !== undefined ? Math.max(0, Number(product.costPrice) || 0) : undefined,
      currency: (product.currency || 'USD').toUpperCase(),
      images: (product.images || []).filter((img) => img && typeof img === 'string'),
      categories: (product.categories || []).filter((cat) => cat && typeof cat === 'string'),
      tags: (product.tags || []).filter((tag) => tag && typeof tag === 'string'),
      status: product.status || 'active',
      inventory: product.inventory
        ? {
            ...product.inventory,
            quantity: Math.max(0, Math.floor(Number(product.inventory.quantity) || 0)),
          }
        : undefined,
      variants: product.variants?.map((variant) => ({
        ...variant,
        name: variant.name?.trim(),
        price: Math.max(0, Number(variant.price) || 0),
        inventory: variant.inventory
          ? {
              ...variant.inventory,
              quantity: Math.max(0, Math.floor(Number(variant.inventory.quantity) || 0)),
            }
          : undefined,
      })),
    };
  }
}

/**
 * Product transformation utilities
 */
export class ProductTransformer {
  /**
   * Transform HTML description to plain text
   */
  static htmlToPlainText(html: string): string {
    if (!html) return '';
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Generate slug from product name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Extract currency from price string
   */
  static extractCurrency(priceString: string): { price: number; currency: string } {
    const currencySymbols: Record<string, string> = {
      $: 'USD',
      '\u00A3': 'GBP',
      '\u20AC': 'EUR',
      '\u00A5': 'JPY',
      '\u20B9': 'INR',
      '\u20BD': 'RUB',
      '\u20BF': 'BTC',
    };

    let currency = 'USD';
    let cleanPrice = priceString;

    // Check for currency symbols
    for (const [symbol, code] of Object.entries(currencySymbols)) {
      if (priceString.includes(symbol)) {
        currency = code;
        cleanPrice = cleanPrice.replace(symbol, '');
        break;
      }
    }

    // Check for currency codes (USD, EUR, etc.)
    const currencyCodeMatch = priceString.match(/[A-Z]{3}/);
    if (currencyCodeMatch) {
      currency = currencyCodeMatch[0];
      cleanPrice = cleanPrice.replace(currencyCodeMatch[0], '');
    }

    // Parse price
    const price = parseFloat(cleanPrice.replace(/[^0-9.-]/g, '')) || 0;

    return { price, currency };
  }

  /**
   * Normalize image URL
   */
  static normalizeImageUrl(url: string, baseUrl?: string): string {
    if (!url) return '';

    // Already absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Protocol-relative URL
    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    // Relative URL with base
    if (baseUrl) {
      const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const path = url.startsWith('/') ? url : `/${url}`;
      return `${base}${path}`;
    }

    return url;
  }

  /**
   * Parse categories from various formats
   */
  static parseCategories(input: string | string[] | any[]): string[] {
    if (!input) return [];

    if (Array.isArray(input)) {
      return input
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (typeof item === 'object' && item.name) return item.name.trim();
          if (typeof item === 'object' && item.title) return item.title.trim();
          return '';
        })
        .filter((cat) => cat);
    }

    if (typeof input === 'string') {
      // Try to split by common delimiters
      if (input.includes(',')) return input.split(',').map((s) => s.trim()).filter((s) => s);
      if (input.includes('>')) return input.split('>').map((s) => s.trim()).filter((s) => s);
      if (input.includes('/')) return input.split('/').map((s) => s.trim()).filter((s) => s);
      return [input.trim()].filter((s) => s);
    }

    return [];
  }

  /**
   * Merge product data (for delta syncs)
   */
  static mergeProducts(existing: NormalizedProduct, updated: Partial<NormalizedProduct>): NormalizedProduct {
    const merged = { ...existing };

    // Merge simple fields
    const simpleFields: (keyof NormalizedProduct)[] = [
      'name',
      'description',
      'shortDescription',
      'price',
      'compareAtPrice',
      'costPrice',
      'currency',
      'featuredImage',
      'status',
      'visibility',
      'productType',
      'vendor',
      'brand',
      'barcode',
      'updatedAt',
    ];

    for (const field of simpleFields) {
      if (updated[field] !== undefined) {
        (merged as any)[field] = updated[field];
      }
    }

    // Merge arrays (replace if provided)
    if (updated.images) merged.images = updated.images;
    if (updated.categories) merged.categories = updated.categories;
    if (updated.tags) merged.tags = updated.tags;
    if (updated.attributes) merged.attributes = updated.attributes;
    if (updated.variants) merged.variants = updated.variants;

    // Merge objects
    if (updated.inventory) {
      merged.inventory = { ...existing.inventory, ...updated.inventory };
    }
    if (updated.seo) {
      merged.seo = { ...existing.seo, ...updated.seo };
    }
    if (updated.dimensions) {
      merged.dimensions = { ...existing.dimensions, ...updated.dimensions };
    }
    if (updated.metadata) {
      merged.metadata = { ...existing.metadata, ...updated.metadata };
    }

    return merged;
  }
}

/**
 * Product comparison utilities
 */
export class ProductComparator {
  /**
   * Check if two products are equal (for change detection)
   */
  static areEqual(a: NormalizedProduct, b: NormalizedProduct): boolean {
    // Compare essential fields
    if (a.name !== b.name) return false;
    if (a.description !== b.description) return false;
    if (a.price !== b.price) return false;
    if (a.compareAtPrice !== b.compareAtPrice) return false;
    if (a.status !== b.status) return false;
    if (a.sku !== b.sku) return false;

    // Compare arrays
    if (!this.arraysEqual(a.images, b.images)) return false;
    if (!this.arraysEqual(a.categories, b.categories)) return false;
    if (!this.arraysEqual(a.tags, b.tags)) return false;

    // Compare inventory
    if (a.inventory?.quantity !== b.inventory?.quantity) return false;
    if (a.inventory?.trackInventory !== b.inventory?.trackInventory) return false;

    // Compare variants count
    if ((a.variants?.length || 0) !== (b.variants?.length || 0)) return false;

    return true;
  }

  /**
   * Get differences between two products
   */
  static getDifferences(
    existing: NormalizedProduct,
    updated: NormalizedProduct,
  ): { field: string; oldValue: any; newValue: any }[] {
    const differences: { field: string; oldValue: any; newValue: any }[] = [];

    const fieldsToCompare: (keyof NormalizedProduct)[] = [
      'name',
      'description',
      'shortDescription',
      'price',
      'compareAtPrice',
      'costPrice',
      'currency',
      'status',
      'visibility',
      'vendor',
      'brand',
      'barcode',
    ];

    for (const field of fieldsToCompare) {
      if (existing[field] !== updated[field]) {
        differences.push({
          field,
          oldValue: existing[field],
          newValue: updated[field],
        });
      }
    }

    // Check arrays
    if (!this.arraysEqual(existing.images, updated.images)) {
      differences.push({
        field: 'images',
        oldValue: existing.images,
        newValue: updated.images,
      });
    }

    if (!this.arraysEqual(existing.categories, updated.categories)) {
      differences.push({
        field: 'categories',
        oldValue: existing.categories,
        newValue: updated.categories,
      });
    }

    // Check inventory
    if (existing.inventory?.quantity !== updated.inventory?.quantity) {
      differences.push({
        field: 'inventory.quantity',
        oldValue: existing.inventory?.quantity,
        newValue: updated.inventory?.quantity,
      });
    }

    return differences;
  }

  private static arraysEqual(a?: any[], b?: any[]): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((item, index) => item === b[index]);
  }
}
