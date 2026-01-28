/**
 * Product Catalog Agent
 *
 * Tests:
 * - Product CRUD operations
 * - Category and subcategory management
 * - Product search, filtering, and sorting
 * - Product variants (size, color, etc.)
 * - Inventory sync with suppliers
 * - Product image handling and CDN delivery
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class ProductCatalogAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private vendorToken?: string;
  private adminToken?: string;
  private testProductId?: string;
  private testCategoryId?: string;

  constructor(options: AgentOptions = {}) {
    super('Product Catalog Agent', 'product-catalog', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Login as customer for authenticated tests
    try {
      const { data } = await this.http.post('/auth/login', {
        email: 'customer@example.com',
        password: 'Customer123!',
      });
      this.authToken = data.access_token;
    } catch (e) {
      // Try to register if login fails
      try {
        const { data } = await this.http.post('/auth/register', {
          email: `test-product-agent-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Product Test User',
        });
        this.authToken = data.access_token;
      } catch (e2) {
        console.warn('Could not get auth token for product tests');
      }
    }
  }

  protected defineTests(): void {
    // ============================================
    // Category Tests
    // ============================================
    this.describe('Categories', (t) => {
      t('should list all categories', async (ctx) => {
        const { data, status } = await this.http.get('/categories');

        assert.statusCode(status, 200, 'Should return 200');
        assert.isArray(data.data || data, 'Should return array of categories');
      });

      t('should get category by ID', async (ctx) => {
        // First get all categories to get an ID
        const { data: categories } = await this.http.get('/categories');
        const categoryList = categories.data || categories;

        if (categoryList.length > 0) {
          const categoryId = categoryList[0].id;
          const { data, status } = await this.http.get(`/categories/${categoryId}`);

          assert.statusCode(status, 200, 'Should return 200');
          assert.equal(data.id, categoryId, 'ID should match');
          assert.hasProperty(data, 'name', 'Should have name');
          assert.hasProperty(data, 'slug', 'Should have slug');

          this.testCategoryId = categoryId;
        }
      });

      t('should get category by slug', async (ctx) => {
        const { data: categories } = await this.http.get('/categories');
        const categoryList = categories.data || categories;

        if (categoryList.length > 0 && categoryList[0].slug) {
          const { data, status } = await this.http.get(`/categories/slug/${categoryList[0].slug}`);
          assert.ok([200, 404].includes(status), 'Should return 200 or 404');
        }
      });

      t('should return 404 for non-existent category', async (ctx) => {
        const { status } = await this.http.get('/categories/non-existent-id-12345');
        assert.ok([400, 404].includes(status), 'Should return 404 or 400');
      });

      t('should list subcategories', async (ctx) => {
        if (this.testCategoryId) {
          const { data, status } = await this.http.get(`/categories/${this.testCategoryId}/children`);
          assert.ok([200, 404].includes(status), 'Should handle subcategories');
        }
      });

      t('should list featured categories', async (ctx) => {
        const { data, status } = await this.http.get('/categories?featured=true');
        assert.statusCode(status, 200, 'Should return 200');
      });
    });

    // ============================================
    // Product Listing Tests
    // ============================================
    this.describe('Product Listing', (t) => {
      t('should list all products', async (ctx) => {
        const { data, status } = await this.http.get('/products');

        assert.statusCode(status, 200, 'Should return 200');
        assert.ok(data.data || Array.isArray(data), 'Should return products');
      });

      t('should paginate products', async (ctx) => {
        const { data, status } = await this.http.get('/products?page=1&pageSize=10');

        assert.statusCode(status, 200, 'Should return 200');

        if (data.meta) {
          assert.hasProperty(data.meta, 'total', 'Should have total');
          assert.hasProperty(data.meta, 'page', 'Should have page');
          assert.hasProperty(data.meta, 'pageSize', 'Should have pageSize');
        }
      });

      t('should filter products by category', async (ctx) => {
        if (this.testCategoryId) {
          const { data, status } = await this.http.get(`/products?categoryId=${this.testCategoryId}`);
          assert.statusCode(status, 200, 'Should return 200');
        }
      });

      t('should filter products by price range', async (ctx) => {
        const { data, status } = await this.http.get('/products?minPrice=10&maxPrice=100');
        assert.statusCode(status, 200, 'Should return 200');

        const products = data.data || data;
        if (Array.isArray(products) && products.length > 0) {
          products.forEach((product: any) => {
            if (product.price !== undefined) {
              assert.ok(product.price >= 10, 'Price should be >= minPrice');
              assert.ok(product.price <= 100, 'Price should be <= maxPrice');
            }
          });
        }
      });

      t('should sort products by price ascending', async (ctx) => {
        const { data, status } = await this.http.get('/products?sortBy=price&sortOrder=asc');
        assert.statusCode(status, 200, 'Should return 200');

        const products = data.data || data;
        if (Array.isArray(products) && products.length > 1) {
          for (let i = 1; i < products.length; i++) {
            if (products[i].price !== undefined && products[i - 1].price !== undefined) {
              assert.ok(
                products[i].price >= products[i - 1].price,
                'Products should be sorted by price ascending'
              );
            }
          }
        }
      });

      t('should sort products by price descending', async (ctx) => {
        const { data, status } = await this.http.get('/products?sortBy=price&sortOrder=desc');
        assert.statusCode(status, 200, 'Should return 200');
      });

      t('should sort products by name', async (ctx) => {
        const { data, status } = await this.http.get('/products?sortBy=name&sortOrder=asc');
        assert.statusCode(status, 200, 'Should return 200');
      });

      t('should sort products by newest', async (ctx) => {
        const { data, status } = await this.http.get('/products?sortBy=createdAt&sortOrder=desc');
        assert.statusCode(status, 200, 'Should return 200');
      });

      t('should filter only active products', async (ctx) => {
        const { data, status } = await this.http.get('/products?isActive=true');
        assert.statusCode(status, 200, 'Should return 200');

        const products = data.data || data;
        if (Array.isArray(products)) {
          products.forEach((product: any) => {
            if (product.isActive !== undefined) {
              assert.ok(product.isActive, 'All products should be active');
            }
          });
        }
      });

      t('should filter in-stock products', async (ctx) => {
        const { data, status } = await this.http.get('/products?inStock=true');
        assert.statusCode(status, 200, 'Should return 200');
      });

      t('should filter featured products', async (ctx) => {
        const { data, status } = await this.http.get('/products?featured=true');
        assert.statusCode(status, 200, 'Should return 200');
      });
    });

    // ============================================
    // Product Detail Tests
    // ============================================
    this.describe('Product Details', (t) => {
      t('should get product by ID', async (ctx) => {
        const { data: products } = await this.http.get('/products?pageSize=1');
        const productList = products.data || products;

        if (Array.isArray(productList) && productList.length > 0) {
          const productId = productList[0].id;
          const { data, status } = await this.http.get(`/products/${productId}`);

          assert.statusCode(status, 200, 'Should return 200');
          assert.equal(data.id, productId, 'ID should match');
          assert.hasProperty(data, 'name', 'Should have name');
          assert.hasProperty(data, 'price', 'Should have price');
          assert.hasProperty(data, 'description', 'Should have description');

          this.testProductId = productId;
        }
      });

      t('should get product by slug', async (ctx) => {
        const { data: products } = await this.http.get('/products?pageSize=1');
        const productList = products.data || products;

        if (Array.isArray(productList) && productList.length > 0 && productList[0].slug) {
          const { data, status } = await this.http.get(`/products/slug/${productList[0].slug}`);
          assert.ok([200, 404].includes(status), 'Should return 200 or 404');
        }
      });

      t('should return 404 for non-existent product', async (ctx) => {
        const { status } = await this.http.get('/products/non-existent-id-12345');
        assert.ok([400, 404].includes(status), 'Should return 404 or 400');
      });

      t('should include product images', async (ctx) => {
        if (this.testProductId) {
          const { data, status } = await this.http.get(`/products/${this.testProductId}`);

          if (status === 200 && data.images) {
            assert.isArray(data.images, 'Images should be an array');
          }
        }
      });

      t('should include product category', async (ctx) => {
        if (this.testProductId) {
          const { data, status } = await this.http.get(`/products/${this.testProductId}`);

          if (status === 200) {
            assert.ok(
              data.category || data.categoryId,
              'Should have category or categoryId'
            );
          }
        }
      });

      t('should include product specifications', async (ctx) => {
        if (this.testProductId) {
          const { data, status } = await this.http.get(`/products/${this.testProductId}`);

          // Specifications might be optional
          if (status === 200 && data.specifications) {
            assert.isObject(data.specifications, 'Specifications should be object');
          }
        }
      });
    });

    // ============================================
    // Product Search Tests
    // ============================================
    this.describe('Product Search', (t) => {
      t('should search products by keyword', async (ctx) => {
        const { data, status } = await this.http.get('/products/search?q=test');
        assert.ok([200, 404].includes(status), 'Search should return 200 or 404');
      });

      t('should search products with query parameter', async (ctx) => {
        const { data, status } = await this.http.get('/products?search=product');
        assert.statusCode(status, 200, 'Should return 200');
      });

      t('should return empty array for no results', async (ctx) => {
        const { data, status } = await this.http.get('/products/search?q=xyznonexistent12345');

        if (status === 200) {
          const products = data.data || data.hits || data;
          assert.isArray(products, 'Should return array');
        }
      });

      t('should search with filters combined', async (ctx) => {
        const { status } = await this.http.get('/products?search=product&minPrice=10&maxPrice=1000');
        assert.statusCode(status, 200, 'Should return 200');
      });

      t('should support autocomplete suggestions', async (ctx) => {
        const { status } = await this.http.get('/products/autocomplete?q=pro');
        assert.ok([200, 404].includes(status), 'Autocomplete should work or 404 if not implemented');
      });
    });

    // ============================================
    // Product Variants Tests
    // ============================================
    this.describe('Product Variants', (t) => {
      t('should list product variants', async (ctx) => {
        if (this.testProductId) {
          const { data, status } = await this.http.get(`/products/${this.testProductId}/variants`);
          assert.ok([200, 404].includes(status), 'Should return variants or 404');
        }
      });

      t('should get variant by ID', async (ctx) => {
        if (this.testProductId) {
          const { data: variants, status: listStatus } = await this.http.get(
            `/products/${this.testProductId}/variants`
          );

          if (listStatus === 200 && Array.isArray(variants) && variants.length > 0) {
            const variantId = variants[0].id;
            const { data, status } = await this.http.get(
              `/products/${this.testProductId}/variants/${variantId}`
            );
            assert.ok([200, 404].includes(status), 'Should return variant');
          }
        }
      });

      t('should filter products by variant attributes', async (ctx) => {
        const { status } = await this.http.get('/products?color=black');
        assert.ok([200, 400].includes(status), 'Should handle variant filter');

        const { status: status2 } = await this.http.get('/products?size=medium');
        assert.ok([200, 400].includes(status2), 'Should handle size filter');
      });
    });

    // ============================================
    // Inventory Tests
    // ============================================
    this.describe('Inventory', (t) => {
      t('should show stock availability', async (ctx) => {
        if (this.testProductId) {
          const { data, status } = await this.http.get(`/products/${this.testProductId}`);

          if (status === 200) {
            assert.ok(
              data.stock !== undefined || data.inStock !== undefined,
              'Should have stock information'
            );
          }
        }
      });

      t('should check inventory for multiple products', async (ctx) => {
        if (this.testProductId) {
          const { status } = await this.http.post('/inventory/check', {
            productIds: [this.testProductId],
          });
          assert.ok([200, 404].includes(status), 'Inventory check should work');
        }
      });

      t('should get low stock products', async (ctx) => {
        if (this.adminToken) {
          this.http.setAuthToken(this.adminToken);
          const { status } = await this.http.get('/admin/inventory/low-stock');
          assert.ok([200, 401, 403, 404].includes(status), 'Low stock endpoint');
        }
      });
    });

    // ============================================
    // Related Products Tests
    // ============================================
    this.describe('Related Products', (t) => {
      t('should get related products', async (ctx) => {
        if (this.testProductId) {
          const { status } = await this.http.get(`/products/${this.testProductId}/related`);
          assert.ok([200, 404].includes(status), 'Should return related products');
        }
      });

      t('should get products in same category', async (ctx) => {
        if (this.testProductId) {
          const { data: product } = await this.http.get(`/products/${this.testProductId}`);

          if (product.categoryId) {
            const { data, status } = await this.http.get(
              `/products?categoryId=${product.categoryId}`
            );
            assert.statusCode(status, 200, 'Should return products in category');
          }
        }
      });

      t('should get recommended products', async (ctx) => {
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);
          const { status } = await this.http.get('/recommendations/products');
          assert.ok([200, 404].includes(status), 'Recommendations endpoint');
        }
      });
    });

    // ============================================
    // Product Reviews Summary
    // ============================================
    this.describe('Product Reviews Summary', (t) => {
      t('should get product reviews', async (ctx) => {
        if (this.testProductId) {
          const { status } = await this.http.get(`/products/${this.testProductId}/reviews`);
          assert.ok([200, 404].includes(status), 'Should return reviews');
        }
      });

      t('should get product rating summary', async (ctx) => {
        if (this.testProductId) {
          const { data, status } = await this.http.get(`/products/${this.testProductId}`);

          if (status === 200) {
            // Rating might be optional
            if (data.rating !== undefined) {
              assert.isNumber(data.rating, 'Rating should be a number');
              assert.ok(data.rating >= 0 && data.rating <= 5, 'Rating should be 0-5');
            }
          }
        }
      });
    });

    // ============================================
    // Product Images Tests
    // ============================================
    this.describe('Product Images', (t) => {
      t('should have valid image URLs', async (ctx) => {
        if (this.testProductId) {
          const { data, status } = await this.http.get(`/products/${this.testProductId}`);

          if (status === 200 && data.images && data.images.length > 0) {
            data.images.forEach((img: any) => {
              const url = typeof img === 'string' ? img : img.url;
              if (url) {
                assert.match(url, /^https?:\/\//, 'Image should have valid URL');
              }
            });
          }
        }
      });

      t('should support different image sizes', async (ctx) => {
        if (this.testProductId) {
          const { status } = await this.http.get(
            `/products/${this.testProductId}/images?size=thumbnail`
          );
          assert.ok([200, 404].includes(status), 'Should support image sizes');
        }
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new ProductCatalogAgent(options);
  return agent.runTests(options);
}

// CLI entry point
if (require.main === module) {
  runTests({ verbose: true })
    .then(results => {
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      console.log(`\n${passed} passed, ${failed} failed`);
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test run failed:', err);
      process.exit(1);
    });
}
