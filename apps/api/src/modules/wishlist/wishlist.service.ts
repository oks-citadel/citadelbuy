import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { CreateWishlistCollectionDto } from './dto/create-wishlist-collection.dto';
import { AddToWishlistCollectionDto } from './dto/add-to-wishlist-collection.dto';
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's wishlist
   */
  async findAll(userId: string) {
    const wishlistItems = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return wishlistItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: item.product,
      addedAt: item.createdAt,
    }));
  }

  /**
   * Add product to wishlist
   */
  async add(userId: string, addToWishlistDto: AddToWishlistDto) {
    const { productId } = addToWishlistDto;

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    // Check if already in wishlist
    const existingItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingItem) {
      throw new ConflictException('Product is already in your wishlist');
    }

    // Add to wishlist
    const wishlistItem = await this.prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            category: true,
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      id: wishlistItem.id,
      productId: wishlistItem.productId,
      product: wishlistItem.product,
      addedAt: wishlistItem.createdAt,
    };
  }

  /**
   * Remove product from wishlist
   */
  async remove(userId: string, productId: string) {
    // Check if item exists in user's wishlist
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Product not found in your wishlist');
    }

    await this.prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return {
      message: 'Product removed from wishlist',
      productId,
    };
  }

  /**
   * Check if product is in user's wishlist
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return !!wishlistItem;
  }

  /**
   * Get wishlist count
   */
  async getCount(userId: string): Promise<number> {
    return this.prisma.wishlist.count({
      where: { userId },
    });
  }

  /**
   * Clear entire wishlist
   */
  async clear(userId: string) {
    await this.prisma.wishlist.deleteMany({
      where: { userId },
    });

    return {
      message: 'Wishlist cleared successfully',
    };
  }

  // ==================== Enhanced Wishlist Collection Methods ====================

  /**
   * Get or create default wishlist collection for user
   */
  async getOrCreateDefaultCollection(userId: string) {
    let collection = await this.prisma.wishlistCollection.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (!collection) {
      collection = await this.prisma.wishlistCollection.create({
        data: {
          userId,
          name: 'My Wishlist',
          isDefault: true,
        },
      });
    }

    return collection;
  }

  /**
   * Create a new wishlist collection
   */
  async createCollection(userId: string, dto: CreateWishlistCollectionDto) {
    return this.prisma.wishlistCollection.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic || false,
      },
    });
  }

  /**
   * Get all wishlist collections for user
   */
  async getCollections(userId: string) {
    return this.prisma.wishlistCollection.findMany({
      where: { userId },
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
        _count: {
          select: { items: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get single wishlist collection
   */
  async getCollection(collectionId: string, userId?: string) {
    const collection = await this.prisma.wishlistCollection.findUnique({
      where: { id: collectionId },
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
          orderBy: [
            { priority: 'desc' },
            { addedAt: 'desc' },
          ],
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Wishlist collection not found');
    }

    // Check access rights
    if (userId && collection.userId !== userId && !collection.isPublic) {
      throw new NotFoundException('Wishlist collection not found');
    }

    return collection;
  }

  /**
   * Update wishlist collection
   */
  async updateCollection(
    collectionId: string,
    userId: string,
    dto: Partial<CreateWishlistCollectionDto>,
  ) {
    const collection = await this.prisma.wishlistCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Wishlist collection not found');
    }

    if (collection.userId !== userId) {
      throw new NotFoundException('Wishlist collection not found');
    }

    return this.prisma.wishlistCollection.update({
      where: { id: collectionId },
      data: dto,
    });
  }

  /**
   * Delete wishlist collection
   */
  async deleteCollection(collectionId: string, userId: string) {
    const collection = await this.prisma.wishlistCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Wishlist collection not found');
    }

    if (collection.userId !== userId) {
      throw new NotFoundException('Wishlist collection not found');
    }

    if (collection.isDefault) {
      throw new ConflictException('Cannot delete default wishlist');
    }

    await this.prisma.wishlistCollection.delete({
      where: { id: collectionId },
    });

    return { message: 'Wishlist collection deleted successfully' };
  }

  /**
   * Add item to wishlist collection
   */
  async addToCollection(
    collectionId: string,
    userId: string,
    dto: AddToWishlistCollectionDto,
  ) {
    // Verify collection exists and user owns it
    const collection = await this.prisma.wishlistCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== userId) {
      throw new NotFoundException('Wishlist collection not found');
    }

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify variant if specified
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }
    }

    // Check if already exists
    const existing = await this.prisma.wishlistItem.findFirst({
      where: {
        wishlistId: collectionId,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    if (existing) {
      throw new ConflictException('Item already in wishlist collection');
    }

    // Get current price
    const currentPrice = dto.variantId
      ? (await this.prisma.productVariant.findUnique({ where: { id: dto.variantId } }))?.price ||
        product.price
      : product.price;

    // Add to collection
    return this.prisma.wishlistItem.create({
      data: {
        wishlistId: collectionId,
        productId: dto.productId,
        variantId: dto.variantId,
        notes: dto.notes,
        priority: dto.priority || 0,
        quantity: dto.quantity || 1,
        priceAtAddition: currentPrice,
        notifyOnPriceDrop: dto.notifyOnPriceDrop || false,
        targetPrice: dto.targetPrice,
        notifyWhenInStock: dto.notifyWhenInStock || false,
      },
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
    });
  }

  /**
   * Update wishlist item
   */
  async updateWishlistItem(
    itemId: string,
    userId: string,
    dto: UpdateWishlistItemDto,
  ) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { id: itemId },
      include: { wishlist: true },
    });

    if (!item || item.wishlist.userId !== userId) {
      throw new NotFoundException('Wishlist item not found');
    }

    return this.prisma.wishlistItem.update({
      where: { id: itemId },
      data: dto,
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
    });
  }

  /**
   * Remove item from wishlist collection
   */
  async removeFromCollection(itemId: string, userId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { id: itemId },
      include: { wishlist: true },
    });

    if (!item || item.wishlist.userId !== userId) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlistItem.delete({
      where: { id: itemId },
    });

    return { message: 'Item removed from wishlist collection' };
  }

  /**
   * Create share link for wishlist collection
   */
  async createShareLink(collectionId: string, userId: string) {
    const collection = await this.prisma.wishlistCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== userId) {
      throw new NotFoundException('Wishlist collection not found');
    }

    // Generate unique share token
    const shareToken = randomBytes(16).toString('hex');

    await this.prisma.wishlistCollection.update({
      where: { id: collectionId },
      data: {
        shareToken,
        isPublic: true,
      },
    });

    return {
      shareToken,
      shareUrl: `/wishlist/shared/${shareToken}`,
    };
  }

  /**
   * Get wishlist collection by share token
   */
  async getCollectionByShareToken(shareToken: string) {
    const collection = await this.prisma.wishlistCollection.findUnique({
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
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!collection || !collection.isPublic) {
      throw new NotFoundException('Shared wishlist not found');
    }

    return collection;
  }

  /**
   * Get items that need price drop notifications
   */
  async getItemsForPriceDropNotification() {
    return this.prisma.wishlistItem.findMany({
      where: {
        notifyOnPriceDrop: true,
      },
      include: {
        product: true,
        variant: true,
        wishlist: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get items that need back-in-stock notifications
   */
  async getItemsForStockNotification() {
    return this.prisma.wishlistItem.findMany({
      where: {
        notifyWhenInStock: true,
      },
      include: {
        product: true,
        variant: true,
        wishlist: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
