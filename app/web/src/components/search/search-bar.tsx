'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

interface AutocompleteResult {
  suggestions: Array<{
    keyword: string;
    type: 'keyword';
    searchCount: number;
  }>;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    image: string | null;
    price: number;
    type: 'product';
  }>;
}

interface SearchBarProps {
  initialValue?: string;
  placeholder?: string;
  className?: string;
  showAutocomplete?: boolean;
}

export function SearchBar({
  initialValue = '',
  placeholder = 'Search products...',
  className = '',
  showAutocomplete = true
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<AutocompleteResult>({ suggestions: [], products: [] });
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch autocomplete results
  useEffect(() => {
    if (!showAutocomplete) return;

    const fetchAutocomplete = async () => {
      if (query.length < 2) {
        setResults({ suggestions: [], products: [] });
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search/autocomplete?query=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error('Failed to fetch autocomplete:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchAutocomplete, 300);
    return () => clearTimeout(debounce);
  }, [query, showAutocomplete]);

  const handleSearch = (e?: React.FormEvent, searchQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = searchQuery || query.trim();

    if (finalQuery) {
      // Track search
      trackSearch(finalQuery);
      router.push(`/products?q=${encodeURIComponent(finalQuery)}`);
    } else {
      router.push('/products');
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    router.push('/products');
  };

  const trackSearch = async (searchQuery: string) => {
    try {
      await fetch('/api/search/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          resultsCount: 0, // Will be updated on results page
          source: 'SEARCH_BAR',
        }),
      });
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  };

  const hasResults = results.suggestions.length > 0 || results.products.length > 0;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => showAutocomplete && query.length >= 2 && setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {showAutocomplete && isOpen && hasResults && (
        <Card className="absolute z-50 w-full mt-2 max-h-96 overflow-y-auto shadow-lg">
          {/* Keyword Suggestions */}
          {results.suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                Suggestions
              </div>
              {results.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(undefined, suggestion.keyword)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded text-left"
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="flex-1">{suggestion.keyword}</span>
                  {suggestion.searchCount > 100 && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Product Suggestions */}
          {results.products.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                Products
              </div>
              {results.products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    router.push(`/products/${product.slug}`);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded"
                >
                  {product.image && (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm line-clamp-1">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      ${product.price.toFixed(2)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Loading State */}
      {showAutocomplete && loading && isOpen && (
        <Card className="absolute z-50 w-full mt-2 p-4 shadow-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        </Card>
      )}
    </div>
  );
}
