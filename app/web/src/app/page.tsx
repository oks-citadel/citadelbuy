import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Sparkles,
  Shield,
  Truck,
  CreditCard,
  Users,
  TrendingUp,
  Award,
  ArrowRight,
  Star
} from 'lucide-react';
import { FadeIn, FadeInUp, ScaleIn } from '@/components/ui/scroll-animations';

export default function Home() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Shopping',
      description: 'Personalized recommendations with 85% accuracy using advanced machine learning',
      color: 'text-blue-600'
    },
    {
      icon: Users,
      title: 'Multi-Vendor Marketplace',
      description: 'Connect with thousands of verified sellers from around the world',
      color: 'text-purple-600'
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Enterprise-grade security with multiple payment options',
      color: 'text-green-600'
    },
    {
      icon: Truck,
      title: 'Fast Shipping',
      description: 'Free shipping on orders over $50 with tracking included',
      color: 'text-orange-600'
    },
    {
      icon: CreditCard,
      title: 'Flexible Payments',
      description: 'Buy Now, Pay Later options available with 0% interest',
      color: 'text-pink-600'
    },
    {
      icon: Award,
      title: 'Loyalty Rewards',
      description: 'Earn points on every purchase and unlock exclusive perks',
      color: 'text-yellow-600'
    }
  ];

  const stats = [
    { value: '500K+', label: 'Products' },
    { value: '10K+', label: 'Vendors' },
    { value: '1M+', label: 'Customers' },
    { value: '4.9/5', label: 'Rating' }
  ];

  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border rounded-full text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Trusted by over 1 million shoppers worldwide</span>
              </div>
            </FadeIn>

            {/* Headline */}
            <FadeInUp delay={0.1}>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Shop Smarter
                </span>
                <br />
                <span>with CitadelBuy</span>
              </h1>
            </FadeInUp>

            {/* Subheadline */}
            <FadeInUp delay={0.2}>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Discover millions of products from trusted vendors. Get personalized recommendations,
                exclusive deals, and fast shipping—all in one place.
              </p>
            </FadeInUp>

            {/* CTAs */}
            <FadeInUp delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" className="text-lg px-8" asChild>
                  <Link href="/products">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Start Shopping
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                  <Link href="/deals">
                    View Deals
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </FadeInUp>

            {/* Trust Badges */}
            <FadeIn delay={0.4}>
              <div className="flex flex-wrap gap-6 justify-center items-center pt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Free Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>4.9/5 Rating</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <ScaleIn key={stat.label} delay={index * 0.1}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <FadeInUp>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Shop with CitadelBuy?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the future of online shopping with cutting-edge features designed for you
            </p>
          </div>
        </FadeInUp>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <FadeInUp key={feature.title} delay={index * 0.1}>
                <div className="group p-6 border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  <div className={`inline-flex p-3 rounded-lg bg-muted group-hover:scale-110 transition-transform ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mt-4 mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </FadeInUp>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-20 text-center">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Shopping?
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Join millions of satisfied customers and discover your next favorite product today
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
                <Link href="/products">Browse All Products</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent border-white text-white hover:bg-white hover:text-purple-600" asChild>
                <Link href="/auth/register">Create Free Account</Link>
              </Button>
            </div>
          </FadeInUp>
        </div>
      </section>
    </main>
  );
}
