import { Controller, Post, Get, Body, Param, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ArTryonService } from './ar-tryon.service';
import { FitRecommendationService } from './fit-recommendation.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('AI - AR Virtual Try-On')
@Controller('ai/ar-tryon')
export class ArTryonController {
  constructor(
    private readonly arTryonService: ArTryonService,
    private readonly fitRecommendationService: FitRecommendationService,
  ) {}

  @Post('virtual-tryon')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate virtual try-on for clothing/accessories' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async virtualTryon(
    @UploadedFile() file: Express.Multer.File,
    @Body('productId') productId: string,
  ) {
    return this.arTryonService.generateVirtualTryon(file, productId);
  }

  @Post('body-measurements')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Extract body measurements from photo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async extractBodyMeasurements(@UploadedFile() file: Express.Multer.File) {
    return this.arTryonService.extractBodyMeasurements(file);
  }

  @Post('fit-recommendation')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get size and fit recommendations' })
  async getFitRecommendation(@Body() data: {
    productId: string;
    measurements?: any;
    userId?: string;
  }) {
    return this.fitRecommendationService.getRecommendation(data);
  }

  @Get('product-3d/:productId')
  @ApiOperation({ summary: 'Get 3D model for product' })
  async get3DModel(@Param('productId') productId: string) {
    return this.arTryonService.get3DModel(productId);
  }

  @Post('ar-placement')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate AR placement for furniture/home decor' })
  async generateARPlacement(@Body() data: {
    productId: string;
    roomImage: string;
    position: { x: number; y: number; z: number };
  }) {
    return this.arTryonService.generateARPlacement(data);
  }

  @Get('size-chart/:productId')
  @ApiOperation({ summary: 'Get intelligent size chart with recommendations' })
  async getSizeChart(@Param('productId') productId: string) {
    return this.fitRecommendationService.getSizeChart(productId);
  }

  @Post('fit-feedback')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit fit feedback for ML improvement' })
  async submitFitFeedback(@Body() feedback: {
    productId: string;
    userId: string;
    size: string;
    fit: 'too_small' | 'perfect' | 'too_large';
    measurements?: any;
  }) {
    return this.fitRecommendationService.submitFeedback(feedback);
  }
}
