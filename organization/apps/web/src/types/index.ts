// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  phone?: string;
  phoneVerified?: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
  addresses?: Address[];
  loyaltyPoints?: number;
  membershipTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export interface UserPreferences {
  language: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  personalization: PersonalizationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  orderUpdates: boolean;
  priceDrops: boolean;
  recommendations: boolean;
}

export interface PersonalizationPreferences {
  showRecommendations: boolean;
  enableVoiceSearch: boolean;
  enableVisualSearch: boolean;
  enableAR: boolean;
}

export interface Address {
  id: string;
  type: 'SHIPPING' | 'BILLING';
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

// Product Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency: string;
  images: ProductImage[];
  category: Category;
  subcategory?: Category;
  brand?: Brand;
  vendor: Vendor;
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
  tags: string[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  inventory: InventoryInfo;
  rating: number;
  reviewCount: number;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  aiMetadata?: ProductAIMetadata;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  position: number;
  width?: number;
  height?: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  options: VariantOption[];
  inventory: InventoryInfo;
  image?: ProductImage;
}

export interface VariantOption {
  name: string;
  value: string;
}

export interface ProductAttribute {
  name: string;
  value: string;
  unit?: string;
}

export interface ProductAIMetadata {
  embeddings?: number[];
  visualFeatures?: string[];
  styleAttributes?: string[];
  colorPalette?: string[];
  recommendationScore?: number;
  trendScore?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  productCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
}

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
}

export interface InventoryInfo {
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'BACKORDER';
}

// Cart Types
export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  couponCode?: string;
  estimatedDelivery?: string;
  savedForLater: CartItem[];
  recommendations?: Product[];
}

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  total: number;
  addedAt: string;
}

// Order Types
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod: ShippingMethod;
  tracking?: TrackingInfo;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'RETURNED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
}

export interface PaymentMethod {
  id: string;
  type: 'CARD' | 'PAYPAL' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'BANK_TRANSFER' | 'BNPL';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  carrier: string;
}

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  events: TrackingEvent[];
  estimatedDelivery?: string;
}

export interface TrackingEvent {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
}

// Review Types
export interface Review {
  id: string;
  productId: string;
  userId: string;
  user: {
    name: string;
    avatar?: string;
  };
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
  response?: {
    content: string;
    createdAt: string;
  };
  aiAnalysis?: {
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    topics: string[];
    summary?: string;
  };
}

// Search & Filter Types
export interface SearchParams {
  query?: string;
  category?: string;
  brand?: string[];
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  inStock?: boolean;
  sortBy?: SortOption;
  page?: number;
  limit?: number;
  filters?: Record<string, string[]>;
}

export type SortOption =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'newest'
  | 'bestselling'
  | 'trending';

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: SearchFacet[];
  suggestions?: string[];
  aiSuggestions?: AISearchSuggestion[];
}

export interface SearchFacet {
  name: string;
  label: string;
  type: 'checkbox' | 'range' | 'color' | 'size';
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface AISearchSuggestion {
  type: 'query' | 'category' | 'product' | 'brand';
  text: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

// AI Feature Types
export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  products: Product[];
  reason?: string;
  confidence: number;
}

export type RecommendationType =
  | 'PERSONALIZED'
  | 'SIMILAR'
  | 'FREQUENTLY_BOUGHT_TOGETHER'
  | 'TRENDING'
  | 'NEW_ARRIVALS'
  | 'RECENTLY_VIEWED'
  | 'CROSS_SELL'
  | 'UPSELL'
  | 'COMPLETE_THE_LOOK';

export interface VisualSearchResult {
  products: Product[];
  confidence: number;
  detectedObjects?: DetectedObject[];
  styleMatch?: StyleMatch;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface StyleMatch {
  style: string;
  colors: string[];
  patterns: string[];
  occasion: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    products?: Product[];
    actions?: ChatAction[];
    suggestions?: string[];
  };
}

export interface ChatAction {
  type: 'ADD_TO_CART' | 'VIEW_PRODUCT' | 'SEARCH' | 'NAVIGATE' | 'COMPARE';
  label: string;
  payload: Record<string, unknown>;
}

export interface VirtualTryOnResult {
  imageUrl: string;
  productId: string;
  confidence: number;
  fitRecommendation?: FitRecommendation;
}

export interface FitRecommendation {
  recommendedSize: string;
  confidence: number;
  fitNotes: string[];
  measurementGuide?: {
    chest?: string;
    waist?: string;
    hips?: string;
    length?: string;
  };
}

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type NotificationType =
  | 'ORDER_UPDATE'
  | 'PRICE_DROP'
  | 'BACK_IN_STOCK'
  | 'RECOMMENDATION'
  | 'PROMOTION'
  | 'REVIEW_REQUEST'
  | 'LOYALTY'
  | 'SYSTEM';

// Loyalty Types
export interface LoyaltyProgram {
  userId: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  points: number;
  lifetimePoints: number;
  nextTierPoints?: number;
  benefits: LoyaltyBenefit[];
  history: LoyaltyTransaction[];
  expiringPoints?: {
    points: number;
    expiresAt: string;
  };
}

export interface LoyaltyBenefit {
  id: string;
  name: string;
  description: string;
  type: 'DISCOUNT' | 'FREE_SHIPPING' | 'EARLY_ACCESS' | 'EXCLUSIVE' | 'POINTS_MULTIPLIER';
  value?: number;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED';
  points: number;
  description: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// Pagination Types
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
