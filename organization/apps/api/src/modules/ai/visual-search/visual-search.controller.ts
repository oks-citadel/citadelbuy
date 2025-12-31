import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VisualSearchService } from './visual-search.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('AI - Visual Search')
@Controller('ai/visual-search')
export class VisualSearchController {
  constructor(private readonly visualSearchService: VisualSearchService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search products by image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async searchByImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    return this.visualSearchService.searchByImage(file);
  }

  @Post('url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search products by image URL' })
  async searchByImageUrl(@Body('imageUrl') imageUrl: string) {
    if (!imageUrl) {
      throw new BadRequestException('No image URL provided');
    }

    return this.visualSearchService.searchByImageUrl(imageUrl);
  }

  @Post('similar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Find similar products by product ID' })
  async findSimilar(@Body('productId') productId: string) {
    if (!productId) {
      throw new BadRequestException('No product ID provided');
    }

    return this.visualSearchService.findSimilarProducts(productId);
  }
}
