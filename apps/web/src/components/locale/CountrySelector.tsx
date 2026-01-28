'use client';

/**
 * CountrySelector Component
 *
 * Country/shipping destination selector with search and popular countries
 */

import * as React from 'react';
import { Check, ChevronDown, MapPin, Search, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/lib/tenant';
import {
  COUNTRIES,
  getPopularCountries,
  getAllCountries,
  getCountriesByContinent,
  type CountryInfo,
} from '@/lib/geo/country-detection';
import { isCountryShippable, getShippingZone } from '@/lib/geo/shipping-zones';

// ============================================================================
// Types
// ============================================================================

export interface CountrySelectorProps {
  className?: string;
  variant?: 'popover' | 'dialog';
  showShippingInfo?: boolean;
  onCountryChange?: (countryCode: string) => void;
}

// ============================================================================
// Flag Component
// ============================================================================

function Flag({ code, className }: { code: string; className?: string }) {
  const getFlagEmoji = (countryCode: string): string => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <span className={cn('text-lg', className)} role="img" aria-label={`${code} flag`}>
      {getFlagEmoji(code)}
    </span>
  );
}

// ============================================================================
// Country Item Component
// ============================================================================

function CountryItem({
  country,
  isSelected,
  showShippingInfo,
  onClick,
}: {
  country: CountryInfo;
  isSelected: boolean;
  showShippingInfo: boolean;
  onClick: () => void;
}) {
  const shippable = isCountryShippable(country.code);
  const zone = shippable ? getShippingZone(country.code) : null;

  return (
    <button
      onClick={onClick}
      disabled={showShippingInfo && !shippable}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm outline-none',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isSelected && 'bg-accent'
      )}
    >
      <div className="flex items-center gap-3">
        <Flag code={country.code} />
        <div className="flex flex-col items-start">
          <span className="font-medium">{country.name}</span>
          {showShippingInfo && zone && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {zone.estimatedDays.min}-{zone.estimatedDays.max} days
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showShippingInfo && !shippable && (
          <Badge variant="outline" className="text-xs">
            Not available
          </Badge>
        )}
        {isSelected && <Check className="h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}

// ============================================================================
// Country List Component
// ============================================================================

function CountryList({
  countries,
  selectedCountry,
  showShippingInfo,
  onSelect,
  emptyMessage = 'No countries found',
}: {
  countries: CountryInfo[];
  selectedCountry: string;
  showShippingInfo: boolean;
  onSelect: (code: string) => void;
  emptyMessage?: string;
}) {
  if (countries.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {countries.map((country) => (
        <CountryItem
          key={country.code}
          country={country}
          isSelected={country.code === selectedCountry}
          showShippingInfo={showShippingInfo}
          onClick={() => onSelect(country.code)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Popover Variant
// ============================================================================

function CountryPopover({
  className,
  showShippingInfo,
  country,
  currentCountry,
  onSelect,
}: {
  className?: string;
  showShippingInfo: boolean;
  country: string;
  currentCountry: CountryInfo | undefined;
  onSelect: (code: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const popularCountries = React.useMemo(() => getPopularCountries(), []);
  const allCountries = React.useMemo(() => getAllCountries(), []);

  const filteredCountries = React.useMemo(() => {
    if (!search.trim()) return allCountries;

    const query = search.toLowerCase();
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.nativeName.toLowerCase().includes(query) ||
        c.code.toLowerCase() === query
    );
  }, [allCountries, search]);

  const handleSelect = React.useCallback(
    (code: string) => {
      onSelect(code);
      setOpen(false);
      setSearch('');
    },
    [onSelect]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn('flex items-center gap-2', className)}>
          {currentCountry ? (
            <>
              <Flag code={currentCountry.code} />
              <span className="hidden sm:inline">{currentCountry.name}</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              <span>Select Country</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <MapPin className="h-4 w-4" />
            {showShippingInfo ? 'Shipping Destination' : 'Select Country'}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <ScrollArea className="h-80">
          {search ? (
            <div className="p-2">
              <CountryList
                countries={filteredCountries}
                selectedCountry={country}
                showShippingInfo={showShippingInfo}
                onSelect={handleSelect}
              />
            </div>
          ) : (
            <div className="p-2">
              <div className="text-xs text-muted-foreground px-3 py-1.5">
                Popular Countries
              </div>
              <CountryList
                countries={popularCountries}
                selectedCountry={country}
                showShippingInfo={showShippingInfo}
                onSelect={handleSelect}
              />
              <div className="text-xs text-muted-foreground px-3 py-1.5 mt-2">
                All Countries
              </div>
              <CountryList
                countries={allCountries.filter(
                  (c) => !popularCountries.find((p) => p.code === c.code)
                )}
                selectedCountry={country}
                showShippingInfo={showShippingInfo}
                onSelect={handleSelect}
              />
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Dialog Variant
// ============================================================================

function CountryDialog({
  className,
  showShippingInfo,
  country,
  currentCountry,
  onSelect,
}: {
  className?: string;
  showShippingInfo: boolean;
  country: string;
  currentCountry: CountryInfo | undefined;
  onSelect: (code: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const allCountries = React.useMemo(() => getAllCountries(), []);

  const continents = ['Europe', 'North America', 'Asia', 'Africa', 'South America', 'Oceania'];

  const filteredCountries = React.useMemo(() => {
    if (!search.trim()) return allCountries;

    const query = search.toLowerCase();
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.nativeName.toLowerCase().includes(query) ||
        c.code.toLowerCase() === query
    );
  }, [allCountries, search]);

  const handleSelect = React.useCallback(
    (code: string) => {
      onSelect(code);
      setOpen(false);
      setSearch('');
    },
    [onSelect]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className={cn('flex items-center gap-2', className)}>
          {currentCountry ? (
            <>
              <Flag code={currentCountry.code} />
              <span className="hidden sm:inline">{currentCountry.name}</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              <span>Select Country</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {showShippingInfo ? 'Select Shipping Destination' : 'Select Country'}
          </DialogTitle>
          <DialogDescription>
            {showShippingInfo
              ? 'Choose your shipping destination to see available delivery options.'
              : 'Select your country to personalize your experience.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {search ? (
          <ScrollArea className="h-80">
            <CountryList
              countries={filteredCountries}
              selectedCountry={country}
              showShippingInfo={showShippingInfo}
              onSelect={handleSelect}
            />
          </ScrollArea>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="popular" className="text-xs">Popular</TabsTrigger>
              <TabsTrigger value="region" className="text-xs">By Region</TabsTrigger>
              <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-64">
                <CountryList
                  countries={allCountries}
                  selectedCountry={country}
                  showShippingInfo={showShippingInfo}
                  onSelect={handleSelect}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="popular" className="mt-4">
              <ScrollArea className="h-64">
                <CountryList
                  countries={getPopularCountries()}
                  selectedCountry={country}
                  showShippingInfo={showShippingInfo}
                  onSelect={handleSelect}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="region" className="mt-4">
              <ScrollArea className="h-64">
                {continents.map((continent) => {
                  const countries = getCountriesByContinent(continent);
                  if (countries.length === 0) return null;

                  return (
                    <div key={continent} className="mb-4">
                      <div className="text-xs font-medium text-muted-foreground px-3 py-1.5">
                        {continent}
                      </div>
                      <CountryList
                        countries={countries}
                        selectedCountry={country}
                        showShippingInfo={showShippingInfo}
                        onSelect={handleSelect}
                      />
                    </div>
                  );
                })}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="recent" className="mt-4">
              <div className="py-6 text-center text-sm text-muted-foreground">
                No recent selections
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CountrySelector({
  className,
  variant = 'popover',
  showShippingInfo = false,
  onCountryChange,
}: CountrySelectorProps) {
  const { country, setCountry } = useTenant();

  const currentCountry = COUNTRIES[country];

  const handleSelect = React.useCallback(
    (code: string) => {
      setCountry(code);
      onCountryChange?.(code);
    },
    [setCountry, onCountryChange]
  );

  const commonProps = {
    className,
    showShippingInfo,
    country,
    currentCountry,
    onSelect: handleSelect,
  };

  if (variant === 'dialog') {
    return <CountryDialog {...commonProps} />;
  }

  return <CountryPopover {...commonProps} />;
}

// ============================================================================
// Exports
// ============================================================================

export default CountrySelector;
