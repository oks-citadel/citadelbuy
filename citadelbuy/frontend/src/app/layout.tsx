import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from './providers';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { RootLayoutClient } from './root-layout-client';
import { PageTransition } from '@/components/ui/page-transition';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CitadelBuy - Next-Generation E-Commerce',
  description: 'Revolutionary e-commerce platform with AI-powered shopping experience',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootLayoutClient inter={inter}>
      <Providers>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </Providers>
    </RootLayoutClient>
  );
}
