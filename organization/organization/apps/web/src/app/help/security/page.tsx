import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Eye, AlertTriangle, CheckCircle, Smartphone, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const securityFeatures = [
  { icon: Lock, title: 'Password Protection', description: 'Strong password requirements and secure storage' },
  { icon: Smartphone, title: 'Two-Factor Auth', description: 'Extra security layer with authenticator apps or SMS' },
  { icon: Eye, title: 'Login Monitoring', description: 'Alerts for unusual login activity' },
  { icon: Key, title: 'Secure Sessions', description: 'Automatic logout and session management' },
];

const securityTips = [
  'Use a unique, strong password with at least 12 characters',
  'Enable two-factor authentication for added security',
  'Never share your password or account credentials',
  'Log out of shared or public computers',
  'Keep your email address up to date for security alerts',
  'Review your account activity regularly',
];

const faqs = [
  { q: 'How do I enable two-factor authentication?', a: 'Go to Account > Security and click "Enable 2FA". You can choose between an authenticator app (recommended) or SMS verification. Follow the setup wizard to complete activation.' },
  { q: 'Someone accessed my account without permission', a: 'Immediately change your password and enable 2FA. Go to Account > Security > Active Sessions to log out all other devices. Contact our support team to report the incident.' },
  { q: 'How do I change my password?', a: 'Go to Account > Security and click "Change Password". You will need to enter your current password and then create a new one that meets our security requirements.' },
  { q: 'What are Broxiva\'s password requirements?', a: 'Passwords must be at least 8 characters long and include a mix of uppercase, lowercase, numbers, and special characters. We also check against commonly used passwords.' },
  { q: 'How do I see devices logged into my account?', a: 'Go to Account > Security > Active Sessions to see all devices currently logged into your account. You can log out any device remotely from this page.' },
  { q: 'I received a suspicious email claiming to be from Broxiva', a: 'We never ask for passwords via email. Forward suspicious emails to security@broxiva.com. Check the sender address carefully - our emails only come from @broxiva.com domains.' },
  { q: 'How is my payment information protected?', a: 'We use 256-bit SSL encryption and are PCI DSS Level 1 compliant. Card details are tokenized and never stored on our servers. We also use fraud monitoring on all transactions.' },
  { q: 'What data does Broxiva collect?', a: 'We collect information needed to process orders and improve your experience. See our Privacy Policy for full details. You can download your data or request deletion in Account > Settings.' },
];

export default function HelpSecurityPage() {
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
                <Shield className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-bx-text mb-4">Security Help</h1>
              <p className="text-bx-text-muted text-lg">Protect your account and shop securely.</p>
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="text-bx-text">Security Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {securityFeatures.map((feature) => (
                    <div key={feature.title} className="p-4 rounded-xl bg-bx-bg-3 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-bx-text">{feature.title}</h4>
                        <p className="text-xs text-bx-text-muted">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-6">
                  <Button asChild className="bg-gradient-to-r from-bx-pink to-bx-violet text-white">
                    <Link href="/account/security">Manage Security Settings</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)] mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Security Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {securityTips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-bx-text-muted text-sm">{tip}</span>
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

            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-bx-text mb-1">Report a Security Issue</h3>
                  <p className="text-sm text-bx-text-muted">If you believe your account has been compromised, contact us immediately.</p>
                </div>
                <Button asChild variant="destructive">
                  <Link href="/contact">Report Issue</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
