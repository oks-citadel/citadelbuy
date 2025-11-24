import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { NewsletterSignup } from '@/components/newsletter/newsletter-signup';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Shop',
      links: [
        { label: 'All Products', href: '/products' },
        { label: 'Categories', href: '/categories' },
        { label: 'Deals & Offers', href: '/deals' },
        { label: 'Gift Cards', href: '/gift-cards' },
        { label: 'Loyalty Program', href: '/loyalty' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'My Orders', href: '/orders' },
        { label: 'My Profile', href: '/profile' },
        { label: 'Wishlist', href: '/wishlist' },
        { label: 'Store Credit', href: '/account/store-credit' },
        { label: 'Returns', href: '/returns' },
      ],
    },
    {
      title: 'Vendors',
      links: [
        { label: 'Become a Seller', href: '/vendor/onboarding' },
        { label: 'Vendor Dashboard', href: '/vendor/dashboard' },
        { label: 'Seller Resources', href: '/vendor/resources' },
        { label: 'Vendor Support', href: '/vendor/support' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact Us', href: '/contact' },
        { label: 'Careers', href: '/careers' },
        { label: 'Press', href: '/press' },
        { label: 'Blog', href: '/blog' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Shipping Info', href: '/shipping' },
        { label: 'Returns Policy', href: '/returns-policy' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
  ];

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com/citadelbuy', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com/citadelbuy', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com/citadelbuy', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com/company/citadelbuy', label: 'LinkedIn' },
  ];

  const paymentMethods = ['Visa', 'Mastercard', 'AmEx', 'PayPal', 'Apple Pay', 'Google Pay'];

  return (
    <footer className="border-t bg-muted/50">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="text-2xl font-bold">
              CitadelBuy
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Your trusted marketplace for quality products from verified vendors around the world.
              Shop with confidence.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@citadelbuy.com" className="hover:text-primary">
                  support@citadelbuy.com
                </a>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <a href="tel:+1234567890" className="hover:text-primary">
                  +1 (234) 567-890
                </a>
              </div>
              <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>123 Commerce Street<br />New York, NY 10001</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-6 flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer Links Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 border-t pt-8">
          <div className="max-w-md">
            <h3 className="font-semibold mb-2">Subscribe to our newsletter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get the latest deals, new products, and exclusive offers delivered to your inbox.
            </p>
            <NewsletterSignup variant="inline" />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {currentYear} CitadelBuy. All rights reserved.
            </p>

            {/* Payment Methods */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">We accept:</span>
              <div className="flex gap-2">
                {paymentMethods.map((method) => (
                  <div
                    key={method}
                    className="h-6 px-2 flex items-center justify-center text-xs font-medium bg-muted rounded border"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Links */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-primary">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-primary">
                Terms
              </Link>
              <Link href="/cookies" className="hover:text-primary">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
