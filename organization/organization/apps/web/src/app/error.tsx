'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCcw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { errorReporting } from '@/lib/error-reporting';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    errorReporting.captureException(error, 'error', {
      react: { errorBoundary: 'global' },
    });
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 text-destructive mb-6">
            <AlertTriangle className="h-10 w-10" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4">
            Something went wrong
          </h1>

          <p className="text-muted-foreground text-lg mb-2">
            We're sorry, but we encountered an unexpected error.
          </p>

          <p className="text-muted-foreground text-sm mb-8">
            Our team has been notified and is working to fix this issue.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button onClick={reset} size="lg" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="gap-2">
              <Link href="/help">
                <MessageSquare className="h-4 w-4" />
                Get Help
              </Link>
            </Button>
          </div>

          {error.digest && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Error Reference: <code className="font-mono">{error.digest}</code>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please include this code when contacting support.
              </p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="mt-6 text-left">
              <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                Developer Details
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
