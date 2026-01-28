'use client';

import { useState } from 'react';
import { Gift, CreditCard, Mail, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const giftCardAmounts = [25, 50, 100, 150, 200, 500];

export default function GiftCardsPage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');

  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Gift className="w-4 h-4 text-bx-pink" />
              <span className="text-sm font-medium text-bx-text">Perfect for Any Occasion</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Broxiva </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Gift Cards
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Give the gift of choice. Broxiva gift cards never expire and can be used on millions of products.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <CreditCard className="w-5 h-5 text-bx-violet" />
                  Select Amount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {giftCardAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedAmount === amount
                          ? 'border-bx-pink bg-bx-pink/10 text-bx-text'
                          : 'border-[var(--bx-border)] bg-bx-bg-3 text-bx-text-muted hover:border-[var(--bx-border-hover)]'
                      }`}
                    >
                      <span className="text-xl font-bold">${amount}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom" className="text-bx-text">Custom Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bx-text-muted">$</span>
                    <Input
                      id="custom"
                      type="number"
                      placeholder="Enter amount (10-1000)"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                      className="pl-8 bg-bx-bg-3 border-[var(--bx-border)]"
                      min="10"
                      max="1000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Mail className="w-5 h-5 text-bx-cyan" />
                  Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-bx-text">Recipient Email</Label>
                  <Input id="recipient" type="email" placeholder="friend@email.com" className="bg-bx-bg-3 border-[var(--bx-border)]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-bx-text">Recipient Name</Label>
                  <Input id="name" placeholder="Friend's name" className="bg-bx-bg-3 border-[var(--bx-border)]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-bx-text">Personal Message (Optional)</Label>
                  <Textarea id="message" placeholder="Add a personal message..." rows={3} className="bg-bx-bg-3 border-[var(--bx-border)]" />
                </div>
                <Button size="lg" className="w-full bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Purchase Gift Card - ${selectedAmount || customAmount || 0}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Check, title: 'Never Expires', description: 'Your gift card balance never expires' },
              { icon: Gift, title: 'Instant Delivery', description: 'Delivered via email within minutes' },
              { icon: CreditCard, title: 'Easy to Use', description: 'Apply at checkout on any purchase' },
            ].map((feature) => (
              <div key={feature.title} className="text-center p-6 rounded-xl bg-bx-bg-2 border border-[var(--bx-border)]">
                <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-bx-violet" />
                </div>
                <h3 className="font-semibold text-bx-text mb-2">{feature.title}</h3>
                <p className="text-sm text-bx-text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
