'use client';

import Link from 'next/link';
import { Store, DollarSign, TrendingUp, Users, Package, Shield, Zap, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const benefits = [
  {
    icon: Users,
    title: 'Reach Millions',
    description: 'Access our growing customer base of millions of active shoppers',
  },
  {
    icon: DollarSign,
    title: 'Low Fees',
    description: 'Competitive commission rates starting at just 5%',
  },
  {
    icon: Zap,
    title: 'Fast Payouts',
    description: 'Get paid weekly with direct deposit to your bank',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Detailed insights and reports to grow your business',
  },
  {
    icon: Package,
    title: 'Fulfillment',
    description: 'Optional fulfillment services for hassle-free shipping',
  },
  {
    icon: Shield,
    title: 'Protection',
    description: 'Seller protection program for peace of mind',
  },
];

const plans = [
  {
    name: 'Starter',
    price: 0,
    description: 'Perfect for individuals and small sellers',
    features: [
      'Up to 50 listings',
      '8% commission per sale',
      'Basic analytics',
      'Email support',
      'Standard payout (7 days)',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 29,
    description: 'For growing businesses',
    features: [
      'Unlimited listings',
      '5% commission per sale',
      'Advanced analytics',
      'Priority support',
      'Fast payout (3 days)',
      'Promotional tools',
      'Bulk listing tools',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    description: 'For large-scale operations',
    features: [
      'Everything in Professional',
      '3% commission per sale',
      'API access',
      'Dedicated account manager',
      'Express payout (1 day)',
      'Custom integrations',
      'White-label options',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function SellPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary via-purple-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
              <Store className="h-5 w-5" />
              <span>Join 10,000+ successful sellers</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Start Selling on Broxiva
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Turn your passion into profit. Reach millions of customers and grow your business with our powerful selling tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
                Start Selling for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">5M+</div>
              <div className="text-gray-600">Active Customers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">$2B+</div>
              <div className="text-gray-600">Total Sales</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-gray-600">Active Sellers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-gray-600">Seller Satisfaction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Sell on Broxiva?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We provide everything you need to succeed as an online seller
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-6">
                <benefit.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600">Choose the plan that fits your business</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.highlighted
                    ? 'border-2 border-primary shadow-xl scale-105'
                    : 'border'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.highlighted ? '' : 'bg-gray-900 hover:bg-gray-800'}`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-12 text-center text-white">
          <TrendingUp className="h-16 w-16 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of successful sellers and start your e-commerce journey today.
            No upfront costs, no hidden fees.
          </p>
          <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
            Create Your Seller Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
