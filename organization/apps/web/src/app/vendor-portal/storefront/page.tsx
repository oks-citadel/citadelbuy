'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Store, Upload, Eye, Save, Palette, Layout, Image as ImageIcon } from 'lucide-react';

export default function StorefrontBuilderPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Storefront Builder</h1>
          <p className="text-muted-foreground mt-2">
            Customize your global storefront for enterprise buyers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand Identity
              </CardTitle>
              <CardDescription>Logo, colors, and brand assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Store Logo</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload your logo (PNG, SVG, or JPG)
                  </p>
                  <Button variant="outline" size="sm">
                    Choose File
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Brand Colors</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Primary Color
                    </label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-16 h-10" defaultValue="#6366f1" />
                      <Input defaultValue="#6366f1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Secondary Color
                    </label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-16 h-10" defaultValue="#8b5cf6" />
                      <Input defaultValue="#8b5cf6" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Information
              </CardTitle>
              <CardDescription>Business details and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Store Name</label>
                <Input placeholder="Your Enterprise Store Name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tagline</label>
                <Input placeholder="Brief description of your business" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">About Your Business</label>
                <textarea
                  className="w-full min-h-[120px] px-3 py-2 border rounded-lg"
                  placeholder="Tell enterprise buyers about your company, capabilities, and what makes you unique..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Banner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Store Banner
              </CardTitle>
              <CardDescription>Hero image for your storefront</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-12 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload banner image (1920x600px recommended)
                </p>
                <Button variant="outline">Choose File</Button>
              </div>
            </CardContent>
          </Card>

          {/* Featured Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Featured Products
              </CardTitle>
              <CardDescription>Showcase your best products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Select products to feature on your storefront</span>
                  <Button size="sm" variant="outline">
                    Select Products
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose up to 12 products to highlight for enterprise buyers
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>See how your store looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-violet-600 to-purple-600" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div>
                      <p className="font-semibold">Your Store Name</p>
                      <p className="text-xs text-muted-foreground">Your tagline here</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your store description will appear here...
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-24 bg-muted rounded" />
                    <div className="h-24 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Customization Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                High-quality images improve conversion by 40%
              </p>
              <p className="text-muted-foreground">
                Clear product descriptions increase buyer confidence
              </p>
              <p className="text-muted-foreground">
                Showcase certifications to build trust with enterprise buyers
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
