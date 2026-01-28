'use client';

/**
 * Example: Product Page with Feature Flags
 *
 * This example demonstrates how to integrate feature flags into a real product page
 * to conditionally show/hide features like AI recommendations, virtual try-on,
 * BNPL payments, and live chat support.
 */

import React from 'react';
import { FeatureFlag as FeatureFlagComponent } from '@/components/feature-flag';
import { FeatureFlag } from '@/config/feature-flags';
import { useFeatureFlags } from '@/hooks/useFeatureFlag';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string;
}

interface ProductPageProps {
  product: Product;
  userId?: string;
}

export function ProductPageWithFlags({ product, userId }: ProductPageProps) {
  // Check multiple feature flags at once for efficiency
  const features = useFeatureFlags([
    FeatureFlag.AI_RECOMMENDATIONS,
    FeatureFlag.VIRTUAL_TRYON,
    FeatureFlag.BNPL_PAYMENTS,
    FeatureFlag.CHAT_SUPPORT,
  ], userId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-lg bg-gray-100">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          {/* Virtual Try-On Button - Only shown if feature is enabled */}
          <FeatureFlagComponent
            flag={FeatureFlag.VIRTUAL_TRYON}
            userId={userId}
          >
            <button className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Try it on in AR
            </button>
          </FeatureFlagComponent>

          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(1).map((image, idx) => (
              <div key={idx} className="aspect-square rounded bg-gray-100">
                <img
                  src={image}
                  alt={`${product.name} ${idx + 2}`}
                  className="w-full h-full object-cover rounded"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-2xl font-semibold text-primary mt-2">
              ${product.price.toFixed(2)}
            </p>
          </div>

          <p className="text-gray-600">{product.description}</p>

          {/* Add to Cart Section */}
          <div className="space-y-4">
            <button className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
              Add to Cart
            </button>

            {/* BNPL Payment Options - Only shown if feature is enabled */}
            <FeatureFlagComponent
              flag={FeatureFlag.BNPL_PAYMENTS}
              userId={userId}
            >
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Or pay in installments:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2 px-3 border rounded hover:bg-gray-50 transition-colors">
                    Klarna
                  </button>
                  <button className="py-2 px-3 border rounded hover:bg-gray-50 transition-colors">
                    Afterpay
                  </button>
                </div>
              </div>
            </FeatureFlagComponent>
          </div>

          {/* Product Details */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-2">Product Details</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>Category: {product.category}</li>
              <li>Free shipping on orders over $50</li>
              <li>30-day return policy</li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Recommendations Section - Only shown if feature is enabled */}
      <FeatureFlagComponent
        flag={FeatureFlag.AI_RECOMMENDATIONS}
        userId={userId}
      >
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Placeholder for AI recommendations */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square rounded-lg bg-gray-200" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">
            Powered by AI - Personalized just for you
          </p>
        </div>
      </FeatureFlagComponent>

      {/* Live Chat Widget - Fixed position, only shown if feature is enabled */}
      <FeatureFlagComponent
        flag={FeatureFlag.CHAT_SUPPORT}
        userId={userId}
      >
        <button
          className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          aria-label="Open chat support"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </FeatureFlagComponent>

      {/* Feature Status Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 p-4 bg-white border rounded-lg shadow-lg max-w-xs">
          <h4 className="font-semibold text-sm mb-2">Active Features:</h4>
          <ul className="text-xs space-y-1">
            <li>
              AI Recommendations:{' '}
              <span className={features[FeatureFlag.AI_RECOMMENDATIONS] ? 'text-green-600' : 'text-red-600'}>
                {features[FeatureFlag.AI_RECOMMENDATIONS] ? 'ON' : 'OFF'}
              </span>
            </li>
            <li>
              Virtual Try-On:{' '}
              <span className={features[FeatureFlag.VIRTUAL_TRYON] ? 'text-green-600' : 'text-red-600'}>
                {features[FeatureFlag.VIRTUAL_TRYON] ? 'ON' : 'OFF'}
              </span>
            </li>
            <li>
              BNPL Payments:{' '}
              <span className={features[FeatureFlag.BNPL_PAYMENTS] ? 'text-green-600' : 'text-red-600'}>
                {features[FeatureFlag.BNPL_PAYMENTS] ? 'ON' : 'OFF'}
              </span>
            </li>
            <li>
              Chat Support:{' '}
              <span className={features[FeatureFlag.CHAT_SUPPORT] ? 'text-green-600' : 'text-red-600'}>
                {features[FeatureFlag.CHAT_SUPPORT] ? 'ON' : 'OFF'}
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Simplified Product Card with Conditional Features
 */
interface ProductCardProps {
  product: Product;
  userId?: string;
}

export function ProductCardWithFlags({ product, userId }: ProductCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-gray-100 relative">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* Virtual Try-On Badge */}
        <FeatureFlagComponent
          flag={FeatureFlag.VIRTUAL_TRYON}
          userId={userId}
        >
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
            AR Try-On
          </div>
        </FeatureFlagComponent>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold truncate">{product.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>

        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">${product.price.toFixed(2)}</span>

          {/* BNPL Badge */}
          <FeatureFlagComponent flag={FeatureFlag.BNPL_PAYMENTS}>
            <span className="text-xs text-green-600 font-medium">
              4 interest-free payments
            </span>
          </FeatureFlagComponent>
        </div>

        <button className="w-full py-2 px-4 bg-primary text-white rounded hover:opacity-90 transition-opacity">
          Add to Cart
        </button>
      </div>
    </div>
  );
}

/**
 * Example: Feature Comparison View
 * Useful for showing what features are available to the user
 */
export function FeatureComparisonView({ userId }: { userId?: string }) {
  const features = useFeatureFlags([
    FeatureFlag.AI_RECOMMENDATIONS,
    FeatureFlag.VIRTUAL_TRYON,
    FeatureFlag.BNPL_PAYMENTS,
    FeatureFlag.CHAT_SUPPORT,
    FeatureFlag.OFFLINE_MODE,
  ], userId);

  const featureList = [
    {
      flag: FeatureFlag.AI_RECOMMENDATIONS,
      name: 'AI Recommendations',
      description: 'Personalized product suggestions powered by machine learning',
      icon: '🤖',
    },
    {
      flag: FeatureFlag.VIRTUAL_TRYON,
      name: 'Virtual Try-On',
      description: 'See how products look on you using augmented reality',
      icon: '👓',
    },
    {
      flag: FeatureFlag.BNPL_PAYMENTS,
      name: 'Buy Now Pay Later',
      description: 'Split your purchase into interest-free installments',
      icon: '💳',
    },
    {
      flag: FeatureFlag.CHAT_SUPPORT,
      name: 'Live Chat Support',
      description: 'Get instant help from our support team 24/7',
      icon: '💬',
    },
    {
      flag: FeatureFlag.OFFLINE_MODE,
      name: 'Offline Mode',
      description: 'Browse products even without an internet connection',
      icon: '📱',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Your Available Features</h2>
      <div className="space-y-4">
        {featureList.map((feature) => (
          <div
            key={feature.flag}
            className={`p-4 rounded-lg border ${
              features[feature.flag]
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{feature.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{feature.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      features[feature.flag]
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-400 text-white'
                    }`}
                  >
                    {features[feature.flag] ? 'Active' : 'Coming Soon'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
