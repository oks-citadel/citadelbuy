'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, Search, ChevronRight, MessageCircle, Phone, Mail, FileText, Package, CreditCard, Truck, RefreshCw, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const helpCategories = [
  { icon: Package, title: 'Orders', description: 'Track, modify, or cancel orders', link: '/help/orders' },
  { icon: Truck, title: 'Shipping', description: 'Delivery times and options', link: '/help/shipping' },
  { icon: RefreshCw, title: 'Returns', description: 'Return policy and process', link: '/help/returns' },
  { icon: CreditCard, title: 'Payments', description: 'Payment methods and billing', link: '/help/payments' },
  { icon: User, title: 'Account', description: 'Manage your account settings', link: '/help/account' },
  { icon: Shield, title: 'Security', description: 'Privacy and security info', link: '/help/security' },
];

const faqs = [
  {
    question: 'How can I track my order?',
    answer: 'You can track your order by going to Account > Orders and clicking on the order you want to track. You will see real-time updates on your delivery status, including the current location and estimated delivery time.',
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return policy for most items. Products must be unused and in their original packaging. Some items like electronics have a 15-day return window. Refunds are processed within 5-7 business days after we receive the returned item.',
  },
  {
    question: 'How do I cancel an order?',
    answer: 'You can cancel an order within 1 hour of placing it by going to Account > Orders and selecting "Cancel Order". After 1 hour, if the order hasnt shipped yet, please contact our support team for assistance.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, Google Pay, and Buy Now Pay Later options through Affirm and Klarna.',
  },
  {
    question: 'How long does shipping take?',
    answer: 'Standard shipping takes 5-7 business days. Express shipping (2-3 business days) and Next-day delivery are available for an additional fee. Free shipping is available on orders over $50.',
  },
  {
    question: 'How do I change my delivery address?',
    answer: 'You can update your delivery address before the order ships by going to Account > Orders and editing the shipping details. Once an order has shipped, you may need to contact the carrier directly.',
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Help Center</h1>
          </div>
          <p className="text-xl opacity-90 mb-8">
            How can we help you today?
          </p>

          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-6 text-lg bg-white text-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Topic</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {helpCategories.map((category) => (
              <Link key={category.title} href={category.link}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <category.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold mb-1">{category.title}</h3>
                    <p className="text-xs text-gray-500">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <Card>
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {filteredFaqs.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No FAQs found matching your search. Try different keywords or contact support.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Contact Options */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Still Need Help?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Chat with our support team for quick assistance.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Available 24/7
                </p>
                <Button className="w-full">Start Chat</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Phone Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Call us for immediate help with your issue.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Mon-Fri: 9AM - 6PM EST
                </p>
                <Button variant="outline" className="w-full">
                  1-800-CITADEL
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Send us an email and we will respond within 24 hours.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Response within 24 hours
                </p>
                <Button variant="outline" className="w-full">
                  support@citadelbuy.com
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
