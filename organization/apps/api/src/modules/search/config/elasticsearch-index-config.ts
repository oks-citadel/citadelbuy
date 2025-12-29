/**
 * Elasticsearch Index Configuration for Production
 *
 * This file contains optimized index settings and mappings for:
 * - Products Index
 * - Orders Index (for order search)
 * - Users Index (for admin user search)
 * - Search Analytics Index
 */

export interface IndexConfig {
  settings: any;
  mappings: any;
}

/**
 * Products Index Configuration
 * Optimized for full-text search, faceting, and autocomplete
 */
export const PRODUCTS_INDEX_CONFIG: IndexConfig = {
  settings: {
    // Shard Configuration
    // Production: 2-5 shards per 50GB of data
    number_of_shards: 3,
    number_of_replicas: 2, // For high availability

    // Performance Settings
    refresh_interval: '30s', // Balance between search and indexing performance
    max_result_window: 10000,
    max_inner_result_window: 100,
    max_rescore_window: 10000,

    // Index Lifecycle Management
    'lifecycle.name': 'broxiva-products-policy',

    // Codec for compression
    codec: 'best_compression', // Save storage space

    // Analysis Configuration
    analysis: {
      analyzer: {
        // Autocomplete Analyzer
        autocomplete_analyzer: {
          tokenizer: 'autocomplete_tokenizer',
          filter: ['lowercase', 'asciifolding', 'trim'],
        },
        autocomplete_search_analyzer: {
          tokenizer: 'lowercase',
          filter: ['lowercase', 'asciifolding', 'trim'],
        },

        // Standard Search Analyzer with stemming
        standard_search_analyzer: {
          type: 'standard',
          stopwords: '_english_',
        },

        // Custom analyzer for product names
        product_name_analyzer: {
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'asciifolding',
            'english_stop',
            'english_stemmer',
            'unique',
          ],
        },

        // SKU/Barcode analyzer (exact match)
        code_analyzer: {
          tokenizer: 'keyword',
          filter: ['lowercase', 'trim'],
        },
      },

      tokenizer: {
        autocomplete_tokenizer: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 20,
          token_chars: ['letter', 'digit'],
        },
      },

      filter: {
        english_stop: {
          type: 'stop',
          stopwords: '_english_',
        },
        english_stemmer: {
          type: 'stemmer',
          language: 'english',
        },
      },
    },
  },

  mappings: {
    dynamic: 'strict', // Prevent dynamic field creation
    properties: {
      // Core Product Fields
      id: {
        type: 'keyword',
        store: true,
      },
      name: {
        type: 'text',
        analyzer: 'autocomplete_analyzer',
        search_analyzer: 'autocomplete_search_analyzer',
        fields: {
          keyword: {
            type: 'keyword',
            normalizer: 'lowercase',
          },
          standard: {
            type: 'text',
            analyzer: 'product_name_analyzer',
          },
          exact: {
            type: 'keyword',
          },
        },
      },
      description: {
        type: 'text',
        analyzer: 'standard_search_analyzer',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },

      // Pricing
      price: {
        type: 'scaled_float',
        scaling_factor: 100,
      },
      compareAtPrice: {
        type: 'scaled_float',
        scaling_factor: 100,
      },
      discountPercentage: {
        type: 'float',
      },

      // Product Codes
      sku: {
        type: 'keyword',
        analyzer: 'code_analyzer',
      },
      barcode: {
        type: 'keyword',
        analyzer: 'code_analyzer',
      },

      // Media
      images: {
        type: 'keyword',
        index: false,
      },
      thumbnail: {
        type: 'keyword',
        index: false,
      },

      // Category
      categoryId: {
        type: 'keyword',
      },
      categoryName: {
        type: 'text',
        analyzer: 'standard_search_analyzer',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      categorySlug: {
        type: 'keyword',
      },
      categoryPath: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },

      // Vendor
      vendorId: {
        type: 'keyword',
      },
      vendorName: {
        type: 'text',
        analyzer: 'standard_search_analyzer',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      vendorSlug: {
        type: 'keyword',
      },

      // Inventory
      stock: {
        type: 'integer',
      },
      inStock: {
        type: 'boolean',
      },
      lowStockThreshold: {
        type: 'integer',
      },
      isLowStock: {
        type: 'boolean',
      },

      // Tags & Attributes
      tags: {
        type: 'keyword',
      },
      attributes: {
        type: 'nested',
        properties: {
          key: { type: 'keyword' },
          value: { type: 'keyword' },
          label: { type: 'text' },
        },
      },

      // Reviews & Ratings
      avgRating: {
        type: 'half_float',
      },
      reviewCount: {
        type: 'integer',
      },
      ratingDistribution: {
        type: 'object',
        enabled: false,
      },

      // Sales & Popularity
      salesCount: {
        type: 'integer',
      },
      viewCount: {
        type: 'integer',
      },
      wishlistCount: {
        type: 'integer',
      },
      popularityScore: {
        type: 'float',
      },

      // Dates
      createdAt: {
        type: 'date',
      },
      updatedAt: {
        type: 'date',
      },
      publishedAt: {
        type: 'date',
      },

      // Variants
      hasVariants: {
        type: 'boolean',
      },
      variantCount: {
        type: 'integer',
      },
      variantOptions: {
        type: 'keyword',
      },
      minVariantPrice: {
        type: 'scaled_float',
        scaling_factor: 100,
      },
      maxVariantPrice: {
        type: 'scaled_float',
        scaling_factor: 100,
      },

      // Status
      status: {
        type: 'keyword',
      },
      isActive: {
        type: 'boolean',
      },
      isFeatured: {
        type: 'boolean',
      },
      isNew: {
        type: 'boolean',
      },

      // SEO
      slug: {
        type: 'keyword',
      },
      metaTitle: {
        type: 'text',
        index: false,
      },
      metaDescription: {
        type: 'text',
        index: false,
      },

      // Dimensions & Shipping
      weight: {
        type: 'float',
      },
      dimensions: {
        type: 'object',
        properties: {
          length: { type: 'float' },
          width: { type: 'float' },
          height: { type: 'float' },
          unit: { type: 'keyword' },
        },
      },
      shippingClass: {
        type: 'keyword',
      },

      // Geo Location (for local search)
      location: {
        type: 'geo_point',
      },
    },
  },
};

