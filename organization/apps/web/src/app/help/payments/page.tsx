import Link from 'next/link';
import { CreditCard, ArrowLeft, Shield, DollarSign, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const paymentMethods = [
  { name: 'Credit/Debit Cards', description: 'Visa, Mastercard, American Express, Discover', icon: CreditCard },
  { name: 'PayPal', description: 'Pay with your PayPal balance or linked accounts', icon: Wallet },
  { name: 'Apple Pay', description: 'Fast checkout on iOS devices and Safari', icon: Wallet },
  { name: 'Google Pay', description: 'Quick payment on Android and Chrome', icon: Wallet },
  { name: 'Buy Now, Pay Later', description: 'Affirm, Klarna, Afterpay available', icon: DollarSign },
  { name: 'Gift Cards', description: 'Broxiva gift cards and store credit', icon: CreditCard },
];

const faqs = [
  { q: 'What payment methods do you accept?', a: 'We accept Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, Google Pay, and Buy Now Pay Later options through Affirm and Klarna.' },
  { q: 'Is my payment information secure?', a: 'Yes, absolutely. We use 256-bit SSL encryption and are PCI DSS compliant. Your card details are never stored on our servers - they are tokenized by our payment processor.' },
  { q: 'Why was my payment declined?', a: 'Payments may be declined due to incorrect card details, insufficient funds, expired card, or your bank\'s fraud protection. Try a different payment method or contact your bank.' },
  { q: 'When is my card charged?', a: 'Your card is authorized when you place the order and charged when the order ships. Pre-orders are charged when the item becomes available.' },
  { q: 'How do I add or remove a payment method?', a: 'Go to Account > Payment Methods to add, edit, or remove saved payment methods. You can also add new methods during checkout.' },
  { q: 'Can I pay with multiple payment methods?', a: 'Yes, you can split payment between a gift card and a credit card. At checkout, apply your gift card first, then pay the remaining balance with another method.' },
  { q: 'How does Buy Now Pay Later work?', a: 'Select Affirm, Klarna, or Afterpay at checkout to split your purchase into installments. Approval is instant and does not affect your credit score for soft checks.' },
  { q: 'What currency do you charge in?', a: 'We charge in USD. International orders will see the converted amount based on your bank\'s exchange rate.' },
];

export default function HelpPaymentsPage() {
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
                <CreditCard className="w-8 h-8 text-bx-violet" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">Payments Help</h1>
              <p className="text-bx-text-muted text-lg">Payment methods, billing, and security information.</p>
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="text-bx-text">Accepted Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paymentMethods.map((method) => (
                    <div key={method.name} className="p-4 rounded-xl bg-bx-bg-3 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-bx-bg-2 flex items-center justify-center flex-shrink-0">
                        <method.icon className="w-5 h-5 text-bx-pink" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-bx-text">{method.name}</h4>
                        <p className="text-xs text-bx-text-muted">{method.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Shield className="w-5 h-5 text-green-500" />
                  Payment Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  '256-bit SSL encryption on all transactions',
                  'PCI DSS Level 1 compliant payment processing',
                  'Card details tokenized - never stored on our servers',
                  'Fraud monitoring and protection on every order',
                  '3D Secure authentication available',
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-bx-text">{item}</span>
                  </div>
                ))}
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
                  <h3 className="font-semibold text-bx-text mb-1">Billing issue?</h3>
                  <p className="text-sm text-bx-text-muted">We can help with charges and refunds.</p>
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
