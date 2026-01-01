'use client';

import Link from 'next/link';
import { Search, ShieldCheck, Truck, CreditCard, Users, Zap } from 'lucide-react';

export function BroxivaHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center" style={{ background: '#0B0F14' }}>
      {/* Background gradient overlay */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14, 58, 138, 0.3) 0%, transparent 50%)',
        }}
      />

      <div className="container relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">AI-Powered Marketplace</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Buy Smarter.{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' }}>
              Sell Faster.
            </span>
            <br />
            Scale Globally.
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Broxiva connects verified vendors with customers worldwide — secure payments, buyer protection, seamless checkout.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search products, brands, categories..."
                className="w-full h-14 pl-14 pr-40 rounded-2xl text-white text-lg"
                style={{
                  background: '#121826',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #0E3A8A 0%, #3B82F6 100%)' }}
              >
                Search
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/products">
              <button
                className="px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #0E3A8A 0%, #3B82F6 100%)',
                  boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
                }}
              >
                Shop Marketplace
              </button>
            </Link>
            <Link href="/vendor/register">
              <button
                className="px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all hover:-translate-y-0.5"
                style={{
                  background: 'transparent',
                  border: '2px solid rgba(255,255,255,0.18)'
                }}
              >
                Become a Vendor
              </button>
            </Link>
          </div>

          {/* Trust Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
            <TrustItem icon={<ShieldCheck className="w-5 h-5" />} text="Verified Vendors" />
            <TrustItem icon={<CreditCard className="w-5 h-5" />} text="Buyer Protection" />
            <TrustItem icon={<Zap className="w-5 h-5" />} text="Secure Payments" />
            <TrustItem icon={<Truck className="w-5 h-5" />} text="Global Shipping" />
            <TrustItem icon={<Users className="w-5 h-5" />} text="Fast Payouts" className="col-span-2 md:col-span-1" />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustItem({ icon, text, className = '' }: { icon: React.ReactNode; text: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${className}`}
      style={{
        background: '#121826',
        border: '1px solid rgba(255,255,255,0.10)'
      }}
    >
      <span className="text-blue-400">{icon}</span>
      <span className="text-sm font-medium text-gray-300">{text}</span>
    </div>
  );
}

export default BroxivaHero;