/**
 * Orders Index Configuration
 * Optimized for order search and analytics
 */
export const ORDERS_INDEX_CONFIG: IndexConfig = {
  settings: {
    number_of_shards: 2,
    number_of_replicas: 1,
    refresh_interval: '30s',
    max_result_window: 10000,

    analysis: {
      analyzer: {
        order_code_analyzer: {
          tokenizer: 'keyword',
          filter: ['lowercase'],
        },
      },
    },
  },

  mappings: {
    dynamic: 'strict',
    properties: {
      id: { type: 'keyword' },
      orderNumber: {
        type: 'keyword',
        analyzer: 'order_code_analyzer',
      },
      userId: { type: 'keyword' },
      userEmail: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      userName: { type: 'text' },
      status: { type: 'keyword' },
      paymentStatus: { type: 'keyword' },
      fulfillmentStatus: { type: 'keyword' },
      total: {
        type: 'scaled_float',
        scaling_factor: 100,
      },
      subtotal: {
        type: 'scaled_float',
        scaling_factor: 100,
      },
      tax: {
        type: 'scaled_float',
        scaling_factor: 100,
      },
      shipping: {
        type: 'scaled_float',
        scaling_factor: 100,
      },
      items: {
        type: 'nested',
        properties: {
          productId: { type: 'keyword' },
          productName: { type: 'text' },
          sku: { type: 'keyword' },
          quantity: { type: 'integer' },
          price: { type: 'scaled_float', scaling_factor: 100 },
        },
      },
      shippingAddress: {
        type: 'object',
        properties: {
          country: { type: 'keyword' },
          state: { type: 'keyword' },
          city: { type: 'keyword' },
          postalCode: { type: 'keyword' },
          location: { type: 'geo_point' },
        },
      },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
};

/**
 * Search Analytics Index Configuration
 * For tracking search behavior and optimization
 */
export const SEARCH_ANALYTICS_INDEX_CONFIG: IndexConfig = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    refresh_interval: '30s',

    // ILM: Delete after 90 days
    'lifecycle.name': 'broxiva-analytics-policy',
  },

  mappings: {
    dynamic: 'strict',
    properties: {
      id: { type: 'keyword' },
      query: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      normalizedQuery: { type: 'keyword' },
      resultsCount: { type: 'integer' },
      hasResults: { type: 'boolean' },
      userId: { type: 'keyword' },
      sessionId: { type: 'keyword' },
      userAgent: { type: 'text', index: false },
      ipAddress: { type: 'ip' },
      filters: { type: 'object', enabled: false },
      sortBy: { type: 'keyword' },
      page: { type: 'integer' },
      responseTime: { type: 'integer' },
      provider: { type: 'keyword' },
      timestamp: { type: 'date' },
      clickedProductIds: { type: 'keyword' },
      converted: { type: 'boolean' },
    },
  },
};

/**
 * Index Lifecycle Management Policies
 */
export const ILM_POLICIES = {
  products: {
    policy: {
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          min_age: '30d',
          actions: {
            set_priority: {
              priority: 50,
            },
            shrink: {
              number_of_shards: 1,
            },
            forcemerge: {
              max_num_segments: 1,
            },
          },
        },
        cold: {
          min_age: '90d',
          actions: {
            set_priority: {
              priority: 0,
            },
            freeze: {},
          },
        },
        delete: {
          min_age: '180d',
          actions: {
            delete: {},
          },
        },
      },
    },
  },

  analytics: {
    policy: {
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '7d',
              max_size: '10gb',
            },
          },
        },
        delete: {
          min_age: '90d',
          actions: {
            delete: {},
          },
        },
      },
    },
  },
};

/**
 * Get index name with environment prefix
 */
export function getIndexName(baseIndex: string, environment?: string): string {
  const prefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'broxiva';
  const env = environment || process.env.NODE_ENV || 'development';
  return `${prefix}-${env}-${baseIndex}`;
}

/**
 * Index Names
 */
export const INDEX_NAMES = {
  PRODUCTS: getIndexName('products'),
  ORDERS: getIndexName('orders'),
  SEARCH_ANALYTICS: getIndexName('search-analytics'),
};
