import { NextRequest, NextResponse } from 'next/server';
import { i18nConfig, isValidLocale } from '@/config/i18n.config';

/**
 * Detect locale from request
 * Priority: URL param > Cookie > Accept-Language header > Default
 */
export function getLocaleFromRequest(request: NextRequest): string {
  // 1. Check URL path (e.g., /es/products)
  const pathname = request.nextUrl.pathname;
  const pathLocale = pathname.split('/')[1];
  if (isValidLocale(pathLocale)) {
    return pathLocale;
  }

  // 2. Check cookie
  const cookieLocale = request.cookies.get(i18nConfig.localeCookie)?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  // 3. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (isValidLocale(browserLocale)) {
      return browserLocale;
    }
  }

  // 4. Default locale
  return i18nConfig.defaultLocale;
}

/**
 * i18n Middleware
 * Handles locale detection and URL rewriting
 */
export function i18nMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for:
  // - API routes
  // - Static files
  // - Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('/static/') ||
    /\.(ico|png|jpg|jpeg|svg|gif|webp|js|css|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = i18nConfig.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Extract locale from pathname
    const locale = pathname.split('/')[1];

    // Set locale cookie if different
    const currentCookie = request.cookies.get(i18nConfig.localeCookie)?.value;
    if (currentCookie !== locale) {
      const response = NextResponse.next();
      response.cookies.set(i18nConfig.localeCookie, locale, {
        maxAge: i18nConfig.cookieMaxAge,
        path: '/',
      });
      return response;
    }

    return NextResponse.next();
  }

  // Pathname doesn't have locale, redirect to locale-prefixed path
  const locale = getLocaleFromRequest(request);
  const newUrl = new URL(`/${locale}${pathname}`, request.url);

  // Preserve search params
  newUrl.search = request.nextUrl.search;

  const response = NextResponse.redirect(newUrl);

  // Set locale cookie
  response.cookies.set(i18nConfig.localeCookie, locale, {
    maxAge: i18nConfig.cookieMaxAge,
    path: '/',
  });

  return response;
}
