import { FileText, CheckCircle, AlertTriangle, Shield, Package, Star, Ban, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const qualityStandards = [
  'All products must be authentic and as described',
  'Product images must be clear, accurate, and high-resolution',
  'Descriptions must include all relevant specifications',
  'Pricing must be competitive and transparent',
  'Inventory must be kept accurate and up-to-date',
];

const prohibitedItems = [
  'Counterfeit or replica products',
  'Illegal substances or controlled materials',
  'Weapons or ammunition',
  'Hazardous materials without proper certification',
  'Adult content outside designated categories',
  'Stolen or illegally obtained goods',
];

const sellerResponsibilities = [
  { title: 'Order Fulfillment', description: 'Ship orders within 2 business days. Provide tracking information promptly.' },
  { title: 'Customer Service', description: 'Respond to customer inquiries within 24 hours. Maintain professional communication.' },
  { title: 'Returns & Refunds', description: 'Honor our 30-day return policy. Process refunds within 5 business days.' },
  { title: 'Product Quality', description: 'Ensure all products meet quality standards. Replace defective items promptly.' },
];

export default function VendorGuidelinesPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <FileText className="w-4 h-4 text-bx-violet" />
              <span className="text-sm font-medium text-bx-text">Seller Standards</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Vendor </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Guidelines
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Everything you need to know about selling on Broxiva and maintaining a successful vendor account.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Quality Standards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-bx-text-muted mb-4">All vendors must adhere to our quality standards to maintain their selling privileges:</p>
                <div className="space-y-3">
                  {qualityStandards.map((standard, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-bx-text">{standard}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Ban className="w-5 h-5 text-red-500" />
                  Prohibited Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-bx-text-muted mb-4">The following items are strictly prohibited on Broxiva:</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {prohibitedItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-bx-text-muted text-sm">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Package className="w-5 h-5 text-bx-cyan" />
                  Seller Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {sellerResponsibilities.map((item) => (
                    <div key={item.title} className="p-4 rounded-xl bg-bx-bg-3">
                      <h4 className="font-semibold text-bx-text mb-2">{item.title}</h4>
                      <p className="text-sm text-bx-text-muted">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Shield className="w-5 h-5 text-bx-pink" />
                  Account Standing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-bx-text-muted">Your account standing is based on key performance metrics:</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-bx-bg-3 text-center">
                    <p className="text-2xl font-bold text-green-500">95%+</p>
                    <p className="text-sm text-bx-text-muted">Order Fulfillment Rate</p>
                  </div>
                  <div className="p-4 rounded-xl bg-bx-bg-3 text-center">
                    <p className="text-2xl font-bold text-green-500">4.0+</p>
                    <p className="text-sm text-bx-text-muted">Average Rating</p>
                  </div>
                  <div className="p-4 rounded-xl bg-bx-bg-3 text-center">
                    <p className="text-2xl font-bold text-green-500">&lt;2%</p>
                    <p className="text-sm text-bx-text-muted">Return Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <HelpCircle className="w-5 h-5 text-bx-mint" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>What are the fees for selling on Broxiva?</AccordionTrigger>
                    <AccordionContent className="text-bx-text-muted">
                      Broxiva charges a referral fee of 8-15% depending on the category. There is no monthly subscription fee for basic accounts.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>How do I get paid for my sales?</AccordionTrigger>
                    <AccordionContent className="text-bx-text-muted">
                      Payments are deposited to your linked bank account every 14 days, or you can request daily payouts for a small fee.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>What happens if I violate the guidelines?</AccordionTrigger>
                    <AccordionContent className="text-bx-text-muted">
                      First violations result in a warning. Repeated violations may lead to listing removal or account suspension.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
