import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface CartCacheData {
  id: string;
  userId?: string;
  sessionId?: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  lastActivityAt: Date;
  [key: string]: any;
}

/**
 * Cart Caching Service
 * Handles caching for shopping cart data
 */
@Injectable()
export class CartCacheService {
  private readonly logger = new Logger(CartCacheService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get cart from cache
   */
  async getCart(cartId: string): Promise<CartCacheData | null> {
    return this.cacheService.get<CartCacheData>(cartId, {
      prefix: CachePrefix.CART,
    });
  }

  /**
   * Set cart in cache
   */
  async setCart(
    cartId: string,
    cart: CartCacheData,
    ttl: number = CacheTTL.HALF_DAY,
  ): Promise<boolean> {
    const success = await this.cacheService.set(cartId, cart, {
      prefix: CachePrefix.CART,
      ttl,
    });

    if (success) {
      this.logger.debug(`Cart cached: ${cartId}`);
    }

    return success;
  }

  /**
   * Get or load cart
   */
  async getOrLoadCart(
    cartId: string,
    loader: () => Promise<CartCacheData>,
  ): Promise<CartCacheData> {
    return this.cacheService.getOrSet(cartId, loader, {
      prefix: CachePrefix.CART,
      ttl: CacheTTL.HALF_DAY,
    });
  }

  /**
   * Get cart by user ID
   */
  async getCartByUserId(userId: string): Promise<CartCacheData | null> {
    return this.cacheService.get<CartCacheData>(`user:${userId}`, {
      prefix: CachePrefix.CART,
    });
  }

  /**
   * Set cart by user ID
   */
  async setCartByUserId(
    userId: string,
    cart: CartCacheData,
    ttl: number = CacheTTL.HALF_DAY,
  ): Promise<boolean> {
    return this.cacheService.set(`user:${userId}`, cart, {
      prefix: CachePrefix.CART,
      ttl,
    });
  }

  /**
   * Get cart by session ID
   */
  async getCartBySessionId(sessionId: string): Promise<CartCacheData | null> {
    return this.cacheService.get<CartCacheData>(`session:${sessionId}`, {
      prefix: CachePrefix.CART,
    });
  }

  /**
   * Set cart by session ID
   */
  async setCartBySessionId(
    sessionId: string,
    cart: CartCacheData,
    ttl: number = CacheTTL.HALF_DAY,
  ): Promise<boolean> {
    return this.cacheService.set(`session:${sessionId}`, cart, {
      prefix: CachePrefix.CART,
      ttl,
    });
  }

  /**
   * Invalidate cart cache
   */
  async invalidateCart(cartId: string): Promise<void> {
    await this.cacheService.invalidateCart(cartId);
  }

  /**
   * Invalidate user's cart cache
   */
  async invalidateUserCart(userId: string): Promise<void> {
    await this.cacheService.delete(`user:${userId}`, CachePrefix.CART);
    this.logger.log(`Invalidated cart cache for user: ${userId}`);
  }

  /**
   * Invalidate session cart cache
   */
  async invalidateSessionCart(sessionId: string): Promise<void> {
    await this.cacheService.delete(`session:${sessionId}`, CachePrefix.CART);
    this.logger.log(`Invalidated cart cache for session: ${sessionId}`);
  }

  /**
   * Cache cart item count for quick access
   */
  async setCartItemCount(
    cartId: string,
    count: number,
    ttl: number = CacheTTL.MEDIUM,
  ): Promise<boolean> {
    return this.cacheService.set(`count:${cartId}`, count, {
      prefix: CachePrefix.CART,
      ttl,
    });
  }

  /**
   * Get cart item count from cache
   */
  async getCartItemCount(cartId: string): Promise<number | null> {
    return this.cacheService.get<number>(`count:${cartId}`, {
      prefix: CachePrefix.CART,
    });
  }

  /**
   * Cache cart total for quick access
   */
  async setCartTotal(
    cartId: string,
    total: number,
    ttl: number = CacheTTL.MEDIUM,
  ): Promise<boolean> {
    return this.cacheService.set(`total:${cartId}`, total, {
      prefix: CachePrefix.CART,
      ttl,
    });
  }

  /**
   * Get cart total from cache
   */
  async getCartTotal(cartId: string): Promise<number | null> {
    return this.cacheService.get<number>(`total:${cartId}`, {
      prefix: CachePrefix.CART,
    });
  }

  /**
   * Cache abandoned cart data
   */
  async setAbandonedCart(
    cartId: string,
    abandonmentData: any,
    ttl: number = CacheTTL.WEEK,
  ): Promise<boolean> {
    return this.cacheService.set(`abandoned:${cartId}`, abandonmentData, {
      prefix: CachePrefix.CART,
      ttl,
    });
  }

  /**
   * Get abandoned cart data
   */
  async getAbandonedCart(cartId: string): Promise<any | null> {
    return this.cacheService.get(`abandoned:${cartId}`, {
      prefix: CachePrefix.CART,
    });
  }

  /**
   * Event listener: Invalidate cache when cart is updated
   */
  @OnEvent('cart.updated')
  async handleCartUpdated(payload: { cartId: string; userId?: string }): Promise<void> {
    this.logger.log(`Cart updated event: ${payload.cartId}`);
    await this.invalidateCart(payload.cartId);

    if (payload.userId) {
      await this.invalidateUserCart(payload.userId);
    }
  }

  /**
   * Event listener: Invalidate cache when cart item is added
   */
  @OnEvent('cart.item.added')
  async handleCartItemAdded(payload: { cartId: string; userId?: string }): Promise<void> {
    this.logger.log(`Cart item added event: ${payload.cartId}`);
    await this.invalidateCart(payload.cartId);

    if (payload.userId) {
      await this.invalidateUserCart(payload.userId);
    }
  }

  /**
   * Event listener: Invalidate cache when cart item is removed
   */
  @OnEvent('cart.item.removed')
  async handleCartItemRemoved(payload: { cartId: string; userId?: string }): Promise<void> {
    this.logger.log(`Cart item removed event: ${payload.cartId}`);
    await this.invalidateCart(payload.cartId);

    if (payload.userId) {
      await this.invalidateUserCart(payload.userId);
    }
  }

  /**
   * Event listener: Clear cart cache when converted to order
   */
  @OnEvent('cart.converted')
  async handleCartConverted(payload: { cartId: string; userId?: string }): Promise<void> {
    this.logger.log(`Cart converted to order: ${payload.cartId}`);
    await this.invalidateCart(payload.cartId);

    if (payload.userId) {
      await this.invalidateUserCart(payload.userId);
    }
  }
}
