/**
 * Product Search Load Test Scenario
 *
 * Tests product search and discovery features including:
 * - Product search with various queries
 * - Category browsing
 * - Product filtering and sorting
 * - Product detail views
 * - Search suggestions/autocomplete
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import {
  API_URL,
  testData,
  testProducts,
  helpers,
  tags,
  defaultOptions,
  scenarios,
  thresholds,
} from '../k6-config.js';

// Custom metrics
const searchRequests = new Counter('search_requests');
const searchResults = new Trend('search_results_count');
const searchRelevance = new Rate('search_relevance_rate');
const productViews = new Counter('product_views');
const categoryViews = new Counter('category_views');

// Search test data
const searchQueries = [
  'laptop',
  'phone',
  'headphones',
  'camera',
  'watch',
  'tablet',
  'speaker',
  'monitor',
  'keyboard',
  'mouse',
  'gaming',
  'wireless',
  'bluetooth',
  'smart home',
  'fitness',
];

const categories = [
  'electronics',
  'computers',
  'smartphones',
  'audio',
  'cameras',
  'wearables',
  'accessories',
  'gaming',
  'home',
  'sports',
];

// Test configuration
export const options = {
  scenarios: {
    search_load: scenarios.load,
  },
  thresholds: {
    ...thresholds,
    'http_req_duration{endpoint:search}': ['p(95)<600'],
    'http_req_duration{endpoint:product_detail}': ['p(95)<400'],
    'http_req_duration{endpoint:category}': ['p(95)<500'],
    'search_requests': ['count>0'],
    'search_relevance_rate': ['rate>0.80'], // 80% of searches should return results
  },
};

/**
 * Main test function
 */
export default function () {
  const scenario = Math.random();

  if (scenario < 0.5) {
    // 50% - Product search
    testProductSearch();
  } else if (scenario < 0.75) {
    // 25% - Category browsing
    testCategoryBrowsing();
  } else if (scenario < 0.90) {
    // 15% - Product detail view
    testProductDetail();
  } else {
    // 10% - Search autocomplete
    testSearchAutocomplete();
  }

  // Simulate user think time
  sleep(Math.random() * 2 + 1);
}

/**
 * Test product search
 */
