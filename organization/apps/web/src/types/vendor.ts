// Vendor Dashboard Types

// Ad Campaign Types
export interface AdCampaign {
  id: string;
  name: string;
  type: AdCampaignType;
  status: AdCampaignStatus;
  budget: CampaignBudget;
  targeting: AudienceTargeting;
  schedule: CampaignSchedule;
  creatives: AdCreative[];
  products: string[]; // Product IDs
  metrics: CampaignMetrics;
  aiOptimization: AIOptimizationSettings;
  createdAt: string;
  updatedAt: string;
}

export type AdCampaignType =
  | 'SPONSORED_PRODUCT'
  | 'DISPLAY_AD'
  | 'FEATURED_LISTING'
  | 'BRAND_SHOWCASE'
  | 'FLASH_SALE'
  | 'RETARGETING';

export type AdCampaignStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'REJECTED';

export interface CampaignBudget {
  type: 'DAILY' | 'LIFETIME';
  amount: number;
  spent: number;
  currency: string;
  bidStrategy: 'MANUAL_CPC' | 'AUTO_OPTIMIZE' | 'TARGET_ROAS' | 'MAXIMIZE_CLICKS';
  maxBid?: number;
}

export interface AudienceTargeting {
  id?: string;
  name?: string;
  demographics: DemographicTargeting;
  interests: string[];
  behaviors: BehaviorTargeting;
  locations: LocationTargeting[];
  devices: DeviceTargeting;
  customAudiences: string[];
  lookalikes: LookalikeAudience[];
  excludedAudiences: string[];
  estimatedReach?: number;
}

export interface DemographicTargeting {
  ageMin?: number;
  ageMax?: number;
  genders: ('MALE' | 'FEMALE' | 'OTHER')[];
  incomeLevel?: ('LOW' | 'MEDIUM' | 'HIGH' | 'PREMIUM')[];
  education?: string[];
  occupation?: string[];
}

export interface BehaviorTargeting {
  purchaseHistory: PurchaseHistoryFilter[];
  browsingBehavior: BrowsingBehaviorFilter[];
  engagementLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  cartAbandoners?: boolean;
  recentBuyers?: boolean;
  loyalCustomers?: boolean;
}

export interface PurchaseHistoryFilter {
  category?: string;
  priceRange?: { min: number; max: number };
  frequency?: 'ONCE' | 'OCCASIONAL' | 'FREQUENT';
  recency?: number; // Days since last purchase
}

export interface BrowsingBehaviorFilter {
  category?: string;
  viewedProducts?: string[];
  searchTerms?: string[];
  timeSpent?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface LocationTargeting {
  type: 'COUNTRY' | 'STATE' | 'CITY' | 'POSTAL_CODE' | 'RADIUS';
  value: string;
  radius?: number; // km for RADIUS type
}

export interface DeviceTargeting {
  types: ('MOBILE' | 'TABLET' | 'DESKTOP')[];
  os?: ('IOS' | 'ANDROID' | 'WINDOWS' | 'MAC')[];
  browsers?: string[];
}

export interface LookalikeAudience {
  sourceAudienceId: string;
  similarityLevel: number; // 1-10
  estimatedSize: number;
}

export interface CampaignSchedule {
  startDate: string;
  endDate?: string;
  timezone: string;
  dayParting?: DayPartingSchedule[];
}

export interface DayPartingSchedule {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  startHour: number;
  endHour: number;
}

export interface AdCreative {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'HTML5';
  title: string;
  description?: string;
  assets: CreativeAsset[];
  callToAction: string;
  landingUrl: string;
  status: 'ACTIVE' | 'PAUSED' | 'REJECTED';
  metrics?: CreativeMetrics;
}

export interface CreativeAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  width?: number;
  height?: number;
  duration?: number; // seconds for video
  alt?: string;
}

export interface CreativeMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
  spend: number;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
  spend: number;
  revenue: number;
  roas: number;
  cpc: number;
  cpa: number;
  addToCart: number;
  purchases: number;
  dailyBreakdown: DailyMetrics[];
}

export interface DailyMetrics {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
}

export interface AIOptimizationSettings {
  enabled: boolean;
  autoAdjustBids: boolean;
  autoAdjustBudget: boolean;
  autoOptimizeCreatives: boolean;
  targetMetric: 'ROAS' | 'CPA' | 'CTR' | 'CONVERSIONS';
  targetValue?: number;
  recommendations: AIRecommendation[];
}

export interface AIRecommendation {
  id: string;
  type: 'BID' | 'BUDGET' | 'CREATIVE' | 'TARGETING' | 'SCHEDULE';
  title: string;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedImprovement?: number;
  actionData?: Record<string, unknown>;
  applied: boolean;
  createdAt: string;
}

