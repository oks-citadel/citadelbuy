'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const footerLinks = {
  shop: [
    { name: 'New Arrivals', href: '/new-arrivals' },
    { name: 'Best Sellers', href: '/best-sellers' },
    { name: 'Deals & Promotions', href: '/deals' },
    { name: 'Gift Cards', href: '/gift-cards' },
    { name: 'Categories', href: '/categories' },
    { name: 'Brands', href: '/brands' },
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'Track Order', href: '/track-order' },
    { name: 'Shipping Info', href: '/shipping' },
    { name: 'Returns & Exchanges', href: '/returns' },
    { name: 'Size Guide', href: '/size-guide' },
    { name: 'Contact Us', href: '/contact' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
    { name: 'Sustainability', href: '/sustainability' },
    { name: 'Investors', href: '/investors' },
    { name: 'Blog', href: '/blog' },
  ],
  sell: [
    { name: 'Sell on CitadelBuy', href: '/sell' },
    { name: 'Vendor Portal', href: '/vendor/login' },
    { name: 'Vendor Guidelines', href: '/vendor/guidelines' },
    { name: 'Advertising', href: '/advertising' },
    { name: 'Affiliate Program', href: '/affiliates' },
    { name: 'Partner API', href: '/api' },
  ],
};

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/citadelbuy' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/citadelbuy' },
  { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/citadelbuy' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com/citadelbuy' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/citadelbuy' },
];

const features = [
  { icon: Truck, title: 'Free Shipping', description: 'On orders over $50' },
  { icon: RotateCcw, title: '30-Day Returns', description: 'Easy returns policy' },
  { icon: Shield, title: 'Secure Payment', description: 'Your data is safe' },
  { icon: CreditCard, title: 'Buy Now, Pay Later', description: 'Flexible payment options' },
];

export function Footer() {
  const [email, setEmail] = React.useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Newsletter subscription:', email);
    setEmail('');
  };

  return (
    <footer className="border-t bg-muted/30">
      {/* Features bar */}
      <div className="border-b">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand and newsletter */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">C</span>
              </div>
              <span className="font-bold text-xl">CitadelBuy</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6">
              Discover the future of shopping with AI-powered recommendations, visual search, and personalized experiences.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="mb-6">
              <p className="text-sm font-medium mb-2">Subscribe to our newsletter</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit">Subscribe</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Get 10% off your first order when you sign up.
              </p>
            </form>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop links */}
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <ul className="space-y-2">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell links */}
          <div>
            <h3 className="font-semibold mb-4">Sell</h3>
            <ul className="space-y-2">
              {footerLinks.sell.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            <a
              href="mailto:support@citadelbuy.com"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              support@citadelbuy.com
            </a>
            <a
              href="tel:1-800-CITADEL"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4" />
              1-800-CITADEL
            </a>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              San Francisco, CA
            </span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} CitadelBuy. All rights reserved.</span>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="hover:text-foreground transition-colors">
                Cookie Settings
              </Link>
              <Link href="/accessibility" className="hover:text-foreground transition-colors">
                Accessibility
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <img src="/payment/visa.svg" alt="Visa" className="h-6" />
              <img src="/payment/mastercard.svg" alt="Mastercard" className="h-6" />
              <img src="/payment/amex.svg" alt="American Express" className="h-6" />
              <img src="/payment/paypal.svg" alt="PayPal" className="h-6" />
              <img src="/payment/apple-pay.svg" alt="Apple Pay" className="h-6" />
              <img src="/payment/google-pay.svg" alt="Google Pay" className="h-6" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
