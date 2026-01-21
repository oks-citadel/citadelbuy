/**
 * Marketing Analytics Event Type Definitions
 *
 * Self-hosted analytics event types for tracking user behavior
 * without external dependencies (no Google Analytics, Mixpanel, etc.)
 */

// Core event types supported by the analytics system
export enum MarketingEventType {
  // Page and navigation events
  PAGE_VIEW = 'page_view',
  PAGE_LEAVE = 'page_leave',

  // Authentication events
  SIGNUP_STARTED = 'signup_started',
  SIGNUP_COMPLETED = 'signup_completed',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_RESET = 'password_reset',

  // Feature engagement events
  FEATURE_USED = 'feature_used',
  FEATURE_DISCOVERED = 'feature_discovered',
  FEATURE_ABANDONED = 'feature_abandoned',

  // Experiment/A-B testing events
  EXPERIMENT_ASSIGNED = 'experiment_assigned',
  EXPERIMENT_VIEWED = 'experiment_viewed',
  EXPERIMENT_CONVERTED = 'experiment_converted',

  // Conversion events
  CONVERSION = 'conversion',
  MICRO_CONVERSION = 'micro_conversion',
  GOAL_COMPLETED = 'goal_completed',

  // Subscription events
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPGRADED = 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED = 'subscription_downgraded',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_TRIAL_STARTED = 'subscription_trial_started',
  SUBSCRIPTION_TRIAL_ENDED = 'subscription_trial_ended',

  // Email engagement events
  EMAIL_SENT = 'email_sent',
  EMAIL_DELIVERED = 'email_delivered',
  EMAIL_OPENED = 'email_opened',
  EMAIL_CLICKED = 'email_clicked',
  EMAIL_BOUNCED = 'email_bounced',
  EMAIL_UNSUBSCRIBED = 'email_unsubscribed',
  EMAIL_COMPLAINED = 'email_complained',

  // E-commerce events
  PRODUCT_VIEWED = 'product_viewed',
  PRODUCT_ADDED_TO_CART = 'product_added_to_cart',
  PRODUCT_REMOVED_FROM_CART = 'product_removed_from_cart',
  CHECKOUT_STARTED = 'checkout_started',
  CHECKOUT_COMPLETED = 'checkout_completed',
  PURCHASE = 'purchase',
  REFUND = 'refund',

  // Search and discovery
  SEARCH_PERFORMED = 'search_performed',
  SEARCH_RESULT_CLICKED = 'search_result_clicked',
  FILTER_APPLIED = 'filter_applied',
  SORT_APPLIED = 'sort_applied',

  // Content engagement
  CONTENT_VIEWED = 'content_viewed',
  CONTENT_SHARED = 'content_shared',
  VIDEO_STARTED = 'video_started',
  VIDEO_COMPLETED = 'video_completed',

  // User feedback
  FEEDBACK_SUBMITTED = 'feedback_submitted',
  RATING_SUBMITTED = 'rating_submitted',
  REVIEW_SUBMITTED = 'review_submitted',
  NPS_SUBMITTED = 'nps_submitted',

  // Error and performance
  ERROR_OCCURRED = 'error_occurred',
  PERFORMANCE_METRIC = 'performance_metric',

  // Custom events
  CUSTOM = 'custom',
}

