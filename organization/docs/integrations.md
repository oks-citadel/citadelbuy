# Product Integration Guide

This guide covers how to set up and use the product integration connectors in Broxiva Global Marketplace.

## Supported Platforms

| Platform | Authentication | Features |
|----------|---------------|----------|
| Shopify | OAuth / Access Token | Products, Variants, Inventory, Webhooks, GraphQL |
| WooCommerce | Consumer Key/Secret | Products, Variants, Inventory, Webhooks |
| REST API | API Key / Bearer / Basic / OAuth2 | Custom field mapping, Polling |
| CSV | File Upload / S3 / URL | Validation, Batch processing |

## Quick Start

### 1. Create a Connector

```bash
POST /api/v1/connectors
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "SHOPIFY",
  "name": "My Shopify Store",
  "credentials": {
    "shopDomain": "my-store.myshopify.com",
    "accessToken": "shpat_xxxxx"
  },
  "settings": {
    "useGraphQL": true,
    "syncInventory": true,
    "webhooksEnabled": true
  }
}
```

### 2. Test Connection

```bash
POST /api/v1/connectors/:id/test
```

### 3. Trigger Sync

```bash
POST /api/v1/connectors/:id/sync
Content-Type: application/json

{
  "type": "FULL"
}
```

### 4. Monitor Progress

```bash
GET /api/v1/connectors/:id/sync/status
```

---

## Shopify Integration

### Setup

1. **Create a Shopify App** in your Shopify Partner dashboard
2. **Generate Access Token** with the following scopes:
   - `read_products`
   - `read_inventory`
   - `read_locations`
3. **Configure Webhooks** in the connector settings

### Authentication Options

#### Option 1: Private App (Access Token)
```json
{
  "credentials": {
    "shopDomain": "my-store.myshopify.com",
    "accessToken": "shpat_xxxxxxxxxxxxxxxxxxxxx"
  }
}
```

#### Option 2: Custom App (OAuth)
```json
{
  "credentials": {
    "shopDomain": "my-store.myshopify.com",
    "apiKey": "your-api-key",
    "apiSecretKey": "your-api-secret"
  }
}
```

### Data Mapping

| Shopify Field | Broxiva Field | Notes |
|--------------|---------------|-------|
| `id` | `externalId` | Unique product identifier |
| `title` | `name` | Product name |
| `body_html` | `description` | HTML description |
| `variants[0].price` | `price` | Base price |
| `variants[0].compare_at_price` | `compareAtPrice` | Original price |
| `variants[0].sku` | `sku` | Stock keeping unit |
| `images[].src` | `images` | Product images array |
| `tags` | `categories` | Comma-separated tags |
| `variants` | `variants` | Product variants |
| `status` | `status` | active/draft/archived |
| `vendor` | `vendor` | Vendor name |
| `product_type` | `metadata.productType` | Product type |
| `handle` | `seo.slug` | URL slug |

### Webhooks

The connector automatically registers webhooks for:
- `products/create` - New product added
- `products/update` - Product modified
- `products/delete` - Product removed
- `inventory_levels/update` - Inventory changed

Webhook URL: `https://your-domain.com/api/v1/webhooks/shopify/products`

### Rate Limits

- REST API: 2 requests/second
- GraphQL: 50 cost points/second

The connector automatically handles rate limiting with exponential backoff.

---

## WooCommerce Integration

### Setup

1. **Enable REST API** in WooCommerce settings
2. **Generate API Keys**:
   - Go to WooCommerce > Settings > Advanced > REST API
   - Add new key with Read permissions
3. **Configure Connector** with consumer key and secret

### Configuration

```json
{
  "type": "WOOCOMMERCE",
  "name": "My WooCommerce Store",
  "credentials": {
    "siteUrl": "https://my-store.com",
    "consumerKey": "ck_xxxxxxxxxxxxxxxxxxxx",
    "consumerSecret": "cs_xxxxxxxxxxxxxxxxxxxx"
  },
  "settings": {
    "syncInventory": true,
    "syncImages": true,
    "webhooksEnabled": true,
    "apiVersion": "wc/v3"
  }
}
```

### Data Mapping

