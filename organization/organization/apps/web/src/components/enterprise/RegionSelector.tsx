'use client';

import * as React from 'react';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Region {
  code: string;
  name: string;
  flag?: string;
  currency: string;
  languages: string[];
}

const regions: Region[] = [
  { code: 'na', name: 'North America', currency: 'USD', languages: ['en'] },
  { code: 'eu', name: 'Europe', currency: 'EUR', languages: ['en', 'de', 'fr', 'es', 'it'] },
  { code: 'uk', name: 'United Kingdom', currency: 'GBP', languages: ['en'] },
  { code: 'apac', name: 'Asia Pacific', currency: 'USD', languages: ['en', 'ja', 'zh'] },
  { code: 'latam', name: 'Latin America', currency: 'USD', languages: ['es', 'pt'] },
  { code: 'mea', name: 'Middle East & Africa', currency: 'USD', languages: ['en', 'ar'] },
];

export interface RegionSelectorProps {
  value?: string;
  onChange?: (region: Region) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function RegionSelector({
  value,
  onChange,
  variant = 'default',
  className,
}: RegionSelectorProps) {
  const [selectedRegion, setSelectedRegion] = React.useState<Region>(
    regions.find((r) => r.code === value) || regions[0]
  );

  const handleSelectRegion = (region: Region) => {
    setSelectedRegion(region);
    onChange?.(region);
  };

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn('gap-2', className)}>
            <Globe className="h-4 w-4" />
            <span>{selectedRegion.code.toUpperCase()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {regions.map((region) => (
            <DropdownMenuItem
              key={region.code}
              onClick={() => handleSelectRegion(region)}
              className="flex items-center justify-between"
            >
              <span>{region.name}</span>
              {selectedRegion.code === region.code && (
                <Check className="h-4 w-4 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <Globe className="h-4 w-4" />
          <span>{selectedRegion.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {regions.map((region) => (
          <DropdownMenuItem
            key={region.code}
            onClick={() => handleSelectRegion(region)}
            className="flex items-start justify-between p-3"
          >
            <div className="flex-1">
              <p className="font-medium">{region.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Currency: {region.currency} • Languages: {region.languages.join(', ')}
              </p>
            </div>
            {selectedRegion.code === region.code && (
              <Check className="h-4 w-4 ml-2 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { regions };
