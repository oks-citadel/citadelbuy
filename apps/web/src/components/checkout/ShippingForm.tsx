'use client';

import * as React from 'react';
import { MapPin, User, Mail, Phone, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ShippingFormProps {
  initialValues?: Partial<ShippingAddress>;
  onSubmit: (address: ShippingAddress) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  showCountryField?: boolean;
  countries?: { code: string; name: string }[];
  className?: string;
}

const DEFAULT_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

const EMPTY_ADDRESS: ShippingAddress = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
};

/**
 * ShippingForm Component
 *
 * A comprehensive shipping address form for checkout.
 * Includes validation and support for international addresses.
 */
export function ShippingForm({
  initialValues = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Continue to Payment',
  showCountryField = true,
  countries = DEFAULT_COUNTRIES,
  className,
}: ShippingFormProps) {
  const [address, setAddress] = React.useState<ShippingAddress>({
    ...EMPTY_ADDRESS,
    ...initialValues,
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof ShippingAddress, string>>>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validateZipCode = (zipCode: string, country: string): boolean => {
    if (country === 'US') {
      return /^\d{5}(-\d{4})?$/.test(zipCode);
    }
    if (country === 'CA') {
      return /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(zipCode);
    }
    if (country === 'GB') {
      return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(zipCode);
    }
    // Generic validation for other countries
    return zipCode.length >= 3;
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {};

    if (!address.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!address.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!address.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(address.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!address.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(address.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!address.address1.trim()) {
      newErrors.address1 = 'Street address is required';
    }
    if (!address.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!address.state.trim()) {
      newErrors.state = 'State/Province is required';
    }
    if (!address.zipCode.trim()) {
      newErrors.zipCode = 'ZIP/Postal code is required';
    } else if (!validateZipCode(address.zipCode, address.country)) {
      newErrors.zipCode = 'Please enter a valid ZIP/Postal code';
    }
    if (!address.country.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ShippingAddress) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setAddress((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSubmit(address);
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Shipping Address
        </CardTitle>
        <CardDescription>
          Enter your shipping details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="shipping-form">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                <User className="h-3.5 w-3.5 inline mr-1" />
                First Name *
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={address.firstName}
                onChange={handleChange('firstName')}
                placeholder="John"
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p id="firstName-error" className="text-sm text-destructive">
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                value={address.lastName}
                onChange={handleChange('lastName')}
                placeholder="Doe"
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p id="lastName-error" className="text-sm text-destructive">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-3.5 w-3.5 inline mr-1" />
                Email *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={address.email}
                onChange={handleChange('email')}
                placeholder="john.doe@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="h-3.5 w-3.5 inline mr-1" />
                Phone *
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={address.phone}
                onChange={handleChange('phone')}
                placeholder="+1 (555) 123-4567"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm text-destructive">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Address Fields */}
          <div className="space-y-2">
            <Label htmlFor="address1">
              <Building2 className="h-3.5 w-3.5 inline mr-1" />
              Street Address *
            </Label>
            <Input
              id="address1"
              name="address1"
              value={address.address1}
              onChange={handleChange('address1')}
              placeholder="123 Main Street"
              aria-invalid={!!errors.address1}
              aria-describedby={errors.address1 ? 'address1-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.address1 && (
              <p id="address1-error" className="text-sm text-destructive">
                {errors.address1}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Apartment, Suite, etc. (optional)</Label>
            <Input
              id="address2"
              name="address2"
              value={address.address2 || ''}
              onChange={handleChange('address2')}
              placeholder="Apt 4B"
              disabled={isSubmitting}
            />
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                name="city"
                value={address.city}
                onChange={handleChange('city')}
                placeholder="New York"
                aria-invalid={!!errors.city}
                aria-describedby={errors.city ? 'city-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.city && (
                <p id="city-error" className="text-sm text-destructive">
                  {errors.city}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province *</Label>
              <Input
                id="state"
                name="state"
                value={address.state}
                onChange={handleChange('state')}
                placeholder="NY"
                aria-invalid={!!errors.state}
                aria-describedby={errors.state ? 'state-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.state && (
                <p id="state-error" className="text-sm text-destructive">
                  {errors.state}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                name="zipCode"
                value={address.zipCode}
                onChange={handleChange('zipCode')}
                placeholder="10001"
                aria-invalid={!!errors.zipCode}
                aria-describedby={errors.zipCode ? 'zipCode-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.zipCode && (
                <p id="zipCode-error" className="text-sm text-destructive">
                  {errors.zipCode}
                </p>
              )}
            </div>
          </div>

          {/* Country */}
          {showCountryField && (
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <select
                id="country"
                name="country"
                value={address.country}
                onChange={handleChange('country')}
                className={cn(
                  'w-full px-3 py-2 border rounded-md bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  errors.country && 'border-destructive'
                )}
                aria-invalid={!!errors.country}
                aria-describedby={errors.country ? 'country-error' : undefined}
                disabled={isSubmitting}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p id="country-error" className="text-sm text-destructive">
                  {errors.country}
                </p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className={cn(!onCancel && 'w-full')}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : submitButtonText}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ShippingForm;
