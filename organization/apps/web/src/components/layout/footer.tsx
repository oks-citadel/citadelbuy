'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BuildInfo } from '@/components/common/build-info';
import { BrandLogo } from '@/components/brand/BrandLogo';

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
    { name: 'Sell on Broxiva', href: '/sell' },
    { name: 'Vendor Portal', href: '/vendor/login' },
    { name: 'Vendor Guidelines', href: '/vendor/guidelines' },
    { name: 'Advertising', href: '/advertising' },
    { name: 'Affiliate Program', href: '/affiliates' },
    { name: 'Partner API', href: '/api-docs' },
  ],
};

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/broxiva' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/broxiva' },
  { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/broxiva' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com/broxiva' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/broxiva' },
];

const features = [
  { icon: Truck, title: 'Free Shipping', description: 'On orders over $50' },
  { icon: RotateCcw, title: '30-Day Returns', description: 'Easy returns policy' },
  { icon: Shield, title: 'Secure Payment', description: '256-bit SSL encryption' },
  { icon: CreditCard, title: 'Buy Now, Pay Later', description: 'Flexible payment options' },
];

export function Footer() {
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setEmail('');
  };

  return (
    <footer className="relative overflow-hidden">
      {/* Features bar */}
      <div className="border-y bg-muted/30">
        <div className="container py-8 md:py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-6 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                Get 10% off your first order
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Join the Broxiva Community
              </h3>
              <p className="text-white/80 mb-8 text-lg">
                Subscribe for exclusive deals, early access to sales, and personalized recommendations.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white/95 border-0 text-slate-900 placeholder:text-slate-400 rounded-xl"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl whitespace-nowrap"
                >
                  Subscribe
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="bg-slate-900 text-slate-300">
        <div className="container py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand - Unified BrandLogo component */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <div className="mb-6">
                <BrandLogo variant="footer" theme="dark" />
              </div>
              <p className="text-slate-400 mb-6 leading-relaxed max-w-sm">
                Discover the future of shopping with AI-powered recommendations, visual search, and personalized experiences.
              </p>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all duration-200 hover:scale-110"
                    aria-label={social.name}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Shop links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Shop</h4>
              <ul className="space-y-3">
                {footerLinks.shop.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-slate-400 hover:text-white transition-colors inline-flex items-center group"
                    >
                      <span>{link.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div className="hidden md:block">
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sell links */}
            <div className="hidden lg:block">
              <h4 className="font-semibold text-white mb-4">Sell</h4>
              <ul className="space-y-3">
                {footerLinks.sell.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact info */}
          <div className="mt-12 pt-8 border-t border-slate-800">
            <div className="flex flex-wrap gap-6 justify-center md:justify-start">
              <a
                href="mailto:support@broxiva.com"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@broxiva.com
              </a>
              <a
                href="tel:1-800-BROXIVA"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4" />
                1-800-BROXIVA
              </a>
              <span className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                San Francisco, CA
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800">
          <div className="container py-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-sm text-slate-500">
                <span>&copy; {new Date().getFullYear()} Broxiva. All rights reserved.</span>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/cookies" className="hover:text-white transition-colors">
                  Cookie Settings
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <img src="/payment/visa.svg" alt="Visa" className="h-8 opacity-60 hover:opacity-100 transition-opacity" />
                <img src="/payment/mastercard.svg" alt="Mastercard" className="h-8 opacity-60 hover:opacity-100 transition-opacity" />
                <img src="/payment/amex.svg" alt="American Express" className="h-8 opacity-60 hover:opacity-100 transition-opacity" />
                <img src="/payment/paypal.svg" alt="PayPal" className="h-8 opacity-60 hover:opacity-100 transition-opacity" />
                <img src="/payment/apple-pay.svg" alt="Apple Pay" className="h-8 opacity-60 hover:opacity-100 transition-opacity" />
                <img src="/payment/google-pay.svg" alt="Google Pay" className="h-8 opacity-60 hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {/* Build Info - shows version, commit, and environment */}
            <div className="mt-4 flex justify-center">
              <BuildInfo variant="footer" className="text-slate-500" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
