/**
 * WooCommerce Product Mapper
 *
 * Maps WooCommerce product data to the normalized product format.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  NormalizedProduct,
  NormalizedVariant,
  NormalizedInventory,
  NormalizedAttribute,
} from '../base/connector.interface';
import {
  WooCommerceProduct,
  WooCommerceVariation,
  WooCommerceImage,
  WooCommerceCategory,
  WooCommerceAttribute,
} from './dto/woocommerce-product.dto';
import { NormalizedProductBuilder, ProductTransformer } from '../base/normalized-product.model';

@Injectable()
export class WooCommerceMapper {
  private readonly logger = new Logger(WooCommerceMapper.name);

  /**
   * Map a WooCommerce product to normalized format
   */
  mapProduct(
    wooProduct: WooCommerceProduct,
    variations?: WooCommerceVariation[],
    currency: string = 'USD',
  ): NormalizedProduct {
    try {
      const builder = new NormalizedProductBuilder();

      // Basic product info
      builder
        .setExternalId(wooProduct.id.toString())
        .setSource('woocommerce')
        .setSku(wooProduct.sku || `WOO-${wooProduct.id}`)
        .setName(wooProduct.name)
        .setDescription(wooProduct.description || '')
        .setShortDescription(wooProduct.short_description || undefined)
        .setCurrency(currency);

      // Pricing
      const price = this.extractPrice(wooProduct);
      builder.setPrice(price);

      // Compare at price (regular price if on sale)
      if (wooProduct.on_sale && wooProduct.regular_price) {
        builder.setCompareAtPrice(parseFloat(wooProduct.regular_price));
      }

      // Images
      const images = this.mapImages(wooProduct.images);
      builder.setImages(images);

      if (images.length > 0) {
        builder.setFeaturedImage(images[0]);
      }

      // Categories
      const categories = this.mapCategories(wooProduct.categories);
      builder.setCategories(categories);

      // Tags
      const tags = wooProduct.tags?.map((tag) => tag.name).filter((name) => name) || [];
      builder.setTags(tags);

      // Attributes
      const attributes = this.mapAttributes(wooProduct.attributes);
      builder.setAttributes(attributes);

      // Variants (for variable products)
      if (wooProduct.type === 'variable' && variations && variations.length > 0) {
        const normalizedVariants = this.mapVariations(variations, wooProduct.attributes);
        builder.setVariants(normalizedVariants);
      }

      // Inventory
      builder.setInventory(this.mapInventory(wooProduct));

      // SEO
      builder.setSeo({
        slug: wooProduct.slug,
        title: wooProduct.name,
      });

      // Status
      builder.setStatus(this.mapStatus(wooProduct.status));

      // Visibility
      builder.setVisibility(this.mapVisibility(wooProduct.catalog_visibility));

      // Product type
      builder.setProductType(this.mapProductType(wooProduct));

      // Dimensions
      if (wooProduct.dimensions || wooProduct.weight) {
        builder.setDimensions({
          weight: wooProduct.weight ? parseFloat(wooProduct.weight) : undefined,
          length: wooProduct.dimensions?.length ? parseFloat(wooProduct.dimensions.length) : undefined,
          width: wooProduct.dimensions?.width ? parseFloat(wooProduct.dimensions.width) : undefined,
          height: wooProduct.dimensions?.height ? parseFloat(wooProduct.dimensions.height) : undefined,
        });
      }

      // Dates
      if (wooProduct.date_created) {
        builder.setCreatedAt(new Date(wooProduct.date_created));
      }
      if (wooProduct.date_modified) {
        builder.setUpdatedAt(new Date(wooProduct.date_modified));
      }

      // Metadata
      const metadata: Record<string, any> = {
        type: wooProduct.type,
        permalink: wooProduct.permalink,
        featured: wooProduct.featured,
        totalSales: wooProduct.total_sales,
        averageRating: wooProduct.average_rating,
        ratingCount: wooProduct.rating_count,
        relatedIds: wooProduct.related_ids,
        upsellIds: wooProduct.upsell_ids,
        crossSellIds: wooProduct.cross_sell_ids,
        parentId: wooProduct.parent_id,
        purchaseNote: wooProduct.purchase_note,
        onSale: wooProduct.on_sale,
      };

      // Include custom meta data
      if (wooProduct.meta_data && wooProduct.meta_data.length > 0) {
        metadata.customFields = {};
        for (const meta of wooProduct.meta_data) {
          metadata.customFields[meta.key] = meta.value;
        }
      }

      builder.setMetadata(metadata);

      // Raw data for debugging
      builder.setRawData(wooProduct);

      return builder.build();
    } catch (error) {
      this.logger.error(`Failed to map WooCommerce product ${wooProduct.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract price from product
   */
  private extractPrice(product: WooCommerceProduct): number {
    // Use sale price if on sale, otherwise regular price
    if (product.on_sale && product.sale_price) {
      return parseFloat(product.sale_price) || 0;
    }

    if (product.price) {
      return parseFloat(product.price) || 0;
    }

    if (product.regular_price) {
      return parseFloat(product.regular_price) || 0;
    }

    return 0;
  }

  /**
   * Map WooCommerce images
   */
  private mapImages(images: WooCommerceImage[] | undefined): string[] {
    if (!images || images.length === 0) {
      return [];
    }
    return images.map((img) => img.src).filter((src) => src);
  }

  /**
   * Map WooCommerce categories
   */
  private mapCategories(categories: WooCommerceCategory[] | undefined): string[] {
    if (!categories || categories.length === 0) {
      return [];
    }
    return categories.map((cat) => cat.name).filter((name) => name);
  }

  /**
   * Map WooCommerce attributes to normalized attributes
   */
  private mapAttributes(attributes: WooCommerceAttribute[] | undefined): NormalizedAttribute[] {
    if (!attributes || attributes.length === 0) {
      return [];
    }

    const normalizedAttributes: NormalizedAttribute[] = [];

    for (const attr of attributes) {
      // For attributes with multiple options, create one attribute per option
      if (attr.options && attr.options.length > 0) {
        for (const option of attr.options) {
          normalizedAttributes.push({
            name: attr.name,
            value: option,
            position: attr.position,
            isVisible: attr.visible,
            isVariation: attr.variation,
          });
        }
      }
    }

    return normalizedAttributes;
  }

  /**
   * Map WooCommerce variations to normalized variants
   */
  private mapVariations(
    variations: WooCommerceVariation[],
    productAttributes?: WooCommerceAttribute[],
  ): NormalizedVariant[] {
    return variations.map((variation, index) => {
      const attributes: NormalizedAttribute[] = variation.attributes.map((attr, attrIndex) => ({
        name: attr.name,
        value: attr.option,
        position: attrIndex + 1,
        isVariation: true,
      }));

      const price = this.extractVariationPrice(variation);

      return {
        externalId: variation.id.toString(),
        sku: variation.sku || undefined,
        name: this.buildVariantName(variation),
        price,
        compareAtPrice: variation.on_sale && variation.regular_price
          ? parseFloat(variation.regular_price)
          : undefined,
        inventory: {
          quantity: variation.stock_quantity || 0,
          trackInventory: variation.manage_stock,
          allowBackorder: variation.backorders === 'yes' || variation.backorders === 'notify',
        },
        attributes,
        images: variation.image ? [variation.image.src] : undefined,
        weight: variation.weight ? parseFloat(variation.weight) : undefined,
        isDefault: index === 0,
      };
    });
  }

  /**
   * Extract price from variation
   */
  private extractVariationPrice(variation: WooCommerceVariation): number {
    if (variation.on_sale && variation.sale_price) {
      return parseFloat(variation.sale_price) || 0;
    }

    if (variation.price) {
      return parseFloat(variation.price) || 0;
    }

    if (variation.regular_price) {
      return parseFloat(variation.regular_price) || 0;
    }

    return 0;
  }

  /**
   * Build variant name from attributes
   */
  private buildVariantName(variation: WooCommerceVariation): string {
    if (!variation.attributes || variation.attributes.length === 0) {
      return `Variation ${variation.id}`;
    }

    return variation.attributes
      .map((attr) => `${attr.name}: ${attr.option}`)
      .join(' / ');
  }

  /**
   * Map inventory information
   */
  private mapInventory(product: WooCommerceProduct): NormalizedInventory {
    return {
      quantity: product.stock_quantity || 0,
      trackInventory: product.manage_stock,
      allowBackorder: product.backorders === 'yes' || product.backorders === 'notify',
      lowStockThreshold: undefined, // WooCommerce handles this separately
    };
  }

  /**
   * Map WooCommerce status to normalized status
   */
  private mapStatus(status: string): 'active' | 'draft' | 'archived' | 'inactive' {
    switch (status) {
      case 'publish':
        return 'active';
      case 'draft':
        return 'draft';
      case 'pending':
        return 'draft';
      case 'private':
        return 'inactive';
      default:
        return 'inactive';
    }
  }

  /**
   * Map WooCommerce visibility to normalized visibility
   */
  private mapVisibility(visibility: string): 'visible' | 'hidden' | 'search_only' | 'catalog_only' {
    switch (visibility) {
      case 'visible':
        return 'visible';
      case 'catalog':
        return 'catalog_only';
      case 'search':
        return 'search_only';
      case 'hidden':
        return 'hidden';
      default:
        return 'visible';
    }
  }

  /**
   * Map WooCommerce product type
   */
  private mapProductType(product: WooCommerceProduct): 'physical' | 'digital' | 'service' | 'bundle' {
    if (product.virtual) {
      return 'service';
    }

    if (product.downloadable) {
      return 'digital';
    }

    if (product.type === 'grouped') {
      return 'bundle';
    }

    return 'physical';
  }

  /**
   * Map multiple products
   */
  mapProducts(
    products: WooCommerceProduct[],
    variationsMap?: Map<number, WooCommerceVariation[]>,
    currency: string = 'USD',
  ): NormalizedProduct[] {
    return products.map((product) => {
      const variations = variationsMap?.get(product.id);
      return this.mapProduct(product, variations, currency);
    });
  }
}
