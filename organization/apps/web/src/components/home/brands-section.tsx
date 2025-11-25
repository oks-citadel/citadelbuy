'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

const brands = [
  { name: 'Nike', logo: '/brands/nike.svg', href: '/brands/nike' },
  { name: 'Apple', logo: '/brands/apple.svg', href: '/brands/apple' },
  { name: 'Samsung', logo: '/brands/samsung.svg', href: '/brands/samsung' },
  { name: 'Sony', logo: '/brands/sony.svg', href: '/brands/sony' },
  { name: 'Adidas', logo: '/brands/adidas.svg', href: '/brands/adidas' },
  { name: 'Dyson', logo: '/brands/dyson.svg', href: '/brands/dyson' },
  { name: 'Bose', logo: '/brands/bose.svg', href: '/brands/bose' },
  { name: 'Lego', logo: '/brands/lego.svg', href: '/brands/lego' },
];

export function BrandsSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Top Brands</h2>
          <p className="text-sm text-muted-foreground">
            Shop from your favorite brands
          </p>
        </div>
        <Link
          href="/brands"
          className="text-sm text-primary hover:underline flex items-center"
        >
          View All Brands
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
        {brands.map((brand) => (
          <Link
            key={brand.name}
            href={brand.href}
            className="group flex items-center justify-center p-4 rounded-lg border bg-background hover:border-primary transition-colors aspect-square"
          >
            <div className="relative w-full h-12 grayscale group-hover:grayscale-0 transition-all">
              <Image
                src={brand.logo}
                alt={brand.name}
                fill
                className="object-contain"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
