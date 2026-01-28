import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SeoService {
  constructor(private prisma: PrismaService) {}

  async upsertSeoMeta(entityType: string, entityId: string, data: any) {
    return this.prisma.seoMeta.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      update: data,
      create: { entityType, entityId, ...data },
    });
  }

  async getSeoMeta(entityType: string, entityId: string) {
    return this.prisma.seoMeta.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
  }

  async generateSitemap() {
    const products = await this.prisma.product.findMany({ select: { slug: true, updatedAt: true } });
    const categories = await this.prisma.category.findMany({ select: { slug: true, updatedAt: true } });

    const entries = [
      ...products.map(p => ({ url: `/products/${p.slug}`, lastMod: p.updatedAt, priority: 0.8 })),
      ...categories.map(c => ({ url: `/categories/${c.slug}`, lastMod: c.updatedAt, priority: 0.6 })),
    ];

    await this.prisma.sitemap.deleteMany({});
    await this.prisma.sitemap.createMany({ data: entries });

    return entries;
  }

  async getSitemap() {
    return this.prisma.sitemap.findMany({ orderBy: { priority: 'desc' } });
  }
}
