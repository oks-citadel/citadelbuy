import Link from 'next/link';
import { RotateCcw, CheckCircle, Clock, Package, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const returnSteps = [
  { step: 1, title: 'Start Your Return', description: 'Log into your account, go to Orders, and select the item you want to return.' },
  { step: 2, title: 'Print Your Label', description: 'Print the prepaid return shipping label we provide for free.' },
  { step: 3, title: 'Pack & Ship', description: 'Pack the item securely in its original packaging and drop it off at any carrier location.' },
  { step: 4, title: 'Get Your Refund', description: 'Once we receive and inspect your return, your refund will be processed within 5-7 business days.' },
];

const returnPolicies = [
  { category: 'Most Items', period: '30 days', condition: 'Unused, original packaging' },
  { category: 'Electronics', period: '15 days', condition: 'Unopened or defective' },
  { category: 'Clothing', period: '30 days', condition: 'Unworn, tags attached' },
  { category: 'Beauty', period: '30 days', condition: 'Unopened, sealed' },
  { category: 'Final Sale', period: 'No returns', condition: 'Marked items are final' },
];

export default function ReturnsPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <RotateCcw className="w-4 h-4 text-bx-mint" />
              <span className="text-sm font-medium text-bx-text">Hassle-Free Returns</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Returns & </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Exchanges
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Not satisfied? No problem. We make returns easy with free return shipping on most items.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">How to Return an Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {returnSteps.map((item) => (
                    <div key={item.step} className="text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-bx-pink to-bx-violet flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold">{item.step}</span>
                      </div>
                      <h3 className="font-semibold text-bx-text mb-2">{item.title}</h3>
                      <p className="text-sm text-bx-text-muted">{item.description}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-6">
                  <Button asChild className="bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
                    <Link href="/account/orders">
                      Start a Return
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Clock className="w-5 h-5 text-bx-violet" />
                  Return Policy by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--bx-border)]">
                        <th className="text-left py-3 px-4 text-bx-text font-semibold">Category</th>
                        <th className="text-left py-3 px-4 text-bx-text font-semibold">Return Period</th>
                        <th className="text-left py-3 px-4 text-bx-text font-semibold">Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnPolicies.map((policy) => (
                        <tr key={policy.category} className="border-b border-[var(--bx-border)] last:border-0">
                          <td className="py-3 px-4 text-bx-text">{policy.category}</td>
                          <td className="py-3 px-4 text-bx-pink font-medium">{policy.period}</td>
                          <td className="py-3 px-4 text-bx-text-muted">{policy.condition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  Important Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  'Return shipping is free for most items within the United States.',
                  'Refunds are processed to the original payment method within 5-7 business days after we receive your return.',
                  'Items must be unused and in their original packaging with all tags attached.',
                  'Gift returns will be issued as store credit.',
                  'International returns may have different policies and fees.',
                ].map((info, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-bx-mint flex-shrink-0 mt-0.5" />
                    <p className="text-bx-text-muted">{info}</p>
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
