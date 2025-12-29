/**
 * Mock Services for Testing
 *
 * This file contains mock implementations of external services
 * to be used in unit and integration tests.
 */

// ============================================
// Email Service Mock
// ============================================

export class MockEmailService {
  private sentEmails: any[] = [];

  async sendEmail(to: string, subject: string, content: string, options?: any) {
    const email = {
      to,
      subject,
      content,
      options,
      sentAt: new Date(),
    };
    this.sentEmails.push(email);
    return { success: true, messageId: `msg_${Date.now()}` };
  }

  async sendWelcomeEmail(to: string, name: string) {
    return this.sendEmail(
      to,
      'Welcome to Broxiva!',
      `Hello ${name}, welcome to our platform!`,
    );
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    return this.sendEmail(
      to,
      'Password Reset Request',
      `Use this token to reset your password: ${resetToken}`,
    );
  }

  async sendOrderConfirmationEmail(to: string, orderId: string, orderDetails: any) {
    return this.sendEmail(
      to,
      'Order Confirmation',
      `Your order ${orderId} has been confirmed.`,
      { orderDetails },
    );
  }

  async sendShippingUpdateEmail(to: string, orderId: string, trackingNumber: string) {
    return this.sendEmail(
      to,
      'Shipping Update',
      `Your order ${orderId} has been shipped. Tracking: ${trackingNumber}`,
    );
  }

  async sendCartAbandonmentEmail(to: string, cartId: string) {
    return this.sendEmail(
      to,
      'Complete Your Purchase',
      `You left items in your cart. Complete your purchase now!`,
      { cartId },
    );
  }

  async sendVerificationEmail(to: string, verificationToken: string) {
    return this.sendEmail(
      to,
      'Verify Your Email',
      `Use this token to verify your email: ${verificationToken}`,
    );
  }

  getSentEmails() {
    return this.sentEmails;
  }

  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  findEmailByRecipient(recipient: string) {
    return this.sentEmails.find((email) => email.to === recipient);
  }

  findEmailsBySubject(subject: string) {
    return this.sentEmails.filter((email) => email.subject.includes(subject));
  }
}

// ============================================
// Payment Service Mock (Stripe)
// ============================================

export class MockPaymentService {
  private payments: Map<string, any> = new Map();
  private customers: Map<string, any> = new Map();
  private refunds: Map<string, any> = new Map();

  async createPaymentIntent(amount: number, currency: string = 'usd', metadata?: any) {
    const id = `pi_test_${Date.now()}`;
    const paymentIntent = {
      id,
      amount,
      currency,
      status: 'requires_payment_method',
      client_secret: `${id}_secret_test`,
      metadata,
      created: Date.now(),
    };
    this.payments.set(id, paymentIntent);
    return paymentIntent;
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethod?: string) {
    const paymentIntent = this.payments.get(paymentIntentId);
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    paymentIntent.status = 'succeeded';
    paymentIntent.payment_method = paymentMethod || 'pm_test_card';
    paymentIntent.charges = {
      data: [
        {
          id: `ch_${Date.now()}`,
          amount: paymentIntent.amount,
          status: 'succeeded',
        },
      ],
    };

    this.payments.set(paymentIntentId, paymentIntent);
    return paymentIntent;
  }

  async cancelPaymentIntent(paymentIntentId: string) {
    const paymentIntent = this.payments.get(paymentIntentId);
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    paymentIntent.status = 'canceled';
    this.payments.set(paymentIntentId, paymentIntent);
    return paymentIntent;
  }

  async createRefund(paymentIntentId: string, amount?: number) {
    const paymentIntent = this.payments.get(paymentIntentId);
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    const refundId = `re_test_${Date.now()}`;
    const refund = {
      id: refundId,
      payment_intent: paymentIntentId,
      amount: amount || paymentIntent.amount,
      status: 'succeeded',
      created: Date.now(),
    };

    this.refunds.set(refundId, refund);
    return refund;
  }

  async createCustomer(email: string, name?: string, metadata?: any) {
    const customerId = `cus_test_${Date.now()}`;
    const customer = {
      id: customerId,
      email,
      name,
      metadata,
      created: Date.now(),
    };
    this.customers.set(customerId, customer);
    return customer;
  }

  async retrieveCustomer(customerId: string) {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  async updateCustomer(customerId: string, updates: any) {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    Object.assign(customer, updates);
    this.customers.set(customerId, customer);
    return customer;
  }

  getPayment(paymentIntentId: string) {
    return this.payments.get(paymentIntentId);
  }

  getAllPayments() {
    return Array.from(this.payments.values());
  }

  clearAllData() {
    this.payments.clear();
    this.customers.clear();
    this.refunds.clear();
  }
}

// ============================================
// Storage Service Mock (AWS S3)
// ============================================

export class MockStorageService {
  private files: Map<string, any> = new Map();
  private bucketName: string = 'test-bucket';

