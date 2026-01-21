'use client';

import Link from 'next/link';
import { Users, DollarSign, Link2, BarChart3, Gift, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const benefits = [
  { icon: DollarSign, title: 'Up to 10% Commission', description: 'Earn competitive commissions on every qualifying purchase.' },
  { icon: Link2, title: 'Easy Link Creation', description: 'Generate affiliate links in seconds for any product.' },
  { icon: BarChart3, title: 'Real-Time Analytics', description: 'Track clicks, conversions, and earnings with our dashboard.' },
  { icon: Gift, title: 'Monthly Payouts', description: 'Get paid reliably every month via bank transfer or PayPal.' },
];

const steps = [
  { step: 1, title: 'Sign Up', description: 'Create your free affiliate account in just 2 minutes.' },
  { step: 2, title: 'Get Links', description: 'Browse products and generate your unique affiliate links.' },
  { step: 3, title: 'Share & Promote', description: 'Share links on your website, social media, or email.' },
  { step: 4, title: 'Earn Money', description: 'Earn commission when your referrals make purchases.' },
];

const commissionRates = [
  { category: 'Electronics', rate: '4%' },
  { category: 'Fashion', rate: '8%' },
  { category: 'Home & Garden', rate: '7%' },
  { category: 'Beauty', rate: '10%' },
  { category: 'Sports', rate: '6%' },
  { category: 'Books', rate: '5%' },
];

export default function AffiliatesPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Users className="w-4 h-4 text-bx-cyan" />
              <span className="text-sm font-medium text-bx-text">Partner Program</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Broxiva </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Affiliate Program
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Earn money by sharing products you love. Join thousands of content creators and earn commission on every sale.
            </p>
            <Button size="lg" className="mt-8 bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
              Join Now - It is Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="bg-bx-bg-2 border-[var(--bx-border)]">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="w-6 h-6 text-bx-pink" />
                    </div>
                    <h3 className="font-semibold text-bx-text mb-2">{benefit.title}</h3>
                    <p className="text-sm text-bx-text-muted">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {steps.map((item) => (
                    <div key={item.step} className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-bx-pink to-bx-violet flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold">{item.step}</span>
                      </div>
                      <h4 className="font-semibold text-bx-text mb-2">{item.title}</h4>
                      <p className="text-sm text-bx-text-muted">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Commission Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {commissionRates.map((item) => (
                    <div key={item.category} className="flex items-center justify-between p-4 rounded-xl bg-bx-bg-3">
                      <span className="text-bx-text">{item.category}</span>
                      <span className="text-xl font-bold text-green-500">{item.rate}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-bx-text-muted mt-4 text-center">
                  Commission rates may vary. 30-day cookie window for all referrals.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">Program Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Active website, blog, or social media presence',
                    'Content that aligns with Broxiva values',
                    'No bidding on branded keywords in paid search',
                    'Comply with FTC disclosure requirements',
                    'Minimum payout threshold of $50',
                    'Valid PayPal or bank account for payments',
                  ].map((req, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <p className="text-bx-text-muted">{req}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-bx-pink/10 via-bx-violet/10 to-bx-cyan/10 border-[var(--bx-border)]">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold text-bx-text mb-4">Ready to start earning?</h3>
                <p className="text-bx-text-muted mb-6">Join our affiliate program today and turn your audience into income.</p>
                <Button size="lg" className="bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
                  Apply Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
