/**
 * REST API Product Mapper
 *
 * Maps generic REST API responses to normalized product format
 * using configurable JSONPath-based field extraction.
 */

import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore
import * as jp from 'jsonpath';
import {
  NormalizedProduct,
  NormalizedVariant,
  NormalizedInventory,
  NormalizedAttribute,
} from '../base/connector.interface';
import {
  RestFieldMapping,
  JsonPathMapping,
  RestFieldTransform,
  RestApiProduct,
} from './dto/rest-config.dto';
import { NormalizedProductBuilder, ProductTransformer } from '../base/normalized-product.model';

@Injectable()
export class RestMapper {
  private readonly logger = new Logger(RestMapper.name);

  /**
   * Map a REST API product to normalized format
   */
  mapProduct(rawProduct: RestApiProduct, fieldMapping: RestFieldMapping, defaultCurrency: string = 'USD'): NormalizedProduct {
    try {
      const builder = new NormalizedProductBuilder();

      // Required fields
      const externalId = this.extractValue(rawProduct, fieldMapping.externalId);
      const name = this.extractValue(rawProduct, fieldMapping.name);
      const price = this.extractNumericValue(rawProduct, fieldMapping.price);

      builder
        .setExternalId(String(externalId))
        .setSource('rest')
        .setName(String(name))
        .setPrice(price);

      // SKU (use externalId as fallback)
      const sku = fieldMapping.sku
        ? this.extractValue(rawProduct, fieldMapping.sku)
        : `REST-${externalId}`;
      builder.setSku(String(sku));

      // Description
      const description = fieldMapping.description
        ? this.extractValue(rawProduct, fieldMapping.description)
        : '';
      builder.setDescription(String(description || ''));

      if (fieldMapping.shortDescription) {
        const shortDesc = this.extractValue(rawProduct, fieldMapping.shortDescription);
        if (shortDesc) {
          builder.setShortDescription(String(shortDesc));
        }
      }

      // Currency
      const currency = fieldMapping.currency
        ? this.extractValue(rawProduct, fieldMapping.currency)
        : defaultCurrency;
      builder.setCurrency(String(currency || defaultCurrency).toUpperCase());

      // Compare at price
      if (fieldMapping.compareAtPrice) {
        const compareAt = this.extractNumericValue(rawProduct, fieldMapping.compareAtPrice);
        if (compareAt && compareAt > 0) {
          builder.setCompareAtPrice(compareAt);
        }
      }

      // Cost price
      if (fieldMapping.costPrice) {
        const cost = this.extractNumericValue(rawProduct, fieldMapping.costPrice);
        if (cost && cost > 0) {
          builder.setCostPrice(cost);
        }
      }

      // Images
      if (fieldMapping.images) {
        const images = this.extractArrayValue(rawProduct, fieldMapping.images);
        builder.setImages(images.map(String).filter((img) => img));
      }

      if (fieldMapping.featuredImage) {
        const featuredImage = this.extractValue(rawProduct, fieldMapping.featuredImage);
        if (featuredImage) {
          builder.setFeaturedImage(String(featuredImage));
        }
      }

      // Categories
      if (fieldMapping.categories) {
        const categories = this.extractArrayValue(rawProduct, fieldMapping.categories);
        builder.setCategories(ProductTransformer.parseCategories(categories));
      }

      // Tags
      if (fieldMapping.tags) {
        const tags = this.extractArrayValue(rawProduct, fieldMapping.tags);
        builder.setTags(tags.map(String).filter((tag) => tag));
      }

      // Inventory
      if (fieldMapping.quantity || fieldMapping.trackInventory) {
        const quantity = fieldMapping.quantity
          ? this.extractNumericValue(rawProduct, fieldMapping.quantity)
          : 0;
        const trackInventory = fieldMapping.trackInventory
          ? Boolean(this.extractValue(rawProduct, fieldMapping.trackInventory))
          : true;

        builder.setInventory({
          quantity: Math.max(0, Math.floor(quantity)),
          trackInventory,
        });
      }

      // Status
      if (fieldMapping.status) {
        const statusValue = this.extractValue(rawProduct, fieldMapping.status);
        const status = fieldMapping.statusMapping
          ? fieldMapping.statusMapping[String(statusValue)] || 'active'
          : this.mapGenericStatus(String(statusValue));
        builder.setStatus(status);
      } else {
        builder.setStatus('active');
      }

      // Vendor
      if (fieldMapping.vendor) {
        const vendor = this.extractValue(rawProduct, fieldMapping.vendor);
        if (vendor) {
          builder.setVendor(String(vendor));
        }
      }

      // Brand
      if (fieldMapping.brand) {
        const brand = this.extractValue(rawProduct, fieldMapping.brand);
        if (brand) {
          builder.setBrand(String(brand));
        }
      }

      // Barcode
      if (fieldMapping.barcode) {
        const barcode = this.extractValue(rawProduct, fieldMapping.barcode);
        if (barcode) {
          builder.setBarcode(String(barcode));
        }
      }

      // Dimensions
      if (fieldMapping.dimensions || fieldMapping.weight) {
        const dimensions: NormalizedProduct['dimensions'] = {};

        if (fieldMapping.weight) {
          dimensions.weight = this.extractNumericValue(rawProduct, fieldMapping.weight);
        }

        if (fieldMapping.dimensions) {
          if (fieldMapping.dimensions.length) {
            dimensions.length = this.extractNumericValue(rawProduct, fieldMapping.dimensions.length);
          }
          if (fieldMapping.dimensions.width) {
            dimensions.width = this.extractNumericValue(rawProduct, fieldMapping.dimensions.width);
          }
          if (fieldMapping.dimensions.height) {
            dimensions.height = this.extractNumericValue(rawProduct, fieldMapping.dimensions.height);
          }
          if (fieldMapping.dimensions.unit) {
            dimensions.dimensionUnit = String(this.extractValue(rawProduct, fieldMapping.dimensions.unit) || 'cm');
          }
        }

        builder.setDimensions(dimensions);
      }

      // Variants
      if (fieldMapping.variants && fieldMapping.variantMapping) {
        const variantsRaw = this.extractArrayValue(rawProduct, fieldMapping.variants);
        const variants = this.mapVariants(variantsRaw, fieldMapping.variantMapping);
        builder.setVariants(variants);
      }

      // Dates
      if (fieldMapping.createdAt) {
        const createdAt = this.extractValue(rawProduct, fieldMapping.createdAt);
        if (createdAt) {
          builder.setCreatedAt(new Date(String(createdAt)));
        }
      }

      if (fieldMapping.updatedAt) {
        const updatedAt = this.extractValue(rawProduct, fieldMapping.updatedAt);
        if (updatedAt) {
          builder.setUpdatedAt(new Date(String(updatedAt)));
        }
      }

      // Custom metadata
      if (fieldMapping.metadata) {
        const metadata: Record<string, any> = {};
        for (const [key, mapping] of Object.entries(fieldMapping.metadata)) {
          const value = this.extractValue(rawProduct, mapping);
          if (value !== undefined && value !== null) {
            metadata[key] = value;
          }
        }
        builder.setMetadata(metadata);
      }

      // Apply transformations
      if (fieldMapping.transformations) {
        // Transformations are applied during extraction
        // This is a placeholder for post-processing transformations
      }

      // Raw data
      builder.setRawData(rawProduct);

      return builder.build();
    } catch (error) {
      this.logger.error(`Failed to map REST product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract value using JSONPath
   */
  private extractValue(data: any, mapping: JsonPathMapping): any {
    try {
      const results = jp.query(data, mapping.path);

      if (results.length === 0) {
        return mapping.defaultValue;
      }

      let value = results[0];

      // Apply transform
      if (mapping.transform) {
        value = this.applyTransform(value, mapping.transform, mapping.format);
      }

      return value;
    } catch (error) {
      this.logger.debug(`JSONPath extraction failed for ${mapping.path}: ${error.message}`);
      return mapping.defaultValue;
    }
  }

  /**
   * Extract numeric value
   */
  private extractNumericValue(data: any, mapping: JsonPathMapping): number {
    const value = this.extractValue(data, mapping);

    if (value === undefined || value === null) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Remove currency symbols and parse
      const cleanValue = value.replace(/[^0-9.-]/g, '');
      return parseFloat(cleanValue) || 0;
    }

    return 0;
  }

  /**
   * Extract array value
   */
  private extractArrayValue(data: any, mapping: JsonPathMapping): any[] {
    const value = this.extractValue(data, mapping);

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Split by common delimiters
        return value.split(/[,;|]/).map((s) => s.trim()).filter((s) => s);
      }
    }

    if (value !== undefined && value !== null) {
      return [value];
    }

    return [];
  }

  /**
   * Apply value transformation
   */
  private applyTransform(value: any, transform: string, format?: string): any {
    switch (transform) {
      case 'string':
        return String(value || '');

      case 'number':
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const cleanValue = value.replace(/[^0-9.-]/g, '');
          return parseFloat(cleanValue) || 0;
        }
        return 0;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
        }
        return Boolean(value);

      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          return value.split(/[,;|]/).map((s) => s.trim()).filter((s) => s);
        }
        return value ? [value] : [];

      case 'date':
        if (value instanceof Date) return value;
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;

      default:
        return value;
    }
  }

  /**
   * Map variants from raw data
   */
  private mapVariants(
    variantsRaw: any[],
    mapping: RestFieldMapping['variantMapping'],
  ): NormalizedVariant[] {
    if (!mapping) return [];

    return variantsRaw.map((raw, index) => {
      const externalId = String(this.extractValue(raw, mapping.externalId));
      const name = String(this.extractValue(raw, mapping.name));
      const price = this.extractNumericValue(raw, mapping.price);

      const variant: NormalizedVariant = {
        externalId,
        name,
        price,
        attributes: [],
        isDefault: index === 0,
      };

      if (mapping.sku) {
        variant.sku = String(this.extractValue(raw, mapping.sku) || '');
      }

      if (mapping.quantity) {
        const quantity = this.extractNumericValue(raw, mapping.quantity);
        variant.inventory = {
          quantity: Math.max(0, Math.floor(quantity)),
          trackInventory: true,
        };
      }

      if (mapping.attributes) {
        const attrs = this.extractArrayValue(raw, mapping.attributes);
        variant.attributes = attrs.map((attr: any, pos: number) => {
          if (typeof attr === 'object') {
            return {
              name: attr.name || attr.key || `Attribute ${pos + 1}`,
              value: String(attr.value || attr.option || ''),
              position: pos + 1,
              isVariation: true,
            };
          }
          return {
            name: `Option`,
            value: String(attr),
            position: pos + 1,
            isVariation: true,
          };
        });
      }

      return variant;
    });
  }

  /**
   * Map generic status values to normalized status
   */
  private mapGenericStatus(status: string): 'active' | 'draft' | 'archived' | 'inactive' {
    const lowerStatus = status.toLowerCase();

    const activeStatuses = ['active', 'published', 'live', 'enabled', 'available', 'in_stock', 'visible'];
    const draftStatuses = ['draft', 'pending', 'review', 'unpublished'];
    const archivedStatuses = ['archived', 'deleted', 'removed', 'discontinued'];
    const inactiveStatuses = ['inactive', 'disabled', 'hidden', 'unavailable', 'out_of_stock'];

    if (activeStatuses.some((s) => lowerStatus.includes(s))) {
      return 'active';
    }
    if (draftStatuses.some((s) => lowerStatus.includes(s))) {
      return 'draft';
    }
    if (archivedStatuses.some((s) => lowerStatus.includes(s))) {
      return 'archived';
    }
    if (inactiveStatuses.some((s) => lowerStatus.includes(s))) {
      return 'inactive';
    }

    return 'active';
  }

  /**
   * Map multiple products
   */
  mapProducts(products: RestApiProduct[], fieldMapping: RestFieldMapping, defaultCurrency: string = 'USD'): NormalizedProduct[] {
    return products.map((product) => this.mapProduct(product, fieldMapping, defaultCurrency));
  }
}
