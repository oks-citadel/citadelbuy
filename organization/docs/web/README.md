# CitadelBuy Web Frontend

The CitadelBuy Web Frontend is a modern, high-performance Next.js application that delivers an exceptional shopping experience. Built with React 18, TypeScript, and Tailwind CSS, it features AI-powered recommendations, real-time updates, advanced search, and a fully responsive design optimized for all devices.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Page Structure](#page-structure)
- [Component Organization](#component-organization)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Common Development Tasks](#common-development-tasks)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## Overview

### Key Features

- **Modern Stack**: Next.js 15, React 18, TypeScript 5
- **AI-Powered**: Visual search, product recommendations, chatbot
- **Real-Time**: WebSocket integration for live updates
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Advanced Search**: Instant search with filters and facets
- **Authentication**: Social login, 2FA, session management
- **Payment Integration**: Stripe with Apple Pay and Google Pay
- **State Management**: Zustand for global state, React Query for server state
- **Styling**: Tailwind CSS with Radix UI components
- **Animations**: Framer Motion for smooth transitions
- **Accessibility**: WCAG 2.1 AA compliant
- **PWA Support**: Offline-first progressive web app
- **SEO Optimized**: Server-side rendering, meta tags, sitemaps

### Technology Stack

- **Framework**: Next.js 15.5.x (App Router)
- **Language**: TypeScript 5.7.x
- **UI Library**: React 18.3.x
- **Styling**: Tailwind CSS 3.4.x
- **Component Library**: Radix UI
- **State Management**: Zustand 5.x
- **Data Fetching**: TanStack Query (React Query) 5.x
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion 11.x
- **HTTP Client**: Axios 1.7.x
- **Icons**: Lucide React
- **Charts**: Recharts 2.x
- **Testing**: Playwright for E2E

## Architecture

### Design Patterns

- **App Router**: Leveraging Next.js 15 App Router for improved routing
- **Server Components**: Default to React Server Components for better performance
- **Client Components**: Strategic use of 'use client' for interactivity
- **Custom Hooks**: Reusable logic encapsulation
- **Compound Components**: Complex UI patterns
- **Atomic Design**: Component hierarchy (atoms, molecules, organisms)

### Core Architecture

```
app/                  # Next.js App Router pages
├── (routes)/        # Route groups
├── layout.tsx       # Root layout
└── providers.tsx    # Global providers

components/          # Reusable components
├── ui/             # Base UI components (shadcn/ui)
├── layout/         # Layout components
└── [feature]/      # Feature-specific components

hooks/              # Custom React hooks
stores/             # Zustand stores
services/           # API services
lib/                # Utilities and helpers
styles/             # Global styles
```

## Page Structure

The application uses Next.js App Router with the following main routes:

### Public Pages

- **Home** (`/`) - Landing page with hero, featured products, deals
- **Products** (`/products`) - Product listing with filters
- **Product Detail** (`/products/[slug]`) - Individual product page
- **Categories** (`/categories`) - Category browsing
- **Category Page** (`/categories/[slug]`) - Category-specific products
- **Deals** (`/deals`) - Special offers and flash sales
- **Brands** (`/brands`) - Brand directory
- **New Arrivals** (`/new-arrivals`) - Latest products
- **Trending** (`/trending`) - Trending products
- **For You** (`/for-you`) - Personalized recommendations

### Shopping Flow

- **Cart** (`/cart`) - Shopping cart
- **Checkout** (`/checkout`) - Checkout process
- **Orders** (`/orders`) - Order history
- **Track Order** (`/track-order`) - Order tracking

### User Account

- **Account** (`/account`) - Account dashboard
  - Profile settings
  - Payment methods
  - Addresses
  - Order history
  - Wishlist
  - Support tickets
  - Settings

### Authentication

- **Sign In** (`/auth/signin`) - Login page
- **Sign Up** (`/auth/signup`) - Registration
- **Forgot Password** (`/auth/forgot-password`) - Password reset
- **OAuth Callbacks** (`/auth/callback/*`) - Social login handlers

### AI Features

- **Visual Search** (`/visual-search`) - Search by image
- **AI Features** (`/ai-features`) - AI capabilities showcase

### Vendor

- **Sell** (`/sell`) - Vendor signup
- **Vendor Dashboard** (`/vendor/*`) - Vendor portal

### Organization

- **Organization Portal** (`/org/*`) - Multi-tenant organization management
  - Dashboard
  - API keys
  - Billing
  - KYC verification
  - Audit logs
  - Team management

### Admin

- **Admin Panel** (`/admin/*`) - Administrative functions
  - Dashboard
  - User management
  - Product management
  - Order management
  - Analytics
  - Support tickets

### Informational

- **Help** (`/help`) - Help center
- **Terms** (`/terms`) - Terms of service
- **Privacy** (`/privacy`) - Privacy policy
- **Cookies** (`/cookies`) - Cookie policy
- **Accessibility** (`/accessibility`) - Accessibility statement

## Component Organization

### UI Components (`src/components/ui/`)

Base components built on Radix UI and styled with Tailwind:

- **Form Elements**: Button, Input, Select, Checkbox, Radio, Switch, Textarea
- **Feedback**: Alert, Toast, Dialog, AlertDialog, Popover
- **Navigation**: Dropdown, Tabs, Accordion
- **Data Display**: Badge, Avatar, Card, Separator, Progress
- **Layout**: ScrollArea, Separator

### Layout Components (`src/components/layout/`)

- **Header**: Main navigation, search bar, cart icon
- **Footer**: Links, newsletter signup, social media
- **MobileNav**: Bottom navigation for mobile devices
- **Sidebar**: Category navigation and filters

### Feature Components

Organized by domain:

- **`components/product/`**: ProductCard, ProductGrid, ProductDetail
- **`components/cart/`**: CartItem, CartSummary, MiniCart
- **`components/checkout/`**: CheckoutForm, StripePaymentForm, AddressForm
- **`components/home/`**: HeroSection, FeaturedProducts, NewsletterSection
- **`components/account/`**: AccountNav, OrderCard, AddressCard
- **`components/organization/`**: OrgDashboard, TeamManagement, BillingPanel
- **`components/ai/`**: VisualSearchUpload, ProductRecommendations, ChatBot

### Custom Hooks (`src/hooks/`)

- **`useAuth()`**: Authentication state and methods
- **`useCart()`**: Cart management
- **`useWishlist()`**: Wishlist operations
- **`useLiveChat()`**: WebSocket chat integration
- **`useProductSearch()`**: Advanced product search
- **`useCheckout()`**: Checkout flow management

### State Stores (`src/stores/`)

- **`authStore`**: User authentication state
- **`cartStore`**: Shopping cart state
- **`wishlistStore`**: Wishlist state
- **`uiStore`**: UI state (modals, sidebars, etc.)
- **`accountStore`**: User account data

### API Services (`src/services/`)

- **`api-client.ts`**: Base axios configuration
- **`auth-api.ts`**: Authentication endpoints
- **`product-api.ts`**: Product operations
- **`cart-api.ts`**: Cart management
- **`order-api.ts`**: Order operations
- **`account-api.ts`**: User account management
- **`organizations-api.ts`**: Organization management
- **`ai.ts`**: AI feature endpoints

## Prerequisites

- **Node.js**: v18.x or higher (LTS recommended)
- **pnpm**: v8.x or higher
- **Git**: For version control

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd citadelbuy-master/organization
   ```

2. **Install dependencies**:
   ```bash
   # From the organization root
   pnpm install

   # Or from apps/web directory
   cd apps/web
   pnpm install
   ```

## Environment Configuration

Create a `.env.local` file in `apps/web/` by copying the example:

```bash
cp .env.example .env.local
```

### Required Environment Variables

#### API Configuration
```env
# Main backend API
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# AI service for recommendations and visual search
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000

# WebSocket for real-time features
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

#### Application
```env
NEXT_PUBLIC_APP_NAME=CitadelBuy
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

#### Payment
```env
# Get from: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### OAuth (Optional)
```env
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...

# Facebook OAuth
NEXT_PUBLIC_FACEBOOK_APP_ID=...

# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=...

# Apple Sign In
NEXT_PUBLIC_APPLE_CLIENT_ID=...
```

#### Analytics (Optional)
```env
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=...
NEXT_PUBLIC_TIKTOK_PIXEL_ID=...
```

#### Feature Flags
```env
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_AR_TRYON=true
NEXT_PUBLIC_ENABLE_VOICE_SEARCH=true
NEXT_PUBLIC_ENABLE_CHATBOT=true
```

#### CDN (Optional)
```env
NEXT_PUBLIC_CDN_URL=https://cdn.citadelbuy.com
NEXT_PUBLIC_IMAGE_OPTIMIZATION=true
```

#### Monitoring (Optional)
```env
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

See `.env.example` for complete documentation.

## Running the Application

### Development Mode

Start the development server with hot-reload:

```bash
pnpm dev
```

The application will be available at: **http://localhost:3000**

Features in development mode:
- Hot module replacement
- Fast refresh
- Source maps
- Detailed error messages
- React Query DevTools (bottom-right corner)

### Production Preview

Build and run a production preview locally:

```bash
pnpm build
pnpm start
```

### Type Checking

Run TypeScript type checking:

```bash
pnpm type-check
```

### Linting

Check and fix code style:

```bash
pnpm lint
```

## Testing

### E2E Tests with Playwright

Run end-to-end tests:

```bash
# Run all E2E tests
pnpm test:e2e

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run specific test file
pnpm test:e2e tests/checkout.spec.ts

# Debug tests
pnpm test:e2e --debug
```

View test report:
```bash
npx playwright show-report
```

### Unit Tests with Jest

```bash
# Run unit tests
pnpm test

# Run in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

### E2E Test Structure

Tests are located in `e2e/` directory:

- `e2e/auth.spec.ts` - Authentication flows
- `e2e/shopping.spec.ts` - Product browsing and cart
- `e2e/checkout.spec.ts` - Checkout process
- `e2e/account.spec.ts` - User account management

## Building for Production

### Build the Application

```bash
pnpm build
```

This will:
1. Type-check the entire codebase
2. Optimize and bundle all code
3. Generate static pages where possible
4. Optimize images
5. Create production-ready output in `.next/`

### Analyze Bundle Size

```bash
# Install analyzer
pnpm add -D @next/bundle-analyzer

# Run build with analyzer
ANALYZE=true pnpm build
```

### Output

The build creates:
- **`.next/`**: Production build output
- **`out/`**: Static export (if using `output: 'export'`)

### Environment-Specific Builds

```bash
# Staging build
NODE_ENV=production NEXT_PUBLIC_API_URL=https://staging-api.citadelbuy.com pnpm build

# Production build
NODE_ENV=production NEXT_PUBLIC_API_URL=https://api.citadelbuy.com pnpm build
```

## Common Development Tasks

### Add a New Page

Using App Router:

```bash
# Create new route
mkdir -p src/app/my-page
touch src/app/my-page/page.tsx
```

```typescript
// src/app/my-page/page.tsx
export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
    </div>
  );
}
```

### Add a New Component

```bash
# Create component file
touch src/components/my-feature/MyComponent.tsx
```

```typescript
// src/components/my-feature/MyComponent.tsx
interface MyComponentProps {
  title: string;
}

export function MyComponent({ title }: MyComponentProps) {
  return <div>{title}</div>;
}
```

### Add a New API Service

```typescript
// src/services/my-api.ts
import { apiClient } from './api-client';

export const myApi = {
  async getData() {
    const response = await apiClient.get('/my-endpoint');
    return response.data;
  },

  async postData(data: MyData) {
    const response = await apiClient.post('/my-endpoint', data);
    return response.data;
  }
};
```

### Create a Custom Hook

```typescript
// src/hooks/useMyFeature.ts
import { useState, useEffect } from 'react';

export function useMyFeature() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data
    fetchData().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
```

### Add a Zustand Store

```typescript
// src/stores/my-store.ts
import { create } from 'zustand';

interface MyState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useMyStore = create<MyState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 }))
}));
```

### Add Environment Variable

1. Add to `.env.example` with documentation
2. Add to `.env.local`
3. For public variables, prefix with `NEXT_PUBLIC_`
4. Access in code: `process.env.NEXT_PUBLIC_MY_VAR`

### Update Tailwind Configuration

```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#...',
          // ...
        }
      }
    }
  }
};
```

### Add a New shadcn/ui Component

```bash
# Install component from shadcn/ui
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
```

### Optimize Images

Use Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src="/product.jpg"
  alt="Product"
  width={500}
  height={500}
  priority
/>
```

## Project Structure

```
apps/web/
├── public/                   # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Auth route group
│   │   ├── (shop)/         # Shopping route group
│   │   ├── account/        # Account pages
│   │   ├── admin/          # Admin pages
│   │   ├── org/            # Organization pages
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── providers.tsx   # Global providers
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   ├── layout/        # Layout components
│   │   ├── product/       # Product components
│   │   ├── cart/          # Cart components
│   │   ├── checkout/      # Checkout components
│   │   └── [feature]/     # Feature components
│   ├── hooks/             # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   └── ...
│   ├── stores/            # Zustand stores
│   │   ├── authStore.ts
│   │   ├── cartStore.ts
│   │   └── ...
│   ├── services/          # API services
│   │   ├── api-client.ts
│   │   ├── auth-api.ts
│   │   └── ...
│   ├── lib/              # Utilities
│   │   ├── utils.ts      # Helper functions
│   │   └── cn.ts         # Class name utility
│   ├── styles/           # Global styles
│   │   └── globals.css
│   └── types/            # TypeScript types
├── e2e/                  # E2E tests
│   ├── auth.spec.ts
│   ├── checkout.spec.ts
│   └── ...
├── .env.example          # Environment template
├── .env.local           # Local environment (gitignored)
├── next.config.js       # Next.js configuration
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
├── playwright.config.ts # Playwright configuration
├── package.json
└── README.md
```

## Troubleshooting

### Port Already in Use

Change the port:
```bash
pnpm dev -p 3001
```

### Build Errors

Clear Next.js cache:
```bash
rm -rf .next
pnpm build
```

### TypeScript Errors

Restart TypeScript server in your editor, or:
```bash
pnpm type-check
```

### Module Not Found

Clear node_modules and reinstall:
```bash
rm -rf node_modules .next
pnpm install
```

### Environment Variables Not Loading

1. Ensure file is named `.env.local`
2. Restart development server
3. Verify variables are prefixed with `NEXT_PUBLIC_` for client-side access

### Styling Issues

Clear Tailwind cache:
```bash
rm -rf .next
pnpm dev
```

### API Connection Issues

1. Verify backend is running:
   ```bash
   curl http://localhost:4000/api/health
   ```

2. Check `NEXT_PUBLIC_API_URL` in `.env.local`

3. Check browser console for CORS errors

### Image Optimization Issues

If images aren't loading:
1. Check image paths are correct
2. Verify `next.config.js` image domains
3. Ensure source images exist

### React Query DevTools Not Showing

Add to root layout:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In providers
<ReactQueryDevtools initialIsOpen={false} />
```

### WebSocket Connection Issues

1. Verify WebSocket URL in `.env.local`
2. Check backend WebSocket server is running
3. Check browser console for connection errors

## Performance Optimization

### Image Optimization

- Use Next.js `<Image>` component
- Specify width and height
- Use `priority` for above-fold images
- Consider `loading="lazy"` for below-fold

### Code Splitting

- Use dynamic imports for large components:
  ```typescript
  const HeavyComponent = dynamic(() => import('./HeavyComponent'));
  ```

### Bundle Size

- Analyze bundle: `ANALYZE=true pnpm build`
- Tree-shake unused code
- Lazy load routes and components
- Use external CDNs for large libraries

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Playwright Documentation](https://playwright.dev)

## Support

For issues and questions:

- Create an issue on GitHub
- Check the documentation
- Review the Storybook (if available)
- Contact the development team

## License

[Your License Here]
