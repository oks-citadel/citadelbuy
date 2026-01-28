import Link from 'next/link';
import { Package, Search, Clock, MapPin, AlertCircle, CheckCircle, ArrowLeft, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const orderTopics = [
  { icon: Search, title: 'Track Your Order', description: 'Follow your package in real-time from warehouse to doorstep.' },
  { icon: Clock, title: 'Order Status', description: 'Understand what each order status means.' },
  { icon: AlertCircle, title: 'Cancel an Order', description: 'Learn how to cancel before shipment.' },
  { icon: Package, title: 'Modify an Order', description: 'Change shipping address or items.' },
];

const faqs = [
  { q: 'How do I track my order?', a: 'Go to Account > Orders and click on your order. You will see real-time tracking information including current location and estimated delivery date. You will also receive email and SMS updates.' },
  { q: 'Can I cancel my order after placing it?', a: 'You can cancel within 1 hour of placing the order from your Account > Orders page. After 1 hour, if the order has not shipped, contact our support team for assistance.' },
  { q: 'Why is my order delayed?', a: 'Delays can occur due to high demand, weather conditions, or carrier issues. Check your tracking page for the latest updates. Contact support if your order is more than 5 days past the estimated delivery.' },
  { q: 'Can I change my shipping address after ordering?', a: 'Address changes are only possible before the order ships. Go to Account > Orders, select your order, and click "Edit Shipping Address" if available.' },
  { q: 'What do the order statuses mean?', a: 'Processing = preparing your order, Shipped = on its way, Out for Delivery = arriving today, Delivered = successfully delivered.' },
  { q: 'My order shows delivered but I did not receive it', a: 'First, check with neighbors or your building mailroom. Wait 24 hours as sometimes tracking updates early. Then contact our support team with your order number.' },
];

export default function HelpOrdersPage() {
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
                <Package className="w-8 h-8 text-bx-pink" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">Orders Help</h1>
              <p className="text-bx-text-muted text-lg">Track, modify, or get help with your orders.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-12">
              {orderTopics.map((topic) => (
                <Card key={topic.title} className="bg-bx-bg-2 border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all cursor-pointer">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-bx-bg-3 flex items-center justify-center flex-shrink-0">
                      <topic.icon className="w-5 h-5 text-bx-violet" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-bx-text mb-1">{topic.title}</h3>
                      <p className="text-sm text-bx-text-muted">{topic.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

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
                  <h3 className="font-semibold text-bx-text mb-1">Need more help?</h3>
                  <p className="text-sm text-bx-text-muted">Our support team is available 24/7.</p>
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
