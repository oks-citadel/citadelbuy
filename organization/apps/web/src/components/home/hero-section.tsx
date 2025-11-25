'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Camera, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSearchStore } from '@/stores/search-store';

const heroSlides = [
  {
    title: 'Discover with AI',
    subtitle: 'Visual Search',
    description: 'Take a photo of any product and find similar items instantly',
    image: '/hero/visual-search.jpg',
    cta: { text: 'Try Visual Search', href: '/visual-search' },
    gradient: 'from-violet-600/90 to-indigo-600/90',
  },
  {
    title: 'Smart Shopping',
    subtitle: 'Personalized For You',
    description: 'AI-powered recommendations based on your style and preferences',
    image: '/hero/personalized.jpg',
    cta: { text: 'Explore Now', href: '/for-you' },
    gradient: 'from-blue-600/90 to-cyan-600/90',
  },
  {
    title: 'Virtual Try-On',
    subtitle: 'See Before You Buy',
    description: 'Try clothes and accessories virtually using AR technology',
    image: '/hero/virtual-tryon.jpg',
    cta: { text: 'Try It On', href: '/virtual-tryon' },
    gradient: 'from-pink-600/90 to-rose-600/90',
  },
];

const trendingSearches = [
  'Wireless Earbuds',
  'Summer Dresses',
  'Smart Watch',
  'Running Shoes',
  'Laptop Bags',
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

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <motion.div
        key={currentSlide}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${slide.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </motion.div>

      {/* Content */}
      <div className="container relative z-10 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text & Search */}
          <div className="text-white">
            <motion.div
              key={`text-${currentSlide}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                {slide.subtitle}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                {slide.title}
              </h1>
              <p className="text-lg md:text-xl opacity-90 mb-8 max-w-md">
                {slide.description}
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <div className="relative max-w-lg">
                <Input
                  type="search"
                  placeholder="Search for anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 pl-5 pr-32 text-lg bg-white/95 text-foreground border-0 shadow-xl"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={startVoiceSearch}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Mic className={`h-5 w-5 ${isListening ? 'text-destructive animate-pulse' : ''}`} />
                  </Button>
                  <Link href="/visual-search">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Button type="submit" size="icon" className="h-10 w-10">
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.form>

            {/* Trending Searches */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-sm opacity-80 mb-2">Trending:</p>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="px-3 py-1 rounded-full bg-white/20 text-sm hover:bg-white/30 transition-colors"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right - CTA Card */}
          <motion.div
            key={`card-${currentSlide}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">
                Experience the Future of Shopping
              </h3>
              <ul className="space-y-3 text-white/90 mb-6">
                <li className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                    ✓
                  </div>
                  AI-powered product recommendations
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                    ✓
                  </div>
                  Visual search with image recognition
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                    ✓
                  </div>
                  Virtual try-on with AR technology
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                    ✓
                  </div>
                  24/7 AI shopping assistant
                </li>
              </ul>
              <Link href={slide.cta.href}>
                <Button size="lg" className="w-full bg-white text-primary hover:bg-white/90">
                  {slide.cta.text}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
