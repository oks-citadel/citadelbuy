/**
 * Landing Page: For African Exporters
 * Target Audience: Nigerian, South African, Kenyan, Egyptian, Ghanaian exporters
 * Primary Keywords: "export to usa", "find international buyers", "b2b export platform"
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, Globe, Shield, TrendingUp, Users, Zap } from 'lucide-react';

export const ExportersAfricaLandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero bg-gradient-to-r from-green-900 to-green-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6">
                Export Your Products to the U.S., Europe & Beyond
              </h1>
              <p className="text-xl mb-8">
                Connect with verified international buyers actively seeking African products.
                CitadelBuy provides the platform, trade finance, logistics, and support you
                need to grow your export business.
              </p>
              <div className="flex gap-4">
                <Button size="lg" variant="default" className="bg-white text-green-900 hover:bg-gray-100">
                  Start Exporting - Free Trial
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-green-800">
                  Watch Demo Video
                </Button>
              </div>
              <p className="mt-4 text-sm">
                Join 1,000+ African exporters | Available in Nigeria, South Africa, Kenya, Egypt, Ghana
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm">
                <img
                  src="/images/hero-african-exporters.png"
                  alt="African exporters shipping to global markets"
                  className="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Metrics Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">10,000+</div>
              <p className="text-gray-600">Verified International Buyers</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">$50M+</div>
              <p className="text-gray-600">Trade Volume (2025)</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">95%</div>
              <p className="text-gray-600">On-Time Payment Rate</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">30 Days</div>
              <p className="text-gray-600">Average Time to First Sale</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            Why African Exporters Choose CitadelBuy
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Everything you need to export successfully
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Access to Global Buyers</h3>
              <p className="text-gray-600">
                Connect with U.S., European, and Middle Eastern buyers actively searching for
                African products. No more cold calling - buyers come to you.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Trade Finance Support</h3>
              <p className="text-gray-600">
                Get paid faster with invoice factoring. Offer flexible payment terms to buyers
                with our BNPL service. No more cash flow worries.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
                <Globe className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Logistics Made Easy</h3>
              <p className="text-gray-600">
                Integrated shipping, customs clearance, and documentation. We handle the
                complexity so you can focus on production.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Start Exporting in 4 Simple Steps
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Profile</h3>
              <p className="text-gray-600">
                Sign up for free. Add your company details, certifications, and product catalog.
                Get verified in 2-3 business days.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">List Your Products</h3>
              <p className="text-gray-600">
                Upload product photos, descriptions, pricing, and MOQs. Our AI suggests
                improvements to increase visibility.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Receive RFQs</h3>
              <p className="text-gray-600">
                Get Request for Quotes from verified buyers. Respond with your best pricing.
                Win deals with competitive quotes.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                4
              </div>
              <h3 className="text-xl font-semibold mb-2">Ship & Get Paid</h3>
              <p className="text-gray-600">
                Coordinate shipping with our logistics partners. Track your shipment.
                Get paid securely via escrow or LC.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Platform Features Built for African Exporters
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4 p-6 bg-gray-50 rounded-lg">
              <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Buyer Verification</h3>
                <p className="text-gray-600">
                  All buyers are verified before they can place orders. Credit checks, business
                  verification, and payment security protect you from fraud.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 bg-gray-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Invoice Factoring</h3>
                <p className="text-gray-600">
                  Get paid within 24 hours by selling your invoice to our finance partners.
                  No more waiting 60-90 days for international payments.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 bg-gray-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Market Intelligence</h3>
                <p className="text-gray-600">
                  Real-time demand data, pricing benchmarks, and competitor insights help you
                  price competitively and identify trending products.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 bg-gray-50 rounded-lg">
              <Zap className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Compliance Support</h3>
                <p className="text-gray-600">
                  Export documentation templates, customs forms, and compliance checklists.
                  Partner with certification agencies for FDA, CE, ISO approvals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Choose the plan that fits your business. Upgrade or downgrade anytime.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <p className="text-gray-600 mb-6">For small exporters getting started</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">10 product listings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">Respond to RFQs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">Basic analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">Email support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">2.5% transaction fee</span>
                </li>
              </ul>
              <Button className="w-full" variant="outline">
                Start Free Trial
              </Button>
            </div>

            {/* Growth Plan */}
            <div className="bg-green-600 text-white p-8 rounded-lg shadow-lg transform scale-105">
              <div className="bg-yellow-400 text-green-900 text-xs font-bold uppercase px-3 py-1 rounded-full inline-block mb-4">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Growth</h3>
              <p className="text-green-100 mb-6">For established exporters scaling up</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$499</span>
                <span className="text-green-100">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span>100 product listings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Priority RFQ notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Advanced analytics & insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Trade finance access (BNPL, factoring)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Phone & email support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span>2% transaction fee</span>
                </li>
              </ul>
              <Button className="w-full bg-white text-green-600 hover:bg-gray-100">
                Start Free Trial
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">For large exporters with high volume</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$2,499</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">Unlimited product listings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">White-label storefront</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">API access for integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">Priority support (2-hour response)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">1.5% transaction fee</span>
                </li>
              </ul>
              <Button className="w-full" variant="outline">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Success Stories from African Exporters
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="mb-4">
                <img src="/images/success-story-nigeria.jpg" alt="Nigerian exporter" className="w-full h-48 object-cover rounded-lg" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">From $200K to $2M in Annual Sales</h3>
              <p className="text-gray-600 mb-4">
                "CitadelBuy helped us find 15 U.S. buyers in our first 6 months. We went from
                exporting to 2 countries to 8 countries across 3 continents."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <p className="font-semibold">Chike Okonkwo</p>
                  <p className="text-sm text-gray-500">CEO, Lagos Textiles Ltd (Nigeria)</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="mb-4">
                <img src="/images/success-story-kenya.jpg" alt="Kenyan exporter" className="w-full h-48 object-cover rounded-lg" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Scaled to 50 U.S. Retailers in 12 Months</h3>
              <p className="text-gray-600 mb-4">
                "The trade finance feature was a game-changer. We could accept large orders without
                cash flow constraints. Our revenue tripled in one year."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <p className="font-semibold">Amara Kimani</p>
                  <p className="text-sm text-gray-500">Founder, Nairobi Coffee Co. (Kenya)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Grow Your Export Business?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join 1,000+ African exporters connecting with global buyers on CitadelBuy.
            Start your free 14-day trial today - no credit card required.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="default" className="bg-white text-green-900 hover:bg-gray-100">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-green-800">
              Talk to Our Team
            </Button>
          </div>
          <p className="mt-6 text-sm">
            Questions? WhatsApp us at +234-XXX-XXXX or email exporters@citadelbuy.com
          </p>
        </div>
      </section>
    </div>
  );
};

// Import CheckCircle for pricing section
import { CheckCircle } from 'lucide-react';

export default ExportersAfricaLandingPage;
