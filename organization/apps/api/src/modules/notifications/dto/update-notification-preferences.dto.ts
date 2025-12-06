import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  // Email preferences
  @ApiPropertyOptional({ description: 'Receive order confirmation emails' })
  @IsOptional()
  @IsBoolean()
  orderConfirmation?: boolean;

  @ApiPropertyOptional({ description: 'Receive shipping update emails' })
  @IsOptional()
  @IsBoolean()
  shippingUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Receive delivery notification emails' })
  @IsOptional()
  @IsBoolean()
  deliveryNotifications?: boolean;

  // Marketing preferences
  @ApiPropertyOptional({ description: 'Receive newsletter emails' })
  @IsOptional()
  @IsBoolean()
  newsletters?: boolean;

  @ApiPropertyOptional({ description: 'Receive promotional emails' })
  @IsOptional()
  @IsBoolean()
  promotionalEmails?: boolean;

  @ApiPropertyOptional({ description: 'Receive product recommendation emails' })
  @IsOptional()
  @IsBoolean()
  productRecommendations?: boolean;

  // Activity notifications
  @ApiPropertyOptional({ description: 'Receive cart abandonment reminders' })
  @IsOptional()
  @IsBoolean()
  cartAbandonment?: boolean;

  @ApiPropertyOptional({ description: 'Receive price drop alerts' })
  @IsOptional()
  @IsBoolean()
  priceDropAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Receive back-in-stock alerts' })
  @IsOptional()
  @IsBoolean()
  backInStockAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Receive wishlist update notifications' })
  @IsOptional()
  @IsBoolean()
  wishlistUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Receive review reminder emails' })
  @IsOptional()
  @IsBoolean()
  reviewReminders?: boolean;

  // Push notification preferences
  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications for orders' })
  @IsOptional()
  @IsBoolean()
  pushOrders?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications for promotions' })
  @IsOptional()
  @IsBoolean()
  pushPromotions?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications for messages' })
  @IsOptional()
  @IsBoolean()
  pushMessages?: boolean;

  // SMS preferences
  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'SMS for order updates' })
  @IsOptional()
  @IsBoolean()
  smsOrderUpdates?: boolean;

  @ApiPropertyOptional({ description: 'SMS for delivery alerts' })
  @IsOptional()
  @IsBoolean()
  smsDeliveryAlerts?: boolean;
}
