import { Truck, Clock, Globe, Package, MapPin, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const shippingOptions = [
  { name: 'Standard Shipping', time: '5-7 business days', price: 'Free on orders $50+', priceAlt: '$4.99 under $50' },
  { name: 'Express Shipping', time: '2-3 business days', price: '$9.99', priceAlt: 'Free on orders $150+' },
  { name: 'Next Day Delivery', time: '1 business day', price: '$19.99', priceAlt: 'Order by 2PM local time' },
  { name: 'Same Day Delivery', time: 'Within hours', price: '$29.99', priceAlt: 'Select metro areas only' },
];

const internationalZones = [
  { zone: 'Canada & Mexico', time: '5-10 business days', price: 'From $14.99' },
  { zone: 'Europe', time: '7-14 business days', price: 'From $19.99' },
  { zone: 'Asia Pacific', time: '10-20 business days', price: 'From $24.99' },
  { zone: 'Rest of World', time: '14-30 business days', price: 'From $29.99' },
];

export default function ShippingPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Truck className="w-4 h-4 text-bx-cyan" />
              <span className="text-sm font-medium text-bx-text">Fast & Reliable</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Shipping </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Information
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              We offer multiple shipping options to get your order to you as quickly as possible.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <MapPin className="w-5 h-5 text-bx-pink" />
                  Domestic Shipping (United States)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {shippingOptions.map((option) => (
                    <div key={option.name} className="p-4 rounded-xl bg-bx-bg-3 border border-[var(--bx-border)]">
                      <h3 className="font-semibold text-bx-text mb-2">{option.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-bx-text-muted mb-1">
                        <Clock className="w-4 h-4" />
                        {option.time}
                      </div>
                      <p className="text-bx-pink font-medium">{option.price}</p>
                      <p className="text-xs text-bx-text-muted">{option.priceAlt}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Globe className="w-5 h-5 text-bx-violet" />
                  International Shipping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-bx-text-muted mb-6">We ship to over 150 countries worldwide. Delivery times and rates vary by destination.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {internationalZones.map((zone) => (
                    <div key={zone.zone} className="p-4 rounded-xl bg-bx-bg-3 border border-[var(--bx-border)]">
                      <h3 className="font-semibold text-bx-text mb-2">{zone.zone}</h3>
                      <div className="flex items-center gap-2 text-sm text-bx-text-muted mb-1">
                        <Clock className="w-4 h-4" />
                        {zone.time}
                      </div>
                      <p className="text-bx-cyan font-medium">{zone.price}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Package className="w-5 h-5 text-bx-mint" />
                  Shipping FAQs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { q: 'When will my order ship?', a: 'Orders placed before 2 PM local time typically ship the same business day. Orders placed after 2 PM ship the next business day.' },
                  { q: 'How can I track my order?', a: 'Once your order ships, you will receive a tracking number via email. You can also track your order in your account under "Orders".' },
                  { q: 'Do you offer free shipping?', a: 'Yes! We offer free standard shipping on all orders over $50 within the United States.' },
                  { q: 'What if my package is lost or damaged?', a: 'Contact our support team within 30 days of the expected delivery date. We will work with the carrier to resolve the issue or send a replacement.' },
                ].map((faq) => (
                  <div key={faq.q} className="p-4 rounded-xl bg-bx-bg-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-bx-mint flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-bx-text mb-1">{faq.q}</h4>
                        <p className="text-sm text-bx-text-muted">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
