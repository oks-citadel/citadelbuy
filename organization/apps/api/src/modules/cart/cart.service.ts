import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { LockPricesDto } from './dto/lock-prices.dto';
import { TrackAbandonmentDto } from './dto/track-abandonment.dto';
import { randomBytes } from 'crypto';

// Default tax rate - should be configured per region in production
const DEFAULT_TAX_RATE = 0.10;

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private readonly taxRate: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Get tax rate from config, or use default
    // NOTE: In production, tax should be calculated dynamically based on region
    this.taxRate = this.configService.get<number>('DEFAULT_TAX_RATE') ?? DEFAULT_TAX_RATE;
  }

  /**
   * Get or create cart for user or guest
   */
  async getOrCreateCart(userId?: string, sessionId?: string) {
    let cart;

    if (userId) {
      // Get active user cart
      cart = await this.prisma.cart.findFirst({
        where: {
          userId,
          convertedToOrder: false,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  images: true,
                  stock: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                  attributes: true,
                },
              },
            },
          },
        },
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: {
            userId,
            lastActivityAt: new Date(),
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    price: true,
                    images: true,
                    stock: true,
                  },
                },
                variant: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    stock: true,
                    attributes: true,
                  },
                },
              },
            },
          },
        });
      }
    } else if (sessionId) {
      // Get guest cart
      cart = await this.prisma.cart.findFirst({
        where: {
          sessionId,
          convertedToOrder: false,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  images: true,
                  stock: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                  attributes: true,
                },
              },
            },
          },
        },
      });

      if (!cart) {
        // Create guest cart with expiration (30 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        cart = await this.prisma.cart.create({
          data: {
            sessionId,
            lastActivityAt: new Date(),
            expiresAt,
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    price: true,
                    images: true,
                    stock: true,
                  },
                },
                variant: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    stock: true,
                    attributes: true,
                  },
                },
              },
            },
          },
        });
      }
    } else {
      throw new BadRequestException('Either userId or sessionId must be provided');
    }

    // Recalculate totals
    await this.recalculateCart(cart.id);

    return this.getCartById(cart.id);
  }

  /**
   * Get cart by ID
   */
  async getCartById(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: true,
                stock: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                attributes: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart;
  }

  /**
   * Add item to cart
   */
  async addToCart(dto: AddToCartDto, userId?: string) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // If variant specified, verify it exists
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }
    }

    // Get or create cart
    const cart = await this.getOrCreateCart(userId, dto.sessionId);

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    const currentPrice = dto.variantId
      ? (await this.prisma.productVariant.findUnique({ where: { id: dto.variantId } }))?.price || product.price
      : product.price;

    if (existingItem) {
      // Update quantity
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + dto.quantity,
          price: currentPrice,
        },
      });
    } else {
      // Create new cart item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId,
          quantity: dto.quantity,
          price: currentPrice,
        },
      });
    }

    // Update cart activity
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { lastActivityAt: new Date() },
    });

    // Recalculate totals
    await this.recalculateCart(cart.id);

    return this.getCartById(cart.id);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(cartItemId: string, dto: UpdateCartItemDto, userId?: string, sessionId?: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify cart ownership
    if (userId && cartItem.cart.userId !== userId) {
      throw new BadRequestException('Cart item does not belong to user');
    }

    if (sessionId && cartItem.cart.sessionId !== sessionId) {
      throw new BadRequestException('Cart item does not belong to session');
    }

    if (dto.quantity === 0) {
      // Remove item if quantity is 0
      await this.prisma.cartItem.delete({
        where: { id: cartItemId },
      });
    } else {
      // Update quantity
      await this.prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity: dto.quantity },
      });
    }

    // Update cart activity
    await this.prisma.cart.update({
      where: { id: cartItem.cart.id },
      data: { lastActivityAt: new Date() },
    });

    // Recalculate totals
    await this.recalculateCart(cartItem.cart.id);

    return this.getCartById(cartItem.cart.id);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(cartItemId: string, userId?: string, sessionId?: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify cart ownership
    if (userId && cartItem.cart.userId !== userId) {
      throw new BadRequestException('Cart item does not belong to user');
    }

    if (sessionId && cartItem.cart.sessionId !== sessionId) {
      throw new BadRequestException('Cart item does not belong to session');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    // Update cart activity
    await this.prisma.cart.update({
      where: { id: cartItem.cart.id },
      data: { lastActivityAt: new Date() },
    });

    // Recalculate totals
    await this.recalculateCart(cartItem.cart.id);

    return this.getCartById(cartItem.cart.id);
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Recalculate totals
    await this.recalculateCart(cart.id);

    return this.getCartById(cart.id);
  }

  /**
   * Merge guest cart into user cart when user logs in
   */
  async mergeCart(userId: string, dto: MergeCartDto) {
    // Get user cart
    const userCart = await this.getOrCreateCart(userId);

    // Get guest cart
    const guestCart = await this.prisma.cart.findFirst({
      where: {
        sessionId: dto.guestSessionId,
        convertedToOrder: false,
      },
      include: {
        items: true,
      },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return userCart;
    }

    // Merge items from guest cart to user cart
    for (const guestItem of guestCart.items) {
      // Check if item already exists in user cart
      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId,
        },
      });

      if (existingItem) {
        // Combine quantities
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + guestItem.quantity,
          },
        });
      } else {
        // Move item to user cart
        await this.prisma.cartItem.update({
          where: { id: guestItem.id },
          data: {
            cartId: userCart.id,
          },
        });
      }
    }

    // Mark guest cart as merged
    await this.prisma.cart.update({
      where: { id: guestCart.id },
      data: {
        mergedIntoCartId: userCart.id,
      },
    });

    // Recalculate totals
    await this.recalculateCart(userCart.id);

    return this.getCartById(userCart.id);
  }

  /**
   * Lock prices in cart
   */
  async lockPrices(cartId: string, dto: LockPricesDto) {
    const cart = await this.getCartById(cartId);

    const priceLockedUntil = new Date();
    priceLockedUntil.setHours(priceLockedUntil.getHours() + dto.durationHours);

    // Lock prices on all cart items
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: {
        product: true,
        variant: true,
      },
    });

    for (const item of items) {
      const currentPrice = item.variant?.price || item.product.price;

      await this.prisma.cartItem.update({
        where: { id: item.id },
        data: {
          lockedPrice: currentPrice,
        },
      });
    }

    // Update cart
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        priceLocked: true,
        priceLockedAt: new Date(),
        priceLockedUntil,
      },
    });

    return this.getCartById(cartId);
  }

  /**
   * Create shareable cart link
   */
  async createShareLink(cartId: string) {
    const cart = await this.getCartById(cartId);

    // Generate unique share token
    const shareToken = randomBytes(16).toString('hex');

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { shareToken },
    });

    return {
      shareToken,
      shareUrl: `/cart/shared/${shareToken}`,
    };
  }

  /**
   * Get cart by share token
   */
  async getCartByShareToken(shareToken: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { shareToken },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: true,
                stock: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                attributes: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Shared cart not found');
    }

    return cart;
  }

  /**
   * Track cart abandonment
   */
  async trackAbandonment(cartId: string, dto: TrackAbandonmentDto) {
    const cart = await this.getCartById(cartId);

    // Calculate cart value and item count
    const cartValue = cart.total;
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Create or update abandonment tracking
    await this.prisma.cartAbandonment.upsert({
      where: { cartId },
      create: {
        cartId,
        email: dto.email,
        phone: dto.phone,
        cartValue,
        itemCount,
      },
      update: {
        email: dto.email,
        phone: dto.phone,
        cartValue,
        itemCount,
      },
    });

    // Mark cart as abandoned
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { isAbandoned: true },
    });

    return { message: 'Cart abandonment tracked successfully' };
  }

  /**
   * Get abandoned carts (for admin/email recovery)
   */
  async getAbandonedCarts(params: {
    page?: number;
    limit?: number;
    minValue?: number;
  }) {
    const { page = 1, limit = 20, minValue } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      cart: {
        isAbandoned: true,
        convertedToOrder: false,
      },
      recovered: false,
    };

    if (minValue) {
      where.cartValue = { gte: minValue };
    }

    const [abandonments, total] = await Promise.all([
      this.prisma.cartAbandonment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { abandonedAt: 'desc' },
        include: {
          cart: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      images: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.cartAbandonment.count({ where }),
    ]);

    return {
      abandonments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reserve inventory for cart items
   */
  async reserveInventory(cartId: string, durationMinutes: number = 15) {
    const cart = await this.getCartById(cartId);
    const reservationExpiry = new Date();
    reservationExpiry.setMinutes(reservationExpiry.getMinutes() + durationMinutes);

    for (const item of cart.items) {
      // Check if enough stock is available
      const availableStock = item.variant?.stock || item.product.stock;

      if (availableStock < item.quantity) {
        throw new BadRequestException(`Not enough stock for ${item.product.name}`);
      }

      // Mark as reserved
      await this.prisma.cartItem.update({
        where: { id: item.id },
        data: {
          inventoryReserved: true,
          reservedAt: new Date(),
          reservationExpiry,
        },
      });
    }

    return { message: 'Inventory reserved successfully', expiresAt: reservationExpiry };
  }

  /**
   * Release inventory reservations
   */
  async releaseInventory(cartId: string) {
    await this.prisma.cartItem.updateMany({
      where: { cartId },
      data: {
        inventoryReserved: false,
        reservedAt: null,
        reservationExpiry: null,
      },
    });

    return { message: 'Inventory released successfully' };
  }

  // ==================== Private Helper Methods ====================

  /**
   * Recalculate cart totals
   */
  private async recalculateCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) return;

    let subtotal = 0;

    for (const item of cart.items) {
      // Use locked price if available and cart is price locked
      const itemPrice = cart.priceLocked && item.lockedPrice ? item.lockedPrice : item.price;
      subtotal += itemPrice * item.quantity;
    }

    // Tax calculation - uses configured rate (should integrate with TaxService for production accuracy)
    const tax = Math.round(subtotal * this.taxRate * 100) / 100;
    const total = subtotal + tax;

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        tax,
        total,
        lastActivityAt: new Date(), // Update activity timestamp on any cart change
      },
    });
  }
}
