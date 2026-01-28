import Link from 'next/link';
import { TrendingUp, DollarSign, Users, Globe, BarChart3, FileText, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const metrics = [
  { icon: TrendingUp, label: 'Revenue Growth YoY', value: '185%', description: 'Year-over-year revenue growth' },
  { icon: Users, label: 'Active Customers', value: '2.5M+', description: 'Monthly active users' },
  { icon: DollarSign, label: 'GMV', value: '$500M+', description: 'Gross merchandise value' },
  { icon: Globe, label: 'Markets', value: '150+', description: 'Countries served' },
];

const fundingRounds = [
  { round: 'Series B', amount: '$50M', date: 'Dec 2024', lead: 'Sequoia Capital' },
  { round: 'Series A', amount: '$20M', date: 'Jun 2023', lead: 'Andreessen Horowitz' },
  { round: 'Seed', amount: '$5M', date: 'Jan 2022', lead: 'Y Combinator' },
];

const reports = [
  { title: 'Q4 2024 Financial Results', date: '2025-01-15', type: 'Quarterly' },
  { title: 'Q3 2024 Financial Results', date: '2024-10-15', type: 'Quarterly' },
  { title: '2024 Annual Report', date: '2025-02-28', type: 'Annual' },
  { title: 'ESG Report 2024', date: '2024-12-01', type: 'ESG' },
];

export default function InvestorsPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <BarChart3 className="w-4 h-4 text-bx-violet" />
              <span className="text-sm font-medium text-bx-text">Investor Relations</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Invest in the </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Future
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Broxiva is redefining e-commerce with AI-powered experiences. Join us on our growth journey.
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.map((metric) => (
                <Card key={metric.label} className="bg-bx-bg-2 border-[var(--bx-border)]">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center mx-auto mb-4">
                      <metric.icon className="w-6 h-6 text-bx-pink" />
                    </div>
                    <p className="text-3xl font-bold text-bx-text mb-1">{metric.value}</p>
                    <p className="text-sm text-bx-text-muted">{metric.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">Funding History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fundingRounds.map((round) => (
                    <div key={round.round} className="flex items-center justify-between p-4 rounded-xl bg-bx-bg-3">
                      <div>
                        <h3 className="font-semibold text-bx-text">{round.round}</h3>
                        <p className="text-sm text-bx-text-muted">Led by {round.lead}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-bx-pink">{round.amount}</p>
                        <p className="text-sm text-bx-text-muted">{round.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <FileText className="w-5 h-5 text-bx-cyan" />
                  Reports & Filings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {reports.map((report) => (
                    <div key={report.title} className="flex items-center justify-between p-4 rounded-xl bg-bx-bg-3">
                      <div>
                        <h4 className="font-medium text-bx-text">{report.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-bx-text-muted">
                          <Calendar className="w-4 h-4" />
                          {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Download</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">Investment Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-bx-text-muted">
                <p><strong className="text-bx-text">Market Opportunity:</strong> The global e-commerce market is projected to reach $7.4 trillion by 2025. Broxiva is positioned to capture significant market share through AI innovation.</p>
                <p><strong className="text-bx-text">Competitive Advantage:</strong> Our proprietary AI technology delivers personalized shopping experiences that drive 3x higher conversion rates than industry average.</p>
                <p><strong className="text-bx-text">Strong Unit Economics:</strong> Positive contribution margin with clear path to profitability. LTV:CAC ratio of 4.5x demonstrates efficient customer acquisition.</p>
                <p><strong className="text-bx-text">Experienced Team:</strong> Leadership team with experience from Amazon, Google, and top e-commerce companies.</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-bx-pink/10 via-bx-violet/10 to-bx-cyan/10 border-[var(--bx-border)]">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold text-bx-text mb-4">Contact Investor Relations</h3>
                <p className="text-bx-text-muted mb-6">For investor inquiries, please reach out to our IR team.</p>
                <Button className="bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
                  <Mail className="w-4 h-4 mr-2" />
                  ir@broxiva.com
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
