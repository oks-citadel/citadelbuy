'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  Circle,
  Upload,
  FileText,
  Building2,
  Globe,
  CreditCard,
  Shield,
  Package,
} from 'lucide-react';

export default function RegionalOnboardingPage() {
  const params = useParams();
  const region = params?.region as string;

  const regionNames: Record<string, string> = {
    na: 'North America',
    eu: 'Europe',
    apac: 'Asia Pacific',
    latam: 'Latin America',
    mea: 'Middle East & Africa',
  };

  const requirements = [
    {
      id: 'business_info',
      title: 'Business Information',
      description: 'Company details and registration',
      icon: Building2,
      completed: false,
      fields: ['Legal business name', 'Registration number', 'Business address'],
    },
    {
      id: 'tax_registration',
      title: 'Tax Registration',
      description: 'Regional tax identification',
      icon: FileText,
      completed: false,
      fields: ['VAT/GST number', 'Tax certificate', 'Fiscal representative'],
    },
    {
      id: 'banking',
      title: 'Banking Information',
      description: 'Local payment details',
      icon: CreditCard,
      completed: false,
      fields: ['Bank account details', 'SWIFT/BIC code', 'Currency preference'],
    },
    {
      id: 'compliance',
      title: 'Compliance Certifications',
      description: 'Required regional certifications',
      icon: Shield,
      completed: false,
      fields: ['Import/export licenses', 'Product certifications', 'Compliance documents'],
    },
    {
      id: 'products',
      title: 'Product Localization',
      description: 'Localized product information',
      icon: Package,
      completed: false,
      fields: ['Product descriptions', 'Pricing in local currency', 'Shipping information'],
    },
    {
      id: 'legal',
      title: 'Legal Agreements',
      description: 'Terms and conditions',
      icon: FileText,
      completed: false,
      fields: ['Vendor agreement', 'Return policy', 'Data processing agreement'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {regionNames[region] || 'Regional'} Onboarding
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete the requirements below to start selling in this region
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Progress</CardTitle>
          <CardDescription>0 of {requirements.length} steps completed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">0%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: '0%' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <div className="space-y-4">
        {requirements.map((req, idx) => {
          const Icon = req.icon;
          return (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        req.completed ? 'bg-green-100' : 'bg-muted'
                      }`}
                    >
                      {req.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {idx + 1}. {req.title}
                      </CardTitle>
                      <CardDescription>{req.description}</CardDescription>
                    </div>
                  </div>
                  {req.completed ? (
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  ) : (
                    <Button size="sm">Complete</Button>
                  )}
                </div>
              </CardHeader>
              {!req.completed && (
                <CardContent>
                  <div className="space-y-4 ml-14">
                    <p className="text-sm text-muted-foreground">Required information:</p>
                    <ul className="space-y-2">
                      {req.fields.map((field, fieldIdx) => (
                        <li key={fieldIdx} className="flex items-center gap-2 text-sm">
                          <Circle className="h-3 w-3 text-muted-foreground" />
                          <span>{field}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4 space-y-3">
                      {req.id === 'business_info' && (
                        <>
                          <Input placeholder="Legal business name" />
                          <Input placeholder="Registration number" />
                          <Input placeholder="Business address" />
                        </>
                      )}
                      {req.id === 'tax_registration' && (
                        <>
                          <Input placeholder="VAT/GST number" />
                          <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Upload tax certificate
                            </p>
                          </div>
                        </>
                      )}
                      {req.id === 'banking' && (
                        <>
                          <Input placeholder="Bank account number" />
                          <Input placeholder="SWIFT/BIC code" />
                          <Input placeholder="Bank name" />
                        </>
                      )}
                      {req.id === 'compliance' && (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Upload certification documents
                          </p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Choose Files
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Submit */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Ready to submit?</h3>
              <p className="text-sm text-blue-800 mt-1">
                Complete all requirements above to submit your application
              </p>
            </div>
            <Button disabled>Submit Application</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
