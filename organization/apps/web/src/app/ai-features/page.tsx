'use client';

import Link from 'next/link';
import { Sparkles, Camera, MessageSquare, Target, Brain, ShieldCheck, Zap, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    icon: MessageSquare,
    title: 'AI Shopping Assistant',
    description: 'Chat with our AI assistant to get personalized product recommendations and answers to your questions.',
    benefits: ['24/7 shopping assistance', 'Natural language queries', 'Personalized suggestions'],
    link: '/chat',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Target,
    title: 'Smart Recommendations',
    description: 'Our AI learns your preferences to show you products you will love, tailored just for you.',
    benefits: ['Personalized product feed', 'Similar item suggestions', 'Trending picks for you'],
    link: '/for-you',
    color: 'from-purple-500 to-indigo-500',
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

export default function AIFeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
                <Link href={feature.link}>
                  <Button variant="outline" className="w-full">
                    Try it now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
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
