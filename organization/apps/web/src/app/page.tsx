import { Suspense } from 'react';
import Link from 'next/link';
import { Star, Shield, Truck, CreditCard, ChevronRight, Users, ShoppingBag, CheckCircle } from 'lucide-react';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { TrendingProducts } from '@/components/home/trending-products';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';

/**
 * Broxiva Landing Page
 *
 * Premium dark atmospheric design following the Broxiva Design System.
 * Structure:
 * 1. Hero (Above the Fold)
 * 2. Social Proof
 * 3. Value Propositions (3 Only)
 * 4. Featured Products
 * 5. How It Works
 * 6. Emotional Anchor
 * 7. Final CTA
 * 8. Footer (Minimal - handled by layout)
 */

export default function HomePage() {
  return (
    <BroxivaBackground variant="hero">
      {/* ============================================
          SECTION 1: HERO (Above the Fold)
          ============================================ */}
      <section className="relative min-h-[90vh] flex items-center justify-center py-20">
        {/* Aurora gradient overlay for hero */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.1) 0%, transparent 50%)'
          }}
        />

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-8">
              <span className="w-2 h-2 rounded-full bg-bx-mint animate-pulse" />
              <span className="text-bx-text-muted text-sm font-medium">
                Trusted by 50,000+ customers worldwide
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
              <span className="text-bx-text">Premium products.</span>
              <br />
              <span className="text-bx-text">Global delivery.</span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}
              >
                Effortless shopping.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-bx-text-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Broxiva is a modern marketplace built for discerning shoppers who value quality, security, and seamless experience.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <button
                  className="group px-8 py-4 rounded-bx-chip font-semibold text-lg text-white transition-all duration-200 hover:scale-105 shadow-bx-glow-pink"
                  style={{ background: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 100%)' }}
                >
                  Start Shopping
                  <ChevronRight className="inline-block ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              <Link href="#how-it-works">
                <button className="px-8 py-4 rounded-bx-chip font-semibold text-lg text-bx-text border border-[var(--bx-border-hover)] hover:bg-bx-bg-2 transition-all duration-200">
                  See how it works
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 2: SOCIAL PROOF
          ============================================ */}
      <section className="py-16 border-y border-[var(--bx-border)]">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
            {/* Trust Metrics */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-bx-bg-2 flex items-center justify-center">
                <Users className="w-6 h-6 text-bx-pink" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bx-text">50K+</p>
                <p className="text-bx-text-muted text-sm">Active Customers</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-bx-bg-2 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-bx-violet" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bx-text">100K+</p>
                <p className="text-bx-text-muted text-sm">Orders Delivered</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-bx-bg-2 flex items-center justify-center">
                <Star className="w-6 h-6 text-bx-gold fill-bx-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bx-text">4.9/5</p>
                <p className="text-bx-text-muted text-sm">Customer Rating</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-bx-bg-2 flex items-center justify-center">
                <Shield className="w-6 h-6 text-bx-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bx-text">100%</p>
                <p className="text-bx-text-muted text-sm">Secure Payments</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 3: VALUE PROPOSITIONS (3 Only)
          ============================================ */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">
              Why choose Broxiva?
            </h2>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              We&apos;ve built a marketplace that puts quality, security, and convenience first.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Prop 1: Curated Quality */}
            <div className="p-8 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-bx-bg-3 flex items-center justify-center mb-6">
                <CheckCircle className="w-7 h-7 text-bx-mint" />
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-3">
                Curated Quality
              </h3>
              <p className="text-bx-text-muted leading-relaxed">
                Every product vetted for excellence. No filler, no junk. Only products that meet our rigorous standards make it to our marketplace.
              </p>
            </div>

            {/* Prop 2: Secure Checkout */}
            <div className="p-8 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-bx-bg-3 flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-bx-cyan" />
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-3">
                Secure Checkout
              </h3>
              <p className="text-bx-text-muted leading-relaxed">
                Your payments protected by industry-leading 256-bit SSL encryption. Shop with confidence knowing your data is safe.
              </p>
            </div>

            {/* Prop 3: Global Delivery */}
            <div className="p-8 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-bx-bg-3 flex items-center justify-center mb-6">
                <Truck className="w-7 h-7 text-bx-violet" />
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-3">
                Global Delivery
              </h3>
              <p className="text-bx-text-muted leading-relaxed">
                Fast, reliable shipping to 150+ countries worldwide. Free shipping on orders over $50. Track your package every step of the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 4: FEATURED PRODUCTS
          ============================================ */}
      <section className="py-20 bg-bx-bg-2/50">
        <div className="container">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-bx-text mb-2">
                Trending Now
              </h2>
              <p className="text-bx-text-muted text-lg">
                Discover what&apos;s popular this week
              </p>
            </div>
            <Link href="/products">
              <button className="hidden md:flex items-center gap-2 px-6 py-3 rounded-bx-chip text-bx-text border border-[var(--bx-border-hover)] hover:bg-bx-bg-3 transition-all duration-200">
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          <Suspense fallback={<LoadingSkeleton type="products" />}>
            <TrendingProducts />
          </Suspense>
        </div>
      </section>

      {/* ============================================
          SECTION 5: HOW IT WORKS
          ============================================ */}
      <section id="how-it-works" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">
              How it works
            </h2>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Shopping made simple in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-bx-pink">1</span>
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-2">Browse</h3>
              <p className="text-bx-text-muted">
                Explore our curated collection of premium products
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-bx-violet">2</span>
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-2">Add to Cart</h3>
              <p className="text-bx-text-muted">
                Select your favorites and add them to your cart
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-bx-cyan">3</span>
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-2">Checkout</h3>
              <p className="text-bx-text-muted">
                Complete your purchase with secure, fast checkout
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 6: EMOTIONAL ANCHOR
          ============================================ */}
      <section className="py-24 relative overflow-hidden">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(139,92,246,0.1) 50%, rgba(6,182,212,0.1) 100%)'
          }}
        />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-bx-text mb-6 leading-tight">
              Shopping shouldn&apos;t feel complicated.
            </h2>
            <p className="text-bx-text-secondary text-lg sm:text-xl leading-relaxed">
              We believe in making premium products accessible to everyone. No hidden fees, no complicated processes, no compromises on quality. Just a seamless experience from browse to delivery.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 7: FINAL CTA
          ============================================ */}
      <section className="py-20">
        <div className="container">
          <div
            className="max-w-4xl mx-auto text-center p-12 rounded-bx-modal"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(6,182,212,0.15) 100%)',
              border: '1px solid var(--bx-border)'
            }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">
              Ready to discover something new?
            </h2>
            <p className="text-bx-text-muted text-lg mb-8 max-w-xl mx-auto">
              Join thousands of happy customers who've made Broxiva their go-to marketplace.
            </p>
            <Link href="/products">
              <button
                className="group px-10 py-4 rounded-bx-chip font-semibold text-lg text-white transition-all duration-200 hover:scale-105 shadow-bx-glow-violet"
                style={{ background: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 100%)' }}
              >
                Start Shopping
                <ChevronRight className="inline-block ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <p className="text-bx-text-dim text-sm mt-4">
              Free shipping on orders over $50 • 30-day returns
            </p>
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 8: PAYMENT METHODS (Trust)
          ============================================ */}
      <section className="py-12 border-t border-[var(--bx-border)]">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-bx-text-muted">
              <CreditCard className="w-5 h-5" />
              <span className="text-sm">Secure payments with</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-bx-text-muted font-medium">Visa</span>
              <span className="text-bx-text-muted font-medium">Mastercard</span>
              <span className="text-bx-text-muted font-medium">PayPal</span>
              <span className="text-bx-text-muted font-medium">Apple Pay</span>
              <span className="text-bx-text-muted font-medium">Google Pay</span>
            </div>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
