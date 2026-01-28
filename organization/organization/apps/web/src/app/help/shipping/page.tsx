import Link from 'next/link';
import { Truck, Clock, Globe, MapPin, Package, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const shippingOptions = [
  { name: 'Standard', time: '5-7 business days', price: 'Free on $50+' },
  { name: 'Express', time: '2-3 business days', price: '$9.99' },
  { name: 'Next Day', time: '1 business day', price: '$19.99' },
  { name: 'Same Day', time: 'Within hours', price: '$29.99 (select areas)' },
];

const faqs = [
  { q: 'How long does shipping take?', a: 'Standard shipping takes 5-7 business days, Express takes 2-3 business days, and Next Day delivery arrives within 1 business day when ordered before 2 PM.' },
  { q: 'Do you offer free shipping?', a: 'Yes! Free standard shipping is available on all orders over $50 within the United States. Free express shipping on orders over $150.' },
  { q: 'Do you ship internationally?', a: 'Yes, we ship to over 150 countries. International shipping times range from 7-30 business days depending on destination. Rates start at $14.99.' },
  { q: 'Can I change my shipping address?', a: 'You can change your shipping address before the order ships. Go to Account > Orders, select your order, and edit the address if the option is available.' },
  { q: 'What carriers do you use?', a: 'We partner with UPS, FedEx, USPS, and DHL for domestic and international shipments. The carrier is selected based on your location and shipping speed.' },
  { q: 'How do I get tracking information?', a: 'Once your order ships, you will receive an email with tracking information. You can also view tracking in Account > Orders at any time.' },
  { q: 'What if my package is lost?', a: 'If your package has not arrived within 5 days of the estimated delivery date, contact our support team. We will investigate and either locate your package or send a replacement.' },
];

export default function HelpShippingPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Link href="/help" className="inline-flex items-center gap-2 text-bx-text-muted hover:text-bx-text mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Help Center
            </Link>

            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
                <Truck className="w-8 h-8 text-bx-cyan" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">Shipping Help</h1>
              <p className="text-bx-text-muted text-lg">Delivery options, times, and tracking information.</p>
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Clock className="w-5 h-5 text-bx-violet" />
                  Shipping Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {shippingOptions.map((option) => (
                    <div key={option.name} className="p-4 rounded-xl bg-bx-bg-3">
                      <h4 className="font-semibold text-bx-text mb-1">{option.name}</h4>
                      <p className="text-sm text-bx-text-muted">{option.time}</p>
                      <p className="text-sm font-medium text-bx-pink mt-1">{option.price}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Globe className="w-5 h-5 text-bx-cyan" />
                  International Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-bx-text-muted">We ship to over 150 countries worldwide. International orders may be subject to import duties and taxes, which are the responsibility of the recipient.</p>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-bx-text">Customs forms included on all international packages</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-bx-text">Full tracking to most destinations</span>
                </div>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/shipping">View Full Shipping Rates</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="text-bx-text">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left text-bx-text">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-bx-text-muted">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-bx-pink/10 via-bx-violet/10 to-bx-cyan/10 border-[var(--bx-border)]">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-bx-text mb-1">Package issue?</h3>
                  <p className="text-sm text-bx-text-muted">We are here to help with any shipping concerns.</p>
                </div>
                <Button asChild className="bg-gradient-to-r from-bx-pink to-bx-violet text-white">
                  <Link href="/contact">Contact Support</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