// Pricing & Dynamic Pricing Types
export interface PricingRule {
  id: string;
  name: string;
  type: PricingRuleType;
  status: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';
  products: string[];
  categories: string[];
  conditions: PricingCondition[];
  action: PricingAction;
  priority: number;
  schedule?: PricingSchedule;
  aiEnabled: boolean;
  metrics?: PricingMetrics;
  createdAt: string;
  updatedAt: string;
}

export type PricingRuleType =
  | 'DYNAMIC'
  | 'COMPETITOR_MATCH'
  | 'DEMAND_BASED'
  | 'TIME_BASED'
  | 'INVENTORY_BASED'
  | 'BUNDLE'
  | 'TIERED';

export interface PricingCondition {
  type: 'INVENTORY' | 'DEMAND' | 'COMPETITOR' | 'TIME' | 'CUSTOMER_SEGMENT' | 'CART_VALUE';
  operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'BETWEEN' | 'IN';
  value: number | string | string[];
  secondValue?: number | string; // For BETWEEN operator
}

export interface PricingAction {
  type: 'PERCENTAGE_DISCOUNT' | 'FIXED_DISCOUNT' | 'SET_PRICE' | 'COMPETITOR_BASED';
  value: number;
  minPrice?: number;
  maxPrice?: number;
  roundTo?: number; // Round to nearest value (e.g., 0.99)
}

export interface PricingSchedule {
  startDate: string;
  endDate: string;
  recurrence?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  daysOfWeek?: number[];
  hoursOfDay?: { start: number; end: number };
}

export interface PricingMetrics {
  revenue: number;
  revenueChange: number;
  unitsSold: number;
  unitsSoldChange: number;
  avgOrderValue: number;
  avgOrderValueChange: number;
  conversionRate: number;
  conversionRateChange: number;
}

export interface CompetitorPrice {
  competitorId: string;
  competitorName: string;
  productId: string;
  price: number;
  currency: string;
  inStock: boolean;
  lastChecked: string;
  priceHistory: { date: string; price: number }[];
}

export interface DynamicPricingInsight {
  productId: string;
  currentPrice: number;
  suggestedPrice: number;
  priceFloor: number;
  priceCeiling: number;
  demandScore: number;
  competitorAvgPrice: number;
  inventoryLevel: number;
  confidence: number;
  reason: string;
  estimatedImpact: {
    revenueChange: number;
    unitsSoldChange: number;
    marginChange: number;
  };
}

// Sales Analytics Types
export interface SalesAnalytics {
  summary: SalesSummary;
  trends: SalesTrend[];
  topProducts: TopProduct[];
  categoryBreakdown: CategorySales[];
  customerInsights: CustomerInsights;
  predictions: SalesPrediction[];
}

export interface SalesSummary {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  avgOrderValue: number;
  aovChange: number;
  unitsSold: number;
  unitsSoldChange: number;
  grossMargin: number;
  marginChange: number;
  period: 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
}

export interface SalesTrend {
  date: string;
  revenue: number;
  orders: number;
  unitsSold: number;
  avgOrderValue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  productImage: string;
  revenue: number;
  unitsSold: number;
  growth: number;
  margin: number;
  stockLevel: number;
}

export interface CategorySales {
  categoryId: string;
  categoryName: string;
  revenue: number;
  revenueShare: number;
  unitsSold: number;
  growth: number;
}

export interface CustomerInsights {
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
  customerLifetimeValue: number;
  topCustomerSegments: CustomerSegment[];
}

export interface CustomerSegment {
  name: string;
  count: number;
  revenue: number;
  avgOrderValue: number;
}

export interface SalesPrediction {
  date: string;
  predictedRevenue: number;
  predictedOrders: number;
  confidence: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description: string;
}

// Fraud Detection Types
export interface FraudAlert {
  id: string;
  type: FraudAlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  orderId?: string;
  customerId?: string;
  description: string;
  riskScore: number;
  indicators: FraudIndicator[];
  recommendedActions: string[];
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}

export type FraudAlertType =
  | 'SUSPICIOUS_ORDER'
  | 'UNUSUAL_ACTIVITY'
  | 'PAYMENT_FRAUD'
  | 'ACCOUNT_TAKEOVER'
  | 'PROMO_ABUSE'
  | 'RETURN_FRAUD'
  | 'SELLER_FRAUD';

export interface FraudIndicator {
  name: string;
  value: string;
  weight: number;
  description: string;
}

export interface FraudStats {
  totalAlerts: number;
  pendingReview: number;
  resolvedThisMonth: number;
  falsePositiveRate: number;
  avgResolutionTime: number;
  fraudPreventedValue: number;
  alertsByType: { type: FraudAlertType; count: number }[];
  alertsBySeverity: { severity: string; count: number }[];
  recentTrend: { date: string; alerts: number }[];
}

