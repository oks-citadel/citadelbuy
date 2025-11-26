import { Suspense } from 'react';
import { HeroSection } from '@/components/home/hero-section';
import { FeaturedCategories } from '@/components/home/featured-categories';
import { TrendingProducts } from '@/components/home/trending-products';
import { PersonalizedRecommendations } from '@/components/home/personalized-recommendations';
import { FlashDeals } from '@/components/home/flash-deals';
import { NewArrivals } from '@/components/home/new-arrivals';
import { BrandsSection } from '@/components/home/brands-section';
import { AIFeaturesBanner } from '@/components/home/ai-features-banner';
import { TestimonialSection } from '@/components/home/testimonial-section';
import { NewsletterSection } from '@/components/home/newsletter-section';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero Section with AI Search */}
      <HeroSection />

      {/* Featured Categories */}
      <section className="container">
        <Suspense fallback={<LoadingSkeleton type="categories" />}>
          <FeaturedCategories />
        </Suspense>
      </section>

      {/* Flash Deals */}
      <section className="bg-destructive/5">
        <div className="container py-8">
          <Suspense fallback={<LoadingSkeleton type="products" />}>
            <FlashDeals />
          </Suspense>
        </div>
      </section>

      {/* Personalized Recommendations */}
      <section className="container">
        <Suspense fallback={<LoadingSkeleton type="products" />}>
          <PersonalizedRecommendations />
        </Suspense>
      </section>

      {/* AI Features Banner */}
      <AIFeaturesBanner />

      {/* Trending Products */}
      <section className="container">
        <Suspense fallback={<LoadingSkeleton type="products" />}>
          <TrendingProducts />
        </Suspense>
      </section>

      {/* New Arrivals */}
      <section className="container">
        <Suspense fallback={<LoadingSkeleton type="products" />}>
          <NewArrivals />
        </Suspense>
      </section>

      {/* Brands */}
      <section className="container">
        <Suspense fallback={<LoadingSkeleton type="brands" />}>
          <BrandsSection />
        </Suspense>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/50">
        <div className="container py-12">
          <TestimonialSection />
        </div>
      </section>

      {/* Newsletter */}
      <section className="container">
        <NewsletterSection />
      </section>
    </div>
  );
}
