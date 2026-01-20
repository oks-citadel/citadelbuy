import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Parser } from 'json2csv';

export interface ExportFormat {
  format: 'json' | 'csv';
}

export interface UserDataExport {
  personalInformation: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  orders: any[];
  reviews: any[];
  wishlist: any[];
  searchQueries: any[];
  productViews: any[];
  subscriptions: any[];
  paymentPlans: any[];
  adCampaigns: any[];
}

@Injectable()
export class DataExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export all user data in compliance with GDPR Article 20 (Right to data portability)
   * This includes all personal data and activity associated with the user
   */
  async exportUserData(userId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
        reviews: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        wishlist: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
        searchQueries: true,
        productViews: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        subscriptions: true,
        bnplPaymentPlans: true,
        adCampaigns: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove sensitive information
    const { password, ...userWithoutPassword } = user;

    const exportData: UserDataExport = {
      personalInformation: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
        role: userWithoutPassword.role,
        createdAt: userWithoutPassword.createdAt,
        updatedAt: userWithoutPassword.updatedAt,
      },
      orders: userWithoutPassword.orders.map(order => ({
        id: order.id,
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        status: order.status,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map(item => ({
          productId: item.productId,
          productName: item.product?.name,
          productDescription: item.product?.description,
          quantity: item.quantity,
          price: item.price,
        })),
      })),
      reviews: userWithoutPassword.reviews.map(review => ({
        id: review.id,
        productId: review.productId,
        productName: review.product?.name,
        rating: review.rating,
        comment: review.comment,
        isVerifiedPurchase: review.isVerifiedPurchase,
        status: review.status,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
      wishlist: userWithoutPassword.wishlist.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name,
        productDescription: item.product?.description,
        productPrice: item.product?.price,
        addedAt: item.createdAt,
      })),
      searchQueries: userWithoutPassword.searchQueries.map(query => ({
        id: query.id,
        query: query.query,
        resultsCount: query.resultsCount,
        createdAt: query.createdAt,
      })),
      productViews: userWithoutPassword.productViews.map(view => ({
        id: view.id,
        productId: view.productId,
        productName: view.product?.name,
        viewedAt: view.createdAt,
      })),
      subscriptions: userWithoutPassword.subscriptions.map(sub => ({
        id: sub.id,
        type: sub.type,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        createdAt: sub.createdAt,
      })),
      paymentPlans: userWithoutPassword.bnplPaymentPlans.map(plan => ({
        id: plan.id,
        orderId: plan.orderId,
        amount: plan.amount,
        installments: plan.installments,
        status: plan.status,
        createdAt: plan.createdAt,
      })),
      adCampaigns: userWithoutPassword.adCampaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        budget: campaign.budget,
        status: campaign.status,
        createdAt: campaign.createdAt,
      })),
    };

    if (format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Convert user data export to CSV format
   * Creates separate CSV sections for different data types
   */
  private convertToCSV(data: UserDataExport): string {
    const sections: string[] = [];

    // Personal Information
    sections.push('=== PERSONAL INFORMATION ===');
    sections.push(this.objectToCSV([data.personalInformation]));
    sections.push('');

    // Orders
    if (data.orders.length > 0) {
      sections.push('=== ORDERS ===');
      const ordersFlat = data.orders.map(order => {
        const { items, ...orderData } = order;
        return {
          ...orderData,
          itemsCount: items.length,
        };
      });
      sections.push(this.objectToCSV(ordersFlat));
      sections.push('');
    }

    // Order Items
    const allOrderItems = data.orders.flatMap(order =>
      order.items.map(item => ({
        orderId: order.id,
        ...item,
      }))
    );
    if (allOrderItems.length > 0) {
      sections.push('=== ORDER ITEMS ===');
      sections.push(this.objectToCSV(allOrderItems));
      sections.push('');
    }

    // Reviews
    if (data.reviews.length > 0) {
      sections.push('=== REVIEWS ===');
      sections.push(this.objectToCSV(data.reviews));
      sections.push('');
    }

    // Wishlist
    if (data.wishlist.length > 0) {
      sections.push('=== WISHLIST ===');
      sections.push(this.objectToCSV(data.wishlist));
      sections.push('');
    }

    // Search Queries
    if (data.searchQueries.length > 0) {
      sections.push('=== SEARCH HISTORY ===');
      sections.push(this.objectToCSV(data.searchQueries));
      sections.push('');
    }

    // Product Views
    if (data.productViews.length > 0) {
      sections.push('=== PRODUCT VIEWS ===');
      sections.push(this.objectToCSV(data.productViews));
      sections.push('');
    }

    // Subscriptions
    if (data.subscriptions.length > 0) {
      sections.push('=== SUBSCRIPTIONS ===');
      sections.push(this.objectToCSV(data.subscriptions));
      sections.push('');
    }

    // Payment Plans
    if (data.paymentPlans.length > 0) {
      sections.push('=== PAYMENT PLANS ===');
      sections.push(this.objectToCSV(data.paymentPlans));
      sections.push('');
    }

    // Ad Campaigns
    if (data.adCampaigns.length > 0) {
      sections.push('=== AD CAMPAIGNS ===');
      sections.push(this.objectToCSV(data.adCampaigns));
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Convert an array of objects to CSV format
   */
  private objectToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No data';
    }

    try {
      const parser = new Parser();
      return parser.parse(data);
    } catch (error) {
      // Fallback to simple CSV if json2csv fails
      return this.simpleCSV(data);
    }
  }

  /**
   * Fallback simple CSV converter
   */
  private simpleCSV(data: any[]): string {
    if (!data || data.length === 0) return 'No data';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Generate a data export report with metadata
   */
  async generateExportReport(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            orders: true,
            reviews: true,
            wishlist: true,
            searchQueries: true,
            productViews: true,
            subscriptions: true,
            bnplPaymentPlans: true,
            adCampaigns: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      email: user.email,
      exportDate: new Date().toISOString(),
      dataCategories: {
        personalInformation: 1,
        orders: user._count.orders,
        reviews: user._count.reviews,
        wishlist: user._count.wishlist,
        searchQueries: user._count.searchQueries,
        productViews: user._count.productViews,
        subscriptions: user._count.subscriptions,
        paymentPlans: user._count.bnplPaymentPlans,
        adCampaigns: user._count.adCampaigns,
      },
      gdprCompliance: {
        article15: 'Right of access - Implemented',
        article20: 'Right to data portability - Implemented',
      },
      ccpaCompliance: {
        section1798_100: 'Right to know - Implemented',
        section1798_110: 'Right to access - Implemented',
      },
    };
  }
}
