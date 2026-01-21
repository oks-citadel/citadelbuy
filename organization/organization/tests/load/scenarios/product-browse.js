/**
 * Product Browsing Load Test Scenario
 *
 * Tests realistic product catalog browsing patterns including:
 * - Homepage product listings
 * - Category navigation
 * - Product pagination
 * - Product detail views
 * - Product images loading
 * - Related products
 * - Product reviews
 * - Add to wishlist
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import {
  API_URL,
  BASE_URL,
  testProducts,
  helpers,
  tags,
  defaultOptions,
  scenarios,
  thresholds,
} from '../k6-config.js';

// Custom metrics
const pageViews = new Counter('page_views');
const productViews = new Counter('product_detail_views');
const categoryViews = new Counter('category_page_views');
const wishlistActions = new Counter('wishlist_actions');
const browsingSessionDuration = new Trend('browsing_session_duration');
const productsPerSession = new Trend('products_viewed_per_session');

// Categories for browsing
const categories = [
  'electronics',
  'computers',
  'smartphones',
  'audio',
  'cameras',
  'wearables',
  'gaming',
  'accessories',
  'home-appliances',
  'sports-fitness',
];

// Price ranges for filtering
const priceRanges = [
  { min: 0, max: 50 },
  { min: 50, max: 100 },
  { min: 100, max: 250 },
  { min: 250, max: 500 },
  { min: 500, max: 1000 },
  { min: 1000, max: 5000 },
];

// Sort options
const sortOptions = ['price_asc', 'price_desc', 'newest', 'popular', 'rating', 'name'];

// Test configuration
export const options = {
  scenarios: {
    product_browsing: scenarios.load,
  },
  thresholds: {
    ...thresholds,
    'http_req_duration{endpoint:homepage}': ['p(95)<800'],
    'http_req_duration{endpoint:category}': ['p(95)<600'],
    'http_req_duration{endpoint:product_detail}': ['p(95)<500'],
    'http_req_duration{endpoint:product_list}': ['p(95)<700'],
    'page_views': ['count>0'],
    'product_detail_views': ['count>0'],
  },
};

/**
 * Main test function - Simulates realistic browsing session
 */
export default function () {
  const sessionStart = Date.now();
  let productsViewed = 0;

  // Start browsing session
  const browsingPattern = Math.random();

  if (browsingPattern < 0.3) {
    // 30% - Homepage browsing pattern
    productsViewed = browseFromHomepage();
  } else if (browsingPattern < 0.7) {
    // 40% - Category browsing pattern
    productsViewed = browseByCategory();
  } else {
    // 30% - Direct product search and browse
    productsViewed = browseFromSearch();
  }

  // Record session metrics
  const sessionDuration = Date.now() - sessionStart;
  browsingSessionDuration.add(sessionDuration);
  productsPerSession.add(productsViewed);

  // Simulate user thinking time
  sleep(Math.random() * 2 + 1);
}

/**
 * Browse from homepage
 */
function browseFromHomepage() {
  let productsViewed = 0;

  // Load homepage
  loadHomepage();
  pageViews.add(1);
  sleep(2);

  // View featured products
  const featuredCount = Math.floor(Math.random() * 3) + 2; // 2-4 products
  for (let i = 0; i < featuredCount; i++) {
    const productId = helpers.randomItem(testProducts);
    viewProductDetail(productId);
    productsViewed++;
    sleep(Math.random() * 3 + 2);

    // Random chance to view related products
    if (Math.random() > 0.6) {
      viewRelatedProducts(productId);
      sleep(1);
    }
  }

  // Browse a category from homepage
  if (Math.random() > 0.5) {
    const category = helpers.randomItem(categories);
    browseCategoryProducts(category, 1);
    productsViewed += Math.floor(Math.random() * 2) + 1;
  }

  return productsViewed;
}

/**
 * Browse by category
 */
function browseByCategory() {
  let productsViewed = 0;

  // Select a category
  const category = helpers.randomItem(categories);

  // Browse multiple pages in category
  const pagesToBrowse = Math.floor(Math.random() * 3) + 1; // 1-3 pages

  for (let page = 1; page <= pagesToBrowse; page++) {
    browseCategoryProducts(category, page);
    pageViews.add(1);
    categoryViews.add(1);
    sleep(Math.random() * 2 + 1);

    // View some products from the category
    const productsToView = Math.floor(Math.random() * 2) + 1; // 1-2 products per page
    for (let i = 0; i < productsToView; i++) {
      const productId = helpers.randomItem(testProducts);
      viewProductDetail(productId);
      productsViewed++;
      sleep(Math.random() * 3 + 2);

      // View reviews
      if (Math.random() > 0.6) {
        viewProductReviews(productId);
        sleep(1);
      }

      // Add to wishlist
      if (Math.random() > 0.8) {
        addToWishlist(productId);
        sleep(0.5);
      }
    }
  }

  // Apply filters and sort
  if (Math.random() > 0.5) {
    const priceRange = helpers.randomItem(priceRanges);
    const sortBy = helpers.randomItem(sortOptions);
    browseCategoryWithFilters(category, priceRange, sortBy);
    pageViews.add(1);
    sleep(2);
  }

  return productsViewed;
}

/**
 * Browse from search results
 */
function browseFromSearch() {
  let productsViewed = 0;

  // Perform search
  const searchTerms = ['laptop', 'phone', 'headphones', 'camera', 'watch'];
  const query = helpers.randomItem(searchTerms);

  searchProducts(query, 1);
  pageViews.add(1);
  sleep(2);

  // View products from search results
  const productsToView = Math.floor(Math.random() * 4) + 2; // 2-5 products
  for (let i = 0; i < productsToView; i++) {
    const productId = helpers.randomItem(testProducts);
    viewProductDetail(productId);
    productsViewed++;
    sleep(Math.random() * 3 + 2);

    // Compare products
    if (i > 0 && Math.random() > 0.7) {
      // User compares products by going back and forth
      sleep(1);
    }
  }

  return productsViewed;
}

