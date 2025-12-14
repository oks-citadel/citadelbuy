'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Camera, Mic, Sparkles, ArrowRight, Play, Star, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSearchStore } from '@/stores/search-store';
import { cn } from '@/lib/utils';

const heroSlides = [
  {
    title: 'Shop Smarter',
    subtitle: 'AI-Powered Discovery',
    description: 'Discover products tailored to your style with our intelligent recommendation engine',
    image: '/hero/ai-shopping.jpg',
    cta: { text: 'Start Shopping', href: '/for-you' },
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
    icon: Sparkles,
  },
  {
    title: 'Visual Search',
    subtitle: 'Snap & Find',
    description: 'Take a photo of any product and find similar items instantly in our catalog',
    image: '/hero/visual-search.jpg',
    cta: { text: 'Try Visual Search', href: '/visual-search' },
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    icon: Camera,
  },
  {
    title: 'Trending Now',
    subtitle: 'Hot Deals',
    description: 'Explore the most popular products with up to 70% off limited time offers',
    image: '/hero/trending.jpg',
    cta: { text: 'View Deals', href: '/deals' },
    gradient: 'from-rose-500 via-pink-600 to-violet-600',
    icon: TrendingUp,
  },
];

const trendingSearches = [
  'Wireless Earbuds',
  'Summer Collection',
  'Smart Watches',
  'Running Shoes',
  'Home Decor',
];

const stats = [
  { value: '10M+', label: 'Products' },
  { value: '50K+', label: 'Brands' },
  { value: '4.9', label: 'Rating', icon: Star },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { search, startVoiceSearch, isListening } = useSearchStore();

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      search(searchQuery);
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const slide = heroSlides[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] overflow-hidden">
      {/* Animated Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7 }}
          className={cn('absolute inset-0 bg-gradient-to-br', slide.gradient)}
        >
          {/* Mesh gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-black/20 via-transparent to-transparent" />

          {/* Animated shapes */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full border border-white/10"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full border border-white/5"
          />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="container relative z-10 pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left - Text & Search */}
          <div className="text-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${currentSlide}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {/* Badge */}
                <Badge
                  variant="secondary"
                  className="mb-6 bg-white/15 text-white border-white/20 backdrop-blur-sm"
                >
                  <SlideIcon className="h-3.5 w-3.5 mr-1.5" />
                  {slide.subtitle}
                </Badge>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
                  {slide.title}
                  <span className="block text-white/90">with Broxiva</span>
                </h1>

                {/* Description */}
                <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-lg leading-relaxed">
                  {slide.description}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-10">
                  <Link href={slide.cta.href}>
                    <Button size="lg" className="w-full sm:w-auto bg-white text-violet-700 hover:bg-white/90 shadow-xl hover:shadow-2xl">
                      {slide.cta.text}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/how-it-works">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                      <Play className="mr-2 h-4 w-4" />
                      How It Works
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Search Bar */}
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-6"
            >
              <div className="relative max-w-xl">
                <div className="absolute inset-0 bg-white/95 rounded-2xl shadow-2xl" />
                <Input
                  type="search"
                  placeholder="Search millions of products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="relative h-14 sm:h-16 pl-5 pr-36 text-base sm:text-lg bg-transparent text-slate-900 border-0 rounded-2xl placeholder:text-slate-400"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={startVoiceSearch}
                    className="text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                  >
                    <Mic className={cn('h-5 w-5', isListening && 'text-rose-500 animate-pulse')} />
                  </Button>
                  <Link href="/visual-search">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Button type="submit" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl">
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.form>

            {/* Trending Searches */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-sm text-white/70 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Trending searches:
              </p>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="px-4 py-2 rounded-full bg-white/15 text-sm font-medium text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right - Stats Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Glass card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Why Broxiva?</h3>
                    <p className="text-white/70 text-sm">The future of shopping</p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    'AI-powered personalized recommendations',
                    'Visual search with image recognition',
                    'Virtual try-on with AR technology',
                    '24/7 AI shopping assistant',
                    'Price match guarantee',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/90">
                      <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="flex items-center justify-center gap-1 text-2xl font-bold text-white">
                        {stat.value}
                        {stat.icon && <stat.icon className="h-5 w-5 fill-amber-400 text-amber-400" />}
                      </div>
                      <p className="text-xs text-white/60 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-6 -right-6 h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl flex items-center justify-center"
              >
                <span className="text-2xl font-bold text-white">70%</span>
              </motion.div>
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-4 -left-4 px-4 py-2 rounded-full bg-white shadow-xl text-sm font-semibold text-violet-700 flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Trending
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center gap-2 mt-12">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentSlide
                  ? 'w-10 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
