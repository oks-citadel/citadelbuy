'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useI18n } from '@/contexts/i18n.context';
import { useLanguages, type Language } from '@/lib/api/i18n';
import { getLocaleFlag } from '@/config/i18n.config';

export function LanguageSwitcher() {
  const { locale, changeLocale } = useI18n();
  const { data: languages = [], isLoading } = useLanguages();

  // Filter only enabled languages
  const enabledLanguages = languages.filter((lang: Language) => lang.isEnabled);

  // Find current language
  const currentLanguage = enabledLanguages.find((lang: Language) => lang.code === locale);

  if (isLoading || enabledLanguages.length === 0) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Globe className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Language</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Globe className="h-4 w-4 mr-2" />
          {currentLanguage && (
            <>
              <span className="mr-2">{getLocaleFlag(currentLanguage.code)}</span>
              <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {enabledLanguages.map((language: Language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLocale(language.code as any)}
            className={locale === language.code ? 'bg-accent' : ''}
          >
            <span className="mr-3 text-lg">{getLocaleFlag(language.code)}</span>
            <div className="flex flex-col">
              <span className="font-medium">{language.nativeName}</span>
              <span className="text-xs text-muted-foreground">{language.name}</span>
            </div>
            {locale === language.code && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
