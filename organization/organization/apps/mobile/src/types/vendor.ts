/**
 * Vendor-specific types
 */

import { Product, Order, OrderStatus } from './api';

export interface VendorProfile {
  id: string;
  userId: string;
  businessName: string;
  businessDescription?: string;
  logo?: string;
  banner?: string;
  email: string;
  phone?: string;
  address?: VendorAddress;
  rating: number;
  reviewCount: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  commission: number; // Platform commission percentage
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface VendorDashboardStats {
  totalRevenue: number;
  revenueChange: number; // Percentage change from previous period
  totalOrders: number;
  ordersChange: number;
  totalProducts: number;
  productsChange: number;
  averageOrderValue: number;
  averageOrderValueChange: number;
  pendingOrders: number;
  lowStockProducts: number;
  period: 'today' | 'week' | 'month' | 'year';
}

export interface VendorOrder extends Order {
  vendorId: string;
  commission: number;
  vendorPayout: number;
  payoutStatus: 'pending' | 'processing' | 'completed' | 'failed';
  payoutDate?: string;
}

export interface VendorProduct extends Product {
  vendorId: string;
  cost: number; // Cost to vendor
  profit: number; // Profit per unit
  views: number;
  clicks: number;
  conversionRate: number;
  lastRestocked?: string;
}

export interface VendorOrderFilter {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface VendorProductFilter {
  category?: string;
  status?: 'active' | 'inactive' | 'out_of_stock';
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'stock' | 'sales' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface VendorAnalytics {
  period: 'week' | 'month' | 'year';
  revenue: AnalyticsDataPoint[];
  orders: AnalyticsDataPoint[];
  products: ProductPerformance[];
  categories: CategoryPerformance[];
  customers: CustomerAnalytics;
}

export interface AnalyticsDataPoint {
  label: string; // Date or period label
  value: number;
  change?: number; // Percentage change from previous period
}

export interface ProductPerformance {
  product: VendorProduct;
  revenue: number;
  sales: number;
  views: number;
  conversionRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  revenue: number;
  sales: number;
  productCount: number;
  percentage: number; // Percentage of total revenue
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageOrderValue: number;
  topCustomers: TopCustomer[];
}

export interface TopCustomer {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
}

export interface VendorNotification {
  id: string;
  type: VendorNotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

export type VendorNotificationType =
  | 'NEW_ORDER'
  | 'ORDER_CANCELLED'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'PRODUCT_REVIEW'
  | 'PAYOUT_PROCESSED'
  | 'PAYOUT_FAILED'
  | 'ACCOUNT_UPDATE'
  | 'SYSTEM_ALERT';

export interface VendorPayoutSettings {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  payoutSchedule: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  minimumPayout: number;
}

export interface VendorPayout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  orders: string[]; // Order IDs included in this payout
  scheduledDate: string;
  processedDate?: string;
  failureReason?: string;
  createdAt: string;
}

export interface InventoryUpdate {
  productId: string;
  stock: number;
  restockDate?: string;
  notes?: string;
}

export interface BulkOrderUpdate {
  orderIds: string[];
  status: OrderStatus;
  trackingNumber?: string;
  notes?: string;
}
