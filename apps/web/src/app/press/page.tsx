import { Newspaper, Download, Mail, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const pressReleases = [
  { id: 1, title: 'Broxiva Raises $50M Series B to Expand AI Shopping Experience', date: '2024-12-15', source: 'TechCrunch' },
  { id: 2, title: 'Broxiva Launches Visual Search, Revolutionizing Product Discovery', date: '2024-11-20', source: 'The Verge' },
  { id: 3, title: 'Broxiva Named Top 50 Fastest Growing E-Commerce Companies', date: '2024-10-05', source: 'Forbes' },
  { id: 4, title: 'Broxiva Partners with Major Brands for Exclusive Collections', date: '2024-09-18', source: 'Business Insider' },
  { id: 5, title: 'Broxiva Expands to 50 New International Markets', date: '2024-08-10', source: 'Reuters' },
];

const mediaAssets = [
  { name: 'Logo Pack', description: 'PNG, SVG, and EPS formats', size: '2.4 MB' },
  { name: 'Brand Guidelines', description: 'Colors, typography, usage', size: '5.1 MB' },
  { name: 'Executive Photos', description: 'High-res headshots', size: '8.3 MB' },
  { name: 'Product Screenshots', description: 'App and website imagery', size: '12.7 MB' },
];

export default function PressPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Newspaper className="w-4 h-4 text-bx-cyan" />
              <span className="text-sm font-medium text-bx-text">Press & Media</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Broxiva in the </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                News
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Latest press releases, media coverage, and resources for journalists.
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">Press Contact</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <p className="text-bx-text-muted mb-2">For press inquiries, please contact:</p>
                  <p className="text-bx-text font-medium">press@broxiva.com</p>
                </div>
                <Button className="bg-gradient-to-r from-bx-pink to-bx-violet text-white shrink-0">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Press Team
                </Button>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-2xl font-bold text-bx-text mb-6">Latest News</h2>
              <div className="space-y-4">
                {pressReleases.map((release) => (
                  <Card key={release.id} className="bg-bx-bg-2 border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-bx-violet border-bx-violet">{release.source}</Badge>
                            <span className="flex items-center gap-1 text-sm text-bx-text-muted">
                              <Calendar className="w-4 h-4" />
                              {new Date(release.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-bx-text">{release.title}</h3>
                        </div>
                        <Button variant="outline" className="shrink-0">
                          Read More
                          <ExternalLink className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-bx-text mb-6">Media Assets</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {mediaAssets.map((asset) => (
                  <Card key={asset.name} className="bg-bx-bg-2 border-[var(--bx-border)]">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-bx-text">{asset.name}</h3>
                        <p className="text-sm text-bx-text-muted">{asset.description} ({asset.size})</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="w-5 h-5 text-bx-cyan" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">Company Facts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-3xl font-bold text-bx-pink">2021</p>
                    <p className="text-sm text-bx-text-muted">Founded</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-bx-violet">150+</p>
                    <p className="text-sm text-bx-text-muted">Countries</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-bx-cyan">500+</p>
                    <p className="text-sm text-bx-text-muted">Employees</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-bx-mint">$100M+</p>
                    <p className="text-sm text-bx-text-muted">Total Funding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
