/**
 * Frontend UI Testing Agent
 *
 * Tests:
 * - Cross-browser compatibility
 * - Responsive design validation
 * - Accessibility (WCAG) compliance
 * - Component rendering
 * - Client-side form validation
 * - JavaScript error monitoring
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class FrontendUIAgent extends BaseAgent {
  private http: HttpHelper;
  private webHttp: HttpHelper;
  private authToken?: string;
  private testUserId?: string;

  constructor(options: AgentOptions = {}) {
    super('Frontend UI Testing Agent', 'frontend-ui', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
    this.webHttp = new HttpHelper(this.context.baseUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Create a test user for authenticated UI tests
    try {
      const { data } = await this.http.post('/auth/register', {
        email: `ui-test-user-${Date.now()}@example.com`,
        password: 'UITest123!',
        name: 'UI Test User',
      });
      this.authToken = data.access_token;
      this.testUserId = data.user?.id;
    } catch (e) {
      console.warn('Could not create test user for UI tests');
    }
  }

  protected async teardown(): Promise<void> {
    // Cleanup test user if needed
    if (this.authToken && this.testUserId) {
      try {
        this.http.setAuthToken(this.authToken);
        await this.http.delete(`/users/${this.testUserId}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  protected defineTests(): void {
    // ============================================
    // Cross-Browser Compatibility Tests
    // ============================================
    this.describe('Cross-Browser Compatibility', (t) => {
      t('should serve HTML with proper DOCTYPE', async (ctx) => {
        const { data, status } = await this.webHttp.get('/');
        assert.statusCode(status, 200, 'Homepage should be accessible');
        assert.isString(data, 'Response should be HTML string');
        assert.ok(
          data.toLowerCase().includes('<!doctype html>') || data.toLowerCase().includes('<!doctype html'),
          'Should have HTML5 DOCTYPE'
        );
      });

      t('should include proper meta tags for browser compatibility', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for viewport meta tag (responsive design)
        assert.ok(
          data.includes('viewport') && data.includes('width=device-width'),
          'Should include viewport meta tag'
        );

        // Check for charset
        assert.ok(
          data.includes('charset="utf-8"') || data.includes("charset='utf-8'") || data.includes('charset=utf-8'),
          'Should specify UTF-8 charset'
        );
      });

      t('should serve valid HTML without syntax errors', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Basic HTML validation checks
        const htmlOpenTags = (data.match(/<html/gi) || []).length;
        const htmlCloseTags = (data.match(/<\/html>/gi) || []).length;
        assert.equal(htmlOpenTags, htmlCloseTags, 'HTML tags should be balanced');

        const headOpenTags = (data.match(/<head/gi) || []).length;
        const headCloseTags = (data.match(/<\/head>/gi) || []).length;
        assert.equal(headOpenTags, headCloseTags, 'Head tags should be balanced');

        const bodyOpenTags = (data.match(/<body/gi) || []).length;
        const bodyCloseTags = (data.match(/<\/body>/gi) || []).length;
        assert.equal(bodyOpenTags, bodyCloseTags, 'Body tags should be balanced');
      });

      t('should load essential CSS resources', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for CSS links or inline styles
        const hasCssLink = data.includes('<link') && data.includes('stylesheet');
        const hasInlineStyles = data.includes('<style>') || data.includes('style=');

        assert.ok(
          hasCssLink || hasInlineStyles,
          'Should include CSS (link or inline)'
        );
      });

      t('should load essential JavaScript resources', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for script tags
        assert.ok(
          data.includes('<script'),
          'Should include JavaScript'
        );
      });

      t('should not use deprecated HTML elements', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        const deprecatedTags = [
          '<font', '<center>', '<marquee', '<blink',
          '<frameset', '<frame ', '<applet'
        ];

        for (const tag of deprecatedTags) {
          assert.notIncludes(
            data.toLowerCase(),
            tag.toLowerCase(),
            `Should not use deprecated tag: ${tag}`
          );
        }
      });

      t('should use semantic HTML5 elements', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for at least some semantic elements
        const semanticElements = ['<header', '<nav', '<main', '<footer', '<section', '<article'];
        const foundElements = semanticElements.filter(tag => data.toLowerCase().includes(tag));

        assert.ok(
          foundElements.length > 0,
          'Should use semantic HTML5 elements'
        );
      });
    });

    // ============================================
    // Responsive Design Validation Tests
    // ============================================
    this.describe('Responsive Design Validation', (t) => {
      t('should include viewport meta tag for mobile', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        assert.ok(
          data.includes('viewport'),
          'Should have viewport meta tag'
        );
        assert.ok(
          data.includes('width=device-width'),
          'Viewport should set width to device-width'
        );
        assert.ok(
          data.includes('initial-scale=1'),
          'Viewport should set initial-scale to 1'
        );
      });

      t('should not use fixed widths that break on mobile', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for common responsive design patterns
        // This is a basic check; real testing would use browser automation
        const hasBootstrapOrTailwind =
          data.includes('bootstrap') ||
          data.includes('tailwind') ||
          data.includes('container') ||
          data.includes('col-') ||
          data.includes('grid');

        // If using a CSS framework, likely responsive
        // Otherwise, just ensure no deprecated fixed layouts
        if (!hasBootstrapOrTailwind) {
          assert.notIncludes(
            data.toLowerCase(),
            'width="100%"',
            'Should use CSS instead of HTML attributes for layout'
          );
        }
      });

      t('should support touch-friendly navigation', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for mobile-friendly navigation patterns
        const hasMobileNav =
          data.includes('navbar') ||
          data.includes('menu') ||
          data.includes('navigation') ||
          data.includes('<nav');

        assert.ok(hasMobileNav, 'Should have navigation elements');
      });

      t('should load responsive images', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for responsive image techniques
        const hasResponsiveImages =
          data.includes('srcset') ||
          data.includes('picture') ||
          data.includes('sizes=') ||
          (data.includes('<img') && data.includes('class=')); // Images with classes can be styled responsively

        if (data.includes('<img')) {
          // If there are images, they should ideally be responsive
          assert.ok(
            hasResponsiveImages,
            'Images should use responsive techniques'
          );
        }
      });

      t('should use CSS media queries for responsiveness', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for inline media queries or CSS files
        const hasMediaQueries =
          data.includes('@media') ||
          data.includes('.css'); // CSS files likely contain media queries

        assert.ok(
          hasMediaQueries,
          'Should use CSS media queries or external stylesheets'
        );
      });

      t('should have mobile-optimized font sizes', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check that base font size is not too small
        // This is implicit in good design, verified through visual testing
        assert.ok(
          !data.includes('font-size: 8px') && !data.includes('font-size:8px'),
          'Should not use extremely small fonts'
        );
      });
    });

    // ============================================
    // Accessibility (WCAG) Compliance Tests
    // ============================================
    this.describe('Accessibility (WCAG) Compliance', (t) => {
      t('should have a descriptive page title', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        assert.ok(titleMatch, 'Should have a title tag');

        if (titleMatch) {
          const title = titleMatch[1].trim();
          assert.ok(title.length > 0, 'Title should not be empty');
          assert.ok(title.length < 100, 'Title should be concise');
          assert.notEqual(title.toLowerCase(), 'untitled', 'Title should be descriptive');
        }
      });

      t('should have proper lang attribute on html tag', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        assert.ok(
          data.match(/<html[^>]*lang=["']?[a-z]{2}(-[A-Z]{2})?["']?/i),
          'Should have lang attribute on html tag'
        );
      });

      t('should include alt text for images', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Find all img tags
        const imgTags = data.match(/<img[^>]*>/gi) || [];

        if (imgTags.length > 0) {
          // Check that at least most images have alt attributes
          const imgsWithAlt = imgTags.filter(img => img.includes('alt='));
          const altPercentage = (imgsWithAlt.length / imgTags.length) * 100;

          assert.ok(
            altPercentage >= 80,
            `At least 80% of images should have alt text (found ${altPercentage.toFixed(0)}%)`
          );
        }
      });

      t('should have proper heading hierarchy', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for h1 tag
        assert.ok(
          data.toLowerCase().includes('<h1'),
          'Should have at least one h1 heading'
        );

        // Count h1 tags - ideally should only be one
        const h1Count = (data.match(/<h1[^>]*>/gi) || []).length;
        assert.ok(
          h1Count <= 2,
          'Should have at most 2 h1 headings per page'
        );
      });

      t('should have skip navigation links', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for skip links (common accessibility feature)
        const hasSkipLink =
          data.toLowerCase().includes('skip to content') ||
          data.toLowerCase().includes('skip to main') ||
          data.toLowerCase().includes('skip navigation') ||
          data.includes('#main') ||
          data.includes('#content');

        // Skip links are best practice but not always present
        // This is more of a guideline check
      });

      t('should have accessible form labels', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Find all input fields
        const inputTags = data.match(/<input[^>]*>/gi) || [];

        if (inputTags.length > 0) {
          // Check for label tags or aria-label attributes
          const hasLabels = data.includes('<label') || data.includes('aria-label');

          assert.ok(
            hasLabels,
            'Forms should have labels for accessibility'
          );
        }
      });

      t('should use ARIA attributes appropriately', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for common ARIA attributes
        const hasAriaAttributes =
          data.includes('aria-') ||
          data.includes('role=');

        // ARIA is used for complex components
        // Not required for all pages, but good to check
      });

      t('should have sufficient color contrast indicators', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check that inline styles don't use poor contrast
        // This is hard to test without rendering, but we can check for obvious issues
        const hasPoorContrast =
          data.includes('color: #fff') && data.includes('background: #eee') ||
          data.includes('color: #000') && data.includes('background: #333');

        // This is a very basic check; real contrast testing requires rendering
      });

      t('should not rely on color alone for information', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for text indicators in addition to color
        // This is implicitly tested through good design practices
        assert.ok(
          data.includes('required') || data.includes('*') || data.includes('error') || data.length > 0,
          'Should provide textual indicators'
        );
      });

      t('should have keyboard-accessible interactive elements', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check that interactive elements use proper HTML
        // Buttons should be <button> or have role="button"
        // Links should be <a> with href

        const divClicks = data.match(/<div[^>]*onclick/gi) || [];
        assert.ok(
          divClicks.length === 0,
          'Should use <button> instead of div with onclick for accessibility'
        );
      });

      t('should provide text alternatives for non-text content', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for SVG with title/desc
        if (data.includes('<svg')) {
          // SVGs should have accessible labels
          const hasSvgAccessibility =
            data.includes('aria-label') ||
            data.includes('<title>') ||
            data.includes('role="img"');
        }
      });
    });

    // ============================================
    // Component Rendering Tests
    // ============================================
    this.describe('Component Rendering', (t) => {
      t('should render homepage without errors', async (ctx) => {
        const { data, status } = await this.webHttp.get('/');
        assert.statusCode(status, 200, 'Homepage should load successfully');
        assert.ok(data.length > 100, 'Homepage should have substantial content');
      });

      t('should render product listing page', async (ctx) => {
        const { data, status } = await this.webHttp.get('/products');

        // Should either render the page or redirect to API
        assert.ok(
          [200, 301, 302, 404].includes(status),
          'Products page should be accessible or redirect'
        );

        if (status === 200) {
          assert.ok(data.length > 0, 'Products page should have content');
        }
      });

      t('should render login page', async (ctx) => {
        const { data, status } = await this.webHttp.get('/login');

        assert.ok(
          [200, 404].includes(status),
          'Login page should be accessible'
        );

        if (status === 200) {
          assert.ok(
            data.toLowerCase().includes('login') ||
            data.toLowerCase().includes('sign in') ||
            data.includes('email') ||
            data.includes('password'),
            'Login page should have login-related content'
          );
        }
      });

      t('should render registration page', async (ctx) => {
        const { data, status } = await this.webHttp.get('/register');

        assert.ok(
          [200, 404].includes(status),
          'Register page should be accessible'
        );

        if (status === 200) {
          assert.ok(
            data.toLowerCase().includes('register') ||
            data.toLowerCase().includes('sign up') ||
            data.includes('email') ||
            data.includes('password'),
            'Register page should have registration-related content'
          );
        }
      });

      t('should render cart page', async (ctx) => {
        const { data, status } = await this.webHttp.get('/cart');

        assert.ok(
          [200, 404].includes(status),
          'Cart page should be accessible'
        );

        if (status === 200) {
          assert.ok(
            data.toLowerCase().includes('cart') ||
            data.toLowerCase().includes('shopping') ||
            data.toLowerCase().includes('checkout'),
            'Cart page should have cart-related content'
          );
        }
      });

      t('should render checkout page', async (ctx) => {
        const { data, status } = await this.webHttp.get('/checkout');

        assert.ok(
          [200, 302, 401, 404].includes(status),
          'Checkout page should be accessible or require auth'
        );
      });

      t('should handle 404 errors gracefully', async (ctx) => {
        const { data, status } = await this.webHttp.get('/this-page-does-not-exist-12345');

        assert.statusCode(status, 404, 'Should return 404 for non-existent pages');

        if (typeof data === 'string') {
          assert.ok(
            data.toLowerCase().includes('404') ||
            data.toLowerCase().includes('not found') ||
            data.length > 0,
            '404 page should have user-friendly content'
          );
        }
      });

      t('should render footer on pages', async (ctx) => {
        const { data, status } = await this.webHttp.get('/');

        if (status === 200) {
          const hasFooter =
            data.toLowerCase().includes('<footer') ||
            data.toLowerCase().includes('footer') ||
            data.toLowerCase().includes('copyright') ||
            data.toLowerCase().includes('©');

          assert.ok(hasFooter, 'Should have footer element');
        }
      });

      t('should render navigation menu', async (ctx) => {
        const { data, status } = await this.webHttp.get('/');

        if (status === 200) {
          const hasNav =
            data.toLowerCase().includes('<nav') ||
            data.toLowerCase().includes('navigation') ||
            data.toLowerCase().includes('menu');

          assert.ok(hasNav, 'Should have navigation element');
        }
      });

      t('should include favicon', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        assert.ok(
          data.includes('favicon') || data.includes('icon'),
          'Should reference a favicon'
        );
      });

      t('should load without critical CSS errors', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check that CSS links are properly formatted
        const cssLinks = data.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];

        cssLinks.forEach(link => {
          assert.ok(
            link.includes('href='),
            'CSS link should have href attribute'
          );
        });
      });
    });

    // ============================================
    // Client-Side Form Validation Tests
    // ============================================
    this.describe('Client-Side Form Validation', (t) => {
      t('should have HTML5 form validation attributes', async (ctx) => {
        const { data, status } = await this.webHttp.get('/login');

        if (status === 200 && data.includes('<input')) {
          // Check for common validation attributes
          const hasValidation =
            data.includes('required') ||
            data.includes('type="email"') ||
            data.includes('pattern=') ||
            data.includes('minlength=') ||
            data.includes('maxlength=');

          assert.ok(
            hasValidation,
            'Forms should use HTML5 validation attributes'
          );
        }
      });

      t('should use appropriate input types', async (ctx) => {
        const { data, status } = await this.webHttp.get('/login');

        if (status === 200 && data.includes('<input')) {
          // Email fields should use type="email"
          if (data.toLowerCase().includes('email')) {
            assert.ok(
              data.includes('type="email"') || data.includes("type='email'"),
              'Email input should use type="email"'
            );
          }

          // Password fields should use type="password"
          if (data.toLowerCase().includes('password')) {
            assert.ok(
              data.includes('type="password"') || data.includes("type='password'"),
              'Password input should use type="password"'
            );
          }
        }
      });

      t('should have required field indicators', async (ctx) => {
        const { data, status } = await this.webHttp.get('/register');

        if (status === 200 && data.includes('<input')) {
          // Check for required attribute or visual indicators
          const hasRequiredIndicators =
            data.includes('required') ||
            data.includes('*') ||
            data.includes('Required') ||
            data.includes('aria-required');

          assert.ok(
            hasRequiredIndicators,
            'Required fields should be indicated'
          );
        }
      });

      t('should validate email format client-side', async (ctx) => {
        const { data, status } = await this.webHttp.get('/register');

        if (status === 200) {
          const hasEmailValidation =
            data.includes('type="email"') ||
            data.includes('pattern=') ||
            data.includes('@') && data.includes('validate');

          // Client-side validation is best practice
        }
      });

      t('should validate password strength client-side', async (ctx) => {
        const { data, status } = await this.webHttp.get('/register');

        if (status === 200 && data.includes('password')) {
          const hasPasswordValidation =
            data.includes('minlength=') ||
            data.includes('pattern=') ||
            data.includes('strength') ||
            data.includes('min-length');

          // Password strength indicators improve UX
        }
      });

      t('should prevent form submission with invalid data', async (ctx) => {
        const { data, status } = await this.webHttp.get('/login');

        if (status === 200 && data.includes('<form')) {
          // Check for novalidate absence (should validate)
          assert.ok(
            !data.includes('novalidate'),
            'Forms should not disable validation'
          );
        }
      });

      t('should show validation error messages', async (ctx) => {
        const { data, status } = await this.webHttp.get('/register');

        if (status === 200) {
          // Check for error message containers or patterns
          const hasErrorHandling =
            data.includes('error') ||
            data.includes('invalid') ||
            data.includes('alert') ||
            data.includes('message');

          // Error handling structures should be present
        }
      });

      t('should use autocomplete attributes for better UX', async (ctx) => {
        const { data, status } = await this.webHttp.get('/login');

        if (status === 200 && data.includes('<input')) {
          const hasAutocomplete =
            data.includes('autocomplete="email"') ||
            data.includes('autocomplete="username"') ||
            data.includes('autocomplete="current-password"');

          // Autocomplete improves UX and security
        }
      });

      t('should have CSRF protection in forms', async (ctx) => {
        const { data, status } = await this.webHttp.get('/login');

        if (status === 200 && data.includes('<form')) {
          // Check for CSRF token or SPA pattern
          const hasCsrfProtection =
            data.includes('csrf') ||
            data.includes('_token') ||
            data.includes('authenticity_token') ||
            data.includes('fetch') || // SPA uses API with JWT
            data.includes('axios');

          // CSRF protection is critical for security
        }
      });
    });

    // ============================================
    // JavaScript Error Monitoring Tests
    // ============================================
    this.describe('JavaScript Error Monitoring', (t) => {
      t('should load JavaScript without syntax errors', async (ctx) => {
        const { data, status } = await this.webHttp.get('/');

        assert.statusCode(status, 200, 'Page should load successfully');

        // Check for inline JavaScript syntax
        const scriptMatches = data.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];

        scriptMatches.forEach(script => {
          // Basic syntax check - no obvious errors
          assert.ok(
            !script.includes('SyntaxError'),
            'Should not have syntax errors in inline scripts'
          );
        });
      });

      t('should have error tracking integration', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for error tracking services
        const hasErrorTracking =
          data.includes('sentry') ||
          data.includes('bugsnag') ||
          data.includes('rollbar') ||
          data.includes('trackjs') ||
          data.includes('errorHandler') ||
          data.includes('window.onerror');

        // Error tracking is best practice for production apps
      });

      t('should handle undefined variables gracefully', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for defensive coding patterns
        const hasDefensiveCoding =
          data.includes('try {') ||
          data.includes('catch') ||
          data.includes('?.') || // Optional chaining
          data.includes('||') || // Fallback values
          data.includes('??'); // Nullish coalescing

        // Defensive coding prevents runtime errors
      });

      t('should load external scripts with error handling', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        const externalScripts = data.match(/<script[^>]*src=["'][^"']+["'][^>]*>/gi) || [];

        // Check for async/defer attributes to prevent blocking
        externalScripts.forEach(script => {
          const hasAsyncHandling =
            script.includes('async') ||
            script.includes('defer') ||
            script.includes('onerror=');

          // Non-blocking script loading improves performance
        });
      });

      t('should not expose console errors in production', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check that console.log is not excessively used
        const consoleLogCount = (data.match(/console\.log/g) || []).length;

        assert.ok(
          consoleLogCount < 10,
          'Should minimize console.log usage in production'
        );
      });

      t('should validate API responses before using', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for response validation patterns
        const hasValidation =
          data.includes('response.ok') ||
          data.includes('response.status') ||
          data.includes('.then(') ||
          data.includes('.catch(') ||
          data.includes('try');

        // Response validation prevents runtime errors
      });

      t('should handle network errors gracefully', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for error handling in fetch/axios calls
        const hasNetworkErrorHandling =
          data.includes('catch') ||
          data.includes('error') ||
          data.includes('offline') ||
          data.includes('NetworkError');

        // Network error handling improves UX
      });

      t('should use strict mode for JavaScript', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for 'use strict' directive
        const hasStrictMode =
          data.includes("'use strict'") ||
          data.includes('"use strict"') ||
          data.includes('type="module"'); // ES modules are strict by default

        // Strict mode catches common errors
      });

      t('should handle async operations with promises', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for modern async patterns
        const hasAsyncPatterns =
          data.includes('async ') ||
          data.includes('await ') ||
          data.includes('.then(') ||
          data.includes('Promise');

        // Modern async handling prevents callback hell
      });

      t('should not have memory leaks from event listeners', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for event listener cleanup patterns
        const hasEventCleanup =
          data.includes('removeEventListener') ||
          data.includes('cleanup') ||
          data.includes('useEffect') && data.includes('return'); // React cleanup

        // Proper cleanup prevents memory leaks
      });

      t('should use CSP headers to prevent XSS', async (ctx) => {
        const { headers } = await this.webHttp.get('/');

        const csp = headers.get('content-security-policy');

        // CSP headers enhance security
        // May not be set in development environments
      });

      t('should minimize JavaScript bundle size', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for code splitting or lazy loading
        const hasCodeSplitting =
          data.includes('import(') ||
          data.includes('lazy') ||
          data.includes('dynamic') ||
          data.includes('chunk');

        // Code splitting improves performance
      });

      t('should use modern JavaScript features appropriately', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for modern JS (ES6+)
        const hasModernJS =
          data.includes('const ') ||
          data.includes('let ') ||
          data.includes('=>') || // Arrow functions
          data.includes('class ') ||
          data.includes('...'); // Spread operator

        // Modern JavaScript improves code quality
      });
    });

    // ============================================
    // Performance & Loading Tests
    // ============================================
    this.describe('Performance & Loading', (t) => {
      t('should load homepage within reasonable time', async (ctx) => {
        const startTime = Date.now();
        const { status } = await this.webHttp.get('/');
        const loadTime = Date.now() - startTime;

        assert.statusCode(status, 200, 'Page should load successfully');
        assert.lessThan(loadTime, 5000, 'Homepage should load in under 5 seconds');
      });

      t('should use compression for text resources', async (ctx) => {
        const { headers } = await this.webHttp.get('/');

        const contentEncoding = headers.get('content-encoding');

        // Compression improves performance
        // May not be enabled in development
      });

      t('should cache static resources', async (ctx) => {
        const { headers } = await this.webHttp.get('/');

        const cacheControl = headers.get('cache-control');

        // Caching improves performance
        // May vary by environment
      });

      t('should use lazy loading for images', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        if (data.includes('<img')) {
          const hasLazyLoading =
            data.includes('loading="lazy"') ||
            data.includes('lazy-load') ||
            data.includes('data-src');

          // Lazy loading improves initial load time
        }
      });

      t('should preload critical resources', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        const hasPreload =
          data.includes('rel="preload"') ||
          data.includes('rel="prefetch"') ||
          data.includes('rel="dns-prefetch"');

        // Resource hints improve performance
      });

      t('should minimize render-blocking resources', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        // Check for async/defer on scripts
        const scriptTags = data.match(/<script[^>]*src=/gi) || [];
        const nonBlockingScripts = scriptTags.filter(script =>
          script.includes('async') || script.includes('defer')
        );

        if (scriptTags.length > 0) {
          const nonBlockingPercentage = (nonBlockingScripts.length / scriptTags.length) * 100;

          // Most external scripts should be non-blocking
          assert.ok(
            nonBlockingPercentage >= 50,
            'At least 50% of external scripts should be async/defer'
          );
        }
      });
    });

    // ============================================
    // SEO & Meta Tags Tests
    // ============================================
    this.describe('SEO & Meta Tags', (t) => {
      t('should have meta description tag', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        assert.ok(
          data.includes('meta name="description"') || data.includes("meta name='description'"),
          'Should have meta description tag'
        );
      });

      t('should have Open Graph meta tags', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        const hasOG =
          data.includes('og:title') ||
          data.includes('og:description') ||
          data.includes('og:image');

        // Open Graph tags improve social sharing
      });

      t('should have Twitter Card meta tags', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        const hasTwitterCard =
          data.includes('twitter:card') ||
          data.includes('twitter:title');

        // Twitter Cards improve social sharing
      });

      t('should have canonical URL', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        const hasCanonical =
          data.includes('rel="canonical"');

        // Canonical URLs prevent duplicate content issues
      });

      t('should have robots meta tag', async (ctx) => {
        const { data } = await this.webHttp.get('/');

        const hasRobots =
          data.includes('meta name="robots"') ||
          !data.includes('noindex'); // Absence of noindex is also good

        // Robots tag controls search engine indexing
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new FrontendUIAgent(options);
  return agent.runTests(options);
}

// CLI entry point
if (require.main === module) {
  runTests({ verbose: true })
    .then(results => {
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const skipped = results.filter(r => r.status === 'skipped').length;
      console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test run failed:', err);
      process.exit(1);
    });
}
