import { Users, Target, Award, Globe } from 'lucide-react';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

export default function AboutPage() {
  return (
    <BroxivaBackground variant="default">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-bx-text">About </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}
              >
                Broxiva
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              We are building the future of e-commerce - a marketplace where quality meets convenience,
              and every purchase feels effortless.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 sm:p-12 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-bx-bg-3 flex items-center justify-center">
                  <Target className="w-7 h-7 text-bx-pink" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-bx-text">Our Mission</h2>
              </div>
              <p className="text-bx-text-secondary text-lg leading-relaxed">
                At Broxiva, our mission is to democratize access to premium products worldwide.
                We believe that everyone deserves a shopping experience that is secure, seamless,
                and satisfying. By connecting discerning buyers with trusted sellers, we are
                creating a marketplace that prioritizes quality, transparency, and customer delight.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">
              What We Stand For
            </h2>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Our core values guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Value 1 */}
            <div className="p-8 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-bx-bg-3 flex items-center justify-center mb-6">
                <Award className="w-7 h-7 text-bx-violet" />
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-3">
                Quality First
              </h3>
              <p className="text-bx-text-muted leading-relaxed">
                Every product on our platform is carefully vetted to ensure it meets our
                high standards. We never compromise on quality.
              </p>
            </div>

            {/* Value 2 */}
            <div className="p-8 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-bx-bg-3 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-bx-cyan" />
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-3">
                Customer Centric
              </h3>
              <p className="text-bx-text-muted leading-relaxed">
                Our customers are at the heart of every decision we make. Your satisfaction
                is our success, and we are always here to help.
              </p>
            </div>

            {/* Value 3 */}
            <div className="p-8 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-bx-bg-3 flex items-center justify-center mb-6">
                <Globe className="w-7 h-7 text-bx-mint" />
              </div>
              <h3 className="text-xl font-semibold text-bx-text mb-3">
                Global Reach
              </h3>
              <p className="text-bx-text-muted leading-relaxed">
                We ship to over 150 countries, making premium products accessible to
                customers everywhere around the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">
                Our Story
              </h2>
            </div>
            <div className="space-y-6 text-bx-text-secondary text-lg leading-relaxed">
              <p>
                Broxiva was founded with a simple idea: shopping online should be a pleasure,
                not a chore. Too often, customers are overwhelmed by endless choices, unsure
                about product quality, and frustrated by complicated checkout processes.
              </p>
              <p>
                We set out to change that. By building a curated marketplace that combines
                cutting-edge technology with a human touch, we have created an experience
                that puts the joy back into shopping. From AI-powered recommendations to
                seamless checkout, every feature is designed with you in mind.
              </p>
              <p>
                Today, Broxiva serves over 50,000 happy customers worldwide, and we are just
                getting started. Join us on this journey as we continue to innovate and
                redefine what e-commerce can be.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-[var(--bx-border)]">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-bx-text mb-2">50K+</p>
              <p className="text-bx-text-muted">Happy Customers</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-bx-text mb-2">150+</p>
              <p className="text-bx-text-muted">Countries Served</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-bx-text mb-2">100K+</p>
              <p className="text-bx-text-muted">Orders Delivered</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-bx-text mb-2">4.9</p>
              <p className="text-bx-text-muted">Customer Rating</p>
            </div>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
