import { i18nConfig, type Locale, isValidLocale } from '@/config/i18n.config';
import Cookies from 'js-cookie';

/**
 * Get current locale from cookies (client-side)
 * Used in Client Components
 */
export async function getLocale(): Promise<Locale> {
  // For client-side
  if (typeof window !== 'undefined') {
    const cookieLocale = Cookies.get(i18nConfig.localeCookie);
    if (cookieLocale && isValidLocale(cookieLocale)) {
      return cookieLocale as Locale;
    }
  }

  return i18nConfig.defaultLocale as Locale;
}

/**
 * Get locale from URL pathname
 * Used in client components to extract locale from URL
 */
export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length > 0 && isValidLocale(segments[0])) {
    return segments[0] as Locale;
  }

  return i18nConfig.defaultLocale as Locale;
}