| WooCommerce Field | Broxiva Field | Notes |
|-------------------|---------------|-------|
| `id` | `externalId` | Product ID |
| `name` | `name` | Product name |
| `description` | `description` | Full description |
| `short_description` | `shortDescription` | Brief description |
| `price` | `price` | Current price |
| `regular_price` | `compareAtPrice` | Original price |
| `sku` | `sku` | SKU |
| `images[].src` | `images` | Image URLs |
| `categories[].name` | `categories` | Category names |
| `tags[].name` | `tags` | Tag names |
| `stock_quantity` | `inventory.quantity` | Stock level |
| `manage_stock` | `inventory.trackInventory` | Inventory tracking |
| `status` | `status` | publish/draft/pending |
| `type` | `metadata.type` | simple/variable/grouped |
| `variations` | `variants` | Product variations |

### Webhooks

Register webhooks in WooCommerce > Settings > Advanced > Webhooks:
- Topic: `product.created` / `product.updated` / `product.deleted`
- Delivery URL: `https://your-domain.com/api/v1/webhooks/woocommerce/products`
- Status: Active

---

## REST API Integration

Connect to any REST API with custom field mapping.

### Configuration

```json
{
  "type": "REST_API",
  "name": "Custom Product API",
  "credentials": {
    "baseUrl": "https://api.example.com",
    "authType": "bearer",
    "bearerToken": "your-token"
  },
  "settings": {
    "productsEndpoint": "/products",
    "singleProductEndpoint": "/products/{id}",
    "fieldMapping": {
      "externalId": "$.id",
      "name": "$.title",
      "description": "$.description",
      "price": "$.pricing.amount",
      "currency": "$.pricing.currency",
      "images": "$.media[*].url",
      "categories": "$.category.name",
      "quantity": "$.stock.available"
    },
    "pagination": {
      "type": "offset",
      "limitParam": "limit",
      "offsetParam": "offset"
    },
    "pollingInterval": 60
  }
}
```

### Authentication Options

#### API Key
```json
{
  "authType": "api_key",
  "apiKey": "your-api-key",
  "apiKeyHeader": "X-API-Key"
}
```

#### Bearer Token
```json
{
  "authType": "bearer",
  "bearerToken": "your-bearer-token"
}
```

#### Basic Auth
```json
{
  "authType": "basic",
  "basicUsername": "user",
  "basicPassword": "password"
}
```

#### OAuth2
```json
{
  "authType": "oauth2",
  "oauth2Config": {
    "tokenUrl": "https://auth.example.com/token",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "scope": "read:products"
  }
}
```

### Field Mapping with JSONPath

Use JSONPath syntax to extract data from API responses:

| JSONPath | Description |
|----------|-------------|
| `$.id` | Root-level field |
| `$.product.name` | Nested field |
| `$.images[0].url` | First array element |
| `$.images[*].url` | All array elements |
| `$.data.items[*]` | Array of items |

### Pagination Types

- **Offset**: `?limit=50&offset=100`
- **Page**: `?limit=50&page=3`
- **Cursor**: `?limit=50&cursor=abc123`
- **Link Header**: Uses `Link` header for next page URL

---

## CSV Import

Import products from CSV files with validation.

### Configuration

```json
{
  "type": "CSV",
  "name": "CSV Import",
  "credentials": {
    "storageType": "local"
  },
  "settings": {
    "delimiter": ",",
    "hasHeader": true,
    "encoding": "utf-8",
    "fieldMapping": {
      "externalId": "product_id",
      "name": "product_name",
      "description": "description",
      "price": "price",
      "quantity": "stock",
      "images": "image_urls",
      "categories": "category"
    },
    "validationRules": [
      { "field": "product_id", "type": "required" },
      { "field": "product_name", "type": "required" },
      { "field": "price", "type": "required" },
      { "field": "price", "type": "numeric" }
    ]
  }
}
```

### CSV Format Example

```csv
product_id,product_name,description,price,stock,image_urls,category
SKU001,Widget A,A great widget,29.99,100,https://cdn.example.com/widget-a.jpg,Electronics
SKU002,Widget B,Another widget,39.99,50,"https://cdn.example.com/b1.jpg,https://cdn.example.com/b2.jpg",Electronics
```

### Upload CSV

```bash
POST /api/v1/connectors/:id/csv/upload
Content-Type: multipart/form-data

file: <your-file.csv>
```

### Storage Options

#### Local Upload
Upload directly via API endpoint.

