# Broxiva Shipping & Tracking Updates Workflow

## Overview

This n8n workflow automates shipping tracking updates and customer notifications for Broxiva orders. It monitors shipments across multiple carriers (FedEx, UPS, USPS, DHL), sends milestone notifications via multiple channels (Email, SMS, WhatsApp), and handles exceptions proactively.

## Features

### Core Functionality
- **Dual Trigger System**: Webhook (real-time) + Scheduled polling (every 2 hours)
- **Multi-Carrier Support**: FedEx, UPS, USPS, DHL
- **Milestone Tracking**: Shipped, In Transit, Out for Delivery, Delivered, Exceptions
- **Exception Handling**: Delays, delivery failures, lost packages
- **Multi-Channel Notifications**: Email (SendGrid), SMS (Twilio), WhatsApp (Twilio)
- **Automated Order Updates**: Real-time status sync with Broxiva API
- **Performance Analytics**: Carrier performance tracking via Mixpanel

### Milestone Notifications

#### 1. Shipped
- **Trigger**: Package leaves warehouse
- **Content**: Tracking link, estimated delivery, carrier info
- **Channels**: Email, SMS, WhatsApp (based on preferences)

#### 2. In Transit
- **Trigger**: Package in transit
- **Content**: Estimated delivery date, tracking link
- **Channels**: Email, SMS, WhatsApp

#### 3. Out for Delivery
- **Trigger**: Package out for delivery
- **Content**: "Arriving today!" message, delivery address
- **Channels**: Email, SMS, WhatsApp

#### 4. Delivered
- **Trigger**: Package delivered
- **Content**: Confirmation, review request teaser with link
- **Channels**: Email, SMS, WhatsApp

#### 5. Exception/Delay
- **Trigger**: Shipping exception or delay
- **Action**:
  - If delayed >2 days: Generate 10% discount code, send apology
  - Otherwise: Send proactive apology + support offer
- **Channels**: Email, SMS, WhatsApp

#### 6. Delivery Failed
- **Trigger**: Delivery attempt failed
- **Content**: Rescheduling options, carrier contact info
- **Channels**: Email, SMS, WhatsApp

#### 7. Lost Package
- **Trigger**: Package marked as lost
- **Actions**:
  - Create Zendesk escalation ticket (urgent priority)
  - Trigger automatic replacement order with expedited shipping
  - Send customer notification with replacement order details
- **Channels**: Email, SMS, WhatsApp

## Carrier Configuration Guide

### Prerequisites

Before configuring carriers, ensure you have:

1. **ShipStation Account**: Active account with API credentials
2. **Carrier Accounts**: Active accounts with FedEx, UPS, USPS, and/or DHL
3. **n8n Instance**: Running n8n instance (self-hosted or cloud)
4. **API Credentials**: All required service credentials (see below)

### Required Credentials

#### 1. ShipStation API Credentials

**Setup Steps:**
1. Log in to ShipStation: https://ship.station.com
2. Navigate to **Settings** → **Account** → **API Settings**
3. Generate API Key and API Secret
4. Note your API credentials

**n8n Configuration:**
- **Credential Type**: HTTP Basic Auth
- **Credential Name**: `shipstation-api`
- **Username**: Your ShipStation API Key
- **Password**: Your ShipStation API Secret

#### 2. Broxiva API Credentials

**Setup Steps:**
1. Access Broxiva admin panel
2. Navigate to **Settings** → **API Keys**
3. Generate new API key with permissions:
   - `orders:read`
   - `orders:write`
   - `coupons:write`
4. Copy API key

**n8n Configuration:**
- **Credential Type**: Custom API Auth
- **Credential Name**: `broxiva-api`
- **Authentication**: Bearer Token
- **Token**: Your Broxiva API Key

#### 3. SendGrid API Credentials

**Setup Steps:**
1. Log in to SendGrid: https://app.sendgrid.com
2. Navigate to **Settings** → **API Keys**
3. Create new API key with **Full Access** or **Mail Send** permissions
4. Copy API key (shown only once)

**n8n Configuration:**
- **Credential Type**: SendGrid API
- **Credential Name**: `sendgrid-api`
- **API Key**: Your SendGrid API Key

**Email Template Setup:**
1. Create email templates in SendGrid for each milestone:
   - `shipped`
   - `in_transit`
   - `out_for_delivery`
   - `delivered`
   - `delayed_apology`
   - `delivery_failed`
   - `exception`
   - `lost_package`

2. Use dynamic template variables (see Template Variables section below)

#### 4. Twilio API Credentials

