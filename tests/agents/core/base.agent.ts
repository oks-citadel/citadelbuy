/**
 * Base Agent Class
 *
 * Abstract base class for all testing agents.
 * Provides common functionality for test execution, reporting, and lifecycle management.
 */

import { EventEmitter } from 'events';

export interface TestContext {
  baseUrl: string;
  apiUrl: string;
  authToken?: string;
  userId?: string;
  organizationId?: string;
  headers: Record<string, string>;
  timeout: number;
  retries: number;
}

export interface TestCase {
  name: string;
  suite: string;
  description?: string;
  tags?: string[];
  timeout?: number;
  retries?: number;
  skip?: boolean;
  only?: boolean;
  fn: (ctx: TestContext) => Promise<void>;
}

export interface TestResult {
  agent: string;
  suite: string;
  test: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
  retryCount?: number;
}

export interface AgentOptions {
  timeout?: number;
  retries?: number;
  baseUrl?: string;
  apiUrl?: string;
  verbose?: boolean;
}

const DEFAULT_OPTIONS: AgentOptions = {
  timeout: 30000,
  retries: 2,
  baseUrl: process.env.WEB_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  verbose: process.env.VERBOSE === 'true',
};

/**
 * Base Agent Class
 */
export abstract class BaseAgent extends EventEmitter {
  protected name: string;
  protected type: string;
  protected tests: TestCase[] = [];
  protected results: TestResult[] = [];
  protected options: AgentOptions;
  protected context: TestContext;

  constructor(name: string, type: string, options: AgentOptions = {}) {
    super();
    this.name = name;
    this.type = type;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.context = this.createContext();
  }

  /**
   * Create test context
   */
  protected createContext(): TestContext {
    return {
      baseUrl: this.options.baseUrl!,
      apiUrl: this.options.apiUrl!,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: this.options.timeout!,
      retries: this.options.retries!,
    };
  }

  /**
   * Register a test case
   */
  protected test(
    suite: string,
    name: string,
    fn: (ctx: TestContext) => Promise<void>,
    options: Partial<TestCase> = {}
  ): void {
    this.tests.push({
      name,
      suite,
      fn,
      ...options,
    });
  }

  /**
   * Register multiple tests in a suite
   */
  protected describe(
    suite: string,
    defineFn: (t: (name: string, fn: (ctx: TestContext) => Promise<void>, options?: Partial<TestCase>) => void) => void
  ): void {
    const addTest = (name: string, fn: (ctx: TestContext) => Promise<void>, options?: Partial<TestCase>) => {
      this.test(suite, name, fn, options);
    };
    defineFn(addTest);
  }