// Event categories for grouping and filtering
export enum EventCategory {
  NAVIGATION = 'navigation',
  AUTHENTICATION = 'authentication',
  ENGAGEMENT = 'engagement',
  CONVERSION = 'conversion',
  SUBSCRIPTION = 'subscription',
  EMAIL = 'email',
  ECOMMERCE = 'ecommerce',
  SEARCH = 'search',
  CONTENT = 'content',
  FEEDBACK = 'feedback',
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

// Map event types to categories
export const EVENT_CATEGORY_MAP: Record<MarketingEventType, EventCategory> = {
  [MarketingEventType.PAGE_VIEW]: EventCategory.NAVIGATION,
  [MarketingEventType.PAGE_LEAVE]: EventCategory.NAVIGATION,
  [MarketingEventType.SIGNUP_STARTED]: EventCategory.AUTHENTICATION,
  [MarketingEventType.SIGNUP_COMPLETED]: EventCategory.AUTHENTICATION,
  [MarketingEventType.LOGIN]: EventCategory.AUTHENTICATION,
  [MarketingEventType.LOGOUT]: EventCategory.AUTHENTICATION,
  [MarketingEventType.PASSWORD_RESET]: EventCategory.AUTHENTICATION,
  [MarketingEventType.FEATURE_USED]: EventCategory.ENGAGEMENT,
  [MarketingEventType.FEATURE_DISCOVERED]: EventCategory.ENGAGEMENT,
  [MarketingEventType.FEATURE_ABANDONED]: EventCategory.ENGAGEMENT,
  [MarketingEventType.EXPERIMENT_ASSIGNED]: EventCategory.ENGAGEMENT,
  [MarketingEventType.EXPERIMENT_VIEWED]: EventCategory.ENGAGEMENT,
  [MarketingEventType.EXPERIMENT_CONVERTED]: EventCategory.CONVERSION,
  [MarketingEventType.CONVERSION]: EventCategory.CONVERSION,
  [MarketingEventType.MICRO_CONVERSION]: EventCategory.CONVERSION,
  [MarketingEventType.GOAL_COMPLETED]: EventCategory.CONVERSION,
  [MarketingEventType.SUBSCRIPTION_CREATED]: EventCategory.SUBSCRIPTION,
  [MarketingEventType.SUBSCRIPTION_UPGRADED]: EventCategory.SUBSCRIPTION,
  [MarketingEventType.SUBSCRIPTION_DOWNGRADED]: EventCategory.SUBSCRIPTION,
  [MarketingEventType.SUBSCRIPTION_CANCELLED]: EventCategory.SUBSCRIPTION,
  [MarketingEventType.SUBSCRIPTION_RENEWED]: EventCategory.SUBSCRIPTION,
  [MarketingEventType.SUBSCRIPTION_TRIAL_STARTED]: EventCategory.SUBSCRIPTION,
  [MarketingEventType.SUBSCRIPTION_TRIAL_ENDED]: EventCategory.SUBSCRIPTION,
  [MarketingEventType.EMAIL_SENT]: EventCategory.EMAIL,
  [MarketingEventType.EMAIL_DELIVERED]: EventCategory.EMAIL,
  [MarketingEventType.EMAIL_OPENED]: EventCategory.EMAIL,
  [MarketingEventType.EMAIL_CLICKED]: EventCategory.EMAIL,
  [MarketingEventType.EMAIL_BOUNCED]: EventCategory.EMAIL,
  [MarketingEventType.EMAIL_UNSUBSCRIBED]: EventCategory.EMAIL,
  [MarketingEventType.EMAIL_COMPLAINED]: EventCategory.EMAIL,
  [MarketingEventType.PRODUCT_VIEWED]: EventCategory.ECOMMERCE,
  [MarketingEventType.PRODUCT_ADDED_TO_CART]: EventCategory.ECOMMERCE,
  [MarketingEventType.PRODUCT_REMOVED_FROM_CART]: EventCategory.ECOMMERCE,
  [MarketingEventType.CHECKOUT_STARTED]: EventCategory.ECOMMERCE,
  [MarketingEventType.CHECKOUT_COMPLETED]: EventCategory.ECOMMERCE,
  [MarketingEventType.PURCHASE]: EventCategory.ECOMMERCE,
  [MarketingEventType.REFUND]: EventCategory.ECOMMERCE,
  [MarketingEventType.SEARCH_PERFORMED]: EventCategory.SEARCH,
  [MarketingEventType.SEARCH_RESULT_CLICKED]: EventCategory.SEARCH,
  [MarketingEventType.FILTER_APPLIED]: EventCategory.SEARCH,
  [MarketingEventType.SORT_APPLIED]: EventCategory.SEARCH,
  [MarketingEventType.CONTENT_VIEWED]: EventCategory.CONTENT,
  [MarketingEventType.CONTENT_SHARED]: EventCategory.CONTENT,
  [MarketingEventType.VIDEO_STARTED]: EventCategory.CONTENT,
  [MarketingEventType.VIDEO_COMPLETED]: EventCategory.CONTENT,
  [MarketingEventType.FEEDBACK_SUBMITTED]: EventCategory.FEEDBACK,
  [MarketingEventType.RATING_SUBMITTED]: EventCategory.FEEDBACK,
  [MarketingEventType.REVIEW_SUBMITTED]: EventCategory.FEEDBACK,
  [MarketingEventType.NPS_SUBMITTED]: EventCategory.FEEDBACK,
  [MarketingEventType.ERROR_OCCURRED]: EventCategory.SYSTEM,
  [MarketingEventType.PERFORMANCE_METRIC]: EventCategory.SYSTEM,
  [MarketingEventType.CUSTOM]: EventCategory.CUSTOM,
};

// Default sampling rates for high-volume events
export const DEFAULT_SAMPLING_RATES: Partial<Record<MarketingEventType, number>> = {
  [MarketingEventType.PAGE_VIEW]: 1.0, // 100% - always track
  [MarketingEventType.PERFORMANCE_METRIC]: 0.1, // 10% sample
  [MarketingEventType.ERROR_OCCURRED]: 1.0, // 100% - always track errors
  [MarketingEventType.CONVERSION]: 1.0, // 100% - always track conversions
  [MarketingEventType.PURCHASE]: 1.0, // 100% - always track purchases
};

// Event schema definitions for validation
export const EVENT_SCHEMAS: Record<MarketingEventType, Record<string, string>> = {
  [MarketingEventType.PAGE_VIEW]: {
    url: 'string',
    title: 'string?',
    referrer: 'string?',
    duration: 'number?',
  },
  [MarketingEventType.PAGE_LEAVE]: {
    url: 'string',
    timeOnPage: 'number',
    scrollDepth: 'number?',
  },
  [MarketingEventType.SIGNUP_STARTED]: {
    source: 'string?',
    campaign: 'string?',
  },
  [MarketingEventType.SIGNUP_COMPLETED]: {
    userId: 'string',
    method: 'string?',
    source: 'string?',
  },
  [MarketingEventType.LOGIN]: {
    method: 'string?',
    success: 'boolean',
  },
  [MarketingEventType.LOGOUT]: {},
  [MarketingEventType.PASSWORD_RESET]: {
    success: 'boolean',
  },
  [MarketingEventType.FEATURE_USED]: {
    featureName: 'string',
    featureCategory: 'string?',
    value: 'any?',
  },
  [MarketingEventType.FEATURE_DISCOVERED]: {
    featureName: 'string',
    discoveryMethod: 'string?',
  },
  [MarketingEventType.FEATURE_ABANDONED]: {
    featureName: 'string',
    reason: 'string?',
    duration: 'number?',
  },
  [MarketingEventType.EXPERIMENT_ASSIGNED]: {
    experimentId: 'string',
    experimentName: 'string',
    variantId: 'string',
    variantName: 'string',
  },
  [MarketingEventType.EXPERIMENT_VIEWED]: {
    experimentId: 'string',
    variantId: 'string',
  },
  [MarketingEventType.EXPERIMENT_CONVERTED]: {
    experimentId: 'string',
    variantId: 'string',
    conversionValue: 'number?',
  },
  [MarketingEventType.CONVERSION]: {
    conversionType: 'string',
    conversionValue: 'number?',
    conversionLabel: 'string?',
  },
  [MarketingEventType.MICRO_CONVERSION]: {
    conversionType: 'string',
    step: 'string?',
  },
  [MarketingEventType.GOAL_COMPLETED]: {
    goalId: 'string',
    goalName: 'string',
    goalValue: 'number?',
  },
  [MarketingEventType.SUBSCRIPTION_CREATED]: {
    planId: 'string',
    planName: 'string',
    amount: 'number',
    currency: 'string',
    interval: 'string',
  },
  [MarketingEventType.SUBSCRIPTION_UPGRADED]: {
    fromPlanId: 'string',
    toPlanId: 'string',
    amountChange: 'number',
  },
  [MarketingEventType.SUBSCRIPTION_DOWNGRADED]: {
    fromPlanId: 'string',
    toPlanId: 'string',
    amountChange: 'number',
  },
  [MarketingEventType.SUBSCRIPTION_CANCELLED]: {
    planId: 'string',
    reason: 'string?',
    feedback: 'string?',
  },
  [MarketingEventType.SUBSCRIPTION_RENEWED]: {
    planId: 'string',
    amount: 'number',
    currency: 'string',
  },
  [MarketingEventType.SUBSCRIPTION_TRIAL_STARTED]: {
    planId: 'string',
    trialDays: 'number',
  },
  [MarketingEventType.SUBSCRIPTION_TRIAL_ENDED]: {
    planId: 'string',
    converted: 'boolean',
  },
  [MarketingEventType.EMAIL_SENT]: {
    emailId: 'string',
    templateId: 'string?',
    subject: 'string?',
  },
  [MarketingEventType.EMAIL_DELIVERED]: {
    emailId: 'string',
  },
  [MarketingEventType.EMAIL_OPENED]: {
    emailId: 'string',
    openCount: 'number?',
  },
  [MarketingEventType.EMAIL_CLICKED]: {
    emailId: 'string',
    linkUrl: 'string',
    linkName: 'string?',
  },
  [MarketingEventType.EMAIL_BOUNCED]: {
    emailId: 'string',
    bounceType: 'string',
  },
  [MarketingEventType.EMAIL_UNSUBSCRIBED]: {
    emailId: 'string?',
    listId: 'string?',
  },
  [MarketingEventType.EMAIL_COMPLAINED]: {
    emailId: 'string',
  },
  [MarketingEventType.PRODUCT_VIEWED]: {
    productId: 'string',
    productName: 'string?',
    price: 'number?',
    category: 'string?',
  },
  [MarketingEventType.PRODUCT_ADDED_TO_CART]: {
    productId: 'string',
    productName: 'string?',
    price: 'number',
    quantity: 'number',
    currency: 'string?',
  },
  [MarketingEventType.PRODUCT_REMOVED_FROM_CART]: {
    productId: 'string',
    quantity: 'number',
  },
  [MarketingEventType.CHECKOUT_STARTED]: {
    cartValue: 'number',
    itemCount: 'number',
    currency: 'string?',
  },
  [MarketingEventType.CHECKOUT_COMPLETED]: {
    orderId: 'string',
    orderValue: 'number',
    currency: 'string',
  },
  [MarketingEventType.PURCHASE]: {
    orderId: 'string',
    orderValue: 'number',
    currency: 'string',
    items: 'array?',
    paymentMethod: 'string?',
  },
  [MarketingEventType.REFUND]: {
    orderId: 'string',
    refundValue: 'number',
    currency: 'string',
    reason: 'string?',
  },
  [MarketingEventType.SEARCH_PERFORMED]: {
    query: 'string',
    resultsCount: 'number',
    filters: 'object?',
  },
  [MarketingEventType.SEARCH_RESULT_CLICKED]: {
    query: 'string',
    resultId: 'string',
    position: 'number',
  },
  [MarketingEventType.FILTER_APPLIED]: {
    filterName: 'string',
    filterValue: 'any',
  },
  [MarketingEventType.SORT_APPLIED]: {
    sortField: 'string',
    sortDirection: 'string',
  },
  [MarketingEventType.CONTENT_VIEWED]: {
    contentId: 'string',
    contentType: 'string',
    contentTitle: 'string?',
  },
  [MarketingEventType.CONTENT_SHARED]: {
    contentId: 'string',
    shareMethod: 'string',
  },
  [MarketingEventType.VIDEO_STARTED]: {
    videoId: 'string',
    videoTitle: 'string?',
    videoDuration: 'number?',
  },
  [MarketingEventType.VIDEO_COMPLETED]: {
    videoId: 'string',
    watchTime: 'number',
    completionRate: 'number',
  },
  [MarketingEventType.FEEDBACK_SUBMITTED]: {
    feedbackType: 'string',
    feedback: 'string',
    rating: 'number?',
  },
  [MarketingEventType.RATING_SUBMITTED]: {
    entityId: 'string',
    entityType: 'string',
    rating: 'number',
  },
  [MarketingEventType.REVIEW_SUBMITTED]: {
    entityId: 'string',
    entityType: 'string',
    rating: 'number',
    reviewText: 'string?',
  },
  [MarketingEventType.NPS_SUBMITTED]: {
    score: 'number',
    feedback: 'string?',
    surveyId: 'string?',
  },
  [MarketingEventType.ERROR_OCCURRED]: {
    errorType: 'string',
    errorMessage: 'string',
    errorStack: 'string?',
    errorContext: 'object?',
  },
  [MarketingEventType.PERFORMANCE_METRIC]: {
    metricName: 'string',
    metricValue: 'number',
    metricUnit: 'string?',
  },
  [MarketingEventType.CUSTOM]: {
    eventName: 'string',
    eventData: 'object?',
  },
};
