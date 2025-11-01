# CitadelBuy Frontend - Complete Code Implementation
## Next.js 14 with TypeScript

## Project Structure
```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   ├── components/            # React components
│   ├── lib/                   # Core utilities
│   ├── hooks/                 # Custom hooks
│   ├── stores/                # State management
│   ├── types/                 # TypeScript types
│   └── styles/                # Global styles
├── public/                    # Static assets
└── tests/                     # Test files
```

---

## 1. Core Configuration Files

### `package.json`
```json
{
  "name": "citadelbuy-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "18.3.0",
    "react-dom": "18.3.0",
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.5.2",
    "axios": "^1.6.8",
    "zod": "^3.22.4",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.4",
    "stripe": "^14.21.0",
    "@stripe/stripe-js": "^3.0.10",
    "framer-motion": "^11.0.24",
    "lucide-react": "^0.358.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.2",
    "class-variance-authority": "^0.7.0",
    "react-hot-toast": "^2.4.1",
    "sharp": "^0.33.3"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "eslint": "^8",
    "eslint-config-next": "14.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8",
    "autoprefixer": "^10.0.1",
    "@playwright/test": "^1.42.1",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.2.2",
    "@testing-library/jest-dom": "^6.4.2"
  }
}
```

### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.azureedge.net',
      },
      {
        protocol: 'https',
        hostname: '**.blob.core.windows.net',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## 2. TypeScript Types

### `src/types/api.types.ts`
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId: string;
  duration: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}
```

### `src/types/models.types.ts`
```typescript
export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: Category;
  subcategory?: string;
  price: Price;
  inventory: Inventory;
  images: ProductImage[];
  specifications: Record<string, any>;
  metadata: ProductMetadata;
  seo: SEOMetadata;
  status: ProductStatus;
  featured: boolean;
  ratings: Ratings;
  tags: string[];
  variants?: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Price {
  amount: number;
  currency: string;
  discountPrice?: number;
  discountPercentage?: number;
  compareAtPrice?: number;
  taxIncluded: boolean;
}

export interface Inventory {
  quantity: number;
  lowStockThreshold: number;
  warehouse: string;
  sku: string;
  trackInventory: boolean;
  allowBackorder: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  isPrimary: boolean;
  order: number;
}

export interface ProductMetadata {
  brand: string;
  weight: number;
  dimensions: Dimensions;
  material?: string;
  color?: string;
  size?: string;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface Ratings {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: Record<string, string>;
  price: Price;
  inventory: Inventory;
  sku: string;
}

export type ProductStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  level: number;
  order: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerInfo;
  items: OrderItem[];
  shipping: ShippingInfo;
  billing: BillingInfo;
  payment: PaymentInfo;
  pricing: OrderPricing;
  status: OrderStatus;
  notes?: string;
  trackingInfo?: TrackingInfo;
  history: OrderHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  discountAmount: number;
  total: number;
}

export interface ShippingInfo {
  method: string;
  cost: number;
  address: Address;
  estimatedDelivery?: Date;
  trackingNumber?: string;
  carrier?: string;
}

export interface BillingInfo {
  address: Address;
  sameAsShipping: boolean;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  last4?: string;
  brand?: string;
  paidAt?: Date;
}

export type PaymentMethod = 'credit_card' | 'paypal' | 'stripe' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface OrderPricing {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  url: string;
  status: string;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
}

export interface OrderHistoryEntry {
  id: string;
  status: OrderStatus;
  timestamp: Date;
  description: string;
  updatedBy?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  addresses: Address[];
  preferences: UserPreferences;
  loyaltyPoints: number;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'customer' | 'vendor' | 'admin' | 'super_admin';

export interface UserPreferences {
  language: string;
  currency: string;
  newsletter: boolean;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  verified: boolean;
  helpful: number;
  createdAt: Date;
}

export interface Wishlist {
  id: string;
  userId: string;
  items: Product[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. API Client

### `src/lib/api-client.ts`
```typescript
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { ApiResponse, ApiError } from '@/types/api.types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Add correlation ID for tracing
        config.headers['X-Correlation-ID'] = this.generateCorrelationId();

        // Add timestamp
        config.headers['X-Request-Time'] = new Date().toISOString();

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          }
        }

        // Handle 429 Too Many Requests
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          console.warn(`Rate limited. Retry after ${retryAfter}s`);
        }

        // Transform error
        const apiError: ApiError = {
          code: error.response?.data?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.message || error.message,
          statusCode: error.response?.status || 500,
          details: error.response?.data?.details,
        };

        return Promise.reject(apiError);
      }
    );
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data.data as T;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data as T;
  }

  // Upload with progress
  async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
    return response.data.data as T;
  }
}

export const apiClient = new ApiClient();
```

### `src/lib/query-provider.tsx`
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 2,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

---

## 4. State Management (Zustand)

### `src/stores/auth.store.ts`
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types/models.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user, token) => {
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'citadelbuy-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### `src/stores/cart.store.ts`
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product, ProductVariant } from '@/types/models.types';
import toast from 'react-hot-toast';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  
  // Actions
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  
  // Computed
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (productId: string, variantId?: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1, variant) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) =>
              item.product.id === product.id &&
              item.selectedVariant?.id === variant?.id
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += quantity;
            
