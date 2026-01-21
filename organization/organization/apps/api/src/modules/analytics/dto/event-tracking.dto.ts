import { IsString, IsOptional, IsEnum, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsEventType {
  // Page Events
  PAGE_VIEW = 'page_view',

  // Product Events
  PRODUCT_VIEW = 'product_view',
  PRODUCT_LIST_VIEW = 'product_list_view',
  PRODUCT_IMPRESSION = 'product_impression',

  // Cart Events
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  VIEW_CART = 'view_cart',

  // Checkout Events
  BEGIN_CHECKOUT = 'begin_checkout',
  ADD_SHIPPING_INFO = 'add_shipping_info',
  ADD_PAYMENT_INFO = 'add_payment_info',
  PURCHASE = 'purchase',

  // User Events
  SIGN_UP = 'sign_up',
  LOGIN = 'login',
  LOGOUT = 'logout',

  // Search Events
  SEARCH = 'search',
  FILTER_APPLIED = 'filter_applied',
  SORT_CHANGED = 'sort_changed',

  // Category Events
  CATEGORY_VIEW = 'category_view',
  CATEGORY_PRODUCT_CLICK = 'category_product_click',

  // Engagement Events
  WISHLIST_ADD = 'wishlist_add',
  WISHLIST_REMOVE = 'wishlist_remove',
  SHARE = 'share',
  REVIEW_SUBMIT = 'review_submit',
}

export class TrackEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: AnalyticsEventType,
  })
  @IsEnum(AnalyticsEventType)
  eventType: AnalyticsEventType;

  @ApiPropertyOptional({ description: 'User ID (if authenticated)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID for anonymous tracking' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Event properties/metadata' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Event timestamp' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class BatchTrackEventsDto {
  @ApiProperty({
    description: 'Array of events to track',
    type: [TrackEventDto],
  })
  events: TrackEventDto[];
}
