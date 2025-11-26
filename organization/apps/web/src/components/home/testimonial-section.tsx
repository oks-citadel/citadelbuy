'use client';

import * as React from 'react';
import { Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    name: 'Sarah M.',
    avatar: '/avatars/sarah.jpg',
    rating: 5,
    text: 'The visual search feature is incredible! I found the exact dress I saw in a magazine within seconds.',
    feature: 'Visual Search',
  },
  {
    name: 'James L.',
    avatar: '/avatars/james.jpg',
    rating: 5,
    text: 'The AI recommendations are spot-on. It feels like having a personal stylist who knows exactly what I like.',
    feature: 'Smart Recommendations',
  },
  {
    name: 'Emily R.',
    avatar: '/avatars/emily.jpg',
    rating: 5,
    text: 'Virtual try-on saved me so much time and money. I no longer have to worry about ordering the wrong size!',
    feature: 'Virtual Try-On',
  },
  {
    name: 'Michael T.',
    avatar: '/avatars/michael.jpg',
    rating: 5,
    text: 'The AI assistant helped me find the perfect gift for my wife. It even suggested gift wrapping options!',
    feature: 'AI Assistant',
  },
];

export function TestimonialSection() {
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold mb-2">What Our Customers Say</h2>
      <p className="text-muted-foreground mb-8">
        Join millions of happy shoppers
      </p>

      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <Quote className="absolute -top-4 -left-4 h-12 w-12 text-primary/10" />

          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={cn(
                'transition-all duration-500',
                index === activeIndex
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
              )}
            >
              <div className="flex justify-center mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-5 w-5',
                      i < testimonial.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted'
                    )}
                  />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl font-medium mb-6">
                "{testimonial.text}"
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted overflow-hidden">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Loved {testimonial.feature}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'h-2 rounded-full transition-all',
                index === activeIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-primary/30 hover:bg-primary/50'
              )}
            />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t">
        {[
          { value: '2M+', label: 'Happy Customers' },
          { value: '4.8', label: 'Average Rating' },
          { value: '50K+', label: 'Products' },
          { value: '98%', label: 'Satisfaction Rate' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-3xl md:text-4xl font-bold text-primary">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
