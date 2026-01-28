'use client';

/**
 * FAQ Page JSON-LD Schema Component
 * Generates structured data for FAQ pages
 */

import { JsonLd } from '@/lib/seo/json-ld';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQSchemaProps {
  items: FAQItem[];
  /**
   * Main entity of the page (e.g., product or service the FAQ is about)
   */
  mainEntity?: {
    type: 'Product' | 'Service' | 'Organization' | 'WebPage';
    name: string;
    url?: string;
  };
}

/**
 * FAQSchema component
 *
 * @example
 * <FAQSchema
 *   items={[
 *     {
 *       question: "What is Broxiva?",
 *       answer: "Broxiva is a global B2B marketplace connecting buyers and sellers."
 *     },
 *     {
 *       question: "How do I create an account?",
 *       answer: "Click the Sign Up button and follow the registration process."
 *     }
 *   ]}
 * />
 */
export function FAQSchema({ items, mainEntity }: FAQSchemaProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  // Add main entity if provided
  if (mainEntity) {
    schema.about = {
      '@type': mainEntity.type,
      name: mainEntity.name,
      ...(mainEntity.url && { url: mainEntity.url }),
    };
  }

  return <JsonLd data={schema} />;
}

/**
 * Product FAQ schema - FAQs specifically about a product
 */
export function ProductFAQSchema({
  productName,
  productUrl,
  items,
}: {
  productName: string;
  productUrl: string;
  items: FAQItem[];
}) {
  return (
    <FAQSchema
      items={items}
      mainEntity={{
        type: 'Product',
        name: productName,
        url: productUrl,
      }}
    />
  );
}

/**
 * Category FAQ schema - FAQs about a product category
 */
export function CategoryFAQSchema({
  categoryName,
  items,
}: {
  categoryName: string;
  items: FAQItem[];
}) {
  if (!items || items.length === 0) {
    return null;
  }

  // Generate common category FAQs if not provided
  const defaultFAQs: FAQItem[] = [
    {
      question: `What products are available in ${categoryName}?`,
      answer: `Browse our wide selection of ${categoryName} products from verified vendors worldwide.`,
    },
    {
      question: `How do I find the best ${categoryName} deals?`,
      answer: `Use our filters to sort by price, rating, and shipping options to find the best deals in ${categoryName}.`,
    },
  ];

  const allItems = items.length > 0 ? items : defaultFAQs;

  return <FAQSchema items={allItems} />;
}

/**
 * Shipping FAQ schema
 */
export function ShippingFAQSchema({ country }: { country?: string }) {
  const items: FAQItem[] = [
    {
      question: 'What are the shipping options?',
      answer: country
        ? `We offer multiple shipping options to ${country} including standard, express, and economy shipping. Delivery times vary by seller location.`
        : 'We offer multiple shipping options including standard, express, and economy shipping. Delivery times and costs vary by destination and seller location.',
    },
    {
      question: 'How long does shipping take?',
      answer: country
        ? `Shipping to ${country} typically takes 5-15 business days for standard shipping and 2-5 business days for express shipping.`
        : 'Shipping times vary by destination. Standard shipping typically takes 7-21 business days, while express shipping takes 2-7 business days.',
    },
    {
      question: 'Do you ship internationally?',
      answer: 'Yes, we ship to over 150 countries worldwide. Shipping availability and costs vary by destination.',
    },
    {
      question: 'How can I track my order?',
      answer: 'Once your order ships, you will receive a tracking number via email. You can track your order in your account dashboard or using the tracking number on the carrier\'s website.',
    },
    {
      question: 'What if my package is lost or damaged?',
      answer: 'If your package is lost or arrives damaged, please contact our customer support within 7 days of the expected delivery date. We will work with the seller and shipping carrier to resolve the issue.',
    },
  ];

  return <FAQSchema items={items} />;
}

/**
 * Returns & Refunds FAQ schema
 */
export function ReturnsFAQSchema() {
  const items: FAQItem[] = [
    {
      question: 'What is your return policy?',
      answer: 'Our return policy allows returns within 30 days of delivery for most items. Items must be unused and in original packaging. Some exclusions apply.',
    },
    {
      question: 'How do I initiate a return?',
      answer: 'To initiate a return, go to your Order History, select the order, and click "Return Item". Follow the instructions to generate a return label.',
    },
    {
      question: 'How long does it take to receive a refund?',
      answer: 'Once we receive your return, refunds are typically processed within 5-7 business days. The refund will be credited to your original payment method.',
    },
    {
      question: 'Who pays for return shipping?',
      answer: 'Return shipping costs depend on the reason for return. If the item was defective or not as described, the seller covers return shipping. For change-of-mind returns, the buyer typically covers shipping.',
    },
    {
      question: 'Can I exchange an item?',
      answer: 'Exchanges are handled as a return and new purchase. Return the original item for a refund and place a new order for the replacement.',
    },
  ];

  return <FAQSchema items={items} />;
}

/**
 * Seller/Vendor FAQ schema
 */
export function SellerFAQSchema() {
  const items: FAQItem[] = [
    {
      question: 'How do I become a seller on Broxiva?',
      answer: 'To become a seller, click "Sell on Broxiva" and complete the vendor registration process. You will need to verify your business information and agree to our seller terms.',
    },
    {
      question: 'What are the seller fees?',
      answer: 'We charge a commission on each sale, which varies by category (typically 5-15%). There are no monthly subscription fees for basic seller accounts.',
    },
    {
      question: 'How do I list products?',
      answer: 'Once approved as a seller, you can list products through the Vendor Portal. Add product details, images, pricing, and shipping information for each listing.',
    },
    {
      question: 'When do I get paid?',
      answer: 'Sellers are paid after the buyer receives and confirms the order. Payments are processed weekly for eligible orders and transferred to your registered bank account.',
    },
    {
      question: 'What seller support is available?',
      answer: 'We provide dedicated seller support, educational resources, marketing tools, and analytics to help you grow your business on Broxiva.',
    },
  ];

  return <FAQSchema items={items} />;
}

/**
 * Payment FAQ schema
 */
export function PaymentFAQSchema() {
  const items: FAQItem[] = [
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept major credit cards (Visa, Mastercard, American Express), debit cards, PayPal, bank transfers, and various local payment methods depending on your region.',
    },
    {
      question: 'Is my payment information secure?',
      answer: 'Yes, all payments are processed securely using industry-standard encryption. We are PCI DSS compliant and never store your full card details.',
    },
    {
      question: 'Can I pay in my local currency?',
      answer: 'Yes, we support multiple currencies. Prices are automatically converted based on your location, or you can manually select your preferred currency.',
    },
    {
      question: 'What is buyer protection?',
      answer: 'Our buyer protection program ensures you receive your order as described. If an item doesn\'t arrive or is significantly different from the listing, you\'re eligible for a full refund.',
    },
    {
      question: 'Do you offer payment plans?',
      answer: 'Yes, we offer Buy Now Pay Later options through our partner services. Eligibility and terms vary by region and order value.',
    },
  ];

  return <FAQSchema items={items} />;
}

export default FAQSchema;