function testProductSearch() {
  const query = helpers.randomItem(searchQueries);
  const page = Math.floor(Math.random() * 3) + 1; // Pages 1-3
  const limit = [12, 24, 48][Math.floor(Math.random() * 3)];

  const url = `${API_URL}/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('search'),
  };

  const response = http.get(url, params);

  const success = check(response, {
    'search: status is 200': (r) => r.status === 200,
    'search: has results': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.products || body.data || body);
    },
    'search: has pagination info': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.total !== undefined || body.count !== undefined);
    },
    'search: response time < 600ms': (r) => r.timings.duration < 600,
  });

  if (success) {
    const body = helpers.parseJSON(response);
    const results = body.products || body.data || body;
    const hasResults = Array.isArray(results) && results.length > 0;

    searchResults.add(results.length);
    searchRelevance.add(hasResults ? 1 : 0);
  }

  searchRequests.add(1);

  // Test search with filters
  if (Math.random() > 0.6) {
    testSearchWithFilters(query);
  }
}

/**
 * Test search with filters
 */
function testSearchWithFilters(query) {
  const minPrice = 50;
  const maxPrice = 500;
  const sortBy = ['price_asc', 'price_desc', 'newest', 'popular'][Math.floor(Math.random() * 4)];

  const url = `${API_URL}/products/search?q=${encodeURIComponent(query)}&minPrice=${minPrice}&maxPrice=${maxPrice}&sortBy=${sortBy}`;

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('search'), filter: 'true' },
  };

  const response = http.get(url, params);

  check(response, {
    'search_filtered: status is 200': (r) => r.status === 200,
    'search_filtered: has results': (r) => {
      const body = helpers.parseJSON(r);
      const results = body.products || body.data || body;
      return Array.isArray(results);
    },
    'search_filtered: response time < 800ms': (r) => r.timings.duration < 800,
  });

  searchRequests.add(1);
}

/**
 * Test category browsing
 */
function testCategoryBrowsing() {
  const category = helpers.randomItem(categories);
  const page = Math.floor(Math.random() * 3) + 1;
  const limit = 24;

  const url = `${API_URL}/products/category/${category}?page=${page}&limit=${limit}`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('category'),
  };

  const response = http.get(url, params);

  const success = check(response, {
    'category: status is 200': (r) => r.status === 200,
    'category: has products': (r) => {
      const body = helpers.parseJSON(r);
      const results = body.products || body.data || body;
      return Array.isArray(results);
    },
    'category: has category info': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.category || body.categoryName);
    },
    'category: response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (success) {
    categoryViews.add(1);

    // Browse subcategories
    if (Math.random() > 0.7) {
      testSubcategoryBrowsing(category);
    }
  }
}

/**
 * Test subcategory browsing
 */
function testSubcategoryBrowsing(parentCategory) {
  const url = `${API_URL}/categories/${parentCategory}/subcategories`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('subcategories'),
  };

  const response = http.get(url, params);

  check(response, {
    'subcategories: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'subcategories: response time < 400ms': (r) => r.timings.duration < 400,
  });
}

/**
 * Test product detail view
 */
function testProductDetail() {
  const productId = helpers.randomItem(testProducts);
  const url = `${API_URL}/products/${productId}`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('product_detail'),
  };

  const response = http.get(url, params);

  const success = check(response, {
    'product_detail: status is 200': (r) => r.status === 200,
    'product_detail: has product data': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.id && body.name;
    },
    'product_detail: has price': (r) => {
      const body = helpers.parseJSON(r);
      return body && typeof body.price !== 'undefined';
    },
    'product_detail: has description': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.description;
    },
    'product_detail: response time < 400ms': (r) => r.timings.duration < 400,
  });

  if (success) {
    productViews.add(1);

    // Load product reviews
    sleep(1);
    loadProductReviews(productId);

    // Load related products
    if (Math.random() > 0.6) {
      sleep(1);
      loadRelatedProducts(productId);
    }
  }
}

/**
 * Load product reviews
 */
function loadProductReviews(productId) {
  const url = `${API_URL}/products/${productId}/reviews`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('product_reviews'),
  };

  const response = http.get(url, params);

  check(response, {
    'reviews: status is 200': (r) => r.status === 200,
    'reviews: has reviews data': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.reviews || body.data || body);
    },
    'reviews: response time < 500ms': (r) => r.timings.duration < 500,
  });
}

/**
 * Load related products
 */
function loadRelatedProducts(productId) {
  const url = `${API_URL}/products/${productId}/related`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('related_products'),
  };

  const response = http.get(url, params);

  check(response, {
    'related: status is 200': (r) => r.status === 200,
    'related: has products': (r) => {
      const body = helpers.parseJSON(r);
      const results = body.products || body.data || body;
      return Array.isArray(results);
    },
    'related: response time < 600ms': (r) => r.timings.duration < 600,
  });
}

/**
 * Test search autocomplete
 */
function testSearchAutocomplete() {
  const query = helpers.randomItem(searchQueries);
  const partialQuery = query.substring(0, Math.floor(query.length / 2) + 1);

  const url = `${API_URL}/search/suggest?q=${encodeURIComponent(partialQuery)}`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('autocomplete'),
  };

  const response = http.get(url, params);

  check(response, {
    'autocomplete: status is 200': (r) => r.status === 200,
    'autocomplete: has suggestions': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.suggestions || body.data || body);
    },
    'autocomplete: response time < 300ms': (r) => r.timings.duration < 300, // Fast response required
  });
}

/**
 * Test advanced search
 */
export function testAdvancedSearch() {
  const url = `${API_URL}/products/search/advanced`;

  const payload = JSON.stringify({
    query: helpers.randomItem(searchQueries),
    filters: {
      category: helpers.randomItem(categories),
      minPrice: 50,
      maxPrice: 500,
      inStock: true,
      rating: 4,
    },
    sort: {
      field: 'price',
      order: 'asc',
    },
    page: 1,
    limit: 24,
  });

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('advanced_search'),
  };

  const response = http.post(url, payload, params);

  check(response, {
    'advanced_search: status is 200': (r) => r.status === 200,
    'advanced_search: has results': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.products;
    },
    'advanced_search: response time < 800ms': (r) => r.timings.duration < 800,
  });

  searchRequests.add(1);
}

/**
 * Test faceted search
 */
export function testFacetedSearch() {
  const query = helpers.randomItem(searchQueries);
  const url = `${API_URL}/products/search?q=${encodeURIComponent(query)}&facets=true`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('faceted_search'),
  };

  const response = http.get(url, params);

  check(response, {
    'faceted_search: status is 200': (r) => r.status === 200,
    'faceted_search: has facets': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.facets;
    },
    'faceted_search: has products': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.products;
    },
  });
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting Product Search Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log(`Search queries: ${searchQueries.length}`);
  console.log(`Categories: ${categories.length}`);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Product Search Load Test completed');
}