  async uploadFile(file: any, key: string, options?: any) {
    const fileData = {
      key,
      url: `https://s3.amazonaws.com/${this.bucketName}/${key}`,
      size: file.size || 1024,
      contentType: file.contentType || 'application/octet-stream',
      uploadedAt: new Date(),
      ...options,
    };

    this.files.set(key, fileData);
    return fileData;
  }

  async deleteFile(key: string) {
    const exists = this.files.has(key);
    if (!exists) {
      throw new Error('File not found');
    }
    this.files.delete(key);
    return { success: true, key };
  }

  async getFile(key: string) {
    const file = this.files.get(key);
    if (!file) {
      throw new Error('File not found');
    }
    return file;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600) {
    const file = this.files.get(key);
    if (!file) {
      throw new Error('File not found');
    }
    return `${file.url}?signature=test_signature&expires=${Date.now() + expiresIn * 1000}`;
  }

  async listFiles(prefix?: string) {
    const files = Array.from(this.files.values());
    if (prefix) {
      return files.filter((file) => file.key.startsWith(prefix));
    }
    return files;
  }

  async copyFile(sourceKey: string, destinationKey: string) {
    const sourceFile = this.files.get(sourceKey);
    if (!sourceFile) {
      throw new Error('Source file not found');
    }

    const newFile = {
      ...sourceFile,
      key: destinationKey,
      url: `https://s3.amazonaws.com/${this.bucketName}/${destinationKey}`,
      uploadedAt: new Date(),
    };

    this.files.set(destinationKey, newFile);
    return newFile;
  }

  fileExists(key: string) {
    return this.files.has(key);
  }

  getFileCount() {
    return this.files.size;
  }

  clearAllFiles() {
    this.files.clear();
  }
}

// ============================================
// Search Service Mock (Elasticsearch)
// ============================================

export class MockSearchService {
  private index: Map<string, any> = new Map();
  private indexName: string = 'products';

  async indexProduct(productId: string, productData: any) {
    this.index.set(productId, {
      id: productId,
      ...productData,
      indexed_at: new Date(),
    });
    return { success: true, id: productId };
  }

  async bulkIndexProducts(products: any[]) {
    const results = [];
    for (const product of products) {
      const result = await this.indexProduct(product.id, product);
      results.push(result);
    }
    return { success: true, count: results.length };
  }

  async deleteProduct(productId: string) {
    const exists = this.index.has(productId);
    if (!exists) {
      throw new Error('Product not found in index');
    }
    this.index.delete(productId);
    return { success: true, id: productId };
  }

  async searchProducts(query: string, filters?: any, options?: any) {
    const allProducts = Array.from(this.index.values());

    // Simple search implementation
    let results = allProducts;

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (product) =>
          product.name?.toLowerCase().includes(lowerQuery) ||
          product.description?.toLowerCase().includes(lowerQuery) ||
          product.sku?.toLowerCase().includes(lowerQuery),
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter((p) => p.categoryId === filters.category);
      }
      if (filters.minPrice !== undefined) {
        results = results.filter((p) => p.price >= filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        results = results.filter((p) => p.price <= filters.maxPrice);
      }
      if (filters.inStock !== undefined) {
        results = results.filter((p) => (p.stock > 0) === filters.inStock);
      }
    }

    // Apply pagination
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const paginatedResults = results.slice(start, end);

    return {
      hits: paginatedResults.map((product) => ({
        _id: product.id,
        _source: product,
        _score: 1.0,
      })),
      total: {
        value: results.length,
        relation: 'eq',
      },
      max_score: 1.0,
    };
  }

  async getProduct(productId: string) {
    const product = this.index.get(productId);
    if (!product) {
      throw new Error('Product not found in index');
    }
    return product;
  }

  async clearIndex() {
    this.index.clear();
    return { success: true };
  }

  getIndexSize() {
    return this.index.size;
  }

  getAllProducts() {
    return Array.from(this.index.values());
  }
}

// ============================================
// Cache Service Mock (Redis)
// ============================================

export class MockCacheService {
  private cache: Map<string, { value: any; expires?: number }> = new Map();

