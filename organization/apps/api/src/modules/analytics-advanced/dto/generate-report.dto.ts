import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ReportType } from '@prisma/client';

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
