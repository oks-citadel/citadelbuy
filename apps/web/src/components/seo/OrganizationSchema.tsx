'use client';

/**
 * Organization JSON-LD Schema Component
 * Generates structured data for organization/company information
 */

import { JsonLd } from '@/lib/seo/json-ld';
import { seoConfig } from '@/lib/seo/config';

export interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode: string;
    addressCountry: string;
  };
  sameAs?: string[];
  foundingDate?: string;
  founders?: Array<{
    name: string;
    url?: string;
  }>;
  numberOfEmployees?: {
    min: number;
    max?: number;
  };
  areaServed?: string[];
  contactPoints?: Array<{
    type: 'CustomerService' | 'TechnicalSupport' | 'Sales' | 'BillingSupport' | 'Reservations';
    telephone?: string;
    email?: string;
    availableLanguage?: string[];
    hoursAvailable?: {
      dayOfWeek: string[];
      opens: string;
      closes: string;
    };
  }>;
  /**
   * Organization type
   * @default 'Organization'
   */
  type?: 'Organization' | 'Corporation' | 'NGO' | 'EducationalOrganization' | 'GovernmentOrganization';
}

/**
 * OrganizationSchema component
 *
 * @example
 * <OrganizationSchema />  // Uses default seoConfig values
 *
 * @example
 * <OrganizationSchema
 *   name="Broxiva Inc."
 *   description="Global B2B marketplace"
 *   email="contact@broxiva.com"
 *   telephone="+1-800-BROXIVA"
 *   address={{
 *     streetAddress: "100 Commerce Blvd",
 *     addressLocality: "Lagos",
 *     addressRegion: "LA",
 *     postalCode: "100001",
 *     addressCountry: "NG"
 *   }}
 *   sameAs={[
 *     "https://twitter.com/broxiva",
 *     "https://linkedin.com/company/broxiva"
 *   ]}
 * />
 */
export function OrganizationSchema({
  name = seoConfig.organization.name,
  url = seoConfig.siteUrl,
  logo = `${seoConfig.siteUrl}${seoConfig.organization.logo}`,
  description = seoConfig.defaults.description,
  email = seoConfig.organization.email,
  telephone = seoConfig.organization.phone,
  address = seoConfig.organization.address,
  sameAs,
  foundingDate,
  founders,
  numberOfEmployees,
  areaServed,
  contactPoints,
  type = 'Organization',
}: OrganizationSchemaProps) {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    url,
    logo: {
      '@type': 'ImageObject',
      url: logo.startsWith('http') ? logo : `${seoConfig.siteUrl}${logo}`,
    },
    description,
    ...(email && { email }),
    ...(telephone && { telephone }),
  };

  // Add address
  if (address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.addressLocality,
      ...(address.addressRegion && { addressRegion: address.addressRegion }),
      postalCode: address.postalCode,
      addressCountry: address.addressCountry,
    };
  }

  // Add social profiles
  const socialLinks = sameAs || [
    seoConfig.social.twitter,
    seoConfig.social.facebook,
    seoConfig.social.linkedin,
    seoConfig.social.instagram,
  ].filter(Boolean);

  if (socialLinks.length > 0) {
    schema.sameAs = socialLinks;
  }

  // Add founding information
  if (foundingDate) {
    schema.foundingDate = foundingDate;
  }

  if (founders && founders.length > 0) {
    schema.founder = founders.map((founder) => ({
      '@type': 'Person',
      name: founder.name,
      ...(founder.url && { url: founder.url }),
    }));
  }

  // Add employee count
  if (numberOfEmployees) {
    schema.numberOfEmployees = {
      '@type': 'QuantitativeValue',
      minValue: numberOfEmployees.min,
      ...(numberOfEmployees.max && { maxValue: numberOfEmployees.max }),
    };
  }

  // Add service area
  if (areaServed && areaServed.length > 0) {
    schema.areaServed = areaServed.map((area) => ({
      '@type': 'Country',
      name: area,
    }));
  }

  // Add contact points
  if (contactPoints && contactPoints.length > 0) {
    schema.contactPoint = contactPoints.map((contact) => {
      const point: Record<string, any> = {
        '@type': 'ContactPoint',
        contactType: contact.type.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
        ...(contact.telephone && { telephone: contact.telephone }),
        ...(contact.email && { email: contact.email }),
        ...(contact.availableLanguage && { availableLanguage: contact.availableLanguage }),
      };

      if (contact.hoursAvailable) {
        point.hoursAvailable = {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: contact.hoursAvailable.dayOfWeek,
          opens: contact.hoursAvailable.opens,
          closes: contact.hoursAvailable.closes,
        };
      }

      return point;
    });
  }

  return <JsonLd data={schema} />;
}

/**
 * Default Broxiva organization schema using config values
 */
export function BroxivaOrganization() {
  return (
    <OrganizationSchema
      name={seoConfig.organization.name}
      url={seoConfig.siteUrl}
      logo={`${seoConfig.siteUrl}${seoConfig.organization.logo}`}
      description={seoConfig.defaults.description}
      email={seoConfig.organization.email}
      telephone={seoConfig.organization.phone}
      address={seoConfig.organization.address}
      sameAs={[
        seoConfig.social.twitter.startsWith('@')
          ? `https://twitter.com/${seoConfig.social.twitter.slice(1)}`
          : seoConfig.social.twitter,
        seoConfig.social.facebook,
        seoConfig.social.linkedin,
        seoConfig.social.instagram,
      ]}
      contactPoints={[
        {
          type: 'CustomerService',
          email: seoConfig.organization.email,
          telephone: seoConfig.organization.phone,
          availableLanguage: ['English', 'French', 'Spanish', 'Arabic'],
          hoursAvailable: {
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '09:00',
            closes: '18:00',
          },
        },
      ]}
      areaServed={['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'United States', 'United Kingdom']}
    />
  );
}

export default OrganizationSchema;