// Email Automation Types
export interface EmailCampaign {
  id: string;
  name: string;
  type: EmailCampaignType;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  trigger?: EmailTrigger;
  audience: EmailAudience;
  content: EmailContent;
  schedule?: EmailSchedule;
  abTest?: ABTestConfig;
  metrics?: EmailMetrics;
  createdAt: string;
  updatedAt: string;
}

export type EmailCampaignType =
  | 'WELCOME'
  | 'PROMOTIONAL'
  | 'ABANDONED_CART'
  | 'ORDER_FOLLOW_UP'
  | 'WIN_BACK'
  | 'PRODUCT_LAUNCH'
  | 'NEWSLETTER'
  | 'PERSONALIZED_RECOMMENDATIONS';

export interface EmailTrigger {
  type: 'SIGNUP' | 'CART_ABANDON' | 'PURCHASE' | 'BROWSE_ABANDON' | 'INACTIVITY' | 'BIRTHDAY' | 'CUSTOM';
  conditions: TriggerCondition[];
  delay?: number; // Minutes
  frequency?: 'ONCE' | 'RECURRING';
  maxSendsPerUser?: number;
}

export interface TriggerCondition {
  field: string;
  operator: 'EQ' | 'NEQ' | 'GT' | 'LT' | 'CONTAINS' | 'IN';
  value: string | number | string[];
}

export interface EmailAudience {
  type: 'ALL' | 'SEGMENT' | 'CUSTOM';
  segmentIds?: string[];
  filters?: AudienceFilter[];
  excludeFilters?: AudienceFilter[];
  estimatedSize?: number;
}

export interface AudienceFilter {
  field: string;
  operator: string;
  value: string | number | string[];
}

export interface EmailContent {
  subject: string;
  preheader?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  dynamicContent?: DynamicEmailContent[];
  aiGenerated?: boolean;
}

export interface DynamicEmailContent {
  placeholder: string;
  type: 'PRODUCT_RECOMMENDATIONS' | 'USER_NAME' | 'COUPON_CODE' | 'CUSTOM';
  config?: Record<string, unknown>;
}

export interface EmailSchedule {
  type: 'IMMEDIATE' | 'SCHEDULED' | 'OPTIMAL_TIME';
  scheduledAt?: string;
  timezone?: string;
}

export interface ABTestConfig {
  enabled: boolean;
  variants: ABVariant[];
  winnerCriteria: 'OPEN_RATE' | 'CLICK_RATE' | 'CONVERSION_RATE' | 'REVENUE';
  testDuration: number; // Hours
  testPercentage: number;
}

export interface ABVariant {
  id: string;
  name: string;
  subject?: string;
  content?: string;
  percentage: number;
  metrics?: {
    sent: number;
    opens: number;
    clicks: number;
    conversions: number;
  };
}

export interface EmailMetrics {
  sent: number;
  delivered: number;
  deliveryRate: number;
  opens: number;
  openRate: number;
  uniqueOpens: number;
  clicks: number;
  clickRate: number;
  uniqueClicks: number;
  unsubscribes: number;
  unsubscribeRate: number;
  bounces: number;
  bounceRate: number;
  complaints: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

// Vendor Dashboard Overview Types
export interface VendorDashboardData {
  overview: VendorOverview;
  recentOrders: VendorOrder[];
  alerts: DashboardAlert[];
  tasks: VendorTask[];
  quickStats: QuickStat[];
}

export interface VendorOverview {
  revenue: { value: number; change: number; trend: number[] };
  orders: { value: number; change: number; trend: number[] };
  visitors: { value: number; change: number; trend: number[] };
  conversionRate: { value: number; change: number; trend: number[] };
  avgOrderValue: { value: number; change: number };
  activeListings: { value: number; change: number };
  pendingOrders: { value: number; urgent: number };
  lowStockItems: { value: number; critical: number };
}

export interface VendorOrder {
  id: string;
  orderNumber: string;
  customer: string;
  total: number;
  status: string;
  items: number;
  createdAt: string;
}

export interface DashboardAlert {
  id: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS' | 'ERROR';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
}

export interface VendorTask {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  completed: boolean;
}

export interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  icon: string;
  color: string;
}

// Payout Types
export interface VendorPayout {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  method: 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE';
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  fees: number;
  netAmount: number;
  processedAt?: string;
  reference?: string;
}

export interface PayoutSchedule {
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  minimumAmount: number;
  nextPayoutDate: string;
  holdPeriod: number; // Days
}

export interface PayoutMethod {
  id: string;
  type: 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE';
  isDefault: boolean;
  details: Record<string, string>;
  verified: boolean;
}
