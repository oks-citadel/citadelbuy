# Third-Party Integration Guide

This document provides comprehensive information about integrating with 27+ third-party services used in the Global E-Commerce Platform.

## Table of Contents

1. [Payment Processors](#payment-processors)
2. [Shipping & Logistics](#shipping--logistics)
3. [Tax & Compliance](#tax--compliance)
4. [Translation Services](#translation-services)
5. [Email & SMS](#email--sms)
6. [Analytics](#analytics)
7. [Customer Support](#customer-support)
8. [Fraud Prevention](#fraud-prevention)
9. [Marketing Automation](#marketing-automation)
10. [Search & Recommendations](#search--recommendations)
11. [Cloud Storage & CDN](#cloud-storage--cdn)
12. [Monitoring & Error Tracking](#monitoring--error-tracking)
13. [CRM](#crm)

---

## Payment Processors

### 1. Stripe

**Purpose**: Primary payment processor for credit cards and digital wallets

**Setup**:
```bash
npm install stripe
```

**Configuration**:
```javascript
// services/payment/stripe.service.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  async createPaymentIntent(amount, currency, metadata) {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true }
    });
  }

  async confirmPayment(paymentIntentId, paymentMethodId) {
    return await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    });
  }

  async createRefund(chargeId, amount) {
    return await stripe.refunds.create({
      charge: chargeId,
      amount: amount ? Math.round(amount * 100) : undefined
    });
  }

  async handleWebhook(payload, signature) {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleRefund(event.data.object);
        break;
    }

    return { received: true };
  }
}

module.exports = new StripeService();
```

**Webhook Setup**:
```bash
# Stripe CLI for local testing
stripe listen --forward-to localhost:4000/webhooks/stripe

# Production webhook endpoint
POST /webhooks/stripe
```

**Supported Features**:
- Credit/Debit Cards (Visa, Mastercard, Amex, Discover)
- Apple Pay, Google Pay
- SEPA Direct Debit
- ACH
- Klarna, Afterpay
- 135+ currencies

**Documentation**: https://stripe.com/docs

---

### 2. PayPal

**Purpose**: Alternative payment method, popular globally

**Setup**:
```bash
npm install @paypal/checkout-server-sdk
```

**Configuration**:
```javascript
// services/payment/paypal.service.js
const paypal = require('@paypal/checkout-server-sdk');

const environment = process.env.PAYPAL_MODE === 'live'
  ? new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    )
  : new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    );

const client = new paypal.core.PayPalHttpClient(environment);

class PayPalService {
  async createOrder(amount, currency) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        }
      }]
    });

    const response = await client.execute(request);
    return response.result;
  }

  async captureOrder(orderId) {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const response = await client.execute(request);
    return response.result;
  }

  async refundPayment(captureId, amount, currency) {
    const request = new paypal.payments.CapturesRefundRequest(captureId);
    request.requestBody({
      amount: {
        value: amount.toFixed(2),
        currency_code: currency
      }
    });

    const response = await client.execute(request);
    return response.result;
  }
}

module.exports = new PayPalService();
```

**Documentation**: https://developer.paypal.com

---

### 3. Adyen

**Purpose**: International payment processor with local payment methods

**Setup**:
```bash
npm install @adyen/api-library
```

**Configuration**:
```javascript
// services/payment/adyen.service.js
const { Client, CheckoutAPI } = require('@adyen/api-library');

const client = new Client({
  apiKey: process.env.ADYEN_API_KEY,
  environment: process.env.ADYEN_ENVIRONMENT // 'TEST' or 'LIVE'
});

const checkout = new CheckoutAPI(client);

class AdyenService {
  async createPaymentSession(amount, currency, reference) {
    const paymentRequest = {
      amount: {
        value: Math.round(amount * 100),
        currency
      },
      reference,
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      returnUrl: `${process.env.APP_URL}/checkout/complete`,
      countryCode: 'US'
    };

    return await checkout.sessions(paymentRequest);
  }

  async authorizePayment(paymentData) {
    return await checkout.payments(paymentData);
  }

  async cancelOrRefund(originalReference, amount) {
    return await checkout.refunds({
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      reference: originalReference,
      amount
    });
  }
}

module.exports = new AdyenService();
```

**Documentation**: https://docs.adyen.com

---

## Shipping & Logistics

### 4. ShipStation

**Purpose**: Multi-carrier shipping label generation and order fulfillment

**Setup**:
```bash
npm install axios
```

**Configuration**:
```javascript
// services/shipping/shipstation.service.js
const axios = require('axios');

class ShipStationService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://ssapi.shipstation.com',
      auth: {
        username: process.env.SHIPSTATION_API_KEY,
        password: process.env.SHIPSTATION_API_SECRET
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async createOrder(orderData) {
    const response = await this.client.post('/orders/createorder', {
      orderNumber: orderData.orderNumber,
      orderDate: orderData.orderDate,
      orderStatus: 'awaiting_shipment',
      billTo: orderData.billingAddress,
      shipTo: orderData.shippingAddress,
      items: orderData.items.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price
      })),
      amountPaid: orderData.total,
      shippingAmount: orderData.shippingCost
    });

    return response.data;
  }

  async getShippingRates(shipmentData) {
    const response = await this.client.post('/shipments/getrates', {
      carrierCode: shipmentData.carrier,
      serviceCode: shipmentData.service,
      packageCode: shipmentData.packageType,
      fromPostalCode: shipmentData.origin.postalCode,
      toCountry: shipmentData.destination.country,
      toPostalCode: shipmentData.destination.postalCode,
      weight: {
        value: shipmentData.weight,
        units: 'pounds'
      },
      dimensions: shipmentData.dimensions
    });

    return response.data;
  }

  async createLabel(orderId, carrierCode, serviceCode) {
    const response = await this.client.post('/orders/createlabelfororder', {
      orderId,
      carrierCode,
      serviceCode,
      testLabel: process.env.NODE_ENV !== 'production'
    });

    return response.data;
  }

  async trackShipment(trackingNumber) {
    const response = await this.client.get(`/shipments?trackingNumber=${trackingNumber}`);
    return response.data.shipments[0];
  }
}

module.exports = new ShipStationService();
```

**Webhook Events**:
- `ORDER_NOTIFY`: New order imported
- `SHIP_NOTIFY`: Order shipped
- `ITEM_ORDER_NOTIFY`: Order item updated

**Documentation**: https://www.shipstation.com/docs/api/

---

### 5. EasyPost

**Purpose**: Multi-carrier shipping API

**Setup**:
```bash
npm install @easypost/api
```

**Configuration**:
```javascript
// services/shipping/easypost.service.js
const EasyPost = require('@easypost/api');

const client = new EasyPost(process.env.EASYPOST_API_KEY);

class EasyPostService {
  async getRates(shipmentData) {
    const shipment = await client.Shipment.create({
      from_address: shipmentData.fromAddress,
      to_address: shipmentData.toAddress,
      parcel: shipmentData.parcel
    });

    return shipment.rates;
  }

  async buyShipment(shipmentId, rateId) {
    const shipment = await client.Shipment.retrieve(shipmentId);
    return await shipment.buy(rateId);
  }

  async trackShipment(trackingCode, carrier) {
    return await client.Tracker.create({
      tracking_code: trackingCode,
      carrier
    });
  }

  async createReturn(shipmentId) {
    return await client.Shipment.retrieve(shipmentId).then(
      shipment => shipment.generateReturnLabel()
    );
  }
}

module.exports = new EasyPostService();
```

**Documentation**: https://www.easypost.com/docs/api

---

## Tax & Compliance

### 6. Avalara

**Purpose**: Automated tax calculation and compliance

**Setup**:
```bash
npm install avatax
```

**Configuration**:
```javascript
// services/tax/avalara.service.js
const Avatax = require('avatax');

const client = new Avatax({
  appName: 'GlobalECommerce',
  appVersion: '1.0',
  environment: process.env.AVALARA_ENVIRONMENT, // 'sandbox' or 'production'
  machineName: 'ecommerce-api'
}).withSecurity({
  username: process.env.AVALARA_ACCOUNT_ID,
  password: process.env.AVALARA_LICENSE_KEY
});

class AvalaraService {
  async calculateTax(transaction) {
    const taxDocument = {
      type: 'SalesInvoice',
      companyCode: process.env.AVALARA_COMPANY_CODE,
      date: new Date().toISOString().split('T')[0],
      customerCode: transaction.customerId,
      addresses: {
        shipFrom: transaction.shipFrom,
        shipTo: transaction.shipTo
      },
      lines: transaction.items.map((item, index) => ({
        number: index + 1,
        quantity: item.quantity,
        amount: item.amount,
        taxCode: item.taxCode,
        itemCode: item.sku,
        description: item.description
      }))
    };

    const result = await client.createTransaction({ model: taxDocument });
    return result;
  }

  async commitTransaction(transactionCode) {
    return await client.commitTransaction({
      companyCode: process.env.AVALARA_COMPANY_CODE,
      transactionCode,
      model: { commit: true }
    });
  }

  async voidTransaction(transactionCode) {
    return await client.voidTransaction({
      companyCode: process.env.AVALARA_COMPANY_CODE,
      transactionCode,
      model: { code: 'DocVoided' }
    });
  }

  async validateAddress(address) {
    return await client.resolveAddress({
      line1: address.line1,
      city: address.city,
      region: address.state,
      postalCode: address.postalCode,
      country: address.country
    });
  }
}

module.exports = new AvalaraService();
```

**Features**:
- Sales tax calculation for 11,000+ US jurisdictions
- VAT calculation for EU, UK
- GST for Canada, Australia, India
- Tax reporting and filing
- Exemption certificate management

**Documentation**: https://developer.avalara.com

---

### 7. TaxJar

**Purpose**: Alternative tax compliance solution

**Setup**:
```bash
npm install taxjar
```

**Configuration**:
```javascript
// services/tax/taxjar.service.js
const Taxjar = require('taxjar');

const client = new Taxjar({
  apiKey: process.env.TAXJAR_API_KEY,
  apiUrl: process.env.NODE_ENV === 'production' 
    ? Taxjar.PRODUCTION_API_URL 
    : Taxjar.SANDBOX_API_URL
});

class TaxJarService {
  async calculateSalesTax(order) {
    return await client.taxForOrder({
      from_country: order.fromAddress.country,
      from_zip: order.fromAddress.zip,
      from_state: order.fromAddress.state,
      to_country: order.toAddress.country,
      to_zip: order.toAddress.zip,
      to_state: order.toAddress.state,
      amount: order.amount,
      shipping: order.shipping,
      line_items: order.lineItems
    });
  }

  async createOrder(orderData) {
    return await client.createOrder({
      transaction_id: orderData.id,
      transaction_date: orderData.date,
      to_country: orderData.toAddress.country,
      to_zip: orderData.toAddress.zip,
      to_state: orderData.toAddress.state,
      amount: orderData.amount,
      shipping: orderData.shipping,
      sales_tax: orderData.tax,
      line_items: orderData.lineItems
    });
  }
}

module.exports = new TaxJarService();
```

**Documentation**: https://developers.taxjar.com

---

## Translation Services

### 8. Google Cloud Translation

**Purpose**: AI-powered translation for product content

**Setup**:
```bash
npm install @google-cloud/translate
```

**Configuration**:
```javascript
// services/translation/google.service.js
const { Translate } = require('@google-cloud/translate').v2;

const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY,
  projectId: process.env.GOOGLE_TRANSLATE_PROJECT_ID
});

class GoogleTranslateService {
  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    const [translation] = await translate.translate(text, {
      from: sourceLanguage,
      to: targetLanguage
    });

    return translation;
  }

  async translateBatch(texts, targetLanguage, sourceLanguage = 'en') {
    const [translations] = await translate.translate(texts, {
      from: sourceLanguage,
      to: targetLanguage
    });

    return translations;
  }

  async detectLanguage(text) {
    const [detection] = await translate.detect(text);
    return detection.language;
  }

  async getSupportedLanguages() {
    const [languages] = await translate.getLanguages();
    return languages;
  }
}

module.exports = new GoogleTranslateService();
```

**Supported Languages**: 100+ languages

**Documentation**: https://cloud.google.com/translate/docs

---

### 9. DeepL

**Purpose**: High-quality translation alternative

**Setup**:
```bash
npm install deepl-node
```

**Configuration**:
```javascript
// services/translation/deepl.service.js
const * as deepl = require('deepl-node');

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

class DeepLService {
  async translateText(text, targetLanguage, sourceLanguage = 'EN') {
    const result = await translator.translateText(
      text,
      sourceLanguage,
      targetLanguage
    );

    return result.text;
  }

  async translateDocument(filePath, targetLanguage, sourceLanguage = 'EN') {
    return await translator.translateDocument(
      filePath,
      sourceLanguage,
      targetLanguage
    );
  }

  async getUsage() {
    return await translator.getUsage();
  }
}

module.exports = new DeepLService();
```

**Supported Languages**: 30+ languages with high quality

**Documentation**: https://www.deepl.com/docs-api

---

## Email & SMS

### 10. SendGrid

**Purpose**: Transactional and marketing emails

**Setup**:
```bash
npm install @sendgrid/mail
```

**Configuration**:
```javascript
// services/email/sendgrid.service.js
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class SendGridService {
  async sendEmail(to, subject, html, text) {
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME
      },
      subject,
      text,
      html
    };

    return await sgMail.send(msg);
  }

  async sendOrderConfirmation(order) {
    return await this.sendEmail(
      order.customer.email,
      `Order Confirmation - ${order.orderNumber}`,
      this.renderOrderTemplate(order),
      `Your order ${order.orderNumber} has been confirmed.`
    );
  }

  async sendShippingNotification(order, trackingInfo) {
    return await this.sendEmail(
      order.customer.email,
      `Your Order Has Shipped - ${order.orderNumber}`,
      this.renderShippingTemplate(order, trackingInfo),
      `Your order ${order.orderNumber} has shipped.`
    );
  }

  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    
    return await this.sendEmail(
      user.email,
      'Password Reset Request',
      this.renderPasswordResetTemplate(user, resetUrl),
      `Reset your password: ${resetUrl}`
    );
  }
}

module.exports = new SendGridService();
```

**Email Templates**: Use dynamic templates in SendGrid dashboard

**Documentation**: https://docs.sendgrid.com

---

### 11. Twilio

**Purpose**: SMS notifications for order updates

**Setup**:
```bash
npm install twilio
```

**Configuration**:
```javascript
// services/sms/twilio.service.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class TwilioService {
  async sendSMS(to, message) {
    return await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
  }

  async sendOrderUpdate(phoneNumber, orderNumber, status) {
    const message = `Your order ${orderNumber} is now ${status}. Track it at ${process.env.APP_URL}/orders/${orderNumber}`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  async sendVerificationCode(phoneNumber, code) {
    const message = `Your verification code is: ${code}. Valid for 10 minutes.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  async sendShippingNotification(phoneNumber, orderNumber, trackingNumber) {
    const message = `Your order ${orderNumber} has shipped! Track it: ${trackingNumber}`;
    
    return await this.sendSMS(phoneNumber, message);
  }
}

module.exports = new TwilioService();
```

**Features**:
- SMS/MMS messaging
- Phone number verification
- Two-factor authentication
- WhatsApp messaging

**Documentation**: https://www.twilio.com/docs

---

## Analytics

### 12. Google Analytics 4

**Purpose**: Web and app analytics

**Setup**:
```javascript
// Frontend: Add to index.html or app initialization
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**E-commerce Tracking**:
```javascript
// Track product views
gtag('event', 'view_item', {
  currency: 'USD',
  value: 29.99,
  items: [{
    item_id: 'SKU_12345',
    item_name: 'Premium Headphones',
    price: 29.99,
    quantity: 1
  }]
});

// Track add to cart
gtag('event', 'add_to_cart', {
  currency: 'USD',
  value: 29.99,
  items: [...]
});

// Track purchase
gtag('event', 'purchase', {
  transaction_id: 'T_12345',
  value: 29.99,
  currency: 'USD',
  tax: 2.40,
  shipping: 5.99,
  items: [...]
});
```

**Documentation**: https://developers.google.com/analytics

---

### 13. Mixpanel

**Purpose**: Product analytics and user behavior

**Setup**:
```bash
npm install mixpanel-browser
```

**Configuration**:
```javascript
// services/analytics/mixpanel.service.js
import mixpanel from 'mixpanel-browser';

mixpanel.init(process.env.MIXPANEL_TOKEN);

class MixpanelService {
  identify(userId) {
    mixpanel.identify(userId);
  }

  setUserProperties(properties) {
    mixpanel.people.set(properties);
  }

  track(eventName, properties = {}) {
    mixpanel.track(eventName, properties);
  }

  trackPageView(pageName) {
    this.track('Page Viewed', {
      page: pageName,
      url: window.location.href
    });
  }

  trackProductView(product) {
    this.track('Product Viewed', {
      productId: product.id,
      productName: product.name,
      price: product.price,
      category: product.category
    });
  }

  trackPurchase(order) {
    this.track('Purchase Completed', {
      orderId: order.id,
      revenue: order.total,
      items: order.items.length,
      currency: order.currency
    });
  }
}

export default new MixpanelService();
```

**Documentation**: https://developer.mixpanel.com

---

## Customer Support

### 14. Zendesk

**Purpose**: Customer support ticketing system

**Setup**:
```bash
npm install node-zendesk
```

**Configuration**:
```javascript
// services/support/zendesk.service.js
const zendesk = require('node-zendesk');

const client = zendesk.createClient({
  username: process.env.ZENDESK_EMAIL,
  token: process.env.ZENDESK_API_TOKEN,
  remoteUri: `https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2`
});

class ZendeskService {
  async createTicket(ticketData) {
    return new Promise((resolve, reject) => {
      client.tickets.create({
        ticket: {
          subject: ticketData.subject,
          comment: { body: ticketData.message },
          requester: { 
            name: ticketData.customerName,
            email: ticketData.customerEmail
          },
          priority: ticketData.priority || 'normal',
          type: ticketData.type || 'problem'
        }
      }, (err, req, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async updateTicket(ticketId, updateData) {
    return new Promise((resolve, reject) => {
      client.tickets.update(ticketId, {
        ticket: updateData
      }, (err, req, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async searchTickets(query) {
    return new Promise((resolve, reject) => {
      client.search.query(query, (err, req, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}

module.exports = new ZendeskService();
```

**Documentation**: https://developer.zendesk.com

---

## Fraud Prevention

### 15. Sift

**Purpose**: Machine learning-based fraud detection

**Setup**:
```bash
npm install sift-science
```

**Configuration**:
```javascript
// services/fraud/sift.service.js
const SiftClient = require('sift-science');

const client = new SiftClient(process.env.SIFT_API_KEY);

class SiftService {
  async trackTransaction(transaction) {
    return await client.track({
      $type: '$transaction',
      $api_key: process.env.SIFT_API_KEY,
      $user_id: transaction.userId,
      $transaction_id: transaction.id,
      $currency_code: transaction.currency,
      $amount: transaction.amount * 1000000, // Micros
      $transaction_type: '$sale',
      $payment_method: {
        $payment_type: transaction.paymentType,
        $payment_gateway: transaction.gateway
      },
      $billing_address: transaction.billingAddress,
      $shipping_address: transaction.shippingAddress,
      $items: transaction.items
    });
  }

  async getScore(userId) {
    return await client.score(userId);
  }

  async getDecision(userId) {
    const score = await this.getScore(userId);
    
    if (score.score > 80) {
      return { decision: 'block', reason: 'High fraud score' };
    } else if (score.score > 50) {
      return { decision: 'review', reason: 'Medium fraud score' };
    } else {
      return { decision: 'approve', reason: 'Low fraud score' };
    }
  }
}

module.exports = new SiftService();
```

**Documentation**: https://sift.com/developers/docs

---

### 16. Signifyd

**Purpose**: Chargeback protection and fraud prevention

**Setup**:
```bash
npm install axios
```

**Configuration**:
```javascript
// services/fraud/signifyd.service.js
const axios = require('axios');

class SignifydService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.signifyd.com/v2',
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        username: process.env.SIGNIFYD_API_KEY,
        password: ''
      }
    });
  }

  async createCase(orderData) {
    const response = await this.client.post('/cases', {
      purchase: {
        browserIpAddress: orderData.ipAddress,
        orderId: orderData.orderId,
        createdAt: orderData.createdAt,
        totalPrice: orderData.totalPrice,
        products: orderData.items,
        shipments: [{
          shipper: orderData.shipment.carrier,
          shippingMethod: orderData.shipment.method,
          shippingPrice: orderData.shipment.cost,
          destination: orderData.shippingAddress
        }]
      },
      card: orderData.paymentMethod,
      userAccount: {
        email: orderData.customer.email,
        username: orderData.customer.username,
        accountNumber: orderData.customer.id
      }
    });

    return response.data;
  }

  async getDecision(caseId) {
    const response = await this.client.get(`/cases/${caseId}`);
    return response.data;
  }
}

module.exports = new SignifydService();
```

**Documentation**: https://www.signifyd.com/resources/api/

---

## Additional Integrations

For brevity, here are quick references for remaining integrations:

### Marketing Automation

**17. Mailchimp** - Email marketing lists and campaigns
**18. Klaviyo** - E-commerce email and SMS marketing

### Cloud Storage & CDN

**19. AWS S3** - Object storage for product images
**20. Cloudflare** - CDN and DDoS protection

### Search

**21. Algolia** - Hosted search (alternative to Elasticsearch)

### Monitoring

**22. Sentry** - Error tracking and monitoring
**23. Datadog** - Infrastructure and application monitoring
**24. New Relic** - Application performance monitoring

### CRM

**25. Salesforce** - Customer relationship management

### Social & Marketing

**26. Facebook Pixel** - Ad tracking and retargeting
**27. Google Tag Manager** - Tag management system

---

## Integration Best Practices

### 1. API Key Management
- Store all API keys in environment variables
- Never commit keys to version control
- Rotate keys regularly
- Use different keys for development/staging/production

### 2. Error Handling
```javascript
async function callThirdPartyAPI(apiFunction, ...args) {
  try {
    return await apiFunction(...args);
  } catch (error) {
    // Log error
    logger.error('Third-party API error:', {
      service: error.config?.baseURL,
      error: error.message,
      response: error.response?.data
    });

    // Implement retry logic
    if (error.response?.status >= 500) {
      // Retry on server errors
      return await retry(apiFunction, args, 3);
    }

    // Fallback or throw
    throw new Error('Third-party service unavailable');
  }
}
```

### 3. Rate Limiting
```javascript
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
  minTime: 100, // Min time between requests
  maxConcurrent: 5 // Max concurrent requests
});

const wrappedAPI = limiter.wrap(originalAPIFunction);
```

### 4. Webhook Security
```javascript
function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hash)
  );
}
```

### 5. Monitoring
- Track API response times
- Monitor error rates
- Set up alerts for failures
- Log all API interactions

---

## Testing Integrations

### Sandbox Environments
All payment and shipping providers offer sandbox environments for testing.

### Webhook Testing
Use tools like:
- **ngrok**: Expose local server to internet
- **Webhook.site**: Inspect webhook payloads
- **Stripe CLI**: Test Stripe webhooks locally

### Load Testing
Test third-party integrations under load:
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:4000/api/v1/products

# Using k6
k6 run load-test.js
```

---

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify key is correctly set in environment
   - Check if key has expired
   - Ensure correct environment (test vs production)

2. **Rate Limit Exceeded**
   - Implement exponential backoff
   - Cache responses where possible
   - Upgrade to higher tier if needed

3. **Webhook Not Received**
   - Check firewall rules
   - Verify webhook URL is publicly accessible
   - Inspect webhook logs in provider dashboard

4. **Timeout Errors**
   - Increase timeout settings
   - Implement async processing
   - Use queue for long-running operations

---

## Cost Optimization

### Tips to Reduce Integration Costs

1. **Cache Aggressively**: Cache translation and tax calculations
2. **Batch Operations**: Group API calls when possible
3. **Use Webhooks**: Instead of polling APIs
4. **Monitor Usage**: Set up billing alerts
5. **Optimize Queries**: Use filters to reduce data transfer
6. **Choose Right Tier**: Don't over-provision

---

## Support & Resources

For integration support:
1. Check provider documentation
2. Search Stack Overflow
3. Contact provider support
4. Review GitHub issues
5. Join community forums

---

**Last Updated**: 2025-10-26
**Maintainer**: Platform Team
**Questions**: integrations@globalcommerce.com