#### S3 Integration
```json
{
  "storageType": "s3",
  "s3Bucket": "my-bucket",
  "s3Region": "us-east-1",
  "s3AccessKey": "AKIAXXXXXXXX",
  "s3SecretKey": "xxxxxxxxxxxxxxxx"
}
```

#### URL Import
```json
{
  "storageType": "url",
  "fileUrl": "https://example.com/products.csv"
}
```

### Validation Rules

| Type | Description | Example |
|------|-------------|---------|
| `required` | Field must have value | - |
| `numeric` | Must be a number | - |
| `min_value` | Minimum numeric value | `"value": 0` |
| `max_value` | Maximum numeric value | `"value": 99999` |
| `min_length` | Minimum string length | `"value": 3` |
| `max_length` | Maximum string length | `"value": 255` |
| `regex` | Match regular expression | `"value": "^[A-Z]{3}\\d{3}$"` |
| `enum` | Value must be in list | `"value": ["active", "draft"]` |
| `unique` | Value must be unique in file | - |
| `url` | Valid URL format | - |
| `email` | Valid email format | - |

---

## Sync Types

### Full Sync
Imports all products from source, updates existing, creates new, marks missing as deleted.

```json
{
  "type": "FULL"
}
```

### Delta Sync
Only syncs products modified since last sync.

```json
{
  "type": "DELTA",
  "since": "2024-01-01T00:00:00Z"
}
```

### Manual Sync
Sync specific products by ID.

```json
{
  "type": "MANUAL",
  "externalIds": ["123", "456", "789"]
}
```

### Webhook Sync
Triggered automatically by incoming webhooks.

### Scheduled Sync
Connectors automatically sync hourly (configurable).

---

## Error Handling

### Sync Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `CONNECTION_FAILED` | Cannot connect to source | Check credentials and URL |
| `AUTH_FAILED` | Authentication failed | Verify API keys/tokens |
| `RATE_LIMITED` | Too many requests | Wait and retry |
| `VALIDATION_ERROR` | Product data invalid | Check field mapping |
| `SYNC_FAILED` | General sync failure | Check error details |

### Webhook Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INVALID_SIGNATURE` | HMAC verification failed | Check webhook secret |
| `MISSING_HEADERS` | Required headers missing | Verify webhook source |
| `CONNECTOR_NOT_FOUND` | No matching connector | Configure connector |

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/connectors` | Create connector |
| `GET` | `/api/v1/connectors` | List connectors |
| `GET` | `/api/v1/connectors/:id` | Get connector |
| `PUT` | `/api/v1/connectors/:id` | Update connector |
| `DELETE` | `/api/v1/connectors/:id` | Delete connector |
| `POST` | `/api/v1/connectors/:id/test` | Test connection |
| `POST` | `/api/v1/connectors/:id/sync` | Trigger sync |
| `GET` | `/api/v1/connectors/:id/sync/status` | Get sync status |
| `GET` | `/api/v1/connectors/:id/sync/history` | Get sync history |
| `POST` | `/api/v1/connectors/:id/sync/cancel` | Cancel sync |
| `GET` | `/api/v1/connectors/:id/products` | List imported products |
| `POST` | `/api/v1/connectors/:id/csv/upload` | Upload CSV file |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/webhooks/shopify/products` | Shopify product webhooks |
| `POST` | `/api/v1/webhooks/woocommerce/products` | WooCommerce product webhooks |

---

## Best Practices

1. **Test Before Sync**: Always test connection before triggering full sync
2. **Start Small**: Use delta sync for initial testing
3. **Monitor Progress**: Watch sync status for large catalogs
4. **Handle Errors**: Review error logs and fix mapping issues
5. **Use Webhooks**: Enable real-time updates when available
6. **Secure Credentials**: Store API keys securely, never in code
7. **Rate Limiting**: Respect source API limits
8. **Backup First**: Have a rollback plan for large imports

---

## Troubleshooting

### Connection Issues

1. Verify API credentials are correct
2. Check if source API is accessible
3. Ensure correct API version is configured
4. Verify SSL certificates if using HTTPS

### Mapping Issues

1. Verify JSONPath expressions are correct
2. Check if required fields have values
3. Ensure data types match expected formats
4. Test with a single product first

### Sync Issues

1. Check sync status and error messages
2. Review connector logs
3. Verify webhook signatures
4. Check rate limiting status

---

## Support

For additional help:
- Check the API documentation
- Review error logs in admin panel
- Contact support@broxiva.com
