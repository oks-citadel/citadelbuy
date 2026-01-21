import { Logger } from '@nestjs/common';
import {
  IVisionProvider,
  ImageFeatures,
  ImageLabel,
  DetectedObject,
  DetectedColor,
} from './vision-provider.interface';

/**
 * Mock Vision Provider
 *
 * Used for development and testing when no external API is configured.
 * Returns realistic mock data based on basic image analysis using sharp.
 */
export class MockVisionProvider implements IVisionProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockVisionProvider.name);

  constructor() {
    this.logger.log('Mock vision provider initialized - for development/testing only');
  }

  isAvailable(): boolean {
    return true; // Always available
  }

  async analyzeImage(imageBuffer: Buffer): Promise<ImageFeatures> {
    try {
      const sharp = (await import('sharp')).default;

      // Get basic image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const { dominant } = await sharp(imageBuffer).resize(64, 64, { fit: 'fill' }).stats();

      // Generate mock labels based on image characteristics
      const labels = this.generateMockLabels(metadata, dominant);
      const dominantColors = await this.extractColors(imageBuffer);
      const objects = this.generateMockObjects(metadata);

      return {
        labels,
        objects,
        dominantColors,
        safeSearch: {
          adult: 'VERY_UNLIKELY',
          violence: 'VERY_UNLIKELY',
          racy: 'VERY_UNLIKELY',
        },
        textAnnotations: [],
        webEntities: [],
      };
    } catch (error: any) {
      this.logger.error('Mock analyzeImage error:', error.message);
      return this.getFallbackFeatures();
    }
  }

  async analyzeImageUrl(imageUrl: string): Promise<ImageFeatures> {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      return this.analyzeImage(Buffer.from(response.data));
    } catch (error: any) {
      this.logger.error('Mock analyzeImageUrl error:', error.message);
      return this.getFallbackFeatures();
    }
  }

  async getLabels(imageBuffer: Buffer): Promise<ImageLabel[]> {
    try {
      const sharp = (await import('sharp')).default;

      const metadata = await sharp(imageBuffer).metadata();
      const { dominant } = await sharp(imageBuffer).resize(64, 64, { fit: 'fill' }).stats();

      return this.generateMockLabels(metadata, dominant);
    } catch {
      return this.getFallbackLabels();
    }
  }

  async detectObjects(imageBuffer: Buffer): Promise<DetectedObject[]> {
    try {
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(imageBuffer).metadata();

      return this.generateMockObjects(metadata);
    } catch {
      return [];
    }
  }

  async extractColors(imageBuffer: Buffer): Promise<DetectedColor[]> {
    try {
      const sharp = (await import('sharp')).default;

      const { dominant } = await sharp(imageBuffer).resize(64, 64, { fit: 'fill' }).stats();

      const dominantColor: DetectedColor = {
        hex: this.rgbToHex(dominant.r, dominant.g, dominant.b),
        name: this.getColorName(dominant.r, dominant.g, dominant.b),
        score: 1.0,
        pixelFraction: 0.4,
      };

      // Extract more colors
      const { data, info } = await sharp(imageBuffer)
        .resize(32, 32, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(data);
      const colorCounts: Map<string, { count: number; r: number; g: number; b: number }> = new Map();

      for (let i = 0; i < pixels.length; i += info.channels) {
        const r = Math.round(pixels[i] / 32) * 32;
        const g = Math.round(pixels[i + 1] / 32) * 32;
        const b = Math.round(pixels[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;

        const existing = colorCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorCounts.set(key, { count: 1, r, g, b });
        }
      }

      const totalPixels = 32 * 32;
      const sortedColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

      const colors: DetectedColor[] = sortedColors.map(([, value]) => ({
        hex: this.rgbToHex(value.r, value.g, value.b),
        name: this.getColorName(value.r, value.g, value.b),
        score: value.count / totalPixels,
        pixelFraction: value.count / totalPixels,
      }));

      return [dominantColor, ...colors.filter((c) => c.hex !== dominantColor.hex)].slice(0, 5);
    } catch {
      return this.getFallbackColors();
    }
  }

  private generateMockLabels(
    metadata: any,
    dominant: { r: number; g: number; b: number }
  ): ImageLabel[] {
    const labels: ImageLabel[] = [];

    // Add format-based label
    if (metadata.format) {
      labels.push({
        name: `${metadata.format.toUpperCase()} Image`,
        confidence: 0.99,
      });
    }

    // Add size-based labels
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio > 1.5) {
        labels.push({ name: 'Landscape', confidence: 0.95 });
        labels.push({ name: 'Wide format', confidence: 0.85 });
      } else if (aspectRatio < 0.67) {
        labels.push({ name: 'Portrait', confidence: 0.95 });
        labels.push({ name: 'Tall format', confidence: 0.85 });
      } else {
        labels.push({ name: 'Square format', confidence: 0.9 });
      }

      if (metadata.width > 2000 || metadata.height > 2000) {
        labels.push({ name: 'High resolution', confidence: 0.9 });
      }
    }

    // Add color-based labels
    const colorName = this.getColorName(dominant.r, dominant.g, dominant.b);
    labels.push({
      name: `${colorName} tones`,
      confidence: 0.8,
    });

    // Determine if image is bright or dark
    const brightness = (dominant.r + dominant.g + dominant.b) / 3;
    if (brightness > 180) {
      labels.push({ name: 'Bright', confidence: 0.85 });
      labels.push({ name: 'Light colored', confidence: 0.75 });
    } else if (brightness < 80) {
      labels.push({ name: 'Dark', confidence: 0.85 });
      labels.push({ name: 'Low key', confidence: 0.75 });
    }

    // Add generic product-related labels for e-commerce context
    labels.push({ name: 'Product', confidence: 0.7 });
    labels.push({ name: 'Item', confidence: 0.65 });
    labels.push({ name: 'Object', confidence: 0.6 });

    return labels.slice(0, 15);
  }

  private generateMockObjects(metadata: any): DetectedObject[] {
    const objects: DetectedObject[] = [];

    // Generate a mock centered object detection
    objects.push({
      name: 'Object',
      confidence: 0.85,
      boundingBox: {
        left: 0.1,
        top: 0.1,
        width: 0.8,
        height: 0.8,
      },
    });

    // Add a smaller secondary detection
    objects.push({
      name: 'Item',
      confidence: 0.7,
      boundingBox: {
        left: 0.25,
        top: 0.25,
        width: 0.5,
        height: 0.5,
      },
    });

    return objects;
  }

  private getFallbackFeatures(): ImageFeatures {
    return {
      labels: this.getFallbackLabels(),
      objects: [],
      dominantColors: this.getFallbackColors(),
      safeSearch: {
        adult: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'VERY_UNLIKELY',
      },
      textAnnotations: [],
      webEntities: [],
    };
  }

  private getFallbackLabels(): ImageLabel[] {
    return [
      { name: 'Image', confidence: 0.9 },
      { name: 'Product', confidence: 0.7 },
      { name: 'Object', confidence: 0.6 },
    ];
  }

  private getFallbackColors(): DetectedColor[] {
    return [
      { hex: '#808080', name: 'Gray', score: 0.5, pixelFraction: 0.5 },
      { hex: '#FFFFFF', name: 'White', score: 0.3, pixelFraction: 0.3 },
      { hex: '#000000', name: 'Black', score: 0.2, pixelFraction: 0.2 },
    ];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
        .toUpperCase()
    );
  }

  private getColorName(r: number, g: number, b: number): string {
    const colors: { name: string; r: number; g: number; b: number }[] = [
      { name: 'Red', r: 255, g: 0, b: 0 },
      { name: 'Green', r: 0, g: 128, b: 0 },
      { name: 'Blue', r: 0, g: 0, b: 255 },
      { name: 'Yellow', r: 255, g: 255, b: 0 },
      { name: 'Orange', r: 255, g: 165, b: 0 },
      { name: 'Purple', r: 128, g: 0, b: 128 },
      { name: 'Pink', r: 255, g: 192, b: 203 },
      { name: 'Brown', r: 139, g: 69, b: 19 },
      { name: 'Black', r: 0, g: 0, b: 0 },
      { name: 'White', r: 255, g: 255, b: 255 },
      { name: 'Gray', r: 128, g: 128, b: 128 },
      { name: 'Cyan', r: 0, g: 255, b: 255 },
      { name: 'Magenta', r: 255, g: 0, b: 255 },
      { name: 'Navy', r: 0, g: 0, b: 128 },
      { name: 'Teal', r: 0, g: 128, b: 128 },
      { name: 'Beige', r: 245, g: 245, b: 220 },
    ];

    let closestColor = 'Unknown';
    let minDistance = Infinity;

    for (const c of colors) {
      const distance = Math.sqrt(
        Math.pow(r - c.r, 2) + Math.pow(g - c.g, 2) + Math.pow(b - c.b, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = c.name;
      }
    }

    return closestColor;
  }
}
