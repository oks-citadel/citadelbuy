'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Search</h1>

        {/* Search Form */}
        <form action="/search" method="GET" className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search products, vendors, categories..."
              className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Search Results */}
        {query ? (
          <div>
            <p className="text-slate-400 mb-4">
              Search results for: <span className="text-white font-semibold">&quot;{query}&quot;</span>
            </p>
            <div className="bg-slate-800 rounded-lg p-8 text-center">
              <p className="text-slate-400">
                No results found. Try a different search term.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400">
              Enter a search term to find products, vendors, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div>Loading search...</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
