import { z } from 'zod';

export const shippingAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  address1: z.string().min(5, 'Address is required').max(200, 'Address is too long'),
  address2: z.string().max(200, 'Address is too long').optional(),
  city: z.string().min(2, 'City is required').max(100, 'City name is too long'),
  state: z.string().min(2, 'State/Province is required').max(100, 'State/Province is too long'),
  postalCode: z.string().min(3, 'Postal code is required').max(20, 'Postal code is too long'),
  country: z.string().min(2, 'Country is required').max(100, 'Country is too long'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number is too long'),
});

export const billingAddressSchema = shippingAddressSchema.extend({
  sameAsShipping: z.boolean().optional(),
});

export const paymentMethodSchema = z.object({
  type: z.enum(['card', 'paypal', 'apple_pay', 'google_pay']),
  saveCard: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  shippingAddress: shippingAddressSchema,
  billingAddress: billingAddressSchema.optional(),
  shippingMethod: z.string().min(1, 'Please select a shipping method'),
  paymentMethod: paymentMethodSchema,
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

export const couponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50, 'Coupon code is too long'),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type BillingAddressInput = z.infer<typeof billingAddressSchema>;
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
