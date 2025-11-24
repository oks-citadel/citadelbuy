# Advertising & Audience Tracking - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Implementation Guide](#implementation-guide)
5. [Platform-Specific Integrations](#platform-specific-integrations)
6. [Event Tracking Schema](#event-tracking-schema)
7. [Privacy & Compliance](#privacy--compliance)
8. [Monitoring & Optimization](#monitoring--optimization)
9. [Cost Analysis](#cost-analysis)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This documentation outlines the complete technology stack and implementation strategy for advertising features and audience registration tracking across multiple platforms including Meta (Facebook/Instagram), TikTok, Snapchat, Google/YouTube, and Reddit.

### Business Goals
- Track user acquisition from paid advertising campaigns
- Measure registration conversion rates by channel
- Build retargeting audiences for incomplete registrations
- Optimize ad spend based on user lifetime value
- Prevent fraud and improve registration quality

### Key Metrics
- **CPR** (Cost Per Registration)
- **CPA** (Cost Per Acquisition)
- **Registration Completion Rate**
- **Time to First Match/Message**
- **LTV** (Lifetime Value)
- **ROAS** (Return on Ad Spend)

---

## Technology Stack

### Tier 1: Essential (Free - $50/month)

#### 1. Google Tag Manager (GTM)
- **Purpose**: Central tag management system
- **Cost**: Free
- **Implementation**: Client-side JavaScript
- **Use Case**: Deploy and manage all tracking pixels without code deployments

**Key Features:**
- Version control for tags
- Built-in templates for major platforms
- Trigger-based firing
- Debug mode for testing
- User permissions management

#### 2. Google Analytics 4 (GA4)
- **Purpose**: Core web analytics and user behavior tracking
- **Cost**: Free (up to 10M events/month)
- **Implementation**: Via GTM or direct integration
- **Use Case**: Primary analytics platform for all user interactions

**Key Features:**
- Event-based data model
- Cross-platform tracking (web + mobile)
- Machine learning insights
- Conversion path analysis
- Audience building

#### 3. Meta Pixel + Conversions API (CAPI)
- **Purpose**: Facebook/Instagram ad tracking
- **Cost**: Free
- **Implementation**: Client-side pixel + server-side API
- **Use Case**: Track conversions and build custom audiences

**Key Features:**
- Standard events (ViewContent, CompleteRegistration)
- Custom conversions
- iOS 14+ resilience with CAPI
- Dynamic ads support
- Lookalike audiences

#### 4. TikTok Pixel
- **Purpose**: TikTok ad conversion tracking
- **Cost**: Free
- **Implementation**: Via GTM
- **Use Case**: Track TikTok campaign performance

**Key Features:**
- Standard events
- Custom events
- Web Events API (server-side)
- Audience building

#### 5. Google Ads Conversion Tracking
- **Purpose**: Google/YouTube ad performance
- **Cost**: Free
- **Implementation**: Via GTM
- **Use Case**: Track conversions from Google Ads campaigns

**Key Features:**
- Conversion actions
- Enhanced conversions
- Offline conversion imports
- Attribution models

#### 6. reCAPTCHA v3
- **Purpose**: Bot prevention and spam protection
- **Cost**: Free (up to 1M assessments/month)
- **Implementation**: JavaScript SDK + backend verification
- **Use Case**: Protect registration forms from bots

**Key Features:**
- Invisible to users (no challenges)
- Risk score (0.0 - 1.0)
- Action-based analysis
- Enterprise version available

### Tier 2: Growth Stack ($200-$500/month)

#### 7. Segment
- **Purpose**: Customer Data Platform (CDP)
- **Cost**: Free (1K visitors/month), then $120-$500/month
- **Implementation**: Single SDK, routes to all destinations
- **Use Case**: Centralize all tracking, simplify integration

**Key Features:**
- One API for all destinations
- Data quality controls
- Privacy compliance tools
- Real-time event streaming
- Warehouse destinations

#### 8. Mixpanel or Amplitude
- **Purpose**: Advanced product analytics
- **Cost**: Free tier, then $25-$300/month
- **Implementation**: JavaScript SDK + backend SDK
- **Use Case**: Deep event analysis, funnel tracking, cohort analysis

**Key Features:**
- Funnel analysis
- Retention analysis
- User segmentation
- A/B test analytics
- Behavioral cohorts

#### 9. Hotjar
- **Purpose**: User behavior visualization
- **Cost**: Free tier, then $32-$80/month
- **Implementation**: JavaScript snippet
- **Use Case**: Identify registration form issues, optimize UX

**Key Features:**
- Heatmaps
- Session recordings
- Conversion funnels
- Form analysis
- Feedback polls

#### 10. Klaviyo
- **Purpose**: Email marketing and automation
- **Cost**: Free (250 contacts), then $20-$45/month
- **Implementation**: JavaScript SDK + API
- **Use Case**: Retarget incomplete registrations, onboarding emails

**Key Features:**
- Behavioral triggers
- Segmentation
- A/B testing
- Predictive analytics
- SMS integration

### Tier 3: Enterprise Stack ($500-$2000+/month)

#### 11. AppsFlyer (Mobile Attribution)
- **Purpose**: Mobile app install attribution
- **Cost**: Free (10K conversions/month), then custom pricing
- **Implementation**: Mobile SDK (iOS/Android)
- **Use Case**: Track which ads drive app installs and registrations

**Key Features:**
- Deep linking
- Fraud protection
- ROI measurement
- Cohort analysis
- Raw data exports

#### 12. Snowplow Analytics
- **Purpose**: Server-side event tracking, data ownership
- **Cost**: Self-hosted (infrastructure costs) or $500+/month cloud
- **Implementation**: JavaScript tracker + backend pipeline
- **Use Case**: Full data ownership, custom event tracking

**Key Features:**
- 100% data ownership
- Custom event schemas
- Real-time data streams
- GDPR compliant by design
- Warehouse-first architecture

#### 13. Optimizely or VWO
- **Purpose**: A/B testing and experimentation
- **Cost**: Custom pricing, typically $1,000+/month
- **Implementation**: JavaScript SDK
- **Use Case**: Test registration flows, optimize conversion rates

**Key Features:**
- Visual editor
- Multivariate testing
- Personalization
- Feature flags
- Stats engine

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Landing Page / Registration Flow                        │  │
│  │  ├─ Google Tag Manager (GTM)                            │  │
│  │  │  ├─ Google Analytics 4                               │  │
│  │  │  ├─ Meta Pixel                                       │  │
│  │  │  ├─ TikTok Pixel                                     │  │
│  │  │  ├─ Snapchat Pixel                                   │  │
│  │  │  ├─ Reddit Pixel                                     │  │
│  │  │  └─ Google Ads Conversion                            │  │
│  │  ├─ Segment SDK (optional)                              │  │
│  │  ├─ Mixpanel/Amplitude SDK                              │  │
│  │  ├─ Hotjar Snippet                                      │  │
│  │  └─ reCAPTCHA v3                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Application                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Registration API Endpoint                               │  │
│  │  ├─ Validate reCAPTCHA token                            │  │
│  │  ├─ Create user account                                 │  │
│  │  ├─ Fire server-side events:                            │  │
│  │  │  ├─ Meta Conversions API (CAPI)                      │  │
│  │  │  ├─ TikTok Events API                                │  │
│  │  │  ├─ Google Ads Offline Conversions                   │  │
│  │  │  ├─ Segment Track Event                              │  │
│  │  │  └─ Mixpanel/Amplitude Track                         │  │
│  │  ├─ Store user in database                              │  │
│  │  └─ Trigger email/SMS workflows                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Warehouse                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BigQuery / Snowflake / Redshift                         │  │
│  │  ├─ Raw events from Segment                             │  │
│  │  ├─ GA4 data export                                      │  │
│  │  ├─ Ad platform data (via Supermetrics/Funnel.io)       │  │
│  │  └─ User database exports                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Analytics & Reporting                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Google Data Studio / Looker / Tableau                   │  │
│  │  ├─ Registration funnel dashboard                        │  │
│  │  ├─ Channel attribution reports                          │  │
│  │  ├─ Cohort analysis                                      │  │
│  │  └─ ROI/ROAS tracking                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Client-Side Flow
1. User clicks ad (UTM parameters captured)
2. Lands on page → GTM fires page view events
3. User interacts → GTM fires engagement events
4. User submits registration → GTM fires conversion events
5. Client-side SDKs send data to respective platforms

#### Server-Side Flow
1. Backend receives registration request
2. Validates reCAPTCHA token
3. Creates user account in database
4. Fires server-side conversion events (CAPI, TikTok Events API, etc.)
5. Triggers email/SMS workflows
6. Logs events to data warehouse

### Technology Integration Map

```
Frontend (Next.js/React)
├── Google Tag Manager
│   ├── GA4 Tag
│   ├── Meta Pixel Tag
│   ├── TikTok Pixel Tag
│   ├── Snapchat Pixel Tag
│   ├── Reddit Pixel Tag
│   └── Google Ads Conversion Tag
├── Segment SDK (optional)
├── Mixpanel SDK
├── Hotjar Script
└── reCAPTCHA v3

Backend (NestJS)
├── Meta Conversions API
├── TikTok Events API
├── Google Ads API
├── Segment Server SDK
├── Mixpanel Server SDK
├── reCAPTCHA Verification
├── Klaviyo API (email)
└── Twilio API (SMS)

Data Layer
├── PostgreSQL (user data)
├── Redis (session data)
├── BigQuery/Snowflake (analytics)
└── S3/GCS (raw event logs)
```

---

## Implementation Guide

### Phase 1: Foundation Setup (Week 1)

#### Step 1.1: Install Google Tag Manager

**Frontend Implementation:**

```html
<!-- Add to <head> of all pages -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>

<!-- Add immediately after opening <body> tag -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

**Next.js Implementation:**

```typescript
// app/layout.tsx or _app.tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-XXXXXXX');
            `,
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
```

**TypeScript DataLayer Interface:**

```typescript
// lib/analytics/dataLayer.ts

interface DataLayerEvent {
  event: string;
  [key: string]: any;
}

interface WindowWithDataLayer extends Window {
  dataLayer: DataLayerEvent[];
}

declare let window: WindowWithDataLayer;

export const pushToDataLayer = (event: DataLayerEvent): void => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(event);
  } else {
    console.warn('GTM DataLayer not available');
  }
};

// Usage example
export const trackPageView = (pagePath: string, pageTitle: string): void => {
  pushToDataLayer({
    event: 'pageview',
    page_path: pagePath,
    page_title: pageTitle,
  });
};
```

#### Step 1.2: Configure Google Analytics 4

**GTM Configuration:**
1. In GTM, create new tag: "GA4 Configuration"
2. Tag type: Google Analytics: GA4 Configuration
3. Measurement ID: G-XXXXXXXXXX
4. Trigger: All Pages

**Custom Events Setup:**

```typescript
// lib/analytics/ga4.ts

export const GA4Events = {
  // Registration funnel
  BEGIN_REGISTRATION: 'begin_registration',
  COMPLETE_REGISTRATION: 'sign_up',
  EMAIL_VERIFIED: 'email_verified',
  PROFILE_COMPLETE: 'profile_complete',

  // Engagement
  FIRST_MATCH: 'first_match',
  FIRST_MESSAGE: 'first_message',

  // Monetization
  VIEW_PREMIUM: 'view_premium_features',
  BEGIN_CHECKOUT: 'begin_checkout',
  PURCHASE: 'purchase',

  // Content
  VIEW_PROFILE: 'view_profile',
  SEARCH: 'search',
} as const;

interface GA4EventParams {
  [key: string]: string | number | boolean;
}

export const trackGA4Event = (
  eventName: string,
  params?: GA4EventParams
): void => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  } else {
    // Fallback to dataLayer
    pushToDataLayer({
      event: eventName,
      ...params,
    });
  }
};

// Usage examples
export const trackRegistrationStart = (method: string = 'email'): void => {
  trackGA4Event(GA4Events.BEGIN_REGISTRATION, {
    method,
    timestamp: Date.now(),
  });
};

export const trackRegistrationComplete = (
  userId: string,
  method: string = 'email'
): void => {
  trackGA4Event(GA4Events.COMPLETE_REGISTRATION, {
    user_id: userId,
    method,
    timestamp: Date.now(),
  });
};
```

#### Step 1.3: Install Meta Pixel

**GTM Tag Configuration:**
1. Tag type: Custom HTML
2. Tag name: "Meta Pixel - Base Code"
3. Trigger: All Pages

**Pixel Code:**

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
```

**TypeScript Integration:**

```typescript
// lib/analytics/metaPixel.ts

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

export const MetaEvents = {
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  SEARCH: 'Search',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  PURCHASE: 'Purchase',
  LEAD: 'Lead',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
} as const;

interface MetaEventParams {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  status?: string;
  [key: string]: any;
}

export const trackMetaEvent = (
  eventName: string,
  params?: MetaEventParams
): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  } else {
    console.warn('Meta Pixel not loaded');
  }
};

export const trackMetaRegistration = (params?: {
  value?: number;
  currency?: string;
  status?: string;
}): void => {
  trackMetaEvent(MetaEvents.COMPLETE_REGISTRATION, {
    value: params?.value || 0,
    currency: params?.currency || 'USD',
    status: params?.status || 'completed',
  });
};

// Advanced Matching (for better attribution)
export const initMetaPixelWithUserData = (userData: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    // Hash sensitive data before sending
    const hashedData: any = {};

    if (userData.email) {
      hashedData.em = hashString(userData.email.toLowerCase());
    }
    if (userData.phone) {
      hashedData.ph = hashString(userData.phone.replace(/\D/g, ''));
    }
    if (userData.firstName) {
      hashedData.fn = hashString(userData.firstName.toLowerCase());
    }
    if (userData.lastName) {
      hashedData.ln = hashString(userData.lastName.toLowerCase());
    }
    if (userData.city) {
      hashedData.ct = hashString(userData.city.toLowerCase());
    }
    if (userData.state) {
      hashedData.st = hashString(userData.state.toLowerCase());
    }
    if (userData.zip) {
      hashedData.zp = hashString(userData.zip);
    }
    if (userData.country) {
      hashedData.country = hashString(userData.country.toLowerCase());
    }

    window.fbq('init', process.env.NEXT_PUBLIC_META_PIXEL_ID!, hashedData);
  }
};

// SHA-256 hashing function
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

#### Step 1.4: Install TikTok Pixel

**GTM Tag Configuration:**
1. Tag type: Custom HTML
2. Tag name: "TikTok Pixel - Base Code"
3. Trigger: All Pages

**Pixel Code:**

```html
<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};

  ttq.load('YOUR_PIXEL_ID');
  ttq.page();
}(window, document, 'ttq');
</script>
```

**TypeScript Integration:**

```typescript
// lib/analytics/tiktokPixel.ts

declare global {
  interface Window {
    ttq: any;
    TiktokAnalyticsObject: string;
  }
}

export const TikTokEvents = {
  PAGE_VIEW: 'ViewContent',
  CLICK_BUTTON: 'ClickButton',
  SEARCH: 'Search',
  CONTACT: 'Contact',
  SUBMIT_FORM: 'SubmitForm',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  SUBSCRIBE: 'Subscribe',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  COMPLETE_PAYMENT: 'CompletePayment',
} as const;

interface TikTokEventParams {
  content_id?: string;
  content_type?: string;
  content_name?: string;
  value?: number;
  currency?: string;
  [key: string]: any;
}

export const trackTikTokEvent = (
  eventName: string,
  params?: TikTokEventParams
): void => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track(eventName, params);
  } else {
    console.warn('TikTok Pixel not loaded');
  }
};

export const trackTikTokRegistration = (): void => {
  trackTikTokEvent(TikTokEvents.COMPLETE_REGISTRATION);
};

export const trackTikTokSubscription = (value: number, currency: string = 'USD'): void => {
  trackTikTokEvent(TikTokEvents.SUBSCRIBE, {
    value,
    currency,
  });
};
```

#### Step 1.5: Install reCAPTCHA v3

**Frontend Implementation:**

```typescript
// lib/security/recaptcha.ts

export class RecaptchaService {
  private siteKey: string;
  private loaded: boolean = false;

  constructor() {
    this.siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
  }

  async loadScript(): Promise<void> {
    if (this.loaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.loaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load reCAPTCHA script'));
      };

      document.head.appendChild(script);
    });
  }

  async executeAction(action: string): Promise<string> {
    if (!this.loaded) {
      await this.loadScript();
    }

    return new Promise((resolve, reject) => {
      (window as any).grecaptcha.ready(() => {
        (window as any).grecaptcha
          .execute(this.siteKey, { action })
          .then((token: string) => resolve(token))
          .catch((error: Error) => reject(error));
      });
    });
  }
}

export const recaptchaService = new RecaptchaService();
```

**Registration Form Integration:**

```typescript
// components/RegistrationForm.tsx
import { useState } from 'react';
import { recaptchaService } from '@/lib/security/recaptcha';

export function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await recaptchaService.executeAction('register');

      // Submit registration with token
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          recaptchaToken,
        }),
      });

      if (response.ok) {
        // Handle successful registration
        const data = await response.json();

        // Track conversion events
        trackRegistrationComplete(data.userId);
      } else {
        // Handle error
        const error = await response.json();
        console.error('Registration failed:', error);
      }
    } catch (error) {
      console.error('Error during registration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Account...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

**Backend Verification:**

```typescript
// backend/src/modules/auth/auth.service.ts
import axios from 'axios';

interface RecaptchaVerificationResponse {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
  'error-codes'?: string[];
}

@Injectable()
export class AuthService {
  private readonly recaptchaSecretKey: string;
  private readonly recaptchaVerifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

  constructor(private configService: ConfigService) {
    this.recaptchaSecretKey = this.configService.get('RECAPTCHA_SECRET_KEY')!;
  }

  async verifyRecaptcha(token: string, expectedAction: string = 'register'): Promise<boolean> {
    try {
      const response = await axios.post<RecaptchaVerificationResponse>(
        this.recaptchaVerifyUrl,
        null,
        {
          params: {
            secret: this.recaptchaSecretKey,
            response: token,
          },
        }
      );

      const { success, score, action } = response.data;

      // Check if verification was successful
      if (!success) {
        throw new BadRequestException('reCAPTCHA verification failed');
      }

      // Verify action matches expected action
      if (action !== expectedAction) {
        throw new BadRequestException('Invalid reCAPTCHA action');
      }

      // Check score threshold (0.0 = likely bot, 1.0 = likely human)
      // Recommended threshold: 0.5
      if (score < 0.5) {
        throw new BadRequestException('reCAPTCHA score too low');
      }

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new BadRequestException('reCAPTCHA verification service unavailable');
      }
      throw error;
    }
  }

  async register(registerDto: RegisterDto): Promise<User> {
    // Verify reCAPTCHA token
    await this.verifyRecaptcha(registerDto.recaptchaToken);

    // Continue with registration logic
    // ...
  }
}
```

---

### Phase 2: Server-Side Tracking (Week 2)

#### Step 2.1: Meta Conversions API (CAPI)

**Installation:**

```bash
npm install facebook-nodejs-business-sdk
```

**Backend Implementation:**

```typescript
// backend/src/modules/tracking/meta-conversions.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { bizSdk } from 'facebook-nodejs-business-sdk';

const {
  Content,
  CustomData,
  DeliveryCategory,
  EventRequest,
  UserData,
  ServerEvent,
} = bizSdk;

interface TrackConversionParams {
  eventName: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  externalId?: string; // User ID
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string; // Meta browser ID (_fbp cookie)
  fbc?: string; // Meta click ID (_fbc cookie)
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentCategory?: string;
  contentName?: string;
}

@Injectable()
export class MetaConversionsService {
  private readonly logger = new Logger(MetaConversionsService.name);
  private readonly accessToken: string;
  private readonly pixelId: string;

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get('META_CONVERSIONS_ACCESS_TOKEN')!;
    this.pixelId = this.configService.get('META_PIXEL_ID')!;

    // Initialize SDK
    bizSdk.FacebookAdsApi.init(this.accessToken);
  }

  async trackConversion(params: TrackConversionParams): Promise<void> {
    try {
      // Build user data
      const userData = new UserData()
        .setEmails(params.email ? [this.hashData(params.email)] : undefined)
        .setPhones(params.phone ? [this.hashData(params.phone)] : undefined)
        .setFirstNames(params.firstName ? [this.hashData(params.firstName)] : undefined)
        .setLastNames(params.lastName ? [this.hashData(params.lastName)] : undefined)
        .setCities(params.city ? [this.hashData(params.city)] : undefined)
        .setStates(params.state ? [this.hashData(params.state)] : undefined)
        .setZips(params.zip ? [this.hashData(params.zip)] : undefined)
        .setCountries(params.country ? [this.hashData(params.country)] : undefined)
        .setExternalIds(params.externalId ? [params.externalId] : undefined)
        .setClientIpAddress(params.clientIpAddress)
        .setClientUserAgent(params.clientUserAgent)
        .setFbp(params.fbp)
        .setFbc(params.fbc);

      // Build custom data
      const customData = new CustomData()
        .setValue(params.value)
        .setCurrency(params.currency || 'USD')
        .setContentIds(params.contentIds)
        .setContentCategory(params.contentCategory)
        .setContentName(params.contentName);

      // Build server event
      const serverEvent = new ServerEvent()
        .setEventName(params.eventName)
        .setEventTime(Math.floor(Date.now() / 1000))
        .setUserData(userData)
        .setCustomData(customData)
        .setEventSourceUrl(params.eventSourceUrl)
        .setActionSource('website');

      // Create event request
      const eventRequest = new EventRequest(
        this.accessToken,
        this.pixelId
      ).setEvents([serverEvent]);

      // Send event
      const response = await eventRequest.execute();

      this.logger.log(`Meta conversion tracked: ${params.eventName}`, {
        eventsReceived: response.events_received,
        messagesFBTraceId: response.fbtrace_id,
      });
    } catch (error) {
      this.logger.error('Failed to track Meta conversion', error);
      // Don't throw error - tracking failures shouldn't break registration
    }
  }

  async trackRegistration(params: {
    userId: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    ipAddress: string;
    userAgent: string;
    fbp?: string;
    fbc?: string;
    sourceUrl: string;
  }): Promise<void> {
    await this.trackConversion({
      eventName: 'CompleteRegistration',
      email: params.email,
      phone: params.phone,
      firstName: params.firstName,
      lastName: params.lastName,
      externalId: params.userId,
      clientIpAddress: params.ipAddress,
      clientUserAgent: params.userAgent,
      fbp: params.fbp,
      fbc: params.fbc,
      eventSourceUrl: params.sourceUrl,
      value: 0,
      currency: 'USD',
    });
  }

  private hashData(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
  }
}
```

**Usage in Registration Controller:**

```typescript
// backend/src/modules/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private metaConversionsService: MetaConversionsService,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() request: Request,
  ): Promise<{ user: User; token: string }> {
    // Create user
    const user = await this.authService.register(registerDto);
    const token = this.authService.generateToken(user);

    // Track conversion server-side
    await this.metaConversionsService.trackRegistration({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
      fbp: request.cookies['_fbp'],
      fbc: request.cookies['_fbc'],
      sourceUrl: request.headers['referer'] || '',
    });

    return { user, token };
  }
}
```

#### Step 2.2: TikTok Events API

**Installation:**

```bash
npm install axios
```

**Backend Implementation:**

```typescript
// backend/src/modules/tracking/tiktok-events.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