/**
 * Load homepage
 */
function loadHomepage() {
  const url = `${API_URL}/products/featured`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('homepage'),
  };

  const response = http.get(url, params);

  check(response, {
    'homepage: status is 200': (r) => r.status === 200,
    'homepage: has featured products': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.products || body.data || body);
    },
    'homepage: response time < 800ms': (r) => r.timings.duration < 800,
  });
}

/**
 * Browse category products
 */
function browseCategoryProducts(category, page = 1) {
  const limit = 24;
  const url = `${API_URL}/products/category/${category}?page=${page}&limit=${limit}`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('category'),
  };

  const response = http.get(url, params);

  check(response, {
    'category: status is 200': (r) => r.status === 200,
    'category: has products': (r) => {
      const body = helpers.parseJSON(r);
      const products = body.products || body.data || body;
      return Array.isArray(products);
    },
    'category: has pagination': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.total !== undefined || body.totalPages !== undefined);
    },
    'category: response time < 600ms': (r) => r.timings.duration < 600,
  });

  return helpers.parseJSON(response);
}

/**
 * Browse category with filters
 */
function browseCategoryWithFilters(category, priceRange, sortBy) {
  const url = `${API_URL}/products/category/${category}?minPrice=${priceRange.min}&maxPrice=${priceRange.max}&sortBy=${sortBy}`;

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('category'), filtered: 'true' },
  };

  const response = http.get(url, params);

  check(response, {
    'category_filtered: status is 200': (r) => r.status === 200,
    'category_filtered: has products': (r) => {
      const body = helpers.parseJSON(r);
      const products = body.products || body.data || body;
      return Array.isArray(products);
    },
    'category_filtered: response time < 700ms': (r) => r.timings.duration < 700,
  });
}

/**
 * Search products
 */
function searchProducts(query, page = 1) {
  const url = `${API_URL}/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=24`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('search'),
  };

  const response = http.get(url, params);

  check(response, {
    'search: status is 200': (r) => r.status === 200,
    'search: has results': (r) => {
      const body = helpers.parseJSON(r);
      const products = body.products || body.data || body;
      return Array.isArray(products);
    },
    'search: response time < 600ms': (r) => r.timings.duration < 600,
  });
}

/**
 * View product detail
 */
function viewProductDetail(productId) {
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
    'product_detail: has images': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.images || body.imageUrl);
    },
    'product_detail: response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (success) {
    productViews.add(1);
  }

  return helpers.parseJSON(response);
}

/**
 * View related products
 */
function viewRelatedProducts(productId) {
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
      const products = body.products || body.data || body;
      return Array.isArray(products);
    },
    'related: response time < 600ms': (r) => r.timings.duration < 600,
  });
}

/**
 * View product reviews
 */
function viewProductReviews(productId) {
  const url = `${API_URL}/products/${productId}/reviews?page=1&limit=10`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('product_reviews'),
  };

  const response = http.get(url, params);

  check(response, {
    'reviews: status is 200': (r) => r.status === 200,
    'reviews: has reviews': (r) => {
      const body = helpers.parseJSON(r);
      const reviews = body.reviews || body.data || body;
      return Array.isArray(reviews);
    },
    'reviews: has rating info': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.averageRating !== undefined || body.totalReviews !== undefined);
    },
    'reviews: response time < 500ms': (r) => r.timings.duration < 500,
  });
}

/**
 * Add to wishlist (requires authentication)
 */
function addToWishlist(productId) {
  const url = `${API_URL}/wishlist`;

  const payload = JSON.stringify({
    productId: productId,
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer mock_token_${Date.now()}`,
    },
    tags: tags.endpoint('add_to_wishlist'),
  };

  const response = http.post(url, payload, params);

  check(response, {
    'wishlist: status is 200 or 201 or 401': (r) =>
      r.status === 200 || r.status === 201 || r.status === 401, // 401 expected with mock token
    'wishlist: response time < 400ms': (r) => r.timings.duration < 400,
  });

  if (response.status === 200 || response.status === 201) {
    wishlistActions.add(1);
  }
}

/**
 * Browse product list (general)
 */
function browseProductList(page = 1, limit = 24) {
  const url = `${API_URL}/products?page=${page}&limit=${limit}`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('product_list'),
  };

  const response = http.get(url, params);

  check(response, {
    'product_list: status is 200': (r) => r.status === 200,
    'product_list: has products': (r) => {
      const body = helpers.parseJSON(r);
      const products = body.products || body.data || body;
      return Array.isArray(products) && products.length > 0;
    },
    'product_list: response time < 700ms': (r) => r.timings.duration < 700,
  });
}

/**
 * View product specifications
 */
export function viewProductSpecs(productId) {
  const url = `${API_URL}/products/${productId}/specifications`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('product_specs'),
  };

  const response = http.get(url, params);

  check(response, {
    'specs: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'specs: response time < 400ms': (r) => r.timings.duration < 400,
  });
}

/**
 * View product availability
 */
export function checkProductAvailability(productId) {
  const url = `${API_URL}/products/${productId}/availability`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('product_availability'),
  };

  const response = http.get(url, params);

  check(response, {
    'availability: status is 200': (r) => r.status === 200,
    'availability: has stock info': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.inStock !== undefined || body.quantity !== undefined);
    },
    'availability: response time < 300ms': (r) => r.timings.duration < 300,
  });
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting Product Browsing Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Test products: ${testProducts.length}`);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Product Browsing Load Test completed');
}
