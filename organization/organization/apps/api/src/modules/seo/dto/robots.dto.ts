import { IsString, IsOptional, IsArray, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RobotsDirectiveDto {
  @ApiProperty({ description: 'User-agent string', default: '*' })
  @IsString()
  userAgent: string;

  @ApiPropertyOptional({ description: 'Allowed paths', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allow?: string[];

  @ApiPropertyOptional({ description: 'Disallowed paths', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disallow?: string[];

  @ApiPropertyOptional({ description: 'Crawl delay in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  crawlDelay?: number;
}

export class UpdateRobotsDto {
  @ApiPropertyOptional({ description: 'Robot directives', type: [RobotsDirectiveDto] })
  @IsOptional()
  @IsArray()
  directives?: RobotsDirectiveDto[];

  @ApiPropertyOptional({ description: 'Sitemap URLs to include', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sitemaps?: string[];

  @ApiPropertyOptional({ description: 'Additional custom content' })
  @IsOptional()
  @IsString()
  customContent?: string;

  @ApiPropertyOptional({ description: 'Enable crawl delay for all bots', default: false })
  @IsOptional()
  @IsBoolean()
  enableCrawlDelay?: boolean;

  @ApiPropertyOptional({ description: 'Default crawl delay in seconds', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultCrawlDelay?: number;
}

export class RobotsResponseDto {
  @ApiProperty({ description: 'Robots.txt content' })
  content: string;

  @ApiProperty({ description: 'Content type header' })
  contentType: string;
}

export class CrawlAccessCheckDto {
  @ApiProperty({ description: 'Path to check' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'User-agent to check', default: '*' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class CrawlAccessResponseDto {
  @ApiProperty({ description: 'Whether the path is allowed for crawling' })
  allowed: boolean;

  @ApiProperty({ description: 'The matching rule' })
  matchedRule?: string;

  @ApiProperty({ description: 'The user agent checked' })
  userAgent: string;
}