            toast.success(`Added ${quantity} more to cart`);
            return { items: newItems, isOpen: true };
          }

          toast.success(`${product.name} added to cart`);
          return {
            items: [
              ...state.items,
              {
                product,
                quantity,
                selectedVariant: variant,
              },
            ],
            isOpen: true,
          };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => {
          const item = state.items.find(
            (item) =>
              item.product.id === productId &&
              item.selectedVariant?.id === variantId
          );
          
          if (item) {
            toast.success(`${item.product.name} removed from cart`);
          }

          return {
            items: state.items.filter(
              (item) =>
                !(
                  item.product.id === productId &&
                  item.selectedVariant?.id === variantId
                )
            ),
          };
        });
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId &&
            item.selectedVariant?.id === variantId
              ? { ...item, quantity }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], isOpen: false });
        toast.success('Cart cleared');
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const price =
            item.selectedVariant?.price.amount ||
            item.product.price.discountPrice ||
            item.product.price.amount;
          return total + price * item.quantity;
        }, 0);
      },

      getItemQuantity: (productId, variantId) => {
        const item = get().items.find(
          (item) =>
            item.product.id === productId &&
            item.selectedVariant?.id === variantId
        );
        return item?.quantity || 0;
      },
    }),
    {
      name: 'citadelbuy-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### `src/stores/ui.store.ts`
```typescript
import { create } from 'zustand';

interface UIState {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  isFiltersOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  toggleMobileMenu: () => void;
  toggleSearch: () => void;
  toggleFilters: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  isFiltersOpen: false,
  theme: 'light',

  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  toggleSearch: () =>
    set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  toggleFilters: () =>
    set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),

  setTheme: (theme) => set({ theme }),

  closeAll: () =>
    set({
      isMobileMenuOpen: false,
      isSearchOpen: false,
      isFiltersOpen: false,
    }),
}));
```

---

## 5. Custom Hooks

### `src/hooks/useProducts.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Product,
  PaginatedResponse,
  QueryParams,
} from '@/types';
import toast from 'react-hot-toast';

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiClient.get<Product>(`/api/products/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProducts(params: QueryParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      return apiClient.get<PaginatedResponse<Product>>(
        `/api/products?${searchParams.toString()}`
      );
    },
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => apiClient.get<Product[]>('/api/products/featured'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useProductsByCategory(categorySlug: string, params: QueryParams = {}) {
  return useQuery({
    queryKey: ['products', 'category', categorySlug, params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      return apiClient.get<PaginatedResponse<Product>>(
        `/api/categories/${categorySlug}/products?${searchParams.toString()}`
      );
    },
    enabled: !!categorySlug,
    keepPreviousData: true,
  });
}

export function useRecommendedProducts(productId: string) {
  return useQuery({
    queryKey: ['products', 'recommendations', productId],
    queryFn: () =>
      apiClient.get<Product[]>(`/api/products/${productId}/recommendations`),
    enabled: !!productId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Product>>(`/api/products/search?q=${query}`),
    enabled: query.length >= 3,
    staleTime: 2 * 60 * 1000,
  });
}

// Admin mutations
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      apiClient.post<Product>('/api/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      apiClient.put<Product>(`/api/products/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });
}
```

### `src/hooks/useOrders.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Order, PaginatedResponse, QueryParams } from '@/types';
import toast from 'react-hot-toast';

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.get<Order>(`/api/orders/${orderId}`),
    enabled: !!orderId,
  });
}

export function useOrders(params: QueryParams = {}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      return apiClient.get<PaginatedResponse<Order>>(
        `/api/orders?${searchParams.toString()}`
      );
    },
    keepPreviousData: true,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.post<Order>('/api/orders', data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order #${order.orderNumber} placed successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order');
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      apiClient.post(`/api/orders/${orderId}/cancel`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel order');
    },
  });
}
```

### `src/hooks/useAuth.ts`
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { User } from '@/types/models.types';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export function useLogin() {
  const { setUser } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiClient.post<AuthResponse>('/api/auth/login', credentials),
    onSuccess: (data) => {
      setUser(data.user, data.token);
      toast.success('Welcome back!');
      router.push('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Login failed');
    },
  });
}

export function useRegister() {
  const { setUser } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterData) =>
      apiClient.post<AuthResponse>('/api/auth/register', data),
    onSuccess: (data) => {
      setUser(data.user, data.token);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Registration failed');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post('/api/auth/logout'),
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast.success('Logged out successfully');
      router.push('/');
    },
  });
}

export function useCurrentUser() {
  const { user, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['user', 'current'],
    queryFn: () => apiClient.get<User>('/api/auth/me'),
    enabled: isAuthenticated && !user,
    retry: false,
  });
}
```

---

Continue to Part 2 for App Router pages and components...