**Setup Steps:**
1. Log in to Twilio: https://console.twilio.com
2. Navigate to **Account** → **API keys & tokens**
3. Note your Account SID and Auth Token
4. Purchase phone number for SMS: **Phone Numbers** → **Buy a number**
5. Enable WhatsApp (if needed): **Messaging** → **Try it out** → **Send a WhatsApp message**

**n8n Configuration:**
- **Credential Type**: Twilio API
- **Credential Name**: `twilio-api`
- **Account SID**: Your Twilio Account SID
- **Auth Token**: Your Twilio Auth Token

**Phone Number Configuration:**
- **SMS From Number**: `+1234567890` (replace with your Twilio number)
- **WhatsApp From Number**: `whatsapp:+1234567890` (replace with your Twilio WhatsApp number)

#### 5. Zendesk API Credentials

**Setup Steps:**
1. Log in to Zendesk
2. Navigate to **Admin** → **Apps and integrations** → **APIs** → **Zendesk API**
3. Enable token access
4. Create new API token
5. Note your subdomain, email, and token

**n8n Configuration:**
- **Credential Type**: Custom API Auth
- **Credential Name**: `zendesk-api`
- **Authentication**: Basic Auth
- **Username**: `{your-email}/token`
- **Password**: Your Zendesk API Token

#### 6. Mixpanel API Credentials

**Setup Steps:**
1. Log in to Mixpanel: https://mixpanel.com
2. Navigate to **Project Settings** → **Project token**
3. Copy project token

**n8n Configuration:**
- **Credential Type**: Custom API Auth
- **Credential Name**: `mixpanel-api`
- **Authentication**: Custom Header
- **Header Name**: `Authorization`
- **Header Value**: Your Mixpanel Project Token

### Carrier-Specific Configuration

#### FedEx

**ShipStation Setup:**
1. In ShipStation, go to **Settings** → **Carriers**
2. Click **Connect Carrier** → **FedEx**
3. Enter your FedEx account credentials:
   - Account Number
   - Meter Number
   - Key
   - Password
4. Complete authentication

**Tracking URL Format:**
```
https://www.fedex.com/fedextrack/?tracknumbers={trackingNumber}
```

**Webhook Events:**
- `shipment.created`
- `shipment.shipped`
- `shipment.in_transit`
- `shipment.out_for_delivery`
- `shipment.delivered`
- `shipment.exception`

#### UPS

**ShipStation Setup:**
1. In ShipStation, go to **Settings** → **Carriers**
2. Click **Connect Carrier** → **UPS**
3. Enter your UPS account credentials:
   - Account Number
   - UPS Username
   - UPS Password
   - Access License Number
4. Complete authentication

**Tracking URL Format:**
```
https://www.ups.com/track?tracknum={trackingNumber}
```

**Webhook Events:**
- `shipment.created`
- `shipment.shipped`
- `shipment.in_transit`
- `shipment.out_for_delivery`
- `shipment.delivered`
- `shipment.exception`

#### USPS

**ShipStation Setup:**
1. In ShipStation, go to **Settings** → **Carriers**
2. Click **Connect Carrier** → **USPS**
3. Enter your USPS credentials:
   - User ID
   - Password (or API key for Click-N-Ship)
4. Complete authentication

**Tracking URL Format:**
```
https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}
```

**Webhook Events:**
- `shipment.created`
- `shipment.shipped`
- `shipment.in_transit`
- `shipment.out_for_delivery`
- `shipment.delivered`
- `shipment.exception`

#### DHL

**ShipStation Setup:**
1. In ShipStation, go to **Settings** → **Carriers**
2. Click **Connect Carrier** → **DHL Express**
3. Enter your DHL account credentials:
   - Account Number
   - Site ID
   - Password
4. Complete authentication

**Tracking URL Format:**
```
https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}
```

**Webhook Events:**
- `shipment.created`
- `shipment.shipped`
- `shipment.in_transit`
- `shipment.out_for_delivery`
- `shipment.delivered`
- `shipment.exception`

### Webhook Configuration

#### ShipStation Webhook Setup

1. **Get Webhook URL from n8n:**
   - Open the workflow in n8n
   - Click on the "ShipStation Webhook" node
   - Copy the webhook URL (e.g., `https://your-n8n-instance.com/webhook/shipstation-tracking`)

2. **Configure in ShipStation:**
   - Log in to ShipStation
   - Navigate to **Settings** → **Integrations** → **Webhooks**
   - Click **Add Webhook**
   - **Webhook URL**: Paste your n8n webhook URL
   - **Event Type**: Select all relevant events:
     - `SHIP_NOTIFY` (when label is created)
     - `ITEM_SHIP_NOTIFY` (when item ships)
     - `ORDER_NOTIFY` (order updates)
   - **Secret**: Generate a secret (optional but recommended)
   - Click **Save Webhook**

