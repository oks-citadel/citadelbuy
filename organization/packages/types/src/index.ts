/**
 * Broxiva Shared Types
 * Type definitions shared across all applications and services
 */

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'customer' | 'vendor' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface UserProfile extends User {
  phone?: string;
  dateOfBirth?: Date;
  preferences: UserPreferences;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
}

export interface UserPreferences {
  language: string;
  currency: string;
  notifications: NotificationPreferences;
  theme: 'light' | 'dark' | 'system';
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  priceAlerts: boolean;
}

// ============================================
// Product Types
// ============================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;
  price: Price;
  images: ProductImage[];
  category: Category;
  vendor: Vendor;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  inventory: InventoryInfo;
  rating: ProductRating;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Price {
  amount: number;
  currency: string;
  compareAt?: number;
  discount?: Discount;
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
  validFrom?: Date;
  validUntil?: Date;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductAttribute {
  name: string;
  value: string;
  type: 'text' | 'color' | 'size' | 'material';
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: Price;
  attributes: ProductAttribute[];
  inventory: InventoryInfo;
  images: ProductImage[];
}

export interface InventoryInfo {
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
}

export interface ProductRating {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'archived';

// ============================================
// Category Types
// ============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  level: number;
  path: string[];
  productCount: number;
}

// ============================================
// Order Types
// ============================================

export interface Order {
  id: string;
  orderNumber: string;
  user: User;
  items: OrderItem[];
  status: OrderStatus;
  payment: PaymentInfo;
  shipping: ShippingInfo;
  billing: BillingInfo;
  totals: OrderTotals;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: Price;
  total: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
}

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface ShippingInfo {
  method: ShippingMethod;
  address: Address;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface BillingInfo {
  address: Address;
  taxId?: string;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
}

// ============================================
// Cart Types
// ============================================

export interface Cart {
  id: string;
  userId?: string;
  sessionId: string;
  items: CartItem[];
  totals: CartTotals;
  coupon?: Coupon;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: Price;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
}

// ============================================
// Address Types
// ============================================

export interface Address {
  id: string;
  type: 'shipping' | 'billing';
  firstName: string;
  lastName: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

// ============================================
// Payment Types
// ============================================

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank' | 'bnpl';
  provider: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: number;
  carrier: string;
}

// ============================================
// Vendor Types
// ============================================

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  rating: VendorRating;
  status: VendorStatus;
  commission: number;
  user: User;
  settings: VendorSettings;
  createdAt: Date;
}

export interface VendorRating {
  average: number;
  count: number;
  responseTime: number;
  fulfillmentRate: number;
}

export type VendorStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

export interface VendorSettings {
  autoApproveProducts: boolean;
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  minPayoutAmount: number;
  notifications: NotificationPreferences;
}

// ============================================
// Review Types
// ============================================

export interface Review {
  id: string;
  user: User;
  product: Product;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  verified: boolean;
  helpful: number;
  createdAt: Date;
}

// ============================================
// AI Types
// ============================================

export interface Recommendation {
  productId: string;
  score: number;
  reason: string;
  category: string;
}

export interface SearchResult {
  productId: string;
  name: string;
  score: number;
  highlights: string[];
}

export interface FraudScore {
  transactionId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'approve' | 'review' | 'reject';
  factors: FraudFactor[];
}

export interface FraudFactor {
  name: string;
  score: number;
  description: string;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Event Types
// ============================================

export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_start'
  | 'checkout_complete'
  | 'search'
  | 'filter'
  | 'wishlist_add'
  | 'wishlist_remove';
