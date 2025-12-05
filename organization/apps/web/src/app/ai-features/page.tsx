'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Camera, MessageSquare, Target, Brain, ShieldCheck, Zap, BarChart3, ArrowRight, Mic, Eye, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { VoiceSearch } from '@/components/ai/voice';
import { VirtualTryOn } from '@/components/ai/virtual-tryon';
import { RecommendationCarousel } from '@/components/ai/recommendations';

const aiFeatures = [
  {
    icon: Camera,
    title: 'Visual Search',
    description: 'Snap a photo and find similar products instantly. Our AI analyzes images to match products from our catalog.',
    benefits: ['Find products without knowing names', 'Match styles you see in real life', 'Discover similar items instantly'],
    link: '/visual-search',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Mic,
    title: 'Voice Search',
    description: 'Speak naturally to search for products. Our AI understands your voice commands and finds exactly what you need.',
    benefits: ['Hands-free shopping', 'Natural language understanding', 'Instant voice-to-search'],
    link: '#voice-demo',
    color: 'from-blue-500 to-cyan-500',
    isDemo: true,
  },
  {
    icon: Eye,
    title: 'Virtual Try-On',
    description: 'See how products look on you with AR technology. Upload your photo and try on eyewear, jewelry, and accessories.',
    benefits: ['Try before you buy', 'AR-powered preview', 'Share with friends'],
    link: '#tryon-demo',
    color: 'from-purple-500 to-violet-500',
    isDemo: true,
  },
  {
    icon: Target,
    title: 'Smart Recommendations',
    description: 'Our AI learns your preferences to show you products you will love, tailored just for you.',
    benefits: ['Personalized product feed', 'Similar item suggestions', 'Trending picks for you'],
    link: '/for-you',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Brain,
    title: 'Dynamic Pricing',
    description: 'AI-powered pricing ensures you always get the best deals based on market conditions and demand.',
    benefits: ['Real-time price optimization', 'Automatic deal alerts', 'Price drop notifications'],
    link: '/deals',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: ShieldCheck,
    title: 'Fraud Detection',
    description: 'Advanced AI monitors transactions to protect you from fraudulent activities and secure your purchases.',
    benefits: ['Real-time fraud prevention', 'Secure transactions', 'Account protection'],
    link: '/account/security',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: BarChart3,
    title: 'Trend Prediction',
    description: 'Stay ahead with AI-powered trend forecasting that shows you what is hot before it goes mainstream.',
    benefits: ['Early trend alerts', 'Popular item predictions', 'Style forecasting'],
    link: '/trending',
    color: 'from-red-500 to-pink-500',
  },
];

// Demo products for Virtual Try-On
const tryOnProducts = [
  { id: '1', name: 'Classic Aviator Sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200', category: 'eyewear' as const },
  { id: '2', name: 'Round Gold Frames', image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=200', category: 'eyewear' as const },
  { id: '3', name: 'Diamond Studs', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200', category: 'jewelry' as const },
  { id: '4', name: 'Pearl Necklace', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200', category: 'jewelry' as const },
  { id: '5', name: 'Leather Watch', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200', category: 'accessories' as const },
  { id: '6', name: 'Silk Scarf', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200', category: 'accessories' as const },
];

// Demo products for Recommendation Carousel
const recommendationProducts = [
  { id: '1', name: 'Wireless Bluetooth Headphones', price: 79.99, originalPrice: 99.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', rating: 4.8, reviewCount: 1234, category: 'Electronics', inStock: true },
  { id: '2', name: 'Smart Fitness Tracker', price: 149.99, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', rating: 4.6, reviewCount: 892, category: 'Wearables', inStock: true },
  { id: '3', name: 'Premium Leather Wallet', price: 59.99, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', rating: 4.9, reviewCount: 456, category: 'Accessories', inStock: true },
  { id: '4', name: 'Vintage Sunglasses', price: 129.99, originalPrice: 159.99, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', rating: 4.7, reviewCount: 321, category: 'Fashion', inStock: true },
  { id: '5', name: 'Running Shoes Pro', price: 189.99, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', rating: 4.8, reviewCount: 2341, category: 'Sports', inStock: true },
  { id: '6', name: 'Ceramic Plant Pot', price: 34.99, image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400', rating: 4.5, reviewCount: 198, category: 'Home', inStock: true },
];

export default function AIFeaturesPage() {
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [tryOnDialogOpen, setTryOnDialogOpen] = useState(false);

  const handleVoiceSearch = (query: string) => {
    // Navigate to products page with voice search query
    setVoiceDialogOpen(false);
    window.location.href = `/products?q=${encodeURIComponent(query)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Voice Search Dialog */}
      <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Voice Search
            </DialogTitle>
          </DialogHeader>
          <VoiceSearch
            onSearch={handleVoiceSearch}
            onClose={() => setVoiceDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Virtual Try-On Dialog */}
      <Dialog open={tryOnDialogOpen} onOpenChange={setTryOnDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Virtual Try-On
            </DialogTitle>
          </DialogHeader>
          <VirtualTryOn products={tryOnProducts} />
        </DialogContent>
      </Dialog>
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="h-5 w-5" />
              <span>Powered by Advanced AI</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Experience the Future of Shopping
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Our cutting-edge AI technology transforms your shopping experience with
              intelligent features designed to help you discover, compare, and buy smarter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/visual-search">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                  Try Visual Search
                  <Camera className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/for-you">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  See Recommendations
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">99%</div>
              <div className="text-gray-600">Recommendation Accuracy</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">&lt;1s</div>
              <div className="text-gray-600">Visual Search Speed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50M+</div>
              <div className="text-gray-600">Products Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-gray-600">AI Availability</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">AI-Powered Features</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover how our AI technology enhances every aspect of your shopping journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {aiFeatures.map((feature) => (
            <Card key={feature.title} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`h-2 bg-gradient-to-r ${feature.color}`} />
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2 mb-4">
                  {feature.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-gray-700">
                      <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                {feature.link === '#voice-demo' ? (
                  <Button variant="outline" className="w-full" onClick={() => setVoiceDialogOpen(true)}>
                    Try it now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : feature.link === '#tryon-demo' ? (
                  <Button variant="outline" className="w-full" onClick={() => setTryOnDialogOpen(true)}>
                    Try it now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Link href={feature.link}>
                    <Button variant="outline" className="w-full">
                      Try it now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Recommendations Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
              <ShoppingBag className="h-8 w-8 text-primary" />
              Smart Product Recommendations
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experience our AI-powered recommendation engine in action
            </p>
          </div>
          <RecommendationCarousel
            type="personalized"
            title="Personalized For You"
            subtitle="Products selected based on your browsing history and preferences"
            products={recommendationProducts}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">
            Start Your AI-Powered Shopping Experience
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join millions of shoppers who are discovering products smarter and faster with our AI technology.
          </p>
          <Link href="/products">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              Start Shopping
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
