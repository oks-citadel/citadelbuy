import { NextRequest, NextResponse } from 'next/server';
// import { i18nMiddleware } from './middleware/i18n.middleware';

/**
 * Next.js Middleware
 * Runs on every request before rendering
 */
export function middleware(request: NextRequest) {
  // TODO: Re-enable i18n middleware after restructuring app directory for localization
  // Apply i18n middleware
  // return i18nMiddleware(request);

  // For now, just pass through without i18n
  return NextResponse.next();
}

/**
 * Middleware configuration
 * Define which paths should trigger the middleware
 */
export const config = {
  // Match all paths except:
  // - API routes (/api/*)
  // - Static files (/_next/static/*)
  // - Image optimization (/_next/image/*)
  // - Favicon and other static assets
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|eot)).*)',
  ],
};
