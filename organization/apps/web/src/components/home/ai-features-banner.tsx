'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Camera, Mic, Sparkles, Shirt, MessageCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const aiFeatures = [
  {
    icon: Camera,
    title: 'Visual Search',
    description: 'Snap a photo to find similar products',
    href: '/visual-search',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Mic,
    title: 'Voice Search',
    description: 'Search hands-free with your voice',
    href: '/search',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shirt,
    title: 'Virtual Try-On',
    description: 'See how it looks on you with AR',
    href: '/virtual-tryon',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: MessageCircle,
    title: 'AI Assistant',
    description: 'Get personalized shopping help 24/7',
    href: '#chat',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Sparkles,
    title: 'Smart Recommendations',
    description: 'Discover products curated just for you',
    href: '/for-you',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: TrendingUp,
    title: 'Price Tracking',
    description: 'Get alerts when prices drop',
    href: '/price-alerts',
    color: 'from-red-500 to-pink-500',
  },
];

export function AIFeaturesBanner() {
  return (
    <section className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-12">
      <div className="container">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              AI-Powered Shopping
            </span>
          </div>
          <h2 className="text-3xl font-bold mb-2">
            Experience the Future of Shopping
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our cutting-edge AI features make finding and buying products easier than ever.
            From visual search to virtual try-on, discover a smarter way to shop.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {aiFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={feature.href}>
                <div className="group relative overflow-hidden rounded-xl bg-background border p-6 text-center hover:shadow-lg transition-all">
                  <div
                    className={`mx-auto w-14 h-14 rounded-full bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/ai-features">
            <Button variant="outline" size="lg">
              Explore All AI Features
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
