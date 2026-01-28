import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddressDto {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State/Province' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'Postal/ZIP code' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;
}

export class BusinessProfileDto {
  @ApiProperty({ description: 'Profile ID' })
  id: string;

  @ApiProperty({ description: 'Business name' })
  businessName: string;

  @ApiPropertyOptional({ description: 'Business description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Business categories', type: [String] })
  categories?: string[];

  @ApiProperty({ description: 'Business address', type: AddressDto })
  address: AddressDto;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Business hours' })
  hours?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Social media profiles' })
  socialProfiles?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Business attributes', type: [String] })
  attributes?: string[];

  @ApiPropertyOptional({ description: 'Service areas', type: [String] })
  serviceAreas?: string[];

  @ApiPropertyOptional({ description: 'Logo URL' })
  logo?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  coverImage?: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: string;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: string;
}

export class CreateBusinessProfileDto {
  @ApiProperty({ description: 'Business name' })
  @IsString()
  businessName: string;

  @ApiPropertyOptional({ description: 'Business description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Business categories', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({ description: 'Business address', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Business hours' })
  @IsOptional()
  @IsObject()
  hours?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Social media profiles' })
  @IsOptional()
  @IsObject()
  socialProfiles?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Business attributes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attributes?: string[];

  @ApiPropertyOptional({ description: 'Service areas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceAreas?: string[];
}

export class UpdateBusinessProfileDto {
  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Business categories', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Business address', type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Business hours' })
  @IsOptional()
  @IsObject()
  hours?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Social media profiles' })
  @IsOptional()
  @IsObject()
  socialProfiles?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Business attributes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attributes?: string[];

  @ApiPropertyOptional({ description: 'Service areas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceAreas?: string[];
}

export class LocalCitationDto {
  @ApiProperty({ description: 'Citation ID' })
  id: string;

  @ApiProperty({ description: 'Business profile ID' })
  profileId: string;

  @ApiProperty({ description: 'Citation source name' })
  source: string;

  @ApiProperty({ description: 'Source website URL' })
  sourceUrl: string;

  @ApiPropertyOptional({ description: 'Business listing URL' })
  url?: string;

  @ApiProperty({ description: 'Citation status' })
  status: 'claimed' | 'unclaimed' | 'pending' | 'suspended';

  @ApiProperty({ description: 'NAP consistency flag' })
  napConsistent: boolean;

  @ApiPropertyOptional({ description: 'NAP details' })
  napDetails?: {
    nameMatch: boolean;
    addressMatch: boolean;
    phoneMatch: boolean;
  };

  @ApiProperty({ description: 'Last verified date' })
  lastVerified: string;

  @ApiProperty({ description: 'Importance score (1-10)' })
  importance: number;
}

export class CreateLocalCitationDto {
  @ApiProperty({ description: 'Business profile ID' })
  @IsString()
  profileId: string;

  @ApiProperty({ description: 'Citation source name' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Source website URL' })
  @IsString()
  sourceUrl: string;

  @ApiPropertyOptional({ description: 'Business listing URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ description: 'Citation status' })
  @IsString()
  status: 'claimed' | 'unclaimed' | 'pending' | 'suspended';

  @ApiProperty({ description: 'NAP consistency flag' })
  @IsBoolean()
  napConsistent: boolean;

  @ApiPropertyOptional({ description: 'Importance score (1-10)' })
  @IsOptional()
  @IsNumber()
  importance?: number;
}

export class NAPConsistencyDto {
  @ApiProperty({ description: 'Business profile ID' })
  profileId: string;

  @ApiProperty({ description: 'Consistency score (0-100)' })
  consistencyScore: number;

  @ApiProperty({ description: 'Total citations checked' })
  totalCitations: number;

  @ApiProperty({ description: 'Number of consistent citations' })
  consistentCitations: number;

  @ApiProperty({ description: 'Number of inconsistent citations' })
  inconsistentCitations: number;

  @ApiProperty({ description: 'Specific issues found' })
  issues: Array<{
    source: string;
    field: 'name' | 'address' | 'phone';
    expected: string;
    found: string;
    severity: 'high' | 'medium' | 'low';
  }>;

  @ApiProperty({ description: 'Last checked date' })
  lastChecked: string;
}

export class LocalSearchAnalyticsDto {
  @ApiProperty({ description: 'Business profile ID' })
  profileId: string;

  @ApiProperty({ description: 'Analytics period' })
  period: string;

  @ApiProperty({ description: 'Search metrics' })
  metrics: {
    totalSearches: number;
    directSearches: number;
    discoverySearches: number;
    brandedSearches: number;
  };

  @ApiProperty({ description: 'Action metrics' })
  actions: {
    websiteClicks: number;
    directionRequests: number;
    phoneCalls: number;
    messagesSent: number;
  };

  @ApiProperty({ description: 'View metrics' })
  views: {
    searchViews: number;
    mapsViews: number;
  };

  @ApiProperty({ description: 'Photo views' })
  photoViews: number;

  @ApiProperty({ description: 'Last updated' })
  lastUpdated: string;
}

export class ReviewSummaryDto {
  @ApiProperty({ description: 'Business profile ID' })
  profileId: string;

  @ApiProperty({ description: 'Total reviews' })
  totalReviews: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating: number;

  @ApiProperty({ description: 'Rating distribution' })
  ratingDistribution: Record<number, number>;

  @ApiProperty({ description: 'Recent reviews' })
  recentReviews: Array<{
    source: string;
    rating: number;
    text: string;
    author: string;
    date: string;
    responded: boolean;
  }>;

  @ApiProperty({ description: 'Reviews needing response' })
  needsResponse: number;

  @ApiProperty({ description: 'Sentiment score (0-100)' })
  sentimentScore: number;
}

export class LocalKeywordRankingDto {
  @ApiProperty({ description: 'Keyword' })
  keyword: string;

  @ApiProperty({ description: 'Target location' })
  location: string;

  @ApiProperty({ description: 'Current position' })
  position: number;

  @ApiProperty({ description: 'Previous position' })
  previousPosition: number;

  @ApiProperty({ description: 'Position change' })
  change: number;

  @ApiProperty({ description: 'Monthly search volume' })
  searchVolume: number;

  @ApiProperty({ description: 'Keyword difficulty (0-100)' })
  difficulty: number;

  @ApiProperty({ description: 'Last checked' })
  lastChecked: string;
}

export class LocalSchemaDto {
  @ApiProperty({ description: 'Schema type' })
  type: string;

  @ApiProperty({ description: 'JSON-LD schema object' })
  schema: Record<string, any>;

  @ApiProperty({ description: 'Validation status' })
  isValid: boolean;

  @ApiPropertyOptional({ description: 'Validation errors', type: [String] })
  errors?: string[];
}

export class GeoTargetingDto {
  @ApiPropertyOptional({ description: 'Geo target ID' })
  id?: string;

  @ApiProperty({ description: 'Target region/country' })
  @IsString()
  region: string;

  @ApiProperty({ description: 'Language code' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Is default for this region' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Hreflang value' })
  @IsOptional()
  @IsString()
  hreflang?: string;

  @ApiPropertyOptional({ description: 'Created date' })
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Updated date' })
  updatedAt?: string;
}
