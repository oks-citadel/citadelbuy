'use client';

import Link from 'next/link';
import { FileQuestion, Home, Search, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6">
            <FileQuestion className="h-10 w-10" />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4">
            404
          </h1>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            Page Not Found
          </h2>

          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto mb-8">
            <form action="/search" method="GET" className="flex gap-2">
              <Input
                type="search"
                name="q"
                placeholder="Search for products..."
                className="flex-1"
              />
              <Button type="submit">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button asChild size="lg" className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/products">
                <ShoppingBag className="h-4 w-4" />
                Browse Products
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="gap-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>

          {/* Quick Links */}
          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground mb-4">Popular destinations:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/deals" className="text-sm text-primary hover:underline">
                Today's Deals
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/categories" className="text-sm text-primary hover:underline">
                Categories
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/account" className="text-sm text-primary hover:underline">
                My Account
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/help" className="text-sm text-primary hover:underline">
                Help Center
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
