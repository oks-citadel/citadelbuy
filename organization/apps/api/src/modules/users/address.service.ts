import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all addresses for a user
   */
  async findAllByUserId(userId: string) {
    return this.prisma.savedAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get a specific address by ID
   */
  async findOne(id: string, userId: string) {
    const address = await this.prisma.savedAddress.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    if (address.userId !== userId) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return address;
  }

  /**
   * Get the default address for a user
   */
  async findDefault(userId: string) {
    return this.prisma.savedAddress.findFirst({
      where: { userId, isDefault: true },
    });
  }

  /**
   * Create a new address
   */
  async create(userId: string, createAddressDto: CreateAddressDto) {
    // If this is set as default, unset all other defaults for this user
    if (createAddressDto.isDefault) {
      await this.prisma.savedAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.savedAddress.create({
      data: {
        ...createAddressDto,
        userId,
      },
    });
  }

  /**
   * Update an existing address
   */
  async update(id: string, userId: string, updateAddressDto: UpdateAddressDto) {
    // Verify ownership
    const address = await this.findOne(id, userId);

    // If setting as default, unset all other defaults
    if (updateAddressDto.isDefault) {
      await this.prisma.savedAddress.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.savedAddress.update({
      where: { id },
      data: updateAddressDto,
    });
  }

  /**
   * Set an address as default
   */
  async setDefault(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    // Unset all other defaults
    await this.prisma.savedAddress.updateMany({
      where: { userId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });

    // Set this one as default
    return this.prisma.savedAddress.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  /**
   * Delete an address
   */
  async remove(id: string, userId: string) {
    // Verify ownership
    const address = await this.findOne(id, userId);

    // Prevent deletion of the only address if it's default
    if (address.isDefault) {
      const addressCount = await this.prisma.savedAddress.count({
        where: { userId },
      });

      if (addressCount > 1) {
        // Set another address as default before deleting
        const nextAddress = await this.prisma.savedAddress.findFirst({
          where: { userId, id: { not: id } },
          orderBy: { createdAt: 'desc' },
        });

        if (nextAddress) {
          await this.prisma.savedAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    }

    await this.prisma.savedAddress.delete({
      where: { id },
    });

    return { message: 'Address deleted successfully' };
  }
}
