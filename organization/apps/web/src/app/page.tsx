import { Suspense } from 'react';
import { BroxivaHero } from '@/components/home/broxiva-hero';
import { TrendingProducts } from '@/components/home/trending-products';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';
import Link from 'next/link';
import { Laptop, Shirt, Home, Sparkles, Package, Building2, Star, MapPin, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col" style={{ background: '#0B0F14' }}>
      <BroxivaHero />

      {/* Categories Section */}
      <section className="py-20" style={{ background: '#0B0F14' }}>
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Browse Categories</h2>
            <p className="text-gray-400 text-lg">Find what you need from our curated marketplace</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <CategoryCard icon={<Laptop />} name="Electronics" href="/categories/electronics" />
            <CategoryCard icon={<Shirt />} name="Fashion" href="/categories/fashion" />
            <CategoryCard icon={<Home />} name="Home & Living" href="/categories/home-living" />
            <CategoryCard icon={<Sparkles />} name="Beauty" href="/categories/beauty" />
            <CategoryCard icon={<Package />} name="Digital" href="/categories/digital" />
            <CategoryCard icon={<Building2 />} name="Wholesale" href="/categories/wholesale" />
          </div>
        </div>
      </section>

      {/* Featured Vendors */}
      <section className="py-20" style={{ background: '#0F1623' }}>
        <div className="container">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Featured Vendors</h2>
              <p className="text-gray-400">Trusted sellers with verified business credentials</p>
            </div>
            <Link href="/vendors" className="hidden md:flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <VendorCard name="TechHub Pro" category="Electronics" rating={4.9} location="San Francisco, CA" verified />
            <VendorCard name="Fashion Forward" category="Apparel & Accessories" rating={4.8} location="New York, NY" verified />
            <VendorCard name="Home Essentials" category="Home & Garden" rating={4.7} location="Austin, TX" verified />
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-20" style={{ background: '#0B0F14' }}>
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Trending Now</h2>
            <p className="text-gray-400 text-lg">Most popular products this week</p>
          </div>
          <Suspense fallback={<LoadingSkeleton type="products" />}>
            <TrendingProducts />
          </Suspense>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #0E3A8A 0%, #1E40AF 100%)' }}>
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Start Selling?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of successful vendors on Broxiva. Get access to millions of customers, secure payments, and powerful selling tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/vendor/register">
              <button className="px-8 py-4 rounded-xl font-semibold text-blue-900 text-lg bg-white hover:bg-gray-100 transition-all">
                Become a Vendor
              </button>
            </Link>
            <Link href="/vendor/pricing">
              <button className="px-8 py-4 rounded-xl font-semibold text-white text-lg border-2 border-white/30 hover:bg-white/10 transition-all">
                View Pricing
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryCard({ icon, name, href }: { icon: React.ReactNode; name: string; href: string }) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl transition-all hover:-translate-y-1 cursor-pointer"
        style={{ background: '#121826', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-blue-400" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
          {icon}
        </div>
        <span className="text-sm font-medium text-white">{name}</span>
      </div>
    </Link>
  );
}

function VendorCard({ name, category, rating, location, verified }: { name: string; category: string; rating: number; location: string; verified?: boolean }) {
  return (
    <div className="p-6 rounded-2xl transition-all hover:-translate-y-1" style={{ background: '#121826', border: '1px solid rgba(255,255,255,0.10)' }}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #0E3A8A 0%, #3B82F6 100%)' }}>
          {name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{name}</h3>
            {verified && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>Verified</span>}
          </div>
          <p className="text-sm text-gray-400">{category}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-medium text-white">{rating}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{location}</span>
        </div>
      </div>
      <Link href={"/vendors/" + name.toLowerCase().replace(/\s+/g, '-')}>
        <button className="w-full mt-4 py-2.5 rounded-xl font-medium text-blue-400 transition-all" style={{ border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          Visit Store
        </button>
      </Link>
    </div>
  );
}
