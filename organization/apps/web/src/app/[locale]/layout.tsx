import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { seoConfig, SUPPORTED_LOCALES } from '@/lib/seo/config';
import { Hreflang } from '@/components/seo';
import { BroxivaOrganization, BroxivaWebSiteJsonLd } from '@/lib/seo/json-ld';

// Generate static params for all supported locales
export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({
    locale: locale.code,
  }));
}

// Validate locale and return 404 for invalid ones
function validateLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.some(
    (l) => l.code === locale || l.code.toLowerCase() === locale.toLowerCase()
  );
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const locale = params.locale;
  const localeConfig = SUPPORTED_LOCALES.find(
    (l) => l.code === locale || l.code.toLowerCase() === locale.toLowerCase()
  );

  if (!localeConfig) {
    return {};
  }

  return {
    alternates: {
      canonical: `${seoConfig.siteUrl}/${locale}`,
      languages: SUPPORTED_LOCALES.reduce(
        (acc, l) => {
          acc[l.hreflang] = `${seoConfig.siteUrl}/${l.code}`;
          return acc;
        },
        { 'x-default': seoConfig.siteUrl } as Record<string, string>
      ),
    },
  };
}

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  // Validate locale
  if (!validateLocale(params.locale)) {
    notFound();
  }

  const localeConfig = SUPPORTED_LOCALES.find(
    (l) => l.code === params.locale || l.code.toLowerCase() === params.locale.toLowerCase()
  );

  return (
    <>
      {/* Global SEO structured data */}
      <BroxivaOrganization baseUrl={seoConfig.siteUrl} />
      <BroxivaWebSiteJsonLd baseUrl={seoConfig.siteUrl} />

      {/* Locale-specific hreflang tags */}
      <Hreflang locale={params.locale} />

      {/* Language direction for RTL languages */}
      <div
        dir={localeConfig?.code === 'ar' ? 'rtl' : 'ltr'}
        lang={localeConfig?.hreflang || params.locale}
      >
        {children}
      </div>
    </>
  );
}
