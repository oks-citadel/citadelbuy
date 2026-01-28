/**
 * Next.js Instrumentation File
 * This file is loaded before any other code runs and is used to initialize
 * monitoring tools like Sentry for server-side error tracking.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Import Sentry server config for Node.js runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  // Import Sentry edge config for Edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