3. **Test Webhook:**
   - Click **Send Test Notification** in ShipStation
   - Verify the webhook is received in n8n (check workflow executions)

#### Webhook Security (Optional)

To secure your webhook:

1. Generate a secret in ShipStation
2. Add signature validation node in n8n:
   ```javascript
   // Add this as a Function node after webhook
   const crypto = require('crypto');
   const secret = 'your-shipstation-secret';
   const signature = $node["ShipStation Webhook"].json.headers['x-shipstation-signature'];
   const payload = JSON.stringify($node["ShipStation Webhook"].json.body);

   const hash = crypto
     .createHmac('sha256', secret)
     .update(payload)
     .digest('hex');

   if (hash !== signature) {
     throw new Error('Invalid signature');
   }

   return $input.all();
   ```

### Carrier Status Mapping

The workflow maps carrier-specific statuses to unified milestones:

| Milestone | FedEx Status | UPS Status | USPS Status | DHL Status |
|-----------|--------------|------------|-------------|------------|
| Shipped | PU (Picked up), DP (Departed) | M (Shipper created), P (Picked up) | Accepted, Pre-Shipment | PU (Picked up) |
| In Transit | IT (In transit), AR (Arrived) | I (In transit) | In Transit | WC (With courier) |
| Out for Delivery | OD (Out for delivery) | OT (Out for delivery) | Out for Delivery | WC (With courier for delivery) |
| Delivered | DL (Delivered) | D (Delivered) | Delivered | OK (Delivered) |
| Exception | DE (Delivery exception), CA (Canceled) | X (Exception) | Alert, Notice Left | NH (Not home), RD (Refused) |

### Template Variables

Use these variables in your email templates:

#### Shipped Template Variables
```javascript
{
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  estimatedDelivery: string (ISO date),
  items: Array<{name, quantity, price}>,
  supportUrl: string
}
```

#### In Transit Template Variables
```javascript
{
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  estimatedDelivery: string (ISO date),
  estimatedDeliveryFormatted: string,
  supportUrl: string
}
```

#### Out for Delivery Template Variables
```javascript
{
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  deliveryAddress: {street, city, state, zip},
  supportUrl: string
}
```

#### Delivered Template Variables
```javascript
{
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  deliveredDate: string,
  deliveryAddress: {street, city, state, zip},
  reviewUrl: string,
  reviewTeaser: string,
  supportUrl: string
}
```

#### Delayed Apology Template Variables
```javascript
{
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  delayDays: number,
  newEstimatedDelivery: string,
  discountCode: string,
  discountAmount: string,
  supportUrl: string,
  contactEmail: string
}
```

#### Delivery Failed Template Variables
```javascript
{
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  trackingUrl: string,
  carrier: string,
  attemptDate: string,
  rescheduleUrl: string,
  deliveryAddress: {street, city, state, zip},
  supportUrl: string,
  contactEmail: string
}
```

#### Lost Package Template Variables
```javascript
{
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  carrier: string,
  replacementOrderNumber: string,
  zendeskTicketId: string,
  estimatedReplacementDate: string,
  supportUrl: string,
  contactEmail: string
}
```

## Installation

### Step 1: Import Workflow

1. Open n8n
2. Click **Workflows** → **Import from file**
3. Select `workflow-07-shipping-tracking.json`
4. Click **Import**

### Step 2: Configure Credentials

Follow the credential setup instructions above for:
- ShipStation API
- Broxiva API
- SendGrid API
- Twilio API
- Zendesk API
- Mixpanel API

### Step 3: Configure Webhook

1. Copy webhook URL from "ShipStation Webhook" node
2. Configure webhook in ShipStation (see Webhook Configuration above)

### Step 4: Update Phone Numbers

Replace placeholder phone numbers with your actual Twilio numbers:

**Nodes to Update:**
- "Send SMS via Twilio": Update `fromPhoneNumber` parameter
- "Send WhatsApp via Twilio": Update `fromPhoneNumber` parameter

### Step 5: Test Workflow

1. **Test Webhook:**
   - Send test notification from ShipStation
   - Check n8n workflow executions

2. **Test Polling:**
   - Manually execute "Schedule Polling (Every 2 Hours)" node
   - Verify it fetches recent shipments

3. **Test Notifications:**
   - Create a test order in Broxiva
   - Ship the order via ShipStation
   - Verify notifications are sent

### Step 6: Activate Workflow

1. Click **Active** toggle in top right
2. Monitor executions in n8n

## API Endpoints

