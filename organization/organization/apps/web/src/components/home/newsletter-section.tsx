'use client';

import * as React from 'react';
import { Mail, Gift, Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function NewsletterSection() {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubscribed, setIsSubscribed] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubscribed(true);
      toast.success('Welcome! Check your email for your 15% off code.');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-primary-foreground text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">You're In!</h2>
        <p className="text-primary-foreground/80 max-w-md mx-auto">
          Check your inbox for your 15% off code. We can't wait to share our
          best deals and AI shopping tips with you!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-primary-foreground">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-6 w-6" />
            <span className="text-sm font-medium">Exclusive Offer</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Get 15% Off Your First Order
          </h2>
          <p className="text-primary-foreground/80 mb-6">
            Subscribe to our newsletter and unlock exclusive deals, AI shopping
            tips, and early access to new features.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Price drop alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span>Exclusive offers</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Weekly curations</span>
            </div>
          </div>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white text-foreground"
              required
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full bg-white text-primary hover:bg-white/90"
              isLoading={isLoading}
            >
              Subscribe & Get 15% Off
            </Button>
            <p className="text-xs text-primary-foreground/60 text-center">
              By subscribing, you agree to our Privacy Policy and Terms of Service.
              Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
