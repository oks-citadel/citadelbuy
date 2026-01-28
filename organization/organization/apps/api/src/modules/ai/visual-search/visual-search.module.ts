import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { VisualSearchController } from './visual-search.controller';
import { VisualSearchService } from './visual-search.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
      fileFilter: (req, file, cb) => {
        // Accept only image files
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and BMP are allowed.'), false);
        }
      },
    }),
  ],
  controllers: [VisualSearchController],
  providers: [VisualSearchService],
  exports: [VisualSearchService],
})
export class VisualSearchModule {}
