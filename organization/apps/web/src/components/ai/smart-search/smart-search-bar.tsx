'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Mic,
  MicOff,
  Camera,
  X,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { smartSearchService } from '@/services/ai';
import { useSearchStore } from '@/stores/search-store';
import { Product, AISearchSuggestion } from '@/types';

interface SmartSearchBarProps {
  variant?: 'default' | 'hero' | 'compact';
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  showVisualSearch?: boolean;
  showVoiceSearch?: boolean;
}

export function SmartSearchBar({
  variant = 'default',
  placeholder = 'Search products, brands, categories...',
  autoFocus = false,
  onSearch,
  showVisualSearch = true,
  showVoiceSearch = true,
}: SmartSearchBarProps) {
  const router = useRouter();
  const {
    query,
    setQuery,
    suggestions,
    isLoading,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useSearchStore();

  const [isFocused, setIsFocused] = React.useState(false);
  const [localQuery, setLocalQuery] = React.useState(query);
  const [aiSuggestions, setAiSuggestions] = React.useState<AISearchSuggestion[]>([]);
  const [trendingSearches, setTrendingSearches] = React.useState<string[]>([]);
  const [isListening, setIsListening] = React.useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Load trending searches on mount
  React.useEffect(() => {
    const loadTrending = async () => {
      try {
        const trending = await smartSearchService.getTrending();
        setTrendingSearches(trending.slice(0, 6));
      } catch (error) {
        console.error('Failed to load trending searches:', error);
      }
    };
    loadTrending();
  }, []);

  // Debounced AI suggestions
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (localQuery.length < 2) {
      setAiSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const suggestions = await smartSearchService.getAutocomplete(localQuery);
        setAiSuggestions(suggestions.suggestions);
      } catch (error) {
        console.error('Failed to get suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localQuery]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    addRecentSearch(searchQuery.trim());
    setQuery(searchQuery.trim());
    setIsFocused(false);

    if (onSearch) {
      onSearch(searchQuery.trim());
    } else {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(localQuery);
  };

  const handleSuggestionClick = (suggestion: AISearchSuggestion) => {
    if (suggestion.type === 'product') {
      router.push(`/products/${suggestion.metadata?.productId}`);
    } else if (suggestion.type === 'category') {
      router.push(`/category/${suggestion.metadata?.categorySlug}`);
    } else {
      handleSearch(suggestion.text);
    }
  };

  const startVoiceSearch = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in this browser');
      return;
    }

    setIsListening(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLocalQuery(transcript);
      handleSearch(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const showDropdown = isFocused && (localQuery.length > 0 || recentSearches.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'relative flex items-center bg-background border rounded-lg transition-all',
            variant === 'hero' && 'h-14 text-lg shadow-lg',
            variant === 'compact' && 'h-9',
            variant === 'default' && 'h-11',
            isFocused && 'ring-2 ring-primary/20 border-primary'
          )}
        >
          <Search
            className={cn(
              'absolute left-3 text-muted-foreground',
              variant === 'hero' ? 'h-5 w-5' : 'h-4 w-4'
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              'flex-1 bg-transparent outline-none',
              variant === 'hero' ? 'pl-12 pr-4 text-lg' : 'pl-10 pr-4',
              variant === 'compact' && 'text-sm'
            )}
          />
          <div className="flex items-center gap-1 pr-2">
            {localQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setLocalQuery('')}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {showVoiceSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={startVoiceSearch}
                className={cn('h-7 w-7', isListening && 'text-destructive')}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 animate-pulse" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}
            {showVisualSearch && (
              <Link href="/visual-search">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button
              type="submit"
              size={variant === 'hero' ? 'default' : 'sm'}
              className={cn(variant === 'hero' && 'ml-2')}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </form>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {/* AI Suggestions */}
            {localQuery.length >= 2 && (
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Suggestions</span>
                  {isLoadingSuggestions && (
                    <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                  )}
                </div>
                {aiSuggestions.length > 0 ? (
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        {suggestion.type === 'query' && (
                          <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                        {suggestion.type === 'category' && (
                          <Tag className="h-4 w-4 text-muted-foreground" />
                        )}
                        {suggestion.type === 'product' && (
                          <div className="h-8 w-8 rounded bg-muted" />
                        )}
                        <span className="flex-1">{suggestion.text}</span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Type more to see suggestions...
                  </p>
                )}
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Recent Searches</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-xs h-7"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.slice(0, 6).map((search, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors group"
                      onClick={() => handleSearch(search)}
                    >
                      {search}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(search);
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            {trendingSearches.length > 0 && localQuery.length === 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Trending Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((search, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                      onClick={() => handleSearch(search)}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