interface TikTokEventParams {
  event: string;
  eventId?: string;
  timestamp?: string;
  email?: string;
  phone?: string;
  externalId?: string; // User ID
  ttclid?: string; // TikTok click ID
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
  value?: number;
  currency?: string;
  contentId?: string;
}

@Injectable()
export class TikTokEventsService {
  private readonly logger = new Logger(TikTokEventsService.name);
  private readonly accessToken: string;
  private readonly pixelId: string;
  private readonly apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get('TIKTOK_ACCESS_TOKEN')!;
    this.pixelId = this.configService.get('TIKTOK_PIXEL_ID')!;
  }

  async trackEvent(params: TikTokEventParams): Promise<void> {
    try {
      const event = {
        pixel_code: this.pixelId,
        event: params.event,
        event_id: params.eventId || this.generateEventId(),
        timestamp: params.timestamp || new Date().toISOString(),
        context: {
          user_agent: params.userAgent,
          ip: params.ip,
          page: {
            url: params.pageUrl,
          },
        },
        properties: {
          contents: params.contentId ? [{ content_id: params.contentId }] : [],
          value: params.value,
          currency: params.currency || 'USD',
        },
      };

      // Add user data if available
      if (params.email || params.phone || params.externalId) {
        event['context']['user'] = {};

        if (params.email) {
          event['context']['user']['email'] = this.hashData(params.email);
        }
        if (params.phone) {
          event['context']['user']['phone_number'] = this.hashData(params.phone);
        }
        if (params.externalId) {
          event['context']['user']['external_id'] = params.externalId;
        }
      }

      // Add TikTok click ID if available
      if (params.ttclid) {
        event['context']['ad'] = {
          callback: params.ttclid,
        };
      }

      const response = await axios.post(
        this.apiUrl,
        {
          event_source: 'web',
          event_source_id: this.pixelId,
          data: [event],
        },
        {
          headers: {
            'Access-Token': this.accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`TikTok event tracked: ${params.event}`, {
        code: response.data.code,
        message: response.data.message,
      });
    } catch (error) {
      this.logger.error('Failed to track TikTok event', error);
    }
  }

  async trackRegistration(params: {
    userId: string;
    email: string;
    phone?: string;
    ipAddress: string;
    userAgent: string;
    ttclid?: string;
    sourceUrl: string;
  }): Promise<void> {
    await this.trackEvent({
      event: 'CompleteRegistration',
      email: params.email,
      phone: params.phone,
      externalId: params.userId,
      ip: params.ipAddress,
      userAgent: params.userAgent,
      ttclid: params.ttclid,
      pageUrl: params.sourceUrl,
    });
  }

  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

### Phase 3: Advanced Analytics (Week 3)

#### Step 3.1: Segment Integration

**Installation:**

```bash
npm install @segment/analytics-next
npm install @segment/analytics-node
```

**Frontend Integration:**

```typescript
// lib/analytics/segment.ts
import { AnalyticsBrowser } from '@segment/analytics-next';

export const analytics = AnalyticsBrowser.load({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY!,
});

// Track page view
export const trackPage = (name?: string, properties?: Record<string, any>) => {
  analytics.page(name, properties);
};

// Track event
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  analytics.track(eventName, properties);
};

// Identify user
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  analytics.identify(userId, traits);
};

// Usage example
export const trackRegistrationWithSegment = (user: {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}) => {
  // Identify user
  identifyUser(user.id, {
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  });

  // Track registration event
  trackEvent('Registration Completed', {
    userId: user.id,
    method: 'email',
    timestamp: new Date().toISOString(),
  });
};
```

**Backend Integration:**

```typescript
// backend/src/modules/tracking/segment.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Analytics } from '@segment/analytics-node';

@Injectable()
export class SegmentService {
  private readonly logger = new Logger(SegmentService.name);
  private analytics: Analytics;

  constructor(private configService: ConfigService) {
    const writeKey = this.configService.get('SEGMENT_WRITE_KEY')!;
    this.analytics = new Analytics({ writeKey });
  }

  async identify(userId: string, traits: Record<string, any>): Promise<void> {
    try {
      await this.analytics.identify({
        userId,
        traits,
      });
    } catch (error) {
      this.logger.error('Failed to identify user in Segment', error);
    }
  }

  async track(
    userId: string,
    event: string,
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      await this.analytics.track({
        userId,
        event,
        properties,
      });
    } catch (error) {
      this.logger.error('Failed to track event in Segment', error);
    }
  }

  async page(
    userId: string,
    name: string,
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      await this.analytics.page({
        userId,
        name,
        properties,
      });
    } catch (error) {
      this.logger.error('Failed to track page view in Segment', error);
    }
  }
}
```

---

## Event Tracking Schema

### Standard Events

```typescript
// lib/analytics/events.ts

export const TrackingEvents = {
  // Page Views
  PAGE_VIEW: 'Page Viewed',
  LANDING_PAGE_VIEW: 'Landing Page Viewed',

  // Registration Funnel
  REGISTRATION_VIEWED: 'Registration Form Viewed',
  REGISTRATION_STARTED: 'Registration Started',
  REGISTRATION_STEP_COMPLETED: 'Registration Step Completed',
  REGISTRATION_COMPLETED: 'Registration Completed',
  EMAIL_VERIFICATION_SENT: 'Email Verification Sent',
  EMAIL_VERIFIED: 'Email Verified',

  // Profile Setup
  PROFILE_EDIT_STARTED: 'Profile Edit Started',
  PROFILE_PHOTO_UPLOADED: 'Profile Photo Uploaded',
  PROFILE_COMPLETED: 'Profile Completed',

  // User Engagement
  PROFILE_VIEWED: 'Profile Viewed',
  SEARCH_PERFORMED: 'Search Performed',
  FILTER_APPLIED: 'Filter Applied',
  MATCH_MADE: 'Match Made',
  MESSAGE_SENT: 'Message Sent',

  // Monetization
  PREMIUM_FEATURES_VIEWED: 'Premium Features Viewed',
  SUBSCRIPTION_PLAN_VIEWED: 'Subscription Plan Viewed',
  SUBSCRIPTION_CHECKOUT_STARTED: 'Subscription Checkout Started',
  SUBSCRIPTION_PURCHASED: 'Subscription Purchased',

  // Errors
  ERROR_OCCURRED: 'Error Occurred',
  REGISTRATION_FAILED: 'Registration Failed',
} as const;

export interface EventProperties {
  // Common properties
  timestamp?: string;
  userId?: string;
  sessionId?: string;

  // UTM parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  // Device & location
  device_type?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;

  // Custom properties
  [key: string]: any;
}
```

### Comprehensive Tracking Service

```typescript
// lib/analytics/tracking.service.ts

import { trackGA4Event } from './ga4';
import { trackMetaEvent } from './metaPixel';
import { trackTikTokEvent } from './tiktokPixel';
import { trackEvent as trackSegmentEvent } from './segment';
import { TrackingEvents, EventProperties } from './events';

class TrackingService {
  private getUTMParams(): Record<string, string> {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
    };
  }

  private getDeviceInfo(): Record<string, string> {
    if (typeof window === 'undefined') return {};

    const ua = navigator.userAgent;
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';

    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    return {
      device_type: deviceType,
      browser: this.getBrowser(ua),
      os: this.getOS(ua),
    };
  }

  private getBrowser(ua: string): string {
    if (/chrome/i.test(ua)) return 'Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua)) return 'Safari';
    if (/edge/i.test(ua)) return 'Edge';
    return 'Other';
  }

  private getOS(ua: string): string {
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/ios|iphone|ipad/i.test(ua)) return 'iOS';
    return 'Other';
  }

  public track(eventName: string, properties?: EventProperties): void {
    const enrichedProperties = {
      ...properties,
      ...this.getUTMParams(),
      ...this.getDeviceInfo(),
      timestamp: new Date().toISOString(),
    };

    // Track in all platforms
    trackGA4Event(eventName, enrichedProperties);

    // Track in Segment (which will distribute to other destinations)
    trackSegmentEvent(eventName, enrichedProperties);

    // Platform-specific tracking
    this.trackPlatformSpecific(eventName, enrichedProperties);
  }

  private trackPlatformSpecific(eventName: string, properties: EventProperties): void {
    // Meta-specific events
    if (eventName === TrackingEvents.REGISTRATION_COMPLETED) {
      trackMetaEvent('CompleteRegistration', {
        value: properties.value || 0,
        currency: 'USD',
      });
    }

    // TikTok-specific events
    if (eventName === TrackingEvents.REGISTRATION_COMPLETED) {
      trackTikTokEvent('CompleteRegistration');
    }

    // Add more platform-specific tracking as needed
  }

  // Convenience methods
  public trackPageView(pageName: string, properties?: EventProperties): void {
    this.track(TrackingEvents.PAGE_VIEW, {
      ...properties,
      page_name: pageName,
      page_url: typeof window !== 'undefined' ? window.location.href : '',
    });
  }

  public trackRegistrationStart(method: string = 'email'): void {
    this.track(TrackingEvents.REGISTRATION_STARTED, {
      registration_method: method,
    });
  }

  public trackRegistrationCompleted(userId: string, method: string = 'email'): void {
    this.track(TrackingEvents.REGISTRATION_COMPLETED, {
      user_id: userId,
      registration_method: method,
    });
  }

  public trackError(error: Error, context?: Record<string, any>): void {
    this.track(TrackingEvents.ERROR_OCCURRED, {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }
}

export const trackingService = new TrackingService();
```

---

## Privacy & Compliance

### GDPR Compliance

```typescript
// lib/privacy/consent.service.ts

export enum ConsentCategory {
  NECESSARY = 'necessary',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  PERSONALIZATION = 'personalization',
}

export interface ConsentPreferences {
  necessary: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

class ConsentService {
  private readonly CONSENT_COOKIE_NAME = 'user_consent';
  private readonly CONSENT_COOKIE_EXPIRY_DAYS = 365;

  getConsent(): ConsentPreferences | null {
    if (typeof document === 'undefined') return null;

    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${this.CONSENT_COOKIE_NAME}=`));

    if (!cookie) return null;

    try {
      const value = cookie.split('=')[1];
      return JSON.parse(decodeURIComponent(value));
    } catch {
      return null;
    }
  }

  setConsent(preferences: ConsentPreferences): void {
    if (typeof document === 'undefined') return;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.CONSENT_COOKIE_EXPIRY_DAYS);

    document.cookie = `${this.CONSENT_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify(preferences)
    )}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=lax`;

    // Load or unload tracking scripts based on consent
    this.applyConsent(preferences);
  }

  private applyConsent(preferences: ConsentPreferences): void {
    // Load/unload analytics scripts
    if (preferences.analytics) {
      this.loadAnalyticsScripts();
    } else {
      this.unloadAnalyticsScripts();
    }

    // Load/unload marketing scripts
    if (preferences.marketing) {
      this.loadMarketingScripts();
    } else {
      this.unloadMarketingScripts();
    }
  }

  private loadAnalyticsScripts(): void {
    // Enable GA4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }
  }

  private unloadAnalyticsScripts(): void {
    // Disable GA4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }
  }

  private loadMarketingScripts(): void {
    // Enable ad tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }
  }

  private unloadMarketingScripts(): void {
    // Disable ad tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
  }

  hasConsent(category: ConsentCategory): boolean {
    const consent = this.getConsent();
    if (!consent) return false;
    return consent[category] === true;
  }
}

