'use client';

import Link from 'next/link';
import { Briefcase, MapPin, Clock, Users, Heart, Zap, Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const openPositions = [
  { id: 1, title: 'Senior Frontend Engineer', department: 'Engineering', location: 'San Francisco, CA', type: 'Full-time', remote: true },
  { id: 2, title: 'Product Designer', department: 'Design', location: 'New York, NY', type: 'Full-time', remote: true },
  { id: 3, title: 'Data Scientist', department: 'Data', location: 'San Francisco, CA', type: 'Full-time', remote: false },
  { id: 4, title: 'Customer Success Manager', department: 'Operations', location: 'Austin, TX', type: 'Full-time', remote: true },
  { id: 5, title: 'DevOps Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time', remote: true },
  { id: 6, title: 'Marketing Manager', department: 'Marketing', location: 'Los Angeles, CA', type: 'Full-time', remote: false },
];

const benefits = [
  { icon: Heart, title: 'Health & Wellness', description: 'Comprehensive medical, dental, and vision coverage for you and your family' },
  { icon: Zap, title: 'Unlimited PTO', description: 'Take the time you need to recharge and bring your best self to work' },
  { icon: Globe, title: 'Remote Friendly', description: 'Work from anywhere with flexible remote and hybrid options' },
  { icon: Users, title: 'Learning Budget', description: '$2,000 annual budget for conferences, courses, and professional development' },
];

export default function CareersPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Briefcase className="w-4 h-4 text-bx-pink" />
              <span className="text-sm font-medium text-bx-text">Join Our Team</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Build the Future of </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                E-Commerce
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              We are looking for passionate people who want to shape the future of online shopping with AI and innovation.
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-bx-text mb-6">Why Join Broxiva?</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {benefits.map((benefit) => (
                  <Card key={benefit.title} className="bg-bx-bg-2 border-[var(--bx-border)]">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center mb-4">
                        <benefit.icon className="w-6 h-6 text-bx-violet" />
                      </div>
                      <h3 className="font-semibold text-bx-text mb-2">{benefit.title}</h3>
                      <p className="text-sm text-bx-text-muted">{benefit.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-bx-text mb-6">Open Positions</h2>
              <div className="space-y-4">
                {openPositions.map((job) => (
                  <Card key={job.id} className="bg-bx-bg-2 border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-bx-text mb-2">{job.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-bx-text-muted">
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              {job.department}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {job.type}
                            </span>
                            {job.remote && <Badge variant="outline" className="text-bx-cyan border-bx-cyan">Remote OK</Badge>}
                          </div>
                        </div>
                        <Button className="bg-gradient-to-r from-bx-pink to-bx-violet text-white shrink-0">
                          Apply Now
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="bg-gradient-to-r from-bx-pink/10 via-bx-violet/10 to-bx-cyan/10 border-[var(--bx-border)]">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold text-bx-text mb-4">Do not see a role that fits?</h3>
                <p className="text-bx-text-muted mb-6">We are always looking for talented individuals. Send us your resume and let us know how you can contribute.</p>
                <Button variant="outline" className="border-bx-violet text-bx-violet hover:bg-bx-violet/10">
                  Send General Application
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
