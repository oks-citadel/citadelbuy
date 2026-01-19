import Link from 'next/link';
import { User, ArrowLeft, Mail, Lock, Settings, Bell, Heart, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const accountTopics = [
  { icon: User, title: 'Profile Settings', description: 'Update name, email, and profile information', link: '/account/settings' },
  { icon: Lock, title: 'Password & Security', description: 'Change password and enable 2FA', link: '/account/security' },
  { icon: MapPin, title: 'Addresses', description: 'Manage shipping and billing addresses', link: '/account/addresses' },
  { icon: Bell, title: 'Notifications', description: 'Control email and push notifications', link: '/account/settings' },
  { icon: Heart, title: 'Wishlist', description: 'View and manage saved items', link: '/account/wishlist' },
  { icon: Settings, title: 'Preferences', description: 'Language, currency, and display settings', link: '/account/settings' },
];

const faqs = [
  { q: 'How do I create an account?', a: 'Click "Sign Up" in the header and enter your email. You can also sign up with Google, Apple, or Facebook for faster registration.' },
  { q: 'How do I change my email address?', a: 'Go to Account > Settings > Profile and click "Change Email". You will need to verify the new email address before the change takes effect.' },
  { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page and enter your email. We will send a password reset link that expires in 1 hour.' },
  { q: 'How do I enable two-factor authentication?', a: 'Go to Account > Security and click "Enable 2FA". You can use an authenticator app or receive codes via SMS.' },
  { q: 'How do I delete my account?', a: 'Go to Account > Settings and scroll to "Delete Account". Note that this action is permanent and cannot be undone. Any pending orders will still be fulfilled.' },
  { q: 'Why am I not receiving emails?', a: 'Check your spam folder first. Then go to Account > Notifications to verify your email preferences. Add noreply@broxiva.com to your contacts.' },
  { q: 'How do I view my order history?', a: 'Go to Account > Orders to see all your past and current orders, including tracking information and invoices.' },
  { q: 'Can I have multiple shipping addresses?', a: 'Yes! Go to Account > Addresses to add multiple shipping and billing addresses. You can select from them during checkout.' },
];

export default function HelpAccountPage() {
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
                <User className="w-8 h-8 text-bx-pink" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">Account Help</h1>
              <p className="text-bx-text-muted text-lg">Manage your profile, settings, and preferences.</p>
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="text-bx-text">Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accountTopics.map((topic) => (
                    <Link key={topic.title} href={topic.link}>
                      <div className="p-4 rounded-xl bg-bx-bg-3 hover:bg-bx-bg-3/80 transition-colors cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-bx-bg-2 flex items-center justify-center flex-shrink-0">
                            <topic.icon className="w-5 h-5 text-bx-violet" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-bx-text">{topic.title}</h4>
                            <p className="text-xs text-bx-text-muted">{topic.description}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
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
                  <h3 className="font-semibold text-bx-text mb-1">Account issue?</h3>
                  <p className="text-sm text-bx-text-muted">Our support team can help with account access.</p>
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
