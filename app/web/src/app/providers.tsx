'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { I18nProvider } from '@/contexts/i18n.context';
import { getLocaleFromPathname } from '@/lib/i18n/get-locale';
import { ToastProvider } from '@/components/ui/toast';
import { ProgressBar } from '@/components/ui/progress-bar';
import '@/styles/nprogress.css';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Detect locale from pathname
  const locale = getLocaleFromPathname(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        <ToastProvider>
          <ProgressBar />
          {children}
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
