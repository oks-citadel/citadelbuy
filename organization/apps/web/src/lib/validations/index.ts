// Auth validations
export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from './auth';

// Checkout validations
export {
  shippingAddressSchema,
  billingAddressSchema,
  paymentMethodSchema,
  checkoutSchema,
  couponSchema,
  type ShippingAddressInput,
  type BillingAddressInput,
  type PaymentMethodInput,
  type CheckoutInput,
  type CouponInput,
} from './checkout';

// Product validations
export {
  productReviewSchema,
  productFilterSchema,
  addToCartSchema,
  wishlistItemSchema,
  type ProductReviewInput,
  type ProductFilterInput,
  type AddToCartInput,
  type WishlistItemInput,
} from './product';
