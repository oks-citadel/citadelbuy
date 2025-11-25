'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, Clock, Folder } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCategoryStore, Category } from '@/stores/category-store';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface CategorySearchProps {
  placeholder?: string;
  className?: string;
  onSelect?: (category: Category) => void;
}

export function CategorySearch({
  placeholder = 'Search categories...',
  className,
  onSelect,
}: CategorySearchProps) {
  const [query, setQuery] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const { searchResults, searchCategories, trendingCategories } = useCategoryStore();
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('categorySearchHistory');
    if (stored) {
      setRecentSearches(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  // Search on debounced query change
  React.useEffect(() => {
    if (debouncedQuery.trim()) {
      searchCategories(debouncedQuery);
    }
  }, [debouncedQuery, searchCategories]);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (category: Category) => {
    // Save to recent searches
    const newRecent = [category.name, ...recentSearches.filter((s) => s !== category.name)].slice(
      0,
      5
    );
    setRecentSearches(newRecent);
    localStorage.setItem('categorySearchHistory', JSON.stringify(newRecent));

    setQuery('');
    setIsFocused(false);
    onSelect?.(category);
  };

  const handleRecentSearch = (term: string) => {
    setQuery(term);
    searchCategories(term);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('categorySearchHistory');
  };

  const showDropdown = isFocused;
  const hasResults = searchResults.length > 0;
  const showSuggestions = !query.trim() && (recentSearches.length > 0 || trendingCategories.length > 0);

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full mt-2 bg-background rounded-lg border shadow-lg z-50 overflow-hidden"
          >
            {/* Search Results */}
            {query.trim() && (
              <div className="max-h-80 overflow-y-auto">
                {hasResults ? (
                  <div className="py-2">
                    <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      Categories
                    </div>
                    {searchResults.map((category) => (
                      <SearchResultItem
                        key={category.id}
                        category={category}
                        query={query}
                        onSelect={() => handleSelect(category)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Folder className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No categories found for "{query}"</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions (when no query) */}
            {showSuggestions && (
              <div className="py-2">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between px-4 py-1.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Recent
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleRecentSearch(term)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {term}
                      </button>
                    ))}
                  </div>
                )}

                {/* Trending Categories */}
                {trendingCategories.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Trending
                    </div>
                    {trendingCategories.slice(0, 5).map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        onClick={() => {
                          handleSelect(category);
                        }}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
                      >
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {category.iconUrl ? (
                            <Image
                              src={category.iconUrl}
                              alt=""
                              width={16}
                              height={16}
                            />
                          ) : (
                            <span className="text-xs font-medium text-primary">
                              {category.name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{category.name}</p>
                          {category.productCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {category.productCount.toLocaleString()} products
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Search Result Item with highlighted query
function SearchResultItem({
  category,
  query,
  onSelect,
}: {
  category: Category;
  query: string;
  onSelect: () => void;
}) {
  const highlightMatch = (text: string, search: string) => {
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <span key={index} className="bg-primary/20 text-primary font-medium">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <Link
      href={`/categories/${category.slug}`}
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {category.iconUrl ? (
          <Image src={category.iconUrl} alt="" width={20} height={20} />
        ) : (
          <span className="text-sm font-medium text-primary">
            {category.name[0]}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {highlightMatch(category.name, query)}
        </p>
        {category.description && (
          <p className="text-xs text-muted-foreground truncate">
            {category.description}
          </p>
        )}
      </div>
      {category.productCount > 0 && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {category.productCount.toLocaleString()}
        </span>
      )}
    </Link>
  );
}
