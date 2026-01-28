'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2,
  Save,
  Upload,
  Mail,
  Phone,
  Globe,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { organizationsApi } from '@/lib/organizations-api';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  features?: {
    aiEnabled: boolean;
    analyticsEnabled: boolean;
    apiAccessEnabled: boolean;
  };
}

export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
    features: {
      aiEnabled: false,
      analyticsEnabled: false,
      apiAccessEnabled: false,
    },
  });

  useEffect(() => {
    loadOrganization();
  }, [slug]);

  const loadOrganization = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock data for now
      const mockOrg: Organization = {
        id: 'org_1',
        name: 'Acme Corporation',
        slug: slug,
        description: 'A leading e-commerce platform',
        logo: undefined,
        website: 'https://acme.com',
        contactEmail: 'contact@acme.com',
        contactPhone: '+1 (555) 123-4567',
        features: {
          aiEnabled: true,
          analyticsEnabled: true,
          apiAccessEnabled: false,
        },
      };

      setOrganization(mockOrg);
      setFormData({
        name: mockOrg.name,
        slug: mockOrg.slug,
        description: mockOrg.description || '',
        website: mockOrg.website || '',
        contactEmail: mockOrg.contactEmail || '',
        contactPhone: mockOrg.contactPhone || '',
        features: mockOrg.features || {
          aiEnabled: false,
          analyticsEnabled: false,
          apiAccessEnabled: false,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization');
      toast.error('Failed to load organization settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleFeatureToggle = (feature: keyof typeof formData.features, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    try {
      setIsUploadingLogo(true);
      const { logoUrl } = await organizationsApi.uploadLogo(organization.id, file);
      setOrganization({ ...organization, logo: logoUrl });
      toast.success('Logo uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setIsSaving(true);
      setError(null);

      await organizationsApi.update(organization.id, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        website: formData.website,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
      });

      setHasChanges(false);
      toast.success('Settings saved successfully');

      // If slug changed, redirect to new URL
      if (formData.slug !== slug) {
        router.push(`/org/${formData.slug}/settings`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="py-12">
        <Alert variant="destructive">
          <X className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's profile and preferences
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          isLoading={isSaving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save Changes
        </Button>
      </div>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Logo</CardTitle>
          <CardDescription>Update your organization's logo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              {organization?.logo ? (
                <AvatarImage src={organization.logo} alt={formData.name} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials(formData.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <Button
                  variant="outline"
                  disabled={isUploadingLogo}
                  isLoading={isUploadingLogo}
                  leftIcon={<Upload className="h-4 w-4" />}
                  asChild
                >
                  <span>Upload Logo</span>
                </Button>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={isUploadingLogo}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG or SVG. Max size 2MB. Recommended 400x400px.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Your organization's public information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder="acme-corp"
              />
              <p className="text-xs text-muted-foreground">
                Your organization URL: /org/{formData.slug}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Tell us about your organization..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>How can people reach your organization?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  placeholder="contact@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://example.com"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Enable or disable features for your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enabled" className="text-base">
                AI Features
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable AI-powered recommendations and smart search
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={formData.features.aiEnabled}
              onCheckedChange={(checked) => handleFeatureToggle('aiEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="analytics-enabled" className="text-base">
                Advanced Analytics
              </Label>
              <p className="text-sm text-muted-foreground">
                Access detailed analytics and reporting
              </p>
            </div>
            <Switch
              id="analytics-enabled"
              checked={formData.features.analyticsEnabled}
              onCheckedChange={(checked) => handleFeatureToggle('analyticsEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="api-access-enabled" className="text-base">
                API Access
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable API access for custom integrations
              </p>
            </div>
            <Switch
              id="api-access-enabled"
              checked={formData.features.apiAccessEnabled}
              onCheckedChange={(checked) => handleFeatureToggle('apiAccessEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to apply them.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
