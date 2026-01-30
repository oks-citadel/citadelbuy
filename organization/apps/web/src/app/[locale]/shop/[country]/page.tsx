import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, Truck, Shield, Star, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateCountryMetadata } from '@/lib/seo/metadata';
import { BreadcrumbSchema, generateProductBreadcrumbs } from '@/components/seo';
import { seoConfig, getCurrencyForLocale } from '@/lib/seo/config';

// Country data
const COUNTRIES: Record<string, {
  name: string;
  code: string;
  currency: string;
  currencySymbol: string;
  languages: string[];
  shippingInfo: string;
  popularCategories: string[];
  testimonials: Array<{
    name: string;
    location: string;
    text: string;
    rating: number;
  }>;
}> = {
  us: {
    name: 'United States',
    code: 'US',
    currency: 'USD',
    currencySymbol: '$',
    languages: ['en'],
    shippingInfo: 'Free shipping on orders over $50. Standard delivery 3-7 business days.',
    popularCategories: ['Electronics', 'Fashion', 'Home & Garden', 'Sports'],
    testimonials: [
      { name: 'John D.', location: 'New York', text: 'Great selection and fast shipping!', rating: 5 },
      { name: 'Sarah M.', location: 'California', text: 'Love the international products available here.', rating: 5 },
    ],
  },
  gb: {
    name: 'United Kingdom',
    code: 'GB',
    currency: 'GBP',
    currencySymbol: '£',
    languages: ['en'],
    shippingInfo: 'Free shipping on orders over £40. Standard delivery 2-5 business days.',
    popularCategories: ['Fashion', 'Electronics', 'Beauty', 'Home'],
    testimonials: [
      { name: 'James W.', location: 'London', text: 'Excellent service and quality products.', rating: 5 },
      { name: 'Emma T.', location: 'Manchester', text: 'My go-to for unique finds from around the world.', rating: 4 },
    ],
  },
  ng: {
    name: 'Nigeria',
    code: 'NG',
    currency: 'NGN',
    currencySymbol: '₦',
    languages: ['en', 'yo', 'ha'],
    shippingInfo: 'Local delivery within 2-5 days. International shipping available.',
    popularCategories: ['Electronics', 'Fashion', 'Phones', 'Computing'],
    testimonials: [
      { name: 'Chidi O.', location: 'Lagos', text: 'Finally, a marketplace that understands African needs!', rating: 5 },
      { name: 'Amina B.', location: 'Abuja', text: 'Great prices and reliable delivery.', rating: 5 },
    ],
  },
  ke: {
    name: 'Kenya',
    code: 'KE',
    currency: 'KES',
    currencySymbol: 'KSh',
    languages: ['en', 'sw'],
    shippingInfo: 'Local delivery within 3-7 days. M-PESA payment accepted.',
    popularCategories: ['Electronics', 'Fashion', 'Agriculture', 'Solar'],
    testimonials: [
      { name: 'David K.', location: 'Nairobi', text: 'Best B2B platform for East African businesses.', rating: 5 },
      { name: 'Grace M.', location: 'Mombasa', text: 'Easy to find suppliers for my retail shop.', rating: 4 },
    ],
  },
  za: {
    name: 'South Africa',
    code: 'ZA',
    currency: 'ZAR',
    currencySymbol: 'R',
    languages: ['en', 'af', 'zu'],
    shippingInfo: 'Nationwide delivery within 3-7 days. Express options available.',
    popularCategories: ['Electronics', 'Industrial', 'Fashion', 'Automotive'],
    testimonials: [
      { name: 'Thabo N.', location: 'Johannesburg', text: 'Excellent platform for wholesale purchases.', rating: 5 },
      { name: 'Lerato S.', location: 'Cape Town', text: 'Reliable vendors and great customer service.', rating: 5 },
    ],
  },
  de: {
    name: 'Germany',
    code: 'DE',
    currency: 'EUR',
    currencySymbol: '€',
    languages: ['de'],
    shippingInfo: 'Kostenloser Versand ab €50. Lieferzeit 2-4 Werktage.',
    popularCategories: ['Electronics', 'Industrial', 'Automotive', 'Tools'],
    testimonials: [
      { name: 'Hans M.', location: 'Berlin', text: 'Gute Qualität und schnelle Lieferung.', rating: 5 },
      { name: 'Anna S.', location: 'Munich', text: 'Perfekt für B2B-Einkäufe.', rating: 4 },
    ],
  },
  fr: {
    name: 'France',
    code: 'FR',
    currency: 'EUR',
    currencySymbol: '€',
    languages: ['fr'],
    shippingInfo: 'Livraison gratuite dès 50€. Délai 2-5 jours ouvrés.',
    popularCategories: ['Fashion', 'Beauty', 'Wine', 'Home Decor'],
    testimonials: [
      { name: 'Marie L.', location: 'Paris', text: 'Excellent choix de produits internationaux.', rating: 5 },
      { name: 'Pierre D.', location: 'Lyon', text: 'Service client réactif et professionnel.', rating: 5 },
    ],
  },
  ae: {
    name: 'United Arab Emirates',
    code: 'AE',
    currency: 'AED',
    currencySymbol: 'د.إ',
    languages: ['ar', 'en'],
    shippingInfo: 'Free delivery on orders over AED 200. Same-day delivery in Dubai.',
    popularCategories: ['Electronics', 'Fashion', 'Jewelry', 'Luxury'],
    testimonials: [
      { name: 'Ahmed K.', location: 'Dubai', text: 'Perfect for sourcing products for my business.', rating: 5 },
      { name: 'Fatima A.', location: 'Abu Dhabi', text: 'Great selection and competitive prices.', rating: 5 },
    ],
  },
  br: {
    name: 'Brazil',
    code: 'BR',
    currency: 'BRL',
    currencySymbol: 'R$',
    languages: ['pt'],
    shippingInfo: 'Frete grátis acima de R$150. Entrega em 5-10 dias úteis.',
    popularCategories: ['Electronics', 'Fashion', 'Sports', 'Beauty'],
    testimonials: [
      { name: 'Carlos S.', location: 'São Paulo', text: 'Ótima plataforma para compras B2B.', rating: 5 },
      { name: 'Ana R.', location: 'Rio de Janeiro', text: 'Produtos de qualidade com preços justos.', rating: 4 },
    ],
  },
};

