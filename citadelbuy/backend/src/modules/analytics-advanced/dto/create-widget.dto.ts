import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateWidgetDto {
  @IsString()
  widgetType: string;

  @IsString()
  title: string;

  @IsOptional()
  configuration?: any;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
