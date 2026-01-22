import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  BusinessProfileDto,
  CreateBusinessProfileDto,
  UpdateBusinessProfileDto,
  LocalCitationDto,
  CreateLocalCitationDto,
  LocalSearchAnalyticsDto,
  ReviewSummaryDto,
  LocalKeywordRankingDto,
  NAPConsistencyDto,
  LocalSchemaDto,
  GeoTargetingDto,
} from '../dto/local-seo.dto';

@Injectable()
export class LocalSeoService {
  private readonly logger = new Logger(LocalSeoService.name);
  private readonly cachePrefix = 'seo:local:';

  // In-memory storage
  private businessProfiles: Map<string, BusinessProfileDto> = new Map();
  private citations: Map<string, LocalCitationDto> = new Map();
  private geoTargets: Map<string, GeoTargetingDto> = new Map();

  // Major citation sources
  private readonly CITATION_SOURCES = [
    { name: 'Google Business Profile', url: 'business.google.com', importance: 10 },
    { name: 'Apple Maps', url: 'mapsconnect.apple.com', importance: 9 },
    { name: 'Bing Places', url: 'bingplaces.com', importance: 8 },
    { name: 'Yelp', url: 'yelp.com', importance: 8 },
    { name: 'Facebook', url: 'facebook.com', importance: 8 },
    { name: 'Yellow Pages', url: 'yellowpages.com', importance: 6 },
    { name: 'BBB', url: 'bbb.org', importance: 7 },
    { name: 'Foursquare', url: 'foursquare.com', importance: 5 },
    { name: 'TripAdvisor', url: 'tripadvisor.com', importance: 7 },
    { name: 'Trustpilot', url: 'trustpilot.com', importance: 7 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    this.initializeDefaultProfile();
  }

  /**
   * Initialize default business profile
   */
  private initializeDefaultProfile(): void {
    const defaultProfile: BusinessProfileDto = {
      id: 'bp_default',
      businessName: 'Broxiva',
      description: 'AI-Powered E-Commerce Platform offering the best shopping experience with personalized recommendations.',
      categories: ['E-commerce', 'Online Shopping', 'Retail'],
      address: {
        street: '123 Commerce Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'USA',
      },
      phone: '+1-800-BROXIVA',
      website: 'https://broxiva.com',
      email: 'support@broxiva.com',
      hours: {
        monday: '9:00 AM - 9:00 PM',
        tuesday: '9:00 AM - 9:00 PM',
        wednesday: '9:00 AM - 9:00 PM',
        thursday: '9:00 AM - 9:00 PM',
        friday: '9:00 AM - 9:00 PM',
        saturday: '10:00 AM - 6:00 PM',
        sunday: '10:00 AM - 6:00 PM',
      },
      socialProfiles: {
        facebook: 'https://facebook.com/broxiva',
        twitter: 'https://twitter.com/broxiva',
        instagram: 'https://instagram.com/broxiva',
        linkedin: 'https://linkedin.com/company/broxiva',
      },
      attributes: ['Online Shopping', 'Free Shipping', 'Easy Returns', '24/7 Support'],
      serviceAreas: ['United States', 'Canada', 'United Kingdom'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.businessProfiles.set(defaultProfile.id, defaultProfile);
  }

  /**
   * Get business profile
   */
  async getBusinessProfile(id?: string): Promise<BusinessProfileDto> {
    const profileId = id || 'bp_default';
    const profile = this.businessProfiles.get(profileId);

    if (!profile) {
      throw new NotFoundException(`Business profile ${profileId} not found`);
    }

    return profile;
  }

  /**
   * Create business profile
   */
  async createBusinessProfile(dto: CreateBusinessProfileDto): Promise<BusinessProfileDto> {
    const id = 'bp_' + Math.random().toString(36).substring(2, 15);

    const profile: BusinessProfileDto = {
      id,
      ...dto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.businessProfiles.set(id, profile);
    this.logger.log(`Created business profile: ${dto.businessName}`);

    return profile;
  }

  /**
   * Update business profile
   */
  async updateBusinessProfile(id: string, dto: UpdateBusinessProfileDto): Promise<BusinessProfileDto> {
    const existing = this.businessProfiles.get(id);
    if (!existing) {
      throw new NotFoundException(`Business profile ${id} not found`);
    }

    const updated: BusinessProfileDto = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    this.businessProfiles.set(id, updated);

    return updated;
  }

  /**
   * Get local citations
   */
  async getCitations(profileId?: string): Promise<LocalCitationDto[]> {
    const profile = await this.getBusinessProfile(profileId);

    // Generate sample citations based on major sources
    const citations: LocalCitationDto[] = this.CITATION_SOURCES.map(source => {
      const existing = Array.from(this.citations.values()).find(
        c => c.source === source.name
      );

      if (existing) return existing;

      // Simulate citation status
      const isClaimed = Math.random() > 0.3;
      const napConsistent = Math.random() > 0.2;

      return {
        id: 'cit_' + Math.random().toString(36).substring(2, 10),
        profileId: profile.id,
        source: source.name,
        sourceUrl: `https://${source.url}`,
        url: isClaimed ? `https://${source.url}/biz/broxiva` : undefined,
        status: isClaimed ? 'claimed' : 'unclaimed',
        napConsistent,
        napDetails: napConsistent ? undefined : {
          nameMatch: Math.random() > 0.5,
          addressMatch: Math.random() > 0.3,
          phoneMatch: Math.random() > 0.4,
        },
        lastVerified: new Date().toISOString(),
        importance: source.importance,
      };
    });

    return citations.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Add or update citation
   */
  async upsertCitation(dto: CreateLocalCitationDto): Promise<LocalCitationDto> {
    const existing = Array.from(this.citations.values()).find(
      c => c.source === dto.source
    );

    const id = existing?.id || 'cit_' + Math.random().toString(36).substring(2, 10);

    const citation: LocalCitationDto = {
      id,
      profileId: dto.profileId,
      source: dto.source,
      sourceUrl: dto.sourceUrl,
      url: dto.url,
      status: dto.status,
      napConsistent: dto.napConsistent,
      lastVerified: new Date().toISOString(),
      importance: dto.importance ?? 5,
    };

    this.citations.set(id, citation);

    return citation;
  }

  /**
   * Check NAP consistency across citations
   */
  async checkNAPConsistency(profileId?: string): Promise<NAPConsistencyDto> {
    const profile = await this.getBusinessProfile(profileId);
    const citations = await this.getCitations(profileId);

    const totalCitations = citations.length;
    const consistentCitations = citations.filter(c => c.napConsistent).length;
    const inconsistentCitations = citations.filter(c => !c.napConsistent);

    const issues: NAPConsistencyDto['issues'] = [];

    for (const citation of inconsistentCitations) {
      if (citation.napDetails) {
        if (!citation.napDetails.nameMatch) {
          issues.push({
            source: citation.source,
            field: 'name',
            expected: profile.businessName,
            found: 'Name mismatch detected',
            severity: 'high',
          });
        }
        if (!citation.napDetails.addressMatch) {
          issues.push({
            source: citation.source,
            field: 'address',
            expected: `${profile.address.street}, ${profile.address.city}`,
            found: 'Address mismatch detected',
            severity: 'high',
          });
        }
        if (!citation.napDetails.phoneMatch) {
          issues.push({
            source: citation.source,
            field: 'phone',
            expected: profile.phone ?? 'Not provided',
            found: 'Phone mismatch detected',
            severity: 'medium',
          });
        }
      }
    }

    return {
      profileId: profile.id,
      consistencyScore: (consistentCitations / totalCitations) * 100,
      totalCitations,
      consistentCitations,
      inconsistentCitations: inconsistentCitations.length,
      issues,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Get local search analytics (simulated)
   */
  async getLocalSearchAnalytics(profileId?: string): Promise<LocalSearchAnalyticsDto> {
    const profile = await this.getBusinessProfile(profileId);

    return {
      profileId: profile.id,
      period: 'last_30_days',
      metrics: {
        totalSearches: Math.floor(Math.random() * 10000) + 1000,
        directSearches: Math.floor(Math.random() * 5000) + 500,
        discoverySearches: Math.floor(Math.random() * 4000) + 400,
        brandedSearches: Math.floor(Math.random() * 3000) + 300,
      },
      actions: {
        websiteClicks: Math.floor(Math.random() * 2000) + 200,
        directionRequests: Math.floor(Math.random() * 500) + 50,
        phoneCalls: Math.floor(Math.random() * 300) + 30,
        messagesSent: Math.floor(Math.random() * 100) + 10,
      },
      views: {
        searchViews: Math.floor(Math.random() * 8000) + 800,
        mapsViews: Math.floor(Math.random() * 4000) + 400,
      },
      photoViews: Math.floor(Math.random() * 1500) + 150,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get review summary (simulated)
   */
  async getReviewSummary(profileId?: string): Promise<ReviewSummaryDto> {
    const profile = await this.getBusinessProfile(profileId);

    const totalReviews = Math.floor(Math.random() * 500) + 50;
    const ratings = {
      5: Math.floor(totalReviews * 0.6),
      4: Math.floor(totalReviews * 0.2),
      3: Math.floor(totalReviews * 0.1),
      2: Math.floor(totalReviews * 0.05),
      1: Math.floor(totalReviews * 0.05),
    };

    const avgRating = (
      ratings[5] * 5 + ratings[4] * 4 + ratings[3] * 3 + ratings[2] * 2 + ratings[1] * 1
    ) / totalReviews;

    return {
      profileId: profile.id,
      totalReviews,
      averageRating: Math.round(avgRating * 10) / 10,
      ratingDistribution: ratings,
      recentReviews: [
        {
          source: 'Google',
          rating: 5,
          text: 'Great shopping experience! Fast delivery and excellent customer service.',
          author: 'John D.',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          responded: true,
        },
        {
          source: 'Google',
          rating: 4,
          text: 'Good products, competitive prices. Would recommend.',
          author: 'Sarah M.',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          responded: false,
        },
        {
          source: 'Yelp',
          rating: 5,
          text: 'Love the AI recommendations! Found exactly what I needed.',
          author: 'Mike R.',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          responded: true,
        },
      ],
      needsResponse: Math.floor(totalReviews * 0.1),
      sentimentScore: Math.round((avgRating / 5) * 100),
    };
  }

  /**
   * Get local keyword rankings (simulated)
   */
  async getLocalKeywordRankings(profileId?: string): Promise<LocalKeywordRankingDto[]> {
    const profile = await this.getBusinessProfile(profileId);

    const keywords = [
      { keyword: 'online shopping', location: 'San Francisco, CA' },
      { keyword: 'e-commerce platform', location: 'San Francisco, CA' },
      { keyword: 'best deals online', location: 'San Francisco, CA' },
      { keyword: 'buy products online', location: 'San Francisco, CA' },
      { keyword: 'shopping near me', location: 'San Francisco, CA' },
      { keyword: 'free shipping shopping', location: 'United States' },
    ];

    return keywords.map(kw => ({
      keyword: kw.keyword,
      location: kw.location,
      position: Math.floor(Math.random() * 20) + 1,
      previousPosition: Math.floor(Math.random() * 25) + 1,
      change: Math.floor(Math.random() * 10) - 5,
      searchVolume: Math.floor(Math.random() * 10000) + 1000,
      difficulty: Math.floor(Math.random() * 100),
      lastChecked: new Date().toISOString(),
    }));
  }

  /**
   * Generate LocalBusiness JSON-LD schema
   */
  async generateLocalBusinessSchema(profileId?: string): Promise<LocalSchemaDto> {
    const profile = await this.getBusinessProfile(profileId);
    const reviews = await this.getReviewSummary(profileId);

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'OnlineBusiness',
      name: profile.businessName,
      description: profile.description,
      url: profile.website,
      ...(profile.phone && { telephone: profile.phone }),
      email: profile.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: profile.address.street,
        addressLocality: profile.address.city,
        addressRegion: profile.address.state,
        postalCode: profile.address.postalCode,
        addressCountry: profile.address.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 37.7749,
        longitude: -122.4194,
      },
      openingHoursSpecification: profile.hours ? Object.entries(profile.hours).map(([day, hours]) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
        opens: hours.split(' - ')[0],
        closes: hours.split(' - ')[1],
      })) : [],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviews.averageRating,
        reviewCount: reviews.totalReviews,
        bestRating: 5,
        worstRating: 1,
      },
      sameAs: profile.socialProfiles ? Object.values(profile.socialProfiles).filter(Boolean) : [],
      priceRange: '$$',
      areaServed: profile.serviceAreas?.map(area => ({
        '@type': 'Place',
        name: area,
      })),
    };

    return {
      type: 'LocalBusiness',
      schema,
      isValid: true,
    };
  }

  /**
   * Set geo-targeting for a region
   */
  async setGeoTargeting(dto: GeoTargetingDto): Promise<GeoTargetingDto> {
    const id = dto.id || 'geo_' + Math.random().toString(36).substring(2, 10);

    const geoTarget: GeoTargetingDto = {
      ...dto,
      id,
      createdAt: dto.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.geoTargets.set(id, geoTarget);

    return geoTarget;
  }

  /**
   * Get all geo-targeting rules
   */
  async getGeoTargeting(): Promise<GeoTargetingDto[]> {
    return Array.from(this.geoTargets.values());
  }

  /**
   * Get local SEO audit
   */
  async getLocalSeoAudit(profileId?: string): Promise<{
    score: number;
    categories: Record<string, { score: number; issues: string[] }>;
    recommendations: string[];
  }> {
    const profile = await this.getBusinessProfile(profileId);
    const citations = await this.getCitations(profileId);
    const napConsistency = await this.checkNAPConsistency(profileId);
    const reviews = await this.getReviewSummary(profileId);

    const categories: Record<string, { score: number; issues: string[] }> = {};

    // Profile completeness
    const profileIssues: string[] = [];
    let profileScore = 100;

    if (!profile.description || profile.description.length < 100) {
      profileIssues.push('Business description is too short (aim for 100+ characters)');
      profileScore -= 15;
    }
    if (!profile.phone) {
      profileIssues.push('Missing phone number');
      profileScore -= 10;
    }
    if (!profile.hours) {
      profileIssues.push('Missing business hours');
      profileScore -= 10;
    }
    if (!profile.socialProfiles || Object.keys(profile.socialProfiles).length < 3) {
      profileIssues.push('Add more social media profiles');
      profileScore -= 10;
    }

    categories['Profile Completeness'] = { score: profileScore, issues: profileIssues };

    // Citation coverage
    const citationIssues: string[] = [];
    const claimedCitations = citations.filter(c => c.status === 'claimed').length;
    const citationScore = Math.round((claimedCitations / citations.length) * 100);

    if (citationScore < 80) {
      citationIssues.push(`Only ${claimedCitations}/${citations.length} citations claimed`);
    }
    const unclaimedImportant = citations.filter(c => c.status === 'unclaimed' && c.importance >= 8);
    if (unclaimedImportant.length > 0) {
      citationIssues.push(`Unclaimed important citations: ${unclaimedImportant.map(c => c.source).join(', ')}`);
    }

    categories['Citation Coverage'] = { score: citationScore, issues: citationIssues };

    // NAP consistency
    const napIssues: string[] = [];
    if (napConsistency.consistencyScore < 100) {
      napIssues.push(`${napConsistency.inconsistentCitations} citations have NAP inconsistencies`);
    }

    categories['NAP Consistency'] = { score: Math.round(napConsistency.consistencyScore), issues: napIssues };

    // Reviews
    const reviewIssues: string[] = [];
    let reviewScore = 100;

    if (reviews.averageRating < 4.0) {
      reviewIssues.push('Average rating is below 4.0 stars');
      reviewScore -= 20;
    }
    if (reviews.needsResponse > 5) {
      reviewIssues.push(`${reviews.needsResponse} reviews need response`);
      reviewScore -= 15;
    }
    if (reviews.totalReviews < 50) {
      reviewIssues.push('Aim for more reviews (50+ recommended)');
      reviewScore -= 10;
    }

    categories['Reviews'] = { score: reviewScore, issues: reviewIssues };

    // Calculate overall score
    const scores = Object.values(categories).map(c => c.score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Generate recommendations
    const recommendations: string[] = [];

    if (citationScore < 80) {
      recommendations.push('Claim and verify your business on major citation platforms');
    }
    if (napConsistency.consistencyScore < 100) {
      recommendations.push('Update business information to ensure NAP consistency across all platforms');
    }
    if (reviews.needsResponse > 0) {
      recommendations.push('Respond to customer reviews to improve engagement');
    }
    if (profileScore < 90) {
      recommendations.push('Complete your business profile with detailed information');
    }
    recommendations.push('Add high-quality photos to your business profiles');
    recommendations.push('Encourage satisfied customers to leave reviews');

    return {
      score: overallScore,
      categories,
      recommendations,
    };
  }
}
