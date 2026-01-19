import { Leaf, Recycle, TreePine, Droplets, Wind, Package, Target, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const initiatives = [
  { icon: Package, title: 'Eco-Friendly Packaging', description: 'We use 100% recyclable and biodegradable packaging materials for all shipments.' },
  { icon: TreePine, title: 'Carbon Neutral Shipping', description: 'We offset all shipping emissions by investing in reforestation projects worldwide.' },
  { icon: Recycle, title: 'Product Recycling Program', description: 'Return your old products to us for proper recycling and get credit towards new purchases.' },
  { icon: Droplets, title: 'Water Conservation', description: 'Our facilities use water-saving technologies, reducing consumption by 40%.' },
];

const goals = [
  { name: 'Carbon Neutral Operations', current: 75, target: 100, unit: '%', year: 2025 },
  { name: 'Recyclable Packaging', current: 92, target: 100, unit: '%', year: 2024 },
  { name: 'Renewable Energy', current: 60, target: 100, unit: '%', year: 2026 },
  { name: 'Waste Reduction', current: 45, target: 50, unit: '% reduced', year: 2025 },
];

export default function SustainabilityPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Leaf className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-bx-text">Our Commitment</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Building a </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #14b8a6 100%)' }}>
                Sustainable Future
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              At Broxiva, we believe that great shopping and environmental responsibility can go hand in hand.
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Target className="w-7 h-7 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-bx-text">Our Mission</h2>
                </div>
                <p className="text-bx-text-secondary text-lg leading-relaxed">
                  We are committed to reducing our environmental footprint while delivering the best shopping experience.
                  By 2030, we aim to achieve net-zero carbon emissions across our entire operation, from warehouses to
                  last-mile delivery. Every purchase you make supports our journey toward a greener planet.
                </p>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-2xl font-bold text-bx-text mb-6">Our Initiatives</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {initiatives.map((initiative) => (
                  <Card key={initiative.title} className="bg-bx-bg-2 border-[var(--bx-border)]">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                        <initiative.icon className="w-6 h-6 text-green-500" />
                      </div>
                      <h3 className="font-semibold text-bx-text mb-2">{initiative.title}</h3>
                      <p className="text-sm text-bx-text-muted">{initiative.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-bx-text mb-6">Progress Toward Our Goals</h2>
              <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
                <CardContent className="p-6 space-y-6">
                  {goals.map((goal) => (
                    <div key={goal.name}>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-bx-text">{goal.name}</span>
                        <span className="text-sm text-bx-text-muted">Target: {goal.target}{goal.unit} by {goal.year}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Progress value={(goal.current / goal.target) * 100} className="flex-1 h-3" />
                        <span className="text-sm font-medium text-green-500 w-16">{goal.current}{goal.unit}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-bx-text">
                  <Wind className="w-5 h-5 text-green-500" />
                  Impact in Numbers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-3xl font-bold text-green-500">2.5M+</p>
                    <p className="text-sm text-bx-text-muted">Trees Planted</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-500">500K</p>
                    <p className="text-sm text-bx-text-muted">Tons CO2 Offset</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-500">80%</p>
                    <p className="text-sm text-bx-text-muted">Waste Diverted</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-500">1M+</p>
                    <p className="text-sm text-bx-text-muted">Eco-Packages Shipped</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-[var(--bx-border)]">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-bx-text mb-4">How You Can Help</h3>
                <div className="space-y-3">
                  {[
                    'Choose consolidated shipping to reduce package trips',
                    'Opt for our eco-friendly packaging option at checkout',
                    'Return products you do not need for recycling',
                    'Shop from our Sustainable Collection featuring eco-certified products',
                  ].map((tip, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <p className="text-bx-text-muted">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
