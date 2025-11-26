import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ChatWidget } from '@/components/ai/chatbot/chat-widget';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CitadelBuy - AI-Powered E-Commerce Platform',
    template: '%s | CitadelBuy',
  },
  description:
    'Discover the future of shopping with CitadelBuy. AI-powered recommendations, visual search, virtual try-on, and personalized shopping experiences.',
  keywords: [
    'e-commerce',
    'online shopping',
    'AI shopping',
    'visual search',
    'virtual try-on',
    'personalized recommendations',
  ],
  authors: [{ name: 'CitadelBuy' }],
  creator: 'CitadelBuy',
  publisher: 'CitadelBuy',
  metadataBase: new URL('https://citadelbuy.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'es-ES': '/es-ES',
    },
  },
  openGraph: {
    title: 'CitadelBuy - AI-Powered E-Commerce Platform',
    description:
      'Discover the future of shopping with CitadelBuy. AI-powered recommendations, visual search, virtual try-on, and personalized shopping experiences.',
    url: 'https://citadelbuy.com',
    siteName: 'CitadelBuy',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CitadelBuy - AI-Powered Shopping',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CitadelBuy - AI-Powered E-Commerce Platform',
    description:
      'Discover the future of shopping with CitadelBuy. AI-powered recommendations, visual search, and personalized experiences.',
    images: ['/twitter-image.png'],
    creator: '@citadelbuy',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <ChatWidget />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
