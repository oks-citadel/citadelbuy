'use client';

import React, { useState } from 'react';
import { useLanguage } from './useTranslation';
import { SUPPORTED_LANGUAGES, getLanguageByCode, LanguageCode } from './config';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'menu' | 'compact';
  className?: string;
  showFlags?: boolean;
  showNativeName?: boolean;
}

/**
 * Language Switcher Component
 *
 * Provides UI for users to switch between available languages
 */
export function LanguageSwitcher({
  variant = 'dropdown',
  className = '',
  showFlags = true,
  showNativeName = true,
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = getLanguageByCode(language);
  const enabledLanguages = SUPPORTED_LANGUAGES.filter((lang) => lang.isEnabled !== false);

  const handleLanguageChange = async (newLang: LanguageCode) => {
    await setLanguage(newLang);
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Change language"
        >
          {showFlags && currentLang && (
            <span className="text-xl" aria-hidden="true">
              {currentLang.flag}
            </span>
          )}
          <span className="text-sm font-medium uppercase">{language}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
            {enabledLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                  lang.code === language ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                {showFlags && (
                  <span className="text-xl" aria-hidden="true">
                    {lang.flag}
                  </span>
                )}
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{lang.name}</div>
                  {showNativeName && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{lang.nativeName}</div>
                  )}
                </div>
                {lang.code === language && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div className={`space-y-1 ${className}`}>
        {enabledLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              lang.code === language
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {showFlags && (
              <span className="text-xl" aria-hidden="true">
                {lang.flag}
              </span>
            )}
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{lang.name}</div>
              {showNativeName && (
                <div className="text-xs text-gray-500 dark:text-gray-400">{lang.nativeName}</div>
              )}
            </div>
            {lang.code === language && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`}>
      <select
        value={language}
        onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Select language"
      >
        {enabledLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {showFlags ? `${lang.flag} ` : ''}
            {showNativeName ? lang.nativeName : lang.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
// Export Language type for external use
export type { Language } from './config';

// Export LanguageSwitcherProps for external use
export type { LanguageSwitcherProps };

// Export languages array for external use
export const languages = SUPPORTED_LANGUAGES;
