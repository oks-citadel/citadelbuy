import { PartialType } from '@nestjs/mapped-types';
import { CreateCouponDto } from './create-coupon.dto';

/**
 * DTO for updating a coupon
 * Uses PartialType from @nestjs/mapped-types to preserve validation decorators
 * while making all fields optional
 */
export class UpdateCouponDto extends PartialType(CreateCouponDto) {}