### Broxiva API

The workflow interacts with these Broxiva endpoints:

#### Get Order Details
```
GET /v1/orders/{orderNumber}
```

**Response:**
```json
{
  "id": "ORD-12345",
  "orderNumber": "12345",
  "status": "processing",
  "customer": {
    "id": "CUST-001",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "whatsappNumber": "+1234567890",
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": true,
      "whatsappNotifications": false
    }
  },
  "items": [
    {
      "id": "ITEM-001",
      "name": "Product Name",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  }
}
```

#### Update Order Status
```
PATCH /v1/orders/{orderNumber}
```

**Request Body:**
```json
{
  "status": "shipped",
  "trackingInfo": {
    "trackingNumber": "1Z999AA10123456784",
    "carrier": "UPS",
    "trackingUrl": "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    "lastUpdate": "2025-12-03T10:30:00Z",
    "estimatedDelivery": "2025-12-05T17:00:00Z"
  },
  "shipmentHistory": [
    {
      "status": "shipped",
      "timestamp": "2025-12-03T10:30:00Z",
      "location": "New York, NY"
    }
  ]
}
```

#### Generate Coupon
```
POST /v1/coupons/generate
```

**Request Body:**
```json
{
  "code": "DELAY12345",
  "discountType": "percentage",
  "discountValue": 10,
  "expiresIn": 30,
  "customerId": "CUST-001",
  "reason": "shipping_delay_apology",
  "maxUses": 1
}
```

**Response:**
```json
{
  "id": "COUPON-001",
  "code": "DELAY12345",
  "discountType": "percentage",
  "discountValue": 10,
  "expiresAt": "2026-01-02T10:30:00Z",
  "customerId": "CUST-001"
}
```

#### Trigger Replacement Order
```
POST /v1/orders/replacement
```

**Request Body:**
```json
{
  "originalOrderId": "ORD-12345",
  "reason": "lost_package",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "priority": "high",
  "expeditedShipping": true,
  "zendeskTicketId": "12345"
}
```

**Response:**
```json
{
  "replacementOrderId": "ORD-12346",
  "originalOrderId": "ORD-12345",
  "status": "processing",
  "expeditedShipping": true,
  "estimatedDelivery": "2025-12-06T17:00:00Z"
}
```

### ShipStation API

#### Get Shipments
```
GET https://ssapi.shipstation.com/shipments
```

**Query Parameters:**
- `modifyDateStart`: ISO date (e.g., `2025-12-03T08:00:00Z`)
- `modifyDateEnd`: ISO date (e.g., `2025-12-03T10:00:00Z`)
- `pageSize`: Number (max 500)

**Response:**
```json
{
  "shipments": [
    {
      "shipmentId": 123456,
      "orderId": 789012,
      "orderNumber": "12345",
      "trackingNumber": "1Z999AA10123456784",
      "carrierCode": "ups",
      "shipmentStatus": "shipped",
      "shipDate": "2025-12-03T10:00:00Z",
      "modifyDate": "2025-12-03T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

#### Get Tracking Details
```
GET https://ssapi.shipstation.com/shipments/{trackingNumber}/tracking
```

**Response:**
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "status": "in_transit",
  "currentLocation": "Philadelphia, PA",
  "estimatedDeliveryDate": "2025-12-05T17:00:00Z",
  "originalEstimatedDeliveryDate": "2025-12-04T17:00:00Z",
  "events": [
    {
      "timestamp": "2025-12-03T10:30:00Z",
      "status": "departed",
      "location": "New York, NY",
      "description": "Package departed facility"
    }
  ]
}
```

## Monitoring & Analytics

### Mixpanel Events

The workflow tracks these events in Mixpanel:

#### Shipping Milestone Event
```json
{
  "event": "Shipping Milestone",
  "properties": {
    "distinct_id": "CUST-001",
    "order_id": "ORD-12345",
    "tracking_number": "1Z999AA10123456784",
    "carrier": "UPS",
    "milestone": "shipped",
    "timestamp": "2025-12-03T10:30:00Z",
    "estimated_delivery": "2025-12-05T17:00:00Z",
    "delay_days": 0,
    "is_exception": false,
    "is_delayed": false,
    "notification_sent_email": true,
    "notification_sent_sms": true,
    "notification_sent_whatsapp": false
  }
}
```

### Key Metrics to Track

1. **Carrier Performance:**
   - Average delivery time by carrier
   - Exception rate by carrier
   - On-time delivery rate by carrier

2. **Customer Engagement:**
   - Notification open rates
   - Tracking link click rates
   - Review completion rate after delivery

