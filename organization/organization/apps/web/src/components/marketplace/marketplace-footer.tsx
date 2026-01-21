'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  FileText,
  HelpCircle,
  MessageSquare,
  Globe,
  CreditCard,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/BrandLogo';

/**
 * MarketplaceFooter Component
 *
 * Marketplace-grade footer including:
 * - Buyer protection policy
 * - Vendor terms
 * - Dispute resolution
 * - Supported payment methods
 * - Region/currency selector
 * - Support links
 */

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/products' },
      { label: 'Categories', href: '/categories' },
      { label: 'Deals & Offers', href: '/deals' },
      { label: 'New Arrivals', href: '/new-arrivals' },
      { label: 'Best Sellers', href: '/best-sellers' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { label: 'Become a Vendor', href: '/vendor/register' },
      { label: 'Seller Dashboard', href: '/vendor/dashboard' },
      { label: 'Pricing & Fees', href: '/vendor/pricing' },
      { label: 'Vendor Guidelines', href: '/vendor/guidelines' },
      { label: 'Success Stories', href: '/vendor/success-stories' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Track Order', href: '/orders/track' },
      { label: 'Returns & Refunds', href: '/help/returns' },
      { label: 'Shipping Info', href: '/help/shipping' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Blog', href: '/blog' },
      { label: 'Affiliate Program', href: '/affiliates' },
    ],
  },
];

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/broxiva', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com/broxiva', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/broxiva', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/broxiva', label: 'LinkedIn' },
];

const paymentMethods = [
  { name: 'Visa', image: '/images/payment/visa.svg' },
  { name: 'Mastercard', image: '/images/payment/mastercard.svg' },
  { name: 'American Express', image: '/images/payment/amex.svg' },
  { name: 'PayPal', image: '/images/payment/paypal.svg' },
  { name: 'Apple Pay', image: '/images/payment/applepay.svg' },
  { name: 'Google Pay', image: '/images/payment/googlepay.svg' },
];

interface MarketplaceFooterProps {
  className?: string;
}

export const MarketplaceFooter: React.FC<MarketplaceFooterProps> = ({ className }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'bg-neutral-900 text-neutral-300',
        className
      )}
      role="contentinfo"
    >
      {/* Trust Bar */}
      <div className="border-b border-neutral-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-12">
            <Link
              href="/buyer-protection"
              className="flex items-center gap-2 text-sm hover:text-white transition-colors"
            >
              <Shield className="w-4 h-4 text-green-500" />
              Buyer Protection
            </Link>
            <Link
              href="/vendor/terms"
              className="flex items-center gap-2 text-sm hover:text-white transition-colors"
            >
              <FileText className="w-4 h-4 text-accent-500" />
              Vendor Terms
            </Link>
            <Link
              href="/dispute-resolution"
              className="flex items-center gap-2 text-sm hover:text-white transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-blue-500" />
              Dispute Resolution
            </Link>
            <Link
              href="/help"
              className="flex items-center gap-2 text-sm hover:text-white transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-purple-500" />
              Help Center
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column - Unified BrandLogo component */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="mb-4">
              <BrandLogo variant="footer" theme="dark" />
            </div>
            <p className="text-sm text-neutral-400 mb-6 max-w-xs">
              The trusted marketplace connecting quality vendors with customers worldwide.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center',
                    'bg-neutral-800 text-neutral-400',
                    'hover:bg-neutral-700 hover:text-white',
                    'transition-colors duration-200'
                  )}
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-400 hover:text-white transition-colors"
                      {...(link.external && {
                        target: '_blank',
                        rel: 'noopener noreferrer',
                      })}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment Methods & Region */}
        <div className="mt-12 pt-8 border-t border-neutral-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Payment Methods */}
            <div>
              <p className="text-xs text-neutral-500 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Accepted Payment Methods
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.name}
                    className="w-12 h-8 bg-white rounded flex items-center justify-center"
                    title={method.name}
                  >
                    <Image
                      src={method.image}
                      alt={method.name}
                      width={32}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Region Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-neutral-500" />
                <select
                  className={cn(
                    'bg-neutral-800 border border-neutral-700 rounded-lg',
                    'px-3 py-2 text-sm text-neutral-300',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500',
                    'cursor-pointer'
                  )}
                  aria-label="Select region"
                  defaultValue="us"
                >
                  <option value="us">United States</option>
                  <option value="uk">United Kingdom</option>
                  <option value="eu">European Union</option>
                  <option value="au">Australia</option>
                  <option value="ca">Canada</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <select
                className={cn(
                  'bg-neutral-800 border border-neutral-700 rounded-lg',
                  'px-3 py-2 text-sm text-neutral-300',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'cursor-pointer'
                )}
                aria-label="Select currency"
                defaultValue="usd"
              >
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
                <option value="aud">AUD (A$)</option>
                <option value="cad">CAD (C$)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-neutral-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-xs text-neutral-500">
              © {currentYear} Broxiva. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
              <Link href="/privacy" className="hover:text-neutral-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-neutral-300 transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="hover:text-neutral-300 transition-colors">
                Cookie Policy
              </Link>
              <Link href="/accessibility" className="hover:text-neutral-300 transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MarketplaceFooter;
