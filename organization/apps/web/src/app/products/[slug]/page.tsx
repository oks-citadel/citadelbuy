'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShoppingCart,
  Star,
  Check,
  Minus,
  Plus,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
  ZoomIn,
  X,
  MessageCircle,
  TrendingUp,
  Package,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ProductCard } from '@/components/product/product-card';
import { productsApi } from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import { Product, ProductVariant, Review } from '@/types';
import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  calculateDiscount,
  getStockStatus,
} from '@/lib/utils';
import { toast } from 'sonner';

interface PageProps {
  params: {
    slug: string;
  };
}

export default function ProductDetailPage({ params }: PageProps) {
  const [product, setProduct] = React.useState<Product | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [isZoomOpen, setIsZoomOpen] = React.useState(false);
  const [isWishlisted, setIsWishlisted] = React.useState(false);
  const [relatedProducts, setRelatedProducts] = React.useState<Product[]>([]);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = React.useState(0);

  const { addItem, isLoading: isAddingToCart } = useCartStore();

  // Fetch product data
  React.useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      try {
        const data = await productsApi.getBySlug(params.slug);
        setProduct(data);

        // Load related products
        if (data.id) {
          const recommendations = await productsApi.getRecommendations(data.id, 8);
          setRelatedProducts(recommendations);
        }

        // Load reviews
        if (data.id) {
          const reviewsData = await productsApi.getReviews(data.id, { limit: 5 });
          setReviews(reviewsData.reviews);
          setReviewsTotal(reviewsData.total);
        }
      } catch (error) {
        console.error('Failed to load product:', error);
        notFound();
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [params.slug]);

  if (isLoading) {
    return null; // Loading state handled by loading.tsx
  }

  if (!product) {
    notFound();
  }

  const currentVariant = selectedVariant || product;
  const currentPrice = selectedVariant?.price || product.price;
  const compareAtPrice = selectedVariant?.compareAtPrice || product.compareAtPrice;
  const discount = compareAtPrice ? calculateDiscount(currentPrice, compareAtPrice) : 0;
  const stockStatus = getStockStatus(
    selectedVariant?.inventory.available || product.inventory.available
  );

  const handleAddToCart = async () => {
    try {
      await addItem(product, selectedVariant || undefined, quantity);
      toast.success(`${product.name} added to cart`, {
        action: {
          label: 'View Cart',
          onClick: () => (window.location.href = '/cart'),
        },
      });
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.name,
        text: product.shortDescription || product.description,
        url: window.location.href,
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const incrementQuantity = () => {
    const maxStock = selectedVariant?.inventory.available || product.inventory.available;
    if (quantity < maxStock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Group variants by option name
  const variantOptions = React.useMemo(() => {
    if (!product.variants || product.variants.length === 0) return {};

    const options: Record<string, Set<string>> = {};
    product.variants.forEach((variant) => {
      variant.options.forEach((option) => {
        if (!options[option.name]) {
          options[option.name] = new Set();
        }
        options[option.name].add(option.value);
      });
    });

    return Object.entries(options).reduce((acc, [key, values]) => {
      acc[key] = Array.from(values);
      return acc;
    }, {} as Record<string, string[]>);
  }, [product.variants]);

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: Math.floor(Math.random() * 50), // Mock data
    percentage: Math.floor(Math.random() * 100),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/products" className="hover:text-foreground transition-colors">
              Products
            </Link>
            {product.category && (
              <>
                <ChevronRight className="h-4 w-4" />
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium truncate">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        {/* Main Product Section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Product Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
              <motion.div
                key={selectedImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative w-full h-full group cursor-zoom-in"
                onClick={() => setIsZoomOpen(true)}
              >
                <Image
                  src={product.images[selectedImageIndex]?.url || '/placeholder-product.jpg'}
                  alt={product.images[selectedImageIndex]?.alt || product.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {discount > 0 && (
                  <Badge variant="destructive" size="lg" className="font-bold shadow-lg">
                    -{discount}% OFF
                  </Badge>
                )}
                {product.inventory.status === 'LOW_STOCK' && (
                  <Badge variant="warning" size="lg" className="shadow-lg">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Selling Fast
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-5 gap-2">
              {product.images.slice(0, 5).map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    selectedImageIndex === index
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-transparent hover:border-muted-foreground/50'
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.alt || product.name}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Vendor */}
            {product.vendor && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/vendors/${product.vendor.slug}`}
                  className="flex items-center gap-2 group"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {product.vendor.logo ? (
                      <Image
                        src={product.vendor.logo}
                        alt={product.vendor.name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {product.vendor.name}
                    </p>
                    {product.vendor.verified && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary" />
                        Verified Seller
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            )}

            {/* Product Name */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {product.name}
              </h1>
              {product.shortDescription && (
                <p className="text-lg text-muted-foreground">{product.shortDescription}</p>
              )}
            </div>

            {/* Rating */}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-5 w-5',
                        i < Math.floor(product.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold">
                  {product.rating.toFixed(1)} out of 5
                </span>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount.toLocaleString()} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-bold text-foreground">
                  {formatCurrency(currentPrice, product.currency)}
                </span>
                {compareAtPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatCurrency(compareAtPrice, product.currency)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-sm text-emerald-600 font-medium">
                  You save {formatCurrency(compareAtPrice! - currentPrice, product.currency)} ({discount}% off)
                </p>
              )}
            </div>

            {/* Stock Status */}
            <div className={cn('flex items-center gap-2', stockStatus.color)}>
              <div className="h-2 w-2 rounded-full bg-current" />
              <span className="font-medium">{stockStatus.label}</span>
            </div>

            {/* SKU and Brand */}
            <div className="flex gap-6 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">SKU:</span> {product.sku}
              </div>
              {product.brand && (
                <div>
                  <span className="font-medium">Brand:</span>{' '}
                  <Link href={`/brands/${product.brand.slug}`} className="text-primary hover:underline">
                    {product.brand.name}
                  </Link>
                </div>
              )}
            </div>

            {/* Variant Selection */}
            {Object.keys(variantOptions).length > 0 && (
              <div className="space-y-4">
                {Object.entries(variantOptions).map(([optionName, values]) => (
                  <div key={optionName}>
                    <label className="text-sm font-medium mb-2 block">
                      Select {optionName}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {values.map((value) => {
                        const variant = product.variants?.find((v) =>
                          v.options.some((o) => o.name === optionName && o.value === value)
                        );
                        const isSelected =
                          selectedVariant?.options.some(
                            (o) => o.name === optionName && o.value === value
                          ) || false;

                        return (
                          <button
                            key={value}
                            onClick={() => setSelectedVariant(variant || null)}
                            disabled={variant?.inventory.status === 'OUT_OF_STOCK'}
                            className={cn(
                              'px-4 py-2 rounded-lg border-2 font-medium transition-all',
                              'hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/20 bg-background'
                            )}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border-2 rounded-lg overflow-hidden">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="px-4 py-2.5 hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-6 py-2.5 font-semibold border-x-2 min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={incrementQuantity}
                    disabled={
                      quantity >= (selectedVariant?.inventory.available || product.inventory.available)
                    }
                    className="px-4 py-2.5 hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedVariant?.inventory.available || product.inventory.available} available
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 h-14 text-base"
                onClick={handleAddToCart}
                loading={isAddingToCart}
                disabled={stockStatus.status === 'out_of_stock'}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-6"
                onClick={handleWishlist}
              >
                <Heart
                  className={cn('h-5 w-5', isWishlisted && 'fill-rose-500 text-rose-500')}
                />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-6" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-muted/30">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Free Shipping</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-muted/30">
                <RotateCcw className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">30-Day Returns</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-muted/30">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Secure Payment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Card className="mb-12">
          <Tabs defaultValue="description" className="w-full">
            <div className="border-b">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
                <TabsTrigger
                  value="description"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-4"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="specifications"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-4"
                >
                  Specifications
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-4"
                >
                  Reviews ({product.reviewCount})
                </TabsTrigger>
                <TabsTrigger
                  value="qa"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-4"
                >
                  Q&A
                </TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-6">
              <TabsContent value="description" className="mt-0 space-y-4">
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="mt-0">
                <div className="grid gap-3">
                  {product.attributes && product.attributes.length > 0 ? (
                    product.attributes.map((attr, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-2 gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{attr.name}</span>
                        <span className="text-muted-foreground">
                          {attr.value}
                          {attr.unit && ` ${attr.unit}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No specifications available.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-0 space-y-6">
                {/* Rating Summary */}
                <div className="grid md:grid-cols-2 gap-8 pb-6 border-b">
                  <div className="text-center md:text-left space-y-2">
                    <div className="text-5xl font-bold">{product.rating.toFixed(1)}</div>
                    <div className="flex items-center justify-center md:justify-start gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-5 w-5',
                            i < Math.floor(product.rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-slate-200 text-slate-200'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Based on {product.reviewCount.toLocaleString()} reviews
                    </p>
                  </div>

                  <div className="space-y-2">
                    {ratingDistribution.map((dist) => (
                      <div key={dist.rating} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-8">{dist.rating}★</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400"
                            style={{ width: `${dist.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {dist.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-6">
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <div key={review.id} className="space-y-3 pb-6 border-b last:border-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {review.user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{review.user.name}</p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      'h-4 w-4',
                                      i < review.rating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'fill-slate-200 text-slate-200'
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(review.createdAt)}
                          </span>
                        </div>
                        {review.title && (
                          <h4 className="font-semibold text-foreground">{review.title}</h4>
                        )}
                        <p className="text-muted-foreground leading-relaxed">{review.content}</p>
                        {review.verified && (
                          <Badge variant="success" size="sm">
                            <Check className="h-3 w-3 mr-1" />
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                    </div>
                  )}

                  {reviewsTotal > reviews.length && (
                    <Button variant="outline" className="w-full">
                      Load More Reviews
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="qa" className="mt-0">
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No questions yet.</p>
                  <Button>Ask a Question</Button>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Shipping & Returns */}
        <Card className="mb-12">
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="shipping">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Shipping Information
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>
                    <strong>Free Standard Shipping:</strong> Orders over $50
                  </p>
                  <p>
                    <strong>Standard Shipping:</strong> 5-7 business days ($5.99)
                  </p>
                  <p>
                    <strong>Express Shipping:</strong> 2-3 business days ($12.99)
                  </p>
                  <p>
                    <strong>Next Day Delivery:</strong> Order before 2pm EST ($19.99)
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="returns">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-primary" />
                    Returns & Exchanges
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>
                    We offer a 30-day return policy for most items. Products must be unused and in their
                    original packaging.
                  </p>
                  <p>
                    <strong>Free Returns:</strong> We provide a prepaid return shipping label for all
                    returns.
                  </p>
                  <p>
                    <strong>Refund Processing:</strong> Refunds are processed within 5-7 business days
                    after we receive your return.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="warranty">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Warranty Information
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>This product comes with a manufacturer's warranty.</p>
                  <p>
                    <strong>Coverage:</strong> 1-year limited warranty against defects in materials and
                    workmanship.
                  </p>
                  <p>
                    <strong>Extended Warranty:</strong> Optional extended warranty available at checkout.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">You May Also Like</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setIsZoomOpen(false)}
          >
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
              <Image
                src={product.images[selectedImageIndex]?.url || '/placeholder-product.jpg'}
                alt={product.images[selectedImageIndex]?.alt || product.name}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