3. **Exception Management:**
   - Exception resolution time
   - Replacement order processing time
   - Customer satisfaction after exception

4. **Notification Preferences:**
   - Email vs SMS vs WhatsApp adoption
   - Opt-out rates by channel
   - Response rates by channel

## Troubleshooting

### Webhook Not Receiving Data

**Issue**: ShipStation webhook not triggering workflow

**Solutions:**
1. Verify webhook URL is correct in ShipStation
2. Check webhook is active in ShipStation
3. Ensure n8n instance is publicly accessible
4. Check firewall rules
5. Send test notification from ShipStation
6. Review n8n execution logs

### Unsupported Carrier

**Issue**: Carrier not recognized by workflow

**Solutions:**
1. Verify carrier is one of: FedEx, UPS, USPS, DHL
2. Check carrier code format in ShipStation
3. Add new carrier to "Validate Carrier" node conditions
4. Update "Determine Milestone & Tracking URL" node with new carrier tracking URL

### Notifications Not Sending

**Issue**: Customers not receiving notifications

**Solutions:**
1. Verify customer preferences in Broxiva:
   ```javascript
   customer.preferences.emailNotifications === true
   customer.preferences.smsNotifications === true
   customer.preferences.whatsappNotifications === true
   ```
2. Check SendGrid API key is valid
3. Verify Twilio credentials and phone numbers
4. Review SendGrid/Twilio delivery logs
5. Check spam/junk folders for email
6. Verify customer contact information is valid

### Order Status Not Updating

**Issue**: Order status not syncing with Broxiva

**Solutions:**
1. Verify Broxiva API credentials
2. Check API endpoint URL is correct
3. Review Broxiva API logs for errors
4. Ensure order exists in Broxiva
5. Verify API key has `orders:write` permission

### Polling Not Fetching Data

**Issue**: Scheduled polling not retrieving shipments

**Solutions:**
1. Verify ShipStation API credentials
2. Check polling schedule is active
3. Ensure time range is correct (last 2 hours)
4. Review ShipStation API rate limits
5. Check for API errors in n8n logs

### Lost Package Flow Not Triggered

**Issue**: Lost package detection not working

**Solutions:**
1. Verify exception type detection logic in "Determine Milestone & Tracking URL" node
2. Check carrier status mapping for "lost" packages
3. Ensure Zendesk API credentials are valid
4. Verify Broxiva replacement order endpoint is working
5. Review workflow execution logs

## Best Practices

### 1. Carrier Configuration

- **Test each carrier individually** before going live
- **Monitor carrier performance** regularly via Mixpanel
- **Keep carrier credentials up to date** and secure
- **Set up alerts** for carrier API failures

### 2. Notification Management

- **Respect customer preferences** - never override opt-outs
- **Test all notification channels** before deployment
- **Use clear, concise messaging** in SMS/WhatsApp
- **Include unsubscribe links** in all email notifications
- **Monitor delivery rates** and adjust as needed

### 3. Exception Handling

- **Respond quickly** to exceptions (within 1 hour)
- **Escalate lost packages immediately** to Zendesk
- **Track exception resolution time** and optimize
- **Follow up with customers** after exception resolution

### 4. Performance Optimization

- **Use webhook for real-time updates** (primary)
- **Use polling as backup** (every 2 hours)
- **Batch process polling data** to reduce API calls
- **Cache order details** when possible
- **Monitor n8n execution time** and optimize bottlenecks

### 5. Security

- **Secure all API credentials** in n8n credential store
- **Use webhook signature validation** for ShipStation
- **Rotate API keys regularly** (every 90 days)
- **Monitor for suspicious activity** in logs
- **Limit API key permissions** to minimum required

### 6. Compliance

- **Honor opt-out requests** immediately
- **Maintain audit trail** of all notifications sent
- **Comply with TCPA** (Telephone Consumer Protection Act) for SMS
- **Follow GDPR** requirements for customer data
- **Document data retention policies**

## Support

For issues or questions:

- **n8n Documentation**: https://docs.n8n.io
- **ShipStation API**: https://www.shipstation.com/docs/api/
- **SendGrid Support**: https://support.sendgrid.com
- **Twilio Support**: https://support.twilio.com
- **Broxiva Support**: support@broxiva.com

## Version History

- **v1.0.0** (2025-12-03): Initial release
  - Dual trigger system (webhook + polling)
  - Multi-carrier support (FedEx, UPS, USPS, DHL)
  - Multi-channel notifications (Email, SMS, WhatsApp)
  - Exception handling with automated resolution
  - Lost package detection and replacement
  - Carrier performance tracking

## License

Copyright (c) 2025 Broxiva. All rights reserved.
