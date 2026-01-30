'use client';

import { WifiOff, RefreshCw, Home, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-violet-100 mb-6">
            <WifiOff className="h-12 w-12 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            You&apos;re Offline
          </h1>
          <p className="text-gray-600 mb-8">
            It looks like you&apos;ve lost your internet connection. Don&apos;t worry - you
            can still browse items you&apos;ve viewed before.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Again
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Home
          </Link>

          <Link
            href="/cart"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-violet-600 hover:text-violet-700 transition-colors"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            View Your Cart
          </Link>
        </div>

        <div className="mt-12 p-6 bg-white rounded-xl border border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-3">
            While you&apos;re offline, you can:
          </h2>
          <ul className="text-left text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-violet-600 mr-2">•</span>
              Browse products you&apos;ve viewed recently
            </li>
            <li className="flex items-start">
              <span className="text-violet-600 mr-2">•</span>
              Review items in your cart
            </li>
            <li className="flex items-start">
              <span className="text-violet-600 mr-2">•</span>
              Check your wishlist
            </li>
            <li className="flex items-start">
              <span className="text-violet-600 mr-2">•</span>
              View saved addresses and settings
            </li>
          </ul>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          We&apos;ll automatically reconnect when your internet is back.
        </p>
      </div>
    </div>
  );
}
