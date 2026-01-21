'use client';

import Link from 'next/link';
import { BookOpen, Calendar, Clock, ArrowRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const featuredPost = {
  id: 1,
  title: 'The Future of AI in E-Commerce: What to Expect in 2025',
  excerpt: 'Discover how artificial intelligence is transforming the online shopping experience with personalized recommendations, visual search, and predictive analytics.',
  date: '2025-01-10',
  readTime: '8 min read',
  category: 'Technology',
  image: '/blog/ai-ecommerce.jpg',
};

const posts = [
  { id: 2, title: '10 Tips for a Sustainable Shopping Lifestyle', excerpt: 'Learn how to make eco-friendly choices while still enjoying the products you love.', date: '2025-01-05', readTime: '5 min read', category: 'Sustainability' },
  { id: 3, title: 'How to Use Visual Search to Find Any Product', excerpt: 'Our guide to using Broxiva visual search feature to find products from any image.', date: '2024-12-28', readTime: '4 min read', category: 'Features' },
  { id: 4, title: 'Winter Fashion Trends You Need to Know', excerpt: 'Stay stylish this season with our curated guide to the hottest winter fashion trends.', date: '2024-12-20', readTime: '6 min read', category: 'Fashion' },
  { id: 5, title: 'Behind the Scenes: How We Ship Millions of Orders', excerpt: 'Take a peek inside our fulfillment centers and learn about our logistics innovations.', date: '2024-12-15', readTime: '7 min read', category: 'Company' },
  { id: 6, title: 'Gift Guide: Perfect Presents for Everyone on Your List', excerpt: 'Stuck on what to buy? Our experts have curated the ultimate gift guide for all occasions.', date: '2024-12-10', readTime: '10 min read', category: 'Shopping' },
];

const categories = ['All', 'Technology', 'Fashion', 'Sustainability', 'Features', 'Company', 'Shopping'];

export default function BlogPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <BookOpen className="w-4 h-4 text-bx-pink" />
              <span className="text-sm font-medium text-bx-text">Insights & Stories</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">The Broxiva </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Blog
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Stories, tips, and insights about shopping, technology, and sustainable living.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-2 justify-center mb-12">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={category === 'All' ? 'default' : 'outline'}
                  size="sm"
                  className={category === 'All' ? 'bg-gradient-to-r from-bx-pink to-bx-violet text-white' : ''}
                >
                  {category}
                </Button>
              ))}
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8 overflow-hidden">
              <div className="grid md:grid-cols-2">
                <div className="aspect-video md:aspect-auto bg-bx-bg-3 flex items-center justify-center">
                  <BookOpen className="w-24 h-24 text-bx-text-muted/30" />
                </div>
                <CardContent className="p-6 md:p-8 flex flex-col justify-center">
                  <Badge className="w-fit mb-4 bg-bx-pink/10 text-bx-pink border-0">{featuredPost.category}</Badge>
                  <h2 className="text-2xl font-bold text-bx-text mb-4">{featuredPost.title}</h2>
                  <p className="text-bx-text-muted mb-4">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-bx-text-muted mb-6">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(featuredPost.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <Button className="w-fit bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
                    Read Article
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </div>
            </Card>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Card key={post.id} className="bg-bx-bg-2 border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all overflow-hidden group">
                  <div className="aspect-video bg-bx-bg-3 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-bx-text-muted/30" />
                  </div>
                  <CardContent className="p-6">
                    <Badge variant="outline" className="mb-3 text-xs">{post.category}</Badge>
                    <h3 className="font-semibold text-bx-text mb-2 group-hover:text-bx-pink transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-bx-text-muted mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-bx-text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button variant="outline" size="lg">
                Load More Articles
              </Button>
            </div>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