  /**
   * Setup hook - called before all tests
   */
  protected async setup(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Teardown hook - called after all tests
   */
  protected async teardown(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Before each test hook
   */
  protected async beforeEach(): Promise<void> {
    // Override in subclasses
  }

  /**
   * After each test hook
   */
  protected async afterEach(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Execute a single test with retry logic
   */
  protected async executeTest(test: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const maxRetries = test.retries ?? this.options.retries!;

    if (test.skip) {
      return {
        agent: this.type,
        suite: test.suite,
        test: test.name,
        status: 'skipped',
        duration: 0,
      };
    }

    let lastError: Error | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.beforeEach();

        const timeout = test.timeout ?? this.options.timeout!;
        await Promise.race([
          test.fn(this.context),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
          ),
        ]);

        await this.afterEach();

        return {
          agent: this.type,
          suite: test.suite,
          test: test.name,
          status: 'passed',
          duration: Date.now() - startTime,
          retryCount,
        };
      } catch (error: any) {
        lastError = error;
        retryCount = attempt;

        if (attempt < maxRetries) {
          this.emit('test:retry', { test, attempt: attempt + 1, error });
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
    }

    return {
      agent: this.type,
      suite: test.suite,
      test: test.name,
      status: 'failed',
      duration: Date.now() - startTime,
      error: lastError?.message,
      errorStack: lastError?.stack,
      retryCount,
    };
  }

  /**
   * Run all tests
   */
  async runTests(options: AgentOptions = {}): Promise<TestResult[]> {
    this.options = { ...this.options, ...options };
    this.context = this.createContext();
    this.results = [];

    // Define tests
    await this.defineTests();

    this.emit('agent:start', { name: this.name, type: this.type, testCount: this.tests.length });

    try {
      await this.setup();

      // Check for .only tests
      const onlyTests = this.tests.filter(t => t.only);
      const testsToRun = onlyTests.length > 0 ? onlyTests : this.tests;

      for (const test of testsToRun) {
        this.emit('test:start', test);
        const result = await this.executeTest(test);
        this.results.push(result);
        this.emit('test:complete', result);

        if (this.options.verbose) {
          const icon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '○';
          console.log(`  ${icon} ${test.suite} > ${test.name} (${result.duration}ms)`);
        }
      }

      await this.teardown();
    } catch (error: any) {
      this.emit('agent:error', error);
      // Add a failed result for setup/teardown errors
      this.results.push({
        agent: this.type,
        suite: 'Agent Lifecycle',
        test: 'setup/teardown',
        status: 'failed',
        duration: 0,
        error: error.message,
        errorStack: error.stack,
      });
    }

    this.emit('agent:complete', {
      name: this.name,
      type: this.type,
      results: this.results,
      summary: this.getSummary(),
    });

    return this.results;
  }

  /**
   * Abstract method to define tests - must be implemented by subclasses
   */
  protected abstract defineTests(): Promise<void> | void;

  /**
   * Get test summary
   */
  getSummary() {
    return {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
    };
  }

  /**
   * Get all results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Get failed tests
   */
  getFailedTests(): TestResult[] {
    return this.results.filter(r => r.status === 'failed');
  }
}

/**
 * HTTP helper for agents
 */
export class HttpHelper {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(baseUrl: string, headers: Record<string, string> = {}, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.headers = headers;
    this.timeout = timeout;
  }

  setAuthToken(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.headers['Authorization'];
  }

  async get<T = any>(path: string, options: RequestInit = {}): Promise<{ data: T; status: number; headers: Headers }> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<{ data: T; status: number; headers: Headers }> {
    return this.request<T>('POST', path, body, options);
  }

  async put<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<{ data: T; status: number; headers: Headers }> {
    return this.request<T>('PUT', path, body, options);
  }

  async patch<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<{ data: T; status: number; headers: Headers }> {
    return this.request<T>('PATCH', path, body, options);
  }

  async delete<T = any>(path: string, options: RequestInit = {}): Promise<{ data: T; status: number; headers: Headers }> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number; headers: Headers }> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      let data: T;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      return { data, status: response.status, headers: response.headers };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}

/**
 * Assertion helpers
 */
export const assert = {
  equal(actual: any, expected: any, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
  },

  notEqual(actual: any, expected: any, message?: string): void {
    if (actual === expected) {
      throw new Error(message || `Expected value to not equal ${expected}`);
    }
  },

  deepEqual(actual: any, expected: any, message?: string): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Deep equality check failed`);
    }
  },

  ok(value: any, message?: string): void {
    if (!value) {
      throw new Error(message || `Expected truthy value but got ${value}`);
    }
  },

  notOk(value: any, message?: string): void {
    if (value) {
      throw new Error(message || `Expected falsy value but got ${value}`);
    }
  },

  throws(fn: () => any, message?: string): void {
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }
  },

  async rejects(promise: Promise<any>, message?: string): Promise<void> {
    let rejected = false;
    try {
      await promise;
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error(message || 'Expected promise to reject');
    }
  },

  includes(haystack: any[] | string, needle: any, message?: string): void {
    if (!haystack.includes(needle)) {
      throw new Error(message || `Expected ${haystack} to include ${needle}`);
    }
  },

  notIncludes(haystack: any[] | string, needle: any, message?: string): void {
    if (haystack.includes(needle)) {
      throw new Error(message || `Expected ${haystack} to not include ${needle}`);
    }
  },

  isArray(value: any, message?: string): void {
    if (!Array.isArray(value)) {
      throw new Error(message || `Expected array but got ${typeof value}`);
    }
  },

  isObject(value: any, message?: string): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(message || `Expected object but got ${typeof value}`);
    }
  },

  isString(value: any, message?: string): void {
    if (typeof value !== 'string') {
      throw new Error(message || `Expected string but got ${typeof value}`);
    }
  },

  isNumber(value: any, message?: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(message || `Expected number but got ${typeof value}`);
    }
  },

  hasProperty(obj: any, prop: string, message?: string): void {
    if (!(prop in obj)) {
      throw new Error(message || `Expected object to have property "${prop}"`);
    }
  },

  notHasProperty(obj: any, prop: string, message?: string): void {
    if (prop in obj) {
      throw new Error(message || `Expected object to not have property "${prop}"`);
    }
  },

  statusCode(actual: number, expected: number, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected status code ${expected} but got ${actual}`);
    }
  },

  lengthOf(value: any[] | string, length: number, message?: string): void {
    if (value.length !== length) {
      throw new Error(message || `Expected length ${length} but got ${value.length}`);
    }
  },

  greaterThan(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  },

  lessThan(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  },

  match(value: string, regex: RegExp, message?: string): void {
    if (!regex.test(value)) {
      throw new Error(message || `Expected "${value}" to match ${regex}`);
    }
  },
};

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  throw new Error('runTests must be implemented by agent subclass');
}
