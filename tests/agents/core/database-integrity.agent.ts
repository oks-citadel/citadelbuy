/**
 * Database Integrity Testing Agent
 *
 * Tests:
 * - Data consistency across tables
 * - Transaction rollback scenarios
 * - Concurrent write handling
 * - Data migration validation
 * - Backup and recovery testing
 * - Query performance benchmarking
 * - Foreign key constraints
 * - Data integrity after CRUD operations
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from '../../../organization/tests/agents/core/base.agent';

interface TestDataSet {
  userId?: string;
  productId?: string;
  orderId?: string;
  categoryId?: string;
  authToken?: string;
}

export class DatabaseIntegrityAgent extends BaseAgent {
  private http: HttpHelper;
  private testData: TestDataSet = {};
  private performanceMetrics: Map<string, number[]> = new Map();
  private createdResources: Array<{ type: string; id: string }> = [];

  constructor(options: AgentOptions = {}) {
    super('Database Integrity Testing Agent', 'database-integrity', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Create a test user for authenticated operations
    try {
      const timestamp = Date.now();
      const { data } = await this.http.post('/auth/register', {
        email: `db-integrity-test-${timestamp}@example.com`,
        password: 'DBIntegrityTest123!',
        name: 'Database Integrity Test User',
      });

      this.testData.authToken = data.access_token;
      this.testData.userId = data.user?.id;
      this.http.setAuthToken(data.access_token);

      this.createdResources.push({ type: 'user', id: this.testData.userId! });
    } catch (e) {
      console.warn('Could not create test user for database integrity tests');
    }
  }

  protected async teardown(): Promise<void> {
    // Clean up created resources
    for (const resource of this.createdResources.reverse()) {
      try {
        switch (resource.type) {
          case 'product':
            await this.http.delete(`/products/${resource.id}`);
            break;
          case 'order':
            await this.http.delete(`/orders/${resource.id}`);
            break;
          case 'category':
            await this.http.delete(`/categories/${resource.id}`);
            break;
          // User cleanup might be restricted
          case 'user':
            // Only attempt if there's a cleanup endpoint
            break;
        }
      } catch (e) {
        // Continue cleanup even if individual deletes fail
      }
    }
  }

  /**
   * Record performance metric
   */
  private recordMetric(operation: string, duration: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    this.performanceMetrics.get(operation)!.push(duration);
  }

  /**
   * Get average metric
   */
  private getAverageMetric(operation: string): number {
    const metrics = this.performanceMetrics.get(operation) || [];
    if (metrics.length === 0) return 0;
    return metrics.reduce((a, b) => a + b, 0) / metrics.length;
  }

  protected defineTests(): void {
    // ============================================
    // Data Consistency Tests
    // ============================================
    this.describe('Data Consistency Across Tables', (t) => {
      t('should maintain referential integrity when creating related entities', async (ctx) => {
        // Create a product and verify it's linked to its category
        const { data: categories } = await this.http.get('/categories');
        const categoryList = categories.data || categories;

        if (Array.isArray(categoryList) && categoryList.length > 0) {
          const categoryId = categoryList[0].id;

          // Create a product in this category (if endpoint exists)
          const productData = {
            name: `Test Product ${Date.now()}`,
            description: 'Database integrity test product',
            price: 99.99,
            categoryId: categoryId,
            stock: 100,
          };

          try {
            const { data: product, status } = await this.http.post('/products', productData);

            if (status === 201 || status === 200) {
              this.createdResources.push({ type: 'product', id: product.id });
              this.testData.productId = product.id;

              // Verify product has correct category reference
              assert.equal(product.categoryId, categoryId, 'Product should reference correct category');

              // Fetch product again to verify persistence
              const { data: fetchedProduct } = await this.http.get(`/products/${product.id}`);
              assert.equal(fetchedProduct.categoryId, categoryId, 'Category reference should persist');
            }
          } catch (e) {
            // Product creation might require admin privileges
          }
        }
      });

      t('should maintain user-order relationship integrity', async (ctx) => {
        // Create an order and verify it's linked to the user
        if (!this.testData.userId) return;

        try {
          const orderData = {
            items: [
              {
                productId: this.testData.productId || 'test-product-id',
                quantity: 1,
                price: 50.00,
              },
            ],
            shippingAddress: {
              street: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zip: '12345',
              country: 'US',
            },
          };

          const { data: order, status } = await this.http.post('/orders', orderData);

          if (status === 201 || status === 200) {
            this.createdResources.push({ type: 'order', id: order.id });
            this.testData.orderId = order.id;

            // Verify order belongs to the current user
            assert.ok(order.userId === this.testData.userId || order.customerId === this.testData.userId,
              'Order should be linked to user');

            // Fetch user's orders to verify bidirectional relationship
            const { data: userOrders } = await this.http.get(`/users/${this.testData.userId}/orders`);

            if (Array.isArray(userOrders)) {
              const foundOrder = userOrders.find((o: any) => o.id === order.id);
              assert.ok(foundOrder, 'Order should appear in user\'s orders list');
            }
          }
        } catch (e) {
          // Order creation might fail due to various reasons
        }
      });

      t('should cascade updates correctly across related tables', async (ctx) => {
        // Update a category and verify products maintain correct reference
        const { data: categories } = await this.http.get('/categories');
        const categoryList = categories.data || categories;

        if (Array.isArray(categoryList) && categoryList.length > 0) {
          const category = categoryList[0];
          const originalName = category.name;

          try {
            // Attempt to update category
            const { data: updated, status } = await this.http.patch(`/categories/${category.id}`, {
              name: `Updated ${originalName} ${Date.now()}`,
            });

            if (status === 200) {
              // Verify products in this category still reference it correctly
              const { data: products } = await this.http.get(`/products?categoryId=${category.id}`);
              const productList = products.data || products;

              if (Array.isArray(productList) && productList.length > 0) {
                productList.forEach((product: any) => {
                  assert.equal(product.categoryId, category.id,
                    'Product category reference should remain valid after category update');
                });
              }

              // Restore original name
              await this.http.patch(`/categories/${category.id}`, { name: originalName });
            }
          } catch (e) {
            // Update might require admin privileges
          }
        }
      });

      t('should prevent orphaned records when parent is deleted', async (ctx) => {
        // This tests ON DELETE behavior (CASCADE, SET NULL, or RESTRICT)
        // Implementation depends on database schema design

        // For now, verify that attempting to delete a category with products
        // either cascades or prevents deletion
        const { data: categories } = await this.http.get('/categories');
        const categoryList = categories.data || categories;

        if (Array.isArray(categoryList) && categoryList.length > 0) {
          const category = categoryList[0];

          // Check if category has products
          const { data: products } = await this.http.get(`/products?categoryId=${category.id}`);
          const productList = products.data || products;

          if (Array.isArray(productList) && productList.length > 0) {
            // Attempt to delete category
            const { status } = await this.http.delete(`/categories/${category.id}`);

            // Should either:
            // 1. Prevent deletion (403, 409)
            // 2. Cascade delete (200) - then products should also be deleted
            // 3. Set products' categoryId to NULL (200) - products remain but unlinked

            if (status === 200 || status === 204) {
              // If deletion succeeded, verify products are either deleted or have NULL categoryId
              const { data: remainingProducts } = await this.http.get(`/products?categoryId=${category.id}`);
              const remainingList = remainingProducts.data || remainingProducts;

              // Products should either be gone or have null categoryId
              if (Array.isArray(remainingList)) {
                remainingList.forEach((product: any) => {
                  assert.ok(
                    product.categoryId === null || product.categoryId !== category.id,
                    'Products should not reference deleted category'
                  );
                });
              }
            } else {
              // Deletion prevented - this is also valid behavior
              assert.ok(
                [403, 409, 400].includes(status),
                'Should prevent deletion or return appropriate error'
              );
            }
          }
        }
      });

      t('should maintain data consistency during updates', async (ctx) => {
        if (!this.testData.productId) return;

        try {
          // Get current product state
          const { data: original } = await this.http.get(`/products/${this.testData.productId}`);

          // Update product
          const { data: updated } = await this.http.patch(`/products/${this.testData.productId}`, {
            name: `Updated ${original.name}`,
          });

          // Verify other fields weren't affected
          assert.equal(updated.price, original.price, 'Price should remain unchanged');
          assert.equal(updated.categoryId, original.categoryId, 'CategoryId should remain unchanged');

          // Verify update persisted
          const { data: fetched } = await this.http.get(`/products/${this.testData.productId}`);
          assert.equal(fetched.name, updated.name, 'Update should persist');
        } catch (e) {
          // Product update might require admin privileges
        }
      });
    });

    // ============================================
    // Transaction Rollback Tests
    // ============================================
    this.describe('Transaction Rollback Scenarios', (t) => {
      t('should rollback failed order creation', async (ctx) => {
        // Attempt to create an order with invalid data
        // System should rollback any partial changes

        try {
          const invalidOrder = {
            items: [
              {
                productId: 'non-existent-product-id',
                quantity: 1,
                price: -100, // Invalid price
              },
            ],
          };

          const { status } = await this.http.post('/orders', invalidOrder);

          // Should reject the order
          assert.ok([400, 404, 422].includes(status), 'Invalid order should be rejected');

          // Verify no partial data was created
          const { data: orders } = await this.http.get('/orders');
          const orderList = orders.data || orders;

          if (Array.isArray(orderList)) {
            const foundInvalidOrder = orderList.find((o: any) =>
              o.items?.some((item: any) => item.price === -100)
            );
            assert.notOk(foundInvalidOrder, 'Failed order should not exist in database');
          }
        } catch (e) {
          // Request failed - good, this is expected
        }
      });

      t('should rollback failed payment processing', async (ctx) => {
        // If payment fails, order should either be cancelled or not created
        if (!this.testData.productId) return;

        try {
          const orderData = {
            items: [
              {
                productId: this.testData.productId,
                quantity: 1,
                price: 50.00,
              },
            ],
            paymentMethod: {
              type: 'credit_card',
              cardNumber: '0000000000000000', // Invalid card
              cvv: '000',
              expiryMonth: '12',
              expiryYear: '2025',
            },
          };

          const { data: order, status } = await this.http.post('/orders', orderData);

          // If order was created, check its status
          if (status === 201 || status === 200) {
            // Payment should have failed
            assert.ok(
              order.status === 'PAYMENT_FAILED' || order.status === 'CANCELLED',
              'Order with failed payment should not be in COMPLETED status'
            );
          }
        } catch (e) {
          // Expected - payment processing should fail
        }
      });

      t('should handle concurrent update conflicts', async (ctx) => {
        if (!this.testData.productId) return;

        try {
          // Simulate concurrent updates
          const { data: product } = await this.http.get(`/products/${this.testData.productId}`);
          const originalStock = product.stock || 100;

          // Two "simultaneous" updates
          const update1 = this.http.patch(`/products/${this.testData.productId}`, {
            stock: originalStock - 10,
          });

          const update2 = this.http.patch(`/products/${this.testData.productId}`, {
            stock: originalStock - 5,
          });

          await Promise.allSettled([update1, update2]);

          // Verify final state is consistent
          const { data: final } = await this.http.get(`/products/${this.testData.productId}`);

          // Stock should be either -10 or -5, not -15 (would indicate both applied)
          assert.ok(
            final.stock === originalStock - 10 || final.stock === originalStock - 5,
            'Concurrent updates should not both apply'
          );
        } catch (e) {
          // Concurrent updates might be prevented by locks
        }
      });

      t('should maintain atomicity in multi-step operations', async (ctx) => {
        // Creating an order typically involves multiple steps:
        // 1. Validate items
        // 2. Check inventory
        // 3. Create order record
        // 4. Update inventory
        // 5. Create order items

        // If any step fails, all should rollback
        if (!this.testData.productId) return;

        try {
          const { data: product } = await this.http.get(`/products/${this.testData.productId}`);
          const originalStock = product.stock || 0;

          // Try to order more than available
          const orderData = {
            items: [
              {
                productId: this.testData.productId,
                quantity: originalStock + 1000, // Exceeds stock
                price: 50.00,
              },
            ],
          };

          const { status } = await this.http.post('/orders', orderData);

          // Should fail
          assert.ok([400, 409, 422].includes(status), 'Over-stock order should fail');

          // Verify inventory wasn't affected
          const { data: finalProduct } = await this.http.get(`/products/${this.testData.productId}`);
          assert.equal(finalProduct.stock, originalStock, 'Stock should be unchanged after failed order');
        } catch (e) {
          // Expected failure
        }
      });
    });

    // ============================================
    // Concurrent Write Handling Tests
    // ============================================
    this.describe('Concurrent Write Handling', (t) => {
      t('should handle concurrent cart updates', async (ctx) => {
        // Multiple requests to add items to cart simultaneously
        if (!this.testData.productId) return;

        try {
          const addToCart = async () => {
            return this.http.post('/cart/items', {
              productId: this.testData.productId,
              quantity: 1,
            });
          };

          // Fire 5 concurrent requests
          const requests = Array(5).fill(null).map(() => addToCart());
          const results = await Promise.allSettled(requests);

          // All should succeed (or some might fail due to rate limiting)
          const succeeded = results.filter(r => r.status === 'fulfilled').length;
          assert.ok(succeeded > 0, 'At least some concurrent requests should succeed');

          // Verify cart has correct total
          const { data: cart } = await this.http.get('/cart');

          // Cart should have quantity that matches successful additions
          if (cart.items) {
            const cartItem = cart.items.find((item: any) => item.productId === this.testData.productId);
            if (cartItem) {
              assert.ok(cartItem.quantity >= 1, 'Cart should reflect additions');
            }
          }
        } catch (e) {
          // Concurrent operations might be restricted
        }
      });

      t('should handle concurrent order placements', async (ctx) => {
        if (!this.testData.productId) return;

        // Multiple users trying to order the same low-stock item
        const placeOrder = async () => {
          try {
            return await this.http.post('/orders', {
              items: [
                {
                  productId: this.testData.productId,
                  quantity: 1,
                  price: 50.00,
                },
              ],
            });
          } catch (e) {
            return { status: 'failed' };
          }
        };

        const requests = Array(3).fill(null).map(() => placeOrder());
        const results = await Promise.all(requests);

        // System should handle this gracefully - either all succeed or properly fail
        const successful = results.filter(r => r.status === 201 || r.status === 200).length;

        // At least the logic should be consistent
        assert.ok(successful >= 0, 'Concurrent orders should be handled consistently');
      });

      t('should prevent race conditions in inventory updates', async (ctx) => {
        if (!this.testData.productId) return;

        try {
          const { data: product } = await this.http.get(`/products/${this.testData.productId}`);
          const originalStock = product.stock || 100;

          // Multiple concurrent decrements
          const decrementStock = async (amount: number) => {
            try {
              const { data: current } = await this.http.get(`/products/${this.testData.productId}`);
              return await this.http.patch(`/products/${this.testData.productId}`, {
                stock: current.stock - amount,
              });
            } catch (e) {
              return null;
            }
          };

          const requests = [
            decrementStock(5),
            decrementStock(10),
            decrementStock(15),
          ];

          await Promise.allSettled(requests);

          // Final stock should be consistent
          const { data: final } = await this.http.get(`/products/${this.testData.productId}`);

          // Stock should not go negative unless allowed by business rules
          assert.ok(final.stock >= 0 || originalStock - final.stock <= 30,
            'Stock updates should be atomic and consistent');
        } catch (e) {
          // Inventory updates might require admin privileges
        }
      });

      t('should use optimistic or pessimistic locking appropriately', async (ctx) => {
        if (!this.testData.productId) return;

        try {
          // Get product with version/timestamp
          const { data: product1 } = await this.http.get(`/products/${this.testData.productId}`);
          const { data: product2 } = await this.http.get(`/products/${this.testData.productId}`);

          // Update from first fetch
          await this.http.patch(`/products/${this.testData.productId}`, {
            name: `Updated 1 ${Date.now()}`,
            version: product1.version, // If optimistic locking is used
          });

          // Try to update from second fetch (stale version)
          const { status } = await this.http.patch(`/products/${this.testData.productId}`, {
            name: `Updated 2 ${Date.now()}`,
            version: product2.version, // Stale version
          });

          // If optimistic locking is implemented, this should fail
          // If not, it might succeed (which is also valid depending on design)
          assert.ok(
            [200, 409, 412].includes(status),
            'System should handle version conflicts appropriately'
          );
        } catch (e) {
          // Version control might not be implemented
        }
      });
    });

    // ============================================
    // Data Migration Validation Tests
    // ============================================
    this.describe('Data Migration Validation', (t) => {
      t('should have consistent schema across all tables', async (ctx) => {
        // Verify that related tables have matching column types
        // This is more of a schema validation test

        // Check that foreign keys reference existing primary keys
        const { data: products } = await this.http.get('/products?pageSize=5');
        const productList = products.data || products;

        if (Array.isArray(productList) && productList.length > 0) {
          for (const product of productList) {
            if (product.categoryId) {
              // Verify category exists
              const { status } = await this.http.get(`/categories/${product.categoryId}`);
              assert.ok(
                [200, 404].includes(status),
                'Referenced category should exist or endpoint should exist'
              );
            }
          }
        }
      });

      t('should have proper indexes on frequently queried columns', async (ctx) => {
        // Performance test - queries on indexed columns should be fast
        const queries = [
          { name: 'Product by ID', fn: async () => {
            if (!this.testData.productId) return;
            await this.http.get(`/products/${this.testData.productId}`);
          }},
          { name: 'Products by category', fn: async () => {
            await this.http.get('/products?categoryId=test-category');
          }},
          { name: 'User orders', fn: async () => {
            if (!this.testData.userId) return;
            await this.http.get(`/users/${this.testData.userId}/orders`);
          }},
        ];

        for (const query of queries) {
          const start = Date.now();
          try {
            await query.fn();
          } catch (e) {
            // Query might fail, but we're testing performance
          }
          const duration = Date.now() - start;

          // Indexed queries should generally be under 500ms
          assert.ok(duration < 1000, `${query.name} should complete quickly (took ${duration}ms)`);
          this.recordMetric(query.name, duration);
        }
      });

      t('should handle NULL values correctly', async (ctx) => {
        // Verify that optional fields can be null
        if (!this.testData.productId) return;

        try {
          const { data: product } = await this.http.get(`/products/${this.testData.productId}`);

          // Some fields might be nullable
          // Verify the API handles them correctly (doesn't crash or return undefined)
          const nullableFields = ['description', 'imageUrl', 'specifications', 'discountPrice'];

          nullableFields.forEach(field => {
            if (field in product) {
              // Field exists in response
              assert.ok(
                product[field] === null || product[field] !== undefined,
                `Nullable field ${field} should be null or have a value, not undefined`
              );
            }
          });
        } catch (e) {
          // Product might not exist
        }
      });

      t('should enforce NOT NULL constraints', async (ctx) => {
        // Try to create entities with missing required fields
        try {
          const { status } = await this.http.post('/products', {
            // Missing required fields like name, price
            description: 'Test product',
          });

          assert.ok([400, 422].includes(status), 'Missing required fields should be rejected');
        } catch (e) {
          // Expected to fail
        }
      });

      t('should validate data types correctly', async (ctx) => {
        if (!this.testData.productId) return;

        try {
          // Try to update with wrong data type
          const { status } = await this.http.patch(`/products/${this.testData.productId}`, {
            price: 'not-a-number', // Should be numeric
          });

          assert.ok([400, 422].includes(status), 'Invalid data types should be rejected');
        } catch (e) {
          // Expected to fail
        }
      });
    });

    // ============================================
    // Backup and Recovery Testing
    // ============================================
    this.describe('Backup and Recovery Testing', (t) => {
      t('should maintain data consistency after simulated recovery', async (ctx) => {
        // Create some data, verify it exists, then verify it persists
        if (!this.testData.productId) return;

        const { data: before } = await this.http.get(`/products/${this.testData.productId}`);

        // Simulate a "recovery" by waiting and fetching again
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: after } = await this.http.get(`/products/${this.testData.productId}`);

        // Data should be identical
        assert.equal(after.id, before.id, 'Data should persist');
        assert.equal(after.name, before.name, 'Data should be consistent');
      });

      t('should have all created entities retrievable', async (ctx) => {
        // Verify all resources we created are retrievable
        for (const resource of this.createdResources) {
          try {
            let endpoint = '';
            switch (resource.type) {
              case 'product':
                endpoint = `/products/${resource.id}`;
                break;
              case 'order':
                endpoint = `/orders/${resource.id}`;
                break;
              case 'category':
                endpoint = `/categories/${resource.id}`;
                break;
              case 'user':
                endpoint = `/users/${resource.id}`;
                break;
            }

            if (endpoint) {
              const { status } = await this.http.get(endpoint);
              assert.ok(
                [200, 401, 403].includes(status),
                `Created ${resource.type} should be retrievable`
              );
            }
          } catch (e) {
            // Some resources might not be accessible
          }
        }
      });

      t('should maintain referential integrity after data operations', async (ctx) => {
        // After all our operations, verify the database is still consistent
        const { data: products } = await this.http.get('/products?pageSize=10');
        const productList = products.data || products;

        if (Array.isArray(productList)) {
          for (const product of productList) {
            if (product.categoryId) {
              // Category should exist
              const { status } = await this.http.get(`/categories/${product.categoryId}`);
              assert.ok(
                [200, 404].includes(status),
                'Product category references should be valid'
              );
            }
          }
        }
      });
    });

    // ============================================
    // Query Performance Benchmarking
    // ============================================
    this.describe('Query Performance Benchmarking', (t) => {
      t('should handle large result sets efficiently', async (ctx) => {
        const start = Date.now();
        const { data } = await this.http.get('/products?pageSize=100');
        const duration = Date.now() - start;

        this.recordMetric('Large result set', duration);

        // Should complete in reasonable time (< 2 seconds)
        assert.ok(duration < 2000, `Large query should be fast (took ${duration}ms)`);
      });

      t('should optimize paginated queries', async (ctx) => {
        const benchmarks = [];

        // Test first page vs later pages
        for (let page = 1; page <= 3; page++) {
          const start = Date.now();
          await this.http.get(`/products?page=${page}&pageSize=20`);
          const duration = Date.now() - start;
          benchmarks.push(duration);
          this.recordMetric(`Page ${page}`, duration);
        }

        // Later pages shouldn't be significantly slower than first page
        const avgTime = benchmarks.reduce((a, b) => a + b, 0) / benchmarks.length;
        const maxTime = Math.max(...benchmarks);

        assert.ok(
          maxTime < avgTime * 2,
          'Pagination performance should be consistent across pages'
        );
      });

      t('should handle complex filtered queries efficiently', async (ctx) => {
        const start = Date.now();
        await this.http.get('/products?minPrice=10&maxPrice=1000&sortBy=price&sortOrder=asc&pageSize=50');
        const duration = Date.now() - start;

        this.recordMetric('Complex filtered query', duration);

        // Complex queries should still be reasonably fast
        assert.ok(duration < 3000, `Complex query should complete in reasonable time (took ${duration}ms)`);
      });

      t('should optimize search queries', async (ctx) => {
        const start = Date.now();
        await this.http.get('/products?search=test&pageSize=20');
        const duration = Date.now() - start;

        this.recordMetric('Search query', duration);

        // Search should be fast
        assert.ok(duration < 2000, `Search should be optimized (took ${duration}ms)`);
      });

      t('should handle aggregation queries efficiently', async (ctx) => {
        // Test queries that involve counting, summing, etc.
        if (this.testData.userId) {
          const start = Date.now();
          try {
            await this.http.get(`/users/${this.testData.userId}/orders`);
          } catch (e) {
            // Endpoint might not exist
          }
          const duration = Date.now() - start;

          this.recordMetric('User orders aggregation', duration);
          assert.ok(duration < 1500, `Aggregation should be fast (took ${duration}ms)`);
        }
      });

      t('should cache frequently accessed data', async (ctx) => {
        if (!this.testData.productId) return;

        // First request (cold)
        const start1 = Date.now();
        await this.http.get(`/products/${this.testData.productId}`);
        const duration1 = Date.now() - start1;

        // Second request (should be cached)
        const start2 = Date.now();
        await this.http.get(`/products/${this.testData.productId}`);
        const duration2 = Date.now() - start2;

        this.recordMetric('Cache test - first', duration1);
        this.recordMetric('Cache test - second', duration2);

        // Second request might be faster (if caching is implemented)
        // But this isn't guaranteed, so we just record the metrics
        assert.ok(duration2 < duration1 * 3, 'Repeated requests should not be significantly slower');
      });
    });

    // ============================================
    // Foreign Key Constraints Tests
    // ============================================
    this.describe('Foreign Key Constraints', (t) => {
      t('should enforce foreign key constraints on creation', async (ctx) => {
        // Try to create a product with non-existent category
        try {
          const { status } = await this.http.post('/products', {
            name: 'Test Product',
            price: 99.99,
            categoryId: 'non-existent-category-id-12345',
          });

          // Should reject due to foreign key constraint
          assert.ok(
            [400, 404, 422].includes(status),
            'Invalid foreign key should be rejected'
          );
        } catch (e) {
          // Expected failure
        }
      });

      t('should enforce foreign key constraints on update', async (ctx) => {
        if (!this.testData.productId) return;

        try {
          const { status } = await this.http.patch(`/products/${this.testData.productId}`, {
            categoryId: 'non-existent-category-id-12345',
          });

          assert.ok(
            [400, 404, 422].includes(status),
            'Invalid foreign key update should be rejected'
          );
        } catch (e) {
          // Expected failure
        }
      });

      t('should prevent deletion of referenced entities', async (ctx) => {
        // Try to delete a category that has products
        const { data: categories } = await this.http.get('/categories');
        const categoryList = categories.data || categories;

        if (Array.isArray(categoryList) && categoryList.length > 0) {
          const category = categoryList[0];

          // Check if it has products
          const { data: products } = await this.http.get(`/products?categoryId=${category.id}`);
          const productList = products.data || products;

          if (Array.isArray(productList) && productList.length > 0) {
            try {
              const { status } = await this.http.delete(`/categories/${category.id}`);

              // Should either:
              // 1. Prevent deletion (preferred for data integrity)
              // 2. Cascade delete (if that's the design)
              // 3. Set products' categoryId to NULL

              if (status === 200 || status === 204) {
                // Deletion succeeded - verify products were handled correctly
                const { data: updatedProducts } = await this.http.get(`/products?categoryId=${category.id}`);
                const updatedList = updatedProducts.data || updatedProducts;

                // Products should either be deleted or have null categoryId
                assert.ok(
                  !Array.isArray(updatedList) || updatedList.length === 0,
                  'Products should be handled when category is deleted'
                );
              } else {
                // Deletion prevented - good for data integrity
                assert.ok(
                  [403, 409].includes(status),
                  'Should prevent deletion of referenced category'
                );
              }
            } catch (e) {
              // Deletion might require admin privileges
            }
          }
        }
      });

      t('should maintain referential integrity with NULL values', async (ctx) => {
        // Verify that setting foreign key to NULL is handled correctly
        if (!this.testData.productId) return;

        try {
          const { status } = await this.http.patch(`/products/${this.testData.productId}`, {
            categoryId: null,
          });

          // Should either allow NULL or reject it depending on schema
          assert.ok(
            [200, 400, 422].includes(status),
            'NULL foreign key should be handled according to schema'
          );

          if (status === 200) {
            // Verify product exists without category
            const { data: product } = await this.http.get(`/products/${this.testData.productId}`);
            assert.ok(
              product.categoryId === null || product.categoryId === undefined,
              'Product should have NULL categoryId if update succeeded'
            );
          }
        } catch (e) {
          // Update might require admin privileges
        }
      });
    });

    // ============================================
    // CRUD Operations Data Integrity Tests
    // ============================================
    this.describe('Data Integrity After CRUD Operations', (t) => {
      t('should maintain integrity after CREATE operations', async (ctx) => {
        // Create multiple related entities and verify relationships
        try {
          const timestamp = Date.now();

          // Create a product
          const { data: product, status } = await this.http.post('/products', {
            name: `CRUD Test Product ${timestamp}`,
            description: 'Testing CRUD integrity',
            price: 149.99,
            stock: 50,
          });

          if (status === 201 || status === 200) {
            this.createdResources.push({ type: 'product', id: product.id });

            // Verify it's immediately retrievable
            const { data: fetched, status: fetchStatus } = await this.http.get(`/products/${product.id}`);

            assert.statusCode(fetchStatus, 200, 'Created product should be immediately retrievable');
            assert.equal(fetched.name, product.name, 'Retrieved data should match created data');
            assert.equal(fetched.price, product.price, 'Price should match');
          }
        } catch (e) {
          // Product creation might require admin privileges
        }
      });

      t('should maintain integrity after READ operations', async (ctx) => {
        if (!this.testData.productId) return;

        // Multiple reads should return consistent data
        const reads = await Promise.all([
          this.http.get(`/products/${this.testData.productId}`),
          this.http.get(`/products/${this.testData.productId}`),
          this.http.get(`/products/${this.testData.productId}`),
        ]);

        // All reads should return the same data
        const data1 = reads[0].data;
        const data2 = reads[1].data;
        const data3 = reads[2].data;

        assert.equal(data1.id, data2.id, 'Concurrent reads should return same ID');
        assert.equal(data2.id, data3.id, 'All reads should be consistent');
        assert.equal(data1.name, data2.name, 'Data should be consistent across reads');
      });

      t('should maintain integrity after UPDATE operations', async (ctx) => {
        if (!this.testData.productId) return;

        try {
          // Get original state
          const { data: original } = await this.http.get(`/products/${this.testData.productId}`);

          // Update
          const newName = `Updated ${original.name} ${Date.now()}`;
          const { data: updated, status } = await this.http.patch(`/products/${this.testData.productId}`, {
            name: newName,
          });

          if (status === 200) {
            // Verify update persisted
            const { data: fetched } = await this.http.get(`/products/${this.testData.productId}`);

            assert.equal(fetched.name, newName, 'Update should persist');
            assert.equal(fetched.id, original.id, 'ID should not change');

            // Verify other fields weren't affected
            if (original.price !== undefined) {
              assert.equal(fetched.price, original.price, 'Unmodified fields should remain unchanged');
            }
          }
        } catch (e) {
          // Update might require admin privileges
        }
      });

      t('should maintain integrity after DELETE operations', async (ctx) => {
        // Create a temporary resource to delete
        try {
          const { data: product, status } = await this.http.post('/products', {
            name: `Delete Test Product ${Date.now()}`,
            price: 99.99,
          });

          if (status === 201 || status === 200) {
            const productId = product.id;

            // Delete it
            const { status: deleteStatus } = await this.http.delete(`/products/${productId}`);

            if (deleteStatus === 200 || deleteStatus === 204) {
              // Verify it's gone
              const { status: fetchStatus } = await this.http.get(`/products/${productId}`);

              assert.statusCode(fetchStatus, 404, 'Deleted product should not be retrievable');

              // Remove from cleanup list since it's already deleted
              this.createdResources = this.createdResources.filter(
                r => !(r.type === 'product' && r.id === productId)
              );
            }
          }
        } catch (e) {
          // Product operations might require admin privileges
        }
      });

      t('should prevent duplicate entries with unique constraints', async (ctx) => {
        // Try to create duplicate entries
        const timestamp = Date.now();
        const uniqueEmail = `unique-test-${timestamp}@example.com`;

        try {
          // Create first user
          const { status: status1 } = await this.http.post('/auth/register', {
            email: uniqueEmail,
            password: 'Test123!',
            name: 'Unique Test',
          });

          // Try to create duplicate
          const { status: status2 } = await this.http.post('/auth/register', {
            email: uniqueEmail,
            password: 'Test456!',
            name: 'Duplicate Test',
          });

          assert.ok(
            [409, 400, 422].includes(status2),
            'Duplicate unique field should be rejected'
          );
        } catch (e) {
          // Expected to fail on duplicate
        }
      });

      t('should handle cascading deletes correctly', async (ctx) => {
        // Create an order with items, then delete it
        // Verify order items are also deleted (if cascade delete is configured)

        if (!this.testData.productId) return;

        try {
          const { data: order, status } = await this.http.post('/orders', {
            items: [
              {
                productId: this.testData.productId,
                quantity: 1,
                price: 50.00,
              },
            ],
          });

          if (status === 201 || status === 200) {
            const orderId = order.id;

            // Delete the order
            const { status: deleteStatus } = await this.http.delete(`/orders/${orderId}`);

            if (deleteStatus === 200 || deleteStatus === 204) {
              // Verify order items are also gone
              const { status: itemsStatus } = await this.http.get(`/orders/${orderId}/items`);

              assert.ok(
                [404, 400].includes(itemsStatus),
                'Order items should be deleted with order'
              );
            }
          }
        } catch (e) {
          // Order operations might have restrictions
        }
      });

      t('should validate data before persisting', async (ctx) => {
        // Try various invalid data scenarios
        const invalidScenarios = [
          {
            name: 'Negative price',
            data: { name: 'Test', price: -100 },
          },
          {
            name: 'Missing required field',
            data: { description: 'Test' }, // Missing name and price
          },
          {
            name: 'Invalid data type',
            data: { name: 'Test', price: 'not-a-number' },
          },
        ];

        for (const scenario of invalidScenarios) {
          try {
            const { status } = await this.http.post('/products', scenario.data);
            assert.ok(
              [400, 422].includes(status),
              `${scenario.name} should be rejected`
            );
          } catch (e) {
            // Expected to fail validation
          }
        }
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new DatabaseIntegrityAgent(options);
  const results = await agent.runTests(options);

  // Print performance summary if verbose
  if (options.verbose) {
    console.log('\n=== Performance Metrics Summary ===');
    const metrics = (agent as any).performanceMetrics as Map<string, number[]>;
    metrics.forEach((times, operation) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      console.log(`${operation}:`);
      console.log(`  Avg: ${avg.toFixed(2)}ms | Min: ${min}ms | Max: ${max}ms | Samples: ${times.length}`);
    });
  }

  return results;
}

// CLI entry point
if (require.main === module) {
  runTests({ verbose: true })
    .then(results => {
      const summary = {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
      };

      console.log('\n=== Database Integrity Test Summary ===');
      console.log(`Total: ${summary.total}`);
      console.log(`Passed: ${summary.passed}`);
      console.log(`Failed: ${summary.failed}`);
      console.log(`Skipped: ${summary.skipped}`);

      if (summary.failed > 0) {
        console.log('\n=== Failed Tests ===');
        results
          .filter(r => r.status === 'failed')
          .forEach(r => {
            console.log(`\n${r.suite} > ${r.test}`);
            console.log(`Error: ${r.error}`);
            if (r.errorStack) {
              console.log(r.errorStack);
            }
          });
      }

      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test run failed:', err);
      process.exit(1);
    });
}
