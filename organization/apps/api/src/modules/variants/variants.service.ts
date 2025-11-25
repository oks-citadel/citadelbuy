import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateVariantOptionDto,
  UpdateVariantOptionDto,
} from './dto/create-variant-option.dto';
import {
  CreateVariantOptionValueDto,
  UpdateVariantOptionValueDto,
} from './dto/create-variant-option-value.dto';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
  BulkCreateVariantsDto,
  BulkInventoryUpdateDto,
} from './dto/create-product-variant.dto';
import {
  AddVariantOptionToProductDto,
  RemoveVariantOptionFromProductDto,
  BulkAddVariantOptionsDto,
  GenerateVariantCombinationsDto,
} from './dto/product-variant-option.dto';

@Injectable()
export class VariantsService {
  private readonly logger = new Logger(VariantsService.name);

  constructor(private prisma: PrismaService) {}

  // ==============================================
  // VARIANT OPTION MANAGEMENT
  // ==============================================

  async createVariantOption(dto: CreateVariantOptionDto) {
    this.logger.log(`Creating variant option: ${dto.name}`);

    // Check if option with this name already exists
    const existing = await this.prisma.variantOption.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Variant option with name '${dto.name}' already exists`);
    }

    return this.prisma.variantOption.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        type: dto.type || 'SELECT',
        position: dto.position || 0,
        isRequired: dto.isRequired ?? true,
      },
      include: {
        values: true,
      },
    });
  }

  async findAllVariantOptions() {
    return this.prisma.variantOption.findMany({
      include: {
        values: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async findVariantOptionById(id: string) {
    const option = await this.prisma.variantOption.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!option) {
      throw new NotFoundException(`Variant option with ID ${id} not found`);
    }

    return option;
  }

  async updateVariantOption(id: string, dto: UpdateVariantOptionDto) {
    await this.findVariantOptionById(id);

    return this.prisma.variantOption.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.type && { type: dto.type }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
      },
      include: {
        values: true,
      },
    });
  }

  async deleteVariantOption(id: string) {
    await this.findVariantOptionById(id);

    // Check if option is used by any products
    const usageCount = await this.prisma.productVariantOption.count({
      where: { optionId: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete variant option that is used by ${usageCount} product(s)`,
      );
    }

    return this.prisma.variantOption.delete({
      where: { id },
    });
  }

  // ==============================================
  // VARIANT OPTION VALUE MANAGEMENT
  // ==============================================

  async createVariantOptionValue(dto: CreateVariantOptionValueDto) {
    this.logger.log(`Creating variant option value: ${dto.value}`);

    // Verify option exists
    await this.findVariantOptionById(dto.optionId);

    return this.prisma.variantOptionValue.create({
      data: {
        optionId: dto.optionId,
        value: dto.value,
        displayValue: dto.displayValue,
        hexColor: dto.hexColor,
        imageUrl: dto.imageUrl,
        position: dto.position || 0,
        isAvailable: dto.isAvailable ?? true,
        priceAdjustment: dto.priceAdjustment || 0,
      },
      include: {
        option: true,
      },
    });
  }

  async findAllVariantOptionValues(optionId?: string) {
    return this.prisma.variantOptionValue.findMany({
      where: optionId ? { optionId } : undefined,
      include: {
        option: true,
      },
      orderBy: { position: 'asc' },
    });
  }

  async findVariantOptionValueById(id: string) {
    const value = await this.prisma.variantOptionValue.findUnique({
      where: { id },
      include: {
        option: true,
      },
    });

    if (!value) {
      throw new NotFoundException(`Variant option value with ID ${id} not found`);
    }

    return value;
  }

  async updateVariantOptionValue(id: string, dto: UpdateVariantOptionValueDto) {
    await this.findVariantOptionValueById(id);

    return this.prisma.variantOptionValue.update({
      where: { id },
      data: {
        ...(dto.optionId && { optionId: dto.optionId }),
        ...(dto.value && { value: dto.value }),
        ...(dto.displayValue && { displayValue: dto.displayValue }),
        ...(dto.hexColor !== undefined && { hexColor: dto.hexColor }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
        ...(dto.priceAdjustment !== undefined && { priceAdjustment: dto.priceAdjustment }),
      },
      include: {
        option: true,
      },
    });
  }

  async deleteVariantOptionValue(id: string) {
    await this.findVariantOptionValueById(id);

    // Check if value is used by any variants
    const usageCount = await this.prisma.productVariantOptionValue.count({
      where: { valueId: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete variant option value that is used by ${usageCount} variant(s)`,
      );
    }

    return this.prisma.variantOptionValue.delete({
      where: { id },
    });
  }

  // ==============================================
  // PRODUCT VARIANT MANAGEMENT
  // ==============================================

  async createProductVariant(dto: CreateProductVariantDto) {
    this.logger.log(`Creating product variant: ${dto.name}`);

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Check if SKU already exists
    if (dto.sku) {
      const existingVariant = await this.prisma.productVariant.findUnique({
        where: { sku: dto.sku },
      });

      if (existingVariant) {
        throw new ConflictException(`Variant with SKU '${dto.sku}' already exists`);
      }
    }

    // If barcode provided, check uniqueness
    if (dto.barcode) {
      const existingBarcode = await this.prisma.productVariant.findUnique({
        where: { barcode: dto.barcode },
      });

      if (existingBarcode) {
        throw new ConflictException(`Variant with barcode '${dto.barcode}' already exists`);
      }
    }

    // Create variant
    const variant = await this.prisma.productVariant.create({
      data: {
        productId: dto.productId,
        sku: dto.sku,
        name: dto.name,
        price: dto.price,
        stock: dto.stock || 0,
        attributes: dto.attributes || {},
        images: dto.images || [],
        isDefault: dto.isDefault || false,
        compareAtPrice: dto.compareAtPrice,
        costPerItem: dto.costPerItem,
        weight: dto.weight,
        barcode: dto.barcode,
        taxable: dto.taxable ?? true,
        trackQuantity: dto.trackQuantity ?? true,
        continueSellingWhenOutOfStock: dto.continueSellingWhenOutOfStock || false,
        requiresShipping: dto.requiresShipping ?? true,
        position: dto.position || 0,
        isAvailable: dto.isAvailable ?? true,
      },
    });

    // Link option values if provided
    if (dto.optionValueIds && dto.optionValueIds.length > 0) {
      await this.linkOptionValuesToVariant(variant.id, dto.optionValueIds);
    }

    return this.getVariantWithDetails(variant.id);
  }

  async findAllProductVariants(productId?: string) {
    return this.prisma.productVariant.findMany({
      where: productId ? { productId } : undefined,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
          },
        },
        optionValues: {
          include: {
            value: {
              include: {
                option: true,
              },
            },
          },
        },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findProductVariantById(id: string) {
    return this.getVariantWithDetails(id);
  }

  async updateProductVariant(id: string, dto: UpdateProductVariantDto) {
    const existing = await this.getVariantWithDetails(id);

    // Check SKU uniqueness if being updated
    if (dto.sku && dto.sku !== existing.sku) {
      const existingVariant = await this.prisma.productVariant.findUnique({
        where: { sku: dto.sku },
      });

      if (existingVariant) {
        throw new ConflictException(`Variant with SKU '${dto.sku}' already exists`);
      }
    }

    // Check barcode uniqueness if being updated
    if (dto.barcode && dto.barcode !== existing.barcode) {
      const existingBarcode = await this.prisma.productVariant.findUnique({
        where: { barcode: dto.barcode },
      });

      if (existingBarcode) {
        throw new ConflictException(`Variant with barcode '${dto.barcode}' already exists`);
      }
    }

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(dto.productId && { productId: dto.productId }),
        ...(dto.sku && { sku: dto.sku }),
        ...(dto.name && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.attributes && { attributes: dto.attributes }),
        ...(dto.images && { images: dto.images }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.compareAtPrice !== undefined && { compareAtPrice: dto.compareAtPrice }),
        ...(dto.costPerItem !== undefined && { costPerItem: dto.costPerItem }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.barcode !== undefined && { barcode: dto.barcode }),
        ...(dto.taxable !== undefined && { taxable: dto.taxable }),
        ...(dto.trackQuantity !== undefined && { trackQuantity: dto.trackQuantity }),
        ...(dto.continueSellingWhenOutOfStock !== undefined && {
          continueSellingWhenOutOfStock: dto.continueSellingWhenOutOfStock,
        }),
        ...(dto.requiresShipping !== undefined && { requiresShipping: dto.requiresShipping }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
    });

    // Update option values if provided
    if (dto.optionValueIds) {
      // Remove existing links
      await this.prisma.productVariantOptionValue.deleteMany({
        where: { variantId: id },
      });

      // Create new links
      if (dto.optionValueIds.length > 0) {
        await this.linkOptionValuesToVariant(id, dto.optionValueIds);
      }
    }

    return this.getVariantWithDetails(updated.id);
  }

  async deleteProductVariant(id: string) {
    await this.getVariantWithDetails(id);

    return this.prisma.productVariant.delete({
      where: { id },
    });
  }

  async bulkCreateVariants(dto: BulkCreateVariantsDto) {
    this.logger.log(`Bulk creating ${dto.variants.length} variants for product ${dto.productId}`);

    const createdVariants = [];

    for (const variantDto of dto.variants) {
      const variant = await this.createProductVariant({
        ...variantDto,
        productId: dto.productId,
      });
      createdVariants.push(variant);
    }

    return createdVariants;
  }

  async bulkUpdateInventory(dto: BulkInventoryUpdateDto) {
    this.logger.log(`Bulk updating inventory for ${dto.updates.length} variants`);

    const updates = await Promise.all(
      dto.updates.map(async (update) => {
        return this.prisma.productVariant.update({
          where: { id: update.variantId },
          data: { stock: update.stock },
        });
      }),
    );

    return updates;
  }

  // ==============================================
  // PRODUCT-VARIANT OPTION LINKING
  // ==============================================

  async addVariantOptionToProduct(dto: AddVariantOptionToProductDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Verify option exists
    await this.findVariantOptionById(dto.optionId);

    // Check if already linked
    const existing = await this.prisma.productVariantOption.findUnique({
      where: {
        productId_optionId: {
          productId: dto.productId,
          optionId: dto.optionId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Option is already linked to this product');
    }

    return this.prisma.productVariantOption.create({
      data: {
        productId: dto.productId,
        optionId: dto.optionId,
        position: dto.position || 0,
      },
      include: {
        option: {
          include: {
            values: true,
          },
        },
      },
    });
  }

  async removeVariantOptionFromProduct(dto: RemoveVariantOptionFromProductDto) {
    const existing = await this.prisma.productVariantOption.findUnique({
      where: {
        productId_optionId: {
          productId: dto.productId,
          optionId: dto.optionId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Option is not linked to this product');
    }

    return this.prisma.productVariantOption.delete({
      where: { id: existing.id },
    });
  }

  async bulkAddVariantOptions(dto: BulkAddVariantOptionsDto) {
    const results = [];

    for (let i = 0; i < dto.optionIds.length; i++) {
      const result = await this.addVariantOptionToProduct({
        productId: dto.productId,
        optionId: dto.optionIds[i],
        position: i,
      }).catch((error) => ({ error: error.message }));

      results.push(result);
    }

    return results;
  }

  async getProductVariantOptions(productId: string) {
    return this.prisma.productVariantOption.findMany({
      where: { productId },
      include: {
        option: {
          include: {
            values: {
              where: { isAvailable: true },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  // ==============================================
  // VARIANT COMBINATION GENERATION
  // ==============================================

  async generateVariantCombinations(dto: GenerateVariantCombinationsDto) {
    this.logger.log(`Generating variant combinations for product ${dto.productId}`);

    // Get product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Get product's variant options and their values
    const productOptions = await this.getProductVariantOptions(dto.productId);

    if (productOptions.length === 0) {
      throw new BadRequestException('Product has no variant options configured');
    }

    // Generate all combinations
    const combinations = this.generateCombinations(
      productOptions.map((po) => po.option.values),
    );

    const basePrice = dto.basePrice || product.price;
    const createdVariants = [];

    for (const combination of combinations) {
      // Generate variant name from combination
      const name = combination.map((v) => v.displayValue).join(' / ');

      // Generate SKU
      const skuSuffix = combination.map((v) => v.value.toUpperCase().replace(/\s+/g, '-')).join('-');
      const sku = dto.autoGenerateSku !== false
        ? `${product.sku || product.slug}-${skuSuffix}`
        : `VAR-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Calculate price with adjustments
      const totalPriceAdjustment = combination.reduce((sum, v) => sum + v.priceAdjustment, 0);
      const price = basePrice + totalPriceAdjustment;

      // Build attributes object
      const attributes: Record<string, any> = {};
      combination.forEach((value) => {
        const optionName = productOptions.find((po) =>
          po.option.values.some((v) => v.id === value.id),
        )?.option.name;
        if (optionName) {
          attributes[optionName.toLowerCase()] = value.value;
        }
      });

      try {
        const variant = await this.createProductVariant({
          productId: dto.productId,
          sku,
          name,
          price,
          stock: dto.baseStock || 0,
          attributes,
          optionValueIds: combination.map((v) => v.id),
        });

        createdVariants.push(variant);
      } catch (error) {
        this.logger.warn(`Failed to create variant ${name}: ${error.message}`);
      }
    }

    return {
      productId: dto.productId,
      totalCombinations: combinations.length,
      createdVariants: createdVariants.length,
      variants: createdVariants,
    };
  }

  // ==============================================
  // HELPER METHODS
  // ==============================================

  private async getVariantWithDetails(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
          },
        },
        optionValues: {
          include: {
            value: {
              include: {
                option: true,
              },
            },
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Product variant with ID ${id} not found`);
    }

    return variant;
  }

  private async linkOptionValuesToVariant(variantId: string, valueIds: string[]) {
    const links = valueIds.map((valueId) => ({
      variantId,
      valueId,
    }));

    await this.prisma.productVariantOptionValue.createMany({
      data: links,
      skipDuplicates: true,
    });
  }

  private generateCombinations<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map((item) => [item]);

    const result: T[][] = [];
    const [first, ...rest] = arrays;
    const restCombinations = this.generateCombinations(rest);

    for (const item of first) {
      for (const combination of restCombinations) {
        result.push([item, ...combination]);
      }
    }

    return result;
  }
}
