'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCcw, Building2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { errorReporting } from '@/lib/error-reporting';

export default function OrganizationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errorReporting.captureException(error, 'error', {
      react: { errorBoundary: 'organization' },
    });
    console.error('Organization error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-6">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-4">
            Organization Page Error
          </h1>

          <p className="text-muted-foreground mb-6">
            We couldn't load this organization page. This might be due to access
            permissions or a temporary issue. Please try again.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button onClick={reset} size="lg" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/account">
                <Building2 className="h-4 w-4" />
                My Organizations
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
