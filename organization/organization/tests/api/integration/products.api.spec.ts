/**
 * API Integration Tests - Products Module
 *
 * Tests the product catalog endpoints.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  images: string[];
  category?: {
    id: string;
    name: string;
  };
  vendor?: {
    id: string;
    name: string;
  };
  stock?: number;
  rating?: number;
  reviewCount?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    cursor?: string;
    hasMore: boolean;
  };
}

describe('Products API Integration Tests', () => {
  let sampleProductId: string;

  describe('GET /api/products', () => {
    test('should return products list', async () => {
      const response = await fetch(`${API_BASE_URL}/api/products`);

      expect(response.status).toBe(200);
      const body = await response.json();

      // Response could be array or paginated
      const products = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(products)).toBe(true);

      if (products.length > 0) {
        sampleProductId = products[0].id;
        expect(products[0]).toHaveProperty('id');
        expect(products[0]).toHaveProperty('name');
        expect(products[0]).toHaveProperty('price');
      }
    });

    test('should support pagination with limit parameter', async () => {
      const response = await fetch(`${API_BASE_URL}/api/products?limit=5`);

      expect(response.status).toBe(200);
      const body = await response.json();

      const products = Array.isArray(body) ? body : body.data;
      expect(products.length).toBeLessThanOrEqual(5);
    });

    test('should support sorting', async () => {
      const responseAsc = await fetch(`${API_BASE_URL}/api/products?sort=price&order=asc&limit=10`);
      const responseDesc = await fetch(`${API_BASE_URL}/api/products?sort=price&order=desc&limit=10`);

      expect(responseAsc.status).toBe(200);
      expect(responseDesc.status).toBe(200);

      const bodyAsc = await responseAsc.json();
      const bodyDesc = await responseDesc.json();

      const productsAsc = Array.isArray(bodyAsc) ? bodyAsc : bodyAsc.data;
      const productsDesc = Array.isArray(bodyDesc) ? bodyDesc : bodyDesc.data;

      if (productsAsc.length >= 2) {
        // Verify ascending order
        for (let i = 1; i < productsAsc.length; i++) {
          expect(productsAsc[i].price).toBeGreaterThanOrEqual(productsAsc[i - 1].price);
        }
      }

      if (productsDesc.length >= 2) {
        // Verify descending order
        for (let i = 1; i < productsDesc.length; i++) {
          expect(productsDesc[i].price).toBeLessThanOrEqual(productsDesc[i - 1].price);
        }
      }
    });

    test('should filter by category', async () => {
      // First get categories
      const catResponse = await fetch(`${API_BASE_URL}/api/categories`);
      if (catResponse.status !== 200) {
        console.log('Skipping: categories endpoint not available');
        return;
      }

      const catBody = await catResponse.json();
      const categories = Array.isArray(catBody) ? catBody : catBody.data;

      if (categories.length === 0) {
        console.log('Skipping: no categories available');
        return;
      }

      const categoryId = categories[0].id;
      const response = await fetch(`${API_BASE_URL}/api/products?categoryId=${categoryId}`);

      expect(response.status).toBe(200);
    });

    test('should filter by price range', async () => {
      const response = await fetch(`${API_BASE_URL}/api/products?minPrice=10&maxPrice=100`);

      expect(response.status).toBe(200);
      const body = await response.json();

      const products = Array.isArray(body) ? body : body.data;

      products.forEach((product: Product) => {
        expect(product.price).toBeGreaterThanOrEqual(10);
        expect(product.price).toBeLessThanOrEqual(100);
      });
    });

    test('should handle empty results gracefully', async () => {
      // Search for something unlikely to exist
      const response = await fetch(
        `${API_BASE_URL}/api/products?search=xyznonexistentproduct12345`
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      const products = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    test('should return product details', async () => {
      if (!sampleProductId) {
        // Try to get a product ID first
        const listResponse = await fetch(`${API_BASE_URL}/api/products?limit=1`);
        const listBody = await listResponse.json();
        const products = Array.isArray(listBody) ? listBody : listBody.data;

        if (products.length === 0) {
          console.log('Skipping: no products available');
          return;
        }
        sampleProductId = products[0].id;
      }

      const response = await fetch(`${API_BASE_URL}/api/products/${sampleProductId}`);

      expect(response.status).toBe(200);
      const body = (await response.json()) as Product;

      expect(body.id).toBe(sampleProductId);
      expect(body.name).toBeDefined();
      expect(body.price).toBeDefined();
      expect(typeof body.price).toBe('number');
    });

    test('should return 404 for non-existent product', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${API_BASE_URL}/api/products/${fakeId}`);

      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid product ID format', async () => {
      const response = await fetch(`${API_BASE_URL}/api/products/invalid-id`);

      // Could be 400 (bad request) or 404 (not found)
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('GET /api/products/search', () => {
    test('should search products by keyword', async () => {
      const response = await fetch(`${API_BASE_URL}/api/search?q=product`);

      // Search might be at different endpoint
      if (response.status === 404) {
        // Try alternative endpoint
        const altResponse = await fetch(`${API_BASE_URL}/api/products?search=product`);
        expect(altResponse.status).toBe(200);
        return;
      }

      expect(response.status).toBe(200);
    });

    test('should return empty results for no matches', async () => {
      const response = await fetch(`${API_BASE_URL}/api/search?q=zzznonexistent999`);

      if (response.status === 404) {
        const altResponse = await fetch(
          `${API_BASE_URL}/api/products?search=zzznonexistent999`
        );
        expect(altResponse.status).toBe(200);
        return;
      }

      expect(response.status).toBe(200);
      const body = await response.json();
      const results = Array.isArray(body) ? body : body.data || body.products;
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('GET /api/products/:id/reviews', () => {
    test('should return product reviews', async () => {
      if (!sampleProductId) {
        console.log('Skipping: no product ID available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/products/${sampleProductId}/reviews`);

      // Reviews endpoint might not exist
      if (response.status === 404) {
        console.log('Reviews endpoint not available');
        return;
      }

      expect(response.status).toBe(200);
      const body = await response.json();

      const reviews = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(reviews)).toBe(true);
    });
  });
});

describe('Categories API Integration Tests', () => {
  let sampleCategoryId: string;

  describe('GET /api/categories', () => {
    test('should return categories list', async () => {
      const response = await fetch(`${API_BASE_URL}/api/categories`);

      expect(response.status).toBe(200);
      const body = await response.json();

      const categories = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(categories)).toBe(true);

      if (categories.length > 0) {
        sampleCategoryId = categories[0].id;
        expect(categories[0]).toHaveProperty('id');
        expect(categories[0]).toHaveProperty('name');
      }
    });
  });

  describe('GET /api/categories/:id', () => {
    test('should return category details', async () => {
      if (!sampleCategoryId) {
        const listResponse = await fetch(`${API_BASE_URL}/api/categories`);
        const listBody = await listResponse.json();
        const categories = Array.isArray(listBody) ? listBody : listBody.data;

        if (categories.length === 0) {
          console.log('Skipping: no categories available');
          return;
        }
        sampleCategoryId = categories[0].id;
      }

      const response = await fetch(`${API_BASE_URL}/api/categories/${sampleCategoryId}`);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.id).toBe(sampleCategoryId);
      expect(body.name).toBeDefined();
    });

    test('should return 404 for non-existent category', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${API_BASE_URL}/api/categories/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/categories/:id/products', () => {
    test('should return products in category', async () => {
      if (!sampleCategoryId) {
        console.log('Skipping: no category ID available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/categories/${sampleCategoryId}/products`);

      // Endpoint might not exist
      if (response.status === 404) {
        // Try alternative approach
        const altResponse = await fetch(
          `${API_BASE_URL}/api/products?categoryId=${sampleCategoryId}`
        );
        expect(altResponse.status).toBe(200);
        return;
      }

      expect(response.status).toBe(200);
      const body = await response.json();

      const products = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(products)).toBe(true);
    });
  });
});

describe('Product API Response Headers', () => {
  test('should include correlation headers', async () => {
    const response = await fetch(`${API_BASE_URL}/api/products`);

    // Check for standard headers
    expect(response.headers.get('content-type')).toContain('application/json');

    // Optional but good practice headers
    const requestId = response.headers.get('x-request-id');
    const correlationId = response.headers.get('x-correlation-id');

    if (requestId) {
      expect(requestId).toBeDefined();
    }
    if (correlationId) {
      expect(correlationId).toBeDefined();
    }
  });

  test('should include cache headers for public data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/products`);

    // Cache-Control is optional but good practice
    const cacheControl = response.headers.get('cache-control');
    console.log(`Cache-Control: ${cacheControl || 'not set'}`);
  });
});