interface PageProps {
  params: Promise<{
    locale: string;
    country: string;
  }>;
}

// Generate metadata for the page
export async function generateMetadata({ params: paramsPromise }: PageProps): Promise<Metadata> {
  const params = await paramsPromise;
  const countryData = COUNTRIES[params.country.toLowerCase()];

  if (!countryData) {
    return {};
  }

  return generateCountryMetadata({
    country: countryData.name,
    countryCode: countryData.code,
    currency: countryData.currency,
    locale: params.locale,
    path: `/shop/${params.country}`,
    popularCategories: countryData.popularCategories,
  });
}

// Generate static params for all countries
export async function generateStaticParams() {
  const countries = Object.keys(COUNTRIES);
  const locales = seoConfig.supportedLocales.map(l => l.code);

  return countries.flatMap(country =>
    locales.map(locale => ({
      locale,
      country,
    }))
  );
}

export default async function CountryLandingPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const countryData = COUNTRIES[params.country.toLowerCase()];

  if (!countryData) {
    notFound();
  }

  // Fetch popular products (mock data - replace with actual API call)
  const popularProducts = [
    { id: '1', name: 'Premium Wireless Headphones', price: 99.99, image: '/products/headphones.jpg', rating: 4.5, reviews: 234 },
    { id: '2', name: 'Smart Watch Pro', price: 199.99, image: '/products/watch.jpg', rating: 4.8, reviews: 567 },
    { id: '3', name: 'Portable Power Bank', price: 39.99, image: '/products/powerbank.jpg', rating: 4.3, reviews: 189 },
    { id: '4', name: 'Bluetooth Speaker', price: 59.99, image: '/products/speaker.jpg', rating: 4.6, reviews: 345 },
  ];

  // Format price for the country's currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(params.locale, {
      style: 'currency',
      currency: countryData.currency,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Schema */}
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Shop', url: '/shop' },
          { name: countryData.name },
        ]}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Globe className="w-8 h-8" />
            <span className="text-lg opacity-90">Shop in</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {countryData.name}
          </h1>
          <p className="text-xl opacity-90 mb-6 max-w-2xl">
            Discover thousands of products with {countryData.currency} pricing and shipping options tailored for {countryData.name}.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" variant="secondary">
              Browse All Products
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
              View Categories
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white border-b py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <span className="text-sm">{countryData.shippingInfo.split('.')[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm">Buyer Protection Guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-sm">Track Your Orders</span>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">
            Popular Categories in {countryData.name}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {countryData.popularCategories.map((category, index) => (
              <Link
                key={index}
                href={`/${params.locale}/categories/${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <h3 className="font-semibold">{category}</h3>
                    <ChevronRight className="w-4 h-4 mx-auto mt-2 text-gray-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Products */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              Popular Products in {countryData.name}
            </h2>
            <Link href={`/${params.locale}/products`} className="text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative bg-gray-100">
                  <Image
                    src={product.image || '/placeholder.jpg'}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{product.rating}</span>
                    <span className="text-sm text-gray-500">({product.reviews})</span>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(product.price)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping Info */}
      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">
              Shipping to {countryData.name}
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              {countryData.shippingInfo}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-2">Standard Shipping</h3>
                  <p className="text-gray-600">5-10 business days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-2">Express Shipping</h3>
                  <p className="text-gray-600">2-5 business days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-2">Local Pickup</h3>
                  <p className="text-gray-600">Available in select cities</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-center">
            What Customers in {countryData.name} Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {countryData.testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">&quot;{testimonial.text}&quot;</p>
                  <div className="text-sm">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-gray-500">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Currency Info */}
      <section className="py-8 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg">
            All prices displayed in <strong>{countryData.currency}</strong> ({countryData.currencySymbol})
          </p>
          <p className="text-sm opacity-80 mt-2">
            Prices are converted at the current exchange rate. Final charge may vary slightly.
          </p>
        </div>
      </section>
    </div>
  );
}
