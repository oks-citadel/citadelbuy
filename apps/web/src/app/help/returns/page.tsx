import Link from 'next/link';
import { RotateCcw, ArrowLeft, CheckCircle, Clock, Package, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const returnSteps = [
  { step: 1, title: 'Start Return', description: 'Go to Account > Orders and select "Return Item"' },
  { step: 2, title: 'Print Label', description: 'Print the free prepaid return shipping label' },
  { step: 3, title: 'Pack Item', description: 'Pack securely in original packaging if possible' },
  { step: 4, title: 'Ship', description: 'Drop off at any UPS, FedEx, or USPS location' },
];

const faqs = [
  { q: 'What is your return policy?', a: 'Most items can be returned within 30 days of delivery. Items must be unused, in original packaging, with all tags attached. Electronics have a 15-day return window.' },
  { q: 'How do I start a return?', a: 'Log into your account, go to Orders, find your order, and click "Return Item". Follow the prompts to select items and reason for return. A prepaid shipping label will be provided.' },
  { q: 'Is return shipping free?', a: 'Yes! Return shipping is free for most items within the United States. International returns may have different policies.' },
  { q: 'How long does it take to get my refund?', a: 'Once we receive your return, refunds are processed within 5-7 business days. The refund will appear on your original payment method within 3-5 additional business days.' },
  { q: 'Can I exchange an item instead of returning it?', a: 'Yes! During the return process, you can choose to exchange for a different size, color, or item of equal value. Exchanges ship free.' },
  { q: 'What items cannot be returned?', a: 'Final sale items, personalized products, intimate apparel, and items marked as non-returnable cannot be returned. Check the product page for return eligibility.' },
  { q: 'What if my item arrived damaged?', a: 'Contact us immediately with photos of the damage. We will send a replacement at no cost and arrange for the damaged item to be picked up.' },
];

export default function HelpReturnsPage() {
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
                <RotateCcw className="w-8 h-8 text-bx-mint" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">Returns Help</h1>
              <p className="text-bx-text-muted text-lg">Easy returns and exchanges within 30 days.</p>
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="text-bx-text">How to Return an Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {returnSteps.map((item) => (
                    <div key={item.step} className="text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-bx-pink to-bx-violet flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold">{item.step}</span>
                      </div>
                      <h4 className="font-semibold text-bx-text mb-1">{item.title}</h4>
                      <p className="text-xs text-bx-text-muted">{item.description}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-6">
                  <Button asChild className="bg-gradient-to-r from-bx-pink to-bx-violet text-white">
                    <Link href="/account/orders">Start a Return</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Clock className="w-5 h-5 text-bx-violet" />
                  Return Windows by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { category: 'Clothing & Accessories', days: '30 days' },
                    { category: 'Electronics', days: '15 days' },
                    { category: 'Home & Kitchen', days: '30 days' },
                    { category: 'Beauty (unopened)', days: '30 days' },
                    { category: 'Books & Media', days: '30 days' },
                    { category: 'Final Sale Items', days: 'Non-returnable' },
                  ].map((item) => (
                    <div key={item.category} className="flex items-center justify-between p-3 rounded-xl bg-bx-bg-3">
                      <span className="text-bx-text">{item.category}</span>
                      <span className="text-sm font-medium text-bx-pink">{item.days}</span>
                    </div>
                  ))}
                </div>
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
                  <h3 className="font-semibold text-bx-text mb-1">Return issue?</h3>
                  <p className="text-sm text-bx-text-muted">Our team can help resolve any return problems.</p>
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
