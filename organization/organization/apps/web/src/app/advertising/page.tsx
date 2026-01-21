'use client';

import Link from 'next/link';
import { Megaphone, Target, BarChart3, Zap, Users, DollarSign, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const adFormats = [
  { name: 'Sponsored Products', description: 'Boost visibility for individual product listings in search results and category pages.', icon: Target },
  { name: 'Display Ads', description: 'Eye-catching banner ads across the Broxiva platform and partner sites.', icon: Megaphone },
  { name: 'Brand Stores', description: 'Create a custom storefront to showcase your brand and product catalog.', icon: Users },
  { name: 'Video Ads', description: 'Engaging video content in product listings and discovery feeds.', icon: Zap },
];

const benefits = [
  'Reach millions of high-intent shoppers',
  'Pay only for clicks or impressions',
  'Advanced targeting by demographics and behavior',
  'Real-time analytics and reporting',
  'AI-optimized bidding strategies',
  'Dedicated account management',
];

const pricingTiers = [
  { name: 'Starter', minSpend: '$500/mo', features: ['Sponsored Products', 'Basic Analytics', 'Self-Service Platform'] },
  { name: 'Growth', minSpend: '$2,500/mo', features: ['All Ad Formats', 'Advanced Analytics', 'Priority Support'] },
  { name: 'Enterprise', minSpend: '$10,000/mo', features: ['Custom Solutions', 'Dedicated Manager', 'API Access'] },
];

export default function AdvertisingPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Megaphone className="w-4 h-4 text-bx-pink" />
              <span className="text-sm font-medium text-bx-text">Broxiva Ads</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Advertise on </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Broxiva
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Reach millions of shoppers actively looking to buy. Drive sales with targeted advertising solutions.
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {adFormats.map((format) => (
                <Card key={format.name} className="bg-bx-bg-2 border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center mb-4">
                      <format.icon className="w-6 h-6 text-bx-pink" />
                    </div>
                    <h3 className="font-semibold text-bx-text mb-2">{format.name}</h3>
                    <p className="text-sm text-bx-text-muted">{format.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <BarChart3 className="w-5 h-5 text-bx-violet" />
                  Why Advertise With Us?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <p className="text-bx-text">{benefit}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-2xl font-bold text-bx-text mb-6 text-center">Advertising Plans</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {pricingTiers.map((tier, index) => (
                  <Card key={tier.name} className={`bg-bx-bg-2 border-[var(--bx-border)] ${index === 1 ? 'ring-2 ring-bx-pink' : ''}`}>
                    <CardContent className="p-6">
                      {index === 1 && (
                        <div className="text-center mb-4">
                          <span className="px-3 py-1 rounded-full bg-bx-pink/10 text-bx-pink text-sm font-medium">Most Popular</span>
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-bx-text text-center mb-2">{tier.name}</h3>
                      <p className="text-center text-bx-text-muted mb-6">Min. {tier.minSpend}</p>
                      <ul className="space-y-3 mb-6">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-bx-text-muted">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button className={`w-full ${index === 1 ? 'bg-gradient-to-r from-bx-pink to-bx-violet text-white' : ''}`} variant={index === 1 ? 'default' : 'outline'}>
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="bg-gradient-to-r from-bx-pink/10 via-bx-violet/10 to-bx-cyan/10 border-[var(--bx-border)]">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold text-bx-text mb-4">Ready to grow your business?</h3>
                <p className="text-bx-text-muted mb-6">Talk to our advertising team to create a custom campaign strategy.</p>
                <Button size="lg" className="bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
                  Contact Sales
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
