'use client';

/**
 * LocaleSwitcher Component
 *
 * Language/region selector with support for grouped languages
 * and region-specific variants
 */

import * as React from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenant } from '@/lib/tenant';
import {
  LOCALE_DEFINITIONS,
  type SupportedLocale,
} from '@/lib/i18n-edge/config';

// ============================================================================
// Types
// ============================================================================

export interface LocaleSwitcherProps {
  className?: string;
  showFlag?: boolean;
  showLabel?: boolean;
  compact?: boolean;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
}

interface LocaleGroup {
  language: string;
  languageName: string;
  locales: Array<{
    code: SupportedLocale;
    name: string;
    nativeName: string;
    flag: string;
    region: string;
  }>;
}

// ============================================================================
// Flag Component
// ============================================================================

function Flag({ code, className }: { code: string; className?: string }) {
  // Use flag emoji based on country code
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
// Component
// ============================================================================

export function LocaleSwitcher({
  className,
  showFlag = true,
  showLabel = true,
  compact = false,
  align = 'end',
  side = 'bottom',
}: LocaleSwitcherProps) {
  const { locale, setLocale, tenant } = useTenant();

  // Get current locale definition
  const currentLocale = LOCALE_DEFINITIONS[locale as SupportedLocale] ||
    LOCALE_DEFINITIONS['en-us'];

  // Group locales by language
  const localeGroups = React.useMemo(() => {
    const groups: Record<string, LocaleGroup> = {};

    tenant.supportedLocales.forEach((localeCode) => {
      const definition = LOCALE_DEFINITIONS[localeCode as SupportedLocale];
      if (!definition) return;

      const languageKey = definition.language;

      if (!groups[languageKey]) {
        const languageNames: Record<string, string> = {
          en: 'English',
          fr: 'French',
          es: 'Spanish',
          de: 'German',
          pt: 'Portuguese',
          ar: 'Arabic',
          zh: 'Chinese',
          ja: 'Japanese',
          yo: 'Yoruba',
          ha: 'Hausa',
        };

        groups[languageKey] = {
          language: languageKey,
          languageName: languageNames[languageKey] || languageKey,
          locales: [],
        };
      }

      groups[languageKey].locales.push({
        code: localeCode as SupportedLocale,
        name: definition.name,
        nativeName: definition.nativeName,
        flag: definition.flag,
        region: definition.region,
      });
    });

    return Object.values(groups);
  }, [tenant.supportedLocales]);

  const handleLocaleChange = React.useCallback(
    (newLocale: SupportedLocale) => {
      if (newLocale !== locale) {
        setLocale(newLocale);
      }
    },
    [locale, setLocale]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'default'}
          className={cn(
            'flex items-center gap-2',
            compact && 'h-9 w-9',
            className
          )}
        >
          {showFlag ? (
            <Flag code={currentLocale.region} className="shrink-0" />
          ) : (
            <Globe className="h-4 w-4 shrink-0" />
          )}
          {showLabel && !compact && (
            <span className="hidden sm:inline-block">
              {currentLocale.nativeName}
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        className="w-56 max-h-80 overflow-y-auto"
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Select Language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {localeGroups.map((group, index) => (
          <React.Fragment key={group.language}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              {group.locales.length > 1 && (
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {group.languageName}
                </DropdownMenuLabel>
              )}
              {group.locales.map((localeOption) => (
                <DropdownMenuItem
                  key={localeOption.code}
                  onClick={() => handleLocaleChange(localeOption.code)}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Flag code={localeOption.region} />
                    <span>{localeOption.nativeName}</span>
                  </div>
                  {localeOption.code === locale && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default LocaleSwitcher;
