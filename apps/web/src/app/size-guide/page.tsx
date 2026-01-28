'use client';

import { useState } from 'react';
import { Ruler, Shirt, CircleDot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const womensTops = [
  { size: 'XS', us: '0-2', bust: '31-32"', waist: '24-25"', hips: '34-35"' },
  { size: 'S', us: '4-6', bust: '33-34"', waist: '26-27"', hips: '36-37"' },
  { size: 'M', us: '8-10', bust: '35-36"', waist: '28-29"', hips: '38-39"' },
  { size: 'L', us: '12-14', bust: '37-39"', waist: '30-32"', hips: '40-42"' },
  { size: 'XL', us: '16-18', bust: '40-42"', waist: '33-35"', hips: '43-45"' },
];

const mensTops = [
  { size: 'S', chest: '34-36"', waist: '28-30"', neck: '14-14.5"' },
  { size: 'M', chest: '38-40"', waist: '32-34"', neck: '15-15.5"' },
  { size: 'L', chest: '42-44"', waist: '36-38"', neck: '16-16.5"' },
  { size: 'XL', chest: '46-48"', waist: '40-42"', neck: '17-17.5"' },
  { size: 'XXL', chest: '50-52"', waist: '44-46"', neck: '18-18.5"' },
];

const shoesSizes = [
  { us: '6', uk: '5', eu: '38-39', cm: '24' },
  { us: '7', uk: '6', eu: '39-40', cm: '25' },
  { us: '8', uk: '7', eu: '40-41', cm: '26' },
  { us: '9', uk: '8', eu: '41-42', cm: '27' },
  { us: '10', uk: '9', eu: '42-43', cm: '28' },
  { us: '11', uk: '10', eu: '44-45', cm: '29' },
  { us: '12', uk: '11', eu: '45-46', cm: '30' },
];

export default function SizeGuidePage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Ruler className="w-4 h-4 text-bx-violet" />
              <span className="text-sm font-medium text-bx-text">Find Your Perfect Fit</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Size </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Guide
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Use our comprehensive size charts to find your perfect fit across all categories.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="women" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-bx-bg-2">
                <TabsTrigger value="women">Women</TabsTrigger>
                <TabsTrigger value="men">Men</TabsTrigger>
                <TabsTrigger value="shoes">Shoes</TabsTrigger>
              </TabsList>

              <TabsContent value="women">
                <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-bx-text">
                      <Shirt className="w-5 h-5 text-bx-pink" />
                      Women's Tops & Dresses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--bx-border)]">
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">Size</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">US Size</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">Bust</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">Waist</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">Hips</th>
                          </tr>
                        </thead>
                        <tbody>
                          {womensTops.map((row) => (
                            <tr key={row.size} className="border-b border-[var(--bx-border)] last:border-0">
                              <td className="py-3 px-4 font-medium text-bx-pink">{row.size}</td>
                              <td className="py-3 px-4 text-bx-text">{row.us}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.bust}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.waist}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.hips}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="men">
                <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-bx-text">
                      <Shirt className="w-5 h-5 text-bx-cyan" />
                      Men's Tops & Shirts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--bx-border)]">
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">Size</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">Chest</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">Waist</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">Neck</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mensTops.map((row) => (
                            <tr key={row.size} className="border-b border-[var(--bx-border)] last:border-0">
                              <td className="py-3 px-4 font-medium text-bx-cyan">{row.size}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.chest}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.waist}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.neck}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shoes">
                <Card className="bg-bx-bg-2 border-[var(--bx-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-bx-text">
                      <CircleDot className="w-5 h-5 text-bx-violet" />
                      Shoe Size Conversion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--bx-border)]">
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">US</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">UK</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">EU</th>
                            <th className="py-3 px-4 text-left text-bx-text font-semibold">CM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shoesSizes.map((row) => (
                            <tr key={row.us} className="border-b border-[var(--bx-border)] last:border-0">
                              <td className="py-3 px-4 font-medium text-bx-violet">{row.us}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.uk}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.eu}</td>
                              <td className="py-3 px-4 text-bx-text-muted">{row.cm}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="mt-8 bg-bx-bg-2 border-[var(--bx-border)]">
              <CardHeader>
                <CardTitle className="text-bx-text">How to Measure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-bx-text-muted">
                <p><strong className="text-bx-text">Bust/Chest:</strong> Measure around the fullest part of your chest, keeping the tape horizontal.</p>
                <p><strong className="text-bx-text">Waist:</strong> Measure around your natural waistline, keeping the tape comfortably loose.</p>
                <p><strong className="text-bx-text">Hips:</strong> Measure around the fullest part of your hips.</p>
                <p><strong className="text-bx-text">Foot Length:</strong> Stand on a piece of paper and trace around your foot. Measure from heel to longest toe.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
