/**
 * Landing Page: African Suppliers for U.S. Buyers
 * Target Audience: U.S. procurement officers, sourcing managers, importers
 * Primary Keywords: "african suppliers", "import from africa", "b2b african trade"
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Globe, Shield, TrendingDown, Truck, Users } from 'lucide-react';

export const AfricaSuppliersUSLandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero bg-gradient-to-r from-blue-900 to-blue-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6">
                Source Quality Products from Verified African Suppliers
              </h1>
              <p className="text-xl mb-8">
                Connect with 10,000+ vetted manufacturers and exporters across Nigeria,
                South Africa, Kenya, Egypt, and Ghana. Save 20-30% on sourcing costs with
                CitadelBuy's enterprise B2B marketplace.
              </p>
              <div className="flex gap-4">
                <Button size="lg" variant="default" className="bg-white text-blue-900 hover:bg-gray-100">
                  Get Started - Free
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-800">
                  Request Demo
                </Button>
              </div>
              <p className="mt-4 text-sm">
                Trusted by 500+ U.S. companies | No credit card required
              </p>
            </div>
            <div className="hidden md:block">
              {/* Placeholder for hero image/video */}
              <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm">
                <img
                  src="/images/hero-african-suppliers.png"
                  alt="African manufacturing and U.S. buyers connecting"
                  className="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-600 mb-8">Trusted by leading U.S. companies:</p>
          <div className="flex justify-center items-center gap-12 flex-wrap opacity-60">
            {/* Placeholder for company logos */}
            <div className="h-12 w-32 bg-gray-300 rounded"></div>
            <div className="h-12 w-32 bg-gray-300 rounded"></div>
            <div className="h-12 w-32 bg-gray-300 rounded"></div>
            <div className="h-12 w-32 bg-gray-300 rounded"></div>
            <div className="h-12 w-32 bg-gray-300 rounded"></div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            Why U.S. Companies Choose African Suppliers
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Diversify your supply chain and unlock competitive advantages
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                <TrendingDown className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Save 20-30% on Costs</h3>
              <p className="text-gray-600">
                African suppliers offer competitive pricing with quality comparable to Asian
                manufacturers. Benefit from AGOA duty-free imports for eligible products.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Faster Shipping Times</h3>
              <p className="text-gray-600">
                West African suppliers ship to U.S. East Coast in 14-21 days vs. 30-45 days
                from Asia. Reduce inventory holding costs and improve cash flow.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
                <Globe className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Supply Chain Diversification</h3>
              <p className="text-gray-600">
                Reduce dependency on single-region sourcing. Access Africa's $3.4T economy
                and tap into the African Continental Free Trade Area (AfCFTA).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Everything You Need to Source with Confidence
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4 p-6 bg-white rounded-lg shadow-sm">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Verified Suppliers Only</h3>
                <p className="text-gray-600">
                  3-tier verification process: document checks, on-site audits, and buyer
                  ratings. Every supplier is vetted for quality, capacity, and compliance.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 bg-white rounded-lg shadow-sm">
              <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Trade Finance & BNPL</h3>
                <p className="text-gray-600">
                  Access Buy Now, Pay Later (BNPL), invoice factoring, and letter of credit
                  services. Preserve working capital with flexible payment terms.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 bg-white rounded-lg shadow-sm">
              <Truck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">End-to-End Logistics</h3>
                <p className="text-gray-600">
                  Integrated shipping, customs clearance, and warehousing. Real-time
                  tracking from factory to your doorstep.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 bg-white rounded-lg shadow-sm">
              <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Dedicated Support</h3>
                <p className="text-gray-600">
                  Enterprise accounts get a dedicated account manager, RFQ assistance,
                  and priority support for complex cross-border transactions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            How CitadelBuy Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Search Suppliers</h3>
              <p className="text-gray-600">
                Browse 10,000+ suppliers by product category, country, certifications, and ratings.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Submit RFQs</h3>
              <p className="text-gray-600">
                Request quotes from multiple suppliers. Get competitive pricing and compare offers.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payment</h3>
              <p className="text-gray-600">
                Use escrow, LC, or BNPL for secure transactions. Funds released when goods are delivered.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-semibold mb-2">Track & Receive</h3>
              <p className="text-gray-600">
                Real-time shipment tracking. Customs clearance handled. Products delivered to your warehouse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Products Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            Top Products Sourced from Africa
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Explore our most popular categories
          </p>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              'Agricultural Products (Cocoa, Coffee, Cashews)',
              'Textiles & Apparel',
              'Beauty & Personal Care (Shea Butter, Black Soap)',
              'Leather Goods & Footwear',
              'Home Decor & Handicrafts',
              'Food & Beverages',
              'Minerals & Natural Resources',
              'Manufacturing Components'
            ].map((product, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-2">{product}</h3>
                <a href="#" className="text-blue-600 text-sm hover:underline">
                  Browse suppliers →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            What Our Customers Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex mb-4">
                {[1,2,3,4,5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                "We've reduced sourcing costs by 28% by switching to African suppliers on CitadelBuy.
                The quality is excellent and shipping is faster than we expected."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <p className="font-semibold">Sarah Johnson</p>
                  <p className="text-sm text-gray-500">VP of Procurement, XYZ Retail</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex mb-4">
                {[1,2,3,4,5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                "CitadelBuy's verification process gave us confidence in our African suppliers.
                We've found reliable partners for our manufacturing needs."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <p className="font-semibold">Michael Chen</p>
                  <p className="text-sm text-gray-500">Sourcing Director, ABC Manufacturing</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex mb-4">
                {[1,2,3,4,5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                "The trade finance options made it easy to place large orders without tying up our
                working capital. Game-changer for our business."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div>
                  <p className="font-semibold">Emily Rodriguez</p>
                  <p className="text-sm text-gray-500">CFO, GlobalTrade Inc.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Discover Your Next African Supplier?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join 500+ U.S. companies saving 20-30% on sourcing costs.
            Start browsing verified suppliers today - no credit card required.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="default" className="bg-white text-blue-900 hover:bg-gray-100">
              Create Free Account
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-800">
              Schedule a Demo
            </Button>
          </div>
          <p className="mt-6 text-sm">
            Questions? Call us at 1-800-CITADEL or email sales@citadelbuy.com
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <details className="bg-gray-50 p-6 rounded-lg">
              <summary className="font-semibold text-lg cursor-pointer">
                How are suppliers verified on CitadelBuy?
              </summary>
              <p className="mt-4 text-gray-600">
                We use a 3-tier verification process: (1) Document verification (business license,
                certifications), (2) On-site audit by local partners, and (3) Ongoing buyer ratings
                and reviews. Only suppliers meeting our standards are approved.
              </p>
            </details>
            <details className="bg-gray-50 p-6 rounded-lg">
              <summary className="font-semibold text-lg cursor-pointer">
                What payment methods are supported?
              </summary>
              <p className="mt-4 text-gray-600">
                We support escrow, letter of credit (LC), wire transfer, and Buy Now Pay Later (BNPL)
                for qualified buyers. Payment is secured until goods are delivered and inspected.
              </p>
            </details>
            <details className="bg-gray-50 p-6 rounded-lg">
              <summary className="font-semibold text-lg cursor-pointer">
                How long does shipping take from Africa to the U.S.?
              </summary>
              <p className="mt-4 text-gray-600">
                Shipping times vary by origin and destination. West Africa (Nigeria, Ghana) to U.S.
                East Coast: 14-21 days. Southern Africa (South Africa) to U.S.: 18-25 days. We provide
                real-time tracking for all shipments.
              </p>
            </details>
            <details className="bg-gray-50 p-6 rounded-lg">
              <summary className="font-semibold text-lg cursor-pointer">
                What about customs and import duties?
              </summary>
              <p className="mt-4 text-gray-600">
                Our logistics partners handle customs clearance. Many African products qualify for
                duty-free import under AGOA (African Growth and Opportunity Act). We provide compliance
                guidance for all transactions.
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AfricaSuppliersUSLandingPage;