  async get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: any, ttl?: number) {
    const entry: any = { value };
    if (ttl) {
      entry.expires = Date.now() + ttl * 1000;
    }
    this.cache.set(key, entry);
    return 'OK';
  }

  async del(key: string) {
    return this.cache.delete(key) ? 1 : 0;
  }

  async delMany(keys: string[]) {
    let deleted = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  async delPattern(pattern: string) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let deleted = 0;
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  async exists(key: string) {
    return this.cache.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number) {
    const entry = this.cache.get(key);
    if (!entry) {
      return 0;
    }
    entry.expires = Date.now() + seconds * 1000;
    this.cache.set(key, entry);
    return 1;
  }

  async ttl(key: string) {
    const entry = this.cache.get(key);
    if (!entry) {
      return -2;
    }
    if (!entry.expires) {
      return -1;
    }
    const ttl = Math.floor((entry.expires - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async incr(key: string) {
    const value = await this.get(key);
    const newValue = (parseInt(value) || 0) + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async incrBy(key: string, increment: number) {
    const value = await this.get(key);
    const newValue = (parseInt(value) || 0) + increment;
    await this.set(key, newValue);
    return newValue;
  }

  async decr(key: string) {
    const value = await this.get(key);
    const newValue = (parseInt(value) || 0) - 1;
    await this.set(key, newValue);
    return newValue;
  }

  async keys(pattern: string) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  async flushAll() {
    this.cache.clear();
    return 'OK';
  }

  getSize() {
    return this.cache.size;
  }
}

// ============================================
// Queue Service Mock (Bull)
// ============================================

export class MockQueueService {
  private jobs: Map<string, any[]> = new Map();

  async addJob(queueName: string, data: any, options?: any) {
    if (!this.jobs.has(queueName)) {
      this.jobs.set(queueName, []);
    }

    const job = {
      id: `job_${Date.now()}_${Math.random()}`,
      queueName,
      data,
      options,
      status: 'waiting',
      createdAt: new Date(),
    };

    this.jobs.get(queueName)!.push(job);
    return job;
  }

  async processJob(jobId: string) {
    const entries = Array.from(this.jobs.entries());
    for (const [queueName, jobs] of entries) {
      const job = jobs.find((j) => j.id === jobId);
      if (job) {
        job.status = 'completed';
        job.completedAt = new Date();
        return job;
      }
    }
    throw new Error('Job not found');
  }

  async getJobs(queueName: string) {
    return this.jobs.get(queueName) || [];
  }

  async getJobById(jobId: string) {
    const allJobs = Array.from(this.jobs.values());
    for (const jobs of allJobs) {
      const job = jobs.find((j) => j.id === jobId);
      if (job) {
        return job;
      }
    }
    return null;
  }

  async clearQueue(queueName: string) {
    this.jobs.delete(queueName);
    return { success: true };
  }

  async clearAllQueues() {
    this.jobs.clear();
    return { success: true };
  }

  getQueueNames() {
    return Array.from(this.jobs.keys());
  }

  getTotalJobCount() {
    let count = 0;
    const allJobs = Array.from(this.jobs.values());
    for (const jobs of allJobs) {
      count += jobs.length;
    }
    return count;
  }
}

// ============================================
// Notification Service Mock
// ============================================

export class MockNotificationService {
  private notifications: any[] = [];

  async sendNotification(userId: string, title: string, message: string, data?: any) {
    const notification = {
      id: `notif_${Date.now()}`,
      userId,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.push(notification);
    return notification;
  }

  async sendPushNotification(userId: string, title: string, body: string) {
    return this.sendNotification(userId, title, body, { type: 'push' });
  }

  async sendEmailNotification(userId: string, subject: string, content: string) {
    return this.sendNotification(userId, subject, content, { type: 'email' });
  }

  async markAsRead(notificationId: string) {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
    return notification;
  }

  getNotifications(userId: string) {
    return this.notifications.filter((n) => n.userId === userId);
  }

  getUnreadCount(userId: string) {
    return this.notifications.filter((n) => n.userId === userId && !n.read).length;
  }

  clearNotifications(userId?: string) {
    if (userId) {
      this.notifications = this.notifications.filter((n) => n.userId !== userId);
    } else {
      this.notifications = [];
    }
  }
}

// ============================================
// Analytics Service Mock
// ============================================

export class MockAnalyticsService {
  private events: any[] = [];

  async trackEvent(event: string, properties?: any, userId?: string) {
    const eventData = {
      id: `event_${Date.now()}`,
      event,
      properties,
      userId,
      timestamp: new Date(),
    };
    this.events.push(eventData);
    return eventData;
  }

  async trackPageView(url: string, userId?: string) {
    return this.trackEvent('page_view', { url }, userId);
  }

  async trackProductView(productId: string, userId?: string) {
    return this.trackEvent('product_view', { productId }, userId);
  }

  async trackAddToCart(productId: string, quantity: number, userId?: string) {
    return this.trackEvent('add_to_cart', { productId, quantity }, userId);
  }

  async trackPurchase(orderId: string, amount: number, userId?: string) {
    return this.trackEvent('purchase', { orderId, amount }, userId);
  }

  getEvents(eventName?: string, userId?: string) {
    let filtered = this.events;

    if (eventName) {
      filtered = filtered.filter((e) => e.event === eventName);
    }

    if (userId) {
      filtered = filtered.filter((e) => e.userId === userId);
    }

    return filtered;
  }

  getEventCount(eventName?: string) {
    if (eventName) {
      return this.events.filter((e) => e.event === eventName).length;
    }
    return this.events.length;
  }

  clearEvents() {
    this.events = [];
  }
}

// ============================================
// Export all mocks
// ============================================

export const createAllMocks = () => ({
  emailService: new MockEmailService(),
  paymentService: new MockPaymentService(),
  storageService: new MockStorageService(),
  searchService: new MockSearchService(),
  cacheService: new MockCacheService(),
  queueService: new MockQueueService(),
  notificationService: new MockNotificationService(),
  analyticsService: new MockAnalyticsService(),
});