export const consentService = new ConsentService();
```

**Consent Banner Component:**

```typescript
// components/ConsentBanner.tsx
import { useState, useEffect } from 'react';
import { consentService, ConsentPreferences } from '@/lib/privacy/consent.service';

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = consentService.getConsent();
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    consentService.setConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    });
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    consentService.setConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    });
    setShowBanner(false);
  };

  const handleSavePreferences = (preferences: ConsentPreferences) => {
    consentService.setConsent(preferences);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-6 z-50">
      <div className="container mx-auto">
        <h3 className="text-lg font-semibold mb-2">Cookie Preferences</h3>
        <p className="text-sm text-gray-600 mb-4">
          We use cookies to improve your experience, analyze site traffic, and personalize content.
        </p>

        {!showDetails ? (
          <div className="flex gap-3">
            <button
              onClick={handleAcceptAll}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Accept All
            </button>
            <button
              onClick={handleRejectAll}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Reject All
            </button>
            <button
              onClick={() => setShowDetails(true)}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Customize
            </button>
          </div>
        ) : (
          <div>
            {/* Detailed preference toggles */}
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked disabled />
                <span>Necessary (Required)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" id="analytics" />
                <span>Analytics</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" id="marketing" />
                <span>Marketing</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" id="personalization" />
                <span>Personalization</span>
              </label>
            </div>
            <button
              onClick={() => {
                const prefs: ConsentPreferences = {
                  necessary: true,
                  analytics: (document.getElementById('analytics') as HTMLInputElement).checked,
                  marketing: (document.getElementById('marketing') as HTMLInputElement).checked,
                  personalization: (document.getElementById('personalization') as HTMLInputElement).checked,
                };
                handleSavePreferences(prefs);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Cost Analysis

### Starter Stack (0-1K users/month): ~$0-50/month
- Google Tag Manager: FREE
- Google Analytics 4: FREE
- Meta Pixel: FREE
- TikTok Pixel: FREE
- Google Ads Tracking: FREE
- reCAPTCHA v3: FREE (up to 1M assessments)
- **Total: $0/month**

### Growth Stack (1K-10K users/month): ~$200-500/month
- All starter stack: FREE
- Segment: $120/month
- Mixpanel: $25-$89/month
- Hotjar: $32-$80/month
- Klaviyo: $20-$60/month
- OneSignal: FREE
- **Total: $197-349/month**

### Scale Stack (10K-100K users/month): ~$1,000-3,000/month
- All growth stack: $197-349/month
- AppsFlyer: $300-800/month
- Optimizely: $1,000-2,000/month
- Supermetrics: $99-299/month
- ClickCease: $79-199/month
- **Total: $1,675-3,647/month**

---

## Monitoring & Optimization

### Dashboard Setup

```typescript
// lib/analytics/dashboard.ts

export interface DashboardMetrics {
  // Registration metrics
  totalRegistrations: number;
  registrationRate: number;
  avgTimeToRegister: number;

  // Channel performance
  registrationsByChannel: Record<string, number>;
  costPerRegistration: Record<string, number>;

  // Funnel metrics
  landingPageViews: number;
  registrationStarts: number;
  registrationCompletions: number;
  emailVerifications: number;

  // Quality metrics
  botBlockRate: number;
  fraudDetectionRate: number;
}

export async function getDashboardMetrics(
  startDate: Date,
  endDate: Date
): Promise<DashboardMetrics> {
  // Fetch from your data warehouse or analytics platform
  // This is a placeholder implementation
  return {
    totalRegistrations: 1250,
    registrationRate: 0.23,
    avgTimeToRegister: 180, // seconds
    registrationsByChannel: {
      'google': 450,
      'facebook': 380,
      'tiktok': 220,
      'organic': 200,
    },
    costPerRegistration: {
      'google': 12.50,
      'facebook': 8.75,
      'tiktok': 6.25,
    },
    landingPageViews: 15000,
    registrationStarts: 5000,
    registrationCompletions: 1250,
    emailVerifications: 1100,
    botBlockRate: 0.15,
    fraudDetectionRate: 0.03,
  };
}
```

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Install Google Tag Manager
- [ ] Configure Google Analytics 4
- [ ] Add Meta Pixel (client-side)
- [ ] Add TikTok Pixel
- [ ] Add Snapchat Pixel
- [ ] Add Reddit Pixel
- [ ] Configure Google Ads conversion tracking
- [ ] Implement reCAPTCHA v3
- [ ] Test all pixels firing correctly

### Week 2: Server-Side Tracking
- [ ] Implement Meta Conversions API
- [ ] Implement TikTok Events API
- [ ] Implement Google Ads offline conversions
- [ ] Add server-side event tracking to registration flow
- [ ] Test server-side events
- [ ] Verify event deduplication

### Week 3: Advanced Analytics
- [ ] Install Segment (optional)
- [ ] Install Mixpanel/Amplitude
- [ ] Install Hotjar
- [ ] Configure email retargeting (Klaviyo)
- [ ] Set up funnel analysis
- [ ] Create custom dashboards
- [ ] Configure alerts for anomalies

### Week 4: Optimization & Mobile
- [ ] Install AppsFlyer (if mobile app exists)
- [ ] Configure deep linking
- [ ] Implement A/B testing framework
- [ ] Create retargeting audiences
- [ ] Set up automated reports
- [ ] Document tracking implementation
- [ ] Train team on analytics tools

---

## Next Steps

1. **Phase 1**: Implement starter stack (GTM, GA4, pixels, reCAPTCHA)
2. **Phase 2**: Add server-side tracking (CAPI, TikTok Events API)
3. **Phase 3**: Implement advanced analytics (Segment, Mixpanel, Hotjar)
4. **Phase 4**: Mobile attribution (AppsFlyer)
5. **Phase 5**: Optimization & experimentation (A/B testing, CRO)

This documentation provides a complete roadmap for implementing advertising tracking and audience registration for your platform. Each component is production-ready and follows industry best practices.
