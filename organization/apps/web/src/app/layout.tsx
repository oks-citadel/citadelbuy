import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ChatWidget } from '@/components/ai/chatbot/chat-widget';
import { BroxivaOrganizationJsonLd, BroxivaWebSiteJsonLd } from '@/lib/marketing';
import '@/styles/globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://broxiva.com';

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
    default: 'Broxiva - AI-Powered E-Commerce Platform',
    template: '%s | Broxiva',
  },
  description:
    'Discover the future of shopping with Broxiva. AI-powered recommendations, visual search, virtual try-on, and personalized shopping experiences.',
  keywords: [
    'e-commerce',
    'online shopping',
    'AI shopping',
    'visual search',
    'virtual try-on',
    'personalized recommendations',
  ],
  authors: [{ name: 'Broxiva' }],
  creator: 'Broxiva',
  publisher: 'Broxiva',
  metadataBase: new URL('https://broxiva.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'es-ES': '/es-ES',
    },
  },
  openGraph: {
    title: 'Broxiva - AI-Powered E-Commerce Platform',
    description:
      'Discover the future of shopping with Broxiva. AI-powered recommendations, visual search, virtual try-on, and personalized shopping experiences.',
    url: 'https://broxiva.com',
    siteName: 'Broxiva',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Broxiva - AI-Powered Shopping',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Broxiva - AI-Powered E-Commerce Platform',
    description:
      'Discover the future of shopping with Broxiva. AI-powered recommendations, visual search, and personalized experiences.',
    images: ['/twitter-image.png'],
    creator: '@broxiva',
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
      <head>
        <BroxivaOrganizationJsonLd baseUrl={BASE_URL} />
        <BroxivaWebSiteJsonLd baseUrl={BASE_URL} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
          >
            Skip to main content
          </a>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main id="main-content" className="flex-1">{children}</main>
            <Footer />
          </div>
          <ChatWidget />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
