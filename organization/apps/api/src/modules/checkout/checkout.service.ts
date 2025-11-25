import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from '../orders/orders.service';
import { CouponsService } from '../coupons/coupons.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface SavedAddress {
  id: string;
  isDefault: boolean;
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface SavedPaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: string;
  last4: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface ExpressCheckoutRequest {
  cartId?: string;
  productId?: string;
  quantity?: number;
  shippingAddressId?: string;
  paymentMethodId?: string;
  couponCode?: string;
  useGiftCard?: boolean;
  giftCardCode?: string;
}

export interface GuestCheckoutRequest {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    fullName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  couponCode?: string;
  guestEmail: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private ordersService: OrdersService,
    private couponsService: CouponsService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(apiKey || 'sk_test_dummy', {
      apiVersion: '2023-10-16',
    });
  }

  // ==================== Address Management ====================

  /**
   * Get user's saved addresses
   */
  async getSavedAddresses(userId: string): Promise<SavedAddress[]> {
    const addresses = await this.prisma.savedAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map((addr) => ({
      id: addr.id,
      isDefault: addr.isDefault,
      fullName: addr.fullName,
      email: addr.email ?? '',
      phone: addr.phone ?? '',
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
    }));
  }

  /**
   * Save a new address
   */
  async saveAddress(userId: string, address: Omit<SavedAddress, 'id'>): Promise<SavedAddress> {
    // If setting as default, unset other defaults
    if (address.isDefault) {
      await this.prisma.savedAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const saved = await this.prisma.savedAddress.create({
      data: {
        userId,
        ...address,
      },
    });

    return {
      id: saved.id,
      isDefault: saved.isDefault,
      fullName: saved.fullName,
      email: saved.email ?? '',
      phone: saved.phone ?? '',
      street: saved.street,
      city: saved.city,
      state: saved.state,
      postalCode: saved.postalCode,
      country: saved.country,
    };
  }

  /**
   * Update an existing address
   */
  async updateAddress(userId: string, addressId: string, address: Partial<SavedAddress>): Promise<SavedAddress> {
    const existing = await this.prisma.savedAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    // If setting as default, unset other defaults
    if (address.isDefault) {
      await this.prisma.savedAddress.updateMany({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.savedAddress.update({
      where: { id: addressId },
      data: address,
    });

    return {
      id: updated.id,
      isDefault: updated.isDefault,
      fullName: updated.fullName,
      email: updated.email ?? '',
      phone: updated.phone ?? '',
      street: updated.street,
      city: updated.city,
      state: updated.state,
      postalCode: updated.postalCode,
      country: updated.country,
    };
  }

  /**
   * Delete an address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const existing = await this.prisma.savedAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.savedAddress.delete({
      where: { id: addressId },
    });
  }

  // ==================== Payment Method Management ====================

  /**
   * Get user's saved payment methods from Stripe
   */
  async getSavedPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get or create Stripe customer
    let stripeCustomerId = await this.getOrCreateStripeCustomer(userId, user.email);

    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });

      // Get default payment method
      const customer = await this.stripe.customers.retrieve(stripeCustomerId);
      const defaultPaymentMethodId = (customer as Stripe.Customer).invoice_settings?.default_payment_method;

      return paymentMethods.data.map((pm) => ({
        id: pm.id,
        stripePaymentMethodId: pm.id,
        type: pm.type,
        last4: pm.card?.last4 || '',
        brand: pm.card?.brand,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId,
      }));
    } catch (error) {
      this.logger.error('Failed to get payment methods', error);
      return [];
    }
  }

  /**
   * Set up a new payment method
   */
  async setupPaymentMethod(userId: string): Promise<{ clientSecret: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, user.email);

    const setupIntent = await this.stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    return { clientSecret: setupIntent.client_secret! };
  }

  /**
   * Attach a payment method to user
   */
  async attachPaymentMethod(userId: string, paymentMethodId: string, setAsDefault: boolean = false): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, user.email);

    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    if (setAsDefault) {
      await this.stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, user.email);

    await this.stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    // Verify the payment method belongs to this user
    const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, user.email);

    if (paymentMethod.customer !== stripeCustomerId) {
      throw new BadRequestException('Payment method does not belong to this user');
    }

    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  // ==================== Express Checkout ====================

  /**
   * Express checkout - one-click purchase with saved details
   */
  async expressCheckout(userId: string, request: ExpressCheckoutRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get items (from cart or single product)
    let items: Array<{ productId: string; quantity: number; price: number }> = [];
    let subtotal = 0;

    if (request.cartId) {
      const cart = await this.prisma.cart.findFirst({
        where: { id: request.cartId, userId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, stock: true },
              },
            },
          },
        },
      });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      items = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product.price,
      }));

      subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    } else if (request.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: request.productId },
        select: { id: true, price: true, stock: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const quantity = request.quantity || 1;

      if (product.stock < quantity) {
        throw new BadRequestException('Insufficient stock');
      }

      items = [{ productId: product.id, quantity, price: product.price }];
      subtotal = product.price * quantity;
    } else {
      throw new BadRequestException('Either cartId or productId is required');
    }

    // Get shipping address
    let shippingAddress: SavedAddress | null = null;

    if (request.shippingAddressId) {
      const saved = await this.prisma.savedAddress.findFirst({
        where: { id: request.shippingAddressId, userId },
      });
      if (saved) {
        shippingAddress = {
          id: saved.id,
          isDefault: saved.isDefault,
          fullName: saved.fullName,
          email: saved.email ?? '',
          phone: saved.phone ?? '',
          street: saved.street,
          city: saved.city,
          state: saved.state,
          postalCode: saved.postalCode,
          country: saved.country,
        };
      }
    } else {
      // Use default address
      const defaultAddr = await this.prisma.savedAddress.findFirst({
        where: { userId, isDefault: true },
      });
      if (defaultAddr) {
        shippingAddress = {
          id: defaultAddr.id,
          isDefault: defaultAddr.isDefault,
          fullName: defaultAddr.fullName,
          email: defaultAddr.email ?? '',
          phone: defaultAddr.phone ?? '',
          street: defaultAddr.street,
          city: defaultAddr.city,
          state: defaultAddr.state,
          postalCode: defaultAddr.postalCode,
          country: defaultAddr.country,
        };
      }
    }

    if (!shippingAddress) {
      throw new BadRequestException('No shipping address found. Please add an address first.');
    }

    // Apply coupon if provided
    let discount = 0;
    if (request.couponCode) {
      const validation = await this.couponsService.validateCoupon({
        code: request.couponCode,
        userId,
        subtotal,
        productIds: items.map((i) => i.productId),
      });

      if (validation.valid && validation.discountAmount) {
        discount = validation.discountAmount;
      }
    }

    // Calculate totals
    const shipping = 0; // Could calculate based on address
    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax approximation
    const total = subtotal - discount + shipping + tax;

    // Get or use payment method
    let paymentMethodId = request.paymentMethodId;

    if (!paymentMethodId) {
      const paymentMethods = await this.getSavedPaymentMethods(userId);
      const defaultPM = paymentMethods.find((pm) => pm.isDefault);
      if (defaultPM) {
        paymentMethodId = defaultPM.stripePaymentMethodId;
      }
    }

    if (!paymentMethodId) {
      throw new BadRequestException('No payment method found. Please add a payment method first.');
    }

    // Create order
    const order = await this.ordersService.create(userId, {
      items,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        email: shippingAddress.email || user.email,
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
      },
      subtotal,
      tax,
      shipping,
      total,
    });

    // Create payment intent with saved payment method
    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, user.email);

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          orderId: order.id,
          userId,
        },
      });

      // Update order with payment info
      await this.ordersService.updateOrderStatus(order.id, 'PROCESSING', {
        paymentIntentId: paymentIntent.id,
        paymentMethod: 'card',
      });

      // Clear cart if used
      if (request.cartId) {
        await this.prisma.cartItem.deleteMany({
          where: { cartId: request.cartId },
        });
      }

      // Apply coupon usage
      if (request.couponCode && discount > 0) {
        await this.couponsService.applyCoupon({
          code: request.couponCode,
          userId,
          subtotal,
          productIds: items.map((i) => i.productId),
          orderId: order.id,
        });
      }

      return {
        success: true,
        orderId: order.id,
        paymentStatus: paymentIntent.status,
        total,
        discount,
      };
    } catch (error) {
      this.logger.error('Express checkout payment failed', error);

      // Mark order as failed
      await this.ordersService.updateOrderStatus(order.id, 'CANCELLED');

      throw new BadRequestException('Payment failed. Please try again.');
    }
  }

  // ==================== Guest Checkout ====================

  /**
   * Guest checkout - checkout without account
   */
  async guestCheckout(request: GuestCheckoutRequest) {
    const { items, shippingAddress, guestEmail, couponCode } = request;

    // Validate items
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, stock: true },
    });

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
      }
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Apply coupon if provided (use a guest user ID)
    let discount = 0;
    if (couponCode) {
      try {
        // For guest checkout, we skip user-specific coupon validation
        const coupon = await this.prisma.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        });

        if (coupon && coupon.isActive) {
          const now = new Date();
          if (now >= coupon.startDate && (!coupon.endDate || now <= coupon.endDate)) {
            if (!coupon.minOrderValue || subtotal >= coupon.minOrderValue) {
              if (coupon.type === 'PERCENTAGE') {
                discount = (subtotal * coupon.value) / 100;
              } else if (coupon.type === 'FIXED_AMOUNT') {
                discount = coupon.value;
              }
              if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn('Coupon validation failed for guest checkout', error);
      }
    }

    // Calculate totals
    const shipping = 0;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = subtotal - discount + shipping + tax;

    // Create a guest order
    const order = await this.prisma.order.create({
      data: {
        // No userId for guest orders
        status: 'PENDING',
        total,
        subtotal,
        tax,
        shipping,
        shippingAddress: JSON.stringify(shippingAddress),
        guestEmail,
        guestPhone: shippingAddress.phone,
        isGuestOrder: true,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, images: true },
            },
          },
        },
      },
    });

    // Create payment intent
    const { clientSecret, paymentIntentId } = await this.paymentsService.createPaymentIntent(
      total,
      'usd',
      { orderId: order.id, guestEmail },
    );

    return {
      orderId: order.id,
      clientSecret,
      paymentIntentId,
      total,
      subtotal,
      tax,
      shipping,
      discount,
    };
  }

  // ==================== Checkout Session ====================

  /**
   * Initialize checkout session with calculated totals
   */
  async initializeCheckout(userId: string, params: {
    cartId?: string;
    productId?: string;
    quantity?: number;
    shippingAddressId?: string;
    couponCode?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get items
    let items: Array<{ productId: string; name: string; quantity: number; price: number; image?: string }> = [];

    if (params.cartId) {
      const cart = await this.prisma.cart.findFirst({
        where: { id: params.cartId, userId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, images: true },
              },
            },
          },
        },
      });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      items = cart.items.map((item) => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        image: item.product.images[0],
      }));
    } else if (params.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: params.productId },
        select: { id: true, name: true, price: true, images: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      items = [{
        productId: product.id,
        name: product.name,
        quantity: params.quantity || 1,
        price: product.price,
        image: product.images[0],
      }];
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Get addresses
    const addresses = await this.getSavedAddresses(userId);
    const selectedAddress = params.shippingAddressId
      ? addresses.find((a) => a.id === params.shippingAddressId)
      : addresses.find((a) => a.isDefault);

    // Get payment methods
    const paymentMethods = await this.getSavedPaymentMethods(userId);

    // Apply coupon
    let discount = 0;
    let couponValid = false;
    let couponMessage = '';

    if (params.couponCode) {
      const validation = await this.couponsService.validateCoupon({
        code: params.couponCode,
        userId,
        subtotal,
        productIds: items.map((i) => i.productId),
      });

      couponValid = validation.valid;
      couponMessage = validation.message || '';
      discount = validation.discountAmount || 0;
    }

    // Calculate totals
    const shipping = 0;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = subtotal - discount + shipping + tax;

    // Check if express checkout is possible
    const canExpressCheckout = selectedAddress && paymentMethods.length > 0;

    return {
      items,
      subtotal,
      discount,
      shipping,
      tax,
      total,
      addresses,
      selectedAddress,
      paymentMethods,
      canExpressCheckout,
      coupon: {
        applied: couponValid,
        code: params.couponCode,
        discount,
        message: couponMessage,
      },
    };
  }

  // ==================== Helper Methods ====================

  private async getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
    // Check if we have a stored customer ID
    const userRecord = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Check if there's a Stripe customer ID stored (would need to add this field to schema)
    // For now, we'll search by email
    try {
      const customers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        return customers.data[0].id;
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        metadata: { userId },
      });

      return customer.id;
    } catch (error) {
      this.logger.error('Failed to get/create Stripe customer', error);
      throw error;
    }
  }
}
