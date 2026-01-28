/**
 * Shopify Product Mapper
 *
 * Maps Shopify product data to the normalized product format.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  NormalizedProduct,
  NormalizedVariant,
  NormalizedInventory,
  NormalizedAttribute,
} from '../base/connector.interface';
import {
  ShopifyProduct,
  ShopifyVariant,
  ShopifyGraphQLProduct,
  ShopifyGraphQLVariant,
  ShopifyImage,
  ShopifyGraphQLImage,
} from './dto/shopify-product.dto';
import { NormalizedProductBuilder, ProductTransformer } from '../base/normalized-product.model';

@Injectable()
export class ShopifyMapper {
  private readonly logger = new Logger(ShopifyMapper.name);

  /**
   * Map a Shopify REST API product to normalized format
   */
  mapRestProduct(shopifyProduct: ShopifyProduct, currency: string = 'USD'): NormalizedProduct {
    try {
      const builder = new NormalizedProductBuilder();

      // Basic product info
      builder
        .setExternalId(shopifyProduct.id.toString())
        .setSource('shopify')
        .setSku(this.extractSku(shopifyProduct))
        .setName(shopifyProduct.title)
        .setDescription(shopifyProduct.body_html || '')
        .setPrice(this.extractPrice(shopifyProduct))
        .setCurrency(currency);

      // Compare at price
      const compareAtPrice = this.extractCompareAtPrice(shopifyProduct);
      if (compareAtPrice) {
        builder.setCompareAtPrice(compareAtPrice);
      }

      // Images
      const images = this.mapRestImages(shopifyProduct.images);
      builder.setImages(images);

      if (shopifyProduct.image?.src) {
        builder.setFeaturedImage(shopifyProduct.image.src);
      }

      // Categories from tags
      const categories = this.extractCategories(shopifyProduct);
      builder.setCategories(categories);

      // Tags
      if (shopifyProduct.tags) {
        builder.setTags(shopifyProduct.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag));
      }

      // Variants
      const variants = this.mapRestVariants(shopifyProduct.variants, shopifyProduct.options);
      builder.setVariants(variants);

      // Inventory
      builder.setInventory(this.calculateTotalInventory(shopifyProduct.variants));

      // SEO
      builder.setSeo({
        slug: shopifyProduct.handle,
        title: shopifyProduct.title,
      });

      // Status
      builder.setStatus(this.mapStatus(shopifyProduct.status));

      // Vendor and product type
      if (shopifyProduct.vendor) {
        builder.setVendor(shopifyProduct.vendor);
      }

      // Dates
      if (shopifyProduct.created_at) {
        builder.setCreatedAt(new Date(shopifyProduct.created_at));
      }
      if (shopifyProduct.updated_at) {
        builder.setUpdatedAt(new Date(shopifyProduct.updated_at));
      }

      // Metadata
      builder.setMetadata({
        productType: shopifyProduct.product_type,
        handle: shopifyProduct.handle,
        publishedScope: shopifyProduct.published_scope,
        templateSuffix: shopifyProduct.template_suffix,
        adminGraphqlApiId: shopifyProduct.admin_graphql_api_id,
        metafields: shopifyProduct.metafields,
      });

      // Raw data for debugging
      builder.setRawData(shopifyProduct);

      return builder.build();
    } catch (error) {
      this.logger.error(`Failed to map Shopify product ${shopifyProduct.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map a Shopify GraphQL product to normalized format
   */
  mapGraphQLProduct(shopifyProduct: ShopifyGraphQLProduct): NormalizedProduct {
    try {
      const builder = new NormalizedProductBuilder();

      // Extract numeric ID from GraphQL ID
      const externalId = shopifyProduct.id.replace('gid://shopify/Product/', '');
      const currency = shopifyProduct.priceRange?.minVariantPrice?.currencyCode || 'USD';

      // Basic product info
      builder
        .setExternalId(externalId)
        .setSource('shopify')
        .setSku(this.extractGraphQLSku(shopifyProduct))
        .setName(shopifyProduct.title)
        .setDescription(shopifyProduct.descriptionHtml || '')
        .setPrice(parseFloat(shopifyProduct.priceRange?.minVariantPrice?.amount || '0'))
        .setCurrency(currency);

      // Compare at price
      const compareAtPrice = shopifyProduct.compareAtPriceRange?.minVariantCompareAtPrice?.amount;
      if (compareAtPrice) {
        builder.setCompareAtPrice(parseFloat(compareAtPrice));
      }

      // Images
      const images = this.mapGraphQLImages(shopifyProduct.images.edges);
      builder.setImages(images);

      if (shopifyProduct.featuredImage?.url) {
        builder.setFeaturedImage(shopifyProduct.featuredImage.url);
      }

      // Tags as categories
      if (shopifyProduct.tags && shopifyProduct.tags.length > 0) {
        builder.setCategories(shopifyProduct.tags);
        builder.setTags(shopifyProduct.tags);
      }

      // Variants
      const variants = this.mapGraphQLVariants(shopifyProduct.variants.edges);
      builder.setVariants(variants);

      // Inventory
      builder.setInventory({
        quantity: shopifyProduct.totalInventory || 0,
        trackInventory: true,
      });

      // SEO
      builder.setSeo({
        slug: shopifyProduct.handle,
        title: shopifyProduct.title,
      });

      // Status
      builder.setStatus(this.mapGraphQLStatus(shopifyProduct.status));

      // Vendor
      if (shopifyProduct.vendor) {
        builder.setVendor(shopifyProduct.vendor);
      }

      // Dates
      if (shopifyProduct.createdAt) {
        builder.setCreatedAt(new Date(shopifyProduct.createdAt));
      }
      if (shopifyProduct.updatedAt) {
        builder.setUpdatedAt(new Date(shopifyProduct.updatedAt));
      }

      // Metadata
      const metafields: Record<string, any> = {};
      if (shopifyProduct.metafields?.edges) {
        for (const edge of shopifyProduct.metafields.edges) {
          const { namespace, key, value } = edge.node;
          metafields[`${namespace}.${key}`] = value;
        }
      }

      builder.setMetadata({
        productType: shopifyProduct.productType,
        handle: shopifyProduct.handle,
        metafields,
      });

      // Raw data
      builder.setRawData(shopifyProduct);

      return builder.build();
    } catch (error) {
      this.logger.error(`Failed to map GraphQL Shopify product ${shopifyProduct.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract SKU from product (uses first variant SKU or generates from product ID)
   */
  private extractSku(product: ShopifyProduct): string {
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      if (firstVariant.sku) {
        return firstVariant.sku;
      }
    }
    return `SHOPIFY-${product.id}`;
  }

  /**
   * Extract SKU from GraphQL product
   */
  private extractGraphQLSku(product: ShopifyGraphQLProduct): string {
    if (product.variants?.edges && product.variants.edges.length > 0) {
      const firstVariant = product.variants.edges[0].node;
      if (firstVariant.sku) {
        return firstVariant.sku;
      }
    }
    return `SHOPIFY-${product.id.replace('gid://shopify/Product/', '')}`;
  }

  /**
   * Extract base price from product
   */
  private extractPrice(product: ShopifyProduct): number {
    if (product.variants && product.variants.length > 0) {
      return parseFloat(product.variants[0].price) || 0;
    }
    return 0;
  }

  /**
   * Extract compare at price from product
   */
  private extractCompareAtPrice(product: ShopifyProduct): number | undefined {
    if (product.variants && product.variants.length > 0) {
      const compareAt = product.variants[0].compare_at_price;
      if (compareAt) {
        return parseFloat(compareAt);
      }
    }
    return undefined;
  }

  /**
   * Extract categories from tags (assumes certain tags are categories)
   */
  private extractCategories(product: ShopifyProduct): string[] {
    const categories: string[] = [];

    // Add product type as a category
    if (product.product_type) {
      categories.push(product.product_type);
    }

    // Look for category-like tags
    if (product.tags) {
      const tags = product.tags.split(',').map((tag) => tag.trim());
      for (const tag of tags) {
        // Check for tags that look like categories (e.g., "category:Electronics")
        if (tag.toLowerCase().startsWith('category:')) {
          categories.push(tag.substring(9).trim());
        }
      }
    }

    return [...new Set(categories)]; // Remove duplicates
  }

  /**
   * Map REST API images
   */
  private mapRestImages(images: ShopifyImage[] | undefined): string[] {
    if (!images || images.length === 0) {
      return [];
    }
    return images
      .sort((a, b) => a.position - b.position)
      .map((img) => img.src)
      .filter((src) => src);
  }

  /**
   * Map GraphQL images
   */
  private mapGraphQLImages(imageEdges: { node: ShopifyGraphQLImage }[]): string[] {
    if (!imageEdges || imageEdges.length === 0) {
      return [];
    }
    return imageEdges.map((edge) => edge.node.url).filter((url) => url);
  }

  /**
   * Map REST API variants to normalized variants
   */
  private mapRestVariants(
    variants: ShopifyVariant[] | undefined,
    options: { name: string; values: string[] }[] | undefined,
  ): NormalizedVariant[] {
    if (!variants || variants.length === 0) {
      return [];
    }

    return variants.map((variant, index) => {
      const attributes: NormalizedAttribute[] = [];

      // Map options to attributes
      if (options) {
        if (variant.option1 && options[0]) {
          attributes.push({
            name: options[0].name,
            value: variant.option1,
            position: 1,
            isVariation: true,
          });
        }
        if (variant.option2 && options[1]) {
          attributes.push({
            name: options[1].name,
            value: variant.option2,
            position: 2,
            isVariation: true,
          });
        }
        if (variant.option3 && options[2]) {
          attributes.push({
            name: options[2].name,
            value: variant.option3,
            position: 3,
            isVariation: true,
          });
        }
      }

      return {
        externalId: variant.id.toString(),
        sku: variant.sku || undefined,
        name: variant.title,
        price: parseFloat(variant.price) || 0,
        compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : undefined,
        inventory: {
          quantity: variant.inventory_quantity || 0,
          trackInventory: variant.inventory_management !== null,
          allowBackorder: variant.inventory_policy === 'continue',
        },
        attributes,
        barcode: variant.barcode || undefined,
        weight: variant.grams / 1000, // Convert grams to kg
        position: variant.position,
        isDefault: index === 0,
      };
    });
  }

  /**
   * Map GraphQL variants to normalized variants
   */
  private mapGraphQLVariants(
    variantEdges: { node: ShopifyGraphQLVariant }[],
  ): NormalizedVariant[] {
    if (!variantEdges || variantEdges.length === 0) {
      return [];
    }

    return variantEdges.map((edge, index) => {
      const variant = edge.node;

      const attributes: NormalizedAttribute[] = variant.selectedOptions.map((option, optIndex) => ({
        name: option.name,
        value: option.value,
        position: optIndex + 1,
        isVariation: true,
      }));

      return {
        externalId: variant.id.replace('gid://shopify/ProductVariant/', ''),
        sku: variant.sku || undefined,
        name: variant.title,
        price: parseFloat(variant.price) || 0,
        compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : undefined,
        inventory: {
          quantity: variant.inventoryQuantity || 0,
          trackInventory: variant.inventoryItem?.tracked || false,
        },
        attributes,
        images: variant.image ? [variant.image.url] : undefined,
        barcode: variant.barcode || undefined,
        weight: variant.weight || undefined,
        isDefault: index === 0,
      };
    });
  }

  /**
   * Calculate total inventory from variants
   */
  private calculateTotalInventory(variants: ShopifyVariant[] | undefined): NormalizedInventory {
    if (!variants || variants.length === 0) {
      return {
        quantity: 0,
        trackInventory: false,
      };
    }

    const totalQuantity = variants.reduce((sum, variant) => sum + (variant.inventory_quantity || 0), 0);
    const hasTrackedInventory = variants.some((v) => v.inventory_management !== null);

    return {
      quantity: totalQuantity,
      trackInventory: hasTrackedInventory,
      allowBackorder: variants.some((v) => v.inventory_policy === 'continue'),
    };
  }

  /**
   * Map Shopify status to normalized status
   */
  private mapStatus(status: 'active' | 'archived' | 'draft'): 'active' | 'draft' | 'archived' | 'inactive' {
    switch (status) {
      case 'active':
        return 'active';
      case 'draft':
        return 'draft';
      case 'archived':
        return 'archived';
      default:
        return 'inactive';
    }
  }

  /**
   * Map GraphQL status to normalized status
   */
  private mapGraphQLStatus(status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT'): 'active' | 'draft' | 'archived' | 'inactive' {
    switch (status) {
      case 'ACTIVE':
        return 'active';
      case 'DRAFT':
        return 'draft';
      case 'ARCHIVED':
        return 'archived';
      default:
        return 'inactive';
    }
  }

  /**
   * Map multiple REST products
   */
  mapRestProducts(products: ShopifyProduct[], currency: string = 'USD'): NormalizedProduct[] {
    return products.map((product) => this.mapRestProduct(product, currency));
  }

  /**
   * Map multiple GraphQL products
   */
  mapGraphQLProducts(products: ShopifyGraphQLProduct[]): NormalizedProduct[] {
    return products.map((product) => this.mapGraphQLProduct(product));
  }
}
