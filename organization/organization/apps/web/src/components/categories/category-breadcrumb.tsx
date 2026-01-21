'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { CategoryBreadcrumb as BreadcrumbItem } from '@/stores/category-store';
import { cn } from '@/lib/utils';

interface CategoryBreadcrumbProps {
  items: BreadcrumbItem[];
  currentCategoryName?: string;
  showHome?: boolean;
  className?: string;
}

export function CategoryBreadcrumb({
  items,
  currentCategoryName,
  showHome = true,
  className,
}: CategoryBreadcrumbProps) {
  if (items.length === 0 && !currentCategoryName) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center flex-wrap gap-1">
        {/* Home */}
        {showHome && (
          <li className="flex items-center">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
          </li>
        )}

        {/* Categories Link */}
        <li className="flex items-center">
          <Link
            href="/categories"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Categories
          </Link>
          {(items.length > 0 || currentCategoryName) && (
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
          )}
        </li>

        {/* Breadcrumb Items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1 && !currentCategoryName;

          return (
            <li key={item.id} className="flex items-center">
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={`/categories/${item.slug}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                  <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                </>
              )}
            </li>
          );
        })}

        {/* Current Category Name (if different from last breadcrumb) */}
        {currentCategoryName && (
          <li className="flex items-center">
            <span
              className="font-medium text-foreground"
              aria-current="page"
            >
              {currentCategoryName}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

// Compact breadcrumb for mobile
export function CategoryBreadcrumbCompact({
  items,
  currentCategoryName,
  className,
}: CategoryBreadcrumbProps) {
  const lastParent = items.length > 0 ? items[items.length - 1] : null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      {lastParent ? (
        <Link
          href={`/categories/${lastParent.slug}`}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
          <span>Back to {lastParent.name}</span>
        </Link>
      ) : (
        <Link
          href="/categories"
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
          <span>All Categories</span>
        </Link>
      )}
    </nav>
  );
}

// JSON-LD structured data for SEO
export function CategoryBreadcrumbJsonLd({
  items,
  currentCategoryName,
}: {
  items: BreadcrumbItem[];
  currentCategoryName?: string;
}) {
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: typeof window !== 'undefined' ? window.location.origin : '',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Categories',
        item: typeof window !== 'undefined' ? `${window.location.origin}/categories` : '',
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 3,
        name: item.name,
        item: typeof window !== 'undefined'
          ? `${window.location.origin}/categories/${item.slug}`
          : '',
      })),
      ...(currentCategoryName && items.length > 0
        ? [{
            '@type': 'ListItem',
            position: items.length + 3,
            name: currentCategoryName,
          }]
        : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
    />
  );
}
